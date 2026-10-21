import React, { useState } from 'react';
import { Layers, Flame, Check, Info, Server, Cpu, HardDrive } from 'lucide-react';

export default function RAMVisualizer({
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
    <div className="bg-[#121215] border border-zinc-800 rounded-xl p-5 mb-5 shadow-sm">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-800/80 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300">
            <Server className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">
                Physical Memory Frames
              </h2>
              <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono">
                {occupiedCount}/{totalFrames} Frames ({utilPercent}%)
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Live RAM state at current step &bull; Resident pages, dirty bits &bull; Policy: {algorithm}
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
          <button
            type="button"
            onClick={() => setFilter('ALL')}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              filter === 'ALL'
                ? 'bg-zinc-200 text-zinc-900 font-medium'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            All ({totalFrames})
          </button>
          <button
            type="button"
            onClick={() => setFilter('CLEAN')}
            className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
              filter === 'CLEAN'
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/80 font-medium'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Clean ({cleanCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('DIRTY')}
            className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
              filter === 'DIRTY'
                ? 'bg-amber-950/80 text-amber-300 border border-amber-700/80 font-medium'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Dirty +δ ({dirtyCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('EMPTY')}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              filter === 'EMPTY'
                ? 'bg-zinc-800 text-zinc-200 border border-zinc-700 font-medium'
                : 'bg-zinc-900 text-zinc-500 hover:text-zinc-300 border border-zinc-800'
            }`}
          >
            Empty ({emptyCount})
          </button>
        </div>
      </div>

      {/* Frame Grid */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
        {filteredFrames.map((frame) => {
          const isSelected = selectedFrameId === frame.frame_id;
          const isOccupied = frame.is_occupied;
          const isDirty = isOccupied && frame.dirty;
          const isClean = isOccupied && !frame.dirty;

          // Check if this frame is the active frame of current step
          const isActiveFrame = currentStepData && currentStepData.frame_id === frame.frame_id;
          const isHitOnFrame = isActiveFrame && currentStepData.action === 'HIT';
          const isFaultLoadedHere = isActiveFrame && currentStepData.action === 'FAULT';

          let cardBorder = 'border-zinc-800 hover:border-zinc-700 bg-[#09090b]';
          if (isActiveFrame) {
            cardBorder = isHitOnFrame
              ? 'border-emerald-500/80 ring-1 ring-emerald-500/50 bg-emerald-950/10'
              : 'border-rose-500/80 ring-1 ring-rose-500/50 bg-rose-950/10';
          } else if (isSelected) {
            cardBorder = 'border-zinc-400 ring-1 ring-zinc-400 bg-zinc-900';
          } else if (isDirty) {
            cardBorder = 'border-amber-900/50 hover:border-amber-700/60 bg-[#0d0c0a]';
          }

          return (
            <div
              key={frame.frame_id}
              onClick={() => setSelectedFrameId(isSelected ? null : frame.frame_id)}
              className={`relative cursor-pointer rounded-lg p-3 border transition-colors ${cardBorder}`}
            >
              {/* Frame Header */}
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 mb-1.5">
                <span className="font-medium text-zinc-300">Frame #{frame.frame_id}</span>
                <div className="flex items-center gap-1">
                  {isActiveFrame && (
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase ${
                        isHitOnFrame ? 'bg-emerald-900 text-emerald-300' : 'bg-rose-900 text-rose-300'
                      }`}
                    >
                      {isHitOnFrame ? 'HIT' : 'NEW'}
                    </span>
                  )}
                  {isOccupied && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isDirty ? 'bg-amber-400' : 'bg-emerald-400'
                      }`}
                    />
                  )}
                </div>
              </div>

              {/* Page Number */}
              <div className="py-1 text-center">
                {isOccupied ? (
                  <div>
                    <div className="text-lg font-bold font-mono text-zinc-100 tracking-tight">
                      Page {frame.page_number}
                    </div>
                    <div className="text-[10px] font-mono text-zinc-500">
                      PID: {frame.process_id ?? 1}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs font-mono text-zinc-600 italic py-2">
                    [ Empty ]
                  </div>
                )}
              </div>

              {/* Frame Footer / State */}
              <div className="mt-1.5 pt-1.5 border-t border-zinc-800/80 flex items-center justify-between text-[10px] font-mono">
                {isOccupied ? (
                  <>
                    <span
                      className={`px-1 rounded border text-[9px] ${
                        isDirty
                          ? 'bg-amber-950/40 text-amber-400 border-amber-800/60 font-semibold'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                      }`}
                    >
                      {isDirty ? 'DIRTY +δ' : 'CLEAN'}
                    </span>
                    <span className="text-zinc-500 font-mono" title="Hybrid Score S(p)">
                      S: {frame.hybrid_score?.toFixed(2) ?? '0.00'}
                    </span>
                  </>
                ) : (
                  <span className="text-zinc-600 text-[10px]">&mdash;</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Frame Detail Drawer */}
      {selectedFrame && (
        <div className="mt-4 p-3.5 rounded-lg bg-[#09090b] border border-zinc-800 text-xs font-mono">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-zinc-400" />
              <span className="font-semibold text-zinc-200">
                Frame #{selectedFrame.frame_id} State Inspector
              </span>
              <span className="text-zinc-500">
                ({selectedFrame.is_occupied ? `Page ${selectedFrame.page_number}` : 'Unallocated'})
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedFrameId(null)}
              className="text-zinc-400 hover:text-zinc-200 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[11px]"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-[11px]">
            <div className="p-2 rounded bg-zinc-900/60 border border-zinc-800/80">
              <div className="text-zinc-500 text-[10px]">Page</div>
              <div className="font-bold text-zinc-200">
                {selectedFrame.is_occupied ? `Page ${selectedFrame.page_number}` : 'None'}
              </div>
            </div>
            <div className="p-2 rounded bg-zinc-900/60 border border-zinc-800/80">
              <div className="text-zinc-500 text-[10px]">Dirty State</div>
              <div className={selectedFrame.dirty ? 'font-bold text-amber-400' : 'font-bold text-emerald-400'}>
                {selectedFrame.dirty ? 'DIRTY (+δ Penalty)' : 'CLEAN'}
              </div>
            </div>
            <div className="p-2 rounded bg-zinc-900/60 border border-zinc-800/80">
              <div className="text-zinc-500 text-[10px]">Hybrid Score S(p)</div>
              <div className="font-bold text-zinc-200">
                {selectedFrame.hybrid_score?.toFixed(4) ?? '0.0000'}
              </div>
            </div>
            <div className="p-2 rounded bg-zinc-900/60 border border-zinc-800/80">
              <div className="text-zinc-500 text-[10px]">Access Count (LFU)</div>
              <div className="font-bold text-zinc-200">{selectedFrame.access_count ?? 0} refs</div>
            </div>
            <div className="p-2 rounded bg-zinc-900/60 border border-zinc-800/80">
              <div className="text-zinc-500 text-[10px]">Last Ref Tick (LRU)</div>
              <div className="font-bold text-zinc-200">
                #{selectedFrame.last_referenced_time ?? 0}
              </div>
            </div>
            <div className="p-2 rounded bg-zinc-900/60 border border-zinc-800/80">
              <div className="text-zinc-500 text-[10px]">Load Arrival Tick</div>
              <div className="font-bold text-zinc-200">#{selectedFrame.load_time ?? 0}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
