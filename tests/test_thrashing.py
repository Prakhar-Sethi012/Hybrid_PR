"""
Unit tests for Stage 4: ThrashingController, Per-Process Fault Rate Tracking,
Process Suspension, and Multiprogrammed Cooling Recovery.
"""

import unittest
from src.process import Process
from src.memory import MemoryManager
from src.engine import (
    PerformanceMetrics,
    SimulationEngine,
    ThrashingController,
)
from src.scheduler import CpuScheduler


class TestThrashingController(unittest.TestCase):
    def setUp(self):
        self.p1 = Process(process_id=1, name="Worker-A")
        self.p2 = Process(process_id=2, name="Worker-B")

    def test_thrashing_controller_initialization_and_validation(self):
        ctrl = ThrashingController(window_size=50, upper_fault_threshold=0.25, suspension_duration=3)
        self.assertEqual(ctrl.window_size, 50)
        self.assertEqual(ctrl.upper_fault_threshold, 0.25)
        self.assertEqual(ctrl.suspension_duration, 3)
        self.assertEqual(ctrl.window_accesses, 0)

        # Validation errors
        with self.assertRaises(ValueError):
            ThrashingController(window_size=0)
        with self.assertRaises(ValueError):
            ThrashingController(upper_fault_threshold=-0.1)
        with self.assertRaises(ValueError):
            ThrashingController(upper_fault_threshold=1.5)
        with self.assertRaises(ValueError):
            ThrashingController(suspension_duration=0)

    def test_metrics_thrashing_suspensions_tracking(self):
        metrics = PerformanceMetrics()
        self.assertEqual(metrics.thrashing_suspensions, 0)

        metrics.thrashing_suspensions += 2
        self.assertEqual(metrics.thrashing_suspensions, 2)
        d = metrics.to_dict()
        self.assertEqual(d["thrashing_suspensions"], 2)
        self.assertIn("suspensions=2", repr(metrics))

        metrics.reset()
        self.assertEqual(metrics.thrashing_suspensions, 0)

    def test_thrashing_process_gets_suspended(self):
        """
        Proves: When an active process's page fault rate r_i exceeds upper_fault_threshold
        at the end of window N, it is flagged as thrashing, is_suspended is set to True,
        suspension_timer is set to 2, and metrics.thrashing_suspensions is incremented.
        """
        mem = MemoryManager(frame_count=4)
        engine = SimulationEngine(
            memory_manager=mem,
            processes=[self.p1],
            window_size=10,
            upper_fault_threshold=0.20,
            suspension_duration=2,
        )

        # Execute 10 distinct memory accesses for p1 -> 10 faults out of 10 accesses
        # Fault rate r_1 = 10 / 10 = 1.0 > 0.20
        for i in range(10):
            engine.execute_access(self.p1, page_number=100 + i)

        # At the 10th access, window N (10) completes and ThrashingController evaluates
        self.assertTrue(self.p1.is_suspended, "Process should be suspended after thrashing")
        self.assertEqual(self.p1.suspension_timer, 2, "Suspension timer must be initialized to 2")
        self.assertEqual(engine.metrics.thrashing_suspensions, 1)

        # Verify history log in thrashing controller
        self.assertEqual(len(engine.thrashing_controller.suspension_history), 1)
        log = engine.thrashing_controller.suspension_history[0]
        self.assertEqual(log["window"], 1)
        self.assertEqual(log["newly_suspended"], [1])
        self.assertAlmostEqual(log["fault_rates"][1], 1.0)

    def test_non_thrashing_process_remains_active(self):
        """
        A well-behaved process with fault rate <= upper_fault_threshold is NOT suspended.
        """
        mem = MemoryManager(frame_count=4)
        engine = SimulationEngine(
            memory_manager=mem,
            processes=[self.p1],
            window_size=10,
            upper_fault_threshold=0.20,
        )

        # 1 fault, followed by 9 hits to the resident page
        # Fault rate r_1 = 1 / 10 = 0.10 <= 0.20
        engine.execute_access(self.p1, page_number=1)  # Fault
        for _ in range(9):
            engine.execute_access(self.p1, page_number=1)  # Hits

        # Window completes
        self.assertFalse(self.p1.is_suspended)
        self.assertEqual(self.p1.suspension_timer, 0)
        self.assertEqual(engine.metrics.thrashing_suspensions, 0)

    def test_recovery_after_two_cooling_windows(self):
        """
        Proves: A suspended process stays suspended for exactly 2 windows,
        having suspension_timer decremented at the end of each window,
        and is un-suspended (is_suspended = False) when timer hits 0.
        """
        mem = MemoryManager(frame_count=4)
        engine = SimulationEngine(
            memory_manager=mem,
            processes=[self.p1, self.p2],
            window_size=10,
            upper_fault_threshold=0.20,
            suspension_duration=2,
        )

        # Window 1: P1 causes 10 faults in 10 accesses -> suspended at window end
        for i in range(10):
            engine.execute_access(self.p1, page_number=i)

        self.assertTrue(self.p1.is_suspended)
        self.assertEqual(self.p1.suspension_timer, 2)

        # Window 2: P2 runs 10 accesses with 0 faults (resident page access)
        # P1 sits out during Window 2.
        # At the end of Window 2, P1's timer decrements from 2 to 1 (still suspended).
        engine.execute_access(self.p2, page_number=50)  # Initial fault
        for _ in range(9):
            engine.execute_access(self.p2, page_number=50)  # Hits

        self.assertTrue(self.p1.is_suspended, "P1 must remain suspended after 1 cooling window")
        self.assertEqual(self.p1.suspension_timer, 1)

        # Window 3: P2 runs another 10 accesses with 0 faults.
        # P1 sits out during Window 3.
        # At the end of Window 3, P1's timer decrements from 1 to 0 -> is_suspended = False!
        for _ in range(10):
            engine.execute_access(self.p2, page_number=50)

        self.assertFalse(self.p1.is_suspended, "P1 must be recovered when suspension_timer hits 0")
        self.assertEqual(self.p1.suspension_timer, 0)

    def test_multiprogramming_round_robin_with_thrashing_and_recovery(self):
        """
        Complete Stage 4 integration test:
        1. Two processes (P1 and P2) orchestrated by CpuScheduler with time_quantum = 5.
        2. Window size N = 10.
        3. Turn 1 (P1): 5 accesses (all page faults -> 5 faults).
        4. Turn 2 (P2): 5 accesses (all page hits to loaded page -> 0 faults).
        5. At access 10, Window 1 completes:
           P1 has fault rate r_1 = 5/5 = 1.0 > 0.20 -> P1 suspended (timer=2)!
           P2 has fault rate r_2 = 0/5 = 0.0 <= 0.20 -> P2 active.
        6. In subsequent turns, the Round Robin scheduler skips suspended P1.
        7. P2 runs alone for Window 2 and Window 3.
        8. At the end of Window 3, P1's timer expires and P1 resumes execution.
        """
        mem = MemoryManager(frame_count=8)
        engine = SimulationEngine(
            memory_manager=mem,
            processes=[self.p1, self.p2],
            window_size=10,
            upper_fault_threshold=0.20,
            suspension_duration=2,
        )
        scheduler = CpuScheduler(
            processes=[self.p1, self.p2],
            time_quantum=5,
            engine=engine,
        )

        # Pre-load page 99 for P2 so all its accesses in window 1 are hits
        engine.execute_access(self.p2, page_number=99)
        # Reset window tracking for clean test
        engine.controller.reset()
        engine.thrashing_controller.reset()
        engine.metrics.reset()

        # P1 trace: 5 thrashing faults for turn 1, then more for later
        p1_trace = [1, 2, 3, 4, 5, 6, 7]
        # P2 trace: repetitive hits to page 99
        p2_trace = [99] * 25

        scheduler.assign_trace(self.p1, p1_trace)
        scheduler.assign_trace(self.p2, p2_trace)

        # Step 1: P1 executes 5 accesses (pages 1, 2, 3, 4, 5) -> all faults
        turn1 = scheduler.step()
        self.assertEqual(len(turn1), 5)
        self.assertEqual(turn1[0].process_id, 1)
        self.assertFalse(self.p1.is_suspended)  # Window not yet reached (5/10 accesses)

        # Step 2: P2 executes 5 accesses (page 99) -> all hits
        turn2 = scheduler.step()
        self.assertEqual(len(turn2), 5)
        self.assertEqual(turn2[0].process_id, 2)

        # Access 10 completed! Window 1 ends!
        # P1 fault rate: 5 / 5 = 100% > 20% -> Flagged as thrashing!
        self.assertTrue(self.p1.is_suspended, "P1 must be suspended due to thrashing")
        self.assertEqual(self.p1.suspension_timer, 2)
        self.assertEqual(engine.metrics.thrashing_suspensions, 1)

        # Step 3: Next turn -> scheduler MUST skip suspended P1 and pick P2!
        next_proc = scheduler.get_next_process()
        self.assertEqual(next_proc, self.p2, "Scheduler must skip suspended P1 and select P2")

        # Execute Window 2 via P2 (10 accesses)
        turn3 = scheduler.step()  # 5 accesses
        turn4 = scheduler.step()  # 5 accesses (access 20 reached, Window 2 ends)
        self.assertEqual(self.p1.suspension_timer, 1, "P1 suspension timer should decrement to 1")
        self.assertTrue(self.p1.is_suspended)

        # Execute Window 3 via P2 (10 accesses)
        turn5 = scheduler.step()  # 5 accesses
        turn6 = scheduler.step()  # 5 accesses (access 30 reached, Window 3 ends)

        # Window 3 ends: P1 timer hits 0 -> recovered!
        self.assertFalse(self.p1.is_suspended, "P1 must be recovered at the end of window 3")
        self.assertEqual(self.p1.suspension_timer, 0)

        # Step 7: Scheduler picks up P1 again!
        next_proc_after_cooling = scheduler.get_next_process(check_has_trace=True)
        self.assertEqual(next_proc_after_cooling, self.p1, "Scheduler must pick P1 back up after cooling")

        turn7 = scheduler.step()
        self.assertEqual(turn7[0].process_id, 1)
        self.assertEqual([r.page_number for r in turn7], [6, 7])

    def test_engine_reset_clears_thrashing_state(self):
        mem = MemoryManager(frame_count=4)
        engine = SimulationEngine(
            memory_manager=mem,
            processes=[self.p1],
            window_size=5,
            upper_fault_threshold=0.20,
        )
        for i in range(5):
            engine.execute_access(self.p1, page_number=i)

        self.assertTrue(self.p1.is_suspended)
        self.assertEqual(engine.metrics.thrashing_suspensions, 1)

        engine.reset()
        self.assertFalse(self.p1.is_suspended)
        self.assertEqual(self.p1.suspension_timer, 0)
        self.assertEqual(engine.metrics.thrashing_suspensions, 0)
        self.assertEqual(engine.thrashing_controller.window_accesses, 0)


if __name__ == "__main__":
    unittest.main()
