#include <iostream>
#include <functional>
#include <vector>
#include <string>
#include <algorithm>
#include "cpm_types.h"
#include "graph_builder.h"
#include "graph_validator.h"
#include "topological_sort.h"

using namespace cpm;

// ============================================================================
// Test Framework (reuse from Stage 1/2)
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
            std::cout << "✗ " << test_name <<  " - " << e.what() << std::endl;
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

#define ASSERT_FALSE(condition) \
    do { \
        if ((condition)) { \
            throw std::runtime_error("Assertion failed: condition is true"); \
        } \
    } while(0)

#define ASSERT_EQ(expected, actual) \
    do { \
        if (!((expected) == (actual))) { \
            throw std::runtime_error("Assertion failed: values not equal"); \
        } \
    } while(0)

#define ASSERT_NE(expected, actual) \
    do { \
        if ((expected) == (actual)) { \
            throw std::runtime_error("Assertion failed: values are equal"); \
        } \
    } while(0)

// Helper: Check if A comes before B in a vector
bool isOrderedBefore(const std::vector<std::string>& order, 
                     const std::string& a, const std::string& b) {
    auto it_a = std::find(order.begin(), order.end(), a);
    auto it_b = std::find(order.begin(), order.end(), b);
    return it_a != order.end() && it_b != order.end() && it_a < it_b;
}

// ============================================================================
// C. Topological Sort Tests
// ============================================================================

void test_C1_LinearGraph() {
    // Test: A → B → C
    // Expected: A before B, B before C
    GraphBuilder builder;
    builder.setProjectStart("2024-01-01");
    builder.addTask("A", 2.0);
    builder.addTask("B", 3.0);
    builder.addTask("C", 1.0);
    builder.addDependency("A", "B");
    builder.addDependency("B", "C");
    
    auto graph = builder.build();
    
    // Validate before proceeding
    auto [is_valid, errors] = GraphValidator::validateGraph(*graph);
    ASSERT_TRUE(is_valid);
    
    // Perform topological sort
    auto order = TopologicalSort::sort(*graph);
    
    // Verify result
    ASSERT_EQ(3u, order.size());
    ASSERT_TRUE(isOrderedBefore(order, "A", "B"));
    ASSERT_TRUE(isOrderedBefore(order, "B", "C"));
    ASSERT_TRUE(isOrderedBefore(order, "A", "C"));
}

void test_C2_BranchingGraph() {
    // Test: A has successors B and C
    // Expected: A before B, A before C
    GraphBuilder builder;
    builder.setProjectStart("2024-01-01");
    builder.addTask("A", 2.0);
    builder.addTask("B", 3.0);
    builder.addTask("C", 1.5);
    builder.addDependency("A", "B");
    builder.addDependency("A", "C");
    
    auto graph = builder.build();
    
    // Validate
    auto [is_valid, errors] = GraphValidator::validateGraph(*graph);
    ASSERT_TRUE(is_valid);
    
    // Topological sort
    auto order = TopologicalSort::sort(*graph);
    
    // Verify
    ASSERT_EQ(3u, order.size());
    ASSERT_TRUE(isOrderedBefore(order, "A", "B"));
    ASSERT_TRUE(isOrderedBefore(order, "A", "C"));
}

void test_C3_DiamondGraph() {
    // Test: A → {B, C} → D
    // Expected: A < B, A < C, B,C < D
    GraphBuilder builder;
    builder.setProjectStart("2024-01-01");
    builder.addTask("A", 2.0);
    builder.addTask("B", 3.0);
    builder.addTask("C", 1.5);
    builder.addTask("D", 2.5);
    
    builder.addDependency("A", "B");
    builder.addDependency("A", "C");
    builder.addDependency("B", "D");
    builder.addDependency("C", "D");
    
    auto graph = builder.build();
    
    // Validate
    auto [is_valid, errors] = GraphValidator::validateGraph(*graph);
    ASSERT_TRUE(is_valid);
    
    // Topological sort
    auto order = TopologicalSort::sort(*graph);
    
    // Verify all constraints
    ASSERT_EQ(4u, order.size());
    ASSERT_TRUE(isOrderedBefore(order, "A", "B"));
    ASSERT_TRUE(isOrderedBefore(order, "A", "C"));
    ASSERT_TRUE(isOrderedBefore(order, "B", "D"));
    ASSERT_TRUE(isOrderedBefore(order, "C", "D"));
}

// ============================================================================
// I. Disconnected Graph Tests
// ============================================================================

