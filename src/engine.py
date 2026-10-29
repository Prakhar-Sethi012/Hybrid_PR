"""
Simulation Engine and Memory Access Handler Module.
Stage 2 & 3: Discrete-event simulation pipeline, clock, metrics tracking,
Adaptive Parameter Controller (lambda tuning), recursive LRFU score tracking,
and Cost-based C(p) victim selection with dirty page penalties.
"""

from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Sequence, Union

from .memory import Frame, MemoryManager
from .process import Process, PageTableEntry
from .scheduler import CpuScheduler


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


# Standard Mock Hardware Latency Constants (in nanoseconds)
RAM_ACCESS_TIME_NS: float = 100.0          # 100 ns
DISK_READ_TIME_NS: float = 10_000_000.0    # 10 ms
DISK_WRITE_TIME_NS: float = 10_000_000.0   # 10 ms


class PageReplacementPolicy:
    """Standard Page Replacement Policy Identifier Constants."""
    FIFO = "FIFO"
    LRU = "LRU"
    LFU = "LFU"
    ADAPTIVE_HYBRID = "AdaptiveHybrid"
    HYBRID = "AdaptiveHybrid"


class BasePageReplacementPolicy:
    """Abstract base class / strategy interface for page replacement policies."""
    name: str = "Base"

    def select_victim(self, engine: "SimulationEngine") -> int:
        """Selects and returns physical frame_id to evict."""
        raise NotImplementedError("Replacement policies must implement select_victim(engine).")


class FIFOPolicy(BasePageReplacementPolicy):
    """First-In, First-Out (FIFO) replacement policy."""
    name: str = PageReplacementPolicy.FIFO

    def select_victim(self, engine: "SimulationEngine") -> int:
        return engine._select_victim_fifo()


class LRUPolicy(BasePageReplacementPolicy):
    """Least Recently Used (LRU) replacement policy."""
    name: str = PageReplacementPolicy.LRU

    def select_victim(self, engine: "SimulationEngine") -> int:
        return engine._select_victim_lru()


class LFUPolicy(BasePageReplacementPolicy):
    """Least Frequently Used (LFU) replacement policy."""
    name: str = PageReplacementPolicy.LFU

    def select_victim(self, engine: "SimulationEngine") -> int:
        return engine._select_victim_lfu()


class AdaptiveHybridPolicy(BasePageReplacementPolicy):
    """Adaptive Hybrid Page Replacement policy with dirty write-back cost penalty."""
    name: str = PageReplacementPolicy.ADAPTIVE_HYBRID

    def select_victim(self, engine: "SimulationEngine") -> int:
        return engine._select_victim_hybrid()


