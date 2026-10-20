#!/bin/bash
# P11: discriminating negative controls (T1, T2, T5, T6 + the T3 drop-table run).
# For each NC the TARGETED check is run on a fixture twice: once WITH the switch
# (expect FAIL) and once WITHOUT (expect PASS). It prints one line per NC:
#   NC <id>: with-switch=<FAIL|PASS> without=<PASS|FAIL> -> DISCRIMINATING|NOT-DISCRIMINATING
# and exits 0 only if every NC is DISCRIMINATING.
#
# NC1 (T1 A28'): P11_ONLY=28 suite runs; the check asserts C0==C1 (transactional
#   rollback). With R5_NEGCTL_BACKUP_NO_TXN the autocommit re-backup leaves C0!=C1
#   so the check FAILS. The fixture is reused across sub-runs (raw build, no
#   wrapper refusal cycle).
# NC2 (T2 preservation): R5_NEGCTL_SKIP_IMMEDIATE_RESTORE makes the failure path
#   in _bill_date skip stage_restore (but record restored=True). The preservation
#   check's assertion (a) "sample equals pre-operation snapshot" FAILS with the
#   switch. The NC script builds the kept fixture once (P10_INJECT), then runs
#   the preservation check twice against it: with the switch (expect DIFFERENT)
#   and without (expect EQUAL).
# NC3 (T5 A22b'): P11_ONLY=22b suite run; RETRY-REFUSED clears the stale flag.
#   With R5_NEGCTL_KEEP_STALE_FLAG the old flag survives, so the check FAILS.
# NC4 (T6 A31): P11_ONLY=31 suite run; hash(stage)==hash(live) coherence.
#   With R5_NEGCTL_HASH_FROM_LIVE_LATE the old live-late hash order makes a
#   changed live row disagree, so the check FAILS.
# NC5 (T3 dropped table): on the kept r6_p10 fixture, drop one stage table before
#   the post-hash; the preservation check's T3 assertion (stage inventory equal
#   pre-op vs post-fail, complete and non-null) FAILS. Without the drop it PASSES.
#
# All mutations on the disposable sik_p6f fixture; live sik/sik_bench never written.
# No paid model runs. VPS access via khanza-r5/.vps.env (never printed).
# Usage (root on the VPS): bash p11_negative_controls.sh
set -u
cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1
SQL() { mysql -uroot -N -e "$1"; }
FX=sik_p6f
PC=/opt/dr-benchmark/p-chain
TS=$(date -u +%Y%m%dT%H%M%SZ)
OUT=$PC/r5_p11_negative_controls_${TS}.md
NCDIR=$PC/p11_nc
rm -rf "$NCDIR"; mkdir -p "$NCDIR"
{
echo "# P11 negative controls — run $TS (UTC)"
echo "Tools: $(sha256sum p6_acceptance_suite.sh p6_run_suite_fresh.sh sampled_real_form_diff_r5.py p10_hash_state.py p10_preservation_check.sh p8_recovery_unit_test.py | awk '{print substr($1,1,12)" "$2}' | tr '\n' ';')"
echo ""
} > "$OUT"

