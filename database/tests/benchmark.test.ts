import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { measureProjectGraphRead } from '../benchmark';
import { benchmarkCases } from './test-cases';
import { writeDatabaseTestReport } from './report';

async function run() {
  assert.ok(benchmarkCases.length >= 30);
  const result = await measureProjectGraphRead('missing-project', {
    listProjectTasks: async () => [],
    listProjectDependencies: async () => [],
  });
  assert.equal(result.taskCount, 0);
  assert.equal(result.dependencyCount, 0);
  assert.ok(result.durationMs >= 0);

  const timestamp = new Date().toISOString();
  const reportDir = join('reports', `database_benchmark_${timestamp.replace(/[:.]/g, '-')}`);
  mkdirSync(reportDir, { recursive: true });
  const report = writeDatabaseTestReport(reportDir, {
    timestamp,
    system: 'local node harness',
    totalCases: benchmarkCases.length,
    status: 'PASS',
    notes: [
      'Benchmark cases are enumerated from the database benchmark matrix.',
      'The harness uses injectable sources so it can run without a live database.',
    ],
    sections: [
      {
        title: 'Benchmark Coverage',
        headers: ['Scenario', 'Status'],
        rows: benchmarkCases.map((scenario) => [scenario, 'planned']),
        analysis: [
          'The benchmark matrix mirrors the full test inventory from plan.md.',
          'Report output is intentionally similar to the CPM engine benchmark report structure.',
        ],
      },
      {
        title: 'Measured Harness Result',
        headers: ['Project', 'Tasks', 'Dependencies', 'Duration (ms)'],
        rows: [['missing-project', result.taskCount, result.dependencyCount, result.durationMs.toFixed(3)]],
        analysis: ['This run uses an injectable mock source, so the runtime is a harness smoke test rather than a live database benchmark.'],
      },
    ],
  });

  console.log(`benchmark tests passed; report written to ${report.markdownPath}`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
