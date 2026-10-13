import { useEffect, useState } from 'react';
import type { SpeechCorpus, AnalysisResponse } from './types';
import { Header } from './components/Header';
import { CorpusSelector } from './components/CorpusSelector';
import { TierSelector } from './components/TierSelector';
import { ScorecardView } from './components/ScorecardView';
import { DualAudioWaveform } from './components/DualAudioWaveform';
import { ContrastiveCharts } from './components/ContrastiveCharts';
import { FlawDossier } from './components/FlawDossier';
import { PrescriptiveDrills } from './components/PrescriptiveDrills';
import { CustomUploadModal } from './components/CustomUploadModal';
import { BenchmarkModal } from './components/BenchmarkModal';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';

export function App() {
  const [speeches, setSpeeches] = useState<SpeechCorpus[]>([]);
  const [selectedSpeechId, setSelectedSpeechId] = useState<string>('jobs_commencement');
  const [selectedTier, setSelectedTier] = useState<string>('flawed_lvl2_monotone');

  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [isLoadingSpeeches, setIsLoadingSpeeches] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [backendOnline, setBackendOnline] = useState(false);

  const [seekTimestamp, setSeekTimestamp] = useState<number | null>(null);
  const [isBenchmarkOpen, setIsBenchmarkOpen] = useState(false);
  const [isCustomUploadOpen, setIsCustomUploadOpen] = useState(false);

  // 1. Fetch available speeches from backend
  useEffect(() => {
    fetchSpeeches();
  }, []);

  const fetchSpeeches = async () => {
    setIsLoadingSpeeches(true);
    try {
      const res = await fetch('/api/speeches');
      if (!res.ok) throw new Error('Failed to load speeches');
      const data = await res.json();
      setSpeeches(data.speeches || []);
      setBackendOnline(true);

      if (data.speeches && data.speeches.length > 0) {
        const first = data.speeches[0];
        setSelectedSpeechId(first.id);
        const secondTier = first.audio_files.find((f: any) => f.tier_key.includes('lvl2')) || first.audio_files[0];
        setSelectedTier(secondTier.tier_key);
      }
    } catch (err) {
      console.error('Error fetching speeches:', err);
      setBackendOnline(false);
    } finally {
      setIsLoadingSpeeches(false);
    }
  };

  // 2. Run analysis when speech or tier changes
  useEffect(() => {
    if (!selectedSpeechId || !selectedTier) return;
    runAnalysis(selectedSpeechId, selectedTier);
  }, [selectedSpeechId, selectedTier]);

  const runAnalysis = async (speechId: string, tier: string) => {
    setIsAnalyzing(true);
    setSeekTimestamp(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speech_id: speechId, candidate_tier: tier }),
      });
      if (!res.ok) throw new Error('Analysis request failed');
      const data: AnalysisResponse = await res.json();
      setAnalysis(data);
    } catch (err) {
      console.error('Analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 3. Handle custom upload analysis
  const handleAnalyzeCustom = async (speechId: string, file: File | Blob) => {
    setIsAnalyzing(true);
    const formData = new FormData();
    formData.append('speech_id', speechId);
    formData.append('audio_file', file, 'candidate_delivery.wav');

    try {
      const res = await fetch('/api/analyze-custom', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Custom upload analysis failed');
      const data: AnalysisResponse = await res.json();
      setAnalysis(data);
    } catch (err) {
      console.error('Custom analysis error:', err);
      alert('Custom audio analysis failed. Please verify format.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const currentSpeech = speeches.find((s) => s.id === selectedSpeechId) || null;

  return (
    <div className="min-h-screen bg-[#0a0d14] text-slate-100 flex flex-col font-sans">
      {/* Global Header */}
      <Header
        backendOnline={backendOnline}
        onOpenBenchmark={() => setIsBenchmarkOpen(true)}
        latencyMs={analysis?.latency.total_pipeline_ms ? Math.round(analysis.latency.total_pipeline_ms) : 842}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Backend offline warning banner if unreachable */}
        {!backendOnline && !isLoadingSpeeches && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-xs text-rose-300">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>
                Backend server is connecting or offline. Ensure FastAPI server is running on port 8000.
              </span>
            </div>
            <button
              onClick={fetchSpeeches}
              className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-200 border border-rose-500/30"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* 1. Historical Corpus Selector */}
        <section>
          <CorpusSelector
            speeches={speeches}
            selectedId={selectedSpeechId}
            onSelectSpeech={(id) => {
              setSelectedSpeechId(id);
              const sp = speeches.find((s) => s.id === id);
              if (sp && sp.audio_files.length > 0) {
                const defTier = sp.audio_files.find((f) => f.tier_key.includes('lvl2')) || sp.audio_files[0];
                setSelectedTier(defTier.tier_key);
              }
            }}
            isLoading={isAnalyzing}
          />
        </section>

        {/* 2. Contrastive Tier Controller */}
        <section>
          <TierSelector
            selectedSpeech={currentSpeech}
            selectedTier={selectedTier}
            onSelectTier={(tier) => setSelectedTier(tier)}
            onOpenCustomUpload={() => setIsCustomUploadOpen(true)}
            isLoading={isAnalyzing}
          />
        </section>

        {/* Loading Overlay State */}
        {isAnalyzing && (
          <div className="p-8 rounded-2xl bg-surface-card/60 border border-border-subtle flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
            <div className="text-center">
              <h4 className="text-sm font-bold text-white">
                Computing Acoustic FastDTW Alignment
              </h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Extracting semitones, warping candidate trajectories, and calculating forensic rubric...
              </p>
            </div>
          </div>
        )}

        {/* 3. Contrastive Analysis Results Studio */}
        {analysis && !isAnalyzing && (
          <div className="space-y-6">
            {/* Scorecard & Radar View */}
            <section>
              <ScorecardView scorecard={analysis.scorecard} />
            </section>

            {/* Synchronized Dual Audio Waveforms */}
            <section>
              <DualAudioWaveform
                goldAudioUrl={analysis.gold_audio_url}
                candidateAudioUrl={analysis.candidate_audio_url}
                flawCards={analysis.flaw_cards}
                externalSeekSec={seekTimestamp}
              />
            </section>

            {/* Interactive Acoustic Contours Studio (Recharts) */}
            <section>
              <ContrastiveCharts timeSeries={analysis.time_series} />
            </section>

            {/* Two Column Layout: Grounded Flaw Dossier & Prescriptive Drills */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7">
                <FlawDossier
                  flaws={analysis.flaw_cards}
                  onSeekToFlaw={(t) => setSeekTimestamp(t)}
                />
              </div>

              <div className="lg:col-span-5">
                <PrescriptiveDrills drills={analysis.drills} />
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-border-subtle bg-surface/50 px-6 py-5 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-300">OratorLens</span>
            <span>•</span>
            <span>Contrastive Speech Analytics & Forensic Rhetoric Scoring</span>
          </div>
          <div className="flex items-center space-x-4 text-slate-400 font-mono text-[11px]">
            <span>FastDTW Alignment</span>
            <span>YIN Pitch Tracking</span>
            <span>Causal Attribution Engine</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <BenchmarkModal
        isOpen={isBenchmarkOpen}
        onClose={() => setIsBenchmarkOpen(false)}
      />

      <CustomUploadModal
        isOpen={isCustomUploadOpen}
        onClose={() => setIsCustomUploadOpen(false)}
        selectedSpeech={currentSpeech}
        onAnalyzeCustom={handleAnalyzeCustom}
        isAnalyzing={isAnalyzing}
      />
    </div>
  );
}

export default App;
