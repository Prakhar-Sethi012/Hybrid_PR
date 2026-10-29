import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import InstructionTape from './InstructionTape';

// Floating C(p) Tooltip
function CpTooltip({ frame, liveSp, liveCp }) {
  const [show, setShow] = useState(false);
  const timerRef = useRef(null);

  const handleEnter = () => {
    timerRef.current = setTimeout(() => setShow(true), 80);
  };
  const handleLeave = () => {
    clearTimeout(timerRef.current);
    setShow(false);
  };

  const penalty = frame.dirty ? 2.0 : 0.0;

  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <span className="text-[10px] font-mono text-zinc-500 hover:text-zinc-300 transition-colors cursor-help">
        S: {liveSp.toFixed(2)} · C: {liveCp.toFixed(2)}
      </span>

      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 animate-tooltip-in pointer-events-none w-52 block">
          <span className="block bg-[#161616] rounded-lg p-2.5 shadow-2xl text-[10px] font-mono text-zinc-300">
            <span className="block font-bold text-zinc-100 pb-1 mb-1 border-b border-zinc-800">
              Live Decay Math · Frame #{frame.frame_id}
            </span>
            <span className="block space-y-0.5">
              <span className="flex justify-between">
                <span className="text-zinc-500">Decayed S(p)</span>
                <span className="font-semibold text-zinc-200">{liveSp.toFixed(4)}</span>
              </span>
              <span className="flex justify-between">
                <span className={frame.dirty ? 'text-amber-400' : 'text-zinc-500'}>
                  Dirty Penalty δ
                </span>
                <span className={frame.dirty ? 'text-amber-400 font-semibold' : 'text-zinc-500'}>
                  +{penalty.toFixed(1)}
                </span>
              </span>
              <span className="flex justify-between pt-0.5 border-t border-zinc-800">
                <span className="text-zinc-200 font-bold">Live C(p)</span>
                <span className="font-bold text-zinc-100">{liveCp.toFixed(4)}</span>
              </span>
            </span>
          </span>
          <span className="flex justify-center">
            <span className="w-1.5 h-1.5 bg-[#161616] rotate-45 -mt-0.5 inline-block" />
          </span>
        </span>
      )}
    </span>
  );
}

/**
 * PhysicalMemoryMap — Minimalist silicon RAM frame visualizer.
 * Incorporates InstructionTape seamlessly into the header area directly above RAM frames.
 * Displays real-time decayed live_Sp and live_Cp math on each occupied frame card.
 */