@dataclass
class PerformanceMetrics:
    """
    Performance Metrics Tracker for memory access simulations.

    Tracks:
        total_accesses (int): Total memory references processed.
        page_hits (int): Number of memory references satisfied in memory.
        page_faults (int): Number of page faults encountered.
        dirty_write_backs (int): Number of dirty pages written back to disk on eviction.
        thrashing_suspensions (int): Number of times a process was forcibly suspended due to thrashing.
    """

    total_accesses: int = 0
    page_hits: int = 0
    page_faults: int = 0
    dirty_write_backs: int = 0
    thrashing_suspensions: int = 0

    @property
    def hit_ratio(self) -> float:
        """Calculates hit ratio (page_hits / total_accesses)."""
        return self.page_hits / self.total_accesses if self.total_accesses > 0 else 0.0

    @property
    def fault_ratio(self) -> float:
        """Calculates fault ratio (page_faults / total_accesses)."""
        return self.page_faults / self.total_accesses if self.total_accesses > 0 else 0.0

    def calculate_eat(
        self,
        ram_access_ns: float = RAM_ACCESS_TIME_NS,
        disk_read_ns: float = DISK_READ_TIME_NS,
        disk_write_ns: float = DISK_WRITE_TIME_NS,
    ) -> float:
        """
        Calculates the Effective Access Time (EAT) in nanoseconds.
        Formula: EAT = (Hit Ratio * RAM Access) + (Fault Ratio * Disk Read) + ((Dirty Write-backs / Total Accesses) * Disk Write)
        """
        if self.total_accesses == 0:
            return 0.0
        dirty_ratio = self.dirty_write_backs / self.total_accesses
        return (
            (self.hit_ratio * ram_access_ns)
            + (self.fault_ratio * disk_read_ns)
            + (dirty_ratio * disk_write_ns)
        )

    @property
    def eat(self) -> float:
        """Effective Access Time (EAT) in nanoseconds using standard mock hardware latencies."""
        return self.calculate_eat()

    def reset(self) -> None:
        """Resets all metrics counters to zero."""
        self.total_accesses = 0
        self.page_hits = 0
        self.page_faults = 0
        self.dirty_write_backs = 0
        self.thrashing_suspensions = 0

    def to_dict(self) -> dict:
        """Returns metrics as a dictionary."""
        return {
            "total_accesses": self.total_accesses,
            "page_hits": self.page_hits,
            "page_faults": self.page_faults,
            "dirty_write_backs": self.dirty_write_backs,
            "thrashing_suspensions": self.thrashing_suspensions,
            "hit_ratio": self.hit_ratio,
            "fault_ratio": self.fault_ratio,
            "eat": self.eat,
        }

    def __repr__(self) -> str:
        return (
            f"PerformanceMetrics(accesses={self.total_accesses}, hits={self.page_hits}, "
            f"faults={self.page_faults}, write_backs={self.dirty_write_backs}, "
            f"suspensions={self.thrashing_suspensions}, "
            f"hit_rate={self.hit_ratio:.2%}, eat={self.eat:.1f}ns)"
        )


