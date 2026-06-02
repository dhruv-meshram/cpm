import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';
import { randomUUID } from 'crypto';
import { emitToProjectRoom } from '@/lib/ws-emitter';

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
    if (!membership || membership.role === 'VIEWER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 1. Fetch all tasks and dependencies for the project
    const tasks = await prisma.task.findMany({ where: { projectId, deletedAt: null } });
    const dependencies = await prisma.dependency.findMany({ where: { projectId } });

    if (tasks.length === 0) {
      return NextResponse.json({ error: 'Cannot run CPM: Project has no tasks' }, { status: 400 });
    }

    const runId = randomUUID();

    // =========================================================
    // TODO: Bridge to C++ Math Engine
    // =========================================================
    // In production, this data would be passed to the C++ binary via
    // child_process, WebAssembly, or a dedicated computation microservice.
    // 
    // const enginePayload = { tasks, dependencies };
    // const cpmResult = await computeCpmEngine(enginePayload);
    //
    // For now, we simulate an asynchronous handoff to the engine.
    
    // Simulating result persistence
    setTimeout(async () => {
      try {
        // Mock result payload based on plan.md specifications
        const result = { projectDuration: 10.0, criticalPath: ['mock_task_1', 'mock_task_2'] };

        await prisma.cPMSnapshot.create({
          data: {
            id: runId,
            projectId,
            version: '1.0.0',
            projectDuration: result.projectDuration,
            criticalPath: result.criticalPath,
            payload: {
              status: 'success',
              message: 'Mock calculation completed'
            }
          }
        });

        await logActivity({
          entityType: 'Project',
          entityId: projectId,
          action: `CPM Engine generated new schedule (Duration: ${result.projectDuration} days)`,
          userId: session.userId as string
        });
        
        await emitToProjectRoom(projectId, 'cpm_run_completed', {
          status: 'success',
          runId
        });
      } catch (err) {
        console.error('Error saving CPM snapshot:', err);
      }
    }, 2000);

    return NextResponse.json({ runId, status: 'processing' }, { status: 202 });
  } catch (error) {
    console.error('CPM run error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
