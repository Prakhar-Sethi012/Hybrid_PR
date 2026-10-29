import React, { useEffect, useRef } from 'react';

/**
 * InstructionTape — horizontal scrolling ticker showing the reference string.
 * Past references: dimmed
 * Current target: bold, highlighted
 * Upcoming: normal opacity
 */
export default function InstructionTape({ referenceString = [], currentIndex = 0, executionTrace = [] }) {
  const tapeRef = useRef(null);
  const activeRef = useRef(null);

  // Build write-map from execution trace for coloring
  const writeMap = {};
  executionTrace.forEach((step, idx) => {
    if (step.is_write) writeMap[idx] = true;
  });

  // Auto-scroll active item into view
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
      <div className="h-10 flex items-center justify-center text-xs text-[var(--text-tertiary)] font-mono border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-surface)]">
        No reference string loaded
      </div>
    );
  }

  // Show a window of ±30 items for performance
  const windowPad = 30;
  const start = Math.max(0, currentIndex - windowPad);
  const end = Math.min(referenceString.length - 1, currentIndex + windowPad);

  return (
    <div
      ref={tapeRef}
      className="instruction-tape flex items-center gap-1.5 py-2 px-3 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl overflow-x-auto"
      aria-label="Memory reference string instruction tape"
    >
      {/* Left fade indicator */}
      {start > 0 && (
        <span className="text-[10px] font-mono text-[var(--text-tertiary)] flex-shrink-0 select-none">
          ···{start}
        </span>
      )}

      {referenceString.slice(start, end + 1).map((page, relIdx) => {
        const absIdx = start + relIdx;
        const isCurrent = absIdx === currentIndex;
        const isPast = absIdx < currentIndex;
        const isWrite = writeMap[absIdx];

        let itemClass =
          'flex-shrink-0 flex flex-col items-center justify-center rounded-md px-2 py-1 text-[11px] font-mono transition-all duration-100 border ';

        if (isCurrent) {
          itemClass += isWrite
            ? 'bg-[#211100] border-amber-500 text-amber-200 font-black scale-110 shadow-lg ring-1 ring-amber-400 animate-tape-slide'
            : 'bg-[var(--bg-elevated)] border-[var(--text-primary)] text-[var(--text-primary)] font-black scale-110 shadow-lg ring-1 ring-[var(--text-primary)] animate-tape-slide';
        } else if (isPast) {
          itemClass += 'bg-transparent border-transparent text-[var(--text-tertiary)] opacity-40';
        } else {
          itemClass += isWrite
            ? 'bg-[#120B02] border-[var(--border-subtle)] text-amber-400/70'
            : 'bg-transparent border-[var(--border-subtle)] text-[var(--text-secondary)]';
        }

        return (
          <div
            key={absIdx}
            ref={isCurrent ? activeRef : null}
            className={itemClass}
            title={`Index ${absIdx}: Page ${page}${isWrite ? ' (WRITE)' : ' (READ)'}`}
          >
            <span className="leading-none">P{String(page).padStart(2, '0')}</span>
            {isCurrent && (
              <span className="text-[8px] leading-none mt-0.5 uppercase tracking-wider opacity-80">
                {isWrite ? 'WR' : 'RD'}
              </span>
            )}
          </div>
        );
      })}

      {/* Right fade indicator */}
      {end < referenceString.length - 1 && (
        <span className="text-[10px] font-mono text-[var(--text-tertiary)] flex-shrink-0 select-none">
          ···{referenceString.length - end - 1}
        </span>
      )}
    </div>
  );
}
