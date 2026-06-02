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

    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: session.userId as string } }
    });
    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const latestSnapshot = await prisma.cPMSnapshot.findFirst({
      where: { projectId },
      orderBy: { calculationTime: 'desc' }
    });

    if (!latestSnapshot) {
      return NextResponse.json({ error: 'No CPM results found. Run calculation first.' }, { status: 404 });
    }

    return NextResponse.json({
      id: latestSnapshot.id,
      calculationTime: latestSnapshot.calculationTime,
      projectDuration: latestSnapshot.projectDuration,
      criticalPath: latestSnapshot.criticalPath,
      details: latestSnapshot.payload
    });
  } catch (error) {
    console.error('Fetch CPM results error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
