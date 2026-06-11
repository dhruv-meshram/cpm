import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { formatActivityLog, checkAndLogOverdueTasks } from '@/lib/activity';
import { activityCache } from '@/lib/activity-cache';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    // Find all projects the user is part of
    const userProjects = await prisma.projectMember.findMany({
      where: { userId: session.userId as string },
      select: { projectId: true }
    });

    const projectIds = userProjects.map(p => p.projectId);

    // Check overdue tasks for all user's projects
    await Promise.all(projectIds.map(id => checkAndLogOverdueTasks(id)));

    // Try dashboard activity feed cache
    const dbQuery = async () => {
      return prisma.activityLog.findMany({
        orderBy: { timestamp: 'desc' },
        take: 50,
        include: {
          user: { select: { name: true, avatar: true } }
        }
      });
    };

    const cacheKey = 'activity:dashboard';
    const cachedFeed = await activityCache.getFeed(cacheKey, dbQuery);

    // Filter by projects the user has access to
    const filteredData = cachedFeed.filter((item: any) => projectIds.includes(item.projectId));

    if (filteredData.length >= limit) {
      return NextResponse.json(filteredData.slice(0, limit));
    }

    // Get all tasks in those projects to get their activity (fallback query)
    const taskIds = await prisma.task.findMany({
      where: { projectId: { in: projectIds } },
      select: { id: true }
    }).then(tasks => tasks.map(t => t.id));

    const activities = await prisma.activityLog.findMany({
      where: {
        OR: [
          { entityType: 'Project', entityId: { in: projectIds } },
          { entityType: 'Task', entityId: { in: taskIds } }
        ]
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: {
        user: { select: { name: true, avatar: true } }
      }
    });

    const taskEntityIds = activities
      .filter(act => act.entityType === 'Task')
      .map(act => act.entityId);

    const tasks = await prisma.task.findMany({
      where: { id: { in: taskEntityIds } },
      select: { id: true, projectId: true }
    });

    const taskProjectMap = new Map(tasks.map(t => [t.id, t.projectId]));

    const activityProjectIds = Array.from(new Set(activities.map(act => 
      act.entityType === 'Project' ? act.entityId : taskProjectMap.get(act.entityId)
    ).filter(Boolean))) as string[];

    const projectsInfo = await prisma.project.findMany({
      where: { id: { in: activityProjectIds } },
      select: { id: true, name: true }
    });

    const projectMap = new Map(projectsInfo.map(p => [p.id, p.name]));

    const formattedData = activities.map(act => {
      const pId = act.entityType === 'Project' ? act.entityId : taskProjectMap.get(act.entityId);
      const projectName = projectMap.get(pId || '') || 'Unknown Project';
      const formatted = formatActivityLog(act, projectName);
      formatted.projectId = pId || '';
      return formatted;
    });

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error('Fetch dashboard activity error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
