#include <iostream>
#include <cassert>
#include <cmath>
#include <string>
#include <vector>
#include <algorithm>
#include "../include/cpm_types.h"
#include "../include/graph_builder.h"
#include "../include/graph_validator.h"
#include "../include/topological_sort.h"
#include "../include/schedule_calculator.h"
#include "../include/float_calculator.h"
#include "../include/critical_path_finder.h"

using namespace cpm;

// Test utilities
template<typename T>
void ASSERT_EQ(T expected, T actual, const std::string& test_name) {
    if (!(expected == actual)) {
        std::cout << "✗ " << test_name << " - Expected: " << expected
                  << ", Got: " << actual << std::endl;
        throw std::runtime_error(test_name);
    }
    std::cout << "✓ " << test_name << std::endl;
}

void ASSERT_TRUE(bool condition, const std::string& test_name) {
    if (!condition) {
        std::cout << "✗ " << test_name << " - Condition is false" << std::endl;
        throw std::runtime_error(test_name);
    }
    std::cout << "✓ " << test_name << std::endl;
}

void ASSERT_APPROX_EQ(double expected, double actual, double tolerance,
                       const std::string& test_name) {
    if (std::abs(expected - actual) > tolerance) {
        std::cout << "✗ " << test_name << " - Expected: " << expected
                  << ", Got: " << actual << std::endl;
        throw std::runtime_error(test_name);
    }
    std::cout << "✓ " << test_name << std::endl;
}

// Helper: Run full scheduling pipeline
void runFullScheduling(ProjectGraph& graph) {
    auto topo_order = TopologicalSort::sort(graph);
    DateTime project_finish = 
        ScheduleCalculator::forwardPass(graph, topo_order, graph.project_start);
    ScheduleCalculator::backwardPass(graph, topo_order, project_finish);
    FloatCalculator::calculateTotalFloat(graph);
    FloatCalculator::calculateFreeFloat(graph);
}

// =============================================================================
// Test G1: Linear Chain - Single Critical Path
// =============================================================================
void test_G1_LinearChain() {
    // Plan.md Example 1: A→B→C (all critical)
    GraphBuilder builder;
    builder.addTask("A", 2.0)
        .addTask("B", 3.0)
        .addTask("C", 1.0)
        .addDependency("A", "B", DependencyType::FS, 0, LagUnit::DAYS)
        .addDependency("B", "C", DependencyType::FS, 0, LagUnit::DAYS)
        .setProjectStart("2024-01-01");
    
    auto graph = builder.build();
    runFullScheduling(*graph);
    
    // Find critical paths
    auto critical_paths = CriticalPathFinder::findAllCriticalPaths(*graph);
    
    // Should have exactly 1 critical path: A→B→C
    ASSERT_EQ(static_cast<size_t>(1), critical_paths.size(),
              "G1: Linear chain has 1 critical path");
    
    ASSERT_EQ(static_cast<size_t>(3), critical_paths[0].size(),
              "G1: Critical path has 3 tasks");
    
    ASSERT_EQ(std::string("A"), critical_paths[0][0],
              "G1: Path starts with A");
    ASSERT_EQ(std::string("B"), critical_paths[0][1],
              "G1: Path continues with B");
    ASSERT_EQ(std::string("C"), critical_paths[0][2],
              "G1: Path ends with C");
}

// =============================================================================
// Test G2: Branching Graph - Multiple Critical Paths
// =============================================================================
void test_G2_BranchingMultiplePaths() {
    // A(1)→{B(1),C(1)}→D(1)
    // All critical, two paths: A→B→D and A→C→D
    GraphBuilder builder;
    builder.addTask("A", 1.0)
        .addTask("B", 1.0)
        .addTask("C", 1.0)
        .addTask("D", 1.0)
        .addDependency("A", "B", DependencyType::FS, 0, LagUnit::DAYS)
        .addDependency("A", "C", DependencyType::FS, 0, LagUnit::DAYS)
        .addDependency("B", "D", DependencyType::FS, 0, LagUnit::DAYS)
        .addDependency("C", "D", DependencyType::FS, 0, LagUnit::DAYS)
        .setProjectStart("2024-01-01");
    
    auto graph = builder.build();
    runFullScheduling(*graph);
    
    auto critical_paths = CriticalPathFinder::findAllCriticalPaths(*graph);
    
    // Should have 2 critical paths
    ASSERT_EQ(static_cast<size_t>(2), critical_paths.size(),
              "G2: Branching graph has 2 critical paths");
    
    // Both paths should start with A and end with D
    for (const auto& path : critical_paths) {
        ASSERT_EQ(static_cast<size_t>(3), path.size(),
                  "G2: Each critical path has 3 tasks");
        ASSERT_EQ(std::string("A"), path[0],
                  "G2: All paths start with A");
        ASSERT_EQ(std::string("D"), path[2],
                  "G2: All paths end with D");
    }
}

