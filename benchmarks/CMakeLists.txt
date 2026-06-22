cmake_minimum_required(VERSION 3.10)
project(cpm_benchmarks_all)

# Build both C++ benchmarking targets
add_subdirectory(cpm_engine)
add_subdirectory(db)
