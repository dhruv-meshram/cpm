// Public API header for CPM Engine - frozen surface v1.0.0
#ifndef CPM_ENGINE_CPM_API_H
#define CPM_ENGINE_CPM_API_H

#include <string>
#include <vector>
#include <optional>

namespace cpm {

struct Task {
    std::string id;
    double duration = 0.0; // time units (consistent across engine)
    // optional metadata for integrators
    std::optional<std::string> metadata;
};

struct Dependency {
    std::string from; // predecessor task id
    std::string to;   // successor task id
    // optional lag/lead (positive = lag, negative = lead)
    std::optional<double> lag;
};

struct ProjectInput {
    std::vector<Task> tasks;
    std::vector<Dependency> dependencies;
};

struct TaskResult {
    std::string id;
    double earliest_start = 0.0;
    double earliest_finish = 0.0;
    double latest_start = 0.0;
    double latest_finish = 0.0;
    double float_time = 0.0;
};

struct ProjectResult {
    double projectDuration = 0.0;
    // ordered list of task ids on one representative critical path
    std::vector<std::string> criticalPath;
    // per-task computed schedule fields
    std::vector<TaskResult> tasks;
};

} // namespace cpm

#endif // CPM_ENGINE_CPM_API_H
