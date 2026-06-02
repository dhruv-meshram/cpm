import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function runCommand(cmd: string) {
  console.log(`\n======================================================`);
  console.log(`Running: ${cmd}`);
  console.log(`======================================================\n`);
  try {
    execSync(cmd, { stdio: 'inherit', env: process.env });
  } catch (err) {
    console.error(`\n[ERROR] Command failed: ${cmd}`);
    process.exit(1);
  }
}

function findLatestMatrixVis(): string | null {
  const reportsDir = join(process.cwd(), 'reports');
  let dirs: string[] = [];
  try {
    dirs = readdirSync(reportsDir);
  } catch (e) {
    return null;
  }

  const matrixDirs = dirs
    .filter((d) => d.startsWith('database_matrix_'))
    .map((d) => join(reportsDir, d))
    .filter((p) => statSync(p).isDirectory())
    .sort();

  if (matrixDirs.length === 0) return null;
  return join(matrixDirs[matrixDirs.length - 1], 'VISUALIZATION.md');
}

function main() {
  const requiredEnvVars = ['DATABASE_URL'];
  const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);

  if (missingEnvVars.length > 0) {
    console.warn(`[WARNING] Missing environment variables: ${missingEnvVars.join(', ')}`);
    console.warn(`[WARNING] Proceeding, but commands may fail if they require database access.`);
  }

  // 1. Run all benchmarks
  runCommand('npm run db:test:volume:small');
  runCommand('npm run db:test:volume:medium');
  runCommand('npm run db:test:volume:large');
  runCommand('npm run db:bench:matrix:full');

  // 2. Generate matrix visualizations
  runCommand('npm run db:bench:visualize');

  // 3. Aggregate reports
  runCommand('npm run db:bench:aggregate');

  // 4. Assemble final report
  console.log('\nAssembling FINAL_BENCHMARK_REPORT.md ...');
  
  const lines: string[] = [];
  lines.push('# Final Database Benchmark Report');
  lines.push(`Generated at: ${new Date().toISOString()}`);
  lines.push('');

  // Include CSV summary as a markdown table
  try {
    const csvContent = readFileSync(join(process.cwd(), 'reports', 'summary.csv'), 'utf8');
    const csvLines = csvContent.trim().split('\n');
    if (csvLines.length > 0) {
      lines.push('## Overall Execution Summary');
      lines.push('');
      lines.push('| ' + csvLines[0].split(',').join(' | ') + ' |');
      lines.push('|' + csvLines[0].split(',').map(() => '---').join('|') + '|');
      for (let i = 1; i < csvLines.length; i++) {
        lines.push('| ' + csvLines[i].split(',').join(' | ') + ' |');
      }
      lines.push('');
    }
  } catch (err) {
    lines.push('> Warning: `summary.csv` not found or could not be read.');
    lines.push('');
  }

  // Include visual matrix artifacts
  const visPath = findLatestMatrixVis();
  if (visPath) {
    try {
      const visContent = readFileSync(visPath, 'utf8');
      lines.push('## Matrix Visualizations');
      lines.push('');
      lines.push(visContent);
    } catch (e) {
      lines.push('> Warning: Visualizations file could not be read.');
    }
  } else {
    lines.push('> Warning: Latest matrix visualizations not found.');
  }

  const reportPath = join(process.cwd(), 'reports', 'FINAL_BENCHMARK_REPORT.md');
  writeFileSync(reportPath, lines.join('\n'));
  
  console.log(`\n======================================================`);
  console.log(`Successfully generated final report at:`);
  console.log(reportPath);
  console.log(`======================================================\n`);
}

main();
