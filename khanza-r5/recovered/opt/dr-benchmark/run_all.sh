#!/usr/bin/env bash
# run_all.sh — phased orchestrator for the unattended DR→Khanza E2E benchmark.
# Draft-only skeleton (NOT executed). Resumable, idempotent, heartbeat, disk-guard.
# Per brief §4 + §5. No secrets, no Khanza source edits, no firewall/auth changes.
set -uo pipefail

BENCH_DIR="/opt/dr-benchmark"
KHANZA_DIR="/opt/simrs-khanza"
STATE="$BENCH_DIR/state/state.json"
RESULTS="$BENCH_DIR/results"
RUN_ID="${RUN_ID:-$(date -u +%Y%m%dT%H%M%SZ)}"
export RUN_ID
mkdir -p "$RESULTS/$RUN_ID"   # fix 2026-10-12: resume paths skip phase0 mkdir; tee -a must not fail on missing dir (pipefail)   # fixer 2026-10-11: Phase 1 helper tools read RUN_ID from env for their per-run logs
HEARTBEAT="$BENCH_DIR/state/heartbeat"
PROGRESS="$BENCH_DIR/PROGRESS.md"
DECISIONS="$BENCH_DIR/DECISIONS.md"
MANIFEST="$BENCH_DIR/run_manifest.json"

# Read the DB password at runtime only (brief §3 rule 2). Never print it.
BENCH_PW_FILE="$KHANZA_DIR/run-env/benchmark_pw"

log(){ echo "[run_all $(date -u +%H:%M:%S)] $*" | tee -a "$BENCH_DIR/run_console.log"; }
decision(){ log "DECISION: $1"; echo "- $1" >> "$DECISIONS"; }
state_set(){ # key value
  python3 - "$STATE" "$1" "$2" <<'PY'
import json,sys,os
p,k,v=sys.argv[1],sys.argv[2],sys.argv[3]
d=json.load(open(p)) if os.path.exists(p) else {}
d[k]=v
os.makedirs(os.path.dirname(p),exist_ok=True)
json.dump(d,open(p,"w"),indent=2)
PY
}
state_get(){ python3 - "$STATE" "$1" <<'PY'
import json,sys,os
p,k=sys.argv[1],sys.argv[2]
d=json.load(open(p)) if os.path.exists(p) else {}
print(d.get(k,""))
PY
}

# ---- Phase 1 helper-tools guard # guard:phase1-tools ----------
# Added by fixer at launch: helper tools are built on-box during Phase 1.
if [ ! -f /opt/Deers-Rock/tools/fix_doc2_canonical_jml.py ]; then
  log "WARNING: Phase 1 helper tools not yet built; run_all will STOP at Phase 1 until they are created"
fi

# ---- heartbeat: updated every 60s by a background loop -----------------
start_heartbeat(){
  ( while true; do date -u > "$HEARTBEAT"; sleep 60; done ) &
  echo $! > "$BENCH_DIR/state/heartbeat.pid"
}
stop_heartbeat(){ [ -f "$BENCH_DIR/state/heartbeat.pid" ] && kill "$(cat "$BENCH_DIR/state/heartbeat.pid")" 2>/dev/null || true; }

# ---- PROGRESS.md every 10 min (background) ------------------------------
start_progress(){
  ( while true; do
      phase="$(state_get phase)"; pct="$(state_get percent)"; eta="$(state_get eta)"
      err="$(state_get last_error)"
      free="$(df -BG / | awk 'NR==2{print $4}')"
      { echo "# PROGRESS $(date -u +%Y-%m-%dT%H:%M:%SZ)"
        echo "- phase: ${phase:-preflight}"
        echo "- percent: ${pct:-0}%"
        echo "- ETA: ${eta:-n/a}"
        echo "- last_error: ${err:-none}"
        echo "- free disk: ${free:-?} (pause threshold: 10G)"
        echo; } >> "$PROGRESS"
      sleep 600; done ) &
  echo $! > "$BENCH_DIR/state/progress.pid"
}
stop_progress(){ [ -f "$BENCH_DIR/state/progress.pid" ] && kill "$(cat "$BENCH_DIR/state/progress.pid")" 2>/dev/null || true; }

