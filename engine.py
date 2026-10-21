"""
Root forwarding module for SimulationEngine, SimulationClock, PerformanceMetrics,
AdaptiveParameterController, and compute_decayed_score.
Allows `from engine import ...` and `import engine`.
"""

from src.engine import (
    SimulationClock,
    PerformanceMetrics,
    SimulationEngine,
    AccessResult,
    AdaptiveParameterController,
    compute_decayed_score,
)

__all__ = [
    "SimulationClock",
    "PerformanceMetrics",
    "SimulationEngine",
    "AccessResult",
    "AdaptiveParameterController",
    "compute_decayed_score",
]
