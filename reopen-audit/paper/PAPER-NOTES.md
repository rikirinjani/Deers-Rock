# PAPER-NOTES — deers-rock-reopening-paper.md (Draft v1)

Companion to the reopening-audit manuscript. Documents (a) excluded previous claims and why,
(b) every cited number and its audit evidence source, (c) claims omitted for lack of substantiation.

---

## (a) Excluded previous claims (deliberately not carried into the paper)

| Excluded claim | Source | Why excluded |
|---|---|---|
| "P-004 reproduces byte-for-byte (156/14)" | prior REOPEN-AUDIT (Kronos) | Regeneration: 156/14 committed vs 515/42 fresh vs 532/31+530/41 stale — FALSE |
| COVID counterfactual effect sizes d=−2.71 (CSSD), +1.11 (dialysis), +0.91 (prevalence), +0.70 (occupancy), +0.58 (outcomes) | committed p004 artifacts | Unreproducible; artifacts of stale-build nondeterminism + rewind-aliasing; fresh deterministic build gives d=0 on all DR metrics |
| "14/156 metrics significant" | committed summary | Not interpretable: 7.8 FPs expected; 71% of flags are duplicates/degenerate; FDR→9, Bonferroni→8 |
| "10 runs seed 42 identical outcome trajectories" (submission.md:89) | JAMIA draft | Verified only manually at 200 ticks; no CI test; 1000-tick claim not re-run; same-process ID-label nondeterminism found |
| LOS 82.9 / deaths 4.3 / 82% disaster mortality / 98% occupancy | JAMIA draft (submission.md) | Superseded: SoftwareX draft contradicts (0 deaths / 290 LOS); neither reproducible from current src |
| "1 world tick = 1440 DR ticks" as runtime behavior | KE docs | Constant exists but all 30 sentinels use ticksPerDay:10 → actual 10 DR ticks/world tick |
| "Bidirectional / deep" sentinel integration | KE docs, sentinel-integration-map | health.* events have zero subscribers; reverse channel is dead code |
| "Mulberry32" claimed as ADR-008 design | ADR-008 | Actually TRUE (bit-identical verified) — kept, with credit |
| "60×/120× speed" as a feature | README | No fastForward exists; speedMultiplier only affects display conversion |
| "Sorted iteration order" / "events consumed at t+1" | KE paper | Map insertion order; same-tick consumption |
| "Hash-verified rewind integrity" | KE paper | hashState vacuous (nested content ignored) — companion audit |
| "Reproducibility proven, zero variance" (memory.txt:624) | old notes | From pre-LOS-fix config; numbers superseded |
| Clinical validity / "predicting healthcare" | — | No calibration to external data; synthetic model; explicitly rejected as positioning |

## (b) Cited numbers → evidence map

| Number in paper | Audit evidence source |
|---|---|
| Cross-process SHA-256 identical, seeds 42/0/7 (hashes 665e2fd2…/cce3830f…/6dcad7e8…) | 08-experiment-reports.md §Probe A (fix-1 lane) |
| mulberry32 bit-identical 100k outputs, 4 seeds | 02-implementation-vs-docs-matrix.md row 2 (fix-1) |
| 1 tick = 60,000 ms; 1440 ticks = 86,400,000 ms; day boundary Tue 2026-06-16 | 08 §Part 3 (fix-1 probe D) |
| getHospitalSeed(42,1..3),(43,1),(0,1) distinct | 02 row 10 (fix-1 probe B) |
| A≠B≠C; B byte-identical cross-process (0c6109b0…); perturbation leaves B/C unchanged (f10e0fe3…/d56b31f7…) | 08 §Part 2 (fix-5 lane) |
| Adapter sentinel output byte-identical, 0/20 ticks differ | 02 row 6; 08 §Part 1 (fix-2 probe 3) |
| supplyStress hardcoded 0.3; mortalityPressure count-only; diseasePrevalence always {UNKNOWN:n} | 04-sentinel-output-audit.md (fix-2 + code) |
| P-004 regeneration table (156/14, 515/42, 532/31, 530/41) | 05-statistical-reassessment.md §Part 1 (fix-3 lane) |
| worldSeed hardcoded 42 in experiment → d=0 on DR metrics | 05 §Part 1 (fix-3) |
| Rewind-point aliasing: RP climate {year:2020,tickCount:0} → {2023,3} | 05 §Part 1 (fix-3 probe) |
| 7.8 expected FP; 14 observed; BH→9; Bonferroni→8; 71% artifacts; 13 dup pairs; d=−9.02e15; power n=3/13/19/33/47 | 05 §Part 2 (fix-4 lane) |
| cssd parent 9.97 → 5.00, t=−10.5, p=2.2e-11 | 05 §Part 2 (fix-4) |
| Reverse channel: 22 forced health events, zero sector change; 5 types injected, 0 changed | 08-experiment-reports.md §Part 1/2 + reverse-integration REPORT (fix-7 lane) |
| Failure injection 11 cases (5 silent-ignore, 1 clamp, 2 crash, 1 deterministic, 2 graceful) | 08 §Part 1 (fix-6 lane) |
| Full integration: deterministic byte-identical; 20t≈1.1s, 50t≈6.95s; no drift/crash | reverse-integration REPORT (fix-7 lane) |
| DR commit 85b3119; version 0.5.0; dist not committed (stale Jul-2 vs src Jul-10) | repo state (coordinator verification) |
| 148/156 metrics ragged n<30; no child tick in artifacts | 05 §Part 2 (fix-4) |

## (c) Claims considered but omitted (could not substantiate)

- **Statistical power of DR's E2 mortality sensitivity** — historical numbers in memory.txt only; not re-run (out of scope; not needed for architectural claim).
- **Any specific patient-level clinical outcome** — no clinical validation exists; omitted entirely.
- **Latency benchmark beyond the two timing points** — only 20-tick and 50-tick wall times measured; no hardware normalization, so reported as raw times only.
- **Cross-platform determinism** — verified only on node v22.23.2 / win32; flagged as limitation, not asserted.
- **Kronos P-003 "No WWII" numbers** — companion audit already refuted the committed values (835/24 vs claimed 1421/36); out of scope for this DR-centric manuscript; referenced only as context.

## (d) Fixes required before the coupling claim can be tested (paper §10)

1. DR handlers for `admission_surge` / `staff_shortage` (real packet consumption).
2. `ticksPerDay: 1440` or validated cadence.
3. Deep-clone rewind baseline; record parent/child horizons.
4. Proper two-group/paired effect sizes; FDR/Bonferroni + noise-floor reporting; collapse duplicates.
5. Real `primaryDiagnosis` on encounters; non-constant `supplyStress`.
6. Reset module counters per `createWorld`.
7. `health.*` consumers or honest one-directional statement.
