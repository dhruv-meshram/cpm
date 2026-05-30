# Benchmark Highlights & Operational Guidance

- Interactive/real-time: recommended project sizes <= 500 tasks for responsive UX.
- Batch processing: up to 2k nodes acceptable with patience; 5k+ shows significant slowdown.
- CSV note: existing benchmark CSVs use `paths` column for critical-path count — documented here. Consider migrating to `critical_path_count` in a future release.

Running a subset of scenarios
----------------------------

The benchmark harness supports running a subset of scenarios by setting the environment variable `BENCHMARK_IDS` to a comma-separated list of scenario ids. Example:

```bash
# run three representative scenarios: A1 (50 nodes), A2 (500 nodes), B1 (linear 1k nodes)
BENCHMARK_IDS=A1,A2,B1 ./build/benchmark_validation
```

This creates the same `reports/benchmark_<timestamp>/` directory but only contains results for the requested scenarios.
