import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

export type DatabaseTestReport = {
  timestamp: string;
  system: string;
  totalCases: number;
  status: 'PASS' | 'FAIL';
  notes: string[];
  sections: Array<{
    title: string;
    headers: string[];
    rows: Array<Array<string | number>>;
    analysis: string[];
  }>;
};

function ensureDirectory(filePath: string) {
  mkdirSync(dirname(filePath), { recursive: true });
}

function renderMarkdown(report: DatabaseTestReport) {
  const lines: string[] = [];
  lines.push(`# Database Test Report | ${report.timestamp}`);
  lines.push('');
  lines.push('## Executive Summary');
  lines.push(`Total cases run: ${report.totalCases}`);
  lines.push(`Status: ${report.status}`);
  lines.push('');
  lines.push('## System Configuration');
  lines.push(`System: ${report.system}`);
  lines.push('');

  for (const section of report.sections) {
    lines.push(`## ${section.title}`);
    lines.push('');
    lines.push(`| ${section.headers.join(' | ')} |`);
    lines.push(`| ${section.headers.map(() => '---').join(' | ')} |`);
    for (const row of section.rows) {
      lines.push(`| ${row.map((value) => String(value)).join(' | ')} |`);
    }
    lines.push('');
    if (section.analysis.length > 0) {
      lines.push('**Analysis:**');
      for (const item of section.analysis) {
        lines.push(`- ${item}`);
      }
      lines.push('');
    }
  }

  lines.push('## Notes');
  lines.push('');
  for (const note of report.notes) {
    lines.push(`- ${note}`);
  }

  return lines.join('\n');
}

export function writeDatabaseTestReport(reportDir: string, report: DatabaseTestReport) {
  const markdownPath = join(reportDir, 'REPORT.md');
  const jsonPath = join(reportDir, 'report.json');
  ensureDirectory(markdownPath);
  writeFileSync(markdownPath, renderMarkdown(report));
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  return { markdownPath, jsonPath };
}
