#include "graph_generator.h"
#include "graph_builder.h"

#include <algorithm>
#include <stdexcept>

using namespace cpm;

std::shared_ptr<ProjectGraph> GraphGenerator::generateRandomDAG(
    int node_count, double edge_prob, const std::string& shape, int seed) {
    if (node_count <= 0) {
        throw std::invalid_argument("Node count must be > 0");
    }

    if (shape == "linear") {
        return generateLinearChain(node_count, seed);
    } else if (shape == "wide") {
        return generateWideGraph(node_count, edge_prob, seed);
    } else if (shape == "diamond") {
        return generateDiamondCascade(node_count, seed);
    } else if (shape == "tree") {
        return generateMultilevelTree(node_count, seed);
    } else if (shape == "dense") {
        return generateDenseDAG(node_count, edge_prob, seed);
    } else {
        return generateRandomDAGGeneric(node_count, edge_prob, seed);
    }
}

std::shared_ptr<ProjectGraph> GraphGenerator::generateLinearChain(int node_count, int seed) {
    GraphBuilder builder;
    builder.setProjectStart("2024-01-01");

    for (int i = 0; i < node_count; ++i) {
        builder.addTask("T" + std::to_string(i), 1.0 + (i % 5) * 0.5);
    }

    for (int i = 0; i < node_count - 1; ++i) {
        builder.addDependency("T" + std::to_string(i), "T" + std::to_string(i + 1),
                            DependencyType::FS, 0.0, LagUnit::DAYS);
    }

    return builder.build();
}

std::shared_ptr<ProjectGraph> GraphGenerator::generateWideGraph(
    int node_count, double edge_prob, int seed) {
    GraphBuilder builder;
    builder.setProjectStart("2024-01-01");

    builder.addTask("T0", 1.0);

    for (int i = 1; i < node_count; ++i) {
        builder.addTask("T" + std::to_string(i), 1.0 + (i % 5) * 0.5);
    }

    for (int i = 1; i < node_count; ++i) {
        builder.addDependency("T0", "T" + std::to_string(i), DependencyType::FS, 0.0, LagUnit::DAYS);
    }

    return builder.build();
}

std::shared_ptr<ProjectGraph> GraphGenerator::generateDiamondCascade(int node_count, int seed) {
    GraphBuilder builder;
    builder.setProjectStart("2024-01-01");

    for (int i = 0; i < node_count; ++i) {
        builder.addTask("T" + std::to_string(i), 1.0 + (i % 3));
    }

    int diamonds = node_count / 4;
    for (int d = 0; d < diamonds; ++d) {
        int start = d * 4;
        if (start + 3 < node_count) {
            builder.addDependency("T" + std::to_string(start), "T" + std::to_string(start + 1),
                                DependencyType::FS, 0.0, LagUnit::DAYS);
            builder.addDependency("T" + std::to_string(start), "T" + std::to_string(start + 2),
                                DependencyType::FS, 0.0, LagUnit::DAYS);
            builder.addDependency("T" + std::to_string(start + 1), "T" + std::to_string(start + 3),
                                DependencyType::FS, 0.0, LagUnit::DAYS);
            builder.addDependency("T" + std::to_string(start + 2), "T" + std::to_string(start + 3),
                                DependencyType::FS, 0.0, LagUnit::DAYS);
        }
    }

    return builder.build();
}

std::shared_ptr<ProjectGraph> GraphGenerator::generateMultilevelTree(int node_count, int seed) {
    GraphBuilder builder;
    builder.setProjectStart("2024-01-01");

    for (int i = 0; i < node_count; ++i) {
        builder.addTask("T" + std::to_string(i), 1.0 + (i % 5) * 0.5);
    }

    int node_index = 1;
    for (int parent = 0; parent < node_count && node_index < node_count; ++parent) {
        for (int child = 0; child < 2 && node_index < node_count; ++child, ++node_index) {
            builder.addDependency("T" + std::to_string(parent), "T" + std::to_string(node_index),
                                DependencyType::FS, 0.0, LagUnit::DAYS);
        }
    }

    return builder.build();
}

std::shared_ptr<ProjectGraph> GraphGenerator::generateDenseDAG(
    int node_count, double edge_prob, int seed) {
    GraphBuilder builder;
    builder.setProjectStart("2024-01-01");

    for (int i = 0; i < node_count; ++i) {
        builder.addTask("T" + std::to_string(i), 1.0 + (i % 5) * 0.5);
    }

    std::mt19937 rng(seed);
    std::uniform_real_distribution<double> prob_dist(0.0, 1.0);

    for (int i = 0; i < node_count; ++i) {
        for (int j = i + 1; j < node_count && j - i < 50; ++j) {
            if (prob_dist(rng) < edge_prob * 10) {
                builder.addDependency("T" + std::to_string(i), "T" + std::to_string(j),
                                    DependencyType::FS, 0.0, LagUnit::DAYS);
            }
        }
    }

    return builder.build();
}

std::shared_ptr<ProjectGraph> GraphGenerator::generateRandomDAGGeneric(
    int node_count, double edge_prob, int seed) {
    GraphBuilder builder;
    builder.setProjectStart("2024-01-01");

    for (int i = 0; i < node_count; ++i) {
        builder.addTask("T" + std::to_string(i), 1.0 + (i % 5) * 0.5);
    }

    std::mt19937 rng(seed);
    std::uniform_real_distribution<double> prob_dist(0.0, 1.0);
    std::uniform_real_distribution<double> lag_dist(0.0, 2.0);
    std::uniform_int_distribution<int> dep_type_dist(0, 3);

    for (int i = 0; i < node_count; ++i) {
        for (int j = i + 1; j < node_count; ++j) {
            if (prob_dist(rng) < edge_prob) {
                DependencyType dt = static_cast<DependencyType>(dep_type_dist(rng));
                double lag = lag_dist(rng);
                builder.addDependency("T" + std::to_string(i), "T" + std::to_string(j),
                                    dt, lag, LagUnit::DAYS);
            }
        }
    }

    return builder.build();
}
