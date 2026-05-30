#ifndef CPM_TYPES_H
#define CPM_TYPES_H

#include <string>
#include <vector>
#include <map>
#include <chrono>
#include <stdexcept>
#include <memory>
#include <cstdio>
#include <ctime>

namespace cpm {

// Exception class for CPM computation errors
class CpmComputationError : public std::runtime_error {
public:
    explicit CpmComputationError(const std::string& message) 
        : std::runtime_error(message) {}
};

// Type aliases for datetime handling
using DateTime = std::chrono::system_clock::time_point;
using Duration = std::chrono::duration<double>; // Duration in seconds internally

// Lag unit types
enum class LagUnit {
    DAYS,
    HOURS,
    WEEKS
};

// Dependency type (FS=Finish-to-Start, SS=Start-to-Start, FF=Finish-to-Finish, SF=Start-to-Finish)
enum class DependencyType {
    FS,  // Finish-to-Start (most common)
    SS,  // Start-to-Start
    FF,  // Finish-to-Finish
    SF   // Start-to-Finish
};

// Convert LagUnit enum to string
inline std::string lagUnitToString(LagUnit unit) {
    switch (unit) {
        case LagUnit::DAYS: return "days";
        case LagUnit::HOURS: return "hours";
        case LagUnit::WEEKS: return "weeks";
        default: return "unknown";
    }
}

// Convert string to LagUnit enum
inline LagUnit stringToLagUnit(const std::string& str) {
    if (str == "days") return LagUnit::DAYS;
    if (str == "hours") return LagUnit::HOURS;
    if (str == "weeks") return LagUnit::WEEKS;
    throw CpmComputationError("Unknown lag unit: " + str);
}

// Convert DependencyType enum to string
inline std::string dependencyTypeToString(DependencyType type) {
    switch (type) {
        case DependencyType::FS: return "FS";
        case DependencyType::SS: return "SS";
        case DependencyType::FF: return "FF";
        case DependencyType::SF: return "SF";
        default: return "unknown";
    }
}

// Convert string to DependencyType enum
inline DependencyType stringToDependencyType(const std::string& str) {
    if (str == "FS") return DependencyType::FS;
    if (str == "SS") return DependencyType::SS;
    if (str == "FF") return DependencyType::FF;
    if (str == "SF") return DependencyType::SF;
    throw CpmComputationError("Unknown dependency type: " + str);
}

// Task structure - represents a project task/activity
struct Task {
    std::string id;                      // Unique identifier (e.g., "T-001", "TASK_A")
    double duration;                     // Duration in days (can be fractional, ≥ 0)
    DateTime start_date;                 // Optional: explicit start date
    DateTime end_date;                   // Optional: explicit end date
    double estimated_days;               // Duration estimate (may differ from actual)
    
    // Schedule computed values (populated during computation)
    DateTime early_start;                // ES - Earliest Start
    DateTime early_finish;               // EF - Earliest Finish
    DateTime late_start;                 // LS - Latest Start
    DateTime late_finish;                // LF - Latest Finish
    double total_float;                  // TF - Total Float (slack in days)
    double free_float;                   // FF - Free Float
    bool is_critical;                    // True if on critical path
    
    // Constructor with minimal required fields
    Task(const std::string& id_, double duration_)
        : id(id_), duration(duration_), estimated_days(duration_),
          total_float(0.0), free_float(0.0), is_critical(false) {}
    
    // Default constructor
    Task() : duration(0.0), estimated_days(0.0), 
             total_float(0.0), free_float(0.0), is_critical(false) {}
};

// Dependency structure - represents a relationship between two tasks
struct Dependency {
    std::string predecessor_id;          // ID of task that must complete first
    std::string successor_id;            // ID of task that depends on predecessor
    DependencyType type;                 // FS, SS, FF, or SF
    double lag;                          // Time delay in lag_unit after predecessor completes
    LagUnit lag_unit;                    // Unit of lag (days, hours, weeks)
    double strength;                     // 1.0 = hard constraint (default)
    
