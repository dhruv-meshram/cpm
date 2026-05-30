#include "critical_path_finder.h"
#include "float_calculator.h"
#include <algorithm>

namespace cpm {

std::vector<std::vector<std::string>> CriticalPathFinder::findAllCriticalPaths(
    const ProjectGraph& graph) {
    // Plan.md: lines 266-290
    std::vector<std::vector<std::string>> all_paths;
    
    // Find all critical start tasks (no critical predecessors)
    for (const auto& [task_id, task] : graph.tasks) {
        if (isCriticalStart(graph, task_id)) {
            // Begin DFS from this critical start task
            std::vector<std::string> current_path;
            findPathsDFS(graph, task_id, current_path, all_paths);
        }
    }
    
    return all_paths;
}

std::vector<std::string> CriticalPathFinder::findLongestCriticalPath(
    const ProjectGraph& graph) {
    // Plan.md: lines 274-283
    auto all_paths = findAllCriticalPaths(graph);
    
    if (all_paths.empty()) {
        return {};
    }
    
    // Find path with maximum duration
    std::vector<std::string> longest = all_paths[0];
    double max_duration = calculatePathDuration(graph, longest);
    
    for (const auto& path : all_paths) {
        double duration = calculatePathDuration(graph, path);
        if (duration > max_duration) {
            max_duration = duration;
            longest = path;
        }
    }
    
    return longest;
}

bool CriticalPathFinder::isCriticalStart(
    const ProjectGraph& graph, const std::string& task_id) {
    // Plan.md: lines 266-270
    // A task is a critical start if:
    // 1. It is critical (TF ≈ 0)
    // 2. All its predecessors are non-critical (or doesn't exist)
    
    if (!FloatCalculator::isCritical(graph.tasks.at(task_id))) {
        return false;
    }
    
    // Check all predecessors (if any exist)
    auto it = graph.predecessors.find(task_id);
    if (it != graph.predecessors.end()) {
        for (const auto& pred_id : it->second) {
            if (FloatCalculator::isCritical(graph.tasks.at(pred_id))) {
                return false;  // Has a critical predecessor, not a start
            }
        }
    }
    
    return true;
}

bool CriticalPathFinder::isCriticalEnd(
    const ProjectGraph& graph, const std::string& task_id) {
    // A task is a critical end if:
    // 1. It is critical (TF ≈ 0)
    // 2. All its successors are non-critical (or doesn't exist)
    
    if (!FloatCalculator::isCritical(graph.tasks.at(task_id))) {
        return false;
    }
    
    // Check all successors (if any exist)
    auto it = graph.successors.find(task_id);
    if (it != graph.successors.end()) {
        for (const auto& succ_id : it->second) {
            if (FloatCalculator::isCritical(graph.tasks.at(succ_id))) {
                return false;  // Has a critical successor, not an end
            }
        }
    }
    
    return true;
}

std::vector<std::string> CriticalPathFinder::getCriticalSuccessors(
    const ProjectGraph& graph, const std::string& task_id) {
    // Plan.md: lines 271-273
    std::vector<std::string> critical_succs;
    
    auto it = graph.successors.find(task_id);
    if (it == graph.successors.end()) {
        return critical_succs;
    }
    
    for (const auto& succ_id : it->second) {
        if (FloatCalculator::isCritical(graph.tasks.at(succ_id))) {
            critical_succs.push_back(succ_id);
        }
    }
    
    return critical_succs;
}

double CriticalPathFinder::calculatePathDuration(
    const ProjectGraph& graph, const std::vector<std::string>& path) {
    // Plan.md: lines 284-290
    double duration = 0.0;
    
    for (const auto& task_id : path) {
        duration += graph.tasks.at(task_id).duration;
    }
    
    return duration;
}

void CriticalPathFinder::findPathsDFS(
    const ProjectGraph& graph,
    const std::string& current_task,
    std::vector<std::string>& current_path,
    std::vector<std::vector<std::string>>& all_paths) {
    // Add current task to path
    current_path.push_back(current_task);
    
    // Get critical successors
    auto critical_succs = getCriticalSuccessors(graph, current_task);
    
    // If no critical successors, we've reached an end of a critical path
    if (critical_succs.empty()) {
        // Save current path
        all_paths.push_back(current_path);
    } else {
        // Recurse through all critical successors
        for (const auto& succ_id : critical_succs) {
            findPathsDFS(graph, succ_id, current_path, all_paths);
        }
    }
    
    // Backtrack
    current_path.pop_back();
}

}  // namespace cpm
