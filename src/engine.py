"""
Simulation Engine and Memory Access Handler Module.
Stage 2 & 3: Discrete-event simulation pipeline, clock, metrics tracking,
Adaptive Parameter Controller (lambda tuning), recursive LRFU score tracking,
and Cost-based C(p) victim selection with dirty page penalties.
"""

from dataclasses import dataclass
from typing import Dict, List, Optional, Sequence, Union

from .memory import Frame, MemoryManager
from .process import Process, PageTableEntry


def compute_decayed_score(score: float, lambda_val: float, delta_t: float) -> float:
    """
    Computes the decayed hybrid score: S(p) = score * (1/2)^(lambda * delta_t).

    Optimized for numerical stability:
    - If lambda == 0 (pure LFU), no decay occurs (returns score).
    - If delta_t <= 0, no decay occurs (returns score).
    - If lambda * delta_t > 700, avoids float underflow and returns 0.0.
    """
    if lambda_val <= 0.0 or delta_t <= 0.0:
        return float(score)
    power = lambda_val * delta_t
    if power > 700.0:
        return 0.0
    return float(score * (0.5 ** power))


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


class AdaptiveParameterController:
    """
    Adaptive Parameter Controller for dynamic lambda tuning and cost penalties.

    Parameters:
        window_size (int): Evaluation interval N (default 100 accesses).
        lambda_value (float): Weighting parameter in [0.0, 1.0] (default 0.5).
                              0.0 -> Pure frequency (LFU)
                              1.0 -> Pure recency (LRU)
        delta (float): Dirty page penalty added to eviction cost C(p) (default 2.0).

    Tuning Logic:
        Every N accesses:
            r = faults_in_window / N
            If r > 0.10: lambda = min(1.0, lambda + 0.05)
            If r < 0.02: lambda = max(0.0, lambda - 0.05)
            Reset the window fault counter.
    """

    def __init__(
        self,
        window_size: int = 100,
        lambda_value: float = 0.5,
        delta: float = 2.0,
    ):
        if window_size <= 0:
            raise ValueError(f"window_size must be positive, got {window_size}")
        if not (0.0 <= lambda_value <= 1.0):
            raise ValueError(f"lambda_value must be in range [0.0, 1.0], got {lambda_value}")
        if delta < 0.0:
            raise ValueError(f"delta must be non-negative, got {delta}")

        self.window_size: int = int(window_size)
        self.lambda_value: float = float(lambda_value)
        self.delta: float = float(delta)

        self.window_accesses: int = 0
        self.window_faults: int = 0
        self.tuning_history: List[dict] = []

    def record_access(self, is_fault: bool) -> Optional[float]:
        """
        Records a memory access event. If the window limit is reached, executes tuning.

        Returns:
            Optional[float]: Updated lambda_value if tuning occurred, otherwise None.
        """
        self.window_accesses += 1
        if is_fault:
            self.window_faults += 1

        if self.window_accesses >= self.window_size:
            return self.tune()
        return None

    def tune(self) -> float:
        """
        Executes parameter adjustment based on the window fault rate:
        r = faults in window / window_size
        If r > 0.10: lambda = min(1.0, lambda + 0.05)
        If r < 0.02: lambda = max(0.0, lambda - 0.05)
        Resets window counters.
        """
        r = self.window_faults / self.window_size if self.window_size > 0 else 0.0
        old_lambda = self.lambda_value

        if r > 0.10:
            self.lambda_value = min(1.0, round(self.lambda_value + 0.05, 6))
        elif r < 0.02:
            self.lambda_value = max(0.0, round(self.lambda_value - 0.05, 6))

        self.tuning_history.append({
            "window_faults": self.window_faults,
            "window_size": self.window_size,
            "fault_rate": r,
            "old_lambda": old_lambda,
            "new_lambda": self.lambda_value,
        })

        # Reset window counters
        self.window_faults = 0
        self.window_accesses = 0
        return self.lambda_value

    def reset(self) -> None:
        """Resets window counters and history."""
        self.window_accesses = 0
        self.window_faults = 0
        self.tuning_history.clear()

    def __repr__(self) -> str:
        return (
            f"AdaptiveParameterController(window_size={self.window_size}, "
            f"lambda={self.lambda_value:.4f}, delta={self.delta:.2f}, "
            f"current_window={self.window_faults}/{self.window_accesses})"
        )


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
    hybrid_score: float = 0.0

    def __repr__(self) -> str:
        status = "HIT" if self.is_hit else "FAULT"
        wb_info = f", WriteBack=Page({self.evicted_page})" if self.was_dirty_write_back else ""
        evict_info = f", Evicted=Page({self.evicted_page})" if (not self.is_hit and self.evicted_page is not None) else ""
        return (
            f"AccessResult({status}, PID={self.process_id}, Page={self.page_number}, "
            f"Frame={self.frame_id}, Write={self.is_write}, Score={self.hybrid_score:.4f}, "
            f"Clock={self.timestamp}{evict_info}{wb_info})"
        )


