"""
Unit and Integration Tests for Stage 5 Evaluation Module (evaluate.py).
Tests:
- EAT (Effective Access Time) calculation math and edge cases in PerformanceMetrics.
- Baseline Replacement Policies: FIFO, LRU, LFU, and AdaptiveHybrid.
- Seamless pluggability into SimulationEngine._select_victim().
- Workload generator reproducibility across algorithms.
- Benchmark suite execution and ASCII table output formatting.
"""

import unittest
from typing import List, Tuple

from src.memory import MemoryManager, Frame
from src.process import Process
from src.engine import (
    SimulationEngine,
    PerformanceMetrics,
    PageReplacementPolicy,
    BasePageReplacementPolicy,
    FIFOPolicy,
    LRUPolicy,
    LFUPolicy,
    AdaptiveHybridPolicy,
    RAM_ACCESS_TIME_NS,
    DISK_READ_TIME_NS,
    DISK_WRITE_TIME_NS,
)
from src.evaluate import (
    generate_benchmark_workloads,
    run_benchmark,
    format_benchmark_table,
    BENCHMARK_WORKLOADS,
    BENCHMARK_ALGORITHMS,
)


class TestEffectiveAccessTime(unittest.TestCase):
    """Tests the EAT calculation math in PerformanceMetrics."""

    def test_eat_zero_accesses(self):
        """EAT should be 0.0 when no memory accesses have been performed."""
        metrics = PerformanceMetrics()
        self.assertEqual(metrics.total_accesses, 0)
        self.assertEqual(metrics.eat, 0.0)
        self.assertEqual(metrics.calculate_eat(), 0.0)

    def test_eat_pure_hits(self):
        """Pure hits should yield EAT equal to RAM Access Time (100 ns)."""
        metrics = PerformanceMetrics(
            total_accesses=100,
            page_hits=100,
            page_faults=0,
            dirty_write_backs=0,
        )
        self.assertEqual(metrics.hit_ratio, 1.0)
        self.assertEqual(metrics.fault_ratio, 0.0)
        self.assertAlmostEqual(metrics.eat, 100.0)

    def test_eat_pure_faults_no_dirty(self):
        """Pure faults with no dirty write-backs should equal Disk Read Time (10,000,000 ns)."""
        metrics = PerformanceMetrics(
            total_accesses=100,
            page_hits=0,
            page_faults=100,
            dirty_write_backs=0,
        )
        self.assertEqual(metrics.hit_ratio, 0.0)
        self.assertEqual(metrics.fault_ratio, 1.0)
        self.assertAlmostEqual(metrics.eat, 10_000_000.0)

    def test_eat_standard_formula(self):
        """
        Tests exact formula:
        EAT = (Hit Ratio * RAM Access) + (Fault Ratio * Disk Read) + ((Dirty Writes / Total Accesses) * Disk Write)
        """
        # 1000 accesses: 800 hits (0.8), 200 faults (0.2), 50 dirty writes (0.05)
        metrics = PerformanceMetrics(
            total_accesses=1000,
            page_hits=800,
            page_faults=200,
            dirty_write_backs=50,
        )
        # Expected:
        # 0.8 * 100 = 80 ns
        # 0.2 * 10,000,000 = 2,000,000 ns
        # (50 / 1000) * 10,000,000 = 500,000 ns
        # Total = 80 + 2,000,000 + 500,000 = 2,500,080.0 ns
        expected_eat = (0.8 * 100.0) + (0.2 * 10_000_000.0) + (0.05 * 10_000_000.0)
        self.assertAlmostEqual(metrics.eat, expected_eat)
        self.assertAlmostEqual(metrics.eat, 2_500_080.0)

    def test_eat_custom_latencies(self):
        """Tests calculate_eat with custom mock hardware latencies."""
        metrics = PerformanceMetrics(
            total_accesses=10,
            page_hits=6,
            page_faults=4,
            dirty_write_backs=2,
        )
        # RAM = 50 ns, Disk Read = 1,000 ns, Disk Write = 2,000 ns
        # Hit ratio = 0.6, Fault ratio = 0.4, Dirty ratio = 0.2
        # EAT = (0.6 * 50) + (0.4 * 1000) + (0.2 * 2000) = 30 + 400 + 400 = 830 ns
        custom_eat = metrics.calculate_eat(ram_access_ns=50.0, disk_read_ns=1000.0, disk_write_ns=2000.0)
        self.assertAlmostEqual(custom_eat, 830.0)

    def test_to_dict_includes_eat(self):
        """to_dict() should contain the 'eat' metric."""
        metrics = PerformanceMetrics(total_accesses=10, page_hits=10)
        d = metrics.to_dict()
        self.assertIn("eat", d)
        self.assertAlmostEqual(d["eat"], 100.0)


