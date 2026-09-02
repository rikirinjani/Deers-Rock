# Deers Rock — Experiment Reports (Failure Injection, Sentinel Independence, Temporal)

**Date:** 2026-08-31 · Evidence from dedicated probe lanes (read-only, temp dirs).

## Part 1 — Failure injection (11 cases)

| # | Case | Behavior | Mechanism | Impact |
|---|---|---|---|---|
| 1 | Malformed packet (`[{type:"",data:null}]`, `[]`, unknown type) | **IGNORE** (silent) — baseline packet returned, no throw | adapter:132-153 switch has no default; only evt.type read | Invisible signal loss; event-volume counterfactuals wrong |
| 2 | Extreme admission multiplier (adapter 1.3; direct 1000) | **IGNORE** — 50-step run structurally identical to baseline | schedule adapter:205-207; drop world.ts:260-267 (no admission_surge case) | The adapter's only DR-facing channel has zero effect; heatwave integration test cannot produce differences |
| 3 | Zero staff availability (WAR_START 0.85; direct 0) | **IGNORE** — identical to baseline; adapter floor is 0.85 | adapter:142 Math.min floor; drop world.ts:260-267 | Staff effects never reach DR |
| 4 | Extreme supply pressure (EW+WAR+CASUALTIES) | **CLAMP** at 1 (combo→0.6; 10×→0.9999999999999999 float artifact) | adapter:147,159 Math.min(1,…) | Clamped but never consumed (dead output) |
| 5 | Unknown ICD code | **Graceful/degenerate** — closed list; icdTracker counts any code; BUT sentinel diseasePrevalence always {UNKNOWN:n} (encounters carry no primaryDiagnosis) | adapter:91; markov.ts:74-82 | Prevalence output structurally dead |
| 6 | Missing `data` field | **IGNORE** (no crash) | adapter:132 reads type only | None |
| 7 | Invalid disaster type ("meteor") | **CRASH** — TypeError reading 'surgeMin' at DR tick 5; runner force path crashes identically | scenario.ts:145 non-null assertion `!`; surgeForPhase :119 | No validation; kills whole simulation |
| 8 | Corrupted snapshot | **CRASH** — JSON.parse with no try/catch (journal.ts:324). Circuit breaker verified functional (rollback + health.down ×10 spam on persistent failure) | journal.ts:324; adapter:211-223 | Zero defensive parsing; breaker retry-spams |
| 9 | ticksPerDay 0/-5 | **IGNORE** — 0 steps, no crash, DR clock stalls; NO drift guard exists | adapter:201,204 | Engine-time vs DR-time divergence undetected |
| 10 | Sentinel restart | **PROPAGATE (deterministic)** — fresh-process byte-identical; in-process restart shifts ID labels | module counters (patient/generator.ts:126, identity/generator.ts:4, scenario.ts:102) | Byte-identical only across fresh processes |
| 11 | Seed mismatch (worldSeed 42 vs 43) | **IGNORE (silent divergence)** — trajectories diverge deeply; no validation anywhere | adapter:56-58 derive, :182-183 use; no consistency check | Worst-class reproducibility failure: plausible wrong numbers |

**Summary:** 5 silent-ignore, 1 clamp, 2 crash, 0 reject. Adapter never rejects malformed input; everything degrades to baseline. The circuit breaker is the only genuinely defensive mechanism. **Robustness is not the issue — the coupling is functionally dead.**

## Part 2 — Sentinel independence experiment (brief §12)

- Sentinels jkt-001 / sby-001 / dps-001, worldSeed 42, derived seeds via `getHospitalSeed(42, djb2(id))`.
- **A≠B≠C** (distinct trajectories from same world seed) — verified by raw, label-stripped, and trajectory hashes.
- **B reproduces byte-identically across fresh processes** (0c6109b0…713e33).
- **Perturbation isolation:** changing A (patients 30→80 + forced earthquake) changes NEITHER B NOR C (trajectory hashes f10e0fe3…/d56b31f7… identical in-process AND vs fresh-process baseline).
- **RNG isolation:** prior throwaway world in-process does not alter later world's trajectory (7ce2c367…/067d5a91… identical).
- **Adapter-level:** real deersRockAdapter path, 10 ticks × ticksPerDay 10, empty bus → A≠B, each reproduces.
- Residual same-process coupling: ID-label shifts + two inert display attributes (blood-bank rhesus via unitCounter%8, micro specimen via orderCounter%6) whose consumers (issueBlood/recordTransfusion/findCompatibleUnits) have **zero callers**.

**Verdict: local autonomy + deterministic reproducibility PROVEN.**

## Part 3 — Temporal scale audit (brief §6)

- 1 tick = 1000 ms × 60 = 60,000 ms = **1 simulated minute** ✓
- 1440 ticks: tick=1440, hospitalTimeMs=86,400,000 = **1 day** ✓; day boundary (tick 1440 = Tue 2026-06-16 00:00) ✓
- Handler cadence: scenario every 5, newPatient every 15, admission every 1 — **no day-boundary-specific behavior** ✓ (no event fires at tick 1440)
- Temporal-alias scan: `% 1440` hits — calendar.ts:73 (conversion, expected) and **ai-pharmacy.ts:37** (outpatient pharmacy open 8am-8pm gate — the ONE handler depending on absolute tick%1440; time-of-day dependency, not aliasing)
- **No fastForward function exists** (grep 0 hits); runWorld is a plain loop; "60×/120× speed" claims are display-only (speedMultiplier only affects hospitalTimeMs)
- **Critical scale finding:** documented "1 world tick = 1440 DR ticks" is the default constant, but ALL 30 Indonesian sentinel configs use `ticksPerDay: 10` → **actual coupling is 1 world tick = 10 DR ticks = 10 minutes**. The P-004 "20-tick" counterfactual = 200 DR ticks ≈ 3.3 hours of hospital time, not 20 days.
- Aliasing risk (a one-day macro intervention landing where the minute sim begins): moot today because macro interventions have zero effect; but the absolute-tick pharmacy gate and the unvalidated 10-vs-1440 cadence are the places aliasing would appear.

**Verdict: minute-scale and day-boundary math are correct; the world↔DR cadence in practice is 10 ticks/world-tick (not 1440), and no fastForward exists despite documentation.**
