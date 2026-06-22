#include "benchmark_utils.hpp"
#include <fstream>
#include <sstream>
#include <sys/resource.h>
#include <unistd.h>

namespace benchmark {

Stats computeStats(std::vector<double>& measurements) {
    if (measurements.empty()) return {0.0, 0.0, 0.0, 0.0};
    
    // Sort for median and min/max
    std::sort(measurements.begin(), measurements.end());
    
    double sum = std::accumulate(measurements.begin(), measurements.end(), 0.0);
    double avg = sum / measurements.size();
    
    double median;
    size_t size = measurements.size();
    if (size % 2 == 0) {
        median = (measurements[size / 2 - 1] + measurements[size / 2]) / 2;
    } else {
        median = measurements[size / 2];
    }
    
    return {avg, measurements.front(), measurements.back(), median};
}

void writeCSVRow(const std::string& filename, const std::vector<std::string>& columns) {
    std::ofstream file;
    // Open in append mode, but we might want to overwrite if it's the first time
    // For simplicity, we'll assume the benchmark suite handles fresh file creation if needed,
    // or just append.
    file.open(filename, std::ios::app);
    if (!file.is_open()) return;

    for (size_t i = 0; i < columns.size(); ++i) {
        file << columns[i] << (i == columns.size() - 1 ? "" : ",");
    }
    file << "\n";
    file.close();
}

MemoryInfo getMemoryUsage() {
    MemoryInfo info = {0, 0};
    std::ifstream file("/proc/self/status");
    std::string line;
    while (std::getline(file, line)) {
        if (line.compare(0, 6, "VmRSS:") == 0) {
            std::stringstream ss(line.substr(6));
            ss >> info.current_rss_kb;
        } else if (line.compare(0, 6, "VmHWM:") == 0) {
            std::stringstream ss(line.substr(6));
            ss >> info.peak_rss_kb;
        }
    }
    return info;
}

} // namespace benchmark
