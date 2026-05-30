#include <iostream>
#include <functional>
#include <vector>
#include <string>
#include <cmath>
#include "cpm_types.h"
#include "graph_builder.h"
#include "graph_validator.h"
#include "topological_sort.h"
#include "schedule_calculator.h"

using namespace cpm;

// ============================================================================
// Test Framework
// ============================================================================

class TestResult {
public:
    bool passed;
    std::string name;
    std::string error_message;
    
    TestResult(const std::string& test_name, bool success, 
               const std::string& error = "")
        : passed(success), name(test_name), error_message(error) {}
};

class TestRunner {
private:
    std::vector<TestResult> results;
    int passed_count = 0;
    int failed_count = 0;
    
public:
    void runTest(const std::string& test_name, 
                 std::function<void()> test_func) {
        try {
            test_func();
            results.push_back(TestResult(test_name, true));
            passed_count++;
            std::cout << "✓ " << test_name << std::endl;
        } catch (const std::exception& e) {
            results.push_back(TestResult(test_name, false, e.what()));
            failed_count++;
            std::cout << "✗ " << test_name << " - " << e.what() << std::endl;
        }
    }
    
    void printSummary() {
        std::cout << "\n========================================" << std::endl;
        std::cout << "Test Summary" << std::endl;
        std::cout << "========================================" << std::endl;
        std::cout << "Passed: " << passed_count << std::endl;
        std::cout << "Failed: " << failed_count << std::endl;
        std::cout << "Total:  " << (passed_count + failed_count) << std::endl;
        
        if (failed_count > 0) {
            std::cout << "\nFailed Tests:" << std::endl;
            for (const auto& result : results) {
                if (!result.passed) {
                    std::cout << "  - " << result.name << ": " 
                              << result.error_message << std::endl;
                }
            }
        }
    }
    
    int getExitCode() const {
        return (failed_count > 0) ? 1 : 0;
    }
};

// Custom assertions
#define ASSERT_TRUE(condition) \
    do { \
        if (!(condition)) { \
            throw std::runtime_error("Assertion failed: condition is false"); \
        } \
    } while(0)

#define ASSERT_EQ(expected, actual) \
    do { \
        if (!((expected) == (actual))) { \
            throw std::runtime_error("Assertion failed: values not equal"); \
        } \
    } while(0)

// Delta comparison for doubles (handle floating point imprecision)
#define ASSERT_DOUBLE_EQ(expected, actual, tolerance) \
    do { \
        if (std::abs((expected) - (actual)) > (tolerance)) { \
            throw std::runtime_error("Assertion failed: values not equal within tolerance"); \
        } \
    } while(0)

// ============================================================================
// D. Forward Pass Tests
// ============================================================================

void test_D1_SingleChain() {
    // Test: A(5 days) → B(3 days)
    // Expected: A ES=proj_start, EF=proj_start+5, B ES=proj_start+5, EF=proj_start+8
    GraphBuilder builder;
    builder.setProjectStart("2024-01-01");
    builder.addTask("A", 5.0);
    builder.addTask("B", 3.0);
    builder.addDependency("A", "B");
    
    auto graph = builder.build();
    auto order = TopologicalSort::sort(*graph);
    
    auto project_finish = ScheduleCalculator::forwardPass(*graph, order, graph->project_start);
    
    // Verify ES/EF values
    double days_a_ef = dateTimeDiffDays(graph->project_start, graph->tasks.at("A").early_finish);
    double days_b_es = dateTimeDiffDays(graph->project_start, graph->tasks.at("B").early_start);
    double days_b_ef = dateTimeDiffDays(graph->project_start, graph->tasks.at("B").early_finish);
    
    ASSERT_DOUBLE_EQ(5.0, days_a_ef, 0.1);  // A.EF = proj_start + 5 days
    ASSERT_DOUBLE_EQ(5.0, days_b_es, 0.1);  // B.ES = A.EF = proj_start + 5 days
    ASSERT_DOUBLE_EQ(8.0, days_b_ef, 0.1);  // B.EF = B.ES + 3 = proj_start + 8 days
}

void test_D2_MultiplePredeccessors() {
    // Test: A(5), B(10) both → C(3)
    // Expected: C.ES = max(5, 10) = 10, C.EF = 13
    GraphBuilder builder;
    builder.setProjectStart("2024-01-01");
    builder.addTask("A", 5.0);
    builder.addTask("B", 10.0);
    builder.addTask("C", 3.0);
    builder.addDependency("A", "C");
    builder.addDependency("B", "C");
    
    auto graph = builder.build();
    auto order = TopologicalSort::sort(*graph);
    
    auto project_finish = ScheduleCalculator::forwardPass(*graph, order, graph->project_start);
    
    double days_c_es = dateTimeDiffDays(graph->project_start, graph->tasks.at("C").early_start);
    double days_c_ef = dateTimeDiffDays(graph->project_start, graph->tasks.at("C").early_finish);
    
    ASSERT_DOUBLE_EQ(10.0, days_c_es, 0.1);  // C.ES = max(A.EF, B.EF) = 10
    ASSERT_DOUBLE_EQ(13.0, days_c_ef, 0.1);  // C.EF = C.ES + 3 = 13
}

