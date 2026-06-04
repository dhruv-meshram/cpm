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
    // JavaScript fallback CPM Engine for Graph/Gantt Highlighting
    // =========================================================
    
    // Build Nodes
    const nodes = new Map<string, any>();
    tasks.forEach(t => {
      nodes.set(t.id, {
        id: t.id,
        duration: Number(t.duration),
        predecessors: [],
        successors: [],
        es: 0,
        ef: Number(t.duration),
        ls: 0,
        lf: 0,
        slack: 0,
        isCritical: false,
        indegree: 0
      });
    });

    dependencies.forEach(d => {
      if (nodes.has(d.predecessorTaskId) && nodes.has(d.successorTaskId)) {
        nodes.get(d.predecessorTaskId).successors.push(d.successorTaskId);
        nodes.get(d.successorTaskId).predecessors.push(d.predecessorTaskId);
        nodes.get(d.successorTaskId).indegree++;
      }
    });

    // Forward Pass
    const queue: string[] = [];
    nodes.forEach((node, id) => {
      if (node.indegree === 0) queue.push(id);
    });

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const current = nodes.get(currentId);
      current.successors.forEach((succId: string) => {
        const succ = nodes.get(succId);
        if (current.ef > succ.es) {
          succ.es = current.ef;
          succ.ef = succ.es + succ.duration;
        }
        succ.indegree--;
        if (succ.indegree === 0) queue.push(succId);
      });
    }

    // Project duration
    let projectDuration = 0;
    nodes.forEach(n => {
      if (n.ef > projectDuration) projectDuration = n.ef;
    });

    // Backward Pass
    nodes.forEach(n => {
      n.lf = projectDuration;
      n.ls = projectDuration - n.duration;
      // Reset outdegree for reverse traversal
      n.outdegree = n.successors.length;
    });

    const reverseQueue: string[] = [];
    nodes.forEach((node, id) => {
      if (node.outdegree === 0) reverseQueue.push(id);
    });

    while (reverseQueue.length > 0) {
      const currentId = reverseQueue.shift()!;
      const current = nodes.get(currentId);
      current.predecessors.forEach((predId: string) => {
        const pred = nodes.get(predId);
        if (current.ls < pred.lf) {
          pred.lf = current.ls;
          pred.ls = pred.lf - pred.duration;
        }
        pred.outdegree--;
        if (pred.outdegree === 0) reverseQueue.push(predId);
      });
    }

    // Calculate slack and critical path
    const criticalPath: string[] = [];
    const taskDetails: Record<string, any> = {};

    nodes.forEach((n, id) => {
      n.slack = n.lf - n.ef;
      n.isCritical = n.slack === 0;
      if (n.isCritical) criticalPath.push(id);
      
      taskDetails[id] = {
        es: n.es,
        ef: n.ef,
        ls: n.ls,
        lf: n.lf,
        slack: n.slack,
        isCritical: n.isCritical
      };
    });

    // Persist result
    try {
      await prisma.cPMSnapshot.create({
        data: {
          id: runId,
          projectId,
          version: '1.0.0',
          projectDuration,
          criticalPath,
          payload: {
            status: 'success',
            message: 'JS fallback calculation completed',
            taskDetails
          }
        }
      });

      await logActivity({
        entityType: 'Project',
        entityId: projectId,
        action: `CPM Engine generated new schedule (Duration: ${projectDuration} days)`,
        userId: session.userId as string
      });
      
      await emitToProjectRoom(projectId, 'cpm_run_completed', {
        status: 'success',
        runId
      });
    } catch (err) {
      console.error('Error saving CPM snapshot:', err);
    }

    return NextResponse.json({ runId, status: 'processing' }, { status: 202 });
  } catch (error) {
    console.error('CPM run error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
