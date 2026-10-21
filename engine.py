"""
Root forwarding module for SimulationEngine, SimulationClock, and PerformanceMetrics.
Allows `from engine import ...` and `import engine`.
"""

from src.engine import (
    SimulationClock,
    PerformanceMetrics,
    SimulationEngine,
    AccessResult,
)

__all__ = [
    "SimulationClock",
    "PerformanceMetrics",
    "SimulationEngine",
    "AccessResult",
]
