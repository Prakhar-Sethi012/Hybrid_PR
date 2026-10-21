# Discrete-Event OS Simulator: Adaptive Hybrid Page Replacement

## Stage 1: Workload Generation & Base Memory Data Structures

This stage establishes the foundational building blocks for the discrete-event OS simulator:
1. **Workload Generator**: Synthetic memory reference trace generator supporting four canonical reference patterns.
2. **Process & PageTable**: Per-process address space mapping virtual pages to valid/dirty states.
3. **Physical Memory Manager**: Physical frame allocation and tracking (free vs. occupied).

> **Modular Design Constraint**: Replacement policies and fault handlers are intentionally deferred to Stage 2.

---

### Project Structure

```
Hybrid_PR/
├── src/
│   ├── __init__.py         # Package root exports
│   ├── workload.py         # WorkloadGenerator and trace pattern functions
│   ├── process.py          # Process, PageTable, and PageTableEntry
│   └── memory.py           # Frame and MemoryManager
├── tests/
│   ├── __init__.py
│   ├── test_workload.py    # Unit tests for 4 reference patterns
│   ├── test_process.py     # Unit tests for Process & PageTable
│   ├── test_memory.py      # Unit tests for MemoryManager & Frame tracking
│   └── test_integration.py # End-to-end integration test
├── workload.py             # Root forwarding module
├── process.py              # Root forwarding module
├── memory.py               # Root forwarding module
├── demo.py                 # Interactive demonstration script
└── README.md
```

---

### Architecture Specification

#### 1. Workload Generator (`src.workload`)

- **Class**: `WorkloadGenerator(number_of_references: Optional[int] = None, seed: Optional[int] = None)`
  - `generate_sequential(start: int, end: int, inclusive: bool = True, num_references: Optional[int] = None) -> List[int]`
    - Scans linearly through page address range. If `num_references` (or generator default) is specified, cycles the range to meet the requested trace length.
  - `generate_loop(sequence: Sequence[int], iterations: Optional[int] = None, num_references: Optional[int] = None) -> List[int]`
    - Repeats a page sequence for `iterations` passes, or until `num_references` is fulfilled.
  - `generate_random(page_range: Union[int, Tuple[int, int], range, Sequence[int]], num_references: Optional[int] = None) -> List[int]`
    - Generates uniformly distributed random page requests across the target page space.
  - `generate_zipf_hot_cold(page_range: ..., hot_page_ratio: float = 0.2, hot_request_ratio: float = 0.8, num_references: Optional[int] = None, zipf_alpha: Optional[float] = None) -> List[int]`
    - Models 80/20 temporal locality: 80% of page references access the top 20% "hot" pages, while the remaining 20% access the other 80% "cold" pages. Supports optional Zipf exponent skew.

#### 2. Process & Page Table (`src.process`)

- **Class**: `PageTableEntry`
  - Attributes: `valid: bool`, `dirty: bool`, `frame_number: Optional[int]`, `referenced: bool`.
  - Supports dual attribute access (`entry.valid`) and dictionary access (`entry['valid']`).
- **Class**: `PageTable(dict)`
  - Specialized hash map inheriting from `dict` mapping `page_number: int -> PageTableEntry`.
  - Methods: `map_page()`, `invalidate()`, `is_valid()`, `is_dirty()`, `set_valid()`, `set_dirty()`.
- **Class**: `Process`
  - Attributes: `process_id: int`, `name: str`, `page_table: PageTable`.
  - Methods: `get_page_entry()`, `is_page_valid()`, `is_page_dirty()`, `map_page()`, `unmap_page()`.

#### 3. Memory Manager (`src.memory`)

- **Class**: `Frame`
  - Attributes: `frame_id: int`, `process_id: Optional[int]`, `page_number: Optional[int]`, `is_occupied: bool`, `reference_bit: bool`, `dirty_bit: bool`, `last_referenced_time: float`.
  - Properties: `is_free: bool`, `frame_number: int`.
- **Class**: `MemoryManager(frame_count: int)`
  - Attributes: `frame_count: int`, `frames: List[Frame]`, `free_frames: Set[int]`, `occupied_frames: Set[int]`.
  - Methods:
    - `allocate_frame(process_id: int, page_number: int, frame_id: Optional[int] = None) -> Optional[int]`
    - `free_frame(frame_id: int) -> Optional[Frame]`
    - `is_frame_free(frame_id: int) -> bool`
    - `is_frame_occupied(frame_id: int) -> bool`
    - `get_free_frames() -> List[int]`
    - `get_occupied_frames() -> List[int]`
    - `is_full() -> bool`
    - `reset() -> None`

---

### Running Tests & Demo

```bash
# Run all unit tests
python -m unittest discover -s tests -p "test_*.py" -v

# Run the interactive demonstration script
python demo.py
```
