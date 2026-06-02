import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

    await prisma.dependency.delete({
      where: { id: dependencyId, projectId }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Delete dependency error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
