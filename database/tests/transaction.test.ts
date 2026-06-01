import assert from 'node:assert/strict';
import { runTransaction } from '../../src/database/prismaClient';
import { prismaClient } from '../../src/database/prismaClient';

export async function run() {
  // Transaction commit test
  const result: any = await runTransaction(async (p) => {
    const ws = await p.workspace.create({ data: { name: 'TX WS', slug: `tx-${Date.now()}` } });
    return { wsId: ws.id };
  });
  const wsFound = await prismaClient.workspace.findUnique({ where: { id: result.wsId } });
  assert.ok(wsFound, 'Committed workspace not found');

  // Transaction rollback test
  let txId: string | undefined;
  try {
    await runTransaction(async (p) => {
      const w = await p.workspace.create({ data: { name: 'TX WS 2', slug: `tx2-${Date.now()}` } });
      txId = w.id;
      // force rollback
      throw new Error('force rollback');
    });
  } catch (e) {
    // expected
  }
  if (txId) {
    const found = await prismaClient.workspace.findUnique({ where: { id: txId } });
    assert.equal(found, null, 'Rolled-back workspace still exists');
  }

  // Cleanup committed workspace
  if (result.wsId) {
    await prismaClient.workspace.delete({ where: { id: result.wsId } });
  }

  console.log('Transaction commit and rollback tests passed');
}
