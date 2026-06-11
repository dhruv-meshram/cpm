import { redis } from './redis';
import { prisma } from './prisma';

export interface UserRolesCache {
  globalRole: string;
  projectRoles: Record<string, string>;
  departmentRoles: Record<string, string>;
}

class PermissionCacheManager {
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

  private getResource(projectId: string, context?: { taskId?: string; departmentId?: string }): string {
    let resource = `project:${projectId}`;
    if (context?.taskId) {
      resource += `:task:${context.taskId}`;
    }
    if (context?.departmentId) {
      resource += `:dept:${context.departmentId}`;
    }
    return resource;
  }

  /**
   * Get cached permission check result
   */
  public async getPermissionCheck(
    userId: string,
    projectId: string,
    action: string,
    context?: { taskId?: string; departmentId?: string }
  ): Promise<boolean | null> {
    const startTime = Date.now();
    const resource = this.getResource(projectId, context);
    const key = `permission-check:${userId}:${resource}:${action}`;

    try {
      const exists = await redis.exists(key);
      if (exists) {
        const cached = await redis.lrange(key, 0, 0);
        if (cached.length > 0) {
          const val = JSON.parse(cached[0]);
          this.metrics.hits++;
          this.metrics.totalResponseTime += (Date.now() - startTime);
          return val.allowed;
        }
      }
    } catch (err) {
      console.warn(`[Permission Cache] Failed to read permission check key "${key}":`, err);
    }

    this.metrics.misses++;
    this.metrics.totalResponseTime += (Date.now() - startTime);
    return null;
  }

  /**
   * Cache a permission check result
   */
  public async setPermissionCheck(
    userId: string,
    projectId: string,
    action: string,
    context: { taskId?: string; departmentId?: string } | undefined,
    allowed: boolean
  ): Promise<void> {
    const resource = this.getResource(projectId, context);
    const key = `permission-check:${userId}:${resource}:${action}`;

    try {
      this.metrics.recalculations++;
      await redis.del(key);
      await redis.rpush(key, JSON.stringify({ allowed }));
      await redis.expire(key, 900); // 15 minutes TTL
    } catch (err) {
      console.warn(`[Permission Cache] Failed to write permission check key "${key}":`, err);
    }
  }

  /**
   * Get user roles cache (Global, Project, Department roles)
   */
  public async getUserRoles(userId: string): Promise<UserRolesCache> {
    const key = `roles:user:${userId}`;

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
      console.warn(`[Permission Cache] Failed to read user roles key "${key}":`, err);
    }

    // Cache miss: resolve from database
    this.metrics.misses++;
    console.log(`[Permission Cache] Resolving roles for user "${userId}" from DB`);

    const workspaceMember = await prisma.workspaceMember.findFirst({
      where: { userId },
      select: { role: true }
    });

    const members = await prisma.projectMember.findMany({
      where: { userId },
      select: { projectId: true, role: true, departmentId: true }
    });

    const projectRoles: Record<string, string> = {};
    const departmentRoles: Record<string, string> = {};
    for (const m of members) {
      projectRoles[m.projectId] = m.role;
      if (m.departmentId) {
        departmentRoles[m.departmentId] = m.role === 'DEPARTMENT_HEAD' ? 'Head' : 'Member';
      }
    }

    const rolesData: UserRolesCache = {
      globalRole: workspaceMember?.role || 'MEMBER',
      projectRoles,
      departmentRoles
    };

    try {
      await redis.del(key);
      await redis.rpush(key, JSON.stringify(rolesData));
      await redis.expire(key, 900); // 15 minutes TTL
    } catch (err) {
      console.warn(`[Permission Cache] Failed to cache roles for user "${userId}":`, err);
    }

