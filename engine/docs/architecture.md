# CPM Engine — Architecture (v1.0.0)

Overview
--------

The CPM Engine computes project schedules and critical paths from a DAG of `Task`s and `Dependency` edges. Primary components:

- `GraphBuilder` — constructs an internal `ProjectGraph` from `ProjectInput`.
- `GraphValidator` — ensures DAG constraints (no cycles, no missing nodes).
- `TopologicalSort` — Kahn's algorithm to produce an ordering for forward/backward passes.
- `ScheduleCalculator` — performs forward (earliest) and backward (latest) passes.
- `FloatCalculator` — computes float/slack values per task.
- `CriticalPathFinder` — extracts one or more critical paths.

Design notes
------------

- Public I/O is frozen to the JSON contract (see `engine/api/schema.json`) and the C++ header `engine/include/cpm_api.h`.
- Internal data structures are implementation details and can evolve as long as the public API and schema remain stable.
