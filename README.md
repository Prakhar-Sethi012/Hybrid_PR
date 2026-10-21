# Discrete-Event OS Simulator: Adaptive Hybrid Page Replacement

A modular discrete-event operating system memory simulator built in Python to evaluate and benchmark the **Adaptive Hybrid Page Replacement** algorithm.

---

## Architecture Overview

```
Hybrid_PR/
├── src/
│   ├── __init__.py         # Package root exports (Stages 1 & 2)
│   ├── workload.py         # WorkloadGenerator and reference patterns (Stage 1)
│   ├── process.py          # Process, PageTable, and PageTableEntry (Stage 1)
│   ├── memory.py           # Frame and MemoryManager (Stage 1)
│   └── engine.py           # SimulationClock, PerformanceMetrics, SimulationEngine (Stage 2)
├── tests/
│   ├── __init__.py
│   ├── test_workload.py    # Unit tests for 4 reference patterns
│   ├── test_process.py     # Unit tests for Process & PageTable
│   ├── test_memory.py      # Unit tests for MemoryManager & Frame tracking
│   ├── test_engine.py      # Unit tests for Stage 2 access handler & metrics
│   └── test_integration.py # Integration tests
├── workload.py             # Root forwarding module
├── process.py              # Root forwarding module
├── memory.py               # Root forwarding module
├── engine.py               # Root forwarding module
├── demo.py                 # Interactive demonstration script
└── README.md
```

---

## Stage 1: Workload Generation & Base Memory Data Structures

1. **Workload Generator (`src.workload`)**:
   - `generate_sequential(start, end)`: Scans linearly through page address range.
   - `generate_loop(sequence, iterations)`: Repeats a specific sequence of pages.
   - `generate_random(page_range)`: Uniformly distributed random page requests.
   - `generate_zipf_hot_cold(page_range)`: Simulates temporal locality where 80% of requests target 20% of the pages.

2. **Process & Page Table (`src.process`)**:
   - `PageTableEntry`: Holds `valid`, `dirty`, `frame_number`, and `referenced` bits with dual attribute/dictionary-style indexing.
   - `PageTable(dict)`: Per-process hash map mapping virtual pages to `PageTableEntry`.
   - `Process`: Represents an OS process with unique `process_id` and private `PageTable`.

3. **Memory Manager (`src.memory`)**:
   - `Frame`: Physical frame representation tracking `frame_id`, `process_id`, `page_number`, `is_occupied`, `last_referenced_time`, `reference_bit`, and `dirty_bit`.
   - `MemoryManager(frame_count)`: Manages fixed physical frames, tracking `free_frames` and `occupied_frames`.

---

## Stage 2: Memory Access Handler & Simulation Engine

1. **Simulation Clock (`SimulationClock`)**:
   - Global integer timestamp counter incremented by 1 on every memory access.
   - Critical for deterministic recency comparisons in LRU and Hybrid policies.

2. **Metrics Tracker (`PerformanceMetrics`)**:
   - Tracks `total_accesses`, `page_hits`, `page_faults`, and `dirty_write_backs`.
   - Provides computed `hit_ratio` and `fault_ratio` metrics.

3. **Simulation Engine (`SimulationEngine`)**:
   - Core discrete-event memory access pipeline:
     ```python
     engine = SimulationEngine(memory_manager, processes, metrics=None, clock=None)
     result = engine.execute_access(process, page_number, is_write=False)
     ```
   - **Access Pipeline**:
     - Advances `SimulationClock` and increments `total_accesses`.
     - **On Page HIT**:
       - Updates frame's `last_referenced_time` to the current `SimulationClock`.
       - If `is_write=True`, sets page table entry and frame dirty bit to `True`.
       - Increments `page_hits`.
     - **On Page FAULT**:
       - Increments `page_faults`.
       - If memory is **not full**: allocates a free frame, loads the page, maps it in the page table.
       - If memory is **full**: triggers `_select_victim()`.
   - **Victim Selection Stub (`_select_victim()`)**:
     - Dummy placeholder selecting the first occupied frame.
     - Checks if the evicted page was dirty; if so, increments `dirty_write_backs`.
     - Unmaps the evicted page from its owning process's `PageTable`.
     - Replaces frame contents with the new page.

---

## Running Tests & Demo

```powershell
# Run the complete test suite (all 29 tests)
python -m unittest discover -s tests -p "test_*.py" -v

# Run the interactive demo
python demo.py
```
