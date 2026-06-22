#include "db_utils.hpp"
#include <iostream>
#include <vector>
#include <string>

namespace db_bench {

void runIndexEffectivenessBenchmark() {
    PGconn* conn = connect_database();
    if (!conn) {
        std::cerr << "Aborting Index Effectiveness Benchmark due to connection failure." << std::endl;
        return;
    }

    // 1. Create a sandbox table for indexing test to avoid modifying primary schemas
    PQclear(PQexec(conn, "DROP TABLE IF EXISTS \"bench_tasks\";"));
    PGresult* create_res = PQexec(conn, 
        "CREATE TABLE \"bench_tasks\" ("
        "id VARCHAR(50) PRIMARY KEY, "
        "title VARCHAR(100) NOT NULL, "
        "duration INT NOT NULL"
        ");"
    );
    if (PQresultStatus(create_res) != PGRES_COMMAND_OK) {
        std::cerr << "Setup failed: could not create test table: " << PQerrorMessage(conn) << std::endl;
        PQclear(create_res);
        disconnect_database(conn);
        return;
    }
    PQclear(create_res);

    // 2. Insert 1000 records in a single transaction (batch operation)
    PQclear(PQexec(conn, "BEGIN;"));
    for (int i = 0; i < 1000; ++i) {
        std::string sql = "INSERT INTO \"bench_tasks\" (id, title, duration) VALUES ('t-" + std::to_string(i) + "', 'Task Name " + std::to_string(i) + "', " + std::to_string(i % 10) + ");";
        PQclear(PQexec(conn, sql.c_str()));
    }
    PQclear(PQexec(conn, "COMMIT;"));

    std::vector<double> unindexed_latencies;
    std::vector<double> indexed_latencies;
    int failed_ops = 0;
    int iterations = 100;
    int concurrency = 1;

    // 3. Run queries WITHOUT index (sequential scan)
    for (int i = 0; i < iterations; ++i) {
        // Search for a random title in the list
        std::string search_title = "Task Name " + std::to_string(750 + (i % 100));
        std::string query_sql = "SELECT * FROM \"bench_tasks\" WHERE title = '" + search_title + "';";
        
        double op_start = get_time_ms();
        PGresult* res = PQexec(conn, query_sql.c_str());
        double op_end = get_time_ms();

        if (PQresultStatus(res) == PGRES_TUPLES_OK) {
            unindexed_latencies.push_back(op_end - op_start);
        } else {
            failed_ops++;
        }
        PQclear(res);
    }

    // 4. Create index (B-tree on title)
    PGresult* idx_res = PQexec(conn, "CREATE INDEX \"bench_title_idx\" ON \"bench_tasks\"(title);");
    if (PQresultStatus(idx_res) != PGRES_COMMAND_OK) {
        std::cerr << "Setup failed: could not build index: " << PQerrorMessage(conn) << std::endl;
        PQclear(idx_res);
        PQclear(PQexec(conn, "DROP TABLE \"bench_tasks\";"));
        disconnect_database(conn);
        return;
    }
    PQclear(idx_res);

    // 5. Run queries WITH index (index scan)
    for (int i = 0; i < iterations; ++i) {
        std::string search_title = "Task Name " + std::to_string(750 + (i % 100));
        std::string query_sql = "SELECT * FROM \"bench_tasks\" WHERE title = '" + search_title + "';";
        
        double op_start = get_time_ms();
        PGresult* res = PQexec(conn, query_sql.c_str());
        double op_end = get_time_ms();

        if (PQresultStatus(res) == PGRES_TUPLES_OK) {
            indexed_latencies.push_back(op_end - op_start);
        } else {
            failed_ops++;
        }
        PQclear(res);
    }

    double total_unindexed_ms = 0;
    for (double val : unindexed_latencies) total_unindexed_ms += val;
    double avg_unindexed_ms = unindexed_latencies.empty() ? 0.0 : total_unindexed_ms / unindexed_latencies.size();

    double total_indexed_ms = 0;
    for (double val : indexed_latencies) total_indexed_ms += val;
    double avg_indexed_ms = indexed_latencies.empty() ? 0.0 : total_indexed_ms / indexed_latencies.size();

    double speedup = avg_indexed_ms > 0 ? (avg_unindexed_ms / avg_indexed_ms) : 1.0;

    // Record results (we save the indexed run results)
    DbBenchmarkResult result = calculate_results(
        "index_effectiveness",
        indexed_latencies,
        failed_ops,
        total_indexed_ms / 1000.0,
        concurrency
    );
    save_db_result_to_csv("index_effectiveness", result);

    std::cout << "  Unindexed Avg Latency: " << avg_unindexed_ms << " ms" << std::endl;
    std::cout << "  Indexed Avg Latency: " << avg_indexed_ms << " ms" << std::endl;
    std::cout << "  Calculated Query Speedup: " << speedup << "x faster" << std::endl;

    // Clean up temporary table
    PQclear(PQexec(conn, "DROP TABLE \"bench_tasks\";"));
    disconnect_database(conn);
}

} // namespace db_bench
