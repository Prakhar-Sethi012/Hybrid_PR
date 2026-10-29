import React from 'react';
import { Database, HardDrive, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';

/**
 * PerformanceMetricsRibbon — Minimalist metric cards.
 * Borderless, unboxed, 95% monochrome with tiny colored dot accents.
 */
export default function PerformanceMetricsRibbon({ metrics, latencies, isLoading }) {
  if (isLoading || !metrics) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mb-3">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-20 bg-[#111111] rounded-lg animate-pulse p-3"
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
      dotColor: 'bg-emerald-400',
      badgeText: `${faultPercent}% miss`,
      progress: metrics.hit_ratio,
      progressColor: 'bg-emerald-400/80',
    },
    {
      title: 'Page Faults',
      value: metrics.page_faults?.toLocaleString(),
      subtext: `${diskReadMs}ms disk read / fault`,
      dotColor: 'bg-rose-400',
      badgeText: 'Disk I/O',
      progress: metrics.fault_ratio,
      progressColor: 'bg-rose-400/80',
    },
    {
      title: 'Dirty Write-Backs',
      value: metrics.dirty_write_backs?.toLocaleString(),
      subtext: 'Flushed to disk on eviction',
      dotColor: metrics.dirty_write_backs > 0 ? 'bg-amber-400' : 'bg-zinc-600',
      badgeText: metrics.dirty_write_backs > 0 ? '+δ penalty' : 'Clean',
      progress: metrics.total_accesses > 0 ? metrics.dirty_write_backs / metrics.total_accesses : 0,
      progressColor: 'bg-amber-400/80',
    },
    {
      title: 'Thrashing Suspends',
      value: metrics.thrashing_suspensions?.toLocaleString(),
      subtext: metrics.thrashing_suspensions > 0 ? 'Processes cooled down' : 'Zero thrashing',
      dotColor: metrics.thrashing_suspensions > 0 ? 'bg-rose-400' : 'bg-zinc-600',
      badgeText: metrics.thrashing_suspensions > 0 ? 'Thrashed' : 'Stable',
      progress: null,
    },
    {
      title: 'Hardware EAT',
      value: `${eatMs} ms`,
      subtext: `${Number(metrics.eat).toLocaleString(undefined, { maximumFractionDigits: 0 })} ns avg`,
      dotColor: 'bg-zinc-400',
      badgeText: 'Effective latency',
      progress: null,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mb-3">
      {cards.map((c, idx) => (
        <div
          key={idx}
          className="bg-[#111111] rounded-lg p-3 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                {c.title}
              </span>
              <span className="flex items-center gap-1 text-[10px] font-mono text-zinc-500">
                <span className={`w-1.5 h-1.5 rounded-full ${c.dotColor}`} />
                {c.badgeText}
              </span>
            </div>

            <div className="text-xl font-bold font-mono tracking-tight text-zinc-100 my-0.5">
              {c.value}
            </div>

            <div className="text-[10px] text-zinc-500 font-mono truncate">
              {c.subtext}
            </div>
          </div>

          {c.progress !== null && (
            <div className="w-full bg-zinc-800/80 h-1 rounded-full overflow-hidden mt-2.5">
              <div
                className={`h-full ${c.progressColor} rounded-full transition-all duration-300`}
                style={{ width: `${Math.min(100, Math.max(0, c.progress * 100))}%` }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
