import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.userId as string;

    // Get project IDs the user has access to
    const userProjects = await prisma.projectMember.findMany({
      where: { userId },
      select: { projectId: true }
    });
    
    const projectIds = userProjects.map(p => p.projectId);

    const [totalProjects, totalTasks, completedTasks] = await Promise.all([
      // Count total projects
      prisma.project.count({
        where: { id: { in: projectIds } }
      }),
      // Count total tasks across those projects (excluding deleted)
      prisma.task.count({
        where: { projectId: { in: projectIds }, deletedAt: null }
      }),
      // Count completed tasks
      prisma.task.count({
        where: { projectId: { in: projectIds }, deletedAt: null, state: 'DONE' }
      })
    ]);

    return NextResponse.json({
      totalProjects,
      totalTasks,
      completedTasks
    });
  } catch (error) {
    console.error('Fetch dashboard stats error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
