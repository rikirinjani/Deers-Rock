# R5-P14 Task: edge-strata visits through the real form + per-encounter charge-line identity

Written 2026-10-26 BEFORE execution, per task-before-hands. Nothing in this wave has been run.
Sources: R5 HUMAN-GATED table (B3 "Edge strata on a scratch copy", **NOT TESTED**, agent-runnable),
Astra v10 "weakest financial leg" (`evidence/astra_v10_4918967_output.md` §"The weakest financial
leg and its fix": charge-line identity, code/name mapping, the same-price code-swap blind spot),
and the P13 driver/comparator design (R5 §25, `docs/khanza_r5_task_p13_wide_sample.md`).

**Scope.** Two things, both on a disposable clone, both before mac-mini-vultr ends (~2026-11-20):

1. **B3 edge strata.** Author a small synthetic fixture of DR visits that deliberately hit the
   billing paths a random sample rarely reaches. Run them through the real Khanza form
   (`DlgBilingRalan` via the frozen oracle), then compare form vs ledger. Each stratum carries a
   **pre-registered expected outcome** (§2). The wave passes when every observed outcome matches
   its expectation, or when a mismatch is explained down to the row and recorded as a finding.
   The goal is not all-equal. It is to show the gates are *right about* the edges.
2. **Charge-line identity.** A new comparator that matches form-written `billing` rows to
   `dr_charge_ledger` rows **line by line** (component, code, name, quantity, unit price,
   amount), not by component totals. It closes the same-price code-swap blind spot named in v10.
   It runs on the fixture and on the 300 real-cohort visits of P13 stage 1 (a new check on
   already-sampled visits).

Out of scope: inpatient, payer/BPJS logic, `potongan_biaya` discounts, the 5× burst (E2), the
full cohort, consumer (`KhanzaBillingConsumer`) changes, any Khanza jar/source edit, any fix to
the ledger builder (a gap found here becomes a P15 item; this wave only measures it).

## 0. Hard rules (unchanged from P13)

- **No paid model runs.** No Kaggle push/run, no LLM API calls from scripts.
- **No git push.** Commit locally on `khanza-r5-p6`; push only on the owner's word.
- **Live databases read-only.** `sik` and `sik_bench` are never written. The ledger hash
  `356355:a66a3a546cc322d3eca31f2bc5558993e183b1c5afbf444d4a2a3781cfe7aea7` must match the baseline
  at the start and in the final proof. The fixture exists **only** in the clone `sik_p14e`.
- **Frozen tools not edited.** All 21 frozen files (P12 manifest `r5_frozen_manifest_20261024c` 15 +
  P13 manifest 6) stay `chattr +i`. Run `sha256sum -c` on both before every run and after the last.
  P14 adds new files only, and freezes them afterwards (T7).
- **Run lock mandatory.** `bash /opt/Deers-Rock/tools/dr_runlock.sh acquire P14-<agent>-<date> "<note>"`,
  export `DR_LOCK_SESSION`, `release` at the end.
- **Builder used unmodified.** The fixture ledger is built by the frozen
  `build_dr_charge_ledger_p2.py --window ALL --cohort dr --require-tariff` with
  `P2_CONSUMER_DB=sik_p14e P2_LEDGER_DB=sik_p14e`. It must never run with the default
  `P2_LEDGER_DB` (= live `sik_bench`). T2 asserts both env vars before invoking it and exits 3
  otherwise.
- **No secrets** in any committed file. Secret scan before every commit.
- **No deletion or rewriting of evidence.** Use strike-through for corrections.
- **Verify before claiming.** Every number comes from a named file, with the line quoted.
- **Stop rules.** >2 % `sukses=false`; crash twice on the same date; <20 GB free disk;
  `database.xml` not on `sik` after a run; any fixture row found outside `sik_p14e`; any write
  audited on `sik`/`sik_bench`.
- **No sub-agents.** One working tree per session.

## 1. Facts this design relies on (checked 2026-10-26 from the repo; re-check on the box in T0)

- The DR consumer inserts `detail_pemberian_obat` with `embalase = 0, tuslah = 0`
  (`src/consumer/KhanzaBillingConsumer.java` line 262 INSERT, `VALUES (… 0, 0, …)`). Its billing
  query adds `SUM(embalase+tuslah) AS tambahan` to each drug row's total (lines 386–387), so a
  non-zero `embalase`/`tuslah` changes the billed drug amount and the PPN base.
- The ledger builder prices drugs as `databarang.ralan × jml` (or `dr_tariff`) and has **no**
  embalase/tuslah, `tambahan_biaya` or discount component (`tools/build_dr_charge_ledger_p2.py`,
  drug query and `COMPONENTS = ("registration", "procedure", "drug", "tax")`).
- Registration in the ledger is DR's own fee (`DR_REG_FEE = 10000` or `dr_tariff` REG,
  `build_dr_charge_ledger_p2.py` line 52). The form bills `reg_periksa.biaya_reg` (consumer
  line 344). A visit with `biaya_reg = 0` therefore differs by design.
