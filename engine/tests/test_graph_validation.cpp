#include <iostream>
#include <cassert>
#include <functional>
#include <vector>
#include "cpm_types.h"
#include "graph_builder.h"
#include "graph_validator.h"

using namespace cpm;

// ============================================================================
// Test Framework (reuse from Stage 1)
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
#define ASSERT_THROW(statement, exception_type) \
    do { \
        bool caught = false; \
        try { \
            statement; \
        } catch (const exception_type&) { \
            caught = true; \
        } \
        if (!caught) { \
            throw std::runtime_error("Expected exception was not thrown"); \
        } \
    } while(0)

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

#define ASSERT_NE(expected, actual) \
    do { \
        if ((expected) == (actual)) { \
            throw std::runtime_error("Assertion failed: values should not be equal"); \
        } \
    } while(0)

#define ASSERT_EQ(expected, actual) \
    do { \
        if (!((expected) == (actual))) { \
            throw std::runtime_error("Assertion failed: values not equal"); \
        } \
    } while(0)

// ============================================================================
// A. Input Validation Tests (handled by GraphBuilder, not GraphValidator)
// These tests verify that invalid inputs are caught early
// ============================================================================

void test_A1_EmptyProject() {
    // Empty project is caught by GraphBuilder.build(), not validator
    GraphBuilder builder;
    builder.setProjectStart("2024-01-01");
    
    // Building empty graph should throw during build
    ASSERT_THROW(builder.build(), CpmComputationError);
}

void test_A2_SingleTask() {
    GraphBuilder builder;
    builder.setProjectStart("2024-01-01");
    builder.addTask("A", 5.0);
    
    auto graph = builder.build();
    auto [is_valid, errors] = GraphValidator::validateGraph(*graph);
    
    ASSERT_TRUE(is_valid);
    ASSERT_EQ(0u, errors.size());
}

void test_A3_MissingDuration() {
    // Zero duration (minimum valid) is allowed
    GraphBuilder builder;
    builder.setProjectStart("2024-01-01");
    builder.addTask("A", 0.0);
    
    auto graph = builder.build();
    auto [is_valid, errors] = GraphValidator::validateGraph(*graph);
    
    ASSERT_TRUE(is_valid);
}

void test_A4_NegativeDuration() {
    // Negative duration caught by GraphBuilder
    GraphBuilder builder;
    builder.setProjectStart("2024-01-01");
    builder.addTask("A", 5.0);
    
    // Trying to add negative duration task should throw
    ASSERT_THROW(builder.addTask("B", -3.0), CpmComputationError);
}

void test_A5_ZeroDurationTask() {
    GraphBuilder builder;
    builder.setProjectStart("2024-01-01");
    builder.addTask("A", 0.0);  // Milestone
    
    auto graph = builder.build();
    auto [is_valid, errors] = GraphValidator::validateGraph(*graph);
    
    ASSERT_TRUE(is_valid);
    ASSERT_EQ(0u, errors.size());
}

void test_A6_DuplicateTaskIDs() {
    // Duplicate IDs caught by GraphBuilder
    GraphBuilder builder;
    builder.setProjectStart("2024-01-01");
    builder.addTask("A", 5.0);
    
    ASSERT_THROW(builder.addTask("A", 3.0), CpmComputationError);
}

void test_A7_DependencyReferencesNonexistentTask() {
    GraphBuilder builder;
    builder.setProjectStart("2024-01-01");
    builder.addTask("A", 5.0);
    builder.addDependency("A", "B");  // B doesn't exist
    
    ASSERT_THROW(builder.build(), CpmComputationError);
}

// ============================================================================
// B. Cycle Detection Tests
// ============================================================================

void test_B1_SimpleTwo_NodeCycle() {
    GraphBuilder builder;
    builder.setProjectStart("2024-01-01");
    builder.addTask("A", 5.0);
    builder.addTask("B", 3.0);
    builder.addDependency("A", "B");
    builder.addDependency("B", "A");  // Creates cycle A->B->A
    
    auto graph = builder.build();
    auto [is_valid, errors] = GraphValidator::validateGraph(*graph);
    
    ASSERT_FALSE(is_valid);
    ASSERT_NE(0u, errors.size());
    
    // Verify cycle error
    bool has_cycle_error = false;
    for (const auto& error : errors) {
        if (error.find("Cycle") != std::string::npos) {
            has_cycle_error = true;
            break;
        }
    }
    ASSERT_TRUE(has_cycle_error);
}

void test_B2_ThreeNodeCycle() {
    GraphBuilder builder;
    builder.setProjectStart("2024-01-01");
    builder.addTask("A", 5.0);
    builder.addTask("B", 3.0);
    builder.addTask("C", 2.0);
    builder.addDependency("A", "B");
    builder.addDependency("B", "C");
    builder.addDependency("C", "A");  // Creates cycle A->B->C->A
    
    auto graph = builder.build();
    auto [is_valid, errors] = GraphValidator::validateGraph(*graph);
    
    ASSERT_FALSE(is_valid);
    ASSERT_NE(0u, errors.size());
    
    // Verify cycle error
    bool has_cycle_error = false;
    for (const auto& error : errors) {
        if (error.find("Cycle") != std::string::npos) {
            has_cycle_error = true;
            break;
        }
    }
    ASSERT_TRUE(has_cycle_error);
}

