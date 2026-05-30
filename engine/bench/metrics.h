#ifndef CPM_METRICS_H
#define CPM_METRICS_H

#include <chrono>
#include <string>

namespace cpm {

struct BenchmarkMetrics {
    std::string scenario_id;
    std::string description;
    int node_count;
    int edge_count;
    int seed;
    
    // Timings in microseconds
    long long build_us;
    long long validate_us;
    long long topo_sort_us;
    long long forward_pass_us;
    long long backward_pass_us;
    long long float_calc_us;
    long long total_cpm_us;
    
    // Memory in MB
    double peak_memory_mb;
    
    // Metrics
    int critical_path_count;
    double avg_total_float;
    
    // Derived
    long long repetition_index;
    
    std::string toCSV() const;
    std::string toJSON() const;
};

}  // namespace cpm

#endif  // CPM_METRICS_H
