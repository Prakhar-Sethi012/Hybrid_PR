"""
Unit tests for Stage 2 & Stage 3: SimulationEngine, SimulationClock, PerformanceMetrics,
AdaptiveParameterController, LRFU score tracking, and Cost-based C(p) victim eviction.
"""

import unittest
from src.engine import (
    AccessResult,
    AdaptiveParameterController,
    PerformanceMetrics,
    SimulationClock,
    SimulationEngine,
    compute_decayed_score,
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


class TestAdaptiveParameterController(unittest.TestCase):
    def test_initial_controller_values(self):
        ctrl = AdaptiveParameterController(window_size=100, lambda_value=0.5, delta=2.0)
        self.assertEqual(ctrl.window_size, 100)
        self.assertEqual(ctrl.lambda_value, 0.5)
        self.assertEqual(ctrl.delta, 2.0)
        self.assertEqual(ctrl.window_accesses, 0)
        self.assertEqual(ctrl.window_faults, 0)

    def test_high_fault_rate_increases_lambda(self):
        # Window size = 20 accesses. Faults = 5 -> r = 5/20 = 0.25 (> 0.10)
        ctrl = AdaptiveParameterController(window_size=20, lambda_value=0.50)
        for i in range(15):
            ctrl.record_access(is_fault=False)
        for i in range(5):
            new_lambda = ctrl.record_access(is_fault=True)

        # On 20th access, tuning triggers: lambda increases from 0.50 to 0.55
        self.assertIsNotNone(new_lambda)
        self.assertAlmostEqual(ctrl.lambda_value, 0.55)
        # Window counters reset
        self.assertEqual(ctrl.window_accesses, 0)
        self.assertEqual(ctrl.window_faults, 0)
        self.assertEqual(len(ctrl.tuning_history), 1)

    def test_low_fault_rate_decreases_lambda(self):
        # Window size = 100 accesses. Faults = 1 -> r = 1/100 = 0.01 (< 0.02)
        ctrl = AdaptiveParameterController(window_size=100, lambda_value=0.50)
        for i in range(99):
            ctrl.record_access(is_fault=False)
        new_lambda = ctrl.record_access(is_fault=True)

        self.assertIsNotNone(new_lambda)
        self.assertAlmostEqual(ctrl.lambda_value, 0.45)

    def test_lambda_bounds_enforced(self):
        # Lambda cannot exceed 1.0
        ctrl_high = AdaptiveParameterController(window_size=10, lambda_value=0.98)
        for _ in range(10):
            ctrl_high.record_access(is_fault=True)
        self.assertEqual(ctrl_high.lambda_value, 1.0)

        # Lambda cannot drop below 0.0
        ctrl_low = AdaptiveParameterController(window_size=10, lambda_value=0.03)
        for _ in range(10):
            ctrl_low.record_access(is_fault=False)
        self.assertEqual(ctrl_low.lambda_value, 0.0)


class TestLRFUMathematics(unittest.TestCase):
    def test_score_decay_calculation(self):
        # lambda = 0.5, delta_t = 2 -> (1/2)^(0.5 * 2) = 0.5 -> score decays to 0.5 * score
        decayed = compute_decayed_score(score=2.0, lambda_val=0.5, delta_t=2.0)
        self.assertAlmostEqual(decayed, 1.0)

        # lambda = 0.0 (pure LFU) -> no decay regardless of delta_t
        no_decay = compute_decayed_score(score=5.0, lambda_val=0.0, delta_t=1000.0)
        self.assertAlmostEqual(no_decay, 5.0)

        # lambda = 1.0 (pure LRU), delta_t = 3 -> (1/2)^3 = 0.125
        lru_decay = compute_decayed_score(score=8.0, lambda_val=1.0, delta_t=3.0)
        self.assertAlmostEqual(lru_decay, 1.0)


class TestSimulationEngineStage3(unittest.TestCase):
    def setUp(self):
        self.mem = MemoryManager(frame_count=2)
        self.proc1 = Process(process_id=1, name="Proc-1")
        self.proc2 = Process(process_id=2, name="Proc-2")
        self.engine = SimulationEngine(
            memory_manager=self.mem,
            processes=[self.proc1, self.proc2],
            lambda_value=0.5,
            delta=2.0,
        )

    def test_hit_fault_and_recency_score_update(self):
        # Access 1: page 10 (read) -> FAULT. Frame 0 allocated with initial score 1.0
        res1 = self.engine.execute_access(self.proc1, page_number=10, is_write=False)
        self.assertFalse(res1.is_hit)
        self.assertEqual(res1.timestamp, 1)
        self.assertEqual(res1.hybrid_score, 1.0)
        self.assertEqual(self.mem.get_frame(0).hybrid_score, 1.0)

        # Access 2: page 20 (read) -> FAULT. Frame 1 allocated
        self.engine.execute_access(self.proc1, page_number=20, is_write=False)

        # Access 3: page 10 (read) -> HIT!
        # Time elapsed: delta_t = 3 - 1 = 2 ticks.
        # Score update: S_new = 1 + S_old * (1/2)^(lambda * delta_t) = 1 + 1.0 * (0.5)^(0.5 * 2) = 1 + 0.5 = 1.5
        res3 = self.engine.execute_access(self.proc1, page_number=10, is_write=False)
        self.assertTrue(res3.is_hit)
        self.assertAlmostEqual(res3.hybrid_score, 1.5)
        self.assertAlmostEqual(self.mem.get_frame(0).hybrid_score, 1.5)

    def test_victim_selection_prefers_clean_over_dirty(self):
        # Frame 0: page 10 (dirty, cost = S + 2.0)
        self.engine.execute_access(self.proc1, page_number=10, is_write=True)
        # Frame 1: page 20 (clean, cost = S + 0.0)
        self.engine.execute_access(self.proc1, page_number=20, is_write=False)
        self.assertTrue(self.mem.is_full())

        # Page 30 requested -> Must evict.
        # Even though Frame 0 was loaded earlier, Frame 1 is CLEAN (cost ~1.0 < ~3.0)
        # So Frame 1 (page 20) MUST be chosen as victim to save write-back cost!
        res = self.engine.execute_access(self.proc1, page_number=30, is_write=False)
        self.assertFalse(res.is_hit)
        self.assertEqual(res.frame_id, 1)
        self.assertEqual(res.evicted_page, 20)
        self.assertFalse(res.was_dirty_write_back)
        self.assertEqual(self.engine.metrics.dirty_write_backs, 0)

        # Verify page 20 unmapped, page 30 mapped in Frame 1
        self.assertFalse(self.proc1.is_page_valid(20))
        self.assertTrue(self.proc1.is_page_valid(30))
        self.assertEqual(self.proc1.get_page_entry(30).frame_number, 1)

    def test_victim_selection_dirty_write_back_when_both_dirty(self):
        # Frame 0: page 10 (dirty)
        self.engine.execute_access(self.proc1, page_number=10, is_write=True)
        # Frame 1: page 20 (dirty)
        self.engine.execute_access(self.proc1, page_number=20, is_write=True)
        self.assertTrue(self.mem.is_full())

        # Both are dirty. Frame 0 is older, so its score decayed more -> lower cost.
        # Evicts Frame 0 (page 10) and increments dirty_write_backs
        res = self.engine.execute_access(self.proc1, page_number=30, is_write=False)
        self.assertFalse(res.is_hit)
        self.assertEqual(res.frame_id, 0)
        self.assertEqual(res.evicted_page, 10)
        self.assertTrue(res.was_dirty_write_back)
        self.assertEqual(self.engine.metrics.dirty_write_backs, 1)

    def test_tie_breaking_oldest_timestamp(self):
        # Set lambda = 0 (pure LFU) and delta = 0 so costs are strictly based on frequency
        engine_lfu = SimulationEngine(
            memory_manager=self.mem,
            processes=[self.proc1],
            lambda_value=0.0,
            delta=0.0,
        )
        # Frame 0: page 10 at t=1 (score 1.0, clean, cost 1.0)
        engine_lfu.execute_access(self.proc1, page_number=10, is_write=False)
        # Frame 1: page 20 at t=2 (score 1.0, clean, cost 1.0)
        engine_lfu.execute_access(self.proc1, page_number=20, is_write=False)

        # Page 30 at t=3 -> Costs are strictly tied (1.0 == 1.0)
        # Tie-breaker rule: choose frame with oldest last_referenced_time (t=1 < t=2)
        # Frame 0 MUST be selected!
        res = engine_lfu.execute_access(self.proc1, page_number=30, is_write=False)
        self.assertEqual(res.frame_id, 0)
        self.assertEqual(res.evicted_page, 10)

    def test_multi_process_eviction(self):
        # Frame 0: Proc-1, page 100 (clean)
        self.engine.execute_access(self.proc1, page_number=100, is_write=False)
        # Frame 1: Proc-2, page 200 (clean)
        self.engine.execute_access(self.proc2, page_number=200, is_write=False)

        # Proc-2 accesses page 201 -> Evicts Frame 0 (Proc-1's older page 100)
        res = self.engine.execute_access(self.proc2, page_number=201, is_write=False)
        self.assertFalse(res.is_hit)
        self.assertEqual(res.evicted_process_id, 1)
        self.assertEqual(res.evicted_page, 100)

        # Proc-1 page 100 invalidated, Proc-2 page 201 mapped
        self.assertFalse(self.proc1.is_page_valid(100))
        self.assertTrue(self.proc2.is_page_valid(201))

    def test_execute_trace(self):
        # Trace with mixed read/write operations
        trace = [
            (1, False),  # Fault (F0)
            (2, True),   # Fault (F1, dirty, cost ~3.0)
            (1, True),   # Hit (F0, score boosted to 1.5, dirty, cost ~3.5)
            (3, False),  # Fault -> evicts F1 (page 2, dirty, cost ~2.5) -> write-back 1; loads page 3 clean in F1
            (1, False),  # Hit (F0)
            (4, False),  # Fault -> evicts F1 (page 3, clean, cost ~1.0 vs F0 cost ~3.0) -> loads page 4 in F1
        ]
        results = self.engine.execute_trace(self.proc1, trace)
        self.assertEqual(len(results), 6)
        self.assertEqual(self.engine.metrics.total_accesses, 6)
        self.assertEqual(self.engine.metrics.page_hits, 2)
        self.assertEqual(self.engine.metrics.page_faults, 4)
        self.assertEqual(self.engine.metrics.dirty_write_backs, 1)
        self.assertEqual(int(self.engine.clock), 6)


if __name__ == "__main__":
    unittest.main()
