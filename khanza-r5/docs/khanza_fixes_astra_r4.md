# DR→Khanza E2E Benchmark — Fix List from GPT-6 Astra Full Assessment

Source: `dr-khanza-e2e-full-assessment` run 4701365 (2026-10-13), 35/100 "Not ready."
Full output: `C:\Users\think\AppData\Local\Temp\opencode\astra_r4_out\dr-khanza-e2e-full-assessment\3\gpt-6-astra\4701365\dr-khanza-e2e-full-assessment_output.md`

Tags: `[CODE]` change a tool/script · `[REPORT]` fix wording/tables · `[DATA]` rebuild/regenerate an artifact · `[HUMAN]` requires outside person/data · `[AGENT]` runnable autonomously · `[PRIORITY]` in Astra's top-3.

Scope note: `HUMAN` items are the external-validity gaps; `AGENT` items are in-scope and agent-runnable. The fix list is organized per criterion but the top-3 priorities (P1–P3) cut across criteria.

---

## P1 — Oracle independence & destructive-run safety  `[CODE][PRIORITY]`
The weakest leg: the simulator-to-real-form bridge can compare the form with its own previous output. Fix before expanding the sample.

1. `[CODE]` Freeze a complete canonical line-level consumer output **before any form execution**: per-visit IDs, codes, quantities, prices, totals, plus manifest + sha256 + version/config provenance. (Astra §Weakest leg step 1.)
2. `[CODE]` Run the form on an isolated snapshot/clone; compare its output against the frozen artifact, **not** live `sik.billing`. (Astra step 2.)
3. `[CODE]` Make reset/recovery fail-closed and restart-safe: exclusive run lock, durable state machine (not in-memory), exact table snapshots, bounded batch resets, guaranteed restoration of all reset state incl. reg payment flags. (Astra step 3; §Oracle "Reset/rebill mechanics remain unsafe.")
4. `[CODE]` Implement `.sampled_diff_state` guard + snapshot-hash check inside the oracle tool (contract exists in `p-chain`, not in the code).
5. `[CODE]` Pin artifact paths per run so later runs don't overwrite/consume last-writer state.

## P2 — Executable, fail-closed gate coverage  `[CODE][PRIORITY]`
6. `[CODE]` Replace the fictitious third count: in `three_count_reconcile.py`, A and B both read `sik.billing` via the same function (default branch `b, b_note = a, "B == A ..."` is tautological). Either wire B to a truly independent preserved real-form dataset, or rename the tool to two-way reconciliation. (Astra §Gate B / §2.A.)
7. `[CODE]` Make `build_dr_charge_ledger.py` fail closed on tariff authority: `except Exception: _TARIFF = {}` silently restores legacy pricing. Fail on missing table/access, or explicitly mark affected rows unvalidated. (Astra §2.C.)
8. `[CODE]` Parameterize cohorts and windows: ledger builder / `charge_delta` / `three_count` all hard-code `LIKE '2026/10/%'`; `--stage` changes labels not cohort scope. Extend to full-window per-visit gates. (Astra §Gate C / §2.B.)
9. `[CODE]` Derive expected quantities/codes from an immutable DR encounter manifest (pre-adapter), not from Khanza-side `rawat_jl_dr` / `detail_pemberian_obat` (shared-input tautology remains). (Astra §2.C.)
10. `[CODE]` Fix ledger money representation: `DOUBLE`/`float` → integer rupiah; `%d` truncates fractional registration; `COUNT(*)×MAX(price)` → sum per occurrence. (Astra §Gate A.)
11. `[CODE]` Full transactional cohort replacement: `REPLACE INTO` updates/inserts but does not delete obsolete charge keys; a deleted drug/zeroed tax leaves stale rows. (Astra §Gate A / §2.C.)
12. `[CODE]` Decide + document handling of the `"other"` (unknown-status) bucket and negative-only rows excluded by `(biaya>0 OR totalbiaya>0)`. (Astra §Gate B.)
13. `[CODE]` Adversarial gate tests: non-October amount errors, wrong-code/same-price, offsetting errors, negative adjustments, baseline contamination, missing tariffs, interrupted execution. (Astra step 6.)

