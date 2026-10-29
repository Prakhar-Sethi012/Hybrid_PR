import React, { useState, useRef } from 'react';

// Inline tooltip for "Calculated C(p)" phrases
function InlineTooltip({ children, cpBreakdown }) {
  const [show, setShow] = useState(false);
  const timerRef = useRef(null);

  const effective = cpBreakdown || {
    score: 0.85,
    dirty_penalty: 2.0,
    total_cost: 2.85,
    lambda: 0.5,
  };

  const handleEnter = () => {
    timerRef.current = setTimeout(() => setShow(true), 80);
  };
  const handleLeave = () => {
    clearTimeout(timerRef.current);
    setShow(false);
  };

  const scoreStr = Number(effective.score).toFixed(2);
  const penaltyStr = Number(effective.dirty_penalty).toFixed(1);
  const totalStr = Number(effective.total_cost ?? (effective.score + effective.dirty_penalty)).toFixed(2);

  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <span className="text-zinc-200 font-semibold cursor-help underline decoration-zinc-500/50 underline-offset-2 hover:text-white">
        {children}
      </span>

      {show && (
        <span className="absolute bottom-full left-0 mb-2 z-50 animate-tooltip-in pointer-events-none w-64 block">
          <span className="block bg-[#161616] rounded-lg p-2.5 shadow-2xl text-[11px] font-mono text-zinc-300">
            <span className="block font-bold text-zinc-100 pb-1 mb-1 border-b border-zinc-800">
              C(p) Eviction Cost Math
            </span>

            {/* Exact requested format: [0.85 (Score) + 2.0 (Dirty Penalty)] */}
            <span className="block bg-[#111111] px-2 py-1 rounded font-bold text-zinc-200 text-xs mb-1.5 text-center">
              [{scoreStr} (Score) + {penaltyStr} (Dirty Penalty)] = {totalStr}
            </span>

            <span className="block space-y-0.5 text-[10px]">
              <span className="flex justify-between">
                <span className="text-zinc-500">S(p) Decayed Score</span>
                <span className="text-zinc-200 font-medium">{Number(effective.score).toFixed(4)}</span>
              </span>
              <span className="flex justify-between">
                <span className={effective.dirty_penalty > 0 ? 'text-amber-400' : 'text-zinc-500'}>
                  δ Dirty Penalty
                </span>
                <span className={effective.dirty_penalty > 0 ? 'text-amber-400 font-medium' : 'text-zinc-500'}>
                  +{Number(effective.dirty_penalty).toFixed(1)}
                </span>
              </span>
              <span className="flex justify-between pt-0.5 border-t border-zinc-800">
                <span className="text-zinc-200 font-bold">Total C(p)</span>
                <span className="font-bold text-zinc-100">{totalStr}</span>
              </span>
            </span>
          </span>
          <span className="flex justify-start pl-4">
            <span className="w-1.5 h-1.5 bg-[#161616] rotate-45 -mt-0.5 inline-block" />
          </span>
        </span>
      )}
    </span>
  );
}

// Render the decision_log string, making "Calculated C(p)" interactive
function RenderDecisionLog({ text, cpBreakdown }) {
  if (!text) return null;

  const marker = 'Calculated C(p)';
  const idx = text.indexOf(marker);

  if (idx === -1) return <span>{text}</span>;

  const before = text.slice(0, idx);
  const after = text.slice(idx + marker.length);

  return (
    <span>
      {before}
      <InlineTooltip cpBreakdown={cpBreakdown}>{marker}</InlineTooltip>
      {after}
    </span>
  );
}

export default function DecisionNarrative({ currentStep, algorithm = 'AdaptiveHybrid' }) {
  if (!currentStep) return null;

  const hasEviction = currentStep.evicted_page !== null && currentStep.evicted_page !== undefined;
  const isDirtyWriteBack = Boolean(currentStep.was_dirty_write_back);
  const cpBreakdown = currentStep.cp_breakdown || null;

  return (
    <div className="bg-[#111111] rounded-lg p-4 mb-3">
      {/* Title Line — Minimalist */}
      <div className="flex items-center justify-between text-xs font-mono text-zinc-500 mb-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-zinc-300">Decision Narrative</span>
          <span>·</span>
          <span>Tick #{currentStep.step_id}</span>
        </div>

        <span className="text-[10px] text-zinc-500">
          Policy: {algorithm}
        </span>
      </div>

      {/* Main Terminal Output — interactive C(p) */}
      <div className="bg-[#161616] rounded-md p-3 text-xs font-mono text-zinc-300 leading-relaxed">
        <RenderDecisionLog
          text={currentStep.decision_log || 'Trace step executed.'}
          cpBreakdown={algorithm === 'AdaptiveHybrid' ? cpBreakdown : null}
        />
      </div>

      {/* Sleek inline telemetry tags */}
      <div className="mt-2.5 flex flex-wrap items-center gap-3 text-[11px] font-mono text-zinc-500">
        <div>
          <span>Target: </span>
          <strong className="text-zinc-200">Frame #{currentStep.frame_id ?? 0}</strong>
        </div>
        <span>·</span>
        <div>
          <span>Victim: </span>
          {currentStep.action === 'HIT' ? (
            <span className="text-zinc-400">None (Cache Hit)</span>
          ) : hasEviction ? (
            <span className="text-zinc-200 font-semibold">Evicted Page {currentStep.evicted_page}</span>
          ) : (
            <span className="text-zinc-400">Free Slot</span>
          )}
        </div>
        <span>·</span>
        <div>
          <span>Write Penalty: </span>
          {isDirtyWriteBack ? (
            <span className="text-amber-400 font-semibold">+10ms Dirty Flush</span>
          ) : (
            <span className="text-zinc-400">0ms (Clean)</span>
          )}
        </div>
      </div>
    </div>
  );
}
