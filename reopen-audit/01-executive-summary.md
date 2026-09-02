# Deers Rock — Formal Reopening Audit: Executive Summary

**Date:** 2026-08-31 · **Agent:** DR reopen coordinator · **Status:** AUDIT COMPLETE — NOT PUBLISHABLE IN CURRENT STATE

**Method:** adversarial evidence audit. All claims below were verified against source code,
executable probes, and committed data files. Prior results, paper language, and statistical
conclusions were treated as evidence, not authority. Every previously reported number was
re-derived or refuted.

---

## 1. Verdict

**The Deers Rock simulation, in its current state, does not support a formal publication
claiming macro→micro coupling or counterfactual healthcare experimentation.**

What HAS been demonstrated (defensible, standalone):
1. **Cross-process determinism:** same seed + same config in separate processes produces
   byte-identical full-state SHA-256 for seeds 42, 0, 7 (200 ticks, 50 patients).
2. **Genuine mulberry32 PRNG:** the RNG in `clock.ts` is bit-identical to canonical
   bryc mulberry32 for the first 100,000 outputs (ADR-008's claim is TRUE despite
   cosmetic differences in the source).
3. **RNG seed derivation:** `getHospitalSeed = (worldSeed ^ (hospitalId * 2654435761)) >>> 0`
   is implemented exactly as documented (deers-rock-adapter.ts:56-58) and produces
   distinct, stable per-sentinel seeds.
4. **Sentinel independence:** three sentinels from the same world seed produce distinct
   trajectories (A≠B≠C); sentinel B reproduces byte-identically across fresh processes;
   perturbing sentinel A (patient count 30→80 + forced earthquake) changes NEITHER B NOR C.
5. **Local RNG isolation:** a throwaway world run in-process does not alter a later
   world's trajectory (semantic hash identical).
6. **Temporal scale:** 1 tick = 1 minute (60,000 ms/tick), 1440 ticks = 1 day verified
   (hospitalTimeMs = 86,400,000 at tick 1440; calendar day boundary correct).

What has NOT been demonstrated (blocking):
1. **The MacroConditionPacket does not change DR behavior.** All five fields either
   (a) schedule `admission_surge`/`staff_shortage` events that DR's `step()` switch
   silently drops (only `discharge`/`lab_result`/`rad_result`/`ed_discharge`/`surgery_done`
   are handled; world.ts:260-267), or (b) are computed and never read
   (diagnosisWeightOverrides, supplyChainPressure, activeDisasterType — dead outputs).
   Adapter end-to-end probe: sentinel output byte-identical with and without
   EXTREME_WEATHER / WAR_START events over 20 world ticks (0/20 trajectory ticks differ).
2. **The reverse channel (DR→Kronos) does not exist.** The adapter publishes `health.*`
   events but ZERO sectors subscribe; the handlers array is empty (adapter line 168).
   The docs' "bidirectional/deep" claim is aspirational. The world is hospital→? NO:
   it is world→hospital only, and even that is inert.
3. **P-004 counterfactual does NOT reproduce.** Committed artifact (156 metrics, 14 sig)
   regenerates as 515/42 with fresh dist and 532/31 + 530/41 with the stale (pre-fix)
   build. Only the intervention constant (`annualEmissionsNoise`) matches byte-for-byte.
   The prior "byte-for-byte reproduction" claim is FALSE.
4. **The P-004 "hospital effects" are artifacts, not macro penetration:**
   - With the deterministic fresh dist, ALL 30 seeds produce identical DR state
     (worldSeed is hardcoded to 42 in dr-counterfactual.ts:42) → every DR metric has
     d=0 (degenerate). The committed seed-varying DR values can only arise from the
     unseeded `Math.random()` in the stale build → nondeterminism noise.
   - A no-intervention branch still differs from parent (rewind/restore mechanics alone
     produce divergence) — proven by probe.
   - Rewind-point aliasing bug present in master: `createRewindPoint` stores sector
     state BY REFERENCE (rewind-point.ts:61-64); in-place sector mutation (commit
     8b30779, 2026-07-10) corrupts the captured baseline. The branch restores a
     corrupted baseline → diff mixes different simulation horizons.
