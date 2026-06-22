#include "db_utils.hpp"
#include <iostream>
#include <fstream>
#include <chrono>
#include <algorithm>
#include <numeric>
#include <sys/stat.h>
#include <sys/types.h>
#include <ctime>
#include <iomanip>
#include <sstream>

namespace db_bench {

PGconn* connect_database() {
    const char* db_url_env = std::getenv("DATABASE_URL");
    std::string db_url = db_url_env ? db_url_env : "postgresql://test:test@127.0.0.1:5432/cpm_test?schema=public";

    PGconn* conn = PQconnectdb(db_url.c_str());

    if (PQstatus(conn) != CONNECTION_OK) {
        std::cerr << "[DB Connection Error] Connection to database failed: " 
                  << PQerrorMessage(conn) << std::endl;
        PQfinish(conn);
        return nullptr;
    }

    return conn;
}

void disconnect_database(PGconn* conn) {
    if (conn) {
        PQfinish(conn);
    }
}

std::string get_or_create_workspace(PGconn* conn) {
    if (!conn) return "";

    // Check if workspace exists
    const char* check_sql = "SELECT id FROM \"Workspace\" WHERE slug = 'bench-ws' LIMIT 1;";
    PGresult* res = PQexec(conn, check_sql);

    if (PQresultStatus(res) == PGRES_TUPLES_OK && PQntuples(res) > 0) {
        std::string id = PQgetvalue(res, 0, 0);
        PQclear(res);
        return id;
    }
    PQclear(res);

    // Create a new workspace
    const char* create_sql = 
        "INSERT INTO \"Workspace\" (id, name, slug, description, \"createdAt\", \"updatedAt\") "
        "VALUES ('bench-ws-id', 'Benchmark Workspace', 'bench-ws', 'Temporary workspace for benchmarks', NOW(), NOW()) "
        "RETURNING id;";
    res = PQexec(conn, create_sql);

    if (PQresultStatus(res) == PGRES_TUPLES_OK && PQntuples(res) > 0) {
        std::string id = PQgetvalue(res, 0, 0);
        PQclear(res);
        return id;
    }

    std::cerr << "[DB Seeding Error] Failed to create benchmark workspace: " 
              << PQerrorMessage(conn) << std::endl;
    PQclear(res);
    return "";
}

void cleanup_bench_data(PGconn* conn) {
    if (!conn) return;

    // Delete tasks, dependencies, projects, and custom indexes created during the run
    PQclear(PQexec(conn, "DELETE FROM \"Dependency\" WHERE \"projectId\" LIKE 'bench-proj-%' OR id LIKE 'bench-%';"));
    PQclear(PQexec(conn, "DELETE FROM \"Task\" WHERE \"projectId\" LIKE 'bench-proj-%' OR id LIKE 'bench-%';"));
    PQclear(PQexec(conn, "DELETE FROM \"ProjectMember\" WHERE \"projectId\" LIKE 'bench-proj-%';"));
    PQclear(PQexec(conn, "DELETE FROM \"Project\" WHERE id LIKE 'bench-proj-%';"));
    
    // Cleanup custom indexes if they exist
    PQclear(PQexec(conn, "DROP INDEX IF EXISTS \"Task_bench_title_idx\";"));
}

double get_time_ms() {
    auto now = std::chrono::high_resolution_clock::now();
    return std::chrono::duration<double, std::milli>(now.time_since_epoch()).count();
}

DbBenchmarkResult calculate_results(
    const std::string& test_name,
    const std::vector<double>& latencies,
    int failed_ops,
    double total_duration_sec,
    int concurrency
) {
    DbBenchmarkResult result;

    // Get current ISO Timestamp
    auto now_time = std::chrono::system_clock::now();
    std::time_t now_c = std::chrono::system_clock::to_time_t(now_time);
    std::stringstream ss;
    ss << std::put_time(std::gmtime(&now_c), "%FT%TZ");

    result.timestamp = ss.str();
    result.test_name = test_name;
    result.concurrency = concurrency;
    result.duration_sec = total_duration_sec;
    result.failed_operations = failed_ops;
    result.successful_operations = latencies.size();
    result.total_operations = result.successful_operations + result.failed_operations;

    if (latencies.empty()) {
        result.avg_latency_ms = 0.0;
        result.median_latency_ms = 0.0;
        result.p95_latency_ms = 0.0;
        result.p99_latency_ms = 0.0;
        result.throughput_ops_sec = 0.0;
        return result;
    }

    // Sort latencies for percentiles
    std::vector<double> sorted = latencies;
    std::sort(sorted.begin(), sorted.end());

    double sum = std::accumulate(sorted.begin(), sorted.end(), 0.0);
    result.avg_latency_ms = sum / sorted.size();
    result.median_latency_ms = sorted[sorted.size() * 0.5];
    result.p95_latency_ms = sorted[sorted.size() * 0.95];
    result.p99_latency_ms = sorted[sorted.size() * 0.99];
    result.throughput_ops_sec = result.successful_operations / total_duration_sec;

    return result;
}

void save_db_result_to_csv(const std::string& filename, const DbBenchmarkResult& result) {
    // Create benchmarks/db/results directory if it doesn't exist
    mkdir("benchmarks", 0777);
    mkdir("benchmarks/db", 0777);
    mkdir("benchmarks/db/results", 0777);

    std::string csv_path = "benchmarks/db/results/" + filename + ".csv";
    bool exists = std::ifstream(csv_path.c_str()).good();

    std::ofstream out(csv_path, std::ios::app);
    if (!out) {
        std::cerr << "Failed to open CSV output path: " << csv_path << std::endl;
        return;
    }

    if (!exists) {
        out << "timestamp,test_name,concurrency,duration_sec,total_operations,successful_operations,failed_operations,"
            << "avg_latency_ms,median_latency_ms,p95_latency_ms,p99_latency_ms,throughput_ops_sec\n";
    }

    out << result.timestamp << ","
        << result.test_name << ","
        << result.concurrency << ","
        << result.duration_sec << ","
        << result.total_operations << ","
        << result.successful_operations << ","
        << result.failed_operations << ","
        << result.avg_latency_ms << ","
        << result.median_latency_ms << ","
        << result.p95_latency_ms << ","
        << result.p99_latency_ms << ","
        << result.throughput_ops_sec << "\n";

    out.close();
}

} // namespace db_bench