PASSLINE=0; FAILLINE=0
nc_line() { # id with-status without-status
  local id=$1 ws=$2 wo=$3
  local verdict
  if [ "$ws" = "FAIL" ] && [ "$wo" = "PASS" ]; then verdict="DISCRIMINATING"; else verdict="NOT-DISCRIMINATING"; fi
  echo "NC $id: with-switch=$ws without=$wo -> $verdict" | tee -a "$OUT"
  if [ "$verdict" = "DISCRIMINATING" ]; then PASSLINE=$((PASSLINE+1)); else FAILLINE=$((FAILLINE+1)); fi
}
suite_line() { grep -a "^A$1: " "$2" | tail -1; }
# the suite's check/res lines are tee'd to the timestamped evidence file (r5_p6_
# acceptance_*.md), not stdout — grep verdicts from that file, not the captured log
nc_status_e() { # evidence-file check-id -> "PASS" or "FAIL" (from the check's verdict line)
  grep -aq "^A$2: FAIL" "$1" 2>/dev/null && echo FAIL || echo PASS
}
nc_line_e() { # id verdict-line with-status without-status
  local id=$1 wl=$2 ws=$3 wo=$4
  local verdict
  echo "$wl" | tee -a "$OUT"
  if [ "$ws" = "FAIL" ] && [ "$wo" = "PASS" ]; then verdict="DISCRIMINATING"; else verdict="NOT-DISCRIMINATING"; fi
  echo "NC $id: with-switch=$ws without=$wo -> $verdict" | tee -a "$OUT"
  if [ "$verdict" = "DISCRIMINATING" ]; then PASSLINE=$((PASSLINE+1)); else FAILLINE=$((FAILLINE+1)); fi
}
suite_ev() { # capture the A<id> verdict from the most recent suite evidence file
  grep -a "^A$1: " "$(ls -t $PC/r5_p6_acceptance_*.md 2>/dev/null | head -1)" 2>/dev/null | tail -1
}
nc_status() { # log-file check-id -> "PASS" or "FAIL" (from the check's verdict line)
  grep -aq "^A$2: FAIL" "$1" && echo FAIL || echo PASS
}
teardown_fx() {
  SQL "SHOW DATABASES LIKE '$FX'" | grep -q "$FX" && \
    { SQL "REVOKE SELECT, INSERT, UPDATE, DELETE ON \`$FX\`.* FROM \`benchmark\`@\`localhost\`;" 2>/dev/null;
      SQL "DROP DATABASE IF EXISTS $FX;" 2>/dev/null; } || true
}
ensure_fx() { # build+grant sik_p6f when absent (raw, no wrapper refusal cycle)
  if ! SQL "SHOW DATABASES LIKE '$FX'" | grep -q "$FX"; then
    STRATA_SQL=$(ls /opt/dr-benchmark/p-chain/sik_p6f_build_*/strata_reg_rows.sql | head -1)
    [ -f "$STRATA_SQL" ] || return 1
    SQL "CREATE DATABASE $FX CHARACTER SET $(SQL "SELECT default_character_set_name FROM information_schema.schemata WHERE schema_name='sik'") COLLATE $(SQL "SELECT default_collation_name FROM information_schema.schemata WHERE schema_name='sik'");" || return 1
    mysqldump -uroot --single-transaction --quick --skip-lock-tables sik | mysql -uroot $FX || return 1
    mysql -uroot $FX < "$STRATA_SQL" || return 1
  fi
  # always re-grant: a previous keep-on-fail preservation check revokes the
  # benchmark DML grant on its EXIT trap; the next suite's stage_backup DML
  # (REPLACE INTO ... SELECT) needs it back, or the stage tables stay empty.
  SQL "GRANT SELECT, INSERT, UPDATE, DELETE ON \`$FX\`.* TO \`benchmark\`@\`localhost\`;"
}
# build a kept r6_p10 fixture: the failing wrapper keeps it (P10_INJECT + forced A30).
# Set TEARDOWN=0 to REUSE a dirty kept fixture in place (no teardown first) — the
# preservation check's keep-on-fail path leaves it populated, so the NC5 baseline
# re-hashes it without rebuilding.
build_kept_p10() {
  [ "${TEARDOWN:-1}" = "1" ] && teardown_fx
  P10_INJECT=1 P9_FORCE_FAIL_CHECK=30 bash p6_run_suite_fresh.sh > "$1" 2>&1
  [ -f "$PC/r6_two.txt" ] && [ -f "$PC/r6_p10_protected.txt" ] || return 1
  [ -n "$(SQL "SELECT table_name FROM information_schema.tables WHERE table_schema='$FX' AND table_name LIKE 'r5\\_stage\\_B3\\_r6\\_p10\\_%' LIMIT 1;")" ] || return 1
  return 0
}
preop_md() { ls -t "$PC"/r5_p10_preservation_preop_*.md 2>/dev/null | head -1; }

