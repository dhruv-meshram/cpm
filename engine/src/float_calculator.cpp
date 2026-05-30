#include "float_calculator.h"
#include <algorithm>

namespace cpm {

void FloatCalculator::calculateTotalFloat(ProjectGraph& graph) {
    // Total Float (TF) = LS - ES
    // Plan.md: lines 243-250
    for (auto& [task_id, task] : graph.tasks) {
        double late_start_days = dateTimeDiffDays(graph.project_start, task.late_start);
        double early_start_days = dateTimeDiffDays(graph.project_start, task.early_start);
        task.total_float = late_start_days - early_start_days;
    }
}

void FloatCalculator::calculateFreeFloat(ProjectGraph& graph) {
    // Free Float (FF) = min(successor.ES) - EF
    // Plan.md: lines 251-257
    
    for (auto& [task_id, task] : graph.tasks) {
        // If task has no successors, free float is zero
        if (graph.successors[task_id].empty()) {
            task.free_float = 0.0;
            continue;
        }

        // Find minimum early start among successors
        double min_successor_es = std::numeric_limits<double>::max();
        
        for (const auto& succ_id : graph.successors[task_id]) {
            const Task& successor = graph.tasks.at(succ_id);
            double succ_es = dateTimeDiffDays(graph.project_start, successor.early_start);
            min_successor_es = std::min(min_successor_es, succ_es);
        }

        // Free float = min(successor.ES) - EF
        double task_ef = dateTimeDiffDays(graph.project_start, task.early_finish);
        task.free_float = std::max(0.0, min_successor_es - task_ef);
    }
}

std::vector<std::string> FloatCalculator::identifyCriticalTasks(
    const ProjectGraph& graph) {
    // Plan.md: lines 258-265
    // Critical tasks have TF ≈ 0 (within tolerance)
    
    std::vector<std::string> critical_tasks;
    
    for (const auto& [task_id, task] : graph.tasks) {
        if (isCritical(task)) {
            critical_tasks.push_back(task_id);
        }
    }
    
    return critical_tasks;
}

bool FloatCalculator::isCritical(const Task& task) {
    // A task is critical if |TF - 0| < 1e-9 (tolerance from plan.md)
    return approximatelyEqual(task.total_float, 0.0, 1e-9);
}

bool FloatCalculator::approximatelyEqual(double a, double b, double tolerance) {
    return std::abs(a - b) < tolerance;
}

}  // namespace cpm
