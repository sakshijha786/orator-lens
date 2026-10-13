import type { PrescriptiveDrill } from '../types';
import { Dumbbell, Target, Clock, Zap, CheckCircle2 } from 'lucide-react';

interface PrescriptiveDrillsProps {
  drills: PrescriptiveDrill[];
}

export const PrescriptiveDrills: React.FC<PrescriptiveDrillsProps> = ({ drills }) => {
  return (
    <div className="bg-surface-card rounded-2xl border border-border-subtle p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
        <div className="flex items-center space-x-2">
          <Dumbbell className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
            Prescriptive Rehearsal Drills
          </h3>
          <span className="px-2 py-0.5 text-xs font-mono font-bold rounded-full bg-surface border border-border-subtle text-slate-300">
            {drills.length} Drills
          </span>
        </div>
        <span className="text-xs text-slate-400">
          Synthesized from acoustic divergence metrics
        </span>
      </div>

      {/* Grid of Drills */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {drills.map((drill) => (
          <div
            key={drill.id}
            className="bg-surface/80 rounded-xl border border-border-subtle p-4 flex flex-col justify-between hover:border-indigo-500/40 hover:bg-surface-elevated/40 transition-all"
          >
            <div>
              {/* Badges */}
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center space-x-1 text-[11px] font-semibold text-indigo-400">
                  <Target className="w-3 h-3" />
                  <span>{drill.target.split('&')[0].trim()}</span>
                </span>

                <div className="flex items-center space-x-2 text-[10px] font-mono text-slate-400">
                  <span className="flex items-center space-x-0.5">
                    <Clock className="w-2.5 h-2.5" />
                    <span>{drill.duration}</span>
                  </span>
                  <span className="flex items-center space-x-0.5 text-amber-400">
                    <Zap className="w-2.5 h-2.5" />
                    <span>{drill.intensity}</span>
                  </span>
                </div>
              </div>

              <h4 className="font-bold text-sm text-white mb-1.5">
                {drill.title}
              </h4>

              <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                {drill.objective}
              </p>

              {/* Steps list */}
              <div className="space-y-1.5 pt-2 border-t border-border-subtle/80">
                {drill.steps.map((step, idx) => (
                  <div key={idx} className="flex items-start space-x-2 text-[11px] text-slate-400">
                    <span className="w-4 h-4 rounded-full bg-surface-card text-indigo-400 flex items-center justify-center font-mono font-bold text-[9px] shrink-0 mt-0.5 border border-border-subtle">
                      {idx + 1}
                    </span>
                    <span className="leading-snug">{step}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border-subtle flex items-center justify-between text-[11px] text-emerald-400 font-medium">
              <span className="flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Daily Practice Recommended</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
