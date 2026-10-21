"""
Evaluation and Benchmarking Module for Page Replacement Simulator.
Compares standard baseline policies (FIFO, LRU, LFU) against AdaptiveHybrid
across Sequential, Looping, Random, and Zipf (Hot/Cold) memory access patterns.
"""

import argparse
from typing import Any, Dict, List, Optional, Sequence, Tuple

from .workload import WorkloadGenerator
from .process import Process
from .memory import MemoryManager
from .engine import (
    SimulationEngine,
    PageReplacementPolicy,
    PerformanceMetrics,
    RAM_ACCESS_TIME_NS,
    DISK_READ_TIME_NS,
    DISK_WRITE_TIME_NS,
)


# Standard benchmark test matrix definitions
BENCHMARK_WORKLOADS = [
    "Sequential",
    "Loop",
    "Random",
    "Zipf (Hot/Cold)",
]

BENCHMARK_ALGORITHMS = [
    PageReplacementPolicy.FIFO,
    PageReplacementPolicy.LRU,
    PageReplacementPolicy.LFU,
    PageReplacementPolicy.ADAPTIVE_HYBRID,
]


def generate_benchmark_workloads(
    seed: int = 42,
    num_references: int = 1000,
    page_count: int = 30,
    loop_sequence_length: int = 15,
    write_probability: float = 0.2,
) -> Dict[str, List[Tuple[int, bool]]]:
    """
    Generates identical, reproducible benchmark traces with a 20% write probability.

    Args:
        seed: Fixed pseudo-random seed to guarantee reproducible workloads.
        num_references: Length of each memory access trace (default 1000).
        page_count: Virtual address space size in pages (default 30).
        loop_sequence_length: Number of distinct pages in loop sequence (default 15).
        write_probability: Probability of a memory access being a write (default 0.2 = 20%).

    Returns:
        Dict mapping workload name to list of (page_number, is_write) tuples.
    """
    workloads: Dict[str, List[Tuple[int, bool]]] = {}

    # 1. Sequential Scan Workload: sweeps pages 0..page_count-1 cyclically
    gen_seq = WorkloadGenerator(
        number_of_references=num_references,
        seed=seed,
        write_probability=write_probability,
        include_writes=True,
    )
    workloads["Sequential"] = gen_seq.generate_sequential(
        start=0,
        end=page_count - 1,
        num_references=num_references,
        include_writes=True,
        write_probability=write_probability,
    )

    # 2. Loop Reference Workload: repeats a loop sequence of pages
    gen_loop = WorkloadGenerator(
        number_of_references=num_references,
        seed=seed,
        write_probability=write_probability,
        include_writes=True,
    )
    loop_seq = list(range(loop_sequence_length))
    workloads["Loop"] = gen_loop.generate_loop(
        sequence=loop_seq,
        num_references=num_references,
        include_writes=True,
        write_probability=write_probability,
    )

    # 3. Uniform Random Workload: accesses pages 0..page_count-1 uniformly
    gen_rand = WorkloadGenerator(
        number_of_references=num_references,
        seed=seed,
        write_probability=write_probability,
        include_writes=True,
    )
    workloads["Random"] = gen_rand.generate_random(
        page_range=page_count,
        num_references=num_references,
        include_writes=True,
        write_probability=write_probability,
    )

    # 4. Zipfian Hot/Cold Workload: 80% requests target 20% hot pages
    gen_zipf = WorkloadGenerator(
        number_of_references=num_references,
        seed=seed,
        write_probability=write_probability,
        include_writes=True,
    )
    workloads["Zipf (Hot/Cold)"] = gen_zipf.generate_zipf_hot_cold(
        page_range=page_count,
        hot_page_ratio=0.2,
        hot_request_ratio=0.8,
        num_references=num_references,
        include_writes=True,
        write_probability=write_probability,
    )

    return workloads


