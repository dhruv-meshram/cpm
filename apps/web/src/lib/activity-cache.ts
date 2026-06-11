import { redis } from './redis';
import { prisma } from './prisma';
import { formatActivityLog } from './activity';

export interface ActivityFeedItem {
  id: string;
  action: string;
  actorName: string;
  projectId: string;
  projectName: string;
  taskId?: string;
  taskCode?: string;
  createdAt: string;
}

class ActivityFeedCacheManager {
  private metrics = {
    hits: 0,
    misses: 0,
    rebuilds: 0,
    totalResponseTime: 0,
    feedQueryCount: 0,
    dbReductionCount: 0
  };

  /**
   * Return a copy of the current metrics
   */
  public getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Reset the metrics counters
   */
  public resetMetrics() {
    this.metrics = {
      hits: 0,
      misses: 0,
      rebuilds: 0,
      totalResponseTime: 0,
      feedQueryCount: 0,
      dbReductionCount: 0
    };
  }

  /**
   * Format a raw database activity log to a UI-ready structure
   */
  public formatLog(log: any, projectName: string): any {
    const formatted = formatActivityLog(log, projectName);
    formatted.projectId = formatted.projectId || '';
    return formatted;
  }

  /**
   * Read feed from cache or query DB and rebuild cache on miss
   */
  public async getFeed(
    cacheKey: string,
    dbQuery: () => Promise<any[]>
  ): Promise<ActivityFeedItem[]> {
    const startTime = Date.now();
    this.metrics.feedQueryCount++;

    try {
      const exists = await redis.exists(cacheKey);
      if (exists) {
        const cachedStrings = await redis.lrange(cacheKey, 0, 49);
        const items = this.parseFeed(cachedStrings);
        this.metrics.hits++;
        this.metrics.dbReductionCount++;
        this.metrics.totalResponseTime += (Date.now() - startTime);
        return items;
      }
    } catch (err) {
      console.warn(`[Activity Cache] Hit-check failed for key "${cacheKey}", falling back to rebuild.`, err);
    }

    // Cache Miss or read error -> Rebuild
    this.metrics.misses++;
    const items = await this.rebuildFeed(cacheKey, dbQuery);
    this.metrics.totalResponseTime += (Date.now() - startTime);
    return items;
  }

  /**
   * Rebuild activity cache for a given key from the database
   */
  public async rebuildFeed(
    cacheKey: string,
    dbQuery: () => Promise<any[]>
  ): Promise<ActivityFeedItem[]> {
    this.metrics.rebuilds++;
    try {
      const dbLogs = await dbQuery();
      
      // Resolve project names for the batch of logs
      const taskIds = dbLogs
        .filter(log => log.entityType === 'Task')
        .map(log => log.entityId);

      const tasks = await prisma.task.findMany({
        where: { id: { in: taskIds } },
        select: { id: true, projectId: true }
      });
      const taskProjectMap = new Map(tasks.map(t => [t.id, t.projectId]));

      const projectIds = Array.from(new Set(dbLogs.map(log => 
        log.entityType === 'Project' ? log.entityId : taskProjectMap.get(log.entityId)
      ).filter(Boolean))) as string[];

      const projects = await prisma.project.findMany({
        where: { id: { in: projectIds } },
        select: { id: true, name: true }
      });
      const projectMap = new Map(projects.map(p => [p.id, p.name]));

      const formattedItems = dbLogs.map(log => {
        const pId = log.entityType === 'Project' ? log.entityId : taskProjectMap.get(log.entityId) || '';
        const pName = projectMap.get(pId) || 'Project Space';
        const item = this.formatLog(log, pName);
        item.projectId = pId;
        return item;
      });

      // Write to Redis (DEL -> RPUSH -> EXPIRE)
      await redis.del(cacheKey);
      if (formattedItems.length > 0) {
        const itemStrings = formattedItems.map(item => JSON.stringify(item));
        await redis.rpush(cacheKey, ...itemStrings);
        await redis.expire(cacheKey, 30);
      } else {
        // Empty sentinel to avoid empty list cache-miss loops
        await redis.rpush(cacheKey, JSON.stringify({ sentinel: true }));
        await redis.expire(cacheKey, 30);
      }

      return formattedItems;
    } catch (err) {
      console.error(`[Activity Cache] Failed to rebuild key "${cacheKey}":`, err);
      return [];
    }
  }