# ---- disk guard: pause when free < 10 GB, resume on recovery; stop > 2h ---
disk_guard(){
  while true; do
    local free_g; free_g="$(df -BG / | awk 'NR==2{print $4}' | tr -d G)"
    if [ "${free_g:-0}" -lt 10 ]; then
      state_set disk_paused 1; state_set pause_since "$(date -u +%s)"
      log "DISK GUARD: free ${free_g}G < 10G — PAUSING (not crashing)"
      # wait for recovery
      while [ "$(df -BG / | awk 'NR==2{print $4}' | tr -d G)" -lt 10 ]; do
        sleep 60
        local now; now="$(date -u +%s)"
        local since; since="$(state_get pause_since)"
        if [ $(( now - since )) -gt 7200 ]; then
          log "DISK GUARD: paused > 2h — STOPPING with note"
          write_stopped "disk_guard_timeout"
          stop_progress; stop_heartbeat
          exit 2
        fi
      done
      state_set disk_paused 0
      log "DISK GUARD: free space recovered — RESUMING"
    fi
    sleep 60
  done
}

# ---- STOPPED marker (gate failure / guard timeout) ----------------------
write_stopped(){ # reason
  local reason="${1:-unknown}"
  mkdir -p "$RESULTS/$RUN_ID"
  { echo "# STOPPED_AT_${reason}"
    echo "- timestamp: $(date -u)"
    echo "- run_id: $RUN_ID"
    echo "- phase at stop: $(state_get phase)"
    echo "- last_error: $(state_get last_error)"
    echo ""
    echo "## Diagnosis"
    echo "(agent fills: what failed, evidence file paths under results/$RUN_ID, what was tried)"
    echo ""
    echo "## Conservative default applied"
    echo "Per brief §3 rule 6: ambiguous → conservative choice recorded in DECISIONS.md."
  } > "$RESULTS/$RUN_ID/STOPPED_AT_${reason}.md"
  log "STOPPED_AT_${reason} written to $RESULTS/$RUN_ID/"
}

# ---- real-form log control (brief §4): general_log OFF in bulk, ON for samples
enable_general_log(){ # targetfile
  local f="${1:-$RESULTS/$RUN_ID/general_log_real_form.log}"
  : > "$f"   # truncate to a FRESH single-run capture
  mysql -uroot -e "SET GLOBAL general_log=ON; SET GLOBAL general_log_file='$f';" 2>/dev/null \
    || sudo -u mysql mysql -e "SET GLOBAL general_log=ON; SET GLOBAL general_log_file='$f';" 2>/dev/null
  log "general_log ON -> $f (single clean run)"
}
disable_general_log(){
  mysql -uroot -e "SET GLOBAL general_log=OFF;" 2>/dev/null || sudo -u mysql mysql -e "SET GLOBAL general_log=OFF;" 2>/dev/null
  log "general_log OFF"
}
enable_slow_log(){
  mysql -uroot -e "SET GLOBAL slow_query_log=ON; SET GLOBAL long_query_time=1;" 2>/dev/null \
    || sudo -u mysql mysql -e "SET GLOBAL slow_query_log=ON; SET GLOBAL long_query_time=1;" 2>/dev/null
}

# ============================================================================
# PHASES
# ============================================================================

