# /opt/Deers-Rock/tools - stub

tools to be built by executing agent during Phase 1

This directory is a placeholder so /opt/dr-benchmark/run_all.sh does not
crash on a missing path. The executing agent builds the helper tools
listed below on-box during Phase 1 (brief section 5).

Expected tools (referenced by run_all.sh):
- fix_doc2_canonical_jml.py
- fix_seed_leakage.py
- emit_procedure_only_encounters.py
- map_dr_doctors.py
- verify_resend_idempotent.py
- dr_perf_profile_30d.py
- write_explicit_sim_dates.py
- wire_icd10_content_mapper.py
- build_dr_charge_ledger.py
- oracle_diff_30_50.py
- load_354_dr_visits.py
- three_count_reconcile.py
- charge_delta_per_component.py
- replay_determinism_check.py
- generate_scale_encounters.py
- collect_scale_telemetry.py
- sampled_real_form_diff.py
- build_benchmark_report.py
- scrub_publishable.py
- burst_test.py

## Phase 5 Stage B scale-ladder tools (fixer, 2026-10-12)

- `generate_scale_encounters.py` — deterministic (fixed seed 20261012, per-day
  md5 RNG) class-C Poisson encounter generator (weekday 300 / Sat 120 / Sun 30
  per day, arrivals 08:00-14:00; `--lowered-rate` or 'lowered' in the --out
  basename = weekday 200). Emits ENC/OBAT/END export lines, loads
  sik.reg_periksa + rawat_jl_dr (no_rawat YYYY/MM/DD/8NNNNN marker) and
  appends exact-consumer-semantics rows to sik_bench.dr_charge_ledger so
  three_count/charge_delta reconcile per component. Template pool = the real
  354 October DR visits only (excludes the 8NNNNN marker — pool must not
  drift, determinism).
- `collect_scale_telemetry.py` — post-consumer per-rung snapshot: consumer
  throughput (visits/min, per-5k buckets), ms p50/p95/p99, errors, data-dir +
  top-20 tables, 8 report-SQL latencies (p50/p95/p99), InnoDB counters,
  Slow_queries, vmstat/sar. Writes results/<RUN_ID>/telemetry_<stage>.{json,md}.
  For stage B3* also writes state.json b3_wall_hours (feeds run_all's
  300->200/day lowered-rate rule).
- `sampled_real_form_diff.py` — sampled real-form oracle diff: rate/per visits
  (default 25/10k) of the generated cohort, ORDER BY MD5(no_rawat), cap-min
  wall clock; per-visit consumer vs real DlgBilingRalan (BilingHarness under
  Xvfb + per-date faketime, one JVM per date) value-row multiset diff; PPN
  diagnostic; drift -> ORACLE_DRIFT log + exit 1 (stage does not fail);
  failed real-form saves are state-repaired by re-running the consumer on a
  rebuilt single-visit file. general_log is owned by run_all's helper.
