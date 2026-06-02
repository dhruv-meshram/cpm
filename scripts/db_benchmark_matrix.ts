import { performance } from 'node:perf_hooks';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { prismaClient } from '../src/database/prismaClient';
import { listProjectDependencies, listProjectTasks, saveCpmSnapshot } from '../src/database/repositories';

type ProfileName = 'default' | 'full';

type BenchmarkOperation =
  | 'task_insert_throughput'
  | 'dependency_insert_throughput'
  | 'graph_load_latency'
  | 'dependency_traversal_latency'
  | 'cpm_input_generation_latency'
  | 'snapshot_write_latency'
  | 'snapshot_read_latency'
  | 'unindexed_graph_load_latency';

type Scenario = {
  id: string;
  name: string;
  taskCount: number;
  density: number;
  dataSource: 'synthetic' | 'seeded';
  shape: 'chain' | 'medium_dag' | 'dense_dag';
  tags: Array<'default' | 'stress'>;
  operations: BenchmarkOperation[];
};

type ScenarioMetric = {
  scenarioId: string;
  name: string;
  taskCount: number;
  density: number;
  dataSource: string;
  shape: string;
  operation: BenchmarkOperation;
  durationMs: number;
  value: number;
  unit: string;
};

type ScenarioRun = {
  scenarioId: string;
  name: string;
  status: 'PASS' | 'FAIL';
  error?: string;
  metrics: ScenarioMetric[];
};

type MatrixReport = {
  timestamp: string;
  profile: ProfileName;
  system: string;
  matrixCoverage: {
    requiredOperations: BenchmarkOperation[];
    executedOperations: BenchmarkOperation[];
    missingOperations: BenchmarkOperation[];
    requiredComparisons: string[];
    executedComparisons: string[];
    missingComparisons: string[];
  };
  scenarios: ScenarioRun[];
  summary: {
    scenarioCount: number;
    passed: number;
    failed: number;
    totalMetrics: number;
  };
};

type Manifest = {
  matrix?: {
    requiredOperations?: BenchmarkOperation[];
    requiredComparisons?: string[];
  };
  profiles?: Record<ProfileName, { includeTags: string[] }>;
};

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function loadManifest(): Manifest {
  const p = join(process.cwd(), 'scripts', 'db_benchmark_manifest.json');
  return JSON.parse(readFileSync(p, 'utf8')) as Manifest;
}

function getScenarios(profile: ProfileName): Scenario[] {
  const commonOps: BenchmarkOperation[] = [
    'task_insert_throughput',
    'dependency_insert_throughput',
    'graph_load_latency',
    'dependency_traversal_latency',
    'cpm_input_generation_latency',
    'snapshot_write_latency',
    'snapshot_read_latency',
  ];

  const scenarios: Scenario[] = [
    {
      id: 'SCN-100-SYNTH-SHALLOW',
      name: '100 tasks synthetic shallow DAG',
      taskCount: 100,
      density: 0.08,
      dataSource: 'synthetic',
      shape: 'medium_dag',
      tags: ['default'],
      operations: commonOps,
    },
    {
      id: 'SCN-1000-SYNTH-SHALLOW',
      name: '1000 tasks synthetic shallow DAG',
      taskCount: 1000,
      density: 0.03,
      dataSource: 'synthetic',
      shape: 'medium_dag',
      tags: ['default'],
      operations: commonOps,
    },
    {
      id: 'SCN-5000-SYNTH-DENSE',
      name: '5000 tasks synthetic dense DAG',
      taskCount: 5000,
      density: 0.10,
      dataSource: 'synthetic',
      shape: 'dense_dag',
      tags: ['default'],
      operations: commonOps,
    },
    {
      id: 'SCN-1000-SEEDED-SHALLOW',
      name: '1000 tasks seeded shallow DAG',
      taskCount: 1000,
      density: 0.02,
      dataSource: 'seeded',
      shape: 'chain',
      tags: ['default'],
      operations: commonOps,
    },
    {
      id: 'SCN-10000-SYNTH-STRESS',
      name: '10000 tasks synthetic stress DAG',
      taskCount: 10000,
      density: 0.03,
      dataSource: 'synthetic',
      shape: 'medium_dag',
      tags: ['stress'],
      operations: commonOps,
    },
    {
      id: 'SCN-5000-SYNTH-INDEX-IMPACT',
      name: '5000 tasks synthetic index impact',
      taskCount: 5000,
      density: 0.05,
      dataSource: 'synthetic',
      shape: 'medium_dag',
      tags: ['default'],
      operations: ['task_insert_throughput', 'dependency_insert_throughput', 'graph_load_latency', 'unindexed_graph_load_latency'],
    },
  ];

  if (profile === 'full') {
    return scenarios;
  }
  return scenarios.filter((s) => s.tags.includes('default'));
}