  /**
   * Push a new activity to a specific cache feed incrementally
   */
  public async pushToFeed(cacheKey: string, formattedItem: ActivityFeedItem): Promise<void> {
    try {
      const exists = await redis.exists(cacheKey);
      if (!exists) {
        // If feed is not currently cached, let the next read rebuild it
        return;
      }

      // Check for sentinel and delete if present
      const firstItems = await redis.lrange(cacheKey, 0, 0);
      if (firstItems.length > 0) {
        try {
          const parsed = JSON.parse(firstItems[0]);
          if (parsed.sentinel) {
            await redis.del(cacheKey);
          }
        } catch {}
      }

      // Prepend activity
      await redis.lpush(cacheKey, JSON.stringify(formattedItem));
      // Trim to limit (50)
      await redis.ltrim(cacheKey, 0, 49);
      // Refresh TTL
      await redis.expire(cacheKey, 30);

    } catch (err) {
      console.warn(`[Activity Cache] Failed incremental push for key "${cacheKey}". Invalidating cache...`, err);
      await redis.del(cacheKey);
    }
  }

  /**
   * Distribute a newly logged activity to all relevant cached feeds
   */
  public async handleNewActivity(
    activityLog: any,
    resolvedProjectId?: string
  ): Promise<void> {
    try {
      let projectId = resolvedProjectId;
      if (!projectId) {
        if (activityLog.entityType === 'Project') {
          projectId = activityLog.entityId;
        } else if (activityLog.entityType === 'Task') {
          const task = await prisma.task.findUnique({
            where: { id: activityLog.entityId },
            select: { projectId: true }
          });
          if (task) {
            projectId = task.projectId;
          }
        }
      }

      let projectName = 'Project Space';
      if (projectId) {
        const proj = await prisma.project.findUnique({
          where: { id: projectId },
          select: { name: true }
        });
        if (proj) {
          projectName = proj.name;
        }
      }

      const formatted = this.formatLog(activityLog, projectName);
      if (projectId) {
        formatted.projectId = projectId;
      }

      // 1. Distribute to Dashboard feed
      await this.pushToFeed('activity:dashboard', formatted);

      // 2. Distribute to Project feed
      if (projectId) {
        await this.pushToFeed(`activity:project:${projectId}`, formatted);
      }

      // 3. Distribute to Department feeds (if task is in departments)
      if (activityLog.entityType === 'Task') {
        const taskDepts = await prisma.task.findUnique({
          where: { id: activityLog.entityId },
          select: { departments: { select: { id: true } } }
        });
        if (taskDepts?.departments) {
          for (const dept of taskDepts.departments) {
            await this.pushToFeed(`activity:department:${dept.id}`, formatted);
          }
        }

        // 4. Distribute to User feeds (for assignees)
        const assignees = await prisma.taskAssignee.findMany({
          where: { taskId: activityLog.entityId },
          select: { userId: true }
        });
        for (const assignee of assignees) {
          await this.pushToFeed(`activity:user:${assignee.userId}`, formatted);
        }
      }

      // 5. Distribute to User feed (for actor)
      if (activityLog.userId) {
        await this.pushToFeed(`activity:user:${activityLog.userId}`, formatted);
      }

    } catch (err) {
      console.error('[Activity Cache] Error during activity distribution:', err);
    }
  }

  /**
   * Helper to filter out sentinel values from cached strings
   */
  private parseFeed(cachedStrings: string[]): ActivityFeedItem[] {
    const items: ActivityFeedItem[] = [];
    for (const str of cachedStrings) {
      try {
        const parsed = JSON.parse(str);
        if (!parsed.sentinel) {
          items.push(parsed);
        }
      } catch {}
    }
    return items;
  }
}

export const activityCache = new ActivityFeedCacheManager();
