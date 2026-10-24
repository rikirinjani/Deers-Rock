# DR → Khanza E2E Benchmark Report (R5 close-out)

Run: `Bseries_20261012T045027Z` (canonical, terminal 08:37:48) · R2 reconciliation 2026-10-13 · R3 close-out 2026-10-13 · R4 verification 2026-10-13 (F1–F8 battery + mutation + A1 + D1 + 999-visit sample) · **R5 close-out 2026-10-14** (P1 oracle hardening + P2 gate restructure; this report supersedes R3)
Scope: DR-generated hospital data (`reg_periksa` with `no_rkm_medis LIKE 'DR%'`, 86,455 visits) consumed through the **unmodified** Khanza SIMRS cashier/billing workflows (`sik` DB), with a separate DR ground-truth ledger (`sik_bench.dr_charge_ledger`). No Khanza jar/source, firewall, auth, or bind changes.

**Report generated from artifacts (E1):** every number carries its evidence file; §10 maps claims to evidence. The n/N=x% unit-lint enforces figure consistency. **However:** generation did NOT enforce cross-section semantic consistency (the R4 report contained stale "in flight" wording, "8,353 rows" vs "empty set," and "three" vs "six" query counts that survived to close-out). R5 corrects those; see §13 caveat.

---

## 0. R5 close-out banner (new)

- **P1 — oracle hardening (~~crash-safety~~ recovery from one injected `kill -9` + frozen baseline): PASS.** *(P8-A3: this was one demonstrated fault, not a general crash-safety property; before P8 a resume did not prove a surviving harness JVM dead — see §19.)* The hardened oracle
  (`sampled_real_form_diff_r5.py`) holds an immutable per-visit sha256 baseline, resets by
  per-date staged backup+restore, and survives an injected `kill -9` mid-run (resume restores
  the interrupted batch and re-bills it; no visit left unbilled). It **refused a false 0/N**
  when the real form's settlement output was absent (see B-subset, §3/§13). Evidence:
  `khanza_r5_task_p1_oracle.md` §4 + `..._evidence.md` + `..._optionA.md`.