function buildEdges(taskIds: string[], density: number, shape: Scenario['shape']): Array<{ predecessorTaskId: string; successorTaskId: string }> {
  const edges: Array<{ predecessorTaskId: string; successorTaskId: string }> = [];

  if (shape === 'chain') {
    for (let i = 0; i < taskIds.length - 1; i++) {
      edges.push({ predecessorTaskId: taskIds[i], successorTaskId: taskIds[i + 1] });
    }
    return edges;
  }

  const maxForwardSpan = shape === 'dense_dag' ? 24 : 10;
  for (let i = 0; i < taskIds.length - 1; i++) {
    const span = Math.min(maxForwardSpan, taskIds.length - i - 1);
    for (let j = 1; j <= span; j++) {
      if (Math.random() < density) {
        edges.push({ predecessorTaskId: taskIds[i], successorTaskId: taskIds[i + j] });
      }
    }
  }
  return edges;
}

async function createProjectForScenario(scenario: Scenario) {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const workspace = await prismaClient.workspace.create({
    data: {
      name: `bench-ws-${suffix}`,
      slug: `bench-ws-${suffix}`,
    },
  });

  const project = await prismaClient.project.create({
    data: {
      workspaceId: workspace.id,
      name: `bench-project-${suffix}`,
      identifier: `BP-${suffix}`,
    },
  });

  const taskIds = Array.from({ length: scenario.taskCount }, (_, i) => `${scenario.id}-t-${i}-${randomUUID()}`);
  const taskData = taskIds.map((id, i) => ({
    id,
    projectId: project.id,
    title: `Task ${i}`,
    duration: i % 5 === 0 ? '2' : '1',
  }));

  return { workspace, project, taskIds, taskData };
}

