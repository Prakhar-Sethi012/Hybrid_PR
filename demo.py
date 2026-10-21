"""
Demo Script for Stage 1 & Stage 2 of the Discrete-Event OS Simulator.
Demonstrates:
- Workload Generator patterns (Stage 1)
- Process & PageTable structures (Stage 1)
- MemoryManager frame tracking (Stage 1)
- SimulationClock, PerformanceMetrics, and SimulationEngine memory access handler (Stage 2)
"""

from src.workload import (
    WorkloadGenerator,
    generate_sequential,
    generate_loop,
    generate_random,
    generate_zipf_hot_cold,
)
from src.process import Process, PageTableEntry
from src.memory import MemoryManager
from src.engine import SimulationClock, PerformanceMetrics, SimulationEngine


def print_section(title: str):
    print("\n" + "=" * 65)
    print(f" {title}")
    print("=" * 65)


def demo_workload_generator():
    print_section("1. WORKLOAD GENERATOR PATTERNS (STAGE 1)")
    gen = WorkloadGenerator(number_of_references=12, seed=42)

    # 1. Sequential Scan (single pass)
    seq = generate_sequential(start=0, end=5)
    print(f"[Sequential Single Pass (0 to 5)]\n -> {seq}\n")

    # 2. Sequential with cycle to reach number_of_references
    seq_cycled = gen.generate_sequential(start=0, end=3)
    print(f"[Sequential Cycled to 12 refs (0 to 3)]\n -> {seq_cycled}\n")

    # 3. Looping Reference Pattern
    loop = gen.generate_loop(sequence=[1, 2, 3], iterations=4)
    print(f"[Looping ([1, 2, 3] x 4)]\n -> {loop}\n")

    # 4. Uniform Random Pattern
    rand = gen.generate_random(page_range=10, num_references=12)
    print(f"[Random (10 pages, 12 references)]\n -> {rand}\n")

    # 5. Zipfian Hot/Cold Locality Pattern (80% requests target 20% pages)
    zipf = gen.generate_zipf_hot_cold(page_range=20, num_references=20)
    hot_pages = set(range(4))  # 20% of 20 = 4 (pages 0..3)
    hot_hits = sum(1 for p in zipf if p in hot_pages)
    print(f"[Zipf Hot/Cold (20 pages, 20 references)]\n -> {zipf}")
    print(f" -> Hot pages {sorted(list(hot_pages))} hit ratio: {hot_hits}/20 ({hot_hits/20*100:.1f}%)\n")


def demo_process_and_pagetable():
    print_section("2. PROCESS & PAGE TABLE DATA STRUCTURES (STAGE 1)")
    proc = Process(process_id=1, name="SimulationWorker-1")
    print(f"Created: {proc}")

    # Map page 0 to physical frame 2
    proc.map_page(page_number=0, frame_number=2, valid=True, dirty=False)
    # Map page 5 to physical frame 3 and mark dirty
    proc.map_page(page_number=5, frame_number=3, valid=True, dirty=True)

    print("\nPage Table Entries:")
    for page_num, entry in proc.page_table.items():
        print(f"  Virtual Page {page_num:2d} -> Frame: {entry.frame_number}, Valid: {entry['valid']}, Dirty: {entry['dirty']}")

    print(f"\nChecking status:")
    print(f"  Is page 0 valid? {proc.is_page_valid(0)}")
    print(f"  Is page 5 dirty? {proc.is_page_dirty(5)}")
    print(f"  Is page 9 valid? {proc.is_page_valid(9)} (unmapped)")