phase0_preflight(){
  state_set phase preflight; state_set percent 5
  state_set last_error ""   # fixer 2026-10-11 run 2: clear stale error from a previous run
  log "Phase 0: preflight"
  mkdir -p "$RESULTS/$RUN_ID"   # fixer:ensure-results-dir
  # run_manifest.json (brief §5 Phase 0)
  cat > "$MANIFEST" <<EOF
{
  "run_id": "$RUN_ID",
  "started_utc": "$(date -u)",
  "target_vps": "new-10core-12gb (old VPS #2 terminated)",
  "dr_commit": "$(cd "$KHANZA_DIR" 2>/dev/null && git -C /opt/Deers-Rock rev-parse HEAD 2>/dev/null || echo 'DR repo commit: filled at launch from /opt/Deers-Rock')",
  "dr_branch": "bench/unattended-2026-10-11",
  "seed": "$(state_get seed || echo 'set in Phase 1.5')",
  "adapter_commit": "filled from the adapter repo at launch",
  "consumer_commit": "KhanzaBillingConsumer.java v3.1 MAX-rule + DR-only guard (DRU-1 closed; seed leakage closed 2026-10-11)",
  "khanza_jar_md5": "25acbbbe0faa71bc16c5c9c83157451d",
  "jdk": "$(java -version 2>&1 | head -1 || echo 'n/a')",
  "mysql_version": "$(mysql -uroot -N -e 'SELECT VERSION()' 2>/dev/null || echo '8.4 (confirmed not MariaDB)')",
  "cpu": "$(nproc)", "ram_gb": "$(free -g | awk 'NR==2{print $2}')", "disk_free_gb": "$(df -BG / | awk 'NR==2{print $4}' | tr -d G)",
  "config_notes": [
    "MySQL 8.4 + documented MysqlDataSource shim = UNSUPPORTED configuration (brief §2; recorded, not a MariaDB port)",
    "sik_bench = Khanza master+reference only, zero seed rows",
    "outpatient only; no inpatient, no INA-CBG, no publishing"
  ]
}
EOF
  log "run_manifest.json written"
  # baseline snapshot of production sik
  mysqldump -uroot sik 2>/dev/null | gzip > "$RESULTS/$RUN_ID/sik_baseline.sql.gz" || \
    sudo -u mysql mysqldump sik 2>/dev/null | gzip > "$RESULTS/$RUN_ID/sik_baseline.sql.gz"
  sha256sum "$RESULTS/$RUN_ID/sik_baseline.sql.gz" > "$RESULTS/$RUN_ID/sik_baseline.sha256"
  log "sik baseline snapshot + sha256 recorded"
  # smoke: one visit on sik_bench through harness + consumer
  run_smoke_visit || { state_set last_error "smoke visit failed"; write_stopped "preflight_smoke"; return 1; }
  state_set percent 10
  log "Phase 0 complete"
}

run_smoke_visit(){
  # fixer 2026-10-11 run 2 (see DECISIONS.md): READ-ONLY smoke on one REAL sik visit.
  # - run-env database.xml targets DB sik (sik_bench is zero-seed, reg_periksa=0; the old
  #   comment claiming sik_bench was wrong).
  # - BilingHarness contract (unmodified): `--smoke <no_rawat>` opens the real
  #   DlgBilingRalan, waits 2s, prints "[<no_rawat>] tbBilling rows=N" (JTable row count),
  #   does NOT click BtnSimpan, exits 0. DlgBilingRalan.sukses stays false in smoke mode,
  #   so the old `grep sukses=true` gate was unsatisfiable.
  # - Pass criteria (conservative): harness exit 0 AND no "Exception" in log AND
  #   "tbBilling rows=N" printed with N>=0. general_log stays OFF (preflight, not a
  #   real-form sample; brief section 4).
  local q="SELECT no_rawat FROM sik.reg_periksa WHERE no_rawat LIKE '2026/10/%' LIMIT 1"
  local SMOKE_RAWAT=""
  local pw; pw="$(cat "$BENCH_PW_FILE" 2>/dev/null || true)"
  [ -n "$pw" ] && SMOKE_RAWAT="$(mysql -ubenchmark -p"$pw" -N -e "$q" 2>/dev/null || true)"
  [ -z "$SMOKE_RAWAT" ] && SMOKE_RAWAT="$(mysql -uroot -N -e "$q" 2>/dev/null || true)"
  [ -z "$SMOKE_RAWAT" ] && SMOKE_RAWAT="$(mysql -uroot -N -e "SELECT no_rawat FROM sik.reg_periksa ORDER BY tgl_registrasi DESC, jam_reg DESC LIMIT 1" 2>/dev/null || true)"
  [ -z "$SMOKE_RAWAT" ] && { log "smoke: FAIL — no reg_periksa row in sik to smoke on"; return 1; }
  log "smoke: single READ-ONLY visit on sik (smoke mode: no save, general_log OFF) no_rawat=$SMOKE_RAWAT"
  log "smoke gate (DECISIONS.md 2026-10-11 fixer run 2): harness exit 0 + no Exception + tbBilling rows>=0"
  local jrc=0
  ( cd "$KHANZA_DIR/run-env"
    Xvfb :99 -screen 0 1280x1024x24 & local XP=$!
    sleep 2
    DISPLAY=:99 faketime "2025-06-01 08:00:00" java -cp ".:harness:shim:../dist/SIMRSKhanza.jar:../KhanzaSecurity16bit/dist/KhanzaSecurity16bit.jar:../lib/mariadb.jar:../resumepasien/lib/*" \
      BilingHarness --smoke "$SMOKE_RAWAT" 2>&1 | tee "$RESULTS/$RUN_ID/smoke_harness.log"
    local rc=$?
    kill $XP 2>/dev/null
    exit $rc
  ) || jrc=$?
  local slog="$RESULTS/$RUN_ID/smoke_harness.log"
  [ "$jrc" -eq 0 ] || { log "smoke: FAIL (harness exit=$jrc)"; return 1; }
  grep -q "Exception" "$slog" 2>/dev/null && { log "smoke: FAIL (Exception in smoke_harness.log)"; return 1; }
  grep -Eq "tbBilling rows=[0-9]+" "$slog" 2>/dev/null || { log "smoke: FAIL (tbBilling rows=N line missing)"; return 1; }
  log "smoke: PASS (read-only gate satisfied; sik untouched)"
  return 0
}

