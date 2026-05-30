# cpm

# TEST STACK

- frontend and backend: next.js
- db: postgres
- CPM engine: cpp
- Graph: DOT, graphviz, react flow
- Connections: Websockets and HTTP Request
- ORM: Prisma

---

# MATH ENGINE

### inputs

- Task Name
- Duration
- Dependencies
- Start Date
- Deadline
- Lag/Lead
- Dependency Type

### **1. Task Data**

Each task must specify:

```tsx
interface Task {
  id:             string              // Unique identifier (e.g., "T-001", "TASK_A")
  duration:       number              // Duration in days (can be fractional, ≥ 0)
  startDate?:     datetime            // Optional: explicit start date
  endDate?:       datetime            // Optional: explicit end date
  estimatedDays:  number              // Duration estimate (may differ from actual)
}
```

**Constraints:**

- Duration must be non-negative (≥ 0 days)
- Zero-duration tasks are allowed (milestones)
- All tasks must have unique IDs

### **2. Dependency Data**

Each dependency must specify:

```tsx
interface Dependency {
  predecessorId:  string              // ID of task that must complete first
  successorId:    string              // ID of task that depends on predecessor
  type:           string              // 'FS' (Finish-to-Start), 'SS', 'FF', 'SF'
  lag:            number              // Time delay (in lag_unit) after predecessor completes
  lagUnit:        string              // 'days', 'hours', 'weeks'
  strength:       number              // 1.0 = hard constraint (default)
}
```

**Constraints:**

- Both predecessor and successor IDs must exist in task data
- **No circular dependencies** (cycles) are allowed
- At least one task must have no predecessors (root task)
- At least one task must have no successors (sink task)

### **3. Project Start Date**

```tsx
projectStart: datetime              // Reference date for all calculations
```

### **Graph Validation**

Before computation begins, the engine validates:

1. **Graph is non-empty**: At least one task exists
2. **Positive durations**: All tasks have duration ≥ 0
3. **No cycles**: Dependencies form a Directed Acyclic Graph (DAG)
4. **Valid references**: All predecessor/successor IDs exist

**If validation fails**, the engine raises `CpmComputationError` with details.

## **CPM Computation Steps**

### **High-Level Orchestration**

The CPM engine executes these steps in sequence:

```python
# Pseudo-code from CpmService.compute_cpm()
1. Validate project graph
2. Topological sort → establish task processing order
3. Forward pass → compute ES/EF for all tasks
4. Backward pass → compute LS/LF for all tasks
5. Calculate floats → compute TF/FF and criticality
6. Extract critical path(s)
7. Package results into CpmResult
```

Each step builds on previous results. **No step can be skipped or reordered.**

---

## **Detailed Algorithm Walkthrough**

### **Step 1: Graph Validation**

**Purpose**: Ensure input data is suitable for CPM computation

**Algorithm**:

```python
function validate_project_graph(graph):
    errors = []

    # Check 1: Non-empty graph
    if graph is empty:
        errors.append("Project has no tasks")

    # Check 2: All tasks have non-negative duration
    for each task:
        if task.duration < 0:
            errors.append(f"Task {id} has negative duration")

    # Check 3: No cycles (detected via topological sort)
    if has_cycle(graph):
        cycle_path = find_first_cycle(graph)
        errors.append(f"Cycle: {cycle_path}")

    return (errors.length == 0, errors)
```

**Complexity**: O(V + E) where V = tasks, E = dependencies

**Output**:

- Boolean: validation passed/failed
- List of error messages (if any)

---

### **Step 2: Topological Sort (Kahn's Algorithm)**

**Purpose**: Establish a linear ordering of tasks respecting dependencies

**Algorithm**:

```python
function topological_sort(graph):
    # Step 1: Calculate in-degree (number of prerequisites) for each task
    in_degree = {}
    for each task in graph:
        in_degree[task] = count(predecessors of task)

    # Step 2: Initialize queue with tasks having in_degree = 0
    queue = [task for task in graph if in_degree[task] == 0]
    result = []

    # Step 3: Process queue
    while queue is not empty:
        task = queue.pop()
        result.append(task)

        # For each successor of current task:
        for successor in graph.successors(task):
            in_degree[successor] -= 1

            # When successor has no more prerequisites, enqueue it
            if in_degree[successor] == 0:
                queue.push(successor)

    # Step 4: Check for cycles
    if result.length != graph.size():
        raise CycleDetectedError()

    return result
```

