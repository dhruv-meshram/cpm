import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

    // Get all tasks in those projects to get their activity
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

    const formattedData = activities.map(act => ({
      id: act.id,
      action: act.action,
      entityType: act.entityType,
      timestamp: act.timestamp,
      user: act.user?.name || 'System'
    }));

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error('Fetch dashboard activity error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
