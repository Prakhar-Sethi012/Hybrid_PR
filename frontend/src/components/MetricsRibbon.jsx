import React from 'react';
import { Activity, Database, HardDrive, AlertTriangle, Cpu, Clock, CheckCircle2 } from 'lucide-react';

export default function MetricsRibbon({ metrics, latencies, isLoading }) {
  if (!metrics) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-900/60 border border-gray-800/80 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const hitPercent = (metrics.hit_ratio * 100).toFixed(2);
  const faultPercent = (metrics.fault_ratio * 100).toFixed(2);
  const eatMs = (metrics.eat / 1_000_000).toFixed(3);

  const cards = [
    {
      title: "Hit Ratio",
      value: `${hitPercent}%`,
      subtext: `${metrics.page_hits?.toLocaleString()} / ${metrics.total_accesses?.toLocaleString()} hits`,
      icon: CheckCircle2,
      color: metrics.hit_ratio >= 0.7 ? "text-emerald-400" : metrics.hit_ratio >= 0.3 ? "text-cyan-400" : "text-amber-400",
      bgGlow: "group-hover:border-emerald-500/40",
      accent: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      badge: `${faultPercent}% Miss`,
    },
    {
      title: "Page Faults",
      value: metrics.page_faults?.toLocaleString(),
      subtext: `Triggers Disk Read (${((latencies?.disk_read_ns || 10000000) / 1e6).toFixed(0)}ms)`,
      icon: Database,
      color: metrics.page_faults === 0 ? "text-emerald-400" : "text-cyan-400",
      bgGlow: "group-hover:border-cyan-500/40",
      accent: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
      badge: "I/O Demand",
    },
    {
      title: "Dirty Writes",
      value: metrics.dirty_write_backs?.toLocaleString(),
      subtext: `Evictions needing Disk Sync`,
      icon: HardDrive,
      color: metrics.dirty_write_backs > 50 ? "text-amber-400" : "text-amber-300",
      bgGlow: "group-hover:border-amber-500/40",
      accent: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      badge: "δ Penalty Incurred",
    },
    {
      title: "Thrashing Suspensions",
      value: metrics.thrashing_suspensions?.toLocaleString(),
      subtext: metrics.thrashing_suspensions > 0 ? "Process throttled for cooling" : "Stable memory pressure",
      icon: AlertTriangle,
      color: metrics.thrashing_suspensions > 0 ? "text-rose-400" : "text-emerald-400",
      bgGlow: metrics.thrashing_suspensions > 0 ? "group-hover:border-rose-500/40" : "group-hover:border-emerald-500/40",
      accent: metrics.thrashing_suspensions > 0 ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      badge: metrics.thrashing_suspensions > 0 ? "Thrashed" : "Optimal",
    },
    {
      title: "Effective Access Time",
      value: `${eatMs} ms`,
      subtext: `${Number(metrics.eat).toLocaleString(undefined, { maximumFractionDigits: 1 })} ns`,
      icon: Clock,
      color: "text-purple-400",
      bgGlow: "group-hover:border-purple-500/40",
      accent: "bg-purple-500/10 text-purple-400 border-purple-500/20",
      badge: "Hardware EAT",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 mb-6">
      {cards.map((c, idx) => {
        const Icon = c.icon;
        return (
          <div
            key={idx}
            className={`group relative bg-gradient-to-b from-gray-900/90 to-gray-950/90 border border-gray-800/80 rounded-xl p-3.5 shadow-lg shadow-black/40 transition-all duration-300 ${c.bgGlow}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                {c.title}
              </span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${c.accent}`}>
                {c.badge}
              </span>
            </div>

            <div className="flex items-baseline justify-between mt-1">
              <div className={`text-2xl font-bold font-mono tracking-tight ${c.color}`}>
                {c.value}
              </div>
              <div className="p-1.5 rounded-lg bg-gray-800/50 text-gray-400 group-hover:text-white transition-colors">
                <Icon className="w-4 h-4" />
              </div>
            </div>

            <div className="mt-2 text-[11px] text-gray-400 truncate font-mono">
              {c.subtext}
            </div>

            {/* Micro glow bar at bottom */}
            <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        );
      })}
    </div>
  );
}
