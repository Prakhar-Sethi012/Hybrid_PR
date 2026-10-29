import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from './components/Header';
import ScenarioComposer from './components/ScenarioComposer';
import PerformanceMetricsRibbon from './components/PerformanceMetricsRibbon';
import HeroMemoryAccess from './components/HeroMemoryAccess';
import PlaybackControls from './components/PlaybackControls';
import DecisionNarrative from './components/DecisionNarrative';
import PhysicalMemoryMap from './components/PhysicalMemoryMap';
import AlgorithmComparisonView from './components/AlgorithmComparisonView';
import BenchmarkAnalysisView from './components/BenchmarkAnalysisView';
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal';
import InstructionTape from './components/InstructionTape';
import FormulaSandbox from './components/FormulaSandbox';
import { AlertCircle } from 'lucide-react';

export default function App() {
  const [theme, setTheme] = useState('dark'); // 'dark' | 'light'
  const [config, setConfig] = useState({
    algorithm: 'AdaptiveHybrid',
    workload_type: 'Zipf (Hot/Cold)',
    frame_count: 10,
    references: 500,
    write_probability: 0.2,
    seed: 42,
    custom_reference_string: null,
  });

  const [activeView, setActiveView] = useState('STEPPER'); // 'STEPPER', 'COMPARE', 'BENCHMARK', 'SANDBOX'
  const [isApiHealthy, setIsApiHealthy] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Single Simulation State
  const [simulationData, setSimulationData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Stepper Timeline Playback State
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(200); // ms per step
  const playTimerRef = useRef(null);

  // Synchronized 4-Way Comparison State
  const [compareData, setCompareData] = useState(null);
  const [isCompareLoading, setIsCompareLoading] = useState(false);
  const [compareStepIndex, setCompareStepIndex] = useState(0);
  const [isComparePlaying, setIsComparePlaying] = useState(false);
  const [compareSpeed, setCompareSpeed] = useState(200);
  const compareTimerRef = useRef(null);

  // Manage Theme Classes on HTML element & CSS variable class
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }, [theme]);

  // Health probe
  useEffect(() => {
    fetch('/api/health')
      .then((res) => {
        if (res.ok) setIsApiHealthy(true);
      })
      .catch(() => setIsApiHealthy(false));
  }, []);

  const configRef = useRef(config);
  configRef.current = config;

  // Run single simulation
  const runSimulation = useCallback(
    async (customConfig) => {
      const activeCfg = customConfig || configRef.current;
      setIsLoading(true);
      setIsPlaying(false);
      if (playTimerRef.current) clearInterval(playTimerRef.current);
      setError(null);

      try {
        const res = await fetch('/api/simulate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(activeCfg),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || `Server error: ${res.status} ${res.statusText}`);
        }

        const data = await res.json();
        setSimulationData(data);
        setCurrentStepIndex(0);
        setIsApiHealthy(true);
      } catch (err) {
        setError(err.message || 'Failed to execute simulation');
        if (err.name === 'TypeError' || err.message?.includes('fetch')) {
          setIsApiHealthy(false);
        }
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Run comparison simulation across all 4 algorithms on identical workload
  const runCompare = useCallback(
    async (customConfig) => {
      const activeCfg = customConfig || configRef.current;
      setIsCompareLoading(true);
      setIsComparePlaying(false);
      if (compareTimerRef.current) clearInterval(compareTimerRef.current);
      setError(null);

      try {
        const res = await fetch('/api/compare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workload_type: activeCfg.workload_type,
            frame_count: activeCfg.frame_count,
            references: Math.min(activeCfg.references, 500),
            write_probability: activeCfg.write_probability,
            seed: activeCfg.seed,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || `Comparison error: ${res.status} ${res.statusText}`);
        }

        const data = await res.json();
        setCompareData(data);
        setCompareStepIndex(0);
        setIsApiHealthy(true);
      } catch (err) {
        setError(err.message || 'Comparison fetch failed');
        if (err.name === 'TypeError' || err.message?.includes('fetch')) {
          setIsApiHealthy(false);
        }
      } finally {
        setIsCompareLoading(false);
      }
    },
    []
  );

  // Initial load on mount only
  useEffect(() => {
    runSimulation();
  }, [runSimulation]);

  // Auto-fetch comparison data when switching to compare tab
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

  // Keyboard Shortcuts
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
      } else if (e.code === 'Home') {
        e.preventDefault();
        if (activeView === 'STEPPER') {
          setIsPlaying(false);
          setCurrentStepIndex(0);
        } else if (activeView === 'COMPARE') {
          setIsComparePlaying(false);
          setCompareStepIndex(0);
        }
      } else if (e.code === 'End') {
        e.preventDefault();
        if (activeView === 'STEPPER') {
          const total = simulationData?.execution_trace?.length || 0;
          setIsPlaying(false);
          setCurrentStepIndex(Math.max(0, total - 1));
        } else if (activeView === 'COMPARE') {
          const hybridTrace = compareData?.comparison?.AdaptiveHybrid?.execution_trace || [];
          setIsComparePlaying(false);
          setCompareStepIndex(Math.max(0, hybridTrace.length - 1));
        }
      } else if (e.key === '?') {
        setShowShortcuts((prev) => !prev);
      } else if (e.key === 'Escape') {
        setShowShortcuts(false);
        setShowSettings(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeView, simulationData, compareData]);

  // Extract current trace tick data for Single Playback
  const traceList = simulationData?.execution_trace || [];
  const referenceString = simulationData?.reference_string || [];
  const currentStep =
    currentStepIndex >= 0 && currentStepIndex < traceList.length
      ? traceList[currentStepIndex]
      : null;

  // Resolve memoryManager snapshot to display in PhysicalMemoryMap
  const displayedMemoryManager =
    currentStep && currentStep.memory_state
      ? {
          frame_count:
            simulationData?.memory_manager?.frame_count ||
            currentStep.memory_state.length,
          occupied_count: currentStep.memory_state.filter((f) => f.is_occupied).length,
          free_count: currentStep.memory_state.filter((f) => !f.is_occupied).length,
          frames: currentStep.memory_state,
        }
      : simulationData?.memory_manager;

  const handleApplyPreset = (p) => {
    const updated = {
      ...config,
      algorithm: p.algo,
      workload_type: p.workload,
      frame_count: p.frames,
      references: p.refs,
      write_probability: p.writeProb,
      custom_reference_string: null,
    };
    setConfig(updated);
    runSimulation(updated);
    if (activeView === 'COMPARE') {
      runCompare(updated);
    }
  };

  // Theme-aware root background/color
  const rootClass = theme === 'light'
    ? 'min-h-screen bg-[#F9FAFB] text-[#09090B] flex flex-col font-sans transition-colors duration-200'
    : 'min-h-screen bg-black text-white flex flex-col font-sans transition-colors duration-200';

  return (
    <div className={rootClass}>
      {/* Top Observatory Command Header */}
      <Header
        activeView={activeView}
        onViewChange={setActiveView}
        isApiHealthy={isApiHealthy}
        onToggleShortcuts={() => setShowShortcuts(true)}
        onOpenSettings={() => setShowSettings(true)}
        onRunSimulation={() => {
          runSimulation(config);
          if (activeView === 'COMPARE') runCompare(config);
        }}
        isLoading={isLoading || isCompareLoading}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        config={config}
        onApplyPreset={handleApplyPreset}
      />

      {/* Main Workspace Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col">
        {/* Error Notification */}
        {error && (
          <div className="mb-3 p-3 rounded-lg bg-rose-950/40 text-rose-300 text-xs flex items-center justify-between font-mono">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>Simulation Error: {error}</span>
            </div>
            <button
              type="button"
              onClick={() => runSimulation()}
              className="px-2.5 py-1 rounded bg-rose-900/60 hover:bg-rose-900 text-white text-xs cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* VIEW 1: EXECUTION STUDIO */}
        {activeView === 'STEPPER' && (
          <div>
            {/* Performance Metrics Ribbon */}
            <PerformanceMetricsRibbon
              metrics={simulationData?.metrics}
              latencies={simulationData?.latencies}
              isLoading={isLoading}
            />

            {/* Split Observatory Deck: 60% Execution Core | 40% Silicon Memory Die */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left Column: Live Execution Core (7 cols / ~60%) */}
              <div className="lg:col-span-7 flex flex-col">
                {/* Hero Access State */}
                <HeroMemoryAccess
                  currentStep={currentStep}
                  algorithm={config.algorithm}
                  totalSteps={traceList.length}
                />

                {/* Precision Timeline Transport Controls */}
                <PlaybackControls
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

                {/* Algorithmic Reasoning Terminal */}
                <DecisionNarrative
                  currentStep={currentStep}
                  algorithm={config.algorithm}
                />
              </div>

              {/* Right Column: Physical RAM Matrix (5 cols / ~40%) */}
              <div className="lg:col-span-5 flex flex-col">
                {/* Silicon RAM Frames with Seamless Header Instruction Tape */}
                <PhysicalMemoryMap
                  memoryManager={displayedMemoryManager}
                  currentStepData={currentStep}
                  algorithm={config.algorithm}
                  referenceString={referenceString}
                  currentIndex={currentStepIndex}
                  executionTrace={traceList}
                  customReference={Boolean(config.custom_reference_string)}
                />
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: 4-WAY DIVERGENCE OBSERVATORY */}
        {activeView === 'COMPARE' && (
          <AlgorithmComparisonView
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
        )}

        {/* VIEW 3: 4×4 BENCHMARK SUITE */}
        {activeView === 'BENCHMARK' && (
          <BenchmarkAnalysisView apiBaseUrl="" />
        )}

        {/* VIEW 4: FORMULA SANDBOX */}
        {activeView === 'SANDBOX' && (
          <FormulaSandbox />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-black py-3 px-6 text-[11px] text-zinc-500 font-mono mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            HybridMemoryLab · Discrete-Event OS Memory Simulator
          </span>
          <span className="text-zinc-600">
            Hardware: RAM 100ns · Read 10ms · Dirty Flush δ 10ms
          </span>
        </div>
      </footer>

      {/* Floating Scenario Composer Modal */}
      <ScenarioComposer
        config={config}
        onChange={setConfig}
        onRunSimulation={() => {
          runSimulation(config);
          if (activeView === 'COMPARE') runCompare(config);
        }}
        isLoading={isLoading || isCompareLoading}
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {/* Keyboard Shortcuts Dialog Modal */}
      <KeyboardShortcutsModal
        isOpen={showShortcuts}
        onClose={() => setShowShortcuts(false)}
      />
    </div>
  );
}
