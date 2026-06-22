# CPM API Benchmarking Suite

This directory contains the API benchmarking suite for the Critical Path Method (CPM) web application. The suite measures API performance, endpoints' latency profiles, throughput under load, and system behavior across simulated concurrent users.

The suite covers **all 42 API endpoints** defined in the system.

---

## 📂 Directory Structure

- `README.md`: This file.
- `benchmark_main.ts`: Central orchestrator to run selected or all benchmark modules.
- `benchmark_utils.ts`: Shared utilities for authentication, dynamic sandbox project setup, concurrent runner loops, latency percentiles calculation, and CSV output.
- `auth_benchmark.ts`: Benchmarks signup, login, refresh, logout, and token check endpoints.
- `users_benchmark.ts`: Benchmarks profile retrieval, profile updates, and secure password changes.
- `projects_benchmark.ts`: Benchmarks projects listing, creation, detail, update, overview, activity feed, and member/role management.
- `departments_benchmark.ts`: Benchmarks department listings, creation, stats, and deletions.
- `tags_benchmark.ts`: Benchmarks tag listings, creation, and deletions.
- `tasks_benchmark.ts`: Benchmarks tasks listing, creation, detail, update, approvals, bulk imports, and bulk moves.
- `dependencies_benchmark.ts`: Benchmarks task dependencies listings, creation, and deletions.
- `cpm_benchmark.ts`: Benchmarks CPM execution trigger, results fetch, metrics fetch, and project exports.
- `dashboard_benchmark.ts`: Benchmarks dashboard stats, activity feeds, recent projects list, and upcoming milestones.
- `notifications_benchmark.ts`: Benchmarks notification lists, count, and summary updates.
- `system_misc_benchmark.ts`: Benchmarks search query, task stats, user workload analysis, and cache performance.
- `results/`: Directory containing generated CSV files (e.g. `auth.csv`, `tasks.csv`, etc.).

---

## 🛠️ Prerequisites & Setup

The benchmarking scripts require a running instance of the CPM web application.

1. **Database & Build Preparation** (From the project root):
   ```bash
   npm run build
   ```

2. **Start the Web Server** (with rate limiting disabled for benchmarks):
   ```bash
   DISABLE_RATE_LIMIT=true npm run start
   ```
   Or if you are in development mode:
   ```bash
   DISABLE_RATE_LIMIT=true npm run dev
   ```

The benchmarks will authenticate automatically using a sandbox user. If the user `test123@gmail.com` with password `Password123!` doesn't exist, the suite will automatically create it first.

---

## 🚀 Execution Commands

All commands should be run from the **project root directory**.

### 1. Run the Entire Suite (Default Settings)
Runs all API modules with a default concurrency of 5 users and duration of 5 seconds per endpoint.
```bash
npx tsx benchmarks/api/benchmark_main.ts
```

### 2. Customize Concurrency, Duration, and Target URL
Target a specific server address, run for 10 seconds, with 20 concurrent users:
```bash
npx tsx benchmarks/api/benchmark_main.ts --url http://localhost:3000 --duration 10 --concurrency 20
```

### 3. Simulate Concurrent User Load (Concurrency Sweep)
Simulate concurrent users by sweeping multiple concurrency levels sequentially (1, 5, 10, 20, 50, 100 concurrent users). This computes response times and throughput variations at different user counts:
```bash
npx tsx benchmarks/api/benchmark_main.ts --concurrency-sweep
```

### 4. Run Specific API Modules Only
Run only the `tasks` and `cpm` benchmarks:
```bash
npx tsx benchmarks/api/benchmark_main.ts --api tasks,cpm
```

### 5. Run an Individual Script Directly
You can run any individual script directly using `npx tsx`. Use environment variables to pass arguments:
```bash
# Run the projects benchmark with 15 concurrent users for 8 seconds
BASE_URL="http://localhost:3000" DURATION="8" CONCURRENCY="15" npx tsx benchmarks/api/projects_benchmark.ts
```

---

## 📊 Measured Metrics

The benchmarks calculate and export the following metrics:
- **Average Latency**: Arithmetic mean of response times (ms).
- **Median Latency**: 50th percentile (P50) of response times (ms).
- **Tail Latencies**: 95th (P95) and 99th (P99) percentiles of response times (ms) to measure worst-case latency.
- **Throughput**: Requests Per Second (RPS) completed successfully.
- **Failures**: Count of failed requests (network failures or non-2xx statuses).

---

## 💾 CSV Output Format

Results are stored inside `benchmarks/api/results/<module_name>.csv` (e.g., `projects.csv`, `tasks.csv`).
Each CSV file contains the following column structure:

| Column | Description |
|---|---|
| `timestamp` | UTC ISO timestamp of the run |
| `endpoint` | The specific API endpoint name |
| `method` | HTTP request method (GET, POST, PUT, DELETE) |
| `concurrency` | Number of concurrent simulated users |
| `duration_sec` | Actual duration of the test run in seconds |
| `total_requests` | Total requests sent during the run |
| `successful_requests` | Number of requests returning 2xx success statuses |
| `failed_requests` | Number of failed/error requests |
| `avg_latency_ms` | Average request response time in milliseconds |
| `median_latency_ms` | Median (50th percentile) latency in milliseconds |
| `p95_latency_ms` | 95th percentile latency in milliseconds |
| `p99_latency_ms` | 99th percentile latency in milliseconds |
| `throughput_rps` | Successful requests completed per second (RPS) |
