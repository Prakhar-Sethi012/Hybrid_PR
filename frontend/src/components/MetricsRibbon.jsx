import React from 'react';
import { Database, HardDrive, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';

export default function MetricsRibbon({ metrics, latencies, isLoading }) {
  if (!metrics) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-[#121215] border border-zinc-800 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const hitPercent = (metrics.hit_ratio * 100).toFixed(2);
  const faultPercent = (metrics.fault_ratio * 100).toFixed(2);
  const eatMs = (metrics.eat / 1_000_000).toFixed(3);

  const cards = [
    {
      title: 'Hit Ratio',
      value: `${hitPercent}%`,
      subtext: `${metrics.page_hits?.toLocaleString()} / ${metrics.total_accesses?.toLocaleString()} hits`,
      icon: CheckCircle2,
      badge: `${faultPercent}% Miss`,
      badgeStyle: 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60',
    },
    {
      title: 'Page Faults',
      value: metrics.page_faults?.toLocaleString(),
      subtext: `Triggers Disk Read (${((latencies?.disk_read_ns || 10000000) / 1e6).toFixed(0)}ms)`,
      icon: Database,
      badge: 'Disk I/O',
      badgeStyle: 'bg-zinc-900 text-zinc-400 border-zinc-800',
    },
    {
      title: 'Dirty Writes',
      value: metrics.dirty_write_backs?.toLocaleString(),
      subtext: 'Evictions needing Disk Sync',
      icon: HardDrive,
      badge: '+δ Incurred',
      badgeStyle: metrics.dirty_write_backs > 0
        ? 'bg-amber-950/40 text-amber-400 border-amber-800/60'
        : 'bg-zinc-900 text-zinc-400 border-zinc-800',
    },
    {
      title: 'Thrashing Suspends',
      value: metrics.thrashing_suspensions?.toLocaleString(),
      subtext: metrics.thrashing_suspensions > 0 ? 'Processes cooled down' : 'Zero thrashing',
      icon: AlertTriangle,
      badge: metrics.thrashing_suspensions > 0 ? 'Thrashed' : 'Stable',
      badgeStyle: metrics.thrashing_suspensions > 0
        ? 'bg-rose-950/40 text-rose-400 border-rose-800/60'
        : 'bg-zinc-900 text-zinc-400 border-zinc-800',
    },
    {
      title: 'Hardware EAT',
      value: `${eatMs} ms`,
      subtext: `${Number(metrics.eat).toLocaleString(undefined, { maximumFractionDigits: 1 })} ns`,
      icon: Clock,
      badge: 'Eff. Time',
      badgeStyle: 'bg-zinc-900 text-zinc-400 border-zinc-800',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
      {cards.map((c, idx) => {
        const Icon = c.icon;
        return (
          <div
            key={idx}
            className="bg-[#121215] border border-zinc-800 rounded-xl p-3.5 transition-colors hover:border-zinc-700"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                {c.title}
              </span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${c.badgeStyle}`}>
                {c.badge}
              </span>
            </div>

            <div className="flex items-baseline justify-between mt-1">
              <div className="text-xl font-bold font-mono text-zinc-100 tracking-tight">
                {c.value}
              </div>
              <div className="p-1 rounded bg-zinc-900 text-zinc-500">
                <Icon className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="mt-2 text-[10px] text-zinc-500 truncate font-mono">
              {c.subtext}
            </div>
          </div>
        );
      })}
    </div>
  );
}
