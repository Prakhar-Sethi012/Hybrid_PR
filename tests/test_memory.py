"""
Unit tests for Frame and MemoryManager classes.
"""

import unittest
from src.memory import Frame, MemoryManager


class TestMemoryManager(unittest.TestCase):
    def test_invalid_initialization(self):
        with self.assertRaises(ValueError):
            MemoryManager(0)
        with self.assertRaises(ValueError):
            MemoryManager(-5)

    def test_initial_state(self):
        mm = MemoryManager(frame_count=4)
        self.assertEqual(mm.frame_count, 4)
        self.assertEqual(mm.free_frame_count, 4)
        self.assertEqual(mm.occupied_frame_count, 0)
        self.assertFalse(mm.is_full())
        self.assertEqual(mm.get_free_frames(), [0, 1, 2, 3])
        self.assertEqual(mm.get_occupied_frames(), [])

        for i in range(4):
            self.assertTrue(mm.is_frame_free(i))
            self.assertFalse(mm.is_frame_occupied(i))
            frame = mm.get_frame(i)
            self.assertTrue(frame.is_free)
            self.assertFalse(frame.is_occupied)
            self.assertIsNone(frame.process_id)
            self.assertIsNone(frame.page_number)

    def test_frame_bounds_validation(self):
        mm = MemoryManager(frame_count=3)
        with self.assertRaises(IndexError):
            mm.get_frame(3)
        with self.assertRaises(IndexError):
            mm.is_frame_free(-1)
        with self.assertRaises(IndexError):
            mm.free_frame(10)

    def test_allocation_and_tracking(self):
        mm = MemoryManager(frame_count=3)

        # Allocate first frame (should be 0)
        f0 = mm.allocate_frame(process_id=1, page_number=100)
        self.assertEqual(f0, 0)
        self.assertEqual(mm.free_frame_count, 2)
        self.assertEqual(mm.occupied_frame_count, 1)
        self.assertTrue(mm.is_frame_occupied(0))
        self.assertFalse(mm.is_frame_free(0))
        self.assertEqual(mm.get_frame(0).process_id, 1)
        self.assertEqual(mm.get_frame(0).page_number, 100)

        # Allocate second and third frames
        f1 = mm.allocate_frame(process_id=1, page_number=101)
        f2 = mm.allocate_frame(process_id=2, page_number=200)
        self.assertEqual(f1, 1)
        self.assertEqual(f2, 2)
        self.assertTrue(mm.is_full())
        self.assertEqual(mm.free_frame_count, 0)
        self.assertEqual(mm.occupied_frame_count, 3)

        # Attempt to allocate when full returns None (modular: no replacement logic yet)
        f_overflow = mm.allocate_frame(process_id=1, page_number=102)
        self.assertIsNone(f_overflow)

    def test_explicit_frame_allocation(self):
        mm = MemoryManager(frame_count=4)
        # Allocate specific frame 2
        f = mm.allocate_frame(process_id=1, page_number=50, frame_id=2)
        self.assertEqual(f, 2)
        self.assertEqual(mm.get_free_frames(), [0, 1, 3])
        self.assertEqual(mm.get_occupied_frames(), [2])

        # Attempt to allocate already occupied frame 2 raises ValueError
        with self.assertRaises(ValueError):
            mm.allocate_frame(process_id=1, page_number=51, frame_id=2)

    def test_free_frame(self):
        mm = MemoryManager(frame_count=2)
        mm.allocate_frame(process_id=1, page_number=10)
        mm.allocate_frame(process_id=1, page_number=11)
        self.assertTrue(mm.is_full())

        # Free frame 0
        freed = mm.free_frame(0)
        self.assertIsNotNone(freed)
        self.assertFalse(mm.is_full())
        self.assertEqual(mm.free_frame_count, 1)
        self.assertEqual(mm.get_free_frames(), [0])
        self.assertEqual(mm.get_occupied_frames(), [1])

        # Freeing already free frame returns None
        self.assertIsNone(mm.free_frame(0))

    def test_reset(self):
        mm = MemoryManager(frame_count=3)
        mm.allocate_frame(1, 10)
        mm.allocate_frame(1, 20)
        self.assertEqual(mm.occupied_frame_count, 2)

        mm.reset()
        self.assertEqual(mm.free_frame_count, 3)
        self.assertEqual(mm.occupied_frame_count, 0)
        for i in range(3):
            self.assertTrue(mm.is_frame_free(i))


if __name__ == "__main__":
    unittest.main()
