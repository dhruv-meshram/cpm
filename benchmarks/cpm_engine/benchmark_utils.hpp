#ifndef BENCHMARK_UTILS_HPP
#define BENCHMARK_UTILS_HPP

#include <chrono>
#include <string>
#include <vector>
#include <iostream>
#include <fstream>
#include <iomanip>
#include <array>
#include <numeric>
#include <algorithm>

// Benchmark Configuration
constexpr int BENCHMARK_RUNS = 30;
constexpr std::array<size_t, 8> GRAPH_SIZES = {
    10,
    100,
    500,
    1000,
    5000,
    10000,
    50000,
    100000
};

namespace benchmark {

/**
 * @brief Simple timer using high_resolution_clock
 */
class Timer {
public:
    void start() {
        m_start = std::chrono::high_resolution_clock::now();
    }

    void stop() {
        m_end = std::chrono::high_resolution_clock::now();
    }

    double elapsedMilliseconds() const {
        return std::chrono::duration<double, std::milli>(m_end - m_start).count();
    }

    double elapsedMicroseconds() const {
        return std::chrono::duration<double, std::micro>(m_end - m_start).count();
    }

    double elapsedNanoseconds() const {
        return std::chrono::duration<double, std::nano>(m_end - m_start).count();
    }

private:
    std::chrono::high_resolution_clock::time_point m_start;
    std::chrono::high_resolution_clock::time_point m_end;
};

/**
 * @brief Statistics for multiple runs
 */
struct Stats {
    double average;
    double min;
    double max;
    double median;
};

Stats computeStats(std::vector<double>& measurements);

/**
 * @brief CSV writing utility
 */
void writeCSVRow(const std::string& filename, const std::vector<std::string>& columns);

/**
 * @brief Memory measurement (Linux specific)
 */
struct MemoryInfo {
    size_t current_rss_kb;
    size_t peak_rss_kb;
};

MemoryInfo getMemoryUsage();

/**
 * @brief Format memory in MB
 */
inline double kbToMb(size_t kb) {
    return static_cast<double>(kb) / 1024.0;
}

} // namespace benchmark

#endif // BENCHMARK_UTILS_HPP
