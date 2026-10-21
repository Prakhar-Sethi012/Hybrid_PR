import React from 'react';
import { Play, Settings2, Sliders, Sparkles, RefreshCw, Layers, ShieldCheck, Zap } from 'lucide-react';

export default function ConfigurationSidebar({
  config,
  onChange,
  onRunSimulation,
  isLoading,
}) {
  const algorithms = [
    { id: 'AdaptiveHybrid', name: 'AdaptiveHybrid', desc: 'Decayed LRFU + δ Dirty Penalty Cost', tag: 'Best EAT', tagColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
    { id: 'FIFO', name: 'FIFO', desc: 'First-In, First-Out Arrival Eviction', tag: 'Baseline', tagColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
    { id: 'LRU', name: 'LRU', desc: 'Least Recently Used Access Eviction', tag: 'Recency', tagColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' },
    { id: 'LFU', name: 'LFU', desc: 'Least Frequently Used Frequency Eviction', tag: 'Frequency', tagColor: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
  ];

  const workloads = [
    { id: 'Zipf (Hot/Cold)', label: 'Zipf (Hot/Cold)', desc: '80% requests target 20% hot pages' },
    { id: 'Loop', label: 'Loop (Repetitive)', desc: 'Repeats sequence of pages cyclically' },
    { id: 'Sequential', label: 'Sequential Scan', desc: 'Linear page sweep through address space' },
    { id: 'Random', label: 'Uniform Random', desc: 'Stochastic uniform page references' },
  ];

  const presets = [
    { label: 'Zipf 80/20', algo: 'AdaptiveHybrid', workload: 'Zipf (Hot/Cold)', frames: 10, refs: 1000, writeProb: 0.2 },
    { label: 'Loop Thrash', algo: 'AdaptiveHybrid', workload: 'Loop', frames: 10, refs: 1000, writeProb: 0.2 },
    { label: 'Seq Scan', algo: 'LRU', workload: 'Sequential', frames: 10, refs: 1000, writeProb: 0.2 },
    { label: 'High Writes', algo: 'AdaptiveHybrid', workload: 'Zipf (Hot/Cold)', frames: 10, refs: 1000, writeProb: 0.5 },
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
    <aside className="w-full lg:w-80 flex-shrink-0 bg-gray-900/90 border border-gray-800 rounded-2xl p-5 shadow-2xl backdrop-blur-md flex flex-col justify-between">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-800">
          <div className="flex items-center gap-2 text-white">
            <Settings2 className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider">
              Simulation Config
            </h2>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">
            Stage 5 API
          </span>
        </div>

        {/* Algorithm Selection */}
        <div>
          <label className="text-xs font-semibold text-gray-300 block mb-2 uppercase tracking-wide">
            Replacement Algorithm
          </label>
          <div className="space-y-1.5">
            {algorithms.map((algo) => {
              const active = config.algorithm === algo.id;
              return (
                <button
                  key={algo.id}
                  type="button"
                  onClick={() => onChange({ ...config, algorithm: algo.id })}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all text-xs flex items-center justify-between ${
                    active
                      ? 'bg-gradient-to-r from-cyan-950/60 to-gray-900 border-cyan-500/60 text-white shadow-md shadow-cyan-950/30'
                      : 'bg-gray-950/40 border-gray-800 text-gray-400 hover:text-gray-200 hover:border-gray-700'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-white flex items-center gap-1.5">
                      {algo.name}
                      {active && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />}
                    </div>
                    <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                      {algo.desc}
                    </div>
                  </div>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${algo.tagColor}`}>
                    {algo.tag}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Workload Pattern Dropdown */}
        <div>
          <label className="text-xs font-semibold text-gray-300 block mb-2 uppercase tracking-wide">
            Workload Pattern
          </label>
          <select
            value={config.workload_type}
            onChange={(e) => onChange({ ...config, workload_type: e.target.value })}
            className="w-full bg-gray-950 border border-gray-800 text-white text-xs rounded-xl p-2.5 font-mono focus:border-cyan-500 focus:outline-none transition-colors"
          >
            {workloads.map((w) => (
              <option key={w.id} value={w.id}>
                {w.label} ({w.desc})
              </option>
            ))}
          </select>
        </div>

        {/* Physical Frames Count */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-gray-300 uppercase tracking-wide">
              Physical Frames
            </span>
            <span className="font-mono text-cyan-400 font-bold bg-cyan-950/60 border border-cyan-800 px-2 py-0.5 rounded">
              {config.frame_count} frames
            </span>
          </div>
          <input
            type="range"
            min={2}
            max={32}
            step={1}
            value={config.frame_count}
            onChange={(e) => onChange({ ...config, frame_count: parseInt(e.target.value) || 10 })}
            className="w-full accent-cyan-400 bg-gray-800 h-1.5 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-gray-500 font-mono mt-1">
            <span>2 frames (constrained)</span>
            <span>32 frames (spacious)</span>
          </div>
        </div>

        {/* Memory References */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-gray-300 uppercase tracking-wide">
              Memory References
            </span>
            <span className="font-mono text-purple-400 font-bold bg-purple-950/60 border border-purple-800 px-2 py-0.5 rounded">
              {config.references?.toLocaleString()} refs
            </span>
          </div>
          <input
            type="range"
            min={100}
            max={3000}
            step={100}
            value={config.references}
            onChange={(e) => onChange({ ...config, references: parseInt(e.target.value) || 1000 })}
            className="w-full accent-purple-400 bg-gray-800 h-1.5 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-gray-500 font-mono mt-1">
            <span>100 refs</span>
            <span>3,000 refs</span>
          </div>
        </div>

        {/* Write Probability Slider */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-gray-300 uppercase tracking-wide">
              Write Probability
            </span>
            <span className="font-mono text-amber-400 font-bold bg-amber-950/60 border border-amber-800 px-2 py-0.5 rounded">
              {(config.write_probability * 100).toFixed(0)}% Writes
            </span>
          </div>
          <input
            type="range"
            min={0.0}
            max={1.0}
            step={0.05}
            value={config.write_probability}
            onChange={(e) => onChange({ ...config, write_probability: parseFloat(e.target.value) })}
            className="w-full accent-amber-400 bg-gray-800 h-1.5 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-gray-500 font-mono mt-1">
            <span>0% (Read Only)</span>
            <span>100% (Pure Writes)</span>
          </div>
        </div>

        {/* Seed Input */}
        <div>
          <label className="text-xs font-semibold text-gray-300 block mb-1 uppercase tracking-wide">
            Reproducibility Seed
          </label>
          <input
            type="number"
            value={config.seed ?? 42}
            onChange={(e) => onChange({ ...config, seed: parseInt(e.target.value) || 42 })}
            className="w-full bg-gray-950 border border-gray-800 text-white text-xs rounded-xl p-2 font-mono focus:border-cyan-500 focus:outline-none"
          />
        </div>

        {/* Quick Presets */}
        <div>
          <span className="text-[11px] font-medium text-gray-400 block mb-1.5">
            Quick Scenario Presets
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            {presets.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => applyPreset(p)}
                className="text-[11px] font-mono px-2 py-1 rounded-lg bg-gray-950 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-700 transition-colors truncate"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Run Simulation Action Button */}
      <div className="pt-5 mt-5 border-t border-gray-800">
        <button
          onClick={onRunSimulation}
          disabled={isLoading}
          className="w-full py-3 px-4 rounded-xl font-semibold text-sm text-gray-950 bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 hover:from-cyan-300 hover:to-emerald-300 shadow-lg shadow-cyan-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-gray-950" />
              <span>Simulating Trace...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-gray-950 text-gray-950" />
              <span>Run Simulation</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
