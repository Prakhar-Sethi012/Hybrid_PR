import React from 'react';
import {
  CheckCircle2,
  AlertOctagon,
  ArrowRight,
  Flame,
  Cpu,
  Clock,
  Zap,
  HardDrive,
  Activity,
} from 'lucide-react';

export default function HeroMemoryAccess({
  currentStep,
  algorithm = 'AdaptiveHybrid',
  totalSteps = 0,
}) {
  if (!currentStep) {
    return (
      <div className="bg-[#0A0A0A] border border-[#222222] rounded-xl p-8 mb-4 text-center">
        <Cpu className="w-10 h-10 text-zinc-500 mx-auto mb-3 opacity-60 animate-pulse" />
        <h3 className="text-sm font-bold text-white font-sans">
          Observatory Standby
        </h3>
        <p className="text-xs text-zinc-400 mt-1">
          Execute a simulation or use transport controls to step through live memory instructions.
        </p>
      </div>
    );
  }

  const isHit = currentStep.action === 'HIT';
  const hasEviction = currentStep.evicted_page !== null && currentStep.evicted_page !== undefined;
  const isDirtyWriteBack = Boolean(currentStep.was_dirty_write_back);

  return (
    <section
      key={currentStep.step_id}
      className={`bg-[#0A0A0A] border rounded-xl p-4 sm:p-5 mb-4 transition-all duration-200 ${
        isHit ? 'border-emerald-500/50' : 'border-rose-500/50'
      }`}
      aria-label="Active memory access observation"
    >
      {/* Top Meta Line: Tick Count, Policy, Latency */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-[#222222] text-xs">
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-white bg-[#141414] px-2.5 py-0.5 rounded border border-[#2E2E2E]">
            TICK #{String(currentStep.step_id).padStart(4, '0')}
          </span>
          <span className="text-zinc-600">&bull;</span>
          <span className="text-zinc-400 font-mono">
            Progress: <strong className="text-white font-mono">{currentStep.step_id}</strong> / {totalSteps}
          </span>
          <span className="text-zinc-600">&bull;</span>
          <span className="text-zinc-400 font-mono">
            Policy: <strong className="text-white font-mono font-bold">{algorithm}</strong>
          </span>
        </div>

        {/* Real-time Hardware Latency Badge */}
        <div className="flex items-center gap-1.5 text-xs font-mono px-3 py-1 rounded bg-[#000000] border border-[#222222]">
          <Clock className="w-3.5 h-3.5 text-zinc-400" aria-hidden="true" />
          <span className="text-zinc-400">Cycle Latency:</span>
          <strong
            className={`font-bold ${
              isHit ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isHit
              ? '100 ns (RAM Hit)'
              : isDirtyWriteBack
              ? '20,000,100 ns (10ms Read + 10ms Write)'
              : '10,000,100 ns (10ms Disk Read)'}
          </strong>
        </div>
      </div>

      {/* 3-Pillar Silicon Telemetry Deck */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Pillar 1: Instruction & Requested Virtual Page */}
        <div className="bg-[#000000] border border-[#222222] rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider font-mono">
              1. Virtual Instruction
            </span>
            <Activity className="w-3.5 h-3.5 text-zinc-400" />
          </div>

          <div className="flex items-center justify-between my-2">
            <div>
              <div className="text-[10px] text-zinc-400 font-mono uppercase tracking-wider">Target Page</div>
              <div className="text-3xl font-extrabold font-mono text-white tracking-tight">
                Page {String(currentStep.requested_page).padStart(2, '0')}
              </div>
            </div>

            <div
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold border ${
                currentStep.is_write
                  ? 'bg-[#181002] text-amber-300 border-amber-600/70'
                  : 'bg-[#141414] text-white border-[#2E2E2E]'
              }`}
            >
              {currentStep.is_write ? 'STORE (WRITE)' : 'LOAD (READ)'}
            </div>
          </div>

          <div className="pt-2 border-t border-[#1C1C1E] text-[11px] text-zinc-400 font-mono">
            {currentStep.is_write ? (
              <span className="text-amber-400 font-medium flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-amber-400 inline" />
                Modifies frame: Sets dirty bit = True
              </span>
            ) : (
              <span>Clean access: Does not alter page modification bit</span>
            )}
          </div>
        </div>

        {/* Pillar 2: Hardware MMU Trap / Cache Outcome */}
        <div
          className={`border rounded-xl p-4 flex flex-col justify-between transition-all ${
            isHit
              ? 'bg-[#02180A] border-emerald-600/60 text-emerald-200'
              : 'bg-[#180404] border-rose-600/60 text-rose-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider font-mono opacity-90">
              2. MMU Trap Outcome
            </span>
            <Zap className="w-3.5 h-3.5 opacity-80" />
          </div>

          <div className="flex items-center gap-3 my-2">
            <div className="p-2 rounded-xl bg-black border border-current">
              {isHit ? (
                <CheckCircle2 className="w-8 h-8 text-emerald-400" aria-hidden="true" />
              ) : (
                <AlertOctagon className="w-8 h-8 text-rose-400" aria-hidden="true" />
              )}
            </div>
            <div>
              <div className="text-2xl font-black font-mono tracking-tight leading-none mb-1 text-white">
                {isHit ? 'PAGE HIT' : 'PAGE FAULT'}
              </div>
              <div className="text-xs font-mono opacity-90 text-zinc-300">
                {isHit
                  ? `Resident in Frame #${currentStep.frame_id ?? 0}`
                  : 'Page missing from physical RAM'}
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-current/20 text-[11px] opacity-90 font-mono">
            {isHit
              ? 'Direct hit in silicon. Zero I/O overhead (100ns).'
              : 'OS Page Fault interrupt. Halts thread for 10ms disk read.'}
          </div>
        </div>

        {/* Pillar 3: Physical Frame Allocation & Eviction Consequence */}
        <div className="bg-[#000000] border border-[#222222] rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider font-mono">
              3. Physical Memory Mutation
            </span>
            <HardDrive className="w-3.5 h-3.5 text-zinc-400" />
          </div>

          {hasEviction ? (
            <div className="my-1.5">
              <div className="flex items-center gap-2 text-xs font-mono font-bold mb-2">
                <span className="px-2 py-1 rounded bg-[#180404] text-rose-300 border border-rose-800">
                  Victim: P{currentStep.evicted_page}
                </span>
                <ArrowRight className="w-4 h-4 text-zinc-500" />
                <span className="px-2 py-1 rounded bg-[#02180A] text-emerald-300 border border-emerald-800">
                  Load: P{currentStep.requested_page}
                </span>
              </div>

              {isDirtyWriteBack ? (
                <div className="p-2 rounded bg-[#180F02] border border-amber-600 text-amber-300 text-[11px] font-mono font-semibold flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-amber-400 animate-flame-flicker flex-shrink-0" />
                  <span>Dirty Write-Back: +10ms Disk Write</span>
                </div>
              ) : (
                <div className="p-1.5 rounded bg-[#121212] border border-[#27272A] text-zinc-300 text-[11px] font-mono">
                  Clean Victim: Discarded with 0ms disk penalty
                </div>
              )}
            </div>
          ) : (
            <div className="my-2">
              <div className="text-sm font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Placed in Free Frame #{currentStep.frame_id ?? 0}</span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-1 font-mono">
                Memory had vacant frame capacity. No eviction required.
              </p>
            </div>
          )}

          <div className="pt-2 border-t border-[#1C1C1E] flex items-center justify-between text-[11px] font-mono text-zinc-400">
            <span>Target Frame: #{currentStep.frame_id ?? 0}</span>
            {currentStep.hybrid_score !== undefined && (
              <span className="text-white font-bold">
                S(p): {currentStep.hybrid_score.toFixed(4)}
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
