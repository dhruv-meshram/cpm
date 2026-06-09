import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateTagSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().optional().nullable()
});

export async function PUT(req: Request, { params }: { params: Promise<{ projectId: string, tagId: string }> }) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { projectId, tagId } = await params;

    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: session.userId as string } }
    });
    if (!membership || membership.role === 'VIEWER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateTagSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { name, color } = parsed.data;

    // Check if another tag with the same name exists
    const existing = await prisma.tag.findFirst({
      where: {
        projectId,
        name,
        id: { not: tagId }
      }
    });
    if (existing) {
      return NextResponse.json({ error: { name: ['Tag with this name already exists in project'] } }, { status: 400 });
    }

    const tag = await prisma.tag.update({
      where: { id: tagId, projectId },
      data: {
        name,
        ...(color !== undefined && { color })
      }
    });

    return NextResponse.json(tag);
  } catch (error) {
    console.error('Update tag error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ projectId: string, tagId: string }> }) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { projectId, tagId } = await params;

    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: session.userId as string } }
    });
    if (!membership || membership.role === 'VIEWER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Prisma onDelete: Cascade on the junction table TaskTag takes care of deleting associations!
    await prisma.tag.delete({
      where: { id: tagId, projectId }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Delete tag error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
