import React from 'react';
import { Database, HardDrive, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';

export default function PerformanceMetricsRibbon({ metrics, latencies, isLoading }) {
  if (isLoading || !metrics) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-24 bg-[#0A0A0A] border border-[#222222] rounded-xl animate-pulse p-3.5"
          />
        ))}
      </div>
    );
  }

  const hitPercent = (metrics.hit_ratio * 100).toFixed(1);
  const faultPercent = (metrics.fault_ratio * 100).toFixed(1);
  const eatMs =
    metrics.eat !== undefined && metrics.eat !== null
      ? (metrics.eat / 1_000_000).toFixed(3)
      : '0.000';
  const diskReadMs = ((latencies?.disk_read_ns || 10000000) / 1e6).toFixed(0);

  const cards = [
    {
      title: 'Hit Ratio',
      value: `${hitPercent}%`,
      subtext: `${metrics.page_hits?.toLocaleString()} / ${metrics.total_accesses?.toLocaleString()} hits`,
      icon: CheckCircle2,
      badge: `${faultPercent}% Miss`,
      badgeStyle: 'bg-[#02180A] text-emerald-300 border-emerald-800',
      valueColor: 'text-emerald-400',
      progress: metrics.hit_ratio,
      progressColor: 'bg-emerald-500',
    },
    {
      title: 'Page Faults',
      value: metrics.page_faults?.toLocaleString(),
      subtext: `${diskReadMs}ms Disk Read per fault`,
      icon: Database,
      badge: 'Disk I/O',
      badgeStyle: 'bg-[#180404] text-rose-300 border-rose-800',
      valueColor: 'text-rose-400',
      progress: metrics.fault_ratio,
      progressColor: 'bg-rose-500',
    },
    {
      title: 'Dirty Write-Backs',
      value: metrics.dirty_write_backs?.toLocaleString(),
      subtext: 'Flushed to disk on eviction',
      icon: HardDrive,
      badge: '+δ Incurred',
      badgeStyle: metrics.dirty_write_backs > 0
        ? 'bg-[#180F02] text-amber-300 border-amber-700 font-bold'
        : 'bg-[#141414] text-zinc-500 border-[#242424]',
      valueColor: metrics.dirty_write_backs > 0 ? 'text-amber-400' : 'text-white',
      progress: metrics.total_accesses > 0 ? metrics.dirty_write_backs / metrics.total_accesses : 0,
      progressColor: 'bg-amber-500',
    },
    {
      title: 'Thrashing Suspends',
      value: metrics.thrashing_suspensions?.toLocaleString(),
      subtext: metrics.thrashing_suspensions > 0 ? 'Processes cooled down' : 'Zero thrashing',
      icon: AlertTriangle,
      badge: metrics.thrashing_suspensions > 0 ? 'Thrashed' : 'Stable',
      badgeStyle: metrics.thrashing_suspensions > 0
        ? 'bg-[#180404] text-rose-300 border-rose-800 font-bold'
        : 'bg-[#141414] text-zinc-500 border-[#242424]',
      valueColor: metrics.thrashing_suspensions > 0 ? 'text-rose-400' : 'text-white',
      progress: null,
    },
    {
      title: 'Hardware EAT',
      value: `${eatMs} ms`,
      subtext: `${Number(metrics.eat).toLocaleString(undefined, { maximumFractionDigits: 0 })} ns`,
      icon: Clock,
      badge: 'Eff. Time',
      badgeStyle: 'bg-[#141414] text-zinc-300 border-[#282828]',
      valueColor: 'text-white',
      progress: null,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
      {cards.map((c, idx) => {
        const Icon = c.icon;
        return (
          <div
            key={idx}
            className="bg-[#0A0A0A] border border-[#222222] rounded-xl p-3.5 flex flex-col justify-between transition-all duration-120 hover:border-[#383838]"
          >
            <div>
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider font-mono">
                  {c.title}
                </span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${c.badgeStyle}`}>
                  {c.badge}
                </span>
              </div>

              <div className="flex items-baseline justify-between mt-1">
                <span className={`text-2xl font-black font-mono tracking-tight ${c.valueColor}`}>
                  {c.value}
                </span>
                <Icon className="w-4 h-4 text-zinc-600 opacity-60" aria-hidden="true" />
              </div>

              <div className="text-[11px] text-zinc-400 font-mono mt-0.5 truncate">
                {c.subtext}
              </div>
            </div>

            {c.progress !== null && (
              <div className="w-full bg-[#181818] h-1.5 rounded-full overflow-hidden mt-3">
                <div
                  className={`h-full ${c.progressColor} rounded-full transition-all duration-300`}
                  style={{ width: `${Math.min(100, Math.max(0, c.progress * 100))}%` }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
