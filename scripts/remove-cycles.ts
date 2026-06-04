import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const project = await prisma.project.findFirst({ where: { identifier: 'PRJ-1' } });
  if (!project) return;
  const projectId = project.id;
  
  const dependencies = await prisma.dependency.findMany({ where: { projectId } });
  
  // Kahn's algorithm to detect cycles, and greedy edge removal
  const nodes = new Set<string>();
  const adj = new Map<string, string[]>();
  
  dependencies.forEach(d => {
    nodes.add(d.predecessorTaskId);
    nodes.add(d.successorTaskId);
    if (!adj.has(d.predecessorTaskId)) adj.set(d.predecessorTaskId, []);
    adj.get(d.predecessorTaskId)!.push(d.successorTaskId);
  });

  const visited = new Set<string>();
  const recStack = new Set<string>();
  const edgesToRemove: string[] = [];

  function dfs(u: string) {
    visited.add(u);
    recStack.add(u);
    
    const neighbors = adj.get(u) || [];
    for (const v of neighbors) {
      if (!visited.has(v)) {
        dfs(v);
      } else if (recStack.has(v)) {
        // Cycle detected, mark the edge for removal
        const dep = dependencies.find(d => d.predecessorTaskId === u && d.successorTaskId === v);
        if (dep) edgesToRemove.push(dep.id);
      }
    }
    recStack.delete(u);
  }

  for (const node of nodes) {
    if (!visited.has(node)) {
      dfs(node);
    }
  }

  if (edgesToRemove.length > 0) {
    console.log(`Removing ${edgesToRemove.length} cycle-inducing edges...`);
    await prisma.dependency.deleteMany({
      where: { id: { in: edgesToRemove } }
    });
  } else {
    console.log('No cycles found.');
  }

  await prisma.$disconnect();
}

run().catch(console.error);
