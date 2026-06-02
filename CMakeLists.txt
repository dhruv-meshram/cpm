cmake_minimum_required(VERSION 3.10)
project(cpm-engine VERSION 1.0.0 LANGUAGES CXX)

# C++ Standard
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -Wall -Wextra -Wpedantic")

# Output directories
set(CMAKE_LIBRARY_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/lib")
set(CMAKE_EXECUTABLE_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/bin")

# Include directories
include_directories(${CMAKE_CURRENT_SOURCE_DIR}/engine/include)

# ============================================================================
# Core Library (cpm_core)
# ============================================================================

add_library(cpm_core STATIC
    engine/src/graph_builder.cpp
    engine/src/graph_validator.cpp
    engine/src/topological_sort.cpp
    engine/src/schedule_calculator.cpp
    engine/src/float_calculator.cpp
    engine/src/critical_path_finder.cpp
)

target_include_directories(cpm_core PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}/engine/include
)

target_compile_features(cpm_core PRIVATE cxx_std_17)

enable_testing()

# ============================================================================
# Test Executables
# ============================================================================

# Test: Graph Construction
add_executable(test_graph_construction
    engine/tests/test_graph_construction.cpp
)
target_link_libraries(test_graph_construction
    PRIVATE cpm_core
)
target_include_directories(test_graph_construction PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/engine/include
)
add_test(NAME GraphConstruction COMMAND test_graph_construction)

set_tests_properties(GraphConstruction PROPERTIES LABELS "unit")

# Test: Graph Validation
add_executable(test_graph_validation
    engine/tests/test_graph_validation.cpp
)
target_link_libraries(test_graph_validation
    PRIVATE cpm_core
)
target_include_directories(test_graph_validation PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/engine/include
)
add_test(NAME GraphValidation COMMAND test_graph_validation)

set_tests_properties(GraphValidation PROPERTIES LABELS "unit")

# Test: Topological Sort
add_executable(test_topological_sort
    engine/tests/test_topological_sort.cpp
)
target_link_libraries(test_topological_sort
    PRIVATE cpm_core
)
target_include_directories(test_topological_sort PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/engine/include
)
add_test(NAME TopologicalSort COMMAND test_topological_sort)

set_tests_properties(TopologicalSort PROPERTIES LABELS "unit")

# Test: Schedule Calculation
add_executable(test_schedule_calculation
    engine/tests/test_schedule_calculation.cpp
)
target_link_libraries(test_schedule_calculation
    PRIVATE cpm_core
)
target_include_directories(test_schedule_calculation PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/engine/include
)
add_test(NAME ScheduleCalculation COMMAND test_schedule_calculation)

set_tests_properties(ScheduleCalculation PROPERTIES LABELS "unit")

# Test: Float Calculation
add_executable(test_float_calculation
    engine/tests/test_float_calculation.cpp
)
target_link_libraries(test_float_calculation
    PRIVATE cpm_core
)
target_include_directories(test_float_calculation PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/engine/include
)
add_test(NAME FloatCalculation COMMAND test_float_calculation)

set_tests_properties(FloatCalculation PROPERTIES LABELS "unit")

# Test: Critical Path Finding
add_executable(test_critical_path_finder
    engine/tests/test_critical_path_finder.cpp
)
target_link_libraries(test_critical_path_finder
    PRIVATE cpm_core
)
target_include_directories(test_critical_path_finder PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/engine/include
)
add_test(NAME CriticalPathFinder COMMAND test_critical_path_finder)

set_tests_properties(CriticalPathFinder PROPERTIES LABELS "unit")

# Test: Validation Phase
add_executable(test_validation_phase
    engine/tests/test_validation_phase.cpp
)
target_link_libraries(test_validation_phase
    PRIVATE cpm_core
)
target_include_directories(test_validation_phase PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/engine/include
)
add_test(NAME ValidationPhase COMMAND test_validation_phase)

set_tests_properties(ValidationPhase PROPERTIES LABELS "validation;phase")

# Test: H-Group (Project Duration)
add_executable(test_validation_H
    engine/tests/test_validation_H_project_duration.cpp
)
target_link_libraries(test_validation_H
    PRIVATE cpm_core
)
target_include_directories(test_validation_H PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/engine/include
)
add_test(NAME ValidationHProjectDuration COMMAND test_validation_H)

set_tests_properties(ValidationHProjectDuration PROPERTIES LABELS "validation;H")

# Test: L-Group (Date Scheduling)
add_executable(test_validation_L
    engine/tests/test_validation_L_date_scheduling.cpp
)
target_link_libraries(test_validation_L
    PRIVATE cpm_core
)
target_include_directories(test_validation_L PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/engine/include
)
add_test(NAME ValidationLDateScheduling COMMAND test_validation_L)

set_tests_properties(ValidationLDateScheduling PROPERTIES LABELS "validation;L")

# Test: N-Group (Randomized / Large-Graph)
add_executable(test_validation_N
    engine/tests/test_validation_N_randomized.cpp
)
target_link_libraries(test_validation_N
    PRIVATE cpm_core
)
target_include_directories(test_validation_N PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/engine/include
)
add_test(NAME ValidationNRandomized COMMAND test_validation_N)

set_tests_properties(ValidationNRandomized PROPERTIES LABELS "validation;N")

# Convenience targets to run groups of tests
add_custom_target(validation
    COMMAND ${CMAKE_CTEST_COMMAND} -L validation --output-on-failure
    COMMENT "Run validation test group (labels: validation)"
)

add_custom_target(unit-tests
    COMMAND ${CMAKE_CTEST_COMMAND} -L unit --output-on-failure
    COMMENT "Run unit test group (labels: unit)"
)

# Benchmarks (not registered as tests to keep CI non-blocking)
add_executable(benchmark_validation
    engine/bench/benchmark_main.cpp
    engine/bench/graph_generator.cpp
    engine/bench/system_info.cpp
    engine/bench/metrics.cpp
)
target_link_libraries(benchmark_validation
    PRIVATE cpm_core
)
target_include_directories(benchmark_validation PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/engine/include
    ${CMAKE_CURRENT_SOURCE_DIR}/engine/bench
)

# CLI JSON Wrapper
add_executable(cpm_cli
    engine/src/cli.cpp
)
target_link_libraries(cpm_cli
    PRIVATE cpm_core
)
target_include_directories(cpm_cli PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/engine/include
)

# ============================================================================
# Build Summary
# ============================================================================

message(STATUS "=====================================")
message(STATUS "CPM Engine Build Configuration")
message(STATUS "=====================================")
message(STATUS "C++ Standard: ${CMAKE_CXX_STANDARD}")
message(STATUS "Build Type: ${CMAKE_BUILD_TYPE}")
message(STATUS "Compiler Flags: ${CMAKE_CXX_FLAGS}")
message(STATUS "=====================================")
