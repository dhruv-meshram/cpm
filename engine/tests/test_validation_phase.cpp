#include <cmath>
#include <functional>
#include <iostream>
#include <stdexcept>
#include <string>
#include <vector>

#include "cpm_types.h"
#include "critical_path_finder.h"
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
        std::cout << "Validation Phase Test Summary" << std::endl;
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

void test_invariants_linear_chain() {
    GraphBuilder builder;
    builder.setProjectStart("2024-01-01");
    builder.addTask("A", 2.0);
    builder.addTask("B", 3.0);
    builder.addTask("C", 1.0);
    builder.addDependency("A", "B", DependencyType::FS, 0.0, LagUnit::DAYS);
    builder.addDependency("B", "C", DependencyType::FS, 0.0, LagUnit::DAYS);

    auto graph = builder.build();
    assertValidatedGraph(*graph);
    runFullPipeline(*graph);

    ASSERT_APPROX_EQ(2.0, daysBetween(graph->project_start, graph->tasks.at("A").early_finish), 1e-9);
    ASSERT_APPROX_EQ(5.0, daysBetween(graph->project_start, graph->tasks.at("B").early_finish), 1e-9);
    ASSERT_APPROX_EQ(6.0, daysBetween(graph->project_start, graph->tasks.at("C").early_finish), 1e-9);

    ASSERT_EQ(graph->tasks.at("A").early_finish, graph->tasks.at("A").late_finish);
    ASSERT_EQ(graph->tasks.at("B").early_finish, graph->tasks.at("B").late_finish);
    ASSERT_EQ(graph->tasks.at("C").early_finish, graph->tasks.at("C").late_finish);

    ASSERT_APPROX_EQ(0.0, graph->tasks.at("A").total_float, 1e-9);
    ASSERT_APPROX_EQ(0.0, graph->tasks.at("B").total_float, 1e-9);
    ASSERT_APPROX_EQ(0.0, graph->tasks.at("C").total_float, 1e-9);
}

void test_invariants_branching_graph() {
    GraphBuilder builder;
    builder.setProjectStart("2024-01-01");
    builder.addTask("A", 1.0);
    builder.addTask("B", 2.0);
    builder.addTask("C", 1.0);
    builder.addTask("D", 1.0);
    builder.addDependency("A", "B", DependencyType::FS, 0.0, LagUnit::DAYS);
    builder.addDependency("A", "C", DependencyType::FS, 0.0, LagUnit::DAYS);
    builder.addDependency("B", "D", DependencyType::FS, 0.0, LagUnit::DAYS);
    builder.addDependency("C", "D", DependencyType::FS, 0.0, LagUnit::DAYS);

    auto graph = builder.build();
    assertValidatedGraph(*graph);
    runFullPipeline(*graph);

    ASSERT_APPROX_EQ(0.0, graph->tasks.at("A").total_float, 1e-9);
    ASSERT_APPROX_EQ(0.0, graph->tasks.at("B").total_float, 1e-9);
    ASSERT_APPROX_EQ(1.0, graph->tasks.at("C").total_float, 1e-9);
    ASSERT_APPROX_EQ(0.0, graph->tasks.at("D").total_float, 1e-9);

    ASSERT_TRUE(graph->tasks.at("C").free_float <= graph->tasks.at("C").total_float + 1e-9);
    ASSERT_EQ(graph->tasks.at("D").early_finish, graph->tasks.at("D").late_finish);
}

void test_dependency_type_fs() {
    GraphBuilder builder;
    builder.setProjectStart("2024-01-01");
    builder.addTask("A", 4.0);
    builder.addTask("B", 3.0);
    builder.addDependency("A", "B", DependencyType::FS, 2.0, LagUnit::DAYS);

    auto graph = builder.build();
    assertValidatedGraph(*graph);
    runFullPipeline(*graph);

    ASSERT_APPROX_EQ(6.0, daysBetween(graph->project_start, graph->tasks.at("B").early_start), 1e-9);
    ASSERT_APPROX_EQ(9.0, daysBetween(graph->project_start, graph->tasks.at("B").early_finish), 1e-9);
}

