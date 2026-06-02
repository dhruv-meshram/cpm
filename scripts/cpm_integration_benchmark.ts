import { performance } from 'node:perf_hooks';
import { appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { prismaClient } from '../src/database/prismaClient';
import { calculateAndSaveProject } from '../src/integration/persistence';

async function createSyntheticProject(taskCount: number, density: number) {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const workspace = await prismaClient.workspace.create({
    data: { name: `int-bench-${suffix}`, slug: `int-bench-${suffix}` },
  });

  const project = await prismaClient.project.create({
    data: { workspaceId: workspace.id, name: `Bench Proj ${taskCount}`, identifier: `BP-${suffix}` },
  });

  const taskData = Array.from({ length: taskCount }, (_, i) => ({
    id: `T-${i}-${suffix}`,
    projectId: project.id,
    title: `Task ${i}`,
    duration: (i % 5) + 1,
  }));

  // Batch insert tasks
  await prismaClient.task.createMany({ data: taskData as any });

  const depData: Array<{ projectId: string; predecessorTaskId: string; successorTaskId: string; dependencyType: 'FS'; lag: number }> = [];
  const maxForwardSpan = 10;
  for (let i = 0; i < taskCount - 1; i++) {
    const span = Math.min(maxForwardSpan, taskCount - i - 1);
    for (let j = 1; j <= span; j++) {
      if (Math.random() < density) {
        depData.push({
          projectId: project.id,
          predecessorTaskId: taskData[i].id,
          successorTaskId: taskData[i + j].id,
          dependencyType: 'FS',
          lag: 0,
        });
      }
    }
  }

  if (depData.length > 0) {
    await prismaClient.dependency.createMany({ data: depData as any, skipDuplicates: true });
  }

  return project.id;
}

async function benchmarkEndToEnd(taskCount: number, density: number, iterations: number = 3) {
  console.log(`Setting up project with ${taskCount} tasks...`);
  const projectId = await createSyntheticProject(taskCount, density);

  const latencies: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const t0 = performance.now();
    await calculateAndSaveProject(projectId, `bench-v${i}`);
    const t1 = performance.now();
    latencies.push(t1 - t0);
  }

  const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const p95 = latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)];
  
  console.log(`Result (${taskCount} tasks): Avg = ${avg.toFixed(2)}ms, P95 = ${p95.toFixed(2)}ms`);

  return { taskCount, avg, p95, raw: latencies };
}

async function main() {
  console.log('--- CPM Integration Benchmark ---');
  
  const scenarios = [
    { count: 100, density: 0.1 },
    { count: 500, density: 0.05 },
    { count: 1000, density: 0.02 },
    { count: 5000, density: 0.01 }
  ];

  const results = [];
  for (const s of scenarios) {
    const res = await benchmarkEndToEnd(s.count, s.density);
    results.push(res);
  }

  const reportLines = [
    '',
    '## End-to-End Integration Benchmarks',
    '*(Database Load -> Graph Build -> CPM Engine Calculation -> Result Persistence)*',
    '',
    '| Task Count | Average Latency (ms) | P95 Latency (ms) |',
    '| --- | --- | --- |'
  ];

  for (const r of results) {
    reportLines.push(`| ${r.taskCount} | ${r.avg.toFixed(2)} | ${r.p95.toFixed(2)} |`);
  }

  try {
    const reportPath = join(process.cwd(), 'reports', 'FINAL_BENCHMARK_REPORT.md');
    appendFileSync(reportPath, reportLines.join('\n') + '\n');
    console.log(`\nSuccessfully appended integration benchmarks to FINAL_BENCHMARK_REPORT.md`);
  } catch (err) {
    console.error('Failed to append to report. Please ensure it exists.', err);
  }
}

main().catch(err => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
