import { prisma } from '@/lib/prisma';
import { emitToProjectRoom } from './ws-emitter';

interface LogActivityParams {
  entityType: string;
  entityId: string;
  action: string;
  userId?: string;
  projectId?: string;
  oldValue?: any;
  newValue?: any;
}

export async function logActivity({
  entityType,
  entityId,
  action,
  userId,
  projectId: passedProjectId,
  oldValue,
  newValue
}: LogActivityParams) {
  try {
    let projectId = passedProjectId;
    
    // Resolve projectId if not passed
    if (!projectId) {
      if (entityType === 'Project') {
        projectId = entityId;
      } else if (entityType === 'Task') {
        const task = await prisma.task.findUnique({
          where: { id: entityId },
          select: { projectId: true }
        });
        if (task) {
          projectId = task.projectId;
        }
      }
    }

    let userName: string | null = null;
    let workspaceName: string | null = null;
    let userRole: string | null = null;

    // Fetch user details if userId is present
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true }
      });
      if (user) {
        userName = user.name;
      }
    }

    // Fetch project and workspace details if projectId is resolved
    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: {
          workspace: {
            select: { name: true }
          }
        }
      });
      if (project) {
        workspaceName = project.workspace.name;
      }

      // Fetch project member role
      if (userId) {
        const member = await prisma.projectMember.findUnique({
          where: {
            projectId_userId: {
              projectId,
              userId
            }
          },
          select: { role: true }
        });
        if (member) {
          userRole = member.role;
        }
      }
    }

    // Create the enhanced activity log entry
    await prisma.activityLog.create({
      data: {
        entityType,
        entityId,
        action,
        userId,
        oldValue: oldValue ? JSON.stringify(oldValue) : undefined,
        newValue: newValue ? JSON.stringify(newValue) : undefined,
        userName,
        workspaceName,
        userRole,
      }
    });

    // Emits
    if (projectId) {
      await emitToProjectRoom(projectId, 'activity_logged', {
        action,
        userId,
        userName,
        userRole,
        workspaceName,
        target: entityType === 'Task' ? entityId : undefined,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    // Swallow logging errors to prevent breaking main transaction flows
    console.error('Failed to log activity:', error);
  }
}

export function formatActivityLog(act: any, projectName: string) {
  let actionType = act.action || '';
  const actionLower = actionType.toLowerCase();
  
  let taskId: string | undefined = undefined;
  let taskCode: string | undefined = undefined;
  let sourceTaskId: string | undefined = undefined;
  let sourceTaskCode: string | undefined = undefined;
  let targetTaskId: string | undefined = undefined;
  let targetTaskCode: string | undefined = undefined;

  // 1. Check if dependency added or removed
  const depMatch = actionType.match(/Dependency\s+(added|removed):\s+Task\s+([^\s]+)\s+->\s+Task\s+([^\s]+)/i);
  if (depMatch && depMatch[2] && depMatch[3]) {
    const isAdded = depMatch[1].toLowerCase() === 'added';
    actionType = isAdded ? "DEPENDENCY_ADDED" : "DEPENDENCY_REMOVED";
    sourceTaskId = depMatch[2];
    targetTaskId = depMatch[3];
    sourceTaskCode = `CP-${depMatch[2].slice(0, 4).toUpperCase()}`;
    targetTaskCode = `CP-${depMatch[3].slice(0, 4).toUpperCase()}`;
  } else {
    // Check if task-related
    if (act.entityType === 'Task' && act.entityId) {
      taskId = act.entityId;
      taskCode = `CP-${act.entityId.slice(0, 4).toUpperCase()}`;
      
      if (actionLower.startsWith('task created') || actionLower.includes('created task') || actionLower.includes('created a task') || actionLower === 'created') {
        actionType = "TASK_CREATED";
      } else if (actionLower.startsWith('updated: changed') || actionLower.startsWith('updated task details')) {
        const changeTypes: string[] = [];
        if (actionLower.includes('name to')) changeTypes.push('Name');
        if (actionLower.includes('description')) changeTypes.push('Description');
        if (actionLower.includes('duration to')) changeTypes.push('Duration');
        if (actionLower.includes('start date')) changeTypes.push('Start Date');
        if (actionLower.includes('end date')) changeTypes.push('End Date');
        if (actionLower.includes('status to')) changeTypes.push('Status');
        if (actionLower.includes('tags')) changeTypes.push('Tags');
        if (actionLower.includes('assignees')) changeTypes.push('Assignees');
        
        if (changeTypes.length > 0) {
          actionType = `TASK_UPDATED (${changeTypes.join(', ')})`;
        } else {
          actionType = "TASK_UPDATED";
        }
      } else if (actionLower.includes('status') || actionLower.includes('state') || actionLower.includes('approved') || actionLower.includes('rejected')) {
        actionType = "STATUS_CHANGED";
      } else if (actionLower.includes('assignee') || actionLower.includes('assigned')) {
        actionType = "ASSIGNEE_CHANGED";
      } else if (actionLower.includes('comment')) {
        actionType = "COMMENT_ADDED";
      } else if (actionLower.startsWith('task went overdue')) {
        actionType = "TASK_OVERDUE";
      } else {
        actionType = "TASK_UPDATED";
      }
    } else if (act.entityType === 'Project') {
      if (actionLower.startsWith('created announcement')) {
        actionType = "PROJECT_ANNOUNCEMENT";
      } else if (actionLower.startsWith('added member')) {
        actionType = "MEMBER_ADDED";
      } else if (actionLower.startsWith('updated') && actionLower.includes('role to')) {
        actionType = "MEMBER_ROLE_UPDATED";
      } else if (actionLower.startsWith('removed member')) {
        actionType = "MEMBER_REMOVED";
      }
    }
  }

  // If status changed, extract state transitions
  if (actionType.startsWith("STATUS_CHANGED")) {
    let oldState = "";
    let newState = "";
    
    if (act.oldValue) {
      try {
        const parsed = typeof act.oldValue === 'string' ? JSON.parse(act.oldValue) : act.oldValue;
        oldState = parsed?.state || "";
      } catch {}
    }
    if (act.newValue) {
      try {
        const parsed = typeof act.newValue === 'string' ? JSON.parse(act.newValue) : act.newValue;
        newState = parsed?.state || "";
      } catch {}
    }

    if (!newState) {
      const stateMatch = actionType.match(/(?:status|state)\s+to\s+([A-Z_]+)/i) || actionLower.match(/(?:status|state)\s+to\s+([a-z_]+)/i);
      if (stateMatch) {
        newState = stateMatch[1].toUpperCase();
      }
    }

    const formatState = (s: string) => s.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    
    let transition = "";
    if (newState) {
      if (oldState) {
        transition = ` (${formatState(oldState)} → ${formatState(newState)})`;
      } else {
        transition = ` (→ ${formatState(newState)})`;
      }
    } else if (actionLower.includes("approved")) {
      transition = ` (→ Done)`;
    } else if (actionLower.includes("rejected")) {
      transition = ` (→ Todo)`;
    }
    actionType = `STATUS_CHANGED${transition}`;
  }

  if (actionLower.includes('approved by')) {
    actionType = `REVIEW_APPROVED${act.action.substring(act.action.toLowerCase().indexOf(' by'))}`;
  } else if (actionLower.includes('rejected by') || actionLower.includes('declined by')) {
    actionType = `REVIEW_DECLINED${act.action.substring(act.action.toLowerCase().indexOf(' by'))}`;
  }

  return {
    id: act.id,
    action: actionType,
    actorId: act.userId || 'system',
    actorName: act.userName || act.user?.name || 'System',
    projectId: act.entityType === 'Project' ? act.entityId : act.projectId || '',
    projectName: projectName,
    taskId,
    taskCode,
    sourceTaskId,
    sourceTaskCode,
    targetTaskId,
    targetTaskCode,
    createdAt: act.timestamp,
    timestamp: act.timestamp,
    user: act.userName || act.user?.name || 'System',
    role: act.userRole,
    workspace: act.workspaceName,
    entityType: act.entityType,
    entityId: act.entityId
  };
}

export async function checkAndLogOverdueTasks(projectId: string) {
  try {
    const now = new Date();
    const overdueTasks = await prisma.task.findMany({
      where: {
        projectId,
        state: { not: 'DONE' },
        endDate: { lt: now },
        deletedAt: null
      },
      select: {
        id: true,
        title: true
      }
    });

    for (const t of overdueTasks) {
      const alreadyLogged = await prisma.activityLog.findFirst({
        where: {
          entityType: 'Task',
          entityId: t.id,
          action: { startsWith: 'Task went overdue' }
        }
      });
      if (!alreadyLogged) {
        await prisma.activityLog.create({
          data: {
            entityType: 'Task',
            entityId: t.id,
            action: `Task went overdue: ${t.title}`,
            userId: null
          }
        });
      }
    }
  } catch (error) {
    console.error('Error checking overdue tasks:', error);
  }
}