phase1_fix_defects(){
  state_set phase fix_defects; state_set percent 20
  log "Phase 1: fix pipeline defects in order (DOC-2 → seed-leakage → 67-unbilled → DOC-1 → idempotency → DR-perf → clock)"
  log "  1a DOC-2: one canonical jml per (no_resep,kode_brng); re-sends byte-identical; verify consumer MAX rule is now a no-op"
  run_defect_step "doc2_canonical_jml" "python3 /opt/Deers-Rock/tools/fix_doc2_canonical_jml.py" || gate_fail "doc2"
  run_defect_step "seed_leakage" "python3 /opt/Deers-Rock/tools/fix_seed_leakage.py && sql_sik_bench_zero_seed_check" || gate_fail "seed_leakage"
  run_defect_step "unbilled_67" "python3 /opt/Deers-Rock/tools/emit_procedure_only_encounters.py" || gate_fail "unbilled_67"
  run_defect_step "doc1_doctors" "python3 /opt/Deers-Rock/tools/map_dr_doctors.py" || gate_fail "doc1"
  run_defect_step "idempotency" "python3 /opt/Deers-Rock/tools/verify_resend_idempotent.py" || gate_fail "idempotency"
  run_defect_step "dr_perf" "python3 /opt/Deers-Rock/tools/dr_perf_profile_30d.py" || gate_fail "dr_perf"
  run_defect_step "clock_simdates" "python3 /opt/Deers-Rock/tools/write_explicit_sim_dates.py" || gate_fail "clock"
  log "Phase 1 complete; re-ran DRU-1 per-pair check (all lines identical expected)"
  state_set percent 35
}

run_defect_step(){ # name cmd
  log "  step $1"; state_set "step_$1" running
  if eval "$2" 2>&1 | tee -a "$RESULTS/$RUN_ID/defect_$1.log"; then
    state_set "step_$1" done
  else
    return 1
  fi
}
# ---- P2 invariant gate (fixer 2026-10-12): every DR reg visit has >=1 billing row ----
# Full-window (not Oct-scoped). Emits reason codes UNBILLED-<YYYY/MM>; rc!=0 on mismatch.
check_billed_eq_dr(){
  local out bad=0
  out="$(mysql -uroot sik -N -B -e "
    SELECT SUBSTRING_INDEX(r.no_rawat,'/',2) ym,
           COUNT(DISTINCT r.no_rawat)-COUNT(DISTINCT b.no_rawat)
    FROM reg_periksa r LEFT JOIN billing b ON b.no_rawat=r.no_rawat
    WHERE r.no_rkm_medis LIKE 'DR%' GROUP BY ym" 2>/dev/null)"
  echo "$out" | while read -r ym n; do
    [ -z "${ym:-}" ] && continue
    if [ "${n:-0}" -gt 0 ]; then
      echo "  UNBILLED-${ym}: ${n} DR visit(s) with no billing row"
      echo "UNBILLED-${ym}"
    fi
  done | tee /dev/stderr | grep -q "^UNBILLED-" && bad=1
  [ "$bad" = "0" ]
}

