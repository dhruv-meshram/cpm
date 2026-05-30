#include "schedule_calculator.h"
#include <algorithm>
#include <cmath>

namespace cpm {

double ScheduleCalculator::convertLagToDays(double lag, LagUnit unit) {
    switch (unit) {
        case LagUnit::DAYS:
            return lag;
        case LagUnit::HOURS:
            return lag / 24.0;
        case LagUnit::WEEKS:
            return lag * 7.0;
        default:
            throw CpmComputationError("Unknown lag unit");
    }
}

double ScheduleCalculator::getEffectiveLag(const Dependency& dep, LagUnit target_unit) {
    return convertLagToDays(dep.lag, dep.lag_unit);
}

DateTime ScheduleCalculator::getSuccessorEarliestStart(const ProjectGraph& graph,
                                                       const Task& predecessor,
                                                       const Dependency& dep) {
    DateTime result;
    double lag_days = convertLagToDays(dep.lag, dep.lag_unit);
    const Task& successor = graph.tasks.at(dep.successor_id);
    
    switch (dep.type) {
        case DependencyType::FS:  // Finish-to-Start
            // Successor starts after predecessor finishes + lag
            result = daysToDateTime(predecessor.early_finish, lag_days);
            break;
            
        case DependencyType::SS:  // Start-to-Start
            // Successor starts when predecessor starts + lag
            result = daysToDateTime(predecessor.early_start, lag_days);
            break;
            
        case DependencyType::FF:  // Finish-to-Finish
            // Successor finishes when predecessor finishes + lag
            // ES = predecessor.EF + lag - successor.duration
            result = daysToDateTime(predecessor.early_finish,
                                    lag_days - successor.duration);
            break;
            
        case DependencyType::SF:  // Start-to-Finish
            // Successor finishes when predecessor starts + lag
            // ES = predecessor.ES + lag - successor.duration
            result = daysToDateTime(predecessor.early_start,
                                    lag_days - successor.duration);
            break;
            
        default:
            throw CpmComputationError("Unknown dependency type");
    }
    
    return result;
}

DateTime ScheduleCalculator::getPredecessorLatestFinish(const ProjectGraph& graph,
                                                        const Task& successor,
                                                        const Dependency& dep) {
    DateTime result;
    double lag_days = convertLagToDays(dep.lag, dep.lag_unit);
    const Task& predecessor = graph.tasks.at(dep.predecessor_id);
    
    switch (dep.type) {
        case DependencyType::FS:  // Finish-to-Start
            // Predecessor must finish before successor starts - lag
            result = daysToDateTime(successor.late_start, -lag_days);
            break;
            
        case DependencyType::SS:  // Start-to-Start
            // Predecessor must start before successor starts - lag
            // LF = successor.LS - lag + predecessor.duration
            result = daysToDateTime(successor.late_start,
                                    -lag_days + predecessor.duration);
            break;
            
        case DependencyType::FF:  // Finish-to-Finish
            // Predecessor must finish before successor finishes - lag
            result = daysToDateTime(successor.late_finish, -lag_days);
            break;
            
        case DependencyType::SF:  // Start-to-Finish
            // Predecessor must start before successor finishes - lag
            // LF = successor.LF - lag + predecessor.duration
            result = daysToDateTime(successor.late_finish,
                                    -lag_days + predecessor.duration);
            break;
            
        default:
            throw CpmComputationError("Unknown dependency type");
    }
    
    return result;
}

// Forward Pass Implementation
// Reference: plan.md lines ~168-212
DateTime ScheduleCalculator::forwardPass(ProjectGraph& graph,
                                         const std::vector<std::string>& topo_order,
                                         const DateTime& project_start) {
    
    // Initialize all tasks
    for (auto& [task_id, task] : graph.tasks) {
        task.early_start = project_start;
        task.early_finish = daysToDateTime(project_start, task.duration);
    }
    
    // Process tasks in topological order
    for (const auto& task_id : topo_order) {
        Task& task = graph.tasks.at(task_id);
        
        // Check if this is a root task (no predecessors)
        if (graph.predecessors.find(task_id) == graph.predecessors.end() ||
            graph.predecessors.at(task_id).empty()) {
            
            // Root task starts at project start
            task.early_start = project_start;
            task.early_finish = daysToDateTime(project_start, task.duration);
        } else {
            // Non-root task: ES = max(predecessor.EF + lag) over all predecessors
            DateTime max_pred_ef = project_start;  // Start from project_start as baseline
            bool has_predecessor = false;
            
            for (const auto& pred_id : graph.predecessors.at(task_id)) {
                // Find the dependency between pred_id and task_id
                for (const auto& dep : graph.dependencies) {
                    if (dep.predecessor_id == pred_id && dep.successor_id == task_id) {
                        DateTime pred_ef_with_lag = getSuccessorEarliestStart(graph, 
                                                                              graph.tasks.at(pred_id), 
                                                                              dep);
                        if (!has_predecessor) {
                            max_pred_ef = pred_ef_with_lag;
                            has_predecessor = true;
                        } else {
                            max_pred_ef = std::max(max_pred_ef, pred_ef_with_lag);
                        }
                        break;
                    }
                }
            }
            
            task.early_start = max_pred_ef;
            task.early_finish = daysToDateTime(task.early_start, task.duration);
        }
    }
    
    // Calculate project_finish = max(EF) among all tasks
    DateTime project_finish = graph.tasks.begin()->second.early_finish;
    for (auto& [task_id, task] : graph.tasks) {
        project_finish = std::max(project_finish, task.early_finish);
    }
    
    graph.project_finish = project_finish;
    return project_finish;
}

// Backward Pass Implementation
// Reference: plan.md lines ~226-265
void ScheduleCalculator::backwardPass(ProjectGraph& graph,
                                      const std::vector<std::string>& topo_order,
                                      const DateTime& project_finish) {
    
    // Process tasks in REVERSE topological order
    std::vector<std::string> reverse_order(topo_order.rbegin(), topo_order.rend());
    
    for (const auto& task_id : reverse_order) {
        Task& task = graph.tasks.at(task_id);
        
        // Check if this is a sink task (no successors)
        if (graph.successors.find(task_id) == graph.successors.end() ||
            graph.successors.at(task_id).empty()) {
            
            // Sink task must finish by project_finish
            task.late_finish = project_finish;
            task.late_start = daysToDateTime(task.late_finish, -task.duration);
        } else {
            // Non-sink task: LF = min(successor.LS - lag) over all successors
            DateTime min_succ_ls = project_finish;  // Start as worst case
            bool has_successor = false;
            
            for (const auto& succ_id : graph.successors.at(task_id)) {
                // Find the dependency between task_id and succ_id
                for (const auto& dep : graph.dependencies) {
                    if (dep.predecessor_id == task_id && dep.successor_id == succ_id) {
                        DateTime succ_ls_minus_lag = getPredecessorLatestFinish(graph, 
                                                                                 graph.tasks.at(succ_id), 
                                                                                 dep);
                        if (!has_successor) {
                            min_succ_ls = succ_ls_minus_lag;
                            has_successor = true;
                        } else {
                            min_succ_ls = std::min(min_succ_ls, succ_ls_minus_lag);
                        }
                        break;
                    }
                }
            }
            
            task.late_finish = min_succ_ls;
            task.late_start = daysToDateTime(task.late_finish, -task.duration);
        }
    }
}

}  // namespace cpm
