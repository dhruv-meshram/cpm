import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { queryCache } from '@/lib/query-cache';

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';
    const projectId = searchParams.get('projectId') || '';
    const taskCode = searchParams.get('taskCode') || '';
    const suggestions = searchParams.get('suggestions') === 'true';

    const userId = session.userId as string;

    // 1. Task Code Lookup
    if (taskCode) {
      const cachedTask = await queryCache.getTaskSearch(userId, taskCode);
      if (cachedTask) {
        return NextResponse.json(cachedTask);
      }

      const suffix = taskCode.replace(/^cp-/i, '').toLowerCase();
      // Get projects user has access to
      const memberProjects = await prisma.projectMember.findMany({
        where: { userId },
        select: { projectId: true }
      });
      const projectIds = memberProjects.map(mp => mp.projectId);

      const task = await prisma.task.findFirst({
        where: {
          projectId: { in: projectIds },
          deletedAt: null,
          OR: [
            { id: { equals: taskCode, mode: 'insensitive' } },
            { id: { startsWith: suffix, mode: 'insensitive' } },
            { id: { contains: suffix, mode: 'insensitive' } }
          ]
        },
        include: {
          project: {
            select: { id: true, name: true, identifier: true }
          }
        }
      });

      if (!task) {
        return NextResponse.json({ error: 'Task not found or access denied' }, { status: 404 });
      }

      const formattedTask = {
        id: task.id,
        code: `CP-${task.id.slice(0, 4).toUpperCase()}`,
        title: task.title,
        description: task.description,
        state: task.state,
        projectId: task.projectId,
        projectName: task.project.name
      };

      await queryCache.setTaskSearch(userId, taskCode, formattedTask);
      // Cache as a frequently accessed task entity
      await queryCache.setCachedEntity('task', task.id, formattedTask);

      return NextResponse.json(formattedTask);
    }

    // Normalized query for caching
    const normalizedQuery = queryCache.normalizeQuery(q);

    // Get projects user has access to
    const memberProjects = await prisma.projectMember.findMany({
      where: { userId },
      select: { projectId: true }
    });
    const projectIds = memberProjects.map(mp => mp.projectId);

    // 2. Project-Specific Search
    if (projectId) {
      // Access check
      if (!projectIds.includes(projectId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      if (suggestions) {
        const cachedSugg = await queryCache.getSearchSuggestions(userId, `${projectId}:${q}`);
        if (cachedSugg) {
          return NextResponse.json(cachedSugg);
        }

        // Project autocomplete suggestions
        const tasks = await prisma.task.findMany({
          where: {
            projectId,
            deletedAt: null,
            OR: [
              { title: { contains: normalizedQuery, mode: 'insensitive' } },
              { id: { contains: normalizedQuery, mode: 'insensitive' } }
            ]
          },
          take: 10,
          select: { id: true, title: true }
        });

        const suggestionsList = tasks.map(t => ({
          id: t.id,
          text: `CP-${t.id.slice(0, 4).toUpperCase()} - ${t.title}`,
          type: 'task'
        }));

        await queryCache.setSearchSuggestions(userId, `${projectId}:${q}`, suggestionsList);
        return NextResponse.json(suggestionsList);
      }

      // Main Project-level search
      const cachedProjSearch = await queryCache.getProjectSearch(userId, projectId, q);
      if (cachedProjSearch) {
        return NextResponse.json(cachedProjSearch);
      }

      // Search tasks
      const tasks = await prisma.task.findMany({
        where: {
          projectId,
          deletedAt: null,
          OR: [
            { title: { contains: normalizedQuery, mode: 'insensitive' } },
            { description: { contains: normalizedQuery, mode: 'insensitive' } },
            { id: { contains: normalizedQuery, mode: 'insensitive' } }
          ]
        },
        take: 50,
        include: {
          assignees: { include: { user: { select: { id: true, name: true } } } }
        }
      });

      // Search dependencies
      const dependencies = await prisma.dependency.findMany({
        where: {
          projectId,
          OR: [
            { predecessorTask: { title: { contains: normalizedQuery, mode: 'insensitive' } } },
            { successorTask: { title: { contains: normalizedQuery, mode: 'insensitive' } } }
          ]
        },
        take: 20,
        include: {
          predecessorTask: { select: { title: true } },
          successorTask: { select: { title: true } }
        }
      });

      // Search users associated with the project
      const members = await prisma.projectMember.findMany({
        where: {
          projectId,
          user: {
            OR: [
              { name: { contains: normalizedQuery, mode: 'insensitive' } },
              { email: { contains: normalizedQuery, mode: 'insensitive' } }
            ]
          }
        },
        take: 20,
        include: {
          user: { select: { id: true, name: true, email: true, avatar: true } }
        }
      });

      const results = {
        tasks: tasks.map(t => ({
          id: t.id,
          code: `CP-${t.id.slice(0, 4).toUpperCase()}`,
          title: t.title,
          description: t.description,
          state: t.state
        })),
        dependencies: dependencies.map(d => ({
          id: d.id,
          type: d.dependencyType,
          predecessor: d.predecessorTask.title,
          successor: d.successorTask.title
        })),
        users: members.map(m => ({
          id: m.user.id,
          name: m.user.name,
          email: m.user.email,
          role: m.role
        }))
      };

      await queryCache.setProjectSearch(userId, projectId, q, results);

      // Cache entities
      for (const t of tasks) {
        await queryCache.setCachedEntity('task', t.id, { id: t.id, code: `CP-${t.id.slice(0,4).toUpperCase()}`, title: t.title });
      }
      for (const m of members) {
        await queryCache.setCachedEntity('user', m.user.id, { id: m.user.id, name: m.user.name, email: m.user.email });
      }

      return NextResponse.json(results);
    }

    // 3. Search Suggestions (Global)
    if (suggestions) {
      const cachedSugg = await queryCache.getSearchSuggestions(userId, q);
      if (cachedSugg) {
        return NextResponse.json(cachedSugg);
      }

      const [tasks, projects] = await Promise.all([
        prisma.task.findMany({
          where: {
            projectId: { in: projectIds },
            deletedAt: null,
            OR: [
              { title: { contains: normalizedQuery, mode: 'insensitive' } },
              { id: { contains: normalizedQuery, mode: 'insensitive' } }
            ]
          },
          take: 5,
          select: { id: true, title: true }
        }),
        prisma.project.findMany({
          where: {
            id: { in: projectIds },
            OR: [
              { name: { contains: normalizedQuery, mode: 'insensitive' } },
              { identifier: { contains: normalizedQuery, mode: 'insensitive' } }
            ]
          },
          take: 5,
          select: { id: true, name: true, identifier: true }
        })
      ]);

      const list = [
        ...tasks.map(t => ({ id: t.id, text: `CP-${t.id.slice(0, 4).toUpperCase()} - ${t.title}`, type: 'task' })),
        ...projects.map(p => ({ id: p.id, text: `${p.identifier} - ${p.name}`, type: 'project' }))
      ];

      await queryCache.setSearchSuggestions(userId, q, list);
      return NextResponse.json(list);
    }

    // 4. Global Search
    const cachedGlobal = await queryCache.getGlobalSearch(userId, q);
    if (cachedGlobal) {
      return NextResponse.json(cachedGlobal);
    }

    // Get workspaces user has access to for scoping user searches
    const userWorkspaces = await prisma.workspaceMember.findMany({
      where: { userId },
      select: { workspaceId: true }
    });
    const workspaceIds = userWorkspaces.map(w => w.workspaceId);

    const [tasks, projects, departments, users] = await Promise.all([
      // Tasks
      prisma.task.findMany({
        where: {
          projectId: { in: projectIds },
          deletedAt: null,
          OR: [
            { title: { contains: normalizedQuery, mode: 'insensitive' } },
            { description: { contains: normalizedQuery, mode: 'insensitive' } },
            { id: { contains: normalizedQuery, mode: 'insensitive' } }
          ]
        },
        take: 50,
        include: { project: { select: { name: true } } }
      }),
      // Projects
      prisma.project.findMany({
        where: {
          id: { in: projectIds },
          OR: [
            { name: { contains: normalizedQuery, mode: 'insensitive' } },
            { description: { contains: normalizedQuery, mode: 'insensitive' } },
            { identifier: { contains: normalizedQuery, mode: 'insensitive' } }
          ]
        },
        take: 50
      }),
      // Departments
      prisma.department.findMany({
        where: {
          projectId: { in: projectIds },
          OR: [
            { name: { contains: normalizedQuery, mode: 'insensitive' } },
            { description: { contains: normalizedQuery, mode: 'insensitive' } }
          ]
        },
        take: 50
      }),
      // Users in workspaces
      prisma.user.findMany({
        where: {
          workspaceMemberships: { some: { workspaceId: { in: workspaceIds } } },
          OR: [
            { name: { contains: normalizedQuery, mode: 'insensitive' } },
            { email: { contains: normalizedQuery, mode: 'insensitive' } }
          ]
        },
        take: 50
      })
    ]);

    const globalResults = {
      tasks: tasks.map(t => ({
        id: t.id,
        code: `CP-${t.id.slice(0, 4).toUpperCase()}`,
        title: t.title,
        description: t.description,
        projectName: t.project.name
      })),
      projects: projects.map(p => ({
        id: p.id,
        identifier: p.identifier,
        name: p.name,
        description: p.description
      })),
      departments: departments.map(d => ({
        id: d.id,
        name: d.name,
        description: d.description
      })),
      users: users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email
      }))
    };

    await queryCache.setGlobalSearch(userId, q, globalResults);

    // Cache as frequently accessed entities
    for (const t of tasks) {
      await queryCache.setCachedEntity('task', t.id, { id: t.id, code: `CP-${t.id.slice(0,4).toUpperCase()}`, title: t.title });
    }
    for (const p of projects) {
      await queryCache.setCachedEntity('project', p.id, { id: p.id, identifier: p.identifier, name: p.name });
    }
    for (const u of users) {
      await queryCache.setCachedEntity('user', u.id, { id: u.id, name: u.name, email: u.email });
    }

    return NextResponse.json(globalResults);
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
