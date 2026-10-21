import React, { useState, useEffect } from 'react';
import ConfigurationSidebar from './components/ConfigurationSidebar';
import MetricsRibbon from './components/MetricsRibbon';
import RAMVisualizer from './components/RAMVisualizer';
import BenchmarkCharts from './components/BenchmarkCharts';
import {
  Cpu,
  Server,
  Layers,
  Terminal,
  RefreshCw,
  ExternalLink,
  Sliders,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

export default function App() {
  const [config, setConfig] = useState({
    algorithm: 'AdaptiveHybrid',
    workload_type: 'Zipf (Hot/Cold)',
    frame_count: 10,
    references: 1000,
    write_probability: 0.2,
    seed: 42,
  });

  const [simulationData, setSimulationData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL', 'SIMULATOR', 'BENCHMARK'

  const runSimulation = async (customConfig = config) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customConfig),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || `Server returned ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      setSimulationData(data);
    } catch (err) {
      setError(err.message || 'Failed to execute simulation');
    } finally {
      setIsLoading(false);
    }
  };

  // Run initial simulation on load
  useEffect(() => {
    runSimulation();
  }, []);

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/20 selection:text-cyan-200">
      {/* Top Navigation Bar */}
      <header className="border-b border-gray-800/80 bg-gray-950/80 backdrop-blur-xl sticky top-0 z-50 px-4 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-500 shadow-md shadow-cyan-500/20 text-black">
              <Cpu className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white tracking-tight">
                  AdaptiveHybrid Memory Simulator
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                  Stage 5 Frontend
                </span>
              </div>
              <p className="text-xs text-gray-400 font-mono">
                Discrete-Event OS Page Replacement, LRFU Decay &amp; Dirty Penalty Cost C(p)
              </p>
            </div>
          </div>

          {/* Quick navigation and Backend Status */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-900 border border-gray-800 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-gray-300">FastAPI :8000</span>
            </div>

            <div className="flex items-center p-0.5 bg-gray-900 rounded-xl border border-gray-800 text-xs font-mono">
              <button
                onClick={() => setActiveTab('ALL')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  activeTab === 'ALL'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/80 font-semibold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Unified Dashboard
              </button>
              <button
                onClick={() => setActiveTab('SIMULATOR')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  activeTab === 'SIMULATOR'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/80 font-semibold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                RAM Frames
              </button>
              <button
                onClick={() => setActiveTab('BENCHMARK')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  activeTab === 'BENCHMARK'
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-800/80 font-semibold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                4x4 Benchmark
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8 flex flex-col lg:flex-row gap-6">
        {/* Left: Configuration Sidebar */}
        <ConfigurationSidebar
          config={config}
          onChange={setConfig}
          onRunSimulation={() => runSimulation(config)}
          isLoading={isLoading}
        />

        {/* Right: Visualization & Metrics Viewport */}
        <div className="flex-1 min-w-0 flex flex-col gap-6">
          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center justify-between font-mono">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span>Simulation Error: {error}</span>
              </div>
              <button
                onClick={() => runSimulation()}
                className="underline hover:text-white font-semibold"
              >
                Retry
              </button>
            </div>
          )}

          {/* 1. Live Metrics Ribbon */}
          <MetricsRibbon
            metrics={simulationData?.metrics}
            latencies={simulationData?.latencies}
            isLoading={isLoading}
          />

          {/* 2. Real-Time RAM Frames Visualizer */}
          {(activeTab === 'ALL' || activeTab === 'SIMULATOR') && (
            <RAMVisualizer
              memoryManager={simulationData?.memory_manager}
              algorithm={config.algorithm}
            />
          )}

          {/* 3. Recent Access Stream Feed (Chip Bar) */}
          {(activeTab === 'ALL' || activeTab === 'SIMULATOR') && simulationData?.trace_summary?.recent_accesses && (
            <div className="bg-gray-900/60 border border-gray-800/80 rounded-2xl p-4 text-xs font-mono">
              <div className="flex items-center justify-between mb-2 text-gray-400">
                <span className="flex items-center gap-1.5 text-gray-300 font-semibold uppercase text-[11px] tracking-wide">
                  <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                  Recent Memory Reference Stream (Last 20 Accesses)
                </span>
                <span className="text-[10px]">
                  Total: {simulationData.trace_summary.total_references.toLocaleString()} accesses |{' '}
                  {simulationData.trace_summary.writes_count} writes (
                  {((simulationData.trace_summary.writes_count / simulationData.trace_summary.total_references) * 100).toFixed(0)}%)
                </span>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                {simulationData.trace_summary.recent_accesses.map((acc, idx) => {
                  const isHit = acc.is_hit;
                  const isWrite = acc.is_write;
                  const isDirtyWb = acc.was_dirty_write_back;

                  let chipStyle = isHit
                    ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300'
                    : 'bg-rose-950/60 border-rose-700/60 text-rose-300';

                  return (
                    <div
                      key={idx}
                      className={`flex-shrink-0 px-2 py-1 rounded-lg border text-[11px] flex items-center gap-1.5 ${chipStyle}`}
                      title={`Tick #${acc.timestamp} - Page ${acc.page_number} (${acc.is_write ? 'WRITE' : 'READ'}) -> ${isHit ? 'HIT' : 'FAULT in Frame ' + acc.frame_id}${isDirtyWb ? ' [DIRTY WRITE-BACK]' : ''}`}
                    >
                      <span className="font-bold">P{acc.page_number}</span>
                      <span className="text-[9px] px-1 rounded bg-black/40">
                        {isWrite ? 'W' : 'R'}
                      </span>
                      <span className="text-[10px] font-semibold">
                        {isHit ? 'HIT' : 'MISS'}
                      </span>
                      {isDirtyWb && (
                        <span className="text-[9px] text-amber-400 font-bold">
                          WB
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. Automated Benchmark Charts (Recharts) */}
          {(activeTab === 'ALL' || activeTab === 'BENCHMARK') && (
            <BenchmarkCharts apiBaseUrl="" />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800/80 bg-gray-950/90 py-4 px-6 text-center text-xs text-gray-500 font-mono">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Discrete-Event OS Simulator &bull; AdaptiveHybrid Page Replacement &bull; Stage 5
          </span>
          <span>
            Mock Latencies: RAM = 100ns &bull; Fault = 10ms &bull; Dirty Write = 10ms
          </span>
        </div>
      </footer>
    </div>
  );
}