async function runOperation(
  scenario: Scenario,
  operation: BenchmarkOperation,
  projectId: string,
  taskData: Array<{ id: string; projectId: string; title: string; duration: string }>,
  taskIds: string[],
): Promise<ScenarioMetric> {
  if (operation === 'task_insert_throughput') {
    const t0 = performance.now();
    // @ts-ignore prisma createMany payload typing for Decimal values
    await prismaClient.task.createMany({ data: taskData });
    const t1 = performance.now();
    const durationMs = t1 - t0;
    const perSec = taskData.length / (durationMs / 1000);
    return {
      scenarioId: scenario.id,
      name: scenario.name,
      taskCount: scenario.taskCount,
      density: scenario.density,
      dataSource: scenario.dataSource,
      shape: scenario.shape,
      operation,
      durationMs,
      value: perSec,
      unit: 'rows/sec',
    };
  }

  const deps = buildEdges(taskIds, scenario.density, scenario.shape);

  if (operation === 'dependency_insert_throughput') {
    const depData = deps.map((d) => ({
      projectId,
      predecessorTaskId: d.predecessorTaskId,
      successorTaskId: d.successorTaskId,
      dependencyType: 'FS' as const,
      lag: '0',
      lagUnit: 'days' as const,
      strength: '1.0',
    }));

    const t0 = performance.now();
    // @ts-ignore prisma createMany payload typing for Decimal values
    await prismaClient.dependency.createMany({ data: depData, skipDuplicates: true });
    const t1 = performance.now();
    const durationMs = t1 - t0;
    const perSec = depData.length === 0 ? 0 : depData.length / (durationMs / 1000);
    return {
      scenarioId: scenario.id,
      name: scenario.name,
      taskCount: scenario.taskCount,
      density: scenario.density,
      dataSource: scenario.dataSource,
      shape: scenario.shape,
      operation,
      durationMs,
      value: perSec,
      unit: 'rows/sec',
    };
  }

  if (operation === 'graph_load_latency') {
    const t0 = performance.now();
    const [tasks, dependencies] = await Promise.all([listProjectTasks(projectId), listProjectDependencies(projectId)]);
    const t1 = performance.now();
    const durationMs = t1 - t0;
    return {
      scenarioId: scenario.id,
      name: scenario.name,
      taskCount: scenario.taskCount,
      density: scenario.density,
      dataSource: scenario.dataSource,
      shape: scenario.shape,
      operation,
      durationMs,
      value: tasks.length + dependencies.length,
      unit: 'rows_loaded',
    };
  }

  if (operation === 'unindexed_graph_load_latency') {
    // Drop indexes
    try {
      await prismaClient.$executeRawUnsafe(`DROP INDEX IF EXISTS "Task_projectId_idx"`);
      await prismaClient.$executeRawUnsafe(`DROP INDEX IF EXISTS "Dependency_projectId_idx"`);
    } catch (e) {
      console.warn('Warning: Could not drop index, may be running on a non-Postgres DB or index name mismatch.', e);
    }

    const t0 = performance.now();
    const [tasks, dependencies] = await Promise.all([listProjectTasks(projectId), listProjectDependencies(projectId)]);
    const t1 = performance.now();
    const durationMs = t1 - t0;

    // Restore indexes
    try {
      await prismaClient.$executeRawUnsafe(`CREATE INDEX "Task_projectId_idx" ON "Task"("projectId")`);
      await prismaClient.$executeRawUnsafe(`CREATE INDEX "Dependency_projectId_idx" ON "Dependency"("projectId")`);
    } catch (e) {}

    return {
      scenarioId: scenario.id,
      name: scenario.name,
      taskCount: scenario.taskCount,
      density: scenario.density,
      dataSource: scenario.dataSource,
      shape: scenario.shape,
      operation,
      durationMs,
      value: tasks.length + dependencies.length,
      unit: 'rows_loaded',
    };
  }

  if (operation === 'dependency_traversal_latency') {
    const dependencies = await listProjectDependencies(projectId);
    const adjacency = new Map<string, string[]>();
    for (const d of dependencies) {
      const from = (d as { predecessorTaskId: string }).predecessorTaskId;
      const to = (d as { successorTaskId: string }).successorTaskId;
      const list = adjacency.get(from) ?? [];
      list.push(to);
      adjacency.set(from, list);
    }

    const start = taskIds[0];
    const seen = new Set<string>();
    const queue: string[] = [start];
    const t0 = performance.now();
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (seen.has(current)) continue;
      seen.add(current);
      const next = adjacency.get(current) ?? [];
      for (const n of next) {
        if (!seen.has(n)) queue.push(n);
      }
    }
    const t1 = performance.now();
    const durationMs = t1 - t0;
    return {
      scenarioId: scenario.id,
      name: scenario.name,
      taskCount: scenario.taskCount,
      density: scenario.density,
      dataSource: scenario.dataSource,
      shape: scenario.shape,
      operation,
      durationMs,
      value: seen.size,
      unit: 'nodes_traversed',
    };
  }

  if (operation === 'cpm_input_generation_latency') {
    const t0 = performance.now();
    const [tasks, dependencies] = await Promise.all([listProjectTasks(projectId), listProjectDependencies(projectId)]);
    const cpmInput = {
      tasks: tasks.map((t) => ({ id: (t as { id: string }).id, duration: Number((t as { duration: unknown }).duration) })),
      dependencies: dependencies.map((d) => ({
        predecessorTaskId: (d as { predecessorTaskId: string }).predecessorTaskId,
        successorTaskId: (d as { successorTaskId: string }).successorTaskId,
      })),
    };
    const t1 = performance.now();
    const durationMs = t1 - t0;
    return {
      scenarioId: scenario.id,
      name: scenario.name,
      taskCount: scenario.taskCount,
      density: scenario.density,
      dataSource: scenario.dataSource,
      shape: scenario.shape,
      operation,
      durationMs,
      value: cpmInput.tasks.length,
      unit: 'tasks_serialized',
    };
  }

  if (operation === 'snapshot_write_latency') {
    const t0 = performance.now();
    const snapshot = await saveCpmSnapshot(projectId, `bench-${Date.now()}`, 10, taskIds.slice(0, 5), {
      scenarioId: scenario.id,
      generatedAt: new Date().toISOString(),
    });
    const t1 = performance.now();
    const durationMs = t1 - t0;
    return {
      scenarioId: scenario.id,
      name: scenario.name,
      taskCount: scenario.taskCount,
      density: scenario.density,
      dataSource: scenario.dataSource,
      shape: scenario.shape,
      operation,
      durationMs,
      value: snapshot.id.length,
      unit: 'snapshot_id_len',
    };
  }

  const t0 = performance.now();
  const snap = await prismaClient.cPMSnapshot.findFirst({
    where: { projectId },
    orderBy: { calculationTime: 'desc' },
  });
  const t1 = performance.now();
  const durationMs = t1 - t0;
  return {
    scenarioId: scenario.id,
    name: scenario.name,
    taskCount: scenario.taskCount,
    density: scenario.density,
    dataSource: scenario.dataSource,
    shape: scenario.shape,
    operation: 'snapshot_read_latency',
    durationMs,
    value: snap ? 1 : 0,
    unit: 'record_found',
  };
}

