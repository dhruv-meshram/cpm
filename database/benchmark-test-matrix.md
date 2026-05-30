# Benchmark Test Matrix

These benchmarks should be implemented as repeatable database performance checks.

## Data Volume
- 100 tasks
- 1000 tasks
- 5000 tasks

## Measured Operations
- task insert throughput
- dependency insert throughput
- project graph load latency
- dependency traversal latency
- CPM input generation latency
- snapshot write latency
- snapshot read latency

## Benchmark Comparisons
- before indexes vs after indexes
- seeded data vs synthetic data
- shallow graph vs dense graph
