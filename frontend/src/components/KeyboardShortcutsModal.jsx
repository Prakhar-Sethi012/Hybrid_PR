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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
    >
      <div className="bg-[#111111] rounded-xl shadow-2xl w-full max-w-md p-5 text-white animate-modal-enter">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-900 mb-3">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-zinc-400" aria-hidden="true" />
            <h3 id="shortcuts-title" className="text-sm font-bold font-sans text-zinc-100">
              Keyboard Shortcuts
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1.5 font-sans text-xs">
          {shortcuts.map((s, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between py-2 px-3 rounded-md bg-[#161616]"
            >
              <span className="text-zinc-300">{s.desc}</span>
              <kbd className="px-2 py-0.5 rounded bg-[#202020] font-mono text-zinc-100 text-[11px]">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-3 border-t border-zinc-900 text-right">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
