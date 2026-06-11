import { redis } from './redis';
import { prisma } from './prisma';

export interface NotificationSummary {
  total: number;
  unread: number;
  read: number;
  mentions: number;
  approvals: number;
  tasks: number;
}

export interface CachedNotification {
  id: string;
  userId: string;
  projectId: string | null;
  taskId: string | null;
  type: string;
  title: string;
  content: string;
  isRead: boolean;
  isArchived: boolean;
  createdAt: string;
}

class NotificationCacheManager {
  private metrics = {
    hits: 0,
    misses: 0,
    rebuilds: 0,
    totalResponseTime: 0,
    dbReductionCount: 0
  };

  public getMetrics() {
    return { ...this.metrics };
  }

  public resetMetrics() {
    this.metrics = {
      hits: 0,
      misses: 0,
      rebuilds: 0,
      totalResponseTime: 0,
      dbReductionCount: 0
    };
  }

  private getKeys(userId: string) {
    return {
      countKey: `notification:count:${userId}`,
      summaryKey: `notification:summary:${userId}`,
      recentKey: `notification:recent:${userId}`
    };
  }

  /**
   * Get unread notification count
   */
  public async getUnreadCount(userId: string): Promise<number> {
    const startTime = Date.now();
    const { countKey } = this.getKeys(userId);

    try {
      const exists = await redis.exists(countKey);
      if (exists) {
        const cached = await redis.lrange(countKey, 0, 0);
        if (cached.length > 0) {
          const val = JSON.parse(cached[0]);
          this.metrics.hits++;
          this.metrics.dbReductionCount++;
          this.metrics.totalResponseTime += (Date.now() - startTime);
          return val.unread;
        }
      }
    } catch (err) {
      console.warn(`[Notification Cache] Failed to get unread count for user "${userId}":`, err);
    }

    this.metrics.misses++;
    const data = await this.rebuildAll(userId);
    this.metrics.totalResponseTime += (Date.now() - startTime);
    return data.summary.unread;
  }

  /**
   * Get notification summary counts
   */
  public async getSummary(userId: string): Promise<NotificationSummary> {
    const startTime = Date.now();
    const { summaryKey } = this.getKeys(userId);

    try {
      const exists = await redis.exists(summaryKey);
      if (exists) {
        const cached = await redis.lrange(summaryKey, 0, 0);
        if (cached.length > 0) {
          this.metrics.hits++;
          this.metrics.dbReductionCount++;
          this.metrics.totalResponseTime += (Date.now() - startTime);
          return JSON.parse(cached[0]);
        }
      }
    } catch (err) {
      console.warn(`[Notification Cache] Failed to get summary for user "${userId}":`, err);
    }

    this.metrics.misses++;
    const data = await this.rebuildAll(userId);
    this.metrics.totalResponseTime += (Date.now() - startTime);
    return data.summary;
  }

  /**
   * Get recent 20 notifications
   */
  public async getRecentNotifications(userId: string): Promise<CachedNotification[]> {
    const startTime = Date.now();
    const { recentKey } = this.getKeys(userId);

    try {
      const exists = await redis.exists(recentKey);
      if (exists) {
        const cached = await redis.lrange(recentKey, 0, 19);
        const list = cached.map(str => JSON.parse(str)).filter(item => !item.sentinel);
        this.metrics.hits++;
        this.metrics.dbReductionCount++;
        this.metrics.totalResponseTime += (Date.now() - startTime);
        return list;
      }
    } catch (err) {
      console.warn(`[Notification Cache] Failed to get recent notifications for user "${userId}":`, err);
    }

    this.metrics.misses++;
    const data = await this.rebuildAll(userId);
    this.metrics.totalResponseTime += (Date.now() - startTime);
    return data.recent;
  }

