import { redis } from './redis';
import { prisma } from './prisma';

export interface ProjectStatsCache {
  totalTasks: number;
  openTasks: number;
  inProgressTasks: number;
  reviewTasks: number;
  completedTasks: number;
  blockedTasks: number;
  overdueTasks: number;
  dependenciesCount: number;
  dependencyStats: {
    total: number;
    noDependencies: number;
    multiplePredecessors: number;
    multipleSuccessors: number;
  };
}

export interface TeamStatsCache {
  teamSize: number;
  activeMembers: number;
  departmentMemberCounts: Record<string, number>;
  assignedUsersCount: number;
}

export interface ProjectHealthCache {
  completionPercentage: number;
  openVsClosedRatio: number;
  overdueTaskPercentage: number;
  projectProgressPercentage: number;
  approvalCompletionPercentage: number;
  approvals: {
    pending: number;
    approved: number;
    rejected: number;
    escalated: number;
    completionRate: number;
  };
}

export interface DepartmentBreakdownCache {
  id: string;
  name: string;
  color: string;
  tasksCount: number;
  completedTasksCount: number;
  activeTasksCount: number;
  progressPercentage: number;
  overdueTasksCount: number;
  criticalTasksCount: number;
}

export interface ProjectSummaryCache {
  project: {
    id: string;
    identifier: string;
    name: string;
    description: string | null;
    status: string;
    health: string;
    owner: string;
    createdAt: Date;
    updatedAt: Date;
  };
  cpmInsights: {
    criticalPathLength: number;
    criticalPathDuration: number;
    totalFloatAvailable: number;
    longestDependencyChain: number;
    lastRunAt: Date | null;
  };
  schedule: {
    plannedFinish: Date | null;
    forecastFinish: Date | null;
    daysVariance: number;
  };
  criticalPath: string[];
}

class ProjectOverviewCacheManager {
  private metrics = {
    hits: 0,
    misses: 0,
    recalculations: 0,
    invalidations: 0,
    totalResponseTime: 0
  };

  public getMetrics() {
    return { ...this.metrics };
  }

  public resetMetrics() {
    this.metrics = {
      hits: 0,
      misses: 0,
      recalculations: 0,
      invalidations: 0,
      totalResponseTime: 0
    };
  }

  private async setCache(key: string, data: any, ttlSeconds: number): Promise<void> {
    try {
      await redis.del(key);
      await redis.rpush(key, JSON.stringify(data));
      await redis.expire(key, ttlSeconds);
    } catch (err) {
      console.warn(`[Project Overview Cache] Failed to write cache key "${key}":`, err);
    }
  }

  private async getCache(key: string): Promise<any | null> {
    try {
      const exists = await redis.exists(key);
      if (exists) {
        const cached = await redis.lrange(key, 0, 0);
        if (cached.length > 0) {
          this.metrics.hits++;
          return JSON.parse(cached[0]);
        }
      }
    } catch (err) {
      console.warn(`[Project Overview Cache] Failed to read cache key "${key}":`, err);
    }
    this.metrics.misses++;
    return null;
  }

  /**
   * 1. Cache Project Statistics
   * Key: project:{projectId}:stats
   */
  public async getProjectStats(projectId: string): Promise<ProjectStatsCache> {
    const startTime = Date.now();
    const key = `project:${projectId}:stats`;
    const cached = await this.getCache(key);
    if (cached) {
      this.metrics.totalResponseTime += (Date.now() - startTime);
      return cached;
    }

    console.log(`[Project Overview Cache] Rebuilding stats for project "${projectId}"`);
    this.metrics.recalculations++;

    const tasks = await prisma.task.findMany({
      where: { projectId, deletedAt: null },
      include: {
        incomingDependencies: {
          include: {
            predecessorTask: true
          }
        }
      }
    });

    const dependencies = await prisma.dependency.findMany({
      where: { projectId },
      select: { predecessorTaskId: true, successorTaskId: true }
    });

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.state === 'DONE').length;
    const inProgressTasks = tasks.filter(t => t.state === 'IN_PROGRESS').length;
    const reviewTasks = tasks.filter(t => t.state === 'REVIEW').length;
    const openTasks = tasks.filter(t => t.state === 'TODO' || t.state === 'BACKLOG').length;
    const blockedTasks = tasks.filter(t => {
      if (t.state === 'DONE') return false;
      return t.incomingDependencies.some(dep => dep.predecessorTask.state !== 'DONE');
    }).length;
    const overdueTasks = tasks.filter(t => 
      t.state !== 'DONE' && t.endDate && new Date(t.endDate) < new Date()
    ).length;

