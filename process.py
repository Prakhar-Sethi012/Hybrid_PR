"""
Root forwarding module for Process and PageTable.
Allows `from process import ...` and `import process`.
"""

from src.process import Process, PageTable, PageTableEntry

__all__ = ["Process", "PageTable", "PageTableEntry"]