  /**
   * Rebuild all notification caches for a user
   */
  public async rebuildAll(userId: string): Promise<{ summary: NotificationSummary; recent: CachedNotification[] }> {
    this.metrics.rebuilds++;
    console.log(`[Notification Cache] Rebuilding all notification caches for user "${userId}"`);

    try {
      const allNotifications = await prisma.notification.findMany({
        where: { userId, isArchived: false },
        orderBy: { createdAt: 'desc' }
      });

      const total = allNotifications.length;
      const unread = allNotifications.filter(n => !n.isRead).length;
      const read = total - unread;

      const mentions = allNotifications.filter(n => 
        n.type.toUpperCase().includes('MENTION')
      ).length;

      const approvals = allNotifications.filter(n => 
        n.type.toUpperCase().includes('APPROVAL')
      ).length;

      const tasks = allNotifications.filter(n => 
        n.type.toUpperCase().startsWith('TASK') || 
        n.type.toUpperCase().includes('ASSIGNEE') ||
        n.type.toUpperCase().includes('STATUS') ||
        n.type.toUpperCase().includes('DEPENDENCY')
      ).length;

      const summary: NotificationSummary = {
        total,
        unread,
        read,
        mentions,
        approvals,
        tasks
      };

      const recent = allNotifications.slice(0, 20).map(n => ({
        id: n.id,
        userId: n.userId,
        projectId: n.projectId,
        taskId: n.taskId,
        type: n.type,
        title: n.title,
        content: n.content,
        isRead: n.isRead,
        isArchived: n.isArchived,
        createdAt: n.createdAt.toISOString()
      }));

      const { countKey, summaryKey, recentKey } = this.getKeys(userId);

      // Write count
      await redis.del(countKey);
      await redis.rpush(countKey, JSON.stringify({ unread }));
      await redis.expire(countKey, 86400); // 24h fallback TTL since we update on write

      // Write summary
      await redis.del(summaryKey);
      await redis.rpush(summaryKey, JSON.stringify(summary));
      await redis.expire(summaryKey, 86400);

      // Write recent
      await redis.del(recentKey);
      if (recent.length > 0) {
        const strList = recent.map(r => JSON.stringify(r));
        await redis.rpush(recentKey, ...strList);
        await redis.expire(recentKey, 86400);
      } else {
        await redis.rpush(recentKey, JSON.stringify({ sentinel: true }));
        await redis.expire(recentKey, 86400);
      }

      return { summary, recent };
    } catch (err) {
      console.error(`[Notification Cache] Failed to rebuild caches for user "${userId}":`, err);
      const fallbackSummary = { total: 0, unread: 0, read: 0, mentions: 0, approvals: 0, tasks: 0 };
      return { summary: fallbackSummary, recent: [] };
    }
  }

  /**
   * Handle new notification created event (incremental update)
   */
  public async onNotificationCreated(userId: string, notification: any): Promise<void> {
    try {
      const { countKey, summaryKey, recentKey } = this.getKeys(userId);

      const exists = await redis.exists(countKey);
      if (!exists) {
        // Cache is empty/cold, let it rebuild on next read
        return;
      }

      // 1. Update unread count cache
      const cachedCounts = await redis.lrange(countKey, 0, 0);
      if (cachedCounts.length > 0) {
        const val = JSON.parse(cachedCounts[0]);
        val.unread += 1;
        await redis.del(countKey);
        await redis.rpush(countKey, JSON.stringify(val));
      }

      // 2. Update summary cache
      const cachedSummaryList = await redis.lrange(summaryKey, 0, 0);
      if (cachedSummaryList.length > 0) {
        const summary = JSON.parse(cachedSummaryList[0]) as NotificationSummary;
        summary.total += 1;
        summary.unread += 1;

        const typeUpper = notification.type.toUpperCase();
        if (typeUpper.includes('MENTION')) {
          summary.mentions += 1;
        }
        if (typeUpper.includes('APPROVAL')) {
          summary.approvals += 1;
        }
        if (typeUpper.startsWith('TASK') || typeUpper.includes('ASSIGNEE') || typeUpper.includes('STATUS') || typeUpper.includes('DEPENDENCY')) {
          summary.tasks += 1;
        }

        await redis.del(summaryKey);
        await redis.rpush(summaryKey, JSON.stringify(summary));
      }

      // 3. Update recent notifications cache
      const firstRecent = await redis.lrange(recentKey, 0, 0);
      if (firstRecent.length > 0) {
        const parsed = JSON.parse(firstRecent[0]);
        if (parsed.sentinel) {
          await redis.del(recentKey);
        }
      }

      const cachedNotif: CachedNotification = {
        id: notification.id,
        userId: notification.userId,
        projectId: notification.projectId,
        taskId: notification.taskId,
        type: notification.type,
        title: notification.title,
        content: notification.content,
        isRead: notification.isRead,
        isArchived: notification.isArchived,
        createdAt: new Date(notification.createdAt).toISOString()
      };

      await redis.lpush(recentKey, JSON.stringify(cachedNotif));
      await redis.ltrim(recentKey, 0, 19);

    } catch (err) {
      console.warn(`[Notification Cache] Failed incremental created-push for user "${userId}". Rebuilding...`, err);
      await this.rebuildAll(userId);
    }
  }

