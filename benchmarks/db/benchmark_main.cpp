#include <iostream>
#include <iomanip>
#include <chrono>
#include "db_utils.hpp"

// Forward declarations of benchmark functions
namespace db_bench {
    void runProjectCreationBenchmark();
    void runTaskInsertionBenchmark();
    void runDependencyInsertionBenchmark();
    void runProjectLoadingBenchmark();
    void runQueryPerformanceBenchmark();
    void runIndexEffectivenessBenchmark();
}

int main() {
    std::cout << "==========================================================" << std::endl;
    std::cout << "        CPM PostgreSQL Database C++ Benchmarks            " << std::endl;
    std::cout << "==========================================================" << std::endl;

    auto start_time = std::chrono::system_clock::now();

    std::cout << "\n[1/6] Running Project Creation Benchmark..." << std::endl;
    db_bench::runProjectCreationBenchmark();

    std::cout << "\n[2/6] Running Task Insertion Benchmark..." << std::endl;
    db_bench::runTaskInsertionBenchmark();

    std::cout << "\n[3/6] Running Dependency Insertion Benchmark..." << std::endl;
    db_bench::runDependencyInsertionBenchmark();

    std::cout << "\n[4/6] Running Project Loading Benchmark..." << std::endl;
    db_bench::runProjectLoadingBenchmark();

    std::cout << "\n[5/6] Running Query Performance Benchmark..." << std::endl;
    db_bench::runQueryPerformanceBenchmark();

    std::cout << "\n[6/6] Running Index Effectiveness Benchmark..." << std::endl;
    db_bench::runIndexEffectivenessBenchmark();

    auto end_time = std::chrono::system_clock::now();
    std::chrono::duration<double> elapsed = end_time - start_time;

    std::cout << "\n==========================================================" << std::endl;
    std::cout << "Database C++ Benchmark Suite Completed in " << std::fixed << std::setprecision(2) << elapsed.count() << " seconds." << std::endl;
    std::cout << "Results saved to: benchmarks/db/results/*.csv" << std::endl;
    std::cout << "==========================================================" << std::endl;

    return 0;
}
