"""
Physical Memory Management Module for Page Replacement Simulator.

Provides:
- Frame: Represents a single physical page frame in main memory.
- MemoryManager: Tracks frame allocation, free frames, and occupied frames
  without embedding replacement policies or fault handling (reserved for Stage 2).
"""

from typing import List, Optional, Set


class Frame:
    """
    Represents an individual physical memory frame.

    Attributes:
        frame_id (int): Zero-based index of the physical frame.
        process_id (Optional[int]): Process owning this frame, or None if free.
        page_number (Optional[int]): Virtual page number mapped to this frame.
        is_occupied (bool): True if currently allocated; False if free.
        last_referenced_time (float): Timestamp of last access (ready for LRU in Stage 2).
        reference_bit (bool): Reference bit for Clock/Second-Chance (ready for Stage 2).
        dirty_bit (bool): Dirty bit indicating whether frame holds modified data.
    """

    def __init__(self, frame_id: int):
        self.frame_id: int = int(frame_id)
        self.process_id: Optional[int] = None
        self.page_number: Optional[int] = None
        self.is_occupied: bool = False
        self.last_referenced_time: float = 0.0
        self.reference_bit: bool = False
        self.dirty_bit: bool = False
        self.hybrid_score: float = 0.0

    @property
    def frame_number(self) -> int:
        """Alias for frame_id."""
        return self.frame_id

    @property
    def is_free(self) -> bool:
        """True if the frame is not currently occupied."""
        return not self.is_occupied

    def allocate(
        self,
        process_id: int,
        page_number: int,
        dirty: bool = False,
        hybrid_score: float = 1.0,
    ) -> None:
        """Marks the frame as occupied and binds it to a process and page."""
        self.process_id = int(process_id)
        self.page_number = int(page_number)
        self.is_occupied = True
        self.reference_bit = True
        self.dirty_bit = bool(dirty)
        self.hybrid_score = float(hybrid_score)

    def clear(self) -> None:
        """Frees the frame and clears associated metadata."""
        self.process_id = None
        self.page_number = None
        self.is_occupied = False
        self.last_referenced_time = 0.0
        self.reference_bit = False
        self.dirty_bit = False
        self.hybrid_score = 0.0

    def __repr__(self) -> str:
        if self.is_occupied:
            return f"Frame(id={self.frame_id}, occupied=True, pid={self.process_id}, page={self.page_number})"
        return f"Frame(id={self.frame_id}, occupied=False, free=True)"


class MemoryManager:
    """
    Manages physical memory frames, keeping strict track of free and occupied frames.

    Designed to be modular: does NOT perform replacement logic or page fault handling.
    Exposes explicit state querying and frame allocation/deallocation primitives.

    Attributes:
        frame_count (int): Fixed total number of physical memory frames.
        frames (List[Frame]): Array of Frame objects [0 .. frame_count - 1].
        free_frames (Set[int]): Set of frame IDs currently free.
        occupied_frames (Set[int]): Set of frame IDs currently occupied.
    """

    def __init__(self, frame_count: int):
        """
        Initialize MemoryManager.

        Args:
            frame_count: Fixed number of physical frames in memory (> 0).
        """
        if not isinstance(frame_count, int) or frame_count <= 0:
            raise ValueError(f"frame_count must be a positive integer, got: {frame_count}")

        self.frame_count: int = frame_count
        self.frames: List[Frame] = [Frame(frame_id=i) for i in range(frame_count)]
        self.free_frames: Set[int] = set(range(frame_count))
        self.occupied_frames: Set[int] = set()

    @property
    def free_frame_count(self) -> int:
        """Number of free physical frames remaining."""
        return len(self.free_frames)

    @property
    def occupied_frame_count(self) -> int:
        """Number of currently occupied physical frames."""
        return len(self.occupied_frames)

    def is_full(self) -> bool:
        """True if all physical frames are occupied."""
        return len(self.free_frames) == 0

    def is_frame_free(self, frame_id: int) -> bool:
        """Checks if a given frame ID is free."""
        self._validate_frame_id(frame_id)
        return frame_id in self.free_frames

    def is_frame_occupied(self, frame_id: int) -> bool:
        """Checks if a given frame ID is occupied."""
        self._validate_frame_id(frame_id)
        return frame_id in self.occupied_frames

    def get_free_frames(self) -> List[int]:
        """Returns sorted list of currently free physical frame IDs."""
        return sorted(list(self.free_frames))

    def get_occupied_frames(self) -> List[int]:
        """Returns sorted list of currently occupied physical frame IDs."""
        return sorted(list(self.occupied_frames))

    def get_frame(self, frame_id: int) -> Frame:
        """Retrieves the Frame object by ID."""
        self._validate_frame_id(frame_id)
        return self.frames[frame_id]

    def allocate_frame(
        self,
        process_id: int,
        page_number: int,
        frame_id: Optional[int] = None,
        dirty: bool = False,
        hybrid_score: float = 1.0,
    ) -> Optional[int]:
        """
        Allocates a physical frame to the given process_id and page_number.

        If frame_id is provided, attempts to allocate that specific frame (must be free).
        If frame_id is None, selects the lowest-index available free frame.

        Returns:
            The allocated frame ID, or None if no free frames are available.

        Note: Does not perform replacement; if memory is full, returns None.
        """
        if self.is_full() and frame_id is None:
            return None

        if frame_id is not None:
            self._validate_frame_id(frame_id)
            if frame_id not in self.free_frames:
                raise ValueError(f"Cannot allocate frame {frame_id}: already occupied.")
            target_id = frame_id
        else:
            target_id = min(self.free_frames)

        self.free_frames.remove(target_id)
        self.occupied_frames.add(target_id)
        self.frames[target_id].allocate(
            process_id=process_id,
            page_number=page_number,
            dirty=dirty,
            hybrid_score=hybrid_score,
        )
        return target_id

    def free_frame(self, frame_id: int) -> Optional[Frame]:
        """
        Releases an occupied physical frame back to the free pool.

        Args:
            frame_id: The ID of the frame to free.

        Returns:
            The Frame object that was cleared, or None if it was already free.
        """
        self._validate_frame_id(frame_id)
        if frame_id in self.occupied_frames:
            self.occupied_frames.remove(frame_id)
            self.free_frames.add(frame_id)
            frame = self.frames[frame_id]
            frame.clear()
            return frame
        return None

    def reset(self) -> None:
        """Resets all frames to the unallocated, free initial state."""
        self.free_frames = set(range(self.frame_count))
        self.occupied_frames.clear()
        for frame in self.frames:
            frame.clear()

    def _validate_frame_id(self, frame_id: int) -> None:
        if not isinstance(frame_id, int) or not (0 <= frame_id < self.frame_count):
            raise IndexError(
                f"frame_id {frame_id} out of bounds: must be in range [0, {self.frame_count - 1}]"
            )

    def __repr__(self) -> str:
        return (
            f"MemoryManager(total_frames={self.frame_count}, "
            f"free={self.free_frame_count}, occupied={self.occupied_frame_count})"
        )
