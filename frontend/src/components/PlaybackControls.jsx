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

  // Jump to next fault
  const handleNextFault = () => {
    if (!trace || trace.length === 0) return;
    for (let i = currentStep + 1; i < trace.length; i++) {
      if (trace[i].action === 'FAULT') {
        onStepChange(i);
        return;
      }
    }
  };

  // Jump to next eviction
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
      className="bg-[#0A0A0A] border border-[#222222] rounded-xl p-4 mb-4"
      aria-label="Simulation trace transport controls"
    >
      {/* Top Status & Fast Jump Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-[#222222] text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white text-xs uppercase tracking-wider font-mono">
            Trace Transport
          </span>
          <span className="text-zinc-600">&bull;</span>
          <span className="font-mono text-zinc-300">
            Step <strong className="text-white font-bold">{totalSteps > 0 ? currentStep + 1 : 0}</strong> of{' '}
            <strong className="text-white">{totalSteps}</strong>
          </span>
          <span className="font-mono text-zinc-500">
            ({progressPercent}%)
          </span>
        </div>

        {/* Jump Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleNextFault}
            disabled={totalSteps <= 1}
            className="px-2.5 py-1 rounded-md border border-rose-800 bg-[#180404] hover:bg-[#250808] text-rose-300 text-xs font-mono font-medium transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
            title="Jump forward to the next page fault"
          >
            <AlertOctagon className="w-3.5 h-3.5 text-rose-400" aria-hidden="true" />
            <span>Next Fault</span>
          </button>

          <button
            type="button"
            onClick={handleNextEviction}
            disabled={totalSteps <= 1}
            className="px-2.5 py-1 rounded-md border border-amber-800 bg-[#180F02] hover:bg-[#251804] text-amber-300 text-xs font-mono font-medium transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-40"
            title="Jump forward to the next page eviction"
          >
            <ArrowRight className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
            <span>Next Eviction</span>
          </button>
        </div>
      </div>

      {/* Accessible Range Scrubber */}
      <div className="mb-4 relative">
        <input
          type="range"
          min="0"
          max={Math.max(0, totalSteps - 1)}
          value={currentStep}
          onChange={(e) => onStepChange(Number(e.target.value))}
          disabled={totalSteps <= 1}
          className="w-full cursor-pointer relative z-10"
          aria-label="Simulation trace position scrubber"
        />
      </div>

      {/* Main Transport Control Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Playback Buttons Group */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onStepChange(0)}
            disabled={currentStep === 0 || totalSteps <= 1}
            className="btn-secondary p-2 rounded-lg disabled:opacity-30 cursor-pointer"
            title="Jump to Start (Home)"
            aria-label="Jump to start"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onStepChange(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0 || totalSteps <= 1}
            className="btn-secondary p-2 rounded-lg disabled:opacity-30 cursor-pointer"
            title="Step Backward (Left Arrow)"
            aria-label="Step backward"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Main Play / Pause Button: Solid AMOLED White, No Gradient */}
          <button
            type="button"
            onClick={onPlayPause}
            disabled={totalSteps <= 1}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-40 ${
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-400 text-black border border-amber-500'
                : 'btn-primary'
            }`}
            title="Toggle Simulation Playback (Space)"
            aria-label={isPlaying ? 'Pause trace' : 'Play trace'}
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-current" aria-hidden="true" />
                <span>PAUSE</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" aria-hidden="true" />
                <span>PLAY</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => onStepChange(Math.min(totalSteps - 1, currentStep + 1))}
            disabled={currentStep >= totalSteps - 1 || totalSteps <= 1}
            className="btn-secondary p-2 rounded-lg disabled:opacity-30 cursor-pointer"
            title="Step Forward (Right Arrow)"
            aria-label="Step forward"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onStepChange(Math.max(0, totalSteps - 1))}
            disabled={currentStep >= totalSteps - 1 || totalSteps <= 1}
            className="btn-secondary p-2 rounded-lg disabled:opacity-30 cursor-pointer"
            title="Jump to End (End)"
            aria-label="Jump to end"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Playback Speed Switcher */}
        <div className="flex items-center gap-1.5 bg-[#000000] p-1 rounded-lg border border-[#222222] text-xs font-mono">
          <Gauge className="w-3.5 h-3.5 text-zinc-500 ml-1 mr-0.5" aria-hidden="true" />
          <span className="text-[11px] text-zinc-400 mr-1">Speed:</span>
          {speeds.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => onSpeedChange(s.ms)}
              className={`px-2 py-0.5 rounded text-xs font-bold transition-all cursor-pointer ${
                playbackSpeed === s.ms
                  ? 'bg-white text-black'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Keyboard Hints Pill */}
        <div className="hidden md:flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 bg-[#000000] px-2.5 py-1 rounded-lg border border-[#222222]">
          <kbd className="px-1.5 py-0.5 rounded bg-[#141414] text-white border border-[#2E2E2E]">Space</kbd>
          <span>Play/Pause</span>
          <span className="text-zinc-600">&bull;</span>
          <kbd className="px-1.5 py-0.5 rounded bg-[#141414] text-white border border-[#2E2E2E]">&larr;</kbd>
          <kbd className="px-1.5 py-0.5 rounded bg-[#141414] text-white border border-[#2E2E2E]">&rarr;</kbd>
          <span>Step</span>
        </div>
      </div>
    </div>
  );
}
