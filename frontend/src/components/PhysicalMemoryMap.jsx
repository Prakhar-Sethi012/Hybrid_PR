import React, { useState, useEffect, useRef } from 'react';
import { Server, X, Flame, Info } from 'lucide-react';

// Floating C(p) Tooltip
function CpTooltip({ frame, cpBreakdown }) {
  const [show, setShow] = useState(false);
  const timerRef = useRef(null);

  const handleEnter = () => {
    timerRef.current = setTimeout(() => setShow(true), 80);
  };
  const handleLeave = () => {
    clearTimeout(timerRef.current);
    setShow(false);
  };

  const score = cpBreakdown?.score ?? frame.hybrid_score ?? 0;
  const penalty = frame.dirty ? 2.0 : 0.0;
  const total = score + penalty;

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <span className="tooltip-trigger text-[11px] font-mono text-[var(--text-secondary)] font-medium cursor-help">
        C(p): {total.toFixed(2)}
      </span>

      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 animate-tooltip-in pointer-events-none w-52">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-xl p-3 shadow-2xl text-[11px] font-mono">
            <div className="font-bold text-[var(--text-primary)] pb-1.5 mb-1.5 border-b border-[var(--border-subtle)]">
              C(p) Eviction Cost — Frame #{frame.frame_id}
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">S(p) Score</span>
                <span className="font-bold text-[var(--text-primary)]">{score.toFixed(4)}</span>
              </div>
              <div className="flex justify-between">
                <span className={frame.dirty ? 'text-amber-400' : 'text-[var(--text-tertiary)]'}>
                  δ Dirty Penalty
                </span>
                <span className={`font-bold ${frame.dirty ? 'text-amber-400' : 'text-[var(--text-tertiary)]'}`}>
                  +{penalty.toFixed(1)}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-[var(--border-subtle)]">
                <span className="text-[var(--text-primary)] font-bold">Total C(p)</span>
                <span className="font-black text-[var(--text-primary)]">{total.toFixed(4)}</span>
              </div>
            </div>
            <div className="mt-2 text-[9px] text-[var(--text-tertiary)] leading-tight">
              Lower C(p) = victim candidate. Dirty pages penalized to avoid I/O.
            </div>
          </div>
          {/* Arrow */}
          <div className="flex justify-center">
            <div className="w-2 h-2 bg-[var(--bg-surface)] border-r border-b border-[var(--border-strong)] rotate-45 -mt-1" />
          </div>
        </div>
      )}
    </div>
  );
}

