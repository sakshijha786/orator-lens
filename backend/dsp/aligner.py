"""
aligner.py - Multiscale Acoustic Dynamic Time Warping (FastDTW)
Part of OratorLens Contrastive Speech Analytics.

Aligns candidate speech audio against gold-standard baseline audio:
- Constructs multi-dimensional normalized acoustic vectors: [Pitch_semi, RMS_norm, SpectralFlux_norm]
- Computes optimal warping path W = {(t_base^i, t_test^i)}
- Projects candidate trajectory onto the baseline temporal frame
"""

import numpy as np
from typing import List, Tuple, Dict, Any, Optional
from scipy.interpolate import interp1d


class AcousticAligner:
    """
    Performs speaker-agnostic temporal alignment using FastDTW
    on composite acoustic feature trajectories.
    """

    def __init__(self, radius: int = 10, dist_weights: Optional[List[float]] = None):
        """
        Args:
            radius: Search radius window for FastDTW refinement.
            dist_weights: Feature weights for [Pitch_semi, RMS_norm, SpectralFlux_norm].
        """
        self.radius = radius
        # Emphasize pitch dynamics (45%), energy (35%), and onset flux (20%)
        self.dist_weights = np.array(dist_weights or [0.45, 0.35, 0.20], dtype=np.float32)

    def build_feature_matrix(
        self, pitch_semi: np.ndarray, rms_norm: np.ndarray, flux_norm: np.ndarray
    ) -> np.ndarray:
        """
        Stack and weight normalized features into matrix of shape (T, D).
        """
        min_len = min(len(pitch_semi), len(rms_norm), len(flux_norm))
        X = np.column_stack([
            pitch_semi[:min_len],
            rms_norm[:min_len],
            flux_norm[:min_len],
        ]).astype(np.float32)

        # Apply dimensional weights
        X_weighted = X * self.dist_weights
        return X_weighted

    def _euclidean_dist(self, u: np.ndarray, v: np.ndarray) -> float:
        return float(np.sqrt(np.sum((u - v) ** 2)))

    def standard_dtw(
        self, X: np.ndarray, Y: np.ndarray, window_mask: Optional[np.ndarray] = None
    ) -> Tuple[float, List[Tuple[int, int]]]:
        """
        Standard DTW with optional constraint window.
        X: shape (N, D), Y: shape (M, D)
        """
        N, M = len(X), len(Y)
        cost_matrix = np.full((N + 1, M + 1), np.inf, dtype=np.float32)
        cost_matrix[0, 0] = 0.0

        for i in range(1, N + 1):
            for j in range(1, M + 1):
                if window_mask is not None and not window_mask[i - 1, j - 1]:
                    continue
                d = self._euclidean_dist(X[i - 1], Y[j - 1])
                cost_matrix[i, j] = d + min(
                    cost_matrix[i - 1, j],      # insertion
                    cost_matrix[i, j - 1],      # deletion
                    cost_matrix[i - 1, j - 1],  # match
                )

        # Backtrack optimal warping path
        i, j = N, M
        path = []
        while i > 0 and j > 0:
            path.append((i - 1, j - 1))
            steps = [
                (cost_matrix[i - 1, j - 1], i - 1, j - 1),
                (cost_matrix[i - 1, j], i - 1, j),
                (cost_matrix[i, j - 1], i, j - 1),
            ]
            steps.sort(key=lambda s: s[0])
            _, i, j = steps[0]

        path.reverse()
        total_cost = float(cost_matrix[N, M])
        return total_cost, path

    def _downsample(self, arr: np.ndarray) -> np.ndarray:
        if len(arr) <= 1:
            return arr
        n = len(arr)
        even = arr[: n - (n % 2)].reshape(-1, 2, arr.shape[1]).mean(axis=1)
        if n % 2 != 0:
            return np.vstack([even, arr[-1:]])
        return even

    def fastdtw(
        self, X: np.ndarray, Y: np.ndarray, radius: Optional[int] = None
    ) -> Tuple[float, List[Tuple[int, int]]]:
        """
        Multiscale FastDTW implementation.
        Recursively downsamples, computes path, and refines in a corridor of size `radius`.
        """
        r = radius if radius is not None else self.radius
        min_ts_size = max(20, r + 4)

        if len(X) <= min_ts_size or len(Y) <= min_ts_size:
            return self.standard_dtw(X, Y)

        # Downsample signals by factor of 2 cleanly
        X_coarse = self._downsample(X)
        Y_coarse = self._downsample(Y)

        # Recursive call at coarser scale
        _, coarse_path = self.fastdtw(X_coarse, Y_coarse, radius=r)

        # Project coarse path onto fine scale and construct window mask
        N, M = len(X), len(Y)
        window_mask = np.zeros((N, M), dtype=bool)

        for ci, cj in coarse_path:
            i_low = max(0, 2 * ci - r)
            i_high = min(N, 2 * ci + 2 + r)
            j_low = max(0, 2 * cj - r)
            j_high = min(M, 2 * cj + 2 + r)
            window_mask[i_low:i_high, j_low:j_high] = True

        return self.standard_dtw(X, Y, window_mask=window_mask)

    def align_acoustic_features(
        self,
        base_features: Dict[str, np.ndarray],
        test_features: Dict[str, np.ndarray],
        base_times: np.ndarray,
        test_times: np.ndarray,
    ) -> Dict[str, Any]:
        """
        Executes end-to-end alignment between Baseline and Candidate speech.
        Warps candidate acoustic features onto the baseline temporal frame.
        """
        X_base = self.build_feature_matrix(
            base_features["pitch_semitones"],
            base_features["rms_zscore"],
            base_features["flux_zscore"],
        )
        Y_test = self.build_feature_matrix(
            test_features["pitch_semitones"],
            test_features["rms_zscore"],
            test_features["flux_zscore"],
        )

        cost, path = self.fastdtw(X_base, Y_test)

        base_indices = np.array([p[0] for p in path])
        test_indices = np.array([p[1] for p in path])

        t_base_mapped = base_times[base_indices]
        t_test_mapped = test_times[test_indices]

        # Resample test features onto baseline time grid using warp path
        # Map each baseline index to its aligned test index
        unique_base_idx, first_idx = np.unique(base_indices, return_index=True)
        aligned_test_idx = test_indices[first_idx]

        f_warp = interp1d(
            unique_base_idx,
            aligned_test_idx,
            kind="linear",
            bounds_error=False,
            fill_value=(aligned_test_idx[0], aligned_test_idx[-1]),
        )
        resampled_test_idx = np.clip(f_warp(np.arange(len(base_times))), 0, len(test_times) - 1).astype(int)

        # Warp candidate features to baseline time points
        warped_test_pitch_semi = test_features["pitch_semitones"][resampled_test_idx]
        warped_test_rms_db = test_features["rms_db"][resampled_test_idx]
        warped_test_rms_z = test_features["rms_zscore"][resampled_test_idx]
        warped_test_wpm = test_features["wpm_contour"][resampled_test_idx]

        # Time-warp delay / dilation metric
        time_dilation = t_test_mapped - t_base_mapped

        return {
            "alignment_cost": round(cost / max(1, len(path)), 4),
            "warp_path": [(int(p[0]), int(p[1])) for p in path],
            "base_times": base_times,
            "warped_test_times": t_test_mapped,
            "warped_test_pitch_semi": warped_test_pitch_semi,
            "warped_test_rms_db": warped_test_rms_db,
            "warped_test_rms_z": warped_test_rms_z,
            "warped_test_wpm": warped_test_wpm,
            "time_dilation_sec": time_dilation,
        }
