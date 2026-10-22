import React from 'react';
import { X, Keyboard } from 'lucide-react';

export default function KeyboardShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Space', desc: 'Toggle Play / Pause simulation playback' },
    { key: '← / Left Arrow', desc: 'Step backward by 1 tick' },
    { key: '→ / Right Arrow', desc: 'Step forward by 1 tick' },
    { key: 'Home', desc: 'Jump directly to the start of trace (Tick 0)' },
    { key: 'End', desc: 'Jump directly to the final tick of trace' },
    { key: 'Esc', desc: 'Close dialogs and inspectors' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
    >
      <div className="bg-[#0A0A0A] border border-[#222222] rounded-xl shadow-2xl w-full max-w-md p-5 text-white animate-in fade-in zoom-in-95 duration-120">
        <div className="flex items-center justify-between pb-3 border-b border-[#222222] mb-4">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-zinc-400" aria-hidden="true" />
            <h3 id="shortcuts-title" className="text-sm font-bold font-sans text-white">
              Observatory Keyboard Shortcuts
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-[#141414] transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2.5 font-sans text-xs">
          {shortcuts.map((s, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#000000] border border-[#222222]"
            >
              <span className="text-zinc-300">{s.desc}</span>
              <kbd className="px-2 py-0.5 rounded bg-[#141414] border border-[#2E2E2E] font-mono font-semibold text-white text-[11px] shadow-sm">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="mt-5 pt-3 border-t border-[#222222] text-right">
          <button
            type="button"
            onClick={onClose}
            className="btn-primary px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
