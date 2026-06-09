import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';

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

    return NextResponse.json({
      activities: activities.map(act => ({
        id: act.id,
        action: act.action,
        timestamp: act.timestamp,
        user: act.user?.name || 'System'
      }))
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

    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: session.userId as string } }
    });
    if (!membership || membership.role === 'VIEWER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existingTask = await prisma.task.findUnique({
      where: { id: taskId, projectId }
    });

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const body = await req.json();
    const { title, description, duration, state, startDate, endDate, departmentIds } = body;

    if (duration !== undefined) {
      if (typeof duration !== 'number' || !Number.isInteger(duration) || duration < 0) {
        return NextResponse.json({ error: 'Duration must be a non-negative integer' }, { status: 400 });
      }
    }

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
        })
      },
      include: {
        departments: true
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

    const actionText = changes.length > 0
      ? `Updated: changed ${changes.join(', ')}`
      : 'Updated task details';

    await logActivity({
      entityType: 'Task',
      entityId: task.id,
      action: actionText,
      userId: session.userId as string
    });

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

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Delete task error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
