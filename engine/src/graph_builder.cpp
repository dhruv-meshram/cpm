#include "graph_builder.h"
#include <algorithm>
#include <sstream>

namespace cpm {

GraphBuilder::GraphBuilder() 
    : graph_(std::make_unique<ProjectGraph>()) {
    // Initialize with current time as default project start
    graph_->project_start = std::chrono::system_clock::now();
}

GraphBuilder& GraphBuilder::setProjectStart(const DateTime& start_date) {
    graph_->project_start = start_date;
    return *this;
}

GraphBuilder& GraphBuilder::setProjectStart(const std::string& date_str) {
    graph_->project_start = stringToDateTime(date_str);
    return *this;
}

GraphBuilder& GraphBuilder::addTask(const std::string& task_id, double duration) {
    Task task(task_id, duration);
    return addTask(task);
}

GraphBuilder& GraphBuilder::addTask(const Task& task) {
    // Validation: non-empty ID
    if (task.id.empty()) {
        throw CpmComputationError("Task ID cannot be empty");
    }
    
    // Validation: non-negative duration
    if (task.duration < 0.0) {
        throw CpmComputationError("Task " + task.id + " has negative duration");
    }
    
    // Validation: unique ID
    if (graph_->tasks.find(task.id) != graph_->tasks.end()) {
        throw CpmComputationError("Duplicate task ID: " + task.id);
    }
    
    graph_->tasks[task.id] = task;
    return *this;
}

GraphBuilder& GraphBuilder::addDependency(const std::string& predecessor_id,
                                         const std::string& successor_id,
                                         DependencyType type,
                                         double lag,
                                         LagUnit lag_unit,
                                         double strength) {
    // Basic validation: IDs must be non-empty
    if (predecessor_id.empty() || successor_id.empty()) {
        throw CpmComputationError("Dependency IDs cannot be empty");
    }
    
    // Create and store dependency
    // Full reference validation happens in build()
    Dependency dep(predecessor_id, successor_id, type, lag, lag_unit, strength);
    graph_->dependencies.push_back(dep);
    
    return *this;
}

void GraphBuilder::validateNonEmpty() const {
    if (graph_->tasks.empty()) {
        throw CpmComputationError("Project has no tasks");
    }
}

void GraphBuilder::validateDurations() const {
    for (const auto& [task_id, task] : graph_->tasks) {
        if (task.duration < 0.0) {
            throw CpmComputationError("Task " + task_id + " has negative duration");
        }
    }
}

void GraphBuilder::validateReferences() const {
    for (const auto& dep : graph_->dependencies) {
        // Check predecessor exists
        if (graph_->tasks.find(dep.predecessor_id) == graph_->tasks.end()) {
            throw CpmComputationError("Predecessor task not found: " + dep.predecessor_id);
        }
        
        // Check successor exists
        if (graph_->tasks.find(dep.successor_id) == graph_->tasks.end()) {
            throw CpmComputationError("Successor task not found: " + dep.successor_id);
        }
    }
}

std::vector<std::string> GraphBuilder::collectAllErrors() const {
    std::vector<std::string> errors;
    
    try {
        validateNonEmpty();
    } catch (const CpmComputationError& e) {
        errors.push_back(e.what());
    }
    
    try {
        validateDurations();
    } catch (const CpmComputationError& e) {
        errors.push_back(e.what());
    }
    
    try {
        validateReferences();
    } catch (const CpmComputationError& e) {
        errors.push_back(e.what());
    }
    
    return errors;
}

std::unique_ptr<ProjectGraph> GraphBuilder::build() {
    // Collect all validation errors
    auto errors = collectAllErrors();
    
    // If any errors, throw with all details
    if (!errors.empty()) {
        std::stringstream ss;
        ss << "Graph validation failed with " << errors.size() << " error(s):\n";
        for (size_t i = 0; i < errors.size(); ++i) {
            ss << "  " << (i + 1) << ". " << errors[i];
            if (i < errors.size() - 1) ss << "\n";
        }
        throw CpmComputationError(ss.str());
    }
    
    // Build adjacency structure for efficient traversal
    for (const auto& dep : graph_->dependencies) {
        graph_->addSuccessor(dep.predecessor_id, dep.successor_id);
        graph_->addPredecessor(dep.successor_id, dep.predecessor_id);
    }
    
    // Return the graph
    auto result = std::move(graph_);
    graph_ = std::make_unique<ProjectGraph>();  // Reset for next build if needed
    return result;
}

std::vector<std::string> GraphBuilder::getValidationErrors() const {
    return collectAllErrors();
}

bool GraphBuilder::isValid() const {
    return getValidationErrors().empty();
}

}  // namespace cpm
