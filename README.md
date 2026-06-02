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

The application will be available at [http://localhost:3000](http://localhost:3000).

## Architecture Stack
- **Frontend**: Next.js 16 (Turbopack), TailwindCSS, Shadcn/ui
- **State Management**: Zustand, TanStack React Query
- **Authentication**: JWT via Edge-Compatible `jose`
- **Database**: PostgreSQL with Prisma ORM
- **Engine**: C++ Mathematical Engine for Critical Path Calculation
