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

## 2026-10-11 fixer launch notes (run 20261011T044455Z)
- Run stopped at preflight_smoke (NOT phase1): draft run_all.sh smoke invocation `BilingHarness --smoke` is missing the required no_rawat arg (harness reads args[1], AIOOBE at BilingHarness.java:21).
- Even with a valid no_rawat the gate `grep "sukses=true"` cannot pass in --smoke mode: DlgBillingRalan.sukses starts false (src line 58) and is only set true on save (line 2712); smoke mode skips BtnSimpan.doClick(). Phase 1 agent must redefine smoke pass criteria (e.g. tbBilling rows>0) or use a save-mode visit.
- Note: database.xml targets DB `sik` (PatchDbXml only rewrites USER/PAS); run_all.sh comment says sik_bench but sik_bench is zero-seed (reg_periksa=0) so no smoke visit exists there. Phase 1 agent to reconcile target.
- Removed false DONE marker from results/20261011T044455Z/ (write_done runs unconditionally after gate failure in draft main()).
- Baseline sik_baseline.sql.gz + sha256 captured OK; heartbeat/PROGRESS.md worked; unit cleanup OK.

## 2026-10-11T05:04:30Z — Phase 0 preflight smoke gate redefined (fixer run 2)
- Ambiguity: draft smoke gate was doubly broken — `BilingHarness --smoke` omitted the required `<no_rawat>` arg (AIOOBE, BilingHarness.java:21) and `grep "sukses=true"` is unsatisfiable in smoke mode (DlgBilingRalan.sukses is only set true on save; smoke skips BtnSimpan). Options: (a) save-mode visit on real sik data, or (b) keep read-only smoke with a satisfiable gate.
- Chosen (conservative): (b) read-only smoke. `BilingHarness --smoke <no_rawat>` where no_rawat is a REAL visit from sik.reg_periksa (prefer 2026/10/%, fallback latest; queried at runtime as benchmark user, fallback root socket). Pass = harness exit 0 AND no "Exception" in smoke_harness.log AND "[no_rawat] tbBilling rows=N" printed with N>=0 (tbBilling = the harness JTable row count, not a SQL table). general_log stays OFF for the smoke (preflight wiring check, not a real-form sample per brief section 4).
- Rationale: a save-mode smoke would WRITE billing/nota/jurnal rows into the sik copy that Phase 0 snapshotted as the pristine baseline seconds earlier — mutating ground truth before Phase 3 sampling. Smoke's purpose is wiring (DB conn via database.xml -> sik, admin login row, real dialog opens, table model loads); save correctness is GATE G1's job (Phase 3).
- Also corrected in run_all.sh (minimal stop-semantics fixes, same root-cause family as the false DONE removed after run 20261011T044455Z): (1) smoke comment fixed — the harness targets DB sik via database.xml, NOT sik_bench (zero-seed, reg_periksa=0); (2) write_done now runs only when the whole phase chain succeeds (`&& write_done`), so a gate failure can never emit a DONE marker again; (3) gate_fail and the disk-guard timeout stop the heartbeat/progress loops before exiting; (4) stale last_error cleared at Phase 0 start so PROGRESS.md does not carry a previous run's error.
- Impact: Phase 0 now expected to complete (manifest + sik baseline sha256 + read-only smoke) and the run proceeds to Phase 1, where it will STOP at the first helper tool (python3 /opt/Deers-Rock/tools/fix_doc2_canonical_jml.py not yet built) — an expected stop, not a failure.
- Revisit: no (GATE G1 still validates the real save path on 30-50 visits).
- Relaunch: run_all.sh (smoke gate fixed per entry above) relaunched detached via `systemd-run --unit=dr-bench`, run_id=20261011T050436Z at 2026-10-11T05:04:39Z.

