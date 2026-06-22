#include "benchmark_utils.hpp"
#include "graph_generator.hpp"
#include "topological_sort.h"
#include <iostream>
#include <vector>

void runTopoSortBenchmark() {
    std::string filename = "benchmarks/cpm_engine/results/topo_sort.csv";
    benchmark::writeCSVRow(filename, {"nodes", "edges", "runtime_ms", "runtime_per_node_ns", "throughput_nodes_per_sec"});

    GraphGenerator generator(42);

    for (size_t nodes : GRAPH_SIZES) {
        cpm::ProjectGraph graph = generator.generateDAG(nodes, Density::MEDIUM);
        size_t edges = graph.dependencies.size();

        std::cout << "[TopoSort] Graph: " << nodes << " nodes / " << edges << " edges" << std::endl;

        std::vector<double> measurements;
        benchmark::Timer timer;

        for (int i = 0; i < BENCHMARK_RUNS; ++i) {
            timer.start();
            auto result = cpm::TopologicalSort::sort(graph);
            timer.stop();
            if (i > 0) { // Discard warm-up
                measurements.push_back(timer.elapsedMilliseconds());
            }
        }

        benchmark::Stats stats = benchmark::computeStats(measurements);
        
        double runtime_per_node_ns = (stats.average * 1e6) / nodes;
        double throughput = nodes / (stats.average / 1000.0);

        std::cout << "  Average Runtime: " << stats.average << " ms" << std::endl;
        std::cout << "  Throughput: " << throughput / 1e6 << "M nodes/sec" << std::endl;

        benchmark::writeCSVRow(filename, {
            std::to_string(nodes),
            std::to_string(edges),
            std::to_string(stats.average),
            std::to_string(runtime_per_node_ns),
            std::to_string(throughput)
        });
    }
}
