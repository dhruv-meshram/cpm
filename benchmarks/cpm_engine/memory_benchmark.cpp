#include "benchmark_utils.hpp"
#include "graph_generator.hpp"
#include "critical_path_finder.h"
#include "float_calculator.h"
#include "schedule_calculator.h"
#include "topological_sort.h"
#include <iostream>
#include <vector>

void runMemoryBenchmark() {
    std::string filename = "benchmarks/cpm_engine/results/memory_usage.csv";
    benchmark::writeCSVRow(filename, {"nodes", "edges", "peak_ram_mb", "bytes_per_node", "bytes_per_edge"});

    GraphGenerator generator(42);

    std::array<Density, 3> densities = {Density::SPARSE, Density::MEDIUM, Density::DENSE};

    for (size_t nodes : GRAPH_SIZES) {
        for (Density d : densities) {
            // Re-allocate fresh for every test to isolate memory impact
            {
                cpm::ProjectGraph graph = generator.generateDAG(nodes, d);
                size_t edges = graph.dependencies.size();
                auto project_start = graph.project_start;

                std::cout << "[Memory] Graph: " << nodes << " nodes / " << edges << " edges" << std::endl;

                // Run pipeline once to populate all fields
                auto topo_order = cpm::TopologicalSort::sort(graph);
                auto project_finish = cpm::ScheduleCalculator::forwardPass(graph, topo_order, project_start);
                cpm::ScheduleCalculator::backwardPass(graph, topo_order, project_finish);
                cpm::FloatCalculator::calculateTotalFloat(graph);
                cpm::FloatCalculator::calculateFreeFloat(graph);
                
                benchmark::MemoryInfo mem = benchmark::getMemoryUsage();
                double peak_mb = benchmark::kbToMb(mem.peak_rss_kb);
                double bytes_per_node = (peak_mb * 1024 * 1024) / nodes;
                double bytes_per_edge = edges > 0 ? (peak_mb * 1024 * 1024) / edges : 0;

                std::cout << "  Peak RAM: " << peak_mb << " MB" << std::endl;

                benchmark::writeCSVRow(filename, {
                    std::to_string(nodes),
                    std::to_string(edges),
                    std::to_string(peak_mb),
                    std::to_string(bytes_per_node),
                    std::to_string(bytes_per_edge)
                });
            }
            // Graph out of scope, but Peak RSS won't decrease. 
            // This benchmark effectively shows memory required for the largest graphs.
        }
    }
}