**Complexity**: O(V + E)

**Key Properties**:

- If no cycle exists, produces valid topological order
- Order respects all dependency constraints
- Used for forward pass processing order

**Example**:

```
Input graph: A → B → C
             └─→ D → E

Topological order: [A, B, D, C, E]  or  [A, D, B, C, E]
(both valid as long as dependencies are respected)
```

---

### **Step 3: Forward Pass (Earliest Times)**

**Purpose**: Calculate the earliest possible start and finish times for each task

**Algorithm**:

```python
function forward_pass(graph, project_start):
    # Process tasks in topological order
    for each task in topological_order:

        if task is a root task (no predecessors):
            task.ES = project_start
            task.EF = task.ES + duration
        else:
            # ES = max(predecessor.EF + lag) over all predecessors
            max_pred_ef = -∞
            for each predecessor in task.predecessors:
                pred_ef_with_lag = predecessor.EF + convert_lag(dependency)
                max_pred_ef = max(max_pred_ef, pred_ef_with_lag)

            task.ES = max_pred_ef
            task.EF = task.ES + duration

    # Project finish = maximum EF among all tasks
    project_finish = max(task.EF for all tasks)
    return project_finish
```

**Dependency Lag Handling**:

- Lag represents a time delay after predecessor completion
- Example: Predecessor ends 2024-01-15, lag = 2 days → successor can start 2024-01-17

**Complexity**: O(V + E)

**Example** (Linear chain):

```
Task A: 2 days, starts 2024-01-01
  → ES_A = 2024-01-01
  → EF_A = 2024-01-03

Task B: 3 days, (1 day lag after A)
  → ES_B = EF_A + 1 day = 2024-01-04
  → EF_B = 2024-01-07

Task C: 1 day, (no lag)
  → ES_C = EF_B = 2024-01-07
  → EF_C = 2024-01-08

Project Finish = 2024-01-08
```

---

### **Step 4: Backward Pass (Latest Times)**

**Purpose**: Calculate the latest possible start and finish times without delaying project completion

**Algorithm**:

```python
function backward_pass(graph, project_finish):
    # Process tasks in REVERSE topological order
    for each task in reverse(topological_order):

        if task is a sink task (no successors):
            task.LF = project_finish
            task.LS = task.LF - duration
        else:
            # LF = min(successor.LS - lag) over all successors
            min_succ_ls = +∞
            for each successor in task.successors:
                succ_ls_minus_lag = successor.LS - convert_lag(dependency)
                min_succ_ls = min(min_succ_ls, succ_ls_minus_lag)

            task.LF = min_succ_ls
            task.LS = task.LF - duration
```

**Key Insight**:

- Forward pass works forward in time (current → future)
- Backward pass works backward in time (finish date → start date)
- For a task to finish by LF without delaying successors, it must start by LS = LF - duration

**Complexity**: O(V + E)

**Example** (same linear chain):

```
Project Finish = 2024-01-08

Task C: 1 day
  → LF_C = 2024-01-08
  → LS_C = 2024-01-07

Task B: 3 days, (must finish by ES_C = 2024-01-07)
  → LF_B = 2024-01-07
  → LS_B = 2024-01-04

Task A: 2 days, (must finish by ES_B - lag = 2024-01-04 - 1 = 2024-01-03)
  → LF_A = 2024-01-03
  → LS_A = 2024-01-01
```

---

### **Step 5: Calculate Floats and Criticality**

**Purpose**: Determine task flexibility and identify critical path

**Formulas**:

### **Total Float (TF)**

```
TF = LS - ES = LF - EF

Interpretation:
- TF > 0: Task has slack; can be delayed without affecting project
- TF = 0: Critical task; any delay extends project duration
- TF < 0: Infeasible (indicates constraint conflict)
```

### **Free Float (FF)**

```
FF = min(successor.ES for all successors) - task.EF

Interpretation:
- FF ≤ TF always
- FF: Slack without affecting any successor's ES
- Useful for determining task flexibility within its own chain
```

### **Criticality**

