import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';
import { z } from 'zod';

const createDependencySchema = z.object({
  predecessorTaskId: z.string(),
  successorTaskId: z.string(),
  type: z.enum(['FS', 'SS', 'FF', 'SF']).default('FS'),
  lag: z.number().default(0)
});

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
    if (!membership || membership.role === 'VIEWER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createDependencySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { predecessorTaskId, successorTaskId, type, lag } = parsed.data;

    // Verify tasks exist and belong to the project
    const tasks = await prisma.task.findMany({
      where: { id: { in: [predecessorTaskId, successorTaskId] }, projectId }
    });

    if (tasks.length !== 2) {
      return NextResponse.json({ error: 'One or both tasks not found in this project' }, { status: 404 });
    }

    // A simple cycle check could go here, but the C++ engine handles deep validation.
    // For now, we just create the dependency.

    const dependency = await prisma.dependency.create({
      data: {
        projectId,
        predecessorTaskId,
        successorTaskId,
        dependencyType: type,
        lag
      }
    });

    await logActivity({
      entityType: 'Project',
      entityId: projectId,
      action: `Dependency added: Task ${predecessorTaskId} -> Task ${successorTaskId}`,
      userId: session.userId as string,
      oldValue: { predecessorTaskId, successorTaskId },
      newValue: { predecessorTaskId, successorTaskId }
    });

    return NextResponse.json(dependency, { status: 201 });
  } catch (error: any) {
    console.error('Create dependency error:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Dependency already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;

    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: session.userId as string } }
    });
    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const dependencies = await prisma.dependency.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json(dependencies);
  } catch (error) {
    console.error('Fetch dependencies error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