void test_B3_SelfLoop() {
    GraphBuilder builder;
    builder.setProjectStart("2024-01-01");
    builder.addTask("A", 5.0);
    builder.addDependency("A", "A");  // Self-loop
    
    auto graph = builder.build();
    auto [is_valid, errors] = GraphValidator::validateGraph(*graph);
    
    ASSERT_FALSE(is_valid);
    ASSERT_NE(0u, errors.size());
    
    // Verify cycle error
    bool has_cycle_error = false;
    for (const auto& error : errors) {
        if (error.find("Cycle") != std::string::npos) {
            has_cycle_error = true;
            break;
        }
    }
    ASSERT_TRUE(has_cycle_error);
}

void test_B4_HiddenCycleInLargeGraph() {
    GraphBuilder builder;
    builder.setProjectStart("2024-01-01");
    builder.addTask("A", 2.0);
    builder.addTask("B", 3.0);
    builder.addTask("C", 4.0);
    builder.addTask("D", 5.0);
    builder.addTask("E", 1.0);
    
    // Build graph: A->B->C->D->E, with hidden cycle C->D and D->C
    builder.addDependency("A", "B");
    builder.addDependency("B", "C");
    builder.addDependency("C", "D");
    builder.addDependency("D", "E");
    builder.addDependency("D", "C");  // Creates hidden cycle C<->D
    
    auto graph = builder.build();
    auto [is_valid, errors] = GraphValidator::validateGraph(*graph);
    
    ASSERT_FALSE(is_valid);
    ASSERT_NE(0u, errors.size());
    
    // Verify cycle error detected
    bool has_cycle_error = false;
    for (const auto& error : errors) {
        if (error.find("Cycle") != std::string::npos) {
            has_cycle_error = true;
            break;
        }
    }
    ASSERT_TRUE(has_cycle_error);
}

// ============================================================================
// Additional validation tests
// ============================================================================

void test_E1_NoCycles_ValidDAG() {
    GraphBuilder builder;
    builder.setProjectStart("2024-01-01");
    builder.addTask("A", 2.0);
    builder.addTask("B", 3.0);
    builder.addTask("C", 1.0);
    builder.addDependency("A", "B");
    builder.addDependency("B", "C");
    
    auto graph = builder.build();
    auto [is_valid, errors] = GraphValidator::validateGraph(*graph);
    
    ASSERT_TRUE(is_valid);
    ASSERT_EQ(0u, errors.size());
}

void test_E2_DiamondDAG_NoCycles() {
    GraphBuilder builder;
    builder.setProjectStart("2024-01-01");
    builder.addTask("A", 2.0);
    builder.addTask("B", 3.0);
    builder.addTask("C", 1.0);
    builder.addTask("D", 4.0);
    
    // Diamond: A -> B, C -> D, and B,C -> D
    builder.addDependency("A", "B");
    builder.addDependency("A", "C");
    builder.addDependency("B", "D");
    builder.addDependency("C", "D");
    
    auto graph = builder.build();
    auto [is_valid, errors] = GraphValidator::validateGraph(*graph);
    
    ASSERT_TRUE(is_valid);
    ASSERT_EQ(0u, errors.size());
}

// ============================================================================
// Main Test Runner
// ============================================================================

int main() {
    TestRunner runner;
    
    std::cout << "========================================" << std::endl;
    std::cout << "CPM Engine Stage 2 - Validation Tests" << std::endl;
    std::cout << "========================================" << std::endl << std::endl;
    
    // A: Input Validation Tests
    std::cout << "A. Input Validation Tests" << std::endl;
    runner.runTest("A1: Empty project", test_A1_EmptyProject);
    runner.runTest("A2: Single task", test_A2_SingleTask);
    runner.runTest("A3: Missing duration", test_A3_MissingDuration);
    runner.runTest("A4: Negative duration", test_A4_NegativeDuration);
    runner.runTest("A5: Zero duration task", test_A5_ZeroDurationTask);
    runner.runTest("A6: Duplicate task IDs", test_A6_DuplicateTaskIDs);
    runner.runTest("A7: Missing task reference", test_A7_DependencyReferencesNonexistentTask);
    
    // B: Cycle Detection Tests
    std::cout << "\nB. Cycle Detection Tests" << std::endl;
    runner.runTest("B1: Simple 2-node cycle", test_B1_SimpleTwo_NodeCycle);
    runner.runTest("B2: Three-node cycle", test_B2_ThreeNodeCycle);
    runner.runTest("B3: Self-loop", test_B3_SelfLoop);
    runner.runTest("B4: Hidden cycle in large graph", test_B4_HiddenCycleInLargeGraph);
    
    // E: Additional validation
    std::cout << "\nE. Valid DAG Tests" << std::endl;
    runner.runTest("E1: No cycles - valid DAG", test_E1_NoCycles_ValidDAG);
    runner.runTest("E2: Diamond DAG - no cycles", test_E2_DiamondDAG_NoCycles);
    
    // Print summary
    runner.printSummary();
    
    return runner.getExitCode();
}