    // Constructor
    Dependency(const std::string& pred_id, const std::string& succ_id, 
               DependencyType type_ = DependencyType::FS,
               double lag_ = 0.0, LagUnit lag_unit_ = LagUnit::DAYS, 
               double strength_ = 1.0)
        : predecessor_id(pred_id), successor_id(succ_id), 
          type(type_), lag(lag_), lag_unit(lag_unit_), strength(strength_) {}
    
    // Default constructor
    Dependency() : type(DependencyType::FS), lag(0.0), 
                   lag_unit(LagUnit::DAYS), strength(1.0) {}
};

// Project Graph structure - represents the entire project network
struct ProjectGraph {
    std::map<std::string, Task> tasks;           // All tasks indexed by ID
    std::vector<Dependency> dependencies;        // All dependencies
    DateTime project_start;                      // Reference date for all calculations
    DateTime project_finish;                     // Computed project finish date
    
    // Adjacency structure for efficient graph traversal
    std::map<std::string, std::vector<std::string>> successors;   // task_id -> [successor_ids]
    std::map<std::string, std::vector<std::string>> predecessors;  // task_id -> [predecessor_ids]
    
    // Helper method: add successor relationship
    void addSuccessor(const std::string& pred_id, const std::string& succ_id) {
        successors[pred_id].push_back(succ_id);
    }
    
    // Helper method: add predecessor relationship
    void addPredecessor(const std::string& succ_id, const std::string& pred_id) {
        predecessors[succ_id].push_back(pred_id);
    }
    
    // Helper method: get task by ID (throws if not found)
    Task& getTask(const std::string& task_id) {
        auto it = tasks.find(task_id);
        if (it == tasks.end()) {
            throw CpmComputationError("Task not found: " + task_id);
        }
        return it->second;
    }
    
    // Helper method: get task by ID (const version)
    const Task& getTask(const std::string& task_id) const {
        auto it = tasks.find(task_id);
        if (it == tasks.end()) {
            throw CpmComputationError("Task not found: " + task_id);
        }
        return it->second;
    }
    
    // Default constructor
    ProjectGraph() = default;
};

// Utility function: Create a DateTime from YYYY-MM-DD string
// Format: "YYYY-MM-DD"
inline DateTime stringToDateTime(const std::string& date_str) {
    // Simple UTC midnight parsing
    int year, month, day;
    if (sscanf(date_str.c_str(), "%d-%d-%d", &year, &month, &day) != 3) {
        throw CpmComputationError("Invalid date format. Expected YYYY-MM-DD: " + date_str);
    }
    
    // Create time_t for the date at midnight UTC
    std::tm tm = {};
    tm.tm_year = year - 1900;
    tm.tm_mon = month - 1;
    tm.tm_mday = day;
    tm.tm_isdst = 0;
    
    auto time_t_val = mktime(&tm);
    if (time_t_val == -1) {
        throw CpmComputationError("Failed to parse date: " + date_str);
    }
    
    return std::chrono::system_clock::from_time_t(time_t_val);
}

// Utility function: Convert DateTime to days since epoch
inline double dateToDays(const DateTime& dt) {
    auto duration_since_epoch = dt.time_since_epoch();
    return std::chrono::duration<double>(duration_since_epoch).count() / (24.0 * 3600.0);
}

// Utility function: Convert days offset from a base datetime
inline DateTime daysToDateTime(const DateTime& base, double days) {
    auto seconds = static_cast<long long>(days * 24.0 * 3600.0);
    return base + std::chrono::seconds(seconds);
}

// Utility function: Get difference between two DateTimes in days
inline double dateTimeDiffDays(const DateTime& from, const DateTime& to) {
    auto duration = to - from;
    return std::chrono::duration<double>(duration).count() / (24.0 * 3600.0);
}

}  // namespace cpm

#endif  // CPM_TYPES_H