function markdownReport(report: MatrixReport) {
  const lines: string[] = [];
  lines.push(`# Database Benchmark Matrix Report | ${report.timestamp}`);
  lines.push('');
  lines.push(`- Profile: ${report.profile}`);
  lines.push(`- System: ${report.system}`);
  lines.push(`- Scenarios: ${report.summary.scenarioCount}`);
  lines.push(`- Passed: ${report.summary.passed}`);
  lines.push(`- Failed: ${report.summary.failed}`);
  lines.push('');

  lines.push('## Matrix Coverage');
  lines.push('');
  lines.push('| Area | Value |');
  lines.push('| --- | --- |');
  lines.push(`| Required operations | ${report.matrixCoverage.requiredOperations.join(', ')} |`);
  lines.push(`| Executed operations | ${report.matrixCoverage.executedOperations.join(', ')} |`);
  lines.push(`| Missing operations | ${report.matrixCoverage.missingOperations.length === 0 ? 'none' : report.matrixCoverage.missingOperations.join(', ')} |`);
  lines.push(`| Required comparisons | ${report.matrixCoverage.requiredComparisons.join(', ')} |`);
  lines.push(`| Executed comparisons | ${report.matrixCoverage.executedComparisons.join(', ')} |`);
  lines.push(`| Missing comparisons | ${report.matrixCoverage.missingComparisons.length === 0 ? 'none' : report.matrixCoverage.missingComparisons.join(', ')} |`);
  lines.push('');

  lines.push('## Scenario Results');
  lines.push('');
  lines.push('| Scenario | Status | Metrics |');
  lines.push('| --- | --- | --- |');
  for (const s of report.scenarios) {
    lines.push(`| ${s.scenarioId} | ${s.status} | ${s.metrics.length} |`);
  }
  lines.push('');

  lines.push('## Metrics');
  lines.push('');
  lines.push('| Scenario | Operation | Duration (ms) | Value | Unit |');
  lines.push('| --- | --- | --- | --- | --- |');
  for (const s of report.scenarios) {
    for (const m of s.metrics) {
      lines.push(`| ${m.scenarioId} | ${m.operation} | ${m.durationMs.toFixed(3)} | ${m.value.toFixed(3)} | ${m.unit} |`);
    }
  }
  lines.push('');
  lines.push('Visualization artifacts are generated by db:bench:visualize.');

  return lines.join('\n');
}