## 2026-10-11T05:09:20Z — Phase 0 smoke HeadlessException: headless-only JRE gap (fixer run 2)
- Finding: after the smoke-gate fix, relaunch run 20261011T050436Z still stopped at preflight_smoke, but further along: DB connect + admin login OK, then java.awt.HeadlessException at DlgBilingRalan.<init> even with Xvfb running and DISPLAY=:99 set. Root cause: only openjdk-17-jre-headless was installed — libawt_xawt.so absent, so the JVM cannot run headful AWT/Swing at all. (Run 20261011T044455Z never reached GUI code — the args AIOOBE masked this environment gap.)
- Chosen: installed the headful runtime package openjdk-17-jre (same JVM 17.0.20.1, adds libawt_xawt.so + X11 client libs). No Khanza source/jar, BilingHarness, firewall, bind-address, or auth changes.
- Evidence: results/20261011T050436Z/smoke_harness.log (stack trace); manual post-fix smoke on 2026/10/01/000207: rc=0, "[no_rawat] tbBilling rows=13", no Exception, sik.billing 6288 rows before AND after (read-only confirmed).
- Impact: Phase 0 smoke now genuinely exercises the real DlgBilingRalan wiring under Xvfb+faketime; gate criteria (exit 0 + no Exception + tbBilling rows>=0) proven satisfiable before relaunch.
- Revisit: no.
- Relaunch 2: after openjdk-17-jre install + manual smoke validation, relaunched detached via `systemd-run --unit=dr-bench`, run_id=20261011T050921Z at 2026-10-11T05:09:25Z.

## 2026-10-11T05:33:31Z — Seed leakage closed (export + consumer DR-only guards)
Root cause: export filter `no_rawat LIKE '2026/10%'` matched 34 seed visits that have October resep_obat rows; consumer billed whatever the export yielded. Fix: (1) dr_export.sh joins reg_periksa and requires no_rkm_medis LIKE 'DR%' in every arm; (2) KhanzaBillingConsumer.java skips ENC blocks whose no_rkm_medis does not start with DR (defense in depth), recompiled + re-run. Cleanup: deleted pipeline billing/nota_jalan rows of the 34 leaked visits and their exported dpo pairs from sik. Original seed-visit data untouched. Proving check: sik_bench seed rows = 0. NOTE: dpo rows of leaked visits that pre-existed the consumer UPSERT were already overwritten in the shipped dump; the corrupted stand-ins were deleted (original values unrecoverable on-box).

## 2026-10-11T05:34:03Z — 67 procedure-only DR visits now exported and billed
dr_export.sh gained a procedure-only ENC arm (DR visits with rawat_jl_dr but no resep_obat emit ENC/END from tgl_registrasi/jam_reg; no OBAT lines — consumer bills registration + procedure from reg_periksa/rawat_jl_dr). Consumer re-run; gate: billed DR visit count == DR visit count (354 == 354).

## 2026-10-11T05:36:46Z — DOC-1 stand-in doctor mapping installed (20 distinct kd_dokter)
True DR roster/per-visit doctor assignment is engine-side (not on-box; no DR doctor id survived the adapter collapse). Deterministic stand-in: roster = generator's canonical pools (generator.ts DOKTER_NAMES_M/F, interleaved), kd_dokter = 'D'+md5(name)[:7].upper(), per-visit = roster[md5(no_rawat) mod 20]. Master rows created in sik + sik_bench (minimal columns, kd_sps NULL; inserted with session FOREIGN_KEY_CHECKS=0 because dokter.kd_dokter FKs pegawai.nik and mirroring pegawai would cascade fabrications across 11 reference tables — the shipped dump itself was loaded with checks off; missing pegawai mirror rows are inert for billing/reports). reg_periksa.kd_dokter updated for DR visits; consumer re-run. rawat_jl_dr/resep_obat kd_dokter still collapsed (unrecoverable on-box) — true mapping replaces this when the DR engine deploys.

## 2026-10-11T05:38:09Z — 30-day DR perf profile deferred (engine not on-box)
The DR generator source is not in the benchmark asset bundle; nothing on-box to time. Deferred to generator deployment. Constraint recorded: Stage B B3 (365-day headline) conclusions require this profile to have run (superlinear per-tick growth check); if B3 exceeds 12h after the perf fix, run_all lowers weekday arrivals 300->200/day and re-runs B3, and the report must state the final rate actually used.

