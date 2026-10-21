"""
Root entry point and forwarding module for the final evaluation module (evaluate.py).
Executes the automated benchmark suite comparing FIFO, LRU, LFU, and AdaptiveHybrid
across Sequential, Loop, Random, and Zipf workloads.

Usage:
    python evaluate.py
    python evaluate.py --frames 16 --references 1000 --seed 42
"""

from src.evaluate import (
    generate_benchmark_workloads,
    format_benchmark_table,
    run_benchmark,
    main,
    BENCHMARK_WORKLOADS,
    BENCHMARK_ALGORITHMS,
)

__all__ = [
    "generate_benchmark_workloads",
    "format_benchmark_table",
    "run_benchmark",
    "main",
    "BENCHMARK_WORKLOADS",
    "BENCHMARK_ALGORITHMS",
]

if __name__ == "__main__":
    main()
