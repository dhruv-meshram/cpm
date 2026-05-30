#include <iostream>
#include <cassert>
#include <functional>
#include <vector>
#include "cpm_types.h"
#include "graph_builder.h"

using namespace cpm;

// ============================================================================
// Simple Test Framework (no external dependencies)
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

// Custom assertions with proper type handling
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

// Generic ASSERT_EQ without type conversion issues
#define ASSERT_EQ(expected, actual) \
    do { \
        if (!((expected) == (actual))) { \
            throw std::runtime_error("Assertion failed: values not equal"); \
        } \
    } while(0)

// ============================================================================
// A. Input Validation Tests
// ============================================================================

void test_A1_EmptyProject() {
    GraphBuilder builder;
    builder.setProjectStart("2024-01-01");
    
    // Try to build with no tasks - should throw
    ASSERT_THROW(builder.build(), CpmComputationError);
    
    // Verify error message contains "no tasks"
    auto errors = builder.getValidationErrors();
    ASSERT_FALSE(errors.empty());
}

void test_A2_SingleTask() {
    GraphBuilder builder;
    builder.setProjectStart("2024-01-01");
    builder.addTask("A", 5.0);
    
    auto graph = builder.build();
    
    ASSERT_NE(nullptr, graph);
    ASSERT_EQ(1u, graph->tasks.size());
    ASSERT_NE(graph->tasks.end(), graph->tasks.find("A"));
    ASSERT_EQ(5.0, graph->tasks.at("A").duration);
}

void test_A4_NegativeDuration() {
    GraphBuilder builder;
    builder.setProjectStart("2024-01-01");
    
    // Should throw during addTask (fail fast)
    ASSERT_THROW(builder.addTask("A", -5.0), CpmComputationError);
}

void test_A5_ZeroDurationTask() {
    GraphBuilder builder;
    builder.setProjectStart("2024-01-01");
    builder.addTask("A", 0.0);  // Zero duration (milestone)
    
    auto graph = builder.build();
    
    ASSERT_NE(nullptr, graph);
    ASSERT_EQ(0.0, graph->tasks.at("A").duration);
}

void test_A6_DuplicateTaskIDs() {
    GraphBuilder builder;
    builder.setProjectStart("2024-01-01");
    builder.addTask("A", 5.0);
    
    // Try to add same ID again - should throw
    ASSERT_THROW(builder.addTask("A", 3.0), CpmComputationError);
}

void test_A7_DependencyReferencesNonexistentTask() {
    GraphBuilder builder;
    builder.setProjectStart("2024-01-01");
    builder.addTask("A", 5.0);
    builder.addDependency("A", "B");  // B doesn't exist
    
    // Should throw during build
    ASSERT_THROW(builder.build(), CpmComputationError);
}

// ============================================================================
// B. Cycle Detection Setup Tests (actual cycle detection in Stage 2)
// ============================================================================

void test_B3_SelfLoop() {
    GraphBuilder builder;
    builder.setProjectStart("2024-01-01");
    builder.addTask("A", 5.0);
    builder.addDependency("A", "A");  // Self-loop
    
    // In Stage 1, this is just structural validation
    // Full cycle detection happens in Stage 2 with topological sort
    auto graph = builder.build();
    
    // Self-loop should still build at Stage 1 (it's a valid structure)
    // But will be caught in Stage 2 cycle detection
    ASSERT_NE(nullptr, graph);
    ASSERT_EQ(1u, graph->dependencies.size());
}

// ============================================================================
// C. Graph Structure Correctness Tests
// ============================================================================

void test_C1_GraphStructureIntegrity() {
    GraphBuilder builder;
    builder.setProjectStart("2024-01-01");
    builder.addTask("A", 2.0);
    builder.addTask("B", 3.0);
    builder.addTask("C", 1.0);
    builder.addDependency("A", "B");
    builder.addDependency("B", "C");
    
    auto graph = builder.build();
    
    ASSERT_EQ(3u, graph->tasks.size());
    ASSERT_EQ(2u, graph->dependencies.size());
    
    // Verify adjacency structure built correctly
    ASSERT_EQ(1u, graph->successors["A"].size());
    ASSERT_EQ("B", graph->successors["A"][0]);
    
    ASSERT_EQ(1u, graph->predecessors["B"].size());
    ASSERT_EQ("A", graph->predecessors["B"][0]);
    
    ASSERT_EQ(1u, graph->successors["B"].size());
    ASSERT_EQ("C", graph->successors["B"][0]);
    
    ASSERT_EQ(1u, graph->predecessors["C"].size());
    ASSERT_EQ("B", graph->predecessors["C"][0]);
}

