# Database Validation Tests

Minimal implementation checklist:
- create workspace, user, project, task, and dependency successfully
- reject duplicate email and duplicate workspace slug
- reject duplicate dependency edges
- reject self-dependency
- reject task without project
- reject negative duration at service validation layer
- verify soft delete excludes archived tasks from active queries
- verify CPM snapshot round-trip preserves critical path and project duration
