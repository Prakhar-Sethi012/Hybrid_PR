"""
Workload Generator Module for Page Replacement Simulator.

Provides synthetic and realistic page access trace generation supporting:
1. Sequential scan (linear page sweep)
2. Looping reference patterns (repeated sequences)
3. Uniform random reference patterns
4. Zipfian Hot/Cold temporal locality patterns (80% requests target 20% pages)
"""

import random
from typing import List, Optional, Sequence, Tuple, Union


def _parse_page_range(page_range: Union[int, Tuple[int, int], range, Sequence[int]]) -> List[int]:
    """
    Parses various page range representations into a concrete list of integer page numbers.

    Supported formats:
    - int N: pages [0, 1, ..., N - 1]
    - tuple/list (low, high): pages [low, low + 1, ..., high - 1]
    - range object: list(range)
    - sequence/list of ints: direct page list
    """
    if isinstance(page_range, int):
        if page_range <= 0:
            raise ValueError(f"page_range as int must be > 0, got {page_range}")
        return list(range(page_range))
    elif isinstance(page_range, range):
        pages = list(page_range)
        if not pages:
            raise ValueError("page_range cannot be empty")
        return pages
    elif isinstance(page_range, (tuple, list)):
        if len(page_range) == 2 and isinstance(page_range[0], int) and isinstance(page_range[1], int):
            low, high = page_range
            if low >= high:
                raise ValueError(f"Invalid page range bounds: low ({low}) >= high ({high})")
            return list(range(low, high))
        elif all(isinstance(x, int) for x in page_range):
            if not page_range:
                raise ValueError("page_range sequence cannot be empty")
            return list(page_range)
        else:
            raise TypeError("page_range sequence must contain integer page numbers")
    else:
        raise TypeError(
            f"Unsupported type for page_range: {type(page_range)}. "
            f"Expected int, tuple (low, high), range, or Sequence[int]."
        )