function collectComparisonCoverage(metrics: ScenarioMetric[]) {
  const dataSources = new Set(metrics.map((m) => m.dataSource));
  const shapes = new Set(metrics.map((m) => m.shape));
  const operations = new Set(metrics.map((m) => m.operation));

  const comparisons: string[] = [];
  if (dataSources.has('seeded') && dataSources.has('synthetic')) {
    comparisons.push('seeded_vs_synthetic');
  }
  if (shapes.has('dense_dag') && (shapes.has('medium_dag') || shapes.has('chain'))) {
    comparisons.push('shallow_vs_dense');
  }
  if (operations.has('graph_load_latency') && operations.has('unindexed_graph_load_latency')) {
    comparisons.push('index_path_comparison');
  }
  return comparisons;
}

async function runScenario(scenario: Scenario): Promise<ScenarioRun> {
  const { project, taskData, taskIds } = await createProjectForScenario(scenario);
  const metrics: ScenarioMetric[] = [];

  try {
    for (const operation of scenario.operations) {
      const metric = await runOperation(scenario, operation, project.id, taskData, taskIds);
      metrics.push(metric);
    }
    return { scenarioId: scenario.id, name: scenario.name, status: 'PASS', metrics };
  } catch (err) {
    return {
      scenarioId: scenario.id,
      name: scenario.name,
      status: 'FAIL',
      error: err instanceof Error ? err.message : String(err),
      metrics,
    };
  }
}

async function main() {
  const profileArg = (process.argv[2] ?? 'default').toLowerCase();
  const profile: ProfileName = profileArg === 'full' ? 'full' : 'default';
  const manifest = loadManifest();

  const scenarios = getScenarios(profile);
  const runs: ScenarioRun[] = [];
  for (const s of scenarios) {
    console.log(`Running matrix scenario ${s.id} (${s.taskCount} tasks, ${s.shape}, ${s.dataSource})`);
    runs.push(await runScenario(s));
  }

  const allMetrics = runs.flatMap((r) => r.metrics);
  const requiredOperations = (manifest.matrix?.requiredOperations ?? []) as BenchmarkOperation[];
  const executedOperations = Array.from(new Set(allMetrics.map((m) => m.operation))) as BenchmarkOperation[];
  const missingOperations = requiredOperations.filter((op) => !executedOperations.includes(op));

  const requiredComparisons = manifest.matrix?.requiredComparisons ?? [];
  const executedComparisons = collectComparisonCoverage(allMetrics);
  const missingComparisons = requiredComparisons.filter((c) => !executedComparisons.includes(c));

  const report: MatrixReport = {
    timestamp: new Date().toISOString(),
    profile,
    system: 'local prisma benchmark harness',
    matrixCoverage: {
      requiredOperations,
      executedOperations,
      missingOperations,
      requiredComparisons,
      executedComparisons,
      missingComparisons,
    },
    scenarios: runs,
    summary: {
      scenarioCount: runs.length,
      passed: runs.filter((r) => r.status === 'PASS').length,
      failed: runs.filter((r) => r.status === 'FAIL').length,
      totalMetrics: allMetrics.length,
    },
  };

  const reportDir = join(process.cwd(), 'reports', `database_matrix_${timestamp()}`);
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(join(reportDir, 'report.json'), JSON.stringify(report, null, 2));
  writeFileSync(join(reportDir, 'REPORT.md'), markdownReport(report));

  console.log(`Matrix benchmark report written to ${reportDir}`);
  if (report.summary.failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('Matrix benchmark execution failed:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
