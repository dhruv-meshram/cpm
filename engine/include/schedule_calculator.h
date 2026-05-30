#ifndef SCHEDULE_CALCULATOR_H
#define SCHEDULE_CALCULATOR_H

#include "cpm_types.h"
#include <vector>
#include <string>
#include <map>

namespace cpm {

// ScheduleCalculator - computes ES/EF (forward pass) and LS/LF (backward pass)
// Reference: plan.md lines ~168-265
class ScheduleCalculator {
public:
    // Forward pass: compute Early Start and Early Finish for all tasks
    // Populates task.early_start and task.early_finish
    // Returns project_finish (maximum EF among all tasks)
    // Assumes: graph is validated, topologically sorted ordering provided
    static DateTime forwardPass(ProjectGraph& graph,
                               const std::vector<std::string>& topo_order,
                               const DateTime& project_start);
    
    // Backward pass: compute Late Start and Late Finish for all tasks
    // Populates task.late_start and task.late_finish
    // Assumes: forward pass has completed (all ES/EF set)
    static void backwardPass(ProjectGraph& graph,
                            const std::vector<std::string>& topo_order,
                            const DateTime& project_finish);
    
    // Convert lag value in source unit to days
    // Supports: days, hours, weeks
    static double convertLagToDays(double lag, LagUnit unit);
    
    // Get the effective lag for a dependency based on type
    // FS: lag applies after predecessor finishes
    // SS: lag applies after predecessor starts
    // FF: lag applies before predecessor finishes
    // SF: lag applies before predecessor starts
    static double getEffectiveLag(const Dependency& dep, LagUnit target_unit = LagUnit::DAYS);

private:
    // Helper: Get earliest start considering dependency type and lag
    static DateTime getSuccessorEarliestStart(const ProjectGraph& graph,
                                             const Task& predecessor,
                                             const Dependency& dep);
    
    // Helper: Get latest finish considering dependency type and lag
    static DateTime getPredecessorLatestFinish(const ProjectGraph& graph,
                                              const Task& successor,
                                              const Dependency& dep);
};

}  // namespace cpm

#endif  // SCHEDULE_CALCULATOR_H
