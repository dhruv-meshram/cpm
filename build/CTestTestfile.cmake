# CMake generated Testfile for 
# Source directory: /home/dhruv/Documents/cpm
# Build directory: /home/dhruv/Documents/cpm/build
# 
# This file includes the relevant testing commands required for 
# testing this directory and lists subdirectories to be tested as well.
add_test(GraphConstruction "/home/dhruv/Documents/cpm/build/test_graph_construction")
set_tests_properties(GraphConstruction PROPERTIES  LABELS "unit" _BACKTRACE_TRIPLES "/home/dhruv/Documents/cpm/CMakeLists.txt;51;add_test;/home/dhruv/Documents/cpm/CMakeLists.txt;0;")
add_test(GraphValidation "/home/dhruv/Documents/cpm/build/test_graph_validation")
set_tests_properties(GraphValidation PROPERTIES  LABELS "unit" _BACKTRACE_TRIPLES "/home/dhruv/Documents/cpm/CMakeLists.txt;65;add_test;/home/dhruv/Documents/cpm/CMakeLists.txt;0;")
add_test(TopologicalSort "/home/dhruv/Documents/cpm/build/test_topological_sort")
set_tests_properties(TopologicalSort PROPERTIES  LABELS "unit" _BACKTRACE_TRIPLES "/home/dhruv/Documents/cpm/CMakeLists.txt;79;add_test;/home/dhruv/Documents/cpm/CMakeLists.txt;0;")
add_test(ScheduleCalculation "/home/dhruv/Documents/cpm/build/test_schedule_calculation")
set_tests_properties(ScheduleCalculation PROPERTIES  LABELS "unit" _BACKTRACE_TRIPLES "/home/dhruv/Documents/cpm/CMakeLists.txt;93;add_test;/home/dhruv/Documents/cpm/CMakeLists.txt;0;")
add_test(FloatCalculation "/home/dhruv/Documents/cpm/build/test_float_calculation")
set_tests_properties(FloatCalculation PROPERTIES  LABELS "unit" _BACKTRACE_TRIPLES "/home/dhruv/Documents/cpm/CMakeLists.txt;107;add_test;/home/dhruv/Documents/cpm/CMakeLists.txt;0;")
add_test(CriticalPathFinder "/home/dhruv/Documents/cpm/build/test_critical_path_finder")
set_tests_properties(CriticalPathFinder PROPERTIES  LABELS "unit" _BACKTRACE_TRIPLES "/home/dhruv/Documents/cpm/CMakeLists.txt;121;add_test;/home/dhruv/Documents/cpm/CMakeLists.txt;0;")
add_test(ValidationPhase "/home/dhruv/Documents/cpm/build/test_validation_phase")
set_tests_properties(ValidationPhase PROPERTIES  LABELS "validation;phase" _BACKTRACE_TRIPLES "/home/dhruv/Documents/cpm/CMakeLists.txt;135;add_test;/home/dhruv/Documents/cpm/CMakeLists.txt;0;")
add_test(ValidationHProjectDuration "/home/dhruv/Documents/cpm/build/test_validation_H")
set_tests_properties(ValidationHProjectDuration PROPERTIES  LABELS "validation;H" _BACKTRACE_TRIPLES "/home/dhruv/Documents/cpm/CMakeLists.txt;149;add_test;/home/dhruv/Documents/cpm/CMakeLists.txt;0;")
add_test(ValidationLDateScheduling "/home/dhruv/Documents/cpm/build/test_validation_L")
set_tests_properties(ValidationLDateScheduling PROPERTIES  LABELS "validation;L" _BACKTRACE_TRIPLES "/home/dhruv/Documents/cpm/CMakeLists.txt;163;add_test;/home/dhruv/Documents/cpm/CMakeLists.txt;0;")
add_test(ValidationNRandomized "/home/dhruv/Documents/cpm/build/test_validation_N")
set_tests_properties(ValidationNRandomized PROPERTIES  LABELS "validation;N" _BACKTRACE_TRIPLES "/home/dhruv/Documents/cpm/CMakeLists.txt;177;add_test;/home/dhruv/Documents/cpm/CMakeLists.txt;0;")
