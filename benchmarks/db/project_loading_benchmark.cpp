#include "db_utils.hpp"
#include <iostream>
#include <vector>
#include <string>
#include <ctime>

namespace db_bench {

void runProjectLoadingBenchmark() {
    PGconn* conn = connect_database();
    if (!conn) {
        std::cerr << "Aborting Project Loading Benchmark due to connection failure." << std::endl;
        return;
    }

    cleanup_bench_data(conn);
    std::string workspace_id = get_or_create_workspace(conn);
    if (workspace_id.empty()) {
        disconnect_database(conn);
        return;
    }

    // Setup project
    std::string project_id = "bench-proj-load-" + std::to_string(std::time(nullptr));
    std::string project_identifier = "LD-SAND-" + std::to_string(std::time(nullptr) % 100000);
    std::string create_proj_sql = 
        "INSERT INTO \"Project\" (id, name, identifier, \"workspaceId\", status, health, \"createdAt\", \"updatedAt\") "
        "VALUES ('" + project_id + "', 'Load Sandbox Project', '" + project_identifier + "', '" + workspace_id + "', 'ACTIVE', 'HEALTHY', NOW(), NOW());";
    PQclear(PQexec(conn, create_proj_sql.c_str()));

    // Create 100 tasks
    int num_tasks = 100;
    std::vector<std::string> task_ids;
    for (int i = 0; i < num_tasks; ++i) {
        std::string task_id = "bench-load-task-" + std::to_string(i) + "-" + std::to_string(std::time(nullptr));
        std::string insert_task_sql = 
            "INSERT INTO \"Task\" (id, title, duration, state, \"projectId\", \"createdAt\", \"updatedAt\") "
            "VALUES ('" + task_id + "', 'Load Task " + std::to_string(i) + "', 5, 'TODO', '" + project_id + "', NOW(), NOW());";
        PQclear(PQexec(conn, insert_task_sql.c_str()));
        task_ids.push_back(task_id);
    }

    // Create 90 dependencies
    for (int i = 0; i < 90; ++i) {
        std::string dep_id = "bench-load-dep-" + std::to_string(i) + "-" + std::to_string(std::time(nullptr));
        std::string insert_dep_sql = 
            "INSERT INTO \"Dependency\" (id, \"projectId\", \"predecessorTaskId\", \"successorTaskId\", \"dependencyType\", lag, \"lagUnit\", strength, \"createdAt\") "
            "VALUES ('" + dep_id + "', '" + project_id + "', '" + task_ids[i] + "', '" + task_ids[i+1] + "', 'FS', 0, 'days', 1.0, NOW());";
        PQclear(PQexec(conn, insert_dep_sql.c_str()));
    }

    std::vector<double> latencies;
    int failed_ops = 0;
    int iterations = 200;
    int concurrency = 1;
    int total_rows_fetched = 0;

    double start_suite_time = get_time_ms();

    for (int i = 0; i < iterations; ++i) {
        double op_start = get_time_ms();

        // 1. Load Tasks
        std::string load_tasks_sql = "SELECT id, title, duration, state FROM \"Task\" WHERE \"projectId\" = '" + project_id + "';";
        PGresult* tasks_res = PQexec(conn, load_tasks_sql.c_str());
        
        // 2. Load Dependencies
        std::string load_deps_sql = "SELECT id, \"predecessorTaskId\", \"successorTaskId\" FROM \"Dependency\" WHERE \"projectId\" = '" + project_id + "';";
        PGresult* deps_res = PQexec(conn, load_deps_sql.c_str());

        double op_end = get_time_ms();

        if (PQresultStatus(tasks_res) == PGRES_TUPLES_OK && PQresultStatus(deps_res) == PGRES_TUPLES_OK) {
            latencies.push_back(op_end - op_start);
            total_rows_fetched += PQntuples(tasks_res) + PQntuples(deps_res);
        } else {
            failed_ops++;
        }

        PQclear(tasks_res);
        PQclear(deps_res);
    }

    double total_duration_sec = (get_time_ms() - start_suite_time) / 1000.0;

    DbBenchmarkResult result = calculate_results(
        "project_loading",
        latencies,
        failed_ops,
        total_duration_sec,
        concurrency
    );

    save_db_result_to_csv("project_loading", result);
    std::cout << "  Throughput: " << result.throughput_ops_sec << " loads/sec | Avg Latency: " << result.avg_latency_ms << " ms | Rows/Load: " << (total_rows_fetched / std::max(1, (int)latencies.size())) << std::endl;

    cleanup_bench_data(conn);
    disconnect_database(conn);
}

} // namespace db_bench
