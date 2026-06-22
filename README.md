# CPM Planner

A production-ready Full-Stack Critical Path Method (CPM) project management tool. It features an interactive Next.js App Router frontend, a highly optimized C++ CPM calculation engine, and a PostgreSQL database layer managed by Prisma.

## Key Features
- **Project Workspace**: Fully isolated workspaces with members and roles.
- **Kanban Board**: Drag-and-drop task management powered by HTML5 Drag API and TanStack Query.
- **Dependency Graph**: Interactive Directed Acyclic Graph (DAG) visualizing task dependencies, powered by React Flow and Dagre.
- **Gantt Chart**: Visual timeline of task schedules.
- **Real-Time Updates**: Activity logging and WebSocket integration for real-time collaboration.

## Setup & Execution

### Prerequisites
- Node.js (v20+)
- PostgreSQL Database
- C++ Compiler (CMake) - For the backend engine

### 1. Database Configuration
1. Start your local PostgreSQL server or provide a connection string.
2. Update the `.env` file in the root directory:
```
DATABASE_URL="postgresql://user:password@localhost:5432/cpm_db"
JWT_SECRET="your_secure_secret"
```

### 2. Install Dependencies
```bash
npm install
cd apps/web && npm install
```

### 3. Initialize the Database
```bash
npx prisma generate
npx prisma db push
```

### 4. Run the Full Stack
The application uses `concurrently` to run the Next.js frontend and the WebSocket server simultaneously.

```bash
cd apps/web
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost://localhost:3000).

## Architecture Stack
- **Frontend**: Next.js 16 (Turbopack), TailwindCSS, Shadcn/ui
- **State Management**: Zustand, TanStack React Query
- **Authentication**: JWT via Edge-Compatible `jose`
- **Database**: PostgreSQL with Prisma ORM
- **Engine**: C++ Mathematical Engine for Critical Path Calculation

## Benchmarking Suite

The project includes a comprehensive benchmarking suite split into three core categories:
1. **CPM Engine Benchmarks (C++)**: Measures topological sort, forward/backward pass calculations, slack calculations, scalability, and memory consumption.
2. **Database Benchmarks (C++)**: Direct PostgreSQL performance testing using native C++ `libpq`, measuring project creation, task/dependency insertions, constraint validation overhead, query performance, and indexing effectiveness.
3. **API & Concurrency Load Tests (TS & Locust)**: Simulates concurrent users performing read/write operations against the API endpoints.

### Quick Start: Run All Benchmarks
To run the entire benchmarking suite sequentially (compiling C++ binaries, executing engine & database benchmarks, and hitting live API endpoints/Locust load tests if the server is active):

```bash
# 1. Start the Next.js server with rate limiting disabled (for API & Locust benchmarks)
DISABLE_RATE_LIMIT=true npm run dev

# 2. Run the unified benchmarks runner (in another terminal)
npm run benchmarks:all
```

For specific details, parameter configuration, and output details:
- For C++ Engine: refer to [benchmarks/README.md](file:///home/dhruv/Documents/cpm/benchmarks/README.md)
- For Database: refer to [benchmarks/db/README.md](file:///home/dhruv/Documents/cpm/benchmarks/db/README.md)
- For API: refer to [benchmarks/api/README.md](file:///home/dhruv/Documents/cpm/benchmarks/api/README.md)
