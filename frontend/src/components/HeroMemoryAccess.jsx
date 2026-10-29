import React, { useRef, useEffect, useState } from 'react';

/**
 * HeroMemoryAccess — Minimalist, flattened horizontal memory access pipeline.
 * Replaces chunky 3-column boxes with a single sleek horizontal pipeline:
 * Instruction: Page 19 (Read) → Result: PAGE FAULT → Action: Evicted Page 8
 */
export default function HeroMemoryAccess({
  currentStep,
  algorithm = 'AdaptiveHybrid',
  totalSteps = 0,
}) {
  const [eatJump, setEatJump] = useState(false);

  useEffect(() => {
    if (currentStep?.was_dirty_write_back) {
      setEatJump(true);
      const t = setTimeout(() => setEatJump(false), 650);
      return () => clearTimeout(t);
    }
  }, [currentStep?.step_id, currentStep?.was_dirty_write_back]);

  if (!currentStep) {
    return (
      <div className="bg-[#111111] rounded-lg p-5 mb-3 text-center">
        <p className="text-xs text-zinc-500 font-mono">
          Observatory Standby — Step through instructions to inspect memory events.
        </p>
      </div>
    );
  }

  const isHit = currentStep.action === 'HIT';
  const hasEviction = currentStep.evicted_page !== null && currentStep.evicted_page !== undefined;
  const isDirtyWriteBack = Boolean(currentStep.was_dirty_write_back);

  // EAT latency
  const eatLabel = isHit
    ? '100 ns'
    : isDirtyWriteBack
    ? '20 ms (+10ms dirty write)'
    : '10 ms';

  return (
    <div
      key={currentStep.step_id}
      className="bg-[#111111] rounded-lg p-4 mb-3 transition-colors"
      aria-label="Active memory access observation"
    >
      {/* Top Meta Row — Minimalist, borderless */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-zinc-500 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-zinc-200 font-semibold">TICK #{String(currentStep.step_id).padStart(4, '0')}</span>
          <span className="text-zinc-700">·</span>
          <span>{currentStep.step_id} / {totalSteps}</span>
          <span className="text-zinc-700">·</span>
          <span>{algorithm}</span>
        </div>

        <div className="flex items-center gap-2">
          {isDirtyWriteBack && (
            <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              +10ms dirty flush
            </span>
          )}
          <span className="text-xs text-zinc-400">
            Latency: <strong className={isHit ? 'text-zinc-200' : isDirtyWriteBack ? 'text-amber-400' : 'text-zinc-200'}>{eatLabel}</strong>
          </span>
        </div>
      </div>

      {/* Sleek Horizontal Pipeline Row */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-mono pt-1">
        {/* Instruction */}
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-500">Instruction:</span>
          <span className="font-bold text-zinc-100">
            Page {String(currentStep.requested_page).padStart(2, '0')}
          </span>
          <span className="text-[10px] text-zinc-500">
            ({currentStep.is_write ? 'Write' : 'Read'})
          </span>
        </div>

        <span className="text-zinc-600">→</span>

        {/* Result */}
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-500">Result:</span>
          <span className="flex items-center gap-1 font-bold">
            <span
              className={`w-1.5 h-1.5 rounded-full ${isHit ? 'bg-emerald-400' : 'bg-rose-400'}`}
            />
            <span className={isHit ? 'text-emerald-400' : 'text-rose-400'}>
              {isHit ? 'PAGE HIT' : 'PAGE FAULT'}
            </span>
          </span>
        </div>

        <span className="text-zinc-600">→</span>

        {/* Action */}
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-500">Action:</span>
          {isHit ? (
            <span className="text-zinc-300">
              Resident in Frame #{currentStep.frame_id ?? 0}
            </span>
          ) : hasEviction ? (
            <span className="text-zinc-300">
              Evicted Page {currentStep.evicted_page} in Frame #{currentStep.frame_id ?? 0}
              {isDirtyWriteBack && <span className="text-amber-400 ml-1 font-medium">(Dirty Write-Back)</span>}
            </span>
          ) : (
            <span className="text-zinc-300">
              Allocated Free Frame #{currentStep.frame_id ?? 0}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
