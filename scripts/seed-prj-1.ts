import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function run() {
  console.log('Starting PRJ-1 Seed Process...');

  // Find project PRJ-1
  const project = await prisma.project.findFirst({
    where: { identifier: 'PRJ-1' }
  });

  if (!project) {
    console.error("Could not find project with identifier PRJ-1.");
    process.exit(1);
  }

  const projectId = project.id;
  console.log(`Found Project: ${project.name} (${project.id})`);

  // Clear existing tasks (dependencies will cascade)
  await prisma.task.deleteMany({
    where: { projectId }
  });
  console.log('Cleared existing tasks for PRJ-1.');

  const tasks: any[] = [];
  const dependencies: any[] = [];

  function createTask(title: string, duration: number, state = 'TODO') {
    const task = {
      id: randomUUID(),
      projectId,
      title,
      description: `Description for ${title}`,
      duration,
      estimatedDays: duration,
      state,
      isDraft: false
    };
    tasks.push(task);
    return task;
  }

  const existingEdges = new Set<string>();

  function createDependency(pred: any, succ: any, type = 'FS', lag = 0) {
    if (!pred || !succ) return;
    const edgeKey = `${pred.id}-${succ.id}-${type}`;
    if (existingEdges.has(edgeKey)) return;
    existingEdges.add(edgeKey);

    dependencies.push({
      id: randomUUID(),
      projectId,
      predecessorTaskId: pred.id,
      successorTaskId: succ.id,
      dependencyType: type,
      lag
    });
  }

  // ==========================================
  // 1. Dominant Critical Path (25 tasks long)
  // ==========================================
  let cpTasks: any[] = [];
  for (let i = 1; i <= 25; i++) {
    // 3 days per task = 75 days total duration
    cpTasks.push(createTask(`CP Phase ${i}: Core Implementation`, 3));
  }
  for (let i = 0; i < 24; i++) {
    createDependency(cpTasks[i], cpTasks[i+1]);
  }

  // ==========================================
  // 2. Near-Critical Path (1 day shorter)
  // ==========================================
  // Parallels the critical path. Duration = 74 days
  let ncpTasks: any[] = [];
  for (let i = 1; i <= 20; i++) {
    // Some variation to sum up to approx 74
    const dur = i % 2 === 0 ? 4 : 3;
    ncpTasks.push(createTask(`NCP Phase ${i}: Alternative Stream`, dur));
  }
  for (let i = 0; i < 19; i++) {
    createDependency(ncpTasks[i], ncpTasks[i+1]);
  }
  // Connect both to the same start and end
  const startNode = createTask('Project Kickoff', 0);
  const endNode = createTask('Project Delivery', 0);

  createDependency(startNode, cpTasks[0]);
  createDependency(cpTasks[cpTasks.length - 1], endNode);

  createDependency(startNode, ncpTasks[0]);
  createDependency(ncpTasks[ncpTasks.length - 1], endNode);

  // ==========================================
  // 3. Wide Dependency Tree (1 parent -> 15 children)
  // ==========================================
  const wideParent = createTask('Architecture Finalized', 1);
  createDependency(cpTasks[2], wideParent); // Branches off early

  for (let i = 1; i <= 15; i++) {
    const child = createTask(`Sub-module ${i} Setup`, 2);
    createDependency(wideParent, child);
    // Merge back into CP to prevent dangling
    createDependency(child, cpTasks[10]); 
  }

  // ==========================================
  // 4. Deep Dependency Tree (12 levels deep)
  // ==========================================
  let deepCurrent = createTask('Deep Dive Level 1', 1);
  createDependency(cpTasks[5], deepCurrent);
  
  for (let i = 2; i <= 12; i++) {
    const deepNext = createTask(`Deep Dive Level ${i}`, 2);
    createDependency(deepCurrent, deepNext);
    deepCurrent = deepNext;
  }
  createDependency(deepCurrent, endNode);

  // ==========================================
  // 5. Complex Merge Nodes and Parallel Work
  // ==========================================
  const backendNode = createTask('Backend Foundation', 5);
  const frontendNode = createTask('Frontend Foundation', 5);
  const authNode = createTask('Auth Module', 3);
  
  createDependency(cpTasks[3], backendNode);
  createDependency(cpTasks[3], frontendNode);
  createDependency(cpTasks[3], authNode);

  const apiGateway = createTask('API Gateway Integration', 2);
  // Multiple predecessors
  createDependency(backendNode, apiGateway);
  createDependency(authNode, apiGateway);

  const uiIntegration = createTask('UI Integration', 4);
  // Multiple predecessors
  createDependency(frontendNode, uiIntegration);
  createDependency(apiGateway, uiIntegration);

  createDependency(uiIntegration, cpTasks[15]);

  // ==========================================
  // 6. Realistic Tasks Additions
  // ==========================================
  const realisticNames = [
    'Requirements Analysis', 'System Architecture', 'Frontend Design',
    'Database Schema', 'Authentication Module', 'Task Scheduler',
    'Dependency Engine', 'CPM Engine', 'Critical Path Visualizer',
    'Graph Renderer', 'Gantt Renderer', 'Performance Testing',
    'User Acceptance Testing', 'Deployment'
  ];

  let prevReal: any = null;
  realisticNames.forEach((name, idx) => {
    const t = createTask(name, (idx % 3) + 2);
    if (idx === 0) {
      createDependency(startNode, t);
    } else {
      createDependency(prevReal, t);
    }
    prevReal = t;
  });
  createDependency(prevReal, endNode);

  // Add about 100 random dependencies between non-conflicting nodes
  for (let i = 0; i < 100; i++) {
    const cpIndex = Math.floor(Math.random() * 15);
    const ncpIndex = Math.floor(Math.random() * 10) + 5; // ensure strictly forward
    createDependency(cpTasks[cpIndex], ncpTasks[ncpIndex]);
  }
  for (let i = 0; i < 50; i++) {
    const ncpIndex = Math.floor(Math.random() * 10);
    const cpIndex = Math.floor(Math.random() * 10) + 12; // strictly forward
    createDependency(ncpTasks[ncpIndex], cpTasks[cpIndex]);
  }

  // Summary logic
  console.log(`Prepared ${tasks.length} tasks and ${dependencies.length} dependencies.`);

  // Chunk tasks insertion
  console.log('Inserting tasks...');
  await prisma.task.createMany({ data: tasks });

  console.log('Inserting dependencies...');
  await prisma.dependency.createMany({ data: dependencies });

  console.log('Seed completed successfully!');

  console.log(`
--- SUMMARY STATS ---
Total Tasks: ${tasks.length}
Total Dependencies: ${dependencies.length}
Note: Recalculate CPM in UI to see results.
  `);

  await prisma.$disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
