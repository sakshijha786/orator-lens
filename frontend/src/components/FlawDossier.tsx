import {
  AlertTriangle,
  Compass,
  Sparkles,
  PlayCircle,
  FileText,
  VolumeX,
  FastForward,
} from 'lucide-react';
import type { FlawCard } from '../types';

interface FlawDossierProps {
  flaws: FlawCard[];
  onSeekToFlaw: (startSec: number) => void;
}

export const FlawDossier: React.FC<FlawDossierProps> = ({ flaws, onSeekToFlaw }) => {
  const getCategoryIcon = (cat: string) => {
    if (cat.includes('MONOTONE')) return VolumeX;
    if (cat.includes('RUSHED')) return FastForward;
    return AlertTriangle;
  };

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return {
          badge: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
          border: 'border-rose-500/30',
          dot: 'bg-rose-500',
        };
      case 'MAJOR':
        return {
          badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
          border: 'border-amber-500/30',
          dot: 'bg-amber-500',
        };
      default:
        return {
          badge: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
          border: 'border-sky-500/30',
          dot: 'bg-sky-400',
        };
    }
  };

  return (
    <div className="bg-surface-card rounded-2xl border border-border-subtle p-5 space-y-4">
      {/* Dossier Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
        <div className="flex items-center space-x-2">
          <Compass className="w-4 h-4 text-rose-400" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-white">
            Grounded Temporal Flaw Dossier
          </h3>
          <span className="px-2 py-0.5 text-xs font-mono font-bold rounded-full bg-surface border border-border-subtle text-slate-300">
            {flaws.length} {flaws.length === 1 ? 'Anomaly' : 'Anomalies'} Detected
          </span>
        </div>
        <span className="text-xs text-slate-400 hidden sm:inline">
          Click any flaw to scrub audio playhead
        </span>
      </div>

      {/* Flaws List */}
      {flaws.length === 0 ? (
        <div className="text-center py-10 px-4 rounded-xl bg-surface/50 border border-border-subtle">
          <Sparkles className="w-8 h-8 text-emerald-400 mx-auto mb-2 animate-bounce" />
          <h4 className="text-sm font-bold text-white">
            Flawless Prosody Grounding
          </h4>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            No acoustic excursions exceeded the adaptive statistical divergence threshold.
            The candidate delivery aligns seamlessly with master orator standards!
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {flaws.map((flaw) => {
            const Icon = getCategoryIcon(flaw.category);
            const sevStyle = getSeverityStyle(flaw.severity);

            return (
              <div
                key={flaw.id}
                className={`bg-surface/80 rounded-xl border ${sevStyle.border} p-4 transition-all hover:bg-surface-elevated/70 group`}
              >
                {/* Flaw Header Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center space-x-2">
                    <span className={`w-2 h-2 rounded-full ${sevStyle.dot}`} />
                    <span className="font-mono text-xs font-bold text-slate-300">
                      {flaw.id}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${sevStyle.badge}`}
                    >
                      {flaw.severity}
                    </span>
                    <span className="text-xs font-semibold text-white flex items-center space-x-1">
                      <Icon className="w-3.5 h-3.5 text-slate-400" />
                      <span>{flaw.category.replace(/_/g, ' ')}</span>
                    </span>
                  </div>

                  {/* Timestamp & Jump Button */}
                  <button
                    onClick={() => onSeekToFlaw(flaw.start_sec)}
                    className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-surface-elevated hover:bg-indigo-600/30 text-indigo-300 border border-border-subtle hover:border-indigo-500/40 text-xs font-mono transition-all active:scale-95 group-hover:border-indigo-500/50"
                  >
                    <PlayCircle className="w-3.5 h-3.5 text-indigo-400" />
                    <span>
                      {flaw.start_sec}s - {flaw.end_sec}s ({flaw.duration_sec}s)
                    </span>
                  </button>
                </div>

                {/* Spoken Text Excerpt */}
                {flaw.text_segment && (
                  <div className="mb-2.5 px-3 py-1.5 rounded-lg bg-surface border border-border-subtle/70 text-xs text-slate-200 italic flex items-center space-x-2">
                    <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>
                      Rhetorical excerpt: <strong className="text-amber-300 not-italic">"{flaw.text_segment}"</strong>
                    </span>
                  </div>
                )}

                {/* Causal Rationale */}
                <p className="text-xs text-slate-300 leading-relaxed">
                  {flaw.explanation}
                </p>

                {/* Prescriptive Coaching Directive */}
                <div className="mt-3 pt-2.5 border-t border-border-subtle/80 flex items-start space-x-2 text-xs text-emerald-400/95 bg-emerald-500/5 -mx-4 -mb-4 px-4 py-3 rounded-b-xl border-b border-x border-emerald-500/15">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold uppercase tracking-wider text-[10px] text-emerald-300 block mb-0.5">
                      Orator Prescriptive Directive
                    </span>
                    <span className="text-slate-200">
                      {flaw.coaching_directive}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
