type GraphShapeSource = {
  listProjectTasks: (projectId: string) => Promise<Array<{ id: string }>>;
  listProjectDependencies: (
    projectId: string,
  ) => Promise<Array<{ predecessorTaskId: string; successorTaskId: string }>>;
};

async function createDefaultGraphShapeSource(): Promise<GraphShapeSource> {
  const database = await import('../src/database');
  return {
    listProjectTasks: database.listProjectTasks,
    listProjectDependencies: database.listProjectDependencies,
  };
}

export async function validateProjectGraphShape(projectId: string, source?: GraphShapeSource) {
  const activeSource = source ?? (await createDefaultGraphShapeSource());
  const tasks = await activeSource.listProjectTasks(projectId);
  const dependencies = await activeSource.listProjectDependencies(projectId);

  const taskIds = new Set(tasks.map((task) => task.id));
  const invalidDependencies = dependencies.filter(
    (dependency) => !taskIds.has(dependency.predecessorTaskId) || !taskIds.has(dependency.successorTaskId),
  );

  return {
    taskCount: tasks.length,
    dependencyCount: dependencies.length,
    invalidDependencyCount: invalidDependencies.length,
    isValid: tasks.length > 0 && invalidDependencies.length === 0,
  };
}