```
is_critical = (TF ≈ 0)  where ≈ means within tolerance

Default tolerance = 1e-9 days (accounts for floating-point precision)
```

**Algorithm**:

```python
function calculate_floats(graph, tolerance=1e-9):
    for each task:
        # Total Float
        task.total_float = task.LS - task.ES

        # Free Float
        if task has no successors:
            task.free_float = 0
        else:
            min_successor_es = min(successor.ES for all successors)
            task.free_float = max(0, min_successor_es - task.EF)

        # Criticality
        task.is_critical = (abs(task.total_float) < tolerance)
```

**Complexity**: O(V + E)

**Example** (continuing linear chain):

```
Task A: ES=01-01, LS=01-01, EF=01-03, LF=01-03
  → TF_A = LS - ES = 0 days
  → is_critical_A = TRUE

Task B: ES=01-04, LS=01-04, EF=01-07, LF=01-07
  → TF_B = LS - ES = 0 days
  → is_critical_B = TRUE

Task C: ES=01-07, LS=01-07, EF=01-08, LF=01-08
  → TF_C = LS - ES = 0 days
  → is_critical_C = TRUE

All tasks on critical path (no slack)
```

---

### **Step 6: Extract Critical Path(s)**

**Purpose**: Identify the sequence of critical tasks that determines project duration

**Algorithm**:

```python
function extract_critical_paths(graph, max_paths=5):
    # Step 1: Filter tasks where is_critical = TRUE
    critical_tasks = {task for task in graph if task.is_critical}

    if critical_tasks is empty:
        return []  # No critical path

    # Step 2: Find critical root tasks (no predecessors in original graph)
    critical_roots = {task for task in critical_tasks if is_root(task)}

    # Step 3: Find critical sink tasks (no successors in original graph)
    critical_sinks = {task for task in critical_tasks if is_sink(task)}

    # Step 4: Find all paths from critical roots to critical sinks
    all_paths = []
    for each critical_root in critical_roots:
        for each critical_sink in critical_sinks:
            paths = find_all_paths(critical_root, critical_sink, critical_tasks)
            all_paths.extend(paths)

            if len(all_paths) >= max_paths:
                break

    # Step 5: Deduplicate and sort by length
    unique_paths = deduplicate(all_paths)
    unique_paths.sort_by(length, descending=True)

    return unique_paths[:max_paths]
```

**Path Finding** (DFS):

```python
function find_all_paths(start, target, critical_set):
    paths = []

    function dfs(current, path):
        if current == target:
            paths.append(path.copy())
            return

        for each successor in graph.successors(current):
            if successor in critical_set and successor not in path:
                path.append(successor)
                dfs(successor, path)
                path.remove(successor)

    dfs(start, [start])
    return paths
```

**Complexity**: Exponential in worst case (multiple parallel critical paths), limited by max_paths parameter

**Example** (branching graph):

```
     ┌─ B(critical) ─┐
A(c) ┤              ├─ E(critical)
     └─ D(critical) ─┘

Critical tasks: A, B, D, E
Critical paths found: [A→B→E], [A→D→E]
```

---

## **Intermediate Products**

### **After Validation**

```
Status: graph_valid
Output: (is_valid: bool, errors: List[str])
```

### **After Topological Sort**

```
Status: topologically_sorted
Output: List[task_id]
Example: ["A", "B", "D", "C", "E"]
```

### **After Forward Pass**

```
Status: earliest_times_computed
Output: For each task:
  - ES (Early Start): datetime
  - EF (Early Finish): datetime
  - project_finish: datetime
```

### **After Backward Pass**

```
Status: latest_times_computed
Output: For each task (in addition to ES/EF):
  - LS (Late Start): datetime
  - LF (Late Finish): datetime
```

### **After Float Calculation**

```
Status: floats_calculated
Output: For each task (in addition to all above):
  - total_float: float (days)
  - free_float: float (days)
  - is_critical: bool
```

### **After Critical Path Extraction**

```
Status: critical_path_extracted
Output:
  - critical_path_tasks: List[task_id]
  - critical_paths: List[List[task_id]]  (for multiple critical paths)
  - rank_hints: Dict[task_id, rank]      (for visualization)
```

---

## **Final Output**