def format_benchmark_table(
    results: List[Dict[str, Any]],
    group_by_workload: bool = True,
) -> str:
    """
    Formats benchmark results into a clean, professional ASCII table.

    Required columns:
    Algorithm, Workload, Hit Ratio, Page Faults, Dirty Writes, Thrashing Suspensions, and EAT (ns).

    Args:
        results: List of result dictionaries from run_benchmark.
        group_by_workload: If True, adds separator lines between different workloads.

    Returns:
        Formatted ASCII table string.
    """
    headers = [
        ("Algorithm", 16, "<"),
        ("Workload", 17, "<"),
        ("Hit Ratio", 11, ">"),
        ("Page Faults", 13, ">"),
        ("Dirty Writes", 14, ">"),
        ("Thrashing Suspensions", 23, ">"),
        ("EAT (ns)", 19, ">"),
    ]

    # Helper for horizontal separator
    sep_line = "+" + "+".join("-" * (width + 2) for _, width, _ in headers) + "+"
    double_sep = "+" + "+".join("=" * (width + 2) for _, width, _ in headers) + "+"

    # Header line
    header_parts = []
    for title, width, align in headers:
        if align == "<":
            header_parts.append(f" {title:<{width}} ")
        else:
            header_parts.append(f" {title:>{width}} ")
    header_line = "|" + "|".join(header_parts) + "|"

    lines = [sep_line, header_line, double_sep]

    prev_workload = None
    for row in results:
        curr_workload = row.get("workload", "")
        if group_by_workload and prev_workload is not None and curr_workload != prev_workload:
            lines.append(sep_line)
        prev_workload = curr_workload

        # Format column values
        algo_str = str(row.get("algorithm", ""))
        workload_str = str(row.get("workload", ""))
        hit_ratio_str = f"{row.get('hit_ratio', 0.0) * 100:.2f}%"
        faults_str = f"{int(row.get('page_faults', 0)):,}"
        dirty_writes_str = f"{int(row.get('dirty_write_backs', 0)):,}"
        thrashing_str = f"{int(row.get('thrashing_suspensions', 0)):,}"
        eat_str = f"{float(row.get('eat', 0.0)):,.2f}"

        row_vals = [
            (algo_str, 16, "<"),
            (workload_str, 17, "<"),
            (hit_ratio_str, 11, ">"),
            (faults_str, 13, ">"),
            (dirty_writes_str, 14, ">"),
            (thrashing_str, 23, ">"),
            (eat_str, 19, ">"),
        ]

        row_parts = []
        for val, width, align in row_vals:
            if align == "<":
                row_parts.append(f" {val:<{width}} ")
            else:
                row_parts.append(f" {val:>{width}} ")
        lines.append("|" + "|".join(row_parts) + "|")

    lines.append(sep_line)
    return "\n".join(lines)


