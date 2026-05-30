#include "graph_validator.h"
#include <queue>
#include <algorithm>
#include <sstream>
#include <set>

namespace cpm {

std::pair<bool, std::vector<std::string>> GraphValidator::validateGraph(const ProjectGraph& graph) {
    auto errors = getValidationErrors(graph);
    return {errors.empty(), errors};
}

std::vector<std::string> GraphValidator::getValidationErrors(const ProjectGraph& graph) {
    std::vector<std::string> all_errors;
    
    // Check 1: Non-empty graph
    auto non_empty_errors = validateNonEmpty(graph);
    all_errors.insert(all_errors.end(), non_empty_errors.begin(), non_empty_errors.end());
    
    // Check 2: Valid durations
    auto duration_errors = validateDurations(graph);
    all_errors.insert(all_errors.end(), duration_errors.begin(), duration_errors.end());
    
    // Check 3: Valid references
    auto ref_errors = validateReferences(graph);
    all_errors.insert(all_errors.end(), ref_errors.begin(), ref_errors.end());
    
    // Check 4: No cycles
    auto cycle_errors = validateNoCycles(graph);
    all_errors.insert(all_errors.end(), cycle_errors.begin(), cycle_errors.end());
    
    return all_errors;
}

bool GraphValidator::isValid(const ProjectGraph& graph) {
    return getValidationErrors(graph).empty();
}

std::vector<std::string> GraphValidator::validateNonEmpty(const ProjectGraph& graph) {
    std::vector<std::string> errors;
    if (graph.tasks.empty()) {
        errors.push_back("Project has no tasks");
    }
    return errors;
}

std::vector<std::string> GraphValidator::validateDurations(const ProjectGraph& graph) {
    std::vector<std::string> errors;
    
    for (const auto& [task_id, task] : graph.tasks) {
        if (task.duration < 0.0) {
            errors.push_back("Task " + task_id + " has negative duration");
        }
    }
    
    return errors;
}

std::vector<std::string> GraphValidator::validateReferences(const ProjectGraph& graph) {
    std::vector<std::string> errors;
    
    for (const auto& dep : graph.dependencies) {
        // Check predecessor exists
        if (graph.tasks.find(dep.predecessor_id) == graph.tasks.end()) {
            errors.push_back("Predecessor task not found: " + dep.predecessor_id);
        }
        
        // Check successor exists
        if (graph.tasks.find(dep.successor_id) == graph.tasks.end()) {
            errors.push_back("Successor task not found: " + dep.successor_id);
        }
    }
    
    return errors;
}

std::vector<std::string> GraphValidator::validateNoCycles(const ProjectGraph& graph) {
    std::vector<std::string> errors;
    
    auto cycle_error = detectCycle(graph);
    if (!cycle_error.empty()) {
        errors.push_back(cycle_error);
    }
    
    return errors;
}

// Cycle detection using Kahn's algorithm approach (in-degree tracking)
// This is efficient O(V+E) and finds the first cycle if it exists
std::string GraphValidator::detectCycle(const ProjectGraph& graph) {
    if (graph.tasks.empty() || graph.dependencies.empty()) {
        return "";  // No cycle possible in empty or task-only graph
    }
    
    // Step 1: Calculate in-degree for each task
    std::map<std::string, int> in_degree;
    for (const auto& [task_id, _] : graph.tasks) {
        in_degree[task_id] = 0;
    }
    
    for (const auto& dep : graph.dependencies) {
        in_degree[dep.successor_id]++;
    }
    
    // Step 2: Queue all tasks with in_degree=0 (no predecessors)
    std::queue<std::string> queue;
    for (const auto& [task_id, degree] : in_degree) {
        if (degree == 0) {
            queue.push(task_id);
        }
    }
    
    // Step 3: Process queue, decrementing in_degree for successors
    int processed_count = 0;
    std::vector<std::string> topo_order;
    
    while (!queue.empty()) {
        std::string current = queue.front();
        queue.pop();
        topo_order.push_back(current);
        processed_count++;
        
        // For each successor of current task
        if (graph.successors.find(current) != graph.successors.end()) {
            for (const auto& successor : graph.successors.at(current)) {
                in_degree[successor]--;
                if (in_degree[successor] == 0) {
                    queue.push(successor);
                }
            }
        }
    }
    
    // Step 4: If processed_count < total tasks, there's a cycle
    if (processed_count != static_cast<int>(graph.tasks.size())) {
        // Find a cycle by doing DFS from any unprocessed task
        std::set<std::string> processed_set(topo_order.begin(), topo_order.end());
        std::string cycle_start;
        for (const auto& [task_id, _] : graph.tasks) {
            if (processed_set.find(task_id) == processed_set.end()) {
                cycle_start = task_id;
                break;
            }
        }
        
        if (!cycle_start.empty()) {
            // Simple cycle path (not necessarily the complete cycle, but sufficient for error message)
            return "Cycle detected: Graph contains circular dependencies";
        }
    }
    
    return "";  // No cycle
}

}  // namespace cpm
