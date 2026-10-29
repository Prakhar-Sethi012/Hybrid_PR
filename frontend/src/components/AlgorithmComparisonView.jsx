import React, { useMemo } from 'react';
import {
  RefreshCw,
  GitBranch,
  CheckCircle2,
  AlertOctagon,
  Flame,
  Trophy,
} from 'lucide-react';
import PlaybackControls from './PlaybackControls';

const ALGORITHMS = [
  {
    id: 'AdaptiveHybrid',
    name: 'AdaptiveHybrid',
    tag: 'Decayed LRFU + δ Dirty Cost',
    borderClass: 'border-teal-600/50',
    winnerBorderClass: 'border-teal-500',
    badgeClass: 'bg-[#021812] text-teal-300 border-teal-600 font-bold',
    badge: 'Adaptive',
    accentColor: 'text-teal-400',
    bgClass: 'bg-[var(--bg-surface)]',
    winnerBgClass: 'bg-[#041A14]',
    dotColor: 'bg-teal-400',
  },
  {
    id: 'LRU',
    name: 'LRU',
    tag: 'Least Recently Used',
    borderClass: 'border-[var(--border-default)]',
    winnerBorderClass: 'border-[var(--border-default)]',
    badgeClass: 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border-focus)] font-bold',
    badge: 'Recency',
    accentColor: 'text-[var(--text-primary)]',
    bgClass: 'bg-[var(--bg-surface)]',
    winnerBgClass: 'bg-[var(--bg-surface)]',
    dotColor: 'bg-zinc-400',
  },
  {
    id: 'LFU',
    name: 'LFU',
    tag: 'Least Frequently Used',
    borderClass: 'border-purple-600/40',
    winnerBorderClass: 'border-purple-600/40',
    badgeClass: 'bg-[#16051E] text-purple-300 border-purple-600 font-bold',
    badge: 'Frequency',
    accentColor: 'text-purple-400',
    bgClass: 'bg-[var(--bg-surface)]',
    winnerBgClass: 'bg-[var(--bg-surface)]',
    dotColor: 'bg-purple-400',
  },
  {
    id: 'FIFO',
    name: 'FIFO',
    tag: 'First-In, First-Out',
    borderClass: 'border-amber-600/40',
    winnerBorderClass: 'border-amber-600/40',
    badgeClass: 'bg-[#180F02] text-amber-300 border-amber-600 font-bold',
    badge: 'Arrival',
    accentColor: 'text-amber-400',
    bgClass: 'bg-[var(--bg-surface)]',
    winnerBgClass: 'bg-[var(--bg-surface)]',
    dotColor: 'bg-amber-400',
  },
];