class SimulationEngine:
    """
    Core Simulation Engine and Memory Access Handler.

    Coordinates physical memory allocation, process page table lookups,
    simulation clock advancement, metrics tracking, and the Adaptive Hybrid
    Page Replacement algorithm with dynamic lambda parameter tuning.

    Attributes:
        memory_manager (MemoryManager): Physical memory manager tracking frame states.
        processes (Dict[int, Process]): Map of process_id -> Process participating in simulation.
        metrics (PerformanceMetrics): Tracker for access counts, hits, faults, and write-backs.
        clock (SimulationClock): Monotonically increasing clock incremented per memory access.
        controller (AdaptiveParameterController): Controller handling lambda tuning & delta cost.
    """

    def __init__(
        self,
        memory_manager: MemoryManager,
        processes: Optional[Sequence[Process]] = None,
        metrics: Optional[PerformanceMetrics] = None,
        clock: Optional[SimulationClock] = None,
        controller: Optional[AdaptiveParameterController] = None,
        window_size: int = 100,
        lambda_value: float = 0.5,
        delta: float = 2.0,
    ):
        """
        Initialize SimulationEngine.

        Args:
            memory_manager: Configured MemoryManager instance.
            processes: Optional initial collection of Process instances.
            metrics: Optional PerformanceMetrics instance (defaults to a new tracker).
            clock: Optional SimulationClock instance (defaults to a new clock starting at 0).
            controller: Optional AdaptiveParameterController (defaults to new instance).
            window_size: Access window N for lambda tuning (default 100).
            lambda_value: Initial lambda weighting parameter (default 0.5).
            delta: Dirty page penalty for eviction cost C(p) (default 2.0).
        """
        self.memory_manager: MemoryManager = memory_manager
        self.processes: Dict[int, Process] = {}
        if processes:
            for p in processes:
                self.add_process(p)

        self.metrics: PerformanceMetrics = metrics if metrics is not None else PerformanceMetrics()
        self.clock: SimulationClock = clock if clock is not None else SimulationClock()

        if controller is not None:
            self.controller: AdaptiveParameterController = controller
        else:
            self.controller = AdaptiveParameterController(
                window_size=window_size,
                lambda_value=lambda_value,
                delta=delta,
            )

    @property
    def lambda_value(self) -> float:
        """Current recency vs. frequency weighting parameter."""
        return self.controller.lambda_value

    @lambda_value.setter
    def lambda_value(self, val: float) -> None:
        self.controller.lambda_value = float(val)

    @property
    def delta(self) -> float:
        """Current dirty page eviction penalty."""
        return self.controller.delta

    @delta.setter
    def delta(self, val: float) -> None:
        self.controller.delta = float(val)

    @property
    def window_size(self) -> int:
        """Tuning window size N."""
        return self.controller.window_size

    @window_size.setter
    def window_size(self, val: int) -> None:
        self.controller.window_size = int(val)

    def add_process(self, process: Process) -> None:
        """Registers a process with the simulation engine."""
        self.processes[process.process_id] = process

    def get_process(self, process_id: int) -> Optional[Process]:
        """Looks up a registered process by ID."""
        return self.processes.get(process_id)

    def _select_victim(self) -> int:
        """
        Adaptive Hybrid Page Replacement victim selection.

        When memory is full:
        1. Iterates over all occupied frames.
        2. Calculates each candidate's decayed hybrid score up to current_time:
           S(p) = S_old * (1/2)^(lambda * Delta t), where Delta t = current_time - last_referenced_time.
        3. Calculates Total Cost:
           C(p) = S(p) + (delta if dirty else 0).
        4. Selects the frame with the lowest C(p).
        5. In the event of a tie: chooses the frame with the oldest last_referenced_time
           (smallest last_referenced_time timestamp). If still tied, lowest frame_id.

        Returns:
            int: The physical frame ID chosen for eviction.
        """
        if not self.memory_manager.occupied_frames:
            raise RuntimeError("Cannot select victim: no memory frames are currently occupied.")

        current_time = self.clock.current_time()
        candidates = []

        for frame_id in self.memory_manager.occupied_frames:
            frame = self.memory_manager.get_frame(frame_id)

            # Time since last reference
            delta_t = max(0.0, float(current_time - frame.last_referenced_time))
            # Decayed hybrid score
            s_decayed = compute_decayed_score(frame.hybrid_score, self.lambda_value, delta_t)

            # Determine if candidate page is dirty
            is_dirty = bool(frame.dirty_bit)
            if not is_dirty and frame.process_id is not None and frame.page_number is not None:
                owner = self.get_process(frame.process_id)
                if owner:
                    entry = owner.get_page_entry(frame.page_number)
                    if entry and entry.dirty:
                        is_dirty = True

            # Total cost C(p) = S(p) + (delta if dirty else 0)
            dirty_penalty = self.delta if is_dirty else 0.0
            total_cost = s_decayed + dirty_penalty

            # Candidate tuple:
            # - round(total_cost, 9) ensures robust float equality comparison for ties
            # - frame.last_referenced_time: smaller timestamp = older reference (LRU tie-breaker)
            # - frame.frame_id: deterministic tie-breaker
            candidates.append((
                round(total_cost, 9),
                frame.last_referenced_time,
                frame.frame_id,
            ))

        # Select candidate with lowest C(p), oldest last_referenced_time on tie
        best_candidate = min(candidates, key=lambda c: (c[0], c[1], c[2]))
        return best_candidate[2]

    def execute_access(
        self,
        process: Union[Process, int],
        page_number: int,
        is_write: bool = False,
    ) -> AccessResult:
        """
        Executes a single memory access for a given process and virtual page number.

        Workflow:
        1. Increments SimulationClock by 1 and total_accesses.
        2. Checks Hit/Fault via process.page_table.
        3. If HIT:
           - Updates page hybrid score using recursive LRFU formula:
             S(p)_new = 1 + S(p)_old * (1/2)^(lambda * Delta t).
           - Updates frame last_referenced_time to current SimulationClock.
           - Sets frame reference_bit = True.
           - If is_write is True, sets page table entry and frame dirty bit to True.
           - Increments page_hits.
        4. If FAULT:
           - Increments page_faults.
           - If MemoryManager is not full:
             - Allocates free frame, sets S(p) = 1.0, maps in page table.
           - If MemoryManager is full:
             - Calls _select_victim() to choose frame with minimum C(p).
             - If evicted page was dirty, increments dirty_write_backs.
             - Invalidates evicted page in original process's page table.
             - Replaces frame content with new page, sets S(p) = 1.0, and maps in page table.
        5. Updates AdaptiveParameterController rolling fault counter; tunes lambda every N accesses.

        Args:
            process: Process instance or integer process_id.
            page_number: Virtual page number being referenced.
            is_write: True for write operation, False for read operation.

        Returns:
            AccessResult: Detailed outcome of the reference.
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

            # Calculate time since last access
            delta_t = max(0.0, float(current_time - frame.last_referenced_time))

            # Recursive LRFU score update: S(p)_new = 1 + S(p)_old * (1/2)^(lambda * Delta t)
            decayed_old = compute_decayed_score(frame.hybrid_score, self.lambda_value, delta_t)
            new_score = 1.0 + decayed_old

            frame.hybrid_score = new_score
            frame.last_referenced_time = current_time
            frame.reference_bit = True

            entry.hybrid_score = new_score

            # If write access, set dirty bit on both page table entry and frame
            if is_write:
                entry.dirty = True
                frame.dirty_bit = True

            self.metrics.page_hits += 1

            result = AccessResult(
                is_hit=True,
                process_id=proc.process_id,
                page_number=page_number,
                frame_id=frame_id,
                is_write=is_write,
                evicted_page=None,
                evicted_process_id=None,
                was_dirty_write_back=False,
                timestamp=current_time,
                hybrid_score=new_score,
            )

        else:
            # === FAULT PIPELINE ===
            self.metrics.page_faults += 1

            if not self.memory_manager.is_full():
                # Case A: Free frames available
                frame_id = self.memory_manager.allocate_frame(
                    process_id=proc.process_id,
                    page_number=page_number,
                    dirty=is_write,
                    hybrid_score=1.0,
                )
                if frame_id is None:
                    raise RuntimeError("Failed to allocate frame despite memory not being full.")

                frame = self.memory_manager.get_frame(frame_id)
                frame.last_referenced_time = current_time
                frame.reference_bit = True
                frame.hybrid_score = 1.0

                # Map page in process's page table
                entry = proc.map_page(
                    page_number=page_number,
                    frame_number=frame_id,
                    valid=True,
                    dirty=is_write,
                )
                entry.hybrid_score = 1.0

                result = AccessResult(
                    is_hit=False,
                    process_id=proc.process_id,
                    page_number=page_number,
                    frame_id=frame_id,
                    is_write=is_write,
                    evicted_page=None,
                    evicted_process_id=None,
                    was_dirty_write_back=False,
                    timestamp=current_time,
                    hybrid_score=1.0,
                )

            else:
                # Case B: Memory full -> Select victim using C(p)
                victim_frame_id = self._select_victim()
                victim_frame = self.memory_manager.get_frame(victim_frame_id)

                evicted_pid = victim_frame.process_id
                evicted_page = victim_frame.page_number

                # Check if evicted page was dirty
                evicted_owner = self.get_process(evicted_pid) if evicted_pid is not None else None
                evicted_entry = (
                    evicted_owner.get_page_entry(evicted_page)
                    if (evicted_owner and evicted_page is not None)
                    else None
                )
                was_dirty = (evicted_entry.dirty if evicted_entry else False) or victim_frame.dirty_bit

                if was_dirty:
                    self.metrics.dirty_write_backs += 1

                # Invalidate evicted page in original owner's page table
                if evicted_owner and evicted_page is not None:
                    evicted_owner.unmap_page(evicted_page)

                # Reallocate frame for the newly loaded page with score S(p) = 1.0
                self.memory_manager.free_frame(victim_frame_id)
                self.memory_manager.allocate_frame(
                    process_id=proc.process_id,
                    page_number=page_number,
                    frame_id=victim_frame_id,
                    dirty=is_write,
                    hybrid_score=1.0,
                )

                victim_frame.last_referenced_time = current_time
                victim_frame.reference_bit = True
                victim_frame.dirty_bit = is_write
                victim_frame.hybrid_score = 1.0

                new_entry = proc.map_page(
                    page_number=page_number,
                    frame_number=victim_frame_id,
                    valid=True,
                    dirty=is_write,
                )
                new_entry.hybrid_score = 1.0

                result = AccessResult(
                    is_hit=False,
                    process_id=proc.process_id,
                    page_number=page_number,
                    frame_id=victim_frame_id,
                    is_write=is_write,
                    evicted_page=evicted_page,
                    evicted_process_id=evicted_pid,
                    was_dirty_write_back=was_dirty,
                    timestamp=current_time,
                    hybrid_score=1.0,
                )

        # 5. Parameter Controller window tracking & dynamic lambda tuning
        self.controller.record_access(is_fault=not is_hit)

        return result

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
        """Resets engine clock, metrics, physical memory, controller, and all process page tables."""
        self.clock.reset()
        self.metrics.reset()
        self.memory_manager.reset()
        self.controller.reset()
        for proc in self.processes.values():
            proc.page_table.clear()
