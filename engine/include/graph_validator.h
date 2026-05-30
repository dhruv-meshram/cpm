#ifndef GRAPH_VALIDATOR_H
#define GRAPH_VALIDATOR_H

#include "cpm_types.h"
#include <vector>
#include <string>
#include <map>

namespace cpm {

// GraphValidator class - validates ProjectGraph for CPM computation
// Checks:
//   1. Non-empty graph (at least one task)
//   2. Positive durations (all >= 0)
//   3. Valid references (all task IDs exist)
//   4. No cycles (DAG property)
class GraphValidator {
public:
    // Validate graph and return (is_valid, errors)
    // Throws CpmComputationError if any validation fails, with all accumulated errors
    // Reference: plan.md lines ~82-104
    static std::pair<bool, std::vector<std::string>> validateGraph(const ProjectGraph& graph);
    
    // Get validation errors without throwing
    static std::vector<std::string> getValidationErrors(const ProjectGraph& graph);
    
    // Check if graph is valid
    static bool isValid(const ProjectGraph& graph);

private:
    // Helper methods - each returns list of errors found (empty if valid)
    static std::vector<std::string> validateNonEmpty(const ProjectGraph& graph);
    static std::vector<std::string> validateDurations(const ProjectGraph& graph);
    static std::vector<std::string> validateReferences(const ProjectGraph& graph);
    static std::vector<std::string> validateNoCycles(const ProjectGraph& graph);
    
    // Cycle detection via in-degree and topological sort probe
    // If no cycle, populates topological_order parameter
    // If cycle exists, returns error message with cycle path
    static std::string detectCycle(const ProjectGraph& graph);
};

}  // namespace cpm

#endif  // GRAPH_VALIDATOR_H
