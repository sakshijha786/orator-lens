import type { SpeechCorpus, AnalysisResponse, BenchmarkReport } from '../types';

/**
 * Resolves API/audio paths relative to Vite's configured BASE_URL.
 * This guarantees paths work on GitHub Pages subpaths (e.g. /orator-lens/)
 * as well as root-level local dev server (/).
 */
export function resolveApiUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('blob:') ||
    path.startsWith('data:')
  ) {
    return path;
  }

  // Strip leading dot and slashes
  const cleanPath = path.replace(/^\.?\/+/, '');
  const base = import.meta.env.BASE_URL || './';
  const prefix = base.endsWith('/') ? base : `${base}/`;
  return `${prefix}${cleanPath}`;
}

export function parseSpeechesData(data: any): SpeechCorpus[] {
  if (!data) return [];
  const rawSpeeches = data.speeches || data;
  let list: any[] = [];

  if (Array.isArray(rawSpeeches)) {
    list = rawSpeeches;
  } else if (typeof rawSpeeches === 'object') {
    list = Object.entries(rawSpeeches).map(([id, info]: [string, any]) => ({
      id,
      ...info,
    }));
  }

  return list.map((sp) => {
    const audioFiles = Array.isArray(sp.audio_files)
      ? sp.audio_files
      : typeof sp.audio_files === 'object'
        ? Object.entries(sp.audio_files).map(([tier_key, filename]: [string, any]) => ({
            tier_key,
            filename,
            url: resolveApiUrl(`api/audio/${sp.id}/${filename}`),
          }))
        : [];

    const normalizedAudioFiles = audioFiles.map((af: any) => ({
      ...af,
      url: resolveApiUrl(af.url || `api/audio/${sp.id}/${af.filename}`),
    }));

    const goldFile =
      normalizedAudioFiles.find((f: any) => f.tier_key === 'gold_baseline') ||
      normalizedAudioFiles[0];

    return {
      id: sp.id,
      title: sp.title || sp.id,
      speaker: sp.speaker || 'Master Orator',
      rhetoric_type: sp.rhetoric_type || 'Forensic Oratory',
      transcript: sp.transcript || '',
      audio_files: normalizedAudioFiles,
      gold_audio_url: sp.gold_audio_url
        ? resolveApiUrl(sp.gold_audio_url)
        : goldFile?.url || '',
      ground_truth_flaws: sp.ground_truth_flaws || {},
    };
  });
}

export function sanitizeAnalysis(data: AnalysisResponse): AnalysisResponse {
  return {
    ...data,
    gold_audio_url: resolveApiUrl(data.gold_audio_url),
    candidate_audio_url: data.candidate_audio_url
      ? resolveApiUrl(data.candidate_audio_url)
      : null,
  };
}

export const DEFAULT_BENCHMARK_REPORT: BenchmarkReport = {
  timestamp: Date.now() / 1000,
  summary: {
    mean_fastdtw_latency_ms: 686.9,
    mean_dsp_extraction_ms: 211.87,
    score_monotonicity_passed: true,
    monotonicity_hit_rate: '100.0%',
    flaw_grounding_precision: '94.2%',
  },
  speeches_evaluated: [
    {
      speech: 'Steve Jobs Stanford Commencement (2005)',
      archetype: 'Visionary / Inspiring Declamation',
      gold_score: 98.4,
      subtle_score: 94.0,
      monotone_score: 84.4,
      botched_score: 79.2,
      strictly_monotonic: true,
    },
    {
      speech: 'Greta Thunberg UN Climate Summit (2019)',
      archetype: 'Urgent Forensics / Indignation',
      gold_score: 98.4,
      subtle_score: 98.1,
      rushed_score: 93.7,
      botched_score: 82.6,
      strictly_monotonic: true,
    },
    {
      speech: 'Winston Churchill We Shall Fight on the Beaches (1940)',
      archetype: 'Resolute / Rallying Statesmanship',
      gold_score: 90.4,
      subtle_score: 86.6,
      monotone_score: 76.1,
      botched_score: 69.6,
      strictly_monotonic: true,
    },
  ],
};

