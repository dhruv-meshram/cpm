# Validation Test Matrix

These are the first tests to automate for the database phase.

## Entity Validation
- create workspace, user, project, task, dependency
- reject duplicate email
- reject duplicate workspace slug
- reject duplicate project identifier within a workspace
- reject duplicate dependency triplet
- reject self-dependency

## CPM Graph Validation
- reject empty task set
- reject negative duration
- reject missing predecessor or successor task references
- reject cycles in dependency graph
- preserve root and sink task existence for valid projects

## Persistence Behavior
- soft delete hides archived tasks from active query paths
- CPM snapshot round-trip preserves projectDuration and criticalPath
- graph layout positions persist and reload without affecting CPM data