- The consumer's `Math.round(subttl*0.11)` equals the integer rule `(s*11+50)//100` for every
  `s ≡ 50 (mod 100)` up to 2,000,000 (offline check 2026-10-26, 0 exceptions). **What rule the
  real form applies at exact half-rupiah has not been observed.** E4 measures it.
- The P13 comparator buckets billing rows by component (`three_count_reconcile_p2.bucket`), so a
  swap between two codes with equal unit price and quantity leaves every component total
  unchanged. That is the blind spot T3 closes.

## 2. Edge strata (pre-registered, ≥3 visits each, ~30 visits total)

The expected outcome is fixed **before** the run. "DIFFER(x)" means A_form − C must equal exactly x
in the named component. Any other delta, or EQUAL where DIFFER is expected, is a finding.

| ID | Stratum | Fixture shape | Expected A_form vs C | Why it matters |
|---|---|---|---|---|
| E1 | Embalase > 0 | 1–3 drug lines, `embalase` ∈ {100, 250, 1,000} | **DIFFER**(drug = Σembalase; tax = PPN delta) | the ledger does not model embalase: the gates must *report* it, not pass |
| E2 | Tuslah > 0 | as E1 with `tuslah` | **DIFFER**(drug = Σtuslah; tax = PPN delta) | same, isolated from E1 |
| E3 | ≥3 procedure lines | ≥3 `rawat_jl_dr` rows: one code repeated (qty 2), plus two different codes **with equal tariff** | **EQUAL** (component and line level) | multi-line, and the same-price pair the code-swap test needs |
| E4 | Half-rupiah PPN | drug subtotal `s ≡ 50 (mod 100)` (e.g. 150, 1,050, 12,350) and neighbours `s ≡ 49/51` | **OPEN**: record the form's PPN for each `s`; EQUAL iff the form uses half-up | establishes the real form's rounding at the boundary |
| E5 | Zero-fee clinic | `biaya_reg = 0`, procedures with tariff 0 where `dr_tariff` holds a price | **DIFFER**(registration = −DR fee; procedure = −tariff) | ledger is DR's own price authority; form bills what Khanza holds |
| E6 | Fractional / split drug qty | `jml` = 0.5 and 1.5; one drug split over 2 `detail_pemberian_obat` rows | **OPEN**: record; EQUAL expected for split rows, fractional rounding to be observed | integer-rupiah line totals vs the form's double arithmetic |
| E7 | Drugs only / procedures only | visit with no procedures; visit with no drugs (no PPN row) | **EQUAL** | empty-section paths, absent tax row |
| E8 | Name collision (only if it exists) | two `databarang` items whose `nama_brng (jenis)` display string is identical | line identity must report **AMBIGUOUS**, never silently pick one | name→code mapping is the comparator's own weak point |

E8 is run only if T0 finds a real collision in `databarang`. Otherwise it is reported as
"not applicable: no collision in this install", with the query quoted.

## 3. Tasks (T0–T7)