// =============================================================================
// Test G3: Diamond DAG - Path with Non-Critical Node
// =============================================================================
void test_G3_DiamondWithNonCritical() {
    // A(1)→{B(3),C(1)}→D(1)
    // Critical path: A→B→D (4), Non-critical: C (TF=2)
    GraphBuilder builder;
    builder.addTask("A", 1.0)
        .addTask("B", 3.0)
        .addTask("C", 1.0)
        .addTask("D", 1.0)
        .addDependency("A", "B", DependencyType::FS, 0, LagUnit::DAYS)
        .addDependency("A", "C", DependencyType::FS, 0, LagUnit::DAYS)
        .addDependency("B", "D", DependencyType::FS, 0, LagUnit::DAYS)
        .addDependency("C", "D", DependencyType::FS, 0, LagUnit::DAYS)
        .setProjectStart("2024-01-01");
    
    auto graph = builder.build();
    runFullScheduling(*graph);
    
    auto critical_paths = CriticalPathFinder::findAllCriticalPaths(*graph);
    
    // Should have exactly 1 critical path: A→B→D
    ASSERT_EQ(static_cast<size_t>(1), critical_paths.size(),
              "G3: Diamond with non-critical node has 1 critical path");
    
    ASSERT_EQ(static_cast<size_t>(3), critical_paths[0].size(),
              "G3: Critical path has 3 tasks (excludes C)");
    
    ASSERT_EQ(std::string("C"), graph->tasks.at("C").id,
              "G3: Task C exists in graph");
    
    // C should NOT be in the critical path
    auto path = critical_paths[0];
    bool c_in_path = std::find(path.begin(), path.end(), std::string("C")) != path.end();
    ASSERT_TRUE(!c_in_path,
               "G3: Non-critical task C is not in critical path");
}

// =============================================================================
// Test G4: Complex Graph with Multiple Paths
// =============================================================================
void test_G4_ComplexGraph() {
    // A(1) → {B(2), C(1)} → {D(1), E(1)} → F(1)
    // Many potential paths, but only critical ones should be returned
    GraphBuilder builder;
    builder.addTask("A", 1.0)
        .addTask("B", 2.0)
        .addTask("C", 1.0)
        .addTask("D", 1.0)
        .addTask("E", 1.0)
        .addTask("F", 1.0)
        .addDependency("A", "B", DependencyType::FS, 0, LagUnit::DAYS)
        .addDependency("A", "C", DependencyType::FS, 0, LagUnit::DAYS)
        .addDependency("B", "D", DependencyType::FS, 0, LagUnit::DAYS)
        .addDependency("B", "E", DependencyType::FS, 0, LagUnit::DAYS)
        .addDependency("C", "D", DependencyType::FS, 0, LagUnit::DAYS)
        .addDependency("C", "E", DependencyType::FS, 0, LagUnit::DAYS)
        .addDependency("D", "F", DependencyType::FS, 0, LagUnit::DAYS)
        .addDependency("E", "F", DependencyType::FS, 0, LagUnit::DAYS)
        .setProjectStart("2024-01-01");
    
    auto graph = builder.build();
    runFullScheduling(*graph);
    
    auto critical_paths = CriticalPathFinder::findAllCriticalPaths(*graph);
    
    // All tasks are critical (only one path through has duration 4)
    // Actually, A→B→D→F and A→B→E→F have same duration
    ASSERT_TRUE(critical_paths.size() > 0,
               "G4: Complex graph has at least 1 critical path");
    
    // All paths should start with A and end with F
    for (const auto& path : critical_paths) {
        ASSERT_EQ(std::string("A"), path.front(),
                  "G4: All critical paths start with A");
        ASSERT_EQ(std::string("F"), path.back(),
                  "G4: All critical paths end with F");
    }
}

// =============================================================================
// Test Path Verification - Duration Calculation
// =============================================================================
void test_PathDurationCalculation() {
    // Verify that path durations are calculated correctly
    GraphBuilder builder;
    builder.addTask("A", 2.0)
        .addTask("B", 3.0)
        .addTask("C", 1.5)
        .addDependency("A", "B", DependencyType::FS, 0, LagUnit::DAYS)
        .addDependency("B", "C", DependencyType::FS, 0, LagUnit::DAYS)
        .setProjectStart("2024-01-01");
    
    auto graph = builder.build();
    runFullScheduling(*graph);
    
    auto critical_paths = CriticalPathFinder::findAllCriticalPaths(*graph);
    
    ASSERT_EQ(static_cast<size_t>(1), critical_paths.size(),
              "PathDuration: Single critical path");
    
    auto path = critical_paths[0];
    double duration = CriticalPathFinder::calculatePathDuration(*graph, path);
    
    // Duration should be 2 + 3 + 1.5 = 6.5
    ASSERT_APPROX_EQ(6.5, duration, 1e-9,
                     "PathDuration: Calculated correctly");
}

