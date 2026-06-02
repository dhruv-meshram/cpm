import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { getProject, listProjectTasks, listProjectDependencies } from '../database/repositories';
import { GraphInput, CPMResult, CPMTaskInput, CPMDependencyInput } from './dto';

export class CpmIntegrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CpmIntegrationError';
  }
}

export async function calculateProject(projectId: string): Promise<CPMResult> {
  // 1. Load project to ensure it exists
  const project = await getProject(projectId);
  if (!project) {
    throw new CpmIntegrationError(`Project with ID ${projectId} not found.`);
  }

  // 2. Load tasks
  const dbTasks = await listProjectTasks(projectId);
  if (dbTasks.length === 0) {
    throw new CpmIntegrationError(`Project ${projectId} has no tasks to calculate.`);
  }

  // 3. Load dependencies
  const dbDependencies = await listProjectDependencies(projectId);

  // 4. Construct CPM graph DTOs
  const input: GraphInput = {
    tasks: dbTasks.map(t => ({
      id: t.id,
      duration: Number(t.duration)
    })),
    dependencies: dbDependencies.map(d => ({
      from: d.predecessorTaskId,
      to: d.successorTaskId,
      lag: Number(d.lag || 0)
    }))
  };

  // 5. Invoke CPM engine via child_process
  const enginePath = join(process.cwd(), 'build', 'cpm_cli');
  
  const child = spawnSync(enginePath, [], {
    input: JSON.stringify(input),
    encoding: 'utf-8',
    maxBuffer: 1024 * 1024 * 50 // 50MB buffer for large graphs
  });

  if (child.error) {
    throw new CpmIntegrationError(`Failed to spawn CPM engine executable: ${child.error.message}`);
  }

  // 6. Handle engine errors or cycle detection
  if (child.status !== 0) {
    let errorMsg = child.stderr?.trim() || 'Unknown engine error';
    try {
      const errJson = JSON.parse(child.stderr);
      if (errJson.error) {
        errorMsg = errJson.error;
      }
    } catch (e) {
      // Use raw stderr
    }
    throw new CpmIntegrationError(`CPM Engine Validation Failed: ${errorMsg}`);
  }

  // 7. Parse Result
  try {
    const output = JSON.parse(child.stdout);
    return output.result as CPMResult;
  } catch (err) {
    throw new CpmIntegrationError(`Failed to parse CPM Engine output: ${err instanceof Error ? err.message : String(err)}`);
  }
}