def run_benchmark(
    seed: int = 42,
    num_references: int = 1000,
    frame_count: int = 10,
    page_count: int = 30,
    loop_sequence_length: int = 15,
    write_probability: float = 0.2,
    window_size: int = 100,
    upper_fault_threshold: float = 0.20,
    suspension_duration: int = 2,
    ram_access_ns: float = RAM_ACCESS_TIME_NS,
    disk_read_ns: float = DISK_READ_TIME_NS,
    disk_write_ns: float = DISK_WRITE_TIME_NS,
    print_table: bool = True,
    workloads: Optional[Sequence[str]] = None,
    algorithms: Optional[Sequence[str]] = None,
) -> List[Dict[str, Any]]:
    """
    Executes the automated benchmark testing matrix comparing FIFO, LRU, LFU,
    and AdaptiveHybrid across Sequential, Loop, Random, and Zipf workloads.

    Constraint Enforced:
        The exact same pseudo-random seed is used for WorkloadGenerator
        so all algorithms are evaluated on 100% IDENTICAL memory traces.

    Args:
        seed: Pseudo-random seed for WorkloadGenerator (default 42).
        num_references: Number of memory references per trace (default 1000).
        frame_count: Number of physical frames in memory (default 10).
        page_count: Total virtual address space in pages (default 30).
        loop_sequence_length: Number of distinct pages in loop sequence (default 15).
        write_probability: Probability that reference is a write (default 0.2 = 20%).
        window_size: Tuning and thrashing evaluation window N (default 100).
        upper_fault_threshold: Fault rate triggering thrashing suspension (default 0.20).
        suspension_duration: Windows a process sits out upon thrashing (default 2).
        ram_access_ns: Mock RAM access latency (default 100 ns).
        disk_read_ns: Mock disk read / fault latency (default 10,000,000 ns = 10 ms).
        disk_write_ns: Mock disk write-back latency (default 10,000,000 ns = 10 ms).
        print_table: Whether to print the formatted ASCII table to stdout (default True).
        workloads: Optional custom list of workloads to evaluate.
        algorithms: Optional custom list of algorithms to evaluate.

    Returns:
        List of dictionaries with performance metrics for each (workload, algorithm) pair.
    """
    target_workloads = list(workloads) if workloads is not None else BENCHMARK_WORKLOADS
    target_algos = list(algorithms) if algorithms is not None else BENCHMARK_ALGORITHMS

    # 1. Generate workload traces ONCE using the exact same pseudo-random seed.
    # Because write_probability = 0.2 is pseudo-randomly sampled, pre-generating the
    # traces ensures EVERY algorithm receives the EXACT same references and write flags.
    trace_dict = generate_benchmark_workloads(
        seed=seed,
        num_references=num_references,
        page_count=page_count,
        loop_sequence_length=loop_sequence_length,
        write_probability=write_probability,
    )

    results: List[Dict[str, Any]] = []

    # 2. Execute each algorithm on each workload trace
    for w_name in target_workloads:
        if w_name not in trace_dict:
            raise KeyError(f"Unknown workload name '{w_name}'. Available: {list(trace_dict.keys())}")
        trace = trace_dict[w_name]

        for algo in target_algos:
            mem = MemoryManager(frame_count=frame_count)
            proc = Process(process_id=1, name=f"P-{algo}")
            engine = SimulationEngine(
                memory_manager=mem,
                processes=[proc],
                window_size=window_size,
                upper_fault_threshold=upper_fault_threshold,
                suspension_duration=suspension_duration,
                policy=algo,
            )

            # Execute trace through the simulation engine
            engine.execute_trace(proc, trace)

            # Compute EAT using the hardware latency parameters
            eat_ns = engine.metrics.calculate_eat(
                ram_access_ns=ram_access_ns,
                disk_read_ns=disk_read_ns,
                disk_write_ns=disk_write_ns,
            )

            row: Dict[str, Any] = {
                "algorithm": algo,
                "workload": w_name,
                "hit_ratio": engine.metrics.hit_ratio,
                "page_faults": engine.metrics.page_faults,
                "dirty_write_backs": engine.metrics.dirty_write_backs,
                "thrashing_suspensions": engine.metrics.thrashing_suspensions,
                "eat": eat_ns,
                "total_accesses": engine.metrics.total_accesses,
                "page_hits": engine.metrics.page_hits,
            }
            results.append(row)

    if print_table:
        print("\n" + "=" * 115)
        print(" OS MEMORY SIMULATOR: FINAL BENCHMARK EVALUATION (evaluate.py)")
        print(f" Configuration: Frames={frame_count}, References={num_references}, Seed={seed}, WriteProb={write_probability:.0%}")
        print(f" Mock Latencies: RAM={ram_access_ns:,.0f}ns, DiskRead={disk_read_ns:,.0f}ns, DiskWrite={disk_write_ns:,.0f}ns")
        print("=" * 115)
        print(format_benchmark_table(results))
        print("=" * 115 + "\n")

    return results


def main() -> None:
    """CLI entry point for evaluate.py."""
    parser = argparse.ArgumentParser(
        description="OS Page Replacement Simulator Benchmark Suite (Stage 5 Evaluation)."
    )
    parser.add_argument("--seed", type=int, default=42, help="Pseudo-random seed for workload generation (default 42)")
    parser.add_argument("--references", type=int, default=1000, help="Number of references per trace (default 1000)")
    parser.add_argument("--frames", type=int, default=10, help="Number of physical memory frames (default 10)")
    parser.add_argument("--pages", type=int, default=30, help="Number of virtual pages in address space (default 30)")
    parser.add_argument("--write-prob", type=float, default=0.2, help="Write probability (default 0.2 = 20%)")
    parser.add_argument("--window-size", type=int, default=100, help="Tuning/thrashing window size N (default 100)")
    args = parser.parse_args()

    run_benchmark(
        seed=args.seed,
        num_references=args.references,
        frame_count=args.frames,
        page_count=args.pages,
        write_probability=args.write_prob,
        window_size=args.window_size,
        print_table=True,
    )


if __name__ == "__main__":
    main()
