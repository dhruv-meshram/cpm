#include <iostream>
#include <iomanip>
#include <string>
#include "benchmark_utils.hpp"

// Forward declarations of benchmark functions
void runTopoSortBenchmark();
void runForwardPassBenchmark();
void runBackwardPassBenchmark();
void runSlackBenchmark();
void runCriticalPathBenchmark();
void runFullPipelineBenchmark();
void runMemoryBenchmark();
void runScalabilityBenchmark();

int main() {
    std::cout << "==========================================================" << std::endl;
    std::cout << "         CPM Engine Comprehensive Benchmark Suite        " << std::endl;
    std::cout << "==========================================================" << std::endl;

    auto start_time = std::chrono::system_clock::now();

    std::cout << "\n[1/8] Running Topological Sort Benchmark..." << std::endl;
    runTopoSortBenchmark();

    std::cout << "\n[2/8] Running Forward Pass Benchmark..." << std::endl;
    runForwardPassBenchmark();

    std::cout << "\n[3/8] Running Backward Pass Benchmark..." << std::endl;
    runBackwardPassBenchmark();

    std::cout << "\n[4/8] Running Slack Calculation Benchmark..." << std::endl;
    runSlackBenchmark();

    std::cout << "\n[5/8] Running Critical Path Extraction Benchmark..." << std::endl;
    runCriticalPathBenchmark();

    std::cout << "\n[6/8] Running Full Pipeline Benchmark..." << std::endl;
    runFullPipelineBenchmark();

    std::cout << "\n[7/8] Running Memory Consumption Benchmark..." << std::endl;
    runMemoryBenchmark();

    std::cout << "\n[8/8] Running Scalability Benchmark..." << std::endl;
    runScalabilityBenchmark();

    auto end_time = std::chrono::system_clock::now();
    std::chrono::duration<double> elapsed = end_time - start_time;

    std::cout << "\n==========================================================" << std::endl;
    std::cout << "Benchmark Suite Completed in " << std::fixed << std::setprecision(2) << elapsed.count() << " seconds." << std::endl;
    std::cout << "Results saved to: benchmarks/cpm_engine/results/*.csv" << std::endl;
    std::cout << "==========================================================" << std::endl;

    return 0;
}
