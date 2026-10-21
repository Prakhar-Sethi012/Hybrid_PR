"""
CPU Scheduler and Multiprogramming Orchestration Module.
Stage 4: Round Robin Scheduler with Thrashing-Aware Process Suspension.

Provides:
- CpuScheduler: Round Robin scheduler that cycles through multiprogrammed processes,
  enforcing time quantum limits and skipping any processes flagged as suspended.
"""

from typing import Any, Dict, List, Optional, Sequence, Tuple, Union, TYPE_CHECKING

from .process import Process

if TYPE_CHECKING:
    from .engine import SimulationEngine, AccessResult


class CpuScheduler:
    """
    Round Robin CPU Scheduler orchestrating multiprogrammed memory references.

    Attributes:
        processes (List[Process]): Ordered collection of processes scheduled for CPU turns.
        time_quantum (int): Maximum memory accesses per turn for a process (default 5).
        engine (Optional[SimulationEngine]): Associated simulation engine.
    """

    def __init__(
        self,
        processes: Optional[Sequence[Process]] = None,
        time_quantum: int = 5,
        engine: Optional["SimulationEngine"] = None,
    ):
        """
        Initialize the Round Robin CPU Scheduler.

        Args:
            processes: Optional list of Process instances participating in multiprogramming.
            time_quantum: Number of memory accesses allowed per process turn (default 5).
            engine: Optional SimulationEngine instance for executing memory references.
        """
        if time_quantum <= 0:
            raise ValueError(f"time_quantum must be a positive integer, got {time_quantum}")

        self.processes: List[Process] = list(processes) if processes is not None else []
        self.time_quantum: int = int(time_quantum)
        self.engine: Optional["SimulationEngine"] = engine

        self._current_index: int = 0
        self._traces: Dict[int, List[Union[int, Tuple[int, bool]]]] = {}

    def add_process(
        self,
        process: Process,
        trace: Optional[Sequence[Union[int, Tuple[int, bool]]]] = None,
    ) -> None:
        """
        Adds a process to the scheduler and optionally registers its memory access trace.
        """
        if process not in self.processes:
            self.processes.append(process)
        if trace is not None:
            self.assign_trace(process, trace)
        if self.engine is not None and process.process_id not in self.engine.processes:
            self.engine.add_process(process)

    def remove_process(self, process: Union[Process, int]) -> Optional[Process]:
        """Removes a process from the scheduler."""
        pid = process.process_id if isinstance(process, Process) else int(process)
        found: Optional[Process] = None
        for i, p in enumerate(self.processes):
            if p.process_id == pid:
                found = self.processes.pop(i)
                break
        self._traces.pop(pid, None)
        if len(self.processes) > 0:
            self._current_index = self._current_index % len(self.processes)
        else:
            self._current_index = 0
        return found

    def get_process(self, process_id: int) -> Optional[Process]:
        """Looks up a registered process by ID."""
        for p in self.processes:
            if p.process_id == process_id:
                return p
        return None

    def assign_trace(
        self,
        process: Union[Process, int],
        trace: Sequence[Union[int, Tuple[int, bool]]],
    ) -> None:
        """Assigns or replaces a memory access trace for a process."""
        pid = process.process_id if isinstance(process, Process) else int(process)
        self._traces[pid] = list(trace)

    def get_remaining_trace(self, process: Union[Process, int]) -> List[Union[int, Tuple[int, bool]]]:
        """Returns the pending memory reference trace for a process."""
        pid = process.process_id if isinstance(process, Process) else int(process)
        return list(self._traces.get(pid, []))

    def has_pending_accesses(self, process: Optional[Union[Process, int]] = None) -> bool:
        """Checks if a specific process (or any process) has pending memory references."""
        if process is not None:
            pid = process.process_id if isinstance(process, Process) else int(process)
            return len(self._traces.get(pid, [])) > 0
        return any(len(t) > 0 for t in self._traces.values())

    def get_next_process(self, check_has_trace: bool = False) -> Optional[Process]:
        """
        Selects the next eligible process in Round Robin order.

        Crucial requirement:
        Skips any process where is_suspended == True.

        Args:
            check_has_trace: If True, also skips processes that have no pending trace accesses.

        Returns:
            Optional[Process]: The next eligible Process, or None if no runnable process is available.
        """
        n = len(self.processes)
        if n == 0:
            return None

        # Check up to n processes in circular order starting from _current_index
        for step in range(n):
            idx = (self._current_index + step) % n
            proc = self.processes[idx]

            # Crucial: Must skip any process where is_suspended == True
            if proc.is_suspended:
                continue

            # If check_has_trace is requested, skip processes with exhausted traces
            if check_has_trace and not self.has_pending_accesses(proc):
                continue

            # Advance index for the next call
            self._current_index = (idx + 1) % n
            return proc

        return None

    def step(self, engine: Optional["SimulationEngine"] = None) -> Optional[List[Any]]:
        """
        Executes a single Round Robin turn (up to time_quantum accesses) for the next eligible process.

        If the process becomes suspended during this turn (e.g. thrashing detected at window end),
        the quantum immediately terminates and CPU yields.

        Returns:
            Optional[List[AccessResult]]: List of access results for this turn, or None if no process is eligible.
        """
        eng = engine if engine is not None else self.engine
        if eng is None:
            raise ValueError("SimulationEngine must be provided to execute scheduler step.")

        proc = self.get_next_process(check_has_trace=True)
        if proc is None:
            return None

        trace = self._traces.get(proc.process_id, [])
        results: List[Any] = []

        for _ in range(self.time_quantum):
            if proc.is_suspended or not trace:
                break

            item = trace.pop(0)
            if isinstance(item, tuple) and len(item) == 2:
                page_num, is_write = item
            else:
                page_num, is_write = int(item), False

            res = eng.execute_access(proc, page_number=page_num, is_write=is_write)
            results.append(res)

            # If suspended due to thrashing threshold crossed, stop turn immediately
            if proc.is_suspended:
                break

        return results

    def run(
        self,
        engine: Optional["SimulationEngine"] = None,
        max_turns: Optional[int] = None,
        max_accesses: Optional[int] = None,
    ) -> List[Any]:
        """
        Runs the Round Robin scheduler until all process traces are completed,
        or until limits (max_turns, max_accesses) are reached.

        Returns:
            List[AccessResult]: Complete log of executed memory references.
        """
        eng = engine if engine is not None else self.engine
        if eng is None:
            raise ValueError("SimulationEngine must be provided to run scheduler.")

        all_results: List[Any] = []
        turns = 0

        while self.has_pending_accesses():
            if max_turns is not None and turns >= max_turns:
                break
            if max_accesses is not None and len(all_results) >= max_accesses:
                break

            turn_results = self.step(engine=eng)
            if turn_results is None:
                # No runnable process at the moment (e.g. all remaining processes are suspended)
                break

            all_results.extend(turn_results)
            turns += 1

        return all_results

    def reset(self) -> None:
        """Resets the scheduler state, clearing traces and resetting current index."""
        self._current_index = 0
        self._traces.clear()
        for p in self.processes:
            p.is_suspended = False
            p.suspension_timer = 0

    def __iter__(self):
        return self

    def __next__(self) -> Process:
        proc = self.get_next_process()
        if proc is None:
            raise StopIteration
        return proc

    def __len__(self) -> int:
        return len(self.processes)

    def __repr__(self) -> str:
        return (
            f"CpuScheduler(processes={len(self.processes)}, "
            f"time_quantum={self.time_quantum}, "
            f"current_index={self._current_index})"
        )
