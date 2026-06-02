#include <iostream>
#include <string>
#include <vector>
#include "json.hpp"
#include "cpm_types.h"
#include "graph_builder.h"
#include "topological_sort.h"
#include "schedule_calculator.h"
#include "float_calculator.h"
#include "critical_path_finder.h"

using json = nlohmann::json;
using namespace cpm;

int main() {
    try {
        json input_json;
        std::cin >> input_json;
        
        GraphBuilder builder;
        builder.setProjectStart("2024-01-01"); // arbitrary start date for relative calcs
        
        for (const auto& t : input_json["tasks"]) {
            std::string id = t["id"].get<std::string>();
            double duration = t["duration"].get<double>();
            builder.addTask(id, duration);
        }
        
        if (input_json.contains("dependencies")) {
            for (const auto& d : input_json["dependencies"]) {
                std::string from = d["from"].get<std::string>();
                std::string to = d["to"].get<std::string>();
                double lag = d.contains("lag") ? d["lag"].get<double>() : 0.0;
                builder.addDependency(from, to, DependencyType::FS, lag, LagUnit::DAYS);
            }
        }
        
        auto graph = builder.build();
        auto order = TopologicalSort::sort(*graph);
        auto project_finish = ScheduleCalculator::forwardPass(*graph, order, graph->project_start);
        ScheduleCalculator::backwardPass(*graph, order, project_finish);
        FloatCalculator::calculateTotalFloat(*graph);
        FloatCalculator::calculateFreeFloat(*graph);
        auto critical_path = CriticalPathFinder::findLongestCriticalPath(*graph);
        
        json output_json;
        output_json["projectDuration"] = dateTimeDiffDays(graph->project_start, project_finish);
        output_json["criticalPath"] = critical_path;
        
        output_json["tasks"] = json::array();
        for (const auto& [id, task] : graph->tasks) {
            json tj;
            tj["id"] = id;
            tj["earliest_start"] = dateTimeDiffDays(graph->project_start, task.early_start);
            tj["earliest_finish"] = dateTimeDiffDays(graph->project_start, task.early_finish);
            tj["latest_start"] = dateTimeDiffDays(graph->project_start, task.late_start);
            tj["latest_finish"] = dateTimeDiffDays(graph->project_start, task.late_finish);
            tj["float_time"] = task.total_float;
            output_json["tasks"].push_back(tj);
        }
        
        json result;
        result["result"] = output_json;
        std::cout << result.dump() << std::endl;
        
    } catch (const std::exception& e) {
        json err;
        err["error"] = e.what();
        std::cerr << err.dump() << std::endl;
        return 1;
    }
    
    return 0;
}