class WorkloadGenerator:
    """
    Generates synthetic memory workload traces for page replacement simulations.

    Attributes:
        number_of_references (Optional[int]): Default length of generated traces.
        rng (random.Random): Dedicated pseudo-random number generator for reproducible traces.
    """

    def __init__(self, number_of_references: Optional[int] = None, seed: Optional[int] = None):
        """
        Initialize WorkloadGenerator.

        Args:
            number_of_references: Optional default trace length for methods where length is variable.
            seed: Optional integer seed for reproducible pseudo-random generation.
        """
        if number_of_references is not None and number_of_references < 0:
            raise ValueError(f"number_of_references must be >= 0, got {number_of_references}")
        self.number_of_references: Optional[int] = number_of_references
        self.rng: random.Random = random.Random(seed)

    def set_seed(self, seed: Optional[int]) -> None:
        """Sets the random seed for reproducible traces."""
        self.rng = random.Random(seed)

    def _resolve_num_references(self, num_references: Optional[int], fallback: Optional[int] = None) -> int:
        """Helper to determine the target number of references."""
        if num_references is not None:
            if num_references < 0:
                raise ValueError(f"num_references must be non-negative, got {num_references}")
            return num_references
        if self.number_of_references is not None:
            return self.number_of_references
        if fallback is not None:
            return fallback
        raise ValueError(
            "number_of_references was not specified during generator initialization or method invocation."
        )

    def generate_sequential(
        self,
        start: int,
        end: int,
        inclusive: bool = True,
        num_references: Optional[int] = None,
    ) -> List[int]:
        """
        Scans linearly through a range of pages.

        Args:
            start: Starting page number.
            end: Ending page number.
            inclusive: If True (default), includes 'end'; if False, scans up to 'end' (exclusive).
            num_references: Optional total references to produce. If provided or if
                           self.number_of_references is set, cycles or slices the scan
                           to match this exact length. If neither is set, scans the range once.

        Returns:
            List[int]: Array of page reference integers.
        """
        if start <= end:
            step = 1
            stop = end + 1 if inclusive else end
            base_sequence = list(range(start, stop, step))
        else:
            step = -1
            stop = end - 1 if inclusive else end
            base_sequence = list(range(start, stop, step))

        if not base_sequence:
            return []

        # Check if caller wants a specific total length
        target_len = num_references if num_references is not None else self.number_of_references
        if target_len is None:
            return base_sequence

        if target_len < 0:
            raise ValueError(f"target references count must be >= 0, got {target_len}")

        # Cycle or slice base_sequence to achieve target_len
        full_cycles = target_len // len(base_sequence)
        remainder = target_len % len(base_sequence)
        return (base_sequence * full_cycles) + base_sequence[:remainder]

    def generate_loop(
        self,
        sequence: Sequence[int],
        iterations: Optional[int] = None,
        num_references: Optional[int] = None,
    ) -> List[int]:
        """
        Repeats a specific sequence of pages.

        Args:
            sequence: Sequence of page numbers to repeat.
            iterations: Number of full repetitions of the sequence. If specified,
                        it produces len(sequence) * iterations references unless
                        num_references is also provided to truncate/pad.
            num_references: Optional explicit length of reference array to produce.
                           If iterations is None, repeats sequence until reaching num_references.

        Returns:
            List[int]: Array of page reference integers.
        """
        seq_list = list(sequence)
        if not seq_list:
            raise ValueError("Sequence to loop cannot be empty.")

        if iterations is not None:
            if iterations < 0:
                raise ValueError(f"iterations must be >= 0, got {iterations}")
            repeated = seq_list * iterations
            if num_references is not None:
                return repeated[:num_references]
            return repeated

        # If iterations is not provided, use num_references or self.number_of_references
        target_len = self._resolve_num_references(num_references, fallback=len(seq_list))
        full_cycles = target_len // len(seq_list)
        remainder = target_len % len(seq_list)
        return (seq_list * full_cycles) + seq_list[:remainder]

    def generate_random(
        self,
        page_range: Union[int, Tuple[int, int], range, Sequence[int]],
        num_references: Optional[int] = None,
    ) -> List[int]:
        """
        Uniformly distributed random page requests across the given page range.

        Args:
            page_range: Page pool representation (int count, (low, high) tuple, range, or list).
            num_references: Number of page references to generate. Defaults to
                           self.number_of_references or the size of page_range.

        Returns:
            List[int]: Array of uniformly chosen page reference integers.
        """
        pages = _parse_page_range(page_range)
        target_len = self._resolve_num_references(num_references, fallback=len(pages))
        if target_len == 0:
            return []

        return [self.rng.choice(pages) for _ in range(target_len)]

    def generate_zipf_hot_cold(
        self,
        page_range: Union[int, Tuple[int, int], range, Sequence[int]],
        hot_page_ratio: float = 0.2,
        hot_request_ratio: float = 0.8,
        num_references: Optional[int] = None,
        zipf_alpha: Optional[float] = None,
    ) -> List[int]:
        """
        Simulates temporal locality where 80% of requests target 20% of the pages.

        The page address space is divided into:
        - Hot pages: top 'hot_page_ratio' fraction of pages (default 20%).
        - Cold pages: remaining '1 - hot_page_ratio' fraction of pages (default 80%).

        Each memory reference selects from the hot pages with probability 'hot_request_ratio'
        (default 80%) and from the cold pages with probability '1 - hot_request_ratio' (20%).
        An optional 'zipf_alpha' parameter can be supplied to apply Zipf rank-skew within hot pages.

        Args:
            page_range: Page pool representation.
            hot_page_ratio: Fraction of address space considered hot (default 0.2 = 20%).
            hot_request_ratio: Probability of selecting a hot page (default 0.8 = 80%).
            num_references: Total references to generate.
            zipf_alpha: Optional exponent for Zipf distribution within hot pages.

        Returns:
            List[int]: Array of page reference integers exhibiting temporal locality.
        """
        if not (0.0 < hot_page_ratio < 1.0):
            raise ValueError(f"hot_page_ratio must be strictly between 0 and 1, got {hot_page_ratio}")
        if not (0.0 <= hot_request_ratio <= 1.0):
            raise ValueError(f"hot_request_ratio must be between 0 and 1, got {hot_request_ratio}")

        pages = _parse_page_range(page_range)
        target_len = self._resolve_num_references(num_references, fallback=len(pages))
        if target_len == 0:
            return []

        num_pages = len(pages)
        num_hot = max(1, int(round(num_pages * hot_page_ratio)))
        # Ensure hot pages does not consume all pages if total pages > 1
        if num_hot >= num_pages and num_pages > 1:
            num_hot = num_pages - 1

        hot_pages = pages[:num_hot]
        cold_pages = pages[num_hot:]

        # Calculate Zipf weights for hot pages if requested
        hot_weights = None
        if zipf_alpha is not None and len(hot_pages) > 1:
            raw_weights = [1.0 / ((i + 1) ** zipf_alpha) for i in range(len(hot_pages))]
            total_w = sum(raw_weights)
            hot_weights = [w / total_w for w in raw_weights]

        references: List[int] = []
        for _ in range(target_len):
            if not cold_pages or self.rng.random() < hot_request_ratio:
                # Hot page selection
                if hot_weights is not None:
                    chosen = self.rng.choices(hot_pages, weights=hot_weights, k=1)[0]
                else:
                    chosen = self.rng.choice(hot_pages)
            else:
                # Cold page selection
                chosen = self.rng.choice(cold_pages)
            references.append(chosen)

        return references


# Module-level convenience functions using a shared default generator
_default_generator = WorkloadGenerator()


def generate_sequential(
    start: int,
    end: int,
    inclusive: bool = True,
    num_references: Optional[int] = None,
) -> List[int]:
    """Scans linearly through a range of pages."""
    return _default_generator.generate_sequential(
        start=start, end=end, inclusive=inclusive, num_references=num_references
    )


def generate_loop(
    sequence: Sequence[int],
    iterations: Optional[int] = None,
    num_references: Optional[int] = None,
) -> List[int]:
    """Repeats a specific sequence of pages."""
    return _default_generator.generate_loop(
        sequence=sequence, iterations=iterations, num_references=num_references
    )


def generate_random(
    page_range: Union[int, Tuple[int, int], range, Sequence[int]],
    num_references: Optional[int] = None,
) -> List[int]:
    """Uniformly distributed random page requests."""
    return _default_generator.generate_random(page_range=page_range, num_references=num_references)


def generate_zipf_hot_cold(
    page_range: Union[int, Tuple[int, int], range, Sequence[int]],
    hot_page_ratio: float = 0.2,
    hot_request_ratio: float = 0.8,
    num_references: Optional[int] = None,
    zipf_alpha: Optional[float] = None,
) -> List[int]:
    """Simulates temporal locality where 80% of requests target 20% of the pages."""
    return _default_generator.generate_zipf_hot_cold(
        page_range=page_range,
        hot_page_ratio=hot_page_ratio,
        hot_request_ratio=hot_request_ratio,
        num_references=num_references,
        zipf_alpha=zipf_alpha,
    )
