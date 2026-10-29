import React from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  AlertOctagon,
  ArrowRight,
  Gauge,
} from 'lucide-react';

/**
 * PlaybackControls — Minimalist, borderless timeline transport control.
 * Adheres strictly to Vercel/Linear minimalism: 95% monochrome, flat fills, zero chunky borders.
 */
export default function PlaybackControls({
  currentStep,
  totalSteps,
  isPlaying,
  playbackSpeed,
  onPlayPause,
  onStepChange,
  onSpeedChange,
  trace = [],
}) {
  const speeds = [
    { label: '0.5x', ms: 400 },
    { label: '1x', ms: 200 },
    { label: '2x', ms: 100 },
    { label: '5x', ms: 40 },
  ];

  // Jump forward to the next page fault
  const handleNextFault = () => {
    if (!trace || trace.length === 0) return;
    for (let i = currentStep + 1; i < trace.length; i++) {
      if (trace[i].action === 'FAULT') {
        onStepChange(i);
        return;
      }
    }
  };

  // Jump forward to the next page eviction
  const handleNextEviction = () => {
    if (!trace || trace.length === 0) return;
    for (let i = currentStep + 1; i < trace.length; i++) {
      if (trace[i].evicted_page !== null && trace[i].evicted_page !== undefined) {
        onStepChange(i);
        return;
      }
    }
  };

  const progressPercent = totalSteps > 1 ? ((currentStep / (totalSteps - 1)) * 100).toFixed(1) : 0;

  return (
    <div
      className="bg-[#111111] rounded-lg p-4 mb-3"
      aria-label="Simulation trace transport controls"
    >
      {/* Top Meta & Fast Jump Strip — unboxed, typography driven */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-zinc-300 font-sans tracking-tight">
            Trace Transport
          </span>
          <span className="text-zinc-600">·</span>
          <span className="font-mono text-zinc-400">
            Step <strong className="text-zinc-100">{totalSteps > 0 ? currentStep + 1 : 0}</strong> / {totalSteps}
          </span>
          <span className="font-mono text-zinc-600">
            ({progressPercent}%)
          </span>
        </div>

        {/* Minimalist Jump Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleNextFault}
            disabled={totalSteps <= 1}
            className="px-2.5 py-1 rounded bg-[#181818] hover:bg-[#202020] text-zinc-300 hover:text-white text-xs font-mono transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-30"
            title="Jump forward to next page fault"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            <span>Next Fault</span>
          </button>

          <button
            type="button"
            onClick={handleNextEviction}
            disabled={totalSteps <= 1}
            className="px-2.5 py-1 rounded bg-[#181818] hover:bg-[#202020] text-zinc-300 hover:text-white text-xs font-mono transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-30"
            title="Jump forward to next page eviction"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>Next Eviction</span>
          </button>
        </div>
      </div>

      {/* Minimalist Scrubber Track */}
      <div className="mb-3">
        <input
          type="range"
          min="0"
          max={Math.max(0, totalSteps - 1)}
          value={currentStep}
          onChange={(e) => onStepChange(Number(e.target.value))}
          disabled={totalSteps <= 1}
          className="w-full cursor-pointer h-1.5 bg-zinc-800 rounded-lg appearance-none accent-zinc-200"
          aria-label="Simulation trace position scrubber"
        />
      </div>

      {/* Transport Controls Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Playback Button Group */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onStepChange(0)}
            disabled={currentStep === 0 || totalSteps <= 1}
            className="p-1.5 rounded bg-[#181818] hover:bg-[#222222] text-zinc-400 hover:text-zinc-100 disabled:opacity-20 transition-colors cursor-pointer"
            title="Jump to Start"
            aria-label="Jump to start"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onStepChange(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0 || totalSteps <= 1}
            className="p-1.5 rounded bg-[#181818] hover:bg-[#222222] text-zinc-400 hover:text-zinc-100 disabled:opacity-20 transition-colors cursor-pointer"
            title="Step Backward"
            aria-label="Step backward"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Primary Play/Pause Button — Monochrome, clean */}
          <button
            type="button"
            onClick={onPlayPause}
            disabled={totalSteps <= 1}
            className={`px-3.5 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-30 ${
              isPlaying
                ? 'bg-zinc-200 text-zinc-950 hover:bg-white'
                : 'bg-zinc-100 text-zinc-950 hover:bg-white'
            }`}
            title="Toggle Simulation Playback"
            aria-label={isPlaying ? 'Pause trace' : 'Play trace'}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                <span>Play</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => onStepChange(Math.min(totalSteps - 1, currentStep + 1))}
            disabled={currentStep >= totalSteps - 1 || totalSteps <= 1}
            className="p-1.5 rounded bg-[#181818] hover:bg-[#222222] text-zinc-400 hover:text-zinc-100 disabled:opacity-20 transition-colors cursor-pointer"
            title="Step Forward"
            aria-label="Step forward"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onStepChange(Math.max(0, totalSteps - 1))}
            disabled={currentStep >= totalSteps - 1 || totalSteps <= 1}
            className="p-1.5 rounded bg-[#181818] hover:bg-[#222222] text-zinc-400 hover:text-zinc-100 disabled:opacity-20 transition-colors cursor-pointer"
            title="Jump to End"
            aria-label="Jump to end"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Minimal Speed Switcher */}
        <div className="flex items-center gap-1 bg-[#181818] p-1 rounded text-xs font-mono">
          <Gauge className="w-3.5 h-3.5 text-zinc-500 ml-1 mr-0.5" aria-hidden="true" />
          <span className="text-[11px] text-zinc-500 mr-1">Speed</span>
          {speeds.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => onSpeedChange(s.ms)}
              className={`px-2 py-0.5 rounded text-xs transition-colors cursor-pointer ${
                playbackSpeed === s.ms
                  ? 'bg-zinc-700 text-zinc-100 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Minimal Keyboard Hint */}
        <div className="hidden lg:flex items-center gap-1.5 text-[11px] font-mono text-zinc-500">
          <kbd className="px-1.5 py-0.5 rounded bg-[#181818] text-zinc-300">Space</kbd>
          <span>play/pause</span>
          <span className="text-zinc-700">·</span>
          <kbd className="px-1.5 py-0.5 rounded bg-[#181818] text-zinc-300">←</kbd>
          <kbd className="px-1.5 py-0.5 rounded bg-[#181818] text-zinc-300">→</kbd>
          <span>step</span>
        </div>
      </div>
    </div>
  );
}