  /**
   * Handle notification marked read
   */
  public async onNotificationMarkedRead(userId: string, notificationId: string, all: boolean = false): Promise<void> {
    try {
      const { countKey, summaryKey, recentKey } = this.getKeys(userId);

      const exists = await redis.exists(countKey);
      if (!exists) return;

      if (all) {
        // All marked read
        // 1. Count -> unread: 0
        await redis.del(countKey);
        await redis.rpush(countKey, JSON.stringify({ unread: 0 }));

        // 2. Summary -> unread: 0, read = total
        const cachedSummaryList = await redis.lrange(summaryKey, 0, 0);
        if (cachedSummaryList.length > 0) {
          const summary = JSON.parse(cachedSummaryList[0]) as NotificationSummary;
          summary.read = summary.total;
          summary.unread = 0;
          await redis.del(summaryKey);
          await redis.rpush(summaryKey, JSON.stringify(summary));
        }

        // 3. Recent list -> update all to isRead: true
        const recentStr = await redis.lrange(recentKey, 0, 19);
        const updatedRecent = recentStr.map(str => {
          const item = JSON.parse(str);
          if (!item.sentinel) item.isRead = true;
          return JSON.stringify(item);
        });
        await redis.del(recentKey);
        await redis.rpush(recentKey, ...updatedRecent);

      } else {
        // Specific marked read
        // 1. Read recent list to find target and check if it was unread
        const recentStr = await redis.lrange(recentKey, 0, 19);
        let wasUnread = false;

        const updatedRecent = recentStr.map(str => {
          const item = JSON.parse(str);
          if (item.id === notificationId) {
            if (!item.isRead) {
              wasUnread = true;
              item.isRead = true;
            }
          }
          return JSON.stringify(item);
        });

        // If not in recent list, we check DB directly or just assume it was unread and decrement
        // (to be safe, we can read the actual notification from DB or use the count decrement).
        // Let's assume it was unread unless found in recent list as read.
        if (recentStr.length > 0 && !wasUnread) {
          // Check if it exists in the recent list at all. If it was already read, we don't decrement.
          // If not found in recent list, we query if it was read.
          const found = recentStr.some(str => JSON.parse(str).id === notificationId);
          if (!found) {
            const notif = await prisma.notification.findUnique({
              where: { id: notificationId },
              select: { isRead: true }
            });
            if (notif && !notif.isRead) {
              wasUnread = true;
            }
          }
        } else {
          // It was found in recent list and updated
          wasUnread = true;
        }

        if (wasUnread) {
          // Decrement count
          const cachedCounts = await redis.lrange(countKey, 0, 0);
          if (cachedCounts.length > 0) {
            const val = JSON.parse(cachedCounts[0]);
            val.unread = Math.max(0, val.unread - 1);
            await redis.del(countKey);
            await redis.rpush(countKey, JSON.stringify(val));
          }

          // Update summary
          const cachedSummaryList = await redis.lrange(summaryKey, 0, 0);
          if (cachedSummaryList.length > 0) {
            const summary = JSON.parse(cachedSummaryList[0]) as NotificationSummary;
            summary.unread = Math.max(0, summary.unread - 1);
            summary.read += 1;
            await redis.del(summaryKey);
            await redis.rpush(summaryKey, JSON.stringify(summary));
          }
        }

        // Save updated recent list
        await redis.del(recentKey);
        await redis.rpush(recentKey, ...updatedRecent);
      }
    } catch (err) {
      console.warn(`[Notification Cache] Failed to mark read for user "${userId}". Rebuilding...`, err);
      await this.rebuildAll(userId);
    }
  }

  /**
   * Handle notification marked unread
   */
  public async onNotificationMarkedUnread(userId: string, notificationId: string): Promise<void> {
    try {
      const { countKey, summaryKey, recentKey } = this.getKeys(userId);

      const exists = await redis.exists(countKey);
      if (!exists) return;

      const recentStr = await redis.lrange(recentKey, 0, 19);
      let wasRead = false;

      const updatedRecent = recentStr.map(str => {
        const item = JSON.parse(str);
        if (item.id === notificationId) {
          if (item.isRead) {
            wasRead = true;
            item.isRead = false;
          }
        }
        return JSON.stringify(item);
      });

      if (recentStr.length > 0 && !wasRead) {
        const found = recentStr.some(str => JSON.parse(str).id === notificationId);
        if (!found) {
          const notif = await prisma.notification.findUnique({
            where: { id: notificationId },
            select: { isRead: true }
          });
          if (notif && notif.isRead) {
            wasRead = true;
          }
        }
      } else {
        wasRead = true;
      }

      if (wasRead) {
        // Increment count
        const cachedCounts = await redis.lrange(countKey, 0, 0);
        if (cachedCounts.length > 0) {
          const val = JSON.parse(cachedCounts[0]);
          val.unread += 1;
          await redis.del(countKey);
          await redis.rpush(countKey, JSON.stringify(val));
        }

        // Update summary
        const cachedSummaryList = await redis.lrange(summaryKey, 0, 0);
        if (cachedSummaryList.length > 0) {
          const summary = JSON.parse(cachedSummaryList[0]) as NotificationSummary;
          summary.unread += 1;
          summary.read = Math.max(0, summary.read - 1);
          await redis.del(summaryKey);
          await redis.rpush(summaryKey, JSON.stringify(summary));
        }
      }

      // Save updated recent list
      await redis.del(recentKey);
      await redis.rpush(recentKey, ...updatedRecent);
    } catch (err) {
      console.warn(`[Notification Cache] Failed to mark unread for user "${userId}". Rebuilding...`, err);
      await this.rebuildAll(userId);
    }
  }

