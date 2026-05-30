# Database Schema Design

The database phase stores project graph data, CPM schedule caches, audit trails, and graph layout state.

Core relationships:
- Workspace 1:N Projects
- Project 1:N Tasks
- Task 1:N Dependencies as predecessor and successor endpoints
- Project 1:N CPMSnapshots
- Project 1:N GraphLayouts, each with NodePositions

Integrity rules:
- unique `workspace.slug`
- unique `user.email`
- unique `project` identifier per workspace
- no duplicate dependency triplets for the same predecessor, successor, and dependency type
- no self-dependencies
- durations non-negative
