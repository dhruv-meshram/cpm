import { prisma } from '@/lib/prisma';
import { emitToProjectRoom } from './ws-emitter';

interface LogActivityParams {
  entityType: string;
  entityId: string;
  action: string;
  userId?: string;
  oldValue?: any;
  newValue?: any;
}

export async function logActivity({
  entityType,
  entityId,
  action,
  userId,
  oldValue,
  newValue
}: LogActivityParams) {
  try {
    await prisma.activityLog.create({
      data: {
        entityType,
        entityId,
        action,
        userId,
        oldValue: oldValue ? JSON.stringify(oldValue) : undefined,
        newValue: newValue ? JSON.stringify(newValue) : undefined,
      }
    });

    if (entityType === 'Project') {
      await emitToProjectRoom(entityId, 'activity_logged', {
        action,
        userId,
        timestamp: new Date().toISOString()
      });
    } else if (entityType === 'Task') {
      // Find which project this task belongs to, to emit the event
      const task = await prisma.task.findUnique({ where: { id: entityId }, select: { projectId: true } });
      if (task) {
        await emitToProjectRoom(task.projectId, 'activity_logged', {
          action,
          target: entityId,
          timestamp: new Date().toISOString()
        });
      }
    }
  } catch (error) {
    // We swallow errors here because activity logging shouldn't crash the main operation
    console.error('Failed to log activity:', error);
  }
}