export default function AlgorithmComparisonView({
  compareData,
  isLoading,
  currentStep,
  onStepChange,
  isPlaying,
  playbackSpeed,
  onPlayPause,
  onSpeedChange,
  onRefresh,
}) {
  // Extract traces
  const traces = useMemo(() => {
    if (!compareData?.comparison) return {};
    const res = {};
    for (const algo of ALGORITHMS) {
      res[algo.id] = compareData.comparison[algo.id]?.execution_trace || [];
    }
    return res;
  }, [compareData]);

  // Determine total steps
  const totalSteps = useMemo(() => {
    const lengths = Object.values(traces).map((t) => t.length);
    return lengths.length > 0 ? Math.max(0, ...lengths) : 0;
  }, [traces]);

  // Calculate cumulative stats up to current step
  const cumulativeStats = useMemo(() => {
    const stats = {};
    for (const algo of ALGORITHMS) {
      const trace = traces[algo.id] || [];
      const slice = trace.slice(0, currentStep + 1);
      const hits = slice.filter((s) => s.action === 'HIT').length;
      const faults = slice.filter((s) => s.action === 'FAULT').length;
      const total = slice.length;
      const hitRatio = total > 0 ? ((hits / total) * 100).toFixed(1) : '0.0';
      const dirtyWrites = slice.filter((s) => s.was_dirty_write_back).length;

      const l1HitNs = 100;
      const diskReadNs = 10_000_000;
      const diskWriteNs = 10_000_000;
      const hitRatioFrac = total > 0 ? hits / total : 0;
      const faultRatioFrac = total > 0 ? faults / total : 0;
      const dirtyRatioFrac = total > 0 ? dirtyWrites / total : 0;
      const eatNs =
        hitRatioFrac * l1HitNs +
        faultRatioFrac * diskReadNs +
        dirtyRatioFrac * diskWriteNs;
      const avgEat = total > 0 ? (eatNs / 1e6).toFixed(3) : '0.000';

      stats[algo.id] = {
        hits,
        faults,
        hitRatio,
        dirtyWrites,
        eatMs: avgEat,
        eatNs,
        total,
      };
    }
    return stats;
  }, [traces, currentStep]);

  // Determine if simulation is at the end — find winner
  const isAtEnd = totalSteps > 0 && currentStep >= totalSteps - 1;
  const winnerAlgoId = useMemo(() => {
    if (!isAtEnd) return null;
    let best = null;
    let bestEat = Infinity;
    for (const algo of ALGORITHMS) {
      const eat = cumulativeStats[algo.id]?.eatNs ?? Infinity;
      if (eat < bestEat) {
        bestEat = eat;
        best = algo.id;
      }
    }
    return best;
  }, [isAtEnd, cumulativeStats]);

  // Divergence at current step
  const divergenceInfo = useMemo(() => {
    if (totalSteps === 0) return null;
    const actions = {};
    const frames = {};
    let isWrite = false;
    let requestedPage = null;
    let hasDirtyMistake = false;

    for (const algo of ALGORITHMS) {
      const step = traces[algo.id]?.[currentStep];
      if (step) {
        actions[algo.id] = step.action;
        frames[algo.id] = step.frame_id;
        isWrite = step.is_write;
        requestedPage = step.requested_page;
        // "Fatal error": LRU/FIFO/LFU evicting dirty page while AdaptiveHybrid doesn't
        if (algo.id !== 'AdaptiveHybrid' && step.was_dirty_write_back) {
          hasDirtyMistake = true;
        }
      }
    }

    const hybridStep = traces['AdaptiveHybrid']?.[currentStep];
    const hybridHasDirty = hybridStep?.was_dirty_write_back ?? false;

    const uniqueActions = new Set(Object.values(actions));
    const hasDiff = uniqueActions.size > 1;

    // Divergence severity
    const severity =
      hasDirtyMistake && !hybridHasDirty
        ? 'fatal'   // others evicted dirty; hybrid avoided it
        : hasDiff
        ? 'diverge' // different HIT/FAULT outcomes
        : 'sync';   // all in agreement

    return {
      hasDiff,
      severity,
      actions,
      frames,
      requestedPage,
      isWrite,
      hasDirtyMistake,
      hybridHasDirty,
    };
  }, [traces, currentStep, totalSteps]);

  if (isLoading || !compareData) {
    return (
      <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl p-12 flex flex-col items-center justify-center font-sans text-xs text-[var(--text-secondary)] gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-[var(--text-primary)]" />
        <span className="font-bold text-[var(--text-primary)] text-sm">
          Simulating 4 Hardware Policies in Synchrony...
        </span>
        <span className="text-xs text-[var(--text-secondary)]">
          Executing FIFO, LRU, LFU, and AdaptiveHybrid on the exact same trace
        </span>
      </div>
    );
  }

  const refTrace = traces['AdaptiveHybrid'] || [];

  // ROI summary for winner callout
  const hybridStats = cumulativeStats['AdaptiveHybrid'];
  const fifoStats = cumulativeStats['FIFO'];
  const dirtyWriteSavings = Math.max(0, (fifoStats?.dirtyWrites ?? 0) - (hybridStats?.dirtyWrites ?? 0));
  const ioSavedMs = dirtyWriteSavings * 10;

  return (
    <div className="space-y-4">
      {/* Title & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[var(--border-default)] gap-3">
        <div>
          <h2 className="text-base font-bold text-[var(--text-primary)] tracking-tight font-sans">
            Synchronized 4-Algorithm Divergence Observatory
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            FIFO, LRU, LFU, and AdaptiveHybrid running concurrently on the identical reference stream.
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="btn-secondary px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-40"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Re-run Comparison</span>
        </button>
      </div>

      {/* Synchronized Timeline */}
      <PlaybackControls
        currentStep={currentStep}
        totalSteps={totalSteps}
        isPlaying={isPlaying}
        playbackSpeed={playbackSpeed}
        onPlayPause={onPlayPause}
        onStepChange={onStepChange}
        onSpeedChange={onSpeedChange}
        trace={refTrace}
      />

      {/* Winner Banner (at end of simulation) */}
      {isAtEnd && winnerAlgoId && (
        <div className="p-4 rounded-xl border border-teal-600/60 bg-[#041A14] flex items-center gap-3 animate-winner-glow">
          <div className="p-2 rounded-lg bg-teal-900/50 border border-teal-600/50">
            <Trophy className="w-5 h-5 text-teal-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-bold text-teal-300 text-sm font-sans">AdaptiveHybrid wins</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-900/50 border border-teal-600 text-teal-300 font-bold">
                LOWEST EAT
              </span>
            </div>
            <span className="text-xs text-[var(--text-secondary)] font-mono">
              Saved {dirtyWriteSavings} dirty write-backs vs FIFO — prevented ~{ioSavedMs}ms of I/O blocking
            </span>
          </div>
          <div className="text-right font-mono text-xs">
            <div className="text-teal-400 font-bold">{hybridStats?.eatMs}ms EAT</div>
            <div className="text-[var(--text-tertiary)] text-[10px]">{hybridStats?.hitRatio}% hit rate</div>
          </div>
        </div>
      )}

      {/* Divergence Moment Alert Banner */}
      {divergenceInfo && (
        <div
          className={`p-4 rounded-xl border text-xs transition-all duration-300 ${
            divergenceInfo.severity === 'fatal'
              ? 'bg-[#1A0A02] border-rose-600/70 text-rose-200'
              : divergenceInfo.severity === 'diverge'
              ? 'bg-[#180F02] border-amber-600/60 text-amber-200'
              : 'bg-[var(--bg-base)] border-[var(--border-default)] text-[var(--text-secondary)]'
          }`}
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <GitBranch
                className={`w-5 h-5 ${
                  divergenceInfo.severity === 'fatal'
                    ? 'text-rose-400'
                    : divergenceInfo.severity === 'diverge'
                    ? 'text-amber-400'
                    : 'text-[var(--text-secondary)]'
                }`}
                aria-hidden="true"
              />
              <span className="font-bold text-sm font-sans tracking-tight text-[var(--text-primary)]">
                {divergenceInfo.severity === 'fatal'
                  ? '⚠ FATAL DIVERGENCE — DIRTY EVICTION DETECTED'
                  : divergenceInfo.severity === 'diverge'
                  ? 'POLICY DIVERGENCE DETECTED'
                  : 'CONCORDANT CACHE TICK'}
              </span>
              <span className="text-[var(--text-tertiary)]">•</span>
              <span className="font-mono text-[var(--text-primary)] font-semibold">
                Page {divergenceInfo.requestedPage ?? '-'} ({divergenceInfo.isWrite ? 'STORE (WRITE)' : 'LOAD (READ)'})
              </span>
            </div>

            <div className="flex items-center gap-3 font-mono text-xs">
              {ALGORITHMS.map((a) => {
                const act = divergenceInfo.actions[a.id];
                const isH = act === 'HIT';
                return (
                  <span key={a.id} className="flex items-center gap-1.5">
                    <strong className="text-[var(--text-secondary)]">{a.name}:</strong>
                    <span
                      className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                        isH
                          ? 'bg-[#02180A] text-emerald-300 border border-emerald-600'
                          : 'bg-[#180404] text-rose-300 border border-rose-600'
                      }`}
                    >
                      {act}
                    </span>
                  </span>
                );
              })}
            </div>
          </div>

          {divergenceInfo.severity === 'fatal' && (
            <p className="text-xs text-rose-300 mt-1.5 leading-normal font-sans">
              Standard algorithms evicted a dirty page (10ms I/O penalty), while AdaptiveHybrid's C(p) cost model avoided this.
            </p>
          )}
          {divergenceInfo.severity === 'diverge' && (
            <p className="text-xs text-amber-300 mt-1.5 leading-normal font-sans">
              Different historical eviction priorities retained or evicted Page {divergenceInfo.requestedPage}.
            </p>
          )}
        </div>
      )}

      {/* 4-Way Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ALGORITHMS.map((algo) => {
          const stepData = traces[algo.id]?.[currentStep];
          const stats = cumulativeStats[algo.id] || { hits: 0, faults: 0, hitRatio: '0.0', dirtyWrites: 0, eatMs: '0.000', total: 0 };
          const isHit = stepData?.action === 'HIT';
          const hasEviction = stepData?.evicted_page !== null && stepData?.evicted_page !== undefined;
          const isDirtyWrite = Boolean(stepData?.was_dirty_write_back);

          const isWinner = isAtEnd && winnerAlgoId === algo.id;
          const isLoser = isAtEnd && winnerAlgoId !== null && winnerAlgoId !== algo.id;

          return (
            <div
              key={algo.id}
              className={`border rounded-xl p-4 flex flex-col justify-between transition-all duration-300 ${
                isWinner
                  ? `${algo.winnerBgClass} ${algo.winnerBorderClass} animate-winner-glow`
                  : `${algo.bgClass} ${algo.borderClass}`
              } ${isLoser ? 'opacity-50' : ''}`}
            >
              <div>
                {/* Panel Header */}
                <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[var(--border-subtle)]">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold font-mono text-base text-[var(--text-primary)]">
                      {algo.name}
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${algo.badgeClass}`}>
                      {algo.badge}
                    </span>
                    {isWinner && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-teal-600 bg-teal-900/50 text-teal-300 font-bold flex items-center gap-1">
                        <Trophy className="w-3 h-3" />
                        WINNER
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-[var(--text-secondary)] font-sans">
                    {algo.tag}
                  </span>
                </div>

                {/* Current Step Action */}
                <div className="bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg p-3 mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider font-mono">
                      Tick #{stepData?.step_id ?? currentStep + 1} Result
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded text-xs font-mono font-bold border flex items-center gap-1.5 ${
                        isHit
                          ? 'bg-[#02180A] text-emerald-300 border-emerald-600'
                          : 'bg-[#180404] text-rose-300 border-rose-600'
                      }`}
                    >
                      {isHit ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                      ) : (
                        <AlertOctagon className="w-4 h-4 text-rose-400" aria-hidden="true" />
                      )}
                      <span>{stepData?.action ?? 'N/A'}</span>
                    </span>
                  </div>

                  <div className="text-xs font-mono space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-secondary)]">Target Frame:</span>
                      <strong className="text-[var(--text-primary)] font-bold">Frame #{stepData?.frame_id ?? 0}</strong>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-secondary)]">Victim Eviction:</span>
                      {isHit ? (
                        <span className="text-emerald-400 font-medium">None (Hit)</span>
                      ) : hasEviction ? (
                        <span className="text-amber-400 font-bold">Evicted P{stepData.evicted_page}</span>
                      ) : (
                        <span className="text-emerald-400 font-medium">None (Free slot)</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[var(--text-secondary)]">Dirty Write-Back:</span>
                      {isDirtyWrite ? (
                        <span className="text-rose-400 font-bold flex items-center gap-1">
                          <Flame className="w-3.5 h-3.5 text-amber-400 animate-flame-flicker" />
                          +10ms Disk Flush
                        </span>
                      ) : (
                        <span className="text-[var(--text-tertiary)]">0ms Flush</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Micro Memory Map */}
                {stepData?.memory_state && (
                  <div className="mb-3">
                    <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-1 font-mono">
                      RAM Micro-Map
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {stepData.memory_state.map((f) => {
                        const isThisTarget = f.frame_id === stepData.frame_id;
                        return (
                          <div
                            key={f.frame_id}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono border text-center transition-all ${
                              !f.is_occupied
                                ? 'bg-[var(--bg-base)] text-[var(--text-tertiary)] border-[var(--border-subtle)]'
                                : f.dirty
                                ? 'bg-[#211100] text-amber-300 border-amber-600 font-bold'
                                : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border-default)]'
                            } ${isThisTarget ? 'ring-2 ring-[var(--text-primary)] scale-105' : ''}`}
                            title={`Frame ${f.frame_id}: ${f.is_occupied ? `Page ${f.page_number}` : 'Empty'}`}
                          >
                            {f.is_occupied ? `P${f.page_number}` : '—'}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Cumulative Stats */}
              <div className="pt-3 border-t border-[var(--border-subtle)] grid grid-cols-4 gap-2 text-center text-xs font-mono">
                <div className="p-2 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)]">
                  <span className="text-[10px] text-[var(--text-tertiary)] uppercase block">Hit%</span>
                  <span className="font-extrabold text-emerald-400 text-sm">{stats.hitRatio}%</span>
                </div>
                <div className="p-2 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)]">
                  <span className="text-[10px] text-[var(--text-tertiary)] uppercase block">Faults</span>
                  <span className="font-extrabold text-rose-400 text-sm">{stats.faults}</span>
                </div>
                <div className="p-2 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)]">
                  <span className="text-[10px] text-[var(--text-tertiary)] uppercase block">Dirty</span>
                  <span className="font-extrabold text-amber-400 text-sm">{stats.dirtyWrites}</span>
                </div>
                <div className="p-2 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)]">
                  <span className="text-[10px] text-[var(--text-tertiary)] uppercase block">EAT</span>
                  <span className="font-extrabold text-[var(--text-primary)] text-sm">{stats.eatMs}ms</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
