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

// Semantic Algorithm Colors
const ALGO_COLORS = {
  AdaptiveHybrid: '#10B981', // Soft Emerald
  LRU: '#3B82F6',            // Muted Blue
  LFU: '#8B5CF6',            // Muted Purple
  FIFO: '#F43F5E',           // Muted Rose
};

function BenchmarkTooltip({ active, payload, label, unitSuffix, frames, references }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#161616] rounded-lg p-3 text-xs font-sans shadow-2xl">
        <div className="font-bold text-zinc-100 mb-2 pb-1 border-b border-zinc-800 flex items-center justify-between gap-4">
          <span>{label}</span>
          <span className="text-[10px] text-zinc-500 font-mono">{frames} Frames · {references} Refs</span>
        </div>
        <div className="space-y-1 font-mono text-[11px]">
          {payload.map((entry, index) => {
            const algoColor = ALGO_COLORS[entry.name] || entry.color || '#E4E4E7';
            return (
              <div key={index} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: algoColor }} />
                  <span style={{ color: algoColor }} className="font-semibold">
                    {entry.name}:
                  </span>
                </div>
                <span className="font-bold text-zinc-100">
                  {entry.value}
                  {unitSuffix}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
}

/**
 * BenchmarkAnalysisView (Tab 3: Benchmark Analytics)
 * Analytical view comparing hardware policies across workloads.
 * Fully reactive to global configuration / presets and rendered with distinct semantic colors.
 */
export default function BenchmarkAnalysisView({ config, apiBaseUrl = '' }) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [metricMode, setMetricMode] = useState('eat_ms');

  // Separate reshaped state arrays for Recharts
  const [eatData, setEatData] = useState([]);
  const [hitRatioData, setHitRatioData] = useState([]);
  const [dirtyWritesData, setDirtyWritesData] = useState([]);

  // Track global configuration values from props
  const globalFrames = config?.frame_count ?? 10;
  const globalReferences = config?.references ?? 1000;
  const globalWriteProb = config?.write_probability ?? 0.2;
  const globalSeed = config?.seed ?? 42;

  // Local state initialized with global config
  const [seed, setSeed] = useState(globalSeed);
  const [references, setReferences] = useState(globalReferences);
  const [frames, setFrames] = useState(globalFrames);
  const [writeProb, setWriteProb] = useState(globalWriteProb);

  const lastRequestIdRef = React.useRef(0);

  // Fetch benchmark matrix & reshape data for Recharts
  const fetchBenchmarkData = useCallback(
    async (f = frames, r = references, wp = writeProb, s = seed) => {
      const requestId = ++lastRequestIdRef.current;
      setIsLoading(true);
      setError(null);
      try {
        const url = `${apiBaseUrl}/api/benchmark?seed=${s}&references=${r}&frames=${f}&frame_count=${f}&write_prob=${wp}&write_probability=${wp}`;
        const res = await fetch(url);
        if (!res.ok) {
          let errorDetail = '';
          try {
            const errorJson = await res.json();
            errorDetail = errorJson.detail || errorJson.message || '';
          } catch {
            // response was not JSON
          }
          const msg = errorDetail
            ? `Server Error (${res.status}): ${errorDetail}`
            : `Benchmark fetch failed with status ${res.status} (${res.statusText || 'Internal Server Error'})`;
          throw new Error(msg);
        }

        const responseData = await res.json();
        console.log('Raw API Response:', responseData);

        // Transformation function to reshape flat 16 results into 4 workload objects for Recharts
        const transformResults = (rawList, metricExtractor) => {
          const workloads = ['Sequential', 'Loop', 'Random', 'Zipf'];
          const normalize = (w) => (w && w.includes('Zipf') ? 'Zipf' : (w || 'Unknown'));

          const map = {};
          workloads.forEach((w) => {
            map[w] = {
              name: w,
              FIFO: 0,
              LRU: 0,
              LFU: 0,
              AdaptiveHybrid: 0,
            };
          });

          (rawList || []).forEach((row) => {
            const w = normalize(row.workload);
            const algo = row.algorithm;
            if (map[w] && algo && Object.prototype.hasOwnProperty.call(map[w], algo)) {
              map[w][algo] = metricExtractor(row);
            }
          });

          return workloads.map((w) => map[w]);
        };

        const flatResults = responseData.raw_results || [];
        const reshapedEat = transformResults(flatResults, (row) =>
          Number(((row.eat || 0) / 1_000_000).toFixed(2))
        );
        const reshapedHitRatio = transformResults(flatResults, (row) =>
          Number(((row.hit_ratio || 0) * 100).toFixed(1))
        );
        const reshapedDirtyWrites = transformResults(flatResults, (row) =>
          Number(row.dirty_write_backs ?? 0)
        );

        const reshapedData = {
          eat: reshapedEat,
          hitRatio: reshapedHitRatio,
          dirtyWrites: reshapedDirtyWrites,
        };
        console.log('Reshaped Recharts Data:', reshapedData);

        if (requestId === lastRequestIdRef.current) {
          setData(responseData);
          setEatData(reshapedEat);
          setHitRatioData(reshapedHitRatio);
          setDirtyWritesData(reshapedDirtyWrites);
        }
      } catch (err) {
        if (requestId === lastRequestIdRef.current) {
          const errMsg = err.message || 'Failed to fetch benchmark analysis';
          setError(errMsg);
          console.error('Benchmark fetch error:', err);
        }
      } finally {
        if (requestId === lastRequestIdRef.current) {
          setIsLoading(false);
        }
      }
    },
    [apiBaseUrl, frames, references, writeProb, seed]
  );

  // Trigger fresh fetch whenever global config / presets change
  useEffect(() => {
    console.log('Fetching benchmark with config:', {
      frames: config?.frame_count,
      writeProb: config?.write_probability,
    });

    const f = config?.frame_count ?? 10;
    const r = config?.references ?? 1000;
    const wp = config?.write_probability ?? 0.2;
    const s = config?.seed ?? 42;

    setFrames(f);
    setReferences(r);
    setWriteProb(wp);
    setSeed(s);

    fetchBenchmarkData(f, r, wp, s);
  }, [
    config?.frame_count,
    config?.references,
    config?.write_probability,
    config?.seed,
    fetchBenchmarkData,
  ]);

  // Select the active reshaped array based on the active metric toggle
  const activeChartData = useMemo(() => {
    if (metricMode === 'hit_ratio') return hitRatioData;
    if (metricMode === 'dirty_writes') return dirtyWritesData;
    return eatData;
  }, [metricMode, eatData, hitRatioData, dirtyWritesData]);

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
    a.download = `benchmark_results_seed${seed}_${references}refs_${frames}frames.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // PDF Export
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
    const savedMs = savedWrites * 10;
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
              Empirical multi-workload comparison (Sequential, Loop, Random, Zipf)
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
              onClick={() => fetchBenchmarkData(frames, references, writeProb, seed)}
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
              onChange={(e) => {
                const f = Number(e.target.value);
                setFrames(f);
                fetchBenchmarkData(f, references, writeProb, seed);
              }}
              className="bg-[#181818] rounded px-2 py-1 text-xs font-mono text-zinc-200 border-0 outline-none cursor-pointer"
            >
              {[4, 6, 8, 10, 12, 16, 20, 32].map((f) => (
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
              onChange={(e) => {
                const r = Number(e.target.value);
                setReferences(r);
                fetchBenchmarkData(frames, r, writeProb, seed);
              }}
              className="bg-[#181818] rounded px-2 py-1 text-xs font-mono text-zinc-200 border-0 outline-none cursor-pointer"
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
              onChange={(e) => {
                const wp = Number(e.target.value);
                setWriteProb(wp);
                fetchBenchmarkData(frames, references, wp, seed);
              }}
              className="bg-[#181818] rounded px-2 py-1 text-xs font-mono text-zinc-200 border-0 outline-none cursor-pointer"
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
              onBlur={() => fetchBenchmarkData(frames, references, writeProb, seed)}
              onKeyDown={(e) => e.key === 'Enter' && fetchBenchmarkData(frames, references, writeProb, seed)}
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
          <div className="h-64 flex flex-col items-center justify-center bg-rose-950/20 border border-rose-900/40 rounded-lg text-rose-300 gap-3 text-xs font-mono p-4 text-center">
            <div className="flex items-center gap-2 text-rose-400 font-semibold">
              <AlertCircle className="w-4 h-4" />
              <span>Benchmark Execution Error</span>
            </div>
            <p className="max-w-md text-rose-300/80">{error}</p>
            <button
              type="button"
              onClick={() => fetchBenchmarkData(frames, references, writeProb, seed)}
              className="px-3 py-1 bg-rose-900/40 hover:bg-rose-900/70 border border-rose-800/60 text-rose-100 rounded text-xs transition-colors cursor-pointer"
            >
              Retry Benchmark
            </button>
          </div>
        ) : isLoading && !data ? (
          <div className="h-64 flex flex-col items-center justify-center bg-[#161616] rounded-lg text-zinc-400 gap-2 text-xs font-mono">
            <RefreshCw className="w-5 h-5 animate-spin text-zinc-300" />
            <span>Executing automated benchmark matrix...</span>
          </div>
        ) : (
          <div className="h-72 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activeChartData} margin={{ top: 10, right: 15, left: -5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                <XAxis
                  dataKey="name"
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
                {/* Distinct Minimalist Semantic Colors:
                    AdaptiveHybrid: Soft Emerald (#10B981)
                    LRU: Muted Blue (#3B82F6)
                    LFU: Muted Purple (#8B5CF6)
                    FIFO: Muted Rose (#F43F5E)
                */}
                <Bar dataKey="FIFO" fill="#F43F5E" radius={[2, 2, 0, 0]} name="FIFO" />
                <Bar dataKey="LRU" fill="#3B82F6" radius={[2, 2, 0, 0]} name="LRU" />
                <Bar dataKey="LFU" fill="#8B5CF6" radius={[2, 2, 0, 0]} name="LFU" />
                <Bar dataKey="AdaptiveHybrid" fill="#10B981" radius={[2, 2, 0, 0]} name="AdaptiveHybrid" />
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
              <TrendingDown className="w-4 h-4 text-emerald-400" />
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
              <div className="text-xl font-bold font-mono text-emerald-400">{roiSummary.savedWrites}</div>
              <div className="text-[11px] font-mono text-zinc-400 mt-0.5">Disk write-backs prevented</div>
              <div className="text-[10px] text-zinc-600 mt-0.5">vs FIFO ({roiSummary.fifoDirty} writes)</div>
            </div>
            <div className="p-3 rounded-md bg-[#161616] text-center">
              <div className="text-xl font-bold font-mono text-emerald-400">{roiSummary.savedMs}ms</div>
              <div className="text-[11px] font-mono text-zinc-400 mt-0.5">I/O blocking time prevented</div>
              <div className="text-[10px] text-zinc-600 mt-0.5">{roiSummary.savedWrites} × 10ms / flush</div>
            </div>
            <div className="p-3 rounded-md bg-[#161616] text-center">
              <div className="text-xl font-bold font-mono text-emerald-400">{roiSummary.eatDiffMs}ms</div>
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
                {data.raw_results.map((row, idx) => {
                  const algoColor = ALGO_COLORS[row.algorithm] || '#FAFAFA';
                  return (
                    <tr
                      key={idx}
                      className="hover:bg-[#161616] transition-colors text-zinc-300"
                    >
                      <td className="py-2 px-2.5">{row.workload}</td>
                      <td className="py-2 px-2.5">
                        <span
                          className="font-semibold text-[11px]"
                          style={{ color: algoColor }}
                        >
                          {row.algorithm}
                        </span>
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono">
                        {(row.hit_ratio * 100).toFixed(1)}%
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono text-rose-400/90">{row.page_faults}</td>
                      <td className="py-2 px-2.5 text-right font-mono text-amber-400/90">{row.dirty_write_backs}</td>
                      <td className="py-2 px-2.5 text-right font-mono font-medium">
                        {((row.eat || 0) / 1e6).toFixed(2)} ms
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
