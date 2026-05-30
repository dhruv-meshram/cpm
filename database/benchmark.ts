type GraphReadSource = {
  listProjectTasks: (projectId: string) => Promise<Array<unknown>>;
  listProjectDependencies: (projectId: string) => Promise<Array<unknown>>;
};

async function createDefaultGraphReadSource(): Promise<GraphReadSource> {
  const database = await import('../src/database');
  return {
    listProjectTasks: database.listProjectTasks,
    listProjectDependencies: database.listProjectDependencies,
  };
}

export async function measureProjectGraphRead(projectId: string, source?: GraphReadSource) {
  const activeSource = source ?? (await createDefaultGraphReadSource());
  const startedAt = performance.now();
  const tasks = await activeSource.listProjectTasks(projectId);
  const dependencies = await activeSource.listProjectDependencies(projectId);
  const finishedAt = performance.now();

  return {
    taskCount: tasks.length,
    dependencyCount: dependencies.length,
    durationMs: finishedAt - startedAt,
  };
}
