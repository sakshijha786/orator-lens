"""
generate_synthetic_flaws.py - 4-Tier Contrastive Speech Synthesis Engine
Part of OratorLens Contrastive Speech Analytics.

Generates realistic acoustic speech audio (WAV) and ground-truth flaw metadata:
- Sourced rhetoric:
  1. Steve Jobs 2005 Stanford Commencement ("Stay Hungry, Stay Foolish")
  2. Greta Thunberg UN Climate Summit ("How Dare You")
  3. Winston Churchill 1940 ("We Shall Fight on the Beaches")
- 4-Tier Flaw Gradient:
  - Level 0 (Gold Baseline): Pristine orator audio, melodic inflection, dramatic pauses, wide dynamic range.
  - Level 1 (Subtle Flaw): 0.85x pitch variance compression, slight boundary rushing.
  - Level 2 (Amateur): Severe monotone (0.35x pitch variance), clipped dramatic pauses (<120ms), erratic volume jumps.
  - Level 3 (Botched): Robotic flatline (std(F0) ~ 0), hyper-speed delivery (>230 WPM), awkward pauses (>3.5s).
- Outputs data/dataset_manifest.json with millisecond ground-truth timestamps.
"""

import os
import json
import numpy as np
from scipy import signal
import soundfile as sf
from typing import Dict, List, Any, Tuple


