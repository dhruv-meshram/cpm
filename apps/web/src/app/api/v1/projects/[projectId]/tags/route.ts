import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { hasPermission } from '@/lib/permissions';

const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().optional().nullable()
});

export async function GET(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { projectId } = await params;

    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: session.userId as string } }
    });
    if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const tags = await prisma.tag.findMany({
      where: { projectId },
      include: {
        _count: {
          select: { tasks: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    const transformed = tags.map((t: any) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      createdAt: t.createdAt,
      taskCount: t._count.tasks
    }));

    return NextResponse.json(transformed);
  } catch (error) {
    console.error('Fetch tags error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { projectId } = await params;

    if (!await hasPermission(session.userId as string, projectId, 'manage_tags')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createTagSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { name, color } = parsed.data;

    // Check unique name per project
    const existing = await prisma.tag.findFirst({
      where: { projectId, name }
    });
    if (existing) {
      return NextResponse.json({ error: { name: ['Tag with this name already exists in project'] } }, { status: 400 });
    }

    const tag = await prisma.tag.create({
      data: {
        projectId,
        name,
        color: color || '#7f8c8d'
      }
    });

    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    console.error('Create tag error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
