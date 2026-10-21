"""
Adaptive Hybrid Page Replacement Simulator package.
Stage 1: Workload Generator, Process Page Tables, and Physical Memory Management.
Stage 2: Memory Access Handler and Simulation Engine.
Stage 3: Adaptive Hybrid Page Replacement Algorithm and Parameter Controller.
"""

from src.workload import (
    WorkloadGenerator,
    generate_sequential,
    generate_loop,
    generate_random,
    generate_zipf_hot_cold,
)
from src.process import Process, PageTable, PageTableEntry
from src.memory import MemoryManager, Frame
from src.engine import (
    SimulationClock,
    PerformanceMetrics,
    SimulationEngine,
    AccessResult,
    AdaptiveParameterController,
    compute_decayed_score,
)

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
    "SimulationClock",
    "PerformanceMetrics",
    "SimulationEngine",
    "AccessResult",
    "AdaptiveParameterController",
    "compute_decayed_score",
]
