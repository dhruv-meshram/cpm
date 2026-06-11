import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logActivity, formatActivityLog } from '@/lib/activity';
import { hasPermission } from '@/lib/permissions';
import { apiCache } from '@/lib/cache';
import { projectOverviewCache } from '@/lib/project-overview-cache';
import { queryCache } from '@/lib/query-cache';
import { permissionCache } from '@/lib/permission-cache';
import { createNotification } from '@/lib/notification-cache';

export async function GET(req: Request, { params }: { params: Promise<{ projectId: string, taskId: string }> }) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, taskId } = await params;

    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: session.userId as string } }
    });
    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true }
    });
    const projectName = project?.name || 'Unknown Project';

    const activities = await prisma.activityLog.findMany({
      where: {
        entityType: 'Task',
        entityId: taskId
      },
      orderBy: { timestamp: 'desc' },
      include: {
        user: { select: { name: true } }
      }
    });

    const approvals = await prisma.taskApproval.findMany({
      where: { taskId },
      orderBy: { timestamp: 'desc' },
      include: {
        reviewer: {
          select: { name: true }
        }
      }
    });

    const formattedActivities = activities.map(act => {
      const formatted = formatActivityLog(act, projectName);
      formatted.projectId = projectId;
      return formatted;
    });

    return NextResponse.json({
      activities: formattedActivities,
      approvals
    });
  } catch (error) {
    console.error('Fetch task details/activity error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ projectId: string, taskId: string }> }) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, taskId } = await params;

    const existingTask = await prisma.task.findUnique({
      where: { id: taskId, projectId }
    });

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (!await hasPermission(session.userId as string, projectId, 'edit_task', { taskId })) {
      return NextResponse.json({ error: 'You do not have permission to modify this task.' }, { status: 403 });
    }

    const body = await req.json();
    const { title, description, duration, state, startDate, endDate, departmentIds, tagIds, assigneeIds } = body;

    if (state && state !== existingTask.state) {
      if (!await hasPermission(session.userId as string, projectId, 'submit_task', { taskId })) {
        return NextResponse.json({ error: 'You do not have permission to change the status of this task.' }, { status: 403 });
      }
    }

    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: session.userId as string } }
    });

    if (state === 'DONE' && membership && ['MEMBER'].includes(membership.role.toUpperCase())) {
      const approved = await prisma.taskApproval.findFirst({
        where: { taskId, decision: 'APPROVED' }
      });
      if (!approved) {
        return NextResponse.json({ error: 'MEMBER role cannot transition task directly to DONE without approval.' }, { status: 403 });
      }
    }

    if (state === 'REVIEW' && existingTask.state !== 'REVIEW') {
      await prisma.taskApproval.create({
        data: {
          taskId,
          reviewerId: session.userId as string,
          decision: 'SUBMITTED',
          comment: 'Task submitted for approval'
        }
      });
    }

    if (duration !== undefined) {
      if (typeof duration !== 'number' || !Number.isInteger(duration) || duration < 0) {
        return NextResponse.json({ error: 'Duration must be a non-negative integer' }, { status: 400 });
      }
    }

    const existingTags = await prisma.taskTag.findMany({
      where: { taskId }
    });
    const existingTagIds = existingTags.map((et: any) => et.tagId);

    const existingAssignees = await prisma.taskAssignee.findMany({
      where: { taskId }
    });
    const existingAssigneeIds = existingAssignees.map((a: any) => a.userId);

    const task = await prisma.task.update({
      where: { id: taskId, projectId },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(duration !== undefined && { duration, estimatedDays: duration }),
        ...(state && { state }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(state === 'DONE' && { completedAt: new Date() }),
        ...(departmentIds !== undefined && {
          departments: {
            set: departmentIds.map((id: string) => ({ id }))
          }
        }),
        ...(tagIds !== undefined && {
          taskTags: {
            deleteMany: {},
            create: tagIds.map((id: string) => ({ tagId: id }))
          }
        }),
        ...(assigneeIds !== undefined && {
          assignees: {
            deleteMany: {},
            create: assigneeIds.map((userId: string) => ({ userId }))
          }
        })
      },
      include: {
        departments: true,
        taskTags: {
          include: {
            tag: true
          }
        },
        assignees: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    // Compare and log descriptive activity
    const changes: string[] = [];
    if (title && title !== existingTask.title) {
      changes.push(`name to "${title}"`);
    }
    if (description !== undefined && description !== (existingTask.description || '')) {
      changes.push(`description`);
    }
    if (duration !== undefined && duration !== existingTask.duration) {
      changes.push(`duration to ${duration}d`);
    }
    if (state && state !== existingTask.state) {
      changes.push(`status to ${state}`);
    }
    const oldStart = existingTask.startDate ? new Date(existingTask.startDate).toISOString().split('T')[0] : '';
    const newStart = startDate ? new Date(startDate).toISOString().split('T')[0] : '';
    if (startDate !== undefined && newStart !== oldStart) {
      changes.push(`start date`);
    }
    const oldEnd = existingTask.endDate ? new Date(existingTask.endDate).toISOString().split('T')[0] : '';
    const newEnd = endDate ? new Date(endDate).toISOString().split('T')[0] : '';
    if (endDate !== undefined && newEnd !== oldEnd) {
      changes.push(`end date`);
    }
    if (tagIds !== undefined) {
      const sortedNew = [...tagIds].sort();
      const sortedOld = [...existingTagIds].sort();
      const match = sortedNew.length === sortedOld.length && sortedNew.every((val, index) => val === sortedOld[index]);
      if (!match) {
        changes.push('tags');
      }
    }
    if (assigneeIds !== undefined) {
      const sortedNew = [...assigneeIds].sort();
      const sortedOld = [...existingAssigneeIds].sort();
      const match = sortedNew.length === sortedOld.length && sortedNew.every((val, index) => val === sortedOld[index]);
      if (!match) {
        changes.push('assignees');
      }
    }

    const actionText = changes.length > 0
      ? `Updated: changed ${changes.join(', ')}`
      : 'Updated task details';

    await logActivity({
      entityType: 'Task',
      entityId: task.id,
      action: actionText,
      userId: session.userId as string,
      oldValue: { state: existingTask.state },
      newValue: { state: task.state }
    });

    const projectInfo = await prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true }
    });
    const projectName = projectInfo?.name || 'a project';

    // Notify review approvers when a task moves to REVIEW state
    if (state === 'REVIEW' && existingTask.state !== 'REVIEW') {
      const allowedRoles = ['PROJECT_ADMIN', 'ADMIN', 'PROJECT MANAGER', 'PROJECT_MANAGER', 'DEPARTMENT_HEAD', 'CAPTAIN'];
      const membersToNotify = await prisma.projectMember.findMany({
        where: {
          projectId,
          role: { in: allowedRoles }
        },
        select: { userId: true }
      });
      for (const m of membersToNotify) {
        if (m.userId === session.userId) continue;
        await createNotification({
          userId: m.userId,
          projectId,
          taskId: task.id,
          title: 'Task Review Requested',
          content: `Task "${task.title}" has been submitted for review in project "${projectName}".`,
          type: 'TASK_STATUS_CHANGE'
        });
      }
    }

    // 1. Task Assignments
    if (assigneeIds !== undefined) {
      const newlyAssignedIds = assigneeIds.filter((id: string) => !existingAssigneeIds.includes(id));
      for (const userId of newlyAssignedIds) {
        await createNotification({
          userId,
          projectId,
          taskId,
          type: 'TASK_ASSIGNED',
          title: 'Task Assigned',
          content: `You have been assigned to the task "${task.title}" in project "${projectName}".`
        });
      }
    }

    // 2. Task Status Changes
    if (state && state !== existingTask.state) {
      const currentAssigneeIds = assigneeIds !== undefined ? assigneeIds : existingAssigneeIds;
      const notifyUsers = currentAssigneeIds.filter((id: string) => id !== session.userId);
      for (const userId of notifyUsers) {
        await createNotification({
          userId,
          projectId,
          taskId,
          type: 'TASK_STATUS_CHANGE',
          title: 'Task Status Changed',
          content: `The status of your assigned task "${task.title}" in project "${projectName}" was changed from "${existingTask.state}" to "${state}".`
        });
      }
    }

    // 3. Task Modifications
    if (changes.length > 0) {
      const currentAssigneeIds = assigneeIds !== undefined ? assigneeIds : existingAssigneeIds;
      const notifyUsers = currentAssigneeIds.filter((id: string) => id !== session.userId);
      for (const userId of notifyUsers) {
        await createNotification({
          userId,
          projectId,
          taskId,
          type: 'TASK_MODIFICATION',
          title: 'Task Updated',
          content: `The task "${task.title}" you are assigned to in project "${projectName}" has been updated. Changes: ${changes.join(', ')}.`
        });
      }
    }

    apiCache.invalidateTask(projectId);
    apiCache.invalidateDepartment(projectId);
    await projectOverviewCache.invalidateTaskData(projectId);
    await projectOverviewCache.invalidateTeamStats(projectId);

    // Invalidate database query caches
    await queryCache.invalidateTaskStats();
    await queryCache.invalidateTeamWorkload();
    await queryCache.invalidateSearchCache();
    await queryCache.invalidateEntityCache('task', taskId);
    const finalAssigneeIds = assigneeIds !== undefined ? assigneeIds : existingAssigneeIds;
    if (finalAssigneeIds && finalAssigneeIds.length > 0) {
      for (const userId of finalAssigneeIds) {
        apiCache.invalidateNotifications(userId);
      }
    }

    if (assigneeIds !== undefined) {
      const affectedUserIds = Array.from(new Set([...existingAssigneeIds, ...assigneeIds]));
      for (const uId of affectedUserIds) {
        await permissionCache.invalidateUserProject(uId, projectId);
      }
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('Update task error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ projectId: string, taskId: string }> }) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, taskId } = await params;

    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: session.userId as string } }
    });
    if (!membership || membership.role === 'VIEWER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Soft delete logic (or hard delete)
    await prisma.task.update({
      where: { id: taskId, projectId },
      data: { deletedAt: new Date() }
    });

    apiCache.invalidateTask(projectId);
    apiCache.invalidateDepartment(projectId);
    await projectOverviewCache.invalidateTaskData(projectId);
    await projectOverviewCache.invalidateTeamStats(projectId);

    // Invalidate database query caches
    await queryCache.invalidateTaskStats();
    await queryCache.invalidateTeamWorkload();
    await queryCache.invalidateSearchCache();
    await queryCache.invalidateEntityCache('task', taskId);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Delete task error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
