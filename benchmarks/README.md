# CPM Engine Benchmarking Suite

This directory contains a comprehensive benchmarking suite for the C++ Critical Path Method (CPM) Engine. The suite is designed to measure various performance aspects, including runtime, scalability, and memory consumption, for all major CPM operations.

## Structure

The benchmarks are organized under `benchmarks/cpm_engine/`.
- `CMakeLists.txt`: CMake configuration for building the benchmark executable.
- `benchmark_main.cpp`: Orchestrates the execution of all individual benchmarks.
- `benchmark_utils.hpp`/`.cpp`: Provides utility functions for high-resolution timing, CSV writing, and memory measurement.
- `graph_generator.hpp`/`.cpp`: Generates Directed Acyclic Graphs (DAGs) of various sizes and densities for testing.
- Individual benchmark files (e.g., `topo_sort_benchmark.cpp`, `memory_benchmark.cpp`): Implement specific performance tests.
- `results/`: This directory will contain the generated CSV output files from benchmark runs.

## Building the Benchmarks

To build the benchmark executable, navigate to the `build` directory (or create it if it doesn't exist) and run CMake, then make:

```bash
# From the project root directory
mkdir -p build
cd build
cmake ..
make cpm_benchmarks
```

This will create an executable named `cpm_benchmarks` in `build/benchmarks/cpm_engine/`.

## Running the Benchmarks

To run the entire benchmark suite, execute the `cpm_benchmarks` executable from the **project root directory**. This is important because the benchmark suite expects to write its results to `benchmarks/cpm_engine/results/` relative to the execution path.

```bash
# From the project root directory (/home/dhruv/Documents/cpm)
./build/benchmarks/cpm_engine/cpm_benchmarks
```

During execution, the terminal will display real-time status updates, including:
- Benchmark start and end messages.
- Current graph size (nodes and edges) being processed.
- Average runtime for each test.
- Throughput metrics where applicable.

## Output

Upon completion, all benchmark results will be saved as CSV files within the `benchmarks/cpm_engine/results/` directory. Each `.csv` file corresponds to a specific benchmark (e.g., `topo_sort.csv`, `memory_usage.csv`). These files can be used for further analysis and plotting.
