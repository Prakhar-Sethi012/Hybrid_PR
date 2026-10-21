"""
Unit tests for Stage 4: CpuScheduler and Round Robin Multiprogramming.
"""

import unittest
from src.process import Process
from src.memory import MemoryManager
from src.engine import SimulationEngine
from src.scheduler import CpuScheduler


class TestCpuScheduler(unittest.TestCase):
    def setUp(self):
        self.p1 = Process(process_id=1, name="Worker-1")
        self.p2 = Process(process_id=2, name="Worker-2")
        self.p3 = Process(process_id=3, name="Worker-3")

    def test_scheduler_initialization_and_validation(self):
        sched = CpuScheduler(processes=[self.p1, self.p2], time_quantum=5)
        self.assertEqual(len(sched), 2)
        self.assertEqual(sched.time_quantum, 5)
        self.assertEqual(sched.get_process(1), self.p1)
        self.assertEqual(sched.get_process(2), self.p2)

        # Invalid quantum
        with self.assertRaises(ValueError):
            CpuScheduler(time_quantum=0)
        with self.assertRaises(ValueError):
            CpuScheduler(time_quantum=-5)

    def test_round_robin_cycling(self):
        sched = CpuScheduler(processes=[self.p1, self.p2, self.p3], time_quantum=5)

        # First cycle
        self.assertEqual(sched.get_next_process(), self.p1)
        self.assertEqual(sched.get_next_process(), self.p2)
        self.assertEqual(sched.get_next_process(), self.p3)

        # Second cycle wraps around
        self.assertEqual(sched.get_next_process(), self.p1)
        self.assertEqual(sched.get_next_process(), self.p2)
        self.assertEqual(sched.get_next_process(), self.p3)

    def test_skipping_suspended_processes(self):
        sched = CpuScheduler(processes=[self.p1, self.p2, self.p3], time_quantum=5)

        # Suspend Worker-2
        self.p2.is_suspended = True

        # Scheduler must skip Worker-2 completely
        picked = [sched.get_next_process() for _ in range(6)]
        expected = [self.p1, self.p3, self.p1, self.p3, self.p1, self.p3]
        self.assertEqual(picked, expected)

        # Check all picked were non-suspended
        for p in picked:
            self.assertFalse(p.is_suspended)

    def test_all_processes_suspended_returns_none(self):
        sched = CpuScheduler(processes=[self.p1, self.p2], time_quantum=5)
        self.p1.is_suspended = True
        self.p2.is_suspended = True

        # When all processes are suspended, scheduler returns None
        self.assertIsNone(sched.get_next_process())

    def test_process_resumption_rejoins_rotation(self):
        sched = CpuScheduler(processes=[self.p1, self.p2], time_quantum=5)

        # Turn 1: P1
        self.assertEqual(sched.get_next_process(), self.p1)

        # P2 suspended
        self.p2.is_suspended = True
        # Turn 2: P1 again (P2 skipped)
        self.assertEqual(sched.get_next_process(), self.p1)

        # P2 is unsuspended / recovered
        self.p2.is_suspended = False

        # Turn 3: P2 gets its turn
        self.assertEqual(sched.get_next_process(), self.p2)
        # Turn 4: P1 gets its turn
        self.assertEqual(sched.get_next_process(), self.p1)

    def test_step_execution_with_time_quantum(self):
        mem = MemoryManager(frame_count=10)
        engine = SimulationEngine(memory_manager=mem, processes=[self.p1, self.p2])
        sched = CpuScheduler(processes=[self.p1, self.p2], time_quantum=3, engine=engine)

        # Trace of 7 accesses for P1, 5 accesses for P2
        sched.assign_trace(self.p1, [10, 11, 12, 13, 14, 15, 16])
        sched.assign_trace(self.p2, [20, 21, 22, 23, 24])

        # Step 1: P1 runs 3 accesses (quantum = 3)
        res1 = sched.step()
        self.assertEqual(len(res1), 3)
        self.assertEqual([r.page_number for r in res1], [10, 11, 12])
        self.assertEqual([r.process_id for r in res1], [1, 1, 1])

        # Step 2: P2 runs 3 accesses
        res2 = sched.step()
        self.assertEqual(len(res2), 3)
        self.assertEqual([r.page_number for r in res2], [20, 21, 22])
        self.assertEqual([r.process_id for r in res2], [2, 2, 2])

        # Step 3: P1 runs 3 accesses (13, 14, 15)
        res3 = sched.step()
        self.assertEqual(len(res3), 3)
        self.assertEqual([r.page_number for r in res3], [13, 14, 15])

        # Step 4: P2 runs remaining 2 accesses (23, 24)
        res4 = sched.step()
        self.assertEqual(len(res4), 2)
        self.assertEqual([r.page_number for r in res4], [23, 24])

        # Step 5: P1 runs remaining 1 access (16)
        res5 = sched.step()
        self.assertEqual(len(res5), 1)
        self.assertEqual(res5[0].page_number, 16)

        # Both traces exhausted
        self.assertFalse(sched.has_pending_accesses())
        self.assertIsNone(sched.step())

    def test_run_orchestration(self):
        mem = MemoryManager(frame_count=8)
        engine = SimulationEngine(memory_manager=mem, processes=[self.p1, self.p2])
        sched = CpuScheduler(processes=[self.p1, self.p2], time_quantum=4, engine=engine)

        sched.assign_trace(self.p1, [1, 2, 3, 4, 5])
        sched.assign_trace(self.p2, [10, 11, 12])

        all_results = sched.run()
        self.assertEqual(len(all_results), 8)
        self.assertEqual(engine.metrics.total_accesses, 8)
        self.assertFalse(sched.has_pending_accesses())

    def test_process_management_methods(self):
        sched = CpuScheduler(processes=[self.p1], time_quantum=5)
        sched.add_process(self.p2, trace=[10, 20])
        self.assertEqual(len(sched), 2)
        self.assertTrue(sched.has_pending_accesses(self.p2))

        removed = sched.remove_process(1)
        self.assertEqual(removed, self.p1)
        self.assertEqual(len(sched), 1)
        self.assertEqual(sched.get_next_process(), self.p2)


if __name__ == "__main__":
    unittest.main()
