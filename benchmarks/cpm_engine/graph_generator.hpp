#ifndef GRAPH_GENERATOR_HPP
#define GRAPH_GENERATOR_HPP

#include "cpm_types.h"
#include <random>

enum class Density {
    SPARSE, // E ≈ V
    MEDIUM, // E ≈ 5V
    DENSE   // E ≈ 10V
};

class GraphGenerator {
public:
    explicit GraphGenerator(uint32_t seed = 42) : m_gen(seed) {}

    /**
     * @brief Generates a valid Directed Acyclic Graph (DAG) for CPM benchmarking
     * 
     * @param vertexCount Number of tasks
     * @param density Level of edge connectivity
     * @return cpm::ProjectGraph 
     */
    cpm::ProjectGraph generateDAG(size_t vertexCount, Density density);

private:
    std::mt19937 m_gen;

    size_t getEdgeCount(size_t v, Density d) {
        switch (d) {
            case Density::SPARSE: return v;
            case Density::MEDIUM: return 5 * v;
            case Density::DENSE:  return 10 * v;
            default: return v;
        }
    }
};

#endif // GRAPH_GENERATOR_HPP
