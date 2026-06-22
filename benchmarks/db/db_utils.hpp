#ifndef DB_BENCHMARK_UTILS_HPP
#define DB_BENCHMARK_UTILS_HPP

#include <string>
#include <vector>
#include <libpq-fe.h>

namespace db_bench {

struct DbBenchmarkResult {
    std::string timestamp;
    std::string test_name;
    int concurrency;
    double duration_sec;
    int total_operations;
    int successful_operations;
    int failed_operations;
    double avg_latency_ms;
    double median_latency_ms;
    double p95_latency_ms;
    double p99_latency_ms;
    double throughput_ops_sec;
};

// Database Connection
PGconn* connect_database();
void disconnect_database(PGconn* conn);

// Seeding Helpers
std::string get_or_create_workspace(PGconn* conn);
void cleanup_bench_data(PGconn* conn);

// Timing and Stats
double get_time_ms();
DbBenchmarkResult calculate_results(
    const std::string& test_name,
    const std::vector<double>& latencies,
    int failed_ops,
    double total_duration_sec,
    int concurrency
);

// CSV Logging
void save_db_result_to_csv(const std::string& filename, const DbBenchmarkResult& result);

} // namespace db_bench

#endif // DB_BENCHMARK_UTILS_HPP