### **CpmResult Object (Backend)**

```python
@dataclass
class CpmResult:
    # Timing information
    project_start:          datetime              # Project start date
    project_finish:         datetime              # Project completion date
    project_duration:       float                 # Total duration in days

    # Critical path information
    critical_path_tasks:    List[str]             # Task IDs on critical path
    critical_paths:         List[List[str]]       # All critical paths (if multiple)
    num_critical_tasks:     int                   # Count of critical tasks

    # All task schedules
    task_schedules:         Dict[str, TaskSchedule]

    # Helper data
    topo_order:             List[str]             # Topological ordering
    rank_hints:             Dict[str, int]        # For visualization
    num_total_tasks:        int                   # Total tasks in project
```

### **TaskSchedule (Per-Task Information)**

```python
@dataclass
class TaskSchedule:
    task_id:        str
    duration:       float               # Days
    early_start:    datetime
    early_finish:   datetime
    late_start:     datetime
    late_finish:    datetime
    total_float:    float               # Days
    free_float:     float               # Days
    is_critical:    bool
```

### **JSON Serialization**

The CpmResult can be serialized to JSON for API responses:

```json
{
  "project_start": "2024-01-01T00:00:00",
  "project_finish": "2024-01-08T00:00:00",
  "project_duration": 8.0,
  "critical_path_tasks": ["A", "B", "C"],
  "num_critical_tasks": 3,
  "num_total_tasks": 5,
  "critical_paths": [["A", "B", "C"]],
  "topo_order": ["A", "B", "D", "C", "E"],
  "rank_hints": {
    "A": 0,
    "B": 2,
    "D": 2,
    "C": 4,
    "E": 5
  },
  "task_schedules": {
    "A": {
      "task_id": "A",
      "duration": 2.0,
      "early_start": "2024-01-01T00:00:00",
      "early_finish": "2024-01-03T00:00:00",
      "late_start": "2024-01-01T00:00:00",
      "late_finish": "2024-01-03T00:00:00",
      "total_float": 0.0,
      "free_float": 0.0,
      "is_critical": true
    },
    ...
  }
}
```

### **Frontend Task Enrichment (CPMMetadata)**

```tsx
interface CPMMetadata {
  earlyStart:    number      // Days since project start
  earlyFinish:   number      // Days since project start
  lateStart:     number      // Days since project start
  lateFinish:    number      // Days since project start
  totalFloat:    number      // Days of slack
  freeFloat:     number      // Days of slack (per-successor)
  isCritical:    boolean     // On critical path
}

// Frontend converts datetime offsets to day numbers for rendering
```

---

## **Implementation Details**

### **Backend Implementation (Python)**

**Location**: `backend/app/services/`

**Files**:

- `cpm_service.py`: Main orchestration and result objects
- `graph_structures.py`: ProjectGraph, TaskNode, DependencyEdge data structures
- `graph_algorithms.py`: Core algorithms (topological sort, forward/backward pass, float calc)

**Key Classes**:

```python
class CpmService:
    @staticmethod
    def compute_cpm(graph, project_start, project_finish=None) -> CpmResult

    @staticmethod
    def get_critical_path_duration(result: CpmResult) -> float

    @staticmethod
    def get_slack_analysis(result: CpmResult) -> dict

    @staticmethod
    def identify_slack_tasks(result: CpmResult, threshold=1.0) -> List[str]
```

**Entry Points**:

1. `/api/projects/<id>/schedule/compute` (POST): Trigger CPM computation
2. `/api/projects/<id>/schedule/latest` (GET): Retrieve latest computation result
3. `/api/projects/<id>/schedule/validate` (POST): Validate graph without full computation

### **Frontend Implementation (TypeScript)**

**Location**: `frontend/src/utils/cpm.ts`

**Functions**:

```tsx
export function solveCPM(tasks: Task[]): Task[]
    // Lightweight CPM solver for UI-side calculations
    // Returns tasks with populated CPMMetadata

export function validateTasks(tasks: Task[]): Record<string, TaskValidationError[]>
    // Validation without full computation (cycle detection, date ranges, etc.)
```

**Implementation Notes**:

- Implemented in pure TypeScript (no external dependencies)
- Client-side computation for real-time feedback
- Defensive against missing `dependencyIds` and `estimatedDays` fields
- Returns copies; does not mutate input

