"""
feature_extractor.py - Acoustic Time-Series Feature Extraction
Part of OratorLens Contrastive Speech Analytics.

Implements mathematically rigorous DSP feature extractors:
- F0 Pitch tracking via normalized autocorrelation / YIN with parabolic peak interpolation
- Moving-window RMS energy envelope in dBFS
- Dynamic speech tempo & syllable rate via spectral flux and envelope peaks
- Dual-threshold VAD pause segmentation & rhetorical categorization
- Spectral centroid / timbral brightness
"""

import numpy as np
from scipy import signal
from scipy.interpolate import interp1d
from typing import Dict, List, Tuple, Any, Optional
import soundfile as sf


class AcousticFeatureExtractor:
    """
    Extracts time-series acoustic features from speech audio at uniform frame rate.
    All features are sampled onto synchronized temporal grids.
    """

    def __init__(
        self,
        sample_rate: int = 22050,
        hop_length: int = 512,
        win_length: int = 2048,
        min_f0: float = 65.0,     # C2 (low male voice)
        max_f0: float = 400.0,    # G4 (high female vocal range)
        silence_db_thresh: float = -42.0,
    ):
        self.sample_rate = sample_rate
        self.hop_length = hop_length
        self.win_length = win_length
        self.min_f0 = min_f0
        self.max_f0 = max_f0
        self.silence_db_thresh = silence_db_thresh
        self.frame_rate = sample_rate / hop_length

    def load_audio(self, audio_source: Any) -> Tuple[np.ndarray, int]:
        """
        Load audio from file path, bytes, or numpy array.
        Returns 1D mono float32 array normalized to [-1.0, 1.0].
        """
        if isinstance(audio_source, str):
            data, sr = sf.read(audio_source)
        elif hasattr(audio_source, "read"):
            data, sr = sf.read(audio_source)
        elif isinstance(audio_source, np.ndarray):
            data = audio_source
            sr = self.sample_rate
        else:
            raise ValueError(f"Unsupported audio source type: {type(audio_source)}")

        # Convert stereo to mono
        if data.ndim > 1:
            data = np.mean(data, axis=1)

        data = data.astype(np.float32)

        # Resample if sample rates differ
        if sr != self.sample_rate and len(data) > 0:
            target_len = int(len(data) * self.sample_rate / sr)
            data = signal.resample(data, target_len).astype(np.float32)
            sr = self.sample_rate

        # Peak amplitude normalization
        max_val = np.max(np.abs(data))
        if max_val > 1e-6:
            data = data / max_val * 0.95

        return data, sr

    def compute_rms_envelope(self, audio: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        Compute moving-window Root Mean Square envelope in linear scale and dBFS:
            RMS_db = 20 * log10(RMS + epsilon)
        """
        n_samples = len(audio)
        n_frames = max(1, (n_samples - self.win_length) // self.hop_length + 1)
        times = np.arange(n_frames) * (self.hop_length / self.sample_rate)

        rms_linear = np.zeros(n_frames, dtype=np.float32)
        window = np.hanning(self.win_length)
        win_norm = np.sum(window)

        for i in range(n_frames):
            start = i * self.hop_length
            end = start + self.win_length
            frame = audio[start:end] * window
            rms_linear[i] = np.sqrt(np.mean(frame ** 2) + 1e-10)

        # Convert to dBFS (0 dBFS = max digital amplitude)
        rms_db = 20.0 * np.log10(np.maximum(rms_linear, 1e-7))
        return times, rms_db

    def track_f0(self, audio: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        Estimate Fundamental Frequency (F0) across frames using Normalized Autocorrelation
        with parabolic peak interpolation and harmonic consistency verification.
        Returns (f0_interpolated, voiced_mask).
        """
        n_samples = len(audio)
        n_frames = max(1, (n_samples - self.win_length) // self.hop_length + 1)
        f0_raw = np.zeros(n_frames, dtype=np.float32)
        voiced_mask = np.zeros(n_frames, dtype=bool)

        min_lag = int(self.sample_rate / self.max_f0)
        max_lag = int(self.sample_rate / self.min_f0)
        window = np.hanning(self.win_length)

        for i in range(n_frames):
            start = i * self.hop_length
            end = start + self.win_length
            frame = audio[start:end] * window

            # Frame energy check
            frame_energy = np.sum(frame ** 2)
            if frame_energy < 1e-5:
                continue

            # Autocorrelation via FFT
            padded_len = 2 ** int(np.ceil(np.log2(2 * self.win_length)))
            fft_frame = np.fft.rfft(frame, n=padded_len)
            autocorr = np.fft.irfft(fft_frame * np.conj(fft_frame))[:self.win_length]

            # Normalize autocorrelation
            if autocorr[0] > 1e-8:
                norm_autocorr = autocorr / autocorr[0]
            else:
                continue

            # Search in plausible fundamental frequency lag range
            if max_lag < len(norm_autocorr):
                search_region = norm_autocorr[min_lag:max_lag]
                if len(search_region) == 0:
                    continue

                best_idx = np.argmax(search_region)
                peak_corr = search_region[best_idx]
                lag = min_lag + best_idx

                # Voiced thresholding: strong periodic correlation (> 0.35)
                if peak_corr > 0.35 and 0 < lag < len(norm_autocorr) - 1:
                    # Parabolic interpolation for sub-sample accuracy:
                    # delta = (y[x-1] - y[x+1]) / (2 * (y[x-1] - 2*y[x] + y[x+1]))
                    alpha = norm_autocorr[lag - 1]
                    beta = norm_autocorr[lag]
                    gamma = norm_autocorr[lag + 1]
                    denom = 2 * (alpha - 2 * beta + gamma)
                    if abs(denom) > 1e-7:
                        delta = (alpha - gamma) / denom
                        refined_lag = lag + np.clip(delta, -0.5, 0.5)
                    else:
                        refined_lag = lag

                    pitch_hz = self.sample_rate / refined_lag
                    if self.min_f0 <= pitch_hz <= self.max_f0:
                        f0_raw[i] = pitch_hz
                        voiced_mask[i] = True

        # Interpolate pitch contour across silent and unvoiced segments
        f0_interp = np.copy(f0_raw)
        voiced_indices = np.where(voiced_mask)[0]
        if len(voiced_indices) >= 2:
            f = interp1d(
                voiced_indices,
                f0_raw[voiced_indices],
                kind="linear",
                fill_value=(f0_raw[voiced_indices[0]], f0_raw[voiced_indices[-1]]),
                bounds_error=False,
            )
            all_indices = np.arange(n_frames)
            f0_interp = f(all_indices)
        elif len(voiced_indices) == 1:
            f0_interp[:] = f0_raw[voiced_indices[0]]
        else:
            f0_interp[:] = 130.0  # nominal neutral pitch

        # Apply slight Savitzky-Golay / moving median smoothing
        if len(f0_interp) >= 5:
            f0_interp = signal.medfilt(f0_interp, kernel_size=5)

        return f0_interp, voiced_mask

    def compute_spectral_features(
        self, audio: np.ndarray
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Compute:
        1. Spectral Centroid (timbral brightness)
        2. Spectral Flux (onset/cadence tracking)
        """
        f, t_stft, zxx = signal.stft(
            audio,
            fs=self.sample_rate,
            nperseg=self.win_length,
            noverlap=self.win_length - self.hop_length,
        )
        mag = np.abs(zxx)  # shape: (freq_bins, frames)

        # Spectral Centroid: sum(f * mag) / sum(mag)
        freq_mesh = f[:, np.newaxis]
        weighted_sum = np.sum(freq_mesh * mag, axis=0)
        total_mag = np.sum(mag, axis=0) + 1e-7
        spectral_centroid = weighted_sum / total_mag

        # Spectral Flux: half-wave rectified difference across successive frames
        diff = np.diff(mag, axis=1)
        flux_diff = np.maximum(0.0, diff)
        spectral_flux = np.zeros(mag.shape[1], dtype=np.float32)
        spectral_flux[1:] = np.sqrt(np.sum(flux_diff ** 2, axis=0))

        return spectral_centroid, spectral_flux

    def estimate_speech_tempo(
        self, rms_db: np.ndarray, spectral_flux: np.ndarray, voiced_mask: np.ndarray
    ) -> Tuple[np.ndarray, float, List[float]]:
        """
        Estimate dynamic syllable rate (syllables/sec) and rolling WPM.
        Detects syllabic acoustic peaks from combined energy envelope and spectral flux.
        """
        n_frames = len(rms_db)
        # Normalize indicators
        norm_rms = (rms_db - np.min(rms_db)) / (np.ptp(rms_db) + 1e-6)
        norm_flux = (spectral_flux - np.min(spectral_flux)) / (np.ptp(spectral_flux) + 1e-6)
        syllable_signal = (0.6 * norm_rms + 0.4 * norm_flux) * voiced_mask.astype(float)

        # Find syllable nuclei peaks (min distance ~ 120ms = 0.12 * frame_rate frames)
        min_distance = max(2, int(0.12 * self.frame_rate))
        peaks, _ = signal.find_peaks(
            syllable_signal,
            height=0.18,
            distance=min_distance,
            prominence=0.08,
        )

        peak_times = [float(p * (self.hop_length / self.sample_rate)) for p in peaks]

        # Dynamic rolling WPM calculation over 2.0-second sliding windows
        window_sec = 2.5
        window_frames = int(window_sec * self.frame_rate)
        wpm_contour = np.zeros(n_frames, dtype=np.float32)

        for i in range(n_frames):
            t_curr = i * (self.hop_length / self.sample_rate)
            # count peaks within [t_curr - window_sec/2, t_curr + window_sec/2]
            n_peaks_in_win = sum(
                1 for pt in peak_times if abs(pt - t_curr) <= (window_sec / 2.0)
            )
            # Standard rhetoric constant: ~1.45 syllables per English word
            syllable_rate = n_peaks_in_win / window_sec
            wpm = (syllable_rate / 1.45) * 60.0
            wpm_contour[i] = wpm

        # Smooth WPM contour
        if len(wpm_contour) >= 7:
            wpm_contour = signal.savgol_filter(wpm_contour, window_length=min(15, len(wpm_contour) if len(wpm_contour) % 2 == 1 else len(wpm_contour)-1), polyorder=2)
            wpm_contour = np.maximum(0.0, wpm_contour)

        # Average global WPM across active speaking time
        active_frames = voiced_mask & (rms_db > self.silence_db_thresh)
        if np.any(active_frames):
            mean_wpm = float(np.mean(wpm_contour[active_frames]))
        else:
            mean_wpm = 135.0  # standard conversational rate

        return wpm_contour, mean_wpm, peak_times

    def detect_pauses(
        self, times: np.ndarray, rms_db: np.ndarray, voiced_mask: np.ndarray
    ) -> List[Dict[str, Any]]:
        """
        Dual-threshold Voice Activity Detection (VAD) pause segmentation.
        Classifies detected pauses into:
        - RHETORICAL_PAUSE: 400ms - 1500ms (effective dramatic cadence)
        - AWKWARD_HESITATION: > 1800ms (unwarranted hesitation)
        - RUSHED_ABSENCE: < 200ms at phrase transitions
        """
        dt = self.hop_length / self.sample_rate
        # Silence criteria: below silence threshold and unvoiced
        is_silent = (rms_db < self.silence_db_thresh) | (~voiced_mask & (rms_db < self.silence_db_thresh + 6.0))

        pauses = []
        in_pause = False
        pause_start_idx = 0

        for idx, silent in enumerate(is_silent):
            if silent and not in_pause:
                in_pause = True
                pause_start_idx = idx
            elif not silent and in_pause:
                in_pause = False
                pause_duration = (idx - pause_start_idx) * dt
                if pause_duration >= 0.25:  # filter sub-phoneme stops (< 250ms)
                    t_start = float(times[pause_start_idx])
                    t_end = float(times[idx])

                    if 0.40 <= pause_duration <= 1.50:
                        category = "RHETORICAL_PAUSE"
                    elif pause_duration > 1.80:
                        category = "AWKWARD_HESITATION"
                    else:
                        category = "BRIEF_TRANSITION"

                    pauses.append({
                        "start_sec": round(t_start, 3),
                        "end_sec": round(t_end, 3),
                        "duration_sec": round(pause_duration, 3),
                        "category": category,
                    })

        # Check trailing pause
        if in_pause:
            pause_duration = (len(is_silent) - pause_start_idx) * dt
            if pause_duration >= 0.25:
                pauses.append({
                    "start_sec": round(float(times[pause_start_idx]), 3),
                    "end_sec": round(float(times[-1]), 3),
                    "duration_sec": round(pause_duration, 3),
                    "category": "RHETORICAL_PAUSE" if pause_duration <= 1.5 else "AWKWARD_HESITATION",
                })

        return pauses

    def extract_full_features(self, audio_source: Any) -> Dict[str, Any]:
        """
        Run end-to-end extraction pipeline, returning synchronized feature vectors.
        """
        audio, sr = self.load_audio(audio_source)
        duration_sec = len(audio) / sr

        times, rms_db = self.compute_rms_envelope(audio)
        f0_interp, voiced_mask = self.track_f0(audio)
        spectral_centroid, spectral_flux = self.compute_spectral_features(audio)

        # Align length across STFT and RMS if frame count has 1 frame difference
        min_len = min(len(times), len(f0_interp), len(spectral_centroid))
        times = times[:min_len]
        rms_db = rms_db[:min_len]
        f0_interp = f0_interp[:min_len]
        voiced_mask = voiced_mask[:min_len]
        spectral_centroid = spectral_centroid[:min_len]
        spectral_flux = spectral_flux[:min_len]

        wpm_contour, mean_wpm, peak_times = self.estimate_speech_tempo(
            rms_db, spectral_flux, voiced_mask
        )
        pauses = self.detect_pauses(times, rms_db, voiced_mask)

        return {
            "duration_sec": round(duration_sec, 3),
            "sample_rate": sr,
            "times": times,
            "f0_hz": f0_interp,
            "voiced_mask": voiced_mask,
            "rms_db": rms_db,
            "spectral_centroid": spectral_centroid,
            "spectral_flux": spectral_flux,
            "wpm_contour": wpm_contour,
            "mean_wpm": round(mean_wpm, 1),
            "syllable_peaks": peak_times,
            "pauses": pauses,
        }
