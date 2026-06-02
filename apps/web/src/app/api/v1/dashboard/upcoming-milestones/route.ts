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
    const limit = parseInt(searchParams.get('limit') || '5');

    // Find all projects the user is part of
    const userProjects = await prisma.projectMember.findMany({
      where: { userId: session.userId as string },
      select: { projectId: true }
    });
    
    const projectIds = userProjects.map(p => p.projectId);

    // Fetch tasks with end dates in the future that are not completed
    const upcomingTasks = await prisma.task.findMany({
      where: {
        projectId: { in: projectIds },
        deletedAt: null,
        endDate: { gte: new Date() },
        state: { not: 'DONE' }
      },
      orderBy: { endDate: 'asc' },
      take: limit,
      include: {
        project: { select: { name: true } }
      }
    });

    const formattedTasks = upcomingTasks.map(task => ({
      taskId: task.id,
      taskName: task.title,
      projectName: task.project.name,
      endDate: task.endDate
    }));

    return NextResponse.json(formattedTasks);
  } catch (error) {
    console.error('Fetch upcoming milestones error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
