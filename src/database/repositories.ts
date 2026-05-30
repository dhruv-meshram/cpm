import { prismaClient } from './prismaClient';

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
