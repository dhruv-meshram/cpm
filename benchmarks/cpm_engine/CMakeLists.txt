cmake_minimum_required(VERSION 3.10)

# C++ Standard (matching core project)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

set(BENCHMARK_SOURCES
    benchmark_main.cpp
    benchmark_utils.cpp
    graph_generator.cpp
    topo_sort_benchmark.cpp
    forward_pass_benchmark.cpp
    backward_pass_benchmark.cpp
    slack_benchmark.cpp
    critical_path_benchmark.cpp
    full_pipeline_benchmark.cpp
    memory_benchmark.cpp
    scalability_benchmark.cpp
)

add_executable(cpm_benchmarks ${BENCHMARK_SOURCES})

target_link_libraries(cpm_benchmarks
    PRIVATE cpm_core
)

target_include_directories(cpm_benchmarks PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/../../engine/include
    ${CMAKE_CURRENT_SOURCE_DIR}
)

# Ensure results directory exists in build folder if needed, 
# but for now we expect it in the source tree as per instructions.
