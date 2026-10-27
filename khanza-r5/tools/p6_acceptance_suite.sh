#!/bin/bash
# P6 acceptance suite on populated ${FX} — machine-asserted checks.
# Revised 2026-10-16 (pre-run review): every check now asserts the specific log
# line of the gate it claims to exercise (not just an exit code another gate can
# also produce), A10 runs on a SCRATCH ledger copy (never the live sik_bench
# ledger), and an EXIT trap restores the live harness config / A2 price /
# A10 trigger even if the suite dies part-way.
# P7 (2026-10-17): the suite EXITS NON-ZERO on any FAIL (it used to end on an echo);
# A14 self-tests that exit path, A15 a fail-closed restore with a missing hash, A16 the
# live-target refusal; A10b checks tax exactly; A13 also guards live sik output tables.
# P8 (2026-10-18): A10b also checks tax-row cardinality and A10d plants a duplicate and a
# wrong tax row (both must be caught); A10e proves a DR rebuild keeps a non-DR row; A11
# no longer claims "every restore" (A15/A18's deliberate unverified restores are
# counted separately); A17 refuses a live fixture; A18-A21 inject recovery faults
# (corrupt hash, surviving writer, interrupted restore, retry of a FAILED batch);
# earlier results are archived, never deleted.
# P9 (2026-10-18): per-batch hash files; FAILED batches keep their stage tables until
# --retry-failed bills them or --abandon-failed releases them; A22/A22b retry after a
# post-verification change; A23 two batches, stop at FAILED; A24 server-side fencing;
# A25 source-content drift; cleanup never drops unverified recovery tables;
# P9_FORCE_FAIL_CHECK=<id> fails one REAL check (terminal-path test, see
# p9_terminal_path_check.sh); P9_QUICK=1 runs only A0 + the live guards.
# P10 (2026-10-18): A26 malformed tariff amount fails closed; A27 price drift after
# freeze; A28 a failed re-backup keeps the earlier staged rows; A29 writer exclusion
# during restores; P10_INJECT=1 (with P9_FORCE_FAIL_CHECK=30) runs A0 + the A30 real
# failure with populated stage tables + the live guards, for p10_preservation_check.sh.
# P11 (2026-10-19): discriminating negative controls. R5_NEGCTL_* switches are inert
# unless set (each deliberately breaks one property; the check must FAIL with it on and
# PASS without it): R5_NEGCTL_BACKUP_NO_TXN (A28' pre-P10 autocommit re-backup),
# R5_NEGCTL_SKIP_IMMEDIATE_RESTORE (preserve-3 assertion), R5_NEGCTL_KEEP_STALE_FLAG
# (A22b'), R5_NEGCTL_HASH_FROM_LIVE_LATE (A32 pre-P11 live-late hash). P11_ONLY=<ids>
# runs only the named checks plus A0 and A13. The P10_INJECT block records the
# PRE-OPERATION snapshot before the injected run (P11-T2). P11_FORCE_FAIL=<n> is
# honoured by p10_preservation_check.sh (keep-on-fail + EXIT trap, P11-T7).
set -u
cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1
FX=${FX:-sik_p6f}  # fixture DB: full clone of sik + 5 STRATA- reg rows
# P8-B4: the suite mutates its fixture with direct SQL; never let that be a live DB
case "$FX" in sik|sik_bench|mysql|information_schema|performance_schema|sys|"")
  echo "LIVE-FIXTURE-REFUSED: FX=$FX is not a disposable fixture (use a clone such as sik_p6f)"; exit 3;; esac
TS=$(date -u +%Y%m%dT%H%M%SZ)
mkdir -p /opt/dr-benchmark/p-chain
OUT=/opt/dr-benchmark/p-chain/r5_p6_acceptance_${TS}.md
PASS=0; FAIL=0; SUMMARY=""
check() {
  local st=$3 lbl=$2
  if [ -n "${P9_FORCE_FAIL_CHECK:-}" ] && [ "$1" = "$P9_FORCE_FAIL_CHECK" ]; then st=1; lbl="$2 [FORCED FAIL by P9_FORCE_FAIL_CHECK]"; fi
  set -- "$1" "$lbl" "$st"
  if [ "$3" = "0" ]; then echo "A$1: PASS — $2" | tee -a "$OUT"; PASS=$((PASS+1)); SUMMARY="$SUMMARY| A$1 | PASS | $2 |"$'\n';
  else echo "A$1: FAIL — $2" | tee -a "$OUT"; FAIL=$((FAIL+1)); SUMMARY="$SUMMARY| A$1 | **FAIL** | $2 |"$'\n'; fi
}
# P11 selective mode: P11_ONLY=<check ids> (space- or comma-separated) runs ONLY the
# named P11 checks plus A0 (the fixture guard, above) and A13 (the live guard, below);
# the long A1–A29 harness/builder section is skipped. sel <id> returns 0 when the id is
# requested (or P11_ONLY is unset, i.e. the full suite).
ONLY=${P11_ONLY:-}
ONLY=${ONLY//,/ }
sel() { local id=$1; [ -z "$ONLY" ] && return 0; case " $ONLY " in *" $id "*) return 0;; *) return 1;; esac; }
SKIP_LONG=${P11_ONLY:-}
res() { echo "$1" | tee -a "$OUT"; }
cnt() { local n; n=$(grep -ac "$1" "$2" 2>/dev/null); echo "${n:-0}"; }
javacount() { pgrep -f "BilingHarness" | wc -l | tr -d ' '; }
SQL() { mysql -uroot -N -e "$1"; }

# P7-1 exit-path self-test (no DB, no config): P7_EXIT_TEST=fail must exit 1, =pass exit 0
if [ -n "${P7_EXIT_TEST:-}" ]; then
  OUT=/dev/null
  check 99 "exit-path self-test" $([ "$P7_EXIT_TEST" = "pass" ] && echo 0 || echo 1)
  [ "$FAIL" = "0" ] && exit 0 || exit 1
fi

# The harness/consumer read setting/database.xml (AES-encrypted DATABASE),
# NOT database.ini: retarget via p6_dbxml.py (backup + verify), restore on EXIT.
DBXML="python3 /opt/Deers-Rock/tools/p6_dbxml.py"
A2_KODE=""; A2_B=""; A2_T=""
cleanup() {
  $DBXML restore >> /tmp/r6_dbxml.log 2>&1
  if [ -n "$A2_KODE" ] && [ -n "$A2_B" ]; then
    SQL "UPDATE ${FX}.detail_pemberian_obat SET biaya_obat=$A2_B, total=$A2_T WHERE no_rawat='2026/10/01/800085' AND kode_brng='$A2_KODE';"
  fi
  SQL "DROP TRIGGER IF EXISTS ${FX}.p6_a10c_fail;" 2>/dev/null
  pkill -f BilingHarness 2>/dev/null
  true
}
trap cleanup EXIT

{
echo "# P6 acceptance suite — populated ${FX}"
echo "Date: $(date -u '+%Y-%m-%d %H:%M') UTC · run $TS"
echo "Tools: $(cd /opt/Deers-Rock/tools && sha256sum sampled_real_form_diff_r5.py dbutil.py build_dr_charge_ledger_p2.py | awk '{print substr($1,1,12)" "$2}' | tr '\n' ';')"
echo "Fixture: ${FX} (full mysqldump clone of live sik + the 5 P4 STRATA- reg rows; the earlier targeted sik_p6 copy left reference tables such as akun_bayar empty). A10 on a scratch ledger copy inside ${FX}."
echo ""
} > "$OUT"

# ---- live-state guards (must be identical at the end) ----
ledger_hash() {
  python3 - "$1" <<'PY'
import sys, hashlib
sys.path.insert(0,'/opt/Deers-Rock/tools')
import dbutil
rows = dbutil.query(sys.argv[1], "SELECT * FROM dr_charge_ledger ORDER BY no_rawat, component, code")
h = hashlib.sha256()
for r in rows: h.update(("|".join(str(c) for c in r) + "\n").encode())
print("%d:%s" % (len(rows), h.hexdigest()))
PY
}
LIVE_LEDGER_PRE=$(ledger_hash sik_bench)
# P7-6: live sik output tables must be untouched by the whole suite
live_sik() { SQL "CHECKSUM TABLE sik.billing, sik.nota_jalan, sik.detail_nota_jalan, sik.piutang_pasien, sik.detail_piutang_pasien, sik.reg_periksa EXTENDED" | awk '{print $2}' | tr '\n' ':'; }
LIVE_SIK_PRE=$(live_sik)
res "live guard pre: sik output-table checksums $LIVE_SIK_PRE"
XML_PRE=$($DBXML probe 2>&1 | awk '{print $NF}' | sort -u | tr '\n' ' ')
res "live guard pre: sik_bench ledger $LIVE_LEDGER_PRE · database.xml targets: $XML_PRE"
if [ "$XML_PRE" != "sik " ]; then res "ABORT: database.xml not on sik before the suite"; exit 3; fi

# ---- fixture guard ----
STRATA_CNT=$(SQL "SELECT COUNT(*) FROM ${FX}.reg_periksa WHERE no_rawat LIKE 'STRATA-%';")
res "fixture guard: ${FX} STRATA- reg rows = $STRATA_CNT (need 5)"
check 0 "fixture: 5 STRATA- reg rows present (date-resolved, P6-2a precondition)" $([ "$STRATA_CNT" = "5" ] && echo 0 || echo 1)
LEFT0=$(SQL "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${FX}' AND table_name LIKE 'r5_stage_%';")
res "fixture guard: pre-existing stage tables on ${FX} = $LEFT0"
# P10: the harness account's grants on the fixture must be the same at the end (A31)
bench_grants() { SQL "SELECT COALESCE(GROUP_CONCAT(privilege_type ORDER BY privilege_type), 'none') FROM information_schema.schema_privileges WHERE grantee=\"'benchmark'@'localhost'\" AND table_schema='${FX}';"; }
GR0=$(bench_grants)
res "fixture guard: benchmark grants on ${FX} = $GR0"

# point the harness at ${FX}
$DBXML retarget ${FX} > /tmp/r6_dbxml.log 2>&1
if ! grep -q "RETARGET-VERIFIED ${FX}" /tmp/r6_dbxml.log; then res "ABORT: database.xml retarget to ${FX} not verified"; cat /tmp/r6_dbxml.log; exit 3; fi
res "harness+consumer database.xml -> ${FX} (RETARGET-VERIFIED; restored by EXIT trap)"

# real out-of-envelope visits (>2 procedures, nonempty billing baseline). No
# visit in sik/${FX} has nonzero embalase/tuslah, and the STRATA- reg rows have
# no source/billing rows, so they are only used where emptiness IS the test.
printf "2026/03/14/000001\n2026/05/12/000001\n2026/07/22/000004\n2026/09/09/000001\n" > /tmp/r6_strata.txt
# clean set: DR-cohort visits that billed sukses=true in the 2026-10-12 B3 run
# (native visits such as 000254 are rejected by the form outside the DR cohort)
printf "2026/10/01/800085\n2026/10/01/800128\n" > /tmp/r6_clean.txt
printf "NO-SUCH-REG-ROW\n" > /tmp/r6_missing.txt
printf "STRATA-ZEROFEE\n" > /tmp/r6_strata_zero.txt
# P8-B4: archive the previous run's results and logs instead of deleting them
ARCH=/opt/dr-benchmark/results/archive/$TS; mkdir -p "$ARCH"
mv /opt/dr-benchmark/results/r6_* "$ARCH"/ 2>/dev/null
mv /tmp/r6_a*.log /tmp/r6_fz_*.log /tmp/r6_*.saved "$ARCH"/ 2>/dev/null
res "previous suite results/logs archived to $ARCH ($(ls "$ARCH" | wc -l) entries)"

ORACLE="python3 sampled_real_form_diff_r5.py --db-name ${FX}"
# a billing run requires a frozen baseline from a prior --freeze-only pass on
# the same RUN_ID/stage (otherwise: "RESUME blocked: no manifest", exit 3)
freeze() { local rid=$1 stg=$2; shift 2
  env RUN_ID=$rid $ORACLE --stage $stg "$@" --freeze-only > /tmp/r6_fz_${rid}_${stg}.log 2>&1
  local rc=$?; res "  freeze $rid/$stg exit=$rc"; return $rc; }

