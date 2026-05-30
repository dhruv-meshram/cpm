# Algorithms and Complexity Notes

Topological Sort
- Kahn's algorithm, O(V + E) time and O(V) memory.

Forward/Backward Passes
- Single-pass relaxations across topo order; worst-case O(V + E) per pass. Observed practical cost dominated these steps for large graphs.

Float Calculation
- Derived from forward/backward results; O(V + E).

Critical Path Extraction
- Typically O(V + E) to trace back along zero-float edges; multiple paths increase traversal work.

Optimization opportunities
- Incremental recomputation for small edits
- Parallelization across independent subgraphs
- Sparse/compact memory representations for dense graphs
