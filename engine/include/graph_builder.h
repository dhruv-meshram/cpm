#ifndef GRAPH_BUILDER_H
#define GRAPH_BUILDER_H

#include "cpm_types.h"
#include <string>
#include <memory>

namespace cpm {

// GraphBuilder class - constructs and validates ProjectGraph
// Follows builder pattern for fluent API
class GraphBuilder {
public:
    // Constructor
    GraphBuilder();
    
    // Set project start date
    GraphBuilder& setProjectStart(const DateTime& start_date);
    
    // Set project start from string (YYYY-MM-DD format)
    GraphBuilder& setProjectStart(const std::string& date_str);
    
    // Add a task to the graph
    // Performs partial validation:
    //  - Task ID must be non-empty
    //  - Duration must be >= 0
    //  - Task ID must not already exist
    GraphBuilder& addTask(const std::string& task_id, double duration);
    
    // Add a task with all fields
    GraphBuilder& addTask(const Task& task);
    
    // Add a dependency between two tasks
    // Performs partial validation:
    //  - Both predecessor and successor IDs must be provided
    //  - Will validate they exist in full validation step
    GraphBuilder& addDependency(const std::string& predecessor_id, 
                                const std::string& successor_id,
                                DependencyType type = DependencyType::FS,
                                double lag = 0.0,
                                LagUnit lag_unit = LagUnit::DAYS,
                                double strength = 1.0);
    
    // Build the ProjectGraph with full validation
    // Throws CpmComputationError if validation fails
    // Validates (this is partial validation before CPM computation):
    //  1. Graph is non-empty (at least one task exists)
    //  2. All task durations are non-negative
    //  3. All dependency references exist in task map
    //  Note: Cycle detection happens during topological sort, not here
    std::unique_ptr<ProjectGraph> build();
    
    // Get current validation errors without throwing
    // Useful for client-side error display before full CPM computation
    std::vector<std::string> getValidationErrors() const;
    
    // Check if graph is valid without throwing
    bool isValid() const;

private:
    std::unique_ptr<ProjectGraph> graph_;
    
    // Validation helper methods
    void validateNonEmpty() const;
    void validateDurations() const;
    void validateReferences() const;
    std::vector<std::string> collectAllErrors() const;
};

}  // namespace cpm

#endif  // GRAPH_BUILDER_H
