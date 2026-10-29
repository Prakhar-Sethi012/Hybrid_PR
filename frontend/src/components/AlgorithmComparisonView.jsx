import React, { useMemo } from 'react';
import {
  RefreshCw,
  GitBranch,
  Flame,
  Trophy,
} from 'lucide-react';
import PlaybackControls from './PlaybackControls';

const ALGORITHMS = [
  {
    id: 'AdaptiveHybrid',
    name: 'AdaptiveHybrid',
    tag: 'Decayed LRFU + δ Dirty Cost',
    badge: 'Adaptive',
  },
  {
    id: 'LRU',
    name: 'LRU',
    tag: 'Least Recently Used',
    badge: 'Recency',
  },
  {
    id: 'LFU',
    name: 'LFU',
    tag: 'Least Frequently Used',
    badge: 'Frequency',
  },
  {
    id: 'FIFO',
    name: 'FIFO',
    tag: 'First-In, First-Out',
    badge: 'Arrival',
  },
];

/**
 * AlgorithmComparisonView (Tab 2: Divergence Matrix)
 * Borderless, minimalist side-by-side execution of 4 policies.
 * Highlights divergence points and dims losing algorithms at the end.
 */
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
  config,
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
        total,
      };
    }
    return stats;
  }, [traces, currentStep]);

  // Divergence analysis at current step
  const divergenceInfo = useMemo(() => {
    if (totalSteps === 0 || currentStep < 0) return null;
    const actions = {};
    const evicted = {};
    const dirtyEvictions = {};

    for (const algo of ALGORITHMS) {
      const step = traces[algo.id]?.[currentStep];
      if (step) {
        actions[algo.id] = step.action;
        evicted[algo.id] = step.evicted_page;
        dirtyEvictions[algo.id] = Boolean(step.was_dirty_write_back);
      }
    }

    const uniqueActions = new Set(Object.values(actions));
    const isDivergent = uniqueActions.size > 1;

    // Check for fatal divergence (e.g. standard evicting dirty, hybrid avoiding it)
    const hybridEvictedDirty = dirtyEvictions['AdaptiveHybrid'];
    const standardEvictedDirty =
      dirtyEvictions['LRU'] || dirtyEvictions['LFU'] || dirtyEvictions['FIFO'];
    const isFatalDivergence = standardEvictedDirty && !hybridEvictedDirty;

    const refStep = traces['AdaptiveHybrid']?.[currentStep];

    return {
      isDivergent,
      isFatalDivergence,
      severity: isFatalDivergence ? 'fatal' : isDivergent ? 'diverge' : 'none',
      actions,
      evicted,
      dirtyEvictions,
      requestedPage: refStep?.requested_page,
      isWrite: refStep?.is_write,
    };
  }, [traces, totalSteps, currentStep]);

  const isAtEnd = totalSteps > 0 && currentStep >= totalSteps - 1;

  // Determine winner at end
  const winnerAlgoId = useMemo(() => {
    if (!isAtEnd) return null;
    let lowestEat = Infinity;
    let bestId = 'AdaptiveHybrid';
    for (const algo of ALGORITHMS) {
      const eat = parseFloat(cumulativeStats[algo.id]?.eatMs || '999999');
      if (eat < lowestEat) {
        lowestEat = eat;
        bestId = algo.id;
      }
    }
    return bestId;
  }, [isAtEnd, cumulativeStats]);

  if (isLoading) {
    return (
      <div className="bg-[#111111] rounded-lg p-8 flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-5 h-5 text-zinc-400 animate-spin" />
        <span className="font-semibold text-zinc-200 text-xs font-mono">
          Simulating 4 Hardware Policies in Synchrony...
        </span>
        <span className="text-[11px] text-zinc-500 font-mono">
          Executing FIFO, LRU, LFU, and AdaptiveHybrid on the identical reference trace
        </span>
      </div>
    );
  }

  const refTrace = traces['AdaptiveHybrid'] || [];
  const hybridStats = cumulativeStats['AdaptiveHybrid'];
  const fifoStats = cumulativeStats['FIFO'];
  const dirtyWriteSavings = Math.max(0, (fifoStats?.dirtyWrites ?? 0) - (hybridStats?.dirtyWrites ?? 0));
  const ioSavedMs = dirtyWriteSavings * 10;

  return (
    <div className="space-y-3">
      {/* Title & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 mb-1 gap-2">
        <div>
          <h2 className="text-sm font-bold text-zinc-100 tracking-tight font-sans">
            Divergence Matrix
          </h2>
          <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
            Synchronized execution across FIFO, LRU, LFU, and AdaptiveHybrid ({config?.frame_count || 10} Frames)
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="px-3 py-1.5 rounded-md bg-[#161616] hover:bg-[#202020] text-zinc-300 text-xs font-mono flex items-center gap-2 cursor-pointer disabled:opacity-40 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Re-run Comparison</span>
        </button>
      </div>

      {/* Synchronized Timeline Scrubber */}
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

      {/* Winner Banner (at completion) */}
      {isAtEnd && winnerAlgoId && (
        <div className="p-3.5 rounded-lg bg-[#111111] flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <Trophy className="w-4 h-4 text-zinc-300" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-zinc-100 font-mono">{winnerAlgoId} Wins</span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 font-bold uppercase">
                  Lowest EAT
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                Saved {dirtyWriteSavings} dirty write-backs vs FIFO — prevented ~{ioSavedMs}ms disk I/O blocking
              </p>
            </div>
          </div>
          <div className="text-right font-mono text-xs">
            <div className="text-zinc-100 font-bold">{hybridStats?.eatMs}ms EAT</div>
            <div className="text-zinc-500 text-[10px]">{hybridStats?.hitRatio}% hit rate</div>
          </div>
        </div>
      )}

      {/* Divergence Timeline Marker Banner */}
      {divergenceInfo && divergenceInfo.severity !== 'none' && (
        <div
          className={`p-3 rounded-lg text-xs font-mono transition-colors ${
            divergenceInfo.severity === 'fatal'
              ? 'bg-[#180A0A] text-zinc-300'
              : 'bg-[#181206] text-zinc-300'
          }`}
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <GitBranch
                className={`w-4 h-4 ${
                  divergenceInfo.severity === 'fatal' ? 'text-rose-400' : 'text-amber-400'
                }`}
                aria-hidden="true"
              />
              <span className="font-bold text-zinc-100">
                {divergenceInfo.severity === 'fatal'
                  ? 'FATAL DIVERGENCE — DIRTY PAGE EVICTION'
                  : 'POLICY DIVERGENCE'}
              </span>
              <span className="text-zinc-600">·</span>
              <span className="text-zinc-400">
                Page {divergenceInfo.requestedPage ?? '-'} ({divergenceInfo.isWrite ? 'Write' : 'Read'})
              </span>
            </div>

            <div className="flex items-center gap-2 text-[11px]">
              {ALGORITHMS.map((a) => {
                const act = divergenceInfo.actions[a.id];
                const isH = act === 'HIT';
                return (
                  <span key={a.id} className="flex items-center gap-1">
                    <span className="text-zinc-500">{a.name}:</span>
                    <span
                      className={`font-semibold ${
                        isH ? 'text-emerald-400' : 'text-rose-400'
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
            <p className="text-[11px] text-zinc-400 mt-1">
              Standard policies evicted a dirty page (+10ms disk flush), while AdaptiveHybrid prioritized clean page eviction.
            </p>
          )}
        </div>
      )}

      {/* 4-Way Mini Visualizers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
              className={`bg-[#111111] rounded-lg p-3.5 flex flex-col justify-between transition-opacity duration-200 ${
                isLoser ? 'opacity-40' : 'opacity-100'
              }`}
            >
              <div>
                {/* Panel Header */}
                <div className="flex items-center justify-between pb-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold font-mono text-sm text-zinc-100">
                      {algo.name}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">
                      {algo.badge}
                    </span>
                    {isWinner && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 font-bold flex items-center gap-1">
                        <Trophy className="w-2.5 h-2.5" />
                        LOWEST EAT
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {algo.tag}
                  </span>
                </div>

                {/* Current Step Action Row */}
                <div className="bg-[#161616] rounded p-2.5 mb-2.5 text-xs font-mono">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] text-zinc-500 uppercase">
                      Tick #{stepData?.step_id ?? currentStep + 1}
                    </span>
                    <span
                      className={`text-xs font-bold flex items-center gap-1 ${
                        isHit ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isHit ? 'bg-emerald-400' : 'bg-rose-400'
                        }`}
                      />
                      <span>{stepData?.action ?? 'N/A'}</span>
                    </span>
                  </div>

                  <div className="text-[11px] text-zinc-400 flex flex-wrap items-center justify-between gap-1">
                    <div>
                      <span className="text-zinc-500">Target: </span>
                      <span className="text-zinc-200">Frame #{stepData?.frame_id ?? 0}</span>
                    </div>

                    <div>
                      <span className="text-zinc-500">Evicted: </span>
                      {isHit ? (
                        <span className="text-zinc-400">None</span>
                      ) : hasEviction ? (
                        <span className="text-zinc-200 font-semibold">P{stepData.evicted_page}</span>
                      ) : (
                        <span className="text-zinc-400">Free Slot</span>
                      )}
                    </div>

                    <div>
                      {isDirtyWrite ? (
                        <span className="text-amber-400 flex items-center gap-1">
                          <Flame className="w-3 h-3" />
                          +10ms Flush
                        </span>
                      ) : (
                        <span className="text-zinc-600">0ms Flush</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Micro Memory Map */}
                {stepData?.memory_state ? (
                  <div className="mb-2.5">
                    <span className="text-[9px] font-mono text-zinc-500 uppercase block mb-1">
                      RAM Micro-Map ({stepData.memory_state.filter((f) => f.is_occupied).length} / {stepData.memory_state.length} Frames)
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {stepData.memory_state.map((f) => {
                        const isThisTarget = f.frame_id === stepData.frame_id;
                        return (
                          <div
                            key={f.frame_id}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                              !f.is_occupied
                                ? 'bg-[#181818] text-zinc-600'
                                : f.dirty
                                ? 'bg-amber-950/40 text-amber-300 font-semibold'
                                : 'bg-zinc-800 text-zinc-200'
                            } ${isThisTarget ? 'ring-1 ring-zinc-400' : ''}`}
                            title={`Frame ${f.frame_id}: ${f.is_occupied ? `Page ${f.page_number}` : 'Vacant'}`}
                          >
                            {f.is_occupied ? `P${f.page_number}` : '—'}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="mb-2.5">
                    <span className="text-[9px] font-mono text-zinc-500 uppercase block mb-1">
                      RAM Micro-Map (0 / {config?.frame_count || 10} Frames)
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {Array.from({ length: config?.frame_count || 10 }).map((_, i) => (
                        <div
                          key={i}
                          className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#181818] text-zinc-600"
                        >
                          —
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Cumulative Metrics Strip */}
              <div className="grid grid-cols-4 gap-1.5 text-center text-xs font-mono pt-2 border-t border-zinc-900">
                <div className="p-1.5 rounded bg-[#161616]">
                  <span className="text-[9px] text-zinc-500 uppercase block">Hit Rate</span>
                  <span className="font-bold text-zinc-100 text-xs">{stats.hitRatio}%</span>
                </div>
                <div className="p-1.5 rounded bg-[#161616]">
                  <span className="text-[9px] text-zinc-500 uppercase block">Faults</span>
                  <span className="font-bold text-zinc-100 text-xs">{stats.faults}</span>
                </div>
                <div className="p-1.5 rounded bg-[#161616]">
                  <span className="text-[9px] text-zinc-500 uppercase block">Dirty Flush</span>
                  <span className="font-bold text-zinc-100 text-xs">{stats.dirtyWrites}</span>
                </div>
                <div className="p-1.5 rounded bg-[#161616]">
                  <span className="text-[9px] text-zinc-500 uppercase block">EAT</span>
                  <span className="font-bold text-zinc-100 text-xs">{stats.eatMs}ms</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
