import React, { useState, useRef } from 'react';
import { Terminal, Flame } from 'lucide-react';

// Inline tooltip for "Calculated C(p)" phrases
function InlineTooltip({ children, cpBreakdown }) {
  const [show, setShow] = useState(false);
  const timerRef = useRef(null);

  if (!cpBreakdown) return <span>{children}</span>;

  const handleEnter = () => {
    timerRef.current = setTimeout(() => setShow(true), 80);
  };
  const handleLeave = () => {
    clearTimeout(timerRef.current);
    setShow(false);
  };

  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <span className="tooltip-trigger text-teal-300 font-bold cursor-help">
        {children}
      </span>

      {show && (
        <span className="absolute bottom-full left-0 mb-2 z-50 animate-tooltip-in pointer-events-none w-64">
          <span className="block bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-xl p-3 shadow-2xl text-[11px] font-mono">
            <span className="block font-bold text-[var(--text-primary)] pb-1.5 mb-1.5 border-b border-[var(--border-subtle)]">
              C(p) Eviction Cost — Victim Frame
            </span>
            <span className="block space-y-1">
              <span className="flex justify-between">
                <span className="text-[var(--text-secondary)]">S(p) Score</span>
                <span className="font-bold text-[var(--text-primary)]">
                  {cpBreakdown.score.toFixed(4)}
                </span>
              </span>
              <span className="flex justify-between">
                <span className={cpBreakdown.dirty_penalty > 0 ? 'text-amber-400' : 'text-[var(--text-tertiary)]'}>
                  δ Dirty Penalty
                </span>
                <span className={`font-bold ${cpBreakdown.dirty_penalty > 0 ? 'text-amber-400' : 'text-[var(--text-tertiary)]'}`}>
                  +{cpBreakdown.dirty_penalty.toFixed(1)}
                </span>
              </span>
              <span className="flex justify-between pt-1 border-t border-[var(--border-subtle)]">
                <span className="text-[var(--text-primary)] font-bold">Total C(p)</span>
                <span className="font-black text-[var(--text-primary)]">
                  {cpBreakdown.total_cost.toFixed(4)}
                </span>
              </span>
              <span className="flex justify-between">
                <span className="text-[var(--text-tertiary)]">λ (current)</span>
                <span className="font-bold text-teal-400">{cpBreakdown.lambda.toFixed(2)}</span>
              </span>
            </span>
            <span className="block mt-2 text-[9px] text-[var(--text-tertiary)] leading-tight">
              Victim was selected because it had the lowest C(p) among all loaded frames.
            </span>
          </span>
          <span className="flex justify-center">
            <span className="w-2 h-2 bg-[var(--bg-surface)] border-r border-b border-[var(--border-strong)] rotate-45 -mt-1 inline-block" />
          </span>
        </span>
      )}
    </span>
  );
}

// Render the decision_log string, making "Calculated C(p)" interactive
function RenderDecisionLog({ text, cpBreakdown }) {
  if (!text) return null;
  if (!cpBreakdown) return <span>{text}</span>;

  // Split on "Calculated C(p)" (case-sensitive)
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
    <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl p-4 mb-4">
      {/* Terminal Title Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-3 border-b border-[var(--border-default)]">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 mr-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <Terminal className="w-4 h-4 text-[var(--text-secondary)]" aria-hidden="true" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] font-mono">
            Algorithm Reasoning Log
          </h3>
          <span className="text-[var(--text-tertiary)]">•</span>
          <span className="text-xs text-[var(--text-secondary)] font-mono">
            Tick <strong className="text-[var(--text-primary)]">#{currentStep.step_id}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-default)]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
            Live Dispatch
          </span>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-[var(--bg-base)] text-[var(--text-secondary)] border border-[var(--border-default)]">
            Policy: <strong className="text-[var(--text-primary)]">{algorithm}</strong>
          </span>
        </div>
      </div>

      {/* Main Terminal Output — interactive C(p) */}
      <div className="bg-[var(--bg-base)] border border-[var(--border-default)] rounded-lg p-3.5">
        <div className="flex items-start gap-2.5">
          <span className="text-emerald-400 font-mono text-xs select-none">&gt;</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-emerald-300 font-mono leading-relaxed whitespace-pre-wrap">
              <RenderDecisionLog
                text={currentStep.decision_log || 'Trace step executed. No detailed telemetry log recorded.'}
                cpBreakdown={algorithm === 'AdaptiveHybrid' ? cpBreakdown : null}
              />
            </p>
          </div>
        </div>
      </div>

      {/* Real-Time Callout Indicators */}
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
        <div className="p-2.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-default)] flex items-center justify-between">
          <span className="text-[11px] text-[var(--text-secondary)] uppercase">Target Frame</span>
          <strong className="text-[var(--text-primary)] text-sm font-bold">Frame #{currentStep.frame_id ?? 0}</strong>
        </div>

        <div className="p-2.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-default)] flex items-center justify-between">
          <span className="text-[11px] text-[var(--text-secondary)] uppercase">Victim Selection</span>
          {currentStep.action === 'HIT' ? (
            <span className="text-emerald-400 font-semibold">None (Cache Hit)</span>
          ) : hasEviction ? (
            <span className="text-amber-400 font-bold">Evicted P{currentStep.evicted_page}</span>
          ) : (
            <span className="text-emerald-400 font-semibold">Free Slot Filled</span>
          )}
        </div>

        <div className="p-2.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-default)] flex items-center justify-between">
          <span className="text-[11px] text-[var(--text-secondary)] uppercase">Dirty Flush Penalty</span>
          {isDirtyWriteBack ? (
            <span className="text-rose-400 font-bold flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-500 animate-flame-flicker" />
              +δ Incurred (10ms)
            </span>
          ) : (
            <span className="text-[var(--text-tertiary)]">0ms Instant</span>
          )}
        </div>
      </div>

      {/* C(p) Breakdown Callout (when available and relevant) */}
      {cpBreakdown && algorithm === 'AdaptiveHybrid' && (
        <div className="mt-2 p-2.5 rounded-lg bg-[#0A1F1A] border border-teal-600/40 text-[11px] font-mono flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-1.5 text-teal-400">
            <span className="font-bold uppercase text-[10px] tracking-wider">C(p) breakdown:</span>
            <span className="text-[var(--text-primary)]">{cpBreakdown.score.toFixed(4)} S(p)</span>
            <span className="text-teal-600">+</span>
            <span className={cpBreakdown.dirty_penalty > 0 ? 'text-amber-400' : 'text-[var(--text-tertiary)]'}>
              {cpBreakdown.dirty_penalty.toFixed(1)} δ
            </span>
            <span className="text-teal-600">=</span>
            <span className="font-black text-[var(--text-primary)]">{cpBreakdown.total_cost.toFixed(4)}</span>
          </div>
          <span className="text-[var(--text-tertiary)] text-[10px]">
            Hover "Calculated C(p)" in the log to see the math ↑
          </span>
        </div>
      )}
    </div>
  );
}
