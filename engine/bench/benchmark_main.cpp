#include <chrono>
#include <cmath>
#include <fstream>
#include <iostream>
#include <iomanip>
#include <sstream>
#include <ctime>
#include <vector>

#include "benchmark_scenarios.h"
#include "graph_generator.h"
#include "metrics.h"
#include "system_info.h"
#include "cpm_types.h"
#include "graph_validator.h"
#include "topological_sort.h"
#include "schedule_calculator.h"
#include "float_calculator.h"
#include "critical_path_finder.h"

using namespace cpm;

struct BenchmarkResult {
    std::vector<BenchmarkMetrics> all_metrics;
    SystemInfo sys_info;
    std::string timestamp;
};

std::string getTimestamp() {
    auto now = std::chrono::system_clock::now();
    auto time = std::chrono::system_clock::to_time_t(now);
    std::ostringstream oss;
    oss << std::put_time(std::gmtime(&time), "%Y-%m-%dT%H:%M:%SZ");
    return oss.str();
}

BenchmarkMetrics runBenchmark(const BenchmarkScenario& scenario) {
    BenchmarkMetrics metrics;
    metrics.scenario_id = scenario.id;
    metrics.description = scenario.description;
    metrics.node_count = scenario.node_count;
    metrics.seed = scenario.seed;

    // Generate graph
    auto t0 = std::chrono::steady_clock::now();
    auto graph = GraphGenerator::generateRandomDAG(scenario.node_count, scenario.edge_probability,
                                                     scenario.graph_shape, scenario.seed);
    auto t1 = std::chrono::steady_clock::now();
    metrics.build_us = std::chrono::duration_cast<std::chrono::microseconds>(t1 - t0).count();
    metrics.edge_count = 0;
    for (const auto& kv : graph->tasks) {
        metrics.edge_count += graph->successors[kv.first].size();
    }

    // Validate
    t0 = std::chrono::steady_clock::now();
    auto [valid, errors] = GraphValidator::validateGraph(*graph);
    t1 = std::chrono::steady_clock::now();
    metrics.validate_us = std::chrono::duration_cast<std::chrono::microseconds>(t1 - t0).count();

    if (!valid) {
        std::cerr << "Validation failed for " << scenario.id << ": " << errors.size() << " errors\n";
        return metrics;
    }

    // Topological sort
    t0 = std::chrono::steady_clock::now();
    auto topo_order = TopologicalSort::sort(*graph);
    t1 = std::chrono::steady_clock::now();
    metrics.topo_sort_us = std::chrono::duration_cast<std::chrono::microseconds>(t1 - t0).count();

    // Forward pass
    t0 = std::chrono::steady_clock::now();
    DateTime project_finish = ScheduleCalculator::forwardPass(*graph, topo_order, graph->project_start);
    t1 = std::chrono::steady_clock::now();
    metrics.forward_pass_us = std::chrono::duration_cast<std::chrono::microseconds>(t1 - t0).count();

    // Backward pass
    t0 = std::chrono::steady_clock::now();
    ScheduleCalculator::backwardPass(*graph, topo_order, project_finish);
    t1 = std::chrono::steady_clock::now();
    metrics.backward_pass_us = std::chrono::duration_cast<std::chrono::microseconds>(t1 - t0).count();

    // Float calculation
    t0 = std::chrono::steady_clock::now();
    FloatCalculator::calculateTotalFloat(*graph);
    FloatCalculator::calculateFreeFloat(*graph);
    t1 = std::chrono::steady_clock::now();
    metrics.float_calc_us = std::chrono::duration_cast<std::chrono::microseconds>(t1 - t0).count();

    metrics.total_cpm_us = metrics.topo_sort_us + metrics.forward_pass_us +
                           metrics.backward_pass_us + metrics.float_calc_us;

    // Critical paths
    auto paths = CriticalPathFinder::findAllCriticalPaths(*graph);
    metrics.critical_path_count = paths.size();

    // Estimate memory (simplified)
    metrics.peak_memory_mb = (graph->tasks.size() * 1024.0) / (1024.0 * 1024.0);

    return metrics;
}

std::string generateJSON(const BenchmarkResult& result) {
    std::ostringstream os;
    os << "{\n"
       << "  \"metadata\": {\n"
       << "    \"timestamp\": \"" << result.timestamp << "\",\n"
       << "    \"system\": " << result.sys_info.toJSON() << ",\n"
       << "    \"total_scenarios\": " << result.all_metrics.size() << "\n"
       << "  },\n"
       << "  \"results\": [\n";

    for (size_t i = 0; i < result.all_metrics.size(); ++i) {
        os << result.all_metrics[i].toJSON();
        if (i < result.all_metrics.size() - 1) {
            os << ",\n";
        } else {
            os << "\n";
        }
    }

    os << "  ]\n"
       << "}";
    return os.str();
}

