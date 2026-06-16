import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';
import { apiCache } from '@/lib/cache';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { hasPermission } from '@/lib/permissions';
import { queryCache } from '@/lib/query-cache';
import { projectOverviewCache } from '@/lib/project-overview-cache';

const bulkImportSchema = z.object({
  tasks: z.array(z.object({
    id: z.string(),
    name: z.string(),
    durationHours: z.number(),
    start: z.string().optional(),
    finish: z.string().optional(),
    parentId: z.string().nullable().optional(),
    isCritical: z.boolean().optional(),
    isMilestone: z.boolean().optional()
  })),
  dependencies: z.array(z.object({
    from: z.string(),
    to: z.string(),
    type: z.number() // 1: FS, 2: FF, 3: SS, 4: SF
  }))
});

export async function POST(req: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId } = await params;

    if (!await hasPermission(session.userId as string, projectId, 'create_task')) {
      return NextResponse.json({ error: 'You do not have permission to add tasks to this project.' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = bulkImportSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { tasks, dependencies } = parsed.data;

    // Run everything in a single transaction
    const result = await prisma.$transaction(async (tx) => {
      // Find or create 'General' department
      let generalDep = await tx.department.findFirst({
        where: { projectId, name: 'General' }
      });
      if (!generalDep) {
        generalDep = await tx.department.create({
          data: {
            projectId,
            name: 'General',
            color: '#7f8c8d',
            description: 'General project tasks'
          }
        });
      }

      // Sort tasks topologically based on parentId to guarantee parents are created before children
      const resolved = new Set<string>();
      const pending = [...tasks];
      const orderedTasks: typeof tasks = [];

      let progress = true;
      while (pending.length > 0 && progress) {
        progress = false;
        for (let i = 0; i < pending.length; i++) {
          const t = pending[i];
          if (!t.parentId || resolved.has(t.parentId) || !tasks.some(pt => pt.id === t.parentId)) {
            orderedTasks.push(t);
            resolved.add(t.id);
            pending.splice(i, 1);
            i--;
            progress = true;
          }
        }
      }
      // If there's a cycle or unresolved parents, just push the rest to avoid losing data
      if (pending.length > 0) {
        orderedTasks.push(...pending);
      }

      const idMapping = new Map<string, string>(); // client task.id -> db task.id
      const createdTasks = [];

      // Create tasks sequentially to map parent/child IDs correctly
      for (const t of orderedTasks) {
        const mappedParentId = t.parentId ? idMapping.get(t.parentId) : undefined;
        const dbTaskId = randomUUID();

        // Calculate duration and dates
        const duration = t.isMilestone ? 0 : Math.max(1, Math.round(t.durationHours / 24));
        const formatIso = (d: string | undefined) => {
          if (!d) return undefined;
          return d.endsWith('Z') || d.includes('+') || d.includes('-') && d.split('T')[1]?.includes('-') ? d : `${d}Z`;
        };

        const startDate = t.start ? formatIso(t.start) : undefined;
        const endDate = t.finish ? formatIso(t.finish) : undefined;

        const newTask = await tx.task.create({
          data: {
            id: dbTaskId,
            projectId,
            title: t.name,
            duration,
            estimatedDays: duration,
            state: 'TODO',
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            isDraft: false,
            parentTaskId: mappedParentId || null,
            departments: {
              connect: [{ id: generalDep.id }]
            }
          }
        });

        idMapping.set(t.id, newTask.id);
        createdTasks.push(newTask);

        if (t.isCritical) {
          await tx.taskCustomValue.create({
            data: {
              taskId: newTask.id,
              key: 'Critical',
              value: true as any
            }
          });
        }
      }

      // Create dependencies
      const depTypeMap: Record<number, string> = { 1: 'FS', 2: 'FF', 3: 'SS', 4: 'SF' };
      const createdDeps = [];

      for (const d of dependencies) {
        const newPredId = idMapping.get(d.from);
        const newSuccId = idMapping.get(d.to);

        if (newPredId && newSuccId) {
          const dep = await tx.dependency.create({
            data: {
              projectId,
              predecessorTaskId: newPredId,
              successorTaskId: newSuccId,
              dependencyType: (depTypeMap[d.type] || 'FS') as any,
              lag: 0
            }
          });
          createdDeps.push(dep);
        }
      }

      return { tasks: createdTasks, dependencies: createdDeps };
    });

    // Log a single bulk activity log
    await logActivity({
      entityType: 'Project',
      entityId: projectId,
      action: `Imported ${result.tasks.length} tasks and ${result.dependencies.length} dependencies via bulk XML upload`,
      userId: session.userId as string
    });

    // Invalidate caches
    apiCache.invalidateTask(projectId);
    await projectOverviewCache.invalidateTaskData(projectId);
    await projectOverviewCache.invalidateTeamStats(projectId);
    await projectOverviewCache.invalidateStats(projectId);
    await projectOverviewCache.invalidateHealth(projectId);

    await queryCache.invalidateTaskStats();
    await queryCache.invalidateTeamWorkload();
    await queryCache.invalidateSearchCache();

    return NextResponse.json({ success: true, tasksCount: result.tasks.length, dependenciesCount: result.dependencies.length }, { status: 201 });
  } catch (error) {
    console.error('Bulk import tasks error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
