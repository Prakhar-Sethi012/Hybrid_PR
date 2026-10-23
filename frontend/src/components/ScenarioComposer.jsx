import React from 'react';
import { Play, Sliders, RefreshCw, X } from 'lucide-react';

export default function ScenarioComposer({
  config,
  onChange,
  onRunSimulation,
  isLoading,
  isOpen,
  onClose,
}) {
  if (!isOpen) return null;

  const algorithms = [
    {
      id: 'AdaptiveHybrid',
      name: 'AdaptiveHybrid',
      desc: 'Recursive LRFU decay S(p) with δ dirty penalty cost C(p)',
      badge: 'Proposed',
      color: 'border-teal-600 bg-[#021812] text-teal-300',
    },
    {
      id: 'LRU',
      name: 'LRU',
      desc: 'Evicts least recently referenced frame (recency priority)',
      badge: 'Recency',
      color: 'border-[#303030] bg-[#141414] text-white',
    },
    {
      id: 'LFU',
      name: 'LFU',
      desc: 'Evicts least frequently referenced frame (frequency priority)',
      badge: 'Frequency',
      color: 'border-purple-600 bg-[#16051E] text-purple-300',
    },
    {
      id: 'FIFO',
      name: 'FIFO',
      desc: 'Evicts oldest loaded frame in physical memory (arrival order)',
      badge: 'Baseline',
      color: 'border-amber-600 bg-[#180F02] text-amber-300',
    },
  ];

  const workloads = [
    {
      id: 'Zipf (Hot/Cold)',
      label: 'Zipfian Locality',
      sublabel: '80% requests target 20% hot pages (strong temporal skew)',
    },
    {
      id: 'Loop',
      label: 'Cyclic Loop Thrashing',
      sublabel: 'Working set strictly exceeds physical RAM capacity',
    },
    {
      id: 'Sequential',
      label: 'Sequential Scan',
      sublabel: 'Strict linear streaming with zero page re-referencing',
    },
    {
      id: 'Random',
      label: 'Uniform Random',
      sublabel: 'Zero spatial or temporal locality reference distribution',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="bg-[#0A0A0A] border border-[#222222] rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl animate-modal-enter">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-5 border-b border-[#222222]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#141414] border border-[#27272A] text-white">
              <Sliders className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="modal-title" className="text-base font-bold text-white tracking-tight font-sans">
                Scenario Composer & Hardware Config
              </h2>
              <p className="text-xs text-zinc-400">
                Configure workload parameters, page capacity, and replacement policy
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-[#141414] cursor-pointer"
            aria-label="Close configuration modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5 font-sans">
          {/* Policy Selection */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block mb-2 font-mono">
              Page Replacement Policy
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {algorithms.map((algo) => {
                const isSelected = config.algorithm === algo.id;
                return (
                  <button
                    key={algo.id}
                    type="button"
                    onClick={() => onChange({ ...config, algorithm: algo.id })}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-white bg-[#141414] text-white ring-1 ring-white'
                        : 'border-[#222222] bg-[#000000] text-zinc-300 hover:border-zinc-600 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-xs">{algo.name}</span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${algo.color}`}>
                        {algo.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-snug">
                      {algo.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Workload Pattern Selection */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400 block mb-2 font-mono">
              Workload Reference Pattern
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {workloads.map((w) => {
                const isSelected = config.workload_type === w.id;
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => onChange({ ...config, workload_type: w.id })}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'border-white bg-[#141414] text-white ring-1 ring-white'
                        : 'border-[#222222] bg-[#000000] text-zinc-300 hover:border-zinc-600 hover:text-white'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-xs font-sans text-white">
                        {w.label}
                      </div>
                      <div className="text-[11px] text-zinc-400 font-sans">
                        {w.sublabel}
                      </div>
                    </div>
                    <span
                      className={`w-3 h-3 rounded-full flex-shrink-0 ml-2 border ${
                        isSelected ? 'bg-white border-white' : 'bg-transparent border-zinc-700'
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Numeric Parameters Grid */}
          <div className="pt-3 border-t border-[#222222] grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Physical Frames */}
            <div className="p-3 rounded-lg bg-[#000000] border border-[#222222]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-zinc-300 font-mono">
                  Physical RAM Frames
                </span>
                <span className="font-mono font-bold text-white text-xs bg-[#141414] px-2 py-0.5 rounded border border-[#2E2E2E]">
                  {config.frame_count} frames
                </span>
              </div>
              <input
                type="range"
                min="4"
                max="64"
                step="1"
                value={config.frame_count}
                onChange={(e) => onChange({ ...config, frame_count: Number(e.target.value) })}
                className="w-full cursor-pointer mt-2"
                aria-label="Physical frame count"
              />
              <div className="flex justify-between text-[10px] text-zinc-600 font-mono mt-1">
                <span>4 min</span>
                <span>16 avg</span>
                <span>64 max</span>
              </div>
            </div>

            {/* Total References */}
            <div className="p-3 rounded-lg bg-[#000000] border border-[#222222]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-zinc-300 font-mono">
                  Trace Length
                </span>
                <span className="font-mono font-bold text-white text-xs bg-[#141414] px-2 py-0.5 rounded border border-[#2E2E2E]">
                  {config.references} accesses
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 mt-2">
                {[100, 250, 500, 1000].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => onChange({ ...config, references: num })}
                    className={`py-1.5 rounded text-xs font-mono font-semibold transition-all cursor-pointer border ${
                      config.references === num
                        ? 'bg-white text-black border-white font-bold'
                        : 'bg-[#121212] text-zinc-400 border-[#242424] hover:text-white'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Write Probability */}
            <div className="p-3 rounded-lg bg-[#000000] border border-[#222222]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-zinc-300 font-mono">
                  Write Ratio (Dirty Trigger)
                </span>
                <span className="font-mono font-bold text-amber-400 text-xs bg-[#1A1002] px-2 py-0.5 rounded border border-amber-800">
                  {(config.write_probability * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={config.write_probability}
                onChange={(e) => onChange({ ...config, write_probability: Number(e.target.value) })}
                className="w-full cursor-pointer mt-2"
                aria-label="Write probability"
              />
              <p className="text-[10px] text-zinc-500 font-mono mt-1">
                Dirty evictions incur +δ (10ms) disk write penalty
              </p>
            </div>

            {/* Random Seed */}
            <div className="p-3 rounded-lg bg-[#000000] border border-[#222222]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-zinc-300 font-mono">
                  Workload RNG Seed
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">Reproducible</span>
              </div>
              <input
                type="number"
                value={config.seed ?? 42}
                onChange={(e) => onChange({ ...config, seed: Number(e.target.value) })}
                className="w-full px-3 py-1.5 rounded bg-[#121212] border border-[#2E2E2E] text-xs font-mono text-white focus:border-white outline-none"
                aria-label="Workload random seed"
              />
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="mt-6 pt-4 border-t border-[#222222] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary px-4 py-2 rounded-lg text-xs cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onRunSimulation();
            }}
            disabled={isLoading}
            className="btn-primary px-5 py-2 rounded-lg text-xs flex items-center gap-2 cursor-pointer"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Simulating...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Apply & Execute Simulation</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