5. **Statistical significance claims fail:** "14/156 significant" is not interpretable
   uncorrected (7.8 false positives expected at α=0.05). BH-FDR → 9 survivors;
   Bonferroni → 8. 10 of the 14 "significant" are duplicates (3 pairs of
   world.state↔lastTickState mirrors) or degenerate (zero-SD constants, a d=−9.02e15
   floating-point artifact). The cssd "halving" (d=−2.71, t=−10.5) is a structural
   near-zero-variance change — the signature of a broken/aliased baseline, not a
   dose-response.
6. **Calibration is absent:** no sector is calibrated to a validated reference trajectory;
   the casualty/GDP calibration gap is documented OPEN in the reference file.

---

## 2. Key structural findings

| # | Finding | Evidence |
|---|---------|----------|
| F1 | Adapter and sentinel output live in the **Kronos repo**, not DR; DR has no macro input surface | deers-rock-adapter.ts (KE); 0 grep hits for MacroConditionPacket in DR |
| F2 | The adapter is a **write-only pipe** (world→DR is inert, DR→world is dead) | probes: identical hashes with/without events; no health.* consumers |
| F3 | DR determinism holds cross-process, fails same-process (ID labels from ~20 unreset module-global counters) | probe A: cross-process identical, in-process different; label-stripped hashes identical |
| F4 | DR dist shipped stale (July 2 build vs July 10 src, not committed) — Kronos imported the pre-Math.random-fix build | dist mtime vs src mtime; git ls-files dist = 0 |
| F5 | `supplyStress` sentinel output is a hardcoded constant 0.3; `mortalityPressure` is a count (morgue.length), not a rate | adapter:103, adapter:101 |
| F6 | `diseasePrevalence` is always `{UNKNOWN: n}` — encounters never carry `primaryDiagnosis` (markov.ts:74-82) | adapter:91 + probe |
| F7 | Sentinel config `beds` is decorative — createWorld ignores it (generates 131 beds itself) | adapter probe |
| F8 | No automated determinism test exists in DR's test suite; the prior "10 runs seed 42 identical" claim was verified manually, not by CI | tests/ scan; recon C |
| F9 | Failure modes dominated by silent-ignore: seed mismatch, cadence drift, malformed packets, unknown scenario types all degrade silently or crash without validation | failure injection (11 cases) |
| F10 | Only genuine wall-clock residue: FHIR exports, SIRS generatedAt, experiment output filenames, `new Date().getFullYear()` age computation | grep Date.now |

---

## 3. What this means for the paper

The likely defensible claim is ARCHITECTURAL and NARROW:

> "A standalone, deterministic micro-scale hospital simulation (Deers Rock) participates
> in a macro-scale world engine (Kronos) through an explicit adapter boundary, with
> per-sentinel seeded RNG and verified local autonomy."

Evidence SUPPORTS: deterministic standalone execution, per-sentinel seed derivation,
sentinel independence, local RNG isolation, scale separation (1 min vs 1 day).

Evidence DOES NOT SUPPORT: macro conditions producing measurable hospital-level changes
(the adapter is inert), hospital output feeding macro signals (dead channel), or
counterfactual healthcare experimentation (P-004 is unreproducible and its "effects"
are artifacts).

**Recommendation:** either (a) narrow the paper to the architectural claim with P-004
reported as a negative/exploratory result, or (b) implement the adapter's consumption
path (DR handlers for admission_surge/staff_shortage + a real diseasePrevalence source)
and re-run. Do not submit the current manuscript.

---

## 4. Deliverables produced by this reopening

- `reopen-audit/` — this audit package (matrices, claim audit, statistical report, repro findings)
- Prior P-004 artifacts archived and refuted (evidence in `experiment-results/dr-counterfactual/` vs fresh runs)
- Stale dist preserved at `C:\Users\think\AppData\Local\Temp\opencode\dr-audit\` (reconstructed from git 0583dca)
