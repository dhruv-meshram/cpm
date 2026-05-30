#!/bin/bash

# CPM Engine Build Script - Stages 1-6
# Compiles all core algorithms with comprehensive tests

set -e

PROJECT_ROOT="/home/dhruv/Documents/cpm"
BUILD_DIR="$PROJECT_ROOT/build"
BIN_DIR="$BUILD_DIR/bin"

mkdir -p "$BIN_DIR"

echo "=========================================="
echo "CPM Engine Stages 1-6 Build"
echo "=========================================="

# Compile core object files
echo "[1/6] Compiling graph_builder.cpp..."
g++ -std=c++17 -Wall -Wextra -Wpedantic \
    -I"$PROJECT_ROOT/engine/include" \
    "$PROJECT_ROOT/engine/src/graph_builder.cpp" \
    -c -o "$BUILD_DIR/graph_builder.o"

echo "[2/6] Compiling graph_validator.cpp..."
g++ -std=c++17 -Wall -Wextra -Wpedantic \
    -I"$PROJECT_ROOT/engine/include" \
    "$PROJECT_ROOT/engine/src/graph_validator.cpp" \
    -c -o "$BUILD_DIR/graph_validator.o"

echo "[3/6] Compiling topological_sort.cpp..."
g++ -std=c++17 -Wall -Wextra -Wpedantic \
    -I"$PROJECT_ROOT/engine/include" \
    "$PROJECT_ROOT/engine/src/topological_sort.cpp" \
    -c -o "$BUILD_DIR/topological_sort.o"

echo "[4/6] Compiling schedule_calculator.cpp..."
g++ -std=c++17 -Wall -Wextra -Wpedantic \
    -I"$PROJECT_ROOT/engine/include" \
    "$PROJECT_ROOT/engine/src/schedule_calculator.cpp" \
    -c -o "$BUILD_DIR/schedule_calculator.o"

echo "[5/6] Compiling float_calculator.cpp..."
g++ -std=c++17 -Wall -Wextra -Wpedantic \
    -I"$PROJECT_ROOT/engine/include" \
    "$PROJECT_ROOT/engine/src/float_calculator.cpp" \
    -c -o "$BUILD_DIR/float_calculator.o"

echo "[6/6] Compiling critical_path_finder.cpp..."
g++ -std=c++17 -Wall -Wextra -Wpedantic \
    -I"$PROJECT_ROOT/engine/include" \
    "$PROJECT_ROOT/engine/src/critical_path_finder.cpp" \
    -c -o "$BUILD_DIR/critical_path_finder.o"

# Compile test executables
echo ""
echo "Compiling test executables..."

echo "[1/6] Building test_graph_construction..."
g++ -std=c++17 -Wall -Wextra -Wpedantic \
    -I"$PROJECT_ROOT/engine/include" \
    "$PROJECT_ROOT/engine/tests/test_graph_construction.cpp" \
    "$BUILD_DIR/graph_builder.o" \
    -o "$BIN_DIR/test_graph_construction"

echo "[2/6] Building test_graph_validation..."
g++ -std=c++17 -Wall -Wextra -Wpedantic \
    -I"$PROJECT_ROOT/engine/include" \
    "$PROJECT_ROOT/engine/tests/test_graph_validation.cpp" \
    "$BUILD_DIR/graph_builder.o" \
    "$BUILD_DIR/graph_validator.o" \
    -o "$BIN_DIR/test_graph_validation"

echo "[3/6] Building test_topological_sort..."
g++ -std=c++17 -Wall -Wextra -Wpedantic \
    -I"$PROJECT_ROOT/engine/include" \
    "$PROJECT_ROOT/engine/tests/test_topological_sort.cpp" \
    "$BUILD_DIR/graph_builder.o" \
    "$BUILD_DIR/graph_validator.o" \
    "$BUILD_DIR/topological_sort.o" \
    -o "$BIN_DIR/test_topological_sort"

echo "[4/6] Building test_schedule_calculation..."
g++ -std=c++17 -Wall -Wextra -Wpedantic \
    -I"$PROJECT_ROOT/engine/include" \
    "$PROJECT_ROOT/engine/tests/test_schedule_calculation.cpp" \
    "$BUILD_DIR/graph_builder.o" \
    "$BUILD_DIR/graph_validator.o" \
    "$BUILD_DIR/topological_sort.o" \
    "$BUILD_DIR/schedule_calculator.o" \
    -o "$BIN_DIR/test_schedule_calculation"

echo "[5/6] Building test_float_calculation..."
g++ -std=c++17 -Wall -Wextra -Wpedantic \
    -I"$PROJECT_ROOT/engine/include" \
    "$PROJECT_ROOT/engine/tests/test_float_calculation.cpp" \
    "$BUILD_DIR/graph_builder.o" \
    "$BUILD_DIR/graph_validator.o" \
    "$BUILD_DIR/topological_sort.o" \
    "$BUILD_DIR/schedule_calculator.o" \
    "$BUILD_DIR/float_calculator.o" \
    -o "$BIN_DIR/test_float_calculation"

echo "[6/6] Building test_critical_path_finder..."
g++ -std=c++17 -Wall -Wextra -Wpedantic \
    -I"$PROJECT_ROOT/engine/include" \
    "$PROJECT_ROOT/engine/tests/test_critical_path_finder.cpp" \
    "$BUILD_DIR/graph_builder.o" \
    "$BUILD_DIR/graph_validator.o" \
    "$BUILD_DIR/topological_sort.o" \
    "$BUILD_DIR/schedule_calculator.o" \
    "$BUILD_DIR/float_calculator.o" \
    "$BUILD_DIR/critical_path_finder.o" \
    -o "$BIN_DIR/test_critical_path_finder"

# Run tests
echo ""
echo "Running tests..."
echo ""

TEST_FAILED=0

echo "========== STAGE 1: Graph Construction =========="
"$BIN_DIR/test_graph_construction" || TEST_FAILED=1

echo ""
echo "========== STAGE 2: Graph Validation =========="
"$BIN_DIR/test_graph_validation" || TEST_FAILED=1

echo ""
echo "========== STAGE 3: Topological Sort =========="
"$BIN_DIR/test_topological_sort" || TEST_FAILED=1

echo ""
echo "========== STAGE 4: Schedule Calculation =========="
"$BIN_DIR/test_schedule_calculation" || TEST_FAILED=1

echo ""
echo "========== STAGE 5: Float Calculation =========="
"$BIN_DIR/test_float_calculation" || TEST_FAILED=1

echo ""
echo "========== STAGE 6: Critical Path Finding =========="
"$BIN_DIR/test_critical_path_finder" || TEST_FAILED=1

echo ""
echo "=========================================="
if [ $TEST_FAILED -eq 0 ]; then
    echo "✓ Build successful! All tests passed."
else
    echo "✗ Build completed but some tests failed."
fi
echo "=========================================="

exit $TEST_FAILED