export default function PhysicalMemoryMap({
  memoryManager,
  currentStepData = null,
  algorithm = 'AdaptiveHybrid',
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

  // Trigger dirty eviction flash animation
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

  const cpBreakdown = currentStepData?.cp_breakdown || null;

  const filterBtns = [
    { id: 'ALL', label: `All (${totalFrames})`, activeClass: 'bg-[var(--text-primary)] text-[var(--bg-base)] border-[var(--text-primary)] font-bold' },
    { id: 'CLEAN', label: `Clean (${cleanCount})`, activeClass: 'bg-[var(--text-primary)] text-[var(--bg-base)] border-[var(--text-primary)] font-bold' },
    { id: 'DIRTY', label: `Dirty (${dirtyCount})`, activeClass: 'bg-amber-500 text-black border-amber-500 font-bold' },
    { id: 'EMPTY', label: `Vacant (${emptyCount})`, activeClass: 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border-focus)] font-bold' },
  ];

  return (
    <div
      className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl p-4 sm:p-5 mb-4"
      aria-label="Physical memory frame map"
    >
      {/* Header */}
      <div className="pb-3 mb-3 border-b border-[var(--border-default)]">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--text-primary)]">
              <Server className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)] tracking-tight font-sans">
                Physical RAM Frames
              </h3>
              <p className="text-[11px] text-[var(--text-secondary)] font-mono">
                Hardware memory die · Policy: {algorithm}
              </p>
            </div>
          </div>

          <span className="text-xs px-2.5 py-1 rounded bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-default)] font-mono font-bold">
            {occupiedCount} / {totalFrames} ({utilPercent}%)
          </span>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-4 gap-1.5 text-xs font-mono pt-1">
          {filterBtns.map((btn) => (
            <button
              key={btn.id}
              type="button"
              onClick={() => setFilter(btn.id)}
              className={`py-1.5 rounded text-center transition-all cursor-pointer font-medium border ${
                filter === btn.id
                  ? btn.activeClass
                  : 'bg-[var(--bg-base)] text-[var(--text-secondary)] border-[var(--border-default)] hover:text-[var(--text-primary)] hover:border-[var(--border-focus)]'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* C(p) Info strip — only for AdaptiveHybrid */}
      {algorithm === 'AdaptiveHybrid' && cpBreakdown && (
        <div className="mb-3 p-2.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center gap-2 text-xs font-mono">
          <Info className="w-3.5 h-3.5 text-[var(--accent-hybrid)] flex-shrink-0" />
          <span className="text-[var(--text-secondary)]">Last victim cost:</span>
          <span className="font-bold text-[var(--text-primary)]">
            {cpBreakdown.score} (S) + {cpBreakdown.dirty_penalty} (δ) = {cpBreakdown.total_cost} C(p)
          </span>
          <span className="ml-auto text-[var(--text-tertiary)]">λ={cpBreakdown.lambda}</span>
        </div>
      )}

      {/* Silicon Memory Frames Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {filteredFrames.map((frame) => {
          const isTargeted = currentStepData?.frame_id === frame.frame_id;
          const isSelected = selectedFrameId === frame.frame_id;
          const isOccupied = frame.is_occupied;
          const isDirty = frame.dirty;
          const isFlashing = flashingFrameId === frame.frame_id;

          let cardBorder = 'border-[var(--border-subtle)] bg-[var(--bg-base)]';
          let badgeText = 'VACANT';
          let badgeStyle = 'bg-[var(--bg-elevated)] text-[var(--text-tertiary)] border-[var(--border-default)]';

          if (isOccupied) {
            if (isDirty) {
              cardBorder = 'border-amber-600/60 bg-[#120B02]';
              badgeText = 'DIRTY';
              badgeStyle = 'bg-[#211100] text-amber-300 border-amber-600 font-bold';
            } else {
              cardBorder = 'border-[var(--border-default)] bg-[var(--bg-surface)]';
              badgeText = 'CLEAN';
              badgeStyle = 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border-default)] font-medium';
            }
          } else {
            cardBorder = 'border-dashed border-[var(--border-subtle)] bg-[var(--bg-base)]';
          }

          return (
            <div
              key={frame.frame_id}
              onClick={() => setSelectedFrameId(frame.frame_id === selectedFrameId ? null : frame.frame_id)}
              className={`p-3 rounded-lg border text-xs transition-all duration-150 cursor-pointer relative flex flex-col justify-between ${cardBorder} ${
                isFlashing
                  ? 'animate-dirty-flash'
                  : isTargeted
                  ? 'ring-2 ring-[var(--text-primary)] ring-offset-1 ring-offset-[var(--bg-base)] animate-frame-pop'
                  : isSelected
                  ? 'ring-2 ring-[var(--border-focus)] border-[var(--text-primary)]'
                  : 'hover:border-[var(--border-focus)]'
              }`}
            >
              {/* Header: Frame Index & Status Badge */}
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-[11px] font-bold text-[var(--text-secondary)]">
                  F#{String(frame.frame_id).padStart(2, '0')}
                </span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${badgeStyle} flex items-center gap-1`}>
                  {isDirty && <Flame className="w-2.5 h-2.5 text-amber-400 animate-flame-flicker" />}
                  <span>{badgeText}</span>
                </span>
              </div>

              {/* Resident Virtual Page */}
              <div className="my-1.5 text-center">
                {isOccupied ? (
                  <div>
                    <div className="text-2xl font-black font-mono text-[var(--text-primary)] tracking-tight">
                      P{String(frame.page_number).padStart(2, '0')}
                    </div>
                    <div className="text-[10px] font-mono text-[var(--text-tertiary)] mt-0.5">
                      Virtual Page
                    </div>
                  </div>
                ) : (
                  <div className="text-xs font-mono text-[var(--text-tertiary)] italic py-2">
                    Empty Slot
                  </div>
                )}
              </div>

              {/* Bottom: S(p) Score & C(p) Cost — Omnipresent */}
              <div className="pt-1.5 border-t border-[var(--border-subtle)] space-y-1">
                {isOccupied ? (
                  <>
                    <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-secondary)]">
                      <span>S(p): {frame.hybrid_score !== undefined ? frame.hybrid_score.toFixed(2) : '1.00'}</span>
                      <span className="text-[var(--text-tertiary)]">×{frame.access_count ?? 1}</span>
                    </div>
                    {/* C(p) always shown — hover for tooltip */}
                    <CpTooltip frame={frame} cpBreakdown={isTargeted ? cpBreakdown : null} />
                  </>
                ) : (
                  <span className="text-[11px] font-mono text-[var(--text-tertiary)]">Unallocated</span>
                )}
              </div>

              {/* Active Marker */}
              {isTargeted && (
                <div className="absolute -top-2 right-2 bg-[var(--text-primary)] text-[var(--bg-base)] text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shadow uppercase">
                  ACTIVE
                </div>
              )}

              {/* Dirty eviction overlay */}
              {isFlashing && (
                <div className="absolute inset-0 rounded-lg bg-amber-500/10 pointer-events-none" />
              )}
            </div>
          );
        })}
      </div>

      {/* Frame Inspector Drawer */}
      {selectedFrame && (
        <div className="mt-3 p-3.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-default)]">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-[var(--text-primary)] font-sans">
                Frame #{selectedFrame.frame_id} Inspector
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${
                  selectedFrame.is_occupied
                    ? selectedFrame.dirty
                      ? 'bg-[#211100] text-amber-300 border-amber-600'
                      : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border-default)]'
                    : 'bg-[var(--bg-elevated)] text-[var(--text-tertiary)] border-[var(--border-default)]'
                }`}
              >
                {selectedFrame.is_occupied
                  ? selectedFrame.dirty
                    ? 'DIRTY — +10ms Disk Flush on Eviction'
                    : 'CLEAN — 0ms Instant Eviction'
                  : 'VACANT'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedFrameId(null)}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 rounded hover:bg-[var(--bg-elevated)] cursor-pointer"
              aria-label="Close inspector"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {selectedFrame.is_occupied ? (
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2 rounded bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                <span className="text-[10px] text-[var(--text-tertiary)] uppercase block">Page Number</span>
                <span className="text-sm font-bold text-[var(--text-primary)]">Page {selectedFrame.page_number}</span>
              </div>
              <div className="p-2 rounded bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                <span className="text-[10px] text-[var(--text-tertiary)] uppercase block">Hybrid Score S(p)</span>
                <span className="text-sm font-bold text-[var(--text-primary)]">
                  {selectedFrame.hybrid_score !== undefined ? selectedFrame.hybrid_score.toFixed(4) : '1.0000'}
                </span>
              </div>
              <div className="p-2 rounded bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                <span className="text-[10px] text-[var(--text-tertiary)] uppercase block">Access Frequency</span>
                <span className="text-sm font-bold text-[var(--text-primary)]">{selectedFrame.access_count ?? 1} Hits</span>
              </div>
              <div className="p-2 rounded bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                <span className="text-[10px] text-[var(--text-tertiary)] uppercase block">C(p) Eviction Cost</span>
                <span className={`text-sm font-bold ${selectedFrame.dirty ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {selectedFrame.dirty
                    ? `${((selectedFrame.hybrid_score ?? 1) + 2).toFixed(2)} (Dirty +2.0)`
                    : `${(selectedFrame.hybrid_score ?? 1).toFixed(2)} (Clean)`}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[var(--text-secondary)] font-mono py-1">
              This frame slot is currently vacant and ready for zero-overhead allocation.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
