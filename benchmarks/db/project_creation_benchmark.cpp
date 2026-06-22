#include "db_utils.hpp"
#include <iostream>
#include <vector>
#include <string>
#include <ctime>

namespace db_bench {

void runProjectCreationBenchmark() {
    PGconn* conn = connect_database();
    if (!conn) {
        std::cerr << "Aborting Project Creation Benchmark due to connection failure." << std::endl;
        return;
    }

    // Cleanup any leftovers and fetch workspace ID
    cleanup_bench_data(conn);
    std::string workspace_id = get_or_create_workspace(conn);
    if (workspace_id.empty()) {
        disconnect_database(conn);
        return;
    }

    std::vector<double> latencies;
    int failed_ops = 0;
    int iterations = 100; // Standard database benchmark test iterations
    int concurrency = 1;

    double start_suite_time = get_time_ms();

    for (int i = 0; i < iterations; ++i) {
        std::string project_id = "bench-proj-id-" + std::to_string(i) + "-" + std::to_string(std::time(nullptr));
        std::string project_name = "Benchmark Project " + std::to_string(i);
        std::string project_identifier = "BP-" + std::to_string(i) + "-" + std::to_string(std::time(nullptr) % 100000);

        std::string insert_sql = 
            "INSERT INTO \"Project\" (id, name, identifier, \"workspaceId\", status, health, \"createdAt\", \"updatedAt\") "
            "VALUES ('" + project_id + "', '" + project_name + "', '" + project_identifier + "', '" + workspace_id + "', 'ACTIVE', 'HEALTHY', NOW(), NOW());";

        double op_start = get_time_ms();
        PGresult* res = PQexec(conn, insert_sql.c_str());
        double op_end = get_time_ms();

        if (PQresultStatus(res) == PGRES_COMMAND_OK) {
            latencies.push_back(op_end - op_start);
        } else {
            failed_ops++;
            // std::cerr << "Project insert failed: " << PQerrorMessage(conn) << std::endl;
        }
        PQclear(res);
    }

    double total_duration_sec = (get_time_ms() - start_suite_time) / 1000.0;

    DbBenchmarkResult result = calculate_results(
        "project_creation",
        latencies,
        failed_ops,
        total_duration_sec,
        concurrency
    );

    save_db_result_to_csv("project_creation", result);
    std::cout << "  Throughput: " << result.throughput_ops_sec << " inserts/sec | Avg Latency: " << result.avg_latency_ms << " ms" << std::endl;

    cleanup_bench_data(conn);
    disconnect_database(conn);
}

} // namespace db_bench
