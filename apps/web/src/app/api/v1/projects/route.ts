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

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where: whereClause,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          updatedAt: true
        }
      }),
      prisma.project.count({ where: whereClause })
    ]);

    return NextResponse.json({ data: projects, total });
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
