#ifndef CPM_GRAPH_GENERATOR_H
#define CPM_GRAPH_GENERATOR_H

#include <memory>
#include <random>
#include <string>

#include "cpm_types.h"

namespace cpm {

class GraphGenerator {
public:
    static std::shared_ptr<ProjectGraph> generateRandomDAG(int node_count, double edge_prob, const std::string& shape, int seed);
    
private:
    static std::shared_ptr<ProjectGraph> generateLinearChain(int node_count, int seed);
    static std::shared_ptr<ProjectGraph> generateWideGraph(int node_count, double edge_prob, int seed);
    static std::shared_ptr<ProjectGraph> generateDiamondCascade(int node_count, int seed);
    static std::shared_ptr<ProjectGraph> generateMultilevelTree(int node_count, int seed);
    static std::shared_ptr<ProjectGraph> generateDenseDAG(int node_count, double edge_prob, int seed);
    static std::shared_ptr<ProjectGraph> generateRandomDAGGeneric(int node_count, double edge_prob, int seed);
};

}  // namespace cpm

#endif  // CPM_GRAPH_GENERATOR_H