  /**
   * Handle notification deletion/archiving (incremental update)
   */
  public async onNotificationDeleted(userId: string, notificationId: string): Promise<void> {
    try {
      const { countKey, summaryKey, recentKey } = this.getKeys(userId);

      const exists = await redis.exists(countKey);
      if (!exists) return;

      const recentStr = await redis.lrange(recentKey, 0, 19);
      let wasUnread = false;
      let targetItem: any = null;

      const updatedRecent: string[] = [];
      for (const str of recentStr) {
        const item = JSON.parse(str);
        if (item.id === notificationId) {
          targetItem = item;
          wasUnread = !item.isRead;
        } else {
          updatedRecent.push(str);
        }
      }

      // If not in recent list, we read from database (or check if it was unread)
      if (recentStr.length > 0 && !targetItem) {
        // Not found in recent list, query DB
        const notif = await prisma.notification.findUnique({
          where: { id: notificationId }
        });
        if (notif) {
          targetItem = notif;
          wasUnread = !notif.isRead;
        }
      }

      if (targetItem) {
        // Adjust counts
        const cachedCounts = await redis.lrange(countKey, 0, 0);
        if (cachedCounts.length > 0 && wasUnread) {
          const val = JSON.parse(cachedCounts[0]);
          val.unread = Math.max(0, val.unread - 1);
          await redis.del(countKey);
          await redis.rpush(countKey, JSON.stringify(val));
        }

        const cachedSummaryList = await redis.lrange(summaryKey, 0, 0);
        if (cachedSummaryList.length > 0) {
          const summary = JSON.parse(cachedSummaryList[0]) as NotificationSummary;
          summary.total = Math.max(0, summary.total - 1);
          if (wasUnread) {
            summary.unread = Math.max(0, summary.unread - 1);
          } else {
            summary.read = Math.max(0, summary.read - 1);
          }

          const typeUpper = targetItem.type.toUpperCase();
          if (typeUpper.includes('MENTION')) {
            summary.mentions = Math.max(0, summary.mentions - 1);
          }
          if (typeUpper.includes('APPROVAL')) {
            summary.approvals = Math.max(0, summary.approvals - 1);
          }
          if (typeUpper.startsWith('TASK') || typeUpper.includes('ASSIGNEE') || typeUpper.includes('STATUS') || typeUpper.includes('DEPENDENCY')) {
            summary.tasks = Math.max(0, summary.tasks - 1);
          }

          await redis.del(summaryKey);
          await redis.rpush(summaryKey, JSON.stringify(summary));
        }

        // Save updated recent list
        await redis.del(recentKey);
        if (updatedRecent.length > 0) {
          await redis.rpush(recentKey, ...updatedRecent);
        } else {
          await redis.rpush(recentKey, JSON.stringify({ sentinel: true }));
        }
      }
    } catch (err) {
      console.warn(`[Notification Cache] Failed deletion sync for user "${userId}". Rebuilding...`, err);
      await this.rebuildAll(userId);
    }
  }
}

export const notificationCache = new NotificationCacheManager();

export async function createNotification(params: {
  userId: string;
  projectId?: string | null;
  taskId?: string | null;
  type: string;
  title: string;
  content: string;
}) {
  const notif = await prisma.notification.create({
    data: {
      userId: params.userId,
      projectId: params.projectId,
      taskId: params.taskId,
      type: params.type,
      title: params.title,
      content: params.content,
    }
  });

  // Incrementally update the cache
  await notificationCache.onNotificationCreated(params.userId, notif);

  return notif;
}
