import React, { useState } from 'react';
import { Server, X, Flame } from 'lucide-react';

export default function PhysicalMemoryMap({
  memoryManager,
  currentStepData = null,
  algorithm = 'AdaptiveHybrid',
}) {
  const [selectedFrameId, setSelectedFrameId] = useState(null);
  const [filter, setFilter] = useState('ALL'); // 'ALL', 'CLEAN', 'DIRTY', 'EMPTY'

  const frames = memoryManager?.frames || [];
  const totalFrames = memoryManager?.frame_count || frames.length;
  const occupiedCount = frames.filter((f) => f.is_occupied).length;
  const dirtyCount = frames.filter((f) => f.is_occupied && f.dirty).length;
  const cleanCount = frames.filter((f) => f.is_occupied && !f.dirty).length;
  const emptyCount = totalFrames - occupiedCount;
  const utilPercent = totalFrames > 0 ? ((occupiedCount / totalFrames) * 100).toFixed(0) : 0;

  const filteredFrames = frames.filter((frame) => {
    if (filter === 'CLEAN') return frame.is_occupied && !frame.dirty;
    if (filter === 'DIRTY') return frame.is_occupied && frame.dirty;
    if (filter === 'EMPTY') return !frame.is_occupied;
    return true;
  });

  const selectedFrame =
    selectedFrameId !== null ? frames.find((f) => f.frame_id === selectedFrameId) : null;

  return (
    <div
      className="bg-[#0A0A0A] border border-[#222222] rounded-xl p-4 sm:p-5 mb-4"
      aria-label="Physical memory frame map"
    >
      {/* Header: Title and Occupancy */}
      <div className="pb-3 mb-3 border-b border-[#222222]">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#141414] border border-[#27272A] text-white">
              <Server className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight font-sans">
                Physical RAM Frames
              </h3>
              <p className="text-[11px] text-zinc-400 font-mono">
                Hardware memory die &bull; Policy: {algorithm}
              </p>
            </div>
          </div>

          <span className="text-xs px-2.5 py-1 rounded bg-[#141414] text-white border border-[#2E2E2E] font-mono font-bold">
            {occupiedCount} / {totalFrames} Allocated ({utilPercent}%)
          </span>
        </div>

        {/* State Filter Segmented Control */}
        <div className="grid grid-cols-4 gap-1.5 text-xs font-mono pt-1">
          <button
            type="button"
            onClick={() => setFilter('ALL')}
            className={`py-1.5 rounded text-center transition-all cursor-pointer font-medium border ${
              filter === 'ALL'
                ? 'bg-white text-black font-bold border-white'
                : 'bg-[#000000] text-zinc-400 border-[#222222] hover:text-white hover:border-[#383838]'
            }`}
          >
            All ({totalFrames})
          </button>
          <button
            type="button"
            onClick={() => setFilter('CLEAN')}
            className={`py-1.5 rounded text-center transition-all cursor-pointer font-medium border ${
              filter === 'CLEAN'
                ? 'bg-white text-black font-bold border-white'
                : 'bg-[#000000] text-zinc-400 border-[#222222] hover:text-white hover:border-[#383838]'
            }`}
          >
            Clean ({cleanCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('DIRTY')}
            className={`py-1.5 rounded text-center transition-all cursor-pointer font-medium border ${
              filter === 'DIRTY'
                ? 'bg-amber-500 text-black font-bold border-amber-500'
                : 'bg-[#000000] text-zinc-400 border-[#222222] hover:text-white hover:border-[#383838]'
            }`}
          >
            Dirty ({dirtyCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('EMPTY')}
            className={`py-1.5 rounded text-center transition-all cursor-pointer font-medium border ${
              filter === 'EMPTY'
                ? 'bg-zinc-700 text-white font-bold border-zinc-600'
                : 'bg-[#000000] text-zinc-400 border-[#222222] hover:text-white hover:border-[#383838]'
            }`}
          >
            Vacant ({emptyCount})
          </button>
        </div>
      </div>

      {/* Silicon Memory Frames Grid: 2 columns for zero text overlap */}
      <div className="grid grid-cols-2 gap-2.5">
        {filteredFrames.map((frame) => {
          const isTargeted = currentStepData?.frame_id === frame.frame_id;
          const isSelected = selectedFrameId === frame.frame_id;
          const isOccupied = frame.is_occupied;
          const isDirty = frame.dirty;

          let cardBorder = 'border-[#222222] bg-[#000000]';
          let badgeText = 'VACANT';
          let badgeStyle = 'bg-[#121212] text-zinc-500 border-[#222222]';

          if (isOccupied) {
            if (isDirty) {
              cardBorder = 'border-amber-600/70 bg-[#120B02]';
              badgeText = 'DIRTY';
              badgeStyle = 'bg-[#211100] text-amber-300 border-amber-600 font-bold';
            } else {
              cardBorder = 'border-[#2A2A2A] bg-[#0A0A0A]';
              badgeText = 'CLEAN';
              badgeStyle = 'bg-[#181818] text-zinc-300 border-[#303030] font-medium';
            }
          } else {
            cardBorder = 'border-dashed border-[#222222] bg-[#000000]';
          }

          return (
            <div
              key={frame.frame_id}
              onClick={() => setSelectedFrameId(frame.frame_id === selectedFrameId ? null : frame.frame_id)}
              className={`p-3 rounded-lg border text-xs transition-all duration-150 cursor-pointer relative flex flex-col justify-between ${cardBorder} ${
                isTargeted
                  ? 'ring-2 ring-white ring-offset-2 ring-offset-black animate-frame-pop'
                  : isSelected
                  ? 'ring-2 ring-zinc-400 border-white'
                  : 'hover:border-zinc-600'
              }`}
            >
              {/* Header: Frame Index & Status Badge */}
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-[11px] font-bold text-zinc-400">
                  Frame #{String(frame.frame_id).padStart(2, '0')}
                </span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${badgeStyle} flex items-center gap-1`}>
                  {isDirty && <Flame className="w-2.5 h-2.5 text-amber-400" />}
                  <span>{badgeText}</span>
                </span>
              </div>

              {/* Resident Virtual Page */}
              <div className="my-1.5 text-center">
                {isOccupied ? (
                  <div>
                    <div className="text-2xl font-black font-mono text-white tracking-tight">
                      P{String(frame.page_number).padStart(2, '0')}
                    </div>
                    <div className="text-[10px] font-mono text-zinc-500 mt-0.5">
                      Resident Virtual Page
                    </div>
                  </div>
                ) : (
                  <div className="text-xs font-mono text-zinc-600 italic py-2">
                    Empty Slot
                  </div>
                )}
              </div>

              {/* Bottom Metadata: Score & Hits cleanly separated */}
              <div className="pt-1.5 border-t border-[#1C1C1E] flex items-center justify-between text-[11px] font-mono text-zinc-400">
                {isOccupied ? (
                  <>
                    <span className="text-zinc-200 font-medium">
                      S(p): {frame.hybrid_score !== undefined ? frame.hybrid_score.toFixed(2) : '1.00'}
                    </span>
                    <span className="text-zinc-400">Hits: {frame.access_count ?? 1}</span>
                  </>
                ) : (
                  <span className="text-zinc-700">Unallocated</span>
                )}
              </div>

              {/* Active Marker Indicator */}
              {isTargeted && (
                <div className="absolute -top-2 right-2 bg-white text-black text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shadow uppercase">
                  ACTIVE
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Frame Inspector Drawer */}
      {selectedFrame && (
        <div className="mt-3 p-3.5 rounded-lg bg-[#000000] border border-[#2E2E2E]">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#222222]">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-white font-sans">
                Frame #{selectedFrame.frame_id} Inspector
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${
                  selectedFrame.is_occupied
                    ? selectedFrame.dirty
                      ? 'bg-[#211100] text-amber-300 border-amber-600'
                      : 'bg-[#181818] text-zinc-300 border-[#303030]'
                    : 'bg-[#121212] text-zinc-500 border-[#222222]'
                }`}
              >
                {selectedFrame.is_occupied
                  ? selectedFrame.dirty
                    ? 'DIRTY (Requires 10ms Disk Flush on Eviction)'
                    : 'CLEAN (Instant 0ms Eviction)'
                  : 'VACANT'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedFrameId(null)}
              className="text-zinc-400 hover:text-white p-1 rounded hover:bg-[#181818] cursor-pointer"
              aria-label="Close inspector"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {selectedFrame.is_occupied ? (
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2 rounded bg-[#0A0A0A] border border-[#222222]">
                <span className="text-[10px] text-zinc-500 uppercase block">Page Number</span>
                <span className="text-sm font-bold text-white">Page {selectedFrame.page_number}</span>
              </div>
              <div className="p-2 rounded bg-[#0A0A0A] border border-[#222222]">
                <span className="text-[10px] text-zinc-500 uppercase block">Hybrid Score S(p)</span>
                <span className="text-sm font-bold text-white">
                  {selectedFrame.hybrid_score !== undefined ? selectedFrame.hybrid_score.toFixed(4) : '1.0000'}
                </span>
              </div>
              <div className="p-2 rounded bg-[#0A0A0A] border border-[#222222]">
                <span className="text-[10px] text-zinc-500 uppercase block">Access Frequency</span>
                <span className="text-sm font-bold text-white">{selectedFrame.access_count ?? 1} Accesses</span>
              </div>
              <div className="p-2 rounded bg-[#0A0A0A] border border-[#222222]">
                <span className="text-[10px] text-zinc-500 uppercase block">Eviction Cost</span>
                <span className={`text-sm font-bold ${selectedFrame.dirty ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {selectedFrame.dirty ? '10ms Flush Penalty' : '0ms Instant'}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-zinc-400 font-mono py-1">
              This frame slot is currently vacant and ready for zero-overhead allocation.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
