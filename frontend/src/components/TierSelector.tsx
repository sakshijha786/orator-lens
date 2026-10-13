import { ShieldCheck, AlertCircle, AlertTriangle, XCircle, Mic } from 'lucide-react';
import type { SpeechCorpus } from '../types';

interface TierSelectorProps {
  selectedSpeech: SpeechCorpus | null;
  selectedTier: string;
  onSelectTier: (tier: string) => void;
  onOpenCustomUpload: () => void;
  isLoading: boolean;
}

export const TierSelector: React.FC<TierSelectorProps> = ({
  selectedSpeech,
  selectedTier,
  onSelectTier,
  onOpenCustomUpload,
  isLoading,
}) => {
  if (!selectedSpeech) return null;

  const availableFiles = selectedSpeech.audio_files;

  const tierMeta: Record<
    string,
    {
      title: string;
      tierNumber: string;
      desc: string;
      icon: any;
      color: string;
      badgeColor: string;
    }
  > = {
    gold_baseline: {
      title: 'Gold Baseline',
      tierNumber: 'Level 0',
      desc: 'Pristine orator delivery. Melodic pitch inflection, rhetorical timing, and wide dynamic contrast.',
      icon: ShieldCheck,
      color: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    },
    flawed_lvl1_subtle: {
      title: 'Subtle Flaw',
      tierNumber: 'Level 1',
      desc: '0.85x pitch variance compression and minor boundary cadence rushing.',
      icon: AlertCircle,
      color: 'border-sky-500/40 text-sky-400 bg-sky-500/10',
      badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
    },
    flawed_lvl2_monotone: {
      title: 'Amateur (Monotone)',
      tierNumber: 'Level 2',
      desc: 'Severe flat pitch (0.35x variance) on high-emphasis climax words and clipped dramatic pauses (<120ms).',
      icon: AlertTriangle,
      color: 'border-amber-500/40 text-amber-400 bg-amber-500/10',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
    flawed_lvl2_rushed: {
      title: 'Amateur (Rushed)',
      tierNumber: 'Level 2',
      desc: 'Speech tempo accelerated to >195 WPM, flattening rhetorical suspense.',
      icon: AlertTriangle,
      color: 'border-amber-500/40 text-amber-400 bg-amber-500/10',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
    flawed_lvl3_botched: {
      title: 'Botched Delivery',
      tierNumber: 'Level 3',
      desc: 'Robotic flatline prosody (std F0 ~ 0), erratic volume spikes, and 3.6s cognitive stall pauses.',
      icon: XCircle,
      color: 'border-rose-500/40 text-rose-400 bg-rose-500/10',
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    },
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            Contrastive Delivery Gradient
          </h2>
        </div>
        <button
          onClick={onOpenCustomUpload}
          className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-all hover:scale-[1.02] active:scale-95"
        >
          <Mic className="w-3.5 h-3.5 text-indigo-400" />
          <span>Upload / Record Delivery</span>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {availableFiles.map((file) => {
          const key = file.tier_key;
          const meta = tierMeta[key] || {
            title: key.replace('flawed_', '').replace(/_/g, ' '),
            tierNumber: 'Tier',
            desc: 'Synthesized prosody gradient speech.',
            icon: AlertTriangle,
            color: 'border-slate-500 text-slate-300 bg-slate-500/10',
            badgeColor: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
          };

          const IconComponent = meta.icon;
          const isSelected = selectedTier === key;

          return (
            <button
              key={key}
              disabled={isLoading}
              onClick={() => onSelectTier(key)}
              className={`p-3.5 rounded-xl border text-left transition-all duration-200 relative group flex flex-col justify-between ${
                isSelected
                  ? 'bg-surface-elevated border-indigo-400 shadow-md ring-1 ring-indigo-500/50'
                  : 'bg-surface/50 border-border-subtle hover:bg-surface-elevated/40 hover:border-slate-600'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${meta.badgeColor}`}
                  >
                    {meta.tierNumber}
                  </span>
                  <IconComponent
                    className={`w-4 h-4 ${
                      isSelected ? 'text-indigo-400' : 'text-slate-500'
                    }`}
                  />
                </div>

                <h4 className="font-semibold text-sm text-white group-hover:text-indigo-300 transition-colors">
                  {meta.title}
                </h4>

                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {meta.desc}
                </p>
              </div>

              {isSelected && (
                <div className="mt-2.5 pt-2 border-t border-border-subtle flex items-center justify-between text-[11px] text-indigo-400 font-medium">
                  <span>Evaluating Tier</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