## P3 — Fix unsupported close-out claims  `[REPORT][PRIORITY]`
14. `[REPORT]` Regenerate the report separating: observed agreement vs statistical inference vs the two throughput measurements (1,802 sim v/min vs 7.14 form v/min). Do not present as one "real Khanza workflow." (Astra §5 / §Reproducibility.)
15. `[REPORT]` Implement the promised stratified sampling design or restate it: current sampler is `ORDER BY MD5(no_rawat) LIMIT N` — no month/clinic/drug-count/value/half-rupiah-PPN allocation, no prior-sample-union mechanism. (Astra §Oracle "not stratified.")
16. `[REPORT]` Establish B3 replay (only B1 replay hash is proven). (Astra §Reproducibility.)
17. `[REPORT]` Correct the "gates proven" framing: §3 header "all pass, unproven under injection" contradicts §1 "proven." Align. (Astra §5.)
18. `[REPORT]` Restate the 4 historical drift rows: "comparisons invalidated by baseline contamination; subsequent totals agree," not "explains completely / closes completely." (Astra §Oracle.)
19. `[REPORT]` Restate the 0.3%: it is a conditional one-sided 95% upper bound requiring a justified sampling model + uncontaminated comparison. 1.85% was an observed rate, not an earlier "bound" — stop comparing them as bounds. (Astra §1 / §3.)
20. `[REPORT]` "remaining gap is external validity, not gate coverage" is false — gate-coverage, baseline-independence, crash-safety and full-window gaps remain in code. (Astra §Gate / §External.)
21. `[REPORT]` Restate E2E: "hybrid benchmark: direct-DB fixtures + sampled real-form billing + 86,101-visit deterministic simulator-scale run." Stop "86k visits billed end-to-end through the real Khanza workflow." (Astra §E2E / §6.)

---

## Criterion 1 — Claim honesty (4/10)
22. `[REPORT]` Reconcile the monthly table: tax column sums to **0** while the tools create positive PPN rows; drug column sums to **82.74%** share, not the reported **74.5%** (PPN appears folded into "drug"). Restate or recompute the component split. (Astra §1 / §2 / §6.)
23. `[REPORT]` Add an explicit scope bridge for: billing snapshot `34,895,128,580` vs DR ledger `34,870,243,633` = Rp `24,884,947` (221 extra non-DR registrations); and monthly billing-row sum `1,393,815` vs B3 `1,457,876` vs snapshot `1,464,593` (row-predicate/scope differences). (Astra §1 / §2.)
24. `[REPORT]` Correct internal contradictions: `top_diagnoses` constant 8,353 rows (§5) vs "empty set" (§12); "three billing-reading queries" (§5) vs "six" (§12); "sample in flight" vs sample completed. (Astra §5.)
25. `[REPORT]` Reconcile report vs roadmap agent/human split: B3 edge strata, D2 replay, D3 packaging, E2 burst are labeled human-gated in the report but agent-runnable in the roadmap. (Astra §5.)
26. `[REPORT]` "No number is typed by hand" / "generated and linted" does not hold — semantic inconsistencies survived generation/lint. Fix the lint to catch scope/percentage consistency, or soften the claim. (Astra §5.)
27. `[REPORT]` Recompute B3 throughput: 47.8 min / 86,101 ≈ **33.3 ms/visit**, not 32.8. (Astra §1 / §Gate.)
28. `[REPORT]` 999 ≠ "at least 1,000": the roadmap checks the ≥1,000 acceptance box with 999 visits. Correct the criterion or the box. (Astra §1 / §2.)
29. `[REPORT]` 4/216 = 1.85% is an observed rate, not a confidence bound; don't present 0/999 as "tightening the bound." (Astra §1 / §3.)
30. `[REPORT]` Correction to the record: the FK "physically untestable" explanation was wrong — the patient FK restricts identity, not reg-without-billing; the real-patient + fresh `no_rawat` injection is a reachable input (as the report itself later shows). That was a bad injection setup, not an untestable predicate. (Astra §Gate D / §2.E.)
31. `[CODE]` F1 causal path: changing `databarang.ralan` alone cannot affect `charge_delta` (it reads billing + ledger, not `databarang`). Document the regen/rebill step that makes F1's detection valid. (Astra §Gate D.)
32. `[CODE]` Distinguish the mutation detector: it is `billing_baseline diff`, not the four reconciliation gates. State what it does and does not prove (integrity vs domain-level reconciliation). (Astra §Gate D / §2.E.)
33. `[REPORT]` "Computed without reading billing output" (ledger independence) is weaker than "independent DR ground truth" — restate the ledger as a restricted-fixture expected-charge machine, not unconditional ground truth. (Astra §Gate A.)

