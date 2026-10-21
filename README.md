# Discrete-Event OS Simulator: Adaptive Hybrid Page Replacement

A modular discrete-event operating system memory simulator built in Python to evaluate and benchmark the **Adaptive Hybrid Page Replacement** algorithm.

---

## Architecture Overview

```
Hybrid_PR/
├── src/
│   ├── __init__.py         # Package root exports (Stages 1, 2, 3, 4)
│   ├── workload.py         # WorkloadGenerator with write probabilities (Stages 1 & 3)
│   ├── process.py          # Process (with suspension flags), PageTable, and PageTableEntry
│   ├── memory.py           # Frame and MemoryManager with score tracking
│   ├── engine.py           # SimulationEngine, SimulationClock, AdaptiveParameterController, ThrashingController
│   └── scheduler.py        # CpuScheduler (Round Robin multiprogramming & suspension skipping)
├── tests/
│   ├── __init__.py
│   ├── test_workload.py    # Unit tests for reference patterns and write generation
│   ├── test_process.py     # Unit tests for Process & PageTable (including suspension states)
│   ├── test_memory.py      # Unit tests for MemoryManager & Frame tracking
│   ├── test_engine.py      # Unit tests for Engine, LRFU math, C(p) cost, and lambda tuning
│   ├── test_scheduler.py   # Unit tests for CpuScheduler & Round Robin orchestration
│   ├── test_thrashing.py   # Unit tests for ThrashingController, suspension, and cooling recovery
│   └── test_integration.py # Integration tests
├── workload.py             # Root forwarding module
├── process.py              # Root forwarding module
├── memory.py               # Root forwarding module
├── engine.py               # Root forwarding module
├── scheduler.py            # Root forwarding module
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
   - Tracks `total_accesses`, `page_hits`, `page_faults`, `dirty_write_backs`, and `thrashing_suspensions`.
   - Provides computed `hit_ratio` and `fault_ratio`.

---

## Stage 3: Adaptive Hybrid Algorithm & Parameter Controller

### 1. Workload Generator Write Probability
- Trace generator methods accept:
  - `include_writes: bool = False`: Returns `(page_number, is_write)` tuples.
  - `write_probability: float = 0.2`: Configures write reference percentage.

### 2. Adaptive Parameter Controller (`AdaptiveParameterController`)
- **Parameters**:
  - `window_size` ($N$, default 100): Window length in memory accesses.
  - `lambda_value` ($\lambda$, default 0.5): Balances frequency (LFU, $\lambda=0$) and recency (LRU, $\lambda=1$).
  - `delta` ($\delta$, default 2.0): Penalty added to eviction cost for dirty pages.
- **Tuning Mechanism**:
  - Evaluates system fault rate $r = \frac{\text{faults in window}}{N}$.
  - If $r > 0.10$: $\lambda = \min(1.0, \lambda + 0.05)$ (recency emphasis).
  - If $r < 0.02$: $\lambda = \max(0.0, \lambda - 0.05)$ (frequency emphasis).

### 3. Recursive LRFU Hybrid Score Tracking $S(p)$
- On page load (fault): $S(p) = 1.0$.
- On page **HIT**:
  $$S(p)_{new} = 1 + S(p)_{old} \cdot (1/2)^{\lambda \cdot \Delta t}$$
  where $\Delta t = \text{current\_time} - \text{last\_referenced\_time}$.

### 4. Cost-Based Victim Selection $C(p)$
- Evaluates total eviction cost:
  $$C(p) = S(p) + (\delta \text{ if dirty else } 0)$$
- Selects candidate with lowest $C(p)$.
- Tie-breaking: oldest `last_referenced_time`, then lowest `frame_id`.

---

## Stage 4: Thrashing Control & Round Robin Scheduling

### 1. Process State Updates (`src.process.Process`)
- `is_suspended: bool = False`: Flag indicating if the process has been suspended due to thrashing.
- `suspension_timer: int = 0`: Tracks the number of tuning windows the process must sit out to allow memory to cool down.
- Helper methods: `suspend(duration=2)` and `resume()`.

### 2. Round Robin CPU Scheduler (`src.scheduler.CpuScheduler`)
- Takes a collection of `Process` instances and `time_quantum` (default 5 memory accesses per turn).
- Cycles through processes in Round Robin order.
- **Crucial Rule**: Automatically skips any process where `is_suspended == True`.
- Provides `step()` for turn-by-turn simulation and `run()` for end-to-end trace orchestration.

### 3. Thrashing Controller (`src.engine.ThrashingController`)
- **Tracking**: Monitors per-process fault rate:
  $$r_i = \frac{\text{faults of process } i}{\text{accesses of process } i}$$
  over the same tuning window $N$ used by the $\lambda$ parameter controller.
- **Threshold**: Configurable `upper_fault_threshold` (default 0.20 or 20%).
- **Suspension Action**: At the end of every window $N$, evaluates active processes. If $r_i > \text{upper\_fault\_threshold}$:
  - Flags the process as thrashing.
  - Sets `is_suspended = True`.
  - Sets `suspension_timer = 2` (process sits out for the next 2 windows).
  - Increments `metrics.thrashing_suspensions`.
- **Recovery Action**: At the end of every window $N$, decrements `suspension_timer` for all suspended processes. When `suspension_timer == 0`:
  - Sets `is_suspended = False`.
  - The CPU scheduler automatically picks it back up on subsequent turns.

---

## Running Tests & Demo

```powershell
# Run the complete test suite (all 53 tests passing)
python -m unittest discover -s tests -p "test_*.py" -v

# Or run with pytest
python -m pytest -v

# Run the interactive demo covering Stages 1-4
python demo.py
```