    const totalDependencies = dependencies.length;
    let noDependencies = 0;
    let multiplePredecessors = 0;
    let multipleSuccessors = 0;

    if (totalTasks > 0) {
      const predCounts = new Map<string, number>();
      const succCounts = new Map<string, number>();

      dependencies.forEach(d => {
        predCounts.set(d.successorTaskId, (predCounts.get(d.successorTaskId) || 0) + 1);
        succCounts.set(d.predecessorTaskId, (succCounts.get(d.predecessorTaskId) || 0) + 1);
      });

      tasks.forEach(t => {
        const preds = predCounts.get(t.id) || 0;
        const succs = succCounts.get(t.id) || 0;
        
        if (preds === 0 && succs === 0) noDependencies++;
        if (preds > 1) multiplePredecessors++;
        if (succs > 1) multipleSuccessors++;
      });
    }

    const stats: ProjectStatsCache = {
      totalTasks,
      openTasks,
      inProgressTasks,
      reviewTasks,
      completedTasks,
      blockedTasks,
      overdueTasks,
      dependenciesCount: totalDependencies,
      dependencyStats: {
        total: totalDependencies,
        noDependencies,
        multiplePredecessors,
        multipleSuccessors
      }
    };

    await this.setCache(key, stats, 300); // 5 minutes TTL
    this.metrics.totalResponseTime += (Date.now() - startTime);
    return stats;
  }

  /**
   * 2. Cache Team Statistics
   * Key: project:{projectId}:team-stats
   */
  public async getTeamStats(projectId: string): Promise<TeamStatsCache> {
    const startTime = Date.now();
    const key = `project:${projectId}:team-stats`;
    const cached = await this.getCache(key);
    if (cached) {
      this.metrics.totalResponseTime += (Date.now() - startTime);
      return cached;
    }

    console.log(`[Project Overview Cache] Rebuilding team stats for project "${projectId}"`);
    this.metrics.recalculations++;

    const members = await prisma.projectMember.findMany({
      where: { projectId }
    });

    const teamSize = members.length;
    const activeMembers = members.length;

    const departmentMemberCounts: Record<string, number> = {};
    members.forEach(m => {
      if (m.departmentId) {
        departmentMemberCounts[m.departmentId] = (departmentMemberCounts[m.departmentId] || 0) + 1;
      }
    });

    const assignees = await prisma.taskAssignee.groupBy({
      by: ['userId'],
      where: {
        task: { projectId, deletedAt: null }
      }
    });
    const assignedUsersCount = assignees.length;

    const teamStats: TeamStatsCache = {
      teamSize,
      activeMembers,
      departmentMemberCounts,
      assignedUsersCount
    };

    await this.setCache(key, teamStats, 300); // 5 minutes TTL
    this.metrics.totalResponseTime += (Date.now() - startTime);
    return teamStats;
  }

  /**
   * 3. Cache Project Health Metrics
   * Key: project:{projectId}:health
   */
  public async getProjectHealth(projectId: string): Promise<ProjectHealthCache> {
    const startTime = Date.now();
    const key = `project:${projectId}:health`;
    const cached = await this.getCache(key);
    if (cached) {
      this.metrics.totalResponseTime += (Date.now() - startTime);
      return cached;
    }

    console.log(`[Project Overview Cache] Rebuilding health metrics for project "${projectId}"`);
    this.metrics.recalculations++;

    const stats = await this.getProjectStats(projectId);

    const completionPercentage = stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0;
    const openVsClosedRatio = stats.completedTasks > 0 ? Number((stats.openTasks / stats.completedTasks).toFixed(2)) : stats.openTasks;
    const overdueTaskPercentage = stats.totalTasks > 0 ? Math.round((stats.overdueTasks / stats.totalTasks) * 100) : 0;
    const projectProgressPercentage = completionPercentage;

    const approvals = await prisma.taskApproval.findMany({
      where: {
        task: { projectId, deletedAt: null }
      }
    });
    const pending = approvals.filter(a => a.decision === 'SUBMITTED').length;
    const approved = approvals.filter(a => a.decision === 'APPROVED').length;
    const rejected = approvals.filter(a => a.decision === 'REJECTED').length;
    const escalated = 0;
    const totalCompleted = approved + rejected;
    const total = approvals.length;
    const completionRate = total > 0 ? Math.round((totalCompleted / total) * 100) : 0;

    const health: ProjectHealthCache = {
      completionPercentage,
      openVsClosedRatio,
      overdueTaskPercentage,
      projectProgressPercentage,
      approvalCompletionPercentage: completionRate,
      approvals: {
        pending,
        approved,
        rejected,
        escalated,
        completionRate
      }
    };

    await this.setCache(key, health, 300); // 5 minutes TTL
    this.metrics.totalResponseTime += (Date.now() - startTime);
    return health;
  }

  /**
   * 4. Cache Department Breakdown
   * Key: project:{projectId}:departments
   */
  public async getDepartmentBreakdown(projectId: string, criticalPathTaskIds: string[] = []): Promise<DepartmentBreakdownCache[]> {
    const startTime = Date.now();
    const key = `project:${projectId}:departments`;
    const cached = await this.getCache(key);
    if (cached) {
      this.metrics.totalResponseTime += (Date.now() - startTime);
      return cached;
    }

    console.log(`[Project Overview Cache] Rebuilding department breakdown for project "${projectId}"`);
    this.metrics.recalculations++;

    const depts = await prisma.department.findMany({
      where: { projectId },
      include: {
        tasks: {
          where: { deletedAt: null },
          select: { id: true, state: true, endDate: true }
        }
      }
    });

    const breakdown = depts.map(d => {
      const dTasks = d.tasks;
      const tasksCount = dTasks.length;
      const completedTasksCount = dTasks.filter(t => t.state === 'DONE').length;
      const activeTasksCount = dTasks.filter(t => t.state === 'IN_PROGRESS' || t.state === 'REVIEW').length;
      const progressPercentage = tasksCount > 0 ? Math.round((completedTasksCount / tasksCount) * 100) : 0;
      const overdueTasksCount = dTasks.filter(t =>
        t.state !== 'DONE' && t.endDate && new Date(t.endDate) < new Date()
      ).length;
      const criticalTasksCount = dTasks.filter(t => criticalPathTaskIds.includes(t.id)).length;

      return {
        id: d.id,
        name: d.name,
        color: d.color,
        tasksCount,
        completedTasksCount,
        activeTasksCount,
        progressPercentage,
        overdueTasksCount,
        criticalTasksCount
      };
    });

    await this.setCache(key, breakdown, 300); // 5 minutes TTL
    this.metrics.totalResponseTime += (Date.now() - startTime);
    return breakdown;
  }

  /**
   * 5. Cache Project Summary
   * Key: project:{projectId}:summary
   */
  public async getProjectSummary(projectId: string): Promise<ProjectSummaryCache> {
    const startTime = Date.now();
    const key = `project:${projectId}:summary`;
    const cached = await this.getCache(key);
    if (cached) {
      this.metrics.totalResponseTime += (Date.now() - startTime);
      return cached;
    }

    console.log(`[Project Overview Cache] Rebuilding project summary for project "${projectId}"`);
    this.metrics.recalculations++;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        owner: { select: { name: true } },
        snapshots: {
          orderBy: { calculationTime: 'desc' },
          take: 1
        }
      }
    });

    if (!project) {
      throw new Error(`Project "${projectId}" not found`);
    }

    const latestSnapshot = project.snapshots[0] || null;
    const projectDuration = latestSnapshot ? (latestSnapshot.projectDuration as any).toNumber?.() || Number(latestSnapshot.projectDuration) || 0 : 0;
    const criticalPath = latestSnapshot ? (latestSnapshot.criticalPath as string[]) || [] : [];
    const criticalTasksCount = criticalPath.length;

    const plannedFinish = project.targetDate;
    let forecastFinish = null;
    let daysVariance = 0;

    if (latestSnapshot) {
      forecastFinish = new Date(new Date(latestSnapshot.calculationTime).getTime() + projectDuration * 86400000);
      if (plannedFinish) {
        const diffTime = plannedFinish.getTime() - forecastFinish.getTime();
        daysVariance = Math.floor(diffTime / (1000 * 60 * 60 * 24)); 
      }
    }

    let health = project.health;
    if (daysVariance < 0 && health === 'HEALTHY') {
      health = 'WARNING';
    }

    const summary: ProjectSummaryCache = {
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
      cpmInsights: {
        criticalPathLength: criticalTasksCount,
        criticalPathDuration: projectDuration,
        totalFloatAvailable: 0,
        longestDependencyChain: criticalTasksCount,
        lastRunAt: latestSnapshot?.calculationTime || null
      },
      schedule: {
        plannedFinish,
        forecastFinish,
        daysVariance
      },
      criticalPath
    };

    await this.setCache(key, summary, 300); // 5 minutes TTL
    this.metrics.totalResponseTime += (Date.now() - startTime);
    return summary;
  }

  /**
   * Invalidation Actions
   */
  public async invalidateStats(projectId: string): Promise<void> {
    this.metrics.invalidations++;
    console.log(`[Project Overview Invalidation] Invalidating stats for project "${projectId}"`);
    await redis.del(`project:${projectId}:stats`);
  }

  public async invalidateTeamStats(projectId: string): Promise<void> {
    this.metrics.invalidations++;
    console.log(`[Project Overview Invalidation] Invalidating team stats for project "${projectId}"`);
    await redis.del(`project:${projectId}:team-stats`);
  }

  public async invalidateHealth(projectId: string): Promise<void> {
    this.metrics.invalidations++;
    console.log(`[Project Overview Invalidation] Invalidating health for project "${projectId}"`);
    await redis.del(`project:${projectId}:health`);
  }

  public async invalidateDepartments(projectId: string): Promise<void> {
    this.metrics.invalidations++;
    console.log(`[Project Overview Invalidation] Invalidating departments for project "${projectId}"`);
    await redis.del(`project:${projectId}:departments`);
  }

  public async invalidateSummary(projectId: string): Promise<void> {
    this.metrics.invalidations++;
    console.log(`[Project Overview Invalidation] Invalidating summary for project "${projectId}"`);
    await redis.del(`project:${projectId}:summary`);
  }

  public async invalidateTaskData(projectId: string): Promise<void> {
    console.log(`[Project Overview Invalidation] Invalidating task-related caches for project "${projectId}"`);
    await this.invalidateStats(projectId);
    await this.invalidateHealth(projectId);
    await this.invalidateDepartments(projectId);
  }

  public async invalidateAll(projectId: string): Promise<void> {
    console.log(`[Project Overview Invalidation] Invalidating all overview caches for project "${projectId}"`);
    await this.invalidateStats(projectId);
    await this.invalidateTeamStats(projectId);
    await this.invalidateHealth(projectId);
    await this.invalidateDepartments(projectId);
    await this.invalidateSummary(projectId);
  }
}

export const projectOverviewCache = new ProjectOverviewCacheManager();
