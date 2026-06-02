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
      return NextResponse.json({
        totalDuration: 0,
        criticalTaskCount: 0,
        lastRun: null
      });
    }

    // Determine critical task count from criticalPath array
    const criticalPathArr = Array.isArray(latestSnapshot.criticalPath) 
      ? latestSnapshot.criticalPath 
      : [];

    return NextResponse.json({
      totalDuration: latestSnapshot.projectDuration,
      criticalTaskCount: criticalPathArr.length,
      lastRun: latestSnapshot.calculationTime
    });
  } catch (error) {
    console.error('Fetch CPM metrics error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