class TestBaselineReplacementPolicies(unittest.TestCase):
    """Tests the baseline page replacement policies: FIFO, LRU, and LFU."""

    def test_fifo_eviction(self):
        """
        FIFO should evict the page that arrived earliest in physical memory.
        Hits must NOT reset the arrival order.
        """
        mem = MemoryManager(frame_count=3)
        proc = Process(process_id=1)
        engine = SimulationEngine(memory_manager=mem, processes=[proc], policy=PageReplacementPolicy.FIFO)

        # Access 1, 2, 3 -> Fills frames 0, 1, 2 (arrival: Page 1 at clock=1, Page 2 at clock=2, Page 3 at clock=3)
        engine.execute_access(proc, page_number=1)
        engine.execute_access(proc, page_number=2)
        engine.execute_access(proc, page_number=3)

        # Access Page 1 again (HIT at clock=4).
        # In FIFO, this must NOT change Page 1's position as the oldest loaded page!
        r_hit = engine.execute_access(proc, page_number=1)
        self.assertTrue(r_hit.is_hit)

        # Access Page 4 (FAULT at clock=5). Memory is full!
        # FIFO must choose Frame 0 (holding Page 1) because Page 1 arrived at clock=1,
        # earlier than Page 2 (clock=2) and Page 3 (clock=3).
        victim_frame = engine._select_victim()
        self.assertEqual(victim_frame, 0)
        r_evict = engine.execute_access(proc, page_number=4)
        self.assertEqual(r_evict.evicted_page, 1)
        self.assertEqual(r_evict.frame_id, 0)

        # Next fault: Page 5. Oldest arrival now is Page 2 in Frame 1 (arrived at clock=2)
        r_evict2 = engine.execute_access(proc, page_number=5)
        self.assertEqual(r_evict2.evicted_page, 2)
        self.assertEqual(r_evict2.frame_id, 1)

    def test_lru_eviction(self):
        """
        LRU should evict the least recently referenced page.
        Hits MUST update the recency timestamp.
        """
        mem = MemoryManager(frame_count=3)
        proc = Process(process_id=1)
        engine = SimulationEngine(memory_manager=mem, processes=[proc], policy=PageReplacementPolicy.LRU)

        # Access 1, 2, 3 -> Fills frames 0, 1, 2 (clock 1, 2, 3)
        engine.execute_access(proc, page_number=1)
        engine.execute_access(proc, page_number=2)
        engine.execute_access(proc, page_number=3)

        # Access Page 1 again (HIT at clock=4).
        # In LRU, Page 1 is now the MOST recently used (recency timestamp = 4).
        # The least recently used page is now Page 2 (recency timestamp = 2).
        engine.execute_access(proc, page_number=1)

        # Access Page 4 (FAULT at clock=5).
        # LRU must evict Frame 1 (Page 2, timestamp=2), NOT Frame 0 (Page 1, timestamp=4)!
        victim_frame = engine._select_victim()
        self.assertEqual(victim_frame, 1)
        r_evict = engine.execute_access(proc, page_number=4)
        self.assertEqual(r_evict.evicted_page, 2)
        self.assertEqual(r_evict.frame_id, 1)

    def test_lfu_eviction(self):
        """
        LFU should evict the page with the lowest reference frequency (access count).
        """
        mem = MemoryManager(frame_count=3)
        proc = Process(process_id=1)
        engine = SimulationEngine(memory_manager=mem, processes=[proc], policy=PageReplacementPolicy.LFU)

        # Load pages 1, 2, 3 (each starts with access_count = 1)
        engine.execute_access(proc, page_number=1)  # Frame 0: count=1
        engine.execute_access(proc, page_number=2)  # Frame 1: count=1
        engine.execute_access(proc, page_number=3)  # Frame 2: count=1

        # Hit page 1 twice (count becomes 3)
        engine.execute_access(proc, page_number=1)
        engine.execute_access(proc, page_number=1)

        # Hit page 3 once (count becomes 2)
        engine.execute_access(proc, page_number=3)

        # Current frequencies:
        # Page 1 in Frame 0: count = 3
        # Page 2 in Frame 1: count = 1 (LEAST FREQUENT)
        # Page 3 in Frame 2: count = 2
        victim_frame = engine._select_victim()
        self.assertEqual(victim_frame, 1)  # Frame 1 has lowest frequency

        # Access Page 4 -> evicts Page 2 from Frame 1
        r = engine.execute_access(proc, page_number=4)
        self.assertEqual(r.evicted_page, 2)
        self.assertEqual(r.frame_id, 1)

    def test_lfu_tie_breaker(self):
        """When frequencies are tied, LFU should tie-break by oldest reference time (LRU tie-breaker)."""
        mem = MemoryManager(frame_count=2)
        proc = Process(process_id=1)
        engine = SimulationEngine(memory_manager=mem, processes=[proc], policy=PageReplacementPolicy.LFU)

        engine.execute_access(proc, page_number=10)  # Clock 1, count=1
        engine.execute_access(proc, page_number=20)  # Clock 2, count=1

        # Both have access_count=1. Page 10 is older (timestamp 1 vs 2).
        victim = engine._select_victim()
        self.assertEqual(victim, 0)

    def test_adaptive_hybrid_dirty_penalty(self):
        """
        AdaptiveHybrid should penalize dirty pages (C(p) = S(p) + delta)
        preferentially evicting a clean page over a dirty page to avoid disk write-backs.
        """
        mem = MemoryManager(frame_count=2)
        proc = Process(process_id=1)
        engine = SimulationEngine(
            memory_manager=mem,
            processes=[proc],
            lambda_value=0.5,
            delta=2.0,
            policy=PageReplacementPolicy.ADAPTIVE_HYBRID,
        )

        # Page 10 written to -> dirty (Frame 0)
        engine.execute_access(proc, page_number=10, is_write=True)
        # Page 20 read only -> clean (Frame 1)
        engine.execute_access(proc, page_number=20, is_write=False)

        # Both have initial score 1.0. But Page 10 has dirty penalty delta=2.0, total cost ~3.0.
        # Clean Page 20 has total cost ~1.0.
        # AdaptiveHybrid must select Frame 1 (clean page 20) as the victim!
        victim = engine._select_victim()
        self.assertEqual(victim, 1)

        res = engine.execute_access(proc, page_number=30, is_write=False)
        self.assertEqual(res.evicted_page, 20)
        self.assertFalse(res.was_dirty_write_back)


