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

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // We fetch activities tied directly to the Project entity
    // We can also fetch activities tied to Tasks within the project
    const taskIds = await prisma.task.findMany({
      where: { projectId },
      select: { id: true }
    }).then(tasks => tasks.map(t => t.id));

    const activities = await prisma.activityLog.findMany({
      where: {
        OR: [
          { entityType: 'Project', entityId: projectId },
          { entityType: 'Task', entityId: { in: taskIds } }
        ]
      },
      orderBy: { timestamp: 'desc' },
      skip,
      take: limit + 1, // Fetch one extra to determine hasMore
      include: {
        user: { select: { name: true, avatar: true } }
      }
    });

    const hasMore = activities.length > limit;
    if (hasMore) activities.pop();

    const formattedData = activities.map(act => ({
      id: act.id,
      action: act.action,
      entityType: act.entityType,
      entityId: act.entityId,
      timestamp: act.timestamp,
      user: act.user?.name || 'System',
      projectId: projectId
    }));

    return NextResponse.json({
      data: formattedData,
      hasMore
    });
  } catch (error) {
    console.error('Fetch project activity error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
