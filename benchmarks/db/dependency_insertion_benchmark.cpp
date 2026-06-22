#include "db_utils.hpp"
#include <iostream>
#include <vector>
#include <string>
#include <ctime>

namespace db_bench {

void runDependencyInsertionBenchmark() {
    PGconn* conn = connect_database();
    if (!conn) {
        std::cerr << "Aborting Dependency Insertion Benchmark due to connection failure." << std::endl;
        return;
    }

    cleanup_bench_data(conn);
    std::string workspace_id = get_or_create_workspace(conn);
    if (workspace_id.empty()) {
        disconnect_database(conn);
        return;
    }

    // Setup a parent project
    std::string project_id = "bench-proj-deps-" + std::to_string(std::time(nullptr));
    std::string project_identifier = "DP-SAND-" + std::to_string(std::time(nullptr) % 100000);
    std::string create_proj_sql = 
        "INSERT INTO \"Project\" (id, name, identifier, \"workspaceId\", status, health, \"createdAt\", \"updatedAt\") "
        "VALUES ('" + project_id + "', 'Dependencies Sandbox Project', '" + project_identifier + "', '" + workspace_id + "', 'ACTIVE', 'HEALTHY', NOW(), NOW());";
    PQclear(PQexec(conn, create_proj_sql.c_str()));

    // Create a pool of tasks to create dependency links between
    int num_tasks = 50;
    std::vector<std::string> task_ids;
    for (int i = 0; i < num_tasks; ++i) {
        std::string task_id = "bench-dep-task-" + std::to_string(i) + "-" + std::to_string(std::time(nullptr));
        std::string insert_task_sql = 
            "INSERT INTO \"Task\" (id, title, duration, state, \"projectId\", \"createdAt\", \"updatedAt\") "
            "VALUES ('" + task_id + "', 'Sandbox Task " + std::to_string(i) + "', 5, 'TODO', '" + project_id + "', NOW(), NOW());";
        PQclear(PQexec(conn, insert_task_sql.c_str()));
        task_ids.push_back(task_id);
    }

    std::vector<double> latencies;
    int failed_ops = 0;
    int iterations = 100;
    int concurrency = 1;

    double start_suite_time = get_time_ms();

    for (int i = 0; i < iterations; ++i) {
        // Link tasks sequentially: Task i -> Task i+1
        int pred_idx = i % (num_tasks - 1);
        int succ_idx = pred_idx + 1;
        
        std::string id = "bench-dep-id-" + std::to_string(i) + "-" + std::to_string(std::time(nullptr));
        std::string predecessor = task_ids[pred_idx];
        std::string successor = task_ids[succ_idx];

        std::string insert_sql = 
            "INSERT INTO \"Dependency\" (id, \"projectId\", \"predecessorTaskId\", \"successorTaskId\", \"dependencyType\", lag, \"lagUnit\", strength, \"createdAt\") "
            "VALUES ('" + id + "', '" + project_id + "', '" + predecessor + "', '" + successor + "', 'FS', 0, 'days', 1.0, NOW());";

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
        "dependency_insertion",
        latencies,
        failed_ops,
        total_duration_sec,
        concurrency
    );

    save_db_result_to_csv("dependency_insertion", result);
    std::cout << "  Throughput: " << result.throughput_ops_sec << " inserts/sec | Avg Latency: " << result.avg_latency_ms << " ms" << std::endl;

    cleanup_bench_data(conn);
    disconnect_database(conn);
}

} // namespace db_bench
