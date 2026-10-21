import React, { useState } from 'react';
import { Layers, Flame, Check, Info, Server, Cpu, HardDrive, RefreshCw } from 'lucide-react';

export default function RAMVisualizer({ memoryManager, algorithm, onSelectFrame }) {
  const [selectedFrameId, setSelectedFrameId] = useState(null);
  const [filter, setFilter] = useState('ALL'); // 'ALL', 'CLEAN', 'DIRTY', 'EMPTY'

  const frames = memoryManager?.frames || [];
  const totalFrames = memoryManager?.frame_count || frames.length;
  const occupiedCount = memoryManager?.occupied_count ?? frames.filter(f => f.is_occupied).length;
  const dirtyCount = frames.filter(f => f.is_occupied && f.dirty).length;
  const cleanCount = frames.filter(f => f.is_occupied && !f.dirty).length;
  const emptyCount = totalFrames - occupiedCount;
  const utilPercent = totalFrames > 0 ? ((occupiedCount / totalFrames) * 100).toFixed(0) : 0;

  const filteredFrames = frames.filter(frame => {
    if (filter === 'CLEAN') return frame.is_occupied && !frame.dirty;
    if (filter === 'DIRTY') return frame.is_occupied && frame.dirty;
    if (filter === 'EMPTY') return !frame.is_occupied;
    return true;
  });

  const selectedFrame = selectedFrameId !== null ? frames.find(f => f.frame_id === selectedFrameId) : null;

  return (
    <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-5 shadow-2xl backdrop-blur-md mb-6">
      {/* Visualizer Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-800/80 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white tracking-wide flex items-center gap-2">
              Physical Memory Frames Visualizer
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-800/60 text-cyan-300 font-mono">
                {occupiedCount}/{totalFrames} Allocated ({utilPercent}%)
              </span>
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Real-time frame allocation, dirty modification state, and eviction priority
            </p>
          </div>
        </div>

        {/* Legend & Filter Controls */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg font-mono transition-all ${
              filter === 'ALL'
                ? 'bg-gray-700 text-white font-medium shadow-sm'
                : 'bg-gray-800/50 text-gray-400 hover:text-white'
            }`}
          >
            All ({totalFrames})
          </button>
          <button
            onClick={() => setFilter('CLEAN')}
            className={`px-2.5 py-1 rounded-lg font-mono flex items-center gap-1.5 transition-all ${
              filter === 'CLEAN'
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-700 font-medium'
                : 'bg-emerald-950/30 text-emerald-400/80 border border-emerald-900/40 hover:bg-emerald-950/60'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Clean ({cleanCount})
          </button>
          <button
            onClick={() => setFilter('DIRTY')}
            className={`px-2.5 py-1 rounded-lg font-mono flex items-center gap-1.5 transition-all ${
              filter === 'DIRTY'
                ? 'bg-rose-950 text-rose-300 border border-rose-700 font-medium'
                : 'bg-rose-950/30 text-rose-400/80 border border-rose-900/40 hover:bg-rose-950/60'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            Dirty +δ ({dirtyCount})
          </button>
          <button
            onClick={() => setFilter('EMPTY')}
            className={`px-2.5 py-1 rounded-lg font-mono transition-all ${
              filter === 'EMPTY'
                ? 'bg-gray-800 text-gray-200 border border-gray-600 font-medium'
                : 'bg-gray-800/30 text-gray-500 hover:text-gray-300'
            }`}
          >
            Empty ({emptyCount})
          </button>
        </div>
      </div>

      {/* Dynamic Frames Grid */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {filteredFrames.map((frame) => {
          const isSelected = selectedFrameId === frame.frame_id;
          const isOccupied = frame.is_occupied;
          const isDirty = isOccupied && frame.dirty;
          const isClean = isOccupied && !frame.dirty;

          // Card Styles by Status
          let cardStyle = "bg-gray-900/40 border-dashed border-gray-800 text-gray-600 hover:border-gray-700";
          let badgeStyle = "bg-gray-800/60 text-gray-400 border-gray-700/60";
          let statusText = "EMPTY";
          let dotColor = "bg-gray-600";

          if (isDirty) {
            cardStyle = "bg-gradient-to-b from-rose-950/40 to-gray-900/80 border-rose-500/40 hover:border-rose-400/80 shadow-lg shadow-rose-950/20";
            badgeStyle = "bg-rose-500/10 text-rose-400 border-rose-500/30 font-medium";
            statusText = "DIRTY (δ Risk)";
            dotColor = "bg-rose-500 shadow-rose-500/50 shadow-sm";
          } else if (isClean) {
            cardStyle = "bg-gradient-to-b from-emerald-950/30 to-gray-900/80 border-emerald-500/30 hover:border-emerald-400/70 shadow-lg shadow-emerald-950/20";
            badgeStyle = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-medium";
            statusText = "CLEAN";
            dotColor = "bg-emerald-400 shadow-emerald-400/50 shadow-sm";
          }

          if (isSelected) {
            cardStyle += " ring-2 ring-cyan-400 ring-offset-2 ring-offset-gray-950";
          }

          return (
            <div
              key={frame.frame_id}
              onClick={() => setSelectedFrameId(isSelected ? null : frame.frame_id)}
              className={`relative cursor-pointer rounded-xl p-3 border transition-all duration-200 transform hover:-translate-y-0.5 ${cardStyle}`}
            >
              {/* Top Frame Header */}
              <div className="flex items-center justify-between text-xs font-mono text-gray-400 mb-2">
                <span className="font-semibold text-gray-300">
                  Frame #{frame.frame_id}
                </span>
                <span className={`w-2 h-2 rounded-full ${dotColor}`} />
              </div>

              {/* Main Page Display */}
              <div className="py-2 text-center">
                {isOccupied ? (
                  <div>
                    <div className="text-xl font-bold font-mono text-white tracking-tight">
                      Page {frame.page_number}
                    </div>
                    <div className="text-[11px] font-mono text-gray-400 mt-0.5">
                      PID: {frame.process_id ?? 1}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm font-mono text-gray-500 italic py-2">
                    [ Unallocated ]
                  </div>
                )}
              </div>

              {/* Bottom Status & Metrics */}
              <div className="mt-2 pt-2 border-t border-gray-800/60 flex items-center justify-between text-[10px] font-mono">
                <span className={`px-1.5 py-0.5 rounded border ${badgeStyle} truncate max-w-[90px]`}>
                  {statusText}
                </span>
                {isOccupied && (
                  <span className="text-gray-400 text-[10px] font-mono" title="Hybrid Score S(p)">
                    S: {frame.hybrid_score?.toFixed(2)}
                  </span>
                )}
              </div>

              {/* Selection Indicator Corner */}
              {isSelected && (
                <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-cyan-400" />
              )}
            </div>
          );
        })}
      </div>

      {/* Frame Inspector Drawer */}
      {selectedFrame && (
        <div className="mt-5 p-4 rounded-xl bg-gray-950 border border-cyan-500/30 shadow-xl transition-all">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-white font-mono">
                Frame #{selectedFrame.frame_id} Detailed State Inspector
              </h3>
            </div>
            <button
              onClick={() => setSelectedFrameId(null)}
              className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded bg-gray-800"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 text-xs font-mono">
            <div className="p-2.5 rounded-lg bg-gray-900 border border-gray-800">
              <span className="text-gray-500 block text-[10px]">Resident Page</span>
              <span className="text-white text-sm font-bold">
                {selectedFrame.is_occupied ? `Page ${selectedFrame.page_number}` : 'None'}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-gray-900 border border-gray-800">
              <span className="text-gray-500 block text-[10px]">Dirty Modification</span>
              <span className={selectedFrame.dirty ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                {selectedFrame.dirty ? 'DIRTY (Must Write to Disk)' : 'CLEAN (Free Eviction)'}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-gray-900 border border-gray-800">
              <span className="text-gray-500 block text-[10px]">Hybrid Score S(p)</span>
              <span className="text-cyan-400 font-bold">
                {selectedFrame.hybrid_score?.toFixed(4) ?? '0.0000'}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-gray-900 border border-gray-800">
              <span className="text-gray-500 block text-[10px]">Access Count (LFU)</span>
              <span className="text-purple-400 font-bold">
                {selectedFrame.access_count ?? 1} refs
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-gray-900 border border-gray-800">
              <span className="text-gray-500 block text-[10px]">Last Reference Time</span>
              <span className="text-amber-400 font-bold">
                Tick #{selectedFrame.last_referenced_time ?? 0}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-gray-900 border border-gray-800">
              <span className="text-gray-500 block text-[10px]">Load Arrival Time</span>
              <span className="text-gray-300 font-bold">
                Tick #{selectedFrame.load_time ?? 0}
              </span>
            </div>
          </div>

          <div className="mt-3 text-[11px] text-gray-400 flex items-center justify-between">
            <span>
              Eviction Cost Formula under {algorithm}:{' '}
              <code className="text-cyan-300 font-mono">
                C(p) = S(p) + {selectedFrame.dirty ? 'δ (2.0 Disk Penalty)' : '0 (Clean)'}
              </code>
            </span>
            <span className="text-gray-500">Click card again to dismiss inspector</span>
          </div>
        </div>
      )}
    </div>
  );
}
