import type { Scorecard } from '../types';
import {
  Award,
  Volume2,
  Clock,
  PauseCircle,
  Activity,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface ScorecardViewProps {
  scorecard: Scorecard;
}

export const ScorecardView: React.FC<ScorecardViewProps> = ({ scorecard }) => {
  const { total_score, letter_grade, grade_title, percentile, pillars, radar_data, strengths, weaknesses } =
    scorecard;

  const gradeColors: Record<string, { bg: string; text: string; border: string; glow: string }> = {
    'A+': { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/40', glow: 'shadow-emerald-500/20' },
    A: { bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/40', glow: 'shadow-teal-500/20' },
    'B+': { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/40', glow: 'shadow-indigo-500/20' },
    B: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/40', glow: 'shadow-blue-500/20' },
    C: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/40', glow: 'shadow-amber-500/20' },
    D: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/40', glow: 'shadow-orange-500/20' },
    F: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/40', glow: 'shadow-rose-500/20' },
  };

  const currentGradeStyle = gradeColors[letter_grade] || gradeColors['B'];

  return (
    <div className="w-full space-y-4">
      {/* Top Banner: Master Score & Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Master Grade Card (5 cols) */}
        <div className="lg:col-span-5 bg-surface-card/90 rounded-2xl border border-border-subtle p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-44 h-44 bg-gradient-to-br from-indigo-500/10 to-transparent blur-2xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                <Award className="w-4 h-4 text-indigo-400" />
                <span>Competitive Forensics Scorecard</span>
              </span>
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-surface border border-border-subtle text-cyan-400 font-mono">
                {percentile}th Percentile
              </span>
            </div>

            <div className="mt-5 flex items-center space-x-5">
              {/* Circular / Badge Grade Display */}
              <div
                className={`w-24 h-24 rounded-2xl border-2 ${currentGradeStyle.border} ${currentGradeStyle.bg} flex flex-col items-center justify-center shadow-xl ${currentGradeStyle.glow} shrink-0`}
              >
                <span className={`text-4xl font-extrabold ${currentGradeStyle.text} tracking-tight font-sans`}>
                  {letter_grade}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">
                  Grade
                </span>
              </div>

              <div>
                <div className="flex items-baseline space-x-2">
                  <span className="text-3xl font-extrabold text-white font-mono tracking-tight">
                    {total_score}
                  </span>
                  <span className="text-sm font-semibold text-slate-400">/ 100 pts</span>
                </div>
                <h3 className="text-base font-bold text-white mt-1">
                  {grade_title}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Calibrated across 4 objective acoustic forensic dimensions.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Strengths / Weaknesses */}
          <div className="mt-5 pt-4 border-t border-border-subtle/80 space-y-2 text-xs">
            {strengths.slice(0, 1).map((s, idx) => (
              <div key={idx} className="flex items-start space-x-2 text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="line-clamp-2 leading-relaxed">{s}</span>
              </div>
            ))}
            {weaknesses.slice(0, 1).map((w, idx) => (
              <div key={idx} className="flex items-start space-x-2 text-slate-300">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span className="line-clamp-2 leading-relaxed">{w}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 4-Pillar Radar Chart (7 cols) */}
        <div className="lg:col-span-7 bg-surface-card/90 rounded-2xl border border-border-subtle p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Oratorical Balance Radar
            </h4>
            <div className="flex items-center space-x-3 text-xs">
              <span className="flex items-center space-x-1.5 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                <span>Gold Standard</span>
              </span>
              <span className="flex items-center space-x-1.5 text-indigo-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500 inline-block" />
                <span>Delivery</span>
              </span>
            </div>
          </div>

          <div className="w-full h-56">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radar_data} margin={{ top: 10, right: 25, bottom: 10, left: 25 }}>
                <PolarGrid stroke="#273148" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 25]}
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  stroke="#273148"
                />
                <Radar
                  name="Baseline Master"
                  dataKey="baseline"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
                <Radar
                  name="Current Delivery"
                  dataKey="score"
                  stroke="#6366f1"
                  fill="#6366f1"
                  fillOpacity={0.35}
                  strokeWidth={2}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111622',
                    borderColor: '#273148',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 4 Forensic Pillar Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Pillar 1: Vocal Variety */}
        <div className="bg-surface rounded-xl border border-border-subtle p-4 flex flex-col justify-between hover:border-slate-600 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Volume2 className="w-4 h-4" />
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  pillars.vocal_variety.score >= 19
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                }`}
              >
                {pillars.vocal_variety.status}
              </span>
            </div>
            <h5 className="font-semibold text-xs text-slate-300 uppercase tracking-wider">
              Vocal Variety
            </h5>
            <div className="flex items-baseline space-x-1.5 mt-1">
              <span className="text-2xl font-bold font-mono text-white">
                {pillars.vocal_variety.score}
              </span>
              <span className="text-xs text-slate-500 font-semibold">/ 25 pts</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2.5 pt-2.5 border-t border-border-subtle leading-relaxed">
            {pillars.vocal_variety.feedback}
          </p>
        </div>

        {/* Pillar 2: Pacing & Cadence */}
        <div className="bg-surface rounded-xl border border-border-subtle p-4 flex flex-col justify-between hover:border-slate-600 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Clock className="w-4 h-4" />
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  pillars.pacing_cadence.score >= 19
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                }`}
              >
                {pillars.pacing_cadence.status}
              </span>
            </div>
            <h5 className="font-semibold text-xs text-slate-300 uppercase tracking-wider">
              Pacing & Cadence
            </h5>
            <div className="flex items-baseline space-x-1.5 mt-1">
              <span className="text-2xl font-bold font-mono text-white">
                {pillars.pacing_cadence.score}
              </span>
              <span className="text-xs text-slate-500 font-semibold">/ 25 pts</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2.5 pt-2.5 border-t border-border-subtle leading-relaxed">
            {pillars.pacing_cadence.feedback}
          </p>
        </div>

        {/* Pillar 3: Dramatic Pauses */}
        <div className="bg-surface rounded-xl border border-border-subtle p-4 flex flex-col justify-between hover:border-slate-600 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <PauseCircle className="w-4 h-4" />
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  pillars.dramatic_pauses.score >= 19
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                }`}
              >
                {pillars.dramatic_pauses.status}
              </span>
            </div>
            <h5 className="font-semibold text-xs text-slate-300 uppercase tracking-wider">
              Dramatic Pauses
            </h5>
            <div className="flex items-baseline space-x-1.5 mt-1">
              <span className="text-2xl font-bold font-mono text-white">
                {pillars.dramatic_pauses.score}
              </span>
              <span className="text-xs text-slate-500 font-semibold">/ 25 pts</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2.5 pt-2.5 border-t border-border-subtle leading-relaxed">
            {pillars.dramatic_pauses.feedback}
          </p>
        </div>

        {/* Pillar 4: Energy & Dynamic Contrast */}
        <div className="bg-surface rounded-xl border border-border-subtle p-4 flex flex-col justify-between hover:border-slate-600 transition-colors">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Activity className="w-4 h-4" />
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  pillars.energy_dynamics.score >= 19
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                }`}
              >
                {pillars.energy_dynamics.status}
              </span>
            </div>
            <h5 className="font-semibold text-xs text-slate-300 uppercase tracking-wider">
              Energy & Dynamic Range
            </h5>
            <div className="flex items-baseline space-x-1.5 mt-1">
              <span className="text-2xl font-bold font-mono text-white">
                {pillars.energy_dynamics.score}
              </span>
              <span className="text-xs text-slate-500 font-semibold">/ 25 pts</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2.5 pt-2.5 border-t border-border-subtle leading-relaxed">
            {pillars.energy_dynamics.feedback}
          </p>
        </div>
      </div>
    </div>
  );
};
