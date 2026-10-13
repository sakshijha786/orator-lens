import { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Play, Pause, RotateCcw, ShieldCheck, AlertTriangle } from 'lucide-react';
import type { FlawCard } from '../types';

interface DualAudioWaveformProps {
  goldAudioUrl: string;
  candidateAudioUrl: string | null;
  flawCards: FlawCard[];
  externalSeekSec?: number | null;
}

export const DualAudioWaveform: React.FC<DualAudioWaveformProps> = ({
  goldAudioUrl,
  candidateAudioUrl,
  flawCards,
  externalSeekSec,
}) => {
  const goldContainerRef = useRef<HTMLDivElement>(null);
  const candContainerRef = useRef<HTMLDivElement>(null);

  const goldWsRef = useRef<WaveSurfer | null>(null);
  const candWsRef = useRef<WaveSurfer | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isReady, setIsReady] = useState(false);

  // Initialize WaveSurfer instances
  useEffect(() => {
    if (!goldContainerRef.current) return;

    // Cleanup previous instances
    if (goldWsRef.current) goldWsRef.current.destroy();
    if (candWsRef.current) candWsRef.current.destroy();
    setIsReady(false);
    setIsPlaying(false);

    // 1. Gold WaveSurfer
    const goldWs = WaveSurfer.create({
      container: goldContainerRef.current,
      waveColor: '#059669',
      progressColor: '#34d399',
      cursorColor: '#10b981',
      cursorWidth: 2,
      barWidth: 3,
      barGap: 2,
      barRadius: 2,
      height: 70,
      normalize: true,
      url: goldAudioUrl,
    });
    goldWsRef.current = goldWs;

    // 2. Candidate WaveSurfer (if audio exists)
    let candWs: WaveSurfer | null = null;
    if (candContainerRef.current && candidateAudioUrl) {
      candWs = WaveSurfer.create({
        container: candContainerRef.current,
        waveColor: '#be123c',
        progressColor: '#fb7185',
        cursorColor: '#f43f5e',
        cursorWidth: 2,
        barWidth: 3,
        barGap: 2,
        barRadius: 2,
        height: 70,
        normalize: true,
        url: candidateAudioUrl,
      });
      candWsRef.current = candWs;
    }

    goldWs.on('ready', () => {
      setDuration(goldWs.getDuration());
      setIsReady(true);
    });

    goldWs.on('timeupdate', (currentTimeSec) => {
      setCurrentTime(currentTimeSec);
    });

    goldWs.on('finish', () => {
      setIsPlaying(false);
      if (candWs) candWs.seekTo(0);
    });

    // Synchronize seeks between gold and candidate
    goldWs.on('seeking', (timeSec) => {
      if (candWs && Math.abs(candWs.getCurrentTime() - timeSec) > 0.15) {
        const d = candWs.getDuration();
        if (d > 0) candWs.seekTo(Math.min(1.0, timeSec / d));
      }
    });

    if (candWs) {
      candWs.on('seeking', (timeSec) => {
        if (goldWs && Math.abs(goldWs.getCurrentTime() - timeSec) > 0.15) {
          const d = goldWs.getDuration();
          if (d > 0) goldWs.seekTo(Math.min(1.0, timeSec / d));
        }
      });
    }

    return () => {
      goldWs.destroy();
      if (candWs) candWs.destroy();
    };
  }, [goldAudioUrl, candidateAudioUrl]);

  // Handle external seek triggers (e.g. clicking a flaw in FlawDossier)
  useEffect(() => {
    if (externalSeekSec !== undefined && externalSeekSec !== null && isReady && goldWsRef.current) {
      const dur = goldWsRef.current.getDuration();
      if (dur > 0) {
        const progress = Math.min(1.0, Math.max(0, externalSeekSec / dur));
        goldWsRef.current.seekTo(progress);
        if (candWsRef.current) {
          const candDur = candWsRef.current.getDuration();
          if (candDur > 0) {
            candWsRef.current.seekTo(Math.min(1.0, Math.max(0, externalSeekSec / candDur)));
          }
        }
      }
    }
  }, [externalSeekSec, isReady]);

  const togglePlay = () => {
    if (!goldWsRef.current) return;
    if (isPlaying) {
      goldWsRef.current.pause();
      if (candWsRef.current) candWsRef.current.pause();
      setIsPlaying(false);
    } else {
      goldWsRef.current.play();
      if (candWsRef.current) candWsRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleReset = () => {
    if (goldWsRef.current) {
      goldWsRef.current.seekTo(0);
      goldWsRef.current.pause();
    }
    if (candWsRef.current) {
      candWsRef.current.seekTo(0);
      candWsRef.current.pause();
    }
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const changeSpeed = (rate: number) => {
    setPlaybackRate(rate);
    if (goldWsRef.current) goldWsRef.current.setPlaybackRate(rate);
    if (candWsRef.current) candWsRef.current.setPlaybackRate(rate);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  return (
    <div className="bg-surface-card rounded-2xl border border-border-subtle p-5 space-y-4">
      {/* Top Header & Master Transport Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-border-subtle">
        <div className="flex items-center space-x-3">
          <button
            onClick={togglePlay}
            disabled={!isReady}
            className="w-11 h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>

          <button
            onClick={handleReset}
            className="p-2.5 rounded-xl bg-surface border border-border-subtle hover:bg-surface-elevated text-slate-300 transition-all active:scale-95"
            title="Reset Playhead"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <div className="font-mono text-sm tracking-wider">
            <span className="text-white font-bold">{formatTime(currentTime)}</span>
            <span className="text-slate-500 mx-1.5">/</span>
            <span className="text-slate-400">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Speed Controls */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400 font-medium hidden sm:inline">Speed:</span>
          {[0.5, 0.75, 1.0, 1.25].map((rate) => (
            <button
              key={rate}
              onClick={() => changeSpeed(rate)}
              className={`px-2 py-1 text-xs font-mono font-medium rounded-lg border transition-all ${
                playbackRate === rate
                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 shadow-sm'
                  : 'bg-surface text-slate-400 border-border-subtle hover:bg-surface-elevated'
              }`}
            >
              {rate}x
            </button>
          ))}
        </div>
      </div>

      {/* Waveform Stack */}
      <div className="space-y-4">
        {/* Track 1: Gold Baseline Reference */}
        <div className="bg-surface/80 rounded-xl border border-emerald-500/20 p-3.5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span className="p-1 rounded bg-emerald-500/10 text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Track 1 • Gold Standard Reference
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Pristine Melodic Envelope
            </span>
          </div>

          <div ref={goldContainerRef} className="w-full relative" />
        </div>

        {/* Track 2: Candidate Delivery */}
        <div className="bg-surface/80 rounded-xl border border-candidate/30 p-3.5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span className="p-1 rounded bg-candidate/10 text-candidate-light">
                <AlertTriangle className="w-3.5 h-3.5" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-candidate-light">
                Track 2 • Candidate Delivery
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Synchronized Warping Path
            </span>
          </div>

          <div ref={candContainerRef} className="w-full relative" />

          {/* Flaw Interval Highlights along the waveform timeline */}
          {duration > 0 && flawCards.length > 0 && (
            <div className="w-full h-2 mt-2 relative bg-surface rounded-full overflow-hidden">
              {flawCards.map((flaw) => {
                const leftPct = Math.min(100, Math.max(0, (flaw.start_sec / duration) * 100));
                const widthPct = Math.min(
                  100 - leftPct,
                  Math.max(2, (flaw.duration_sec / duration) * 100)
                );
                const color =
                  flaw.severity === 'CRITICAL'
                    ? 'bg-rose-500'
                    : flaw.severity === 'MAJOR'
                    ? 'bg-amber-500'
                    : 'bg-sky-500';

                return (
                  <div
                    key={flaw.id}
                    title={`${flaw.category} [${flaw.start_sec}s - ${flaw.end_sec}s]`}
                    style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                    className={`absolute top-0 bottom-0 ${color} rounded-sm opacity-80 hover:opacity-100 cursor-pointer`}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
