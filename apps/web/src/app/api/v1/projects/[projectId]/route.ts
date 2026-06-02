import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;

    // Validate user has access
    const isMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId: session.userId as string }
      }
    });

    if (!isMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        _count: {
          select: { tasks: true }
        },
        tasks: {
          select: { state: true }
        },
        snapshots: {
          orderBy: { calculationTime: 'desc' },
          take: 1
        }
      }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const completedTasks = project.tasks.filter(t => t.state === 'DONE').length;
    const lastCpmRun = project.snapshots[0]?.calculationTime || null;

    return NextResponse.json({
      id: project.id,
      name: project.name,
      description: project.description,
      totalTasks: project._count.tasks,
      completedTasks,
      lastUpdated: project.updatedAt,
      lastCpmRun
    });
  } catch (error) {
    console.error('Fetch project details error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;

    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: session.userId as string } }
    });

    if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, status, targetDate } = body;

    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(status && { status }),
        ...(targetDate && { targetDate: new Date(targetDate) })
      }
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error('Update project error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;

    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: session.userId as string } }
    });

    if (!membership || membership.role !== 'OWNER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.project.delete({
      where: { id: projectId }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Delete project error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