| ID | What | Check | Negative control |
|---|---|---|---|
| T0 | **Discovery (SELECT-only on live).** Confirm the `detail_pemberian_obat.embalase/tuslah`, `reg_periksa.biaya_reg`, `jns_perawatan` tariff columns; find pairs of procedure codes with equal tariff (E3); find display-name collisions in `databarang`+`jenis` (E8); confirm the fixture dates and `no_rawat` range are unused in `sik`. | Every query and row count quoted in `evidence/p14/t0_discovery.md`. | n/a |
| T1 | **Fixture author** `tools/p14_edge_fixture.py` → `p14_edge_fixture.sql` + manifest CSV (`no_rawat, stratum, expected, expected_delta_by_component`). Deterministic; DR-cohort `no_rkm_medis` (`DR…`); fixture date(s) unused in `sik`; `no_rawat` in a reserved range. The SQL targets the clone by name only (no `USE sik`). | Two runs → identical sha256; `--verify` asserts no `no_rawat` exists in `sik`, every stratum ≥3 visits, every expectation present. | Plant one `no_rawat` that exists in `sik`: `--verify` exits 1 and names it. Plant a SQL line naming `sik.`: refused. |
| T2 | **Driver** `tools/p14_edge_run.sh <visits-file>`: lock check, live-state baseline, build `sik_p14e` exactly as the P13 driver does (mysqldump `--single-transaction`, 8 audit triggers, grant on the clone only), load the fixture, build the clone ledger with the frozen builder (env asserted, §0), retarget `database.xml`, run the oracle `--freeze-only` then the real form, restore `database.xml`, keep the clone for the comparators. EXIT trap as P13 (restore xml, revoke grant, even on failure). | Interrupted pilot (3 visits) leaves `database.xml` on `sik`, no grant, no writer marker, clone kept or dropped, never half-built. Clone ledger row count printed; live `sik_bench` hash unchanged. | Kill test on the pilot (before/after probe lines). Run the builder step with `P2_LEDGER_DB` unset: T2 exits 3 before invoking it. |
| T3 | **Line-identity comparator** `tools/p14_line_identity.py <visits-file> --db <clone> [--ledger-db <db>]`, SELECT-only. Per encounter: map each form-written `billing` value row to (component, code) — procedures by `nm_perawatan` → `jns_perawatan.kd_jenis_prw`, drugs by `nama_brng (jenis.nama)` → `kode_brng`, registration, PPN → tax. Unmappable → `UNMAPPED`; >1 candidate → `AMBIGUOUS`. Then compare the multiset of (component, code, qty, unit_price, amount) with the ledger rows. Also runs the P13 checks (A_form == C per component, B == C, fresh-B). Output: per-line CSV + per-encounter verdict ∈ {EQUAL, DIFFER, UNMAPPED, AMBIGUOUS}. Exit 0 only if every encounter is EQUAL **or** matches its pre-registered DIFFER exactly (with `--expect <manifest>`). | Counts printed per verdict and per stratum. | On a scratch copy of the clone: (a) **swap the codes of two same-price procedure lines in one encounter**: the component-level check stays EQUAL, line identity names that encounter DIFFER with both codes; (b) change one drug qty +1 and its price so the amount is unchanged: DIFFER on qty/unit; (c) rename one billing drug to a collision name: AMBIGUOUS. `ROW_COUNT()=1` asserted for each plant. |
| T4 | **Fixture run.** Pilot (3 visits), then all ~30 fixture visits. Comparator with `--expect`. | Per-stratum table: expected vs observed, delta per component, raw rows for every non-EQUAL encounter. E4/E6 record the form's actual values. | The DIFFER strata are the control: if any of them comes out EQUAL, the comparator or the fixture is broken (stop, record). |
| T5 | **Real-cohort line identity.** Rebuild a P13-style clone (frozen P13 driver) for the P13 stage-1 list (`evidence/p13/`, 300 visits), run the form, run T3 against the live-pinned ledger rows (`--ledger-db sik_bench`, SELECT-only). | Exit 0 expected (P13 found 0/300 at component level). Any line-level DIFFER is reported with raw rows; it is not "explained away". | The stage is its own control; T3 NC (a) proves sensitivity. |
| T6 | **Analysis** (R5 §26): per-stratum outcomes vs pre-registration, the form's observed half-rupiah and fractional-qty rules, the list of ledger gaps found (each → a P15 candidate with an owner decision needed), line-identity counts on 300 real visits with the Clopper–Pearson 95 % bound (n=300, k observed), scoped as in P13. | Numbers recomputable from the CSVs. | n/a |
| T7 | **Freeze and pin.** `chattr +i` the new tools; new manifest `p14_frozen_<date>.sha256`; copy it to `evidence/p14/`; pin in `khanza_r5_release_manifest.md`; publish tools and fixture under `evidence/p14/`. Drop `sik_p14e` and the T5 clone (`p13_drop_clone.sh`-style) unless a stop rule fired. | `sha256sum -c` OK on the box and locally (LF bytes). | n/a |

## 4. Required runs (in order)

1. `sha256sum -c` on both frozen manifests (15 + 6 OK) + live-state baseline (databases, both
   `database.xml` → `sik`, ledger hash, writer markers, grants, lock, free disk).
2. T0 discovery (SELECT-only).
3. T1 twice (identical sha256) + both `--verify` negative controls.
4. T3 negative controls (a), (b), (c) on a scratch clone copy.
5. T2 kill test on the 3-visit pilot, and the unset-`P2_LEDGER_DB` refusal.
6. T4 fixture pilot, then the full fixture.
7. T5 real-cohort line identity (300).
8. Final live-state proof, identical to step 1 apart from timestamps; both clones dropped;
   frozen manifests OK (now 21 + P14); lock released.

Expected box time: two clone builds (~20 min each), ~30 fixture visits + 300 real visits at
~11–17 visits/min (P13 rates), comparators a few minutes. About 1.5–2 h. One session.

## 5. Evidence (into `khanza-r5/evidence/p14/`)

T0 discovery; fixture SQL + manifest + sha256 runs; every NC transcript; kill test; driver,
oracle and builder logs; comparator CSVs and summaries (fixture, real 300); the per-stratum
expected-vs-observed table; live-state baseline and final proof (addresses redacted); frozen
manifest checks. Large raw logs go in `tar czf`; summary files stay unpacked.

