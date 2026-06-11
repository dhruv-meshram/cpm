import { prisma } from '@/lib/prisma';
import { permissionCache } from './permission-cache';

export type ProjectRole = string;

export async function getProjectMember(userId: string, projectId: string) {
  return prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
    include: { customRole: true }
  });
}

export async function getProjectRole(userId: string, projectId: string): Promise<string | null> {
  try {
    const roles = await permissionCache.getUserRoles(userId);
    return roles.projectRoles[projectId] || null;
  } catch (err) {
    const member = await getProjectMember(userId, projectId);
    return member?.role || null;
  }
}

export async function hasPermission(
  userId: string,
  projectId: string,
  action:
    | 'view'
    | 'create_task'
    | 'edit_task'
    | 'submit_task'
    | 'approve_dept_task'
    | 'approve_final'
    | 'manage_members'
    | 'delete_project'
    | 'post_announcement'
    | 'manage_departments'
    | 'manage_tags'
    | 'manage_roles',
  context?: { taskId?: string; departmentId?: string }
): Promise<boolean> {
  // Check permission cache first
  const cachedResult = await permissionCache.getPermissionCheck(userId, projectId, action, context);
  if (cachedResult !== null) {
    return cachedResult;
  }

  // Cache miss -> Resolve from database
  const allowed = await resolvePermissionFromDB(userId, projectId, action, context);

  // Cache result
  await permissionCache.setPermissionCheck(userId, projectId, action, context, allowed);

  return allowed;
}

async function resolvePermissionFromDB(
  userId: string,
  projectId: string,
  action: string,
  context?: { taskId?: string; departmentId?: string }
): Promise<boolean> {
  const member = await getProjectMember(userId, projectId);
  if (!member) return false;

  const role = member.role.toUpperCase().replace(' ', '_');

  // PROJECT ADMIN and ADMIN roles have full access to everything
  if (role === 'PROJECT_ADMIN' || role === 'ADMIN') {
    return true;
  }

  // Evaluate custom role if assigned
  if (member.customRole) {
    const cr = member.customRole;
    switch (action) {
      case 'view':
        return true;
      case 'create_task':
        return cr.addTasks;
      case 'edit_task':
        if (cr.modifyTasks === 'ALL') return true;
        if (cr.modifyTasks === 'ASSIGNED') {
          if (context?.taskId) {
            const isAssignee = await prisma.taskAssignee.findUnique({
              where: {
                taskId_userId: {
                  taskId: context.taskId,
                  userId
                }
              }
            });
            if (isAssignee) return true;
          }
        }
        return false;
      case 'submit_task':
        return cr.changeTaskStatus;
      case 'approve_dept_task':
      case 'approve_final':
        return cr.approveTasks;
      case 'post_announcement':
        return cr.makeAnnouncements;
      case 'manage_members':
        return cr.manageTeam;
      case 'manage_departments':
        return cr.addDepartments;
      case 'manage_tags':
        return cr.manageTags;
      case 'manage_roles':
        return cr.manageRoles;
      case 'delete_project':
        return false;
      default:
        return false;
    }
  }

  // Fallback to standard roles
  switch (action) {
    case 'view':
      return true; // Any project member can view

    case 'create_task':
    case 'submit_task':
      return true; // All members can create tasks or submit for review

    case 'edit_task': {
      // PM, Captain can edit any task
      if (role === 'PROJECT_MANAGER' || role === 'CAPTAIN') {
        return true;
      }
      // Members and Department Heads can edit only if they are assigned to the task
      if (context?.taskId) {
        const isAssignee = await prisma.taskAssignee.findUnique({
          where: {
            taskId_userId: {
              taskId: context.taskId,
              userId
            }
          }
        });
        if (isAssignee) return true;
      }
      return false;
    }

    case 'approve_dept_task': {
      // PM and Captain can approve department tasks
      if (role === 'PROJECT_MANAGER' || role === 'CAPTAIN') {
        return true;
      }
      // Department Head can approve if task belongs to their department
      if (role === 'DEPARTMENT_HEAD') {
        if (!member.departmentId) return false; // Must belong to a department
        
        // If a specific task is provided, check if it belongs to the department
        if (context?.taskId) {
          const task = await prisma.task.findUnique({
            where: { id: context.taskId },
            include: { departments: true }
          });
          if (!task) return false;
          return task.departments.some(d => d.id === member.departmentId);
        }
        
        // If a department context is provided, check if it matches the user's department
        if (context?.departmentId) {
          return context.departmentId === member.departmentId;
        }

        return true; // Generic approval permission for their own department
      }
      return false;
    }

    case 'approve_final': {
      // Only Captain can approve final
      return role === 'CAPTAIN';
    }

    case 'post_announcement': {
      // Captain and Project Manager can post announcements
      return role === 'CAPTAIN' || role === 'PROJECT_MANAGER';
    }

    case 'manage_members': {
      // Captain and Project Manager can manage members
      return role === 'CAPTAIN' || role === 'PROJECT_MANAGER';
    }

    case 'manage_departments': {
      return role === 'CAPTAIN' || role === 'PROJECT_MANAGER';
    }

    case 'manage_tags': {
      return role === 'CAPTAIN' || role === 'PROJECT_MANAGER';
    }

    case 'manage_roles': {
      return role === 'CAPTAIN' || role === 'PROJECT_MANAGER';
    }

    case 'delete_project':
      return false; // Only PROJECT ADMIN/ADMIN can delete project

    default:
      return false;
  }
}
