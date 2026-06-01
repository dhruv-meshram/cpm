import { performance } from 'perf_hooks';
import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { prismaClient } from '../src/database/prismaClient';

function loadManifest() {
  const p = join(process.cwd(), 'scripts', 'db_benchmark_manifest.json');
  return JSON.parse(readFileSync(p, 'utf8'));
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function runPreset(presetName: string) {
  const manifest = loadManifest();
  const preset = manifest.presets[presetName];
  if (!preset) throw new Error(`Unknown preset ${presetName}`);

  const reportDir = join('reports', `db_volume_${presetName}_${timestamp()}`);
  mkdirSync(reportDir, { recursive: true });

  const workspace = await prismaClient.workspace.create({ data: { name: `bench-ws-${Date.now()}`, slug: `bench-ws-${Date.now()}` } });
  const projects = [];
  for (let i = 0; i < preset.projectCount; i++) {
    const p = await prismaClient.project.create({ data: { workspaceId: workspace.id, name: `bench-proj-${i}-${Date.now()}`, identifier: `BP-${Date.now()}-${i}` } });
    projects.push(p);
  }

  const totalTasks = preset.taskCount;
  const batchSize = 1000;
  const batches = Math.ceil(totalTasks / batchSize);

  const metrics: any = { inserts: { total: 0, durationMs: 0, insertsPerSec: 0 }, reads: { total: 0, durationMs: 0, qps: 0 } };

  // Bulk insert tasks using createMany in batches
  console.log(`Inserting ~${totalTasks} tasks in ${batches} batches (batchSize=${batchSize})`);
  const insertStart = performance.now();
  for (let b = 0; b < batches; b++) {
    const items = [];
    const start = b * batchSize;
    const end = Math.min(totalTasks, start + batchSize);
    for (let i = start; i < end; i++) {
      items.push({ id: `t-${presetName}-${Date.now()}-${b}-${i}`, projectId: projects[i % projects.length].id, title: `Task ${i}`, duration: '1' });
    }
    // Prisma createMany
    // @ts-ignore
    await prismaClient.task.createMany({ data: items });
    metrics.inserts.total += items.length;
    console.log(`Inserted batch ${b + 1}/${batches} (${items.length} rows)`);
  }
  const insertEnd = performance.now();
  metrics.inserts.durationMs = insertEnd - insertStart;
  metrics.inserts.insertsPerSec = (metrics.inserts.total / (metrics.inserts.durationMs / 1000));

  // Read benchmark: count and simple query
  console.log('Running read benchmark (count)');
  const readStart = performance.now();
  const cnt = await prismaClient.task.count();
  const readEnd = performance.now();
  metrics.reads.total = cnt;
  metrics.reads.durationMs = readEnd - readStart;
  metrics.reads.qps = cnt / (metrics.reads.durationMs / 1000);

  // write report.json
  const report = { timestamp: new Date().toISOString(), preset: presetName, presetSpec: preset, metrics };
  writeFileSync(join(reportDir, 'report.json'), JSON.stringify(report, null, 2));
  writeFileSync(join(reportDir, 'REPORT.md'), `# DB Volume Report ${presetName}\n\n${JSON.stringify(report, null, 2)}`);

  console.log('Volume benchmark complete:', reportDir);
}

(async function () {
  try {
    const preset = process.argv[2] || 'small';
    await runPreset(preset);
    process.exit(0);
  } catch (err: any) {
    console.error('Volume benchmark failed:', err?.message ?? err);
    process.exit(1);
  }
})();
