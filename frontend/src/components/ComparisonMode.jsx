import React, { useMemo } from 'react';
import {
  RefreshCw,
  GitBranch,
  CheckCircle2,
  AlertCircle,
  Flame,
  ArrowRight,
  TrendingDown,
  Layers,
  Zap,
} from 'lucide-react';
import TimelinePlayer from './TimelinePlayer';

export default function ComparisonMode({
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
  const algorithms = ['AdaptiveHybrid', 'LRU', 'LFU', 'FIFO'];

  // Check if traces exist
  const traces = useMemo(() => {
    if (!compareData?.comparison) return {};
    const res = {};
    for (const algo of algorithms) {
      res[algo] = compareData.comparison[algo]?.execution_trace || [];
    }
    return res;
  }, [compareData]);

  // Determine total steps
  const totalSteps = useMemo(() => {
    const lengths = Object.values(traces).map((t) => t.length);
    return lengths.length > 0 ? Math.max(0, ...lengths) : 0;
  }, [traces]);

  // Compute cumulative stats up to currentStep for each algorithm
  const cumulativeStats = useMemo(() => {
    const stats = {};
    for (const algo of algorithms) {
      const trace = traces[algo] || [];
      const slice = trace.slice(0, currentStep + 1);
      const hits = slice.filter((s) => s.action === 'HIT').length;
      const faults = slice.filter((s) => s.action === 'FAULT').length;
      const dirtyWrites = slice.filter((s) => s.was_dirty_write_back).length;
      const total = slice.length;
      const hitRatio = total > 0 ? ((hits / total) * 100).toFixed(1) : '0.0';

      stats[algo] = { hits, faults, dirtyWrites, total, hitRatio };
    }
    return stats;
  }, [traces, currentStep]);

  // Check for divergence at current step
  const divergenceInfo = useMemo(() => {
    if (totalSteps === 0 || currentStep < 0) return null;
    const actions = {};
    let hasDiff = false;
    let firstAction = null;

    for (const algo of algorithms) {
      const stepData = traces[algo]?.[currentStep];
      if (stepData) {
        actions[algo] = stepData.action;
        if (firstAction === null) {
          firstAction = stepData.action;
        } else if (stepData.action !== firstAction) {
          hasDiff = true;
        }
      }
    }

    return { hasDiff, actions, requestedPage: traces['AdaptiveHybrid']?.[currentStep]?.requested_page };
  }, [traces, currentStep, totalSteps]);

  if (isLoading || !compareData) {
    return (
      <div className="bg-[#121215] border border-zinc-800 rounded-xl p-12 flex flex-col items-center justify-center font-mono text-xs text-zinc-400 gap-3">
        <RefreshCw className="w-6 h-6 animate-spin text-zinc-300" />
        <span>Executing synchronized 4-algorithm simulation on identical workload...</span>
      </div>
    );
  }

  // Representative trace for the timeline scrubber
  const refTrace = traces['AdaptiveHybrid'] || [];

  return (
    <div className="space-y-5">
      {/* Synchronized Playback Control Bar */}
      <TimelinePlayer
        currentStep={currentStep}
        totalSteps={totalSteps}
        isPlaying={isPlaying}
        playbackSpeed={playbackSpeed}
        onPlayPause={onPlayPause}
        onStepChange={onStepChange}
        onSpeedChange={onSpeedChange}
        trace={refTrace}
      />

      {/* Divergence Notification Banner */}
      {divergenceInfo && divergenceInfo.hasDiff && (
        <div className="bg-amber-950/20 border border-amber-800/60 rounded-xl px-4 py-2.5 text-xs font-mono text-amber-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>
              <strong>Divergence at Step {currentStep + 1}:</strong> Page {divergenceInfo.requestedPage} was{' '}
              {Object.entries(divergenceInfo.actions).map(([a, act], i) => (
                <span key={a} className="ml-1">
                  <span className="text-zinc-300">{a}</span>:{' '}
                  <span className={act === 'HIT' ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {act}
                  </span>
                  {i < algorithms.length - 1 ? ',' : ''}
                </span>
              ))}
            </span>
          </div>
          <span className="text-[11px] text-amber-400/80 bg-amber-950/50 px-2 py-0.5 rounded border border-amber-800/80">
            Decisions Diverged
          </span>
        </div>
      )}

      {/* 4 Mini-RAM Visualizers Side-by-Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {algorithms.map((algo) => {
          const algoTrace = traces[algo] || [];
          const stepData = algoTrace[currentStep] || null;
          const frames = stepData?.memory_state || [];
          const stats = cumulativeStats[algo] || { hits: 0, faults: 0, dirtyWrites: 0, hitRatio: '0.0' };
          const isHybrid = algo === 'AdaptiveHybrid';

          return (
            <div
              key={algo}
              className={`rounded-xl border p-4 flex flex-col justify-between transition-colors ${
                isHybrid
                  ? 'bg-[#121215] border-zinc-700 shadow-sm'
                  : 'bg-[#101013] border-zinc-800/90'
              }`}
            >
              {/* Algorithm Title & Cumulative Stats */}
              <div>
                <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800 mb-3">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm text-zinc-100 font-mono">{algo}</span>
                      {isHybrid && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700">
                          Proposed
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                      {isHybrid ? 'LRFU Decay + Cost C(p)' : `${algo} Policy`}
                    </div>
                  </div>

                  {/* Cumulative Hit Rate */}
                  <div className="text-right">
                    <div className="text-xs font-mono font-bold text-zinc-200">
                      {stats.hitRatio}% Hit
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono">
                      {stats.faults} Faults &bull; {stats.dirtyWrites} &delta;
                    </div>
                  </div>
                </div>

                {/* Current Step Action Status */}
                {stepData ? (
                  <div className="mb-3 p-2 rounded-lg bg-[#09090b] border border-zinc-800/80 flex items-center justify-between text-[11px] font-mono">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                          stepData.action === 'HIT'
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/80'
                            : 'bg-rose-950/60 text-rose-400 border border-rose-800/80'
                        }`}
                      >
                        {stepData.action}
                      </span>
                      <span className="text-zinc-300">
                        P{stepData.requested_page} ({stepData.is_write ? 'W' : 'R'})
                      </span>
                    </div>

                    <div className="text-zinc-400 text-[10px]">
                      {stepData.evicted_page !== null && stepData.evicted_page !== undefined ? (
                        <span className="text-amber-400 flex items-center gap-0.5">
                          <ArrowRight className="w-2.5 h-2.5" />
                          Evict P{stepData.evicted_page}
                        </span>
                      ) : (
                        <span className="text-zinc-500">No Eviction</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mb-3 p-2 text-[11px] font-mono text-zinc-600 bg-[#09090b] rounded-lg">
                    Step {currentStep + 1}
                  </div>
                )}

                {/* Mini-RAM Frame Grid */}
                <div className="mb-3">
                  <div className="text-[10px] font-mono text-zinc-500 mb-1.5 flex items-center justify-between">
                    <span>RAM FRAMES SNAPSHOT</span>
                    <span>{frames.filter((f) => f.is_occupied).length}/{frames.length}</span>
                  </div>

                  <div className="grid grid-cols-5 gap-1.5">
                    {frames.map((frame) => {
                      const isOccupied = frame.is_occupied;
                      const isDirty = isOccupied && frame.dirty;
                      const isActive = stepData && stepData.frame_id === frame.frame_id;
                      const isHit = isActive && stepData.action === 'HIT';

                      let frameStyle = 'bg-[#09090b] border-zinc-800/80 text-zinc-600';
                      if (isActive) {
                        frameStyle = isHit
                          ? 'bg-emerald-950/30 border-emerald-500/80 text-emerald-300 ring-1 ring-emerald-500/40'
                          : 'bg-rose-950/30 border-rose-500/80 text-rose-300 ring-1 ring-rose-500/40';
                      } else if (isDirty) {
                        frameStyle = 'bg-[#0d0c0a] border-amber-900/60 text-zinc-300';
                      } else if (isOccupied) {
                        frameStyle = 'bg-zinc-900/60 border-zinc-800 text-zinc-300';
                      }

                      return (
                        <div
                          key={frame.frame_id}
                          className={`rounded p-1 border text-center font-mono transition-colors ${frameStyle}`}
                          title={`Frame #${frame.frame_id}: ${
                            isOccupied ? `Page ${frame.page_number} (${isDirty ? 'Dirty' : 'Clean'})` : 'Empty'
                          }`}
                        >
                          <div className="text-[8px] text-zinc-500 leading-tight">
                            #{frame.frame_id}
                          </div>
                          <div className="text-[11px] font-bold leading-tight">
                            {isOccupied ? `P${frame.page_number}` : '-'}
                          </div>
                          <div className="text-[8px] leading-tight">
                            {isDirty ? (
                              <span className="text-amber-400 font-bold">&delta;</span>
                            ) : isOccupied ? (
                              <span className="text-emerald-500/80">&bull;</span>
                            ) : (
                              <span>&nbsp;</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Step Decision Log Text Box */}
              <div className="mt-2 pt-2 border-t border-zinc-800/80 text-[10px] font-mono text-zinc-400 min-h-[50px] flex items-start gap-1">
                <span className="text-zinc-600 select-none">&rsaquo;</span>
                <p className="line-clamp-3 leading-snug text-zinc-300">
                  {stepData?.decision_log || 'Awaiting step execution...'}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