# cleanup helper: put a run's batches back from their kept stage tables (hash file put
# back first so the restore is verified), and drop the stage tables ONLY if every batch's
# restore verified (P9-A4: an unverified restore keeps the only copy of the rows)
restore_kept() { local rid=$1 hfile=$2 saved=$3
  [ -n "$hfile" ] && [ -f "$saved" ] && cp "$saved" "$hfile"
  python3 - "$FX" "$rid" <<'PY'
import sys, json
sys.path.insert(0, '/opt/Deers-Rock/tools')
import sampled_real_form_diff_r5 as o
fx, rid = sys.argv[1], sys.argv[2]; rd = '/opt/dr-benchmark/results/%s/B3_oracle_run_r5' % rid
st = json.load(open(rd + '/.state.json'))
ok = all(o.stage_restore(b['visits'], fx, rd, print, rid, stage='B3', batch=d)
         for d, b in sorted(st['batches'].items()) if b.get('status') != 'PENDING')
print('restore_verified', ok)
print('stage_drop', o.stage_drop(fx, rid, print, stage='B3') if ok else 'SKIPPED (restore not verified; stage tables kept)')
PY
}
stage_count() { SQL "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${FX}' AND table_name LIKE 'r5\_stage\_B3\_$1\_%';"; }

if [ -z "${P9_QUICK:-}" ] && [ -z "${P10_INJECT:-}" ] && [ -z "${P11_ONLY:-}" ]; then
 echo "=== A1: clean pass (exit 0) ==="
freeze r6_a1 B3 --visits-file /tmp/r6_clean.txt
T0=$(date +%s)
env RUN_ID=r6_a1 $ORACLE --stage B3 --visits-file /tmp/r6_clean.txt > /tmp/r6_a1.log 2>&1
RC=$?; A1_SECS=$(( $(date +%s) - T0 ))
grep -a "verdict\|ORACLE_" /tmp/r6_a1.log | tail -1 | tee -a "$OUT"
check 1 "A1 clean in-envelope baseline -> matching output -> exit 0" $([ "$RC" = "0" ] && echo 0 || echo 1)
res "A1 exit=$RC wall=${A1_SECS}s"

echo "=== A2: controlled in-envelope row mismatch (exit 1 via verdict path) ==="
A2_KODE=$(SQL "SELECT kode_brng FROM ${FX}.detail_pemberian_obat WHERE no_rawat='2026/10/01/800085' ORDER BY kode_brng LIMIT 1;")
A2_B=$(SQL "SELECT biaya_obat FROM ${FX}.detail_pemberian_obat WHERE no_rawat='2026/10/01/800085' AND kode_brng='$A2_KODE';")
A2_T=$(SQL "SELECT total FROM ${FX}.detail_pemberian_obat WHERE no_rawat='2026/10/01/800085' AND kode_brng='$A2_KODE';")
# The form bills a drug line at detail_pemberian_obat.biaya_obat (NOT the
# databarang.ralan master price — perturbing that left the bill unchanged).
# Perturb the source line, then freeze (the frozen consumer baseline is the
# existing billing rows at the true price), then bill: the form's Obat row
# must disagree with the baseline -> in-envelope drift -> exit 1.
SQL "UPDATE ${FX}.detail_pemberian_obat SET biaya_obat=biaya_obat+1000, total=total+1000*jml WHERE no_rawat='2026/10/01/800085' AND kode_brng='$A2_KODE';"
freeze r6_a2 B3 --visits-file /tmp/r6_clean.txt
env RUN_ID=r6_a2 $ORACLE --stage B3 --visits-file /tmp/r6_clean.txt > /tmp/r6_a2.log 2>&1
RC=$?
SQL "UPDATE ${FX}.detail_pemberian_obat SET biaya_obat=$A2_B, total=$A2_T WHERE no_rawat='2026/10/01/800085' AND kode_brng='$A2_KODE';"; A2_KODE=""
TB=$(cnt "Traceback" /tmp/r6_a2.log)
grep -a "verdict\|ORACLE_" /tmp/r6_a2.log | tail -1 | tee -a "$OUT"
check 2 "A2 in-envelope mismatch -> exit 1 via verdict path (no traceback)" $([ "$RC" = "1" ] && [ "$TB" = "0" ] && echo 0 || echo 1)
res "A2 exit=$RC tracebacks=$TB drift_visits=$(awk -F, 'NR>1 && $9=="True"' $(find /opt/dr-benchmark/results/r6_a2 -name '*.csv' | head -1) 2>/dev/null | wc -l) (biaya_obat of one drug line +1000 before freeze, reverted)"
# A2 left perturbed-price billing rows: re-bill at the true price so later
# checks freeze a true baseline (this run itself is expected to exit 1)
freeze r6_a2fix B3 --visits-file /tmp/r6_clean.txt
env RUN_ID=r6_a2fix $ORACLE --stage B3 --visits-file /tmp/r6_clean.txt > /tmp/r6_a2fix.log 2>&1
res "A2 cleanup re-bill exit=$?"

echo "=== A3/A6: 4 real out-of-envelope visits (>2 procedures) -> exit 4, 4 OOE rows, no restore mismatch ==="
freeze r6_a3 B3 --visits-file /tmp/r6_strata.txt --allow-strata
env RUN_ID=r6_a3 $ORACLE --stage B3 --visits-file /tmp/r6_strata.txt --allow-strata > /tmp/r6_a3.log 2>&1
RC=$?
CSV=$(find /opt/dr-benchmark/results/r6_a3 -name "*sampled_form_diff_r5*.csv" 2>/dev/null | head -1)
OOE=$(cnt "OUT-OF-ENVELOPE" "${CSV:-/dev/null}")
MISM=$(cnt "STAGE-RESTORE-MISMATCH" /tmp/r6_a3.log)
TB=$(cnt "Traceback" /tmp/r6_a3.log)
grep -a "verdict\|ORACLE_\|FAILED (\|STAGE-RESTORED-VERIFIED" /tmp/r6_a3.log | tail -3 | tee -a "$OUT"
[ -n "$CSV" ] && cat "$CSV" | tee -a "$OUT"
check 3 "A3 out-of-envelope run -> exit 4 (PARTIAL-NOT-COVERED), no traceback, no restore mismatch" $([ "$RC" = "4" ] && [ "$TB" = "0" ] && [ "$MISM" = "0" ] && echo 0 || echo 1)
check 6 "A6 4 OUT-OF-ENVELOPE CSV rows for the 4 real >2-procedure visits" $([ "$OOE" = "4" ] && echo 0 || echo 1)
res "A3/A6 exit=$RC ooe_rows=$OOE restore_mismatch=$MISM tracebacks=$TB csv=$CSV"

echo "=== A4: harness timeout -> process-group kill -> writer-dead proof -> verified restore -> exit 4 ==="
freeze r6_a4 B3 --visits-file /tmp/r6_clean.txt
env RUN_ID=r6_a4 R5_HARNESS_TIMEOUT_S=3 $ORACLE --stage B3 --visits-file /tmp/r6_clean.txt > /tmp/r6_a4.log 2>&1
RC=$?
sleep 3; J=$(javacount)
PROOF=$(cnt "WRITER-DEAD-PROOF .*group_empty=true" /tmp/r6_a4.log)
RV=$(cnt "STAGE-RESTORED-VERIFIED" /tmp/r6_a4.log)
grep -a "WRITER-DEAD-PROOF\|STAGE-RESTOR\|FAILED (" /tmp/r6_a4.log | head -3 | tee -a "$OUT"
check 4 "A4 timeout(3s, below JVM start+login) -> group_empty=true proof + verified restore + exit 4 + 0 java left" $([ "$RC" = "4" ] && [ "$PROOF" -ge 1 ] && [ "$RV" -ge 1 ] && [ "$J" = "0" ] && echo 0 || echo 1)
env RUN_ID=r6_a3 $ORACLE --stage B3 --visits-file /tmp/r6_strata.txt --allow-strata --abandon-failed > /tmp/r6_a3_abandon.log 2>&1
env RUN_ID=r6_a4 $ORACLE --stage B3 --visits-file /tmp/r6_clean.txt --abandon-failed > /tmp/r6_a4_abandon.log 2>&1
res "A3/A4 held FAILED batches released: a3 abandon_lines=$(cnt ABANDON-FAILED /tmp/r6_a3_abandon.log) a4 abandon_lines=$(cnt ABANDON-FAILED /tmp/r6_a4_abandon.log) stage_tables a3=$(stage_count r6_a3) a4=$(stage_count r6_a4)"
res "A4 exit=$RC proof_lines=$PROOF restored_verified=$RV java_after=$J (A1 harness+run wall ${A1_SECS}s; the 3s cap fires before the first visit completes)"

echo "=== A4b: SIGTERM to the oracle mid-harness -> handler kills the group -> exit 4; resume restores ==="
freeze r6_a4b B3 --visits-file /tmp/r6_clean.txt
env RUN_ID=r6_a4b $ORACLE --stage B3 --visits-file /tmp/r6_clean.txt > /tmp/r6_a4b.log 2>&1 &
PID=$!
for _ in $(seq 1 120); do [ "$(javacount)" != "0" ] && break; sleep 1; done
JB=$(javacount); sleep 1
kill -TERM $PID 2>/dev/null; wait $PID; RC=$?
sleep 3; JA=$(javacount)
SIG=$(cnt "SIGNAL 15: .*group_empty=true" /tmp/r6_a4b.log)
env RUN_ID=r6_a4b $ORACLE --stage B3 --visits-file /tmp/r6_clean.txt > /tmp/r6_a4b_resume.log 2>&1
RCR=$?
RV=$(cnt "STAGE-RESTORED-VERIFIED" /tmp/r6_a4b_resume.log)
grep -a "SIGNAL" /tmp/r6_a4b.log | tail -1 | tee -a "$OUT"
check 4b "A4b SIGTERM: java before=$JB after=$JA, exit 4, group proof; resume verified restore + exit 0" $([ "$JB" != "0" ] && [ "$JA" = "0" ] && [ "$RC" = "4" ] && [ "$SIG" -ge 1 ] && [ "$RV" -ge 1 ] && [ "$RCR" = "0" ] && echo 0 || echo 1)
res "A4b exit=$RC signal_proof=$SIG resume_exit=$RCR resume_restored_verified=$RV"

echo "=== A5: missing reg row -> structured MISSING-REG rejection (exit 2) ==="
# --allow-strata so the visit passes the eligibility gate and reaches P6-2a
env RUN_ID=r6_a5 $ORACLE --stage B3 --visits-file /tmp/r6_missing.txt --allow-strata > /tmp/r6_a5.log 2>&1
RC=$?
MR=$(cnt "MISSING-REG (P6-2a)" /tmp/r6_a5.log); TB=$(cnt "Traceback" /tmp/r6_a5.log)
grep -a "MISSING-REG" /tmp/r6_a5.log | head -1 | tee -a "$OUT"
check 5 "A5 MISSING-REG line present + exit 2 + no traceback" $([ "$RC" = "2" ] && [ "$MR" -ge 1 ] && [ "$TB" = "0" ] && echo 0 || echo 1)
res "A5 exit=$RC missing_reg_lines=$MR tracebacks=$TB"

echo "=== A7: empty-baseline gate ==="
env RUN_ID=r6_a7 $ORACLE --stage B3 --visits-file /tmp/r6_strata_zero.txt --allow-strata --freeze-only > /tmp/r6_a7.log 2>&1
RC=$?
EB=$(cnt "EMPTY-BASELINE" /tmp/r6_a7.log)
env RUN_ID=r6_a7b $ORACLE --stage B3 --visits-file /tmp/r6_strata_zero.txt --allow-strata --freeze-only --allow-empty-baseline > /tmp/r6_a7b.log 2>&1
RCB=$?
grep -a "EMPTY-BASELINE" /tmp/r6_a7.log | head -1 | tee -a "$OUT"
check 7 "A7 zero-row baseline refused (EMPTY-BASELINE line + exit 2); with --allow-empty-baseline freeze proceeds (exit 0)" $([ "$RC" = "2" ] && [ "$EB" -ge 1 ] && [ "$RCB" = "0" ] && echo 0 || echo 1)
res "A7 exit=$RC empty_baseline_lines=$EB · with flag exit=$RCB"

echo "=== A8: kill right after the batch reset (restore-injection point), resume -> verified restore + re-bill, exit 0 ==="
freeze r6_a8 B3 --visits-file /tmp/r6_clean.txt
env RUN_ID=r6_a8 $ORACLE --stage B3 --visits-file /tmp/r6_clean.txt > /tmp/r6_a8.log 2>&1 &
PID=$!
for _ in $(seq 1 240); do grep -q "reset 2 visits" /tmp/r6_a8.log 2>/dev/null && break; sleep 0.25; done
kill -TERM $PID 2>/dev/null; wait $PID; RCK=$?
RESET_SEEN=$(cnt "reset 2 visits" /tmp/r6_a8.log)
env RUN_ID=r6_a8 $ORACLE --stage B3 --visits-file /tmp/r6_clean.txt > /tmp/r6_a8_resume.log 2>&1
RC=$?
MISM=$(cnt "STAGE-RESTORE-MISMATCH" /tmp/r6_a8_resume.log)
grep -a "STAGE-RESTOR\|stage-restore\|verdict" /tmp/r6_a8_resume.log | head -3 | tee -a "$OUT"
RV8=$(cnt "STAGE-RESTORED-VERIFIED" /tmp/r6_a8_resume.log)
check 8 "A8 killed after reset (exit 4) -> resume STAGE-RESTORED-VERIFIED + re-bill exit 0, no mismatch, 0 java left" $([ "$RESET_SEEN" -ge 1 ] && [ "$RCK" = "4" ] && [ "$RV8" -ge 1 ] && [ "$RC" = "0" ] && [ "$MISM" = "0" ] && [ "$(javacount)" = "0" ] && echo 0 || echo 1)
res "A8 killed_exit=$RCK resume_exit=$RC restore_mismatch=$MISM"

