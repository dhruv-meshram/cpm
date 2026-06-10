import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';

export async function DELETE(req: Request, { params }: { params: Promise<{ projectId: string, dependencyId: string }> }) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, dependencyId } = await params;

    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: session.userId as string } }
    });
    if (!membership || membership.role === 'VIEWER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const dep = await prisma.dependency.findUnique({
      where: { id: dependencyId, projectId }
    });
    if (!dep) {
      return NextResponse.json({ error: 'Dependency not found' }, { status: 404 });
    }

    await prisma.dependency.delete({
      where: { id: dependencyId, projectId }
    });

    await logActivity({
      entityType: 'Project',
      entityId: projectId,
      action: `Dependency removed: Task ${dep.predecessorTaskId} -> Task ${dep.successorTaskId}`,
      userId: session.userId as string,
      oldValue: { predecessorTaskId: dep.predecessorTaskId, successorTaskId: dep.successorTaskId },
      newValue: { predecessorTaskId: dep.predecessorTaskId, successorTaskId: dep.successorTaskId }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Delete dependency error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
