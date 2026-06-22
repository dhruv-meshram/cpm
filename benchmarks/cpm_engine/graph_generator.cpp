#include "graph_generator.hpp"
#include <algorithm>
#include <set>

cpm::ProjectGraph GraphGenerator::generateDAG(size_t vertexCount, Density density) {
    cpm::ProjectGraph graph;
    graph.project_start = std::chrono::system_clock::now();

    // 1. Create Tasks
    std::uniform_real_distribution<double> distDuration(1.0, 10.0);
    for (size_t i = 0; i < vertexCount; ++i) {
        std::string id = "T" + std::to_string(i);
        cpm::Task task(id, distDuration(m_gen));
        graph.tasks[id] = task;
    }

    // 2. Create Edges
    size_t targetEdges = getEdgeCount(vertexCount, density);
    // A DAG can have at most V*(V-1)/2 edges.
    size_t maxPossibleEdges = (vertexCount * (vertexCount - 1)) / 2;
    if (targetEdges > maxPossibleEdges) {
        targetEdges = maxPossibleEdges;
    }

    // Use a set to avoid duplicate edges
    std::set<std::pair<size_t, size_t>> edges;
    
    std::uniform_int_distribution<size_t> distV(0, vertexCount - 1);

    // To ensure DAG, only allow i -> j where i < j
    while (edges.size() < targetEdges) {
        size_t u = distV(m_gen);
        size_t v = distV(m_gen);
        
        if (u == v) continue;
        if (u > v) std::swap(u, v);
        
        edges.insert({u, v});

        // Optimization: if we're very sparse, this is fast. 
        // If dense, it might slow down. But max density is 10V, which is still much less than V^2 for large V.
    }

    for (const auto& edge : edges) {
        std::string uId = "T" + std::to_string(edge.first);
        std::string vId = "T" + std::to_string(edge.second);
        
        cpm::Dependency dep(uId, vId, cpm::DependencyType::FS);
        graph.dependencies.push_back(dep);
        graph.addSuccessor(uId, vId);
        graph.addPredecessor(vId, uId);
    }

    return graph;
}
