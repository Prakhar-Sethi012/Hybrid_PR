"""
Hybrid Page Replacement Simulator - Core Package.
Stage 1: Workload Generation and Base Memory Data Structures.
Stage 2: Memory Access Handler and Simulation Engine.
Stage 3: Adaptive Hybrid Page Replacement Algorithm and Parameter Controller.
Stage 4: Thrashing Control and Round Robin Scheduling.
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
from .scheduler import CpuScheduler
from .engine import (
    SimulationClock,
    PerformanceMetrics,
    SimulationEngine,
    AccessResult,
    AdaptiveParameterController,
    compute_decayed_score,
    ThrashingController,
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
    "ThrashingController",
    "CpuScheduler",
    "PageReplacementPolicy",
    "BasePageReplacementPolicy",
    "FIFOPolicy",
    "LRUPolicy",
    "LFUPolicy",
    "AdaptiveHybridPolicy",
    "RAM_ACCESS_TIME_NS",
    "DISK_READ_TIME_NS",
    "DISK_WRITE_TIME_NS",
]
