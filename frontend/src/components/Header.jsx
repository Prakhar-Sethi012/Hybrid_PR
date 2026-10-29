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

/**
 * Header — Minimalist, border-free top observatory navigation bar.
 * Designed according to Vercel/Linear minimalism with clean typography and subtle background fills.
 */
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
    { id: 'STEPPER', label: 'Execution Studio', icon: Layers },
    { id: 'COMPARE', label: 'Divergence Matrix', icon: GitCompare },
    { id: 'BENCHMARK', label: 'Benchmark Analytics', icon: BarChart3 },
    { id: 'SANDBOX', label: 'Formula Sandbox', icon: Cpu },
  ];

  const presets = [
    { label: 'Zipf 80/20', algo: 'AdaptiveHybrid', workload: 'Zipf (Hot/Cold)', frames: 10, refs: 500, writeProb: 0.2 },
    { label: 'Loop Thrash', algo: 'AdaptiveHybrid', workload: 'Loop', frames: 10, refs: 500, writeProb: 0.2 },
    { label: 'Linear Scan', algo: 'LRU', workload: 'Sequential', frames: 10, refs: 500, writeProb: 0.2 },
    { label: 'Write-Heavy', algo: 'AdaptiveHybrid', workload: 'Zipf (Hot/Cold)', frames: 10, refs: 500, writeProb: 0.5 },
  ];

  return (
    <header className="bg-black/90 backdrop-blur border-b border-zinc-900 sticky top-0 z-40 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Nav Strip */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-2.5 gap-3">
          {/* Brand & Identity */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center text-zinc-100 flex-shrink-0">
              <Cpu className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-zinc-100 tracking-tight font-sans">
                  HybridMemoryLab
                </h1>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 font-medium">
                  v3.2
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 font-sans">
                Discrete-Event OS Memory Simulator
              </p>
            </div>
          </div>

          {/* Center Tabs: Minimalist Segmented Switcher */}
          <nav className="flex items-center p-1 bg-[#111111] rounded-lg" aria-label="Observatory Navigation">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeView === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onViewChange(tab.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-zinc-800 text-zinc-100 font-semibold shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-300'
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
          <div className="flex items-center gap-2">
            {/* Live API Heartbeat Beacon */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono ${
                isApiHealthy
                  ? 'bg-[#111111] text-zinc-400'
                  : 'bg-rose-950/40 text-rose-300'
              }`}
              title="FastAPI server connection"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isApiHealthy ? 'bg-emerald-400' : 'bg-rose-500'
                }`}
                aria-hidden="true"
              />
              <span>:8000</span>
            </div>

            {/* Run Simulation Action */}
            <button
              type="button"
              onClick={onRunSimulation}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-md bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-40 transition-colors"
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
              className="px-2.5 py-1.5 rounded-md bg-[#161616] hover:bg-[#202020] text-zinc-400 hover:text-zinc-200 text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
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
              className="p-1.5 rounded-md bg-[#161616] hover:bg-[#202020] text-zinc-400 hover:text-zinc-200 text-xs cursor-pointer transition-colors"
              title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              aria-label="Toggle visual theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-zinc-300" />
              ) : (
                <Moon className="w-4 h-4 text-zinc-900" />
              )}
            </button>

            {/* Keyboard Shortcuts Trigger */}
            {onToggleShortcuts && (
              <button
                type="button"
                onClick={onToggleShortcuts}
                className="p-1.5 rounded-md bg-[#161616] hover:bg-[#202020] text-zinc-400 hover:text-zinc-200 text-xs cursor-pointer transition-colors"
                title="Keyboard Shortcuts"
                aria-label="Keyboard Shortcuts"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Presets Sub-Strip */}
        <div className="py-2 border-t border-zinc-900 flex items-center justify-between text-xs overflow-x-auto gap-2">
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-zinc-500" aria-hidden="true" />
            <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider font-mono">
              Presets:
            </span>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto py-0.5">
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
                  className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-zinc-800 text-zinc-100 font-semibold'
                      : 'bg-[#141414] hover:bg-[#1A1A1A] text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          <div className="hidden lg:flex items-center gap-2 text-[11px] font-mono text-zinc-500 flex-shrink-0">
            <span>RAM: <strong className="text-zinc-300">{config?.frame_count ?? 10}</strong></span>
            <span>·</span>
            <span>Trace: <strong className="text-zinc-300">{config?.references ?? 500}</strong></span>
            <span>·</span>
            <span>Writes: <strong className="text-zinc-300">{((config?.write_probability ?? 0.2) * 100).toFixed(0)}%</strong></span>
          </div>
        </div>
      </div>
    </header>
  );
}