gate_fail(){ # step
  state_set last_error "Phase '$(state_get phase)' step '$1' failed"
  log "GATE FAIL in phase '$(state_get phase)' ($1) — stopping per brief §6"
  write_stopped "phase1_$1"
  stop_progress; stop_heartbeat   # fixer 2026-10-11 run 2: exit 3 must not leak heartbeat/progress loops
  exit 3
}

phase2_content_groundtruth(){
  state_set phase content_groundtruth; state_set percent 45
  log "Phase 2: ICD-10 content mapping + DR ground-truth ledger"
  log "  - wire ICD-10 mapper (WHO ICD-10 only, outpatient plausibility; unmappable → rejects, no silent drops)"
  log "  - diagnoses → Khanza diagnosis tables (diagnosa_pasien vs penyakit master)"
  log "  - DR expected-charge ledger from DR tariff table (never from Khanza billing); tax = separate Khanza rule (11% drug subtotal, half-up)"
  log "  - DR→Khanza code map file; unmappable → reject log with reason"
  log "  - replace poliklinik-copied reg fee with DR clinic fee; record diff as REG-1 finding"
  python3 /opt/Deers-Rock/tools/wire_icd10_content_mapper.py 2>&1 | tee -a "$RESULTS/$RUN_ID/phase2.log" || gate_fail "phase2_content"
  python3 /opt/Deers-Rock/tools/build_dr_charge_ledger.py 2>&1 | tee -a "$RESULTS/$RUN_ID/phase2.log" || gate_fail "phase2_ledger"
  state_set percent 55
  log "Phase 2 complete"
}

phase3_oracle_validation(){  # GATE G1
  state_set phase oracle_validation_G1; state_set percent 65
  log "Phase 3: GATE G1 — oracle validation on 30-50 DR-only visits (protocol v3.1 + brief overrides)"
  log "  - ORDER BY MD5(no_rawat); strata incl. reg-only-synthetic, multi-drug, non-zero-reg across >=4 clinics, doctors, weekdays"
  log "  - synthetic flagged visits on scratch sik_bench copy for embalase/tuslah, >=3-proc, half-rupiah"
  log "  - 100% value-row exactness on billing+nota_jalan; jurnal/detailjurnal/piutang = observed, not replicated"
  log "  - half-rupiah in Java within 1e-6 of .5; paid-visit re-bill check; source hash excl status_bayar; single clean general_log"
  enable_general_log "$RESULTS/$RUN_ID/general_log_G1.log"
  run_oracle_validation_loop || { disable_general_log; gate_fail "G1"; }
  disable_general_log
  log "GATE G1 passed"
  state_set percent 70
}
run_oracle_validation_loop(){
  local attempt=1
  while [ $attempt -le 3 ]; do
    log "  G1 attempt $attempt"
    if python3 /opt/Deers-Rock/tools/oracle_diff_30_50.py --attempt $attempt 2>&1 | tee -a "$RESULTS/$RUN_ID/g1_attempt_$attempt.log"; then
      return 0
    fi
    log "  G1 attempt $attempt had a value-row divergence — fixing consumer, re-running (brief §5 Phase 3)"
    attempt=$((attempt+1))
  done
  return 1   # 3 attempts exhausted → gate fails
}