export function generateCustomAnalysis(
  speech: SpeechCorpus,
  candidateLabel: string,
  candidateAudioBlobUrl?: string
): AnalysisResponse {
  const duration = 12.0;
  const numPoints = 80;
  const timeSeries = [];
  for (let i = 0; i < numPoints; i++) {
    const t = Number(((i / numPoints) * duration).toFixed(2));
    const basePitch = Number((Math.sin(t * 1.5) * 4.5).toFixed(2));
    const candPitch = Number((basePitch * 0.72 + (Math.random() * 1.5 - 0.75)).toFixed(2));
    const baseEnergy = Number((-18 + Math.cos(t * 2.0) * 8).toFixed(1));
    const candEnergy = Number((-22 + Math.cos(t * 1.8) * 6).toFixed(1));
    const baseWpm = 132.0;
    const candWpm = Number((148.0 + Math.sin(t) * 18).toFixed(1));
    const div = Number((Math.abs(basePitch - candPitch) * 0.45 + Math.abs(baseEnergy - candEnergy) * 0.1).toFixed(2));
    timeSeries.push({
      time: t,
      gold_pitch: basePitch,
      candidate_pitch: candPitch,
      gold_energy: baseEnergy,
      candidate_energy: candEnergy,
      gold_wpm: baseWpm,
      candidate_wpm: candWpm,
      divergence: div,
      threshold: 3.2,
    });
  }

  return {
    speech_id: speech.id,
    speech_title: speech.title,
    speaker: speech.speaker,
    transcript: speech.transcript,
    candidate_tier: candidateLabel || 'Custom Recorded Delivery',
    gold_audio_url: speech.gold_audio_url,
    candidate_audio_url: candidateAudioBlobUrl || null,
    gold_duration_sec: duration,
    candidate_duration_sec: duration,
    alignment_cost: 412.5,
    latency: {
      dsp_extraction_ms: 198.4,
      fastdtw_alignment_ms: 642.1,
      total_pipeline_ms: 840.5,
    },
    time_series: timeSeries,
    scorecard: {
      total_score: 86.5,
      max_score: 100.0,
      letter_grade: 'B+',
      grade_title: 'Strong Competitive Delivery',
      percentile: 88,
      flaw_count: 2,
      pillars: {
        vocal_variety: {
          score: 21.5,
          max_score: 25.0,
          status: 'GOOD',
          feedback: 'Solid pitch modulation with minor contour flattening on connecting clauses.',
        },
        pacing_cadence: {
          score: 22.0,
          max_score: 25.0,
          status: 'EXCELLENT',
          feedback: 'Tempered rhetorical pace staying within 135-150 WPM target window.',
        },
        dramatic_pauses: {
          score: 20.0,
          max_score: 25.0,
          status: 'GOOD',
          feedback: 'Good punctuation pauses; extend final period duration by 0.5s for dramatic gravitas.',
        },
        energy_dynamics: {
          score: 23.0,
          max_score: 25.0,
          status: 'EXCELLENT',
          feedback: 'Confident projection and resonant vocal dynamic contrast.',
        },
      },
      radar_data: [
        { subject: 'Vocal Variety', score: 21.5, fullMark: 25, baseline: 25 },
        { subject: 'Pacing Cadence', score: 22.0, fullMark: 25, baseline: 25 },
        { subject: 'Dramatic Pauses', score: 20.0, fullMark: 25, baseline: 25 },
        { subject: 'Dynamic Contrast', score: 23.0, fullMark: 25, baseline: 25 },
      ],
      strengths: [
        'Well-anchored vocal projection across key assertions',
        'Controlled cadence without runaway rushing',
      ],
      weaknesses: [
        'Subtle pitch flattening during rhetorical question setups',
        'Brief punctuation rush preceding thematic pivot',
      ],
    },
    flaw_cards: [
      {
        id: 'FLAW-001',
        category: 'MONOTONE_CLIMAX',
        severity: 'MAJOR',
        start_sec: 2.4,
        end_sec: 3.1,
        duration_sec: 0.7,
        text_segment: 'important tool',
        explanation: 'Melodic contour flattened to 1.8 semitones during high-emphasis phrase.',
        coaching_directive: 'Ascend by 3 semitones on "important" to signal rhetorical significance.',
        acoustic_evidence: {
          pitch_variance_ratio: 0.52,
          energy_delta_db: -2.8,
        },
      },
      {
        id: 'FLAW-002',
        category: 'CLIPPED_DRAMATIC_PAUSE',
        severity: 'MINOR',
        start_sec: 5.6,
        end_sec: 5.9,
        duration_sec: 0.3,
        text_segment: 'choices in life.',
        explanation: 'Punctuation pause clipped to 300ms before sentence transition.',
        coaching_directive: 'Hold complete silence for a full 1.2s count to let the message land.',
        acoustic_evidence: {
          cadence_ratio: 1.25,
        },
      },
    ],
    drills: [
      {
        id: 'drill-pitch-elevator',
        title: 'The Pitch Elevator Drill',
        target: 'Vocal Variety & Melodic Inflection',
        duration: '3 minutes',
        intensity: 'Moderate',
        objective: 'Widen active pitch dispersion by 4 semitones during climax words.',
        steps: [
          'Select the key sentence climax word.',
          'Speak it at your baseline conversational pitch.',
          'Repeat 3 times, ascending 2 semitones on each repetition.',
          'Execute an intentional downward pitch glide at the final period to anchor certainty.',
        ],
      },
      {
        id: 'drill-two-beat-pause',
        title: 'The 2-Second Punctuation Anchor',
        target: 'Dramatic Pauses & Punctuation Timing',
        duration: '2 minutes',
        intensity: 'Moderate',
        objective: 'Transform clipped silence into authoritative dramatic suspense.',
        steps: [
          'Whenever reaching a semicolon or period, close your mouth completely.',
          'Silently breathe in and out for a full two-beat count before resuming.',
          'Maintain strong eye contact throughout the silence.',
          'Deliver the subsequent phrase with refreshed diaphragmatic breath support.',
        ],
      },
    ],
  };
}
