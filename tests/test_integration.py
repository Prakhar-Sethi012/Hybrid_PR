"""
Integration test for Stage 1: WorkloadGenerator, Process, and MemoryManager interaction.
"""

import unittest
from src.workload import WorkloadGenerator
from src.process import Process
from src.memory import MemoryManager


class TestStage1Integration(unittest.TestCase):
    def test_end_to_end_stage1_workflow(self):
        # 1. Initialize workload generator and generate traces
        gen = WorkloadGenerator(seed=42)
        seq_trace = gen.generate_sequential(start=0, end=4)
        loop_trace = gen.generate_loop(sequence=[1, 2, 3], iterations=2)
        random_trace = gen.generate_random(page_range=10, num_references=20)
        zipf_trace = gen.generate_zipf_hot_cold(page_range=20, num_references=50)

        self.assertEqual(seq_trace, [0, 1, 2, 3, 4])
        self.assertEqual(loop_trace, [1, 2, 3, 1, 2, 3])
        self.assertEqual(len(random_trace), 20)
        self.assertEqual(len(zipf_trace), 50)

        # 2. Initialize processes
        p1 = Process(process_id=1, name="Worker-1")
        p2 = Process(process_id=2, name="Worker-2")
        self.assertEqual(len(p1.page_table), 0)
        self.assertEqual(len(p2.page_table), 0)

        # 3. Initialize MemoryManager with fixed frames
        mem = MemoryManager(frame_count=4)
        self.assertEqual(mem.free_frame_count, 4)

        # 4. Simulate reference stream allocation without replacement (Stage 1)
        trace = [10, 20, 30, 40, 50]  # 5 distinct pages for p1
        allocated_pages = []
        unallocated_pages = []

        for page in trace:
            if not p1.is_page_valid(page):
                # Page not in memory: request frame from memory manager
                allocated_frame = mem.allocate_frame(process_id=p1.process_id, page_number=page)
                if allocated_frame is not None:
                    p1.map_page(page_number=page, frame_number=allocated_frame, valid=True, dirty=False)
                    allocated_pages.append(page)
                else:
                    # Memory is full, no replacement implemented in Stage 1
                    unallocated_pages.append(page)

        # Check outcomes: 4 frames allocated, 5th couldn't be allocated because mem is full
        self.assertEqual(allocated_pages, [10, 20, 30, 40])
        self.assertEqual(unallocated_pages, [50])
        self.assertTrue(mem.is_full())
        self.assertEqual(mem.free_frame_count, 0)
        self.assertEqual(mem.occupied_frame_count, 4)

        # 5. Free one frame and verify new allocation succeeds
        mem.free_frame(0)
        p1.unmap_page(10)
        self.assertFalse(p1.is_page_valid(10))
        self.assertEqual(mem.free_frame_count, 1)

        new_frame = mem.allocate_frame(process_id=p2.process_id, page_number=99)
        self.assertEqual(new_frame, 0)
        p2.map_page(page_number=99, frame_number=new_frame, valid=True)
        self.assertTrue(p2.is_page_valid(99))
        self.assertEqual(mem.get_frame(0).process_id, 2)
        self.assertEqual(mem.get_frame(0).page_number, 99)


if __name__ == "__main__":
    unittest.main()
