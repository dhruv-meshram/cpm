#ifndef CPM_CRITICAL_PATH_FINDER_H
#define CPM_CRITICAL_PATH_FINDER_H

#include "cpm_types.h"
#include <vector>
#include <string>

namespace cpm {

/**
 * Stage 6: Critical Path Extraction
 * 
 * Extracts all critical paths from the graph.
 * A critical path is a chain of critical tasks (TF ≈ 0) from project start to finish.
 * 
 * References: plan.md lines 266-290 (Critical Path Extraction Algorithm)
 */
class CriticalPathFinder {
public:
    /**
     * Find all critical paths in the project
     * Returns a vector of paths, where each path is a vector of task IDs
     * 
     * Precondition: Float calculations must be complete (totalFloat calculated)
     * 
     * Algorithm:
     * 1. Find all project start tasks (no critical predecessors)
     * 2. DFS from each start task through only critical successors
     * 3. Collect paths ending at project finish tasks
     * 
     * Returns: vector of critical paths (each path is vector<string> of task IDs)
     */
    static std::vector<std::vector<std::string>> findAllCriticalPaths(
        const ProjectGraph& graph);

    /**
     * Find the single longest critical path (most common use case)
     * If multiple paths of equal length exist, returns first found
     * 
     * Returns: vector of task IDs representing one critical path
     */
    static std::vector<std::string> findLongestCriticalPath(
        const ProjectGraph& graph);

    /**
     * Check if a task is a critical start task (no predecessors with TF≈0)
     */
    static bool isCriticalStart(const ProjectGraph& graph, const std::string& task_id);

    /**
     * Check if a task is a critical end task (no successors with TF≈0)
     */
    static bool isCriticalEnd(const ProjectGraph& graph, const std::string& task_id);

    /**
     * Get all critical successors of a task
     * Critical successor = successor with TF ≈ 0
     */
    static std::vector<std::string> getCriticalSuccessors(
        const ProjectGraph& graph, const std::string& task_id);

    /**
     * Calculate the duration of a path (sum of task durations)
     */
    static double calculatePathDuration(
        const ProjectGraph& graph, const std::vector<std::string>& path);

private:
    /**
     * DFS helper for finding critical paths
     * Recursively explores critical successors
     */
    static void findPathsDFS(
        const ProjectGraph& graph,
        const std::string& current_task,
        std::vector<std::string>& current_path,
        std::vector<std::vector<std::string>>& all_paths);
};

}  // namespace cpm

#endif  // CPM_CRITICAL_PATH_FINDER_H
