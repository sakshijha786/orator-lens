"""
causal_explainer.py - Causal Rationale Engine
Part of OratorLens Contrastive Speech Analytics.

Transforms raw acoustic metric deltas (Delta pitch, Delta energy, Delta cadence, pause anomalies)
into human-readable rhetorical critique and actionable vocal coaching directives grounded in
classical oratory principles.
"""

from typing import List, Dict, Any, Optional


class CausalExplainer:
    """
    Categorizes acoustic flaw windows and produces structured,
    pedagogically sound forensic critique with mathematical evidence.
    """

    def __init__(self):
        pass

    def match_transcript_segment(
        self,
        start_sec: float,
        end_sec: float,
        transcript_timeline: Optional[List[Dict[str, Any]]] = None,
        full_transcript: str = "",
    ) -> str:
        """
        Extract the transcript excerpt corresponding to the temporal flaw window [t_start, t_end].
        """
        if transcript_timeline:
            matched_words = []
            for seg in transcript_timeline:
                s_t = seg.get("start_sec", 0.0)
                e_t = seg.get("end_sec", 0.0)
                # Overlap check
                if max(start_sec, s_t) < min(end_sec, e_t):
                    matched_words.append(seg.get("text", ""))
            if matched_words:
                return " ".join(matched_words).strip()

        # Fallback to approximate proportional string slicing if time markers are absent
        if full_transcript:
            words = full_transcript.split()
            if words:
                # Approximate 140 WPM (2.33 words/sec)
                start_w = min(len(words) - 1, max(0, int(start_sec * 2.3)))
                end_w = min(len(words), max(start_w + 3, int(end_sec * 2.3) + 1))
                return " ".join(words[start_w:end_w])

        return "Speech excerpt at this timestamp"

    def diagnose_flaw(
        self,
        flaw_idx: int,
        metrics: Dict[str, Any],
        text_segment: str,
    ) -> Dict[str, Any]:
        """
        Classifies flaw category and severity based on acoustic deltas,
        synthesizing causal rationales and coaching tips.
        """
        p_ratio = metrics.get("pitch_variance_ratio", 1.0)
        base_p_std = metrics.get("base_pitch_std_st", 3.5)
        test_p_std = metrics.get("test_pitch_std_st", 3.0)
        energy_delta = metrics.get("energy_delta_db", 0.0)
        c_ratio = metrics.get("cadence_ratio", 1.0)
        base_wpm = metrics.get("base_wpm", 135.0)
        test_wpm = metrics.get("test_wpm", 135.0)
        base_had_pause = metrics.get("base_had_pause", False)
        test_had_pause = metrics.get("test_had_pause", False)
        dur = metrics.get("duration_sec", 1.0)

        flaw_id = f"FLAW-{flaw_idx+1:03d}"
        t_start = metrics.get("start_sec", 0.0)
        t_end = metrics.get("end_sec", 0.0)

        # Classification decision tree based on speech science
        if p_ratio < 0.35:
            category = "MONOTONE_CLIMAX"
            severity = "CRITICAL" if p_ratio < 0.25 else "MAJOR"
            flatter_pct = int(round((1.0 - p_ratio) * 100))
            explanation = (
                f"During this rhetorical phrase, the vocal pitch contour is {flatter_pct}% flatter than the baseline "
                f"(σ_pitch = {test_p_std} st vs baseline σ_pitch = {base_p_std} st). The absence of melodic variation "
                f"deprives the statement of emotional gravity, sounding computerized and uncommitted."
            )
            coaching = (
                f"Elevate pitch on key rhetorical focal words and execute a decisive pitch drop at the terminal cadence "
                f"to signal intellectual certainty."
            )

        elif c_ratio > 1.45 or (test_wpm > 195.0 and c_ratio > 1.25):
            category = "RUSHED_CADENCE"
            severity = "CRITICAL" if c_ratio > 1.65 else "MAJOR"
            wpm_diff = int(round(test_wpm - base_wpm))
            explanation = (
                f"Speech rate accelerated by {wpm_diff} WPM above baseline ({test_wpm} WPM vs {base_wpm} WPM, "
                f"cadence ratio {c_ratio}x). Accelerating through substantive rhetoric prevents listeners from "
                f"digesting conceptual weight and projects nervous delivery."
            )
            coaching = (
                f"Decelerate syllables deliberately. Anchor articulation on stressed vowels and allow a minimum "
                f"350ms buffer prior to initiating the subsequent clause."
            )

        elif base_had_pause and not test_had_pause:
            category = "CLIPPED_DRAMATIC_PAUSE"
            severity = "MAJOR"
            explanation = (
                f"The gold baseline deployed an intentional rhetorical pause here (duration ~600-1100ms) to allow "
                f"the proposition to resonate. The candidate bypassed this punctuation boundary without pausing, "
                f"collapsing rhetorical momentum."
            )
            coaching = (
                f"Insert an intentional silent dramatic pause (700-1000ms) directly before or after this key phrase. "
                f"Do not fear dead air—silence commands listener focus."
            )

        elif not base_had_pause and test_had_pause and dur >= 1.6:
            category = "AWKWARD_HESITATION"
            severity = "CRITICAL" if dur > 2.2 else "MAJOR"
            explanation = (
                f"An unscheduled silence of {dur}s occurred mid-phrase accompanied by an acoustic energy drop "
                f"({energy_delta:+.1f} dB). This suggests cognitive retrieval hesitation or memory lapses rather "
                f"than deliberate oratorical pacing."
            )
            coaching = (
                f"Maintain vocal continuity across internal syntactic clauses. If pausing for effect, ensure "
                f"it aligns cleanly with commas or structural transitions rather than breaking predicate clauses."
            )

        elif abs(energy_delta) > 9.5:
            if energy_delta > 0:
                category = "ERRATIC_VOLUME_SPIKE"
                severity = "MODERATE"
                explanation = (
                    f"Dynamic acoustic energy surged by {energy_delta:+.1f} dBFS relative to baseline without "
                    f"corresponding thematic justification. Uncontrolled volume spikes startle audiences and distort "
                    f"hierarchical emphasis."
                )
                coaching = (
                    f"Modulate projection from diaphragmatic breath support rather than vocal chord straining. "
                    f"Channel intensity through articulate diction rather than sheer decibel volume."
                )
            else:
                category = "DROPPED_DYNAMIC_RANGE"
                severity = "MAJOR"
                explanation = (
                    f"Acoustic projection collapsed by {abs(energy_delta):.1f} dBFS, causing sentence tail fadeout. "
                    f"Vocal energy dropped below audience audibility threshold."
                )
                coaching = (
                    f"Sustain breath pressure through the final syllables of the sentence. Never allow terminal words "
                    f"to trail off into inaudible whispers."
                )

        elif p_ratio < 0.70:
            category = "SUBTLE_PITCH_COMPRESSION"
            severity = "MINOR"
            flatter_pct = int(round((1.0 - p_ratio) * 100))
            explanation = (
                f"Pitch inflection exhibited a {flatter_pct}% compression relative to baseline standard deviation "
                f"({test_p_std} st vs {base_p_std} st). While intelligible, vocal dynamics lacked the persuasive "
                f"dynamic arc demonstrated in the gold recording."
            )
            coaching = (
                f"Widen your vocal pitch aperture. Practice exaggerating intonational inflections during rehearsal to "
                f"build natural micro-variations."
            )

        else:
            category = "CADENCE_INSTABILITY"
            severity = "MODERATE"
            explanation = (
                f"Localized acoustic flux revealed erratic pacing fluctuations (cadence ratio {c_ratio}x, "
                f"divergence index {metrics.get('divergence_score', 0):.2f}). The rhythm lacked metronomic coherence."
            )
            coaching = (
                f"Establish a steady conversational pulse. Synchronize phrasing with natural respiration cycles."
            )

        return {
            "flaw_id": flaw_id,
            "time_range": {
                "start_sec": t_start,
                "end_sec": t_end,
                "duration_sec": dur,
            },
            "text_segment": text_segment,
            "category": category,
            "severity": severity,
            "deviation_metrics": {
                "pitch_variance_ratio": p_ratio,
                "pitch_delta_st": round(test_p_std - base_p_std, 2),
                "energy_delta_db": energy_delta,
                "cadence_ratio": c_ratio,
                "test_wpm": test_wpm,
                "base_wpm": base_wpm,
            },
            "causal_explanation": explanation,
            "actionable_coaching": coaching,
        }

    def generate_all_explanations(
        self,
        flaw_windows: List[Dict[str, Any]],
        transcript_timeline: Optional[List[Dict[str, Any]]] = None,
        full_transcript: str = "",
    ) -> List[Dict[str, Any]]:
        """
        Process all grounded flaw windows into full causal explanation cards.
        """
        flaw_cards = []
        for i, win_metric in enumerate(flaw_windows):
            text_seg = self.match_transcript_segment(
                win_metric["start_sec"],
                win_metric["end_sec"],
                transcript_timeline=transcript_timeline,
                full_transcript=full_transcript,
            )
            card = self.diagnose_flaw(i, win_metric, text_seg)
            flaw_cards.append(card)

        return flaw_cards