---

## **Examples**

### **Example 1: Simple Linear Chain**

**Input**:

```json
{
  "projectStart": "2024-01-01",
  "tasks": [
    {"id": "A", "duration": 2},
    {"id": "B", "duration": 3},
    {"id": "C", "duration": 1}
  ],
  "dependencies": [
    {"predecessor": "A", "successor": "B"},
    {"predecessor": "B", "successor": "C"}
  ]
}
```

**Computation**:

Step 1: Validation ✓

- No cycles, durations positive

Step 2: Topological Sort

```
Order: [A, B, C]
In-degrees: A=0, B=1, C=1
```

Step 3: Forward Pass (start = 2024-01-01)

```
A: ES = 2024-01-01, EF = 2024-01-03 (2 days)
B: ES = 2024-01-03, EF = 2024-01-06 (3 days)
C: ES = 2024-01-06, EF = 2024-01-07 (1 day)
Project Finish = 2024-01-07
```

Step 4: Backward Pass (finish = 2024-01-07)

```
C: LF = 2024-01-07, LS = 2024-01-06
B: LF = 2024-01-06, LS = 2024-01-03
A: LF = 2024-01-03, LS = 2024-01-01
```

Step 5: Float Calculation

```
A: TF = LS - ES = 0, is_critical = true
B: TF = LS - ES = 0, is_critical = true
C: TF = LS - ES = 0, is_critical = true
```

Step 6: Critical Path

```
Critical Path: A → B → C
Project Duration: 6 days (2+3+1)
```

**Output**:

```json
{
  "project_start": "2024-01-01",
  "project_finish": "2024-01-07",
  "project_duration": 6.0,
  "critical_path_tasks": ["A", "B", "C"],
  "task_schedules": {
    "A": {
      "early_start": "2024-01-01",
      "early_finish": "2024-01-03",
      "late_start": "2024-01-01",
      "late_finish": "2024-01-03",
      "total_float": 0.0,
      "is_critical": true
    },
    ...
  }
}
```

### **Example 2: Parallel Paths with Float**

**Input**:

```
    ┌─ B(3d) ─┐
A(2d)        ┤
    └─ D(1d) ─┤ E(2d)
             (all tasks start with no lag)
```

**Forward Pass**:

```
A: ES=01-01, EF=01-03
B: ES=01-03, EF=01-06
D: ES=01-03, EF=01-04
E: ES=max(01-06, 01-04)=01-06, EF=01-08
Project Finish = 01-08
```

**Backward Pass**:

```
E: LF=01-08, LS=01-06
B: LF=min(01-06)=01-06, LS=01-03
D: LF=min(01-06)=01-06, LS=01-05
A: LF=min(01-03, 01-03)=01-03, LS=01-01
```

**Float Calculation**:

```
A: TF = 01-01 - 01-01 = 0, critical = true
B: TF = 01-03 - 01-03 = 0, critical = true
D: TF = 01-05 - 01-03 = 2 days, critical = false   ← Has slack!
E: TF = 01-06 - 01-06 = 0, critical = true

Critical Path: A → B → E
Float Path(s): A → D → (available 2-day buffer) → E
```

---

## **Error Handling**

### **Validation Errors**

| Error | Cause | Resolution |
| --- | --- | --- |
| `"Project has no tasks"` | Empty task list | Add at least one task |
| `"Task X has negative duration"` | duration < 0 | Task duration must be ≥ 0 |
| `"Cycle detected: A→B→C→A"` | Circular dependency | Remove dependency causing cycle |
| `"Successor Y not found"` | Invalid dependency ID | Verify all task IDs exist |
| `"Graph must be topologically sorted"` | Forward pass without sort | Run topological sort first |
| `"Forward pass must be run before backward pass"` | Missing ES/EF values | Run forward pass first |

### **Computation Errors**

```python
class CpmComputationError(Exception):
    """
    Raised when CPM computation fails at any step.

    Common causes:
    - Graph validation failure
    - Cycle detection
    - Missing or invalid schedule data
    - Topological sort failure
    """
    pass
```

### **Frontend Errors**

The TypeScript `solveCPM()` function is defensive:

