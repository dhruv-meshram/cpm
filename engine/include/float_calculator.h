#ifndef CPM_FLOAT_CALCULATOR_H
#define CPM_FLOAT_CALCULATOR_H

#include "cpm_types.h"

namespace cpm {

/**
 * Stage 5: Float Calculation
 * 
 * Calculates total and free float (slack) for each task.
 * Identifies critical tasks (those with zero total float).
 * 
 * References: plan.md lines 243-265 (Float Calculation Algorithm)
 */
class FloatCalculator {
public:
    /**
     * Calculate total float for all tasks
     * Total Float (TF) = LS - ES (difference between late and early start)
     * 
     * Precondition: Graph must have valid ES/EF/LS/LF values from schedule calculator
     * 
     * Modifies Task::total_float for each task in graph
     */
    static void calculateTotalFloat(ProjectGraph& graph);

    /**
     * Calculate free float for all tasks
     * Free Float (FF) = min(successor.ES) - EF
     * Represents slack available without affecting successors
     * 
     * For tasks with no successors, FF = 0
     * 
     * Precondition: totalFloat must be calculated first
     * Modifies Task::free_float for each task in graph
     */
    static void calculateFreeFloat(ProjectGraph& graph);

    /**
     * Identify critical tasks (those with TF ≈ 0)
     * Critical threshold is 1e-9 days (per plan.md error tolerance)
     * 
     * Precondition: totalFloat must be calculated
     * Returns: vector of task IDs for all critical tasks
     */
    static std::vector<std::string> identifyCriticalTasks(const ProjectGraph& graph);

    /**
     * Check if a single task is critical
     * A task is critical if its total float is within tolerance of zero
     * 
     * Uses floating-point comparison with tolerance 1e-9
     */
    static bool isCritical(const Task& task);

    /**
     * Floating-point comparison with tolerance
     * Returns true if |a - b| < tolerance
     */
    static bool approximatelyEqual(double a, double b, double tolerance = 1e-9);
};

}  // namespace cpm

#endif  // CPM_FLOAT_CALCULATOR_H