echo "=== A8b: resume binding — changed visit set on resume aborts (exit 3) ==="
env RUN_ID=r6_a8b $ORACLE --stage B3 --visits-file /tmp/r6_clean.txt --freeze-only > /tmp/r6_a8b_freeze.log 2>&1
# clean set: DR-cohort visits that billed sukses=true in the 2026-10-12 B3 run
# (native visits such as 000254 are rejected by the form outside the DR cohort)
printf "2026/10/01/800085\n" > /tmp/r6_clean_one.txt
env RUN_ID=r6_a8b $ORACLE --stage B3 --visits-file /tmp/r6_clean_one.txt > /tmp/r6_a8b.log 2>&1
RC=$?
RA=$(cnt "RESUME-ABORT (P6-2f)" /tmp/r6_a8b.log)
check 8b "A8b changed sample on resume -> RESUME-ABORT line + exit 3" $([ "$RC" = "3" ] && [ "$RA" -ge 1 ] && echo 0 || echo 1)
res "A8b exit=$RC resume_abort_lines=$RA"

echo "=== A9: same RUN_ID, different stage -> disjoint stage prefixes (P6-2d) ==="
freeze r6_a9 B3 --visits-file /tmp/r6_clean.txt
env RUN_ID=r6_a9 $ORACLE --stage B3 --visits-file /tmp/r6_clean.txt > /tmp/r6_a9_B3.log 2>&1
freeze r6_a9 B2 --visits-file /tmp/r6_clean.txt
env RUN_ID=r6_a9 $ORACLE --stage B2 --visits-file /tmp/r6_clean.txt > /tmp/r6_a9_B2.log 2>&1
P3=$(cnt "stage-backup .* r5_stage_B3_r6_a9_\*" /tmp/r6_a9_B3.log)
P2=$(cnt "stage-backup .* r5_stage_B2_r6_a9_\*" /tmp/r6_a9_B2.log)
D3=$(cnt "stage-drop r5_stage_B3_r6_a9_\* verified" /tmp/r6_a9_B3.log)
D2=$(cnt "stage-drop r5_stage_B2_r6_a9_\* verified" /tmp/r6_a9_B2.log)
check 9 "A9 B3/B2 under one RUN_ID used disjoint prefixes and each verified-dropped its own" $([ "$P3" -ge 1 ] && [ "$P2" -ge 1 ] && [ "$D3" -ge 1 ] && [ "$D2" -ge 1 ] && echo 0 || echo 1)
res "A9 backup B3=$P3 B2=$P2 · verified-drop B3=$D3 B2=$D2"

echo "=== A15: pre-reset hash missing at restore time -> STAGE-RESTORE-UNVERIFIED, FAILED, stage tables kept, exit 4 ==="
freeze r6_a15 B3 --visits-file /tmp/r6_clean.txt
env RUN_ID=r6_a15 R5_HARNESS_TIMEOUT_S=3 $ORACLE --stage B3 --visits-file /tmp/r6_clean.txt > /tmp/r6_a15.log 2>&1 &
PID=$!
for _ in $(seq 1 240); do grep -q "stage-content-hash" /tmp/r6_a15.log 2>/dev/null && break; sleep 0.25; done
H15=$(ls /opt/dr-benchmark/results/r6_a15/B3_oracle_run_r5/stage_content_hash_*.json 2>/dev/null | head -1)
[ -n "$H15" ] && cp "$H15" /tmp/r6_a15_hash.saved && rm -f "$H15"
wait $PID; RC=$?
UNV=$(cnt "STAGE-RESTORE-UNVERIFIED" /tmp/r6_a15.log); KEEP=$(cnt "STAGE-KEEP" /tmp/r6_a15.log)
STG=$(SQL "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${FX}' AND table_name LIKE 'r5_stage_B3_r6_a15%';")
RST=$(python3 -c "import json;st=json.load(open('/opt/dr-benchmark/results/r6_a15/B3_oracle_run_r5/.state.json'));print(','.join(str(b.get('restored')) for b in st['batches'].values()))" 2>/dev/null)
grep -a "STAGE-RESTORE-UNVERIFIED\|STAGE-KEEP\|FAILED (" /tmp/r6_a15.log | head -3 | cut -c1-200 | tee -a "$OUT"
check 15 "A15 missing pre-reset hash -> STAGE-RESTORE-UNVERIFIED + exit 4 + restored=False + stage tables kept (STAGE-KEEP)" $([ "$UNV" -ge 1 ] && [ "$RC" = "4" ] && [ "$KEEP" -ge 1 ] && [ "$STG" -gt 0 ] && [ "$RST" = "False" ] && echo 0 || echo 1)
res "A15 exit=$RC unverified_lines=$UNV stage_keep_lines=$KEEP stage_tables_kept=$STG restored=$RST java_after=$(javacount)"
# put the two visits back from the kept stage tables (hash file put back first, so this
# cleanup restore is itself hash-verified), then drop them (the fixture must end clean)
[ -n "$H15" ] && cp /tmp/r6_a15_hash.saved "$H15"
restore_kept r6_a15 "" "" >> /tmp/r6_a15_cleanup.log 2>&1
res "A15 cleanup: $(tail -2 /tmp/r6_a15_cleanup.log | tr '\n' ' ')"

echo "=== A16: billing run against live sik without --allow-live -> LIVE-TARGET-REFUSED, exit 3 ==="
env RUN_ID=r6_a16 python3 sampled_real_form_diff_r5.py --db-name sik --stage B3 --visits-file /tmp/r6_clean.txt > /tmp/r6_a16.log 2>&1
RC=$?
REF=$(cnt "LIVE-TARGET-REFUSED" /tmp/r6_a16.log)
check 16 "A16 live target refused without --allow-live (exit 3, LIVE-TARGET-REFUSED)" $([ "$RC" = "3" ] && [ "$REF" -ge 1 ] && echo 0 || echo 1)
res "A16 exit=$RC refused_lines=$REF"

# ---- P8-C: recovery fault injection (through the same oracle the wrapper runs) ----
restored_flags() { python3 -c "import json;st=json.load(open('/opt/dr-benchmark/results/$1/B3_oracle_run_r5/.state.json'));print(','.join(str(b.get('restored')) for b in st['batches'].values()))" 2>/dev/null; }

echo "=== A18a: garbled pre-reset hash file -> STAGE-RESTORE-UNVERIFIED (no traceback), FAILED, kept, exit 4 ==="
freeze r6_a18 B3 --visits-file /tmp/r6_clean.txt
env RUN_ID=r6_a18 R5_HARNESS_TIMEOUT_S=3 $ORACLE --stage B3 --visits-file /tmp/r6_clean.txt > /tmp/r6_a18.log 2>&1 &
PID=$!
for _ in $(seq 1 240); do grep -q "stage-content-hash" /tmp/r6_a18.log 2>/dev/null && break; sleep 0.25; done
H18=$(ls /opt/dr-benchmark/results/r6_a18/B3_oracle_run_r5/stage_content_hash_*.json 2>/dev/null | head -1)
[ -n "$H18" ] && cp "$H18" /tmp/r6_a18_hash.saved && printf '{"pfx": "r5_stage_B3_r6_a18", "sha2' > "$H18"
wait $PID; RC=$?
UNV=$(cnt "STAGE-RESTORE-UNVERIFIED .*hash file unreadable" /tmp/r6_a18.log); TB=$(cnt "Traceback" /tmp/r6_a18.log)
KEEP=$(cnt "STAGE-KEEP" /tmp/r6_a18.log); RST=$(restored_flags r6_a18)
grep -a "STAGE-RESTORE-UNVERIFIED\|STAGE-KEEP" /tmp/r6_a18.log | head -2 | cut -c1-200 | tee -a "$OUT"
restore_kept r6_a18 "$H18" /tmp/r6_a18_hash.saved > /tmp/r6_a18_cleanup.log 2>&1
CL=$(grep -c "restore_verified True\|stage_drop True" /tmp/r6_a18_cleanup.log)
check 18a "A18a garbled hash file -> 'hash file unreadable' UNVERIFIED, no traceback, exit 4, restored=False, STAGE-KEEP; cleanup restore verified + dropped" $([ -n "$H18" ] && [ "$UNV" -ge 1 ] && [ "$TB" = "0" ] && [ "$RC" = "4" ] && [ "$RST" = "False" ] && [ "$KEEP" -ge 1 ] && [ "$CL" = "2" ] && echo 0 || echo 1)
res "A18a exit=$RC unverified_unreadable=$UNV tracebacks=$TB restored=$RST stage_keep=$KEEP cleanup_ok_lines=$CL"

echo "=== A18b: hash file valid but with a wrong sha256 -> STAGE-RESTORE-MISMATCH, FAILED, kept, exit 4 ==="
freeze r6_a18b B3 --visits-file /tmp/r6_clean.txt
env RUN_ID=r6_a18b R5_HARNESS_TIMEOUT_S=3 $ORACLE --stage B3 --visits-file /tmp/r6_clean.txt > /tmp/r6_a18b.log 2>&1 &
PID=$!
for _ in $(seq 1 240); do grep -q "stage-content-hash" /tmp/r6_a18b.log 2>/dev/null && break; sleep 0.25; done
H18B=$(ls /opt/dr-benchmark/results/r6_a18b/B3_oracle_run_r5/stage_content_hash_*.json 2>/dev/null | head -1)
[ -n "$H18B" ] && cp "$H18B" /tmp/r6_a18b_hash.saved && python3 -c "import json,sys;p=sys.argv[1];m=json.load(open(p));m['sha256']='0'*64;json.dump(m,open(p,'w'))" "$H18B"
wait $PID; RC=$?
MM=$(cnt "STAGE-RESTORE-MISMATCH" /tmp/r6_a18b.log); TB=$(cnt "Traceback" /tmp/r6_a18b.log)
KEEP=$(cnt "STAGE-KEEP" /tmp/r6_a18b.log); RST=$(restored_flags r6_a18b)
restore_kept r6_a18b "$H18B" /tmp/r6_a18b_hash.saved > /tmp/r6_a18b_cleanup.log 2>&1
CL=$(grep -c "restore_verified True\|stage_drop True" /tmp/r6_a18b_cleanup.log)
check 18b "A18b wrong sha256 in hash file -> STAGE-RESTORE-MISMATCH, no traceback, exit 4, restored=False, STAGE-KEEP; cleanup restore verified + dropped" $([ -n "$H18B" ] && [ "$MM" -ge 1 ] && [ "$TB" = "0" ] && [ "$RC" = "4" ] && [ "$RST" = "False" ] && [ "$KEEP" -ge 1 ] && [ "$CL" = "2" ] && echo 0 || echo 1)
res "A18b exit=$RC mismatch_lines=$MM tracebacks=$TB restored=$RST stage_keep=$KEEP cleanup_ok_lines=$CL"

echo "=== A19: SIGKILL the oracle mid-harness (its signal handler cannot run) -> the JVM survives; resume kills it, proves quiet, restores, re-bills ==="
freeze r6_a19 B3 --visits-file /tmp/r6_clean.txt
env RUN_ID=r6_a19 $ORACLE --stage B3 --visits-file /tmp/r6_clean.txt > /tmp/r6_a19.log 2>&1 &
PID=$!
for _ in $(seq 1 120); do [ "$(javacount)" != "0" ] && break; sleep 1; done
sleep 1; kill -KILL $PID 2>/dev/null; wait $PID; RCK=$?
sleep 1; JS=$(javacount)
env RUN_ID=r6_a19 $ORACLE --stage B3 --visits-file /tmp/r6_clean.txt > /tmp/r6_a19_resume.log 2>&1
RC=$?
PROOF=$(cnt "WRITER-DEAD-PROOF (resume, P8-C2).*killed=\[.*dead" /tmp/r6_a19_resume.log)
RV=$(cnt "STAGE-RESTORED-VERIFIED" /tmp/r6_a19_resume.log); JA=$(javacount)
grep -a "WRITER-DEAD-PROOF (resume\|WRITER-ALIVE\|STAGE-RESTOR" /tmp/r6_a19_resume.log | head -2 | cut -c1-200 | tee -a "$OUT"
check 19 "A19 surviving writer after SIGKILL (java left=$JS) -> resume kills its group + quiet proof + verified restore + re-bill exit 0, 0 java left" $([ "$RCK" = "137" ] && [ "$JS" -ge 1 ] && [ "$PROOF" -ge 1 ] && [ "$RV" -ge 1 ] && [ "$RC" = "0" ] && [ "$JA" = "0" ] && echo 0 || echo 1)
res "A19 killed_exit=$RCK java_after_kill=$JS resume_exit=$RC proof_lines=$PROOF restored_verified=$RV java_after=$JA"