```tsx
// Normalizes missing fields
if (!Array.isArray(t.dependencyIds)) t.dependencyIds = []
if (typeof t.estimatedDays !== 'number') t.estimatedDays = 0

// Guards against undefined when iterating
(t.dependencyIds || []).forEach(depId => { ... })

// Returns base copies if cycle detected
if (topoOrder.length !== copies.length) {
    return copies  // Unchanged
}
```

---

## **Performance Characteristics**

### **Time Complexity**

| Operation | Complexity | Notes |
| --- | --- | --- |
| Validation | O(V + E) | Checks cycles via topological sort |
| Topological Sort | O(V + E) | Kahn's algorithm |
| Forward Pass | O(V + E) | Single traversal of DAG |
| Backward Pass | O(V + E) | Single reverse traversal |
| Float Calculation | O(V + E) | Successor min/max operations |
| Critical Path Extract | O(paths × V) | Exponential in worst case, capped by max_paths |
| **Total** | **O(V + E + paths)** | Polynomial for acyclic graphs with bounded paths |

### **Space Complexity**

| Component | Complexity |
| --- | --- |
| Graph storage | O(V + E) |
| Intermediate data | O(V) |
| Results | O(V + E) |
| **Total** | **O(V + E)** |

### **Practical Performance**

For a typical project:

- 100 tasks, 150 dependencies: ~1ms (backend Python)
- 50 tasks, 75 dependencies: ~10ms (frontend TypeScript)
- 1000 tasks, 1500 dependencies: ~100ms (backend), ~500ms (frontend)

**Optimization Tips**:

1. Cache topological order if recalculating
2. Limit critical path extraction with `max_paths` parameter
3. Use sampling for very large projects (>5000 tasks)

---

## **References and Further Reading**

### **CPM Theory**

- *Project Management Body of Knowledge (PMBOK)* - Critical Path Method chapter
- Kelley, J. E., & Walker, M. R. (1959). "Critical-Path Planning and Scheduling"

### **Implementation Notes**

- Kahn's algorithm (topological sort): O(V+E) BFS-based approach
- DAG algorithms: Effective for project scheduling with no cycle constraints
- Floating-point precision: Tolerance of 1e-9 days for criticality checks

### **Related Capabilities**

- CPM + Resource Leveling: Further optimize resource utilization
- CPM + Risk Analysis: Monte Carlo simulation on task durations
- CPM + What-If Analysis: Recalculate with different scenarios

## Engine Validation Tests

# A. Input Validation Tests

## A1. Empty Project

Input:

```
No tasks
```

Expected:

```
Validation Error
```

---

## A2. Single Task

```
A(5)
```

Expected:

```
Project Duration = 5
Critical Path = A
```

---

## A3. Missing Duration

```
A(?)
```

Expected:

```
Validation Error
```

---

## A4. Negative Duration

```
A(-5)
```

Expected:

```
Validation Error
```

---

## A5. Zero Duration Task

```
A(0)
```

Expected:

```
Valid
```

Milestones often have zero duration.

---

## A6. Duplicate Task IDs

```
A
A
```

Expected:

```
Validation Error
```

---

## A7. Dependency References Missing Task

```
A → B
```

where B does not exist.

Expected:

```
Validation Error
```

---

# B. Cycle Detection Tests

## B1. Simple Cycle

```
A → B
B → A
```

Expected:

```
Cycle Detected
```

---

## B2. Three Node Cycle

```
A → B
B → C
C → A
```

Expected:

```
Cycle Detected
```

---

## B3. Self Loop

```
A → A
```

Expected:

```
Cycle Detected
```

---

## B4. Large Cycle Hidden in Graph

```
A → B → C → D → E
      ↑       ↓
      └───────┘
```

Expected:

```
Cycle Detected
```

---

# C. Topological Sort Tests

## C1. Linear Graph

```
A → B → C
```

Expected:

```
Valid Topological Order
```

---

## C2. Branching Graph

```
A → B
A → C
```

Expected:

```
A before B
A before C
```

---

## C3. Diamond Graph

```
      B
     /
A
     \
      C

B,C → D
```

Expected:

```
A before B,C
B,C before D
```

---

# D. Forward Pass Tests

## D1. Single Chain