# ---- NC1: T1 A28' — R5_NEGCTL_BACKUP_NO_TXN ----
echo "## NC1 (T1): A28' discriminating re-backup" | tee -a "$OUT"
ensure_fx || { echo "ABORT: cannot build fixture $FX" | tee -a "$OUT"; exit 3; }
P11_ONLY=28 R5_NEGCTL_BACKUP_NO_TXN=1 bash p6_acceptance_suite.sh > $NCDIR/nc1_with.log 2>&1
EV1W=$(ls -t $PC/r5_p6_acceptance_*.md 2>/dev/null | head -1)
P11_ONLY=28 bash p6_acceptance_suite.sh > $NCDIR/nc1_without.log 2>&1
EV1O=$(ls -t $PC/r5_p6_acceptance_*.md 2>/dev/null | head -1)
suite_line 28 "$EV1W" | tee -a "$OUT"
suite_line 28 "$EV1O" | tee -a "$OUT"
nc_line 1 "$(nc_status_e "$EV1W" 28)" "$(nc_status_e "$EV1O" 28)"

# ---- NC2: T2 — R5_NEGCTL_SKIP_IMMEDIATE_RESTORE (preservation assertion a) ----
echo "## NC2 (T2): pre-operation baseline immediate-restore assertion" | tee -a "$OUT"
# with-switch: build the kept fixture WITH the NC switch — the suite's failure
# path in _bill_date skips the immediate stage_restore (but records
# restored=True), so the sample's output rows stay in their post-fail state.
# Then run the preservation check with the same switch: its negative-control
# assertion (a) "sample equals the pre-operation snapshot" must be DIFFERENT
# -> the check FAILs.
teardown_fx
rm -f "$PC/p11_preserve_preop.json" "$PC/p11_preserve_after_fail.json"
R5_NEGCTL_SKIP_IMMEDIATE_RESTORE=1 build_kept_p10 $NCDIR/nc2_build_with.log || { echo "ABORT: NC2 with-build failed" | tee -a "$OUT"; exit 3; }
R5_NEGCTL_SKIP_IMMEDIATE_RESTORE=1 bash p10_preservation_check.sh > $NCDIR/nc2_preserve_with.log 2>&1
grep -a "a(sample-immediate)=\|PRESERVATION-CHECK" $NCDIR/nc2_preserve_with.log | tail -3 | tee -a "$OUT"
NC2W=$(grep -c "PRESERVATION-CHECK FAIL" $NCDIR/nc2_preserve_with.log)
# without-switch: a fresh kept fixture; the immediate restore ran on the
# failure path, so assertion (a) is EQUAL -> the check PASSes
teardown_fx
rm -f "$PC/p11_preserve_preop.json" "$PC/p11_preserve_after_fail.json"
build_kept_p10 $NCDIR/nc2_build_without.log || { echo "ABORT: NC2 without-build failed" | tee -a "$OUT"; exit 3; }
bash p10_preservation_check.sh > $NCDIR/nc2_preserve_without.log 2>&1
grep -a "a(sample-immediate)=\|PRESERVATION-CHECK" $NCDIR/nc2_preserve_without.log | tail -3 | tee -a "$OUT"
NC2WO=$(grep -c "PRESERVATION-CHECK PASS" $NCDIR/nc2_preserve_without.log)
nc_line 2 "$( [ "$NC2W" -ge 1 ] && echo FAIL || echo PASS )" "$( [ "$NC2WO" -ge 1 ] && echo PASS || echo FAIL )"
teardown_fx

# ---- NC3: T5 — R5_NEGCTL_KEEP_STALE_FLAG (extended A22b) ----
echo "## NC3 (T5): RETRY-REFUSED clears the stale restored flag" | tee -a "$OUT"
ensure_fx || { echo "ABORT: cannot build fixture $FX" | tee -a "$OUT"; exit 3; }
P11_ONLY=22b R5_NEGCTL_KEEP_STALE_FLAG=1 bash p6_acceptance_suite.sh > $NCDIR/nc3_with.log 2>&1
EV3W=$(ls -t $PC/r5_p6_acceptance_*.md 2>/dev/null | head -1)
P11_ONLY=22b bash p6_acceptance_suite.sh > $NCDIR/nc3_without.log 2>&1
EV3O=$(ls -t $PC/r5_p6_acceptance_*.md 2>/dev/null | head -1)
suite_line 22b "$EV3W" | tee -a "$OUT"
suite_line 22b "$EV3O" | tee -a "$OUT"
nc_line 3 "$(nc_status_e "$EV3W" 22b)" "$(nc_status_e "$EV3O" 22b)"

