import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

type BenchmarkOperation = string;

type ScenarioMetric = {
  scenarioId: string;
  name: string;
  taskCount: number;
  density: number;
  dataSource: string;
  shape: string;
  operation: BenchmarkOperation;
  durationMs: number;
  value: number;
  unit: string;
};

type ScenarioRun = {
  scenarioId: string;
  name: string;
  status: 'PASS' | 'FAIL';
  error?: string;
  metrics: ScenarioMetric[];
};

type MatrixReport = {
  timestamp: string;
  profile: string;
  system: string;
  scenarios: ScenarioRun[];
};

function findLatestReportDir(): string | null {
  const reportsDir = join(process.cwd(), 'reports');
  let dirs: string[];
  try {
    dirs = readdirSync(reportsDir);
  } catch (err) {
    console.error('Reports directory not found.');
    return null;
  }

  const matrixDirs = dirs
    .filter((d) => d.startsWith('database_matrix_'))
    .map((d) => join(reportsDir, d))
    .filter((p) => statSync(p).isDirectory())
    .sort();

  if (matrixDirs.length === 0) return null;
  return matrixDirs[matrixDirs.length - 1]; // latest by lexicographical sort of ISO string
}

function generateMarkdownTable(report: MatrixReport): string {
  const lines = [];
  lines.push('### Tabular Metrics Summary');
  lines.push('');
  lines.push('| Scenario | Operation | Duration (ms) | Value | Unit |');
  lines.push('| --- | --- | --- | --- | --- |');

  for (const run of report.scenarios) {
    if (run.status !== 'PASS') continue;
    for (const m of run.metrics) {
      lines.push(`| ${m.scenarioId} | ${m.operation} | ${m.durationMs.toFixed(2)} | ${m.value.toFixed(2)} | ${m.unit} |`);
    }
  }

  return lines.join('\n');
}

function generateMermaidXyChart(title: string, metrics: ScenarioMetric[], yAxisLabel: string, valueSelector: (m: ScenarioMetric) => number): string {
  const xAxis = metrics.map((m) => m.scenarioId.replace('SCN-', '').substring(0, 15));
  const dataPoints = metrics.map(valueSelector);

  const lines = [];
  lines.push('```mermaid');
  lines.push('xychart-beta');
  lines.push(`    title "${title}"`);
  lines.push(`    x-axis [${xAxis.map(x => `"${x}"`).join(', ')}]`);
  lines.push(`    y-axis "${yAxisLabel}"`);
  lines.push(`    bar [${dataPoints.map(d => d.toFixed(2)).join(', ')}]`);
  lines.push('```');
  return lines.join('\n');
}

function generateVisualizations(report: MatrixReport): string {
  const lines: string[] = [];
  lines.push(`# Database Benchmark Visualizations`);
  lines.push(`Generated from matrix report run at \`${report.timestamp}\` (\`${report.profile}\` profile).`);
  lines.push('');

  // Collect all metrics
  const allMetrics = report.scenarios.filter((s) => s.status === 'PASS').flatMap((s) => s.metrics);

  // Group by operation
  const ops = Array.from(new Set(allMetrics.map(m => m.operation)));

  lines.push('## Throughput Comparisons');
  lines.push('');

  const throughputOps = ops.filter(o => o.includes('throughput'));
  for (const op of throughputOps) {
    const subset = allMetrics.filter(m => m.operation === op);
    if (subset.length === 0) continue;
    lines.push(`### ${op}`);
    lines.push(generateMermaidXyChart(`${op} (higher is better)`, subset, subset[0].unit, m => m.value));
    lines.push('');
  }

  lines.push('## Latency Comparisons');
  lines.push('');

  const latencyOps = ops.filter(o => o.includes('latency'));
  for (const op of latencyOps) {
    const subset = allMetrics.filter(m => m.operation === op);
    if (subset.length === 0) continue;
    lines.push(`### ${op}`);
    lines.push(generateMermaidXyChart(`${op} (lower is better)`, subset, 'Duration (ms)', m => Math.max(0.1, m.durationMs)));
    lines.push('');
  }

  lines.push('---');
  lines.push(generateMarkdownTable(report));

  return lines.join('\n');
}

function main() {
  const reportDirArg = process.argv[2];
  let targetDir = reportDirArg ? join(process.cwd(), reportDirArg) : findLatestReportDir();

  if (!targetDir) {
    console.error('No matrix report directory found. Run the benchmark matrix first.');
    process.exit(1);
  }

  const reportPath = join(targetDir, 'report.json');
  let report: MatrixReport;
  try {
    report = JSON.parse(readFileSync(reportPath, 'utf8'));
  } catch (err) {
    console.error(`Failed to read report.json from ${targetDir}`);
    process.exit(1);
  }

  console.log(`Found matrix report in ${targetDir}`);
  const visMarkdown = generateVisualizations(report);

  const visPath = join(targetDir, 'VISUALIZATION.md');
  writeFileSync(visPath, visMarkdown);
  console.log(`Generated visualizations at ${visPath}`);
}

main();