```
A(5) → B(3)
```

Expected:

```
A ES=0 EF=5
B ES=5 EF=8
```

---

## D2. Multiple Predecessors

```
A(5)
B(10)

A,B → C(3)
```

Expected:

```
C ES = 10
```

(max predecessor EF)

---

## D3. Wide DAG

```
A
├─► B
├─► C
├─► D
└─► E
```

Verify all ES values.

---

# E. Backward Pass Tests

## E1. Linear Chain

```
A → B → C
```

Verify:

```
LS
LF
```

for every task.

---

## E2. Multiple Successors

```
A → B
A → C
```

Expected:

```
A LF = min(B LS, C LS)
```

---

# F. Float Calculation Tests

## F1. Critical Tasks

Graph:

```
A → B → C
```

Expected:

```
Float = 0
```

for all tasks.

---

## F2. Non-Critical Task

```
A → B → D
A → C → D
```

with:

```
B = 2
C = 5
```

Expected:

```
B Float > 0
```

---

## F3. Multiple Floats

Verify float values manually.

---

# G. Critical Path Tests

## G1. Single Critical Path

```
A → B → C
```

Expected:

```
A-B-C
```

---

## G2. Parallel Paths

```
A → B

C → D
```

Different durations.

Expected:

```
Longest path selected
```

---

## G3. Multiple Critical Paths

```
A(5) → B(5)

C(5) → D(5)
```

Expected:

```
Two Critical Paths
```

Many engines fail here.

---

## G4. Critical Path Through Merge

```
A → B
A → C

B,C → D
```

Expected:

```
Correct longest route
```

---

# H. Project Duration Tests

## H1. Single Task

Duration equals task duration.

---

## H2. Chain

Duration equals sum.

---

## H3. Parallel Paths

Duration equals longest path.

---

## H4. Multiple End Nodes

```
A → B

C → D
```

Expected:

```
Project Duration = max terminal EF
```

---

# I. Disconnected Graph Tests

## I1. Two Independent Networks

```
A → B

C → D
```

Expected:

```
Valid
```

Engine should still compute.

---

## I2. Isolated Task

```
A

B → C
```

Expected:

```
Valid
```

---

# J. Dependency Type Tests (If Supported)

## J1. Finish-to-Start

Standard CPM.

---

## J2. Start-to-Start

Verify logic.

---

## J3. Finish-to-Finish

Verify logic.

---

## J4. Start-to-Finish

Verify logic.

---

# K. Lag/Lead Tests (If Supported)

## K1. Positive Lag

```
A → B (+2 days)
```

Verify ES adjustment.

---

## K2. Negative Lag (Lead)

```
A → B (-1 day)
```

Verify overlap.

---

# L. Date-Based Scheduling Tests (If Supported)

## L1. Start Date

Project begins on given date.

---

## N1. Random DAG Generator

Generate:

```
100 DAGs
```

Check invariants.

---

## N2. Large Dense DAG

```
1000 nodes
5000 edges
```

Verify correctness.

---

## N3. Very Deep DAG

```
10000-node chain
```

Check for stack/overflow issues.

---

# O. Invariant Tests (Run on Every Graph)

For every task verify:

```
EF = ES + Duration

LS = LF - Duration

Float = LS - ES

Float = LF - EF

Critical ⇒ Float = 0

ES ≥ 0

LS ≥ 0
```

For every dependency:

```
Successor ES ≥ Predecessor EF
```

(for FS dependencies)

---

# Minimum Test Suite Before Integration

Before connecting the engine to Next.js, PostgreSQL, Graphviz, or WebSockets, I would require:

```
7 Validation Tests
4 Cycle Tests
3 Topological Sort Tests
3 Forward Pass Tests
2 Backward Pass Tests
3 Float Tests
4 Critical Path Tests
4 Duration Tests
2 Disconnected Graph Tests
10 Invariant Checks
```

That's roughly **30–40 deterministic tests**, which is enough to give very high confidence that the CPM engine is mathematically correct.

## Bechmarks Tests

# Benchmark Metrics To Collect

For every benchmark record:

```
Number of Tasks (V)
Number of Dependencies (E)

Graph Build Time
Validation Time
Topological Sort Time
Forward Pass Time
Backward Pass Time
Critical Path Extraction Time

Total Runtime

Peak Memory Usage
```