## 6. Records

- This task doc (written before any change).
- R5 report: new `## 26. P14: edge strata and charge-line identity`. Close the B3 row of the
  HUMAN-GATED table (strike-through + result). Close the v10 code-swap blind spot only if NC (a) passes.
- Release manifest: pin the new tools (full SHA-256 of LF file; local = box).
- QMS record `records/qms/VER-<date>-DR-KHANZA-R5-P14-001.json` (+ copy to
  `C:\Users\think\Agentic Layer\qms\records\verifications\`).
- A failure record for each defect found and each stop rule that fired
  (`records/failures/` + `C:\Users\think\self-harness\failures\`). An unexpected outcome in
  §2 is a finding, and gets a record even when its cause is the ledger's known scope.
- pm1 trace `r5-p14-edge-strata-line-identity` (`--encoding morse`, every touched file in
  `--key-files`), copied to `records/traces/`. Then `retrace.py` must print
  `Directory is trace-clean.`
- Handoff: add P14 to the open-items table; list each ledger gap as a P15 candidate.

## 7. Commit (local only)

Commits on `khanza-r5-p6`, messages starting `khanza-r5: P14 …`, body listing what changed and the
evidence, ending with the attribution line of the executing agent. Secret scan before every
commit. No push. Final hash in the report.

## 8. Acceptance criteria

P14 is **accepted** when all of the following hold:

- **AC-1** Live state is unchanged: baseline = final proof, ledger hash as in §0, 0 audited writes on `sik`/`sik_bench`.
- **AC-2** Frozen sets are intact (`sha256sum -c` 21/21 before and after); the new P14 tools are frozen and pinned.
- **AC-3** The fixture is deterministic and confined: identical sha256 twice; `--verify` NC exits 1; no fixture `no_rawat` in `sik`.
- **AC-4** T3 is sensitive: NC (a) caught by line identity **while** the component check stays EQUAL; NC (b) and (c) caught; each plant `ROW_COUNT()=1`.
- **AC-5** Every §2 stratum has an observed outcome. Each one either matches its pre-registration exactly (DIFFER deltas to the rupiah), or is explained down to the raw rows and has a failure record. E4 and E6 report the form's observed rule.
- **AC-6** T5 ran on all 300 P13 stage-1 visits. Every encounter is mapped (0 UNMAPPED, or each one listed and explained). The line-level result is stated with its bound and scope.
- **AC-7** Clean teardown: both clones dropped (or kept by a stop rule, stated), `database.xml` on `sik`, no grant, no writer marker, lock released.
- **AC-8** Records complete: R5 §26, manifest pins, QMS, failure records, pm1 trace, retrace trace-clean, handoff updated.

## 9. Rubric (0 = missing/wrong, 1 = partial, 2 = complete with quoted evidence)

| # | Item | 2 means |
|---|---|---|
| R1 | T0 discovery | every query quoted; equal-tariff pairs and collision search results stated |
| R2 | T1 fixture | deterministic; confined to the clone; both NCs exit 1 naming the plant |
| R3 | T2 driver | P13-equivalent safety (EXIT trap, kill test clean); builder env guard proven by the unset-env refusal |
| R4 | T3 line identity | per-line multiset comparison; UNMAPPED/AMBIGUOUS never silently resolved |
| R5 | T3 negative controls | (a) caught at line level with the component check still EQUAL; (b), (c) caught |
| R6 | Pre-registration honesty | §2 expectations unchanged after the run; any change is struck through with a reason |
| R7 | Fixture outcomes | every stratum observed; DIFFER deltas exact; every unexpected outcome traced to raw rows |
| R8 | Form rules observed | half-rupiah (E4) and fractional qty (E6) rules stated from the form's own rows |
| R9 | Real-cohort line identity | 300/300 compared; result, bound and scope stated; no population claim beyond it |
| R10 | Lock and frozen sets | lock acquired/released; 21/21 OK before and after; P14 set frozen |
| R11 | Live-state proof | baseline and final quoted, identical; ledger hash matches the pin |
| R12 | Gap reporting | each ledger gap listed as a P15 candidate with its delta and an owner question; no fix made in P14 |
| R13 | Records | task doc first; R5 §26; pins; QMS; failure records; pm1 trace; trace-clean |
| R14 | Report honesty and hygiene | every claim has a file and a quoted line; deviations listed; LF deploy; secret scan 0; no push; no Kaggle |
| **Total** | | **/28** |

**Accept:** ≥24/28 **and** R4, R5, R6, R10, R11 all at 2. **Accept with fixes:** 20–23, or
one of those five at 1. **Reject:** <20, or any of those five at 0.

After execution, a read-only review in a separate session re-scores this rubric from the
evidence files alone (as for P13).
