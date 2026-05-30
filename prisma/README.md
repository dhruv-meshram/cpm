# Prisma Layout

This directory owns the CPM database schema and seed data.

Files:
- `schema.prisma` - canonical PostgreSQL schema
- `seed.ts` - deterministic CPM seed data
- `migrations/` - Prisma migration history

Planned project wiring:
- a single Prisma client module under the app/database boundary
- repository wrappers for workspace, project, task, dependency, and snapshot access
- validation and benchmark scripts that run against the seeded schema
