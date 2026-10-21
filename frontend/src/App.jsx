import React, { useState, useEffect, useRef, useCallback } from 'react';
import ConfigurationSidebar from './components/ConfigurationSidebar';
import MetricsRibbon from './components/MetricsRibbon';
import RAMVisualizer from './components/RAMVisualizer';
import TimelinePlayer from './components/TimelinePlayer';
import StepExplanationPanel from './components/StepExplanationPanel';
import ComparisonMode from './components/ComparisonMode';
import BenchmarkCharts from './components/BenchmarkCharts';
import {
  Cpu,
  Layers,
  GitCompare,
  BarChart3,
  AlertCircle,
  RefreshCw,
  Sliders,
  Keyboard,
} from 'lucide-react';

export default function App() {
  const [config, setConfig] = useState({
    algorithm: 'AdaptiveHybrid',
    workload_type: 'Zipf (Hot/Cold)',
    frame_count: 10,
    references: 500,
    write_probability: 0.2,
    seed: 42,
  });

  const [simulationData, setSimulationData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Active view: 'STEPPER' (Single Algorithm Stepper), 'COMPARE' (4-Way Comparison), 'BENCHMARK'
  const [activeView, setActiveView] = useState('STEPPER');

  // Stepper timeline playback state
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(200); // ms per step
  const playTimerRef = useRef(null);

  // Comparison mode data & step
  const [compareData, setCompareData] = useState(null);
  const [isCompareLoading, setIsCompareLoading] = useState(false);
  const [compareStepIndex, setCompareStepIndex] = useState(0);
  const [isComparePlaying, setIsComparePlaying] = useState(false);
  const [compareSpeed, setCompareSpeed] = useState(200);
  const compareTimerRef = useRef(null);

  // Run single simulation
  const runSimulation = useCallback(
    async (customConfig = config) => {
      setIsLoading(true);
      setIsPlaying(false);
      if (playTimerRef.current) clearInterval(playTimerRef.current);
      setError(null);

      try {
        const res = await fetch('/api/simulate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(customConfig),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || `Server returned ${res.status}: ${res.statusText}`);
        }

        const data = await res.json();
        setSimulationData(data);
        // Start playback at step 0 so user can step through reference-by-reference
        setCurrentStepIndex(0);
      } catch (err) {
        setError(err.message || 'Failed to execute simulation');
      } finally {
        setIsLoading(false);
      }
    },
    [config]
  );

  // Run comparison simulation across all 4 algorithms on identical workload
  const runCompare = useCallback(
    async (customConfig = config) => {
      setIsCompareLoading(true);
      setIsComparePlaying(false);
      if (compareTimerRef.current) clearInterval(compareTimerRef.current);

      try {
        const res = await fetch('/api/compare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workload_type: customConfig.workload_type,
            frame_count: customConfig.frame_count,
            references: Math.min(customConfig.references, 500),
            write_probability: customConfig.write_probability,
            seed: customConfig.seed,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setCompareData(data);
          setCompareStepIndex(0);
        } else {
          console.error('Comparison endpoint error:', res.statusText);
        }
      } catch (err) {
        console.error('Comparison fetch error:', err);
      } finally {
        setIsCompareLoading(false);
      }
    },
    [config]
  );

  // Initial load
  useEffect(() => {
    runSimulation();
  }, []);

  // Fetch comparison data when user switches to compare tab if not loaded
  useEffect(() => {
    if (activeView === 'COMPARE' && !compareData && !isCompareLoading) {
      runCompare();
    }
  }, [activeView, compareData, isCompareLoading, runCompare]);

  // Stepper Playback Loop
  useEffect(() => {
    if (isPlaying) {
      playTimerRef.current = setInterval(() => {
        setCurrentStepIndex((prev) => {
          const total = simulationData?.execution_trace?.length || 0;
          if (prev >= total - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, playbackSpeed);
    } else {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    }
    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, playbackSpeed, simulationData]);

  // Comparison Playback Loop
  useEffect(() => {
    if (isComparePlaying) {
      compareTimerRef.current = setInterval(() => {
        setCompareStepIndex((prev) => {
          const hybridTrace = compareData?.comparison?.AdaptiveHybrid?.execution_trace || [];
          const total = hybridTrace.length;
          if (prev >= total - 1) {
            setIsComparePlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, compareSpeed);
    } else {
      if (compareTimerRef.current) clearInterval(compareTimerRef.current);
    }
    return () => {
      if (compareTimerRef.current) clearInterval(compareTimerRef.current);
    };
  }, [isComparePlaying, compareSpeed, compareData]);

  // Keyboard Shortcuts (Space for Play/Pause, ArrowLeft/Right for Stepping)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (activeView === 'STEPPER') {
          setIsPlaying((p) => !p);
        } else if (activeView === 'COMPARE') {
          setIsComparePlaying((p) => !p);
        }
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        if (activeView === 'STEPPER') {
          setIsPlaying(false);
          setCurrentStepIndex((p) => Math.max(0, p - 1));
        } else if (activeView === 'COMPARE') {
          setIsComparePlaying(false);
          setCompareStepIndex((p) => Math.max(0, p - 1));
        }
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (activeView === 'STEPPER') {
          const total = simulationData?.execution_trace?.length || 0;
          setIsPlaying(false);
          setCurrentStepIndex((p) => Math.min(total - 1, p + 1));
        } else if (activeView === 'COMPARE') {
          const hybridTrace = compareData?.comparison?.AdaptiveHybrid?.execution_trace || [];
          setIsComparePlaying(false);
          setCompareStepIndex((p) => Math.min(hybridTrace.length - 1, p + 1));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeView, simulationData, compareData]);

  // Extract current step data for Single Playback
  const traceList = simulationData?.execution_trace || [];
  const currentStep =
    currentStepIndex >= 0 && currentStepIndex < traceList.length
      ? traceList[currentStepIndex]
      : null;

  // Resolve memoryManager snapshot to display in RAMVisualizer
  const displayedMemoryManager =
    currentStep && currentStep.memory_state
      ? {
          frame_count: config.frame_count,
          occupied_count: currentStep.memory_state.filter((f) => f.is_occupied).length,
          free_count: currentStep.memory_state.filter((f) => !f.is_occupied).length,
          frames: currentStep.memory_state,
        }
      : simulationData?.memory_manager;

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans selection:bg-zinc-700 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-zinc-800 bg-[#09090b]/95 backdrop-blur sticky top-0 z-50 px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Logo & Subtitle */}
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold tracking-tight text-zinc-100 font-mono">
                  AdaptiveHybrid Simulator
                </h1>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                  v2.4
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 font-mono">
                Interactive Stepper &bull; Dirty Penalty Cost C(p) &bull; Synchronized Divergence
              </p>
            </div>
          </div>

          {/* Navigation Tabs & Status */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>FastAPI :8000</span>
            </div>

            <div className="flex items-center p-0.5 bg-zinc-900 rounded-lg border border-zinc-800 text-xs font-mono">
              <button
                type="button"
                onClick={() => setActiveView('STEPPER')}
                className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
                  activeView === 'STEPPER'
                    ? 'bg-zinc-200 text-zinc-950 font-medium'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Stepper</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveView('COMPARE');
                  if (!compareData) runCompare();
                }}
                className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
                  activeView === 'COMPARE'
                    ? 'bg-zinc-200 text-zinc-950 font-medium'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <GitCompare className="w-3.5 h-3.5" />
                <span>Compare 4 Algos</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveView('BENCHMARK')}
                className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
                  activeView === 'BENCHMARK'
                    ? 'bg-zinc-200 text-zinc-950 font-medium'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Benchmarks</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 flex flex-col lg:flex-row gap-5">
        {/* Left: Configuration Sidebar */}
        <ConfigurationSidebar
          config={config}
          onChange={setConfig}
          onRunSimulation={() => {
            runSimulation(config);
            if (activeView === 'COMPARE') {
              runCompare(config);
            }
          }}
          isLoading={isLoading || isCompareLoading}
        />

        {/* Right: Content Viewport */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Error Banner */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-950/30 border border-rose-800/60 text-rose-300 text-xs flex items-center justify-between font-mono">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>Simulation Error: {error}</span>
              </div>
              <button
                type="button"
                onClick={() => runSimulation()}
                className="underline hover:text-white font-medium cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {/* VIEW 1: STEPPER (Interactive Step-by-Step Playback) */}
          {activeView === 'STEPPER' && (
            <div className="space-y-0">
              {/* Overall Metrics Summary */}
              <MetricsRibbon
                metrics={simulationData?.metrics}
                latencies={simulationData?.latencies}
                isLoading={isLoading}
              />

              {/* Timeline Player Scrubber Bar */}
              <TimelinePlayer
                currentStep={currentStepIndex}
                totalSteps={traceList.length}
                isPlaying={isPlaying}
                playbackSpeed={playbackSpeed}
                onPlayPause={() => setIsPlaying(!isPlaying)}
                onStepChange={(step) => {
                  setIsPlaying(false);
                  setCurrentStepIndex(step);
                }}
                onSpeedChange={(speed) => setPlaybackSpeed(speed)}
                trace={traceList}
              />

              {/* Active Step Explanation Panel with Math Log */}
              <StepExplanationPanel
                currentStep={currentStep}
                algorithm={config.algorithm}
              />

              {/* Live Physical Memory Frames Visualizer */}
              <RAMVisualizer
                memoryManager={displayedMemoryManager}
                currentStepData={currentStep}
                algorithm={config.algorithm}
              />

              {/* Keyboard Shortcuts Hint */}
              <div className="mt-2 text-center text-[11px] font-mono text-zinc-500 flex items-center justify-center gap-3">
                <Keyboard className="w-3.5 h-3.5" />
                <span>Keyboard Shortcuts: [Space] Play/Pause &bull; [&larr;] Step Back &bull; [&rarr;] Step Forward</span>
              </div>
            </div>
          )}

          {/* VIEW 2: COMPARE (Synchronized 4-Algorithm Execution Mode) */}
          {activeView === 'COMPARE' && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-100 font-mono tracking-tight">
                    Synchronized 4-Algorithm Divergence Analysis
                  </h2>
                  <p className="text-xs text-zinc-400 font-mono mt-0.5">
                    Advances FIFO, LRU, LFU, and AdaptiveHybrid step-by-step on the identical memory trace
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => runCompare()}
                  disabled={isCompareLoading}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-40"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCompareLoading ? 'animate-spin' : ''}`} />
                  <span>Re-run Comparison</span>
                </button>
              </div>

              <ComparisonMode
                compareData={compareData}
                isLoading={isCompareLoading}
                currentStep={compareStepIndex}
                onStepChange={(step) => {
                  setIsComparePlaying(false);
                  setCompareStepIndex(step);
                }}
                isPlaying={isComparePlaying}
                playbackSpeed={compareSpeed}
                onPlayPause={() => setIsComparePlaying(!isComparePlaying)}
                onSpeedChange={(speed) => setCompareSpeed(speed)}
                onRefresh={() => runCompare()}
              />
            </div>
          )}

          {/* VIEW 3: BENCHMARK CHARTS */}
          {activeView === 'BENCHMARK' && (
            <BenchmarkCharts apiBaseUrl="" />
          )}
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-zinc-800/80 bg-[#09090b] py-3.5 px-6 text-xs text-zinc-500 font-mono mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Operating Systems Research Simulator &bull; AdaptiveHybrid Page Replacement
          </span>
          <span>
            RAM = 100ns &bull; Fault Disk Read = 10ms &bull; Dirty Penalty &delta; = 10ms
          </span>
        </div>
      </footer>
    </div>
  );
}
