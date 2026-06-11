import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/permissions';
import { logActivity } from '@/lib/activity';
import { hash } from 'argon2';
import { emitToProjectRoom } from '@/lib/ws-emitter';
import { apiCache } from '@/lib/cache';
import { createNotification } from '@/lib/notification-cache';
import { permissionCache } from '@/lib/permission-cache';
import { projectOverviewCache } from '@/lib/project-overview-cache';
import { queryCache } from '@/lib/query-cache';

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

    if (!await hasPermission(session.userId as string, projectId, 'view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const cacheKey = `project:${projectId}:members`;
    const members = await apiCache.get(cacheKey, 300, async () => {
      return prisma.projectMember.findMany({
        where: { projectId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          },
          department: {
            select: {
              id: true,
              name: true,
              color: true,
            }
          },
          customRole: true
        },
        orderBy: { createdAt: 'asc' }
      });
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error('Fetch members error:', error);
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

    if (!await hasPermission(session.userId as string, projectId, 'manage_members')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { emails, role, customRoleId, departmentId } = await req.json();

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: 'Invalid or empty email list' }, { status: 400 });
    }

    const projectInfo = await prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true }
    });
    const projectName = projectInfo?.name || 'a project';

    const added: string[] = [];
    const skipped: string[] = [];

    for (const email of emails) {
      const trimmedEmail = email.trim().toLowerCase();
      if (!trimmedEmail) continue;

      let user = await prisma.user.findUnique({
        where: { email: trimmedEmail }
      });

      // If user does not exist, create a skeleton account
      if (!user) {
        const passwordHash = await hash('TempPassword123!');
        const name = trimmedEmail.split('@')[0];
        user = await prisma.user.create({
          data: {
            email: trimmedEmail,
            name,
            passwordHash
          }
        });
      }

      // Check if already a member
      const existingMember = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId: user.id
          }
        }
      });

      if (existingMember) {
        skipped.push(trimmedEmail);
        continue;
      }

      await prisma.projectMember.create({
        data: {
          projectId,
          userId: user.id,
          role,
          customRoleId: customRoleId || null,
          departmentId: departmentId || undefined
        }
      });
      await permissionCache.invalidateUser(user.id);

      await createNotification({
        userId: user.id,
        projectId,
        type: 'PROJECT_INVITATION',
        title: 'Project Invitation',
        content: `You have been added to the project "${projectName}" as a ${role}.`
      });

      apiCache.invalidateNotifications(user.id);

      added.push(trimmedEmail);

      await logActivity({
        entityType: 'Project',
        entityId: projectId,
        action: `Added member ${trimmedEmail} with role ${role}`,
        userId: session.userId as string,
        projectId
      });
    }

    apiCache.invalidate(`project:${projectId}:members`);
    apiCache.invalidateTeam(projectId);
    await projectOverviewCache.invalidateTeamStats(projectId);
    await projectOverviewCache.invalidateSummary(projectId);

    // Invalidate database query caches
    await queryCache.invalidateTeamWorkload();
    await queryCache.invalidateSearchCache();

    return NextResponse.json({ added, skipped });
  } catch (error) {
    console.error('Add members error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  props: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await props.params;
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!await hasPermission(session.userId as string, projectId, 'manage_members')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { userId, role, customRoleId, departmentId } = await req.json();

    if (!userId || !role) {
      return NextResponse.json({ error: 'UserId and Role are required' }, { status: 400 });
    }

    const currentMember = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } }
    });

    if (!currentMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Do not allow changing the Project Admin/Admin role if it would leave the project without any Project Admin/Admin
    // (A simple check to protect owner changes)
    if (currentMember.role === 'Project Admin' && role !== 'Project Admin' && role !== 'Admin') {
      const owners = await prisma.projectMember.count({
        where: { projectId, role: 'Project Admin' }
      });
      if (owners <= 1) {
        return NextResponse.json({ error: 'Cannot modify role of the only project admin' }, { status: 400 });
      }
    }

    const updated = await prisma.projectMember.update({
      where: {
        projectId_userId: {
          projectId,
          userId
        }
      },
      data: {
        role,
        customRoleId: customRoleId !== undefined ? customRoleId : null,
        departmentId: departmentId || null
      },
      include: {
        user: { select: { email: true } }
      }
    });
    await permissionCache.invalidateUser(userId);

    const projectInfo = await prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true }
    });
    const projectName = projectInfo?.name || 'a project';

    if (currentMember.role !== role) {
      await createNotification({
        userId,
        projectId,
        type: 'ROLE_MODIFICATION',
        title: 'Role Updated',
        content: `Your role in the project "${projectName}" has been changed from "${currentMember.role}" to "${role}".`
      });
      apiCache.invalidateNotifications(userId);
    }

    await logActivity({
      entityType: 'Project',
      entityId: projectId,
      action: `Updated ${updated.user.email} role to ${role}`,
      userId: session.userId as string,
      projectId
    });

    apiCache.invalidate(`project:${projectId}:members`);
    apiCache.invalidateTeam(projectId);
    await projectOverviewCache.invalidateTeamStats(projectId);
    await projectOverviewCache.invalidateSummary(projectId);

    // Invalidate database query caches
    await queryCache.invalidateTeamWorkload(userId);
    await queryCache.invalidateSearchCache();
    await queryCache.invalidateEntityCache('user', userId);

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update member error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  props: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await props.params;
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!await hasPermission(session.userId as string, projectId, 'manage_members')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'UserId is required' }, { status: 400 });
    }

    if (userId === session.userId) {
      return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 });
    }

    const currentMember = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
      include: { user: { select: { email: true } } }
    });

    if (!currentMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Unassign tasks from user
    await prisma.taskAssignee.deleteMany({
      where: {
        userId,
        task: { projectId }
      }
    });

    // Remove membership
    await prisma.projectMember.delete({
      where: {
        projectId_userId: {
          projectId,
          userId
        }
      }
    });
    await permissionCache.invalidateUser(userId);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true }
    });
    const projectName = project?.name || 'Project Space';

    await emitToProjectRoom(projectId, 'user_removed', {
      userId,
      projectId,
      projectName
    });

    await logActivity({
      entityType: 'Project',
      entityId: projectId,
      action: `Removed member ${currentMember.user.email}`,
      userId: session.userId as string,
      projectId
    });

    apiCache.invalidate(`project:${projectId}:members`);
    apiCache.invalidateTeam(projectId);
    await projectOverviewCache.invalidateTeamStats(projectId);
    await projectOverviewCache.invalidateSummary(projectId);

    // Invalidate database query caches
    await queryCache.invalidateTeamWorkload(userId);
    await queryCache.invalidateSearchCache();
    await queryCache.invalidateEntityCache('user', userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Remove member error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
