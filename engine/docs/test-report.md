# Test & Benchmark Summary

This file summarizes the representative benchmark findings used to validate the API freeze. See `/reports/benchmark_*/REPORT.md` for full run artifacts.

Key points
- Representative runs: small (50), medium (1k), and large (5k) node scenarios.
- Validation checks: schema conformance, cycle detection, correct durations and float calculations.
- Recommendation: CI should run small+medium scenarios on PRs, while large runs remain scheduled nightly.