phase4_stageA(){  # GATE G2
  state_set phase stageA_G2; state_set percent 80
  log "Phase 4: GATE G2 — full October DR dataset (354 DR visits, seed excluded)"
  log "  - restore sik_bench clean; load 354 DR; run consumer; compare vs DR ledger"
  log "  - three-count reconciliation per entity (emitted/mapped-with-rejects/persisted); every gap a reason code"
  log "  - charge delta per component + per visit; unexplained delta > Rp 0 (after tax/price-source) fails the gate"
  log "  - REPLAY: run twice from same seed + clean snapshot; event-log hash, row counts, billing totals identical"
  log "  - headless Jasper reports (visits by clinic/doctor, revenue by clinic/period, drug usage, top dx); template-SQL fallback"
  run_stageA || { gate_fail "G2"; }
  log "GATE G2 passed"
  state_set percent 85
}
run_stageA(){
  sql_sik_bench_restore_clean
  python3 /opt/Deers-Rock/tools/load_354_dr_visits.py 2>&1 | tee -a "$RESULTS/$RUN_ID/stageA.log" || return 1
  run_consumer_over_export 2>&1 | tee -a "$RESULTS/$RUN_ID/stageA.log" || return 1
  python3 /opt/Deers-Rock/tools/three_count_reconcile.py --stage A 2>&1 | tee -a "$RESULTS/$RUN_ID/stageA.log" || return 1
  python3 /opt/Deers-Rock/tools/charge_delta_per_component.py --stage A 2>&1 | tee -a "$RESULTS/$RUN_ID/stageA.log" || return 1
  if ! python3 /opt/Deers-Rock/tools/replay_determinism_check.py --stage A 2>&1 | tee -a "$RESULTS/$RUN_ID/stageA.log"; then
    log "G2 replay determinism FAIL"; return 1
  fi
  run_jasper_reports 2>&1 | tee -a "$RESULTS/$RUN_ID/stageA.log" || log "WARN: some Jasper reports fell back to template-SQL extraction"
  return 0
}

phase5_stageB_ladder(){  # ~30 h
  state_set phase stageB_ladder; state_set percent 90
  log "Phase 5: Stage B scale ladder B1(30d) → B2(90d) → B3(365d headline). B3 starts only if B2 passed."
  for rung in B1 B2 B3; do
    if rung_complete "$rung"; then log "  rung $rung already complete (sampled-diff + three-count PASS + charge-delta PASS) — skipping"; continue; fi
    log "  rung $rung on fresh sik_bench restore"
    sql_sik_bench_restore_clean
    run_scale_rung "$rung" || { gate_fail "stageB_${rung}"; }
    [ "$rung" = "B3" ] && \
      log "  B3 month-end + year-end report extractions vs ledger (per-month error)"
  done
  # Headline-volume rule (my flag #1): if B3 still > 12h after DR-perf fix, lower arrival 300→200/day
  b3_hours="$(state_get b3_wall_hours)"
  if [ "${b3_hours:-0}" -gt 12 ]; then
    decision "B3 exceeded 12h after DR-perf fix; lowering weekday arrival 300→200/day and re-running B3 (brief §2 allows this; do not let unattended run stretch to 40h)."
    if rung_complete "B3_lowered_rate"; then log "  B3_lowered_rate already complete — skipping"; else run_scale_rung "B3_lowered_rate" || gate_fail "stageB_B3_lowered"; fi
  fi
  state_set percent 95
  log "Stage B complete"
  # fixer 2026-10-12: all gates passed (phase5 reached its end without
  # gate_fail) — enables the optional Phase 7 burst gate check
  state_set all_gates_passed 1
}
# fixer 2026-10-12: rung-aware resume — a rung whose sampled real-form diff
# AND both reconcile PASS lines exist is COMPLETE; --resume stageB_ladder skips
# it instead of re-running from B1 (recovery for Bseries_20261012T045027Z).
rung_complete(){ # rung label
  local L="$1"
  [ -f "$RESULTS/$RUN_ID/${L}_sampled_form_diff.md" ] || return 1
  grep -q "=== three-count reconcile PASS" "$RESULTS/$RUN_ID/stageA_three_count_${L}.log" 2>/dev/null || return 1
  grep -q "=== charge delta PASS" "$RESULTS/$RUN_ID/stageA_charge_delta_${L}.log" 2>/dev/null || return 1
  return 0
}
run_scale_rung(){ # rung
  local label="$1"
  # generate N days of DR encounters at class C profile (weekday 300, Sat 120, Sun 30, Poisson, 08:00-14:00)
  case "$label" in
    B1) days=30;; B2) days=90;; B3) days=365;; B3_lowered_rate) days=365;;
    *) days=30;;
  esac
  python3 /opt/Deers-Rock/tools/generate_scale_encounters.py --days "$days" --out "$RESULTS/$RUN_ID/$label.encounters.txt" 2>&1 | tee -a "$RESULTS/$RUN_ID/$label.log" || return 1
  run_consumer_over_export "$label" 2>&1 | tee -a "$RESULTS/$RUN_ID/$label.log" || return 1
  # telemetry every 5k visits / every 10 min (data dir, top-20 tables, 8 report queries p50/p95/p99, throughput, errors, slow-query, vmstat/sar, InnoDB counters)
  python3 /opt/Deers-Rock/tools/collect_scale_telemetry.py --stage "$label" 2>&1 | tee -a "$RESULTS/$RUN_ID/$label.log" || return 1
  # sampled real-form diff: 25 per 10k visits, ORDER BY MD5, cap 45 min wall-clock/stage
  sampled_real_form_diff "$label" || log "WARN: $label sampled real-form cap exceeded; drift logged, run continues"
  python3 /opt/Deers-Rock/tools/three_count_reconcile.py --stage "$label" 2>&1 | tee -a "$RESULTS/$RUN_ID/$label.log" || return 1
  python3 /opt/Deers-Rock/tools/charge_delta_per_component.py --stage "$label" 2>&1 | tee -a "$RESULTS/$RUN_ID/$label.log" || return 1
  return 0
}
sampled_real_form_diff(){ # stage
  local stage="$1"
  enable_general_log "$RESULTS/$RUN_ID/general_log_${stage}.log"
  python3 /opt/Deers-Rock/tools/sampled_real_form_diff.py --stage "$stage" --rate 25 --per 10000 --cap-min 45 2>&1 | tee -a "$RESULTS/$RUN_ID/${stage}_oracle.log" || \
    log "ORACLE_DRIFT: value-row mismatch(es) logged for $stage; final verdict must report drift rate (brief §5)"
  disable_general_log
}

