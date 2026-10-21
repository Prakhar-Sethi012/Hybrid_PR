"""
Simulation Engine and Memory Access Handler Module.
Stage 2: Discrete-event simulation pipeline, clock, metrics tracking, and victim eviction stub.
"""

from dataclasses import dataclass
from typing import Dict, List, Optional, Sequence, Union

from .memory import Frame, MemoryManager
from .process import Process, PageTableEntry


class SimulationClock:
    """
    Monotonically increasing simulation clock.
    Increments by 1 on every single memory access to provide deterministic recency timestamps.
    """

    def __init__(self, initial_time: int = 0):
        self.time: int = int(initial_time)

    def tick(self) -> int:
        """Increments the clock by 1 and returns the new current time."""
        self.time += 1
        return self.time

    def current_time(self) -> int:
        """Returns the current clock timestamp without incrementing."""
        return self.time

    def reset(self, initial_time: int = 0) -> None:
        """Resets the simulation clock to the initial timestamp."""
        self.time = int(initial_time)

    def __int__(self) -> int:
        return self.time

    def __repr__(self) -> str:
        return f"SimulationClock(time={self.time})"


@dataclass
class PerformanceMetrics:
    """
    Performance Metrics Tracker for memory access simulations.

    Tracks:
        total_accesses (int): Total memory references processed.
        page_hits (int): Number of memory references satisfied in memory.
        page_faults (int): Number of page faults encountered.
        dirty_write_backs (int): Number of dirty pages written back to disk on eviction.
    """

    total_accesses: int = 0
    page_hits: int = 0
    page_faults: int = 0
    dirty_write_backs: int = 0

    @property
    def hit_ratio(self) -> float:
        """Calculates hit ratio (page_hits / total_accesses)."""
        return self.page_hits / self.total_accesses if self.total_accesses > 0 else 0.0

    @property
    def fault_ratio(self) -> float:
        """Calculates fault ratio (page_faults / total_accesses)."""
        return self.page_faults / self.total_accesses if self.total_accesses > 0 else 0.0

    def reset(self) -> None:
        """Resets all metrics counters to zero."""
        self.total_accesses = 0
        self.page_hits = 0
        self.page_faults = 0
        self.dirty_write_backs = 0

    def to_dict(self) -> dict:
        """Returns metrics as a dictionary."""
        return {
            "total_accesses": self.total_accesses,
            "page_hits": self.page_hits,
            "page_faults": self.page_faults,
            "dirty_write_backs": self.dirty_write_backs,
            "hit_ratio": self.hit_ratio,
            "fault_ratio": self.fault_ratio,
        }

    def __repr__(self) -> str:
        return (
            f"PerformanceMetrics(accesses={self.total_accesses}, hits={self.page_hits}, "
            f"faults={self.page_faults}, write_backs={self.dirty_write_backs}, "
            f"hit_rate={self.hit_ratio:.2%})"
        )


@dataclass
class AccessResult:
    """
    Details of an individual memory reference execution.
    """

    is_hit: bool
    process_id: int
    page_number: int
    frame_id: int
    is_write: bool
    evicted_page: Optional[int] = None
    evicted_process_id: Optional[int] = None
    was_dirty_write_back: bool = False
    timestamp: int = 0

    def __repr__(self) -> str:
        status = "HIT" if self.is_hit else "FAULT"
        wb_info = f", WriteBack=Page({self.evicted_page})" if self.was_dirty_write_back else ""
        evict_info = f", Evicted=Page({self.evicted_page})" if (not self.is_hit and self.evicted_page is not None) else ""
        return (
            f"AccessResult({status}, PID={self.process_id}, Page={self.page_number}, "
            f"Frame={self.frame_id}, Write={self.is_write}, Clock={self.timestamp}{evict_info}{wb_info})"
        )


