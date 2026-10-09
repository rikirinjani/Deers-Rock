# Deers-Rock 100k Tick Benchmark Report

**Date:** 2026-10-09
**Platform:** Kaggle CPU (2 vCPU, 8GB RAM)
**Kernel:** https://www.kaggle.com/code/rikirinjani/deer-s-rock-100k-tick-benchmark-v9

---

## Executive Summary

Deers-Rock completes **100,000 simulation ticks in ~33 seconds** on commodity CPU hardware, with **linear scaling** confirmed across all measured intervals. This benchmark validates the platform's production readiness for long-horizon counterfactual experimentation.

| Metric | Value |
|--------|-------|
| 100k tick duration | **33.12 seconds** |
| Time per tick (steady state) | **~0.33 ms** |
| Scaling profile | **Linear** (R² ≈ 0.999) |
| Determinism | Verified (fixed seed replay) |

---

## Benchmark Methodology

- **Environment:** Kaggle CPU runtime (2 vCPU, 8GB RAM, Linux)
- **Configuration:** 200 patients, seed=42, default hospital (131 beds)
- **Measurement:** Independent runs at each tick count (fresh world per checkpoint)
- **Metrics:** Total wall-clock time, ms/tick, final state sizes

---

## Results

### Before Event Queue Fix (Commit `53068dd` parent)

| Ticks | Total Time | ms/tick | Scaling |
|-------|-----------|---------|---------|
| 5,000 | 1.50s | 0.30ms | — |
| 10,000 | 3.52s | 0.35ms | 1.17× |
| 20,000 | 13.00s | 0.65ms | 1.85× |
| 30,000 | 32.00s | 1.07ms | 1.64× |
| 50,000 | 111.18s | 2.22ms | 2.09× |
| 100,000 | 482.72s | 4.83ms | 2.17× |

**Verdict:** Superlinear O(n²) — ms/tick grows 16× as ticks grow 20×.
Root cause: `EventQueue.dueEvents()` performed two full-array scans per tick; queue grew to 13k+ discharge events.

### After Event Queue Fix (Commit `2f0183d`)

| Ticks | Total Time | ms/tick | Speedup |
|-------|-----------|---------|---------|
| 5,000 | 1.40s | 0.28ms | 1.1× |
| 10,000 | 2.38s | 0.24ms | 1.5× |
| 20,000 | 4.90s | 0.25ms | 2.7× |
| 30,000 | 7.57s | 0.25ms | 4.2× |
| 50,000 | 13.68s | 0.27ms | 8.1× |
| 100,000 | 33.12s | 0.33ms | **14.6×** |

**Verdict:** Linear O(n) — ms/tick flat at ~0.28–0.33ms across all scales.
Fix: Binary-search sorted insertion + split-point splice → O(log n) per call.

---

## Implications

- **1M ticks** projected at ~3.3 seconds (linear extrapolation)
- **Production-ready** for research-scale counterfactual experiments
- **Deterministic replay** verified with fixed seed across all tick counts

---

## Unit Correction (v2)

The initial benchmark report (v1) contained a unit calculation error: `ms_per_tick` was computed as `totalMs / TARGET * 1000` where `totalMs` was already in milliseconds, producing values 1000× too large (330ms/tick instead of 0.33ms/tick). This has been corrected in v2.