void test_D3_WideDAG() {
    // Test: A → {B, C, D, E}
    // Expected: All B,C,D,E start after A finishes
    GraphBuilder builder;
    builder.setProjectStart("2024-01-01");
    builder.addTask("A", 2.0);
    builder.addTask("B", 1.0);
    builder.addTask("C", 1.0);
    builder.addTask("D", 1.0);
    builder.addTask("E", 1.0);
    
    builder.addDependency("A", "B");
    builder.addDependency("A", "C");
    builder.addDependency("A", "D");
    builder.addDependency("A", "E");
    
    auto graph = builder.build();
    auto order = TopologicalSort::sort(*graph);
    
    auto project_finish = ScheduleCalculator::forwardPass(*graph, order, graph->project_start);
    
    double days_a_ef = dateTimeDiffDays(graph->project_start, graph->tasks.at("A").early_finish);
    double days_b_es = dateTimeDiffDays(graph->project_start, graph->tasks.at("B").early_start);
    double days_c_es = dateTimeDiffDays(graph->project_start, graph->tasks.at("C").early_start);
    double days_d_es = dateTimeDiffDays(graph->project_start, graph->tasks.at("D").early_start);
    double days_e_es = dateTimeDiffDays(graph->project_start, graph->tasks.at("E").early_start);
    
    // All should start at 2.0 (A finishes at 2)
    ASSERT_DOUBLE_EQ(2.0, days_b_es, 0.1);
    ASSERT_DOUBLE_EQ(2.0, days_c_es, 0.1);
    ASSERT_DOUBLE_EQ(2.0, days_d_es, 0.1);
    ASSERT_DOUBLE_EQ(2.0, days_e_es, 0.1);
}

// ============================================================================
// E. Backward Pass Tests
// ============================================================================

void test_E1_LinearChainBackward() {
    // Test: A(2) → B(3) → C(1)
    // Forward: A: ES=0, EF=2; B: ES=2, EF=5; C: ES=5, EF=6
    // Backward with proj_finish=6: C: LF=6, LS=5; B: LF=5, LS=2; A: LF=2, LS=0
    GraphBuilder builder;
    builder.setProjectStart("2024-01-01");
    builder.addTask("A", 2.0);
    builder.addTask("B", 3.0);
    builder.addTask("C", 1.0);
    builder.addDependency("A", "B");
    builder.addDependency("B", "C");
    
    auto graph = builder.build();
    auto order = TopologicalSort::sort(*graph);
    
    auto project_finish = ScheduleCalculator::forwardPass(*graph, order, graph->project_start);
    ScheduleCalculator::backwardPass(*graph, order, project_finish);
    
    // Verify LS/LF
    double days_a_ls = dateTimeDiffDays(graph->project_start, graph->tasks.at("A").late_start);
    double days_a_lf = dateTimeDiffDays(graph->project_start, graph->tasks.at("A").late_finish);
    double days_b_ls = dateTimeDiffDays(graph->project_start, graph->tasks.at("B").late_start);
    double days_b_lf = dateTimeDiffDays(graph->project_start, graph->tasks.at("B").late_finish);
    double days_c_ls = dateTimeDiffDays(graph->project_start, graph->tasks.at("C").late_start);
    double days_c_lf = dateTimeDiffDays(graph->project_start, graph->tasks.at("C").late_finish);
    
    ASSERT_DOUBLE_EQ(0.0, days_a_ls, 0.1);
    ASSERT_DOUBLE_EQ(2.0, days_a_lf, 0.1);
    ASSERT_DOUBLE_EQ(2.0, days_b_ls, 0.1);
    ASSERT_DOUBLE_EQ(5.0, days_b_lf, 0.1);
    ASSERT_DOUBLE_EQ(5.0, days_c_ls, 0.1);
    ASSERT_DOUBLE_EQ(6.0, days_c_lf, 0.1);
}

