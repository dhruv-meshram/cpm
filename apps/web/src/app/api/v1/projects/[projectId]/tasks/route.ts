import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';
import { z } from 'zod';
import { randomUUID } from 'crypto';

const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  duration: z.number().int().min(0),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  state: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'CANCELED']).optional(),
  parentTaskId: z.string().optional(),
  isCritical: z.boolean().optional(),
  departmentIds: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
  assigneeIds: z.array(z.string()).optional()
});

export async function GET(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;

    // Validate access
    const isMember = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: session.userId as string } }
    });
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const tasks = await prisma.task.findMany({
      where: { projectId, deletedAt: null },
      include: {
        departments: true,
        taskTags: {
          include: {
            tag: true
          }
        },
        assignees: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Fetch tasks error:', error);
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

    const membership = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: session.userId as string } }
    });

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const roleUpper = membership.role.toUpperCase();
    if (roleUpper !== 'PROJECT ADMIN' && roleUpper !== 'PROJECT_ADMIN' && roleUpper !== 'ADMIN' && roleUpper !== 'MEMBER' && roleUpper !== 'CAPTAIN' && roleUpper !== 'PROJECT MANAGER' && roleUpper !== 'PROJECT_MANAGER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createTaskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { title, description, duration, state, startDate, endDate, parentTaskId, isCritical, departmentIds, tagIds, assigneeIds } = parsed.data;

    let connectDeps = departmentIds && departmentIds.length > 0
      ? departmentIds.map(id => ({ id }))
      : [];

    if (connectDeps.length === 0) {
      let generalDep = await prisma.department.findFirst({
        where: { projectId, name: 'General' }
      });
      if (!generalDep) {
        generalDep = await prisma.department.create({
          data: {
            projectId,
            name: 'General',
            color: '#7f8c8d',
            description: 'General project tasks'
          }
        });
      }
      connectDeps.push({ id: generalDep.id });
    }

    const task = await prisma.task.create({
      data: {
        id: randomUUID(),
        projectId,
        title,
        description,
        duration,
        estimatedDays: duration,
        state: state || 'TODO',
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        isDraft: false,
        parentTaskId: parentTaskId || null,
        departments: {
          connect: connectDeps
        },
        ...(tagIds && tagIds.length > 0 && {
          taskTags: {
            create: tagIds.map(tagId => ({ tagId }))
          }
        }),
        ...(assigneeIds && assigneeIds.length > 0 && {
          assignees: {
            create: assigneeIds.map(userId => ({ userId }))
          }
        })
      },
      include: {
        departments: true,
        taskTags: {
          include: {
            tag: true
          }
        },
        assignees: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (isCritical) {
      await prisma.taskCustomValue.create({
        data: {
          taskId: task.id,
          key: 'Critical',
          value: true as any
        }
      });
    }

    if (assigneeIds && assigneeIds.length > 0) {
      const projectInfo = await prisma.project.findUnique({
        where: { id: projectId },
        select: { name: true }
      });
      const projectName = projectInfo?.name || 'a project';
      
      for (const userId of assigneeIds) {
        await prisma.notification.create({
          data: {
            userId,
            projectId,
            taskId: task.id,
            type: 'TASK_ASSIGNED',
            title: 'Task Assigned',
            content: `You have been assigned to the task "${title}" in project "${projectName}".`
          }
        });
      }
    }

    await logActivity({
      entityType: 'Task',
      entityId: task.id,
      action: `Task Created: ${title}`,
      userId: session.userId as string
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('Create task error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