void test_I1_TwoIndependentNetworks() {
    // Test: A → B (independent), C → D (independent)
    // Expected: Both networks present in topological order
    GraphBuilder builder;
    builder.setProjectStart("2024-01-01");
    builder.addTask("A", 2.0);
    builder.addTask("B", 3.0);
    builder.addTask("C", 1.5);
    builder.addTask("D", 2.5);
    
    builder.addDependency("A", "B");
    builder.addDependency("C", "D");
    
    auto graph = builder.build();
    
    // Validate
    auto [is_valid, errors] = GraphValidator::validateGraph(*graph);
    ASSERT_TRUE(is_valid);
    
    // Topological sort
    auto order = TopologicalSort::sort(*graph);
    
    // Verify all tasks present
    ASSERT_EQ(4u, order.size());
    ASSERT_TRUE(isOrderedBefore(order, "A", "B"));
    ASSERT_TRUE(isOrderedBefore(order, "C", "D"));
}

void test_I2_IsolatedTask() {
    // Test: A (isolated), B → C
    // Expected: A, B, C all present
    GraphBuilder builder;
    builder.setProjectStart("2024-01-01");
    builder.addTask("A", 2.0);  // No dependencies
    builder.addTask("B", 3.0);
    builder.addTask("C", 1.5);
    
    builder.addDependency("B", "C");
    
    auto graph = builder.build();
    
    // Validate
    auto [is_valid, errors] = GraphValidator::validateGraph(*graph);
    ASSERT_TRUE(is_valid);
    
    // Topological sort
    auto order = TopologicalSort::sort(*graph);
    
    // Verify all tasks present
    ASSERT_EQ(3u, order.size());
    ASSERT_TRUE(isOrderedBefore(order, "B", "C"));
    
    // A should be somewhere in the order (could be anywhere since no dependencies)
    auto it_a = std::find(order.begin(), order.end(), "A");
    ASSERT_FALSE(it_a == order.end());
}

// ============================================================================
// Rank Hints Tests
// ============================================================================

void test_RankHints_LinearChain() {
    // Test: A → B → C
    // Expected: rank(A) < rank(B) < rank(C)
    GraphBuilder builder;
    builder.setProjectStart("2024-01-01");
    builder.addTask("A", 2.0);
    builder.addTask("B", 3.0);
    builder.addTask("C", 1.0);
    builder.addDependency("A", "B");
    builder.addDependency("B", "C");
    
    auto graph = builder.build();
    auto order = TopologicalSort::sort(*graph);
    auto ranks = TopologicalSort::getRankHints(*graph, order);
    
    ASSERT_TRUE(ranks["A"] < ranks["B"]);
    ASSERT_TRUE(ranks["B"] < ranks["C"]);
}

void test_RankHints_DiamondGraph() {
    // Test: A → {B, C} → D
    // Expected: rank(A) < rank(B), rank(C), rank(D)
    GraphBuilder builder;
    builder.setProjectStart("2024-01-01");
    builder.addTask("A", 2.0);
    builder.addTask("B", 3.0);
    builder.addTask("C", 1.5);
    builder.addTask("D", 2.5);
    
    builder.addDependency("A", "B");
    builder.addDependency("A", "C");
    builder.addDependency("B", "D");
    builder.addDependency("C", "D");
    
    auto graph = builder.build();
    auto order = TopologicalSort::sort(*graph);
    auto ranks = TopologicalSort::getRankHints(*graph, order);
    
    ASSERT_TRUE(ranks["A"] < ranks["B"]);
    ASSERT_TRUE(ranks["A"] < ranks["C"]);
    ASSERT_TRUE(ranks["B"] < ranks["D"]);
    ASSERT_TRUE(ranks["C"] < ranks["D"]);
}

// ============================================================================
// Main Test Runner
// ============================================================================

int main() {
    TestRunner runner;
    
    std::cout << "========================================" << std::endl;
    std::cout << "CPM Engine Stage 3 - Topological Sort" << std::endl;
    std::cout << "========================================" << std::endl << std::endl;
    
    // C: Topological Sort Tests
    std::cout << "C. Topological Sort Tests" << std::endl;
    runner.runTest("C1: Linear graph A→B→C", test_C1_LinearGraph);
    runner.runTest("C2: Branching graph A→{B,C}", test_C2_BranchingGraph);
    runner.runTest("C3: Diamond graph A→{B,C}→D", test_C3_DiamondGraph);
    
    // I: Disconnected Graph Tests
    std::cout << "\nI. Disconnected Graph Tests" << std::endl;
    runner.runTest("I1: Two independent networks", test_I1_TwoIndependentNetworks);
    runner.runTest("I2: Isolated task", test_I2_IsolatedTask);
    
    // Rank Hints Tests
    std::cout << "\nRank Hints Tests" << std::endl;
    runner.runTest("Rank hints: Linear chain", test_RankHints_LinearChain);
    runner.runTest("Rank hints: Diamond graph", test_RankHints_DiamondGraph);
    
    // Print summary
    runner.printSummary();
    
    return runner.getExitCode();
}
