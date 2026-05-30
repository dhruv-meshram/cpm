#include "system_info.h"

#include <fstream>
#include <sstream>
#include <unistd.h>

#ifdef __APPLE__
#include <sys/sysctl.h>
#endif

using namespace cpm;

SystemInfo SystemInfo::getSysInfo() {
    SystemInfo info;

#ifdef __APPLE__
    char buffer[256] = {0};
    size_t buflen = 256;
    
    sysctlbyname("machdep.cpu.brand_string", buffer, &buflen, NULL, 0);
    info.cpu_model = buffer;
    
    int cores;
    size_t len = sizeof(cores);
    sysctlbyname("hw.ncpu", &cores, &len, NULL, 0);
    info.cpu_cores = cores;
    
    info.os_name = "macOS";
    sysctlbyname("kern.osrelease", buffer, &buflen, NULL, 0);
    info.os_version = buffer;
    info.kernel_version = buffer;

#elif defined(__linux__)
    std::ifstream cpuinfo("/proc/cpuinfo");
    std::string line;
    while (std::getline(cpuinfo, line)) {
        if (line.find("model name") != std::string::npos) {
            info.cpu_model = line.substr(line.find(":") + 2);
            break;
        }
    }
    cpuinfo.close();
    
    info.cpu_cores = sysconf(_SC_NPROCESSORS_ONLN);
    
    std::ifstream osrelease("/etc/os-release");
    while (std::getline(osrelease, line)) {
        if (line.find("NAME=") != std::string::npos) {
            info.os_name = line.substr(6);
        }
        if (line.find("VERSION_ID=") != std::string::npos) {
            info.os_version = line.substr(12);
        }
    }
    osrelease.close();
    
    std::ifstream uname("/proc/version");
    std::getline(uname, info.kernel_version);
    uname.close();

#else
    info.os_name = "Unknown OS";
    info.cpu_cores = sysconf(_SC_NPROCESSORS_ONLN);
    info.cpu_model = "Generic CPU";

#endif

    info.total_memory_bytes = sysconf(_SC_PHYS_PAGES) * sysconf(_SC_PAGE_SIZE);
    info.available_memory_bytes = sysconf(_SC_AVPHYS_PAGES) * sysconf(_SC_PAGE_SIZE);
    
    info.compiler_name = "g++";
    info.compiler_version = __VERSION__;
    info.build_flags = "-O3 -Wall -Wextra";
    
    return info;
}

std::string SystemInfo::toJSON() const {
    std::ostringstream os;
    os << "{\n"
       << "  \"cpu_model\": \"" << cpu_model << "\",\n"
       << "  \"cpu_cores\": " << cpu_cores << ",\n"
       << "  \"total_memory_gb\": " << (total_memory_bytes / (1024.0 * 1024.0 * 1024.0)) << ",\n"
       << "  \"available_memory_gb\": " << (available_memory_bytes / (1024.0 * 1024.0 * 1024.0)) << ",\n"
       << "  \"os_name\": \"" << os_name << "\",\n"
       << "  \"os_version\": \"" << os_version << "\",\n"
       << "  \"compiler\": \"" << compiler_name << " " << compiler_version << "\",\n"
       << "  \"build_flags\": \"" << build_flags << "\"\n"
       << "}";
    return os.str();
}
