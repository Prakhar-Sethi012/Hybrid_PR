import React from 'react';
import {
  Cpu,
  GitCompare,
  BarChart3,
  Layers,
  HelpCircle,
  Sliders,
  Play,
  RefreshCw,
  Sun,
  Moon,
  Sparkles,
} from 'lucide-react';

export default function Header({
  activeView,
  onViewChange,
  isApiHealthy = true,
  onToggleShortcuts,
  onOpenSettings,
  onRunSimulation,
  isLoading,
  theme = 'dark',
  onToggleTheme,
  config,
  onApplyPreset,
}) {
  const navTabs = [
    { id: 'STEPPER', label: 'Execution Lab', icon: Layers },
    { id: 'COMPARE', label: '4-Way Divergence', icon: GitCompare },
    { id: 'BENCHMARK', label: 'Benchmark Suite', icon: BarChart3 },
    { id: 'SANDBOX', label: 'Formula Sandbox', icon: Cpu },
  ];

  const presets = [
    { label: 'Zipf 80/20', algo: 'AdaptiveHybrid', workload: 'Zipf (Hot/Cold)', frames: 10, refs: 500, writeProb: 0.2 },
    { label: 'Loop Thrash', algo: 'AdaptiveHybrid', workload: 'Loop', frames: 10, refs: 500, writeProb: 0.2 },
    { label: 'Linear Scan', algo: 'LRU', workload: 'Sequential', frames: 10, refs: 500, writeProb: 0.2 },
    { label: 'Write-Heavy', algo: 'AdaptiveHybrid', workload: 'Zipf (Hot/Cold)', frames: 10, refs: 500, writeProb: 0.5 },
  ];

  return (
    <header className="border-b border-[var(--border-default)] bg-[var(--bg-base)] sticky top-0 z-40 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Nav Strip */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-2.5 gap-3">
          {/* Brand & Lab Identity */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#141414] border border-[#27272A] flex items-center justify-center text-white flex-shrink-0">
              <Cpu className="w-4 h-4 text-white" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-white tracking-tight font-sans">
                  HybridMemoryLab
                </h1>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#181818] text-zinc-300 border border-[#27272A] font-semibold">
                  v3.2 AMOLED
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-sans">
                Adaptive Hybrid Page Replacement Simulator
              </p>
            </div>
          </div>

          {/* Center Tabs: Solid Segmented Switcher */}
          <nav className="flex items-center p-1 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border-default)]" aria-label="Observatory Navigation">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeView === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onViewChange(tab.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-white text-black font-bold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action Cluster */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Live API Heartbeat Beacon */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono border ${
                isApiHealthy
                  ? 'bg-[#0D0D0D] text-zinc-300 border-[#222222]'
                  : 'bg-[#180505] text-rose-300 border-rose-900'
              }`}
              title="FastAPI connection status"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isApiHealthy ? 'bg-emerald-400' : 'bg-rose-500'
                }`}
                aria-hidden="true"
              />
              <span>API :8000</span>
            </div>

            {/* Run Simulation Action */}
            <button
              type="button"
              onClick={onRunSimulation}
              disabled={isLoading}
              className="btn-primary px-3.5 py-1.5 rounded-md text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              title="Execute Simulation Trace"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Simulating...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Run</span>
                </>
              )}
            </button>

            {/* Quick Config Modal Trigger */}
            <button
              type="button"
              onClick={onOpenSettings}
              className="btn-secondary px-2.5 py-1.5 rounded-md text-xs flex items-center gap-1.5 cursor-pointer"
              title="Configure Workload Parameters"
              aria-label="Open workload settings"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Config</span>
            </button>

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={onToggleTheme}
              className="btn-secondary p-1.5 rounded-md text-xs cursor-pointer"
              title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to AMOLED Dark Theme'}
              aria-label="Toggle visual theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-white" />
              )}
            </button>

            {/* Keyboard Shortcuts Trigger */}
            {onToggleShortcuts && (
              <button
                type="button"
                onClick={onToggleShortcuts}
                className="btn-secondary p-1.5 rounded-md text-xs cursor-pointer"
                title="Keyboard Shortcuts"
                aria-label="Keyboard Shortcuts"
              >
                <HelpCircle className="w-4 h-4 text-zinc-400" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Presets Sub-Strip */}
        <div className="py-2 border-t border-[#1C1C1E] flex items-center justify-between text-xs overflow-x-auto gap-2">
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-zinc-400" aria-hidden="true" />
            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider font-mono">
              Workload Presets:
            </span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            {presets.map((p) => {
              const isActive =
                config?.algorithm === p.algo &&
                config?.workload_type === p.workload &&
                config?.frame_count === p.frames &&
                config?.write_probability === p.writeProb;
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => onApplyPreset(p)}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all cursor-pointer whitespace-nowrap border ${
                    isActive
                      ? 'bg-white text-black border-white font-bold'
                      : 'bg-[#0D0D0D] text-zinc-400 border-[#222222] hover:text-white hover:border-[#383838]'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          <div className="hidden lg:flex items-center gap-2 text-[11px] font-mono text-zinc-400 flex-shrink-0">
            <span>RAM: <strong className="text-white">{config?.frame_count ?? 10} Frames</strong></span>
            <span>&bull;</span>
            <span>Trace: <strong className="text-white">{config?.references ?? 500}</strong></span>
            <span>&bull;</span>
            <span>Writes: <strong className="text-amber-400">{((config?.write_probability ?? 0.2) * 100).toFixed(0)}%</strong></span>
          </div>
        </div>
      </div>
    </header>
  );
}
