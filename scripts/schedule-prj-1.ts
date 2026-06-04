import { PrismaClient } from '@prisma/client';


const prisma = new PrismaClient();

async function run() {
  console.log('Calculating schedule for PRJ-1...');

  const project = await prisma.project.findFirst({
    where: { identifier: 'PRJ-1' }
  });

  if (!project) {
    console.error("Could not find project with identifier PRJ-1.");
    process.exit(1);
  }

  const projectId = project.id;
  const tasks = await prisma.task.findMany({ where: { projectId } });
  const dependencies = await prisma.dependency.findMany({ where: { projectId } });

  console.log(`Found ${tasks.length} tasks and ${dependencies.length} dependencies.`);

  const nodes = new Map();
  tasks.forEach(t => {
    nodes.set(t.id, {
      ...t,
      duration: Number(t.duration),
      predecessors: [],
      successors: [],
      earlyStart: 0,
      earlyFinish: Number(t.duration),
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

  // Topological sort & forward pass
  const queue: string[] = [];
  nodes.forEach((node, id) => {
    if (node.indegree === 0) {
      queue.push(id);
    }
  });

  let sortedCount = 0;
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const current = nodes.get(currentId);
    sortedCount++;

    current.successors.forEach((succId: string) => {
      const succ = nodes.get(succId);
      // forward pass: succ.ES = max(succ.ES, current.EF)
      if (current.earlyFinish > succ.earlyStart) {
        succ.earlyStart = current.earlyFinish;
        succ.earlyFinish = succ.earlyStart + succ.duration;
      }
      succ.indegree--;
      if (succ.indegree === 0) {
        queue.push(succId);
      }
    });
  }

  if (sortedCount !== tasks.length) {
    console.warn(`Warning: Graph has a cycle or unreachable nodes. Sorted ${sortedCount} / ${tasks.length}`);
  }

  const projectStartDate = new Date();
  projectStartDate.setHours(0, 0, 0, 0);

  console.log('Updating task dates in database...');
  
  let updated = 0;
  for (const [id, node] of nodes.entries()) {
    const startDate = new Date(projectStartDate);
    startDate.setDate(startDate.getDate() + node.earlyStart);
    
    const endDate = new Date(projectStartDate);
    endDate.setDate(endDate.getDate() + (node.earlyFinish - (node.duration === 0 ? 0 : 1))); // inclusive end date
    
    await prisma.task.update({
      where: { id },
      data: {
        startDate,
        endDate
      }
    });
    updated++;
  }

  console.log(`Successfully scheduled ${updated} tasks! Check the Gantt chart now.`);
  await prisma.$disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
