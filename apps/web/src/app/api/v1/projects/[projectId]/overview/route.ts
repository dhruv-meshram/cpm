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

    // Validate access
    const isMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId: session.userId as string }
      }
    });

    if (!isMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch the mega-object
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        tasks: {
          select: { id: true, state: true }
        },
        dependencies: {
          select: { predecessorTaskId: true, successorTaskId: true }
        },
        snapshots: {
          orderBy: { calculationTime: 'desc' },
          take: 1
        },
        owner: {
          select: { name: true }
        }
      }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Fetch Recent Activity
    const activitiesData = await prisma.activityLog.findMany({
      where: { entityType: 'Project', entityId: projectId },
      orderBy: { timestamp: 'desc' },
      take: 10,
      include: {
        user: { select: { name: true } }
      }
    });

    const activities = activitiesData.map(act => ({
      id: act.id,
      user: act.user?.name || 'System',
      action: act.action,
      timestamp: act.timestamp
    }));

    // Calculate Task Metrics
    const totalTasks = project.tasks.length;
    const completedTasks = project.tasks.filter(t => t.state === 'DONE').length;
    const inProgressTasks = project.tasks.filter(t => t.state === 'IN_PROGRESS' || t.state === 'REVIEW').length;
    const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Calculate Dependency Metrics
    const totalDependencies = project.dependencies.length;
    let noDependencies = 0;
    let multiplePredecessors = 0;
    let multipleSuccessors = 0;

    if (totalTasks > 0) {
      const predCounts = new Map<string, number>();
      const succCounts = new Map<string, number>();

      project.dependencies.forEach(d => {
        predCounts.set(d.successorTaskId, (predCounts.get(d.successorTaskId) || 0) + 1);
        succCounts.set(d.predecessorTaskId, (succCounts.get(d.predecessorTaskId) || 0) + 1);
      });

      project.tasks.forEach(t => {
        const preds = predCounts.get(t.id) || 0;
        const succs = succCounts.get(t.id) || 0;
        
        if (preds === 0 && succs === 0) noDependencies++;
        if (preds > 1) multiplePredecessors++;
        if (succs > 1) multipleSuccessors++;
      });
    }

    // CPM Insights
    const latestSnapshot = project.snapshots[0];
    const projectDuration = latestSnapshot ? (latestSnapshot.projectDuration as any).toNumber?.() || Number(latestSnapshot.projectDuration) || 0 : 0;
    const criticalPath = latestSnapshot ? (latestSnapshot.criticalPath as any[]) || [] : [];
    const criticalTasksCount = criticalPath.length;

    const plannedFinish = project.targetDate;
    let forecastFinish = null;
    let daysVariance = 0;

    if (latestSnapshot) {
      // Very naive date math for display purposes
      forecastFinish = new Date(new Date(latestSnapshot.calculationTime).getTime() + projectDuration * 86400000);
      if (plannedFinish) {
        const diffTime = plannedFinish.getTime() - forecastFinish.getTime();
        daysVariance = Math.floor(diffTime / (1000 * 60 * 60 * 24)); 
      }
    }

    // Dynamic Health Override based on Variance
    let health = project.health;
    if (daysVariance < 0 && health === 'HEALTHY') {
      health = 'WARNING';
    }

    return NextResponse.json({
      project: {
        id: project.id,
        identifier: project.identifier,
        name: project.name,
        description: project.description,
        status: project.status,
        health,
        owner: project.owner?.name || 'Unassigned',
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      },
      metrics: {
        totalTasks,
        completedTasks,
        inProgressTasks,
        criticalTasksCount,
        dependenciesCount: totalDependencies,
        progressPercent,
        projectDuration,
      },
      schedule: {
        plannedFinish,
        forecastFinish,
        daysVariance,
      },
      cpmInsights: {
        criticalPathLength: criticalTasksCount,
        criticalPathDuration: projectDuration,
        totalFloatAvailable: 0, 
        longestDependencyChain: criticalTasksCount, 
        lastRunAt: latestSnapshot?.calculationTime || null
      },
      dependencyStats: {
        total: totalDependencies,
        noDependencies,
        multiplePredecessors,
        multipleSuccessors
      },
      activities
    });

  } catch (error) {
    console.error('Fetch project overview error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