## Criterion 2 — Gate correctness (3/10)
→ Covered by P2 (items 6–13) plus:
34. `[CODE]` `charge_delta` compares per-visit component **totals** only — it cannot verify drug/procedure identity, per-line price allocation, or offsetting errors within a visit/component. Add line-level comparison or state the limit. (Astra §Gate C / §2.D.)
35. `[CODE]` A visit lacking both billing and ledger entries contributes 0-vs-0 and passes (if other ledger data exists) — document/fix the vacuous-pass case. (Astra §Gate C.)
36. `[CODE]` Output filenames are reused across stages unless an external archiving step intervenes — pin per-stage/per-run output paths in-tool. (Astra §Gate C.)
37. `[CODE]` `--stage B1`/`--stage B3` changes naming, not cohort scope — make stage actually select the population. (Astra §Gate B.)

## Criterion 3 — Oracle validity (4/10)
→ Covered by P1 (items 1–5) and P3 (15, 18, 19) plus:
38. `[CODE]` Enforce envelope predicates consistently: `cohort()` rejects any nonzero embalase/tuslah row, but `sample_visits()` accepts a visit with one clean drug row **or any procedure** — mixed clean/dirty drug visits can enter the sample. Align the two predicates. (Astra §Oracle "eligibility predicates disagree.")
39. `[CODE]` The 289/289 frozen-OK-line check is not proof of independent baselines: 289 observations ≠ 289 unique visits; equal per-visit totals ≠ equal line multisets; it doesn't establish consumer baselines for all 999. Restate its role as corroboration only. (Astra §Oracle "immutable-baseline fix absent.")
40. `[CODE]` JVM return code: the docstring says `rc != 0` → drift, but the mismatch predicate is `bool(missing_in_consumer or missing_in_real) or not ok_flag` and batch `rc` is not included. Incorporate `rc` or fix the docstring. (Astra §Oracle "JVM failure not actually in the predicate.")
41. `[CODE]` Numeric parse errors silently become `0.0`; values rounded to 2 decimals — fail closed on unparseable amounts. (Astra §Oracle "unsafe reset mechanics.")

## Criterion 4 — Reproducibility (3/10)
42. `[CODE][AGENT]` Establish B3 encounter replay (only B1 replay hash proven). (Astra §Reproducibility; P3.16.)
43. `[HUMAN]` Cross-machine: run B1 on a second VPS and compare against the canonical `75889b60…4ca0d` hash. (Astra §Reproducibility; roadmap D2.)
44. `[CODE]` D1 restore is one billing-table recovery from one damage scenario; it does not prove independent clean pre-rung restore. Either implement per-rung clean restore or scope the "independent per-rung restore" claim to what was actually demonstrated. (Astra §Reproducibility.)
45. `[CODE]` Restore must cover the auxiliary financial tables + registration payment-state flags the oracle resets, not just `sik.billing`. (Astra §Reproducibility.)
46. `[CODE]` Verification is count-based (counts.json); upgrade to value/state equality. (Astra §Reproducibility.)
47. `[CODE]` Pin the runtime: Khanza jar hash, classpath, JDK, MySQL versions; document the compatibility-shim boundaries (unchanged source ≠ unchanged runtime behavior). (Astra §E2E / §Reproducibility; roadmap D3.)
48. `[REPORT]` Buffer-pool post-freeze change (128 MB → 3,200 MB): state which results ran under which pool config; the frozen run dir and current DB differ. (Astra §Reproducibility.)

