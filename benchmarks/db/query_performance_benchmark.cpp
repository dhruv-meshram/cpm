#include "db_utils.hpp"
#include <iostream>
#include <vector>
#include <string>

namespace db_bench {

void runQueryPerformanceBenchmark() {
    PGconn* conn = connect_database();
    if (!conn) {
        std::cerr << "Aborting Query Performance Benchmark due to connection failure." << std::endl;
        return;
    }

    std::vector<double> latencies;
    int failed_ops = 0;
    int iterations = 150;
    int concurrency = 1;

    // We will benchmark 3 common SQL queries in a loop to measure aggregate performance
    double start_suite_time = get_time_ms();

    for (int i = 0; i < iterations; ++i) {
        double op_start = get_time_ms();

        // Query 1: Group tasks by status (Dashboard widgets)
        const char* q1_sql = "SELECT state, COUNT(*) FROM \"Task\" WHERE \"deletedAt\" IS NULL GROUP BY state;";
        PGresult* res1 = PQexec(conn, q1_sql);

        // Query 2: Team workload join query (Workload tab)
        const char* q2_sql = 
            "SELECT ta.\"userId\", u.name, u.email, t.state "
            "FROM \"task_assignees\" ta "
            "JOIN \"User\" u ON ta.\"userId\" = u.id "
            "JOIN \"Task\" t ON ta.\"taskId\" = t.id "
            "WHERE t.\"deletedAt\" IS NULL;";
        PGresult* res2 = PQexec(conn, q2_sql);

        // Query 3: Recent activity logs (Dashboard logs)
        const char* q3_sql = "SELECT id, \"entityType\", action, timestamp FROM \"ActivityLog\" ORDER BY timestamp DESC LIMIT 20;";
        PGresult* res3 = PQexec(conn, q3_sql);

        double op_end = get_time_ms();

        if (PQresultStatus(res1) == PGRES_TUPLES_OK && 
            PQresultStatus(res2) == PGRES_TUPLES_OK && 
            PQresultStatus(res3) == PGRES_TUPLES_OK) {
            latencies.push_back(op_end - op_start);
        } else {
            failed_ops++;
        }

        PQclear(res1);
        PQclear(res2);
        PQclear(res3);
    }

    double total_duration_sec = (get_time_ms() - start_suite_time) / 1000.0;

    DbBenchmarkResult result = calculate_results(
        "query_performance",
        latencies,
        failed_ops,
        total_duration_sec,
        concurrency
    );

    save_db_result_to_csv("query_performance", result);
    std::cout << "  Throughput: " << result.throughput_ops_sec << " query-sets/sec | Avg Latency: " << result.avg_latency_ms << " ms" << std::endl;

    disconnect_database(conn);
}

} // namespace db_bench
