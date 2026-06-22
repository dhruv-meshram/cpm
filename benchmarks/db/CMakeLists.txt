cmake_minimum_required(VERSION 3.10)

# C++ Standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Find PostgreSQL
find_package(PostgreSQL REQUIRED)

# Find Threads
find_package(Threads REQUIRED)

set(DB_BENCHMARK_SOURCES
    benchmark_main.cpp
    db_utils.cpp
    project_creation_benchmark.cpp
    task_insertion_benchmark.cpp
    dependency_insertion_benchmark.cpp
    project_loading_benchmark.cpp
    query_performance_benchmark.cpp
    index_effectiveness_benchmark.cpp
)

add_executable(cpm_db_benchmarks ${DB_BENCHMARK_SOURCES})

target_link_libraries(cpm_db_benchmarks
    PRIVATE 
    PostgreSQL::PostgreSQL
    Threads::Threads
)

target_include_directories(cpm_db_benchmarks PRIVATE
    ${PostgreSQL_INCLUDE_DIRS}
    ${CMAKE_CURRENT_SOURCE_DIR}
)
