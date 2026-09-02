# Deers Rock — Counterfactual Reproduction & Statistical Reassessment

**Date:** 2026-08-31 · Method: regeneration experiments + full recomputation from committed data.

## Part 1 — P-004 reproduction experiment

### What was claimed
Committed artifact `experiment-results/dr-counterfactual/p004-30seeds-summary.json`: 30 seeds (42-71), 20 ticks, **156 metrics, 14 significant**, with effect sizes CSSD d=−2.71, dialysis d=+1.11, diseasePrevalence.UNKNOWN d=+0.91, occupancy d=+0.70, outcomeRecords d=+0.58. Prior audit claimed "P-004 reproduces byte-for-byte."

### What regeneration shows

| Source | Metrics | Significant | Match to committed? |
|---|---|---|---|
| Committed artifact | 156 | 14 | — (reference) |
| Fresh dist (current src, deterministic) | **515** | **42** | ❌ none of the 8 checked paths match |
| Stale build (git 0583dca, pre-Math.random-fix) run 1 | **532** | **31** | ❌ |
| Stale build run 2 (separate process) | **530** | **41** | ❌ stale is run-to-run NON-reproducible |

Only `annualEmissionsNoise` (−0.18, the intervention constant) matches across all runs. **The byte-for-byte reproduction claim is FALSE.**

### Why the committed values cannot be reproduced

1. **Metric surface changed:** Kronos engine commit 8b30779 (2026-07-10) added many numeric paths; the committed artifact reflects the pre-July-10 engine.
2. **Hardcoded worldSeed:** `dr-counterfactual.ts:42` hardcodes `deersRockAdapter({...SENTINEL}, 42)` — with the deterministic fresh dist, ALL 30 seeds produce identical DR state, so every DR metric has d=0 (degenerate). The committed seed-varying DR values (cssd parent 9,10,11,9,8,13…) can only arise from unseeded `Math.random()` in the stale build.
3. **Rewind-point aliasing bug (master):** `createRewindPoint` stores sector state BY REFERENCE (rewind-point.ts:61-64); in-place sector mutation (8b30779) corrupts the captured baseline — probe showed RP climate state mutated from `{year:2020, tickCount:0}` to `{year:2023, tickCount:3}` by the parent run. The branch restores a corrupted baseline.
4. **No-intervention branch also diverges:** a branch with an EMPTY intervention still differs from parent (cssd 4 vs 9, dialysis 116 vs 108) — divergence comes from rewind/restore mechanics, not the climate intervention.

### Verdict
**The previous counterfactual results are artifacts of (a) nondeterministic stale build noise and (b) the rewind-aliasing bug.** They are NOT evidence of macro→micro penetration. Reported as failures per governance.

## Part 2 — Statistical reassessment (from committed data, recomputed)

### Method under audit
`stats.ts computeSummary`: per-path mean/SD/CI95/median/min/max of `absoluteDelta`; `cohensD(values.map(()=>0), values)` — one-sample standardized mean against an all-zero control vector (NOT a two-group effect size); `significant = ci.lower > 0 || ci.upper < 0`. No p-values, no multiplicity correction in master.

### Recomputation results (all 156 paths, exact reproduction of committed flags)

| Analysis | Result |
|---|---|
| Significant count (uncorrected) | 14 = committed 14 (exact set match; 156/156 flags reproduced) |
| Expected false positives @ α=0.05, M=156 | **7.8** |
| Observed vs expected | 14 = 1.79× noise floor |
| BH-FDR q=0.05 | **9 survivors** |
| BH-FDR q=0.10 | 9 (same set) |
| Bonferroni (α/156) | **8 survivors** |
| Dropped by ALL corrections | occupancyRate (p=0.0156), outcomeRecords (p=0.0326), RUS.unemploymentRate (p=0.0364), RUS.patents (p=0.0239) |
| Duplicate pairs (world.state↔lastTickState) | 13 exact pairs = 26/156 paths (16.7%); **6 of 14 significant are duplicates** (cssd, dialysis, outcomeRecords each double-counted) |
| Degenerate (sd=0 exactly) | 27 metrics; **3 of 14 significant are zero-SD constants** (wars.length Δ≡+1) |
| Floating-point artifact | `annualEmissionsNoise` d=−9.02e15, sd≈2.8e-17 (30 identical deltas) |
| **% of "significant" explained by artifacts** | **10 of 14 = 71%** (6 duplicates + 3 zero-SD + 1 FP artifact) |
| Ragged capture | 148/156 metrics have n<30 (as low as n=1) |
| Horizon | All runs uniform rw=0, total=20; **no childSnapshot tick in any committed artifact** → parent/child tick equality unverifiable; if child tick≠parent tick, all 28 DR metrics confounded |

