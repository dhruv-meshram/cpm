import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { formatActivityLog, checkAndLogOverdueTasks } from '@/lib/activity';
import { activityCache } from '@/lib/activity-cache';

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

    await checkAndLogOverdueTasks(projectId);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true }
    });
    const projectName = project?.name || 'Unknown Project';

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Cache only the first page and up to 50 items
    if (page === 1 && limit <= 50) {
      const dbQuery = async () => {
        const taskIds = await prisma.task.findMany({
          where: { projectId },
          select: { id: true }
        }).then(tasks => tasks.map(t => t.id));

        return prisma.activityLog.findMany({
          where: {
            OR: [
              { entityType: 'Project', entityId: projectId },
              { entityType: 'Task', entityId: { in: taskIds } }
            ]
          },
          orderBy: { timestamp: 'desc' },
          take: 50,
          include: {
            user: { select: { name: true, avatar: true } }
          }
        });
      };

      const cacheKey = `activity:project:${projectId}`;
      const cachedFeed = await activityCache.getFeed(cacheKey, dbQuery);

      const sliced = cachedFeed.slice(0, limit);
      const hasMore = cachedFeed.length > limit;

      return NextResponse.json({
        data: sliced,
        hasMore
      });
    }

    const skip = (page - 1) * limit;

    // Fetch activities directly from DB for pagination/historical pages
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
      take: limit + 1,
      include: {
        user: { select: { name: true, avatar: true } }
      }
    });

    const hasMore = activities.length > limit;
    if (hasMore) activities.pop();

    const formattedData = activities.map(act => {
      const formatted = formatActivityLog(act, projectName);
      formatted.projectId = projectId;
      return formatted;
    });

    return NextResponse.json({
      data: formattedData,
      hasMore
    });
  } catch (error) {
    console.error('Fetch project activity error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
