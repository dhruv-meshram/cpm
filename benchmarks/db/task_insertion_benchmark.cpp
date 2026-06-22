#include "db_utils.hpp"
#include <iostream>
#include <vector>
#include <string>
#include <ctime>

namespace db_bench {

void runTaskInsertionBenchmark() {
    PGconn* conn = connect_database();
    if (!conn) {
        std::cerr << "Aborting Task Insertion Benchmark due to connection failure." << std::endl;
        return;
    }

    cleanup_bench_data(conn);
    std::string workspace_id = get_or_create_workspace(conn);
    if (workspace_id.empty()) {
        disconnect_database(conn);
        return;
    }

    // Setup a parent project
    std::string project_id = "bench-proj-tasks-" + std::to_string(std::time(nullptr));
    std::string project_identifier = "TP-SAND-" + std::to_string(std::time(nullptr) % 100000);
    std::string create_proj_sql = 
        "INSERT INTO \"Project\" (id, name, identifier, \"workspaceId\", status, health, \"createdAt\", \"updatedAt\") "
        "VALUES ('" + project_id + "', 'Tasks Sandbox Project', '" + project_identifier + "', '" + workspace_id + "', 'ACTIVE', 'HEALTHY', NOW(), NOW());";
    
    PGresult* proj_res = PQexec(conn, create_proj_sql.c_str());
    if (PQresultStatus(proj_res) != PGRES_COMMAND_OK) {
        std::cerr << "Setup failed: could not create project for task insertion tests: " << PQerrorMessage(conn) << std::endl;
        PQclear(proj_res);
        disconnect_database(conn);
        return;
    }
    PQclear(proj_res);

    std::vector<double> latencies;
    int failed_ops = 0;
    int iterations = 200; // Benchmark write growth rate
    int concurrency = 1;

    double start_suite_time = get_time_ms();

    for (int i = 0; i < iterations; ++i) {
        std::string task_id = "bench-task-id-" + std::to_string(i) + "-" + std::to_string(std::time(nullptr));
        std::string task_title = "Benchmark Task " + std::to_string(i);
        
        std::string insert_sql = 
            "INSERT INTO \"Task\" (id, title, duration, state, \"projectId\", \"createdAt\", \"updatedAt\") "
            "VALUES ('" + task_id + "', '" + task_title + "', 5, 'TODO', '" + project_id + "', NOW(), NOW());";

        double op_start = get_time_ms();
        PGresult* res = PQexec(conn, insert_sql.c_str());
        double op_end = get_time_ms();

        if (PQresultStatus(res) == PGRES_COMMAND_OK) {
            latencies.push_back(op_end - op_start);
        } else {
            failed_ops++;
        }
        PQclear(res);
    }

    double total_duration_sec = (get_time_ms() - start_suite_time) / 1000.0;

    DbBenchmarkResult result = calculate_results(
        "task_insertion",
        latencies,
        failed_ops,
        total_duration_sec,
        concurrency
    );

    save_db_result_to_csv("task_insertion", result);
    std::cout << "  Throughput: " << result.throughput_ops_sec << " inserts/sec | Avg Latency: " << result.avg_latency_ms << " ms" << std::endl;

    cleanup_bench_data(conn);
    disconnect_database(conn);
}

} // namespace db_bench
