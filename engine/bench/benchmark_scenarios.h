#ifndef CPM_BENCHMARK_SCENARIOS_H
#define CPM_BENCHMARK_SCENARIOS_H

#include <string>
#include <vector>

namespace cpm {

enum class ScenarioGroup {
    A_SCALABILITY,
    B_SHAPES,
    C_VALIDATION,
    D_CRITICAL_PATH,
    E_MEMORY,
    F_REALISTIC,
    G_THROUGHPUT,
    H_INCREMENTAL,
    I_LAYOUT
};

struct BenchmarkScenario {
    std::string id;
    ScenarioGroup group;
    std::string description;
    int node_count;
    double edge_probability;
    std::string graph_shape;
    int iterations;
    int seed;
};

static const std::vector<BenchmarkScenario> BENCHMARK_SCENARIOS = {
    // Group A: Scalability
    {"A1", ScenarioGroup::A_SCALABILITY, "Scalability: 50 nodes", 50, 0.008, "random", 1, 100},
    {"A2", ScenarioGroup::A_SCALABILITY, "Scalability: 500 nodes", 500, 0.008, "random", 1, 101},
    {"A3", ScenarioGroup::A_SCALABILITY, "Scalability: 1K nodes", 1000, 0.008, "random", 1, 102},
    {"A4", ScenarioGroup::A_SCALABILITY, "Scalability: 5K nodes", 5000, 0.008, "random", 1, 103},
    {"A5", ScenarioGroup::A_SCALABILITY, "Scalability: 10K nodes", 10000, 0.008, "random", 1, 104},
    
    // Group B: Graph Shapes
    {"B1", ScenarioGroup::B_SHAPES, "Shape: Linear chain", 1000, 0.001, "linear", 1, 200},
    {"B2", ScenarioGroup::B_SHAPES, "Shape: Wide branching", 1000, 0.008, "wide", 1, 201},
    {"B3", ScenarioGroup::B_SHAPES, "Shape: Diamond cascade", 1000, 0.008, "diamond", 1, 202},
    {"B4", ScenarioGroup::B_SHAPES, "Shape: Multilevel tree", 1000, 0.006, "tree", 1, 203},
    {"B5", ScenarioGroup::B_SHAPES, "Shape: Dense DAG", 1000, 0.05, "dense", 1, 204},
    
    // Group C: Validation
    {"C1", ScenarioGroup::C_VALIDATION, "Validation: Large valid DAG", 5000, 0.008, "random", 1, 300},
    {"C2", ScenarioGroup::C_VALIDATION, "Validation: Large with cycle", 5000, 0.008, "random", 1, 301},
    {"C3", ScenarioGroup::C_VALIDATION, "Validation: Duplicate edges", 5000, 0.008, "random", 1, 302},
    
    // Group D: Critical Path
    {"D1", ScenarioGroup::D_CRITICAL_PATH, "CritPath: Single path", 2000, 0.003, "linear", 1, 400},
    {"D2", ScenarioGroup::D_CRITICAL_PATH, "CritPath: Multiple paths", 2000, 0.008, "diamond", 1, 401},
    {"D3", ScenarioGroup::D_CRITICAL_PATH, "CritPath: Highly parallel", 2000, 0.02, "wide", 1, 402},
    
    // Group E: Memory
    {"E1", ScenarioGroup::E_MEMORY, "Memory: 100 nodes", 100, 0.008, "random", 1, 500},
    {"E2", ScenarioGroup::E_MEMORY, "Memory: 1K nodes", 1000, 0.008, "random", 1, 501},
    {"E3", ScenarioGroup::E_MEMORY, "Memory: 5K nodes", 5000, 0.008, "random", 1, 502},
    {"E4", ScenarioGroup::E_MEMORY, "Memory: 10K nodes", 10000, 0.008, "random", 1, 503},
    
    // Group F: Realistic
    {"F1", ScenarioGroup::F_REALISTIC, "Realistic: Construction project", 200, 0.008, "random", 1, 600},
    {"F2", ScenarioGroup::F_REALISTIC, "Realistic: Software project", 500, 0.008, "random", 1, 601},
    {"F3", ScenarioGroup::F_REALISTIC, "Realistic: BAJA vehicle project", 400, 0.008, "random", 1, 602},
    
    // Group G: Throughput
    {"G1", ScenarioGroup::G_THROUGHPUT, "Throughput: 1 run", 1000, 0.008, "random", 1, 700},
    {"G2", ScenarioGroup::G_THROUGHPUT, "Throughput: 100 runs", 1000, 0.008, "random", 100, 701},
    {"G3", ScenarioGroup::G_THROUGHPUT, "Throughput: 1000 runs", 1000, 0.008, "random", 1000, 702},
    
    // Group H: Incremental
    {"H1", ScenarioGroup::H_INCREMENTAL, "Incremental: Add task", 5000, 0.008, "random", 1, 800},
    {"H2", ScenarioGroup::H_INCREMENTAL, "Incremental: Remove task", 5000, 0.008, "random", 1, 801},
    {"H3", ScenarioGroup::H_INCREMENTAL, "Incremental: Change duration", 5000, 0.008, "random", 1, 802},
    
    // Group I: Layout
    {"I1", ScenarioGroup::I_LAYOUT, "Layout: CPM-only (small)", 500, 0.008, "random", 1, 900},
    {"I2", ScenarioGroup::I_LAYOUT, "Layout: CPM-only (medium)", 2000, 0.008, "random", 1, 901},
};

}  // namespace cpm

#endif  // CPM_BENCHMARK_SCENARIOS_H
