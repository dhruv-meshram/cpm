import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createDepartmentSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  color: z.string().min(1)
});

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
    if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const departments = await prisma.department.findMany({
      where: { projectId },
      include: {
        tasks: {
          where: { deletedAt: null },
          select: { id: true, state: true }
        }
      },
      orderBy: { sortOrder: 'asc' }
    });

    const transformed = departments.map(d => {
      const totalTasks = d.tasks.length;
      const completedTasks = d.tasks.filter(t => t.state === 'DONE').length;
      const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      return {
        id: d.id,
        name: d.name,
        description: d.description,
        color: d.color,
        archived: d.archived,
        sortOrder: d.sortOrder,
        createdAt: d.createdAt,
        taskCount: totalTasks,
        completionPercentage
      };
    });

    return NextResponse.json(transformed);
  } catch (error) {
    console.error('Fetch departments error:', error);
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
    if (!membership || membership.role === 'VIEWER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createDepartmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { name, description, color } = parsed.data;

    const existing = await prisma.department.findUnique({
      where: { projectId_name: { projectId, name } }
    });
    if (existing) {
      return NextResponse.json({ error: { name: ['Department with this name already exists in project'] } }, { status: 400 });
    }

    const maxSort = await prisma.department.aggregate({
      where: { projectId },
      _max: { sortOrder: true }
    });
    const nextSort = (maxSort._max.sortOrder ?? -1) + 1;

    const department = await prisma.department.create({
      data: {
        projectId,
        name,
        description,
        color,
        sortOrder: nextSort
      }
    });

    return NextResponse.json(department, { status: 201 });
  } catch (error) {
    console.error('Create department error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