echo "=== A20: SIGKILL during restoration -> half-restored batch; next resume re-restores (verified) and re-bills ==="
freeze r6_a20 B3 --visits-file /tmp/r6_clean.txt
env RUN_ID=r6_a20 $ORACLE --stage B3 --visits-file /tmp/r6_clean.txt > /tmp/r6_a20.log 2>&1 &
PID=$!
for _ in $(seq 1 240); do grep -q "reset 2 visits" /tmp/r6_a20.log 2>/dev/null && break; sleep 0.25; done
kill -TERM $PID 2>/dev/null; wait $PID; RCK=$?
env RUN_ID=r6_a20 R5_FAULT_RESTORE_PAUSE_S=60 $ORACLE --stage B3 --visits-file /tmp/r6_clean.txt > /tmp/r6_a20_resume1.log 2>&1 &
PID=$!
for _ in $(seq 1 240); do grep -q "RESTORE-FAULT-PAUSE" /tmp/r6_a20_resume1.log 2>/dev/null && break; sleep 0.25; done
PAUSED=$(cnt "RESTORE-FAULT-PAUSE" /tmp/r6_a20_resume1.log)
kill -KILL $PID 2>/dev/null; wait $PID; RCK2=$?
env RUN_ID=r6_a20 $ORACLE --stage B3 --visits-file /tmp/r6_clean.txt > /tmp/r6_a20_resume2.log 2>&1
RC=$?
RV=$(cnt "STAGE-RESTORED-VERIFIED" /tmp/r6_a20_resume2.log); MISM=$(cnt "STAGE-RESTORE-MISMATCH" /tmp/r6_a20_resume2.log)
grep -a "RESTORE-FAULT-PAUSE" /tmp/r6_a20_resume1.log | head -1 | cut -c1-200 | tee -a "$OUT"
check 20 "A20 kill after reset (exit 4) -> resume SIGKILLed mid-restore (exit 137) -> next resume STAGE-RESTORED-VERIFIED + re-bill exit 0, no mismatch, 0 java left" $([ "$RCK" = "4" ] && [ "$PAUSED" -ge 1 ] && [ "$RCK2" = "137" ] && [ "$RV" -ge 1 ] && [ "$MISM" = "0" ] && [ "$RC" = "0" ] && [ "$(javacount)" = "0" ] && echo 0 || echo 1)
res "A20 first_kill_exit=$RCK paused=$PAUSED restore_kill_exit=$RCK2 resume_exit=$RC restored_verified=$RV mismatch=$MISM"

echo "=== A21: FAILED batch stays FAILED on resume; --retry-failed re-bills it from a verified state ==="
freeze r6_a21 B3 --visits-file /tmp/r6_clean.txt
env RUN_ID=r6_a21 R5_HARNESS_TIMEOUT_S=3 $ORACLE --stage B3 --visits-file /tmp/r6_clean.txt > /tmp/r6_a21.log 2>&1
RC1=$?
env RUN_ID=r6_a21 $ORACLE --stage B3 --visits-file /tmp/r6_clean.txt > /tmp/r6_a21_noretry.log 2>&1
RC2=$?; RT2=$(cnt "RETRY-FAILED" /tmp/r6_a21_noretry.log)
env RUN_ID=r6_a21 $ORACLE --stage B3 --visits-file /tmp/r6_clean.txt --retry-failed > /tmp/r6_a21_retry.log 2>&1
RC3=$?; RT3=$(cnt "RETRY-FAILED (P9-B2)" /tmp/r6_a21_retry.log)
grep -a "RETRY-FAILED\|RETRY-REFUSED" /tmp/r6_a21_retry.log | head -1 | cut -c1-200 | tee -a "$OUT"
check 21 "A21 timeout -> FAILED (exit 4); plain resume keeps it FAILED (exit 4, no retry); --retry-failed re-bills it -> exit 0" $([ "$RC1" = "4" ] && [ "$RC2" = "4" ] && [ "$RT2" = "0" ] && [ "$RC3" = "0" ] && [ "$RT3" -ge 1 ] && echo 0 || echo 1)
res "A21 first_exit=$RC1 noretry_exit=$RC2 noretry_retry_lines=$RT2 retry_exit=$RC3 retry_lines=$RT3"


# ---- P9: recovery acceptance contract ----
visit_sum() { SQL "SELECT CONCAT(COUNT(*), ':', COALESCE(SUM(totalbiaya),0)) FROM ${FX}.billing WHERE no_rawat='$1';"; }
batch_status() { python3 -c "import json;st=json.load(open('/opt/dr-benchmark/results/$1/B3_oracle_run_r5/.state.json'));print(','.join('%s=%s' % (d, b.get('status')) for d, b in sorted(st['batches'].items())))" 2>/dev/null; }

echo "=== A22: FAILED batch, then its restored state is changed; --retry-failed must re-restore (verified) before re-billing ==="
freeze r6_a22 B3 --visits-file /tmp/r6_clean.txt
env RUN_ID=r6_a22 R5_HARNESS_TIMEOUT_S=3 $ORACLE --stage B3 --visits-file /tmp/r6_clean.txt > /tmp/r6_a22.log 2>&1
RC1=$?; HELD=$(stage_count r6_a22); N22=$(SQL "SELECT COUNT(*) FROM ${FX}.billing WHERE no_rawat='2026/10/01/800085';")
SQL "UPDATE ${FX}.billing SET totalbiaya=totalbiaya+1 WHERE no_rawat='2026/10/01/800085';"
env RUN_ID=r6_a22 $ORACLE --stage B3 --visits-file /tmp/r6_clean.txt --retry-failed > /tmp/r6_a22_retry.log 2>&1
RC2=$?
DIFF=$(cnt "current state is not the pre-reset state" /tmp/r6_a22_retry.log); RV=$(cnt "STAGE-RESTORED-VERIFIED" /tmp/r6_a22_retry.log)
RT=$(cnt "RETRY-FAILED (P9-B2).*restored and verified" /tmp/r6_a22_retry.log)
grep -a "current state is not\|RETRY-FAILED" /tmp/r6_a22_retry.log | head -2 | cut -c1-200 | tee -a "$OUT"
check 22 "A22 timeout -> FAILED with stage tables held ($HELD); then all $N22 billing rows of 2026/10/01/800085 changed (+1 each); --retry-failed detects current != pre-reset, restores + verifies from the kept tables, then re-bills -> exit 0" $([ "$RC1" = "4" ] && [ "$HELD" -gt 0 ] && [ "$DIFF" -ge 1 ] && [ "$RV" -ge 1 ] && [ "$RT" -ge 1 ] && [ "$RC2" = "0" ] && echo 0 || echo 1)
res "A22 first_exit=$RC1 held_stage_tables=$HELD current_differs_lines=$DIFF restored_verified=$RV retry_lines=$RT retry_exit=$RC2"

echo "=== A22b: same, but the recovery tables are gone -> RETRY-REFUSED, nothing deleted, nothing re-billed ==="
freeze r6_a22b B3 --visits-file /tmp/r6_clean.txt
env RUN_ID=r6_a22b R5_HARNESS_TIMEOUT_S=3 $ORACLE --stage B3 --visits-file /tmp/r6_clean.txt > /tmp/r6_a22b.log 2>&1
RC1=$?
python3 -c "import sys;sys.path.insert(0,'/opt/Deers-Rock/tools');import sampled_real_form_diff_r5 as o;print(o.stage_drop('$FX','r6_a22b',print,stage='B3'))" > /tmp/r6_a22b_drop.log 2>&1
SQL "UPDATE ${FX}.billing SET totalbiaya=totalbiaya+1 WHERE no_rawat='2026/10/01/800085';"
S0=$(visit_sum 2026/10/01/800085)
env RUN_ID=r6_a22b $ORACLE --stage B3 --visits-file /tmp/r6_clean.txt --retry-failed > /tmp/r6_a22b_retry.log 2>&1
RC2=$?; S1=$(visit_sum 2026/10/01/800085)
REF=$(cnt "RETRY-REFUSED" /tmp/r6_a22b_retry.log); MISS=$(cnt "stage tables missing" /tmp/r6_a22b_retry.log)
RST=$(cnt "^.*reset [0-9]* visits" /tmp/r6_a22b_retry.log)
SQL "UPDATE ${FX}.billing SET totalbiaya=totalbiaya-1 WHERE no_rawat='2026/10/01/800085';"
env RUN_ID=r6_a22b $ORACLE --stage B3 --visits-file /tmp/r6_clean.txt --abandon-failed > /tmp/r6_a22b_abandon.log 2>&1
AB=$(cnt "ABANDON-FAILED" /tmp/r6_a22b_abandon.log)
grep -a "RETRY-REFUSED\|stage tables missing" /tmp/r6_a22b_retry.log | head -2 | cut -c1-200 | tee -a "$OUT"
check 22b "A22b recovery tables dropped + row changed -> RETRY-REFUSED (stage tables missing, nothing deleted: visit rows/sum $S0 -> $S1), no reset, exit 4; after reverting the change, --abandon-failed releases the batch" $([ "$RC1" = "4" ] && [ "$REF" -ge 1 ] && [ "$MISS" -ge 1 ] && [ "$S0" = "$S1" ] && [ "$RST" = "0" ] && [ "$RC2" = "4" ] && [ "$AB" -ge 1 ] && echo 0 || echo 1)
res "A22b first_exit=$RC1 refused=$REF missing_lines=$MISS rows_sum_before=$S0 after=$S1 reset_lines=$RST retry_exit=$RC2 abandoned=$AB"

echo "=== A23: two batches (two dates): per-batch hash files; a FAILED first batch stops the run before the second ==="
printf "2026/10/01/800085\n2026/10/06/800018\n" > /tmp/r6_two.txt
RD23=/opt/dr-benchmark/results/r6_a23/B3_oracle_run_r5
freeze r6_a23 B3 --visits-file /tmp/r6_two.txt
env RUN_ID=r6_a23 R5_HARNESS_TIMEOUT_S=3 $ORACLE --stage B3 --visits-file /tmp/r6_two.txt > /tmp/r6_a23.log 2>&1
RC1=$?; ST1=$(batch_status r6_a23)
env RUN_ID=r6_a23 $ORACLE --stage B3 --visits-file /tmp/r6_two.txt > /tmp/r6_a23_resume.log 2>&1
RC2=$?; ST2=$(batch_status r6_a23); STOP=$(cnt "run stops here; later batches not billed" /tmp/r6_a23_resume.log)
env RUN_ID=r6_a23 $ORACLE --stage B3 --visits-file /tmp/r6_two.txt --retry-failed > /tmp/r6_a23_retry.log 2>&1
RC3=$?; ST3=$(batch_status r6_a23); NH=$(ls $RD23/stage_content_hash_r5_stage_B3_r6_a23_2026_10_0*.json 2>/dev/null | wc -l)
res "A23 batches after timeout: $ST1 · after plain resume: $ST2 · after retry: $ST3 · per-batch hash files: $(ls $RD23 | grep stage_content_hash | tr '\n' ' ')"
check 23 "A23 two dates: timeout FAILs batch 1 and the run stops (batch 2 PENDING, exit 4); plain resume stops at the FAILED batch again (batch 2 still PENDING, exit 4); --retry-failed bills both (exit 0) with one hash file per batch (2)" $([ "$RC1" = "4" ] && [ "$ST1" = "2026-10-01=FAILED,2026-10-06=PENDING" ] && [ "$RC2" = "4" ] && [ "$STOP" -ge 1 ] && [ "$ST2" = "2026-10-01=FAILED,2026-10-06=PENDING" ] && [ "$RC3" = "0" ] && [ "$ST3" = "2026-10-01=BILLED,2026-10-06=BILLED" ] && [ "$NH" = "2" ] && echo 0 || echo 1)
res "A23 exits $RC1/$RC2/$RC3 stop_lines=$STOP hash_files=$NH"