class TestPolicyPluggability(unittest.TestCase):
    """Tests that policies seamlessly plug into SimulationEngine via various interfaces."""

    def test_pluggable_via_string_case_insensitive(self):
        # String "fifo" (lowercase)
        mem = MemoryManager(frame_count=2)
        proc = Process(process_id=1)
        engine_fifo = SimulationEngine(mem, [proc], policy="fifo")
        engine_fifo.execute_access(proc, page_number=1)
        engine_fifo.execute_access(proc, page_number=2)
        self.assertEqual(engine_fifo._select_victim_fifo(), engine_fifo._select_victim())

        # String "LRU"
        mem2 = MemoryManager(frame_count=2)
        proc2 = Process(process_id=1)
        engine_lru = SimulationEngine(mem2, [proc2], policy="LRU")
        engine_lru.execute_access(proc2, page_number=1)
        engine_lru.execute_access(proc2, page_number=2)
        self.assertEqual(engine_lru._select_victim_lru(), engine_lru._select_victim())

        # String "lfu"
        mem3 = MemoryManager(frame_count=2)
        proc3 = Process(process_id=1)
        engine_lfu = SimulationEngine(mem3, [proc3], policy="lfu")
        engine_lfu.execute_access(proc3, page_number=1)
        engine_lfu.execute_access(proc3, page_number=2)
        self.assertEqual(engine_lfu._select_victim_lfu(), engine_lfu._select_victim())

        # String "AdaptiveHybrid"
        mem4 = MemoryManager(frame_count=2)
        proc4 = Process(process_id=1)
        engine_hybrid = SimulationEngine(mem4, [proc4], policy="AdaptiveHybrid")
        engine_hybrid.execute_access(proc4, page_number=1)
        engine_hybrid.execute_access(proc4, page_number=2)
        self.assertEqual(engine_hybrid._select_victim_hybrid(), engine_hybrid._select_victim())

    def test_pluggable_via_policy_objects(self):
        mem = MemoryManager(frame_count=2)
        proc = Process(process_id=1)

        # FIFOPolicy
        engine = SimulationEngine(mem, [proc], policy=FIFOPolicy())
        engine.execute_access(proc, page_number=1)
        engine.execute_access(proc, page_number=2)
        self.assertEqual(engine._select_victim(), 0)

        # LRUPolicy
        engine.policy = LRUPolicy()
        engine.execute_access(proc, page_number=1)  # Hit page 1 -> page 2 is now LRU
        self.assertEqual(engine._select_victim(), 1)

        # LFUPolicy
        engine.policy = LFUPolicy()
        # Page 1 has count 2, page 2 has count 1 -> Page 2 is LFU
        self.assertEqual(engine._select_victim(), 1)

        # AdaptiveHybridPolicy
        engine.policy = AdaptiveHybridPolicy()
        self.assertIn(engine._select_victim(), [0, 1])

    def test_pluggable_via_custom_callable(self):
        """Custom strategy callable can be plugged directly."""
        mem = MemoryManager(frame_count=3)
        proc = Process(process_id=1)

        # Always evict highest frame_id
        def custom_policy(eng: SimulationEngine) -> int:
            return max(eng.memory_manager.occupied_frames)

        engine = SimulationEngine(mem, [proc], policy=custom_policy)
        engine.execute_access(proc, page_number=1)
        engine.execute_access(proc, page_number=2)
        engine.execute_access(proc, page_number=3)

        self.assertEqual(engine._select_victim(), 2)

    def test_invalid_policy_raises(self):
        mem = MemoryManager(frame_count=2)
        proc = Process(process_id=1)
        engine = SimulationEngine(mem, [proc], policy="UnknownPolicy")
        engine.execute_access(proc, page_number=1)
        engine.execute_access(proc, page_number=2)
        with self.assertRaises(ValueError):
            engine._select_victim()


