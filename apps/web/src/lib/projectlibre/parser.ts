import { XMLParser, XMLValidator } from 'fast-xml-parser';

export interface ProjectLibreTask {
  UID: number;
  ID: number;
  Name: string;
  Type: number;
  OutlineNumber: string;
  OutlineLevel: number;
  Start: string;
  Finish: string;
  Duration: string;
  Summary: number;
  Milestone: number;
  Critical?: number;
  PredecessorLink?: PredecessorLink | PredecessorLink[];
}

export interface PredecessorLink {
  PredecessorUID: number;
  Type: number;
  CrossProject: number;
}

export interface ParsedProjectLibre {
  Tasks: ProjectLibreTask[];
}

export interface ParseResult {
  success: boolean;
  data?: ParsedProjectLibre;
  error?: string;
}

export function parseProjectLibreXML(xmlContent: string): ParseResult {
  const validation = XMLValidator.validate(xmlContent);
  if (validation !== true) {
    return {
      success: false,
      error: `Invalid XML: ${validation.err.msg}`
    };
  }

  const parser = new XMLParser({
    ignoreAttributes: false,
    parseAttributeValue: true,
    isArray: (name) => {
      if (['Task', 'Resource', 'Assignment', 'PredecessorLink'].includes(name)) {
        return true;
      }
      return false;
    }
  });

  try {
    const parsed = parser.parse(xmlContent);
    if (!parsed.Project || !parsed.Project.Tasks || !parsed.Project.Tasks.Task) {
      return {
        success: false,
        error: "Missing expected <Tasks> structure in ProjectLibre export"
      };
    }

    const tasks: ProjectLibreTask[] = parsed.Project.Tasks.Task;

    return {
      success: true,
      data: {
        Tasks: tasks,
      }
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown parsing error'
    };
  }
}

export interface CPMTask {
  id: string;
  name: string;
  originalUid: number;
  start: string;
  finish: string;
  durationHours: number;
  isSummary: boolean;
  isMilestone: boolean;
  isCritical: boolean;
  children: CPMTask[];
  dependencies: CPMDependency[];
  parentId?: string;
  wbs: string;
}

export interface CPMDependency {
  predecessorId: string;
  type: number;
}

const IGNORED_DEPARTMENTS = new Set([
  "Moksha27",
  "Moksha '27",
  "Chassis",
  "Brakes",
  "Electrical Powertrain",
  "Mechanical Powertrain",
  "CAE",
  "Steering",
  "Suspension",
  "Sponsorship",
  "Finance & Procurement"
]);

export interface TransformMetrics {
  totalDiscovered: number;
  tasksToImport: number;
  ignoredNodes: string[];
  dependencyCount: number;
  milestoneCount: number;
  warnings: string[];
}

export interface TransformResult {
  tasks: CPMTask[];
  metrics: TransformMetrics;
}

function parseDurationToHours(duration: string): number {
  if (!duration) return 0;
  const match = duration.match(/PT(\d+)H/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return 0;
}

export function transformProjectLibreData(data: ParsedProjectLibre): TransformResult {
  const metrics: TransformMetrics = {
    totalDiscovered: 0,
    tasksToImport: 0,
    ignoredNodes: [],
    dependencyCount: 0,
    milestoneCount: 0,
    warnings: [],
  };

  if (!data || !data.Tasks) {
    return { tasks: [], metrics };
  }

  const rawTasks = data.Tasks;
  metrics.totalDiscovered = rawTasks.length;

  interface RawNode {
    task: ProjectLibreTask;
    children: RawNode[];
  }

  const rootNodes: RawNode[] = [];
  const levelStack: RawNode[] = [];

  for (const task of rawTasks) {
    if (!task.Name) continue;

    const node: RawNode = { task, children: [] };
    const level = task.OutlineLevel;

    if (level === 1) {
      rootNodes.push(node);
      levelStack[1] = node;
    } else {
      const parent = levelStack[level - 1];
      if (parent) {
        parent.children.push(node);
      } else {
        metrics.warnings.push(`Task "${task.Name}" (UID: ${task.UID}) has OutlineLevel ${level} but no parent found.`);
        rootNodes.push(node);
      }
      levelStack[level] = node;
    }
  }

  const cpmTasks: CPMTask[] = [];
  const validUids = new Set<number>();
  const uidMapping = new Map<number, CPMTask>();

  function processNode(node: RawNode, parentId?: string): CPMTask[] {
    const task = node.task;
    const isIgnored = IGNORED_DEPARTMENTS.has(task.Name.trim());

    if (isIgnored) {
      if (!metrics.ignoredNodes.includes(task.Name)) {
         metrics.ignoredNodes.push(task.Name);
      }
      
      const hoistedChildren: CPMTask[] = [];
      for (const child of node.children) {
        hoistedChildren.push(...processNode(child, parentId));
      }
      return hoistedChildren;
    }

    const cpmId = `task-${task.UID}`;
    const cpmTask: CPMTask = {
      id: cpmId,
      name: task.Name,
      originalUid: task.UID,
      start: task.Start,
      finish: task.Finish,
      durationHours: parseDurationToHours(task.Duration),
      isSummary: task.Summary === 1,
      isMilestone: task.Milestone === 1,
      isCritical: task.Critical === 1,
      children: [],
      dependencies: [],
      parentId: parentId,
      wbs: task.OutlineNumber || "",
    };

    validUids.add(task.UID);
    uidMapping.set(task.UID, cpmTask);
    metrics.tasksToImport++;
    if (cpmTask.isMilestone) {
      metrics.milestoneCount++;
    }

    if (task.PredecessorLink) {
      const links = Array.isArray(task.PredecessorLink) ? task.PredecessorLink : [task.PredecessorLink];
      for (const link of links) {
        cpmTask.dependencies.push({
          predecessorId: `task-${link.PredecessorUID}`,
          type: link.Type,
        });
        metrics.dependencyCount++;
      }
    }

    for (const child of node.children) {
      const processedChildren = processNode(child, cpmId);
      cpmTask.children.push(...processedChildren);
    }

    if (cpmTask.children.length === 0 && cpmTask.isSummary) {
      cpmTask.isSummary = false;
    } else if (cpmTask.children.length > 0 && !cpmTask.isSummary) {
      cpmTask.isSummary = true; // Fix summary flag if children were attached
    }

    return [cpmTask];
  }

  for (const root of rootNodes) {
    cpmTasks.push(...processNode(root));
  }

  for (const task of uidMapping.values()) {
    task.dependencies = task.dependencies.filter(dep => {
      const predUid = parseInt(dep.predecessorId.replace('task-', ''), 10);
      if (!validUids.has(predUid)) {
        metrics.warnings.push(`Task "${task.name}" references missing or ignored predecessor UID ${predUid}. Dependency removed.`);
        metrics.dependencyCount--;
        return false;
      }
      return true;
    });
  }

  return {
    tasks: cpmTasks,
    metrics
  };
}
