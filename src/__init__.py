"""
Hybrid Page Replacement Simulator - Core Package.
Stage 1: Workload Generation and Base Memory Data Structures.
"""

from .workload import (
    WorkloadGenerator,
    generate_sequential,
    generate_loop,
    generate_random,
    generate_zipf_hot_cold,
)
from .process import Process, PageTable, PageTableEntry
from .memory import MemoryManager, Frame

__all__ = [
    "WorkloadGenerator",
    "generate_sequential",
    "generate_loop",
    "generate_random",
    "generate_zipf_hot_cold",
    "Process",
    "PageTable",
    "PageTableEntry",
    "MemoryManager",
    "Frame",
]
