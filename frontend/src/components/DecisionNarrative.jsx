import React from 'react';
import { Terminal, Flame } from 'lucide-react';

export default function DecisionNarrative({ currentStep, algorithm = 'AdaptiveHybrid' }) {
  if (!currentStep) return null;

  const hasEviction = currentStep.evicted_page !== null && currentStep.evicted_page !== undefined;
  const isDirtyWriteBack = Boolean(currentStep.was_dirty_write_back);

  return (
    <div className="bg-[#0A0A0A] border border-[#222222] rounded-xl p-4 mb-4">
      {/* Terminal Title Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-3 border-b border-[#222222]">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 mr-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <Terminal className="w-4 h-4 text-zinc-400" aria-hidden="true" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
            Algorithm Reasoning Log
          </h3>
          <span className="text-zinc-600">&bull;</span>
          <span className="text-xs text-zinc-400 font-mono">
            Tick <strong className="text-white">#{currentStep.step_id}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded bg-[#141414] text-zinc-300 border border-[#2A2A2A]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
            Live Dispatch
          </span>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#000000] text-zinc-300 border border-[#222222]">
            Policy: <strong className="text-white">{algorithm}</strong>
          </span>
        </div>
      </div>

      {/* Main Terminal Output Body: AMOLED Pure Black Terminal */}
      <div className="bg-[#000000] border border-[#222222] rounded-lg p-3.5">
        <div className="flex items-start gap-2.5">
          <span className="text-emerald-400 font-mono text-xs select-none">&gt;</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-emerald-300 font-mono leading-relaxed whitespace-pre-wrap">
              {currentStep.decision_log || 'Trace step executed. No detailed telemetry log recorded.'}
            </p>
          </div>
        </div>
      </div>

      {/* Real-Time Callout Indicators */}
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
        <div className="p-2.5 rounded-lg bg-[#000000] border border-[#222222] flex items-center justify-between">
          <span className="text-[11px] text-zinc-400 uppercase">Target Frame</span>
          <strong className="text-white text-sm font-bold">Frame #{currentStep.frame_id ?? 0}</strong>
        </div>

        <div className="p-2.5 rounded-lg bg-[#000000] border border-[#222222] flex items-center justify-between">
          <span className="text-[11px] text-zinc-400 uppercase">Victim Selection</span>
          {currentStep.action === 'HIT' ? (
            <span className="text-emerald-400 font-semibold">None (Cache Hit)</span>
          ) : hasEviction ? (
            <span className="text-amber-400 font-bold">Evicted P{currentStep.evicted_page}</span>
          ) : (
            <span className="text-emerald-400 font-semibold">Free Slot Filled</span>
          )}
        </div>

        <div className="p-2.5 rounded-lg bg-[#000000] border border-[#222222] flex items-center justify-between">
          <span className="text-[11px] text-zinc-400 uppercase">Dirty Flush Penalty</span>
          {isDirtyWriteBack ? (
            <span className="text-rose-400 font-bold flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-500 animate-flame-flicker" />
              +δ Incurred (10ms)
            </span>
          ) : (
            <span className="text-zinc-500">0ms Instant</span>
          )}
        </div>
      </div>
    </div>
  );
}