echo "=== A24: a session still holding the target during a resume is fenced (KILLed) before the restore ==="
freeze r6_a24 B3 --visits-file /tmp/r6_clean.txt
env RUN_ID=r6_a24 $ORACLE --stage B3 --visits-file /tmp/r6_clean.txt > /tmp/r6_a24.log 2>&1 &
PID=$!
for _ in $(seq 1 240); do grep -q "reset 2 visits" /tmp/r6_a24.log 2>/dev/null && break; sleep 0.25; done
kill -TERM $PID 2>/dev/null; wait $PID; RCK=$?
# a second session on the fixture holding a locking read on the reset visit, then sleeping
( mysql -uroot ${FX} -e "START TRANSACTION; SELECT COUNT(*) FROM billing WHERE no_rawat='2026/10/01/800085' FOR UPDATE; SELECT SLEEP(600);" > /tmp/r6_a24_blocker.log 2>&1 & )
for _ in $(seq 1 40); do [ "$(SQL "SELECT COUNT(*) FROM information_schema.processlist WHERE info LIKE 'SELECT SLEEP(600)%';")" = "1" ] && break; sleep 0.25; done
BLK=$(SQL "SELECT COUNT(*) FROM information_schema.processlist WHERE info LIKE 'SELECT SLEEP(600)%';")
env RUN_ID=r6_a24 $ORACLE --stage B3 --visits-file /tmp/r6_clean.txt > /tmp/r6_a24_resume.log 2>&1
RC=$?
FK=$(grep -ao "FENCE (P9-B4) ${FX}: sessions_killed=[0-9]*" /tmp/r6_a24_resume.log | head -1 | sed 's/.*=//')
BLK_AFTER=$(SQL "SELECT COUNT(*) FROM information_schema.processlist WHERE info LIKE 'SELECT SLEEP(600)%';")
RV=$(cnt "STAGE-RESTORED-VERIFIED" /tmp/r6_a24_resume.log)
grep -a "FENCE\|WRITER-DEAD-PROOF (resume" /tmp/r6_a24_resume.log | head -2 | cut -c1-200 | tee -a "$OUT"
check 24 "A24 killed after reset (exit 4); a blocking session on ${FX} (locking read + sleep) present at resume -> FENCE kills it (>=1) before the restore; restore verified; re-bill exit 0; blocker gone" $([ "$RCK" = "4" ] && [ "$BLK" = "1" ] && [ "${FK:-0}" -ge 1 ] && [ "$BLK_AFTER" = "0" ] && [ "$RV" -ge 1 ] && [ "$RC" = "0" ] && echo 0 || echo 1)
res "A24 killed_exit=$RCK blocker_present=$BLK fence_sessions_killed=${FK:-none} blocker_after=$BLK_AFTER restored_verified=$RV resume_exit=$RC"

echo "=== A25: a sampled source line changed after freeze -> verify-frozen SOURCE-CONTENT DRIFT, exit 3, nothing reset ==="
freeze r6_a25 B3 --visits-file /tmp/r6_clean.txt
K25=$(SQL "SELECT kode_brng FROM ${FX}.detail_pemberian_obat WHERE no_rawat='2026/10/01/800085' ORDER BY kode_brng LIMIT 1;")
SQL "UPDATE ${FX}.detail_pemberian_obat SET jml=jml+1 WHERE no_rawat='2026/10/01/800085' AND kode_brng='$K25';"
env RUN_ID=r6_a25 $ORACLE --stage B3 --visits-file /tmp/r6_clean.txt > /tmp/r6_a25.log 2>&1
RC=$?
SQL "UPDATE ${FX}.detail_pemberian_obat SET jml=jml-1 WHERE no_rawat='2026/10/01/800085' AND kode_brng='$K25';"
DR=$(cnt "SOURCE-CONTENT DRIFT" /tmp/r6_a25.log); RS=$(cnt "reset [0-9]* visits" /tmp/r6_a25.log); FD=$(cnt "FINGERPRINT DRIFT" /tmp/r6_a25.log)
grep -a "SOURCE-CONTENT DRIFT" /tmp/r6_a25.log | head -1 | cut -c1-200 | tee -a "$OUT"
check 25 "A25 one sampled drug quantity changed after freeze (table counts unchanged: fingerprint drift lines=$FD) -> SOURCE-CONTENT DRIFT, exit 3, no reset" $([ -n "$K25" ] && [ "$DR" -ge 1 ] && [ "$RC" = "3" ] && [ "$RS" = "0" ] && [ "$FD" = "0" ] && echo 0 || echo 1)
res "A25 drug=$K25 exit=$RC source_drift_lines=$DR reset_lines=$RS fingerprint_drift_lines=$FD (quantity reverted)"

# ---- P10: integrity of the recovery path ----
stage_cks() { local t; t=$(SQL "SELECT GROUP_CONCAT(CONCAT('${FX}.', table_name) ORDER BY table_name) FROM information_schema.tables WHERE table_schema='${FX}' AND table_name LIKE 'r5\_stage\_B3\_$1\_%';")
  [ -n "$t" ] && [ "$t" != "NULL" ] || return 0
   local c; c=$(SQL "CHECKSUM TABLE $t EXTENDED" | awk '{print $2}')
   echo "$c" | grep -qx 'NULL' && return 0   # P15 E3: a NULL checksum is never comparable
   echo "$c" | tr '\n' ':'; }
bench_privs() { SQL "SELECT COALESCE(GROUP_CONCAT(privilege_type ORDER BY privilege_type), 'none') FROM information_schema.schema_privileges WHERE grantee=\"'benchmark'@'localhost'\" AND table_schema='${FX}';"; }

echo "=== A27: a sampled drug PRICE changed after freeze -> SOURCE-CONTENT DRIFT, exit 3, nothing reset ==="
freeze r6_a27 B3 --visits-file /tmp/r6_clean.txt
K27=$(SQL "SELECT kode_brng FROM ${FX}.detail_pemberian_obat WHERE no_rawat='2026/10/01/800085' ORDER BY kode_brng LIMIT 1;")
SQL "UPDATE ${FX}.detail_pemberian_obat SET biaya_obat=biaya_obat+1000 WHERE no_rawat='2026/10/01/800085' AND kode_brng='$K27';"
env RUN_ID=r6_a27 $ORACLE --stage B3 --visits-file /tmp/r6_clean.txt > /tmp/r6_a27.log 2>&1
RC=$?
SQL "UPDATE ${FX}.detail_pemberian_obat SET biaya_obat=biaya_obat-1000 WHERE no_rawat='2026/10/01/800085' AND kode_brng='$K27';"
DR=$(cnt "SOURCE-CONTENT DRIFT" /tmp/r6_a27.log); RS=$(cnt "reset [0-9]* visits" /tmp/r6_a27.log)
check 27 "A27 one sampled drug's biaya_obat +1000 after freeze (the price the form bills; not hashed before P10) -> SOURCE-CONTENT DRIFT, exit 3, no reset" $([ -n "$K27" ] && [ "$DR" -ge 1 ] && [ "$RC" = "3" ] && [ "$RS" = "0" ] && echo 0 || echo 1)
res "A27 drug=$K27 exit=$RC source_drift_lines=$DR reset_lines=$RS (price reverted)"

echo "=== A28: a failed stage RE-backup (retry) rolls back and keeps the earlier staged rows ==="
freeze r6_a28 B3 --visits-file /tmp/r6_clean.txt
env RUN_ID=r6_a28 R5_HARNESS_TIMEOUT_S=3 $ORACLE --stage B3 --visits-file /tmp/r6_clean.txt > /tmp/r6_a28.log 2>&1
RC1=$?; C0=$(stage_cks r6_a28)
env RUN_ID=r6_a28 R5_FAULT_BACKUP_FAIL=1 $ORACLE --stage B3 --visits-file /tmp/r6_clean.txt --retry-failed > /tmp/r6_a28_fault.log 2>&1
RC2=$?; C1=$(stage_cks r6_a28)
RB=$(cnt "stage backup transaction failed and was rolled back" /tmp/r6_a28_fault.log); KP=$(cnt "STAGE-KEEP" /tmp/r6_a28_fault.log)
RS=$(cnt "reset [0-9]* visits" /tmp/r6_a28_fault.log)
env RUN_ID=r6_a28 $ORACLE --stage B3 --visits-file /tmp/r6_clean.txt --retry-failed > /tmp/r6_a28_retry.log 2>&1
RC3=$?; LEFT28=$(stage_count r6_a28)
grep -a "rolled back\|STAGE-KEEP" /tmp/r6_a28_fault.log | head -2 | cut -c1-200 | tee -a "$OUT"
check 28 "A28 timeout -> FAILED, stage tables held; retry with an injected backup failure -> transaction rolled back, no reset, exit 4, stage checksums unchanged, STAGE-KEEP; a clean retry then bills (exit 0) and drops them" $([ "$RC1" = "4" ] && [ -n "$C0" ] && [ "$C0" = "$C1" ] && [ "$RB" -ge 1 ] && [ "$KP" -ge 1 ] && [ "$RS" = "0" ] && [ "$RC2" = "4" ] && [ "$RC3" = "0" ] && [ "$LEFT28" = "0" ] && echo 0 || echo 1)
res "A28 exits $RC1/$RC2/$RC3 rollback_lines=$RB keep_lines=$KP reset_lines=$RS stage_cks_equal=$([ "$C0" = "$C1" ] && echo yes || echo NO) stage_tables_after=$LEFT28"

echo "=== A29: writer exclusion - a benchmark-account write during the restore window is rejected; grants come back ==="
freeze r6_a29 B3 --visits-file /tmp/r6_clean.txt
env RUN_ID=r6_a29 $ORACLE --stage B3 --visits-file /tmp/r6_clean.txt > /tmp/r6_a29.log 2>&1 &
PID=$!
for _ in $(seq 1 240); do grep -q "reset 2 visits" /tmp/r6_a29.log 2>/dev/null && break; sleep 0.25; done
kill -TERM $PID 2>/dev/null; wait $PID; RCK=$?
P0=$(bench_privs)
env RUN_ID=r6_a29 R5_FAULT_RESTORE_PAUSE_S=20 $ORACLE --stage B3 --visits-file /tmp/r6_clean.txt > /tmp/r6_a29_resume.log 2>&1 &
PID=$!
for _ in $(seq 1 240); do grep -q "RESTORE-FAULT-PAUSE" /tmp/r6_a29_resume.log 2>/dev/null && break; sleep 0.25; done
PD=$(bench_privs)
bench_write() { env -u DBUTIL_FORCE_ROOT python3 - "$FX" <<'PY' 2>&1
import sys
sys.path.insert(0, '/opt/Deers-Rock/tools')
import dbutil
try:
    dbutil.execute(sys.argv[1], "UPDATE billing SET totalbiaya=totalbiaya WHERE 1=0")
    print("WRITE-OK")
except Exception as e:
    print("WRITE-DENIED", type(e).__name__, str(e)[:160])
PY
}
WD=$(bench_write)
wait $PID; RC=$?
PA=$(bench_privs); WA=$(bench_write)
ON=$(cnt "WRITER-EXCLUSION on (P10-B4)" /tmp/r6_a29_resume.log); OFF=$(cnt "WRITER-EXCLUSION off (P10-B4)" /tmp/r6_a29_resume.log)
MM=$(cnt "grants not as before" /tmp/r6_a29_resume.log); RV=$(cnt "STAGE-RESTORED-VERIFIED" /tmp/r6_a29_resume.log)
res "A29 grants before=$P0 during=$PD after=$PA · write during: $(echo $WD | cut -c1-120) · write after: $(echo $WA | cut -c1-40)"
check 29 "A29 during a restore the benchmark account has no INSERT/UPDATE/DELETE on ${FX} and its write is denied; restore verified; afterwards the grants equal the original and a write works; exit 0" $([ "$RCK" = "4" ] && echo "$P0" | grep -q "DELETE,INSERT" && [ "$PD" = "SELECT" ] && echo "$WD" | grep -q "WRITE-DENIED" && [ "$RC" = "0" ] && [ "$RV" -ge 1 ] && [ "$PA" = "$P0" ] && echo "$WA" | grep -q "WRITE-OK" && [ "$ON" -ge 1 ] && [ "$OFF" -ge 1 ] && [ "$MM" = "0" ] && echo 0 || echo 1)
res "A29 killed_exit=$RCK resume_exit=$RC exclusion_on=$ON off=$OFF grant_mismatch_lines=$MM restored_verified=$RV"

echo "=== A17: a live database as fixture -> LIVE-FIXTURE-REFUSED, exit 3 ==="
FX=sik bash /opt/Deers-Rock/tools/p6_acceptance_suite.sh > /tmp/r6_a17.log 2>&1; R17A=$?
FX=sik_bench bash /opt/Deers-Rock/tools/p6_acceptance_suite.sh > /tmp/r6_a17b.log 2>&1; R17B=$?
check 17 "A17 FX=sik and FX=sik_bench refused before any DB access (exit 3, LIVE-FIXTURE-REFUSED)" $([ "$R17A" = "3" ] && [ "$R17B" = "3" ] && [ "$(cnt LIVE-FIXTURE-REFUSED /tmp/r6_a17.log)" -ge 1 ] && [ "$(cnt LIVE-FIXTURE-REFUSED /tmp/r6_a17b.log)" -ge 1 ] && echo 0 || echo 1)
res "A17 FX=sik exit=$R17A FX=sik_bench exit=$R17B"

