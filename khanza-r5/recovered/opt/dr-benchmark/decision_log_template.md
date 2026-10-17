# DECISIONS Log (DR→Khanza Unattended Benchmark)

Record every conservative pick here (brief §3 rule 6: "if something is ambiguous, pick the more conservative option and record it in DECISIONS.md. Do not block waiting for an answer").

Format per entry:
```
## <UTC timestamp> — <phase/step>
- Ambiguity: <what was unclear>
- Chosen: <the conservative option taken>
- Rationale: <why this is the conservative / safe choice>
- Impact: <what this means for the result / a later phase>
- Revisit: <if/when this should be re-examined, else "no">
```

## Standing conservative defaults (pre-filled; amend with evidence)

## <ts> — Global
- Ambiguity: target VPS is the new 10-core/12GB box; old VPS #2 being terminated.
- Chosen: run on the new box; if not yet provisioned, this orchestrator is pre-staged and NOT launched.
- Rationale: brief §4 "if the larger 10-core instance has been provisioned, use it. Otherwise use VPS #2 and say so in the manifest" — and the operator directed termination of VPS #2.
- Impact: all paths assume a fresh box; `setup_vps.sh` stages the asset there.
- Revisit: no.

## <ts> — Stage B3 headline volume
- Ambiguity: ~70–100k visits in a year at class C profile may exceed the 12 h wall-clock budget even after the DR-perf fix.
- Chosen: if B3 still > 12 h after the Phase 1.6 perf fix, lower weekday arrival 300→200/day and re-run B3; do NOT stretch the unattended run to ~40 h.
- Rationale: brief §2 explicitly permits the 300→200 reduction; a 40 h unattended run is a reliability risk (provider suspend window, disk churn).
- Impact: B3 report must state the final arrival rate actually used; the "full class C at 300/day" claim is only valid at the 300 rate.
- Revisit: if the perf fix lands B3 under 12 h at 300/day, run 300 and record the perf win.

## <ts> — MySQL 8.4 + MysqlDataSource shim
- Ambiguity: Khanza on MySQL 8.4 is not a supported configuration (shim + ONLY_FULL_GROUP_BY off required).
- Chosen: keep it for this run (brief §2), record it as an unsupported configuration; do NOT port to MariaDB (out of scope).
- Rationale: brief decision; a MariaDB port would invalidate the whole validated-envelope and is explicitly out of scope.
- Impact: BENCHMARK_REPORT limitations must carry the shim/unsupported-config note.
- Revisit: target-stack decision is a separate, later workstream.

## <ts> — Tax + registration rules source
- Ambiguity: 11% drug PPN and the registration fee come from Khanza master data, not a DR tariff model.
- Chosen: treat tax as a Khanza-side rule (separate ledger component, explicitly not modelled in DR) and record the reg-fee difference from Khanza master as finding REG-1; do not invent a DR tax model.
- Rationale: the benchmark measures DR-intended charges vs Khanza-computed charges; conflating a Khanza tax rule into the DR ledger would corrupt the delta.
- Impact: charge-delta table carries a "tax rule (Khanza)" line, excluded from the DR-vs-Khanza "unexplained" test.
- Revisit: when a DR tariff model exists, recompute.
