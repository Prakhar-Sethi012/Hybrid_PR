import React, { useMemo } from 'react';
import {
  RefreshCw,
  GitBranch,
  CheckCircle2,
  AlertOctagon,
  Flame,
} from 'lucide-react';
import PlaybackControls from './PlaybackControls';

const ALGORITHMS = [
  {
    id: 'AdaptiveHybrid',
    name: 'AdaptiveHybrid',
    tag: 'Decayed LRFU + δ Dirty Cost',
    border: 'border-[#303030]',
    badgeClass: 'bg-[#181818] text-teal-300 border-teal-600 font-bold',
    badge: 'Adaptive',
    accentColor: 'text-teal-400',
  },
  {
    id: 'LRU',
    name: 'LRU',
    tag: 'Least Recently Used',
    border: 'border-[#303030]',
    badgeClass: 'bg-[#181818] text-white border-zinc-500 font-bold',
    badge: 'Recency',
    accentColor: 'text-white',
  },
  {
    id: 'LFU',
    name: 'LFU',
    tag: 'Least Frequently Used',
    border: 'border-[#303030]',
    badgeClass: 'bg-[#181818] text-purple-300 border-purple-600 font-bold',
    badge: 'Frequency',
    accentColor: 'text-purple-400',
  },
  {
    id: 'FIFO',
    name: 'FIFO',
    tag: 'First-In, First-Out',
    border: 'border-[#303030]',
    badgeClass: 'bg-[#181818] text-amber-300 border-amber-600 font-bold',
    badge: 'Arrival',
    accentColor: 'text-amber-400',
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

      // Estimate EAT
      const l1HitNs = 100;
      const diskReadNs = 10_000_000;
      const diskWriteNs = 10_000_000;
      let totalLatency = 0;
      for (const s of slice) {
        if (s.action === 'HIT') {
          totalLatency += l1HitNs;
        } else {
          totalLatency += l1HitNs + diskReadNs;
          if (s.was_dirty_write_back) totalLatency += diskWriteNs;
        }
      }
      const avgEat = total > 0 ? (totalLatency / total / 1e6).toFixed(3) : '0.000';

      stats[algo.id] = {
        hits,
        faults,
        hitRatio,
        dirtyWrites,
        eatMs: avgEat,
      };
    }
    return stats;
  }, [traces, currentStep]);

  // Check for divergence at current step
  const divergenceInfo = useMemo(() => {
    if (totalSteps === 0) return null;
    const actions = {};
    const frames = {};
    let isWrite = false;
    let requestedPage = null;

    for (const algo of ALGORITHMS) {
      const step = traces[algo.id]?.[currentStep];
      if (step) {
        actions[algo.id] = step.action;
        frames[algo.id] = step.frame_id;
        isWrite = step.is_write;
        requestedPage = step.requested_page;
      }
    }

    const uniqueActions = new Set(Object.values(actions));
    const hasDiff = uniqueActions.size > 1;

    return {
      hasDiff,
      actions,
      frames,
      requestedPage,
      isWrite,
    };
  }, [traces, currentStep, totalSteps]);

  if (isLoading || !compareData) {
    return (
      <div className="bg-[#0A0A0A] border border-[#222222] rounded-xl p-12 flex flex-col items-center justify-center font-sans text-xs text-zinc-400 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-white" />
        <span className="font-bold text-white text-sm">
          Simulating 4 Hardware Policies in Synchrony...
        </span>
        <span className="text-xs text-zinc-400">
          Executing FIFO, LRU, LFU, and AdaptiveHybrid on the exact same trace
        </span>
      </div>
    );
  }

  const refTrace = traces['AdaptiveHybrid'] || [];

  return (
    <div className="space-y-4">
      {/* Title & Refresh Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#222222] gap-3">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight font-sans">
            Synchronized 4-Algorithm Divergence Observatory
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Observes FIFO, LRU, LFU, and AdaptiveHybrid concurrently on the identical reference stream.
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

      {/* Synchronized Timeline Transport */}
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

      {/* Divergence Moment Alert Banner */}
      {divergenceInfo && (
        <div
          className={`p-4 rounded-xl border text-xs transition-all duration-300 ${
            divergenceInfo.hasDiff
              ? 'bg-[#180F02] border-amber-600 text-amber-200'
              : 'bg-[#000000] border-[#222222] text-zinc-300'
          }`}
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <GitBranch
                className={`w-5 h-5 ${divergenceInfo.hasDiff ? 'text-amber-400' : 'text-zinc-400'}`}
                aria-hidden="true"
              />
              <span className="font-bold text-sm font-sans tracking-tight text-white">
                {divergenceInfo.hasDiff ? 'POLICY DIVERGENCE DETECTED' : 'CONCORDANT CACHE TICK'}
              </span>
              <span className="text-zinc-600">&bull;</span>
              <span className="font-mono text-white font-semibold">
                Access: Page {divergenceInfo.requestedPage} ({divergenceInfo.isWrite ? 'WRITE' : 'READ'})
              </span>
            </div>

            <div className="flex items-center gap-3 font-mono text-xs">
              {ALGORITHMS.map((a) => {
                const act = divergenceInfo.actions[a.id];
                const isH = act === 'HIT';
                return (
                  <span key={a.id} className="flex items-center gap-1.5">
                    <strong className="text-zinc-300">{a.name}:</strong>
                    <span
                      className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                        isH ? 'bg-[#02180A] text-emerald-300 border border-emerald-600' : 'bg-[#180404] text-rose-300 border border-rose-600'
                      }`}
                    >
                      {act}
                    </span>
                  </span>
                );
              })}
            </div>
          </div>
          {divergenceInfo.hasDiff && (
            <p className="text-xs text-amber-300 mt-1.5 leading-normal font-sans">
              Notice the divergence: Different historical eviction priorities retained or evicted Page {divergenceInfo.requestedPage}.
            </p>
          )}
        </div>
      )}

      {/* 4-Way Comparison Grid: 2x2 on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ALGORITHMS.map((algo) => {
          const stepData = traces[algo.id]?.[currentStep];
          const stats = cumulativeStats[algo.id] || { hits: 0, faults: 0, hitRatio: '0.0', dirtyWrites: 0, eatMs: '0.000' };
          const isHit = stepData?.action === 'HIT';
          const hasEviction = stepData?.evicted_page !== null && stepData?.evicted_page !== undefined;
          const isDirtyWrite = Boolean(stepData?.was_dirty_write_back);

          return (
            <div
              key={algo.id}
              className={`bg-[#0A0A0A] border rounded-xl p-4 flex flex-col justify-between transition-all duration-120 ${algo.border}`}
            >
              <div>
                {/* Panel Header */}
                <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[#222222]">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold font-mono text-base text-white">
                      {algo.name}
                    </span>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${algo.badgeClass}`}>
                      {algo.badge}
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-400 font-sans">
                    {algo.tag}
                  </span>
                </div>

                {/* Current Step Action Display */}
                <div className="bg-[#000000] border border-[#222222] rounded-lg p-3 mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider font-mono">
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
                      <span className="text-zinc-400">Target Frame:</span>
                      <strong className="text-white font-bold">Frame #{stepData?.frame_id ?? 0}</strong>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Victim Eviction:</span>
                      {hasEviction ? (
                        <span className="text-amber-400 font-bold">Evicted P{stepData.evicted_page}</span>
                      ) : (
                        <span className="text-emerald-400 font-medium">None (Free slot)</span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Dirty Write-Back:</span>
                      {isDirtyWrite ? (
                        <span className="text-rose-400 font-bold flex items-center gap-1">
                          <Flame className="w-3.5 h-3.5 text-amber-400 animate-flame-flicker" />
                          +10ms Disk Flush
                        </span>
                      ) : (
                        <span className="text-zinc-500">0ms Flush</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Micro Memory State Map */}
                {stepData?.memory_state && (
                  <div className="mb-3">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1 font-mono">
                      RAM Die Micro-Map
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {stepData.memory_state.map((f) => {
                        const isThisTarget = f.frame_id === stepData.frame_id;
                        return (
                          <div
                            key={f.frame_id}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono border text-center transition-all ${
                              !f.is_occupied
                                ? 'bg-[#000000] text-zinc-600 border-[#222222]'
                                : f.dirty
                                ? 'bg-[#211100] text-amber-300 border-amber-600 font-bold'
                                : 'bg-[#141414] text-zinc-200 border-[#2E2E2E]'
                            } ${isThisTarget ? 'ring-2 ring-white scale-105' : ''}`}
                            title={`Frame ${f.frame_id}: ${f.is_occupied ? `Page ${f.page_number}` : 'Empty'}`}
                          >
                            {f.is_occupied ? `P${f.page_number}` : '-'}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Running Cumulative Stats */}
              <div className="pt-3 border-t border-[#222222] grid grid-cols-4 gap-2 text-center text-xs font-mono">
                <div className="p-2 rounded-lg bg-[#000000] border border-[#222222]">
                  <span className="text-[10px] text-zinc-500 uppercase block">Hit Rate</span>
                  <span className="font-extrabold text-emerald-400 text-sm">{stats.hitRatio}%</span>
                </div>
                <div className="p-2 rounded-lg bg-[#000000] border border-[#222222]">
                  <span className="text-[10px] text-zinc-500 uppercase block">Faults</span>
                  <span className="font-extrabold text-rose-400 text-sm">{stats.faults}</span>
                </div>
                <div className="p-2 rounded-lg bg-[#000000] border border-[#222222]">
                  <span className="text-[10px] text-zinc-500 uppercase block">Dirty Sync</span>
                  <span className="font-extrabold text-amber-400 text-sm">{stats.dirtyWrites}</span>
                </div>
                <div className="p-2 rounded-lg bg-[#000000] border border-[#222222]">
                  <span className="text-[10px] text-zinc-500 uppercase block">EAT</span>
                  <span className="font-extrabold text-white text-sm">{stats.eatMs}ms</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