echo "=== A14: suite exit path — a failing check must make the suite exit non-zero ==="
P7_EXIT_TEST=fail bash /opt/Deers-Rock/tools/p6_acceptance_suite.sh > /dev/null 2>&1; EF=$?
P7_EXIT_TEST=pass bash /opt/Deers-Rock/tools/p6_acceptance_suite.sh > /dev/null 2>&1; EP=$?
check 14 "A14 early-branch exit self-test only (forced fail -> exit 1, forced pass -> exit 0); the production terminal path is tested by p9_terminal_path_check.sh" $([ "$EF" = "1" ] && [ "$EP" = "0" ] && echo 0 || echo 1)
res "A14 forced-fail exit=$EF forced-pass exit=$EP"

echo "=== A10: builder single-session transaction on a SCRATCH ledger (${FX}.dr_charge_ledger) ==="
SQL "DROP TABLE IF EXISTS ${FX}.dr_charge_ledger; CREATE TABLE ${FX}.dr_charge_ledger LIKE sik_bench.dr_charge_ledger; INSERT INTO ${FX}.dr_charge_ledger SELECT * FROM sik_bench.dr_charge_ledger;
     DROP TABLE IF EXISTS ${FX}.dr_tariff; CREATE TABLE ${FX}.dr_tariff LIKE sik_bench.dr_tariff; INSERT INTO ${FX}.dr_tariff SELECT * FROM sik_bench.dr_tariff;"
export P2_LEDGER_DB=${FX} P2_CONSUMER_DB=${FX}
# window visits with drugs whose tax row is missing or has the wrong amount
taxbad() { SQL "SELECT COUNT(*) FROM (SELECT d.no_rawat, SUM(d.amount) ds FROM ${FX}.dr_charge_ledger d WHERE d.component='drug' AND d.no_rawat LIKE '2026/10/%' GROUP BY d.no_rawat) x LEFT JOIN ${FX}.dr_charge_ledger t ON t.no_rawat=x.no_rawat AND t.component='tax' WHERE (x.ds*11+50) DIV 100 > 0 AND (t.no_rawat IS NULL OR t.amount <> (x.ds*11+50) DIV 100);"; }
# P8-B1: window visits with drugs whose NUMBER of tax rows is not 1 (expected tax > 0) or 0 (expected tax = 0)
taxcard() { SQL "SELECT COUNT(*) FROM (SELECT d.no_rawat, (SUM(d.amount)*11+50) DIV 100 et, (SELECT COUNT(*) FROM ${FX}.dr_charge_ledger t WHERE t.no_rawat=d.no_rawat AND t.component='tax') nt FROM ${FX}.dr_charge_ledger d WHERE d.component='drug' AND d.no_rawat LIKE '2026/10/%' GROUP BY d.no_rawat) x WHERE x.nt <> IF(x.et > 0, 1, 0);"; }
env RUN_ID=r6_a10 python3 build_dr_charge_ledger_p2.py --window 2026-10 > /tmp/r6_a10.log 2>&1
RC=$?
grep -a "SINGLE mysql session\|FAIL-CLOSED" /tmp/r6_a10.log | head -2 | tee -a "$OUT"
check 10 "A10 single-session builder on scratch ledger: exit 0 + committed-in-one-session line" $([ "$RC" = "0" ] && [ "$(cnt 'SINGLE mysql session' /tmp/r6_a10.log)" -ge 1 ] && echo 0 || echo 1)
# stale in-window key WITH a drug row: pre-fix, step 4 re-derived its tax from the
# old committed ledger, so a stale visit got a fresh tax row after the rebuild.
SQL "INSERT IGNORE INTO ${FX}.dr_charge_ledger VALUES ('2026/10/01/999999','drug','ZZFAKE',1,10000,10000,'stale-in-window'),('2026/10/01/999999','tax','PPN11',1,1100,1100,'stale-in-window');"
env RUN_ID=r6_a10b python3 build_dr_charge_ledger_p2.py --window 2026-10 > /tmp/r6_a10b.log 2>&1
RCB=$?
STALE=$(SQL "SELECT COUNT(*) FROM ${FX}.dr_charge_ledger WHERE no_rawat='2026/10/01/999999';")
TAXBAD=$(taxbad); TAXCARD=$(taxcard)
TAXORPHAN=$(SQL "SELECT COUNT(*) FROM ${FX}.dr_charge_ledger t WHERE t.component='tax' AND t.no_rawat LIKE '2026/10/%' AND NOT EXISTS (SELECT 1 FROM ${FX}.dr_charge_ledger d WHERE d.no_rawat=t.no_rawat AND d.component='drug');")
check 10b "A10b stale in-window key (drug+tax) gone after rebuild; every window visit with drugs has exactly one tax row (zero when the expected tax is 0) = (drug subtotal x 11 + 50) div 100, no orphan tax rows (tolerance 0)" $([ "$RCB" = "0" ] && [ "$STALE" = "0" ] && [ "$TAXBAD" = "0" ] && [ "$TAXCARD" = "0" ] && [ "$TAXORPHAN" = "0" ] && echo 0 || echo 1)
res "A10b exit=$RCB stale_rows=$STALE tax_wrong_or_missing=$TAXBAD tax_row_count_wrong=$TAXCARD tax_orphan=$TAXORPHAN"

echo "=== A10d: planted duplicate and wrong tax rows must be caught (A10b queries + p7_tax_rule_check exit) ==="
NR10=$(SQL "SELECT d.no_rawat FROM ${FX}.dr_charge_ledger d JOIN ${FX}.dr_charge_ledger t ON t.no_rawat=d.no_rawat AND t.component='tax' WHERE d.component='drug' AND d.no_rawat LIKE '2026/10/%' ORDER BY d.no_rawat LIMIT 1;")
TAXAMT=$(SQL "SELECT amount FROM ${FX}.dr_charge_ledger WHERE no_rawat='$NR10' AND component='tax';")
python3 p7_tax_rule_check.py --db ${FX} > /tmp/r6_a10d_clean.log 2>&1; TC0=$?
SQL "INSERT INTO ${FX}.dr_charge_ledger VALUES ('$NR10','tax','P8DUP',1,$TAXAMT,$TAXAMT,'p8-dup-probe');"
DUPCARD=$(taxcard); DUPBAD=$(taxbad)
python3 p7_tax_rule_check.py --db ${FX} > /tmp/r6_a10d_dup.log 2>&1; TC1=$?
SQL "DELETE FROM ${FX}.dr_charge_ledger WHERE code='P8DUP' AND source='p8-dup-probe';"
SQL "UPDATE ${FX}.dr_charge_ledger SET amount=amount+1 WHERE no_rawat='$NR10' AND component='tax';"
WRONGBAD=$(taxbad)
python3 p7_tax_rule_check.py --db ${FX} > /tmp/r6_a10d_wrong.log 2>&1; TC2=$?
SQL "UPDATE ${FX}.dr_charge_ledger SET amount=amount-1 WHERE no_rawat='$NR10' AND component='tax';"
python3 p7_tax_rule_check.py --db ${FX} > /tmp/r6_a10d_after.log 2>&1; TC3=$?
grep -a "DUPLICATE\|STORED \|TAX-RULE-CHECK" /tmp/r6_a10d_dup.log /tmp/r6_a10d_wrong.log | head -4 | cut -c1-160 | tee -a "$OUT"
check 10d "A10d duplicate correct-amount tax row caught by the cardinality query (A10b's amount query alone misses it: $DUPBAD) and by p7_tax_rule_check (exit 1); a wrong tax amount caught by both; clean ledger exits 0 before and after" $([ -n "$NR10" ] && [ "$TC0" = "0" ] && [ "$DUPCARD" = "1" ] && [ "$TC1" = "1" ] && [ "$WRONGBAD" = "1" ] && [ "$TC2" = "1" ] && [ "$TC3" = "0" ] && echo 0 || echo 1)
res "A10d visit=$NR10 clean_exit=$TC0 dup: count_query=$DUPCARD amount_query=$DUPBAD tax_check_exit=$TC1 · wrong: amount_query=$WRONGBAD tax_check_exit=$TC2 · restored: tax_check_exit=$TC3"

echo "=== A10e: a DR rebuild must not delete a non-DR row (delete scope = insert scope), window 2026-10 and ALL ==="
NONDR=$(SQL "SELECT no_rawat FROM ${FX}.reg_periksa WHERE no_rawat LIKE '2026/10/%' AND no_rkm_medis NOT LIKE 'DR%' ORDER BY no_rawat LIMIT 1;")
SQL "INSERT INTO ${FX}.dr_charge_ledger VALUES ('$NONDR','procedure','P8NONDR',1,1,1,'p8-nondr-probe');"
env RUN_ID=r6_a10e python3 build_dr_charge_ledger_p2.py --window 2026-10 > /tmp/r6_a10e.log 2>&1; RCE=$?
SURV1=$(SQL "SELECT COUNT(*) FROM ${FX}.dr_charge_ledger WHERE code='P8NONDR';")
T0=$(date +%s)
env RUN_ID=r6_a10e_all python3 build_dr_charge_ledger_p2.py --window ALL > /tmp/r6_a10e_all.log 2>&1; RCEA=$?
SURV2=$(SQL "SELECT COUNT(*) FROM ${FX}.dr_charge_ledger WHERE code='P8NONDR';"); ALL_SECS=$(( $(date +%s) - T0 ))
SQL "DELETE FROM ${FX}.dr_charge_ledger WHERE code='P8NONDR' AND source='p8-nondr-probe';"
check 10e "A10e non-DR ledger row ($NONDR) survives a DR rebuild of window 2026-10 and of window ALL (both exit 0)" $([ -n "$NONDR" ] && [ "$RCE" = "0" ] && [ "$SURV1" = "1" ] && [ "$RCEA" = "0" ] && [ "$SURV2" = "1" ] && echo 0 || echo 1)
res "A10e visit=$NONDR 2026-10: exit=$RCE survived=$SURV1 · ALL: exit=$RCEA survived=$SURV2 (${ALL_SECS}s)"
# mid-build failure: a trigger rejects the first tax row (tax is built LAST, so
# the DELETE and all registration/procedure/drug REPLACEs are already in the
# open transaction). The ledger must be byte-identical afterwards.
L_PRE=$(ledger_hash ${FX})
# (mysql -e splits a BEGIN..END body at its inner ';' and the CREATE silently
# fails — the trigger must be created with a DELIMITER and then proven to exist)
mysql -uroot ${FX} <<'TRG'
DELIMITER //
CREATE TRIGGER p6_a10c_fail BEFORE INSERT ON dr_charge_ledger FOR EACH ROW
BEGIN
  IF NEW.component='tax' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='p6 A10c injected mid-build failure';
  END IF;
END//
DELIMITER ;
TRG
TRG_N=$(SQL "SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema='${FX}' AND trigger_name='p6_a10c_fail';")
env RUN_ID=r6_a10c python3 build_dr_charge_ledger_p2.py --window 2026-10 > /tmp/r6_a10c.log 2>&1
RCC=$?
SQL "DROP TRIGGER IF EXISTS ${FX}.p6_a10c_fail;"
L_POST=$(ledger_hash ${FX})
grep -a "FAIL-CLOSED" /tmp/r6_a10c.log | head -1 | tee -a "$OUT"
INJ=$(cnt "p6 A10c injected mid-build failure" /tmp/r6_a10c.log)
check 10c "A10c trigger present + injected failure surfaced -> exit 1 + FAIL-CLOSED + scratch ledger unchanged (rollback)" $([ "$TRG_N" = "1" ] && [ "$INJ" -ge 1 ] && [ "$RCC" = "1" ] && [ "$(cnt FAIL-CLOSED /tmp/r6_a10c.log)" -ge 1 ] && [ "$L_PRE" = "$L_POST" ] && echo 0 || echo 1)
res "A10c trigger_present=$TRG_N injected_msg_lines=$INJ exit=$RCC ledger pre=$L_PRE post=$L_POST"
echo "=== A26: a malformed tariff amount fails the build closed (scratch tariff), ledger unchanged ==="
L26_PRE=$(ledger_hash ${FX})
SQL "ALTER TABLE ${FX}.dr_tariff MODIFY dr_price VARCHAR(32) NOT NULL; UPDATE ${FX}.dr_tariff SET dr_price='12x' ORDER BY kind, code LIMIT 1;"
env RUN_ID=r6_a26 python3 build_dr_charge_ledger_p2.py --window 2026-10 > /tmp/r6_a26.log 2>&1
RC26=$?
L26_POST=$(ledger_hash ${FX})
SQL "DROP TABLE ${FX}.dr_tariff; CREATE TABLE ${FX}.dr_tariff LIKE sik_bench.dr_tariff; INSERT INTO ${FX}.dr_tariff SELECT * FROM sik_bench.dr_tariff;"
MAL=$(cnt "MALFORMED-AMOUNT" /tmp/r6_a26.log); FC=$(cnt "FAIL-CLOSED" /tmp/r6_a26.log)
grep -a "MALFORMED-AMOUNT\|FAIL-CLOSED" /tmp/r6_a26.log | head -2 | cut -c1-200 | tee -a "$OUT"
check 26 "A26 one scratch tariff price set to '12x' -> MALFORMED-AMOUNT, FAIL-CLOSED, exit 1, scratch ledger unchanged (before P10 it became Rp 0)" $([ "$RC26" = "1" ] && [ "$MAL" -ge 1 ] && [ "$FC" -ge 1 ] && [ "$L26_PRE" = "$L26_POST" ] && echo 0 || echo 1)
res "A26 exit=$RC26 malformed_lines=$MAL fail_closed_lines=$FC ledger pre=$L26_PRE post=$L26_POST (scratch tariff restored)"
unset P2_LEDGER_DB P2_CONSUMER_DB

