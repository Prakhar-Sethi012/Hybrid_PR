import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { BarChart3, RefreshCw, Trophy, Zap, AlertCircle, TrendingDown } from 'lucide-react';

export default function BenchmarkCharts({ apiBaseUrl = '' }) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [metricMode, setMetricMode] = useState('eat_ms'); // 'eat_ms', 'hit_ratio', 'dirty_writes'

  const fetchBenchmark = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/api/benchmark?seed=42&references=1000&frames=10&write_prob=0.2`);
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}: ${res.statusText}`);
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message || 'Failed to fetch benchmark data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBenchmark();
  }, []);

  // Transform data for Recharts based on selected metric mode
  const chartData = (data?.chart_data || []).map((item) => {
    if (metricMode === 'eat_ms') {
      return {
        workload: item.workload,
        FIFO: Number(((item.FIFO_eat || 0) / 1e6).toFixed(2)),
        LRU: Number(((item.LRU_eat || 0) / 1e6).toFixed(2)),
        LFU: Number(((item.LFU_eat || 0) / 1e6).toFixed(2)),
        AdaptiveHybrid: Number(((item.AdaptiveHybrid_eat || 0) / 1e6).toFixed(2)),
      };
    } else if (metricMode === 'hit_ratio') {
      return {
        workload: item.workload,
        FIFO: item.FIFO_hit_ratio ?? 0,
        LRU: item.LRU_hit_ratio ?? 0,
        LFU: item.LFU_hit_ratio ?? 0,
        AdaptiveHybrid: item.AdaptiveHybrid_hit_ratio ?? 0,
      };
    } else {
      return {
        workload: item.workload,
        FIFO: item.FIFO_dirty_writes ?? 0,
        LRU: item.LRU_dirty_writes ?? 0,
        LFU: item.LFU_dirty_writes ?? 0,
        AdaptiveHybrid: item.AdaptiveHybrid_dirty_writes ?? 0,
      };
    }
  });

  const getMetricTitle = () => {
    if (metricMode === 'eat_ms') return 'Effective Access Time (EAT in ms - Lower is Better)';
    if (metricMode === 'hit_ratio') return 'Hit Ratio (% - Higher is Better)';
    return 'Dirty Page Write-Backs to Disk (Lower is Better)';
  };

  const getUnitSuffix = () => {
    if (metricMode === 'eat_ms') return ' ms';
    if (metricMode === 'hit_ratio') return '%';
    return ' writes';
  };

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#09090b] border border-zinc-800 rounded-lg p-3 text-xs font-mono shadow-md">
          <div className="font-semibold text-zinc-100 mb-2 pb-1 border-b border-zinc-800 flex items-center justify-between gap-4">
            <span>Workload: {label}</span>
            <span className="text-[10px] text-zinc-500 font-normal">10 Frames &bull; 1k Refs</span>
          </div>
          <div className="space-y-1">
            {payload.map((entry, index) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: entry.color }} />
                  <span className={entry.name === 'AdaptiveHybrid' ? 'font-bold text-zinc-100' : 'text-zinc-400'}>
                    {entry.name}:
                  </span>
                </div>
                <span className="font-semibold text-zinc-200">
                  {entry.value}
                  {getUnitSuffix()}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-[#121215] border border-zinc-800 rounded-xl p-5 mb-5 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-800/80 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">
                Empirical Benchmark Suite
              </h2>
              <span className="text-[11px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono">
                Cross-Workload Matrix
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Identical workload traces comparing FIFO, LRU, LFU, and AdaptiveHybrid
            </p>
          </div>
        </div>

        {/* View Mode & Refresh */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-0.5 bg-[#09090b] rounded-lg border border-zinc-800 text-xs font-mono">
            <button
              type="button"
              onClick={() => setMetricMode('eat_ms')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                metricMode === 'eat_ms'
                  ? 'bg-zinc-200 text-zinc-900 font-medium'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              EAT (ms)
            </button>
            <button
              type="button"
              onClick={() => setMetricMode('hit_ratio')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                metricMode === 'hit_ratio'
                  ? 'bg-zinc-200 text-zinc-900 font-medium'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Hit Ratio %
            </button>
            <button
              type="button"
              onClick={() => setMetricMode('dirty_writes')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                metricMode === 'dirty_writes'
                  ? 'bg-zinc-200 text-zinc-900 font-medium'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Dirty Writes
            </button>
          </div>

          <button
            type="button"
            onClick={fetchBenchmark}
            disabled={isLoading}
            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 border border-zinc-800 transition-colors disabled:opacity-40"
            title="Re-run Benchmark Suite"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Chart View */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-zinc-400 mb-2 font-mono">
          <span className="font-medium text-zinc-300">{getMetricTitle()}</span>
          <span className="text-zinc-500 text-[11px]">Seed=42 Guarantee</span>
        </div>

        {error ? (
          <div className="h-64 flex items-center justify-center border border-rose-900/40 bg-rose-950/20 rounded-lg text-rose-400 gap-2 text-xs font-mono">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        ) : isLoading && !data ? (
          <div className="h-64 flex flex-col items-center justify-center border border-zinc-800 bg-[#09090b] rounded-lg text-zinc-500 gap-2 text-xs font-mono">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Running 16-run testing matrix...</span>
          </div>
        ) : (
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 15, left: -10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis
                  dataKey="workload"
                  stroke="#52525b"
                  tick={{ fill: '#a1a1aa', fontSize: 11, fontFamily: 'monospace' }}
                />
                <YAxis
                  stroke="#52525b"
                  tick={{ fill: '#a1a1aa', fontSize: 10, fontFamily: 'monospace' }}
                  unit={metricMode === 'hit_ratio' ? '%' : ''}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: '8px', fontSize: '11px', fontFamily: 'monospace' }}
                />
                <Bar dataKey="FIFO" fill="#d97706" radius={[3, 3, 0, 0]} name="FIFO" />
                <Bar dataKey="LRU" fill="#3b82f6" radius={[3, 3, 0, 0]} name="LRU" />
                <Bar dataKey="LFU" fill="#8b5cf6" radius={[3, 3, 0, 0]} name="LFU" />
                <Bar dataKey="AdaptiveHybrid" fill="#10b981" radius={[3, 3, 0, 0]} name="AdaptiveHybrid" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Highlights */}
      <div className="mt-4 pt-4 border-t border-zinc-800/80 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
        <div className="p-3 rounded-lg bg-[#09090b] border border-zinc-800">
          <div className="text-zinc-200 font-semibold mb-1 flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-emerald-400" />
            Loop Thrashing Immunity
          </div>
          <p className="text-zinc-500 text-[11px] leading-relaxed">
            When loop sequence (15) exceeds frames (10), FIFO and LRU hit 0%. AdaptiveHybrid shields high-scoring pages, cutting EAT significantly.
          </p>
        </div>

        <div className="p-3 rounded-lg bg-[#09090b] border border-zinc-800">
          <div className="text-zinc-200 font-semibold mb-1 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            Dirty Penalty Savings (δ = 2.0)
          </div>
          <p className="text-zinc-500 text-[11px] leading-relaxed">
            Assigning $C(p) = S(p) + \delta$ to dirty pages avoids expensive 10ms disk write-backs by prioritizing clean pages when costs are close.
          </p>
        </div>

        <div className="p-3 rounded-lg bg-[#09090b] border border-zinc-800">
          <div className="text-zinc-200 font-semibold mb-1 flex items-center gap-1.5">
            <TrendingDown className="w-3.5 h-3.5 text-zinc-300" />
            Dynamic λ Parameter Tuning
          </div>
          <p className="text-zinc-500 text-[11px] leading-relaxed">
            Every $N=100$ accesses, $\lambda$ balances LRU recency vs LFU frequency based on fault bursts and thrashing controller feedback.
          </p>
        </div>
      </div>
    </div>
  );
}