void test_E2_MultipleSuccessors() {
    // Test: A → {B, C}, both B,C → D
    // Backward: B must finish by D.LS, C must finish by D.LS
    GraphBuilder builder;
    builder.setProjectStart("2024-01-01");
    builder.addTask("A", 2.0);
    builder.addTask("B", 3.0);
    builder.addTask("C", 5.0);
    builder.addTask("D", 1.0);
    
    builder.addDependency("A", "B");
    builder.addDependency("A", "C");
    builder.addDependency("B", "D");
    builder.addDependency("C", "D");
    
    auto graph = builder.build();
    auto order = TopologicalSort::sort(*graph);
    
    auto project_finish = ScheduleCalculator::forwardPass(*graph, order, graph->project_start);
    ScheduleCalculator::backwardPass(*graph, order, project_finish);
    
    // Both B and C must finish by D.LS = D.LF - 1 = project_finish - 1
    double days_d_ls = dateTimeDiffDays(graph->project_start, graph->tasks.at("D").late_start);
    double days_b_lf = dateTimeDiffDays(graph->project_start, graph->tasks.at("B").late_finish);
    double days_c_lf = dateTimeDiffDays(graph->project_start, graph->tasks.at("C").late_finish);
    
    // Both should be <= D.LS
    ASSERT_TRUE(days_b_lf <= days_d_ls + 0.1);
    ASSERT_TRUE(days_c_lf <= days_d_ls + 0.1);
}

// ============================================================================
// K. Lag/Lead Tests
// ============================================================================

void test_K1_PositiveLag() {
    // Test: A(5) → B(3) with 2-day lag
    // Expected: B.ES = A.EF + 2 = 7, B.EF = 10
    GraphBuilder builder;
    builder.setProjectStart("2024-01-01");
    builder.addTask("A", 5.0);
    builder.addTask("B", 3.0);
    builder.addDependency("A", "B", DependencyType::FS, 2.0, LagUnit::DAYS);
    
    auto graph = builder.build();
    auto order = TopologicalSort::sort(*graph);
    
    auto project_finish = ScheduleCalculator::forwardPass(*graph, order, graph->project_start);
    
    double days_b_es = dateTimeDiffDays(graph->project_start, graph->tasks.at("B").early_start);
    double days_b_ef = dateTimeDiffDays(graph->project_start, graph->tasks.at("B").early_finish);
    
    ASSERT_DOUBLE_EQ(7.0, days_b_es, 0.1);  // A.EF (5) + lag (2)
    ASSERT_DOUBLE_EQ(10.0, days_b_ef, 0.1); // B.ES (7) + duration (3)
}

void test_K2_NegativeLagLead() {
    // Test: A(5) → B(3) with -1 day lag (lead/overlap)
    // Expected: B.ES = A.EF - 1 = 4 (can start 1 day before A finishes)
    GraphBuilder builder;
    builder.setProjectStart("2024-01-01");
    builder.addTask("A", 5.0);
    builder.addTask("B", 3.0);
    builder.addDependency("A", "B", DependencyType::FS, -1.0, LagUnit::DAYS);
    
    auto graph = builder.build();
    auto order = TopologicalSort::sort(*graph);
    
    auto project_finish = ScheduleCalculator::forwardPass(*graph, order, graph->project_start);
    
    double days_b_es = dateTimeDiffDays(graph->project_start, graph->tasks.at("B").early_start);
    double days_b_ef = dateTimeDiffDays(graph->project_start, graph->tasks.at("B").early_finish);
    
    ASSERT_DOUBLE_EQ(4.0, days_b_es, 0.1);  // A.EF (5) - lead (1)
    ASSERT_DOUBLE_EQ(7.0, days_b_ef, 0.1);  // B.ES (4) + duration (3)
}

// ============================================================================
// Main Test Runner
// ============================================================================

int main() {
    TestRunner runner;
    
    std::cout << "========================================" << std::endl;
    std::cout << "CPM Engine Stage 4 - Schedule Calculation" << std::endl;
    std::cout << "========================================" << std::endl << std::endl;
    
    // D: Forward Pass Tests
    std::cout << "D. Forward Pass Tests (ES/EF)" << std::endl;
    runner.runTest("D1: Single chain A→B", test_D1_SingleChain);
    runner.runTest("D2: Multiple predecessors", test_D2_MultiplePredeccessors);
    runner.runTest("D3: Wide DAG (one source)", test_D3_WideDAG);
    
    // E: Backward Pass Tests
    std::cout << "\nE. Backward Pass Tests (LS/LF)" << std::endl;
    runner.runTest("E1: Linear chain backward", test_E1_LinearChainBackward);
    runner.runTest("E2: Multiple successors", test_E2_MultipleSuccessors);
    
    // K: Lag/Lead Tests
    std::cout << "\nK. Lag/Lead Tests" << std::endl;
    runner.runTest("K1: Positive lag (2 days)", test_K1_PositiveLag);
    runner.runTest("K2: Negative lag (lead -1 day)", test_K2_NegativeLagLead);
    
    // Print summary
    runner.printSummary();
    
    return runner.getExitCode();
}
