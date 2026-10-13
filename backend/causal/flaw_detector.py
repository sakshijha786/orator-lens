"""
flaw_detector.py - Temporal Flaw Grounding & Metric Divergence
Part of OratorLens Contrastive Speech Analytics.

Isolates exact temporal intervals [t_start, t_end] where candidate speech diverges
acoustically from the gold-standard baseline using adaptive thresholding:
    Delta_metric(t) = |X_base(t) - Y_warped(t)|
    Threshold = mu_delta + 2.0 * sigma_delta
"""

import numpy as np
from typing import List, Dict, Any, Tuple


class TemporalFlawDetector:
    """
    Detects and isolates contiguous flaw windows in speech delivery
    by analyzing time-localized divergence across pitch, energy, tempo, and pauses.
    """

    def __init__(
        self,
        z_threshold_multiplier: float = 1.8,
        min_flaw_duration_sec: float = 0.40,
        merge_gap_sec: float = 0.35,
    ):
        self.k_multiplier = z_threshold_multiplier
        self.min_duration = min_flaw_duration_sec
        self.merge_gap = merge_gap_sec

    def compute_composite_divergence(
        self,
        base_pitch_semi: np.ndarray,
        warped_test_pitch_semi: np.ndarray,
        base_rms_z: np.ndarray,
        warped_test_rms_z: np.ndarray,
        base_wpm: np.ndarray,
        warped_test_wpm: np.ndarray,
    ) -> Tuple[np.ndarray, Dict[str, np.ndarray]]:
        """
        Calculates moving window divergence across pitch inflection,
        energy dynamic contrast, and cadence.
        """
        min_len = min(
            len(base_pitch_semi),
            len(warped_test_pitch_semi),
            len(base_rms_z),
            len(warped_test_rms_z),
            len(base_wpm),
            len(warped_test_wpm),
        )

        # Truncate to uniform length
        p_base = base_pitch_semi[:min_len]
        p_test = warped_test_pitch_semi[:min_len]
        e_base = base_rms_z[:min_len]
        e_test = warped_test_rms_z[:min_len]
        w_base = base_wpm[:min_len]
        w_test = warped_test_wpm[:min_len]

        # Individual metric absolute deltas
        delta_pitch = np.abs(p_base - p_test)
        delta_energy = np.abs(e_base - e_test)
        # Normalized tempo delta
        delta_wpm = np.abs(w_base - w_test) / (np.maximum(w_base, 30.0))

        # Composite multi-metric divergence (weighted)
        delta_composite = (0.45 * delta_pitch) + (0.35 * delta_energy) + (0.20 * delta_wpm * 5.0)

        # Smooth divergence curve with a moving average window (~0.3s)
        win_size = 5
        if min_len >= win_size:
            kernel = np.ones(win_size) / win_size
            delta_composite = np.convolve(delta_composite, kernel, mode="same")

        deltas = {
            "composite": delta_composite,
            "delta_pitch": delta_pitch,
            "delta_energy": delta_energy,
            "delta_wpm": delta_wpm,
        }
        return delta_composite, deltas

    def isolate_flaw_windows(
        self,
        times: np.ndarray,
        delta_composite: np.ndarray,
    ) -> List[Dict[str, Any]]:
        """
        Isolate contiguous segments where divergence exceeds adaptive threshold:
            Threshold = mean(delta) + k * std(delta)
        Filters out transient noise spikes (< min_duration) and merges nearby segments.
        """
        mu_d = float(np.mean(delta_composite))
        sigma_d = float(np.std(delta_composite))
        threshold = mu_d + (self.k_multiplier * sigma_d)

        above_thresh = delta_composite > threshold
        raw_windows = []
        in_flaw = False
        start_idx = 0

        for i, val in enumerate(above_thresh):
            if val and not in_flaw:
                in_flaw = True
                start_idx = i
            elif not val and in_flaw:
                in_flaw = False
                t_start = times[start_idx]
                t_end = times[i - 1]
                if (t_end - t_start) >= self.min_duration:
                    raw_windows.append({
                        "start_idx": start_idx,
                        "end_idx": i - 1,
                        "start_sec": float(t_start),
                        "end_sec": float(t_end),
                        "peak_divergence": float(np.max(delta_composite[start_idx:i])),
                        "mean_divergence": float(np.mean(delta_composite[start_idx:i])),
                    })

        if in_flaw:
            t_start = times[start_idx]
            t_end = times[-1]
            if (t_end - t_start) >= self.min_duration:
                raw_windows.append({
                    "start_idx": start_idx,
                    "end_idx": len(times) - 1,
                    "start_sec": float(t_start),
                    "end_sec": float(t_end),
                    "peak_divergence": float(np.max(delta_composite[start_idx:])),
                    "mean_divergence": float(np.mean(delta_composite[start_idx:])),
                })

        # Merge neighboring flaw windows separated by less than merge_gap_sec
        merged_windows = []
        for win in raw_windows:
            if not merged_windows:
                merged_windows.append(win)
            else:
                last_win = merged_windows[-1]
                if (win["start_sec"] - last_win["end_sec"]) <= self.merge_gap:
                    last_win["end_sec"] = win["end_sec"]
                    last_win["end_idx"] = win["end_idx"]
                    last_win["peak_divergence"] = max(last_win["peak_divergence"], win["peak_divergence"])
                    last_win["mean_divergence"] = (last_win["mean_divergence"] + win["mean_divergence"]) / 2.0
                else:
                    merged_windows.append(win)

        return merged_windows

    def extract_window_metrics(
        self,
        window: Dict[str, Any],
        base_features: Dict[str, Any],
        test_features: Dict[str, Any],
        warped_features: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Compute localized acoustic deltas inside the detected flaw window.
        """
        s_idx = window["start_idx"]
        e_idx = window["end_idx"] + 1

        # Pitch contour slice
        base_p = base_features["pitch_semitones"][s_idx:e_idx]
        test_p = warped_features["warped_test_pitch_semi"][s_idx:e_idx]

        base_p_std = float(np.std(base_p)) if len(base_p) > 0 else 1.0
        test_p_std = float(np.std(test_p)) if len(test_p) > 0 else 0.1
        pitch_variance_ratio = test_p_std / (base_p_std + 1e-6)

        # Energy dynamics slice
        base_rms_db = base_features["rms_db"][s_idx:e_idx]
        test_rms_db = warped_features["warped_test_rms_db"][s_idx:e_idx]
        energy_delta_db = float(np.mean(test_rms_db) - np.mean(base_rms_db)) if len(base_rms_db) > 0 else 0.0

        # Cadence / tempo slice
        base_wpm = base_features["wpm_contour"][s_idx:e_idx]
        test_wpm = warped_features["warped_test_wpm"][s_idx:e_idx]
        base_wpm_mean = float(np.mean(base_wpm)) if len(base_wpm) > 0 else 130.0
        test_wpm_mean = float(np.mean(test_wpm)) if len(test_wpm) > 0 else 130.0
        cadence_ratio = test_wpm_mean / (base_wpm_mean + 1e-6)

        # Pause alignment check within the window
        t_start = window["start_sec"]
        t_end = window["end_sec"]
        base_had_pause = any(
            p["start_sec"] >= t_start - 0.2 and p["end_sec"] <= t_end + 0.2
            for p in base_features.get("pauses", [])
        )
        test_had_pause = any(
            p["start_sec"] >= t_start - 0.2 and p["end_sec"] <= t_end + 0.2
            for p in test_features.get("pauses", [])
        )

        return {
            "start_sec": round(window["start_sec"], 2),
            "end_sec": round(window["end_sec"], 2),
            "duration_sec": round(window["end_sec"] - window["start_sec"], 2),
            "pitch_variance_ratio": round(pitch_variance_ratio, 2),
            "base_pitch_std_st": round(base_p_std, 2),
            "test_pitch_std_st": round(test_p_std, 2),
            "energy_delta_db": round(energy_delta_db, 1),
            "cadence_ratio": round(cadence_ratio, 2),
            "base_wpm": round(base_wpm_mean, 1),
            "test_wpm": round(test_wpm_mean, 1),
            "base_had_pause": base_had_pause,
            "test_had_pause": test_had_pause,
            "divergence_score": round(window["mean_divergence"], 2),
        }
