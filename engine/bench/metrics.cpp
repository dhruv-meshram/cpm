#include "metrics.h"

#include <iomanip>
#include <sstream>

using namespace cpm;

std::string BenchmarkMetrics::toCSV() const {
    std::ostringstream os;
    os << scenario_id << ","
       << node_count << ","
       << edge_count << ","
       << build_us << ","
       << validate_us << ","
       << topo_sort_us << ","
       << forward_pass_us << ","
       << backward_pass_us << ","
       << float_calc_us << ","
       << total_cpm_us << ","
       << std::fixed << std::setprecision(2) << peak_memory_mb << ","
       << critical_path_count;
    return os.str();
}

std::string BenchmarkMetrics::toJSON() const {
    std::ostringstream os;
    os << "{\n"
       << "  \"scenario_id\": \"" << scenario_id << "\",\n"
       << "  \"node_count\": " << node_count << ",\n"
       << "  \"edge_count\": " << edge_count << ",\n"
       << "  \"timings_us\": {\n"
       << "    \"build\": " << build_us << ",\n"
       << "    \"validate\": " << validate_us << ",\n"
       << "    \"topo_sort\": " << topo_sort_us << ",\n"
       << "    \"forward_pass\": " << forward_pass_us << ",\n"
       << "    \"backward_pass\": " << backward_pass_us << ",\n"
       << "    \"float_calc\": " << float_calc_us << ",\n"
       << "    \"total_cpm\": " << total_cpm_us << "\n"
       << "  },\n"
       << "  \"memory_mb\": " << std::fixed << std::setprecision(2) << peak_memory_mb << ",\n"
       << "  \"critical_path_count\": " << critical_path_count << "\n"
       << "}";
    return os.str();
}
