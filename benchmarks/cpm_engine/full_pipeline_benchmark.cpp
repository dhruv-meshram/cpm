#include "benchmark_utils.hpp"
#include "graph_generator.hpp"
#include "critical_path_finder.h"
#include "float_calculator.h"
#include "schedule_calculator.h"
#include "topological_sort.h"
#include <iostream>
#include <vector>

void runFullPipelineBenchmark() {
    std::string filename = "benchmarks/cpm_engine/results/full_pipeline.csv";
    benchmark::writeCSVRow(filename, {"nodes", "edges", "total_runtime_ms", "throughput_nodes_per_sec", "edge_processing_rate_per_sec"});

    GraphGenerator generator(42);

    for (size_t nodes : GRAPH_SIZES) {
        cpm::ProjectGraph graph = generator.generateDAG(nodes, Density::MEDIUM);
        size_t edges = graph.dependencies.size();
        auto project_start = graph.project_start;

        std::cout << "[FullPipeline] Graph: " << nodes << " nodes / " << edges << " edges" << std::endl;

        std::vector<double> measurements;
        benchmark::Timer timer;

        for (int i = 0; i < BENCHMARK_RUNS; ++i) {
            timer.start();
            
            auto topo_order = cpm::TopologicalSort::sort(graph);
            auto project_finish = cpm::ScheduleCalculator::forwardPass(graph, topo_order, project_start);
            cpm::ScheduleCalculator::backwardPass(graph, topo_order, project_finish);
            cpm::FloatCalculator::calculateTotalFloat(graph);
            cpm::FloatCalculator::calculateFreeFloat(graph);
            auto cp = cpm::CriticalPathFinder::findLongestCriticalPath(graph);
            
            timer.stop();
            if (i > 0) { // Discard warm-up
                measurements.push_back(timer.elapsedMilliseconds());
            }
        }

        benchmark::Stats stats = benchmark::computeStats(measurements);
        
        double throughput = nodes / (stats.average / 1000.0);
        double edge_rate = edges / (stats.average / 1000.0);

        std::cout << "  Average Runtime: " << stats.average << " ms" << std::endl;
        std::cout << "  Throughput: " << throughput / 1e6 << "M nodes/sec" << std::endl;

        benchmark::writeCSVRow(filename, {
            std::to_string(nodes),
            std::to_string(edges),
            std::to_string(stats.average),
            std::to_string(throughput),
            std::to_string(edge_rate)
        });
    }
}