---

# Benchmark Group A: Scalability Tests

These determine how runtime grows with graph size.

## A1. Small Graph

```
50 Tasks
100 Dependencies
```

Purpose:

```
Baseline measurement
```

---

## A2. Medium Graph

```
500 Tasks
1000 Dependencies
```

Purpose:

```
Typical real-world project
```

---

## A3. Large Graph

```
1000 Tasks
5000 Dependencies
```

Purpose:

```
Heavy engineering project
```

---

## A4. Very Large Graph

```
5000 Tasks
25000 Dependencies
```

Purpose:

```
Stress scalability
```

---

## A5. Extreme Graph

```
10000 Tasks
50000 Dependencies
```

Purpose:

```
Upper practical limit
```

---

# Benchmark Group B: Graph Shape Tests

Same node count, different structures.

These often reveal hidden bottlenecks.

---

## B1. Long Chain

```
A → B → C → ... → N
```

Example:

```
10000 Tasks
9999 Edges
```

Tests:

```
Maximum graph depth
```

---

## B2. Wide Graph

```
A
├─► B
├─► C
├─► D
├─► E
...
```

Tests:

```
High branching factor
```

---

## B3. Diamond Cascade

```
Repeated split-merge structures
```

Tests:

```
Complex dependency propagation
```

---

## B4. Multi-Level Tree

```
Root
 ├─► Level 1
      ├─► Level 2
```

Tests:

```
Balanced hierarchy
```

---

## B5. Dense DAG

Every node connects to many successors.

Example:

```
1000 Tasks
50000+ Edges
```

Tests:

```
Worst-case edge processing
```

---

# Benchmark Group C: Validation Performance

---

## C1. Large Valid DAG

```
5000 Tasks
25000 Edges
```

Measure:

```
Cycle detection speed
```

---

## C2. Large Graph With Hidden Cycle

Cycle near the end.

Example:

```
4998 → 4999 → 5000 → 4998
```

Measure:

```
Cycle detection cost
```

---

## C3. Duplicate Dependency Explosion

```
Many repeated edges
```

Measure:

```
Deduplication performance
```

---

# Benchmark Group D: Critical Path Complexity

---

## D1. Single Critical Path

```
One dominant route
```

Benchmark:

```
Critical path extraction
```

---

## D2. Multiple Critical Paths

```
Hundreds of equally long paths
```

Measure:

```
Critical path identification performance
```

---

## D3. Highly Parallel Graph

```
Many competing paths
```

Tests:

```
Float calculations
```

---

# Benchmark Group E: Memory Benchmarks

---

## E1. 100 Nodes

Measure:

```
Memory footprint
```

---

## E2. 1000 Nodes

Measure:

```
Memory growth
```

---

## E3. 5000 Nodes

Measure:

```
Memory scaling
```

---

## E4. 10000 Nodes

Measure:

```
Peak memory
```

---

# Benchmark Group F: Realistic Project Benchmarks

Create datasets that resemble actual projects.

---

## F1. Construction Project

```
200 Tasks
500 Dependencies
```

---

## F2. Software Development Project

```
500 Tasks
1200 Dependencies
```

---

## F3. BAJA Vehicle Project

```
Subsystem Design
Manufacturing
Assembly
Testing

300–600 Tasks
```

This is actually valuable because it reflects your use case.

---

# Benchmark Group G: Throughput Tests

Measure repeated computations.

---

## G1. Single Run

```
1 calculation
```

---

## G2. 100 Consecutive Runs

```
Same graph
```

Measure:

```
Average runtime
```

---

## G3. 1000 Consecutive Runs

Tests:

```
Memory leaks
Resource cleanup
```

---

# Benchmark Group H: Incremental Update Tests

Useful if you later support live editing.

---

## H1. Add Task

```
5000-node graph
+1 task
```

Measure:

```
Recompute time
```

---

## H2. Remove Task

Measure:

```
Recompute time
```

---

## H3. Change Duration

```
Critical task duration change
```

Measure:

```
Recompute speed
```

---

# Benchmark Group I: Layout Integration Benchmarks

If using Graphviz.

---

## I1. CPM Only

```
Input → CPM Output
```