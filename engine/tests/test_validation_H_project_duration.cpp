#include <cmath>
#include <functional>
#include <iostream>
#include <stdexcept>
#include <string>
#include <vector>

#include "cpm_types.h"
#include "float_calculator.h"
#include "graph_builder.h"
#include "graph_validator.h"
#include "schedule_calculator.h"
#include "topological_sort.h"

using namespace cpm;

class TestResult {
public:
    TestResult(const std::string& test_name, bool success, const std::string& error = "")
        : passed(success), name(test_name), error_message(error) {}

    bool passed;
    std::string name;
    std::string error_message;
};

class TestRunner {
public:
    void runTest(const std::string& test_name, const std::function<void()>& test_func) {
        try {
            test_func();
            results.emplace_back(test_name, true);
            ++passed_count;
            std::cout << "✓ " << test_name << std::endl;
        } catch (const std::exception& e) {
            results.emplace_back(test_name, false, e.what());
            ++failed_count;
            std::cout << "✗ " << test_name << " - " << e.what() << std::endl;
        }
    }

    void printSummary() const {
        std::cout << "\n========================================" << std::endl;
        std::cout << "H-Tests: Project Duration Summary" << std::endl;
        std::cout << "========================================" << std::endl;
        std::cout << "Passed: " << passed_count << std::endl;
        std::cout << "Failed: " << failed_count << std::endl;
        std::cout << "Total:  " << (passed_count + failed_count) << std::endl;

        if (failed_count > 0) {
            std::cout << "\nFailed Tests:" << std::endl;
            for (const auto& result : results) {
                if (!result.passed) {
                    std::cout << "  - " << result.name << ": " << result.error_message << std::endl;
                }
            }
        }
    }

    int getExitCode() const {
        return failed_count > 0 ? 1 : 0;
    }

private:
    std::vector<TestResult> results;
    int passed_count = 0;
    int failed_count = 0;
};

#define ASSERT_TRUE(condition) \
    do { \
        if (!(condition)) { \
            throw std::runtime_error("Assertion failed: condition is false"); \
        } \
    } while (0)

#define ASSERT_EQ(expected, actual) \
    do { \
        if (!((expected) == (actual))) { \
            throw std::runtime_error("Assertion failed: values not equal"); \
        } \
    } while (0)

#define ASSERT_APPROX_EQ(expected, actual, tolerance) \
    do { \
        if (std::abs((expected) - (actual)) > (tolerance)) { \
            throw std::runtime_error("Assertion failed: values not equal within tolerance"); \
        } \
    } while (0)

static void runFullPipeline(ProjectGraph& graph) {
    auto topo_order = TopologicalSort::sort(graph);
    DateTime project_finish = ScheduleCalculator::forwardPass(graph, topo_order, graph.project_start);
    ScheduleCalculator::backwardPass(graph, topo_order, project_finish);
    FloatCalculator::calculateTotalFloat(graph);
    FloatCalculator::calculateFreeFloat(graph);
}

static void assertValidatedGraph(const ProjectGraph& graph) {
    auto [is_valid, errors] = GraphValidator::validateGraph(graph);
    ASSERT_TRUE(is_valid);
    ASSERT_EQ(static_cast<size_t>(0), errors.size());
}

static double daysBetween(const DateTime& from, const DateTime& to) {
    return dateTimeDiffDays(from, to);
}

// H1: Simple linear critical path => project duration equals sum of durations
void test_H1_linear_critical_path_duration() {
    GraphBuilder builder;
    builder.setProjectStart("2024-01-01");
    builder.addTask("A", 2.0);
    builder.addTask("B", 3.0);
    builder.addTask("C", 4.0);
    builder.addDependency("A", "B", DependencyType::FS, 0.0, LagUnit::DAYS);
    builder.addDependency("B", "C", DependencyType::FS, 0.0, LagUnit::DAYS);

    auto graph = builder.build();
    assertValidatedGraph(*graph);
    runFullPipeline(*graph);

    DateTime finish = graph->project_finish;
    double days = daysBetween(graph->project_start, finish);
    ASSERT_APPROX_EQ(9.0, days, 1e-9);
}

// H2: Parallel paths => project duration equals the longest path
void test_H2_parallel_paths_longest_wins() {
    GraphBuilder builder;
    builder.setProjectStart("2024-01-01");
    builder.addTask("Start", 0.0);
    builder.addTask("P1A", 2.0);
    builder.addTask("P1B", 2.0);
    builder.addTask("P2A", 5.0);
    builder.addTask("End", 0.0);

    builder.addDependency("Start", "P1A", DependencyType::FS, 0.0, LagUnit::DAYS);
    builder.addDependency("P1A", "P1B", DependencyType::FS, 0.0, LagUnit::DAYS);
    builder.addDependency("Start", "P2A", DependencyType::FS, 0.0, LagUnit::DAYS);
    builder.addDependency("P1B", "End", DependencyType::FS, 0.0, LagUnit::DAYS);
    builder.addDependency("P2A", "End", DependencyType::FS, 0.0, LagUnit::DAYS);

    auto graph = builder.build();
    assertValidatedGraph(*graph);
    runFullPipeline(*graph);

    DateTime finish = graph->project_finish;
    double days = daysBetween(graph->project_start, finish);
    // Longest path is Start -> P2A -> End = 5.0 days
    ASSERT_APPROX_EQ(5.0, days, 1e-9);
}

// H3: Lags on critical path increase project duration accordingly
void test_H3_lag_affects_project_duration() {
    GraphBuilder builder;
    builder.setProjectStart("2024-01-01");
    builder.addTask("A", 3.0);
    builder.addTask("B", 2.0);
    // FS with lag of 4 days
    builder.addDependency("A", "B", DependencyType::FS, 4.0, LagUnit::DAYS);

    auto graph = builder.build();
    assertValidatedGraph(*graph);
    runFullPipeline(*graph);

    DateTime finish = graph->project_finish;
    double days = daysBetween(graph->project_start, finish);
    // A (3) then lag (4) then B (2) => finish at 9 days
    ASSERT_APPROX_EQ(9.0, days, 1e-9);
}

// H4: Zero-duration milestones should not shorten critical path incorrectly
void test_H4_zero_duration_milestones() {
    GraphBuilder builder;
    builder.setProjectStart("2024-01-01");
    builder.addTask("A", 4.0);
    builder.addTask("M", 0.0); // milestone
    builder.addTask("B", 2.0);
    builder.addDependency("A", "M", DependencyType::FS, 0.0, LagUnit::DAYS);
    builder.addDependency("M", "B", DependencyType::FS, 0.0, LagUnit::DAYS);

    auto graph = builder.build();
    assertValidatedGraph(*graph);
    runFullPipeline(*graph);

    DateTime finish = graph->project_finish;
    double days = daysBetween(graph->project_start, finish);
    // A (4) + B (2) = 6
    ASSERT_APPROX_EQ(6.0, days, 1e-9);
}

int main() {
    TestRunner runner;

    std::cout << "========================================" << std::endl;
    std::cout << "CPM Engine H-Tests: Project Duration" << std::endl;
    std::cout << "========================================" << std::endl << std::endl;

    runner.runTest("H1: linear critical path duration", test_H1_linear_critical_path_duration);
    runner.runTest("H2: parallel paths longest wins", test_H2_parallel_paths_longest_wins);
    runner.runTest("H3: lag affects project duration", test_H3_lag_affects_project_duration);
    runner.runTest("H4: zero-duration milestone handling", test_H4_zero_duration_milestones);

    runner.printSummary();
    return runner.getExitCode();
}
