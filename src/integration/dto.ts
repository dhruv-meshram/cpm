export interface CPMTaskInput {
  id: string;
  duration: number;
}

export interface CPMDependencyInput {
  from: string;
  to: string;
  lag?: number;
}

export interface CPMSnapshotDTO {
  projectId: string;
  version: string;
  projectDuration: number;
  criticalPath: string[];
  payload: Record<string, any>;
}

export interface GraphInput {
  tasks: CPMTaskInput[];
  dependencies: CPMDependencyInput[];
}

export interface CPMTaskResult {
  id: string;
  earliest_start: number;
  earliest_finish: number;
  latest_start: number;
  latest_finish: number;
  float_time: number;
}

export interface CPMResult {
  projectDuration: number;
  criticalPath: string[];
  tasks: CPMTaskResult[];
}
