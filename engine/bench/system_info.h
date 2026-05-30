#ifndef CPM_SYSTEM_INFO_H
#define CPM_SYSTEM_INFO_H

#include <string>

namespace cpm {

struct SystemInfo {
    std::string cpu_model;
    int cpu_cores;
    std::string cpu_frequency;
    
    long long total_memory_bytes;
    long long available_memory_bytes;
    
    std::string os_name;
    std::string os_version;
    std::string kernel_version;
    
    std::string compiler_name;
    std::string compiler_version;
    std::string build_flags;
    
    static SystemInfo getSysInfo();
    std::string toJSON() const;
};

}  // namespace cpm

#endif  // CPM_SYSTEM_INFO_H
