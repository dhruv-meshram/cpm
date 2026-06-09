import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const workspace = await prisma.workspace.create({
    data: {
      name: 'Default Workspace',
      slug: 'default',
      description: 'Seed workspace for CPM database phase',
      projects: {
        create: {
          name: 'Seed CPM Project',
          identifier: 'CPM-SEED',
          description: 'Minimal DAG for database validation',
          startDate: new Date('2026-01-01T00:00:00Z'),
          tasks: {
            create: [
              { id: 'A', title: 'Task A', duration: 5, estimatedDays: 5, isDraft: false },
              { id: 'B', title: 'Task B', duration: 3, estimatedDays: 3, isDraft: false },
              { id: 'C', title: 'Task C', duration: 2, estimatedDays: 2, isDraft: false },
            ],
          },
        },
      },
    },
  });

  const project = await prisma.project.findFirstOrThrow({ where: { workspaceId: workspace.id } });

  await prisma.dependency.createMany({
    data: [
      { projectId: project.id, predecessorTaskId: 'A', successorTaskId: 'B', dependencyType: 'FS', lag: '0', lagUnit: 'days', strength: '1.0' },
      { projectId: project.id, predecessorTaskId: 'B', successorTaskId: 'C', dependencyType: 'FS', lag: '0', lagUnit: 'days', strength: '1.0' },
    ],
  });

  await prisma.cPMSnapshot.create({
    data: {
      projectId: project.id,
      version: '1.0.0',
      projectDuration: '10',
      criticalPath: ['A', 'B', 'C'],
      payload: {
        tasks: ['A', 'B', 'C'],
        dependencies: ['A->B', 'B->C'],
      },
    },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
