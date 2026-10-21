"""
Unit tests for Stage 2: SimulationEngine, SimulationClock, PerformanceMetrics, and Access Handler.
"""

import unittest
from src.engine import (
    AccessResult,
    PerformanceMetrics,
    SimulationClock,
    SimulationEngine,
)
from src.memory import MemoryManager
from src.process import Process


class TestSimulationClock(unittest.TestCase):
    def test_clock_increment(self):
        clock = SimulationClock(initial_time=0)
        self.assertEqual(clock.current_time(), 0)
        self.assertEqual(clock.tick(), 1)
        self.assertEqual(clock.tick(), 2)
        self.assertEqual(clock.tick(), 3)
        self.assertEqual(clock.current_time(), 3)
        self.assertEqual(int(clock), 3)

    def test_clock_reset(self):
        clock = SimulationClock(initial_time=10)
        self.assertEqual(clock.current_time(), 10)
        clock.tick()
        clock.reset(initial_time=0)
        self.assertEqual(clock.current_time(), 0)


class TestPerformanceMetrics(unittest.TestCase):
    def test_initial_metrics(self):
        metrics = PerformanceMetrics()
        self.assertEqual(metrics.total_accesses, 0)
        self.assertEqual(metrics.page_hits, 0)
        self.assertEqual(metrics.page_faults, 0)
        self.assertEqual(metrics.dirty_write_backs, 0)
        self.assertEqual(metrics.hit_ratio, 0.0)
        self.assertEqual(metrics.fault_ratio, 0.0)

    def test_ratios_and_reset(self):
        metrics = PerformanceMetrics(
            total_accesses=10,
            page_hits=7,
            page_faults=3,
            dirty_write_backs=1,
        )
        self.assertAlmostEqual(metrics.hit_ratio, 0.70)
        self.assertAlmostEqual(metrics.fault_ratio, 0.30)
        d = metrics.to_dict()
        self.assertEqual(d["page_hits"], 7)
        self.assertEqual(d["dirty_write_backs"], 1)

        metrics.reset()
        self.assertEqual(metrics.total_accesses, 0)
        self.assertEqual(metrics.page_hits, 0)
        self.assertEqual(metrics.page_faults, 0)
        self.assertEqual(metrics.dirty_write_backs, 0)


