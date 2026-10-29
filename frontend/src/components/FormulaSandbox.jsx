import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { FlaskConical, Info } from 'lucide-react';

// S(p) = score * (1/2)^(lambda * deltaT)
function computeDecayedScore(score, lambda, deltaT) {
  if (lambda <= 0 || deltaT <= 0) return score;
  const power = lambda * deltaT;
  if (power > 700) return 0;
  return score * Math.pow(0.5, power);
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#161616] rounded-md p-2.5 text-xs font-mono shadow-2xl">
        <div className="font-bold text-zinc-200 mb-1">Δt = {label}</div>
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-1.5 text-zinc-400">
            <span>S(p) =</span>
            <span className="font-bold text-zinc-100">{entry.value.toFixed(4)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

/**
 * FormulaSandbox (Tab 4: Formula Sandbox)
 * Minimalist, border-free interactive playground for the AdaptiveHybrid score decay and C(p) math.
 */
export default function FormulaSandbox() {
  const [lambda, setLambda] = useState(0.5);
  const [initialScore, setInitialScore] = useState(5.0);
  const [currentDeltaT, setCurrentDeltaT] = useState(10);

  // Generate curve data: S(p) vs Δt (0 to 50)
  const curveData = useMemo(() => {
    const points = [];
    for (let dt = 0; dt <= 50; dt += 0.5) {
      points.push({
        deltaT: parseFloat(dt.toFixed(1)),
        score: parseFloat(computeDecayedScore(initialScore, lambda, dt).toFixed(6)),
      });
    }
    return points;
  }, [lambda, initialScore]);

  // Current value on curve
  const currentScore = useMemo(
    () => computeDecayedScore(initialScore, lambda, currentDeltaT),
    [lambda, initialScore, currentDeltaT]
  );

  // C(p) with dirty penalty
  const dirtyPenalty = 2.0;
  const cpClean = parseFloat(currentScore.toFixed(4));
  const cpDirty = parseFloat((currentScore + dirtyPenalty).toFixed(4));

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="bg-[#111111] rounded-lg p-4">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="p-1.5 rounded bg-zinc-900 text-zinc-300">
            <FlaskConical className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-100 tracking-tight font-sans">
              Formula Sandbox
            </h2>
            <p className="text-[11px] text-zinc-500 font-mono">
              Interactive playground for S(p) score decay and C(p) dirty eviction penalty
            </p>
          </div>
        </div>

        {/* Formula breakdown */}
        <div className="bg-[#161616] rounded p-3 text-xs font-mono text-zinc-400 space-y-1">
          <div>
            <span className="text-zinc-100 font-bold">S(p) = S₀ · (½)^(λ · Δt)</span>
            <span className="text-zinc-500 ml-2">Decayed score (recency + frequency)</span>
          </div>
          <div>
            <span className="text-zinc-100 font-bold">C(p) = S(p) + (δ if dirty else 0)</span>
            <span className="text-zinc-500 ml-2">Eviction cost with +δ=2.0 dirty write penalty</span>
          </div>
          <div className="text-[11px] text-zinc-500 pt-0.5">
            λ=0: pure frequency (LFU) · λ=1: pure recency (LRU)
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Controls Column */}
        <div className="lg:col-span-4 space-y-3">
          {/* Lambda Slider */}
          <div className="bg-[#111111] rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-xs font-semibold text-zinc-200 font-sans">
                  λ (Lambda) — Recency Weight
                </h3>
                <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                  Controls decay rate (0 = LFU, 1 = LRU)
                </p>
              </div>
              <span className="text-lg font-bold font-mono text-zinc-100">
                {lambda.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={lambda}
              onChange={(e) => setLambda(parseFloat(e.target.value))}
              className="w-full cursor-pointer h-1.5 bg-zinc-800 rounded-lg appearance-none accent-zinc-200"
              aria-label="Lambda value"
            />
            <div className="flex justify-between text-[10px] font-mono text-zinc-500 mt-1">
              <span>0.0 (Pure LFU)</span>
              <span>1.0 (Pure LRU)</span>
            </div>
          </div>

          {/* Page Age Slider */}
          <div className="bg-[#111111] rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-xs font-semibold text-zinc-200 font-sans">
                  Δt — Page Age (Ticks)
                </h3>
                <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                  Clock ticks since last reference
                </p>
              </div>
              <span className="text-lg font-bold font-mono text-zinc-100">
                {currentDeltaT}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              step="1"
              value={currentDeltaT}
              onChange={(e) => setCurrentDeltaT(parseInt(e.target.value))}
              className="w-full cursor-pointer h-1.5 bg-zinc-800 rounded-lg appearance-none accent-zinc-200"
              aria-label="Delta t page age"
            />
            <div className="flex justify-between text-[10px] font-mono text-zinc-500 mt-1">
              <span>0 (Fresh)</span>
              <span>50 (Cold)</span>
            </div>
          </div>

          {/* Initial Score Slider */}
          <div className="bg-[#111111] rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-xs font-semibold text-zinc-200 font-sans">
                  S₀ — Base Score
                </h3>
                <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
                  Accumulated frequency score
                </p>
              </div>
              <span className="text-lg font-bold font-mono text-zinc-100">
                {initialScore.toFixed(1)}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="20"
              step="0.5"
              value={initialScore}
              onChange={(e) => setInitialScore(parseFloat(e.target.value))}
              className="w-full cursor-pointer h-1.5 bg-zinc-800 rounded-lg appearance-none accent-zinc-200"
              aria-label="Initial score"
            />
            <div className="flex justify-between text-[10px] font-mono text-zinc-500 mt-1">
              <span>1.0 (Low)</span>
              <span>20.0 (High)</span>
            </div>
          </div>

          {/* C(p) Output Cards */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[#111111] rounded-lg p-3 text-center">
              <span className="text-[10px] font-mono text-zinc-500 uppercase block mb-0.5">
                Live S(p)
              </span>
              <span className="text-xl font-bold font-mono text-zinc-100">
                {currentScore.toFixed(3)}
              </span>
            </div>
            <div className="bg-[#111111] rounded-lg p-3 text-center">
              <span className="text-[10px] font-mono text-zinc-500 uppercase block mb-0.5">
                C(p) Clean
              </span>
              <span className="text-xl font-bold font-mono text-zinc-100">
                {cpClean}
              </span>
            </div>
            <div className="col-span-2 bg-[#14120A] rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-amber-400 uppercase block mb-0.5">
                    C(p) Dirty (+δ 2.0 penalty)
                  </span>
                  <span className="text-xs text-zinc-400 font-mono">
                    {currentScore.toFixed(3)} + 2.0 = <strong className="text-amber-400">{cpDirty}</strong>
                  </span>
                </div>
                <span className="text-xl font-bold font-mono text-amber-400">
                  {cpDirty}
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 font-mono mt-1">
                Dirty pages have higher eviction cost to prevent costly disk write-backs.
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic Chart Column */}
        <div className="lg:col-span-8 bg-[#111111] rounded-lg p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 text-xs font-mono">
              <div>
                <h3 className="font-semibold text-zinc-200 font-sans">
                  Live S(p) Decay Curve
                </h3>
                <p className="text-[10px] text-zinc-500">
                  λ={lambda.toFixed(2)}, S₀={initialScore.toFixed(1)}
                </p>
              </div>
              <span className="text-[10px] text-zinc-500">
                Score vs Δt
              </span>
            </div>

            <ResponsiveContainer width="100%" height={290}>
              <LineChart data={curveData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis
                  dataKey="deltaT"
                  tick={{ fontSize: 10, fontFamily: 'monospace', fill: '#666' }}
                  tickLine={false}
                  axisLine={{ stroke: '#333' }}
                />
                <YAxis
                  tick={{ fontSize: 10, fontFamily: 'monospace', fill: '#666' }}
                  tickLine={false}
                  axisLine={false}
                  width={35}
                />
                <Tooltip content={<CustomTooltip />} />

                <ReferenceLine
                  x={currentDeltaT}
                  stroke="#888"
                  strokeDasharray="3 3"
                  label={{
                    value: `Δt=${currentDeltaT}`,
                    position: 'top',
                    fontSize: 10,
                    fill: '#aaa',
                    fontFamily: 'monospace',
                  }}
                />

                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#E4E4E7"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: '#FFFFFF', stroke: '#111111' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Quick Metrics Strip */}
          <div className="mt-3 pt-2.5 border-t border-zinc-900 grid grid-cols-3 gap-2 text-center text-xs font-mono">
            <div>
              <div className="text-zinc-500 text-[10px] uppercase mb-0.5">At Δt=0</div>
              <div className="font-bold text-zinc-200">{initialScore.toFixed(3)}</div>
            </div>
            <div>
              <div className="text-zinc-500 text-[10px] uppercase mb-0.5">Half-life</div>
              <div className="font-bold text-zinc-200">
                {lambda > 0 ? (1 / lambda).toFixed(1) : '∞'} ticks
              </div>
            </div>
            <div>
              <div className="text-zinc-500 text-[10px] uppercase mb-0.5">At Δt=50</div>
              <div className="font-bold text-zinc-200">
                {computeDecayedScore(initialScore, lambda, 50).toFixed(3)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
