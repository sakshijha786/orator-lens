"""
normalizer.py - Speaker-Agnostic Acoustic Feature Normalization
Part of OratorLens Contrastive Speech Analytics.

Provides mathematically sound normalization:
1. Semitone Pitch Conversion relative to speaker median F0:
   Pitch_semi(t) = 12 * log2(F0(t) / (median(F0) + epsilon))
   Erases biological gender and vocal register differences.
2. Z-score normalization of RMS Energy and Spectral Centroid:
   Z_feature(t) = (x(t) - mu_x) / (sigma_x + epsilon)
"""

import numpy as np
from typing import Dict, Tuple, Optional


class AudioNormalizer:
    """
    Transforms acoustic features into speaker-agnostic representations
    so contrastive analysis measures rhetorical inflection rather than
    biological pitch register or recording microphone gain.
    """

    def __init__(self, epsilon: float = 1e-7):
        self.epsilon = epsilon

    def f0_to_semitones(
        self, f0: np.ndarray, reference_f0: Optional[float] = None
    ) -> Tuple[np.ndarray, float]:
        """
        Convert fundamental frequency (Hz) into relative semitones (st)
        above the speaker's voiced median:
            Pitch_semi(t) = 12 * log2(F0(t) / (median(F0) + eps))

        Args:
            f0: Array of fundamental frequency estimates in Hz.
            reference_f0: Optional fixed reference (Hz). If None, computed from voiced median.

        Returns:
            semitones: Normalized pitch contour in semitones (0.0 = speaker baseline median).
                       Unvoiced frames are assigned 0.0.
            median_f0: The speaker's median voiced pitch (Hz).
        """
        f0_clean = np.nan_to_num(f0, nan=0.0, posinf=0.0, neginf=0.0)
        voiced_mask = f0_clean > 30.0  # human speech fundamental frequency floor

        if reference_f0 is None:
            if np.any(voiced_mask):
                median_f0 = float(np.median(f0_clean[voiced_mask]))
            else:
                median_f0 = 120.0  # fallback human median F0
        else:
            median_f0 = float(reference_f0)

        semitones = np.zeros_like(f0_clean, dtype=float)
        if np.any(voiced_mask) and median_f0 > 0:
            ratio = np.maximum(f0_clean[voiced_mask], self.epsilon) / (median_f0 + self.epsilon)
            semitones[voiced_mask] = 12.0 * np.log2(ratio)

        return semitones, median_f0

    def z_score_normalize(
        self, feature: np.ndarray
    ) -> Tuple[np.ndarray, float, float]:
        """
        Normalize feature vector to zero-mean unit-variance:
            Z_feature(t) = (x(t) - mu_x) / (sigma_x + epsilon)

        Args:
            feature: 1D or 2D array of acoustic values.

        Returns:
            z_feature: Standardized feature array.
            mean: Original mean value.
            std: Original standard deviation.
        """
        clean_feat = np.nan_to_num(feature, nan=0.0, posinf=0.0, neginf=0.0)
        mean_val = float(np.mean(clean_feat))
        std_val = float(np.std(clean_feat))

        z_feature = (clean_feat - mean_val) / (std_val + self.epsilon)
        return z_feature, mean_val, std_val

    def normalize_feature_bundle(
        self,
        f0: np.ndarray,
        rms_db: np.ndarray,
        spectral_centroid: np.ndarray,
        flux: Optional[np.ndarray] = None,
    ) -> Dict[str, np.ndarray]:
        """
        Normalize an entire suite of acoustic time-series features.
        """
        semitones, median_f0 = self.f0_to_semitones(f0)
        rms_z, rms_mu, rms_sigma = self.z_score_normalize(rms_db)
        sc_z, sc_mu, sc_sigma = self.z_score_normalize(spectral_centroid)

        out = {
            "pitch_semitones": semitones,
            "median_f0": np.array([median_f0]),
            "rms_zscore": rms_z,
            "rms_mean": np.array([rms_mu]),
            "rms_std": np.array([rms_sigma]),
            "spectral_centroid_zscore": sc_z,
            "spectral_centroid_mean": np.array([sc_mu]),
            "spectral_centroid_std": np.array([sc_sigma]),
        }

        if flux is not None:
            flux_z, flux_mu, flux_sigma = self.z_score_normalize(flux)
            out["flux_zscore"] = flux_z

        return out
