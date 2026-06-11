import { redis } from './redis';
import { prisma } from './prisma';

export interface QueryCacheMetrics {
  hits: number;
  misses: number;
  invalidations: number;
  recalculations: number;
  totalResponseTime: number;
  queryCount: number;
}

class QueryCacheManager {
  private metrics: QueryCacheMetrics = {
    hits: 0,
    misses: 0,
    invalidations: 0,
    recalculations: 0,
    totalResponseTime: 0,
    queryCount: 0
  };

  public getMetrics() {
    return { ...this.metrics };
  }

  public resetMetrics() {
    this.metrics = {
      hits: 0,
      misses: 0,
      invalidations: 0,
      recalculations: 0,
      totalResponseTime: 0,
      queryCount: 0
    };
  }

  private async getCache<T>(key: string): Promise<T | null> {
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
      console.warn(`[Query Cache] Failed to read key "${key}":`, err);
    }
    this.metrics.misses++;
    return null;
  }

  private async setCache<T>(key: string, data: T, ttlSeconds: number): Promise<void> {
    try {
      await redis.del(key);
      await redis.rpush(key, JSON.stringify(data));
      await redis.expire(key, ttlSeconds);
    } catch (err) {
      console.warn(`[Query Cache] Failed to write key "${key}":`, err);
    }
  }

  private async deleteByPattern(pattern: string): Promise<void> {
    try {
      const deletedCount = await redis.delPattern(pattern);
      this.metrics.invalidations += deletedCount;
    } catch (err) {
      console.warn(`[Query Cache] Failed to delete pattern "${pattern}":`, err);
    }
  }

  /**
   * Task Statistics
   */
  public async getTaskStatsByStatus(): Promise<Record<string, number>> {
    const key = 'stats:tasks:status';
    const startTime = Date.now();
    const cached = await this.getCache<Record<string, number>>(key);
    if (cached) {
      this.metrics.totalResponseTime += (Date.now() - startTime);
      return cached;
    }

    console.log('[Query Cache Miss] Rebuilding task stats by status');
    this.metrics.recalculations++;
    const counts = await prisma.task.groupBy({
      by: ['state'],
      _count: { id: true },
      where: { deletedAt: null }
    });

    const result: Record<string, number> = {};
    counts.forEach(c => {
      result[c.state] = c._count.id;
    });

    await this.setCache(key, result, 60);
    this.metrics.totalResponseTime += (Date.now() - startTime);
    return result;
  }

  public async getTaskStatsByPriority(): Promise<Record<string, number>> {
    const key = 'stats:tasks:priority';
    const startTime = Date.now();
    const cached = await this.getCache<Record<string, number>>(key);
    if (cached) {
      this.metrics.totalResponseTime += (Date.now() - startTime);
      return cached;
    }

    console.log('[Query Cache Miss] Rebuilding task stats by priority');
    this.metrics.recalculations++;
    const counts = await prisma.task.groupBy({
      by: ['priority'],
      _count: { id: true },
      where: { deletedAt: null }
    });

    const result: Record<string, number> = {};
    counts.forEach(c => {
      result[c.priority.toString()] = c._count.id;
    });

    await this.setCache(key, result, 60);
    this.metrics.totalResponseTime += (Date.now() - startTime);
    return result;
  }

  public async getTaskStatsByAssignee(): Promise<Record<string, number>> {
    const key = 'stats:tasks:assignee';
    const startTime = Date.now();
    const cached = await this.getCache<Record<string, number>>(key);
    if (cached) {
      this.metrics.totalResponseTime += (Date.now() - startTime);
      return cached;
    }

    console.log('[Query Cache Miss] Rebuilding task stats by assignee');
    this.metrics.recalculations++;
    const counts = await prisma.taskAssignee.groupBy({
      by: ['userId'],
      _count: { taskId: true },
      where: { task: { deletedAt: null } }
    });

    const result: Record<string, number> = {};
    counts.forEach(c => {
      result[c.userId] = c._count.taskId;
    });

    await this.setCache(key, result, 60);
    this.metrics.totalResponseTime += (Date.now() - startTime);
    return result;
  }

  public async getTaskStatsByDepartment(): Promise<Record<string, number>> {
    const key = 'stats:tasks:department';
    const startTime = Date.now();
    const cached = await this.getCache<Record<string, number>>(key);
    if (cached) {
      this.metrics.totalResponseTime += (Date.now() - startTime);
      return cached;
    }

    console.log('[Query Cache Miss] Rebuilding task stats by department');
    this.metrics.recalculations++;
    const departments = await prisma.department.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: { tasks: { where: { deletedAt: null } } }
        }
      }
    });

    const result: Record<string, number> = {};
    departments.forEach(d => {
      result[d.name] = d._count.tasks;
    });

    await this.setCache(key, result, 60);
    this.metrics.totalResponseTime += (Date.now() - startTime);
    return result;
  }

  public async getTaskStatsByProject(): Promise<Record<string, number>> {
    const key = 'stats:tasks:project';
    const startTime = Date.now();
    const cached = await this.getCache<Record<string, number>>(key);
    if (cached) {
      this.metrics.totalResponseTime += (Date.now() - startTime);
      return cached;
    }

    console.log('[Query Cache Miss] Rebuilding task stats by project');
    this.metrics.recalculations++;
    const counts = await prisma.task.groupBy({
      by: ['projectId'],
      _count: { id: true },
      where: { deletedAt: null }
    });

    const result: Record<string, number> = {};
    counts.forEach(c => {
      result[c.projectId] = c._count.id;
    });

    await this.setCache(key, result, 60);
    this.metrics.totalResponseTime += (Date.now() - startTime);
    return result;
  }

  /**
   * Department Statistics
   */
  public async getDepartmentStats(departmentId: string) {
    const key = `department:${departmentId}:stats`;
    const startTime = Date.now();
    const cached = await this.getCache<any>(key);
    if (cached) {
      this.metrics.totalResponseTime += (Date.now() - startTime);
      return cached;
    }

    console.log(`[Query Cache Miss] Rebuilding department stats for ${departmentId}`);
    this.metrics.recalculations++;
    const tasks = await prisma.task.findMany({
      where: {
        departments: { some: { id: departmentId } },
        deletedAt: null
      },
      select: { state: true, endDate: true }
    });

    const total = tasks.length;
    const completed = tasks.filter(t => t.state === 'DONE').length;
    const active = tasks.filter(t => t.state === 'IN_PROGRESS' || t.state === 'REVIEW').length;
    const overdue = tasks.filter(t => t.state !== 'DONE' && t.endDate && new Date(t.endDate) < new Date()).length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const result = { total, completed, active, overdue, completionRate };
    await this.setCache(key, result, 300); // 5 minutes TTL
    this.metrics.totalResponseTime += (Date.now() - startTime);
    return result;
  }

  public async getDepartmentWorkload(departmentId: string) {
    const key = `department:${departmentId}:workload`;
    const startTime = Date.now();
    const cached = await this.getCache<any>(key);
    if (cached) {
      this.metrics.totalResponseTime += (Date.now() - startTime);
      return cached;
    }

    console.log(`[Query Cache Miss] Rebuilding department workload for ${departmentId}`);
    this.metrics.recalculations++;
    const assignees = await prisma.taskAssignee.findMany({
      where: {
        task: {
          departments: { some: { id: departmentId } },
          deletedAt: null
        }
      },
      select: {
        userId: true,
        user: { select: { name: true, email: true } },
        task: { select: { state: true } }
      }
    });

    const distribution: Record<string, { name: string, email: string, total: number, active: number, completed: number }> = {};
    assignees.forEach(a => {
      if (!distribution[a.userId]) {
        distribution[a.userId] = {
          name: a.user.name,
          email: a.user.email,
          total: 0,
          active: 0,
          completed: 0
        };
      }
      distribution[a.userId].total++;
      if (a.task.state === 'DONE') {
        distribution[a.userId].completed++;
      } else {
        distribution[a.userId].active++;
      }
    });

    await this.setCache(key, distribution, 300); // 5 minutes TTL
    this.metrics.totalResponseTime += (Date.now() - startTime);
    return distribution;
  }

  /**
   * Team Workload Queries
   */
  public async getTeamWorkload() {
    const key = 'workload:team';
    const startTime = Date.now();
    const cached = await this.getCache<any>(key);
    if (cached) {
      this.metrics.totalResponseTime += (Date.now() - startTime);
      return cached;
    }

    console.log('[Query Cache Miss] Rebuilding team workload');
    this.metrics.recalculations++;
    const assignees = await prisma.taskAssignee.findMany({
      where: { task: { deletedAt: null } },
      select: {
        userId: true,
        user: { select: { name: true, email: true } },
        task: { select: { state: true } }
      }
    });

    const workload: Record<string, { name: string, email: string, total: number, active: number, completed: number }> = {};
    assignees.forEach(a => {
      if (!workload[a.userId]) {
        workload[a.userId] = {
          name: a.user.name,
          email: a.user.email,
          total: 0,
          active: 0,
          completed: 0
        };
      }
      workload[a.userId].total++;
      if (a.task.state === 'DONE') {
        workload[a.userId].completed++;
      } else {
        workload[a.userId].active++;
      }
    });

    await this.setCache(key, workload, 300);
    this.metrics.totalResponseTime += (Date.now() - startTime);
    return workload;
  }

  public async getUserWorkload(userId: string) {
    const key = `workload:user:${userId}`;
    const startTime = Date.now();
    const cached = await this.getCache<any>(key);
    if (cached) {
      this.metrics.totalResponseTime += (Date.now() - startTime);
      return cached;
    }

    console.log(`[Query Cache Miss] Rebuilding user workload for ${userId}`);
    this.metrics.recalculations++;
    const tasks = await prisma.task.findMany({
      where: {
        assignees: { some: { userId } },
        deletedAt: null
      },
      select: { state: true, endDate: true }
    });

    const total = tasks.length;
    const completed = tasks.filter(t => t.state === 'DONE').length;
    const open = total - completed;
    const overdue = tasks.filter(t => t.state !== 'DONE' && t.endDate && new Date(t.endDate) < new Date()).length;

    const result = { total, completed, open, overdue };
    await this.setCache(key, result, 300);
    this.metrics.totalResponseTime += (Date.now() - startTime);
    return result;
  }

  /**
   * Dashboard Aggregate Queries
   */
  public async getDashboardSummary(userId: string) {
    const key = `dashboard:summary:${userId}`;
    const startTime = Date.now();
    const cached = await this.getCache<any>(key);
    if (cached) {
      this.metrics.totalResponseTime += (Date.now() - startTime);
      return cached;
    }

    console.log(`[Query Cache Miss] Rebuilding dashboard summary for user ${userId}`);
    this.metrics.recalculations++;
    const userProjects = await prisma.projectMember.findMany({
      where: { userId },
      select: { projectId: true }
    });
    const projectIds = userProjects.map(p => p.projectId);

    const [totalProjects, totalTasks, completedTasks] = await Promise.all([
      prisma.project.count({
        where: { id: { in: projectIds } }
      }),
      prisma.task.count({
        where: { projectId: { in: projectIds }, deletedAt: null }
      }),
      prisma.task.count({
        where: { projectId: { in: projectIds }, deletedAt: null, state: 'DONE' }
      })
    ]);

    const result = { totalProjects, totalTasks, completedTasks };
    await this.setCache(key, result, 60);
    this.metrics.totalResponseTime += (Date.now() - startTime);
    return result;
  }

  public async getDashboardTasks(userId: string) {
    const key = `dashboard:tasks:${userId}`;
    const startTime = Date.now();
    const cached = await this.getCache<any>(key);
    if (cached) {
      this.metrics.totalResponseTime += (Date.now() - startTime);
      return cached;
    }

    console.log(`[Query Cache Miss] Rebuilding dashboard tasks count for user ${userId}`);
    this.metrics.recalculations++;
    const userProjects = await prisma.projectMember.findMany({
      where: { userId },
      select: { projectId: true }
    });
    const projectIds = userProjects.map(p => p.projectId);

    const taskCounts = await prisma.task.groupBy({
      by: ['state'],
      _count: { id: true },
      where: { projectId: { in: projectIds }, deletedAt: null }
    });

    const result: Record<string, number> = {
      BACKLOG: 0,
      TODO: 0,
      IN_PROGRESS: 0,
      REVIEW: 0,
      DONE: 0,
      CANCELED: 0
    };
    taskCounts.forEach(c => {
      result[c.state] = c._count.id;
    });

    await this.setCache(key, result, 60);
    this.metrics.totalResponseTime += (Date.now() - startTime);
    return result;
  }

  public async getDashboardApprovals(userId: string) {
    const key = `dashboard:approvals:${userId}`;
    const startTime = Date.now();
    const cached = await this.getCache<any>(key);
    if (cached) {
      this.metrics.totalResponseTime += (Date.now() - startTime);
      return cached;
    }

    console.log(`[Query Cache Miss] Rebuilding dashboard approvals for user ${userId}`);
    this.metrics.recalculations++;
    const approvalsCount = await prisma.taskApproval.count({
      where: {
        task: {
          project: {
            members: { some: { userId } }
          },
          deletedAt: null
        },
        decision: 'SUBMITTED'
      }
    });

    const result = { pendingApprovals: approvalsCount };
    await this.setCache(key, result, 60);
    this.metrics.totalResponseTime += (Date.now() - startTime);
    return result;
  }

  public async getDashboardProjects(userId: string) {
    const key = `dashboard:projects:${userId}`;
    const startTime = Date.now();
    const cached = await this.getCache<any>(key);
    if (cached) {
      this.metrics.totalResponseTime += (Date.now() - startTime);
      return cached;
    }

    console.log(`[Query Cache Miss] Rebuilding dashboard projects for user ${userId}`);
    this.metrics.recalculations++;
    const projects = await prisma.projectMember.findMany({
      where: { userId },
      select: {
        project: {
          select: { status: true }
        }
      }
    });

    const result: Record<string, number> = {
      DRAFT: 0,
      ACTIVE: 0,
      DELAYED: 0,
      COMPLETED: 0
    };
    projects.forEach(p => {
      if (p.project) {
        result[p.project.status] = (result[p.project.status] || 0) + 1;
      }
    });

    await this.setCache(key, result, 60);
    this.metrics.totalResponseTime += (Date.now() - startTime);
    return result;
  }

  /**
   * Approval Statistics
   */
  public async getApprovalStats() {
    const key = 'approval:stats';
    const startTime = Date.now();
    const cached = await this.getCache<any>(key);
    if (cached) {
      this.metrics.totalResponseTime += (Date.now() - startTime);
      return cached;
    }

    console.log('[Query Cache Miss] Rebuilding approval stats');
    this.metrics.recalculations++;
    const counts = await prisma.taskApproval.groupBy({
      by: ['decision'],
      _count: { id: true }
    });

    const result: Record<string, number> = {
      SUBMITTED: 0,
      APPROVED: 0,
      REJECTED: 0
    };
    counts.forEach(c => {
      result[c.decision] = c._count.id;
    });

    await this.setCache(key, result, 60);
    this.metrics.totalResponseTime += (Date.now() - startTime);
    return result;
  }

  /**
   * Cache Invalidation Methods
   */
  public async invalidateTaskStats() {
    console.log('[Query Cache Invalidation] Invalidating task stats');
    await redis.del('stats:tasks:status');
    await redis.del('stats:tasks:priority');
    await redis.del('stats:tasks:assignee');
    await redis.del('stats:tasks:department');
    await redis.del('stats:tasks:project');
    
    // Invalidate dashboard queries as task updates affect them
    await this.invalidateDashboardStats();
  }

  public async invalidateDepartmentStats(departmentId: string) {
    console.log(`[Query Cache Invalidation] Invalidating department stats for "${departmentId}"`);
    await redis.del(`department:${departmentId}:stats`);
    await redis.del(`department:${departmentId}:workload`);
    await redis.del('stats:tasks:department');
  }

  public async invalidateTeamWorkload(userId?: string) {
    console.log(`[Query Cache Invalidation] Invalidating workload caches. Specific user: ${userId || 'All'}`);
    await redis.del('workload:team');
    await redis.del('stats:tasks:assignee');
    if (userId) {
      await redis.del(`workload:user:${userId}`);
    } else {
      await this.deleteByPattern('workload:user:*');
    }
  }

  public async invalidateDashboardStats() {
    console.log('[Query Cache Invalidation] Invalidating dashboard stats');
    await this.deleteByPattern('dashboard:summary:*');
    await this.deleteByPattern('dashboard:tasks:*');
    await this.deleteByPattern('dashboard:approvals:*');
    await this.deleteByPattern('dashboard:projects:*');
  }

  public async invalidateApprovalStats() {
    console.log('[Query Cache Invalidation] Invalidating approval stats');
    await redis.del('approval:stats');
    await this.deleteByPattern('dashboard:approvals:*');
  }

  /**
   * Search Query Normalization
   */
  public normalizeQuery(query: string): string {
    return query.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  /**
   * Search caching methods
   */
  public async getGlobalSearch(userId: string, query: string): Promise<any | null> {
    const norm = this.normalizeQuery(query);
    return this.getCache(`search:global:${userId}:${norm}`);
  }

  public async setGlobalSearch(userId: string, query: string, data: any): Promise<void> {
    const norm = this.normalizeQuery(query);
    const limited = Array.isArray(data) ? data.slice(0, 50) : data;
    await this.setCache(`search:global:${userId}:${norm}`, limited, 300); // 5 minutes
  }

  public async getProjectSearch(userId: string, projectId: string, query: string): Promise<any | null> {
    const norm = this.normalizeQuery(query);
    return this.getCache(`search:project:${userId}:${projectId}:${norm}`);
  }

  public async setProjectSearch(userId: string, projectId: string, query: string, data: any): Promise<void> {
    const norm = this.normalizeQuery(query);
    const limited = Array.isArray(data) ? data.slice(0, 50) : data;
    await this.setCache(`search:project:${userId}:${projectId}:${norm}`, limited, 300); // 5 minutes
  }

  public async getTaskSearch(userId: string, taskCode: string): Promise<any | null> {
    const norm = this.normalizeQuery(taskCode);
    return this.getCache(`search:task:${userId}:${norm}`);
  }

  public async setTaskSearch(userId: string, taskCode: string, result: any): Promise<void> {
    const norm = this.normalizeQuery(taskCode);
    await this.setCache(`search:task:${userId}:${norm}`, result, 600); // 10 minutes
  }

  public async getSearchSuggestions(userId: string, query: string): Promise<any | null> {
    const norm = this.normalizeQuery(query);
    return this.getCache(`search:suggestions:${userId}:${norm}`);
  }

  public async setSearchSuggestions(userId: string, query: string, data: any): Promise<void> {
    const norm = this.normalizeQuery(query);
    const limited = Array.isArray(data) ? data.slice(0, 50) : data;
    await this.setCache(`search:suggestions:${userId}:${norm}`, limited, 600); // 10 minutes
  }

  public async getCachedEntity(type: 'task' | 'project' | 'user' | 'department', id: string): Promise<any | null> {
    return this.getCache(`entity:${type}:${id}`);
  }

  public async setCachedEntity(type: 'task' | 'project' | 'user' | 'department', id: string, data: any): Promise<void> {
    await this.setCache(`entity:${type}:${id}`, data, 600); // 10 minutes
  }

  public async invalidateSearchCache() {
    console.log('[Query Cache Invalidation] Invalidating all search caches');
    await this.deleteByPattern('search:*');
  }

  public async invalidateEntityCache(type: 'task' | 'project' | 'user' | 'department', id: string) {
    console.log(`[Query Cache Invalidation] Invalidating entity cache for ${type}:${id}`);
    await redis.del(`entity:${type}:${id}`);
  }
}

export const queryCache = new QueryCacheManager();
