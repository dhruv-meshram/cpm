import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const bulkMoveSchema = z.object({
  taskIds: z.array(z.string()).min(1),
  targetDepartmentId: z.string().min(1)
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
    const parsed = bulkMoveSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { taskIds, targetDepartmentId } = parsed.data;

    // Verify target department belongs to project
    const targetDep = await prisma.department.findFirst({
      where: { id: targetDepartmentId, projectId }
    });
    if (!targetDep) {
      return NextResponse.json({ error: 'Target department not found' }, { status: 404 });
    }

    // Update tasks in bulk
    await prisma.$transaction(
      taskIds.map(id =>
        prisma.task.update({
          where: { id, projectId },
          data: {
            departments: {
              set: [{ id: targetDepartmentId }]
            }
          }
        })
      )
    );

    return NextResponse.json({ success: true, count: taskIds.length });
  } catch (error) {
    console.error('Bulk move department error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
