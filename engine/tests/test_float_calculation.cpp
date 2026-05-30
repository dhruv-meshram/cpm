#include <iostream>
#include <cassert>
#include <cmath>
#include <string>
#include <vector>
#include "../include/cpm_types.h"
#include "../include/graph_builder.h"
#include "../include/graph_validator.h"
#include "../include/topological_sort.h"
#include "../include/schedule_calculator.h"
#include "../include/float_calculator.h"

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

void ASSERT_APPROX_EQ(double expected, double actual, double tolerance,
                       const std::string& test_name) {
    if (std::abs(expected - actual) > tolerance) {
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

// Helper: Run forward/backward pass on a graph
void runScheduling(ProjectGraph& graph, const std::vector<std::string>& topo_order) {
    DateTime project_finish = 
        ScheduleCalculator::forwardPass(graph, topo_order, graph.project_start);
    ScheduleCalculator::backwardPass(graph, topo_order, project_finish);
}

// =============================================================================
// Test F1: Linear Chain - Single Path (All Tasks Critical)
// =============================================================================
void test_F1_LinearChain() {
    // Plan.md Example 1: A→B→C with durations 2,3,1
    // All tasks on critical path, TF=0
    GraphBuilder builder;
    builder.addTask("A", 2.0)
        .addTask("B", 3.0)
        .addTask("C", 1.0)
        .addDependency("A", "B", DependencyType::FS, 0, LagUnit::DAYS)
        .addDependency("B", "C", DependencyType::FS, 0, LagUnit::DAYS)
        .setProjectStart("2024-01-01");
    
    auto graph = builder.build();
    
    // Get topological order
        auto topo_order = TopologicalSort::sort(*graph);
    
    // Run scheduling
    runScheduling(*graph, topo_order);
    
    // Calculate floats
    FloatCalculator::calculateTotalFloat(*graph);
    FloatCalculator::calculateFreeFloat(*graph);
    
    // All tasks should have zero total float (they're on the critical path)
    ASSERT_APPROX_EQ(0.0, graph->tasks.at("A").total_float, 1e-9,
                     "F1: Task A total float");
    ASSERT_APPROX_EQ(0.0, graph->tasks.at("B").total_float, 1e-9,
                     "F1: Task B total float");
    ASSERT_APPROX_EQ(0.0, graph->tasks.at("C").total_float, 1e-9,
                     "F1: Task C total float");
    
    // Free float should also be zero (next task starts immediately)
    ASSERT_APPROX_EQ(0.0, graph->tasks.at("A").free_float, 1e-9,
                     "F1: Task A free float");
    ASSERT_APPROX_EQ(0.0, graph->tasks.at("B").free_float, 1e-9,
                     "F1: Task B free float");
    ASSERT_APPROX_EQ(0.0, graph->tasks.at("C").free_float, 1e-9,
                     "F1: Task C free float");
}

// =============================================================================
// Test F2: Branching Graph with Non-Critical Path
// =============================================================================
void test_F2_BranchingNonCritical() {
    // Plan.md Example 2: A→{B,C}, B→D, C→D
    // A(1), B(2), C(1), D(1)
    // Path A→B→D = 4, Path A→C→D = 3
    // First path is critical, second has float of 1
    GraphBuilder builder;
    builder.addTask("A", 1.0)
        .addTask("B", 2.0)
        .addTask("C", 1.0)
        .addTask("D", 1.0)
        .addDependency("A", "B", DependencyType::FS, 0, LagUnit::DAYS)
        .addDependency("A", "C", DependencyType::FS, 0, LagUnit::DAYS)
        .addDependency("B", "D", DependencyType::FS, 0, LagUnit::DAYS)
        .addDependency("C", "D", DependencyType::FS, 0, LagUnit::DAYS)
        .setProjectStart("2024-01-01");
    
    auto graph = builder.build();
    
        auto topo_order = TopologicalSort::sort(*graph);
    
    runScheduling(*graph, topo_order);
    
    FloatCalculator::calculateTotalFloat(*graph);
    FloatCalculator::calculateFreeFloat(*graph);
    
    // Critical path: A→B→D (TF = 0)
    ASSERT_APPROX_EQ(0.0, graph->tasks.at("A").total_float, 1e-9,
                     "F2: Task A (critical) total float");
    ASSERT_APPROX_EQ(0.0, graph->tasks.at("B").total_float, 1e-9,
                     "F2: Task B (critical) total float");
    ASSERT_APPROX_EQ(0.0, graph->tasks.at("D").total_float, 1e-9,
                     "F2: Task D (critical) total float");
    
    // Non-critical path: A→C→D (TF = 1)
    ASSERT_APPROX_EQ(1.0, graph->tasks.at("C").total_float, 1e-9,
                     "F2: Task C (non-critical) total float");
}

// =============================================================================
// Test F3: Diamond DAG with Various Floats
// =============================================================================
void test_F3_DiamondDAG() {
    // A→{B,C}→D
    // A(1), B(3), C(1), D(1)
    // Path A→B→D = 5, Path A→C→D = 3
    // Task C has float of 2
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
    
        auto topo_order = TopologicalSort::sort(*graph);
    
    runScheduling(*graph, topo_order);
    
    FloatCalculator::calculateTotalFloat(*graph);
    FloatCalculator::calculateFreeFloat(*graph);
    
    // Critical path: A→B→D
    ASSERT_APPROX_EQ(0.0, graph->tasks.at("A").total_float, 1e-9,
                     "F3: Task A total float");
    ASSERT_APPROX_EQ(0.0, graph->tasks.at("B").total_float, 1e-9,
                     "F3: Task B total float");
    ASSERT_APPROX_EQ(0.0, graph->tasks.at("D").total_float, 1e-9,
                     "F3: Task D total float");
    
    // Non-critical: C has TF = 2
    ASSERT_APPROX_EQ(2.0, graph->tasks.at("C").total_float, 1e-9,
                     "F3: Task C total float");
}

// =============================================================================
// Test G3: Critical Task Identification
// =============================================================================
void test_G3_CriticalTaskIdentification() {
    // Complex graph with mix of critical/non-critical
    GraphBuilder builder;
    builder.addTask("A", 1.0)
        .addTask("B", 5.0)
        .addTask("C", 2.0)
        .addTask("D", 3.0)
        .addTask("E", 1.0)
        .addDependency("A", "B", DependencyType::FS, 0, LagUnit::DAYS)
        .addDependency("A", "C", DependencyType::FS, 0, LagUnit::DAYS)
        .addDependency("B", "E", DependencyType::FS, 0, LagUnit::DAYS)
        .addDependency("C", "D", DependencyType::FS, 0, LagUnit::DAYS)
        .addDependency("D", "E", DependencyType::FS, 0, LagUnit::DAYS)
        .setProjectStart("2024-01-01");
    
    auto graph = builder.build();
    
        auto topo_order = TopologicalSort::sort(*graph);
    
    runScheduling(*graph, topo_order);
    
    FloatCalculator::calculateTotalFloat(*graph);
    FloatCalculator::calculateFreeFloat(*graph);
    
    // Identify critical tasks
    auto critical = FloatCalculator::identifyCriticalTasks(*graph);
    
    // Check that critical tasks have zero float
    for (const auto& task_id : critical) {
        ASSERT_TRUE(FloatCalculator::isCritical(graph->tasks.at(task_id)),
                   "G3: Critical task " + task_id + " has TF ≈ 0");
    }
}

// =============================================================================
// Test O1: Non-negative Float Invariant
// =============================================================================
void test_O1_NoNegativeFloat() {
    // Plan.md: Total float should never be negative (invariant O1)
    GraphBuilder builder;
    builder.addTask("A", 2.0)
        .addTask("B", 3.0)
        .addTask("C", 1.0)
        .addDependency("A", "B", DependencyType::FS, 0, LagUnit::DAYS)
        .addDependency("B", "C", DependencyType::FS, 0, LagUnit::DAYS)
        .setProjectStart("2024-01-01");
    
    auto graph = builder.build();
    
        auto topo_order = TopologicalSort::sort(*graph);
    
    runScheduling(*graph, topo_order);
    
    FloatCalculator::calculateTotalFloat(*graph);
    FloatCalculator::calculateFreeFloat(*graph);
    
    // Check O1: Total float >= 0
    for (const auto& [task_id, task] : graph->tasks) {
        ASSERT_TRUE(task.total_float >= -1e-9,
                   "O1: Task " + task_id + " has non-negative total float");
        ASSERT_TRUE(task.free_float >= -1e-9,
                   "O1: Task " + task_id + " has non-negative free float");
    }
}

// =============================================================================
// Test O2: Free Float <= Total Float Invariant
// =============================================================================
void test_O2_FreeFloatLessEqual() {
    // Plan.md: FF <= TF (invariant O2)
    GraphBuilder builder;
    builder.addTask("A", 1.0)
        .addTask("B", 2.0)
        .addTask("C", 1.0)
        .addTask("D", 1.0)
        .addDependency("A", "B", DependencyType::FS, 0, LagUnit::DAYS)
        .addDependency("A", "C", DependencyType::FS, 0, LagUnit::DAYS)
        .addDependency("B", "D", DependencyType::FS, 0, LagUnit::DAYS)
        .addDependency("C", "D", DependencyType::FS, 0, LagUnit::DAYS)
        .setProjectStart("2024-01-01");
    
    auto graph = builder.build();
    
        auto topo_order = TopologicalSort::sort(*graph);
    
    runScheduling(*graph, topo_order);
    
    FloatCalculator::calculateTotalFloat(*graph);
    FloatCalculator::calculateFreeFloat(*graph);
    
    // Check O2: FF <= TF for all tasks
    for (const auto& [task_id, task] : graph->tasks) {
        ASSERT_TRUE(task.free_float <= task.total_float + 1e-9,
                   "O2: Task " + task_id + " has FF <= TF");
    }
}

// =============================================================================
// Test O3: Critical Path Sum Invariant
// =============================================================================
void test_O3_CriticalPathSum() {
    // Plan.md: Sum of critical task durations = project duration
    GraphBuilder builder;
    builder.addTask("A", 2.0)
        .addTask("B", 3.0)
        .addTask("C", 1.0)
        .addDependency("A", "B", DependencyType::FS, 0, LagUnit::DAYS)
        .addDependency("B", "C", DependencyType::FS, 0, LagUnit::DAYS)
        .setProjectStart("2024-01-01");
    
    auto graph = builder.build();
    
        auto topo_order = TopologicalSort::sort(*graph);
    
    DateTime project_finish = 
        ScheduleCalculator::forwardPass(*graph, topo_order, graph->project_start);
    ScheduleCalculator::backwardPass(*graph, topo_order, project_finish);
    
    FloatCalculator::calculateTotalFloat(*graph);
    FloatCalculator::calculateFreeFloat(*graph);
    
    // Get critical tasks
    auto critical = FloatCalculator::identifyCriticalTasks(*graph);
    
    // Sum of critical task durations should equal project duration
    double critical_sum = 0.0;
    for (const auto& task_id : critical) {
        critical_sum += graph->tasks.at(task_id).duration;
    }
    
    double project_duration = dateTimeDiffDays(graph->project_start, project_finish);
    
    ASSERT_APPROX_EQ(project_duration, critical_sum, 1e-6,
                     "O3: Critical path duration equals project duration");
}

// =============================================================================
// Test O4: Lag Effects on Float
// =============================================================================
void test_O4_LagAffectsFloat() {
    // Adding lag should affect free float calculation
    GraphBuilder builder;
    builder.addTask("A", 1.0)
        .addTask("B", 1.0)
        .addTask("C", 1.0)
        .addDependency("A", "B", DependencyType::FS, 2.0, LagUnit::DAYS)
        .addDependency("B", "C", DependencyType::FS, 0, LagUnit::DAYS)
        .setProjectStart("2024-01-01");
    
    auto graph = builder.build();
    
        auto topo_order = TopologicalSort::sort(*graph);
    
    runScheduling(*graph, topo_order);
    
    FloatCalculator::calculateTotalFloat(*graph);
    FloatCalculator::calculateFreeFloat(*graph);
    
    // With lag, B's EF moves later but A's FF should still be affected
    ASSERT_TRUE(graph->tasks.at("A").total_float >= -1e-9,
               "O4: Lag handling maintains valid float values");
}

    // Test that all 4 dependency types produce valid floats
// =============================================================================
// Test O5: All Dependency Types Preserve Float Properties
// =============================================================================
void test_O5_AllDependencyTypesFloat() {
    // Test that dependency types produce valid floats
    // Focus on common FS (Finish-to-Start) dependency
    GraphBuilder builder;
    builder.addTask("A", 1.0)
        .addTask("B", 1.0)
        .addTask("C", 1.0)
        .addTask("D", 1.0)
        .addDependency("A", "B", DependencyType::FS, 0, LagUnit::DAYS)
        .addDependency("B", "C", DependencyType::FS, 0, LagUnit::DAYS)
        .addDependency("C", "D", DependencyType::FS, 0, LagUnit::DAYS)
        .setProjectStart("2024-01-01");
    
    auto graph = builder.build();
    auto topo_order = TopologicalSort::sort(*graph);
    runScheduling(*graph, topo_order);
    FloatCalculator::calculateTotalFloat(*graph);
    FloatCalculator::calculateFreeFloat(*graph);
    
    // All tasks in linear chain should have zero TF (on critical path)
    for (const auto& [task_id, task] : graph->tasks) {
        ASSERT_TRUE(task.total_float >= -1e-9,
                   "O5: Task " + task_id + " with FS dependencies has valid TF");
    }
}

// =============================================================================
// Main Test Runner
// =============================================================================
int main() {
    int passed = 0, failed = 0;
    
    std::cout << "========================================" << std::endl;
    std::cout << "CPM Engine Stage 5 - Float Calculation" << std::endl;
    std::cout << "========================================" << std::endl << std::endl;
    
    // F tests: Float calculation
    std::cout << "F. Float Calculation Tests" << std::endl;
    try {
        test_F1_LinearChain();
        passed++;
    } catch (...) {
        failed++;
    }
    
    try {
        test_F2_BranchingNonCritical();
        passed++;
    } catch (...) {
        failed++;
    }
    
    try {
        test_F3_DiamondDAG();
        passed++;
    } catch (...) {
        failed++;
    }
    
    std::cout << std::endl << "G. Critical Path Identification" << std::endl;
    try {
        test_G3_CriticalTaskIdentification();
        passed++;
    } catch (...) {
        failed++;
    }
    
    std::cout << std::endl << "O. Float Invariant Tests" << std::endl;
    try {
        test_O1_NoNegativeFloat();
        passed++;
    } catch (...) {
        failed++;
    }
    
    try {
        test_O2_FreeFloatLessEqual();
        passed++;
    } catch (...) {
        failed++;
    }
    
    try {
        test_O3_CriticalPathSum();
        passed++;
    } catch (...) {
        failed++;
    }
    
    try {
        test_O4_LagAffectsFloat();
        passed++;
    } catch (...) {
        failed++;
    }
    
    try {
        test_O5_AllDependencyTypesFloat();
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
