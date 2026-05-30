# Database Setup

## Project layout
- `prisma/schema.prisma` is the canonical Prisma schema.
- `prisma/seed.ts` seeds a minimal CPM graph and snapshot.
- `prisma/migrations/*` stores generated migration history.
- `database/*` stores schema notes, validation matrices, and benchmark matrices.
- A future database module should live in `src/database/*` or `apps/web/src/database/*` and own all PrismaClient usage.

## Environment variables
- `DATABASE_URL` for PostgreSQL connection.
- `DATABASE_URL_TEST` for isolated test runs if the project adds a separate test database.

## Recommended environments
- development: local PostgreSQL instance.
- testing: isolated database per test run.
- production: pooled PostgreSQL deployment with migrations applied through CI/CD.

## Operational notes
- Apply migrations before seeding.
- Keep CPM snapshots versioned for traceability.
- Use indexes on project/task/dependency access paths before enabling larger benchmarks.
- Generate Prisma Client from the project layout boundary instead of importing `PrismaClient` directly throughout the app.
