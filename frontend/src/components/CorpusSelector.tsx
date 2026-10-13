import type { SpeechCorpus } from '../types';
import { Quote, Sparkles, Bookmark } from 'lucide-react';

interface CorpusSelectorProps {
  speeches: SpeechCorpus[];
  selectedId: string;
  onSelectSpeech: (id: string) => void;
  isLoading: boolean;
}

export const CorpusSelector: React.FC<CorpusSelectorProps> = ({
  speeches,
  selectedId,
  onSelectSpeech,
  isLoading,
}) => {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Bookmark className="w-4 h-4 text-indigo-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            Gold Standard Oratorical Corpus
          </h2>
        </div>
        <span className="text-xs text-slate-400">
          Select historical master reference
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {speeches.map((sp) => {
          const isSelected = sp.id === selectedId;
          const avatarColors: Record<string, string> = {
            jobs_commencement: "from-sky-500 to-indigo-600 border-sky-400/40",
            thunberg_summit: "from-emerald-500 to-teal-600 border-emerald-400/40",
            churchill_beaches: "from-amber-500 to-orange-600 border-amber-400/40",
          };
          const colorClass = avatarColors[sp.id] || "from-indigo-500 to-purple-600 border-indigo-400/40";

          return (
            <button
              key={sp.id}
              disabled={isLoading}
              onClick={() => onSelectSpeech(sp.id)}
              className={`text-left p-4 rounded-xl border transition-all duration-200 relative group overflow-hidden ${
                isSelected
                  ? 'bg-surface-elevated/90 border-indigo-500 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/50'
                  : 'bg-surface/60 border-border-subtle hover:border-slate-600 hover:bg-surface-elevated/40'
              }`}
            >
              {isSelected && (
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 blur-xl rounded-full pointer-events-none" />
              )}

              <div className="flex items-start space-x-3">
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center text-white font-bold text-sm shadow-md shrink-0 border`}
                >
                  {sp.speaker.split(' ').map((n) => n[0]).join('')}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400">
                      {sp.speaker}
                    </span>
                    {isSelected && (
                      <span className="flex items-center space-x-1 text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>Active</span>
                      </span>
                    )}
                  </div>

                  <h3 className="font-semibold text-sm text-white truncate mt-0.5 group-hover:text-indigo-300 transition-colors">
                    {sp.title.split('(')[0].trim()}
                  </h3>

                  <p className="text-[11px] font-medium text-cyan-400/90 mt-1 truncate">
                    {sp.rhetoric_type}
                  </p>
                </div>
              </div>

              {/* Quote snippet */}
              <div className="mt-3 pt-2.5 border-t border-border-subtle/70 flex items-start space-x-1.5 text-xs text-slate-400 italic line-clamp-2">
                <Quote className="w-3 h-3 text-slate-500 shrink-0 mt-0.5" />
                <span>"{sp.transcript}"</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
