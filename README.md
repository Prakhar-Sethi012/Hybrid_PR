# Discrete-Event OS Simulator: Adaptive Hybrid Page Replacement

A modular discrete-event operating system memory simulator built in Python to evaluate and benchmark the **Adaptive Hybrid Page Replacement** algorithm.

---

## Architecture Overview

```
Hybrid_PR/
├── src/
│   ├── __init__.py         # Package root exports (Stages 1, 2, 3)
│   ├── workload.py         # WorkloadGenerator with write probabilities (Stages 1 & 3)
│   ├── process.py          # Process, PageTable, and PageTableEntry with hybrid scores
│   ├── memory.py           # Frame and MemoryManager with score tracking
│   └── engine.py           # SimulationEngine, SimulationClock, AdaptiveParameterController (Stages 2 & 3)
├── tests/
│   ├── __init__.py
│   ├── test_workload.py    # Unit tests for reference patterns and write generation
│   ├── test_process.py     # Unit tests for Process & PageTable
│   ├── test_memory.py      # Unit tests for MemoryManager & Frame tracking
│   ├── test_engine.py      # Unit tests for Engine, LRFU math, C(p) cost, and lambda tuning
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
   - `generate_zipf_hot_cold(page_range)`: Simulates temporal locality (80% requests target 20% pages).

2. **Process & Page Table (`src.process`)**:
   - `PageTableEntry`: Holds `valid`, `dirty`, `frame_number`, `referenced`, and `hybrid_score`.
   - `PageTable(dict)`: Per-process hash map mapping virtual pages to `PageTableEntry`.
   - `Process`: Represents an OS process with unique `process_id` and private `PageTable`.

3. **Memory Manager (`src.memory`)**:
   - `Frame`: Physical frame tracking `frame_id`, `process_id`, `page_number`, `is_occupied`, `last_referenced_time`, `dirty_bit`, and `hybrid_score`.
   - `MemoryManager(frame_count)`: Manages fixed physical frames, tracking `free_frames` and `occupied_frames`.

---

## Stage 2: Memory Access Handler & Simulation Engine

1. **Simulation Clock (`SimulationClock`)**:
   - Global integer timestamp counter incremented by 1 on every memory access.

2. **Metrics Tracker (`PerformanceMetrics`)**:
   - Tracks `total_accesses`, `page_hits`, `page_faults`, and `dirty_write_backs`.
   - Provides computed `hit_ratio` and `fault_ratio`.

---

## Stage 3: Adaptive Hybrid Algorithm & Parameter Controller

### 1. Workload Generator Write Probability
- All trace generator methods now accept:
  - `include_writes: bool = False`: When `True`, returns `List[Tuple[int, bool]]` of `(page_number, is_write)`.
  - `write_probability: float = 0.2`: Configures the fraction of accesses that represent write operations (default 20%).

### 2. Adaptive Parameter Controller (`AdaptiveParameterController`)
- **Parameters**:
  - `window_size` ($N$, default 100): Window length in memory accesses.
  - `lambda_value` ($\lambda$, default 0.5): Weighting factor balancing frequency (LFU, $\lambda=0$) and recency (LRU, $\lambda=1$).
  - `delta` ($\delta$, default 2.0): Penalty added to eviction cost for dirty pages.
- **Tuning Mechanism**:
  - Maintains rolling fault counter within the current window of $N$ accesses.
  - Window fault rate: $r = \frac{\text{faults in window}}{N}$.
  - If $r > 0.10$: $\lambda = \min(1.0, \lambda + 0.05)$ (shifts towards recency/LRU).
  - If $r < 0.02$: $\lambda = \max(0.0, \lambda - 0.05)$ (shifts towards frequency/LFU).
  - Resets the rolling fault counter every $N$ accesses.

### 3. Recursive LRFU Hybrid Score Tracking $S(p)$
- Standard LRFU formula:
  $$S(p) = \sum (1/2)^{\lambda \cdot \text{age}}$$
- **Recursive $O(1)$ Optimization**:
  - On page load (fault): $S(p) = 1.0$.
  - On page **HIT**:
    $$S(p)_{new} = 1 + S(p)_{old} \cdot (1/2)^{\lambda \cdot \Delta t}$$
    where $\Delta t = \text{current\_time} - \text{last\_referenced\_time}$.

### 4. Cost-Based Victim Selection $C(p)$
- When memory is full, candidates in `occupied_frames` are evaluated:
  - Calculate decayed score up to current time:
    $$S(p) = S_{old} \cdot (1/2)^{\lambda \cdot \Delta t}$$
  - Calculate Total Cost:
    $$C(p) = S(p) + (\delta \text{ if dirty else } 0)$$
- **Selection Rule**: Choose frame with minimum $C(p)$.
- **Tie-Breaking Rule**: In the event of a tie, choose the frame with the **oldest `last_referenced_time`** (smallest timestamp). If still tied, choose lowest `frame_id`.

---

## Running Tests & Demo

```powershell
# Run the complete test suite (all 37 tests passing)
python -m unittest discover -s tests -p "test_*.py" -v

# Run the interactive demo
python demo.py
```
