import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkAndLogOverdueTasks } from '@/lib/activity';
import { activityCache } from '@/lib/activity-cache';
import { projectOverviewCache } from '@/lib/project-overview-cache';

export async function GET(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;
    await checkAndLogOverdueTasks(projectId);

    // Validate access
    const isMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId: session.userId as string }
      }
    });

    if (!isMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 1. Fetch cached summary & schedule & cpmInsights
    const summaryData = await projectOverviewCache.getProjectSummary(projectId);

    // 2. Fetch cached task & dependency statistics
    const statsData = await projectOverviewCache.getProjectStats(projectId);

    // 3. Fetch cached health and approvals
    const healthData = await projectOverviewCache.getProjectHealth(projectId);

    // 4. Fetch cached department breakdowns
    const deptsData = await projectOverviewCache.getDepartmentBreakdown(projectId, summaryData.criticalPath);

    // 5. Fetch team stats (ensuring it is pre-cached / built)
    await projectOverviewCache.getTeamStats(projectId);

    // 6. Fetch Recent Activity (live feed, not dashboard cached summary)
    const dbQuery = async () => {
      const tasks = await prisma.task.findMany({
        where: { projectId, deletedAt: null },
        select: { id: true }
      });
      const taskIds = tasks.map(t => t.id);

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
    const activities = cachedFeed.slice(0, 10);

    return NextResponse.json({
      project: summaryData.project,
      metrics: {
        totalTasks: statsData.totalTasks,
        completedTasks: statsData.completedTasks,
        inProgressTasks: statsData.inProgressTasks + statsData.reviewTasks,
        criticalTasksCount: summaryData.cpmInsights.criticalPathLength,
        dependenciesCount: statsData.dependenciesCount,
        progressPercent: healthData.completionPercentage,
        projectDuration: summaryData.cpmInsights.criticalPathDuration,
        overdueTasksCount: statsData.overdueTasks
      },
      schedule: summaryData.schedule,
      cpmInsights: summaryData.cpmInsights,
      dependencyStats: statsData.dependencyStats,
      departments: deptsData,
      approvals: healthData.approvals,
      activities
    });

  } catch (error) {
    console.error('Fetch project overview error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