# ---- end-state checks ----
# P8-A1: A15, A18a and A18b produce unverified/mismatched restores ON PURPOSE; they are
# counted on their own and excluded here, so A11 no longer claims "every restore"
OTHER_LOGS=$(ls /tmp/r6_a*.log | grep -v -e '/r6_a15\.log$' -e '/r6_a18\.log$' -e '/r6_a18b\.log$' -e '/r6_a22b_retry\.log$')
RM_OTH=$(cat $OTHER_LOGS | grep -ac "STAGE-RESTORE-MISMATCH")
UV_OTH=$(cat $OTHER_LOGS | grep -ac "STAGE-RESTORE-UNVERIFIED")
ER_OTH=$(cat $OTHER_LOGS | grep -ac "STAGE-RESTORE-ERROR")
DF_ALL=$(cat /tmp/r6_a*.log | grep -ac "STAGE-DROP-FAILED")
RV_ALL=$(cat /tmp/r6_a*.log | grep -ac "STAGE-RESTORED-VERIFIED")
RV_OTH=$(cat $OTHER_LOGS | grep -ac "STAGE-RESTORED-VERIFIED")
DELIB=$(( $(cnt "STAGE-RESTORE-UNVERIFIED" /tmp/r6_a15.log) + $(cnt "STAGE-RESTORE-UNVERIFIED" /tmp/r6_a18.log) + $(cnt "STAGE-RESTORE-MISMATCH" /tmp/r6_a18b.log) + $(cnt "STAGE-RESTORE-ERROR" /tmp/r6_a22b_retry.log) ))
res "P10-A1: verification markers in ALL transcripts=$RV_ALL, OUTSIDE the four excluded logs=$RV_OTH · outside A15/A18/A22b: STAGE-RESTORE-MISMATCH=$RM_OTH STAGE-RESTORE-UNVERIFIED=$UV_OTH STAGE-RESTORE-ERROR=$ER_OTH · deliberate failed restores (A15+A18a+A18b+A22b)=$DELIB · STAGE-DROP-FAILED=$DF_ALL"
check 11 "every restore OUTSIDE the deliberate-fault checks A15/A18a/A18b/A22b hash-verified (0 mismatch, 0 unverified, 0 error, >=1 verification marker outside the excluded logs); those four produced exactly their 4 deliberate failed restores; no failed stage drop" $([ "$RM_OTH" = "0" ] && [ "$UV_OTH" = "0" ] && [ "$ER_OTH" = "0" ] && [ "$RV_OTH" -ge 1 ] && [ "$DELIB" = "4" ] && [ "$DF_ALL" = "0" ] && echo 0 || echo 1)
STAGE_LEFT=$(SQL "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${FX}' AND table_name LIKE 'r5_stage_%';")
res "stage tables remaining on ${FX}: $STAGE_LEFT (pre-existing $LEFT0)"
check 12 "0 stage tables left on target (verified-clean drop)" $([ "$STAGE_LEFT" = "0" ] && echo 0 || echo 1)
GR1=$(bench_grants); XM=$(ls /opt/dr-benchmark/results/.writer_exclusion_* 2>/dev/null | wc -l)
RECOV=$(cat /tmp/r6_a*.log | grep -ac "WRITER-EXCLUSION recovered")
res "benchmark grants on ${FX}: start=$GR0 end=$GR1 · exclusion markers left=$XM · recoveries after a killed exclusion=$RECOV"
check 31 "A31 the harness account's grants on ${FX} are the same at the end as at the start, no writer-exclusion marker left (A20's SIGKILL inside the window was recovered: $RECOV)" $([ "$GR0" = "$GR1" ] && echo "$GR0" | grep -q "DELETE,INSERT" && [ "$XM" = "0" ] && [ "$RECOV" -ge 1 ] && echo 0 || echo 1)
 else
   res "P9_QUICK/P10_INJECT: only A0, the injection (if any) and the live guards (A13) run; the other checks are skipped"
 batch_status() { python3 -c "import json;st=json.load(open('/opt/dr-benchmark/results/$1/B3_oracle_run_r5/.state.json'));print(','.join('%s=%s' % (d, b.get('status')) for d, b in sorted(st['batches'].items())))" 2>/dev/null; }
 if [ -n "${P10_INJECT:-}" ]; then
   # P10-B6: a REAL harness failure on the two-batch set leaves batch 1 FAILED with
   # populated stage tables; record independent hashes, then (with
   # P9_FORCE_FAIL_CHECK=30) the suite ends through its normal terminal path
   printf "2026/10/01/800085\n2026/10/06/800018\n" > /tmp/r6_two.txt
   SQL "SELECT no_rawat FROM ${FX}.reg_periksa WHERE no_rawat LIKE '2026/10/%' AND no_rkm_medis NOT LIKE 'DR%' ORDER BY no_rawat LIMIT 10;" > /tmp/r6_p10_protected.txt
   SQL "SELECT no_rawat FROM ${FX}.reg_periksa WHERE no_rawat LIKE '2026/10/%' AND no_rkm_medis LIKE 'DR%' AND no_rawat NOT IN ('2026/10/01/800085','2026/10/06/800018') ORDER BY no_rawat LIMIT 10;" >> /tmp/r6_p10_protected.txt
   # P11-T2: independent PRE-OPERATION snapshot (before the injected run resets
   # anything) of the sample visits' output rows, the protected visits and the
   # live tables; the preservation check asserts restoration against THIS, not
   # against a post-failure re-hash.
   python3 /opt/Deers-Rock/tools/p10_hash_state.py ${FX} r6_p10 /tmp/r6_two.txt /tmp/r6_p10_protected.txt > /opt/dr-benchmark/p-chain/p11_preserve_preop.json 2> /tmp/r6_p10_preop.err
   PREOP_RC=$?
   freeze r6_p10 B3 --visits-file /tmp/r6_two.txt
   env RUN_ID=r6_p10 R5_HARNESS_TIMEOUT_S=3 $ORACLE --stage B3 --visits-file /tmp/r6_two.txt > /tmp/r6_p10.log 2>&1
   RCI=$?
   python3 /opt/Deers-Rock/tools/p10_hash_state.py ${FX} r6_p10 /tmp/r6_two.txt /tmp/r6_p10_protected.txt > /opt/dr-benchmark/p-chain/p10_preserve_pre.json 2> /tmp/r6_p10_hash.err
   RCH=$?   # P18 B1 (M2): taken straight after the hash step; P17 had two basename lines in between
   # P17 A7: bind both snapshots to THIS suite run by name, not by mtime alone (P18: only a step that exited 0)
   rm -f /opt/dr-benchmark/p-chain/p11_preserve_preop.json.run /opt/dr-benchmark/p-chain/p10_preserve_pre.json.run
   [ "$PREOP_RC" = "0" ] && basename "$OUT" > /opt/dr-benchmark/p-chain/p11_preserve_preop.json.run
   [ "$RCH" = "0" ] && basename "$OUT" > /opt/dr-benchmark/p-chain/p10_preserve_pre.json.run
   cp /tmp/r6_two.txt /tmp/r6_p10_protected.txt /opt/dr-benchmark/p-chain/
   NST=$(stage_count r6_p10); ST=$(batch_status r6_p10)
   res "P10 injection: oracle exit=$RCI batches=$ST stage tables=$NST protected visits=$(wc -l < /tmp/r6_p10_protected.txt) pre-hash exit=$RCH pre-op-snapshot exit=$PREOP_RC"
   check 30 "A30 injected real harness failure: batch 1 FAILED, batch 2 PENDING, populated stage tables held, independent pre-hashes AND pre-operation snapshot recorded" $([ "$RCI" = "4" ] && [ "$ST" = "2026-10-01=FAILED,2026-10-06=PENDING" ] && [ "$NST" -gt 0 ] && [ "$RCH" = "0" ] && [ "$PREOP_RC" = "0" ] && echo 0 || echo 1)
 fi
 fi

# ---- P11: discriminating negative-control checks (self-contained; P11_ONLY=<ids>) ----
if [ -n "${P11_ONLY:-}" ]; then
 stage_cks_p11() { local t; t=$(SQL "SELECT GROUP_CONCAT(CONCAT('${FX}.', table_name) ORDER BY table_name) FROM information_schema.tables WHERE table_schema='${FX}' AND table_name LIKE 'r5\_stage\_B3\_$1\_%';")
   [ -n "$t" ] && [ "$t" != "NULL" ] || return 0
   local c; c=$(SQL "CHECKSUM TABLE $t EXTENDED" | awk '{print $2}')
   echo "$c" | grep -qx 'NULL' && return 0   # P15 E3: a NULL checksum is never comparable
   echo "$c" | tr '\n' ':'; }
 # P15 E3 (fix 2): defined HERE, inside the P11 block; the first P15 bytes defined it in the
 # main-suite block that P11_ONLY runs skip, so the A28' fixture hash was always empty.
 hash_p11() { python3 -c "import sys;sys.path.insert(0,'/opt/Deers-Rock/tools');import sampled_real_form_diff_r5 as o;print(o._content_hash(open('$1').read().split(),'$FX',lambda *a:None))"; }
 if sel 28; then
  echo "=== A28' P11: discriminating re-backup — a non-transactional (pre-P10) backup loses the earlier staged rows ==="
  PFX28=r5_stage_B3_r6_a28p
  printf "2026/10/01/800085\n2026/10/01/800128\n" > /tmp/r6_p11_a28.txt
  freeze r6_a28p B3 --visits-file /tmp/r6_p11_a28.txt
  # first backup: live rows are staged verbatim
  env RUN_ID=r6_a28p $ORACLE --stage B3 --visits-file /tmp/r6_p11_a28.txt --freeze-only > /dev/null 2>&1
  python3 - "$FX" r6_a28p <<'PY'
import sys, os, json
sys.path.insert(0, '/opt/Deers-Rock/tools')
import sampled_real_form_diff_r5 as o
fx, rid = sys.argv[1], sys.argv[2]
rd = '/opt/dr-benchmark/results/%s/B3_oracle_run_r5' % rid
os.makedirs(rd, exist_ok=True)
nrs = open('/tmp/r6_p11_a28.txt').read().split()
log = print
o.stage_backup(nrs, fx, rd, log, rid, stage='B3', batch='2026-10-01')
PY
   C0P=$(stage_cks_p11 r6_a28p)
   H28PRE=$(hash_p11 /tmp/r6_p11_a28.txt)   # P15 E3: the fixture's own state before the test
   # between the first backup and the faulty retry: the live rows of the batch are CHANGED
   # (then restored with the verified path is NOT needed here — the point is that live now
   # differs from staged), so a NON-transactional re-backup would replace the staged rows
   # with the changed live rows; the transactional one rolls back and C1 == C0.
   SQL "UPDATE ${FX}.billing SET totalbiaya=totalbiaya+5 WHERE no_rawat IN ('2026/10/01/800085','2026/10/01/800128');"
    NO_TXN=; [ "${R5_NEGCTL_BACKUP_NO_TXN:-}" = "1" ] && NO_TXN=1   # P16 E2: exactly 1 activates, 0 is inert
    if [ -n "$NO_TXN" ]; then
     # NC mode: re-backup runs as autocommit; the injected failure leaves the
     # earlier staged rows destroyed -> stage checksums DIFFER from C0
     env RUN_ID=r6_a28p R5_FAULT_BACKUP_FAIL=1 R5_NEGCTL_BACKUP_NO_TXN=1 python3 - "$FX" r6_a28p <<'PY'