## Criterion 5 — E2E design (4/10)
49. `[REPORT]` Keep the three legs separate in the report (seeding / sampled real-form / simulator-scale) and stop describing the simulator-scale run as 86k real-form executions. (Astra §E2E; P3.14/21.)
50. `[CODE]` Document the form harness: entry point, shim boundaries, classpath + jar hashes pinned, and the SQL-attribution mechanism (`general_log`). `general_log` is useful attribution, not an independent oracle. (Astra §E2E.)
51. `[REPORT]` Seeding: state it validates "billing from a preloaded clinical/administrative state," not patient-registration UI, clinical-ordering UI, or a native ingestion interface. (Astra §E2E Leg 1.)
52. `[CODE]` Fault injection: keep it as deliberate scaffolding but run on isolated snapshots/clones with a named injection boundary, a specific asserted failure, and verified exact restore (mostly done; restate + verify). (Astra §E2E.)
53. `[REPORT]` Report both throughput numbers side-by-side (1,802 sim v/min vs 7.14 form v/min, ~250× gap) so the comparison is not blurred. (Astra §E2E.)

## Criterion 6 — External validity (3/10)
→ These are the human-gated items that hold the remaining points; Astra: "no real facility anchors the workload."
54. `[HUMAN]` Real-source comparison (C4 — biggest single gain): one anonymized facility's monthly aggregates (visits/day, revenue/visit, top diagnoses, drug share) → KS/Wasserstein on per-visit charge + rank correlation on diagnoses; publish gaps; else label all content results "synthetic, uncalibrated." (Astra §6; roadmap C4.)
55. `[HUMAN]` Payer mix (C3): sub-runs per payer (BPJS/general/private) with per-payer billing paths; revenue figures re-baselined until done. (Astra §6; roadmap C3.)
56. `[HUMAN]` Diagnosis calibration (C1): weight the ICD-10 sampler by PRB dispensing data + published Indonesian primary-care morbidity; top-10 overlap + rank correlation above a preset threshold; no implausible codes in top-20; report KL divergence. (Astra §6; roadmap C1.)
57. `[HUMAN]` Clinically coherent content (C2): pharmacist rules table for top-30 diagnoses; 100-visit plausibility sample ≥90%; drug-share band from real facility data (also resolves the 82.74%/74.5% inconsistency, item 22). (Astra §6; roadmap C2.)
58. `[AGENT]` Edge strata (B3): flagged synthetic visits (embalase, tuslah, ≥3 procedure lines, half-rupiah PPN, zero-fee clinic) through the real form on a scratch copy; oracle returns a `not-covered` marker outside the validated envelope. (Astra §6; roadmap B3.)
59. `[AGENT]` Second HMS smoke test (E2): OpenMRS/OpenEMR FHIR adapter to show the method is not Khanza-specific. (Astra §6; roadmap E2.)
60. `[HUMAN]` Preregistration of acceptance criteria + dated prior-art log + one outside hospital-informatician review of a sample of records + the report. (Astra §6; roadmap "beyond the benchmark.")

---

## Paper-safe claim boundary (Astra's wording, item for the report)
> "This study demonstrates high-volume synthetic outpatient billing-consumer execution against one Khanza/MySQL configuration, with real-form comparisons on selected visits, but does not establish population-wide billing correctness, representative hospital performance, or generalization to other care settings, payers or HMS products."

## Suggested execution order
1. P1 (items 1–5) — oracle independence + safe reset. This unblocks every oracle claim.
2. P2 (items 6–13) — fail-closed, full-window, independent-source gates.
3. P3 + criterion 1/2 report fixes (items 14–41) — regenerate a semantically consistent report.
4. Agent-runnable external items (58–59) — edge strata + second-HMS smoke.
5. Human-gated external items (54–57, 60) — data + partners; land last, drive the remaining +8 realism points to ~87.