class TestBenchmarkSuite(unittest.TestCase):
    """Tests the automated benchmark suite execution and table generation."""

    def test_workload_generation_deterministic(self):
        """Same seed must produce 100% identical workload traces."""
        w1 = generate_benchmark_workloads(seed=42, num_references=50, page_count=10)
        w2 = generate_benchmark_workloads(seed=42, num_references=50, page_count=10)

        for name in BENCHMARK_WORKLOADS:
            self.assertIn(name, w1)
            self.assertEqual(len(w1[name]), 50)
            self.assertEqual(w1[name], w2[name])

    def test_run_benchmark_matrix(self):
        """
        run_benchmark must execute all 4 algorithms on all 4 workloads (16 tests total).
        """
        results = run_benchmark(
            seed=42,
            num_references=100,
            frame_count=4,
            page_count=12,
            print_table=False,
        )

        self.assertEqual(len(results), 16)  # 4 workloads * 4 algorithms

        expected_algos = set(BENCHMARK_ALGORITHMS)
        expected_workloads = set(BENCHMARK_WORKLOADS)

        found_algos = {r["algorithm"] for r in results}
        found_workloads = {r["workload"] for r in results}

        self.assertEqual(found_algos, expected_algos)
        self.assertEqual(found_workloads, expected_workloads)

        for row in results:
            self.assertIn("hit_ratio", row)
            self.assertIn("page_faults", row)
            self.assertIn("dirty_write_backs", row)
            self.assertIn("thrashing_suspensions", row)
            self.assertIn("eat", row)
            self.assertTrue(0.0 <= row["hit_ratio"] <= 1.0)
            self.assertEqual(row["page_faults"] + row["page_hits"], 100)
            self.assertTrue(row["eat"] > 0.0)

    def test_format_benchmark_table_columns(self):
        """ASCII table must include all required column headers."""
        results = run_benchmark(
            seed=42,
            num_references=50,
            frame_count=4,
            page_count=10,
            print_table=False,
        )
        table = format_benchmark_table(results)

        required_columns = [
            "Algorithm",
            "Workload",
            "Hit Ratio",
            "Page Faults",
            "Dirty Writes",
            "Thrashing Suspensions",
            "EAT (ns)",
        ]
        for col in required_columns:
            self.assertIn(col, table, f"Column '{col}' missing from ASCII table.")

        # Ensure all algorithms and workloads appear in the table
        for algo in BENCHMARK_ALGORITHMS:
            self.assertIn(algo, table)
        for workload in BENCHMARK_WORKLOADS:
            self.assertIn(workload, table)


if __name__ == "__main__":
    unittest.main()