    return rolesData;
  }

  /**
   * Get global permissions
   */
  public async getGlobalPermissions(userId: string): Promise<string[]> {
    const key = `permissions:user:${userId}`;

    try {
      const exists = await redis.exists(key);
      if (exists) {
        const cached = await redis.lrange(key, 0, 0);
        if (cached.length > 0) {
          this.metrics.hits++;
          return JSON.parse(cached[0]).permissions || [];
        }
      }
    } catch (err) {
      console.warn(`[Permission Cache] Failed to read global permissions key "${key}":`, err);
    }

    this.metrics.misses++;
    const workspaceMember = await prisma.workspaceMember.findFirst({
      where: { userId },
      select: { role: true }
    });

    const role = workspaceMember?.role || 'MEMBER';
    const permissions: string[] = [];
    if (role === 'ADMIN' || role === 'OWNER') {
      permissions.push('admin', 'view', 'create_project', 'delete_project', 'manage_users');
    } else {
      permissions.push('view', 'create_project');
    }

    try {
      await redis.del(key);
      await redis.rpush(key, JSON.stringify({ userId, permissions }));
      await redis.expire(key, 1800); // 30 minutes TTL
    } catch (err) {
      console.warn(`[Permission Cache] Failed to cache global permissions for user "${userId}":`, err);
    }

    return permissions;
  }

  /**
   * Get project level permissions
   */
  public async getProjectPermissions(userId: string, projectId: string): Promise<string[]> {
    const key = `permissions:user:${userId}:project:${projectId}`;

    try {
      const exists = await redis.exists(key);
      if (exists) {
        const cached = await redis.lrange(key, 0, 0);
        if (cached.length > 0) {
          this.metrics.hits++;
          return JSON.parse(cached[0]).permissions || [];
        }
      }
    } catch (err) {
      console.warn(`[Permission Cache] Failed to read project permissions key "${key}":`, err);
    }

    this.metrics.misses++;
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
      include: { customRole: true }
    });

    if (!member) return [];

    const permissions: string[] = [];
    const actions: string[] = [
      'view',
      'create_task',
      'edit_task',
      'submit_task',
      'approve_dept_task',
      'approve_final',
      'manage_members',
      'delete_project',
      'post_announcement',
      'manage_departments',
      'manage_tags',
      'manage_roles'
    ];

    const role = member.role.toUpperCase().replace(' ', '_');
    if (role === 'PROJECT_ADMIN' || role === 'ADMIN') {
      permissions.push(...actions);
    } else if (member.customRole) {
      const cr = member.customRole;
      permissions.push('view');
      if (cr.addTasks) permissions.push('create_task');
      if (cr.modifyTasks === 'ALL') permissions.push('edit_task');
      if (cr.changeTaskStatus) permissions.push('submit_task');
      if (cr.approveTasks) {
        permissions.push('approve_dept_task', 'approve_final');
      }
      if (cr.makeAnnouncements) permissions.push('post_announcement');
      if (cr.manageTeam) permissions.push('manage_members');
      if (cr.addDepartments) permissions.push('manage_departments');
      if (cr.manageTags) permissions.push('manage_tags');
      if (cr.manageRoles) permissions.push('manage_roles');
    } else {
      permissions.push('view', 'create_task', 'submit_task');
      if (role === 'PROJECT_MANAGER' || role === 'CAPTAIN') {
        permissions.push('edit_task', 'approve_dept_task', 'post_announcement', 'manage_members', 'manage_departments', 'manage_tags', 'manage_roles');
      }
      if (role === 'CAPTAIN') {
        permissions.push('approve_final');
      }
      if (role === 'DEPARTMENT_HEAD') {
        permissions.push('approve_dept_task');
      }
    }

    try {
      await redis.del(key);
      await redis.rpush(key, JSON.stringify({ userId, projectId, permissions }));
      await redis.expire(key, 1800); // 30 minutes TTL
    } catch (err) {
      console.warn(`[Permission Cache] Failed to cache project permissions for user "${userId}":`, err);
    }

    return permissions;
  }

  /**
   * Get department level permissions
   */
  public async getDepartmentPermissions(userId: string, departmentId: string): Promise<string[]> {
    const key = `permissions:user:${userId}:department:${departmentId}`;

    try {
      const exists = await redis.exists(key);
      if (exists) {
        const cached = await redis.lrange(key, 0, 0);
        if (cached.length > 0) {
          this.metrics.hits++;
          return JSON.parse(cached[0]).permissions || [];
        }
      }
    } catch (err) {
      console.warn(`[Permission Cache] Failed to read department permissions key "${key}":`, err);
    }

    this.metrics.misses++;
    const member = await prisma.projectMember.findFirst({
      where: { userId, departmentId }
    });

    const permissions: string[] = [];
    if (member) {
      permissions.push('view');
      const role = member.role.toUpperCase().replace(' ', '_');
      if (role === 'PROJECT_ADMIN' || role === 'ADMIN' || role === 'PROJECT_MANAGER' || role === 'CAPTAIN' || role === 'DEPARTMENT_HEAD') {
        permissions.push('approve_dept_task', 'task:update');
      }
    }

    try {
      await redis.del(key);
      await redis.rpush(key, JSON.stringify({ userId, departmentId, permissions }));
      await redis.expire(key, 1800); // 30 minutes TTL
    } catch (err) {
      console.warn(`[Permission Cache] Failed to cache department permissions for user "${userId}":`, err);
    }

    return permissions;
  }

  /**
   * Invalidate a single user's permission caches
   */
  public async invalidateUser(userId: string): Promise<void> {
    this.metrics.invalidations++;
    console.log(`[Permission Invalidation] Invalidating all permission caches for user "${userId}"`);
    try {
      await redis.del(`roles:user:${userId}`);
      await redis.del(`permissions:user:${userId}`);
      await redis.delPattern(`permissions:user:${userId}:*`);
      await redis.delPattern(`permission-check:${userId}:*`);
    } catch (err) {
      console.error(`[Permission Invalidation] Failed to invalidate user "${userId}":`, err);
    }
  }

  /**
   * Invalidate a specific project's permission caches
   */
  public async invalidateProject(projectId: string): Promise<void> {
    this.metrics.invalidations++;
    console.log(`[Permission Invalidation] Invalidating all permission caches for project "${projectId}"`);
    try {
      await redis.delPattern(`permissions:user:*:project:${projectId}`);
      await redis.delPattern(`permission-check:*:project:${projectId}*`);
    } catch (err) {
      console.error(`[Permission Invalidation] Failed to invalidate project "${projectId}":`, err);
    }
  }

  /**
   * Invalidate user permission caches for a specific project
   */
  public async invalidateUserProject(userId: string, projectId: string): Promise<void> {
    this.metrics.invalidations++;
    console.log(`[Permission Invalidation] Invalidating user "${userId}" permissions for project "${projectId}"`);
    try {
      await redis.del(`permissions:user:${userId}:project:${projectId}`);
      await redis.delPattern(`permission-check:${userId}:project:${projectId}*`);
    } catch (err) {
      console.error(`[Permission Invalidation] Failed to invalidate user project cache:`, err);
    }
  }

  /**
   * Invalidate all permission caches (e.g. on role/permission definitions change)
   */
  public async invalidateAll(): Promise<void> {
    this.metrics.invalidations++;
    console.log(`[Permission Invalidation] Invalidating all permission and role caches globally`);
    try {
      await redis.delPattern('roles:user:*');
      await redis.delPattern('permissions:user:*');
      await redis.delPattern('permission-check:*');
    } catch (err) {
      console.error(`[Permission Invalidation] Failed to invalidate all caches:`, err);
    }
  }
}

export const permissionCache = new PermissionCacheManager();