void test_dependency_type_ss() {
    GraphBuilder builder;
    builder.setProjectStart("2024-01-01");
    builder.addTask("A", 4.0);
    builder.addTask("B", 3.0);
    builder.addDependency("A", "B", DependencyType::SS, 2.0, LagUnit::DAYS);

    auto graph = builder.build();
    assertValidatedGraph(*graph);
    runFullPipeline(*graph);

    ASSERT_APPROX_EQ(2.0, daysBetween(graph->project_start, graph->tasks.at("B").early_start), 1e-9);
    ASSERT_APPROX_EQ(5.0, daysBetween(graph->project_start, graph->tasks.at("B").early_finish), 1e-9);
}

void test_dependency_type_ff() {
    GraphBuilder builder;
    builder.setProjectStart("2024-01-01");
    builder.addTask("A", 4.0);
    builder.addTask("B", 1.0);
    builder.addDependency("A", "B", DependencyType::FF, 2.0, LagUnit::DAYS);

    auto graph = builder.build();
    assertValidatedGraph(*graph);
    runFullPipeline(*graph);

    ASSERT_APPROX_EQ(5.0, daysBetween(graph->project_start, graph->tasks.at("B").early_start), 1e-9);
    ASSERT_APPROX_EQ(6.0, daysBetween(graph->project_start, graph->tasks.at("B").early_finish), 1e-9);
}

void test_dependency_type_sf() {
    GraphBuilder builder;
    builder.setProjectStart("2024-01-01");
    builder.addTask("A", 4.0);
    builder.addTask("B", 1.0);
    builder.addDependency("A", "B", DependencyType::SF, 2.0, LagUnit::DAYS);

    auto graph = builder.build();
    assertValidatedGraph(*graph);
    runFullPipeline(*graph);

    ASSERT_APPROX_EQ(1.0, daysBetween(graph->project_start, graph->tasks.at("B").early_start), 1e-9);
    ASSERT_APPROX_EQ(2.0, daysBetween(graph->project_start, graph->tasks.at("B").early_finish), 1e-9);
}

void test_criticality_and_paths() {
    GraphBuilder builder;
    builder.setProjectStart("2024-01-01");
    builder.addTask("A", 1.0);
    builder.addTask("B", 2.0);
    builder.addTask("C", 1.0);
    builder.addTask("D", 1.0);
    builder.addDependency("A", "B", DependencyType::FS, 0.0, LagUnit::DAYS);
    builder.addDependency("A", "C", DependencyType::FS, 0.0, LagUnit::DAYS);
    builder.addDependency("B", "D", DependencyType::FS, 0.0, LagUnit::DAYS);
    builder.addDependency("C", "D", DependencyType::FS, 0.0, LagUnit::DAYS);

    auto graph = builder.build();
    assertValidatedGraph(*graph);
    runFullPipeline(*graph);

    auto critical_tasks = FloatCalculator::identifyCriticalTasks(*graph);
    ASSERT_TRUE(!critical_tasks.empty());
    for (const auto& task_id : critical_tasks) {
        ASSERT_TRUE(FloatCalculator::isCritical(graph->tasks.at(task_id)));
    }

    auto critical_paths = CriticalPathFinder::findAllCriticalPaths(*graph);
    ASSERT_TRUE(!critical_paths.empty());
    ASSERT_EQ(std::string("A"), critical_paths[0].front());
    ASSERT_EQ(std::string("D"), critical_paths[0].back());
}

int main() {
    TestRunner runner;

    std::cout << "========================================" << std::endl;
    std::cout << "CPM Engine Validation Phase Tests" << std::endl;
    std::cout << "========================================" << std::endl << std::endl;

    runner.runTest("Validation: linear chain invariants", test_invariants_linear_chain);
    runner.runTest("Validation: branching graph invariants", test_invariants_branching_graph);
    runner.runTest("Validation: FS dependency semantics", test_dependency_type_fs);
    runner.runTest("Validation: SS dependency semantics", test_dependency_type_ss);
    runner.runTest("Validation: FF dependency semantics", test_dependency_type_ff);
    runner.runTest("Validation: SF dependency semantics", test_dependency_type_sf);
    runner.runTest("Validation: criticality and paths", test_criticality_and_paths);

    runner.printSummary();
    return runner.getExitCode();
}