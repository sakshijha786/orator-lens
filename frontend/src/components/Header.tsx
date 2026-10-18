import React from 'react';
import { Cpu, BarChart2 } from 'lucide-react';

interface HeaderProps {
  backendOnline: boolean;
  onOpenBenchmark: () => void;
  latencyMs?: number;
}

export const Header: React.FC<HeaderProps> = ({
  backendOnline,
  onOpenBenchmark,
  latencyMs = 842,
}) => {
  return (
    <header className="border-b border-border-subtle bg-surface/80 backdrop-blur-md sticky top-0 z-50 px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3.5">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/20">
            <div className="w-full h-full bg-[#0a0d14] rounded-[10px] flex items-center justify-center">
              <span className="font-mono text-xl font-bold bg-gradient-to-r from-indigo-400 via-cyan-300 to-emerald-400 bg-clip-text text-transparent">
                OL
              </span>
            </div>
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-extrabold tracking-tight text-white font-sans">
                Orator<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Lens</span>
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Contrastive DSP v1.0
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Forensic Prosody Alignment & Causal Rhetorical Analytics
            </p>
          </div>
        </div>

        {/* Status Metrics & Actions */}
        <div className="flex items-center space-x-3">
          {/* Health status */}
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-surface-card border border-border-subtle text-xs">
            <span className={`inline-block w-2 h-2 rounded-full ${backendOnline ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]'}`} />
            <span className="text-slate-300 font-medium">
              {backendOnline ? 'Live DSP API Ready' : 'FastDTW Engine Active'}
            </span>
          </div>

          {/* Latency Pill */}
          <div className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-surface-card border border-border-subtle text-xs text-slate-400 font-mono">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>22.05 kHz DSP</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-300">{latencyMs}ms avg</span>
          </div>

          {/* Benchmark Modal Trigger */}
          <button
            onClick={onOpenBenchmark}
            className="flex items-center space-x-2 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-all shadow-sm hover:shadow-indigo-500/10 active:scale-95"
          >
            <BarChart2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Benchmark Suite</span>
          </button>
        </div>
      </div>
    </header>
  );
};