export default function PhysicalMemoryMap({
  memoryManager,
  currentStepData = null,
  algorithm = 'AdaptiveHybrid',
  referenceString = [],
  currentIndex = 0,
  executionTrace = [],
  customReference = false,
}) {
  const [selectedFrameId, setSelectedFrameId] = useState(null);
  const [filter, setFilter] = useState('ALL'); // 'ALL', 'CLEAN', 'DIRTY', 'EMPTY'
  const [flashingFrameId, setFlashingFrameId] = useState(null);

  const frames = memoryManager?.frames || [];
  const totalFrames = memoryManager?.frame_count || frames.length;
  const occupiedCount = frames.filter((f) => f.is_occupied).length;
  const dirtyCount = frames.filter((f) => f.is_occupied && f.dirty).length;
  const cleanCount = frames.filter((f) => f.is_occupied && !f.dirty).length;
  const emptyCount = totalFrames - occupiedCount;
  const utilPercent = totalFrames > 0 ? ((occupiedCount / totalFrames) * 100).toFixed(0) : 0;

  // Trigger dirty eviction subtle flash
  useEffect(() => {
    if (currentStepData?.was_dirty_write_back && currentStepData?.frame_id !== undefined) {
      setFlashingFrameId(currentStepData.frame_id);
      const timer = setTimeout(() => setFlashingFrameId(null), 800);
      return () => clearTimeout(timer);
    }
  }, [currentStepData?.step_id, currentStepData?.was_dirty_write_back]);

  const filteredFrames = frames.filter((frame) => {
    if (filter === 'CLEAN') return frame.is_occupied && !frame.dirty;
    if (filter === 'DIRTY') return frame.is_occupied && frame.dirty;
    if (filter === 'EMPTY') return !frame.is_occupied;
    return true;
  });

  const selectedFrame =
    selectedFrameId !== null ? frames.find((f) => f.frame_id === selectedFrameId) : null;

  const filterBtns = [
    { id: 'ALL', label: `All ${totalFrames}` },
    { id: 'CLEAN', label: `Clean ${cleanCount}` },
    { id: 'DIRTY', label: `Dirty ${dirtyCount}` },
    { id: 'EMPTY', label: `Vacant ${emptyCount}` },
  ];

  return (
    <div className="bg-[#111111] rounded-lg p-4 mb-3" aria-label="Physical memory frame map">
      {/* Header & Filter Row */}
      <div className="flex items-center justify-between pb-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-zinc-200 tracking-tight font-sans">
            Physical RAM
          </span>
          <span className="text-[10px] text-zinc-500 font-mono">
            {occupiedCount}/{totalFrames} ({utilPercent}%)
          </span>
        </div>

        {/* Minimalist Filter Pills — unboxed, typography driven */}
        <div className="flex items-center gap-1 text-[11px] font-mono">
          {filterBtns.map((btn) => (
            <button
              key={btn.id}
              type="button"
              onClick={() => setFilter(btn.id)}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                filter === btn.id
                  ? 'bg-zinc-800 text-zinc-100 font-semibold'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Seamlessly Integrated Instruction Tape directly above RAM frames */}
      {referenceString && referenceString.length > 0 && (
        <div className="mb-3 pt-1 border-t border-zinc-900">
          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 mb-1">
            <span className="text-zinc-400 font-medium">Reference Stream</span>
            <span className="text-zinc-500">
              {customReference && <span className="text-amber-400 mr-1.5 font-medium">custom</span>}
              Ref #{currentIndex + 1} / {referenceString.length}
            </span>
          </div>
          <InstructionTape
            referenceString={referenceString}
            currentIndex={currentIndex}
            executionTrace={executionTrace}
          />
        </div>
      )}

      {/* Silicon Memory Frames Grid — 95% monochrome, unboxed cards */}
      <div className="grid grid-cols-2 gap-2">
        {filteredFrames.map((frame) => {
          const isTargeted = currentStepData?.frame_id === frame.frame_id;
          const isSelected = selectedFrameId === frame.frame_id;
          const isOccupied = frame.is_occupied;
          const isDirty = frame.dirty;
          const isFlashing = flashingFrameId === frame.frame_id;

          // Real-time decayed math from backend live snapshot
          const liveSp = frame.live_Sp !== undefined
            ? frame.live_Sp
            : (frame.hybrid_score ?? 1.0);
          const liveCp = frame.live_Cp !== undefined
            ? frame.live_Cp
            : (liveSp + (isDirty ? 2.0 : 0.0));

          // Ghost Victims: identify which alternative algorithms would have evicted this frame
          const ghostAlgos = [];
          if (currentStepData?.alternative_victims) {
            Object.entries(currentStepData.alternative_victims).forEach(([algoName, victimFid]) => {
              if (victimFid === frame.frame_id) {
                ghostAlgos.push(algoName);
              }
            });
          }
          const ghostLabel = ghostAlgos.length > 0 ? `[${ghostAlgos.join(' / ')} would evict]` : null;

          return (
            <div
              key={frame.frame_id}
              onClick={() => setSelectedFrameId(frame.frame_id === selectedFrameId ? null : frame.frame_id)}
              className={`p-2.5 rounded-md transition-all duration-100 cursor-pointer relative flex flex-col justify-between ${
                isTargeted
                  ? 'bg-zinc-800/90 text-white shadow-sm'
                  : isSelected
                  ? 'bg-zinc-800/60 text-zinc-100'
                  : 'bg-[#181818] hover:bg-[#1C1C1C] text-zinc-300'
              } ${isFlashing ? 'animate-dirty-flash' : ''}`}
            >
              {/* Header: Frame Index & Status Badge (tiny dot, not large block) */}
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[10px] text-zinc-500">
                  F#{String(frame.frame_id).padStart(2, '0')}
                </span>

                {isOccupied ? (
                  isDirty ? (
                    <span className="flex items-center gap-1 text-[10px] text-amber-400 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      dirty
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] text-zinc-500 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                      clean
                    </span>
                  )
                ) : (
                  <span className="text-[10px] text-zinc-600 font-mono">vacant</span>
                )}
              </div>

              {/* Resident Virtual Page */}
              <div className="my-1 text-center">
                {isOccupied ? (
                  <div className="text-xl font-bold font-mono text-zinc-100 tracking-tight">
                    P{String(frame.page_number).padStart(2, '0')}
                  </div>
                ) : (
                  <div className="text-xs font-mono text-zinc-600 italic py-1">
                    —
                  </div>
                )}
              </div>

              {/* Ghost Badge (e.g. [LRU would evict] or [LRU / FIFO would evict]) */}
              {ghostLabel && (
                <div
                  className="text-[9px] font-mono text-zinc-400 text-center tracking-tight truncate -my-0.5 select-none"
                  title={`Ghost Victim: ${ghostAlgos.join(', ')} would have evicted this frame`}
                >
                  {ghostLabel}
                </div>
              )}

              {/* Bottom: Live Decayed S(p) & C(p) — unboxed, muted gray */}
              <div className="mt-1 flex items-center justify-between">
                {isOccupied ? (
                  <CpTooltip frame={frame} liveSp={liveSp} liveCp={liveCp} />
                ) : (
                  <span className="text-[10px] font-mono text-zinc-600">unallocated</span>
                )}

                {isTargeted && (
                  <span className="text-[9px] font-mono text-zinc-400 font-semibold uppercase">
                    active
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Minimal Frame Inspector Drawer (when clicked) */}
      {selectedFrame && (
        <div className="mt-3 p-3 rounded bg-[#161616] text-xs font-mono">
          <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-zinc-800">
            <span className="font-bold text-zinc-200">
              Frame #{selectedFrame.frame_id} Inspector
            </span>
            <button
              type="button"
              onClick={() => setSelectedFrameId(null)}
              className="text-zinc-500 hover:text-zinc-300 p-0.5 cursor-pointer"
              aria-label="Close inspector"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {selectedFrame.is_occupied ? (
            <div className="grid grid-cols-2 gap-2 text-zinc-400">
              <div>
                <span className="text-[10px] text-zinc-500 uppercase block">Resident Page</span>
                <span className="text-zinc-200 font-bold">Page {selectedFrame.page_number}</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 uppercase block">Status</span>
                <span className={selectedFrame.dirty ? 'text-amber-400' : 'text-zinc-300'}>
                  {selectedFrame.dirty ? 'Dirty (+10ms flush)' : 'Clean (0ms discard)'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 uppercase block">Live Decayed S(p)</span>
                <span className="text-zinc-200 font-bold">
                  {(selectedFrame.live_Sp ?? selectedFrame.hybrid_score ?? 1.0).toFixed(4)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 uppercase block">Live C(p) Cost</span>
                <span className="text-zinc-200 font-bold">
                  {(selectedFrame.live_Cp ?? ((selectedFrame.hybrid_score ?? 1.0) + (selectedFrame.dirty ? 2.0 : 0.0))).toFixed(4)}
                </span>
              </div>
              {currentStepData?.alternative_victims && (
                <div className="col-span-2 pt-1 border-t border-zinc-800">
                  <span className="text-[10px] text-zinc-500 uppercase block">Ghost Eviction Alternate</span>
                  <span className="text-zinc-300 font-mono text-xs">
                    {Object.entries(currentStepData.alternative_victims)
                      .filter(([_, fid]) => fid === selectedFrame.frame_id)
                      .map(([algo]) => `${algo} would evict`)
                      .join(' / ') || 'None (No standard policy targeted this frame)'}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-zinc-500">Vacant memory slot.</p>
          )}
        </div>
      )}
    </div>
  );
}
