import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';
import { WorkItemState } from '@prisma/client';

export async function POST(
  req: Request,
  props: { params: Promise<{ projectId: string, taskId: string }> }
) {
  const { projectId, taskId } = await props.params;
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const membership = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: session.userId as string
        }
      }
    });

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Gated roles for review actions
    const allowedRoles = ['PROJECT_ADMIN', 'ADMIN', 'PROJECT MANAGER', 'PROJECT_MANAGER', 'DEPARTMENT_HEAD', 'CAPTAIN'];
    if (!allowedRoles.includes(membership.role.toUpperCase().replace(' ', '_'))) {
      return NextResponse.json({ error: 'Only owners, managers, department heads, or captains can approve or reject tasks.' }, { status: 403 });
    }

    const { decision, comment } = await req.json();

    if (!['APPROVED', 'REJECTED'].includes(decision)) {
      return NextResponse.json({ error: 'Invalid decision' }, { status: 400 });
    }

    // Create approval record
    const approval = await prisma.taskApproval.create({
      data: {
        taskId,
        reviewerId: session.userId as string,
        decision,
        comment: comment || null
      },
      include: {
        reviewer: { select: { name: true } }
      }
    });

    // Handle state transitions based on review decision
    let newState: WorkItemState = WorkItemState.TODO;
    if (decision === 'APPROVED') {
      newState = WorkItemState.DONE;
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        state: newState,
        ...(decision === 'APPROVED' && { completedAt: new Date() })
      }
    });

    // Create notification for assignees
    const assignees = await prisma.taskAssignee.findMany({
      where: { taskId },
      select: { userId: true }
    });

    for (const assignee of assignees) {
      await prisma.notification.create({
        data: {
          userId: assignee.userId,
          projectId,
          taskId,
          title: `Task ${decision === 'APPROVED' ? 'Approved' : 'Rejected'}`,
          content: `Task "${task.title}" has been ${decision.toLowerCase()} by ${approval.reviewer.name}.${comment ? ` Notes: "${comment}"` : ''}`,
          type: 'TASK_STATUS_CHANGE'
        }
      });
    }

    await logActivity({
      entityType: 'Task',
      entityId: taskId,
      action: `Task ${decision.toLowerCase()} by ${approval.reviewer.name}`,
      userId: session.userId as string,
      projectId,
      oldValue: { state: 'REVIEW' },
      newValue: { state: decision === 'APPROVED' ? 'DONE' : 'TODO' }
    });

    return NextResponse.json({ success: true, approval, task });
  } catch (error) {
    console.error('Task approval submit error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