import sys
sys.path.insert(0, '/opt/Deers-Rock/tools')
import sampled_real_form_diff_r5 as o
fx, rid = sys.argv[1], sys.argv[2]
rd = '/opt/dr-benchmark/results/%s/B3_oracle_run_r5' % rid
nrs = open('/tmp/r6_p11_a28.txt').read().split()
try:
    o.stage_backup(nrs, fx, rd, print, rid, stage='B3', batch='2026-10-01')
except Exception as e:
    print('A28p re-backup failed (NC autocommit): %s' % str(e)[:160])
PY
    else
     env RUN_ID=r6_a28p R5_FAULT_BACKUP_FAIL=1 python3 - "$FX" r6_a28p <<'PY'
import sys
sys.path.insert(0, '/opt/Deers-Rock/tools')
import sampled_real_form_diff_r5 as o
fx, rid = sys.argv[1], sys.argv[2]
rd = '/opt/dr-benchmark/results/%s/B3_oracle_run_r5' % rid
nrs = open('/tmp/r6_p11_a28.txt').read().split()
try:
    o.stage_backup(nrs, fx, rd, print, rid, stage='B3', batch='2026-10-01')
except Exception as e:
    print('A28p re-backup rolled back (transactional): %s' % str(e)[:160])
PY
   fi
   C1P=$(stage_cks_p11 r6_a28p)
   # P15 E3: restore with the verified path and ASSERT its result; drop the stage tables only
   # after a verified restore; then require the fixture to equal its pre-test hash. The old
   # unconditional "-5" corrupted the fixture whenever the restore had already removed the +5.
   R28=$(python3 - "$FX" r6_a28p <<'PY'
import sys, json, os
sys.path.insert(0, '/opt/Deers-Rock/tools')
import sampled_real_form_diff_r5 as o
fx, rid = sys.argv[1], sys.argv[2]
rd = '/opt/dr-benchmark/results/%s/B3_oracle_run_r5' % rid
nrs = open('/tmp/r6_p11_a28.txt').read().split()
ok = o.stage_restore(nrs, fx, rd, lambda *a: None, rid, stage='B3', batch='2026-10-01')
if ok:
    o.stage_drop(fx, rid, lambda *a: None, stage='B3')
print("restored" if ok else "restore-not-verified")
PY
)
   H28POST=$(hash_p11 /tmp/r6_p11_a28.txt)
   if [ -n "$NO_TXN" ] && [ "$H28POST" != "$H28PRE" ]; then   # P16 E1: the compensation is confined to the NC arm
     # only the NC (autocommit) arm reaches here: its staged rows already held the +5, so the
     # restore put the +5 back; undo the plant once and re-check
     SQL "UPDATE ${FX}.billing SET totalbiaya=totalbiaya-5 WHERE no_rawat IN ('2026/10/01/800085','2026/10/01/800128');"
     H28POST=$(hash_p11 /tmp/r6_p11_a28.txt)
   fi
   res "A28' restore=$R28 fixture hash before/after the test: ${H28PRE:0:16} / ${H28POST:0:16}"
   # Always assert the P11 property: a failed re-backup (regardless of mode) must leave
   # the earlier staged rows intact, i.e. C0 == C1. Without the NC switch the re-backup is
   # transactional and rolls back (C0 == C1 -> PASS). With R5_NEGCTL_BACKUP_NO_TXN the
   # autocommit re-backup replaces the staged rows with the changed live rows (C0 != C1 ->
   # the property check FAILS), which is exactly the discriminating evidence the handoff
   # requires: the check FAILS when the property is removed.
   res "A28' C0=$C0P C1=$C1P mode=${NO_TXN:+NC-autocommit}"
   check 28 "A28' a failed re-backup keeps the earlier staged rows (C0 == C1): the transactional backup rolls back and the staged content is unchanged; with R5_NEGCTL_BACKUP_NO_TXN (autocommit) the live-row change leaks into the stage tables and this check FAILS" $([ -n "$C0P" ] && [ -n "$C1P" ] && [ "$C0P" = "$C1P" ] && [ -n "$H28PRE" ] && [ "$H28POST" = "$H28PRE" ] && [ "$R28" = "restored" ] && echo 0 || echo 1)   # P16 E1: the restore result is asserted
 fi
 if sel 31; then
  echo "=== A31 P11: snapshot coherence — immediately after a backup, hash(stage) == hash(live) ==="
  PFX31=r5_stage_B3_r6_a31p
  printf "2026/10/01/800085\n2026/10/01/800128\n" > /tmp/r6_p11_a31.txt
  freeze r6_a31p B3 --visits-file /tmp/r6_p11_a31.txt
    # P15 E2: both arms run the SAME steps and the SAME predicate; the only difference is the
    # hash source. The fault hook drifts one live row between the stage copy and the hashing in
    # both arms. Property: the stored pre-reset hash equals an independent recomputation of the
    # staged content, and (after the drift is reverted) stage equals live.
    LATE=; [ "${R5_NEGCTL_HASH_FROM_LIVE_LATE:-}" = "1" ] && LATE=1   # P16 E2
    env R5_FAULT_DRIFT_AFTER_STAGE_COPY=1 ${LATE:+R5_NEGCTL_HASH_FROM_LIVE_LATE=1} python3 - "$FX" r6_a31p <<'PY'
import sys
sys.path.insert(0, '/opt/Deers-Rock/tools')
import sampled_real_form_diff_r5 as o
fx, rid = sys.argv[1], sys.argv[2]
rd = '/opt/dr-benchmark/results/%s/B3_oracle_run_r5' % rid
nrs = open('/tmp/r6_p11_a31.txt').read().split()
o.stage_backup(nrs, fx, rd, print, rid, stage='B3', batch='2026-10-01')
PY
    A31VALS=$(python3 - "$FX" r6_a31p <<'PY'
import sys
sys.path.insert(0, '/opt/Deers-Rock/tools')
import sampled_real_form_diff_r5 as o
fx, rid = sys.argv[1], sys.argv[2]
rd = '/opt/dr-benchmark/results/%s/B3_oracle_run_r5' % rid
nrs = open('/tmp/r6_p11_a31.txt').read().split()
pfx = o._stage_prefix(rid, 'B3')
stored, prob = o.read_prereset_hash(nrs, rd, pfx, '2026-10-01')
print(o._stage_content_hash(nrs, fx, pfx, lambda *a: None), stored or "NONE", o._content_hash(nrs, fx, lambda *a: None))
PY
)
    read HSTAGE STORED HLIVE <<< "$A31VALS"
    # P17 A6: the restore of the A31' fixture state is part of the verdict (it was fire-and-forget)
    R31=$(python3 - "$FX" r6_a31p <<'PY'
import sys
sys.path.insert(0, '/opt/Deers-Rock/tools')
import sampled_real_form_diff_r5 as o
fx, rid = sys.argv[1], sys.argv[2]
rd = '/opt/dr-benchmark/results/%s/B3_oracle_run_r5' % rid
nrs = open('/tmp/r6_p11_a31.txt').read().split()
ok = o.stage_restore(nrs, fx, rd, lambda *a: None, rid, stage='B3', batch='2026-10-01')
if ok:
    o.stage_drop(fx, rid, lambda *a: None, stage='B3')
print("restored" if ok else "restore-not-verified")
PY
)
    res "A31' restore=$R31"
    res "A31' mode=${LATE:+NC-live-late}${LATE:-stage} stage=${HSTAGE:0:16} stored=${STORED:0:16} live=${HLIVE:0:16} (drift injected between copy and hash in both arms)"
    check 31 "A31' with a live drift injected between the stage copy and the hashing (both arms), the stored pre-reset hash equals the independently recomputed staged content, and stage equals live afterwards; with R5_NEGCTL_HASH_FROM_LIVE_LATE the stored hash captures the drifted live row and this check FAILS" $([ -n "$HSTAGE" ] && [ "$STORED" = "$HSTAGE" ] && [ "$HSTAGE" = "$HLIVE" ] && [ "$R31" = "restored" ] && echo 0 || echo 1)
 fi
 if sel 22b; then
  echo "=== A22b P11: RETRY-REFUSED clears the stale restored flag (restored=False, restore_state=refused) ==="
  PFX22B=r5_stage_B3_r6_a22bp
  printf "2026/10/01/800085\n" > /tmp/r6_p11_a22b.txt
  freeze r6_a22bp B3 --visits-file /tmp/r6_p11_a22b.txt
  env RUN_ID=r6_a22bp R5_HARNESS_TIMEOUT_S=3 $ORACLE --stage B3 --visits-file /tmp/r6_p11_a22b.txt > /tmp/r6_p11_a22b.log 2>&1
  RC1P=$?
  # drop the stage tables so the retry cannot restore -> RETRY-REFUSED
  python3 -c "import sys;sys.path.insert(0,'/opt/Deers-Rock/tools');import sampled_real_form_diff_r5 as o;print(o.stage_drop('${FX}','r6_a22bp',print,stage='B3'))" > /dev/null 2>&1
  SQL "UPDATE ${FX}.billing SET totalbiaya=totalbiaya+1 WHERE no_rawat='2026/10/01/800085';"
  STALE=; [ "${R5_NEGCTL_KEEP_STALE_FLAG:-}" = "1" ] && STALE=1   # P16 E2
  env RUN_ID=r6_a22bp ${STALE:+R5_NEGCTL_KEEP_STALE_FLAG=1} $ORACLE --stage B3 --visits-file /tmp/r6_p11_a22b.txt --retry-failed > /tmp/r6_p11_a22b_retry.log 2>&1
  RC2P=$?
  REF=$(cnt "RETRY-REFUSED" /tmp/r6_p11_a22b_retry.log)
  RSTF=$(python3 -c "import json;st=json.load(open('/opt/dr-benchmark/results/r6_a22bp/B3_oracle_run_r5/.state.json'));print(','.join('%s:%s' % (str(b.get('restored')), str(b.get('restore_state', b.get('restored')))) for b in st['batches'].values()))" 2>/dev/null)
  SQL "UPDATE ${FX}.billing SET totalbiaya=totalbiaya-1 WHERE no_rawat='2026/10/01/800085';"
  res "A22b' refused=$REF restored_flags=$RSTF mode=${STALE:+NC-keep-stale}"
  # the targeted check asserts the P11 property (stale flag cleared) in both modes;
  # with R5_NEGCTL_KEEP_STALE_FLAG the old flag survives, so the assertion FAILS
  check 22b "A22b' RETRY-REFUSED clears the stale flag: state shows restored=False, restore_state=refused, nothing re-billed" $([ "$REF" -ge 1 ] && [ "$RC1P" = "4" ] && [ "$RC2P" = "4" ] && echo "$RSTF" | grep -q "False:refused" && echo 0 || echo 1)
 fi
fi


$DBXML restore >> /tmp/r6_dbxml.log 2>&1
LIVE_LEDGER_POST=$(ledger_hash sik_bench)
XML_POST=$($DBXML probe 2>&1 | awk '{print $NF}' | sort -u | tr '\n' ' ')
res "live guard post: sik_bench ledger $LIVE_LEDGER_POST · database.xml targets: $XML_POST"
LIVE_SIK_POST=$(live_sik)
res "live guard post: sik output-table checksums $LIVE_SIK_POST"
check 13 "live sik_bench ledger + live sik output tables (billing, nota_jalan, detail_nota_jalan, piutang, reg_periksa) untouched; both database.xml copies on sik" $([ "$LIVE_LEDGER_PRE" = "$LIVE_LEDGER_POST" ] && [ "$LIVE_SIK_PRE" = "$LIVE_SIK_POST" ] && [ "$XML_POST" = "sik " ] && echo 0 || echo 1)

{
  echo ""
  echo "## Summary (one row per asserted property; P8-A2)"
  echo ""
  echo "| Check | Status | Property asserted |"
  echo "|---|---|---|"
  printf "%s" "$SUMMARY"
  echo ""
  echo "PASS=$PASS FAIL=$FAIL — a PASS covers only the property in its row, on fixture ${FX}."
  echo ""
  echo "Raw transcripts: /tmp/r6_a*.log (copied next to this file as r5_p6_logs_${TS}.tgz)."
} | tee -a "$OUT"
tar czf /opt/dr-benchmark/p-chain/r5_p6_logs_${TS}.tgz /tmp/r6_a*.log /tmp/r6_fz_*.log 2>/dev/null
echo "=== P6 SUITE DONE: PASS=$PASS FAIL=$FAIL ==="
echo "evidence: $OUT"
# P7-1: the suite fails closed — any FAIL makes the exit code non-zero
[ "$FAIL" = "0" ] && exit 0 || exit 1