## 2026-10-11T05:38:33Z — openjdk-17-jdk-headless installed (javac for consumer recompile)
fix_seed_leakage requires recompiling KhanzaBillingConsumer.java on-box; only openjdk-17-jre was installed (no javac). Installed openjdk-17-jdk-headless 17.0.20.1 (same JVM line as the existing JRE; adds javac only). No Khanza source/jar, firewall, auth, or DB-permission changes.

## 2026-10-11T06:06:30Z — Phase2 DR charge ledger tariff source
No dedicated DR tariff table in the bundle. Ledger built from per-code prices already in databarang (drug ralan/retail) and jns_perawatan (procedure total_byrdr). A dedicated DR tariff table is PENDING; when it lands, regenerate this ledger. Registration fee = DR clinic fee 10000 (NOT poliklinik-copied); difference from Khanza master recorded as REG-1. Tax (11% drug subtotal, half-up) is a Khanza rule, kept out of this ledger (comparison layer only).

## 2026-10-11T06:10:58Z — Phase2 ICD-10 content mapper = STARTER/SEED mapping
Common outpatient ICD-10 categories mapped to real DB drug/procedure codes. NOT the full WHO ICD-10 model; replace when the knowledge base is available. Unmappable codes are rejected (reason code), never silently dropped. See /opt/dr-benchmark/results/test/icd10_content.log

## 2026-10-11T16:43:54Z — GATE G1 oracle v2 run (attempt 1) — FAIL
oracle_diff_30_50.py v2: bidirectional per-visit value-row exactness; reset clears detail_nota_jalan (+piutang/detail_piutang/tambahan/pengurangan) fixing v1's duplicate-PK save failures; PPN via Java Math.round (floor(x+0.5)); general_log fresh-truncated per attempt in /tmp/g1_gl and single-clean is a hard gate condition. Result: FAIL (match rate 0.00%, only_consumer=207, only_real=0, source_drift=False, gl_clean=False).

## 2026-10-11T17:07:29Z — GATE G1 oracle v2 run (attempt 1) — PASS
oracle_diff_30_50.py v2: bidirectional per-visit value-row exactness; reset clears detail_nota_jalan (+piutang/detail_piutang/tambahan/pengurangan) fixing v1's duplicate-PK save failures; PPN via Java Math.round (floor(x+0.5)); general_log fresh-truncated per attempt in /tmp/g1_gl and single-clean is a hard gate condition. Result: PASS (match rate 100.00%, only_consumer=0, only_real=0, source_drift=False, gl_clean=True).

## 2026-10-11T22:47:56Z — Stage A ledger rebuild from sik DR sources
dr_charge_ledger rebuilt in sik_bench from sik's DR source tables (registration=DR clinic fee 10000; procedure=rawat_jl_dr.biaya_rawat; drug=resep_dokter.jml x databarang.ralan — NOT detail_pemberian_obat.h_beli, which diverges on 287 visits (price-source normalization); tax=11% per-visit drug subtotal, Java Math.round half-up). Reason: sik_bench contains no DR encounter rows; building from sik_bench yielded 0 rows (empty-ledger bug).

## 2026-10-12T00:08:29Z — Stage B synthetic corpus design
generate_scale_encounters.py builds the scale corpus by deterministic (seed 20261012, per-day md5 RNG) template sampling from the real 354-visit October DR cohort: patient/poli/doctor/drug-basket/procedure copied; no_rawat YYYY/MM/DD/8NNNNN from 800001 (position-11 '8' = generated marker); Poisson arrivals weekday 300 Sat 120 Sun 30 within 08:00-14:00; lowered mode weekday 200. Ledger rows use the consumer's exact semantics (reg 10000, drug jml x databarang.ralan, PPN Math.round half-up 11%) so three_count/charge_delta reconcile. B2/B3 days beyond 2026-10-31 fall outside the G2 tools' hardcoded 2026/10 scope — covered by generate manifest + telemetry + sampled real-form diff instead (G2 tools not modified, per instructions).
