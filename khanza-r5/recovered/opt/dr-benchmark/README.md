# DR → Khanza Unattended E2E Benchmark — Pre-Stage Bundle

Target: new 10-core / 12 GB VPS (old VPS #2 being terminated).
Status: DRAFT-ONLY. Nothing here has been executed. Operator launches on the new box.

## Layout

| File | Purpose |
|---|---|
| `setup_vps.sh` | Image-agnostic bring-up: install JDK17/Xvfb/faketime/MySQL 8.4, stage the asset, load `sik` dump, create `sik_bench` (master+reference only, no seed), recreate `benchmark@localhost` user, verify Khanza JAR md5, install the orchestrator. Fills `$TARGET_VPS`-independent; operator runs it ON the box. |
| `run_all.sh` | The phased orchestrator (brief §4): phases 0–7, `state.json`, `--resume`, 60 s heartbeat, `PROGRESS.md` every 10 min, disk-guard (pause < 10 GB, stop > 2 h), `general_log` OFF in bulk / ON only for sampled real-form, slow-query log 1 s, DONE / STOPPED_AT_<phase> markers, SHA-256 manifest. |
| `determinism_audit_checklist.md` | Phase 1.5 prerequisites: unseeded-RNG / wall-clock sweep, replay determinism test, DOC-2 canonical-jml generator fix spec, seed-leakage root-cause checklist, 67-unbilled export extension, DOC-1 doctor mapping. |
| `decision_log_template.md` | `DECISIONS.md` template for recording conservative picks (brief §3 rule 6). |
| `collect_results.sh` | Operator pull-back: scp `results/<run_id>/` tarball + manifest + PROGRESS.md + state.json, re-verify gates locally, report DONE/STOPPED. |

## Secrets policy (brief §3 rule 2)
- No DB password, AES key/IV, `usere` key, or public IP appears in any file here.
- DB password is read at runtime from `/opt/simrs-khanza/run-env/benchmark_pw` only.
- The Khanza JAR is validated by md5 `25acbbbe0faa71bc16c5c9c83157451d` (the build diffed in `real_form_validation_v2.md`), not by a secret.

## Launch procedure (operator)
1. Secure the new VPS (Linux/SSH, Java 17 installable). Confirm the seller's "anti-suspend" claim.
2. Copy the whole `khanza-benchmark-asset/` bundle to the box (≈1.9 GB).
3. `bash setup_vps.sh` — brings the box up, stages `/opt/simrs-khanza`, loads the DB, creates `sik_bench`, verifies the JAR md5.
4. Launch detached: `sudo systemd-run --unit=dr-bench bash /opt/dr-benchmark/run_all.sh --run-id <ts>` **or** `tmux new -s drbench 'nohup bash /opt/dr-benchmark/run_all.sh --run-id <ts> &'`.
5. Verify: the unit is active, a heartbeat file updates every 60 s, `PROGRESS.md` appears. **Then close the laptop.**
6. On return: `bash collect_results.sh <run_id>` pulls the tarball + manifest back and re-runs the verification gates.

## Headline-volume rule (brief §2 + my flag)
Stage B3 (365 days, ~70–100k visits) is optimistic. `run_all.sh` Phase 5 encodes: after the DR-perf fix, if B3 still exceeds 12 h wall-clock, **lower the weekday arrival rate 300→200/day and record it in DECISIONS.md** — do not let an unattended run stretch to 40 h. The 12 h budget for the year-run is only safe if the near-quadratic per-tick hotspot is fixed first (brief Phase 1.6).

## Not in this pre-stage (built by the executing agent on the box)
- The actual DR generator / adapter / consumer edits for DOC-1/DOC-2/seed-leakage/67-unbilled (Phase 1) — specs are in `determinism_audit_checklist.md`; the code changes happen on the box and are committed to `bench/unattended-2026-10-11`.
- The ICD-10 content mapper wiring + DR ground-truth ledger (Phase 2).
- The synthetic scratch-`sik_bench` visits (Phase 3).
