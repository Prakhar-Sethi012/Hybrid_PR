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
      <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl p-3 text-xs shadow-2xl font-mono">
        <div className="font-bold text-[var(--text-primary)] mb-1">Δt = {label}</div>
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
            <span className="text-[var(--text-secondary)]">S(p) =</span>
            <span className="font-bold text-[var(--text-primary)]">{entry.value.toFixed(4)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

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
    <div className="space-y-5">
      {/* Header */}
      <div className="pb-3 border-b border-[var(--border-default)]">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="p-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-default)]">
            <FlaskConical className="w-4 h-4 text-[var(--accent-hybrid)]" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)] tracking-tight font-sans">
              Formula Sandbox
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Interactive playground for the AdaptiveHybrid S(p) decay function and C(p) eviction cost
            </p>
          </div>
        </div>
      </div>

      {/* Formula Display */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl p-4">
        <div className="flex items-start gap-2 mb-3">
          <Info className="w-3.5 h-3.5 text-[var(--accent-hybrid)] mt-0.5 flex-shrink-0" />
          <div className="text-xs text-[var(--text-secondary)] font-mono space-y-1 leading-relaxed">
            <div>
              <span className="text-[var(--text-primary)] font-bold">S(p)</span> = S₀ · (½)^(λ · Δt)
              &nbsp;·&nbsp;
              <span className="text-[var(--text-tertiary)]">Decayed Hybrid Score (recency + frequency)</span>
            </div>
            <div>
              <span className="text-[var(--text-primary)] font-bold">C(p)</span> = S(p) + δ
              &nbsp;·&nbsp;
              <span className="text-[var(--text-tertiary)]">Eviction Cost (+ δ=2.0 if dirty page)</span>
            </div>
            <div>
              <span className="text-[var(--text-primary)] font-bold">λ=0:</span> pure frequency (LFU) &nbsp;|&nbsp;
              <span className="text-[var(--text-primary)] font-bold">λ=1:</span> pure recency (LRU)
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Controls */}
        <div className="lg:col-span-4 space-y-4">
          {/* Lambda Slider */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-bold text-[var(--text-primary)] font-mono uppercase tracking-wider">
                  λ (Lambda) — Recency Weight
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                  Controls decay rate: higher = faster forgetting
                </p>
              </div>
              <span className="text-xl font-black font-mono text-[var(--accent-hybrid)]">
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
              className="w-full"
              aria-label="Lambda value"
            />
            <div className="flex justify-between text-[10px] font-mono text-[var(--text-tertiary)] mt-1">
              <span>0.0 (Pure Freq/LFU)</span>
              <span>1.0 (Pure Recency/LRU)</span>
            </div>
          </div>

          {/* Page Age Slider */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-bold text-[var(--text-primary)] font-mono uppercase tracking-wider">
                  Δt — Page Age (Clock Ticks)
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                  Time since last reference
                </p>
              </div>
              <span className="text-xl font-black font-mono text-[var(--text-primary)]">
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
              className="w-full"
              aria-label="Delta t page age"
            />
            <div className="flex justify-between text-[10px] font-mono text-[var(--text-tertiary)] mt-1">
              <span>0 (Just accessed)</span>
              <span>50 (Very old)</span>
            </div>
          </div>

          {/* Initial Score Slider */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-xs font-bold text-[var(--text-primary)] font-mono uppercase tracking-wider">
                  S₀ — Initial Score
                </h3>
                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                  Accumulated LRU+LFU hybrid score
                </p>
              </div>
              <span className="text-xl font-black font-mono text-[var(--text-primary)]">
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
              className="w-full"
              aria-label="Initial score"
            />
            <div className="flex justify-between text-[10px] font-mono text-[var(--text-tertiary)] mt-1">
              <span>1.0 (New)</span>
              <span>20.0 (Frequently Used)</span>
            </div>
          </div>

          {/* C(p) Result Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl p-3 text-center">
              <span className="text-[10px] font-mono text-[var(--text-tertiary)] uppercase block mb-1">
                S(p) Decayed
              </span>
              <span className="text-2xl font-black font-mono text-[var(--text-primary)]">
                {currentScore.toFixed(3)}
              </span>
            </div>
            <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-3 text-center">
              <span className="text-[10px] font-mono text-[var(--text-tertiary)] uppercase block mb-1">
                C(p) Clean
              </span>
              <span className="text-2xl font-black font-mono text-emerald-400">
                {cpClean}
              </span>
            </div>
            <div className="col-span-2 bg-[#120B02] border border-amber-600/50 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-amber-400/70 uppercase block mb-0.5">
                    C(p) Dirty (+δ 2.0 penalty)
                  </span>
                  <span className="text-xs text-[var(--text-secondary)] font-mono">
                    {currentScore.toFixed(3)} + 2.0 = <strong className="text-amber-400">{cpDirty}</strong>
                  </span>
                </div>
                <span className="text-2xl font-black font-mono text-amber-400">
                  {cpDirty}
                </span>
              </div>
              <p className="text-[10px] text-amber-400/60 font-mono mt-1.5">
                Dirty pages are penalized heavily — AdaptiveHybrid avoids evicting them to minimize I/O
              </p>
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="lg:col-span-8 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-bold text-[var(--text-primary)] font-sans uppercase tracking-wider">
                S(p) Decay Curve — Live Preview
              </h3>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                λ={lambda.toFixed(2)}, S₀={initialScore.toFixed(1)}. Move sliders to see real-time updates.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-0.5 rounded bg-[var(--accent-hybrid)] inline-block" />
              <span className="text-[10px] text-[var(--text-secondary)] font-mono">S(p) decay</span>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={curveData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" strokeOpacity={0.5} />
              <XAxis
                dataKey="deltaT"
                tick={{ fontSize: 10, fontFamily: 'monospace', fill: 'var(--text-tertiary)' }}
                label={{ value: 'Δt (Clock Ticks)', position: 'insideBottom', offset: -2, fontSize: 10, fill: 'var(--text-secondary)' }}
                tickLine={false}
                axisLine={{ stroke: 'var(--border-default)' }}
              />
              <YAxis
                tick={{ fontSize: 10, fontFamily: 'monospace', fill: 'var(--text-tertiary)' }}
                tickLine={false}
                axisLine={false}
                width={45}
              />
              <Tooltip content={<CustomTooltip />} />

              {/* Reference line at current Δt */}
              <ReferenceLine
                x={currentDeltaT}
                stroke="var(--text-secondary)"
                strokeDasharray="4 2"
                label={{
                  value: `Δt=${currentDeltaT}`,
                  position: 'top',
                  fontSize: 10,
                  fill: 'var(--text-secondary)',
                  fontFamily: 'monospace',
                }}
              />

              <Line
                type="monotone"
                dataKey="score"
                stroke="var(--accent-hybrid)"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, fill: 'var(--accent-hybrid)', stroke: 'var(--bg-base)' }}
              />
            </LineChart>
          </ResponsiveContainer>

          {/* Interpretation panel */}
          <div className="mt-4 pt-3 border-t border-[var(--border-subtle)] grid grid-cols-3 gap-3 text-xs font-mono">
            <div className="text-center">
              <div className="text-[var(--text-tertiary)] text-[10px] uppercase tracking-wider mb-0.5">
                At Δt=0
              </div>
              <div className="font-bold text-[var(--text-primary)]">{initialScore.toFixed(3)}</div>
              <div className="text-[10px] text-[var(--text-tertiary)]">max score (just used)</div>
            </div>
            <div className="text-center border-x border-[var(--border-subtle)]">
              <div className="text-[var(--text-tertiary)] text-[10px] uppercase tracking-wider mb-0.5">
                Half-life (λ·Δt=1)
              </div>
              <div className="font-bold text-[var(--accent-hybrid)]">
                {lambda > 0 ? (1 / lambda).toFixed(1) : '∞'} ticks
              </div>
              <div className="text-[10px] text-[var(--text-tertiary)]">score halved here</div>
            </div>
            <div className="text-center">
              <div className="text-[var(--text-tertiary)] text-[10px] uppercase tracking-wider mb-0.5">
                At Δt=50
              </div>
              <div className="font-bold text-rose-400">
                {computeDecayedScore(initialScore, lambda, 50).toFixed(3)}
              </div>
              <div className="text-[10px] text-[var(--text-tertiary)]">aged-out score</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
