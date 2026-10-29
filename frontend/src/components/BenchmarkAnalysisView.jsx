import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import {
  BarChart3,
  RefreshCw,
  Activity,
  AlertCircle,
  Download,
  FileText,
  TrendingDown,
} from 'lucide-react';

function BenchmarkTooltip({ active, payload, label, unitSuffix, frames, references }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0A0A0A] border border-[#262626] rounded-xl p-3.5 text-xs shadow-2xl font-sans">
        <div className="font-bold text-white mb-2.5 pb-1.5 border-b border-[#222222] flex items-center justify-between gap-4">
          <span>Workload: {label}</span>
          <span className="text-[10px] text-zinc-400 font-mono font-semibold">{frames} Frames &bull; {references} Refs</span>
        </div>
        <div className="space-y-1.5 font-mono">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
                <span className={entry.name === 'AdaptiveHybrid' ? 'font-bold text-teal-400' : 'text-zinc-400'}>
                  {entry.name}:
                </span>
              </div>
              <span className="font-bold text-white">
                {entry.value}
                {unitSuffix}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

export default function BenchmarkAnalysisView({ apiBaseUrl = '' }) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [metricMode, setMetricMode] = useState('eat_ms');

  const [seed, setSeed] = useState(42);
  const [references, setReferences] = useState(1000);
  const [frames, setFrames] = useState(10);
  const [writeProb, setWriteProb] = useState(0.2);

  const lastRequestIdRef = React.useRef(0);

  // CSV Export
  const exportCSV = () => {
    if (!data?.raw_results) return;
    const headers = ['Workload', 'Algorithm', 'Hit Ratio %', 'Page Faults', 'Dirty Write-Backs', 'EAT (ms)'];
    const rows = data.raw_results.map((row) => [
      row.workload,
      row.algorithm,
      (row.hit_ratio * 100).toFixed(2),
      row.page_faults,
      row.dirty_write_backs,
      ((row.eat || 0) / 1e6).toFixed(4),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `benchmark_results_seed${seed}_${references}refs.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // PDF Export (print-as-PDF via browser)
  const exportPDF = () => {
    if (!data?.raw_results) return;
    const rows = data.raw_results
      .map(
        (row) =>
          `<tr style="border-bottom:1px solid #eee">
            <td style="padding:6px 10px">${row.workload}</td>
            <td style="padding:6px 10px;font-weight:bold">${row.algorithm}</td>
            <td style="padding:6px 10px;text-align:right">${(row.hit_ratio * 100).toFixed(2)}%</td>
            <td style="padding:6px 10px;text-align:right;color:#e11d48">${row.page_faults}</td>
            <td style="padding:6px 10px;text-align:right;color:#d97706">${row.dirty_write_backs}</td>
            <td style="padding:6px 10px;text-align:right;font-weight:bold">${((row.eat || 0) / 1e6).toFixed(4)} ms</td>
          </tr>`
      )
      .join('');
    const html = `<!DOCTYPE html><html><head><title>Benchmark Report</title>
      <style>body{font-family:monospace;color:#000;background:#fff;padding:30px}
      table{width:100%;border-collapse:collapse}th{background:#f0f0f0;padding:8px 10px;text-align:left}
      h1{font-size:18px}p{font-size:12px;color:#555}</style></head><body>
      <h1>OS Memory Simulator — Benchmark Report</h1>
      <p>Seed: ${seed} | Frames: ${frames} | References: ${references} | Write Prob: ${(writeProb * 100).toFixed(0)}%</p>
      <table><thead><tr><th>Workload</th><th>Algorithm</th><th>Hit Ratio</th><th>Faults</th><th>Dirty Writes</th><th>EAT (ms)</th></tr></thead>
      <tbody>${rows}</tbody></table></body></html>`;
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
      w.print();
    }
  };

  const fetchBenchmark = useCallback(async () => {
    const requestId = ++lastRequestIdRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const url = `${apiBaseUrl}/api/benchmark?seed=${seed}&references=${references}&frames=${frames}&write_prob=${writeProb}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Benchmark matrix failed: ${res.status} ${res.statusText}`);
      }
      const json = await res.json();
      if (requestId === lastRequestIdRef.current) {
        setData(json);
      }
    } catch (err) {
      if (requestId === lastRequestIdRef.current) {
        setError(err.message || 'Failed to fetch benchmark analysis');
      }
    } finally {
      if (requestId === lastRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [apiBaseUrl, seed, references, frames, writeProb]);

  useEffect(() => {
    fetchBenchmark();
  }, [fetchBenchmark]);

  // Transform raw_results into clustered chart structure
  const chartData = useMemo(() => {
    if (!data?.raw_results) return [];

    const workloadGroups = {};
    data.raw_results.forEach((row) => {
      const w = row.workload;
      if (!workloadGroups[w]) {
        workloadGroups[w] = { workload: w };
      }

      let val = 0;
      if (metricMode === 'eat_ms') {
        val = Number(((row.eat || 0) / 1_000_000).toFixed(2));
      } else if (metricMode === 'hit_ratio') {
        val = Number(((row.hit_ratio || 0) * 100).toFixed(1));
      } else if (metricMode === 'dirty_writes') {
        val = row.dirty_write_backs || 0;
      }
      workloadGroups[w][row.algorithm] = val;
    });

    return Object.values(workloadGroups);
  }, [data, metricMode]);

  const getMetricTitle = () => {
    switch (metricMode) {
      case 'eat_ms':
        return 'Effective Access Time (Lower is Better)';
      case 'hit_ratio':
        return 'Hit Ratio % (Higher is Better)';
      case 'dirty_writes':
        return 'Dirty Page Write-Backs to Disk (Lower is Better)';
      default:
        return 'Hardware Metric';
    }
  };

  const getUnitSuffix = () => {
    switch (metricMode) {
      case 'eat_ms':
        return ' ms';
      case 'hit_ratio':
        return '%';
      case 'dirty_writes':
        return ' writes';
      default:
        return '';
    }
  };

  // Empirical Takeaways dynamically computed from actual result data
  const empiricalTakeaways = useMemo(() => {
    if (!data?.raw_results) return null;
    const raw = data.raw_results;
    const activeFrames = data?.parameters?.frames ?? frames;

    const loopRows = raw.filter((r) => r.workload === 'Loop');
    const loopHybrid = loopRows.find((r) => r.algorithm === 'AdaptiveHybrid');
    const loopLru = loopRows.find((r) => r.algorithm === 'LRU');

    let loopText = '';
    if (loopHybrid && loopLru) {
      const hybridHit = (loopHybrid.hit_ratio * 100).toFixed(1);
      const lruHit = (loopLru.hit_ratio * 100).toFixed(1);
      if (loopHybrid.hit_ratio > loopLru.hit_ratio) {
        loopText = `Under cyclic loop access (working set > ${activeFrames} frames), AdaptiveHybrid achieved ${hybridHit}% hit ratio vs LRU's ${lruHit}%.`;
      } else {
        loopText = `In this loop test, AdaptiveHybrid achieved ${hybridHit}% vs LRU's ${lruHit}%.`;
      }
    }

    const totalDirtyByAlgo = {
      AdaptiveHybrid: 0,
      FIFO: 0,
      LRU: 0,
      LFU: 0,
    };
    raw.forEach((r) => {
      if (totalDirtyByAlgo[r.algorithm] !== undefined) {
        totalDirtyByAlgo[r.algorithm] += r.dirty_write_backs || 0;
      }
    });

    const workloads = ['Sequential', 'Loop', 'Random', 'Zipf (Hot/Cold)'];
    const bestEatPerWorkload = {};
    workloads.forEach((w) => {
      const rowsForWorkload = raw.filter((r) => r.workload === w);
      if (rowsForWorkload.length > 0) {
        let lowest = rowsForWorkload[0];
        rowsForWorkload.forEach((r) => {
          if (r.eat < lowest.eat) lowest = r;
        });
        bestEatPerWorkload[w] = {
          algorithm: lowest.algorithm,
          eatMs: (lowest.eat / 1e6).toFixed(2),
        };
      }
    });

    return {
      loopText,
      totalDirtyByAlgo,
      bestEatPerWorkload,
    };
  }, [data, frames]);

  // ROI: compute time saved vs worst algorithm
  const roiSummary = useMemo(() => {
    if (!data?.raw_results) return null;
    const raw = data.raw_results;
    const hybridRows = raw.filter((r) => r.algorithm === 'AdaptiveHybrid');
    const fifoRows = raw.filter((r) => r.algorithm === 'FIFO');

    const hybridDirty = hybridRows.reduce((acc, r) => acc + (r.dirty_write_backs || 0), 0);
    const fifoDirty = fifoRows.reduce((acc, r) => acc + (r.dirty_write_backs || 0), 0);
    const savedWrites = Math.max(0, fifoDirty - hybridDirty);
    const savedMs = savedWrites * 10;

    const hybridEat = hybridRows.reduce((acc, r) => acc + (r.eat || 0), 0) / Math.max(1, hybridRows.length);
    const fifoEat = fifoRows.reduce((acc, r) => acc + (r.eat || 0), 0) / Math.max(1, fifoRows.length);
    const eatDiffMs = ((fifoEat - hybridEat) / 1e6).toFixed(3);

    return { savedWrites, savedMs, hybridDirty, fifoDirty, eatDiffMs };
  }, [data]);

  return (
    <div className="space-y-4" aria-label="Operating systems benchmark matrix">
      {/* Benchmark Controls & Parameters Header */}
      <div className="bg-[#0A0A0A] border border-[#222222] rounded-xl p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-3.5 mb-3.5 border-b border-[#222222] gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-[#141414] border border-[#27272A] text-white">
                <BarChart3 className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-tight font-sans">
                  Comprehensive 4×4 Benchmark Matrix
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Automated benchmark testing matrix across 4 reference distributions.
                </p>
              </div>
            </div>
          </div>

          {/* Metric Selector Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-zinc-400 mr-1 uppercase font-mono">Metric:</span>
            <div className="flex items-center p-1 rounded-lg border border-[#222222] bg-[#000000] text-xs">
              <button
                type="button"
                onClick={() => setMetricMode('eat_ms')}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer font-bold ${
                  metricMode === 'eat_ms'
                    ? 'bg-white text-black'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                EAT (ms)
              </button>
              <button
                type="button"
                onClick={() => setMetricMode('hit_ratio')}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer font-bold ${
                  metricMode === 'hit_ratio'
                    ? 'bg-white text-black'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Hit Ratio %
              </button>
              <button
                type="button"
                onClick={() => setMetricMode('dirty_writes')}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer font-bold ${
                  metricMode === 'dirty_writes'
                    ? 'bg-white text-black'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Dirty Writes
              </button>
            </div>

            <button
              type="button"
              onClick={fetchBenchmark}
              disabled={isLoading}
              className="btn-secondary p-2 rounded-lg cursor-pointer disabled:opacity-40"
              title="Re-run benchmark matrix"
              aria-label="Re-run benchmark matrix"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Param Bar */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-zinc-400">
          <div className="flex items-center gap-1.5">
            <label htmlFor="bench-frames" className="text-zinc-300 font-bold">Frames:</label>
            <select
              id="bench-frames"
              value={frames}
              onChange={(e) => setFrames(Number(e.target.value))}
              className="bg-[#000000] border border-[#27272A] rounded px-2 py-1 text-xs font-mono text-white focus:border-white"
            >
              {[6, 8, 10, 12, 16, 20].map((f) => (
                <option key={f} value={f}>{f} frames</option>
              ))}
            </select>
          </div>
          <span className="text-zinc-700">&bull;</span>
          <div className="flex items-center gap-1.5">
            <label htmlFor="bench-refs" className="text-zinc-300 font-bold">Trace Length:</label>
            <select
              id="bench-refs"
              value={references}
              onChange={(e) => setReferences(Number(e.target.value))}
              className="bg-[#000000] border border-[#27272A] rounded px-2 py-1 text-xs font-mono text-white focus:border-white"
            >
              {[200, 500, 1000, 2000].map((r) => (
                <option key={r} value={r}>{r} refs</option>
              ))}
            </select>
          </div>
          <span className="text-zinc-700">&bull;</span>
          <div className="flex items-center gap-1.5">
            <label htmlFor="bench-writes" className="text-zinc-300 font-bold">Write Ratio:</label>
            <select
              id="bench-writes"
              value={writeProb}
              onChange={(e) => setWriteProb(Number(e.target.value))}
              className="bg-[#000000] border border-[#27272A] rounded px-2 py-1 text-xs font-mono text-white focus:border-white"
            >
              {[0.1, 0.2, 0.3, 0.5].map((w) => (
                <option key={w} value={w}>{(w * 100).toFixed(0)}% writes</option>
              ))}
            </select>
          </div>
          <span className="text-zinc-700">&bull;</span>
          <div className="flex items-center gap-1.5">
            <label htmlFor="bench-seed" className="text-zinc-300 font-bold">Seed:</label>
            <input
              id="bench-seed"
              type="number"
              value={seed}
              onChange={(e) => setSeed(Number(e.target.value))}
              className="w-16 bg-[#000000] border border-[#27272A] rounded px-2 py-1 text-xs font-mono text-white focus:border-white"
            />
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="bg-[#0A0A0A] border border-[#222222] rounded-xl p-4 sm:p-5">
        <div className="flex items-center justify-between text-xs text-zinc-400 mb-4 font-sans">
          <span className="font-bold text-white text-sm">{getMetricTitle()}</span>
          <span className="font-mono text-xs bg-[#000000] px-2.5 py-1 rounded border border-[#222222] text-zinc-300">
            Hardware: RAM 100ns &bull; Fault Read 10ms &bull; Dirty Write 10ms
          </span>
        </div>

        {error ? (
          <div className="h-72 flex items-center justify-center border border-rose-900/50 bg-[#140000] rounded-xl text-rose-300 gap-2 text-xs font-mono">
            <AlertCircle className="w-5 h-5 text-rose-400" />
            <span>{error}</span>
          </div>
        ) : isLoading && !data ? (
          <div className="h-72 flex flex-col items-center justify-center border border-[#222222] bg-[#000000] rounded-xl text-zinc-400 gap-3 text-xs font-sans">
            <RefreshCw className="w-6 h-6 animate-spin text-white" />
            <span className="font-bold text-white">Executing automated 16-run testing matrix...</span>
          </div>
        ) : (
          <div className="h-80 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 15, left: -5, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F1F1F" vertical={false} />
                <XAxis
                  dataKey="workload"
                  stroke="#52525B"
                  tick={{ fill: '#A1A1AA', fontSize: 12, fontFamily: 'Inter, sans-serif' }}
                />
                <YAxis
                  stroke="#52525B"
                  tick={{ fill: '#A1A1AA', fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                  unit={metricMode === 'hit_ratio' ? '%' : ''}
                />
                <Tooltip
                  content={
                    <BenchmarkTooltip
                      unitSuffix={getUnitSuffix()}
                      frames={frames}
                      references={references}
                    />
                  }
                />
                <Legend
                  wrapperStyle={{ paddingTop: '12px', fontSize: '12px', fontFamily: 'Inter, sans-serif' }}
                />
                <Bar dataKey="FIFO" fill="#D97706" radius={[2, 2, 0, 0]} name="FIFO" />
                <Bar dataKey="LRU" fill="#52525B" radius={[2, 2, 0, 0]} name="LRU" />
                <Bar dataKey="LFU" fill="#9333EA" radius={[2, 2, 0, 0]} name="LFU" />
                <Bar dataKey="AdaptiveHybrid" fill="#0D9488" radius={[2, 2, 0, 0]} name="AdaptiveHybrid" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Data-Derived Empirical Observations */}
      {empiricalTakeaways && (
        <div className="bg-[#0A0A0A] border border-[#222222] rounded-xl p-4 sm:p-5">
          <div className="flex items-center gap-2 pb-2.5 mb-3 border-b border-[#222222]">
            <Activity className="w-4 h-4 text-zinc-400" aria-hidden="true" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white font-mono">
              Data-Derived Analytical Observations
            </h3>
            <span className="text-[10px] font-mono text-zinc-400 bg-[#000000] px-2 py-0.5 rounded border border-[#222222]">
              Derived from live run
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
            <div className="p-3.5 rounded-xl bg-[#000000] border border-[#222222] flex flex-col justify-between">
              <div>
                <span className="font-bold text-white block mb-1 font-sans">
                  Cyclic Loop Behavior
                </span>
                <p className="text-zinc-400 text-[11px] leading-relaxed font-sans">
                  {empiricalTakeaways.loopText || 'Evaluating cyclic reference behavior across algorithms.'}
                </p>
              </div>
              <div className="mt-2 text-[10px] text-teal-400 font-mono pt-2 border-t border-[#1C1C1E]">
                LRFU frequency weighting preserves core pages
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#000000] border border-[#222222] flex flex-col justify-between">
              <div>
                <span className="font-bold text-white block mb-1 font-sans">
                  Total Disk Write-Backs Incurred
                </span>
                <div className="font-mono text-xs space-y-1 my-2">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">AdaptiveHybrid:</span>
                    <strong className="text-teal-400 font-bold">
                      {empiricalTakeaways.totalDirtyByAlgo.AdaptiveHybrid} writes
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">LRU:</span>
                    <strong className="text-white">
                      {empiricalTakeaways.totalDirtyByAlgo.LRU} writes
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">FIFO:</span>
                    <strong className="text-white">
                      {empiricalTakeaways.totalDirtyByAlgo.FIFO} writes
                    </strong>
                  </div>
                </div>
              </div>
              <div className="text-[10px] text-amber-400 font-mono pt-2 border-t border-[#1C1C1E]">
                +δ cost penalty avoids dirty frame evictions
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#000000] border border-[#222222] flex flex-col justify-between">
              <div>
                <span className="font-bold text-white block mb-1 font-sans">
                  Lowest Hardware EAT by Workload
                </span>
                <div className="font-mono text-[11px] space-y-1 my-2">
                  {Object.entries(empiricalTakeaways.bestEatPerWorkload).map(([w, info]) => (
                    <div key={w} className="flex justify-between">
                      <span className="text-zinc-500 truncate max-w-[120px]">{w}:</span>
                      <strong className="text-white">
                        {info.algorithm} ({info.eatMs}ms)
                      </strong>
                    </div>
                  ))}
                </div>
              </div>
              <div className="text-[10px] text-zinc-400 font-mono pt-2 border-t border-[#1C1C1E]">
                Incorporates 100ns RAM, 10ms read & write latencies
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ROI Widget */}
      {roiSummary && (
        <div className="bg-[var(--bg-surface)] border border-teal-600/40 rounded-xl p-4 sm:p-5">
          <div className="flex items-center gap-2 pb-2.5 mb-3 border-b border-[var(--border-subtle)]">
            <TrendingDown className="w-4 h-4 text-teal-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] font-mono">
              Time Saved ROI Widget
            </h3>
            <span className="text-[10px] font-mono text-[var(--text-secondary)] bg-[var(--bg-elevated)] px-2 py-0.5 rounded border border-[var(--border-default)]">
              AdaptiveHybrid vs FIFO
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3 rounded-xl bg-[#041A14] border border-teal-600/40 text-center">
              <div className="text-2xl font-black font-mono text-teal-400">{roiSummary.savedWrites}</div>
              <div className="text-xs font-mono text-[var(--text-secondary)] mt-1">Disk write-backs prevented</div>
              <div className="text-[10px] text-[var(--text-tertiary)] mt-0.5">vs FIFO ({roiSummary.fifoDirty} writes)</div>
            </div>
            <div className="p-3 rounded-xl bg-[#041A14] border border-teal-600/40 text-center">
              <div className="text-2xl font-black font-mono text-teal-400">{roiSummary.savedMs}ms</div>
              <div className="text-xs font-mono text-[var(--text-secondary)] mt-1">I/O blocking time prevented</div>
              <div className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{roiSummary.savedWrites} × 10ms/write</div>
            </div>
            <div className="p-3 rounded-xl bg-[#041A14] border border-teal-600/40 text-center">
              <div className="text-2xl font-black font-mono text-teal-400">{roiSummary.eatDiffMs}ms</div>
              <div className="text-xs font-mono text-[var(--text-secondary)] mt-1">avg EAT improvement</div>
              <div className="text-[10px] text-[var(--text-tertiary)] mt-0.5">per workload run</div>
            </div>
          </div>
          <p className="text-xs text-[var(--text-secondary)] font-mono mt-3 leading-relaxed">
            AdaptiveHybrid saved {roiSummary.savedWrites} disk write-backs, preventing ~{roiSummary.savedMs}ms of I/O blocking compared to FIFO.
            The C(p) dirty-cost penalty actively avoids unnecessary disk flushes.
          </p>
        </div>
      )}

      {/* Complete Empirical Data Table */}
      {data?.raw_results && (
        <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl p-4 sm:p-5 overflow-hidden">
          <div className="flex items-center justify-between pb-2.5 mb-3.5 border-b border-[var(--border-default)]">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] font-mono">
              Complete Empirical Results Matrix
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-[var(--text-secondary)]">
                16 Benchmark Iterations
              </span>
              {/* Export Controls */}
              <button
                type="button"
                onClick={exportCSV}
                className="btn-secondary px-2.5 py-1 rounded text-[11px] font-mono flex items-center gap-1.5 cursor-pointer"
                title="Export to CSV"
              >
                <Download className="w-3 h-3" />
                CSV
              </button>
              <button
                type="button"
                onClick={exportPDF}
                className="btn-secondary px-2.5 py-1 rounded text-[11px] font-mono flex items-center gap-1.5 cursor-pointer"
                title="Export to PDF"
              >
                <FileText className="w-3 h-3" />
                PDF
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-[#222222] text-zinc-400 text-[11px] bg-[#000000]">
                  <th className="py-2.5 px-3 font-semibold">Workload</th>
                  <th className="py-2.5 px-3 font-semibold">Algorithm</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Hit Ratio</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Page Faults</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Dirty Writes</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Effective Access Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1C1C1E]">
                {data.raw_results.map((row, idx) => (
                  <tr
                    key={idx}
                    className={`hover:bg-[#141414] transition-colors ${
                      row.algorithm === 'AdaptiveHybrid' ? 'bg-[#021812]/50 font-bold' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 text-white">{row.workload}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          row.algorithm === 'AdaptiveHybrid'
                            ? 'bg-[#021812] text-teal-300 border border-teal-600'
                            : row.algorithm === 'LRU'
                            ? 'bg-[#181818] text-white border border-[#3A3A3A]'
                            : row.algorithm === 'LFU'
                            ? 'bg-[#16051E] text-purple-300 border border-purple-700'
                            : 'bg-[#180F02] text-amber-300 border border-amber-700'
                        }`}
                      >
                        {row.algorithm}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-white">
                      {(row.hit_ratio * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-right text-rose-400 font-semibold">{row.page_faults}</td>
                    <td className="py-2.5 px-3 text-right text-amber-400 font-semibold">{row.dirty_write_backs}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-white">
                      {((row.eat || 0) / 1e6).toFixed(2)} ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
