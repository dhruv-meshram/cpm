#include <cmath>
#include <functional>
#include <iostream>
#include <random>
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
        std::cout << "N-Tests: Randomized / Large-Graph" << std::endl;
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

static DependencyType randomDepType(std::mt19937& rng) {
    std::uniform_int_distribution<int> d(0, 3);
    return static_cast<DependencyType>(d(rng));
}

// Create a random DAG by only allowing edges from lower index to higher index.
static std::shared_ptr<ProjectGraph> buildRandomDAG(int n_nodes, double edge_prob, int seed) {
    GraphBuilder builder;
    builder.setProjectStart("2024-01-01");
    for (int i = 0; i < n_nodes; ++i) {
        builder.addTask("T" + std::to_string(i), 1.0 + (i % 5));
    }

    std::mt19937 rng(seed);
    std::uniform_real_distribution<double> p(0.0, 1.0);
    std::uniform_real_distribution<double> lag_d(0.0, 3.0);

    for (int i = 0; i < n_nodes; ++i) {
        for (int j = i + 1; j < n_nodes; ++j) {
            if (p(rng) < edge_prob) {
                DependencyType dt = randomDepType(rng);
                double lag = lag_d(rng);
                builder.addDependency("T" + std::to_string(i), "T" + std::to_string(j), dt, lag, LagUnit::DAYS);
            }
        }
    }

    return builder.build();
}

// N1: Small randomized graphs invariants hold
void test_N1_small_random_graph_invariants() {
    auto graph = buildRandomDAG(200, 0.02, 42);
    assertValidatedGraph(*graph);
    runFullPipeline(*graph);

    // invariants: no negative floats, late >= early for each task
    for (const auto& kv : graph->tasks) {
        const auto& t = kv.second;
        ASSERT_TRUE(t.total_float >= -1e-9);
        ASSERT_TRUE(daysBetween(t.early_finish, t.late_finish) <= t.total_float + 1e-6);
    }

    // project_finish should be >= max early_finish
    DateTime max_ef = graph->project_start;
    for (const auto& kv : graph->tasks) {
        if (daysBetween(graph->project_start, kv.second.early_finish) > daysBetween(graph->project_start, max_ef)) {
            max_ef = kv.second.early_finish;
        }
    }
    ASSERT_TRUE(daysBetween(graph->project_start, graph->project_finish) + 1e-9 >= daysBetween(graph->project_start, max_ef));
}

// N2: Medium randomized graph stability / performance smoke test
void test_N2_medium_random_graph_stability() {
    auto graph = buildRandomDAG(800, 0.006, 2025);
    assertValidatedGraph(*graph);
    runFullPipeline(*graph);

    // check floats non-negative and topological order size equals node count
    for (const auto& kv : graph->tasks) {
        ASSERT_TRUE(kv.second.total_float >= -1e-9);
    }

    auto topo = TopologicalSort::sort(*graph);
    ASSERT_EQ(static_cast<size_t>(graph->tasks.size()), topo.size());
}

// N3: Deterministic seed reproducibility
void test_N3_seed_reproducibility() {
    int seed = 123456;
    auto g1 = buildRandomDAG(500, 0.01, seed);
    assertValidatedGraph(*g1);
    runFullPipeline(*g1);

    auto g2 = buildRandomDAG(500, 0.01, seed);
    assertValidatedGraph(*g2);
    runFullPipeline(*g2);

    // Compare project finish and task floats for determinism
    ASSERT_EQ(daysBetween(g1->project_start, g1->project_finish), daysBetween(g2->project_start, g2->project_finish));

    for (const auto& kv : g1->tasks) {
        const auto& id = kv.first;
        ASSERT_TRUE(g2->tasks.find(id) != g2->tasks.end());
        ASSERT_APPROX_EQ(kv.second.total_float, g2->tasks.at(id).total_float, 1e-9);
    }
}

int main() {
    TestRunner runner;

    std::cout << "========================================" << std::endl;
    std::cout << "CPM Engine N-Tests: Randomized / Large-Graph" << std::endl;
    std::cout << "========================================" << std::endl << std::endl;

    runner.runTest("N1: small random graph invariants", test_N1_small_random_graph_invariants);
    runner.runTest("N2: medium random graph stability", test_N2_medium_random_graph_stability);
    runner.runTest("N3: seed reproducibility", test_N3_seed_reproducibility);

    runner.printSummary();
    return runner.getExitCode();
}
