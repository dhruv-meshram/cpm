import assert from 'node:assert/strict';
import { createProject, createTask, getProjectByIdentifier, updateTask, deleteTask } from '../../src/database';
import { prismaClient } from '../../src/database/prismaClient';

export async function run() {
  // Setup: create a workspace for the test
  const workspace = await prismaClient.workspace.create({ data: { name: 'Test WS', slug: `test-ws-${Date.now()}` } });

  // Create project
  const project = await createProject({ workspaceId: workspace.id, name: 'Test Project', identifier: `TP-${Date.now()}` });
  assert.ok(project.id, 'Project not created');

  // Create task
  const task = await createTask({ projectId: project.id, title: 'Task 1', duration: '2', estimatedDays: '2' });
  assert.ok(task.id, 'Task not created');

  // Read project via repository
  const fetched = await getProjectByIdentifier(workspace.id, project.identifier);
  assert.ok(fetched, 'Failed to fetch project');

  // Update task
  const updated = await updateTask(task.id, { title: 'Task 1 - updated' });
  assert.equal(updated.title, 'Task 1 - updated');

  // Delete task
  const deleted = await deleteTask(task.id);
  assert.equal(deleted.id, task.id);

  // Cleanup: delete project and workspace
  await prismaClient.project.delete({ where: { id: project.id } });
  await prismaClient.workspace.delete({ where: { id: workspace.id } });

  console.log('CRUD integration tests passed');
}
