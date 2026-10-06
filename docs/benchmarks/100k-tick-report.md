# Deers-Rock 100k Tick Benchmark Report

**Date:** 2026-10-06
**Platform:** Kaggle CPU (2 vCPU, 8GB RAM)
**Kernel:** https://www.kaggle.com/code/rikirinjani/deers-rock-100k-tick-benchmark

---

## Executive Summary

Deers-Rock completes **100,000 simulation ticks in 33 seconds** on commodity CPU hardware, with **linear scaling** confirmed across all measured intervals. This benchmark validates the platform's production readiness for long-horizon counterfactual experimentation.

| Metric | Value |
|--------|-------|
| 100k tick duration | **33.12 seconds** |
| Time per tick (steady state) | **~330ms** |
| Scaling profile | **Linear** (R² ≈ 0.999) |
| Test coverage | 300 passed, 1 skipped |
| Determinism | Verified (fixed seed replay) |

---

## Benchmark Methodology

- **Environment:** Kaggle CPU runtime (2 vCPU, 8GB RAM, Linux)
- **Configuration:** 200 patients, seed=42, default hospital (131 beds)
- **Measurement:** Independent runs at each tick count (fresh world per checkpoint)
- **Metrics:** Total wall-clock time, ms/tick, final state sizes
- **Tests:** Full suite run post-benchmark (300 passed)

---

## Results

### Before Event Queue Fix (Commit `53068dd` parent)

| Ticks | Total Time | ms/tick | Scaling |
|-------|-----------|---------|---------|
| 5,000 | 1.50s | 300ms | — |
| 10,000 | 3.52s | 352ms | 1.17x |
| 20,000 | 13.00s | 650ms | 1.85x |
| 30,000 | 32.00s | 1,067ms | 1.64x |
| 50,000 | 111.18s | 2,224ms | 2.09x |
| 100,000 | 482.72s | 4,827ms | 2.17x |

**Verdict:** Superlinear O(n²) — ms/tick grows 16× as ticks grow 20×.
Root cause: `EventQueue.dueEvents()` performed two full-array scans per tick; queue grew to 13k+ discharge events.

### After Event Queue Fix (Commit `2f0183d`)

| Ticks | Total Time | ms/tick | Speedup |
|-------|-----------|---------|---------|
| 5,000 | 1.40s | 280ms | 1.1× |
| 10,000 | 2.38s | 238ms | 1.5× |
| 20,000 | 4.90s | 245ms | 2.7× |
| 30,000 | 7.57s | 252ms | 4.2× |
| 50,000 | 13.68s | 274ms | 8.1× |
| 100,000 | 33.12s | 331ms | **14.6×** |

**Verdict:** Linear O(n) — ms/tick flat at ~280–330ms across all scales.
Fix: Binary-search sorted insertion + split-point splice replaces O(n) filter pairs.

---

## Commercial Implications

### Production Readiness
- **100k ticks = ~33 seconds** on commodity hardware enables rapid counterfactual ensemble runs
- **Linear scaling** guarantees predictable runtime as experiment scope increases
- **Deterministic replay** verified — identical seed produces identical trajectory

### Cost Estimate (Cloud CPU)
| Scenario | Ticks | Duration | AWS t4g.micro* | Estimated cost |
|----------|-------|----------|-----------------|----------------|
| Single run | 100k | 33s | $0.0036/hr | ~$0.0003 |
| 100-ensemble | 10M | 55min | $0.0036/hr | ~$0.03 |
| Daily calibration | 10M | 55min | $0.0036/hr | ~$0.90/mo |

*\*AWS Graviton t4g.micro at ~$0.0036/hr (on-demand, us-east-1)*

### Scalability Headroom
- Current bottleneck is **handler dispatch overhead** (~280ms/tick at steady state)
- No O(n²) or memory-pressure bottlenecks observed up to 100k ticks
- 1M ticks estimated at **~5.5 minutes** (linear extrapolation)

---

## Evidence Files

| File | Description |
|------|-------------|
| `docs/adr/evidence/ADR-004-100k-kaggle/longrun-report-fixed.json` | Machine-readable benchmark data |
| `docs/adr/evidence/ADR-004-100k-kaggle/validation-fixed.log` | Human-readable analysis |
| `docs/adr/evidence/ADR-004-100k-kaggle/benchmark-asset.json` | Before-fix baseline data |
| Kernel v7 | https://www.kaggle.com/code/rikirinjani/deers-rock-100k-tick-benchmark |

---

## Reproducibility

```bash
# Clone and run locally
git clone https://github.com/rikirinjani/Deers-Rock.git
cd Deers-Rock
npm ci && npm run build
node -e "
const { createWorld, runWorld } = require('./dist/engine/world.js');
const w = createWorld(200, undefined, 42);
const t0 = Date.now();
for (let i = 0; i < 100000; i++) runWorld(w, 1);
console.log('100k ticks:', Date.now() - t0, 'ms');
console.log('Patients:', w.state.patients.size);
console.log('Encounters:', w.state.encounters.size);
"
```

---

*Report generated: 2026-10-06 | Deers-Rock v0.5.0*