// =============================================================================
// Test Critical Start/End Detection
// =============================================================================
void test_CriticalStartEnd() {
    // A(1)→B(1)→C(1) with D(0.5) non-critical parallel path
    GraphBuilder builder;
    builder.addTask("A", 1.0)
        .addTask("B", 1.0)
        .addTask("C", 1.0)
        .addTask("D", 0.5)
        .addDependency("A", "B", DependencyType::FS, 0, LagUnit::DAYS)
        .addDependency("B", "C", DependencyType::FS, 0, LagUnit::DAYS)
        .addDependency("A", "D", DependencyType::FS, 0, LagUnit::DAYS)
        .setProjectStart("2024-01-01");
    
    auto graph = builder.build();
    runFullScheduling(*graph);
    
    // A should be a critical start (critical but no critical predecessors)
    ASSERT_TRUE(CriticalPathFinder::isCriticalStart(*graph, "A"),
               "CriticalStart: A is critical start");
    
    // C should be a critical end (critical but no critical successors)
    ASSERT_TRUE(CriticalPathFinder::isCriticalEnd(*graph, "C"),
               "CriticalEnd: C is critical end");
    
    // B should be neither (has both critical pred and succ)
    ASSERT_TRUE(!CriticalPathFinder::isCriticalStart(*graph, "B"),
               "CriticalStart: B is not start");
    ASSERT_TRUE(!CriticalPathFinder::isCriticalEnd(*graph, "B"),
               "CriticalEnd: B is not end");
}

// =============================================================================
// Test Longest Path Finding
// =============================================================================
void test_LongestPath() {
    // Multiple paths, verify longest is selected
    // A→{B,C}→D where B is longest
    GraphBuilder builder;
    builder.addTask("A", 1.0)
        .addTask("B", 10.0)
        .addTask("C", 1.0)
        .addTask("D", 1.0)
        .addDependency("A", "B", DependencyType::FS, 0, LagUnit::DAYS)
        .addDependency("A", "C", DependencyType::FS, 0, LagUnit::DAYS)
        .addDependency("B", "D", DependencyType::FS, 0, LagUnit::DAYS)
        .addDependency("C", "D", DependencyType::FS, 0, LagUnit::DAYS)
        .setProjectStart("2024-01-01");
    
    auto graph = builder.build();
    runFullScheduling(*graph);
    
    auto longest = CriticalPathFinder::findLongestCriticalPath(*graph);
    
    // Should be A→B→D or similar with B
    ASSERT_EQ(std::string("B"), longest[1],
              "LongestPath: Includes longest task B");
    
    double longest_duration = CriticalPathFinder::calculatePathDuration(*graph, longest);
    ASSERT_APPROX_EQ(12.0, longest_duration, 1e-6,
                     "LongestPath: Duration is 1+10+1=12");
}

// =============================================================================
// Main Test Runner
// =============================================================================
int main() {
    int passed = 0, failed = 0;
    
    std::cout << "========================================" << std::endl;
    std::cout << "CPM Engine Stage 6 - Critical Path Finding" << std::endl;
    std::cout << "========================================" << std::endl << std::endl;
    
    std::cout << "G. Critical Path Extraction Tests" << std::endl;
    try {
        test_G1_LinearChain();
        passed++;
    } catch (...) {
        failed++;
    }
    
    try {
        test_G2_BranchingMultiplePaths();
        passed++;
    } catch (...) {
        failed++;
    }
    
    try {
        test_G3_DiamondWithNonCritical();
        passed++;
    } catch (...) {
        failed++;
    }
    
    try {
        test_G4_ComplexGraph();
        passed++;
    } catch (...) {
        failed++;
    }
    
    std::cout << std::endl << "Path Verification Tests" << std::endl;
    try {
        test_PathDurationCalculation();
        passed++;
    } catch (...) {
        failed++;
    }
    
    try {
        test_CriticalStartEnd();
        passed++;
    } catch (...) {
        failed++;
    }
    
    try {
        test_LongestPath();
        passed++;
    } catch (...) {
        failed++;
    }
    
    std::cout << std::endl << "========================================" << std::endl;
    std::cout << "Test Summary" << std::endl;
    std::cout << "========================================" << std::endl;
    std::cout << "Passed: " << passed << std::endl;
    std::cout << "Failed: " << failed << std::endl;
    std::cout << "Total:  " << (passed + failed) << std::endl;
    
    return failed == 0 ? 0 : 1;
}
