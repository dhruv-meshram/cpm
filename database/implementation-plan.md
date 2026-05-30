# Prisma Project Layout Implementation Plan

## Goal
Wire a real Prisma-backed database layout for the CPM platform so the schema, client, seed flow, validation, and benchmarks can run from a normal project structure instead of isolated schema files.

## Target Layout
- `prisma/schema.prisma` for the canonical schema
- `prisma/seed.ts` for deterministic sample data
- `prisma/migrations/*` for generated migration history
- `src/database/*` or `apps/web/src/database/*` for Prisma client and repository wrappers
- `database/*` for docs, validation matrices, and benchmark matrices

## Implementation Order
1. Add a real project manifest and Prisma scripts.
	- Create or extend the package manifest that owns the database layer.
	- Add scripts for `prisma generate`, `prisma migrate`, `prisma db seed`, linting, and validation helpers.
	- Add `.env.example` with `DATABASE_URL` and test-database variables.
2. Wire the Prisma client boundary.
	- Add a single Prisma client module that is reused by repositories and tests.
	- Prevent direct PrismaClient usage outside the database boundary.
	- Add repository wrappers for workspace, project, task, dependency, and snapshot operations.
3. Normalize the schema package.
	- Keep `prisma/schema.prisma` as the source of truth.
	- Regenerate or replace the current migration stub with real Prisma migrations.
	- Adjust the seed script so it creates a valid CPM graph and snapshot using the final schema.
4. Add validation and integrity checks.
	- Add schema validation for required relations, unique constraints, and DAG assumptions.
	- Add negative-path tests for duplicate emails, duplicate slugs, duplicate dependencies, self-dependencies, missing references, and negative durations.
	- Add round-trip tests that seed data, compute or mock a snapshot, and verify the stored CPM payload.
5. Add benchmark coverage.
	- Add benchmarks for inserts, project graph reads, dependency traversal, and CPM input generation.
	- Measure 100, 1000, and 5000 task graphs, plus dense and chain-shaped graphs.
	- Compare query latency before and after indexes.
6. Update docs.
	- Update `database/DATABASE_SETUP.md` with the actual layout, scripts, and environment variables.
	- Keep `database/schema-design.md` synchronized with the final Prisma models.
	- Add a short benchmark report or benchmark instructions for running the new database benchmarks.

## Validation Coverage
- entity uniqueness and referential integrity
- DAG invariants for CPM graph inputs
- soft delete and snapshot round-trip behavior
- negative-path tests for invalid dependencies and task data

## Benchmark Coverage
- 100 / 1000 / 5000 task graphs
- dense and chain-shaped graphs
- index impact on read latency

## Deliverables
- A runnable Prisma project layout with a single database entry point
- Generated migrations instead of a placeholder migration stub
- Seed data and repository boundaries that match the CPM engine contract
- Validation tests and benchmark tests that prove the layout is correct and measurable