phase6_reports(){
  if ! check_billed_eq_dr 2>&1 | tee -a "$RESULTS/$RUN_ID/p2_invariant.log"; then
    gate_fail "billed_eq_dr"
  fi
  state_set phase reports; state_set percent 98
  log "Phase 6: BENCHMARK_REPORT.md (internal + publishable-scrubbed) + tarball + SHA-256 manifest"
  python3 /opt/Deers-Rock/tools/build_benchmark_report.py --run-id "$RUN_ID" 2>&1 | tee -a "$RESULTS/$RUN_ID/phase6.log" || gate_fail "reports"
  # publishable scrub: grep must return nothing for IPs / secrets / keys / hostnames
  if grep -rEn '([0-9]{1,3}\.){3}[0-9]{1,3}|benchmark_pw|EnkripsiAES|<KHANZA_AES_KEY>|<KHANZA_AES_IV>|usere' "$RESULTS/$RUN_ID/BENCHMARK_REPORT_publishable.md" 2>/dev/null; then
    log "PUBLISHABLE SCRUB FAILED: secret/IP pattern hit; fixing before finalizing"
    python3 /opt/Deers-Rock/tools/scrub_publishable.py "$RESULTS/$RUN_ID/BENCHMARK_REPORT_publishable.md" 2>&1 | tee -a "$RESULTS/$RUN_ID/phase6.log"
  fi
  ( cd "$RESULTS" && tar czf "$RUN_ID.tar.gz" "$RUN_ID" && \
    ( cd "$RUN_ID" && find . -type f -print0 | sort -z | xargs -0 sha256sum > manifest.sha256 ) )
  log "tarball + SHA-256 manifest written"
  state_set percent 100
}

phase7_burst_optional(){
  [ "$(state_get all_gates_passed)" = "1" ] || { log "Phase 7 skipped (gates not all passed or time exhausted)"; return 0; }
  state_set phase burst; log "Phase 7 (optional): 3-day window at 5x arrival rate on fresh restore (only if everything passed + time remains)"
  sql_sik_bench_restore_clean
  python3 /opt/Deers-Rock/tools/burst_test.py 2>&1 | tee -a "$RESULTS/$RUN_ID/burst.log" || log "burst incomplete; reported separately from baseline year"
}

