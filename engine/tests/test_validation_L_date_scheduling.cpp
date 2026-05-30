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
        std::cout << "L-Tests: Date Scheduling Summary" << std::endl;
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

// L1a: Project start offset respected in scheduling
void test_L1a_project_start_offset() {
    GraphBuilder builder;
    builder.setProjectStart("2025-06-01");
    builder.addTask("A", 2.0);

    auto graph = builder.build();
    assertValidatedGraph(*graph);
    runFullPipeline(*graph);

    ASSERT_APPROX_EQ(2.0, daysBetween(graph->project_start, graph->tasks.at("A").early_finish), 1e-9);
}

// L1b: Lag added to dates is applied correctly (in days)
void test_L1b_lag_affects_dates() {
    GraphBuilder builder;
    builder.setProjectStart("2024-01-01");
    builder.addTask("A", 3.0);
    builder.addTask("B", 2.0);
    // A -> B with 5-day lag
    builder.addDependency("A", "B", DependencyType::FS, 5.0, LagUnit::DAYS);

    auto graph = builder.build();
    assertValidatedGraph(*graph);
    runFullPipeline(*graph);

    double a_finish = daysBetween(graph->project_start, graph->tasks.at("A").early_finish);
    double b_start = daysBetween(graph->project_start, graph->tasks.at("B").early_start);
    // B.start should be A.finish + 5 days
    ASSERT_APPROX_EQ(a_finish + 5.0, b_start, 1e-9);
}

// L1c: Changing project start shifts all computed dates consistently
void test_L1c_shift_project_start_shifts_dates() {
    GraphBuilder builder1;
    builder1.setProjectStart("2024-01-01");
    builder1.addTask("A", 4.0);
    auto graph1 = builder1.build();
    assertValidatedGraph(*graph1);
    runFullPipeline(*graph1);

    GraphBuilder builder2;
    builder2.setProjectStart("2024-02-01");
    builder2.addTask("A", 4.0);
    auto graph2 = builder2.build();
    assertValidatedGraph(*graph2);
    runFullPipeline(*graph2);

    // The difference in project start should equal the difference in task early_start
    double start_diff = daysBetween(graph1->project_start, graph2->project_start);
    double a_start_diff = daysBetween(graph1->tasks.at("A").early_start, graph2->tasks.at("A").early_start);
    ASSERT_APPROX_EQ(start_diff, a_start_diff, 1e-9);
}

int main() {
    TestRunner runner;

    std::cout << "========================================" << std::endl;
    std::cout << "CPM Engine L-Tests: Date Scheduling" << std::endl;
    std::cout << "========================================" << std::endl << std::endl;

    runner.runTest("L1a: project start offset", test_L1a_project_start_offset);
    runner.runTest("L1b: lag affects dates", test_L1b_lag_affects_dates);
    runner.runTest("L1c: shift project start shifts dates", test_L1c_shift_project_start_shifts_dates);

    runner.printSummary();
    return runner.getExitCode();
}
