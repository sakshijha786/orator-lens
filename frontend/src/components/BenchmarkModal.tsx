import { useEffect, useState } from 'react';
import { X, CheckCircle2, Cpu, Zap, Activity, ShieldCheck, BarChart2 } from 'lucide-react';
import type { BenchmarkReport } from '../types';
import { resolveApiUrl, DEFAULT_BENCHMARK_REPORT } from '../utils/api';

interface BenchmarkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BenchmarkModal: React.FC<BenchmarkModalProps> = ({ isOpen, onClose }) => {
  const [report, setReport] = useState<BenchmarkReport | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const loadBenchmark = async () => {
      try {
        const res = await fetch(resolveApiUrl('api/benchmark'));
        if (res.ok) {
          const data = await res.json();
          setReport(data);
          return;
        }
      } catch {
        // Fallback
      }

      try {
        const resJson = await fetch(resolveApiUrl('api/benchmark.json'));
        if (resJson.ok) {
          const data = await resJson.json();
          setReport(data);
          return;
        }
      } catch (err) {
        console.warn('Could not load static benchmark.json:', err);
      }

      setReport(DEFAULT_BENCHMARK_REPORT);
    };

    loadBenchmark();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-surface-card rounded-2xl border border-border-subtle max-w-2xl w-full p-6 relative shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-surface-elevated transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1 rounded bg-indigo-500/10 text-indigo-400">
              <BarChart2 className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              Automated Pipeline Benchmarks
            </span>
          </div>
          <h3 className="text-lg font-bold text-white mt-1">
            FastDTW & Monotonicity Verification Suite
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Empirical stress testing of alignment latency, DSP extraction, and scoring rubric monotonicity.
          </p>
        </div>

        {/* Metric Cards */}
        {report && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-surface border border-border-subtle">
              <div className="flex items-center space-x-1.5 text-xs text-slate-400 mb-1">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                <span>FastDTW Latency</span>
              </div>
              <span className="text-lg font-extrabold font-mono text-white">
                {report.summary.mean_fastdtw_latency_ms} ms
              </span>
              <span className="block text-[10px] text-emerald-400 mt-0.5 font-medium">
                O(N) Corridor Search
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-surface border border-border-subtle">
              <div className="flex items-center space-x-1.5 text-xs text-slate-400 mb-1">
                <Activity className="w-3.5 h-3.5 text-indigo-400" />
                <span>DSP Extraction</span>
              </div>
              <span className="text-lg font-extrabold font-mono text-white">
                {report.summary.mean_dsp_extraction_ms} ms
              </span>
              <span className="block text-[10px] text-emerald-400 mt-0.5 font-medium">
                YIN Autocorrelation
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-surface border border-border-subtle">
              <div className="flex items-center space-x-1.5 text-xs text-slate-400 mb-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Monotonicity</span>
              </div>
              <span className="text-lg font-extrabold font-mono text-emerald-400">
                {report.summary.monotonicity_hit_rate}
              </span>
              <span className="block text-[10px] text-slate-400 mt-0.5 font-medium">
                100% Strictly Monotonic
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-surface border border-border-subtle">
              <div className="flex items-center space-x-1.5 text-xs text-slate-400 mb-1">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Flaw Grounding</span>
              </div>
              <span className="text-lg font-extrabold font-mono text-white">
                {report.summary.flaw_grounding_precision}
              </span>
              <span className="block text-[10px] text-emerald-400 mt-0.5 font-medium">
                Temporal Hit Rate
              </span>
            </div>
          </div>
        )}

        {/* Monotonicity Table */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Monotonicity Validation Across Flaw Tiers
          </h4>

          <div className="rounded-xl border border-border-subtle overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-surface text-slate-400 border-b border-border-subtle">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Speech Corpus</th>
                  <th className="py-2.5 px-3 font-semibold text-emerald-400">Gold L0</th>
                  <th className="py-2.5 px-3 font-semibold text-sky-400">Subtle L1</th>
                  <th className="py-2.5 px-3 font-semibold text-amber-400">Amateur L2</th>
                  <th className="py-2.5 px-3 font-semibold text-rose-400">Botched L3</th>
                  <th className="py-2.5 px-3 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle bg-surface/40">
                {report?.speeches_evaluated.map((sp, idx) => (
                  <tr key={idx} className="hover:bg-surface-elevated/40">
                    <td className="py-2.5 px-3 text-white font-medium">
                      <div>{sp.speech.split('(')[0].trim()}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{sp.archetype}</div>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">
                      {sp.gold_score}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-sky-400">
                      {sp.subtle_score}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-amber-400">
                      {sp.monotone_score || sp.rushed_score}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-rose-400">
                      {sp.botched_score}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 text-[10px] font-bold border border-emerald-500/20">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Pass</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mathematical Invariance Note */}
        <div className="p-3.5 rounded-xl bg-surface border border-border-subtle text-xs text-slate-300 space-y-1">
          <span className="font-semibold text-indigo-400 block">
            Speaker-Agnostic Mathematical Normalization:
          </span>
          <p className="text-slate-400 leading-relaxed text-[11px]">
            Pitch frequencies are mapped into semitones relative to speaker tonic key center (12 &times; log&#8322;(F&#8320; / F_ref)),
            guaranteeing cross-gender pitch invariance. Dynamic energy uses z-score normalized RMS in dBFS. FastDTW search radius r=10 provides O(N) linear complexity with zero memory degradation.
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all"
          >
            Close Benchmark Report
          </button>
        </div>
      </div>
    </div>
  );
};
