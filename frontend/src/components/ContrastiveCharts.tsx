import { useState } from 'react';
import type { TimeSeriesPoint } from '../types';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Music, Activity, Gauge, Flame } from 'lucide-react';

interface ContrastiveChartsProps {
  timeSeries: TimeSeriesPoint[];
}

export const ContrastiveCharts: React.FC<ContrastiveChartsProps> = ({ timeSeries }) => {
  const [activeTab, setActiveTab] = useState<'pitch' | 'energy' | 'wpm' | 'divergence'>('pitch');

  const tabs = [
    { id: 'pitch', label: 'Pitch Inflection', unit: 'Semitones (st)', icon: Music },
    { id: 'energy', label: 'Dynamic Energy', unit: 'dBFS', icon: Activity },
    { id: 'wpm', label: 'Cadence & Tempo', unit: 'WPM', icon: Gauge },
    { id: 'divergence', label: 'Acoustic Divergence', unit: 'Δ Composite', icon: Flame },
  ] as const;

  const currentTabInfo = tabs.find((t) => t.id === activeTab) || tabs[0];
  const thresholdVal = timeSeries.length > 0 ? timeSeries[0].threshold : 2.5;

  return (
    <div className="bg-surface-card rounded-2xl border border-border-subtle p-5 space-y-4">
      {/* Tab Switcher Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border-subtle">
        <div className="flex items-center space-x-2">
          <currentTabInfo.icon className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
            Contrastive Acoustic Contours Studio
          </h3>
          <span className="text-xs text-slate-400 hidden sm:inline font-mono">
            ({currentTabInfo.unit})
          </span>
        </div>

        <div className="flex items-center bg-surface p-1 rounded-xl border border-border-subtle">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-surface-elevated'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Chart Visualizer */}
      <div className="w-full h-72">
        <ResponsiveContainer width="100%" height="100%">
          {activeTab === 'divergence' ? (
            <AreaChart data={timeSeries} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="divGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2739" />
              <XAxis
                dataKey="time"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickFormatter={(val) => `${val}s`}
              />
              <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f1420',
                  borderColor: '#263147',
                  borderRadius: '10px',
                  fontSize: '12px',
                }}
              />
              <ReferenceLine
                y={thresholdVal}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                label={{
                  value: `Adaptive Threshold (μ + 1.8σ) = ${thresholdVal}`,
                  fill: '#f59e0b',
                  fontSize: 11,
                  position: 'top',
                }}
              />
              <Area
                type="monotone"
                dataKey="divergence"
                name="Acoustic Divergence Δ(t)"
                stroke="#f43f5e"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#divGradient)"
              />
            </AreaChart>
          ) : (
            <LineChart data={timeSeries} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2739" />
              <XAxis
                dataKey="time"
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickFormatter={(val) => `${val}s`}
              />
              <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f1420',
                  borderColor: '#263147',
                  borderRadius: '10px',
                  fontSize: '12px',
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                iconType="plainline"
              />

              {activeTab === 'pitch' && (
                <>
                  <Line
                    type="monotone"
                    dataKey="gold_pitch"
                    name="Gold Baseline (Semitones)"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="candidate_pitch"
                    name="Candidate Warped (Semitones)"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    dot={false}
                  />
                </>
              )}

              {activeTab === 'energy' && (
                <>
                  <Line
                    type="monotone"
                    dataKey="gold_energy"
                    name="Gold RMS Energy (dBFS)"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="candidate_energy"
                    name="Candidate RMS Energy (dBFS)"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    dot={false}
                  />
                </>
              )}

              {activeTab === 'wpm' && (
                <>
                  <Line
                    type="monotone"
                    dataKey="gold_wpm"
                    name="Gold Baseline (WPM)"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="candidate_wpm"
                    name="Candidate Tempo (WPM)"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    dot={false}
                  />
                </>
              )}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
