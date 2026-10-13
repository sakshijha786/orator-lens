"""
rubric_scorer.py - Forensic Scoring Rubric (100-Point Composite)
Part of OratorLens Contrastive Speech Analytics.

Implements the official Competitive Forensics Speech Evaluation Rubric:
1. Vocal Variety & Inflection (25 pts)
2. Pacing & Cadence Consistency (25 pts)
3. Dramatic Pauses & Timing (25 pts)
4. Energy & Dynamic Contrast (25 pts)
Composite total score (0-100), letter grade (A+ to F), radar dimensions, and diagnostic summary.
"""

import numpy as np
from typing import Dict, Any, List


class ForensicRubricScorer:
    """
    Computes objective, standardized speech scores calibrated against
    the gold baseline's acoustic standards.
    """

    def __init__(self):
        pass

    def evaluate_vocal_variety(
        self,
        base_features: Dict[str, Any],
        test_features: Dict[str, Any],
        flaw_cards: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Pillar 1: Vocal Variety & Inflection (25 points max)
        Evaluates semitone pitch dispersion, contour richness, and avoidance of monotone flatlining.
        """
        base_p = base_features.get("pitch_semitones", np.array([0.0]))
        test_p = test_features.get("pitch_semitones", np.array([0.0]))

        base_std = float(np.std(base_p)) if len(base_p) > 0 else 3.5
        test_std = float(np.std(test_p)) if len(test_p) > 0 else 1.0

        variance_ratio = test_std / (base_std + 1e-6)

        # Base score on ratio
        if variance_ratio >= 0.85:
            score = 23.0 + min(2.0, (variance_ratio - 0.85) * 10)
        elif variance_ratio >= 0.65:
            score = 19.0 + (variance_ratio - 0.65) * 20
        elif variance_ratio >= 0.40:
            score = 13.0 + (variance_ratio - 0.40) * 24
        elif variance_ratio >= 0.20:
            score = 7.0 + (variance_ratio - 0.20) * 30
        else:
            score = max(2.0, variance_ratio * 35)

        # Deduct for monotone climax flaws
        monotone_flaws = [f for f in flaw_cards if f["category"] == "MONOTONE_CLIMAX"]
        score -= min(8.0, len(monotone_flaws) * 3.0)
        score = float(np.clip(score, 1.0, 25.0))

        status = "EXCELLENT" if score >= 21 else "PROFICIENT" if score >= 17 else "DEVELOPING" if score >= 12 else "DEFICIENT"
        return {
            "score": round(score, 1),
            "max_score": 25.0,
            "status": status,
            "pitch_std_st": round(test_std, 2),
            "baseline_pitch_std_st": round(base_std, 2),
            "pitch_variance_ratio": round(variance_ratio, 2),
            "feedback": (
                "Dynamic vocal inflection matching oratorical baseline standards."
                if score >= 20
                else "Pitch contour displays flattening; melodic variation requires amplification during key statements."
            ),
        }

    def evaluate_pacing_cadence(
        self,
        base_features: Dict[str, Any],
        test_features: Dict[str, Any],
        flaw_cards: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Pillar 2: Pacing & Cadence Consistency (25 points max)
        Evaluates dynamic WPM deviation and syllable rate cadence smoothness.
        """
        base_wpm = float(base_features.get("mean_wpm", 135.0))
        test_wpm = float(test_features.get("mean_wpm", 135.0))

        wpm_ratio = test_wpm / (base_wpm + 1e-6)
        wpm_delta = abs(test_wpm - base_wpm)

        # Pacing score model
        if wpm_delta <= 12:
            score = 23.5 + (12 - wpm_delta) * 0.12
        elif wpm_delta <= 25:
            score = 19.0 + (25 - wpm_delta) * 0.35
        elif wpm_delta <= 45:
            score = 13.0 + (45 - wpm_delta) * 0.30
        elif wpm_delta <= 75:
            score = 7.0 + (75 - wpm_delta) * 0.20
        else:
            score = max(2.0, 7.0 - (wpm_delta - 75) * 0.08)

        # Deduct for rushed flaws
        rushed_flaws = [f for f in flaw_cards if f["category"] == "RUSHED_CADENCE"]
        score -= min(7.0, len(rushed_flaws) * 2.5)
        score = float(np.clip(score, 1.0, 25.0))

        status = "EXCELLENT" if score >= 21 else "PROFICIENT" if score >= 17 else "DEVELOPING" if score >= 12 else "DEFICIENT"
        return {
            "score": round(score, 1),
            "max_score": 25.0,
            "status": status,
            "mean_wpm": round(test_wpm, 1),
            "baseline_wpm": round(base_wpm, 1),
            "wpm_delta": round(wpm_delta, 1),
            "cadence_ratio": round(wpm_ratio, 2),
            "feedback": (
                "Rhythmically disciplined tempo with controlled syllabic cadence."
                if score >= 20
                else f"Cadence deviates significantly ({test_wpm:.0f} WPM vs ideal {base_wpm:.0f} WPM). Strive for deliberate tempo control."
            ),
        }

    def evaluate_pauses_timing(
        self,
        base_features: Dict[str, Any],
        test_features: Dict[str, Any],
        flaw_cards: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Pillar 3: Dramatic Pauses & Timing (25 points max)
        Evaluates intentional rhetorical pauses (400-1500ms) vs awkward pauses (>1800ms) and clipped pauses.
        """
        base_pauses = base_features.get("pauses", [])
        test_pauses = test_features.get("pauses", [])

        rhetorical_count = sum(1 for p in test_pauses if p.get("category") == "RHETORICAL_PAUSE")
        awkward_count = sum(1 for p in test_pauses if p.get("category") == "AWKWARD_HESITATION")

        base_rhetorical = sum(1 for p in base_pauses if p.get("category") == "RHETORICAL_PAUSE")
        expected_rhetorical = max(1, base_rhetorical)

        # Recall of dramatic pauses
        pause_recall = min(1.0, rhetorical_count / expected_rhetorical)
        score = 15.0 * pause_recall + 10.0

        # Penalties for awkward pauses and clipped pauses
        score -= awkward_count * 4.0
        clipped_flaws = [f for f in flaw_cards if f["category"] == "CLIPPED_DRAMATIC_PAUSE"]
        score -= len(clipped_flaws) * 3.0
        score = float(np.clip(score, 1.0, 25.0))

        status = "EXCELLENT" if score >= 21 else "PROFICIENT" if score >= 17 else "DEVELOPING" if score >= 12 else "DEFICIENT"
        return {
            "score": round(score, 1),
            "max_score": 25.0,
            "status": status,
            "rhetorical_pauses_count": rhetorical_count,
            "awkward_hesitations_count": awkward_count,
            "baseline_rhetorical_count": expected_rhetorical,
            "feedback": (
                "Commanding use of rhetorical stillness and dramatic pauses."
                if score >= 20
                else "Timing deficiencies observed; either dramatic pauses were clipped or unscheduled hesitations occurred."
            ),
        }

    def evaluate_energy_dynamics(
        self,
        base_features: Dict[str, Any],
        test_features: Dict[str, Any],
        flaw_cards: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Pillar 4: Energy & Dynamic Contrast (25 points max)
        Evaluates dynamic range spread (95th percentile dBFS - 10th percentile dBFS)
        and absence of erratic volume spikes or whisper drops.
        """
        base_rms = base_features.get("rms_db", np.array([-30.0]))
        test_rms = test_features.get("rms_db", np.array([-30.0]))

        base_dr = float(np.percentile(base_rms, 95) - np.percentile(base_rms, 10)) if len(base_rms) > 0 else 24.0
        test_dr = float(np.percentile(test_rms, 95) - np.percentile(test_rms, 10)) if len(test_rms) > 0 else 10.0

        dr_ratio = test_dr / (base_dr + 1e-6)

        if dr_ratio >= 0.80:
            score = 22.0 + min(3.0, (dr_ratio - 0.80) * 10)
        elif dr_ratio >= 0.60:
            score = 18.0 + (dr_ratio - 0.60) * 20
        elif dr_ratio >= 0.40:
            score = 12.0 + (dr_ratio - 0.40) * 30
        else:
            score = max(2.0, dr_ratio * 30)

        # Deduct for erratic volume flaws
        volume_flaws = [f for f in flaw_cards if "VOLUME" in f["category"] or "DYNAMIC" in f["category"]]
        score -= min(6.0, len(volume_flaws) * 2.5)
        score = float(np.clip(score, 1.0, 25.0))

        status = "EXCELLENT" if score >= 21 else "PROFICIENT" if score >= 17 else "DEVELOPING" if score >= 12 else "DEFICIENT"
        return {
            "score": round(score, 1),
            "max_score": 25.0,
            "status": status,
            "dynamic_range_db": round(test_dr, 1),
            "baseline_dynamic_range_db": round(base_dr, 1),
            "dynamic_range_ratio": round(dr_ratio, 2),
            "feedback": (
                "Vibrant acoustic projection with confident dynamic contrast between stressed and unstressed syllables."
                if score >= 20
                else "Compressed acoustic dynamic range; needs greater contrast between reflective and emphatic phrases."
            ),
        }

    def compute_full_scorecard(
        self,
        base_features: Dict[str, Any],
        test_features: Dict[str, Any],
        flaw_cards: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Synthesizes all 4 forensic pillars into composite score, letter grade, and diagnostic report.
        """
        p1 = self.evaluate_vocal_variety(base_features, test_features, flaw_cards)
        p2 = self.evaluate_pacing_cadence(base_features, test_features, flaw_cards)
        p3 = self.evaluate_pauses_timing(base_features, test_features, flaw_cards)
        p4 = self.evaluate_energy_dynamics(base_features, test_features, flaw_cards)

        total_score = round(p1["score"] + p2["score"] + p3["score"] + p4["score"], 1)

        # Letter grade classification
        if total_score >= 93.0:
            letter_grade = "A+"
            grade_title = "Master Orator"
            percentile = 99
        elif total_score >= 87.0:
            letter_grade = "A"
            grade_title = "Distinguished Rhetorician"
            percentile = 94
        elif total_score >= 80.0:
            letter_grade = "B+"
            grade_title = "Strong Competitive Orator"
            percentile = 85
        elif total_score >= 72.0:
            letter_grade = "B"
            grade_title = "Competent Delivery"
            percentile = 74
        elif total_score >= 63.0:
            letter_grade = "C"
            grade_title = "Developing Amateur"
            percentile = 58
        elif total_score >= 50.0:
            letter_grade = "D"
            grade_title = "Substantially Flawed"
            percentile = 35
        else:
            letter_grade = "F"
            grade_title = "Egregious / Botched Delivery"
            percentile = 12

        # Summary bullets
        strengths = []
        weaknesses = []

        pillars = [
            ("Vocal Variety & Inflection", p1),
            ("Pacing & Cadence Consistency", p2),
            ("Dramatic Pauses & Timing", p3),
            ("Energy & Dynamic Contrast", p4),
        ]

        for name, p in pillars:
            if p["score"] >= 19.5:
                strengths.append(f"{name} ({p['score']}/25): {p['feedback']}")
            elif p["score"] <= 15.0:
                weaknesses.append(f"{name} ({p['score']}/25): {p['feedback']}")

        if not strengths:
            strengths.append("Intelligible baseline articulation across spoken text segments.")
        if not weaknesses:
            weaknesses.append("Minor micro-cadence polish required for international competition tier.")

        radar_data = [
            {"subject": "Vocal Variety", "score": p1["score"], "fullMark": 25, "baseline": 23.5},
            {"subject": "Pacing & Cadence", "score": p2["score"], "fullMark": 25, "baseline": 24.0},
            {"subject": "Dramatic Pauses", "score": p3["score"], "fullMark": 25, "baseline": 23.0},
            {"subject": "Dynamic Contrast", "score": p4["score"], "fullMark": 25, "baseline": 24.5},
        ]

        return {
            "total_score": total_score,
            "max_score": 100.0,
            "letter_grade": letter_grade,
            "grade_title": grade_title,
            "percentile": percentile,
            "flaw_count": len(flaw_cards),
            "pillars": {
                "vocal_variety": p1,
                "pacing_cadence": p2,
                "dramatic_pauses": p3,
                "energy_dynamics": p4,
            },
            "radar_data": radar_data,
            "strengths": strengths,
            "weaknesses": weaknesses,
        }