class TestSimulationEngine(unittest.TestCase):
    def setUp(self):
        self.mem = MemoryManager(frame_count=2)
        self.proc1 = Process(process_id=1, name="Proc-1")
        self.proc2 = Process(process_id=2, name="Proc-2")
        self.engine = SimulationEngine(
            memory_manager=self.mem,
            processes=[self.proc1, self.proc2],
        )

    def test_hit_fault_and_recency_clock(self):
        # Access 1: page 10 (read) -> FAULT (memory not full)
        res1 = self.engine.execute_access(self.proc1, page_number=10, is_write=False)
        self.assertFalse(res1.is_hit)
        self.assertEqual(res1.timestamp, 1)
        self.assertEqual(res1.frame_id, 0)
        self.assertEqual(self.engine.metrics.total_accesses, 1)
        self.assertEqual(self.engine.metrics.page_faults, 1)
        self.assertEqual(self.engine.metrics.page_hits, 0)
        self.assertTrue(self.proc1.is_page_valid(10))
        self.assertFalse(self.proc1.is_page_dirty(10))
        self.assertEqual(self.mem.get_frame(0).last_referenced_time, 1)

        # Access 2: page 10 (read) -> HIT
        res2 = self.engine.execute_access(self.proc1, page_number=10, is_write=False)
        self.assertTrue(res2.is_hit)
        self.assertEqual(res2.timestamp, 2)
        self.assertEqual(res2.frame_id, 0)
        self.assertEqual(self.engine.metrics.total_accesses, 2)
        self.assertEqual(self.engine.metrics.page_faults, 1)
        self.assertEqual(self.engine.metrics.page_hits, 1)
        # Recency updated
        self.assertEqual(self.mem.get_frame(0).last_referenced_time, 2)
        self.assertFalse(self.proc1.is_page_dirty(10))

        # Access 3: page 10 (write) -> HIT with dirty bit set
        res3 = self.engine.execute_access(self.proc1, page_number=10, is_write=True)
        self.assertTrue(res3.is_hit)
        self.assertEqual(res3.timestamp, 3)
        self.assertEqual(self.engine.metrics.total_accesses, 3)
        self.assertEqual(self.engine.metrics.page_hits, 2)
        self.assertTrue(self.proc1.is_page_dirty(10))
        self.assertTrue(self.mem.get_frame(0).dirty_bit)
        self.assertEqual(self.mem.get_frame(0).last_referenced_time, 3)

    def test_eviction_clean_page(self):
        # Fill memory (frame_count = 2)
        # Frame 0: page 10 (clean)
        self.engine.execute_access(self.proc1, page_number=10, is_write=False)
        # Frame 1: page 20 (clean)
        self.engine.execute_access(self.proc1, page_number=20, is_write=False)
        self.assertTrue(self.mem.is_full())
        self.assertEqual(self.engine.metrics.page_faults, 2)
        self.assertEqual(self.engine.metrics.dirty_write_backs, 0)

        # Access page 30 -> FAULT + EVICTION (Memory is full)
        # Dummy replacement picks lowest frame: Frame 0 (page 10)
        res = self.engine.execute_access(self.proc1, page_number=30, is_write=False)
        self.assertFalse(res.is_hit)
        self.assertEqual(res.frame_id, 0)
        self.assertEqual(res.evicted_page, 10)
        self.assertFalse(res.was_dirty_write_back)

        # Metrics check: 3 accesses, 3 faults, 0 dirty write backs (page 10 was clean)
        self.assertEqual(self.engine.metrics.total_accesses, 3)
        self.assertEqual(self.engine.metrics.page_faults, 3)
        self.assertEqual(self.engine.metrics.dirty_write_backs, 0)

        # Page table checks: page 10 must be invalid; page 30 must be valid in Frame 0
        self.assertFalse(self.proc1.is_page_valid(10))
        self.assertIsNone(self.proc1.get_page_entry(10).frame_number)
        self.assertTrue(self.proc1.is_page_valid(30))
        self.assertEqual(self.proc1.get_page_entry(30).frame_number, 0)

    def test_eviction_dirty_write_back(self):
        # Fill memory:
        # Frame 0: page 10 (written to, dirty=True)
        self.engine.execute_access(self.proc1, page_number=10, is_write=True)
        # Frame 1: page 20 (read only, dirty=False)
        self.engine.execute_access(self.proc1, page_number=20, is_write=False)
        self.assertTrue(self.mem.is_full())

        # Access page 30 -> Evicts Frame 0 (page 10) which is dirty!
        res = self.engine.execute_access(self.proc1, page_number=30, is_write=False)
        self.assertFalse(res.is_hit)
        self.assertEqual(res.evicted_page, 10)
        self.assertTrue(res.was_dirty_write_back)

        # Verify dirty_write_backs counter incremented
        self.assertEqual(self.engine.metrics.dirty_write_backs, 1)
        self.assertFalse(self.proc1.is_page_valid(10))
        self.assertTrue(self.proc1.is_page_valid(30))

    def test_multi_process_eviction(self):
        # Frame 0 allocated to Proc-1, page 100 (written to)
        self.engine.execute_access(self.proc1, page_number=100, is_write=True)
        # Frame 1 allocated to Proc-2, page 200
        self.engine.execute_access(self.proc2, page_number=200, is_write=False)
        self.assertTrue(self.mem.is_full())

        # Proc-2 accesses page 201 -> Evicts Frame 0 (Proc-1's dirty page 100)
        res = self.engine.execute_access(self.proc2, page_number=201, is_write=False)
        self.assertFalse(res.is_hit)
        self.assertEqual(res.evicted_process_id, 1)
        self.assertEqual(res.evicted_page, 100)
        self.assertTrue(res.was_dirty_write_back)
        self.assertEqual(self.engine.metrics.dirty_write_backs, 1)

        # Proc-1's page table has 100 invalidated
        self.assertFalse(self.proc1.is_page_valid(100))
        # Proc-2's page table has 201 mapped to Frame 0
        self.assertTrue(self.proc2.is_page_valid(201))
        self.assertEqual(self.proc2.get_page_entry(201).frame_number, 0)

    def test_execute_trace(self):
        # Trace with mixed reads and writes
        trace = [
            (1, False),  # Fault (F0)
            (2, True),   # Fault (F1, dirty)
            (1, True),   # Hit (F0, dirty)
            (3, True),   # Fault -> evicts F0 (page 1, dirty) -> write back 1; loads page 3 as dirty
            (2, False),  # Hit (F1)
            (4, False),  # Fault -> evicts F0 (page 3, dirty) -> write back 2; loads page 4
        ]
        results = self.engine.execute_trace(self.proc1, trace)
        self.assertEqual(len(results), 6)
        self.assertEqual(self.engine.metrics.total_accesses, 6)
        self.assertEqual(self.engine.metrics.page_hits, 2)
        self.assertEqual(self.engine.metrics.page_faults, 4)
        self.assertEqual(self.engine.metrics.dirty_write_backs, 2)
        self.assertEqual(int(self.engine.clock), 6)


if __name__ == "__main__":
    unittest.main()
