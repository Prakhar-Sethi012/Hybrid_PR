import React, { useState } from 'react';
import { Play, Sliders, RefreshCw, X, Hash } from 'lucide-react';

/**
 * ScenarioComposer — Minimalist modal dialog for configuring simulation parameters.
 * Styled with true Vercel/Linear minimalism: borderless cards, subtle fills, crisp typography.
 */
export default function ScenarioComposer({
  config,
  onChange,
  onRunSimulation,
  isLoading,
  isOpen,
  onClose,
}) {
  const [customInput, setCustomInput] = useState(
    config?.custom_reference_string ? config.custom_reference_string.join(', ') : ''
  );

  React.useEffect(() => {
    setCustomInput(config?.custom_reference_string ? config.custom_reference_string.join(', ') : '');
  }, [config?.custom_reference_string]);

  if (!isOpen) return null;

  const algorithms = [
    {
      id: 'AdaptiveHybrid',
      name: 'AdaptiveHybrid',
      desc: 'Recursive LRFU decay S(p) with δ dirty write penalty C(p)',
      badge: 'Proposed',
    },
    {
      id: 'LRU',
      name: 'LRU',
      desc: 'Evicts least recently referenced frame (recency priority)',
      badge: 'Recency',
    },
    {
      id: 'LFU',
      name: 'LFU',
      desc: 'Evicts least frequently referenced frame (frequency priority)',
      badge: 'Frequency',
    },
    {
      id: 'FIFO',
      name: 'FIFO',
      desc: 'Evicts oldest loaded frame in physical memory (arrival order)',
      badge: 'Baseline',
    },
  ];

  const workloads = [
    {
      id: 'Zipf (Hot/Cold)',
      label: 'Zipfian Locality',
      sublabel: '80% requests target 20% hot pages (skewed)',
    },
    {
      id: 'Loop',
      label: 'Cyclic Loop Thrashing',
      sublabel: 'Working set exceeds RAM capacity',
    },
    {
      id: 'Sequential',
      label: 'Sequential Scan',
      sublabel: 'Strict streaming with zero re-referencing',
    },
    {
      id: 'Random',
      label: 'Uniform Random',
      sublabel: 'Zero spatial or temporal locality',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="bg-[#111111] rounded-xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl animate-modal-enter">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-900">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded bg-zinc-900 text-zinc-300">
              <Sliders className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <h2 id="modal-title" className="text-sm font-bold text-zinc-100 tracking-tight font-sans">
                Simulation Configuration
              </h2>
              <p className="text-[11px] text-zinc-500 font-mono">
                Workload parameters, RAM frames, and replacement policy
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200 p-1 rounded hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Close configuration modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 font-sans text-xs">
          {/* Policy Selection */}
          <div>
            <label className="text-[10px] font-mono uppercase text-zinc-500 block mb-1.5">
              Page Replacement Policy
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {algorithms.map((algo) => {
                const isSelected = config.algorithm === algo.id;
                return (
                  <button
                    key={algo.id}
                    type="button"
                    onClick={() => onChange({ ...config, algorithm: algo.id })}
                    className={`p-2.5 rounded-md text-left transition-colors cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-zinc-800 text-zinc-100'
                        : 'bg-[#161616] hover:bg-[#1C1C1C] text-zinc-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-xs text-zinc-200">{algo.name}</span>
                      <span className="text-[9px] font-mono text-zinc-500">
                        {algo.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 leading-snug">
                      {algo.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Workload Pattern Selection */}
          <div>
            <label className="text-[10px] font-mono uppercase text-zinc-500 block mb-1.5">
              Workload Pattern
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {workloads.map((w) => {
                const isSelected = config.workload_type === w.id;
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => onChange({ ...config, workload_type: w.id })}
                    className={`p-2.5 rounded-md text-left transition-colors cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-zinc-800 text-zinc-100'
                        : 'bg-[#161616] hover:bg-[#1C1C1C] text-zinc-400'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-xs text-zinc-200">
                        {w.label}
                      </div>
                      <div className="text-[10px] text-zinc-500">
                        {w.sublabel}
                      </div>
                    </div>
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ml-2 ${
                        isSelected ? 'bg-zinc-200' : 'bg-zinc-700'
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Parameters Grid */}
          <div className="pt-2.5 border-t border-zinc-900 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Physical Frames */}
            <div className="p-3 rounded-md bg-[#161616]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium text-zinc-300 font-mono">
                  Physical RAM Frames
                </span>
                <span className="font-mono font-bold text-zinc-100 text-xs">
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
                className="w-full cursor-pointer h-1.5 bg-zinc-800 rounded-lg appearance-none accent-zinc-200 mt-2"
                aria-label="Physical frame count"
              />
              <div className="flex justify-between text-[10px] text-zinc-600 font-mono mt-1">
                <span>4 min</span>
                <span>16 avg</span>
                <span>64 max</span>
              </div>
            </div>

            {/* Total References */}
            <div className="p-3 rounded-md bg-[#161616]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium text-zinc-300 font-mono">
                  Trace Length
                </span>
                <span className="font-mono font-bold text-zinc-100 text-xs">
                  {config.references} refs
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1 mt-2">
                {[100, 250, 500, 1000].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => onChange({ ...config, references: num })}
                    className={`py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                      config.references === num
                        ? 'bg-zinc-700 text-zinc-100 font-semibold'
                        : 'bg-[#202020] text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Write Probability */}
            <div className="p-3 rounded-md bg-[#161616]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium text-zinc-300 font-mono">
                  Write Ratio
                </span>
                <span className="font-mono font-bold text-amber-400 text-xs">
                  {((config.write_probability ?? 0.2) * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={config.write_probability}
                onChange={(e) => onChange({ ...config, write_probability: Number(e.target.value) })}
                className="w-full cursor-pointer h-1.5 bg-zinc-800 rounded-lg appearance-none accent-zinc-200 mt-2"
                aria-label="Write probability"
              />
              <p className="text-[10px] text-zinc-500 font-mono mt-1">
                Dirty evictions trigger +δ (10ms) disk write flush
              </p>
            </div>

            {/* Random Seed */}
            <div className="p-3 rounded-md bg-[#161616]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium text-zinc-300 font-mono">
                  Workload RNG Seed
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">Reproducible</span>
              </div>
              <input
                type="number"
                value={config.seed ?? 42}
                onChange={(e) => onChange({ ...config, seed: Number(e.target.value) })}
                className="w-full px-2.5 py-1 rounded bg-[#202020] text-xs font-mono text-zinc-100 outline-none border-0 mt-2"
                aria-label="Workload random seed"
              />
            </div>

            {/* Custom Reference String */}
            <div className="col-span-1 sm:col-span-2 p-3 rounded-md bg-[#161616]">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-[11px] font-medium text-zinc-300 font-mono">
                    Custom Reference String (Optional)
                  </span>
                </div>
                {config.custom_reference_string && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomInput('');
                      onChange({ ...config, custom_reference_string: null });
                    }}
                    className="text-[10px] font-mono text-zinc-400 hover:text-zinc-200 cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
              <textarea
                rows={2}
                placeholder="e.g.: 1, 2, 3, 1, 4, 2, 5, 1 (space, comma, or newline separated)"
                value={customInput}
                onChange={(e) => {
                  const raw = e.target.value;
                  setCustomInput(raw);
                  const trimmed = raw.trim();
                  if (!trimmed) {
                    onChange({ ...config, custom_reference_string: null });
                    return;
                  }
                  const parsed = trimmed
                    .split(/[\s,]+/)
                    .map((v) => parseInt(v.trim(), 10))
                    .filter((n) => !isNaN(n));
                  onChange({ ...config, custom_reference_string: parsed.length > 0 ? parsed : null });
                }}
                className="w-full mt-1 px-2.5 py-1.5 rounded bg-[#202020] text-xs font-mono text-zinc-200 outline-none resize-none placeholder:text-zinc-600 border-0"
                aria-label="Custom reference string input"
              />
              <p className="text-[10px] text-zinc-500 font-mono mt-1">
                When provided, bypasses the generator and executes this exact sequence.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="mt-5 pt-3 border-t border-zinc-900 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs cursor-pointer transition-colors"
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
            className="px-4 py-1.5 rounded bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40 transition-colors"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Simulating...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Apply & Run</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
