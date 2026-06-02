import { prismaClient } from './prismaClient';
import { randomUUID } from 'node:crypto';

export async function getProjectByIdentifier(workspaceId: string, identifier: string) {
  return prismaClient.project.findUnique({
    where: {
      workspaceId_identifier: {
        workspaceId,
        identifier,
      },
    },
    include: {
      tasks: true,
      dependencies: true,
      snapshots: true,
    },
  });
}

export async function getProject(projectId: string) {
  return prismaClient.project.findUnique({
    where: { id: projectId },
  });
}

export async function listProjectTasks(projectId: string) {
  return prismaClient.task.findMany({
    where: { projectId, deletedAt: null },
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
  });
}

export async function listProjectDependencies(projectId: string) {
  return prismaClient.dependency.findMany({
    where: { projectId },
    orderBy: { createdAt: 'asc' },
  });
}

export async function saveCpmSnapshot(projectId: string, version: string, projectDuration: number, criticalPath: string[], payload: unknown) {
  return prismaClient.cPMSnapshot.create({
    data: {
      projectId,
      version,
      projectDuration,
      criticalPath,
      payload: payload as never,
    },
  });
}

// --- Write helpers for integration tests ---
export async function createProject(data: {
  id?: string;
  workspaceId: string;
  name: string;
  identifier: string;
  description?: string;
  startDate?: Date;
}) {
  return prismaClient.project.create({ data });
}

export async function createTask(data: {
  id?: string;
  projectId: string;
  title: string;
  duration: string | number;
  estimatedDays?: string | number;
}) {
  const payload = { id: data.id ?? randomUUID(), projectId: data.projectId, title: data.title, duration: data.duration, estimatedDays: data.estimatedDays };
  return prismaClient.task.create({ data: payload as any });
}

export async function updateTask(taskId: string, updates: Partial<{ title: string; duration: string | number; estimatedDays: string | number }>) {
  return prismaClient.task.update({ where: { id: taskId }, data: updates as any });
}

export async function deleteTask(taskId: string) {
  return prismaClient.task.delete({ where: { id: taskId } });
}

export async function createDependency(data: {
  projectId: string;
  predecessorTaskId: string;
  successorTaskId: string;
  dependencyType?: 'FS' | 'SS' | 'FF' | 'SF';
  lag?: number;
}) {
  return prismaClient.dependency.create({
    data: {
      projectId: data.projectId,
      predecessorTaskId: data.predecessorTaskId,
      successorTaskId: data.successorTaskId,
      dependencyType: data.dependencyType ?? 'FS',
      lag: data.lag ?? 0,
    },
  });
}

export async function deleteDependency(dependencyId: string) {
  return prismaClient.dependency.delete({ where: { id: dependencyId } });
}