class SimulationEngine:
    """
    Core Simulation Engine and Memory Access Handler.

    Coordinates physical memory allocation, process page table lookups,
    simulation clock advancement, and metrics tracking across reference traces.

    Attributes:
        memory_manager (MemoryManager): Physical memory manager tracking frame states.
        processes (Dict[int, Process]): Map of process_id -> Process participating in simulation.
        metrics (PerformanceMetrics): Tracker for access counts, hits, faults, and write-backs.
        clock (SimulationClock): Monotonically increasing clock incremented per memory access.
    """

    def __init__(
        self,
        memory_manager: MemoryManager,
        processes: Optional[Sequence[Process]] = None,
        metrics: Optional[PerformanceMetrics] = None,
        clock: Optional[SimulationClock] = None,
    ):
        """
        Initialize SimulationEngine.

        Args:
            memory_manager: Configured MemoryManager instance.
            processes: Optional initial collection of Process instances.
            metrics: Optional PerformanceMetrics instance (defaults to a new tracker).
            clock: Optional SimulationClock instance (defaults to a new clock starting at 0).
        """
        self.memory_manager: MemoryManager = memory_manager
        self.processes: Dict[int, Process] = {}
        if processes:
            for p in processes:
                self.add_process(p)

        self.metrics: PerformanceMetrics = metrics if metrics is not None else PerformanceMetrics()
        self.clock: SimulationClock = clock if clock is not None else SimulationClock()

    def add_process(self, process: Process) -> None:
        """Registers a process with the simulation engine."""
        self.processes[process.process_id] = process

    def get_process(self, process_id: int) -> Optional[Process]:
        """Looks up a registered process by ID."""
        return self.processes.get(process_id)

    def _select_victim(self) -> int:
        """
        Victim selection stub.
        Selects a frame for eviction when physical memory is full.

        Placeholder dummy implementation:
        Picks the first occupied frame (lowest frame ID among currently occupied frames).
        This placeholder will be replaced by the Adaptive Hybrid Page Replacement policy in Stage 3.

        Returns:
            int: The physical frame ID chosen for eviction.
        """
        if not self.memory_manager.occupied_frames:
            raise RuntimeError("Cannot select victim: no memory frames are currently occupied.")
        # Deterministic dummy selection: lowest occupied frame index
        return min(self.memory_manager.occupied_frames)

    def execute_access(
        self,
        process: Union[Process, int],
        page_number: int,
        is_write: bool = False,
    ) -> AccessResult:
        """
        Executes a single memory access for a given process and virtual page number.

        Workflow:
        1. Increments the SimulationClock by 1.
        2. Increments total_accesses counter.
        3. Checks Hit/Fault via process.page_table.
        4. If HIT:
           - Updates frame's last_referenced_time to current SimulationClock.
           - Sets frame reference_bit = True.
           - If is_write is True, sets page table entry's and frame's dirty bit to True.
           - Increments page_hits.
        5. If FAULT:
           - Increments page_faults.
           - If MemoryManager is not full:
             - Allocates a free frame, maps in page table, sets timestamps/dirty status.
           - If MemoryManager is full:
             - Calls placeholder _select_victim() to choose frame.
             - Checks if evicted page is dirty; if so, increments dirty_write_backs.
             - Invalidates evicted page in original process's page table.
             - Replaces frame content with new page and updates requesting page table.

        Args:
            process: Process instance or integer process_id.
            page_number: Virtual page number being referenced.
            is_write: True for write operation (sets dirty bit), False for read operation.

        Returns:
            AccessResult: Structured outcome detailing hit/fault, frame, eviction, and clock.
        """
        # Resolve Process instance
        if isinstance(process, int):
            proc = self.get_process(process)
            if proc is None:
                raise KeyError(f"Process ID {process} is not registered in the SimulationEngine.")
        elif isinstance(process, Process):
            proc = process
            if proc.process_id not in self.processes:
                self.add_process(proc)
        else:
            raise TypeError(f"Expected Process or int process_id, got {type(process)}")

        # 1. Advance simulation clock & total access count
        current_time = self.clock.tick()
        self.metrics.total_accesses += 1

        # 2. Check Hit vs. Fault in process's PageTable
        is_hit = proc.is_page_valid(page_number)

        if is_hit:
            # === HIT PIPELINE ===
            entry = proc.get_page_entry(page_number)
            if entry is None or entry.frame_number is None:
                raise RuntimeError(f"Inconsistent state: page {page_number} marked valid but has no frame.")

            frame_id = entry.frame_number
            frame = self.memory_manager.get_frame(frame_id)

            # Update recency timestamp to current simulation clock
            frame.last_referenced_time = current_time
            frame.reference_bit = True

            # If write access, set dirty bit on both page table entry and frame
            if is_write:
                entry.dirty = True
                frame.dirty_bit = True

            self.metrics.page_hits += 1

            return AccessResult(
                is_hit=True,
                process_id=proc.process_id,
                page_number=page_number,
                frame_id=frame_id,
                is_write=is_write,
                evicted_page=None,
                evicted_process_id=None,
                was_dirty_write_back=False,
                timestamp=current_time,
            )

        else:
            # === FAULT PIPELINE ===
            self.metrics.page_faults += 1

            if not self.memory_manager.is_full():
                # Case A: Memory has free frames available
                frame_id = self.memory_manager.allocate_frame(
                    process_id=proc.process_id,
                    page_number=page_number,
                    dirty=is_write,
                )
                if frame_id is None:
                    raise RuntimeError("Failed to allocate frame despite memory not being full.")

                frame = self.memory_manager.get_frame(frame_id)
                frame.last_referenced_time = current_time
                frame.reference_bit = True

                # Map page in process's page table
                proc.map_page(
                    page_number=page_number,
                    frame_number=frame_id,
                    valid=True,
                    dirty=is_write,
                )

                return AccessResult(
                    is_hit=False,
                    process_id=proc.process_id,
                    page_number=page_number,
                    frame_id=frame_id,
                    is_write=is_write,
                    evicted_page=None,
                    evicted_process_id=None,
                    was_dirty_write_back=False,
                    timestamp=current_time,
                )

            else:
                # Case B: Memory is full -> Select victim and evict
                victim_frame_id = self._select_victim()
                victim_frame = self.memory_manager.get_frame(victim_frame_id)

                evicted_pid = victim_frame.process_id
                evicted_page = victim_frame.page_number

                # Determine if evicted page was dirty
                evicted_owner = self.get_process(evicted_pid) if evicted_pid is not None else None
                evicted_entry = (
                    evicted_owner.get_page_entry(evicted_page)
                    if (evicted_owner and evicted_page is not None)
                    else None
                )

                was_dirty = (evicted_entry.dirty if evicted_entry else False) or victim_frame.dirty_bit

                # If dirty, increment dirty_write_backs
                if was_dirty:
                    self.metrics.dirty_write_backs += 1

                # Invalidate evicted page in original owner's page table
                if evicted_owner and evicted_page is not None:
                    evicted_owner.unmap_page(evicted_page)

                # Clear and re-allocate frame for newly loaded page
                self.memory_manager.free_frame(victim_frame_id)
                self.memory_manager.allocate_frame(
                    process_id=proc.process_id,
                    page_number=page_number,
                    frame_id=victim_frame_id,
                    dirty=is_write,
                )

                # Update frame recency and status
                victim_frame.last_referenced_time = current_time
                victim_frame.reference_bit = True
                victim_frame.dirty_bit = is_write

                # Map new page in requesting process's page table
                proc.map_page(
                    page_number=page_number,
                    frame_number=victim_frame_id,
                    valid=True,
                    dirty=is_write,
                )

                return AccessResult(
                    is_hit=False,
                    process_id=proc.process_id,
                    page_number=page_number,
                    frame_id=victim_frame_id,
                    is_write=is_write,
                    evicted_page=evicted_page,
                    evicted_process_id=evicted_pid,
                    was_dirty_write_back=was_dirty,
                    timestamp=current_time,
                )

    def execute_trace(
        self,
        process: Union[Process, int],
        trace: Sequence[Union[int, tuple]],
        default_is_write: bool = False,
    ) -> List[AccessResult]:
        """
        Executes an entire sequence of memory references.

        Args:
            process: Process or process_id executing the trace.
            trace: List of page numbers (e.g., [1, 2, 3]) or tuples (page_number, is_write).
            default_is_write: Default write flag when trace items are pure integers.

        Returns:
            List[AccessResult]: Log of access results for the trace.
        """
        results: List[AccessResult] = []
        for item in trace:
            if isinstance(item, tuple) and len(item) == 2:
                p_num, is_w = item
            else:
                p_num, is_w = int(item), default_is_write
            results.append(self.execute_access(process=process, page_number=p_num, is_write=is_w))
        return results

    def reset(self) -> None:
        """Resets engine clock, metrics, physical memory, and all process page tables."""
        self.clock.reset()
        self.metrics.reset()
        self.memory_manager.reset()
        for proc in self.processes.values():
            proc.page_table.clear()
