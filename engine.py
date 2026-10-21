"""
Root forwarding module for SimulationEngine, SimulationClock, PerformanceMetrics,
AdaptiveParameterController, compute_decayed_score, ThrashingController, and CpuScheduler.
Allows `from engine import ...` and `import engine`.
"""

from src.engine import (
    SimulationClock,
    PerformanceMetrics,
    SimulationEngine,
    AccessResult,
    AdaptiveParameterController,
    compute_decayed_score,
    ThrashingController,
    CpuScheduler,
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
