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
  RefreshCw,
  AlertCircle,
  Download,
  FileText,
  TrendingDown,
} from 'lucide-react';

function BenchmarkTooltip({ active, payload, label, unitSuffix, frames, references }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#161616] rounded-lg p-3 text-xs font-sans shadow-2xl">
        <div className="font-bold text-zinc-100 mb-2 pb-1 border-b border-zinc-800 flex items-center justify-between gap-4">
          <span>{label}</span>
          <span className="text-[10px] text-zinc-500 font-mono">{frames} Frames · {references} Refs</span>
        </div>
        <div className="space-y-1 font-mono text-[11px]">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className={entry.name === 'AdaptiveHybrid' ? 'font-bold text-zinc-100' : 'text-zinc-400'}>
                  {entry.name}:
                </span>
              </div>
              <span className="font-bold text-zinc-200">
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

/**
 * BenchmarkAnalysisView (Tab 3: Benchmark Analytics)
 * Monochromatic, border-free analytical view comparing hardware policies across workloads.
 */
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

  // Empirical Takeaways dynamically computed
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

    const totalDirtyByAlgo = {};
    raw.forEach((r) => {
      totalDirtyByAlgo[r.algorithm] = (totalDirtyByAlgo[r.algorithm] || 0) + (r.dirty_write_backs || 0);
    });

    const bestEatPerWorkload = {};
    const workloads = [...new Set(raw.map((r) => r.workload))];
    workloads.forEach((w) => {
      const wRows = raw.filter((r) => r.workload === w);
      let bestRow = null;
      let minEat = Infinity;
      wRows.forEach((r) => {
        if ((r.eat || 0) < minEat) {
          minEat = r.eat || 0;
          bestRow = r;
        }
      });
      if (bestRow) {
        bestEatPerWorkload[w] = {
          algorithm: bestRow.algorithm,
          eatMs: (minEat / 1e6).toFixed(2),
        };
      }
    });

    return {
      loopText,
      totalDirtyByAlgo,
      bestEatPerWorkload,
    };
  }, [data, frames]);

  // 'Time Saved' ROI Widget
  const roiSummary = useMemo(() => {
    if (!data?.raw_results) return null;
    const raw = data.raw_results;
    let hybridDirty = 0;
    let fifoDirty = 0;
    let hybridEatTotal = 0;
    let fifoEatTotal = 0;
    let workloadCount = 0;

    raw.forEach((r) => {
      if (r.algorithm === 'AdaptiveHybrid') {
        hybridDirty += r.dirty_write_backs || 0;
        hybridEatTotal += r.eat || 0;
        workloadCount++;
      } else if (r.algorithm === 'FIFO') {
        fifoDirty += r.dirty_write_backs || 0;
        fifoEatTotal += r.eat || 0;
      }
    });

    const savedWrites = Math.max(0, fifoDirty - hybridDirty);
    const savedMs = (savedWrites * 10);
    const eatDiffMs = workloadCount > 0 ? (((fifoEatTotal - hybridEatTotal) / workloadCount) / 1e6).toFixed(2) : '0';

    return {
      savedWrites,
      savedMs,
      eatDiffMs,
      fifoDirty,
      hybridDirty,
    };
  }, [data]);

  return (
    <div className="space-y-3">
      {/* Configuration & Controls */}
      <div className="bg-[#111111] rounded-lg p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 mb-3 border-b border-zinc-900 gap-3">
          <div>
            <h2 className="text-sm font-bold text-zinc-100 tracking-tight font-sans">
              Benchmark Analytics
            </h2>
            <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
              Empirical multi-workload comparison (Sequential, Loop, Zipf, Random)
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Metric Mode Switcher */}
            <div className="flex items-center p-0.5 bg-[#181818] rounded text-xs font-mono">
              <button
                type="button"
                onClick={() => setMetricMode('eat_ms')}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  metricMode === 'eat_ms'
                    ? 'bg-zinc-700 text-zinc-100 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                EAT (ms)
              </button>
              <button
                type="button"
                onClick={() => setMetricMode('hit_ratio')}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  metricMode === 'hit_ratio'
                    ? 'bg-zinc-700 text-zinc-100 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Hit Ratio %
              </button>
              <button
                type="button"
                onClick={() => setMetricMode('dirty_writes')}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                  metricMode === 'dirty_writes'
                    ? 'bg-zinc-700 text-zinc-100 font-semibold'
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
              className="p-1.5 rounded bg-[#181818] hover:bg-[#202020] text-zinc-400 hover:text-zinc-200 cursor-pointer disabled:opacity-40 transition-colors"
              title="Re-run benchmark matrix"
              aria-label="Re-run benchmark matrix"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Param Bar */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-zinc-400">
          <div className="flex items-center gap-1.5">
            <label htmlFor="bench-frames" className="text-zinc-500">Frames:</label>
            <select
              id="bench-frames"
              value={frames}
              onChange={(e) => setFrames(Number(e.target.value))}
              className="bg-[#181818] rounded px-2 py-1 text-xs font-mono text-zinc-200 border-0 outline-none"
            >
              {[6, 8, 10, 12, 16, 20].map((f) => (
                <option key={f} value={f}>{f} frames</option>
              ))}
            </select>
          </div>

          <span className="text-zinc-700">·</span>

          <div className="flex items-center gap-1.5">
            <label htmlFor="bench-refs" className="text-zinc-500">Refs:</label>
            <select
              id="bench-refs"
              value={references}
              onChange={(e) => setReferences(Number(e.target.value))}
              className="bg-[#181818] rounded px-2 py-1 text-xs font-mono text-zinc-200 border-0 outline-none"
            >
              {[200, 500, 1000, 2000].map((r) => (
                <option key={r} value={r}>{r} refs</option>
              ))}
            </select>
          </div>

          <span className="text-zinc-700">·</span>

          <div className="flex items-center gap-1.5">
            <label htmlFor="bench-writes" className="text-zinc-500">Writes:</label>
            <select
              id="bench-writes"
              value={writeProb}
              onChange={(e) => setWriteProb(Number(e.target.value))}
              className="bg-[#181818] rounded px-2 py-1 text-xs font-mono text-zinc-200 border-0 outline-none"
            >
              {[0.1, 0.2, 0.3, 0.5].map((w) => (
                <option key={w} value={w}>{(w * 100).toFixed(0)}% writes</option>
              ))}
            </select>
          </div>

          <span className="text-zinc-700">·</span>

          <div className="flex items-center gap-1.5">
            <label htmlFor="bench-seed" className="text-zinc-500">Seed:</label>
            <input
              id="bench-seed"
              type="number"
              value={seed}
              onChange={(e) => setSeed(Number(e.target.value))}
              className="w-16 bg-[#181818] rounded px-2 py-1 text-xs font-mono text-zinc-200 border-0 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="bg-[#111111] rounded-lg p-4">
        <div className="flex items-center justify-between text-xs text-zinc-400 mb-3 font-mono">
          <span className="font-semibold text-zinc-200 text-xs font-sans">{getMetricTitle()}</span>
          <span className="text-[10px] text-zinc-500">
            RAM 100ns · Read 10ms · Write 10ms
          </span>
        </div>

        {error ? (
          <div className="h-64 flex items-center justify-center bg-rose-950/20 rounded-lg text-rose-300 gap-2 text-xs font-mono">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span>{error}</span>
          </div>
        ) : isLoading && !data ? (
          <div className="h-64 flex flex-col items-center justify-center bg-[#161616] rounded-lg text-zinc-400 gap-2 text-xs font-mono">
            <RefreshCw className="w-5 h-5 animate-spin text-zinc-300" />
            <span>Executing automated benchmark matrix...</span>
          </div>
        ) : (
          <div className="h-72 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 15, left: -5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                <XAxis
                  dataKey="workload"
                  stroke="#444"
                  tick={{ fill: '#888', fontSize: 11, fontFamily: 'monospace' }}
                />
                <YAxis
                  stroke="#444"
                  tick={{ fill: '#888', fontSize: 10, fontFamily: 'monospace' }}
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
                  wrapperStyle={{ paddingTop: '8px', fontSize: '11px', fontFamily: 'monospace' }}
                />
                <Bar dataKey="FIFO" fill="#71717A" radius={[2, 2, 0, 0]} name="FIFO" />
                <Bar dataKey="LFU" fill="#A1A1AA" radius={[2, 2, 0, 0]} name="LFU" />
                <Bar dataKey="LRU" fill="#D4D4D8" radius={[2, 2, 0, 0]} name="LRU" />
                <Bar dataKey="AdaptiveHybrid" fill="#FAFAFA" radius={[2, 2, 0, 0]} name="AdaptiveHybrid" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* 'Time Saved' ROI Widget */}
      {roiSummary && (
        <div className="bg-[#111111] rounded-lg p-4">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-zinc-900 text-xs font-mono">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-zinc-300" />
              <span className="font-semibold text-zinc-200">
                Time Saved ROI Summary
              </span>
            </div>
            <span className="text-[10px] text-zinc-500">
              AdaptiveHybrid vs FIFO
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="p-3 rounded-md bg-[#161616] text-center">
              <div className="text-xl font-bold font-mono text-zinc-100">{roiSummary.savedWrites}</div>
              <div className="text-[11px] font-mono text-zinc-400 mt-0.5">Disk write-backs prevented</div>
              <div className="text-[10px] text-zinc-600 mt-0.5">vs FIFO ({roiSummary.fifoDirty} writes)</div>
            </div>
            <div className="p-3 rounded-md bg-[#161616] text-center">
              <div className="text-xl font-bold font-mono text-zinc-100">{roiSummary.savedMs}ms</div>
              <div className="text-[11px] font-mono text-zinc-400 mt-0.5">I/O blocking time prevented</div>
              <div className="text-[10px] text-zinc-600 mt-0.5">{roiSummary.savedWrites} × 10ms / flush</div>
            </div>
            <div className="p-3 rounded-md bg-[#161616] text-center">
              <div className="text-xl font-bold font-mono text-zinc-100">{roiSummary.eatDiffMs}ms</div>
              <div className="text-[11px] font-mono text-zinc-400 mt-0.5">Average EAT improvement</div>
              <div className="text-[10px] text-zinc-600 mt-0.5">per workload run</div>
            </div>
          </div>

          <p className="text-[11px] text-zinc-500 font-mono mt-2.5 leading-relaxed">
            AdaptiveHybrid saved {roiSummary.savedWrites} disk write-backs, preventing ~{roiSummary.savedMs}ms of I/O blocking compared to FIFO.
          </p>
        </div>
      )}

      {/* Complete Empirical Data Table */}
      {data?.raw_results && (
        <div className="bg-[#111111] rounded-lg p-4 overflow-hidden">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-zinc-900">
            <span className="text-xs font-semibold text-zinc-200 font-mono">
              Empirical Results Matrix
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={exportCSV}
                className="px-2.5 py-1 rounded bg-[#181818] hover:bg-[#202020] text-zinc-300 text-[11px] font-mono flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Export to CSV"
              >
                <Download className="w-3 h-3" />
                CSV
              </button>
              <button
                type="button"
                onClick={exportPDF}
                className="px-2.5 py-1 rounded bg-[#181818] hover:bg-[#202020] text-zinc-300 text-[11px] font-mono flex items-center gap-1.5 cursor-pointer transition-colors"
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
                <tr className="text-zinc-500 text-[10px] uppercase border-b border-zinc-900">
                  <th className="py-2 px-2.5 font-medium">Workload</th>
                  <th className="py-2 px-2.5 font-medium">Algorithm</th>
                  <th className="py-2 px-2.5 font-medium text-right">Hit Ratio</th>
                  <th className="py-2 px-2.5 font-medium text-right">Faults</th>
                  <th className="py-2 px-2.5 font-medium text-right">Dirty Writes</th>
                  <th className="py-2 px-2.5 font-medium text-right">EAT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900/60">
                {data.raw_results.map((row, idx) => (
                  <tr
                    key={idx}
                    className={`hover:bg-[#161616] transition-colors ${
                      row.algorithm === 'AdaptiveHybrid' ? 'text-zinc-100 font-semibold' : 'text-zinc-400'
                    }`}
                  >
                    <td className="py-2 px-2.5">{row.workload}</td>
                    <td className="py-2 px-2.5">
                      <span className="text-[11px]">
                        {row.algorithm}
                      </span>
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono">
                      {(row.hit_ratio * 100).toFixed(1)}%
                    </td>
                    <td className="py-2 px-2.5 text-right font-mono text-rose-400/90">{row.page_faults}</td>
                    <td className="py-2 px-2.5 text-right font-mono text-amber-400/90">{row.dirty_write_backs}</td>
                    <td className="py-2 px-2.5 text-right font-mono">
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
