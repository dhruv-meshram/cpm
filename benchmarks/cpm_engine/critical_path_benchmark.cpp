#include "benchmark_utils.hpp"
#include "graph_generator.hpp"
#include "critical_path_finder.h"
#include "float_calculator.h"
#include "schedule_calculator.h"
#include "topological_sort.h"
#include <iostream>
#include <vector>

void runCriticalPathBenchmark() {
    std::string filename = "benchmarks/cpm_engine/results/critical_path.csv";
    benchmark::writeCSVRow(filename, {"nodes", "edges", "runtime_ms", "critical_path_length", "nodes_examined"});

    GraphGenerator generator(42);

    for (size_t nodes : GRAPH_SIZES) {
        cpm::ProjectGraph graph = generator.generateDAG(nodes, Density::MEDIUM);
        size_t edges = graph.dependencies.size();
        auto topo_order = cpm::TopologicalSort::sort(graph);
        auto project_finish = cpm::ScheduleCalculator::forwardPass(graph, topo_order, graph.project_start);
        cpm::ScheduleCalculator::backwardPass(graph, topo_order, project_finish);
        cpm::FloatCalculator::calculateTotalFloat(graph);

        std::cout << "[CriticalPath] Graph: " << nodes << " nodes / " << edges << " edges" << std::endl;

        std::vector<double> measurements;
        benchmark::Timer timer;
        std::vector<std::string> critical_path;

        for (int i = 0; i < BENCHMARK_RUNS; ++i) {
            timer.start();
            critical_path = cpm::CriticalPathFinder::findLongestCriticalPath(graph);
            timer.stop();
            if (i > 0) { // Discard warm-up
                measurements.push_back(timer.elapsedMilliseconds());
            }
        }

        benchmark::Stats stats = benchmark::computeStats(measurements);

        // Nodes examined: for simple CP finder, it's at least the path length.
        // If we want a better metric, we'd need to instrument the finder, 
        // but for now we'll log the path length.
        size_t cp_length = critical_path.size();

        std::cout << "  Average Runtime: " << stats.average << " ms" << std::endl;
        std::cout << "  Critical Path Length: " << cp_length << " tasks" << std::endl;

        benchmark::writeCSVRow(filename, {
            std::to_string(nodes),
            std::to_string(edges),
            std::to_string(stats.average),
            std::to_string(cp_length),
            std::to_string(nodes) // Assume worse case nodes examined for extraction
        });
    }
}