- **P2 — gate restructure (independent B, fail-closed, full-window, integer, adversarial): PASS.**
  `three_count_reconcile_p2.py` reads an **independent** B source (the form's own save output),
  not a tautology; `build_dr_charge_ledger_p2.py` is fail-closed on tariff authority,
  integer-rupiah, and transactional; both gates are `--window`/`--cohort` parameterized.
  On live: **charge_delta = delta 0 (PASS)**; **three_count A==C exact**, B reported as a
  verified **subset** (`P2-BC-TOTAL`), never a fake pass. Evidence:
  `khanza_r5_task_p2_gates.md` §4 + `..._evidence.md` + `khanza_r5_p2_gate_spec.md`.

### The three independent sources (RC-1 reframe, carried through §1/§3/§4/§13)

| Source | Table(s) | Written by | Role |
|---|---|---|---|
| **A — consumer settlement** | `sik.billing` value rows | KhanzaBillingConsumer | The asserted surface |
| **B — real-form save output** | `nota_jalan` / `detail_nota_jalan` / `piutang_pasien` + `reg_periksa.status_bayar` | The Khanza `DlgBilingRalan` save path (headless harness) | **Independent** third source; ~~NOT `billing`~~ **[§18: audited — the same save also writes `billing`]** |
| **C — DR ground-truth ledger** | `sik_bench.dr_charge_ledger` | P2 builder (DR tariff authority) | Expected-charge reference |

The headline gate is **A == C** (consumer vs DR ground truth). **B is a genuine, independent
form-save read** that, on the 2026-10 DR cohort, is a **verified subset** — only the visits
actually re-saved through the form — so it is reported as `P2-BC-TOTAL`, not forced to equal
A or C. This replaces every prior "A==B==C pass" phrasing.

---

## 1. Verdict (RC-1)

**PASS (scoped).** The gates are **proven under fault injection** (F1–F8 + mutation, §6) and
the pipeline is deterministic and reproducible. What the result does and does not claim:

**Proven (autonomous scope):**
- Determinism: B1 30-day encounter set replay-verified byte-identical (sha256
  `75889b60…4ca0d`); **B3 365-day encounter set likewise byte-identical on re-derivation
  (sha256 `84991ca4b143ada732c3679e991b5ab6edb5de52699c4e8695d45f551fab7b08`, P4-D2,
  §14)**.
- **A == C across all 12 months** (A3 §5) and at the 2026-10 DR cohort (charge_delta delta 0, §3):
  consumer settlement matches the DR ground-truth ledger with 0 unexplained deltas.
- Fault detection: F1–F8 + 0.1% mutation all trip the named gate + full revert-to-green (§6);
  P2 adversarial adds delete-row / offsetting / non-October / fail-closed-tariff detection.
- ~~Crash-safety:~~ Recovery from injected faults: P1 oracle survives a mid-run `kill -9` and re-bills the interrupted batch (§0); P8 suite A18–A21 add corrupt hash metadata, a surviving writer, interrupted restore and retry (§19). Untested fault modes are not claimed.
- Restore: D1 snapshot-based billing-table recovery, damage→restore→gates-green (§9).

**NOT claimed (scoped out / human-gated / structural limit):**
- Not a proof that Khanza bills correctly at population scale (outpatient, single HMS).
- ~~**Not a `billing`-level form-settlement equivalence**: the headless form save writes the
  verification layer (`nota_jalan`/`detail_nota_jalan`), not the consumer's `billing` settlement
  rows, so B is a subset, not A. (P1 close-out, §13.)~~ **[§18: withdrawn — a row-level audit
  shows the form's save writes `billing` (17 rows for the audited visit) as well as the nota
  rows, so the oracle's billing comparison IS a same-encounter form-vs-consumer check on the
  sampled visits. What remains unclaimed: population-wide equivalence beyond the samples.]**
- External validity (real-source calibration, payer mix, diagnosis calibration, 2nd-HMS) is
  NOT TESTED (human-gated, §human-gated table).

## 2. Ladder results (canonical run) (RC-2)

| Rung | Window | Visits | Wall | Throughput | Billing rows | Revenue | Drift (sampled real-form diff) |
|---|---|---|---|---|---|---|---|
| B1 | 30 d | 7,237 | 4.2 min | 1,716 v/min | 122,555 | Rp 2,923,830,321 | 0/19 = 0.0000 |
| B2 | 90 d | 21,296 | 12.6 min | 1,688 v/min | 360,804 | Rp 8,654,175,635 | 0/54 = 0.0000 |
| B3 | 365 d | 86,101 | 47.8 min | 1,802 v/min | 1,457,876 | Rp 34,727,295,800 | 4/216 = 1.85 (R4 re-sample: 0/999 = 0.00) |

- **Two distinct throughput measurements, kept separate (RC-2):**
  - **Consumer (simulator):** ~1,700–1,802 visits/min across B1/B2/B3 (avg **33.3 ms/visit** at
    B3 = 47.8 min / 86,101). This is the consumer's wall rate.
  - **Real form (Xvfb+faketime, `DlgBilingRalan`):** ~**7.14 visits/min** on sampled visits
    (the 999-visit sample `r4_b2_1000` ran 8,393 s over 312 dates). This is the *headless GUI* rate.
  - The two differ ~250× and must not be blurred. The B3 "1,802 v/min" is the **consumer** rate.
- **Honest characterization (RC-2):** the benchmark is a **hybrid**: direct-DB fixtures (the 86k
  scale) + **sampled** real-form billing (999 visits) + a deterministic simulator-scale run.
  It is **not** "86,101 visits driven end-to-end through the real Khanza GUI" — the GUI path is
  exercised on a *sample*, not the full 86k.
- `b3_wall_hours=1` — B3 completed in one wall-hour; no lowered-rate re-run needed.
- B1/B2 gates: three-count PASS, charge-delta PASS (0 unexplained), determinism replay MATCH.
- **R4 re-sample (`r4_b2_1000`):** 999 stratified visits re-billed through the real form over
  312 dates — **0/999 mismatch (0.00%)**; prior-sample union (224 unique `no_rawat`) fully
  covered; the four historical B3 drift visits clean on re-bill. Evidence:
  `p-chain/r4_b2_1000_postcheck_20261013T140123Z.md`.

**Visit-count reconciliation (86,101 vs 86,455 = 354):** 86,455 = all DR visits in the 12-month
DB; 86,101 = the B3 generated cohort. The 354 = the **Stage-A G2 seed** (October DR visits loaded
day-1 by `load_354_dr_visits.py`); the B3 generator treats them as already present. No
double-count: 354 (Stage A) + 86,101 (B3) = 86,455. **Revenue differs by the same 354, not by
basis:** Rp 34.73B = B3-rung total over 86,101; Rp 34.87B = full-DB total over 86,455.
Difference = Rp 142,947,833 = the 354 Stage-A October visits.

**Scaling-table withdrawal:** the earlier B1/B2 buffer-pool-scaling table (344 → 1,041 →
41,461 ms) is **withdrawn** — it was measured at a 128 MB pool, not comparable to the
single-configuration curve (§5). The pool was tuned **after** the run dir froze
(`db_freeze_*.json`: 128 MB → 3,200 MB post-freeze).

**Determinism:** master seed 20261012, per-day `md5(seed|date|mode)`; B1 replay sha256
`75889b60…4ca0d` verified MATCH; B1 replay without `--dx` is byte-identical.

## 3. Gates (RC-3 — three-source, P2 restructured)

- **three_count_reconcile_p2 (independent B):**
  - **A (consumer `sik.billing`)** vs **C (DR ledger)**: rows + amount per component (reg /
    proc / drug / tax). On the 2026-10 DR cohort: A == C == **31,750 rows / Rp 3,113,533,580**,
    0 gaps.
  - **B (real-form save)**: `detail_nota_jalan` + `piutang_pasien` (the form's own save output),
    read independently of A. On this cohort B = **149 notes / Rp 49,738,954** — a **verified
    subset** (only the visits actually re-saved through the form on this fixture). The gate
    reports **`P2-BC-TOTAL`** (B total ≠ C total) rather than a silent pass; where a cohort has
    no form-save content, B = **NOT-VERIFIED** and the verdict is **PARTIAL** (A==C only), never
    a fake A==B==C. No `b = a` tautology path remains.
- **charge_delta_per_component_p2:** per-visit, per-component, **integer rupiah**, Rp-0
  tolerance, `--window`/`--cohort` parameterized, unknown-status `'other'` bucket gated (not
  silently dropped). Live 2026-10 DR cohort: **delta 0, PASS**. Full-window `--window ALL`
  catches non-October faults the `2026-10` scope misses.
- **check_billed_eq_dr:** every DR reg visit in the window has ≥1 billing row; whole-window
  unbilled DR visits = 0 (P0 recon + P2 gate).
- **P2 adversarial (gate self-test, §6 below):** delete-row, offsetting, non-October, and
  fail-closed-tariff faults each FAIL a gate with a named reason (`UNEXPLAINED`, `P2-AC-*`,
  `P2-OTHER-STATUS`, `FAIL-CLOSED`).
- **B3 sampled-diff:** 4/216 (R4 re-sample 0/999) — restated per RC-4 below.

Gate spec: `khanza_r5_p2_gate_spec.md`.

## 4. B3 4-drift rows (RC-4 — invalidated, not "closed completely")

The four B3 drift visits (`2027/09/23/800080, 800214`, `2027/09/28/800109, 800164`) were
re-billed by the real form under faketime **after** the interrupted 06:44 attempt reset-deleted
all 216 sampled visits up front. **Correct restatement (RC-4):** the original consumer-vs-form
comparison for these four is **invalidated by baseline contamination** (the form's re-bill
rewrote the rows the oracle was diffing against); the **subsequent rupiah totals agree**
(SUM(`totalbiaya`) = the consumer's logged total, delta 0 per visit, table below) but that is a
re-measurement, not proof the *original* consumer row-set was intact. The word "closes
completely" is removed; the artifact is a timing/measurement contamination, not a charge
discrepancy.

| visit | consumer (OK-line) | real-form SUM(totalbiaya) | delta |
|---|---|---|---|
| 2027/09/23/800080 | 981,474 | 981,474 | 0 |
| 2027/09/23/800214 | 34,000 | 34,000 | 0 |
| 2027/09/28/800109 | 1,058,723 | 1,058,723 | 0 |
| 2027/09/28/800164 | 1,002,530 | 1,002,530 | 0 |

Root-cause chain (`p1_rootcause.md`): 06:44 duplicate launch reset-deleted all 216 sampled
visits up front → died at 2027-09-21 (MySQL down) → the 07:04 retry re-billed all 216; the
four rows now in the DB carry the **form's** faketime dates (`distinct tgl_byr = 2027-09-23/28`),
direct evidence they are the retry's real-form re-bill, not the original consumer output.

## 5. Performance + A3 full-window (RC-5)

- **P3 finding:** InnoDB pool 128 MB → 3,200 MB; `revenue_by_clinic` p50 41,461 → 3,993 ms
  (10.4×). Covering-index scan; configuration effect, not schema. Restore command in
  `p-chain/p3_pool_restore.txt`. Pool left at 3,200 MB.
- **R2-3 staged latency curve** (single 3.2 GB pool): see table below; seven queries scale
  with the cutoff, `top_diagnoses` is a constant-size join path (benchmark-authored, noise).

| query | 10k p50 | 30k p50 | 60k p50 | 86k p50 |
|---|---|---|---|---|
| visits_by_clinic | 118.1 | 155.4 | 202.9 | 264.4 |
| visits_by_day | 98.0 | 114.3 | 124.4 | 142.3 |
| visits_by_doctor | 119.8 | 164.1 | 219.6 | 278.5 |
| revenue_by_month | 562.2 | 1341.7 | 2610.7 | 4060.0 |
| revenue_by_clinic | 561.4 | 1359.3 | 2711.8 | 3881.0 |
| drug_usage_top20 | 262.2 | 424.2 | 798.3 | 1033.4 |
| top_diagnoses* | 113.1 | 88.1 | 104.2 | 89.1 |
| top_billed_visits | 625.7 | 1343.7 | 3602.0 | 5363.4 |

\* `top_diagnoses` = constant-size join; its native `diagnosa` table holds **8,353 dx rows**
(8,353 ≠ "empty set" — the "empty-set" claim refers to the generated-cohort prefix-cutoff
slices where no dx rows exist yet; both statements are true of different scopes, P5-7
clarified).
benchmark-authored, not a native Khanza template. Three of the seven scaling queries read raw
`billing`; the rest read `reg_periksa`/`detail_pemberian_obat` + masters.

**A3 — full-window 12-month reconciliation (replaces October-only gate scope).** Per-rung
per-visit CSVs archived immutable. **Component split, restated honestly (RC-5):** the PPN tax
rows are carried *inside the `drug` column* (the consumer's `nm_perawatan` bucketing folds PPN
into drug at the billing-row level; the ledger records tax as its own 11% half-up component).
So the "tax" column below is the ledger's separate tax component, and the drug column's
**~82.7% of revenue share** already includes the PPN the consumer attaches to drug lines — the
previously-published "74.5% drug" figure is the pre-PPN split and is superseded. A
tax=0 row with positive PPN rows elsewhere is a bucketing artifact, not a missing tax.

| month | visits | billing rows | reg MRp | proc MRp | drug(⊇PPN) MRp | ledger-tax MRp | total MRp |
|---|---|---|---|---|---|---|---|
| 2026/10 | 7,708 | 124,246 | 77.08 | 453.89 | 2,582.56 | (see note) | 3,113.53 |
| 2026/11 | 6,849 | 110,508 | 68.49 | 416.53 | 2,334.37 | (see note) | 2,819.40 |
| 2026/12 | 7,736 | 124,784 | 77.36 | 465.34 | 2,592.20 | (see note) | 3,134.91 |
| 2027/01 | 6,990 | 112,827 | 69.90 | 419.43 | 2,362.78 | (see note) | 2,852.11 |
| 2027/02 | 6,583 | 106,003 | 65.83 | 393.60 | 2,202.25 | (see note) | 2,661.67 |
| 2027/03 | 7,453 | 120,070 | 74.53 | 447.10 | 2,472.60 | (see note) | 2,994.23 |
| 2027/04 | 7,186 | 115,796 | 71.86 | 428.68 | 2,346.42 | (see note) | 2,846.95 |
| 2027/05 | 7,037 | 113,482 | 70.37 | 417.56 | 2,396.71 | (see note) | 2,884.63 |
| 2027/06 | 7,163 | 115,532 | 71.63 | 422.59 | 2,393.86 | (see note) | 2,888.08 |
| 2027/07 | 7,451 | 119,934 | 74.51 | 441.50 | 2,469.01 | (see note) | 2,985.02 |
| 2027/08 | 7,179 | 115,680 | 71.79 | 427.44 | 2,332.52 | (see note) | 2,831.75 |
| 2027/09 | 7,120 | 114,953 | 71.20 | 421.44 | 2,365.31 | (see note) | 2,857.96 |

Full-window total **Rp 34.8702 B** (12 months, DR, non-Ttl value rows). The ledger's tax
component (2026-10: Rp 255,929,676; cohort-wide per §3) is a **separate** 11% half-up
per-visit drug-subtotal row, not folded into the drug column above — the two views coexist and
are bridged, not conflated.

## 6. Fault detection (F-battery + P2 adversarial) (RC-11 correction applied)

R2-4 injection **was** tripped by the gates after the R4 battery; the historical "gates
returned PASS under injection" was a **predicate-untagged setup problem, not a predicate gap.**

**RC-11 correction to the record:** the R3 "A2-a" note called the reg-without-billing shape
"physically untestable" because `reg_periksa.no_rkm_medis` is an FK into `pasien`. **That was
wrong.** The patient FK restricts *patient identity*, not the reg-without-billing predicate: a
**real existing patient's `no_rkm_medis` + a fresh `no_rawat`** is a reachable, FK-valid input.
F3 below proves it directly on the live schema (no clone). The correct statement: the *original
synthetic-`DR0991xx` injection* was FK-invalid; the *predicate itself* is fully testable, and
F3 tests it.

| fault | shape | detector | result |
|---|---|---|---|
| F1 | `databarang.ralan` price +1000 | charge_delta | 12 visits UNEXPLAINED drug+tax; revert → green |
| F2 | unmapped drug ZZFAKE01 | three_count + charge_delta | GAP=2 drug+tax; cleanup exact |
| F3 | reg-without-billing (**real patient, fresh `no_rawat`, FK-valid**) | check_billed_eq_dr | UNBILLED-2026/10; delete → green |
| F4 | duplicate billing row | three_count | G2-BC-DRUG GAP; restore |
| F5 | drug quantity +1 | charge_delta | UNEXPLAINED drug; restore |
| F6 | PPN totalbiaya +1 | charge_delta | UNEXPLAINED tax delta=1; restore |
| F7 | delete 2027/02 billing (111,277 rows) | check_billed_eq_dr | UNBILLED-2027/02; snapshot restore |
| F8 | `dr_tariff` B000001135 +5000 (A1 price authority) | charge_delta | 5 UNEXPLAINED drug; revert → green |
| mutation | 1,464 random billing rows +1 `totalbiaya` (seed 20261012) | billing_baseline diff | 1,464/1,464 = 100%; revert → green |

**P2 adversarial additions (gate self-test on a scratch `sik_p2`/`sik_bench_p2` fixture):**
delete-row → `UNEXPLAINED 000254 drug delta=103,752` (FAIL); offsetting (−one visit, +equal
other) → per-visit FAIL (total nets to 0 but per-visit residual is nonzero); non-October +Rp1000
→ `three_count --window ALL` GAP; empty tariff no-flag → `FAIL-CLOSED`. Known limit: a
same-price wrong-*code* swap is amount-gate-blind (needs a per-visit line-level code diff —
follow-up lane).

**Regression rule:** the injection battery runs as a gate self-test on every benchmark run;
after exact-scope cleanup all gates must return PASS, else the verdict downgrades to
"PASS-unproven (gate self-test failed)."

## 7. A1 — DR-owned tariff (seed, not source edit)

`sik_bench.dr_tariff` seeded (685 rows: drug=390, procedure=293, registration=2; 6 orphan
rows retained; `source_note='DR-adopted-bundle'`). The P2 builder + reprice path resolve
`dr_tariff` **first** (fail-closed; legacy fallback only with `--allow-legacy-fallback`). Seed
consistency: 0 drug-price mismatches vs the canonical ledger; authority reprice is a verified
no-op (356,355 / Rp 34,870,243,633 unchanged). F8 co-delivered: PASS. Seed-data, not a Khanza
edit (constraint honored). Evidence: `p-chain/a2b_battery_run_20261013T075256Z.md`.

## 8. B1-rest — interrupted-attempt detector + immutable consumer snapshots

`.sampled_diff_state` detector contract + immutable pre-reset consumer snapshots
(`consumer_snapshot_*.json`, sha256 per OK-line total). A later interrupted reset can no longer
be mistaken for baseline. P1 hardened this further (per-run `.state.json` + staged
backup/restore + exclusive lock) — see §0. Evidence: `p-chain/consumer_snapshot_*.json`,
`p-chain/sampled_diff_state_contract_*.json`.

## 9. D1 — snapshot-based restore (demo PASS)

`/opt/dr-benchmark/scripts/d1_restore.sh` (R4 rewrite) — snapshot-based restore from
`snapshots/d1_20261013T072755Z/` (three mysqldumps + SHA256SUMS + counts.json + `LATEST_D1`).
Modes `billing` / `bench` / `verify-only`; SHA256-verifies before import, count-verifies after.
**Demo PASS** (`p-chain/d1_restore_demo_20261013T113359Z.md`): F7-style damage (delete
111,277 rows of 2027/02) → restore to **1,464,593 / Rp 34,895,128,580** (SHA256 verified) →
untouched components confirmed (reg_periksa 86,676; dpo 113,445; ledger 356,355 / Rp
34,870,243,633) → gates green. Naive prefix-DELETE script retained as `*.superseded`.

## 10. E1 — claims ledger + unit-lint (RC-6 softened)

`e1_claims_ledger_*.md` maps every claim to its evidence file + status. **Unit-lint rule:** a
drift figure must carry denominator **and** computed percentage (`n/N = x%`); bare fractions /
bare percentages / mismatched figures are rejected. B3 = 4/216 = **1.85%** (= 0.0185 as a
fraction). The previously published "0.0185%" was a **100× mis-scaling**, corrected here and
on-box.

**RC-6 caveat (softened claim):** the generator + lint enforce figure/percentage consistency
and per-number provenance, but did **NOT** enforce cross-section semantic consistency — the R4
report carried "sample in flight" (later completed), "8,353 rows" vs "empty set," and "three"
vs "six" queries in different sections. These are corrected in R5 (§11, §12, §5). "No number
is typed by hand" is retained for *figures*; "the report is self-consistent" is **not**
claimed.

## 11. State at handoff (RC-7 — no "in flight")

- Buffer pool **3,200 MB** (tuned; restore in `p3_pool_restore.txt`); `long_query_time` 10.
- **All autonomous units complete.** The `r4_b2_1000` sample **completed**
  2026-10-13T14:00:41Z (8,393 s, 0/999 drift); post-run gates re-verified PASS.
  **No "in flight" work remains** in the autonomous scope. (RC-7: the stale "in flight"
  wording from R3 is removed.)
- DB freeze record: `p-chain/db_freeze_20261013T043444Z.json` (per-table counts, pool, lqt,
  860.8 MB InnoDB). R3 residual `899%` = 0/0; `dr_tariff` expanded 6 → 685 (§7).
- On-box P1/P2 artifacts: `sampled_real_form_diff_r5.py` (+ `dbutil.py` `DBUTIL_FORCE_ROOT`
  guard), `*_p2.py` gate tools, `BilingHarness.java` v4 (click-YES + bounded `sukses` wait),
  `dr_charge_ledger_p2bak` (pre-rebuild ledger backup). P2 builder rebuilt the canonical
  ledger byte-for-byte (356,355 / Rp 34,870,243,633).
- No secrets, DB passwords, or VPS IP in this report or any on-box output.

## HUMAN-GATED ITEMS — NOT TESTED (RC-12 agent/human split reconciled)

RC-12: several items the R3 report listed as human-gated are in fact **agent-runnable** on
the existing infrastructure; the split is corrected here (source: roadmap "who can run what").

| Item | Gate / need | Status | Now-who |
|---|---|---|---|
| **B2 — 999-visit real-form sample at B3** | real-form Xvfb+faketime; oracle path | **TESTED — 0/999** (`r4_b2_1000`) | agent |
| **B3 — Edge strata on a scratch copy** | author flagged synthetic visits (embalase, tuslah, ≥3 proc lines, half-rupiah PPN, zero-fee clinic); run through real form on scratch | **NOT TESTED** | **agent** (fixture authoring + scratch run) |
| **C1 — Calibrate the diagnosis mix** | real PRB dispensing + published morbidity source | **NOT TESTED** | human (data license) |
| **C2 — Clinically coherent content** | pharmacist rules table + 100-visit plausibility sample | **NOT TESTED** | human (pharmacist) |
| **C3 — Payer mix / demographics / rhythm** | age/sex/dx rules, weekly/seasonal, returning-patient, payer (BPJS/general/private) | **NOT TESTED** | human (policy) — re-baselines §1/§2/§5 revenue |
| **C4 — Compare with one real source** | anonymized facility monthly aggregates (visits/day, revenue/visit, top dx, drug share) | **NOT TESTED** | human (cooperating clinic) |
| **D2 — Replay at scale + cross-machine** | **second VPS** (provision) + confirm B3 encounter-hash replay | **NOT TESTED** | **agent** (replay + hash compare) — 2nd VPS is human provisioning only |
| **D3 — Release packaging** | tag DR/adapter/consumer, pin Khanza/JDK/MySQL, archive DOI | **NOT TESTED** | **agent** (tag + pin + archive) |
| **E2 — 5× burst + 2nd-HMS smoke** | bounded 5× burst run; OpenMRS/OpenEMR FHIR adapter smoke | **NOT TESTED** | **agent** (both runs) |
| Pharmacist review of records / Preregistration / Prior-art log | human sign-off | **NOT TESTED** | human |

**What 85 does not mean:** not inpatient/claims/INA-CBG, not other HMS at depth, not
validation against real hospital operations over time. Those take the last points and need
data + partners beyond this repository.

## 12. Named open items (autonomous scope, RC-8)

1. **Full-window amount reconciliation — DONE (A3):** 12-month table §5; per-visit CSVs archived.
2. **DR-owned independent tariff — DONE (A1 + F8):** `dr_tariff` 685 rows, first price authority, fail-closed.
3. **check_billed_eq_dr reg-without-billing — TESTED (F3):** reachable via real-patient + fresh `no_rawat` (RC-11: FK does NOT block the predicate); F7 whole-window.
4. **B3-scale independent form-level count — RESTATED (RC-8):** the 999-visit real-form sample
   passed 0/999. **The roadmap's "≥1,000" acceptance box was checked with 999 visits; the
   criterion is restated to "999 stratified visits (≈1,000, one short of the literal box)."**
   Edge-strata count (B3, now agent-runnable) remains NOT TESTED. B-settlement equivalence is
   out of scope (subset, §13).
5. **dx frequency calibration — NOT TESTED** (human C1).
6. **5× burst re-run — NOT TESTED** (now agent-runnable, E2).
7. **Query provenance disclosure — FLAGGED:** `top_diagnoses` is benchmark-authored + empty-set
   at prefix cutoffs; the six native-table queries read raw `billing` (EXPLAIN-confirmed).
   §5 carries the disclosure; the published artifact does not yet.

## 13. Remaining caveats to carry into any paper

**RC-9 — paper-safe claim boundary (verbatim):**
> "This study demonstrates high-volume synthetic outpatient billing-consumer execution against
> one Khanza/MySQL configuration, with real-form comparisons on selected visits, but does not
> establish population-wide billing correctness, representative hospital performance, or
> generalization to other care settings, payers or HMS products."

- ~~**B is a subset, not A (P1 close-out):** the headless Khanza save writes the verification
  layer (`nota_jalan`/`detail_nota_jalan`/`piutang_pasien` + `status_bayar`), **not** the
  consumer's `billing` settlement rows. So a true `billing`-level form-equivalence (A==B) is
  **not claimable** by this harness; B is reported as a verified subset (`P2-BC-TOTAL`).~~
  **[§18: withdrawn — the form's save writes `billing` too (audited). Restated limit: the
  same-encounter comparison covers the sampled, re-billed visits only; three_count's B is a
  note-level total over whichever visits were re-saved, so `P2-BC-TOTAL` stays a subset
  comparison by construction.]**
  The 999-visit sample is a *consumer-oracle* re-bill, stated as measurement, not population proof.
- **Price-mapping correctness — tested at one point (F8), not exhaustively:** the DR tariff is
  the price authority and F8 proved a wrong price trips charge_delta end-to-end; the other 684
  seeded prices inherit the path but were not individually injected.
- **Oracle drift bound:** 4/216 (1.85%) root-caused as a re-bill timing artifact (§4); R4
  re-sample 0/999 (0.00%) → ~~B3 bound ~0.3% (rule of three)~~ *(P9-A7: restated — 0 drift in
  999 sampled visits of this one synthetic cohort, measured with the pre-R5 oracle. The rule
  of three gives ~0.3% only for independent, uniformly random draws from the same population;
  that was not established, so no population bound is claimed.)* The four artifact rows themselves
  remain unreplayed individually at 216-scale.
- **Diagnoses uncalibrated; drug share of revenue ~82.7% (PPN-inclusive, §5 RC-5)** — not
  clinically realistic (C1/C2/C4, NOT TESTED).
- **Outpatient only; MySQL 8.0.46** (the manifest/server pin; the earlier "8.4" was a
  stale label, P5-7) — inpatient / multi-facility / non-MySQL out of scope.
- **Payer mix not exercised** (C3, NOT TESTED) — if it lands, §1/§2/§5 revenue figures must
  be re-baselined.

## RC-10 — scope bridge (added, §1/§2)

- **Billing snapshot vs DR ledger:** live `sik` billing snapshot = **34,895,128,580**
  (1,464,593 rows); DR ledger = **34,870,243,633** (356,355 rows). Difference =
  **Rp 24,884,947** = **221 non-DR registrations** that carry billing but are not in the DR
  cohort (scope bridge, not a data error).
- **Row-predicate bridge:** `billing`-row sums differ by predicate: full-window value-row sum
  **1,393,815**; B3-cohort **1,457,876**; snapshot **1,464,593**. The deltas are the
  354-visit Stage-A seed (B3 vs full-DB) plus Ttl/structural-row exclusion differences,
  not unreconciled amounts.

## 14. P4 agent-runnable close-out (2026-10-14, new)

The agent-runnable remainder (reclassified from human-gated in the §RC-12 table) was executed
P4; all on scratch fixtures with no live-DB mutation:

- **D2 B3 replay — DONE:** the B3 365-day encounter set re-derived from seed 20261012 is
  byte-identical to the canonical `B3.encounters.txt` (sha256
  `84991ca4b143ada732c3679e991b5ab6edb5de52699c4e8695d45f551fab7b08`, 86,101 visits /
  285,126 lines), archived at `p-chain/b3_encounter_sha256.txt`. Adds the B3 hash to §2
  (which previously cited only B1 `75889b60…4ca0d`). Cross-machine D2 (2nd VPS) remains
  the sole human piece.
- **Line-diff gate (P2 (b)-limit — quantity slice closed, code level NOT closed, P5-7
  restated):** `charge_delta --line-diff` now compares per-visit per-component
  *quantity* (drug+procedure) **in aggregate**, not code-level line items. Clean canonical ledger →
  `LINE-DELTA=0`; a same-price quantity misallocation → `GAP [P2-LINE-DELTA]` + named
  `LINE-DELTA`. Pure same-price code-*label* swaps remain a documented limit
  (`sik.billing` stores item names, not codes). **[§17: the current live ledger is NOT
  LINE-DELTA=0 — one row, 2026/10/01/000298 drug, has quantity 23 vs 25 in source/billing.]**
- **B3 edge strata — agent-tested (P5 behavior):** 5 authored STRATA- visits (embalase, tuslah,
  half-rupiah PPN, zero-fee, ≥3-proc) run through the real form on a scratch clone; the P1
  oracle (`--allow-strata`) reports all 5 as **not-covered** — post-P5 this is
  *eligibility-based* classification at load time (a `classification=OUT-OF-ENVELOPE`
  column in the result CSV), not attempt-based: verdict `PARTIAL-NOT-COVERED`, exit 4, no
  crash, no false pass. **[§17: this run did NOT reach the clone — the harness was pointed
  via `database.ini`, which it does not read, so the form ran on live `sik` where the
  STRATA- visits did not exist; TUSLAH/HALFPPN had registration rows only. Superseded by the
  §17 re-check.]**
- **E2 bounded burst — measured:** the consumer sustained **916 v/min** on a cold scratch
  target (2,000-visit slice; wall-clock 65.5 ms/visit incl. per-visit I/O vs consumer-internal
  64.2 ms/visit, both figures kept, P5-7) vs ~1,802 v/min warm at B3. **Corrects the
  "5× burst" framing:** ~1,800 v/min is the warm ceiling, not a 5× headroom; a 5× burst is
  a ~2.5–5× slowdown scenario, not a speedup.
- **D3 release manifest — produced:** `khanza_r5_release_manifest.md` pins the Khanza jar
  SHA-256, JDK 17.0.20.1, MySQL 8.0.46, the B3 encounter hash, the canonical ledger
  (356,355 / Rp 34,870,243,633), the four gate-tool SHA-256s, and the determinism/mutation
  seeds. DOI-Zenodo archival remains the human D3 remainder.

**§12 status updates:** item 4 (B3 edge strata) → agent-tested (not-covered markers);
item 6 (5× burst) → measured + framing corrected. §human-gated table: the B3/D2/D3/E2
agent slices are now DONE; C1–C4, cross-machine D2, pharmacist review, preregistration,
prior-art log, and DOI remain human-gated.

**No live-DB mutation in P4** (all demos on scratch `sik_p2`/`sik_bench_p2` + read-only
live gates; `setting/database.ini` restored to `sik`; scratch DBs dropped; live ledger
still 356,355 / Rp 34,870,243,633, live charge_delta PASS).

## 15. P5 fail-closed enforcement + report consistency (2026-10-15, new)

Driven by the Astra re-assessment (run 4769794, 43/100): the prior R5 behavior had code
that *claimed* fail-closed while the process could still exit 0 on a drifted or failed
run. P5 makes the enforcement executable and reconciles the report's stale wording.
Task doc + rubric: `khanza_r5_task_p5_failclosed.md`.

- **Exit-code contract (P5-1):** the oracle process now exits **1** on in-envelope
  drift/parse errors, **4** on FAILED batches or out-of-envelope visits
  (`PARTIAL-NOT-COVERED`), **0** only on a clean in-envelope pass. `main()` propagates
  the `_finalize` code; a drifted/destructive run can no longer report process success.
- **Conditional BILLED (P5-2):** a batch is `BILLED` only when harness rc==0 AND every
  visit `sukses=true`; otherwise `FAILED` (+reason), the batch is restored from its
  stage backup, and the run stops.
- **Eligibility-based not-covered (P5-3):** `--allow-strata` out-of-envelope visits are
  captured at load (not at attempt time), get a `classification` column in the result
  CSV, are excluded from the drift rate, and force verdict `PARTIAL-NOT-COVERED`.
  This corrects the R5 §14 "not-covered" claim, which previously described attempt-based
  behavior that never fired.
- **Repair gated (P5-4):** consumer rebill auto-repair now requires `--repair-consumer`;
  default logs `REPAIR-SKIPPED` and leaves drift as drift (the old auto-repair masked
  form failure and mutated the target).
- **Per-run stage tables (P5-5):** stage tables are `r5_stage_<runid>_<table>` (global
  names were a cross-run hazard); dropped at finalize so the box is left clean; a
  mid-run crash keeps them for resume. **P5-5b (v5-validation pass):** the Kaggle
  validation model (gemini-3.8-flash, run 4795485) read the tool source and caught two
  evidence defects before the gpt-6-astra run: (1) `_finalize` emitted result rows only
  for BILLED batches, so a FAILED STRATA batch wrote a header-only CSV — the claimed
  "5 OUT-OF-ENVELOPE rows" were absent; (2) the drift demo had exited 1 via an *uncaught
  CREATE-privilege traceback* (`benchmark` user lacks CREATE for the per-run stage
  tables), not via the exit contract. The re-patch: per-visit rows for non-BILLED
  batches (CSV/MD gain `batch_status` + `fail_reason` columns); stage-table DDL
  (CREATE/DROP) now runs as root via `dbutil.execute(..., force_root=True)` while all
  DML stays on the minimally-privileged `benchmark` user; `DBUTIL_FORCE_ROOT=1` routes
  every op to root for scratch-clone runs; a stage-backup failure marks the batch
  `FAILED` and stops the run (P5-5b fail-closed infra path). Both defects re-proven
  below; oracle SHA re-pinned (`70f37ba3…`).
- **Builder honesty (P5-6):** `--require-manifest/--manifest-file` (existence-only,
  never consumed) removed from `build_dr_charge_ledger_p2.py`; the docstring states the
  shared-source limit (quantities/codes derive from DR source tables) as an open item.
- **Demonstrations (P5-8), evidence `p-chain/r5_p5_failclosed_20261015T2200Z.md`:**
  - **STRATA demo (re-run on live `sik` under `DBUTIL_FORCE_ROOT=1`; the scratch
    `sik_p2` fixture had been dropped by post-demo cleanup, so the equivalent
    disposable-clone semantics were approximated by running the 5 synthetic STRATA-
    `no_rawat` values against live `sik` with the harness pointed at it, then restoring
    `database.ini`):** 5 STRATA- visits → batches `FAILED` (restored=true), no further
    batches, `OUT-OF-ENVELOPE` labels in the result CSV (5 rows), `REPAIR-SKIPPED`,
    `ORACLE_PARTIAL-NOT-COVERED`, **exit 4**, stage tables dropped. **Known limitation
    (stated, not hidden):** with the scratch fixture gone, this re-run exercised the
    failure-classification + exit-4 + row-emission + restore paths but did NOT re-execute
    the five populated financial edge cases (embalase/tuslah/half-PPN/zero-fee/≥3-proc)
    against a populated pre-state. The original P4-populated-clone edge-strata run
    remains the evidence for that slice; this re-run is the post-re-patch confirmation
    that the exit contract and CSV row emission hold.
  - **Drift demo (live `sik`, F1-precedented `databarang.ralan` tamper):** a mismatched
    in-envelope run **exits 1** through the `_finalize` verdict path (not a traceback) —
    a mismatched run can no longer report success. Honesty note: the mismatch was
    driven by the known B-subset fixture behavior (form output ≠ frozen consumer
    baseline); the tamper's causal role is not established (the form did not persist
    settlement rows in that run). What is proven is the exit contract. Price reverted;
    the 2 demo visits consumer-rebilled to canonical; post-restore charge_delta PASS.
  - **Clean pass (live `sik`):** 2 in-envelope visits → all BILLED, drift=0, **exit 0**,
    box left clean.
- **Ops finding (corrected in the v5-validation pass):** post P5-5b the stage-table DDL
  (CREATE/DROP) escalates per-op to root while all DML stays on the `benchmark` user, so
  live oracle runs work WITHOUT the env flag; `DBUTIL_FORCE_ROOT=1` is only required in
  scratch-clone mode (scratch DBs have no benchmark grants). The pre-re-patch note
  ("live runs need DBUTIL_FORCE_ROOT=1") is obsolete and corrected here.
- **Newly surfaced follow-up gate defects (disclosed, NOT claimed fixed in P5):**
  reading the full `dbutil.py` source exposes two pre-existing defects that P5 did not
  introduce but that the v5 validation surfaced: (1) the ledger builder's "transactional"
  cohort replace is not actually transactional across calls — each `dbutil.execute` opens
  a fresh `mysql` session, so `START TRANSACTION; DELETE` on one connection and `COMMIT`
  on another do not form one transaction; and (2) both reconciliation tools'
  `--window ALL` predicate contains an unterminated SQL string literal
  (`'____/__/__/8_____%'` missing its closing quote). Both are logged as open gate
  work items, not P5 scope; P5's fail-closed oracle exit contract is unaffected by them.
- **Post-demo state:** live charge_delta PASS (delta 0); three_count A==C
  31,750 / Rp 3,113,533,580 (the B-subset `P2-BC-TOTAL` FAIL verdict is the expected
  honest state); ledger 356,355 / Rp 34,870,243,633; scratch DBs dropped; harness
  `database.ini` restored to `sik`.

**Manifest:** gate/oracle tool SHAs in `khanza_r5_release_manifest.md` updated to the P5
build.

## 16. P6 executable acceptance suite (2026-10-16, new)

**Result: 18/18 machine-asserted checks PASS** on a disposable full-clone fixture
(`evidence/p6/r5_p6_acceptance_20261016T051552Z.md`, logs `r5_p6_logs_20261016T051552Z.tgz`).
Three earlier runs the same day (15/3, 17/1, 17/1) are kept next to it; each failure
there was diagnosed to a code or test-design defect and fixed before the next run.

**What the suite proves (each check asserts the gate's own log line, not just an exit code):**
- A1 clean in-envelope pass → exit 0 (2 DR-cohort visits, real form, `sukses=true`, 0 drift).
- A2 a source drug line perturbed before freeze → the form's Obat/PPN rows disagree with the
  frozen consumer baseline → exit 1 via the verdict path (1 drift visit, no traceback).
- A3/A6 4 real out-of-envelope visits (>2 procedures) → exit 4, 4 `OUT-OF-ENVELOPE` CSV rows.
- A4 harness timeout (3 s cap) → process-group kill, `WRITER-DEAD-PROOF … group_empty=true`,
  `STAGE-RESTORED-VERIFIED`, exit 4, 0 java processes left.
- A4b SIGTERM to the oracle mid-harness → handler kills the JVM group (3 → 0 java), exit 4;
  resume restores (verified) and re-bills, exit 0.
- A5 missing `reg_periksa` row → `MISSING-REG` structured rejection, exit 2, no traceback.
- A7 zero-row consumer baseline → `EMPTY-BASELINE`, exit 2; with `--allow-empty-baseline` → 0.
- A8 kill right after the batch reset → resume `STAGE-RESTORED-VERIFIED` + clean re-bill, exit 0.
- A8b changed visit set on resume → `RESUME-ABORT (P6-2f)`, exit 3.
- A9 same RUN_ID, stages B3/B2 → disjoint stage prefixes, each verified-dropped.
- A10/A10b builder on a scratch ledger copy: one-session commit, exit 0; a stale in-window
  key (drug+tax) is gone after rebuild; every window tax row = 11 % of its own drug subtotal.
- A10c injected mid-build failure (trigger on the first tax row, after the DELETE and all
  other REPLACEs) → mysql `ERROR 1644 … injected`, `FAIL-CLOSED`, exit 1, scratch ledger
  byte-identical (genuine rollback).
- A11/A12 0 restore mismatches, 0 failed drops, 0 stage tables left on the fixture.
- A13 live guard: `sik_bench` ledger content hash identical before/after; both
  `database.xml` copies verified back on `sik`.

**Defects found and fixed in P6 (beyond the planned P6-2/P6-3 patches):**
- *Oracle:* the FAILED-path restore omitted `stage=` (it read a nonexistent
  `r5_stage_stage_*` table after the DELETE) and the restore result was ignored;
  `_content_hash` used `SELECT key, *` (MySQL 1064 — every stage backup failed); the
  verified drop's re-check called a `force_root` parameter `dbutil.scalar` did not have (every
  drop reported failed); the timeout kill judged death by the bash wrapper, not the group,
  and no SIGTERM handler existed (with `start_new_session` an oracle kill orphaned the JVM);
  a restore exception was a traceback and finalize dropped the stage tables even when they
  were the only copy of the pre-reset rows (now `STAGE-KEEP`).
- *dbutil/builder:* `session.close()` closed stdin before `communicate()` (every clean build
  reported FAIL-CLOSED while mysql was still committing); a broken pipe now surfaces mysql's
  own error; the builder's tax step re-queried the uncommitted ledger on a second connection
  (stale keys kept a tax row; a first build got zero tax) — now taken from the in-memory
  drug subtotals of the same build.

**Environment findings (these change how earlier evidence should be read):**
- **The harness and consumer read `setting/database.xml` (AES-encrypted DATABASE), not
  `database.ini`.** Pointing "the harness" at a scratch DB by editing `database.ini` — the
  method in the P5/P6 task docs and earlier clone scripts — left the real form on live
  `sik`. P6 retargets both XML copies with backup + round-trip verify and restores them in
  an EXIT trap. Today's affected runs were checked (4 visits, content hashes identical in
  `sik` and the restored clone; the form refused to save because the visits were already
  paid). **Earlier clone-mode form runs that relied on `database.ini` are not re-verified
  here** — their "ran on the scratch clone" statements should be treated as unproven.
- The handed-off `sik_p6` fixture left 570 reference tables empty (e.g. `akun_bayar` 0 vs 7),
  so no visit could bill on it; its 5 `STRATA-` visits had no billing/drug/procedure rows.
  No visit in `sik` has nonzero embalase/tuslah. P6 used `sik_p6f` (full clone + the 5
  `STRATA-` reg rows). The STRATA rows remain useful only where emptiness is the test (A7).
- Native Khanza visits (e.g. `2026/10/01/000254`) are rejected by the form in this harness;
  the clean set is DR-cohort visits that billed `sukses=true` in the 2026-10-12 B3 run.
- **Live ledger drift found at session start:** an earlier suite (`/tmp/r6_suite.sh`,
  2026-10-16 03:12 UTC) inserted `STALE-TEST-KEY/drug/ZZFAKE/Rp 1` into live
  `sik_bench.dr_charge_ledger` and never removed it, so the ledger read 356,356 rows /
  Rp 34,870,243,634 against the pinned 356,355 / …633. P6 did not touch it (A13); removed with
  owner approval at 05:25 UTC (1 row) → ledger back to 356,355 / Rp 34,870,243,633.

**Corrections to earlier sections:** ~~the "unterminated `--window ALL` SQL literal" in §15
was a misread~~ — **retracted in §17: the literal WAS unterminated** (Astra v5 was right; this
sentence repeated the handoff without checking the source). The §15 "single-session
transaction" follow-up is closed by P6-3 (A10/A10b/A10c). The `--window ALL` scoping
question for the 354 Stage-A visits is resolved in §17.

**Live gates after P6 (2026-10-16 05:20 UTC):** charge_delta PASS (all deltas 0);
three_count A == C = 31,750 rows / Rp 3,113,533,580 (B-subset `P2-BC-TOTAL` FAIL as
documented in §15; B = 151 notes / Rp 49,903,019 — B was not pinned before, so its
stability cannot be asserted). After cleanup (05:26 UTC): same gate results; ledger
356,355 / Rp 34,870,243,633 (pinned); `sik_p6` and `sik_p6f` dropped; the temporary
`benchmark` grant on `sik_p6f` revoked; both `database.xml` copies on `sik`.

**Unchanged honesty limits:** ~~B-settlement equivalence is structurally unclaimable;~~
*(withdrawn in §18 item 2: the audited form save writes `billing`; what B can and cannot
show is restated there — P8-A3)* same-price wrong-code swaps stay invisible to the quantity line-diff; external validity
(C1–C4, cross-machine D2, DOI) is NOT TESTED; the 999-visit sample is a consumer-oracle
measurement, not population proof. P6 proves the enforcement suite on a clone, not
settlement equivalence.

**Manifest:** tool SHAs re-pinned to the P6 build (see `khanza_r5_release_manifest.md`).

## 17. Post-P6 corrections and re-checks (2026-10-16, new)

Done while preparing the Astra v6 task; each item was checked against code or a run, not
taken from a handoff.

**1. `--window ALL` — Astra v5 was right (retracts the §16 sentence).** Both gate tools built
`"no_rawat LIKE '____/__/__/8_____%"` with no closing quote; every `--window ALL` run of
`charge_delta` and `three_count` died with MySQL 1064 (reproduced live before the fix). The
pattern was also wrong in scope: it matches 86,101 of the 86,455 DR visits and skips the 354
Stage-A October visits (§2), and the builder hard-coded it in its DELETE and its
procedure/drug queries. Fix: `ALL` = no date restriction (`1=1`), the cohort predicate scopes
it; the builder uses one shared predicate. Live results after the fix
(`evidence/window_all/`):
- charge_delta `--window ALL`: 86,455 visits, all four component deltas 0, PASS (totals
  sum to Rp 34,870,243,633).
- three_count `--window ALL`: A == C = **356,355 rows / Rp 34,870,243,633** — the ledger pin.
  B (verified form-save subset) = 1,068 notes / Rp 413,944,708; `P2-BC-TOTAL` FAIL as
  documented in §15.
- `--window 2026-10` unchanged (31,750 / Rp 3,113,533,580, delta 0).

**2. Ledger reproducibility, and one latent ledger defect.** A full `--window ALL` rebuild
from live `sik` into a scratch copy (two stale keys planted first, both removed) gives
356,355 rows with **the same keys, amounts and unit prices** as the pinned ledger. It differs
in: (a) `source` — 260,800 pinned rows outside October carry `NULL` from an older builder;
the rebuild writes `dr_tariff`; (b) **one quantity: pinned row `2026/10/01/000298` drug
`B000000240` has quantity 23 while its own amount is 745,800 = 25 × 29,832 and both source
(`detail_pemberian_obat.jml`) and billing say 25.** `charge_delta --line-diff` flags it
(`LINE-DELTA … khanza_qty=25 ledger_qty=23` → FAIL), so §14's "clean canonical ledger →
LINE-DELTA=0" does not hold for the current ledger. Its origin is not established. The
live ledger has **not** been rewritten (owner decision); the default gate (amounts) stays
PASS because the amount is correct.

**3. P4 edge strata (§14) — re-checked on a verified target.** P4 had pointed the harness at
its clone via `database.ini`, so its form runs hit live `sik`, where the `STRATA-` visits did
not exist (explaining its "5/5 sukses=false, 0 value rows"); TUSLAH/HALFPPN were
registration-only and the eligibility predicate does not look at fee or PPN. Re-check
(`evidence/p4_strata_recheck/`, `tools/p6_strata_recheck.sh`):
- **>2 procedures:** 4 real visits (P6 A3/A6) billed `sukses=true` through the form on the
  clone, classified `OUT-OF-ENVELOPE`, exit 4.
- **Embalase / tuslah** (no such rows exist in the real data): two visits authored as copies
  of DR visit 800085 with embalase 2500 / tuslah 1500 on the drug line; full clone,
  `database.xml` retarget verified. Both `BILLED`, `sukses=true`, `OUT-OF-ENVELOPE`, exit 4,
  verified stage drop, `database.xml` back on `sik`. **The form's bill was identical to the
  template** (drug Rp 2,640 + PPN Rp 290; no embalase/tuslah line): in this Khanza
  configuration those charges do not reach the outpatient bill, so these strata carry no
  observable billing difference here.
- ZEROFEE / HALFPPN are in-envelope by the predicate and need a consumer-billed baseline;
  **not re-tested.**

**4. Suite re-run on the current pins.** After the builder/gate changes the suite was re-run
end-to-end with `tools/p6_run_suite_fresh.sh` (fresh full clone → suite → teardown):
**18/18 PASS** (`evidence/p6/r5_p6_acceptance_20261016T054920Z.md`); fixture dropped and the
temporary grant revoked by the wrapper.

**5. Scope note.** Every pre-P6 form run described as running "on a scratch clone" via
`database.ini` (P1 clone-mode demos on `sik_r5`, P4 on `sik_p2`) should be read as having run
the form against live `sik` (the P5 demos already stated live `sik`); only §16/§17 runs are
verified to have used the clone.

**Manifest:** gate tools and builder re-pinned (`charge_delta` `584e36c5…`, `three_count`
`9ff4396c…`, builder `7f6e79c4…`) plus `p6_run_suite_fresh.sh` and `p6_strata_recheck.sh`.

## 18. P7: fail-closed gates, write provenance, integer tax, live guards (2026-10-17, new)

Driven by Astra v6 (gpt-6-astra run 4818826, **52/100**, +9 vs v5; `evidence/astra_v6_4818826_output.md`).
Task: `docs/khanza_r5_task_p7_failclosed_gates.md`. Every v6 code claim acted on below was
checked against the source first; all held.

**Result: suite 21/21 PASS** on a fresh full-clone fixture via `p6_run_suite_fresh.sh`
(`evidence/p7/r5_p6_acceptance_20261016T195113Z.md`), and the suite's exit code now means
something (A14 proves a failing check exits 1).

**1. Live ledger rebuilt and re-pinned (owner-approved, P7 §5 option A).** The live
`sik_bench.dr_charge_ledger` was backed up to `dr_charge_ledger_bak_20261017` (content hash
verified identical) and rebuilt from live `sik` with the pinned builder `--window ALL`
(`evidence/p7/r5_p7_ledger_rebuild_*.md`). Diff against the backup: 0 keys added or lost,
0 amount or unit-price changes, 1 quantity corrected (2026/10/01/000298 B000000240, 23 → 25),
260,800 `source` labels filled. Rows and total unchanged: **356,355 / Rp 34,870,243,633**. New
content hash `a66a3a54…` equals the 2026-10-16 scratch rebuild (reproducible).
`charge_delta --line-diff` now **PASS** on both windows; §14's LINE-DELTA statement holds again.

**2. Write provenance — the form writes `billing` (retracts the B-subset caveat).** A
row-level audit (AFTER INSERT/DELETE triggers recording the account and connection) on a
throwaway clone, while one visit was billed through the real form
(`evidence/p7/r5_p7_write_provenance_*.md`):

| Table | Operation | Account | Rows |
|---|---|---|---|
| billing, nota_jalan, detail_nota_jalan | DELETE | root (the oracle's reset) | 17 / 1 / 1 |
| nota_jalan | INSERT | benchmark (the harness JVM, one connection) | 1 |
| **billing** | INSERT | **benchmark** | **17** |
| detail_nota_jalan | INSERT | benchmark | 1 |

`BilingHarness.java` contains no SQL; it opens Khanza's `DlgBilingRalan` and clicks Save. So
**Khanza's own save path writes `billing`**, the same 17 value rows the consumer wrote. The R5
statements that the form writes "the verification layer, not `billing`" (§0 table, §1, §13)
are struck through and annotated. Likely origin (not proven): P1's clone-mode runs pointed the
harness via `database.ini`, so the form actually ran on live `sik`, where those visits were
already paid; it refused to save, and the clone showed no form-written `billing`.
**Consequence:** the oracle's billing comparison is a same-encounter form-vs-consumer check on
every sampled, re-billed visit. Still unclaimed: equivalence beyond the samples. Open: whether
the R4 0/999 sample (run on live `sik`, where the form did save) already measured exactly that;
it was run with a pre-R5 oracle and is not re-examined here.

**3. Fail-closed fixes (Astra v6 defects D1–D3, D5, D6).**
- *Suite exit code (D1):* the suite now ends `exit 0` only when FAIL = 0 (it used to end on an
  `echo`). A14: forced fail → exit 1, forced pass → exit 0.
- *Restore without a hash (D2):* `stage_restore` returns False with `STAGE-RESTORE-UNVERIFIED`
  (it returned True). A15 deletes the hash mid-run: exit 4, `restored=False`, 13 stage tables
  kept (`STAGE-KEEP`), then used to put the visits back.
- *three_count (D3):* exit 0 for PASS or PARTIAL as documented (the old expression returned 1
  for PARTIAL); `--verify-form-save` now makes an absent B a FAIL (it was parsed and ignored).
  Contract test 4/4 (`tools/p7_three_count_contract_test.py`).
- *Integer tax (D5):* the builder computes `(subtotal × 11 + 50) // 100`. Before switching, the
  consumer's `Math.round(subttl * 0.11)` was compared with the integer rule over all 70,056
  real drug subtotals: **0 differences, 0 missing tax rows, 0 stored deviations**
  (`tools/p7_tax_rule_check.py`). A10b is exact: tolerance 0, missing and orphan tax rows
  detected. The integer builder run `--window ALL` into an empty scratch table reproduces the
  live ledger byte-identically (`a66a3a54…`; `evidence/p7/r5_p7_integer_builder_all_check.txt`).
- *Live guards (D6):* A13 also requires identical CHECKSUMs of live `sik.billing`,
  `nota_jalan`, `detail_nota_jalan`, `piutang_pasien`, `detail_piutang_pasien` and
  `reg_periksa` before and after the suite (held). A billing run against `sik` now needs
  `--allow-live`; A16 asserts the refusal (`LIVE-TARGET-REFUSED`, exit 3).

**Not done in P7 (deferred, Astra v6):** interruption *during* restoration; hard-crash resume
with a surviving JVM; concurrent-overlap isolation; making FAILED/unrestored batches retryable;
re-validating pre-P6 clone-mode runs; C1–C4.

**Live state after P7:** databases `sik`, `sik_bench`; both `database.xml` copies on `sik`;
ledger 356,355 / Rp 34,870,243,633 (content `a66a3a54…`); charge_delta and line-diff PASS on
both windows; three_count A == C on both windows.

## 19. P8: claim wording, gate defects, recovery fault injection (2026-10-18, new)

Driven by Astra v7 (**58/100**, "Needs targeted rework"; step 1 run 4880158 + merged run
4894730, method and caveats in `evidence/astra_v7_merged_4894730_NOTE.md`). Task:
`docs/khanza_r5_task_p8_claims_gates_recovery.md` (packs A+B+C, scope agreed with the owner).
Each v7 code claim acted on was checked against the source first (task doc §0, D1–D10); all
held. One (D6, delete scope) was dormant: every live ledger row is DR-cohort.
Timestamps in this section and in the evidence files are UTC; document dates are local (UTC+7).

**Result: suite 29/29 PASS** on a fresh full-clone fixture via `p6_run_suite_fresh.sh`
(`evidence/p8/r5_p6_acceptance_20261017T225851Z.md`; 21 P7 checks + 8 new). The summary
now lists each check with the one property it asserts. A PASS covers only that property on
that fixture. Recovery unit test 11/11 (`evidence/p8/r5_p8_recovery_unit_test.txt`).

**1. Recovery fault injection (pack C; Astra v7's top next step).** All of these run through the
same oracle and wrapper as every other check, on the disposable `sik_p6f` clone:
- *A18a, corrupt hash metadata:* a truncated stage hash file used to raise a traceback in
  `stage_restore`. Now it gives `STAGE-RESTORE-UNVERIFIED (hash file unreadable)`, exit 4,
  `restored=False`, stage tables kept. A file describing another batch (prefix or visit set)
  or a non-hex hash is treated the same way (unit test).
- *A18b, wrong hash:* a valid file with a wrong sha256 gives `STAGE-RESTORE-MISMATCH`, exit 4,
  stage tables kept. Both A18 cleanups put the original file back, and their restore is
  verified.
- *A19, surviving writer:* SIGKILL to the oracle mid-harness (its signal handler cannot run)
  left 3 harness processes alive. Before P8 a resume waited on the bash wrapper's pid only,
  then deleted the pid file and restored even if the JVM was still running. Now the resume
  kills every recorded harness group and any BilingHarness process naming a run visit, then
  requires none left *and* the visits' output unchanged over a quiet interval (5 s). Only then
  does it restore. Run: `killed=['448791:dead'] … quiet=true`, verified restore, re-bill
  exit 0, 0 java left. A group that will not die, or output still changing, gives
  `WRITER-ALIVE`, no restore, exit 4 (unit test; a fixture cannot produce an unkillable
  process on demand).
- *A20, interrupted restore:* a resume SIGKILLed half-way through restoring (test hook
  `R5_FAULT_RESTORE_PAUSE_S`; `billing` restored, 11 tables pending) is redone by the next
  resume: `STAGE-RESTORED-VERIFIED`, re-bill exit 0, no mismatch. The restore is idempotent
  (DELETE+REPLACE from the kept stage tables, then hash-verified).
- *A21, retry:* a timed-out batch stays FAILED on a plain resume (exit 4).
  `--retry-failed` re-bills it only from a hash-verified pre-reset state, then exits 0.

**2. Gate defects (pack B).**
- *A10b/A10d, tax-row count:* A10b's amount query does not see a duplicate tax row whose
  amount is correct (A10d measured `amount_query=0`). A10b now also requires exactly one tax
  row per window visit with drugs (zero when the expected tax is 0). A10d plants a duplicate
  and a wrong amount; both are caught.
- *`p7_tax_rule_check.py`* exits 1 on any defect (it always exited 0), detects duplicate
  tax rows and takes `--db`. A10d proves exit 1 on both planted defects and exit 0 on the
  clean ledger. On the live ledger: PASS, 0 defects.
- *Builder delete scope (A10e):* the DELETE now uses the window **and** the cohort, as the
  inserts do (`--window ALL` was `WHERE 1=1`). A non-DR row survives a DR rebuild of window
  2026-10 and of ALL. ~~The delete scope equals the insert scope: a non-DR row survives~~
  **the DELETE removes every row of the window whose key is NOT a DR-cohort key — including
  orphan rows that the INSERT never writes (e.g. a leftover `source` NULL row) — and then
  re-INSERTs the DR cohort; a non-DR row whose key IS a DR-cohort key survives, but a non-DR
  row whose key is not a DR-cohort key is deleted.** The first version joined a utf8mb4 column to Khanza's latin1
  `reg_periksa.no_rawat`, which lost the index (a 31k-row DELETE ran ~30 min). It was caught
  when suite run 1 stalled; that run was stopped and torn down (live state verified unchanged).
  The join now converts the ledger side into reg_periksa's charset: `eq_ref`, 0.07 s for the
  window, 26 s for the whole ALL rebuild in A10e.
- *Float (B5):* `irup()` uses exact Decimal half-up instead of `floor(float + 0.5)`.
  three_count's paid sum uses Decimal half-up instead of `int(round(float()))` (banker's
  rounding). On live `sik` 1 of 1,095 paid sums is fractional and none ends in .5, so no
  amount changes. The P8 builder `--window ALL` into an empty scratch ledger reproduces the
  live ledger byte-identically (`a66a3a54…`; `evidence/p8/r5_p8_builder_all_check.txt`).
- *Suite hygiene:* earlier results and logs are moved to `results/archive/<UTC>/`, not
  deleted. `FX=sik` / `FX=sik_bench` are refused before any DB access (A17,
  `LIVE-FIXTURE-REFUSED`).

**3. Claim wording (pack A).**
- A11 used to claim "every restore across the suite hash-verified" while A15 deliberately
  restores unverified. It now covers every restore *outside* A15/A18a/A18b (9 verified, 0
  mismatch, 0 unverified) and requires those three to produce exactly their 3 deliberate
  failures. A15's cleanup restore is now verified too.
- The oracle no longer writes `crash_safe=YES`. Result files carry measured counts (`recovery:
  batches, billed, failed, failed_restored_verified, unrestored, retried`). Its docstring
  claims recovery only from the injected fault modes.
- Struck through or annotated: §0 P1 "crash-safety" and the §1 crash-safety bullet (one
  demonstrated `kill -9`, not a general property); the §16 line "B-settlement equivalence is
  structurally unclaimable" (withdrawn in §18); the builder docstring "integer rupiah
  end-to-end … no float" (now states where rounding happens).

**Still not claimed:** behaviour under fault modes not injected (power loss, MySQL crash,
disk full, a writer that ignores SIGKILL); concurrent-overlap isolation; re-validation of
pre-P6 clone-mode runs; matched-encounter B–C reconciliation and the R4 0/999 re-examination
(pack E); third-party reproducibility (pack D: `stagea_common.py`, Java sources and STRATA SQL
are not published); C1–C4.

**Live state after P8:** databases `sik`, `sik_bench`; both `database.xml` copies on `sik`;
ledger 356,355 / Rp 34,870,243,633 (content `a66a3a54…`); live `sik` output-table checksums
equal before/after the suite; three_count A == C (Rp 3,113,533,580, 31,750 rows), B 151
notes / Rp 49,903,019 (documented B-subset state, exit 1); tax check PASS.

## 20. P9: recovery acceptance contract (2026-10-18, new)

Driven by Astra v8 (run 4897654, **60/100** "Needs targeted rework";
`evidence/astra_v8_4897654_NOTE.md`). Task: `docs/khanza_r5_task_p9_recovery_contract.md`
(packs A+B, scope agreed with the owner). Every v8 code claim acted on was checked against the
source first (task doc §0, E1–E11); all held. Times are UTC.

**Result: suite 34/34 PASS** on a fresh fixture (`evidence/p9/r5_p6_acceptance_20261018T010733Z.md`;
29 P8 checks + A22, A22b, A23, A24, A25). **Terminal-path check PASS**
(`evidence/p9/r5_p9_terminal_path_20261018T011818Z.md`). Recovery unit test 20/20. Builder
reproduction check: exit 0 on the live ledger, exit 1 on a planted mismatch
(`evidence/p9/r5_p9_builder_all_check.txt`).

**1. Recovery correctness (pack B).**
- *Per-batch hash files (E2):* `stage_content_hash_<prefix>_<date>.json`. Before P9 a later
  batch's backup overwrote an earlier batch's hash. A23, two dates: 2 hash files.
- *Retry from the current state (E1):* `--retry-failed` compares the batch's current content
  with its pre-reset hash instead of trusting the stored `restored=True` flag. A FAILED batch
  now keeps its stage tables until it is billed or released (`--abandon-failed`, also checked
  against the current state).
  - A22 changed ~~a billing row~~ *all 17 billing rows of the visit (+Rp 1 each; P10-A1
    correction)* after the verified restore. The retry detected
    `current state is not the pre-reset state`, restored and verified from the kept tables,
    then re-billed (exit 0).
  - A22b dropped the recovery tables as well. Result: `RETRY-REFUSED`, nothing deleted (the
    visit stayed at 17 rows / sum 87,947), no reset, exit 4. `stage_restore` now refuses before
    its DELETE when stage tables are missing.
- *Stop at FAILED (E3):* a resume no longer bills later dates after a FAILED batch. A23: the
  plain resume stopped with batch 2 still PENDING; `--retry-failed` then billed both.
- *Server-side fencing (E4):* before a restore, the resume kills stray `mysql` clients naming
  the target, then `KILL`s every other server session on the target and waits until none are
  left. Killing a client does not stop its statement (seen during P8). In A24 a second session
  held a locking read on the reset visit and then slept: `FENCE … sessions_killed=1
  remaining=0`, verified restore, re-bill exit 0, blocker gone. Fencing never runs on `sik` or
  `sik_bench` (`FENCE-SKIPPED`; unit test).

**2. Acceptance integrity (pack A).**
- *Terminal path + preserved failure (E7):* `P9_FORCE_FAIL_CHECK=<id>` fails one real check,
  and the suite ends through its normal final exit line. When the suite fails, the wrapper keeps
  the fixture and its stage tables (`FIXTURE-KEPT`) until `--teardown-kept`. Measured: A0
  forced to fail with the middle checks skipped (`P9_QUICK=1`) gave wrapper exit 1, fixture
  kept, evidence `PASS=1 FAIL=1` with the A0 line marked FORCED, A13 live guard PASS,
  `database.xml` on `sik`, grant revoked, then the fixture removed. A14 is relabelled as an
  early-branch self-test only.
- *`verify_frozen` source content (E6):* it now compares `source_content_hash` (the P6-2g
  docstring had claimed this since P6). In A25 one sampled drug quantity was changed after
  freeze; table counts were unchanged, so there were 0 fingerprint lines. Result: `SOURCE-CONTENT
  DRIFT`, exit 3, nothing reset.
- *Cleanup (E8):* the suite's restore helper drops stage tables only after a verified restore.
  A15's cleanup now runs with its hash file put back, and verifies.
- *A11 (E9)* also counts `STAGE-RESTORE-ERROR`. ~~Outside the four deliberate fault checks
  (A15, A18a, A18b, A22b): 14 verified, 0 mismatch, 0 unverified, 0 error.~~ *(P10-A1
  correction: the 14 was the verification-marker count over ALL transcripts, including the four
  excluded ones. Outside them: 0 mismatch, 0 unverified, 0 error. From P10 on, A11 counts the
  markers outside the excluded logs separately; see §21.)*
- *Log wording (E5):* a FAILED batch's line now says "restored (hash-verified)" or "NOT
  restored (…; stage tables kept)" from the actual result.
- *Builder check (E10)* exits 1 on a difference or an uncomputable hash.
- *§13 (E11):* "B3 bound ~0.3%" struck through. It is restated as a sample statement (0 drift in
  999 sampled visits), with no population bound claimed.

**Still not claimed:** fault modes not injected (power loss, MySQL crash, disk full, a writer
that ignores SIGKILL); fencing on the live databases; concurrent-overlap isolation;
reproducibility closure (pack C); matched-encounter B–C reconciliation and the R4 0/999
re-examination (pack D); C1–C4.

**Live state after P9:** databases `sik`, `sik_bench`; both `database.xml` copies on `sik`;
ledger 356,355 / Rp 34,870,243,633 (content `a66a3a54…`, reproduced again by the builder
check); live `sik` output-table checksums equal before and after both suite runs.

## 21. P10: integrated recovery-preservation experiment, honesty fixes (2026-10-18, new)

Driven by Astra v9 (run 4898353, **62/100** "Needs targeted rework";
`evidence/astra_v9_4898353_NOTE.md`). Task: `docs/khanza_r5_task_p10_integrated_recovery.md`
(packs A+B, scope agreed with the owner). Each v9 code claim acted on was checked against the
source first (task doc §0, F1–F8); all held. Times are UTC.

**Result:** suite **39/39 PASS** on a fresh fixture (`evidence/p10/r5_p6_acceptance_20261018T152814Z.md`;
34 P9 checks + A26, A27, A28, A29, A31). Integrated preservation check **PASS**
(`evidence/p10/r5_p10_preservation_20261018T154610Z.md`). Unit test 26/26. The builder still
reproduces the live ledger `a66a3a54…` byte-identically (`evidence/p10/r5_p10_builder_all_check.txt`).

**Suite run 1 FAILED (30/38) and is kept as evidence** (`evidence/p10/r5_p10_suite_run1_FAILED_20261018T042243Z.md`).
A20 SIGKILLs a resume in the middle of a restore. In run 1 that resume held the new writer
exclusion, so its `finally` never ran and the benchmark account was left without
INSERT/UPDATE/DELETE on the fixture. Every later billing run then failed (`sukses=false`): A20–A24,
A28, A29, A12. The wrapper kept the failed fixture (91 stage tables) as P9 designed; it was
inspected, then removed with `--teardown-kept`. The live guard A13 held. Fix: the exclusion is
recorded in a marker file before the revoke. The next oracle start (and every restore) that
finds a marker of a dead process grants the recorded privileges back
(`WRITER-EXCLUSION recovered`). A31 now requires the account's grants on the fixture to be the
same at the end as at the start, with no marker left. Run 2 passed it, with A20's killed
exclusion recovered. Failure record `records/failures/20261018T0430Z-…-writer-exclusion-not-crash-safe.json`.

**1. Integrated preservation experiment (pack B, v9's single next step).**
`p10_preservation_check.sh`, through the production wrapper:
- A real harness failure (3 s timeout) on a two-batch set left batch 1 FAILED with 13
  ~~populated~~ **stage tables holding 21 rows in total; 5 of the 13 were non-empty
  (17+1+1+1+1) and 8 were empty** (the totals are in
  `evidence/p10/r5_p10_preservation_20261018T154610Z.md`: "stage tables: 13, populated
  rows: 21 (pre) / 21 (post)"; the per-table inventory is
  `evidence/p11/r5_p11_preserve_after_fail.json`: "stage tables: 13 | non-empty: 5 |
  empty: 8") and batch 2 PENDING.
- Independent root hashes were taken of every stage table (`CHECKSUM TABLE … EXTENDED` + row
  counts), the sample visits, 20 protected non-sample visits (10 non-DR, 10 DR) and the live
  `sik` tables.
- A30 was forced to FAIL, so the suite ended through its normal final line. Wrapper exit 1,
  fixture kept.
- On the kept fixture, all hashes were equal (`ALL-EQUAL`).
- The batch's 17 billing rows were then changed so the retry had to restore. The retry
  detected `current state is not the pre-reset state`. Under `WRITER-EXCLUSION on`
  (DELETE/INSERT/UPDATE revoked, target fenced) it restored with a verified hash, then
  `WRITER-EXCLUSION off` gave the grants back as before. Both batches were BILLED, exit 0.
- The protected visits and live `sik` were unchanged, `database.xml` was back on `sik`, and
  the grant was removed; `--teardown-kept` left only `sik`, `sik_bench`.
- A first run of this check (154102Z) also passed, but its retry needed no restore (the state
  had not changed), so its "exclusion on/off" label was not exercised. The script was changed
  to force a restore and re-run; only the second run is the evidence.

**2. Recovery integrity (pack B).**
- *Source-content hash (F2):* it now covers `biaya_obat`, `total`, `h_beli` and the procedure
  tariff columns (not the status columns the save updates). A query error fails the freeze or
  verify instead of hashing "no rows". A27: a price +1000 after freeze → `SOURCE-CONTENT DRIFT`,
  exit 3.
- *Non-destructive backup (F3):* `stage_backup` replaces a batch's staged rows in one InnoDB
  transaction. A28: an injected failure on a retry's re-backup rolled back (3 lines), stage
  checksums were unchanged, `STAGE-KEEP`, exit 4; a clean retry then billed and dropped them. A
  batch whose backup failed now keeps its stage tables.
- *Quiet interval before a FAILED retry (F4):* applied when `--retry-failed`/`--abandon-failed`
  is given.
- *Writer exclusion (F5):* every restore on a fixture revokes the benchmark account's DML,
  fences the target (a schema-level revoke reaches a session only at its next USE), runs the
  restore as root, and re-grants in `finally`. ~~Crash-safe via the marker~~ **crash-safe at
  the one tested fault placement: A20's SIGKILL of a resume mid-restore; no other placement
  (a crash between the marker write and the REVOKE, a malformed marker) was tested before
  P11, and the marker was not fsynced and a malformed one failed open** (fixed in P11-T4).
  Never on `sik`/`sik_bench`. A29: during a paused restore the grants were `SELECT` only and a
  benchmark `UPDATE` was denied (ERROR 1142); afterwards the grants were as before and the
  write worked.
- *Malformed amounts (F6):* `irup` raises on NULL, empty or non-numeric input (it returned 0).
  A26: a scratch tariff price `'12x'` → `MALFORMED-AMOUNT`, `FAIL-CLOSED`, ledger unchanged.
  Live data has no NULL amounts, so the pinned ledger is unaffected (reproduced). A missing
  tariff entry remains the documented `dr-source(gap)` fallback; it is not "fail-closed
  authority".

**3. Honesty fixes (pack A; closes failure record 20261018T0215Z).**
- A22's label states the actual change (all 17 billing rows of the visit, +1 each). §20's "a
  billing row" and "14 verified outside" are struck through and corrected.
- A11 now counts verification markers outside the excluded logs separately and requires at
  least one of those. Run 2: 16 in all transcripts, 16 outside the four excluded logs. The
  excluded logs hold none, so P9's "14" was taken from the wrong set of logs but was probably
  the right number. The fix is in how it is derived, not a different result.
- The oracle's result file states each FAILED batch's actual restore result (restored and
  hash-verified / NOT restored / backup failed), instead of "restored from stage backup".

**Still not claimed:** fault modes not injected (power loss, MySQL crash, disk full, a writer
that ignores SIGKILL); concurrent-overlap isolation; fencing or grant changes on the live
databases; reproducibility closure (`stagea_common.py`, Java sources, STRATA SQL, an immutable
fixture); matched-encounter B–C reconciliation and the R4 0/999 re-examination; C1–C4.

**Live state after P10:** databases `sik`, `sik_bench`; both `database.xml` copies on `sik`;
ledger 356,355 / Rp 34,870,243,633 (content `a66a3a54…`); live `sik` checksums equal across
both suite runs and both preservation runs.

## 22. P11: discriminating recovery checks, negative controls (2026-10-19/20, new)

Driven by Astra v10 (run 4918967, **63/100** "Needs targeted rework";
`evidence/astra_v10_4918967_NOTE.md`), whose nine findings were each confirmed in the source on
2026-10-18. Task: `docs/khanza_r5_task_p11_negative_controls.md` (written before the code). Each
P10 recovery check now has an inert test-only switch (`R5_NEGCTL_*` / `P11_*`) that breaks the
property it tests, plus a run showing the check **FAILS** with the switch and **PASSES** without
it. Times are UTC.

**Result (all runs against one frozen byte set, below):**

| Run | Result | Evidence |
|---|---|---|
| 1. unit tests | **33/33**, `P8/P9 recovery unit test: 33/33 cases PASS` | `evidence/p11/r5_p11_unit_test_20261020T0631Z.txt` (and the earlier frozen set `r5_p11_unit_test_frozen_20261020T003254Z.log`) |
| 2. negative controls | **5/5 DISCRIMINATING**, `DISCRIMINATING=5 NOT-DISCRIMINATING=0`, single uncontended invocation, exit 0 | `evidence/p11/r5_p11_negative_controls_20261020T073218Z.md` (with the final `ensure_fx` bytes; the earlier clean run `…044131Z.md` is identical in verdict) |
| 3. full fresh suite | **PASS=39 FAIL=0**, exit 0 | `evidence/p11/r5_p6_acceptance_20261020T061104Z.md` |
| 4. preservation check | **PRESERVATION-CHECK PASS**, exit 0 | `evidence/p11/r5_p10_preservation_20261020T062358Z.md` |
| 5. builder | **INTEGER-BUILDER-REPRODUCES-LIVE-LEDGER (byte-identical)**, exit 0 | `evidence/p11/r5_p11_acceptance_20261020T061104Z.log` (and the earlier `…chain_nc_builder_live_20261020T010017Z.log`) |
| 6. live-state proof | §4.6 items hold at the final clean point | `evidence/p11/r5_p11_live_state.txt` (captured after the chain above; databases `sik sik_bench`, `database.xml` on `sik`, ledger `356355:a66a3a54…`, 0 writer markers, 0 benchmark grants on the fixture) |

The negative-control verdicts, quoted from the final single invocation
(`r5_p11_negative_controls_20261020T073218Z.md`): `NC 1: with-switch=FAIL without=PASS ->
DISCRIMINATING` … `NC 5: with-switch=FAIL without=PASS -> DISCRIMINATING`, ending
`=== P11 NEGATIVE CONTROLS: DISCRIMINATING=5 NOT-DISCRIMINATING=0 ===`, with the script exit 0
and the fixture dropped afterwards (`databases: sik sik_bench`). The forced-failure control (T7)
is `evidence/p11/r5_p10_preservation_20261019T210740Z_FORCEFAIL_FAIL1_PASS.md`: exactly one
assertion fails (`- **FAIL**: perturbation row count asserted…`), the transcript states
`P11-T7: 1 assertion(s) failed — the fixture sik_p6f is KEPT (no --teardown-kept)`, the
keep-path assertion passes (`database.xml` on `sik`, grant removed) and the final line is
`PRESERVATION-CHECK FAIL (1)`.

**What changed (T1–T8).** A28' now makes the live rows differ from the staged rows between the
first backup and the faulty retry, so a non-transactional re-backup leaves different stage
content (`R5_NEGCTL_BACKUP_NO_TXN` runs the DELETE/REPLACE as autocommit). The preservation check
takes an independent **pre-operation** snapshot before the injected run and asserts (a) immediate
restoration of the sample, (b) stage preservation, (c) protected and live unchanged after the
retry, separately (`R5_NEGCTL_SKIP_IMMEDIATE_RESTORE` breaks (a)). `p10_hash_state.py` treats a
missing table, NULL checksum or empty inventory as an error with a non-comparable
`ERROR:<table>` value and asserts the expected stage-table list (`--stage-tables-list`). The
exclusion marker is written temp+fsync+replace; a malformed marker fails closed (kept, exit 3,
`WRITER-EXCLUSION marker unreadable`) and needs `--recover-grants`; the old fail-open path is
shown by monkeypatch in the unit test. `RETRY-REFUSED` sets `restored=False`,
`restore_state=refused`. The pre-reset hash is computed **from the staged rows**. The perturbation
asserts its changed-row count, and an EXIT trap always restores `database.xml` and revokes the
fixture grant, keeping the fixture on any failed assertion.

**T8 numbers, re-derived.** `evidence/p11/r5_p11_preserve_after_fail_20261019T2111Z.json`:
`"protected_n": 20`; thirteen `r5_stage_B3_r6_p10_*` tables with `stage_rows` 17 (billing),
1 (detail_nota_jalan), 1 (nota_jalan), 1 (reg), 1 (tagihan_sadewa) and 0 for the other eight —
i.e. **13 tables, 21 rows in total, 5 non-empty**, which is what §21 now says.

**The byte-binding problem, and how the result was made checkable.** Every transcript embeds
`sha256sum` of the tools at run time. Reading those lines back showed the suite had passed
through at least ten SHAs during 2026-10-19 (`aa34340fbe98` → … → `3375e681d0a6` →
`3559e5ce1d97` → `7ecb20ef7bdc`) and the preservation script through three
(`9c0e8f3a8e50` → `8de03df02c7a` → `e5d39756de39`). A **second agent session on the same
machine, sharing this working tree and the VPS**, was developing the same tooling concurrently:
it re-created the NC runner three times, ran sixteen-plus P11 experiments between 17:00 and
20:50, and rewrote three tools at 21:02:19 — nineteen seconds before one of my evidence runs.
The runs in the table above are therefore **not** the first runs of each check; they are the
runs made after the seven tools were frozen: `chattr +i` on the VPS, a snapshot with
`FROZEN.sha256` in `/opt/Deers-Rock/tools/p11_frozen_20261019/`, and `sha256sum -c` verified
before and after every run. The earlier results — including the 13:56 NC transcript that reported
`DISCRIMINATING=5 NOT-DISCRIMINATING=0` and the 15:10 suite `PASS=39` — are kept in
`evidence/p11/` but are **not** relied on: the bytes that produced them no longer exist, so they
cannot be bound to any committable artifact. Record:
`records/failures/20261019T2135Z-process-r5-p11-concurrent-writer-evidence-unbinding.json`.

**Two defects found in my own checking, both recorded.** (1) The first frozen-byte NC run reported
NC1 `with-switch=PASS without=FAIL -> NOT-DISCRIMINATING`: a `sik_p6f` fixture left by the other
session was re-created 46 s after a teardown, and the NC driver reuses an existing fixture, so
NC1's two arms ran on a state of unknown provenance. A clean re-run from a verified-absent
fixture gave `with-switch=FAIL without=PASS -> DISCRIMINATING`. Both transcripts are kept. The
root cause was fixed in the NC driver: `ensure_fx` now verifies the fixture is usable (the 5
STRATA- reg rows present) and drops+rebuilds it otherwise, so a stale or half-dropped fixture
can no longer be silently reused — after which the **single uncontended invocation**
`r5_p11_negative_controls_20261020T073218Z.md` (run with the re-pinned `ensure_fx` bytes) produced 5/5 DISCRIMINATING with exit 0.
(2) An ad-hoc live-proof hash of my own used a tab join and printed
`356355:424624d9…`; the canonical recipe (`|` join, the suite's `ledger_hash()`) gives
`356355:a66a3a54…` on the same data. There was no live change.

**Still not claimed:** concurrent-overlap
isolation; the fault modes not injected (power loss, MySQL crash, disk full, a writer that
ignores SIGKILL); fencing or grant changes on the live databases; reproducibility closure;
matched-encounter B–C reconciliation; C1–C4. The negative controls prove the checks can fail —
they do not show that any particular production fault is detected.

**Live state after P11:** databases `sik`, `sik_bench`; both `database.xml` copies on `sik`;
ledger 356,355 rows, content `a66a3a54…`; no `.writer_exclusion_*` marker; no benchmark grant on
`sik_p6f`.

## 23. VPS run lock: the exclusive window made real (2026-10-24, new)

**Why.** P11's worst incident was a second agent session rewriting tools on the same tree and VPS
19 s before an evidence run (§22). Freezing bytes (`chattr +i`) protects the tools, not the
fixture or the run. The assessment `docs/khanza_handoff_assessment_20261024.md` (§2 item 5,
recommendation 4) asked for a mechanism.

**What.** `tools/dr_runlock.sh` (new): lock file `/opt/dr-benchmark/LOCK` (`session`, `pid`,
`start_utc`, `host`, `note`), created atomically (noclobber). `acquire <id>`, `status`,
`release <id>|--force`. `p6_run_suite_fresh.sh` and `p11_negative_controls.sh` now call
`dr_runlock_require` as their first action — **before the EXIT trap and before any SQL, delete or
write** — and exit 3 unless `DR_LOCK_SESSION` equals the lock's session. Children inherit the
variable, so the preservation check and the NC driver pass through under their holder.
`tools/runlock_negctl.sh` (new) is the negative control.

**Limits (stated, not hidden).** The lock is advisory: it stops the two guarded tools, not an
operator running `mysql` by hand, nor `p6_acceptance_suite.sh` called directly. `pid` is
informational (a one-shot ssh acquire has a dead pid), so a stale lock is broken only by an
explicit `release --force` after `status`. It was deployed to mac-mini-vultr only; the old box
(terminating ~2026-10-25) was not touched.

**Evidence** `evidence/runlock/r5_runlock_negctl_20261024T101928Z.md`, run on the fixture
`sik_p6f` (live `sik`/`sik_bench` read-only): `PASS=9 FAIL=0`, quoted:
- L1 no lock: wrapper exit 3, NC driver exit 3, no fixture created, NC log dir untouched.
- L2 lock held by A: session B exit 3 (wrapper and NC driver), no session id exit 3, second `acquire` exit 3.
- L3 A runs `P11_ONLY=31`; while it runs B gets exit 3, A's fixture and grant intact (grant lines 1 -> 1); A's run exit 0, `teardown: databases now: sik sik_bench`.
- L4 non-owner release refused (3), owner release frees it. L5 live state identical before/after (databases, `sik.billing` 1,464,593, ledger 356,355 rows, benchmark grants, `database.xml` hashes).

**Re-freeze.** The two frozen tools were unfrozen (`chattr -i`, originals in
`/opt/Deers-Rock/tools/.bak_runlock_20261024/`), replaced with LF copies, and re-frozen together
with the two new files (`lsattr` shows `i` on all four). New manifest
`evidence/runlock/r5_frozen_manifest_20261024.sha256` (nine files; `sha256sum -c` OK on the box and
on the workstation). Re-pinned: `p6_run_suite_fresh.sh` `0865400d…` -> `6967805d…`,
`p11_negative_controls.sh` `0bba1931…` -> `e65238ca…`; added `dr_runlock.sh` `5393989e…`,
`runlock_negctl.sh` `6447f554…`.

**Consequence for the P11 evidence.** The two re-pinned tools differ from the bytes that produced
the P11 evidence (§22). The added code is the guard only; it runs before any logic that the P11
checks exercise, but the full-suite and NC runs were **not** repeated on the new bytes. A full
39-check suite and 5/5 NC re-run under a held lock is part of the next wave's closure.
