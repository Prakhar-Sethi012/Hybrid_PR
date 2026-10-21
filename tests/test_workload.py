"""
Unit tests for WorkloadGenerator and pattern generation functions.
"""

import unittest
from src.workload import (
    WorkloadGenerator,
    generate_sequential,
    generate_loop,
    generate_random,
    generate_zipf_hot_cold,
    _parse_page_range,
)


class TestWorkloadGenerator(unittest.TestCase):
    def setUp(self):
        self.gen = WorkloadGenerator(seed=42)

    def test_parse_page_range(self):
        self.assertEqual(_parse_page_range(5), [0, 1, 2, 3, 4])
        self.assertEqual(_parse_page_range((2, 6)), [2, 3, 4, 5])
        self.assertEqual(_parse_page_range(range(3, 7)), [3, 4, 5, 6])
        self.assertEqual(_parse_page_range([10, 20, 30]), [10, 20, 30])
        with self.assertRaises(ValueError):
            _parse_page_range(0)
        with self.assertRaises(ValueError):
            _parse_page_range((5, 2))
        with self.assertRaises(TypeError):
            _parse_page_range("invalid")  # type: ignore

    def test_generate_sequential_basic(self):
        # Scan 0 to 5 inclusive
        result = self.gen.generate_sequential(0, 5)
        self.assertEqual(result, [0, 1, 2, 3, 4, 5])

        # Scan 5 to 0 descending inclusive
        result_desc = self.gen.generate_sequential(5, 0)
        self.assertEqual(result_desc, [5, 4, 3, 2, 1, 0])

        # Exclusive
        result_excl = self.gen.generate_sequential(0, 5, inclusive=False)
        self.assertEqual(result_excl, [0, 1, 2, 3, 4])

        # Single element
        result_single = self.gen.generate_sequential(3, 3)
        self.assertEqual(result_single, [3])

    def test_generate_sequential_with_num_references(self):
        # Scan 0 to 2 with num_references = 8 -> cycles
        result = self.gen.generate_sequential(0, 2, num_references=8)
        self.assertEqual(result, [0, 1, 2, 0, 1, 2, 0, 1])

        # Instance configured with number_of_references
        gen_10 = WorkloadGenerator(number_of_references=10)
        result_inst = gen_10.generate_sequential(1, 3)
        self.assertEqual(result_inst, [1, 2, 3, 1, 2, 3, 1, 2, 3, 1])

    def test_generate_loop(self):
        # Basic loop with iterations
        seq = [10, 20, 30]
        result = self.gen.generate_loop(seq, iterations=3)
        self.assertEqual(result, [10, 20, 30, 10, 20, 30, 10, 20, 30])

        # Zero iterations
        self.assertEqual(self.gen.generate_loop(seq, iterations=0), [])

        # Loop with num_references
        result_len = self.gen.generate_loop(seq, num_references=7)
        self.assertEqual(result_len, [10, 20, 30, 10, 20, 30, 10])

        # Empty sequence raises ValueError
        with self.assertRaises(ValueError):
            self.gen.generate_loop([])

    def test_generate_random(self):
        # Random selection within bounds
        count = 100
        result = self.gen.generate_random(page_range=10, num_references=count)
        self.assertEqual(len(result), count)
        for page in result:
            self.assertTrue(0 <= page < 10)

        # Range tuple
        result_tuple = self.gen.generate_random(page_range=(20, 30), num_references=50)
        self.assertEqual(len(result_tuple), 50)
        for page in result_tuple:
            self.assertTrue(20 <= page < 30)

        # Deterministic with seed
        g1 = WorkloadGenerator(seed=123)
        g2 = WorkloadGenerator(seed=123)
        self.assertEqual(g1.generate_random(50, 20), g2.generate_random(50, 20))

    def test_generate_zipf_hot_cold_locality(self):
        # 80/20 rule: 80% requests target 20% pages
        # Total pages = 50. 20% hot pages = 10 pages (pages 0..9)
        # Cold pages = 40 pages (pages 10..49)
        num_refs = 10000
        gen = WorkloadGenerator(seed=777)
        result = gen.generate_zipf_hot_cold(
            page_range=50,
            hot_page_ratio=0.2,
            hot_request_ratio=0.8,
            num_references=num_refs,
        )
        self.assertEqual(len(result), num_refs)

        # Count references to hot pages (pages 0..9)
        hot_pages = set(range(10))
        hot_hits = sum(1 for p in result if p in hot_pages)
        hot_hit_ratio = hot_hits / num_refs

        # Expect close to 80% (within 3% tolerance for 10k samples)
        self.assertAlmostEqual(hot_hit_ratio, 0.80, delta=0.03)

    def test_generate_zipf_with_alpha(self):
        # Test with optional zipf_alpha skew
        result = self.gen.generate_zipf_hot_cold(
            page_range=20,
            num_references=100,
            zipf_alpha=1.2,
        )
        self.assertEqual(len(result), 100)

    def test_module_level_convenience_functions(self):
        self.assertEqual(generate_sequential(1, 4), [1, 2, 3, 4])
        self.assertEqual(generate_loop([7, 8], iterations=2), [7, 8, 7, 8])
        rand_trace = generate_random(page_range=15, num_references=30)
        self.assertEqual(len(rand_trace), 30)
        zipf_trace = generate_zipf_hot_cold(page_range=30, num_references=40)
        self.assertEqual(len(zipf_trace), 40)

    def test_workload_with_writes(self):
        # Sequential with writes
        seq_writes = self.gen.generate_sequential(0, 3, include_writes=True, write_probability=0.5)
        self.assertEqual(len(seq_writes), 4)
        for item in seq_writes:
            self.assertIsInstance(item, tuple)
            self.assertEqual(len(item), 2)
            self.assertIsInstance(item[0], int)
            self.assertIsInstance(item[1], bool)

        # Loop with writes
        loop_writes = self.gen.generate_loop([1, 2], iterations=3, include_writes=True)
        self.assertEqual(len(loop_writes), 6)
        self.assertIsInstance(loop_writes[0], tuple)

        # Random with writes
        rand_writes = self.gen.generate_random(10, num_references=50, include_writes=True)
        self.assertEqual(len(rand_writes), 50)
        self.assertIsInstance(rand_writes[0], tuple)

    def test_write_probability_statistical(self):
        # 10,000 references with default write_probability=0.2 (20% writes)
        gen = WorkloadGenerator(seed=999, write_probability=0.2, include_writes=True)
        trace = gen.generate_random(50, num_references=10000)
        writes = sum(1 for _, is_w in trace if is_w)
        write_ratio = writes / 10000
        # Expected 20% +/- 2%
        self.assertAlmostEqual(write_ratio, 0.20, delta=0.02)


if __name__ == "__main__":
    unittest.main()
