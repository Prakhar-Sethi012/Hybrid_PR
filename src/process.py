"""
Process and PageTable Module for Page Replacement Simulator.

Provides:
- PageTableEntry: Represents the status of a virtual page (valid, dirty, frame_number, etc.)
  with dual attribute and dictionary-style access.
- PageTable: Hash map / dictionary data structure mapping page numbers to PageTableEntries.
- Process: Encapsulates process_id and its own dedicated PageTable.
"""

from typing import Any, Dict, Iterator, Optional, Union


class PageTableEntry:
    """
    Status of an individual virtual page table entry.

    Attributes:
        valid (bool): True if the page is currently loaded in physical memory.
        dirty (bool): True if the page has been modified since being loaded.
        frame_number (Optional[int]): Physical frame index mapped to this page, or None.
        referenced (bool): Reference bit used for replacement policies.
    """

    def __init__(
        self,
        valid: bool = False,
        dirty: bool = False,
        frame_number: Optional[int] = None,
        referenced: bool = False,
    ):
        self.valid: bool = bool(valid)
        self.dirty: bool = bool(dirty)
        self.frame_number: Optional[int] = frame_number
        self.referenced: bool = bool(referenced)

    def __getitem__(self, key: str) -> Any:
        if hasattr(self, key):
            return getattr(self, key)
        raise KeyError(f"Invalid PageTableEntry field: '{key}'")

    def __setitem__(self, key: str, value: Any) -> None:
        if hasattr(self, key):
            if key in ("valid", "dirty", "referenced"):
                setattr(self, key, bool(value))
            elif key == "frame_number":
                setattr(self, key, int(value) if value is not None else None)
            else:
                setattr(self, key, value)
        else:
            raise KeyError(f"Invalid PageTableEntry field: '{key}'")

    def __contains__(self, key: str) -> bool:
        return hasattr(self, key)

    def get(self, key: str, default: Any = None) -> Any:
        return getattr(self, key, default)

    def keys(self):
        return ("valid", "dirty", "frame_number", "referenced")

    def values(self):
        return (self.valid, self.dirty, self.frame_number, self.referenced)

    def items(self):
        return [
            ("valid", self.valid),
            ("dirty", self.dirty),
            ("frame_number", self.frame_number),
            ("referenced", self.referenced),
        ]

    def to_dict(self) -> Dict[str, Any]:
        """Returns entry fields as a standard dictionary."""
        return {
            "valid": self.valid,
            "dirty": self.dirty,
            "frame_number": self.frame_number,
            "referenced": self.referenced,
        }

    def __repr__(self) -> str:
        return (
            f"PageTableEntry(valid={self.valid}, dirty={self.dirty}, "
            f"frame_number={self.frame_number}, referenced={self.referenced})"
        )

    def __eq__(self, other: Any) -> bool:
        if isinstance(other, PageTableEntry):
            return (
                self.valid == other.valid
                and self.dirty == other.dirty
                and self.frame_number == other.frame_number
                and self.referenced == other.referenced
            )
        elif isinstance(other, dict):
            return (
                self.valid == other.get("valid", False)
                and self.dirty == other.get("dirty", False)
                and self.frame_number == other.get("frame_number", None)
            )
        return False


class PageTable(dict):
    """
    Hash map / dictionary representing a process's page table.
    Maps virtual page number (int) -> PageTableEntry.

    Inherits directly from dict to guarantee full hash-map dictionary compatibility
    while providing specialized page table helper methods.
    """

    def __getitem__(self, page_number: int) -> PageTableEntry:
        return super().__getitem__(int(page_number))

    def __setitem__(self, page_number: int, value: Union[PageTableEntry, Dict[str, Any]]) -> None:
        key = int(page_number)
        if isinstance(value, PageTableEntry):
            super().__setitem__(key, value)
        elif isinstance(value, dict):
            entry = PageTableEntry(
                valid=value.get("valid", False),
                dirty=value.get("dirty", False),
                frame_number=value.get("frame_number", None),
                referenced=value.get("referenced", False),
            )
            super().__setitem__(key, entry)
        else:
            raise TypeError(
                f"PageTable value must be PageTableEntry or dict, got {type(value)}"
            )

    def map_page(
        self,
        page_number: int,
        frame_number: int,
        valid: bool = True,
        dirty: bool = False,
    ) -> PageTableEntry:
        """
        Maps a page number to a physical frame, setting its valid and dirty bits.
        """
        entry = PageTableEntry(
            valid=valid,
            dirty=dirty,
            frame_number=frame_number,
            referenced=True,
        )
        self[page_number] = entry
        return entry

    def invalidate(self, page_number: int) -> Optional[PageTableEntry]:
        """
        Marks a page as invalid (not in physical memory) and detaches its frame.
        """
        if page_number in self:
            entry = self[page_number]
            entry.valid = False
            entry.frame_number = None
            return entry
        return None

    def is_valid(self, page_number: int) -> bool:
        """Checks if the page is currently marked valid (resident in memory)."""
        entry = self.get(page_number)
        return bool(entry.valid) if entry else False

    def is_dirty(self, page_number: int) -> bool:
        """Checks if the page is marked dirty (modified)."""
        entry = self.get(page_number)
        return bool(entry.dirty) if entry else False

    def set_dirty(self, page_number: int, dirty: bool = True) -> None:
        """Sets the dirty bit for the specified page."""
        if page_number not in self:
            self[page_number] = PageTableEntry(dirty=dirty)
        else:
            self[page_number].dirty = dirty

    def set_valid(self, page_number: int, valid: bool = True) -> None:
        """Sets the valid bit for the specified page."""
        if page_number not in self:
            self[page_number] = PageTableEntry(valid=valid)
        else:
            self[page_number].valid = valid


class Process:
    """
    Represents an operating system process participating in the memory simulation.

    Attributes:
        process_id (int): Unique identifier for the process.
        name (str): Human-readable process label.
        page_table (PageTable): The process's private page table (hash map).
    """

    def __init__(self, process_id: int, name: Optional[str] = None):
        """
        Initialize Process.

        Args:
            process_id: Unique integer process ID.
            name: Optional descriptive name (defaults to 'Process-<process_id>').
        """
        self.process_id: int = int(process_id)
        self.name: str = name if name is not None else f"Process-{process_id}"
        self.page_table: PageTable = PageTable()

    def get_page_entry(self, page_number: int) -> Optional[PageTableEntry]:
        """Retrieves page table entry for a virtual page, or None if unmapped."""
        return self.page_table.get(page_number)

    def is_page_valid(self, page_number: int) -> bool:
        """Returns True if the page is present in physical memory."""
        return self.page_table.is_valid(page_number)

    def is_page_dirty(self, page_number: int) -> bool:
        """Returns True if the page has been modified."""
        return self.page_table.is_dirty(page_number)

    def map_page(
        self,
        page_number: int,
        frame_number: int,
        valid: bool = True,
        dirty: bool = False,
    ) -> PageTableEntry:
        """Maps a virtual page to a physical frame in the process's page table."""
        return self.page_table.map_page(
            page_number=page_number,
            frame_number=frame_number,
            valid=valid,
            dirty=dirty,
        )

    def unmap_page(self, page_number: int) -> Optional[PageTableEntry]:
        """Invalidates a virtual page in the page table."""
        return self.page_table.invalidate(page_number)

    def __repr__(self) -> str:
        return f"Process(process_id={self.process_id}, pages_tracked={len(self.page_table)})"
