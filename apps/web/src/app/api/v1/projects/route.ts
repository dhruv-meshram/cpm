import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';
import { z } from 'zod';

const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  startDate: z.string().datetime().optional()
});

export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const whereClause: any = {
      members: {
        some: { userId: session.userId as string }
      }
    };

    if (search) {
      whereClause.name = { contains: search, mode: 'insensitive' };
    }

    const [projectsData, total] = await Promise.all([
      prisma.project.findMany({
        where: whereClause,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          identifier: true,
          description: true,
          status: true,
          health: true,
          updatedAt: true,
          createdAt: true,
          ownerId: true,
          _count: {
            select: {
              tasks: true,
              dependencies: true
            }
          },
          tasks: {
            select: { state: true }
          },
          snapshots: {
            orderBy: { calculationTime: 'desc' },
            take: 1
          },
          owner: {
            select: { name: true }
          }
        }
      }),
      prisma.project.count({ where: whereClause })
    ]);

    let globalTasks = 0;
    let globalCriticalTasks = 0;
    let activeProjects = 0;
    let totalCompletion = 0;

    const enrichedProjects = projectsData.map(p => {
      const completedTasks = p.tasks.filter(t => t.state === 'DONE').length;
      const progressPercent = p._count.tasks > 0 ? Math.round((completedTasks / p._count.tasks) * 100) : 0;
      
      const latestSnapshot = p.snapshots[0];
      const projectDuration = latestSnapshot ? (latestSnapshot.projectDuration as any).toNumber?.() || Number(latestSnapshot.projectDuration) || 0 : 0;
      const criticalPath = latestSnapshot ? (latestSnapshot.criticalPath as any[]) || [] : [];
      const criticalTasksCount = criticalPath.length;

      globalTasks += p._count.tasks;
      globalCriticalTasks += criticalTasksCount;
      if (p.status === 'ACTIVE') activeProjects++;
      totalCompletion += progressPercent;

      return {
        id: p.id,
        identifier: p.identifier,
        name: p.name,
        description: p.description,
        status: p.status,
        health: p.health,
        tasksCount: p._count.tasks,
        dependenciesCount: p._count.dependencies,
        criticalTasksCount,
        completionPercent: progressPercent,
        durationDays: projectDuration,
        criticalPathLength: criticalTasksCount,
        criticalPathDuration: projectDuration,
        owner: p.owner?.name || 'Unassigned',
        createdAt: p.createdAt,
        updatedAt: p.updatedAt
      };
    });

    const portfolioStats = {
      totalProjects: total,
      activeProjects,
      globalTasks,
      globalCriticalTasks,
      portfolioCompletionPercent: total > 0 ? Math.round(totalCompletion / total) : 0
    };

    return NextResponse.json({ data: enrichedProjects, total, portfolioStats });
  } catch (error) {
    console.error('Fetch projects error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createProjectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { name, description, startDate } = parsed.data;
    const userId = session.userId as string;

    // Ensure user has a workspace
    let userWorkspace = await prisma.workspaceMember.findFirst({
      where: { userId, role: 'OWNER' },
      include: { workspace: true }
    });

    if (!userWorkspace) {
      const newWorkspace = await prisma.workspace.create({
        data: {
          name: 'Personal Workspace',
          slug: `personal-${userId}`,
          members: {
            create: { userId, role: 'OWNER' }
          }
        }
      });
      userWorkspace = { workspaceId: newWorkspace.id, userId, role: 'OWNER', createdAt: new Date(), workspace: newWorkspace };
    }

    // Generate a unique identifier (like PRJ-123)
    const count = await prisma.project.count({ where: { workspaceId: userWorkspace.workspace.id } });
    const identifier = `PRJ-${count + 1}`;

    const project = await prisma.project.create({
      data: {
        name,
        description,
        startDate: startDate ? new Date(startDate) : undefined,
        identifier,
        workspaceId: userWorkspace.workspace.id,
        members: {
          create: { userId, role: 'OWNER' }
        }
      }
    });

    await logActivity({
      entityType: 'Project',
      entityId: project.id,
      action: 'Project Created',
      userId
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Create project error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