void test_C2_MultiplePredsAndLags() {
    GraphBuilder builder;
    builder.setProjectStart("2024-01-01");
    builder.addTask("A", 5.0);
    builder.addTask("B", 10.0);
    builder.addTask("C", 3.0);
    
    // Multiple predecessors for C
    builder.addDependency("A", "C", DependencyType::FS, 1.0, LagUnit::DAYS);
    builder.addDependency("B", "C", DependencyType::FS, 2.0, LagUnit::DAYS);
    
    auto graph = builder.build();
    
    ASSERT_EQ(3u, graph->tasks.size());
    ASSERT_EQ(2u, graph->dependencies.size());
    
    // Verify C has two predecessors
    ASSERT_EQ(2u, graph->predecessors["C"].size());
    
    // Verify lag info stored
    ASSERT_EQ(1.0, graph->dependencies[0].lag);
    ASSERT_EQ(LagUnit::DAYS, graph->dependencies[0].lag_unit);
}

void test_C3_AllDependencyTypes() {
    GraphBuilder builder;
    builder.setProjectStart("2024-01-01");
    builder.addTask("A", 5.0);
    builder.addTask("B", 5.0);
    builder.addTask("C", 5.0);
    builder.addTask("D", 5.0);
    
    builder.addDependency("A", "B", DependencyType::FS);
    builder.addDependency("B", "C", DependencyType::SS);
    builder.addDependency("C", "D", DependencyType::FF);
    
    auto graph = builder.build();
    
    ASSERT_EQ(3u, graph->dependencies.size());
    ASSERT_EQ(DependencyType::FS, graph->dependencies[0].type);
    ASSERT_EQ(DependencyType::SS, graph->dependencies[1].type);
    ASSERT_EQ(DependencyType::FF, graph->dependencies[2].type);
}

// ============================================================================
// D. Edge Cases
// ============================================================================

void test_D1_EmptyTaskId() {
    GraphBuilder builder;
    builder.setProjectStart("2024-01-01");
    
    // Should throw
    ASSERT_THROW(builder.addTask("", 5.0), CpmComputationError);
}

void test_D2_EmptyDependencyIds() {
    GraphBuilder builder;
    builder.setProjectStart("2024-01-01");
    builder.addTask("A", 5.0);
    
    // Should throw
    ASSERT_THROW(builder.addDependency("", "A"), CpmComputationError);
    ASSERT_THROW(builder.addDependency("A", ""), CpmComputationError);
}

// ============================================================================
// E. isValid() and getValidationErrors() Tests
// ============================================================================

void test_E1_IsValidTrue() {
    GraphBuilder builder;
    builder.setProjectStart("2024-01-01");
    builder.addTask("A", 5.0);
    
    ASSERT_TRUE(builder.isValid());
    ASSERT_TRUE(builder.getValidationErrors().empty());
}

void test_E2_IsValidFalse() {
    GraphBuilder builder;
    builder.setProjectStart("2024-01-01");
    // Empty project
    
    ASSERT_FALSE(builder.isValid());
    ASSERT_FALSE(builder.getValidationErrors().empty());
}

// ============================================================================
// Main Test Runner
// ============================================================================

int main() {
    TestRunner runner;
    
    std::cout << "========================================" << std::endl;
    std::cout << "CPM Engine Stage 1 - Unit Tests" << std::endl;
    std::cout << "========================================" << std::endl << std::endl;
    
    // A: Input Validation Tests
    std::cout << "A. Input Validation Tests" << std::endl;
    runner.runTest("A1: Empty project", test_A1_EmptyProject);
    runner.runTest("A2: Single task", test_A2_SingleTask);
    runner.runTest("A4: Negative duration", test_A4_NegativeDuration);
    runner.runTest("A5: Zero duration task", test_A5_ZeroDurationTask);
    runner.runTest("A6: Duplicate task IDs", test_A6_DuplicateTaskIDs);
    runner.runTest("A7: Missing task reference", test_A7_DependencyReferencesNonexistentTask);
    
    // B: Cycle Detection Setup
    std::cout << "\nB. Cycle Detection Setup Tests" << std::endl;
    runner.runTest("B3: Self-loop", test_B3_SelfLoop);
    
    // C: Graph Structure
    std::cout << "\nC. Graph Structure Tests" << std::endl;
    runner.runTest("C1: Graph structure integrity", test_C1_GraphStructureIntegrity);
    runner.runTest("C2: Multiple predecessors & lags", test_C2_MultiplePredsAndLags);
    runner.runTest("C3: All dependency types", test_C3_AllDependencyTypes);
    
    // D: Edge Cases
    std::cout << "\nD. Edge Cases" << std::endl;
    runner.runTest("D1: Empty task ID", test_D1_EmptyTaskId);
    runner.runTest("D2: Empty dependency IDs", test_D2_EmptyDependencyIds);
    
    // E: Validation Functions
    std::cout << "\nE. Validation Functions" << std::endl;
    runner.runTest("E1: isValid() returns true", test_E1_IsValidTrue);
    runner.runTest("E2: isValid() returns false", test_E2_IsValidFalse);
    
    // Print summary
    runner.printSummary();
    
    return runner.getExitCode();
}
