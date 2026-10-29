import React, { useEffect, useRef } from 'react';

/**
 * InstructionTape — Minimalist, unboxed horizontal reference string ticker.
 * Blends seamlessly above the RAM frames with zero heavy borders or containers.
 * Past: dimmed | Current: bold white highlight | Upcoming: normal muted
 */
export default function InstructionTape({ referenceString = [], currentIndex = 0, executionTrace = [] }) {
  const tapeRef = useRef(null);
  const activeRef = useRef(null);

  // Build write-map from execution trace
  const writeMap = {};
  executionTrace.forEach((step, idx) => {
    if (step.is_write) writeMap[idx] = true;
  });

  // Auto-scroll active item into view smoothly
  useEffect(() => {
    if (activeRef.current && tapeRef.current) {
      activeRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [currentIndex]);

  if (!referenceString || referenceString.length === 0) {
    return (
      <div className="py-2 text-[11px] text-zinc-600 font-mono">
        No reference stream loaded
      </div>
    );
  }

  // Show a window of ±25 items for smooth scrolling
  const windowPad = 25;
  const start = Math.max(0, currentIndex - windowPad);
  const end = Math.min(referenceString.length - 1, currentIndex + windowPad);

  return (
    <div
      ref={tapeRef}
      className="instruction-tape flex items-center gap-1.5 py-1.5 overflow-x-auto no-scrollbar select-none"
      aria-label="Memory reference string instruction tape"
    >
      {/* Left indicator */}
      {start > 0 && (
        <span className="text-[10px] font-mono text-zinc-600 flex-shrink-0">
          ···
        </span>
      )}

      {referenceString.slice(start, end + 1).map((page, relIdx) => {
        const absIdx = start + relIdx;
        const isCurrent = absIdx === currentIndex;
        const isPast = absIdx < currentIndex;
        const isWrite = writeMap[absIdx];

        let itemClass = 'flex-shrink-0 px-2 py-0.5 rounded text-[11px] font-mono transition-all flex items-center gap-1 ';

        if (isCurrent) {
          itemClass += 'bg-zinc-800 text-white font-bold shadow-sm';
        } else if (isPast) {
          itemClass += 'text-zinc-600 opacity-40';
        } else {
          itemClass += 'text-zinc-400 hover:text-zinc-200';
        }

        return (
          <div
            key={absIdx}
            ref={isCurrent ? activeRef : null}
            className={itemClass}
            title={`Step ${absIdx + 1}: Page ${page}${isWrite ? ' (Write)' : ' (Read)'}`}
          >
            <span>P{String(page).padStart(2, '0')}</span>
            {isWrite && (
              <span className={`text-[9px] ${isCurrent ? 'text-amber-400' : 'text-zinc-500'}`}>
                w
              </span>
            )}
          </div>
        );
      })}

      {/* Right indicator */}
      {end < referenceString.length - 1 && (
        <span className="text-[10px] font-mono text-zinc-600 flex-shrink-0">
          ···
        </span>
      )}
    </div>
  );
}
