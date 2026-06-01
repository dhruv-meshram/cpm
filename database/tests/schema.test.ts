import assert from 'node:assert/strict';
import { prismaClient } from '../../src/database/prismaClient';

export async function run() {
  // Verify core CPM tables exist in the database
  const tables = ['workspace', 'project', 'task', 'dependency', 'cPMSnapshot', 'graphLayout', 'nodePosition'];

  const tableList = tables.map((t) => `'${t.toLowerCase()}'`).join(',');
  const rows: Array<{ table_name: string }> = await prismaClient.$queryRawUnsafe(
    `select table_name from information_schema.tables where table_schema = current_schema() and lower(table_name) in (${tableList})`,
  );

  const found = new Set(rows.map((r) => r.table_name.toLowerCase()));
  for (const t of tables) {
    assert.ok(found.has(t.toLowerCase()), `Missing table: ${t}`);
  }

  console.log('Schema introspection passed; core tables present');
}
