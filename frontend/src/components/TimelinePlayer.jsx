import React from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Flame,
  AlertTriangle,
} from 'lucide-react';

export default function TimelinePlayer({
  currentStep,
  totalSteps,
  isPlaying,
  playbackSpeed,
  onPlayPause,
  onStepChange,
  onSpeedChange,
  trace = [],
}) {
  const currentStepData = trace[currentStep] || null;

  // Jump to next fault from current step
  const handleNextFault = () => {
    if (!trace || trace.length === 0) return;
    for (let i = currentStep + 1; i < trace.length; i++) {
      if (trace[i].action === 'FAULT') {
        onStepChange(i);
        return;
      }
    }
  };

  // Jump to next eviction from current step
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
    <div className="bg-[#121215] border border-zinc-800 rounded-xl p-4 mb-5 shadow-sm">
      {/* Top Header / Status Line */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-zinc-800/80 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-mono text-zinc-400">TIMELINE PLAYER</span>
          <span className="text-zinc-600">•</span>
          <span className="font-mono text-zinc-200 font-medium">
            Step {totalSteps > 0 ? currentStep + 1 : 0} of {totalSteps}
          </span>
          <span className="text-zinc-500 font-mono">({progressPercent}%)</span>
        </div>

        {/* Current Step Quick Pill */}
        {currentStepData && (
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium border ${
                currentStepData.action === 'HIT'
                  ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60'
                  : 'bg-rose-950/40 text-rose-400 border-rose-800/60'
              }`}
            >
              {currentStepData.action}
            </span>
            <span className="font-mono text-zinc-300 text-[11px]">
              Page {currentStepData.requested_page} ({currentStepData.is_write ? 'WRITE' : 'READ'})
            </span>
            {currentStepData.evicted_page !== null && currentStepData.evicted_page !== undefined && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-400 border border-zinc-700">
                Evicted P{currentStepData.evicted_page}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Scrubber Range Slider */}
      <div className="mb-4">
        <input
          type="range"
          min="0"
          max={Math.max(0, totalSteps - 1)}
          value={currentStep}
          onChange={(e) => onStepChange(Number(e.target.value))}
          disabled={totalSteps <= 1}
          className="w-full cursor-pointer"
        />
      </div>

      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Playback Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onStepChange(0)}
            disabled={currentStep === 0 || totalSteps === 0}
            title="First Step (Home)"
            className="p-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onStepChange(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0 || totalSteps === 0}
            title="Previous Step (Left Arrow)"
            className="p-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onPlayPause}
            disabled={totalSteps === 0}
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            className={`px-3 py-1.5 rounded-lg border flex items-center gap-1.5 text-xs font-medium transition-all ${
              isPlaying
                ? 'bg-zinc-100 text-zinc-900 border-zinc-200 hover:bg-zinc-200'
                : 'bg-zinc-800 text-zinc-100 border-zinc-700 hover:bg-zinc-700'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => onStepChange(Math.min(totalSteps - 1, currentStep + 1))}
            disabled={currentStep >= totalSteps - 1 || totalSteps === 0}
            title="Next Step (Right Arrow)"
            className="p-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onStepChange(totalSteps - 1)}
            disabled={currentStep >= totalSteps - 1 || totalSteps === 0}
            title="Last Step (End)"
            className="p-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Jump Buttons */}
        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={handleNextFault}
            disabled={currentStep >= totalSteps - 1}
            className="px-2 py-1 rounded-md border border-zinc-800 hover:border-zinc-700 bg-zinc-900/60 text-zinc-300 hover:text-zinc-100 text-[11px] font-mono flex items-center gap-1 transition-colors disabled:opacity-30"
          >
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            <span>Next Fault</span>
          </button>

          <button
            type="button"
            onClick={handleNextEviction}
            disabled={currentStep >= totalSteps - 1}
            className="px-2 py-1 rounded-md border border-zinc-800 hover:border-zinc-700 bg-zinc-900/60 text-zinc-300 hover:text-zinc-100 text-[11px] font-mono flex items-center gap-1 transition-colors disabled:opacity-30"
          >
            <Flame className="w-3 h-3 text-amber-400" />
            <span>Next Evict</span>
          </button>
        </div>

        {/* Playback Speed Selector */}
        <div className="flex items-center gap-1 text-xs">
          <span className="text-zinc-500 text-[11px] font-mono mr-1">Speed:</span>
          {[
            { label: '0.5x', speed: 400 },
            { label: '1x', speed: 200 },
            { label: '2x', speed: 100 },
            { label: '5x', speed: 40 },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => onSpeedChange(item.speed)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                playbackSpeed === item.speed
                  ? 'bg-zinc-200 text-zinc-900 font-medium'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
