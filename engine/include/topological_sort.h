#ifndef TOPOLOGICAL_SORT_H
#define TOPOLOGICAL_SORT_H

#include "cpm_types.h"
#include <vector>
#include <string>
#include <map>

namespace cpm {

// TopologicalSort class - implements Kahn's algorithm for DAG ordering
// Reference: plan.md lines ~115-153
class TopologicalSort {
public:
    // Perform topological sort on validated graph
    // Assumes graph has been validated (no cycles, valid references)
    // Returns tasks in topological order
    // Throws CpmComputationError if graph is not a valid DAG
    static std::vector<std::string> sort(const ProjectGraph& graph);
    
    // Get in-degree of a task (number of predecessors)
    static int getInDegree(const ProjectGraph& graph, const std::string& task_id);
    
    // Get rank hints for visualization (topological level of each task)
    // Rank increases as we move through the topological ordering
    static std::map<std::string, int> getRankHints(const ProjectGraph& graph, 
                                                    const std::vector<std::string>& topo_order);

private:
    // Kahn's algorithm implementation (internal)
    // Returns topological order or throws if graph is not a DAG
    static std::vector<std::string> kahnsAlgorithm(const ProjectGraph& graph);
};

}  // namespace cpm

#endif  // TOPOLOGICAL_SORT_H
