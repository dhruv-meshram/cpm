# CPM Database Benchmarking Suite

This directory contains the database benchmarking suite for the Critical Path Method (CPM) web application. The suite measures PostgreSQL database write speed (inserts/sec), read latency (ms), constraint validation costs, query execution plan metrics, indexing effectiveness, and concurrent user performance under stress.

The suite is written in **C++** using the native PostgreSQL client library `libpq` for raw database performance, and **Locust** for concurrent user load testing.

---

## 📂 Directory Structure

- `README.md`: This file.
- `CMakeLists.txt`: CMake build instructions.
- `benchmark_main.cpp`: Entry point that coordinates and executes all database C++ benchmarks.
- `db_utils.hpp` / `db_utils.cpp`: Shared utilities for timing, `libpq` connection setup, database seeding, result calculation, and CSV output.
- `project_creation_benchmark.cpp`: Repeated project insertions.
- `task_insertion_benchmark.cpp`: Repeated task insertions (tests scaling under growing table sizes).
- `dependency_insertion_benchmark.cpp`: Repeated dependency inserts (tests foreign key validation costs).
- `project_loading_benchmark.cpp`: Full project DAG fetches (tests joins and query volume).
- `query_performance_benchmark.cpp`: Complex query runs (dashboard widgets, activity log, user workloads) measuring average, P95, and P99 latencies.
- `index_effectiveness_benchmark.cpp`: Compares search latency with and without indexes, calculating the exact speedup ratio.
- `locustfile.py`: Locust python file for concurrent user simulation on API endpoints.
- `results/`: Contains generated CSV output files.

---

## 🛠️ Prerequisites & Installation

### 1. PostgreSQL C++ Library (libpq)
On Ubuntu/Debian, install the PostgreSQL development headers:
```bash
sudo apt-get install libpq-dev
```

### 2. Building the C++ Benchmarks
From the **project root directory**:
```bash
mkdir -p build
cd build
cmake ..
make cpm_db_benchmarks
```
This will compile the `cpm_db_benchmarks` binary inside `build/benchmarks/db/`.

---

## 🚀 Running the Benchmarks

### 1. Running C++ DB Benchmarks
All commands must be run from the **project root directory** to write results to `benchmarks/db/results/` correctly. Make sure your database server is running and populated.

```bash
# Load environment variables (like DATABASE_URL) and run
export $(cat .env | xargs)
./build/benchmarks/db/cpm_db_benchmarks
```

### 2. Running Concurrency Stress Tests (Locust)
Locust tests require both the Next.js web application and database to be running. Start the web server with `DISABLE_RATE_LIMIT=true` to prevent rate limiting from blocking the load test:

```bash
# Terminal 1: Start Next.js
DISABLE_RATE_LIMIT=true npm run dev
```

```bash
# Terminal 2: Install Locust and run load test
pip install locust

# Option A: Start Locust Web UI (on http://localhost:8089)
locust -f benchmarks/db/locustfile.py --host http://localhost:3000

# Option B: Run Headless (e.g. 50 users, spawn rate of 5, duration of 1 minute)
locust -f benchmarks/db/locustfile.py --host http://localhost:3000 --headless -u 50 -r 5 --run-time 1m
```

---

## 💾 CSV Output Format

Each benchmark writes its results to `benchmarks/db/results/<test_name>.csv` with the following columns:
`timestamp,test_name,concurrency,duration_sec,total_operations,successful_operations,failed_operations,avg_latency_ms,median_latency_ms,p95_latency_ms,p99_latency_ms,throughput_ops_sec`