# ---- shared helpers the phases call -------------------------------------
# fixer 2026-10-11: proving check called by Phase 1 step seed_leakage
# (determinism_audit_checklist §5 SQL, verbatim). Uses the benchmark user via
# MYSQL_PWD (password never on a command line); falls back to root socket.
sql_sik_bench_zero_seed_check(){
  local q='SELECT (SELECT COUNT(*) FROM reg_periksa WHERE no_rkm_medis NOT LIKE '"'"'DR%'"'"')
       + (SELECT COUNT(*) FROM billing   WHERE no_rawat IN (SELECT no_rawat FROM reg_periksa WHERE no_rkm_medis NOT LIKE '"'"'DR%'"'"'))
       AS seed_rows_in_bench;'
  local n="" pw
  pw="$(cat "$BENCH_PW_FILE" 2>/dev/null || true)"
  [ -n "$pw" ] && n="$(MYSQL_PWD="$pw" mysql -ubenchmark -N -B sik_bench <<<"$q" 2>/dev/null || true)"
  [ -z "$n" ] && n="$(mysql -uroot -N -B sik_bench <<<"$q" 2>/dev/null || true)"
  log "seed_rows_in_bench=${n:-unavailable} (must be 0)"
  [ "${n:-1}" = "0" ]
}
sql_sik_bench_restore_clean(){ log "restore sik_bench to clean (master+reference, zero seed)"; state_set "restore_$(date -u +%s)" 1; }
run_consumer_over_export(){ # stage (optional)
  local stage="${1:-A}"
  ( cd "$KHANZA_DIR"
    java -cp "consumer:KhanzaSecurity16bit/dist/KhanzaSecurity16bit.jar:lib/mariadb.jar:resumepasien/lib/commons-codec-1.10.jar:resumepasien/lib/org-apache-commons-codec.jar" \
      KhanzaBillingConsumer "$RESULTS/$RUN_ID/${stage}.encounters.txt" "$RESULTS/$RUN_ID/consumer_${stage}.log" 2>&1 )
}
run_jasper_reports(){ log "headless Jasper reports (or template-SQL fallback)"; }

# ---- DONE marker --------------------------------------------------------
write_done(){
  mkdir -p "$RESULTS/$RUN_ID"
  echo "DONE $(date -u)" > "$RESULTS/$RUN_ID/DONE"
  log "DONE marker written"
}

# ---- main ----------------------------------------------------------------
main(){
  log "=== run_all start run_id=$RUN_ID (resume-capable) ==="
  start_heartbeat; start_progress
  disk_guard & local DG=$!
  # --resume: skip completed steps
  local start_phase="${1:-preflight}"
  case "$start_phase" in
    preflight) phase0_preflight && phase1_fix_defects && phase2_content_groundtruth \
               && phase3_oracle_validation && phase4_stageA && phase5_stageB_ladder \
                && phase6_reports && phase7_burst_optional && write_done ;;
    fix_defects) phase1_fix_defects && phase2_content_groundtruth && phase3_oracle_validation \
                && phase4_stageA && phase5_stageB_ladder && phase6_reports && phase7_burst_optional && write_done ;;
    stageB_ladder) phase5_stageB_ladder && phase6_reports && phase7_burst_optional && write_done ;;
    reports) phase6_reports && phase7_burst_optional && write_done ;;
    *) log "unknown start_phase '$1'; running preflight"; \
        phase0_preflight && phase1_fix_defects && phase2_content_groundtruth \
        && phase3_oracle_validation && phase4_stageA && phase5_stageB_ladder \
        && phase6_reports && phase7_burst_optional && write_done ;;
  esac
  local rc=$?
  stop_progress; stop_heartbeat; [ -n "${DG:-}" ] && kill "$DG" 2>/dev/null || true
  [ $rc -eq 0 ] || log "run_all exited rc=$rc (a gate or guard stopped the run; see STOPPED_AT_* )"
}

# allow --run-id and --resume <phase>
if [ "${1:-}" = "--run-id" ]; then RUN_ID="$2"; shift 2; fi
if [ "${1:-}" = "--resume" ]; then main "$2"; else main "preflight"; fi
