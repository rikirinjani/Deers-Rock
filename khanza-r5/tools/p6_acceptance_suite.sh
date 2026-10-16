#!/bin/bash
# P6 acceptance suite on populated ${FX} — machine-asserted checks.
# Revised 2026-10-16 (pre-run review): every check now asserts the specific log
# line of the gate it claims to exercise (not just an exit code another gate can
# also produce), A10 runs on a SCRATCH ledger copy (never the live sik_bench
# ledger), and an EXIT trap restores the live harness config / A2 price /
# A10 trigger even if the suite dies part-way.
set -u
cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1
FX=${FX:-sik_p6f}  # fixture DB: full clone of sik + 5 STRATA- reg rows
TS=$(date -u +%Y%m%dT%H%M%SZ)
mkdir -p /opt/dr-benchmark/p-chain
OUT=/opt/dr-benchmark/p-chain/r5_p6_acceptance_${TS}.md
PASS=0; FAIL=0
check() {
  if [ "$3" = "0" ]; then echo "A$1: PASS — $2" | tee -a "$OUT"; PASS=$((PASS+1));
  else echo "A$1: FAIL — $2" | tee -a "$OUT"; FAIL=$((FAIL+1)); fi
}
res() { echo "$1" | tee -a "$OUT"; }
cnt() { local n; n=$(grep -ac "$1" "$2" 2>/dev/null); echo "${n:-0}"; }
javacount() { pgrep -f "BilingHarness" | wc -l | tr -d ' '; }
SQL() { mysql -uroot -N -e "$1"; }

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
XML_PRE=$($DBXML probe 2>&1 | awk '{print $NF}' | sort -u | tr '\n' ' ')
res "live guard pre: sik_bench ledger $LIVE_LEDGER_PRE · database.xml targets: $XML_PRE"
if [ "$XML_PRE" != "sik " ]; then res "ABORT: database.xml not on sik before the suite"; exit 3; fi

# ---- fixture guard ----
STRATA_CNT=$(SQL "SELECT COUNT(*) FROM ${FX}.reg_periksa WHERE no_rawat LIKE 'STRATA-%';")
res "fixture guard: ${FX} STRATA- reg rows = $STRATA_CNT (need 5)"
check 0 "fixture: 5 STRATA- reg rows present (date-resolved, P6-2a precondition)" $([ "$STRATA_CNT" = "5" ] && echo 0 || echo 1)
LEFT0=$(SQL "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${FX}' AND table_name LIKE 'r5_stage_%';")
res "fixture guard: pre-existing stage tables on ${FX} = $LEFT0"

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
rm -rf /opt/dr-benchmark/results/r6_*; rm -f /tmp/r6_a*.log /tmp/r6_fz_*.log

ORACLE="python3 sampled_real_form_diff_r5.py --db-name ${FX}"
# a billing run requires a frozen baseline from a prior --freeze-only pass on
# the same RUN_ID/stage (otherwise: "RESUME blocked: no manifest", exit 3)
freeze() { local rid=$1 stg=$2; shift 2
  env RUN_ID=$rid $ORACLE --stage $stg "$@" --freeze-only > /tmp/r6_fz_${rid}_${stg}.log 2>&1
  local rc=$?; res "  freeze $rid/$stg exit=$rc"; return $rc; }

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

echo "=== A10: builder single-session transaction on a SCRATCH ledger (${FX}.dr_charge_ledger) ==="
SQL "DROP TABLE IF EXISTS ${FX}.dr_charge_ledger; CREATE TABLE ${FX}.dr_charge_ledger LIKE sik_bench.dr_charge_ledger; INSERT INTO ${FX}.dr_charge_ledger SELECT * FROM sik_bench.dr_charge_ledger;
     DROP TABLE IF EXISTS ${FX}.dr_tariff; CREATE TABLE ${FX}.dr_tariff LIKE sik_bench.dr_tariff; INSERT INTO ${FX}.dr_tariff SELECT * FROM sik_bench.dr_tariff;"
export P2_LEDGER_DB=${FX} P2_CONSUMER_DB=${FX}
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
TAXBAD=$(SQL "SELECT COUNT(*) FROM (SELECT t.no_rawat, t.amount ta, COALESCE(SUM(d.amount),0) ds FROM ${FX}.dr_charge_ledger t LEFT JOIN ${FX}.dr_charge_ledger d ON d.no_rawat=t.no_rawat AND d.component='drug' WHERE t.component='tax' AND t.no_rawat LIKE '2026/10/%' GROUP BY t.no_rawat, t.amount) x WHERE ABS(ta - ds*0.11) > 1;")
check 10b "A10b stale in-window key (drug+tax) gone after rebuild; every window tax row = 11% of its own drug subtotal" $([ "$RCB" = "0" ] && [ "$STALE" = "0" ] && [ "$TAXBAD" = "0" ] && echo 0 || echo 1)
res "A10b exit=$RCB stale_rows=$STALE tax_rows_inconsistent=$TAXBAD"
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
unset P2_LEDGER_DB P2_CONSUMER_DB

# ---- end-state checks ----
RM_ALL=$(cat /tmp/r6_a*.log | grep -ac "STAGE-RESTORE-MISMATCH")
DF_ALL=$(cat /tmp/r6_a*.log | grep -ac "STAGE-DROP-FAILED")
RV_ALL=$(cat /tmp/r6_a*.log | grep -ac "STAGE-RESTORED-VERIFIED")
res "all transcripts: STAGE-RESTORED-VERIFIED=$RV_ALL STAGE-RESTORE-MISMATCH=$RM_ALL STAGE-DROP-FAILED=$DF_ALL"
check 11 "every restore across the suite hash-verified (0 mismatch, >=1 verified) and no failed stage drop" $([ "$RM_ALL" = "0" ] && [ "$DF_ALL" = "0" ] && [ "$RV_ALL" -ge 1 ] && echo 0 || echo 1)
STAGE_LEFT=$(SQL "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${FX}' AND table_name LIKE 'r5_stage_%';")
res "stage tables remaining on ${FX}: $STAGE_LEFT (pre-existing $LEFT0)"
check 12 "0 stage tables left on target (verified-clean drop)" $([ "$STAGE_LEFT" = "0" ] && echo 0 || echo 1)

$DBXML restore >> /tmp/r6_dbxml.log 2>&1
LIVE_LEDGER_POST=$(ledger_hash sik_bench)
XML_POST=$($DBXML probe 2>&1 | awk '{print $NF}' | sort -u | tr '\n' ' ')
res "live guard post: sik_bench ledger $LIVE_LEDGER_POST · database.xml targets: $XML_POST"
check 13 "live sik_bench ledger untouched + both database.xml copies restored to sik" $([ "$LIVE_LEDGER_PRE" = "$LIVE_LEDGER_POST" ] && [ "$XML_POST" = "sik " ] && echo 0 || echo 1)

{
  echo ""
  echo "## Summary"
  echo "PASS=$PASS FAIL=$FAIL"
  echo ""
  echo "Raw transcripts: /tmp/r6_a*.log (copied next to this file as r5_p6_logs_${TS}.tgz)."
} | tee -a "$OUT"
tar czf /opt/dr-benchmark/p-chain/r5_p6_logs_${TS}.tgz /tmp/r6_a*.log /tmp/r6_fz_*.log 2>/dev/null
echo "=== P6 SUITE DONE: PASS=$PASS FAIL=$FAIL ==="
echo "evidence: $OUT"
