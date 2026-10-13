export interface AudioFile {
  tier_key: string;
  filename: string;
  url: string;
}

export interface GroundTruthFlaw {
  category: string;
  start_sec: number;
  end_sec: number;
  text_segment?: string;
  description: string;
}

export interface SpeechCorpus {
  id: string;
  title: string;
  speaker: string;
  rhetoric_type: string;
  transcript: string;
  audio_files: AudioFile[];
  gold_audio_url: string;
  ground_truth_flaws: Record<string, GroundTruthFlaw[]>;
}

export interface PillarScore {
  score: number;
  max_score: number;
  status: string;
  feedback: string;
  [key: string]: any;
}

export interface RadarPoint {
  subject: string;
  score: number;
  fullMark: number;
  baseline: number;
}

export interface Scorecard {
  total_score: number;
  max_score: number;
  letter_grade: string;
  grade_title: string;
  percentile: number;
  flaw_count: number;
  pillars: {
    vocal_variety: PillarScore;
    pacing_cadence: PillarScore;
    dramatic_pauses: PillarScore;
    energy_dynamics: PillarScore;
  };
  radar_data: RadarPoint[];
  strengths: string[];
  weaknesses: string[];
}

export interface FlawCard {
  id: string;
  category: string;
  severity: "CRITICAL" | "MAJOR" | "MINOR";
  start_sec: number;
  end_sec: number;
  duration_sec: number;
  text_segment: string;
  explanation: string;
  coaching_directive: string;
  acoustic_evidence: {
    pitch_variance_ratio?: number;
    base_pitch_std_st?: number;
    test_pitch_std_st?: number;
    energy_delta_db?: number;
    cadence_ratio?: number;
    base_wpm?: number;
    test_wpm?: number;
    [key: string]: any;
  };
}

export interface PrescriptiveDrill {
  id: string;
  title: string;
  target: string;
  duration: string;
  intensity: string;
  objective: string;
  steps: string[];
}

export interface TimeSeriesPoint {
  time: number;
  gold_pitch: number;
  candidate_pitch: number;
  gold_energy: number;
  candidate_energy: number;
  gold_wpm: number;
  candidate_wpm: number;
  divergence: number;
  threshold: number;
}

export interface AnalysisResponse {
  speech_id: string;
  speech_title: string;
  speaker: string;
  transcript: string;
  candidate_tier: string;
  gold_audio_url: string;
  candidate_audio_url: string | null;
  gold_duration_sec: number;
  candidate_duration_sec: number;
  scorecard: Scorecard;
  flaw_cards: FlawCard[];
  drills: PrescriptiveDrill[];
  time_series: TimeSeriesPoint[];
  alignment_cost: number;
  latency: {
    dsp_extraction_ms?: number;
    fastdtw_alignment_ms: number;
    total_pipeline_ms: number;
  };
}

export interface BenchmarkReport {
  timestamp: number;
  summary: {
    mean_fastdtw_latency_ms: number;
    mean_dsp_extraction_ms: number;
    score_monotonicity_passed: boolean;
    monotonicity_hit_rate: string;
    flaw_grounding_precision: string;
  };
  speeches_evaluated: Array<{
    speech: string;
    archetype: string;
    gold_score: number;
    subtle_score: number;
    monotone_score?: number;
    rushed_score?: number;
    botched_score: number;
    strictly_monotonic: boolean;
  }>;
}
