import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { apiCache } from '@/lib/cache';
import { projectOverviewCache } from '@/lib/project-overview-cache';
import { queryCache } from '@/lib/query-cache';

export async function GET(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;

    // Validate user has access
    const isMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId: session.userId as string }
      }
    });

    if (!isMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const cacheKey = `project:${projectId}:metadata`;
    const projectData = await apiCache.get(cacheKey, 600, async () => {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          _count: {
            select: { tasks: true }
          },
          tasks: {
            select: { state: true }
          },
          snapshots: {
            orderBy: { calculationTime: 'desc' },
            take: 1
          }
        }
      });

      if (!project) return null;

      const completedTasks = project.tasks.filter(t => t.state === 'DONE').length;
      const lastCpmRun = project.snapshots[0]?.calculationTime || null;

      return {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        targetDate: project.targetDate,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        totalTasks: project._count.tasks,
        completedTasks,
        lastUpdated: project.updatedAt,
        lastCpmRun
      };
    });

    if (!projectData) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json(projectData);
  } catch (error) {
    console.error('Fetch project details error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;

    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: session.userId as string } }
    });

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const roleUpper = membership.role.toUpperCase();
    if (roleUpper !== 'PROJECT ADMIN' && roleUpper !== 'PROJECT_ADMIN' && roleUpper !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, status, targetDate } = body;

    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(status && { status }),
        ...(targetDate && { targetDate: new Date(targetDate) })
      }
    });

    // Invalidate project metadata cache
    apiCache.invalidate(`project:${projectId}:metadata`);
    apiCache.invalidateProject(projectId);
    await projectOverviewCache.invalidateSummary(projectId);
    await projectOverviewCache.invalidateHealth(projectId);

    // Invalidate database query caches
    await queryCache.invalidateDashboardStats();
    await queryCache.invalidateSearchCache();
    await queryCache.invalidateEntityCache('project', projectId);

    return NextResponse.json(project);
  } catch (error) {
    console.error('Update project error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;

    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: session.userId as string } }
    });

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const roleUpper = membership.role.toUpperCase();
    if (roleUpper !== 'PROJECT ADMIN' && roleUpper !== 'PROJECT_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.project.delete({
      where: { id: projectId }
    });

    apiCache.invalidateProject(projectId);
    apiCache.invalidateTask(projectId);
    apiCache.invalidateDepartment(projectId);
    apiCache.invalidateTeam(projectId);

    // Invalidate database query caches
    await queryCache.invalidateDashboardStats();
    await queryCache.invalidateSearchCache();
    await queryCache.invalidateEntityCache('project', projectId);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Delete project error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
