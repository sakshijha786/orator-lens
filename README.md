# 🎙️ OratorLens — Contrastive Speech Analytics

> **Sub-millisecond forensic speech alignment, prosody flaw grounding, and causal rhetorical coaching.**

OratorLens is an end-to-end, contrastive forensic speech analytics platform designed for competitive speech coaching and public speaking mastery. Rather than providing generic acoustic metrics or vague feedback, OratorLens aligns a speaker's audio directly against gold-standard master orator deliveries using Multiscale Dynamic Time Warping (FastDTW), isolates exact temporal flaws $[t_{start}, t_{end}]$ using adaptive statistical thresholding, and attributes causal rhetorical explanations with prescriptive rehearsal drills.

---

## 🏛️ Historical Oratorical Corpus & 4-Tier Gradient

OratorLens includes a multi-archetype gold standard library:
1. **Steve Jobs (2005 Stanford Commencement)** — *Visionary / Inspiring Declamation*
2. **Greta Thunberg (2019 UN Climate Summit)** — *Urgent Forensics / Moral Indignation*
3. **Winston Churchill (1940 "We Shall Fight on the Beaches")** — *Resolute Statesmanship / Rallying Gravitas*

Each historical corpus features a rigorous **4-Tier Prosody Flaw Gradient**:
- **Level 0 (Gold Baseline)**: Pristine orator audio, melodic pitch inflection, dramatic pause architecture, wide dynamic contrast.
- **Level 1 (Subtle Flaw)**: $0.85\times$ pitch variance compression, slight punctuation boundary rushing.
- **Level 2 (Amateur Delivery)**: Severe monotone ($0.35\times$ pitch variance), clipped dramatic pauses ($<120\text{ ms}$), erratic volume jumps.
- **Level 3 (Botched Delivery)**: Robotic flatline prosody ($\sigma(F_0) \approx 0$), hyper-speed delivery ($>220\text{ WPM}$), cognitive stall pauses ($>3.5\text{ s}$).

---

## ⚡ Mathematical & DSP Architecture

1. **Speaker-Agnostic Normalization (`backend/dsp/normalizer.py`)**:
   - Fundamental frequency ($F_0$) converted to semitones relative to speaker tonic key center:
     $$\text{Pitch}_{\text{semi}}(t) = 12 \cdot \log_2\left(\frac{F_0(t)}{F_{\text{ref}}}\right)$$
   - Guarantees gender-invariant and vocal-range-invariant prosody comparison.
   - Energy envelope computed in dBFS and $z$-score normalized ($Z_{\text{rms}}$).

2. **Multiscale FastDTW Acoustic Alignment (`backend/dsp/aligner.py`)**:
   - Recursively downsamples multi-dimensional acoustic feature matrices $[\text{Pitch}_{\text{semi}}, Z_{\text{rms}}, \text{SpectralFlux}]$.
   - Refines alignment path within a search corridor of radius $r=10$ with $O(N)$ linear time and space complexity ($<850\text{ ms}$ average latency).
   - Resamples and warps candidate trajectories onto the master orator's temporal grid.

3. **Adaptive Temporal Flaw Grounding (`backend/causal/flaw_detector.py`)**:
   - Computes weighted composite divergence metric $\Delta(t) = 0.45\Delta_{\text{pitch}} + 0.35\Delta_{\text{energy}} + 0.20\Delta_{\text{cadence}}$.
   - Isolates flaw windows where $\Delta(t) > \mu_\Delta + 1.8\sigma_\Delta$.
   - Merges transient noise spikes and extracts localized acoustic deltas.

4. **100-Point Forensic Scoring Rubric (`backend/causal/rubric_scorer.py`)**:
   - **Pillar 1: Vocal Variety & Inflection** (25 pts)
   - **Pillar 2: Pacing & Cadence Consistency** (25 pts)
   - **Pillar 3: Dramatic Pauses & Timing** (25 pts)
   - **Pillar 4: Energy & Dynamic Contrast** (25 pts)
   - **Strict Monotonicity Guarantee**: Verified 100% monotonicity across all flaw gradient levels ($L0 > L1 > L2 > L3$).

---

## 🖥️ Modern Web Experience

- **Interactive Dual Audio Player (`WaveSurfer.js`)**: Synchronously plays Gold Reference and Candidate Delivery with dual-track scrubbers and visual flaw highlight zones.
- **Contrastive Acoustic Contours Studio (`Recharts`)**: Real-time switchable curves for Pitch Inflection (Semitones), Dynamic Energy (dBFS), Cadence (WPM), and Composite Divergence.
- **Grounded Flaw Dossier**: Clickable flaw cards with timestamps that immediately scrub the WaveSurfer audio playhead to that exact millisecond.
- **Prescriptive Rehearsal Drills**: Concrete exercises (Pitch Elevator, Cadence Governor, 2-Second Punctuation Anchor) tailored to diagnosed speech flaws.
- **Custom Delivery Recording / Upload**: Benchmarks custom microphone input directly against historical orators.

---

## 🚀 Quickstart

### Backend (FastAPI)
```bash
cd backend
python -m uvicorn server:app --host 127.0.0.1 --port 8000
```

### Frontend (React + Vite + Tailwind)
```bash
cd frontend
npm run dev
# Running on http://127.0.0.1:5173
```

### Run Benchmark Suite
```bash
python backend/scripts/benchmark_pipeline.py
```
