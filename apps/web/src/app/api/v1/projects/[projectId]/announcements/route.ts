import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';
import { hasPermission } from '@/lib/permissions';

export async function GET(
  req: Request,
  props: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await props.params;
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: session.userId as string } }
    });
    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const announcements = await prisma.announcement.findMany({
      where: { projectId },
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' }
      ],
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json(announcements);
  } catch (error) {
    console.error('Fetch announcements error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  props: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await props.params;
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!await hasPermission(session.userId as string, projectId, 'post_announcement')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { title, content, priority, isPinned } = body;

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    const announcement = await prisma.announcement.create({
      data: {
        projectId,
        creatorId: session.userId as string,
        title,
        content,
        priority: priority || 'Normal',
        isPinned: isPinned || false
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Create notifications for all project members except the creator
    const members = await prisma.projectMember.findMany({
      where: {
        projectId,
        NOT: { userId: session.userId as string }
      },
      select: { userId: true }
    });

    for (const member of members) {
      await prisma.notification.create({
        data: {
          userId: member.userId,
          projectId,
          title: `New Project Announcement: ${title}`,
          content: `${announcement.creator.name} posted: "${title}"`,
          type: 'ANNOUNCEMENT'
        }
      });
    }

    await logActivity({
      entityType: 'Project',
      entityId: projectId,
      action: `Created announcement "${title}"`,
      userId: session.userId as string,
      projectId
    });

    return NextResponse.json(announcement, { status: 201 });
  } catch (error) {
    console.error('Create announcement error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
