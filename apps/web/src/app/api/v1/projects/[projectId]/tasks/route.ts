import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';
import { z } from 'zod';
import { randomUUID } from 'crypto';

const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  duration: z.number().min(0),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  state: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'CANCELED']).optional()
});

export async function GET(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;

    // Validate access
    const isMember = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: session.userId as string } }
    });
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const tasks = await prisma.task.findMany({
      where: { projectId, deletedAt: null },
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Fetch tasks error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;

    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: session.userId as string } }
    });
    
    console.log('Task POST Request - projectId:', projectId, 'userId:', session.userId, 'membership:', membership);

    if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN' && membership.role !== 'MEMBER')) {
      console.log('Forbidden! Role was:', membership?.role);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    console.log('Task POST Body:', body);
    const parsed = createTaskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { title, description, duration, state, startDate, endDate } = parsed.data;

    const task = await prisma.task.create({
      data: {
        id: randomUUID(),
        projectId,
        title,
        description,
        duration,
        estimatedDays: duration,
        state: state || 'TODO',
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        isDraft: false
      }
    });

    await logActivity({
      entityType: 'Task',
      entityId: task.id,
      action: `Task Created: ${title}`,
      userId: session.userId as string
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Create task error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
