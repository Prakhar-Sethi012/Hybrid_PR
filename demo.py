"""
Demo Script for Stage 1, 2, and 3 of the Discrete-Event OS Simulator.
Demonstrates:
- Workload Generator patterns & optional write flags (Stage 1 & 3)
- Process & PageTable structures (Stage 1)
- MemoryManager frame tracking (Stage 1)
- SimulationClock, PerformanceMetrics, and Access Handler (Stage 2)
- Adaptive Hybrid Page Replacement: LRFU recursive score decay, Cost C(p) victim selection,
  and dynamic lambda parameter tuning (Stage 3).
"""

from src.workload import (
    WorkloadGenerator,
    generate_sequential,
    generate_loop,
    generate_random,
    generate_zipf_hot_cold,
)
from src.process import Process
from src.memory import MemoryManager
from src.engine import (
    SimulationClock,
    PerformanceMetrics,
    SimulationEngine,
    AdaptiveParameterController,
    compute_decayed_score,
)


def print_section(title: str):
    print("\n" + "=" * 70)
    print(f" {title}")
    print("=" * 70)


def demo_workload_generator():
    print_section("1. WORKLOAD GENERATOR & WRITE PROBABILITY (STAGE 1 & 3)")
    gen = WorkloadGenerator(number_of_references=10, seed=42, write_probability=0.3)

    # 1. Sequential with writes
    seq_writes = gen.generate_sequential(start=0, end=4, include_writes=True)
    print(f"[Sequential with Writes (0 to 4, 30% write prob)]\n -> {seq_writes}\n")

    # 2. Looping with writes
    loop_writes = gen.generate_loop(sequence=[1, 2, 3], iterations=3, include_writes=True)
    print(f"[Looping with Writes ([1, 2, 3] x 3)]\n -> {loop_writes}\n")

    # 3. Zipfian Hot/Cold with writes
    zipf_writes = gen.generate_zipf_hot_cold(page_range=20, num_references=12, include_writes=True)
    print(f"[Zipf Hot/Cold with Writes (20 pages, 12 refs)]\n -> {zipf_writes}\n")


def demo_hybrid_replacement_and_cost():
    print_section("2. ADAPTIVE HYBRID VICTIM SELECTION & DIRTY PENALTY (STAGE 3)")
    # 2 physical frames
    mem = MemoryManager(frame_count=2)
    proc = Process(process_id=1, name="Worker-A")
    engine = SimulationEngine(
        memory_manager=mem,
        processes=[proc],
        lambda_value=0.5,
        delta=2.0,  # Dirty penalty
    )

    print("Setup: 2 physical frames, lambda=0.5, delta=2.0 (dirty penalty)\n")

    # Access 1: page 10 (written to -> DIRTY)
    res1 = engine.execute_access(proc, page_number=10, is_write=True)
    print(f"1. Access Page 10 (WRITE) -> FAULT. Allocated Frame 0. (Dirty=True, S(p)=1.0, C(p)=1.0+2.0=3.0)")

    # Access 2: page 20 (read only -> CLEAN)
    res2 = engine.execute_access(proc, page_number=20, is_write=False)
    print(f"2. Access Page 20 (READ)  -> FAULT. Allocated Frame 1. (Dirty=False, S(p)=1.0, C(p)=1.0+0.0=1.0)")

    print(f"\nMemory is now FULL (Frames 0 and 1 occupied).")
    print(f"Frame 0 (Page 10): DIRTY (Cost = S(10) + delta = ~3.0)")
    print(f"Frame 1 (Page 20): CLEAN (Cost = S(20) + 0     = ~1.0)")

    # Access 3: page 30 (read) -> Memory full! Triggers C(p) victim selection
    print(f"\n3. Access Page 30 (READ)  -> FAULT! Memory full -> Eviction:")
    res3 = engine.execute_access(proc, page_number=30, is_write=False)
    print(f"   -> Victim Selected: Frame {res3.frame_id} (Evicted Page {res3.evicted_page})")
    print(f"   -> Was dirty write-back? {res3.was_dirty_write_back}")
    print(f"   * Key Insight: The algorithm chose CLEAN Page 20 over DIRTY Page 10, avoiding disk I/O!")


def demo_lrfu_score_tracking():
    print_section("3. RECURSIVE LRFU SCORE TRACKING S(p) (STAGE 3)")
    mem = MemoryManager(frame_count=4)
    proc = Process(process_id=1, name="Worker-B")
    engine = SimulationEngine(memory_manager=mem, processes=[proc], lambda_value=0.5)

    print("Reference sequence demonstrating score decay and accumulation on HIT:")
    # Access 1: page 5 at clock=1 -> Fault, initial S(p)=1.0
    r1 = engine.execute_access(proc, page_number=5, is_write=False)
    print(f"Clock={r1.timestamp}: Page 5 (FAULT) -> Initial Score S(5) = {r1.hybrid_score:.4f}")

    # Access other pages to advance clock
    engine.execute_access(proc, page_number=6, is_write=False)
    engine.execute_access(proc, page_number=7, is_write=False)

    # Access 4: page 5 at clock=4 -> HIT!
    # Delta t = 4 - 1 = 3 ticks.
    # S(5)_new = 1 + S_old * (0.5)^(0.5 * 3) = 1 + 1.0 * (0.5)^1.5 = 1 + 0.3536 = 1.3536
    r4 = engine.execute_access(proc, page_number=5, is_write=False)
    print(f"Clock={r4.timestamp}: Page 5 (HIT)   -> Updated Score S(5) = {r4.hybrid_score:.4f} (Recency decayed + 1)")


def demo_dynamic_lambda_tuning():
    print_section("4. ADAPTIVE PARAMETER CONTROLLER (LAMBDA TUNING) (STAGE 3)")
    # Configure small window_size=10 to observe tuning triggers
    mem = MemoryManager(frame_count=2)
    proc = Process(process_id=1, name="Worker-C")
    engine = SimulationEngine(
        memory_manager=mem,
        processes=[proc],
        window_size=10,
        lambda_value=0.50,
    )

    print(f"Initial lambda: {engine.lambda_value:.2f}, window_size N = {engine.window_size}")

    # Window 1: Heavy thrashing (10 references, all distinct pages -> 10 faults, r = 1.0 > 0.10)
    print("\nGenerating Window 1: High Fault Rate (10 faults in 10 accesses)...")
    for p in range(10):
        engine.execute_access(proc, page_number=100 + p)

    print(f" -> Window 1 complete! New lambda: {engine.lambda_value:.2f} (Increased towards recency/LRU)")

    # Window 2: High locality / repetitive hits (10 references to resident page -> 0 faults, r = 0.0 < 0.02)
    print("\nGenerating Window 2: Low Fault Rate (0 faults in 10 accesses)...")
    resident_page = 100 + 9  # Currently loaded
    for _ in range(10):
        engine.execute_access(proc, page_number=resident_page)

    print(f" -> Window 2 complete! New lambda: {engine.lambda_value:.2f} (Decreased towards frequency/LFU)")

    print("\nTuning History Log:")
    for idx, entry in enumerate(engine.controller.tuning_history, start=1):
        print(f"  Window {idx}: Faults={entry['window_faults']}/{entry['window_size']} "
              f"(r={entry['fault_rate']:.2f}) -> lambda: {entry['old_lambda']:.2f} => {entry['new_lambda']:.2f}")


if __name__ == "__main__":
    demo_workload_generator()
    demo_hybrid_replacement_and_cost()
    demo_lrfu_score_tracking()
    demo_dynamic_lambda_tuning()
    print_section("STAGE 1, 2 & 3 DEMONSTRATION COMPLETE")
