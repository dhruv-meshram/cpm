import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

function collectReports() {
  const root = join(process.cwd(), 'reports');
  const dirs = readdirSync(root, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name);
  const summary: Array<any> = [];
  for (const d of dirs) {
    const p = join(root, d, 'report.json');
    try {
      const j = JSON.parse(readFileSync(p, 'utf8'));
      summary.push({ dir: d, report: j });
    } catch (e) {
      // skip
    }
  }
  return summary;
}

function writeSummary(summary: any[]) {
  const csvLines = ['reportDir,timestamp,system,totalCases,status'];
  for (const s of summary) {
    const r = s.report;
    csvLines.push(`${s.dir},${r.timestamp},${r.system},${r.totalCases},${r.status}`);
  }
  writeFileSync(join(process.cwd(), 'reports', 'summary.csv'), csvLines.join('\n'));
  writeFileSync(join(process.cwd(), 'reports', 'summary.json'), JSON.stringify(summary, null, 2));
  console.log('Wrote reports/summary.csv and reports/summary.json');
}

const summary = collectReports();
writeSummary(summary);
