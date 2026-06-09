import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateDepartmentSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  color: z.string().min(1).optional(),
  archived: z.boolean().optional(),
  sortOrder: z.number().int().optional()
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ projectId: string, departmentId: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { projectId, departmentId } = await params;

    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: session.userId as string } }
    });
    if (!membership || membership.role === 'VIEWER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateDepartmentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { name, description, color, archived, sortOrder } = parsed.data;

    // Verify department exists and belongs to this project
    const dep = await prisma.department.findFirst({
      where: { id: departmentId, projectId }
    });
    if (!dep) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }

    if (name) {
      const existing = await prisma.department.findFirst({
        where: {
          projectId,
          name,
          id: { not: departmentId }
        }
      });
      if (existing) {
        return NextResponse.json({ error: { name: ['Department with this name already exists in project'] } }, { status: 400 });
      }
    }

    const updated = await prisma.department.update({
      where: { id: departmentId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(color && { color }),
        ...(archived !== undefined && { archived }),
        ...(sortOrder !== undefined && { sortOrder })
      }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update department error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ projectId: string, departmentId: string }> }
) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { projectId, departmentId } = await params;

    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: session.userId as string } }
    });
    if (!membership || membership.role === 'VIEWER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse fallbackDepartmentId from search parameters
    const { searchParams } = new URL(req.url);
    const fallbackDepartmentId = searchParams.get('fallbackDepartmentId');

    // Verify department exists and belongs to this project
    const dep = await prisma.department.findFirst({
      where: { id: departmentId, projectId }
    });
    if (!dep) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }

    const taskCount = await prisma.task.count({
      where: {
        departments: {
          some: { id: departmentId }
        },
        deletedAt: null
      }
    });

    if (taskCount > 0 && !fallbackDepartmentId) {
      return NextResponse.json({
        error: 'Department has active tasks. Please specify a fallback department to move tasks to.'
      }, { status: 400 });
    }

    if (fallbackDepartmentId) {
      const fallbackDep = await prisma.department.findUnique({
        where: { id: fallbackDepartmentId, projectId }
      });
      if (!fallbackDep) {
        return NextResponse.json({ error: 'Invalid fallback department' }, { status: 400 });
      }

      // Find tasks linked to this department
      const affectedTasks = await prisma.task.findMany({
        where: {
          departments: {
            some: { id: departmentId }
          }
        },
        select: { id: true }
      });

      // Link them to fallback department
      for (const t of affectedTasks) {
        await prisma.task.update({
          where: { id: t.id },
          data: {
            departments: {
              connect: { id: fallbackDepartmentId }
            }
          }
        });
      }
    }

    // Now delete the department
    await prisma.department.delete({
      where: { id: departmentId }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Delete department error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
