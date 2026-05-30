#include <chrono>
#include <cmath>
#include <functional>
#include <iostream>
#include <random>
#include <string>
#include <vector>

#include "cpm_types.h"
#include "float_calculator.h"
#include "graph_builder.h"
#include "graph_validator.h"
#include "schedule_calculator.h"
#include "topological_sort.h"

using namespace cpm;

static std::shared_ptr<ProjectGraph> buildRandomDAG(int n_nodes, double edge_prob, int seed) {
    GraphBuilder builder;
    builder.setProjectStart("2024-01-01");
    for (int i = 0; i < n_nodes; ++i) {
        builder.addTask("T" + std::to_string(i), 1.0 + (i % 5));
    }

    std::mt19937 rng(seed);
    std::uniform_real_distribution<double> p(0.0, 1.0);
    std::uniform_real_distribution<double> lag_d(0.0, 2.0);
    std::uniform_int_distribution<int> dt(0, 3);

    for (int i = 0; i < n_nodes; ++i) {
        for (int j = i + 1; j < n_nodes; ++j) {
            if (p(rng) < edge_prob) {
                DependencyType d = static_cast<DependencyType>(dt(rng));
                double lag = lag_d(rng);
                builder.addDependency("T" + std::to_string(i), "T" + std::to_string(j), d, lag, LagUnit::DAYS);
            }
        }
    }

    return builder.build();
}

int main(int argc, char** argv) {
    std::vector<int> sizes = {500, 1000, 2000};
    std::vector<double> probs = {0.002, 0.001, 0.0008};
    int seed = 20260531;

    std::cout << "CPM Engine Benchmark Harness\n";
    std::cout << "Sizes: ";
    for (auto s : sizes) std::cout << s << " ";
    std::cout << "\n";

    for (size_t i = 0; i < sizes.size(); ++i) {
        int n = sizes[i];
        double p = probs[i];
        std::cout << "\nBuilding graph: n=" << n << " p=" << p << " seed=" << seed << "\n";
        auto t0 = std::chrono::steady_clock::now();
        auto graph = buildRandomDAG(n, p, seed + i);
        auto t1 = std::chrono::steady_clock::now();
        std::cout << "Build time: " << std::chrono::duration<double>(t1 - t0).count() << "s\n";

        // Validate
        auto [valid, errors] = GraphValidator::validateGraph(*graph);
        if (!valid) {
            std::cout << "Graph validation failed with " << errors.size() << " errors\n";
            continue;
        }

        // Topological sort
        t0 = std::chrono::steady_clock::now();
        auto topo = TopologicalSort::sort(*graph);
        t1 = std::chrono::steady_clock::now();
        std::cout << "Topological sort time: " << std::chrono::duration<double>(t1 - t0).count() << "s\n";

        // Forward pass
        t0 = std::chrono::steady_clock::now();
        DateTime finish = ScheduleCalculator::forwardPass(*graph, topo, graph->project_start);
        t1 = std::chrono::steady_clock::now();
        std::cout << "Forward pass time: " << std::chrono::duration<double>(t1 - t0).count() << "s\n";

        // Backward pass
        t0 = std::chrono::steady_clock::now();
        ScheduleCalculator::backwardPass(*graph, topo, finish);
        t1 = std::chrono::steady_clock::now();
        std::cout << "Backward pass time: " << std::chrono::duration<double>(t1 - t0).count() << "s\n";

        // Float calculations
        t0 = std::chrono::steady_clock::now();
        FloatCalculator::calculateTotalFloat(*graph);
        FloatCalculator::calculateFreeFloat(*graph);
        t1 = std::chrono::steady_clock::now();
        std::cout << "Float calc time: " << std::chrono::duration<double>(t1 - t0).count() << "s\n";

        std::cout << "Project finish (days): " << dateTimeDiffDays(graph->project_start, graph->project_finish) << "\n";
    }

    std::cout << "\nBenchmark run complete." << std::endl;
    return 0;
}