class ThrashingController:
    """
    Thrashing Controller for Stage 4: Thrashing Control & Multiprogramming Regulation.

    Monitors per-process page fault rates (r_i) over window_size (N) memory references.
    If an active process's r_i exceeds upper_fault_threshold (e.g. 0.20 or 20%),
    the process is flagged as thrashing and suspended for suspension_duration (default 2)
    tuning windows to allow memory to cool down.

    Recovery logic:
    At the end of every window N, decrements the suspension_timer for all suspended processes.
    If the timer hits 0, is_suspended is set to False so the scheduler can pick it back up.

    Attributes:
        window_size (int): Evaluation interval N in system memory accesses (matches lambda controller).
        upper_fault_threshold (float): Fault rate threshold above which thrashing is flagged (default 0.20).
        suspension_duration (int): Number of windows a suspended process must sit out (default 2).
        window_accesses (int): Number of memory references recorded in the current window.
        window_count (int): Total number of evaluation windows completed.
        process_accesses (Dict[int, int]): Per-process access counts in the current window.
        process_faults (Dict[int, int]): Per-process fault counts in the current window.
        suspension_history (List[dict]): Log of window evaluations and suspension events.
    """

    def __init__(
        self,
        window_size: int = 100,
        upper_fault_threshold: float = 0.20,
        suspension_duration: int = 2,
        processes: Optional[Union[Dict[int, Process], Sequence[Process]]] = None,
        metrics: Optional[PerformanceMetrics] = None,
    ):
        if window_size <= 0:
            raise ValueError(f"window_size must be positive, got {window_size}")
        if not (0.0 <= upper_fault_threshold <= 1.0):
            raise ValueError(
                f"upper_fault_threshold must be between 0.0 and 1.0, got {upper_fault_threshold}"
            )
        if suspension_duration <= 0:
            raise ValueError(f"suspension_duration must be positive, got {suspension_duration}")

        self.window_size: int = int(window_size)
        self.upper_fault_threshold: float = float(upper_fault_threshold)
        self.suspension_duration: int = int(suspension_duration)

        self.processes: Optional[Union[Dict[int, Process], Sequence[Process]]] = processes
        self.metrics: Optional[PerformanceMetrics] = metrics

        self.window_accesses: int = 0
        self.window_count: int = 0
        self.process_accesses: Dict[int, int] = {}
        self.process_faults: Dict[int, int] = {}
        self.suspension_history: List[dict] = []

    def record_access(
        self,
        process_id: int,
        is_fault: bool,
        processes: Optional[Union[Dict[int, Process], Sequence[Process]]] = None,
        metrics: Optional[PerformanceMetrics] = None,
    ) -> Optional[dict]:
        """
        Records a memory reference for a process. If window limit is reached, triggers window evaluation.

        Returns:
            Optional[dict]: Window evaluation report if window completed, otherwise None.
        """
        pid = int(process_id)
        self.window_accesses += 1
        self.process_accesses[pid] = self.process_accesses.get(pid, 0) + 1
        if is_fault:
            self.process_faults[pid] = self.process_faults.get(pid, 0) + 1

        if self.window_accesses >= self.window_size:
            return self.evaluate(processes=processes, metrics=metrics)
        return None

    def evaluate(
        self,
        processes: Optional[Union[Dict[int, Process], Sequence[Process]]] = None,
        metrics: Optional[PerformanceMetrics] = None,
    ) -> dict:
        """
        Executes window evaluation at the end of every window N:
        1. Recovery: Decrement suspension_timer for all currently suspended processes.
           If it hits 0, set is_suspended = False so the scheduler picks it back up.
        2. Thrashing Detection: Evaluate all active processes that executed in this window.
           If r_i > upper_fault_threshold, flag it as thrashing:
           set is_suspended = True, set suspension_timer = suspension_duration (default 2),
           and increment metrics.thrashing_suspensions.
        3. Resets window counters for the next window.

        Returns:
            dict: Summary report of this window evaluation.
        """
        target_procs = processes if processes is not None else self.processes
        if target_procs is None:
            proc_list: List[Process] = []
        elif isinstance(target_procs, dict):
            proc_list = list(target_procs.values())
        else:
            proc_list = list(target_procs)

        target_metrics = metrics if metrics is not None else self.metrics
        self.window_count += 1

        recovered: List[int] = []
        newly_suspended: List[int] = []
        fault_rates: Dict[int, float] = {}

        # 1. Recovery: Decrement suspension_timer for currently suspended processes
        for proc in proc_list:
            if proc.is_suspended:
                proc.suspension_timer -= 1
                if proc.suspension_timer <= 0:
                    proc.suspension_timer = 0
                    proc.is_suspended = False
                    recovered.append(proc.process_id)

        # 2. Thrashing detection: Evaluate active processes that ran in this window
        for proc in proc_list:
            if not proc.is_suspended:
                acc = self.process_accesses.get(proc.process_id, 0)
                if acc > 0:
                    faults = self.process_faults.get(proc.process_id, 0)
                    r_i = faults / acc
                    fault_rates[proc.process_id] = r_i
                    if r_i > self.upper_fault_threshold:
                        proc.is_suspended = True
                        proc.suspension_timer = self.suspension_duration
                        newly_suspended.append(proc.process_id)
                        if target_metrics is not None:
                            target_metrics.thrashing_suspensions += 1

        summary = {
            "window": self.window_count,
            "window_size": self.window_size,
            "fault_rates": fault_rates,
            "newly_suspended": newly_suspended,
            "recovered": recovered,
        }
        self.suspension_history.append(summary)

        # 3. Reset window counters
        self.window_accesses = 0
        self.process_accesses.clear()
        self.process_faults.clear()

        return summary

    def get_fault_rate(self, process_id: int) -> float:
        """Returns the current window fault rate for a given process, or 0.0."""
        acc = self.process_accesses.get(process_id, 0)
        if acc == 0:
            return 0.0
        return self.process_faults.get(process_id, 0) / acc

    def reset(self) -> None:
        """Resets window counters and evaluation history."""
        self.window_accesses = 0
        self.window_count = 0
        self.process_accesses.clear()
        self.process_faults.clear()
        self.suspension_history.clear()

    def __repr__(self) -> str:
        return (
            f"ThrashingController(window_size={self.window_size}, "
            f"threshold={self.upper_fault_threshold:.2%}, "
            f"duration={self.suspension_duration}, "
            f"window_accesses={self.window_accesses}/{self.window_size})"
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
    decision_log: str = ""
    memory_state: Optional[List[Dict[str, Any]]] = None
    victim_info: Optional[Dict[str, Any]] = None

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
    simulation clock advancement, metrics tracking, Adaptive Hybrid
    Page Replacement with dynamic lambda parameter tuning, and Thrashing Control.

    Attributes:
        memory_manager (MemoryManager): Physical memory manager tracking frame states.
        processes (Dict[int, Process]): Map of process_id -> Process participating in simulation.
        metrics (PerformanceMetrics): Tracker for access counts, hits, faults, write-backs, and suspensions.
        clock (SimulationClock): Monotonically increasing clock incremented per memory access.
        controller (AdaptiveParameterController): Controller handling lambda tuning & delta cost.
        thrashing_controller (ThrashingController): Controller regulating thrashing & multiprogramming.
        scheduler (Optional[CpuScheduler]): Optional Round Robin CPU scheduler.
    """

    def __init__(
        self,
        memory_manager: MemoryManager,
        processes: Optional[Sequence[Process]] = None,
        metrics: Optional[PerformanceMetrics] = None,
        clock: Optional[SimulationClock] = None,
        controller: Optional[AdaptiveParameterController] = None,
        thrashing_controller: Optional[ThrashingController] = None,
        scheduler: Optional[Any] = None,
        window_size: int = 100,
        lambda_value: float = 0.5,
        delta: float = 2.0,
        upper_fault_threshold: float = 0.20,
        suspension_duration: int = 2,
        policy: Union[str, BasePageReplacementPolicy, Any] = PageReplacementPolicy.ADAPTIVE_HYBRID,
    ):
        """
        Initialize SimulationEngine.

        Args:
            memory_manager: Configured MemoryManager instance.
            processes: Optional initial collection of Process instances.
            metrics: Optional PerformanceMetrics instance (defaults to a new tracker).
            clock: Optional SimulationClock instance (defaults to a new clock starting at 0).
            controller: Optional AdaptiveParameterController (defaults to new instance).
            thrashing_controller: Optional ThrashingController (defaults to new instance).
            scheduler: Optional CpuScheduler instance.
            window_size: Access window N for lambda tuning & thrashing control (default 100).
            lambda_value: Initial lambda weighting parameter (default 0.5).
            delta: Dirty page penalty for eviction cost C(p) (default 2.0).
            upper_fault_threshold: Page fault rate threshold triggering thrashing suspension (default 0.20).
            suspension_duration: Number of windows a thrashing process remains suspended (default 2).
            policy: Page replacement policy: "AdaptiveHybrid", "FIFO", "LRU", "LFU", or policy object.
        """
        self.policy: Union[str, BasePageReplacementPolicy, Any] = policy
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

        if thrashing_controller is not None:
            self.thrashing_controller: ThrashingController = thrashing_controller
        else:
            self.thrashing_controller = ThrashingController(
                window_size=window_size,
                upper_fault_threshold=upper_fault_threshold,
                suspension_duration=suspension_duration,
                processes=self.processes,
                metrics=self.metrics,
            )

        self.scheduler: Optional[Any] = scheduler
        if self.scheduler is not None and getattr(self.scheduler, "engine", None) is None:
            self.scheduler.engine = self

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
        if hasattr(self, "thrashing_controller") and self.thrashing_controller is not None:
            self.thrashing_controller.window_size = int(val)

    @property
    def upper_fault_threshold(self) -> float:
        """Page fault rate threshold triggering thrashing suspension."""
        return self.thrashing_controller.upper_fault_threshold

    @upper_fault_threshold.setter
    def upper_fault_threshold(self, val: float) -> None:
        self.thrashing_controller.upper_fault_threshold = float(val)

    def add_process(self, process: Process) -> None:
        """Registers a process with the simulation engine."""
        self.processes[process.process_id] = process

    def get_process(self, process_id: int) -> Optional[Process]:
        """Looks up a registered process by ID."""
        return self.processes.get(process_id)

    def _select_victim(self) -> int:
        """
        Selects a victim frame for eviction using the configured page replacement policy.

        Supports:
        - "AdaptiveHybrid" (or "hybrid"): Cost-based C(p) victim selection with dirty penalty.
        - "FIFO": First-In, First-Out eviction based on initial page load_time.
        - "LRU": Least Recently Used eviction based on last_referenced_time.
        - "LFU": Least Frequently Used eviction based on access_count frequency.
        - Custom policy objects or callables implementing select_victim(engine) or __call__(engine).

        Returns:
            int: The physical frame ID chosen for eviction.
        """
        if not self.memory_manager.occupied_frames:
            raise RuntimeError("Cannot select victim: no memory frames are currently occupied.")

        # Check if policy provides a custom select_victim method
        if hasattr(self.policy, "select_victim") and callable(self.policy.select_victim):
            return int(self.policy.select_victim(self))
        if callable(self.policy) and not isinstance(self.policy, type):
            return int(self.policy(self))

        policy_key = str(self.policy).strip().upper().replace("-", "").replace("_", "")
        if "FIFO" in policy_key:
            return self._select_victim_fifo()
        elif "LFU" in policy_key:
            return self._select_victim_lfu()
        elif "LRU" in policy_key:
            return self._select_victim_lru()
        elif "HYBRID" in policy_key or "ADAPTIVE" in policy_key:
            return self._select_victim_hybrid()
        else:
            raise ValueError(f"Unknown page replacement policy: '{self.policy}'")

    def _select_victim_fifo(self) -> int:
        """
        First-In, First-Out (FIFO) Page Replacement.
        Evicts the frame holding the page that arrived in physical memory earliest (smallest load_time).
        Deterministic tie-breaker: lowest frame_id.
        """
        if not self.memory_manager.occupied_frames:
            raise RuntimeError("Cannot select victim: no memory frames are currently occupied.")
        candidates = []
        for frame_id in self.memory_manager.occupied_frames:
            frame = self.memory_manager.get_frame(frame_id)
            candidates.append((frame.load_time, frame.frame_id, frame.page_number))
        best_candidate = min(candidates, key=lambda c: (c[0], c[1]))
        self._last_victim_info = {
            "policy": "FIFO",
            "frame_id": best_candidate[1],
            "page_number": best_candidate[2],
            "load_time": best_candidate[0],
        }
        return best_candidate[1]

    def _select_victim_lru(self) -> int:
        """
        Least Recently Used (LRU) Page Replacement.
        Evicts the frame referenced least recently (smallest last_referenced_time timestamp).
        Deterministic tie-breaker: lowest frame_id.
        """
        if not self.memory_manager.occupied_frames:
            raise RuntimeError("Cannot select victim: no memory frames are currently occupied.")
        candidates = []
        for frame_id in self.memory_manager.occupied_frames:
            frame = self.memory_manager.get_frame(frame_id)
            candidates.append((frame.last_referenced_time, frame.frame_id, frame.page_number))
        best_candidate = min(candidates, key=lambda c: (c[0], c[1]))
        self._last_victim_info = {
            "policy": "LRU",
            "frame_id": best_candidate[1],
            "page_number": best_candidate[2],
            "last_referenced_time": best_candidate[0],
        }
        return best_candidate[1]

    def _select_victim_lfu(self) -> int:
        """
        Least Frequently Used (LFU) Page Replacement.
        Evicts the frame with the lowest access count / reference frequency.
        Tie-breakers: oldest last_referenced_time (LRU tie-breaker), then lowest frame_id.
        """
        if not self.memory_manager.occupied_frames:
            raise RuntimeError("Cannot select victim: no memory frames are currently occupied.")
        candidates = []
        for frame_id in self.memory_manager.occupied_frames:
            frame = self.memory_manager.get_frame(frame_id)
            candidates.append((frame.access_count, frame.last_referenced_time, frame.frame_id, frame.page_number))
        best_candidate = min(candidates, key=lambda c: (c[0], c[1], c[2]))
        self._last_victim_info = {
            "policy": "LFU",
            "frame_id": best_candidate[2],
            "page_number": best_candidate[3],
            "access_count": best_candidate[0],
        }
        return best_candidate[2]

    def _select_victim_hybrid(self) -> int:
        """
        Adaptive Hybrid Page Replacement victim selection.

        Calculates each candidate's decayed hybrid score:
        S(p) = S_old * (1/2)^(lambda * Delta t), and total cost:
        C(p) = S(p) + (delta if dirty else 0).
        Evicts frame with minimum C(p). Oldest last_referenced_time on tie.
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

            candidates.append((
                round(total_cost, 9),
                frame.last_referenced_time,
                frame.frame_id,
                frame.page_number,
                s_decayed,
                dirty_penalty,
            ))

        best_candidate = min(candidates, key=lambda c: (c[0], c[1], c[2]))
        self._last_victim_info = {
            "policy": "AdaptiveHybrid",
            "frame_id": best_candidate[2],
            "page_number": best_candidate[3],
            "cost": float(best_candidate[0]),
            "s_decayed": float(best_candidate[4]),
            "dirty_penalty": float(best_candidate[5]),
            "lambda": float(self.lambda_value),
        }
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
            frame.access_count += 1
            frame.reference_bit = True

            entry.hybrid_score = new_score

            # If write access, set dirty bit on both page table entry and frame
            if is_write:
                entry.dirty = True
                frame.dirty_bit = True

            self.metrics.page_hits += 1

            op_str = "WRITE" if is_write else "READ"
            decision_log = (
                f"Page {page_number} resident in Frame {frame_id} (HIT). "
                f"Operation: {op_str}. S(p) updated to {new_score:.4f}."
            )

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
                decision_log=decision_log,
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
                    load_time=current_time,
                    access_count=1,
                )
                if frame_id is None:
                    raise RuntimeError("Failed to allocate frame despite memory not being full.")

                frame = self.memory_manager.get_frame(frame_id)
                frame.last_referenced_time = current_time
                frame.load_time = current_time
                frame.access_count = 1
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

                decision_log = (
                    f"Page {page_number} not in memory (FAULT). "
                    f"Frame {frame_id} free; allocated and loaded Page {page_number} without eviction."
                )

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
                    decision_log=decision_log,
                )

            else:
                # Case B: Memory full -> Select victim using configured policy
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
                    load_time=current_time,
                    access_count=1,
                )

                victim_frame.last_referenced_time = current_time
                victim_frame.load_time = current_time
                victim_frame.access_count = 1
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

                # Format decision log with exact math for AdaptiveHybrid and others
                policy_name = getattr(self.policy, "name", str(self.policy))
                policy_upper = str(policy_name).upper()

                if "HYBRID" in policy_upper or "ADAPTIVE" in policy_upper:
                    cost_val = 1.0
                    if hasattr(self, "_last_victim_info") and "cost" in self._last_victim_info:
                        cost_val = self._last_victim_info["cost"]
                    decision_log = (
                        f"Memory full. Calculated C(p). Page {evicted_page} had lowest cost ({cost_val:.2f}). "
                        f"Evicted Page {evicted_page}. λ is currently {self.lambda_value:.2f}."
                    )
                elif "FIFO" in policy_upper:
                    decision_log = f"Memory full (FIFO). Page {evicted_page} in Frame {victim_frame_id} arrived earliest. Evicted Page {evicted_page}."
                elif "LRU" in policy_upper:
                    decision_log = f"Memory full (LRU). Page {evicted_page} in Frame {victim_frame_id} was least recently used. Evicted Page {evicted_page}."
                elif "LFU" in policy_upper:
                    decision_log = f"Memory full (LFU). Page {evicted_page} in Frame {victim_frame_id} had lowest frequency. Evicted Page {evicted_page}."
                else:
                    decision_log = f"Memory full. Evicted Page {evicted_page} from Frame {victim_frame_id}."

                if was_dirty:
                    decision_log += " (Dirty write-back occurred)."

                vinfo = dict(self._last_victim_info) if hasattr(self, "_last_victim_info") and self._last_victim_info else None
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
                    decision_log=decision_log,
                    victim_info=vinfo,
                )

        # 5. Parameter Controller window tracking & dynamic lambda tuning
        self.controller.record_access(is_fault=not is_hit)
        self.thrashing_controller.record_access(
            process_id=proc.process_id,
            is_fault=not is_hit,
            processes=self.processes,
            metrics=self.metrics,
        )

        # Attach memory snapshot to result
        result.memory_state = self.get_memory_snapshot()

        return result

    def get_memory_snapshot(self) -> List[Dict[str, Any]]:
        """Returns snapshot of physical memory frames at current step with live real-time decay."""
        snapshot = []
        current_time = self.clock.current_time()
        lambda_val = float(getattr(self, "lambda_value", 0.5))
        delta_val = float(getattr(self, "delta", 2.0))

        for i in range(self.memory_manager.frame_count):
            frame = self.memory_manager.get_frame(i)
            live_Sp = 0.0
            live_Cp = 0.0
            if frame.is_occupied:
                delta_t = max(0.0, float(current_time - frame.last_referenced_time))
                power = lambda_val * delta_t
                if power > 700:
                    live_Sp = 0.0
                else:
                    live_Sp = float(frame.hybrid_score) * (0.5 ** power)

                is_dirty = bool(frame.dirty_bit)
                if not is_dirty and frame.process_id is not None and frame.page_number is not None:
                    owner = self.get_process(frame.process_id)
                    if owner:
                        entry = owner.get_page_entry(frame.page_number)
                        if entry and entry.dirty:
                            is_dirty = True
                live_Cp = live_Sp + (delta_val if is_dirty else 0.0)

            snapshot.append({
                "frame_id": frame.frame_id,
                "is_occupied": bool(frame.is_occupied),
                "is_free": bool(frame.is_free),
                "page_number": frame.page_number,
                "process_id": frame.process_id,
                "dirty": bool(frame.dirty_bit),
                "hybrid_score": round(float(frame.hybrid_score), 4),
                "live_Sp": round(live_Sp, 4),
                "live_Cp": round(live_Cp, 4),
                "live_sp": round(live_Sp, 4),
                "live_cp": round(live_Cp, 4),
                "access_count": int(frame.access_count),
                "last_referenced_time": int(frame.last_referenced_time),
                "load_time": int(frame.load_time),
                "reference_bit": bool(frame.reference_bit),
            })
        return snapshot

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

    def run_scheduler(
        self,
        scheduler: Optional[Any] = None,
        max_turns: Optional[int] = None,
        max_accesses: Optional[int] = None,
    ) -> List[AccessResult]:
        """
        Executes Round Robin multiprogramming via the specified or default CpuScheduler.

        Returns:
            List[AccessResult]: Log of all executed memory references.
        """
        sched = scheduler if scheduler is not None else self.scheduler
        if sched is None:
            raise ValueError("No CpuScheduler specified for simulation engine.")
        return sched.run(engine=self, max_turns=max_turns, max_accesses=max_accesses)

    def reset(self) -> None:
        """Resets engine clock, metrics, physical memory, controllers, and all process page tables."""
        self.clock.reset()
        self.metrics.reset()
        self.memory_manager.reset()
        self.controller.reset()
        if hasattr(self, "thrashing_controller") and self.thrashing_controller is not None:
            self.thrashing_controller.reset()
        for proc in self.processes.values():
            proc.page_table.clear()
            proc.is_suspended = False
            proc.suspension_timer = 0

