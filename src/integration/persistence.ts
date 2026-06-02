import { calculateProject } from './cpmService';
import { saveCpmSnapshot } from '../database/repositories';
import { CPMSnapshotDTO } from './dto';

/**
 * Orchestrates the full integration flow:
 * 1. Loads data and calculates CPM.
 * 2. Formats result as a snapshot DTO.
 * 3. Persists the snapshot atomically to the database.
 */
export async function calculateAndSaveProject(projectId: string, version: string) {
  // 1. Calculate the CPM network
  const result = await calculateProject(projectId);

  // 2. Prepare payload
  const payload = {
    tasks: result.tasks,
    generatedAt: new Date().toISOString()
  };

  // 3. Persist Snapshot
  const snapshot = await saveCpmSnapshot(
    projectId,
    version,
    result.projectDuration,
    result.criticalPath,
    payload
  );

  return {
    snapshotId: snapshot.id,
    cpmResult: result
  };
}
