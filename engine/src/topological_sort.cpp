#include "topological_sort.h"
#include <queue>
#include <map>
#include <algorithm>

namespace cpm {

std::vector<std::string> TopologicalSort::sort(const ProjectGraph& graph) {
    return kahnsAlgorithm(graph);
}

int TopologicalSort::getInDegree(const ProjectGraph& graph, const std::string& task_id) {
    int degree = 0;
    
    // Count number of predecessors
    if (graph.predecessors.find(task_id) != graph.predecessors.end()) {
        degree = graph.predecessors.at(task_id).size();
    }
    
    return degree;
}

std::map<std::string, int> TopologicalSort::getRankHints(const ProjectGraph& graph,
                                                         const std::vector<std::string>& topo_order) {
    std::map<std::string, int> ranks;
    
    // Simple approach: assign rank based on position in topological order
    // Later processed tasks get higher ranks
    // More sophisticated: process level-by-level to show depth
    
    // Build level-based ranks for better visualization
    std::map<std::string, int> level;
    std::map<std::string, bool> processed;
    
    // Initialize all with level 0
    for (const auto& [task_id, _] : graph.tasks) {
        level[task_id] = 0;
        processed[task_id] = false;
    }
    
    // Process in topological order, updating levels
    for (const auto& task_id : topo_order) {
        int max_pred_level = -1;
        
        // Find maximum level of all predecessors
        if (graph.predecessors.find(task_id) != graph.predecessors.end()) {
            for (const auto& pred_id : graph.predecessors.at(task_id)) {
                max_pred_level = std::max(max_pred_level, level[pred_id]);
            }
        }
        
        // This task's level is one more than max predecessor level
        if (max_pred_level >= 0) {
            level[task_id] = max_pred_level + 1;
        } else {
            level[task_id] = 0;  // Root task
        }
        
        processed[task_id] = true;
    }
    
    // Copy to rank map
    for (const auto& [task_id, lvl] : level) {
        ranks[task_id] = lvl;
    }
    
    return ranks;
}

// Kahn's Algorithm Implementation
// Reference: plan.md lines ~115-153
// O(V + E) time complexity
std::vector<std::string> TopologicalSort::kahnsAlgorithm(const ProjectGraph& graph) {
    // Step 1: Calculate in-degree for each task
    std::map<std::string, int> in_degree;
    for (const auto& [task_id, _] : graph.tasks) {
        in_degree[task_id] = getInDegree(graph, task_id);
    }
    
    // Step 2: Initialize queue with all tasks having in_degree = 0
    std::queue<std::string> queue;
    for (const auto& [task_id, degree] : in_degree) {
        if (degree == 0) {
            queue.push(task_id);
        }
    }
    
    // Step 3: Process queue
    std::vector<std::string> result;
    
    while (!queue.empty()) {
        std::string task = queue.front();
        queue.pop();
        result.push_back(task);
        
        // For each successor of current task:
        if (graph.successors.find(task) != graph.successors.end()) {
            for (const auto& successor : graph.successors.at(task)) {
                in_degree[successor]--;
                
                // When successor has no more prerequisites, enqueue it
                if (in_degree[successor] == 0) {
                    queue.push(successor);
                }
            }
        }
    }
    
    // Step 4: Check for cycles
    // If we processed fewer tasks than exist, there must be a cycle
    if (result.size() != graph.tasks.size()) {
        throw CpmComputationError(
            "Graph is not a DAG - topological sort failed. This should have been caught by validation."
        );
    }
    
    return result;
}

}  // namespace cpm
