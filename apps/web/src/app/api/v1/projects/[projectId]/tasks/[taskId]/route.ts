import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';

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

    const body = await req.json();
    const { title, description, duration, state, startDate, endDate } = body;

    const task = await prisma.task.update({
      where: { id: taskId, projectId },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(duration !== undefined && { duration, estimatedDays: duration }),
        ...(state && { state }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(state === 'DONE' && { completedAt: new Date() })
      }
    });

    if (state) {
      await logActivity({
        entityType: 'Task',
        entityId: task.id,
        action: `Task moved to ${state}`,
        userId: session.userId as string
      });
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

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Delete task error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
