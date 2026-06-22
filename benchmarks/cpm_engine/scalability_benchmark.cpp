#include "benchmark_utils.hpp"
#include "graph_generator.hpp"
#include "critical_path_finder.h"
#include "float_calculator.h"
#include "schedule_calculator.h"
#include "topological_sort.h"
#include <iostream>
#include <vector>

void runScalabilityBenchmark() {
    std::string filename = "benchmarks/cpm_engine/results/scalability.csv";
    benchmark::writeCSVRow(filename, {"nodes", "edges", "runtime_ms", "ve_complexity", "runtime_growth_ratio", "expected_growth_ratio"});

    GraphGenerator generator(42);

    double last_runtime = 0;
    double last_ve = 0;

    for (size_t nodes : GRAPH_SIZES) {
        cpm::ProjectGraph graph = generator.generateDAG(nodes, Density::MEDIUM);
        size_t edges = graph.dependencies.size();
        auto project_start = graph.project_start;

        std::cout << "[Scalability] Graph: " << nodes << " nodes / " << edges << " edges" << std::endl;

        std::vector<double> measurements;
        benchmark::Timer timer;

        for (int i = 0; i < BENCHMARK_RUNS; ++i) {
            timer.start();
            auto topo_order = cpm::TopologicalSort::sort(graph);
            auto project_finish = cpm::ScheduleCalculator::forwardPass(graph, topo_order, project_start);
            cpm::ScheduleCalculator::backwardPass(graph, topo_order, project_finish);
            cpm::FloatCalculator::calculateTotalFloat(graph);
            cpm::FloatCalculator::calculateFreeFloat(graph);
            timer.stop();
            if (i > 0) { // Discard warm-up
                measurements.push_back(timer.elapsedMilliseconds());
            }
        }

        benchmark::Stats stats = benchmark::computeStats(measurements);
        
        double current_ve = static_cast<double>(nodes) + static_cast<double>(edges);
        double runtime_growth = (last_runtime > 0) ? (stats.average / last_runtime) : 1.0;
        double expected_growth = (last_ve > 0) ? (current_ve / last_ve) : 1.0;

        std::cout << "  Growth Ratio: " << runtime_growth << " (Expected: " << expected_growth << ")" << std::endl;

        benchmark::writeCSVRow(filename, {
            std::to_string(nodes),
            std::to_string(edges),
            std::to_string(stats.average),
            std::to_string(current_ve),
            std::to_string(runtime_growth),
            std::to_string(expected_growth)
        });

        last_runtime = stats.average;
        last_ve = current_ve;
    }
}
