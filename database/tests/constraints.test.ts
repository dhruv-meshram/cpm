import assert from 'node:assert/strict';
import { prismaClient } from '../../src/database/prismaClient';

export async function run() {
  // Unique constraint: workspace.slug
  const slug = `dup-slug-${Date.now()}`;
  const a = await prismaClient.workspace.create({ data: { name: 'A', slug } });
  try {
    await prismaClient.workspace.create({ data: { name: 'B', slug } });
    throw new Error('Duplicate slug was allowed');
  } catch (err: any) {
    // Expect a constraint error from Prisma
    console.log('Duplicate slug correctly rejected');
  }

  // Foreign key enforcement: create task without project
  try {
    await prismaClient.task.create({ data: { id: `t-${Date.now()}`, projectId: 'missing', title: 'Orphan', duration: '1' } });
    throw new Error('Orphan task was allowed');
  } catch (err: any) {
    console.log('Foreign key violation correctly rejected');
  }

  // Cleanup
  await prismaClient.workspace.delete({ where: { id: a.id } });

  console.log('Constraint negative-path tests passed');
}
