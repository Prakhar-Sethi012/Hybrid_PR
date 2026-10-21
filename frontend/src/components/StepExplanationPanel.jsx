import React from 'react';
import { Terminal, Info, Flame, AlertCircle, CheckCircle2, ArrowRight, Cpu, Layers } from 'lucide-react';

export default function StepExplanationPanel({ currentStep, algorithm = 'AdaptiveHybrid' }) {
  if (!currentStep) {
    return (
      <div className="bg-[#121215] border border-zinc-800 rounded-xl p-4 text-xs font-mono text-zinc-500">
        No step selected. Use the timeline controls above to inspect OS decision logs.
      </div>
    );
  }

  const isHit = currentStep.action === 'HIT';
  const hasEviction = currentStep.evicted_page !== null && currentStep.evicted_page !== undefined;
  const isDirtyWriteBack = Boolean(currentStep.was_dirty_write_back);

  return (
    <div className="bg-[#121215] border border-zinc-800 rounded-xl p-4 mb-5 shadow-sm">
      {/* Step Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-zinc-400" />
          <span className="text-xs font-mono font-medium text-zinc-200">
            DECISION LOG &bull; TICK #{currentStep.step_id}
          </span>
          <span className="text-zinc-600 font-mono text-xs">•</span>
          <span className="text-xs font-mono text-zinc-400">
            Policy: <span className="text-zinc-200 font-semibold">{algorithm}</span>
          </span>
        </div>

        {/* Action & Access Badges */}
        <div className="flex items-center gap-1.5 text-xs font-mono">
          {/* Requested Page */}
          <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700">
            Page {currentStep.requested_page} ({currentStep.is_write ? 'WRITE' : 'READ'})
          </span>

          {/* Hit / Fault Badge */}
          <span
            className={`px-2 py-0.5 rounded font-semibold border flex items-center gap-1 ${
              isHit
                ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60'
                : 'bg-rose-950/40 text-rose-400 border-rose-800/60'
            }`}
          >
            {isHit ? (
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            ) : (
              <AlertCircle className="w-3 h-3 text-rose-400" />
            )}
            {currentStep.action}
          </span>

          {/* Eviction Badge */}
          {hasEviction && (
            <span className="px-2 py-0.5 rounded bg-amber-950/30 text-amber-400 border border-amber-800/50 flex items-center gap-1">
              <ArrowRight className="w-3 h-3 text-amber-400" />
              Evicted P{currentStep.evicted_page}
            </span>
          )}

          {/* Dirty Write-Back Badge */}
          {isDirtyWriteBack && (
            <span className="px-2 py-0.5 rounded bg-orange-950/40 text-orange-400 border border-orange-800/60 flex items-center gap-1 font-semibold">
              <Flame className="w-3 h-3 text-orange-400" />
              +δ Write-Back (10ms)
            </span>
          )}
        </div>
      </div>

      {/* Main Decision Log Explanation Box */}
      <div className="mt-3">
        <div className="bg-[#09090b] border border-zinc-800/90 rounded-lg p-3.5">
          <div className="flex items-start gap-2.5">
            <div className="p-1 rounded bg-zinc-800/70 text-zinc-400 mt-0.5 flex-shrink-0">
              <Info className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1">
                OS Paging Rationale
              </div>
              <p className="text-xs font-mono text-zinc-200 leading-relaxed whitespace-pre-wrap">
                {currentStep.decision_log || 'No detailed decision log available for this tick.'}
              </p>
            </div>
          </div>
        </div>

        {/* Step Context Footnote */}
        <div className="mt-2.5 flex flex-wrap items-center justify-between text-[11px] font-mono text-zinc-500">
          <div className="flex items-center gap-3">
            <span>
              Target Frame: <strong className="text-zinc-300">#{currentStep.frame_id ?? 'N/A'}</strong>
            </span>
            <span>&bull;</span>
            <span>
              Latency Cost:{' '}
              <strong className={isHit ? 'text-emerald-400' : 'text-rose-400'}>
                {isHit ? '100 ns (RAM)' : isDirtyWriteBack ? '20 ms (Fault + Dirty Sync)' : '10 ms (Page Fault)'}
              </strong>
            </span>
          </div>

          <div className="text-zinc-400">
            {algorithm === 'AdaptiveHybrid' && (
              <span className="text-zinc-400">
                Formula: <code className="text-zinc-300 font-semibold">C(p) = S(p) + [dirty ? δ : 0]</code>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
