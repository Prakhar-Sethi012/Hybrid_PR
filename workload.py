"""
Root forwarding module for workload generator.
Allows `from workload import ...` and `import workload`.
"""

from src.workload import (
    WorkloadGenerator,
    generate_sequential,
    generate_loop,
    generate_random,
    generate_zipf_hot_cold,
    _parse_page_range,
)

__all__ = [
    "WorkloadGenerator",
    "generate_sequential",
    "generate_loop",
    "generate_random",
    "generate_zipf_hot_cold",
    "_parse_page_range",
]