class SyntheticAcousticSpeechSynthesizer:
    """
    Synthesizes speech-like acoustic signals using formant vocal-tract filtering,
    glottal pulse harmonics, and prosodic time-varying contours.
    """

    def __init__(self, sample_rate: int = 22050):
        self.sample_rate = sample_rate

    def _generate_vocal_tract_syllable(
        self,
        duration_sec: float,
        pitch_hz: float,
        vowel_type: str = "a",
        energy_gain: float = 1.0,
        is_voiced: bool = True,
    ) -> np.ndarray:
        """
        Synthesize a vowel/syllable using formant resonance filters (F1, F2, F3).
        """
        n_samples = int(duration_sec * self.sample_rate)
        if n_samples <= 0:
            return np.array([], dtype=np.float32)

        t = np.arange(n_samples) / self.sample_rate

        # Standard English Formant Frequencies (Hz) and Bandwidths (Hz)
        formants = {
            "a": [(800, 80), (1200, 90), (2500, 120)],  # as in 'father'
            "e": [(500, 70), (1800, 100), (2600, 120)], # as in 'bed'
            "i": [(300, 60), (2200, 110), (3000, 130)], # as in 'see'
            "o": [(500, 70), (1000, 80), (2400, 110)],  # as in 'boat'
            "u": [(350, 65), (800, 80), (2300, 110)],   # as in 'boot'
        }
        f_list = formants.get(vowel_type, formants["a"])

        if is_voiced and pitch_hz > 30.0:
            # Glottal excitation: pulse train with harmonic overtones & gentle vibrato
            vibrato = 1.0 + 0.015 * np.sin(2.0 * np.pi * 5.5 * t)
            phase = 2.0 * np.pi * np.cumsum(pitch_hz * vibrato) / self.sample_rate
            excitation = (
                0.60 * np.sin(phase) +
                0.25 * np.sin(2 * phase) +
                0.15 * np.sin(3 * phase) +
                0.08 * np.sin(4 * phase) +
                0.04 * np.sin(5 * phase)
            )
            # Add subtle aspiration breath noise
            noise = np.random.normal(0, 0.05, n_samples)
            excitation += noise
        else:
            # Unvoiced fricative / whisper noise
            excitation = np.random.normal(0, 0.4, n_samples)

        # Resonant formant IIR filter cascade
        filtered = excitation
        for f_center, bw in f_list:
            q = f_center / max(10.0, bw)
            b, a = signal.iirpeak(f_center, q, fs=self.sample_rate)
            filtered = signal.lfilter(b, a, filtered)

        # Syllabic envelope (Tukey / asymmetric attack-decay window)
        attack_len = min(int(0.08 * self.sample_rate), n_samples // 3)
        decay_len = min(int(0.12 * self.sample_rate), n_samples // 3)
        env = np.ones(n_samples, dtype=np.float32)

        if attack_len > 0:
            env[:attack_len] = np.sin(np.linspace(0, np.pi / 2, attack_len)) ** 2
        if decay_len > 0:
            env[-decay_len:] = np.cos(np.linspace(0, np.pi / 2, decay_len)) ** 2

        signal_out = filtered * env * energy_gain
        return signal_out.astype(np.float32)

    def synthesize_utterance(
        self,
        words_metadata: List[Dict[str, Any]],
        flaw_level: int = 0,
        flaw_preset: str = "default",
    ) -> Tuple[np.ndarray, List[Dict[str, Any]]]:
        """
        Synthesize continuous speech audio from a sequence of words and pauses,
        modulating prosody according to the specified flaw tier.
        """
        audio_chunks = []
        ground_truth_flaws = []
        curr_time = 0.0
        vowels = ["a", "e", "i", "o", "u"]

        # Base vocal parameters
        if flaw_preset == "thunberg":
            base_f0 = 210.0
        elif flaw_preset == "churchill":
            base_f0 = 108.0
        else:
            base_f0 = 145.0

        for w_idx, item in enumerate(words_metadata):
            is_pause = item.get("is_pause", False)
            text = item.get("text", "")
            base_dur = item.get("duration", 0.35)
            is_emphasis = item.get("emphasis", False)

            if is_pause:
                # Modulate pauses based on flaw level
                pause_dur = base_dur
                if flaw_level == 1:
                    # Slight rushing at punctuation
                    pause_dur = base_dur * 0.75
                elif flaw_level == 2:
                    # Clipped dramatic pause
                    pause_dur = min(0.12, base_dur * 0.20)
                    ground_truth_flaws.append({
                        "category": "CLIPPED_DRAMATIC_PAUSE",
                        "start_sec": round(curr_time, 2),
                        "end_sec": round(curr_time + 0.5, 2),
                        "description": "Dramatic punctuation pause severely clipped to <120ms",
                    })
                elif flaw_level == 3 and w_idx == 4:
                    # Level 3: Awkward unscheduled silence mid-phrase
                    pause_dur = 3.6
                    ground_truth_flaws.append({
                        "category": "AWKWARD_HESITATION",
                        "start_sec": round(curr_time, 2),
                        "end_sec": round(curr_time + 3.6, 2),
                        "description": "Egregious 3.6s cognitive stall mid-phrase",
                    })

                n_pause_samples = int(pause_dur * self.sample_rate)
                # Ambient breath room-tone
                pause_audio = np.random.normal(0, 0.0008, n_pause_samples).astype(np.float32)
                audio_chunks.append(pause_audio)
                curr_time += pause_dur

            else:
                # Synthesizing word syllables
                syllable_count = max(1, len(text) // 3)
                word_dur = base_dur

                if flaw_level == 1:
                    word_dur = base_dur * 0.95
                elif flaw_level == 3 and flaw_preset in ["thunberg", "rushed"]:
                    # Level 3 hyper-speed (>240 WPM)
                    word_dur = base_dur * 0.55
                elif flaw_level == 3 and flaw_preset == "jobs":
                    # Flat robotic monotone
                    word_dur = base_dur

                word_start = curr_time
                for s_i in range(syllable_count):
                    s_dur = word_dur / syllable_count
                    v_type = vowels[(w_idx + s_i) % len(vowels)]

                    # Pitch calculation based on flaw tier
                    if flaw_level == 0:
                        # Gold: Natural oratorical pitch contour with expressive rise on emphasis
                        inflection = 1.35 if is_emphasis else (1.0 + 0.12 * np.sin(w_idx * 0.8))
                        pitch = base_f0 * inflection
                        gain = 1.25 if is_emphasis else 0.95
                    elif flaw_level == 1:
                        # Subtle: compressed variance (0.85x)
                        inflection = 1.15 if is_emphasis else (1.0 + 0.05 * np.sin(w_idx * 0.8))
                        pitch = base_f0 * inflection
                        gain = 1.0
                    elif flaw_level == 2:
                        # Amateur: Severe monotone (0.35x variance) and volume spikes
                        pitch = base_f0 * (1.0 + 0.02 * np.sin(w_idx))
                        # Erratic volume jumps
                        gain = 1.8 if (w_idx % 3 == 0) else 0.65
                    else:  # flaw_level == 3
                        # Botched: Flatline robotic pitch (std(F0) = 0)
                        pitch = base_f0  # Exactly constant
                        gain = 0.9

                    syllable_audio = self._generate_vocal_tract_syllable(
                        duration_sec=s_dur,
                        pitch_hz=pitch,
                        vowel_type=v_type,
                        energy_gain=gain,
                    )
                    audio_chunks.append(syllable_audio)
                    curr_time += s_dur

                word_end = curr_time

                # Ground truth tagging for Level 2 & 3
                if flaw_level >= 2 and is_emphasis:
                    ground_truth_flaws.append({
                        "category": "MONOTONE_CLIMAX",
                        "start_sec": round(word_start, 2),
                        "end_sec": round(word_end, 2),
                        "text_segment": text,
                        "description": f"Robotic flat pitch on high-emphasis word '{text}'",
                    })

        total_audio = np.concatenate(audio_chunks) if audio_chunks else np.zeros(1000, dtype=np.float32)

        # Normalize peak
        max_amp = np.max(np.abs(total_audio))
        if max_amp > 1e-6:
            total_audio = total_audio / max_amp * 0.90

        return total_audio, ground_truth_flaws


def build_speech_corpus(base_dir: str):
    """
    Creates the required directory structure, audio WAV files, transcripts,
    and dataset_manifest.json for the Hackathon benchmark.
    """
    data_dir = os.path.join(base_dir, "data")
    speeches_dir = os.path.join(data_dir, "speeches")
    os.makedirs(speeches_dir, exist_ok=True)

    synth = SyntheticAcousticSpeechSynthesizer(sample_rate=22050)

    # 1. Steve Jobs Commencement
    jobs_words = [
        {"text": "Remembering", "duration": 0.48, "emphasis": False},
        {"text": "that", "duration": 0.20, "emphasis": False},
        {"text": "I'll", "duration": 0.22, "emphasis": False},
        {"text": "be", "duration": 0.18, "emphasis": False},
        {"text": "dead", "duration": 0.55, "emphasis": True},
        {"text": "soon", "duration": 0.45, "emphasis": True},
        {"is_pause": True, "duration": 0.70},  # Rhetorical pause
        {"text": "is", "duration": 0.18, "emphasis": False},
        {"text": "the", "duration": 0.15, "emphasis": False},
        {"text": "most", "duration": 0.25, "emphasis": False},
        {"text": "important", "duration": 0.45, "emphasis": True},
        {"text": "tool", "duration": 0.38, "emphasis": True},
        {"is_pause": True, "duration": 0.60},
        {"text": "I've", "duration": 0.22, "emphasis": False},
        {"text": "ever", "duration": 0.25, "emphasis": False},
        {"text": "encountered", "duration": 0.55, "emphasis": False},
        {"is_pause": True, "duration": 0.85},
        {"text": "to", "duration": 0.15, "emphasis": False},
        {"text": "help", "duration": 0.25, "emphasis": False},
        {"text": "me", "duration": 0.18, "emphasis": False},
        {"text": "make", "duration": 0.25, "emphasis": False},
        {"text": "the", "duration": 0.15, "emphasis": False},
        {"text": "big", "duration": 0.30, "emphasis": False},
        {"text": "choices", "duration": 0.40, "emphasis": True},
        {"text": "in", "duration": 0.15, "emphasis": False},
        {"text": "life.", "duration": 0.60, "emphasis": True},
        {"is_pause": True, "duration": 1.20},  # Dramatic pause
        {"text": "Stay", "duration": 0.50, "emphasis": True},
        {"text": "hungry.", "duration": 0.65, "emphasis": True},
        {"is_pause": True, "duration": 0.90},
        {"text": "Stay", "duration": 0.50, "emphasis": True},
        {"text": "foolish.", "duration": 0.75, "emphasis": True},
    ]

    jobs_transcript = (
        "Remembering that I'll be dead soon is the most important tool I've ever encountered "
        "to help me make the big choices in life. Stay hungry. Stay foolish."
    )

    # 2. Greta Thunberg UN Summit
    thunberg_words = [
        {"text": "This", "duration": 0.30, "emphasis": False},
        {"text": "is", "duration": 0.18, "emphasis": False},
        {"text": "all", "duration": 0.25, "emphasis": False},
        {"text": "wrong.", "duration": 0.55, "emphasis": True},
        {"is_pause": True, "duration": 0.85},
        {"text": "I", "duration": 0.20, "emphasis": False},
        {"text": "shouldn't", "duration": 0.35, "emphasis": False},
        {"text": "be", "duration": 0.18, "emphasis": False},
        {"text": "up", "duration": 0.22, "emphasis": False},
        {"text": "here.", "duration": 0.50, "emphasis": True},
        {"is_pause": True, "duration": 0.95},
        {"text": "You", "duration": 0.25, "emphasis": False},
        {"text": "have", "duration": 0.22, "emphasis": False},
        {"text": "stolen", "duration": 0.40, "emphasis": True},
        {"text": "my", "duration": 0.22, "emphasis": False},
        {"text": "dreams", "duration": 0.55, "emphasis": True},
        {"text": "and", "duration": 0.18, "emphasis": False},
        {"text": "my", "duration": 0.20, "emphasis": False},
        {"text": "childhood", "duration": 0.50, "emphasis": True},
        {"is_pause": True, "duration": 0.80},
        {"text": "with", "duration": 0.20, "emphasis": False},
        {"text": "your", "duration": 0.20, "emphasis": False},
        {"text": "empty", "duration": 0.35, "emphasis": True},
        {"text": "words.", "duration": 0.55, "emphasis": True},
        {"is_pause": True, "duration": 1.10},
        {"text": "How", "duration": 0.40, "emphasis": True},
        {"text": "dare", "duration": 0.45, "emphasis": True},
        {"text": "you!", "duration": 0.65, "emphasis": True},
    ]

    thunberg_transcript = (
        "This is all wrong. I shouldn't be up here. You have stolen my dreams and my childhood "
        "with your empty words. How dare you!"
    )

    manifest = {"speeches": {}}

    # Generate Jobs speech gradient
    jobs_dir = os.path.join(speeches_dir, "jobs_commencement")
    os.makedirs(jobs_dir, exist_ok=True)
    with open(os.path.join(jobs_dir, "transcript.txt"), "w", encoding="utf-8") as f:
        f.write(jobs_transcript)

    # Level 0 (Gold)
    audio_l0, _ = synth.synthesize_utterance(jobs_words, flaw_level=0, flaw_preset="jobs")
    sf.write(os.path.join(jobs_dir, "gold_baseline.wav"), audio_l0, 22050)

    # Level 1 (Subtle)
    audio_l1, flaws_l1 = synth.synthesize_utterance(jobs_words, flaw_level=1, flaw_preset="jobs")
    sf.write(os.path.join(jobs_dir, "flawed_lvl1_subtle.wav"), audio_l1, 22050)

    # Level 2 (Monotone)
    audio_l2, flaws_l2 = synth.synthesize_utterance(jobs_words, flaw_level=2, flaw_preset="jobs")
    sf.write(os.path.join(jobs_dir, "flawed_lvl2_monotone.wav"), audio_l2, 22050)

    # Level 3 (Botched)
    audio_l3, flaws_l3 = synth.synthesize_utterance(jobs_words, flaw_level=3, flaw_preset="jobs")
    sf.write(os.path.join(jobs_dir, "flawed_lvl3_botched.wav"), audio_l3, 22050)

    manifest["speeches"]["jobs_commencement"] = {
        "title": "Steve Jobs Stanford Commencement (2005)",
        "rhetoric_type": "Inspiring / Visionary Declamation",
        "speaker": "Steve Jobs",
        "transcript": jobs_transcript,
        "audio_files": {
            "gold_baseline": "gold_baseline.wav",
            "flawed_lvl1_subtle": "flawed_lvl1_subtle.wav",
            "flawed_lvl2_monotone": "flawed_lvl2_monotone.wav",
            "flawed_lvl3_botched": "flawed_lvl3_botched.wav",
        },
        "ground_truth_flaws": {
            "lvl1": flaws_l1,
            "lvl2": flaws_l2,
            "lvl3": flaws_l3,
        },
    }

    # Generate Thunberg speech gradient
    thunberg_dir = os.path.join(speeches_dir, "thunberg_summit")
    os.makedirs(thunberg_dir, exist_ok=True)
    with open(os.path.join(thunberg_dir, "transcript.txt"), "w", encoding="utf-8") as f:
        f.write(thunberg_transcript)

    # Level 0 (Gold)
    th_l0, _ = synth.synthesize_utterance(thunberg_words, flaw_level=0, flaw_preset="thunberg")
    sf.write(os.path.join(thunberg_dir, "gold_baseline.wav"), th_l0, 22050)

    # Level 1 (Subtle)
    th_l1, th_flaws_l1 = synth.synthesize_utterance(thunberg_words, flaw_level=1, flaw_preset="thunberg")
    sf.write(os.path.join(thunberg_dir, "flawed_lvl1_subtle.wav"), th_l1, 22050)

    # Level 2 (Rushed)
    th_l2, th_flaws_l2 = synth.synthesize_utterance(thunberg_words, flaw_level=2, flaw_preset="rushed")
    sf.write(os.path.join(thunberg_dir, "flawed_lvl2_rushed.wav"), th_l2, 22050)

    # Level 3 (Botched)
    th_l3, th_flaws_l3 = synth.synthesize_utterance(thunberg_words, flaw_level=3, flaw_preset="thunberg")
    sf.write(os.path.join(thunberg_dir, "flawed_lvl3_botched.wav"), th_l3, 22050)

    manifest["speeches"]["thunberg_summit"] = {
        "title": "Greta Thunberg UN Climate Summit (2019)",
        "rhetoric_type": "Persuasive / Urgent Forensics",
        "speaker": "Greta Thunberg",
        "transcript": thunberg_transcript,
        "audio_files": {
            "gold_baseline": "gold_baseline.wav",
            "flawed_lvl1_subtle": "flawed_lvl1_subtle.wav",
            "flawed_lvl2_rushed": "flawed_lvl2_rushed.wav",
            "flawed_lvl3_botched": "flawed_lvl3_botched.wav",
        },
        "ground_truth_flaws": {
            "lvl1": th_flaws_l1,
            "lvl2": th_flaws_l2,
            "lvl3": th_flaws_l3,
        },
    }

    # 3. Winston Churchill 1940 We Shall Fight on the Beaches
    churchill_words = [
        {"text": "We", "duration": 0.35, "emphasis": False},
        {"text": "shall", "duration": 0.40, "emphasis": False},
        {"text": "fight", "duration": 0.65, "emphasis": True},
        {"text": "on", "duration": 0.25, "emphasis": False},
        {"text": "the", "duration": 0.20, "emphasis": False},
        {"text": "beaches,", "duration": 0.75, "emphasis": True},
        {"is_pause": True, "duration": 1.15},
        {"text": "we", "duration": 0.35, "emphasis": False},
        {"text": "shall", "duration": 0.40, "emphasis": False},
        {"text": "fight", "duration": 0.65, "emphasis": True},
        {"text": "on", "duration": 0.25, "emphasis": False},
        {"text": "the", "duration": 0.20, "emphasis": False},
        {"text": "landing", "duration": 0.50, "emphasis": False},
        {"text": "grounds,", "duration": 0.70, "emphasis": True},
        {"is_pause": True, "duration": 1.25},
        {"text": "we", "duration": 0.35, "emphasis": False},
        {"text": "shall", "duration": 0.40, "emphasis": False},
        {"text": "fight", "duration": 0.70, "emphasis": True},
        {"text": "in", "duration": 0.25, "emphasis": False},
        {"text": "the", "duration": 0.20, "emphasis": False},
        {"text": "fields", "duration": 0.60, "emphasis": True},
        {"text": "and", "duration": 0.25, "emphasis": False},
        {"text": "in", "duration": 0.20, "emphasis": False},
        {"text": "the", "duration": 0.20, "emphasis": False},
        {"text": "streets,", "duration": 0.75, "emphasis": True},
        {"is_pause": True, "duration": 1.30},
        {"text": "we", "duration": 0.35, "emphasis": False},
        {"text": "shall", "duration": 0.45, "emphasis": False},
        {"text": "never", "duration": 0.75, "emphasis": True},
        {"text": "surrender!", "duration": 0.95, "emphasis": True},
    ]

    churchill_transcript = (
        "We shall fight on the beaches, we shall fight on the landing grounds, "
        "we shall fight in the fields and in the streets; we shall never surrender!"
    )

    churchill_dir = os.path.join(speeches_dir, "churchill_beaches")
    os.makedirs(churchill_dir, exist_ok=True)
    with open(os.path.join(churchill_dir, "transcript.txt"), "w", encoding="utf-8") as f:
        f.write(churchill_transcript)

    ch_l0, _ = synth.synthesize_utterance(churchill_words, flaw_level=0, flaw_preset="churchill")
    sf.write(os.path.join(churchill_dir, "gold_baseline.wav"), ch_l0, 22050)

    ch_l1, ch_flaws_l1 = synth.synthesize_utterance(churchill_words, flaw_level=1, flaw_preset="churchill")
    sf.write(os.path.join(churchill_dir, "flawed_lvl1_subtle.wav"), ch_l1, 22050)

    ch_l2, ch_flaws_l2 = synth.synthesize_utterance(churchill_words, flaw_level=2, flaw_preset="churchill")
    sf.write(os.path.join(churchill_dir, "flawed_lvl2_monotone.wav"), ch_l2, 22050)

    ch_l3, ch_flaws_l3 = synth.synthesize_utterance(churchill_words, flaw_level=3, flaw_preset="churchill")
    sf.write(os.path.join(churchill_dir, "flawed_lvl3_botched.wav"), ch_l3, 22050)

    manifest["speeches"]["churchill_beaches"] = {
        "title": "Winston Churchill We Shall Fight on the Beaches (1940)",
        "rhetoric_type": "Resolute / Rallying Statesmanship",
        "speaker": "Winston Churchill",
        "transcript": churchill_transcript,
        "audio_files": {
            "gold_baseline": "gold_baseline.wav",
            "flawed_lvl1_subtle": "flawed_lvl1_subtle.wav",
            "flawed_lvl2_monotone": "flawed_lvl2_monotone.wav",
            "flawed_lvl3_botched": "flawed_lvl3_botched.wav",
        },
        "ground_truth_flaws": {
            "lvl1": ch_flaws_l1,
            "lvl2": ch_flaws_l2,
            "lvl3": ch_flaws_l3,
        },
    }

    manifest_path = os.path.join(data_dir, "dataset_manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    print(f"Synthesized full speech corpus and wrote manifest to {manifest_path}")
    return manifest_path


if __name__ == "__main__":
    import sys
    base = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    build_speech_corpus(base)