### The five headline DR metrics (committed data)

| Metric | n | mean Δ | SD | CI95 | t | p | d | parent level |
|---|---|---|---|---|---|---|---|---|
| cssd.cycles.length | 30 | −4.97 | 2.59 | [−5.90,−4.04] | −10.49 | 2.2e-11 | −2.71 | 9.97 → 5.00 (**halved**) |
| dialysis.sessions.length | 29 | +1.83 | 2.33 | [+0.94,+2.71] | 4.22 | 2.3e-4 | +1.11 | 226.0 → 227.8 (+0.8%) |
| diseasePrevalence.UNKNOWN | 29 | +5.52 | 8.57 | [+2.26,+8.78] | 3.47 | 1.7e-3 | +0.91 | 184.8 → 190.3 (+3.0%) |
| occupancyRate | 27 | +0.014 | 0.028 | [+0.003,+0.025] | 2.59 | 0.016 | +0.70 | 0.522 → 0.536 (+2.7%) |
| outcomeRecords.length | 30 | +3.73 | 9.11 | [+0.47,+6.99] | 2.25 | 0.033 | +0.58 | 56.4 → 60.2 (+6.6%) |

### Power (n per group, 80% power, two-sided α=0.05)

| d | n needed | n=30 adequate? |
|---|---|---|
| 2.71 | 3 | ✅ |
| 1.11 | 13 | ✅ |
| 0.91 | 19 | ✅ |
| 0.70 | 33 | ❌ |
| 0.58 | 47 | ❌ |

The two underpowered flags (occupancy, outcomeRecords) are exactly the two that fail multiplicity control.

### Interpretability verdict

1. **"14/156 significant" is NOT interpretable without correction.** 7.8 FPs expected; 14 observed; after FDR/Bonferroni the survivor set is dominated by duplicates and mechanical artifacts.
2. **71% of the significant set is explained by duplication/degeneracy/FP artifacts** — the 14 contain only 11 distinct quantities.
3. **The CSSD "halving" (d=−2.71, t=−10.5) is a structural near-zero-variance change — the signature of a broken/aliased baseline, not an intervention dose-response.** For it to be a real effect, ALL must hold: adapter ingests macro events (it does NOT — events dropped, 3/5 fields unused), rewind baseline is a clean copy (it is NOT — by-reference aliasing), parent/child horizons match (unverifiable from committed data), and seed variance is genuine (it is NOT — hardcoded worldSeed 42 + stale nondeterminism).
4. **The committed P-004 artifacts provide no defensible statistical evidence of macro→micro penetration.** The data are fully consistent with an inert adapter + corrupted rewind baseline; the mechanism evidence points to the former.
5. Cohen's d in the committed pipeline is a one-sample standardized mean scaled √2, not a two-group effect size — **not comparable to literature d values**.

### Corrected reporting recommendation (if P-004 is retained at all)
- Report as an **exploratory/negative result** with: pre-specified primary outcomes, matched-horizon identical-baseline guards, FDR/Bonferroni-corrected counts, noise-floor comparison (observed vs expected FPs), duplicates collapsed, degenerate metrics excluded, and the mechanism caveat (inert adapter).
- Better: fix the adapter consumption path first, then re-run.
