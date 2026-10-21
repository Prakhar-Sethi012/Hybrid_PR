"""
Unit tests for Process, PageTable, and PageTableEntry classes.
"""

import unittest
from src.process import Process, PageTable, PageTableEntry


class TestProcessAndPageTable(unittest.TestCase):
    def test_page_table_entry_defaults(self):
        entry = PageTableEntry()
        self.assertFalse(entry.valid)
        self.assertFalse(entry.dirty)
        self.assertIsNone(entry.frame_number)
        self.assertFalse(entry.referenced)

    def test_page_table_entry_dict_and_attr_access(self):
        entry = PageTableEntry(valid=True, dirty=False, frame_number=5)
        # Attribute access
        self.assertTrue(entry.valid)
        self.assertFalse(entry.dirty)
        self.assertEqual(entry.frame_number, 5)

        # Dict-style access
        self.assertTrue(entry["valid"])
        self.assertFalse(entry["dirty"])
        self.assertEqual(entry["frame_number"], 5)

        # Dict-style modification
        entry["dirty"] = True
        self.assertTrue(entry.dirty)
        self.assertTrue(entry["dirty"])

        # Dict conversion
        d = entry.to_dict()
        self.assertEqual(d["valid"], True)
        self.assertEqual(d["dirty"], True)
        self.assertEqual(d["frame_number"], 5)

    def test_page_table_hash_map_behavior(self):
        pt = PageTable()
        self.assertIsInstance(pt, dict)

        # Mapping a page
        entry = pt.map_page(page_number=10, frame_number=3, valid=True, dirty=False)
        self.assertIn(10, pt)
        self.assertTrue(pt.is_valid(10))
        self.assertFalse(pt.is_dirty(10))
        self.assertEqual(entry.frame_number, 3)

        # Setting dirty
        pt.set_dirty(10, True)
        self.assertTrue(pt.is_dirty(10))

        # Assigning plain dict
        pt[20] = {"valid": True, "dirty": True, "frame_number": 7}
        self.assertIsInstance(pt[20], PageTableEntry)
        self.assertTrue(pt[20].valid)
        self.assertTrue(pt[20].dirty)
        self.assertEqual(pt[20].frame_number, 7)

        # Invalidation
        invalidated = pt.invalidate(10)
        self.assertIsNotNone(invalidated)
        self.assertFalse(pt.is_valid(10))
        self.assertIsNone(pt[10].frame_number)

    def test_process_initialization_and_operations(self):
        proc = Process(process_id=1, name="InitProcess")
        self.assertEqual(proc.process_id, 1)
        self.assertEqual(proc.name, "InitProcess")
        self.assertIsInstance(proc.page_table, PageTable)
        self.assertEqual(len(proc.page_table), 0)

        # Map page through process
        proc.map_page(page_number=0, frame_number=1, valid=True, dirty=False)
        self.assertTrue(proc.is_page_valid(0))
        self.assertFalse(proc.is_page_dirty(0))
        self.assertEqual(proc.get_page_entry(0).frame_number, 1)

        # Unmap page
        unmapped = proc.unmap_page(0)
        self.assertIsNotNone(unmapped)
        self.assertFalse(proc.is_page_valid(0))

        # Non-existent page query
        self.assertFalse(proc.is_page_valid(999))
        self.assertIsNone(proc.get_page_entry(999))

    def test_process_suspension_state_updates(self):
        # Default state
        p = Process(process_id=2)
        self.assertFalse(p.is_suspended)
        self.assertEqual(p.suspension_timer, 0)

        # Custom initialization
        p_init = Process(process_id=3, is_suspended=True, suspension_timer=2)
        self.assertTrue(p_init.is_suspended)
        self.assertEqual(p_init.suspension_timer, 2)

        # State modifications & helper methods
        p.suspend(duration=2)
        self.assertTrue(p.is_suspended)
        self.assertEqual(p.suspension_timer, 2)
        self.assertIn("suspended", repr(p))

        p.resume()
        self.assertFalse(p.is_suspended)
        self.assertEqual(p.suspension_timer, 0)


if __name__ == "__main__":
    unittest.main()

