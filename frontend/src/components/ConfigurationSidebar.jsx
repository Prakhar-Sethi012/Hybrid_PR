import React from 'react';
import { Play, Settings2, RefreshCw } from 'lucide-react';

export default function ConfigurationSidebar({
  config,
  onChange,
  onRunSimulation,
  isLoading,
}) {
  const algorithms = [
    { id: 'AdaptiveHybrid', name: 'AdaptiveHybrid', desc: 'Decayed LRFU + δ Dirty Penalty Cost', tag: 'Hybrid' },
    { id: 'LRU', name: 'LRU', desc: 'Least Recently Used Access Eviction', tag: 'Recency' },
    { id: 'LFU', name: 'LFU', desc: 'Least Frequently Used Frequency Eviction', tag: 'Frequency' },
    { id: 'FIFO', name: 'FIFO', desc: 'First-In, First-Out Arrival Eviction', tag: 'Baseline' },
  ];

  const workloads = [
    { id: 'Zipf (Hot/Cold)', label: 'Zipf (Hot/Cold)', desc: '80% requests target 20% hot pages' },
    { id: 'Loop', label: 'Loop (Repetitive)', desc: 'Repeats sequence of pages cyclically' },
    { id: 'Sequential', label: 'Sequential Scan', desc: 'Linear page sweep through address space' },
    { id: 'Random', label: 'Uniform Random', desc: 'Stochastic uniform page references' },
  ];

  const presets = [
    { label: 'Zipf 80/20', algo: 'AdaptiveHybrid', workload: 'Zipf (Hot/Cold)', frames: 10, refs: 500, writeProb: 0.2 },
    { label: 'Loop Thrash', algo: 'AdaptiveHybrid', workload: 'Loop', frames: 10, refs: 500, writeProb: 0.2 },
    { label: 'Seq Scan', algo: 'LRU', workload: 'Sequential', frames: 10, refs: 500, writeProb: 0.2 },
    { label: 'High Writes', algo: 'AdaptiveHybrid', workload: 'Zipf (Hot/Cold)', frames: 10, refs: 500, writeProb: 0.5 },
  ];

  const applyPreset = (p) => {
    onChange({
      ...config,
      algorithm: p.algo,
      workload_type: p.workload,
      frame_count: p.frames,
      references: p.refs,
      write_probability: p.writeProb,
    });
  };

  return (
    <aside className="w-full lg:w-80 flex-shrink-0 bg-[#121215] border border-zinc-800 rounded-xl p-4 shadow-sm flex flex-col justify-between">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2 text-zinc-100">
            <Settings2 className="w-4 h-4 text-zinc-400" />
            <h2 className="text-xs font-mono font-semibold uppercase tracking-wider">
              Simulation Parameters
            </h2>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
            Engine v2
          </span>
        </div>

        {/* Algorithm Selection */}
        <div>
          <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block mb-1.5">
            Algorithm Policy
          </label>
          <div className="space-y-1">
            {algorithms.map((algo) => {
              const active = config.algorithm === algo.id;
              return (
                <button
                  key={algo.id}
                  type="button"
                  onClick={() => onChange({ ...config, algorithm: algo.id })}
                  className={`w-full text-left p-2 rounded-lg border transition-colors text-xs flex items-center justify-between ${
                    active
                      ? 'bg-zinc-800 border-zinc-600 text-zinc-100'
                      : 'bg-[#09090b] border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-semibold text-zinc-200 font-mono flex items-center gap-1.5">
                      {algo.name}
                      {active && <span className="w-1.5 h-1.5 rounded-full bg-zinc-200" />}
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono truncate">
                      {algo.desc}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded border flex-shrink-0 ${
                      active
                        ? 'bg-zinc-900 text-zinc-200 border-zinc-700'
                        : 'bg-zinc-900/60 text-zinc-500 border-zinc-800'
                    }`}
                  >
                    {algo.tag}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Workload Pattern Dropdown */}
        <div>
          <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 block mb-1.5">
            Workload Distribution
          </label>
          <select
            value={config.workload_type}
            onChange={(e) => onChange({ ...config, workload_type: e.target.value })}
            className="w-full bg-[#09090b] border border-zinc-800 text-zinc-200 text-xs rounded-lg p-2 font-mono focus:border-zinc-600 focus:outline-none transition-colors"
          >
            {workloads.map((w) => (
              <option key={w.id} value={w.id}>
                {w.label} - {w.desc}
              </option>
            ))}
          </select>
        </div>

        {/* Physical Frames Count */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1 font-mono">
            <span className="text-zinc-400 text-[11px] uppercase tracking-wider">Frames</span>
            <span className="text-zinc-200 font-bold bg-zinc-900 border border-zinc-800 px-1.5 py-0.2 rounded text-[11px]">
              {config.frame_count}
            </span>
          </div>
          <input
            type="range"
            min={2}
            max={32}
            step={1}
            value={config.frame_count}
            onChange={(e) => onChange({ ...config, frame_count: parseInt(e.target.value) || 10 })}
            className="w-full cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-zinc-500 font-mono mt-0.5">
            <span>2 (Constrained)</span>
            <span>32 (Spacious)</span>
          </div>
        </div>

        {/* Memory References */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1 font-mono">
            <span className="text-zinc-400 text-[11px] uppercase tracking-wider">Access References</span>
            <span className="text-zinc-200 font-bold bg-zinc-900 border border-zinc-800 px-1.5 py-0.2 rounded text-[11px]">
              {config.references?.toLocaleString()}
            </span>
          </div>
          <input
            type="range"
            min={50}
            max={1000}
            step={50}
            value={config.references}
            onChange={(e) => onChange({ ...config, references: parseInt(e.target.value) || 500 })}
            className="w-full cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-zinc-500 font-mono mt-0.5">
            <span>50 refs</span>
            <span>1,000 refs</span>
          </div>
        </div>

        {/* Write Probability Slider */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1 font-mono">
            <span className="text-zinc-400 text-[11px] uppercase tracking-wider">Write Probability</span>
            <span className="text-amber-400 font-bold bg-zinc-900 border border-zinc-800 px-1.5 py-0.2 rounded text-[11px]">
              {(config.write_probability * 100).toFixed(0)}%
            </span>
          </div>
          <input
            type="range"
            min={0.0}
            max={1.0}
            step={0.05}
            value={config.write_probability}
            onChange={(e) => onChange({ ...config, write_probability: parseFloat(e.target.value) })}
            className="w-full cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-zinc-500 font-mono mt-0.5">
            <span>0% Read Only</span>
            <span>100% Writes</span>
          </div>
        </div>

        {/* Quick Presets */}
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 block mb-1">
            Presets
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            {presets.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => applyPreset(p)}
                className="text-[11px] font-mono px-2 py-1 rounded bg-[#09090b] border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-colors truncate text-left"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Primary Action Button */}
      <div className="pt-4 mt-4 border-t border-zinc-800">
        <button
          type="button"
          onClick={onRunSimulation}
          disabled={isLoading}
          className="w-full py-2.5 px-4 rounded-lg font-medium text-xs font-mono text-zinc-950 bg-zinc-100 hover:bg-zinc-200 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Simulating...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run Simulation</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
