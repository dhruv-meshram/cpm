# CPM Benchmark Report | 2026-05-30T20:53:56Z

## Executive Summary
Total scenarios run: 3
Status: PASS

## System Configuration
CPU: 13th Gen Intel(R) Core(TM) i7-1355U (12 cores)
Memory: 15.1701 GB
OS: _CODENAME=noble 22.3"
Compiler: g++ 13.3.0
Build Flags: -O3 -Wall -Wextra

## Scenario Results

| Scenario | Nodes | Edges | Build (µs) | Topo (µs) | Fwd (µs) | Bwd (µs) | Float (µs) | Total (µs) | Memory (MB) | Paths |
|----------|-------|-------|-----------|-----------|---------|---------|-----------|-----------|------------|-------|
| A1 | 50 | 8 | 205 | 47 | 26 | 33 | 16 | 122 | 0.05 | 1 |
| A2 | 500 | 974 | 15130 | 1046 | 6987 | 7224 | 482 | 15739 | 0.49 | 1 |
| B1 | 1000 | 999 | 2533 | 1740 | 10112 | 10325 | 770 | 22947 | 0.98 | 1 |

## Notes
- Timings in microseconds (µs)
- Memory estimates based on task count
- All scenarios completed successfully