# ---- NC4: T6 — R5_NEGCTL_HASH_FROM_LIVE_LATE (snapshot coherence) ----
echo "## NC4 (T6): hash(stage) == hash(live) coherence" | tee -a "$OUT"
ensure_fx || { echo "ABORT: cannot build fixture $FX" | tee -a "$OUT"; exit 3; }
P11_ONLY=31 R5_NEGCTL_HASH_FROM_LIVE_LATE=1 bash p6_acceptance_suite.sh > $NCDIR/nc4_with.log 2>&1
EV4W=$(ls -t $PC/r5_p6_acceptance_*.md 2>/dev/null | head -1)
P11_ONLY=31 bash p6_acceptance_suite.sh > $NCDIR/nc4_without.log 2>&1
EV4O=$(ls -t $PC/r5_p6_acceptance_*.md 2>/dev/null | head -1)
suite_line 31 "$EV4W" | tee -a "$OUT"
suite_line 31 "$EV4O" | tee -a "$OUT"
nc_line 4 "$(nc_status_e "$EV4W" 31)" "$(nc_status_e "$EV4O" 31)"

# ---- NC5: T3 — drop one stage table on the kept r6_p10 fixture before the post-hash ----
echo "## NC5 (T3): dropped stage table -> preservation T3 assertion FAILS" | tee -a "$OUT"
build_kept_p10 $NCDIR/nc5_build_with.log || { echo "ABORT: NC5 build failed" | tee -a "$OUT"; exit 3; }
DROPSTAGE=$(SQL "SELECT table_name FROM information_schema.tables WHERE table_schema='$FX' AND table_name LIKE 'r5\\_stage\\_B3\\_r6\\_p10\\_%' LIMIT 1;")
[ -z "$DROPSTAGE" ] && { echo "ABORT: no r6_p10 stage tables found" | tee -a "$OUT"; exit 3; }
echo "dropping stage table: $DROPSTAGE" | tee -a "$OUT"
SQL "DROP TABLE IF EXISTS $FX.$DROPSTAGE;"
# run the preservation check against the kept (dropped-table) fixture: its T3
# assertion (stage inventory complete) must FAIL
bash p10_preservation_check.sh > $NCDIR/nc5_preserve_with.log 2>&1
grep -a "PRESERVATION-RESULT\|PRESERVATION-CHECK" $NCDIR/nc5_preserve_with.log | tail -3 | tee -a "$OUT"
NC5W=$(grep -c "PRESERVATION-CHECK FAIL" $NCDIR/nc5_preserve_with.log)
# baseline: a fresh kept fixture with NO dropped table (complete inventory)
# -> the preservation check PASSES
build_kept_p10 $NCDIR/nc5_build_without.log || { echo "ABORT: NC5 without-build failed" | tee -a "$OUT"; exit 3; }
bash p10_preservation_check.sh > $NCDIR/nc5_preserve_without.log 2>&1
grep -a "PRESERVATION-RESULT\|PRESERVATION-CHECK" $NCDIR/nc5_preserve_without.log | tail -3 | tee -a "$OUT"
NC5WO=$(grep -c "PRESERVATION-CHECK PASS" $NCDIR/nc5_preserve_without.log)
nc_line 5 "$( [ "$NC5W" -ge 1 ] && echo FAIL || echo PASS )" "$( [ "$NC5WO" -ge 1 ] && echo PASS || echo FAIL )"
teardown_fx

echo "=== P11 NEGATIVE CONTROLS: DISCRIMINATING=$PASSLINE NOT-DISCRIMINATING=$FAILLINE ===" | tee -a "$OUT"
echo "evidence: $OUT"
[ "$FAILLINE" = "0" ] && exit 0 || exit 1
