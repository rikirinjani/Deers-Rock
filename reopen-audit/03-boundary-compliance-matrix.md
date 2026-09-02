# Deers Rock — Boundary Compliance Matrix

**Date:** 2026-08-31 · Method: code inspection + executable probes. Rules from the reopening brief §1/§8 and ADAPTER_INVARIANTS (deers-rock-adapter.ts:48-54).

## Must-NOT-happen rules

| # | Rule | Status | Evidence | Detail |
|---|---|---|---|---|
| B1 | KE importing DR internals | ⚠️ VIOLATION (soft) | adapter:1-5 | KE imports DR's `createWorld, step` AND types from `../../../Deers-Rock/dist/index.js` + `dist/engine/state-store.js` (HospitalState). Importing the public entry is the intended adapter; importing `state-store.js` internals is deeper than a pure public-API adapter. |
| B2 | KE reading individual patient records | ⚠️ VIOLATION (soft) | adapter:75-76, 90-92, 101 | `extractOccupancy` reads `bed.patientId` (patient identity); `extractDiseasePrevalence` reads `enc.primaryDiagnosis` per encounter; `extractSentinelOutput` reads `state.morgue` length. Identity is only reduced to occupancy boolean/prevalence counts and never propagated upward — but the invariant "World Engine never sees patient-level data" is doc-only (no enforced test; the verify-facts leak grep is skipped without `rg` and would false-positive). |
| B3 | DR reading GDP directly | ✅ PASS | grep: no KE import in DR src | DR has zero knowledge of KE concepts. |
| B4 | DR reading war status directly | ✅ PASS | same | — |
| B5 | DR reading climate variables directly | ✅ PASS | same | — |
| B6 | Shared RNG between world and hospital | ✅ PASS | adapter:56-58, 182-183; probe B | Per-sentinel derived seed `getHospitalSeed(worldSeed, djb2(id))`; separate createRng instances. NOTE: sentinel seeds are a deterministic function of world seed (correlated, not independent in the cryptographic sense) — this matches the documented derivation and passes the "no shared RNG state" rule. |
| B7 | Sentinel-to-sentinel knowledge | ✅ PASS | 3-sentinel experiment | Perturbing sentinel A (patients 30→80 + forced earthquake) changed neither B nor C (trajectory hashes identical). In-process ID-label residue (NIK→micro specimen→blood rhesus, zero-caller inert fields) documented but semantically inert. |
| B8 | Wall-clock dependence | ⚠️ PARTIAL | probe | Simulation loop is wall-clock-free (mulberry32, tick-derived time). BUT: (a) FHIR exports embed `Date.now()` birthDate/recordedDate (fhir-export.ts:25,55,186,241); (b) SIRS `generatedAt` (sirs-report.ts:611); (c) experiment output filenames use `Date.now()` (runner.ts:134); (d) journal `created_at` SQLite `datetime('now')`; (e) age computation uses `new Date().getFullYear()` (patient/generator.ts:133, agent/generator.ts:76) — a cross-year wall-clock dependency in patient/agent generation. |
| B9 | "The world does not reach into the hospital" (metaphor) | ⚠️ PARTIALLY MET — in the wrong direction | probe | The world DOES reach in (adapter actively pulls `eventBus.pending()` and schedules events) — but the reach is INERT (DR drops the events). The hospital does NOT signal out (dead `health.*` channel). The metaphor holds only as "the hospital is unaffected by the world." |
| B10 | "World Engine never sees patient data (vitals, bed assignments, identities). Only aggregated pressure signals." (INVARIANT) | ⚠️ PARTIAL | adapter:75-76 | Occupancy requires reading bed occupancy — but implementation reads `bed.patientId` to decide occupancy instead of a dedicated occupancy flag; patient identity is transiently visible. Aggregates only flow upward. |

## Boundary results summary

- **Cleanly held:** DR→world isolation (B3-B5), no shared RNG state (B6), sentinel independence (B7), sim-loop wall-clock freedom (B8 core).
- **Soft violations:** KE reads DR internals (B1) and patient identity in the occupancy/prevalence path (B2, B10) — reduced but not fully removed.
- **Functional violations of intent:** the "wait for the signal" coupling (B9) is one-directional and inert; the reverse signal (hospital→world) is dead code.

## Verdict

The boundary is architecturally clean on the DR side (DR truly standalone, no world access) and on the RNG side (per-sentinel derived seeds). The adapter side is clean in principle but the implementation (a) reads patient identity to compute occupancy, (b) has a doc-only leakage invariant, and (c) wires a reverse channel that nothing consumes. **The "local autonomy" claim (brief §12) is verified; the "controlled coupling" claim (brief §1) is not — the coupling is a write-only, dead-end pipe.**