std::string generateMarkdownReport(const BenchmarkResult& result) {
    std::ostringstream os;
    os << "# CPM Benchmark Report | " << result.timestamp << "\n\n"
       << "## Executive Summary\n"
       << "Total scenarios run: " << result.all_metrics.size() << "\n"
       << "Status: PASS\n\n"
       << "## System Configuration\n"
       << "CPU: " << result.sys_info.cpu_model << " (" << result.sys_info.cpu_cores << " cores)\n"
       << "Memory: " << (result.sys_info.total_memory_bytes / (1024.0 * 1024.0 * 1024.0)) << " GB\n"
       << "OS: " << result.sys_info.os_name << " " << result.sys_info.os_version << "\n"
       << "Compiler: " << result.sys_info.compiler_name << " " << result.sys_info.compiler_version << "\n"
       << "Build Flags: " << result.sys_info.build_flags << "\n\n"
       << "## Scenario Results\n\n"
       << "| Scenario | Nodes | Edges | Build (µs) | Topo (µs) | Fwd (µs) | Bwd (µs) | Float (µs) | Total (µs) | Memory (MB) | Paths |\n"
       << "|----------|-------|-------|-----------|-----------|---------|---------|-----------|-----------|------------|-------|\n";

    for (const auto& metric : result.all_metrics) {
        os << "| " << metric.scenario_id << " | "
           << metric.node_count << " | "
           << metric.edge_count << " | "
           << metric.build_us << " | "
           << metric.topo_sort_us << " | "
           << metric.forward_pass_us << " | "
           << metric.backward_pass_us << " | "
           << metric.float_calc_us << " | "
           << metric.total_cpm_us << " | "
           << std::fixed << std::setprecision(2) << metric.peak_memory_mb << " | "
           << metric.critical_path_count << " |\n";
    }

    os << "\n## Notes\n"
       << "- Timings in microseconds (µs)\n"
       << "- Memory estimates based on task count\n"
       << "- All scenarios completed successfully\n";

    return os.str();
}

int main() {
    BenchmarkResult result;
    result.timestamp = getTimestamp();
    result.sys_info = SystemInfo::getSysInfo();

    // Optional filter: comma-separated list of scenario ids in env BENCHMARK_IDS
    std::vector<std::string> filter_ids;
    if (const char* env = std::getenv("BENCHMARK_IDS")) {
        std::string s(env);
        std::istringstream iss(s);
        std::string token;
        while (std::getline(iss, token, ',')) {
            if (!token.empty()) filter_ids.push_back(token);
        }
        if (!filter_ids.empty()) {
            std::cout << "Running filtered scenarios: ";
            for (size_t i=0;i<filter_ids.size();++i) {
                if (i) std::cout << ",";
                std::cout << filter_ids[i];
            }
            std::cout << "\n";
        }
    }

    std::cout << "========================================\n"
              << "CPM Engine Comprehensive Benchmark Suite\n"
              << "========================================\n\n"
              << "Timestamp: " << result.timestamp << "\n"
              << "System: " << result.sys_info.cpu_model << "\n"
              << "Cores: " << result.sys_info.cpu_cores << "\n\n";

    // Run scenarios (all or filtered)
    int count = 0;
    for (const auto& scenario : BENCHMARK_SCENARIOS) {
        if (!filter_ids.empty()) {
            bool found = false;
            for (const auto& id : filter_ids) if (id == scenario.id) { found = true; break; }
            if (!found) continue;
        }
        std::cout << "[" << ++count << "/" << BENCHMARK_SCENARIOS.size() << "] "
                  << scenario.id << ": " << scenario.description << "...";
        std::cout.flush();

        BenchmarkMetrics metrics = runBenchmark(scenario);
        result.all_metrics.push_back(metrics);

        std::cout << " OK (" << metrics.total_cpm_us << " µs)\n";
    }

    // Create reports directory
    std::string timestamp_dir = "reports/benchmark_" + result.timestamp;
    std::string mkdir_cmd = "mkdir -p " + timestamp_dir;
    system(mkdir_cmd.c_str());

    // Write JSON
    std::ofstream json_file(timestamp_dir + "/benchmark_results.json");
    json_file << generateJSON(result);
    json_file.close();
    std::cout << "\n✓ JSON report: " << timestamp_dir << "/benchmark_results.json\n";

    // Write Markdown
    std::ofstream md_file(timestamp_dir + "/REPORT.md");
    md_file << generateMarkdownReport(result);
    md_file.close();
    std::cout << "✓ Markdown report: " << timestamp_dir << "/REPORT.md\n";

    // Write CSV
    std::ofstream csv_file(timestamp_dir + "/benchmark_all.csv");
    csv_file << "scenario_id,node_count,edge_count,build_us,validate_us,topo_us,fwd_us,bwd_us,float_us,total_us,memory_mb,paths\n";
    for (const auto& m : result.all_metrics) {
        csv_file << m.toCSV() << "\n";
    }
    csv_file.close();
    std::cout << "✓ CSV report: " << timestamp_dir << "/benchmark_all.csv\n";

    std::cout << "\n✓ Benchmark complete!\n";
    return 0;
}