def demo_memory_manager():
    print_section("3. MEMORY MANAGER FRAME TRACKING (STAGE 1)")
    frame_count = 4
    mem = MemoryManager(frame_count=frame_count)
    print(f"Initialized MemoryManager with {frame_count} physical frames.")
    print(f"Initial State: Free={mem.get_free_frames()}, Occupied={mem.get_occupied_frames()}, Full={mem.is_full()}\n")

    # Allocate 3 frames
    pids_and_pages = [(1, 10), (1, 20), (2, 30)]
    for pid, pnum in pids_and_pages:
        fid = mem.allocate_frame(process_id=pid, page_number=pnum)
        print(f"Allocated Frame {fid} to Process {pid}, Page {pnum}")

    print(f"\nCurrent State: Free={mem.get_free_frames()}, Occupied={mem.get_occupied_frames()}, Full={mem.is_full()}")

    # Allocate 4th frame (fills memory)
    fid = mem.allocate_frame(process_id=2, page_number=40)
    print(f"Allocated Frame {fid} to Process 2, Page 40")
    print(f"State: Free={mem.get_free_frames()}, Occupied={mem.get_occupied_frames()}, Full={mem.is_full()}")

    # Free frame 1
    mem.free_frame(1)
    print(f"Freed Frame 1 -> Free={mem.get_free_frames()}, Occupied={mem.get_occupied_frames()}, Full={mem.is_full()}")


def demo_simulation_engine():
    print_section("4. SIMULATION ENGINE & MEMORY ACCESS PIPELINE (STAGE 2)")
    # Setup: 3 physical frames, 2 processes
    mem = MemoryManager(frame_count=3)
    p1 = Process(process_id=1, name="App-Client")
    p2 = Process(process_id=2, name="DB-Backend")
    engine = SimulationEngine(memory_manager=mem, processes=[p1, p2])

    print("Engine initialized with 3 physical frames and 2 processes.\n")

    # Sequence of accesses: (PID, Page, is_write)
    access_plan = [
        (1, 10, False),  # Access 1: P1 reads page 10  -> FAULT (allocates Frame 0)
        (1, 10, True),   # Access 2: P1 writes page 10 -> HIT (sets dirty=True on Frame 0)
        (2, 20, False),  # Access 3: P2 reads page 20  -> FAULT (allocates Frame 1)
        (1, 30, False),  # Access 4: P1 reads page 30  -> FAULT (allocates Frame 2; memory now FULL)
        (2, 20, True),   # Access 5: P2 writes page 20 -> HIT (sets dirty=True on Frame 1)
        (1, 40, False),  # Access 6: P1 reads page 40  -> FAULT! Memory full -> Evicts Frame 0 (P1 Page 10, DIRTY!) -> Dirty Write-Back!
        (2, 50, False),  # Access 7: P2 reads page 50  -> FAULT! Memory full -> Evicts Frame 1 (P2 Page 20, DIRTY!) -> Dirty Write-Back!
        (1, 30, False),  # Access 8: P1 reads page 30  -> HIT on Frame 2!
    ]

    print(f"{'Access #':<9} | {'PID':<4} | {'Page':<5} | {'Op':<5} | {'Outcome':<7} | {'Frame':<6} | {'Evicted':<12} | {'Write-Back'}")
    print("-" * 75)

    for pid, page, is_write in access_plan:
        res = engine.execute_access(process=pid, page_number=page, is_write=is_write)
        outcome = "HIT" if res.is_hit else "FAULT"
        op = "WRITE" if is_write else "READ"
        evict_str = f"Page {res.evicted_page}" if res.evicted_page is not None else "-"
        wb_str = "YES (DIRTY)" if res.was_dirty_write_back else "No"
        print(f"Clock={res.timestamp:<3} | P{pid:<3} | {page:<5} | {op:<5} | {outcome:<7} | F{res.frame_id:<5} | {evict_str:<12} | {wb_str}")

    print("\n--- Final Metrics Summary ---")
    m = engine.metrics
    print(f"Total Accesses     : {m.total_accesses}")
    print(f"Page Hits          : {m.page_hits}")
    print(f"Page Faults        : {m.page_faults}")
    print(f"Dirty Write-Backs  : {m.dirty_write_backs}")
    print(f"Hit Rate           : {m.hit_ratio:.2%}")
    print(f"Fault Rate         : {m.fault_ratio:.2%}")
    print(f"Simulation Clock   : {engine.clock.current_time()}")


if __name__ == "__main__":
    demo_workload_generator()
    demo_process_and_pagetable()
    demo_memory_manager()
    demo_simulation_engine()
    print_section("STAGE 1 & 2 DEMONSTRATION COMPLETE")
