#!/bin/bash
# P14 T2 / P15: run driver for the edge-strata fixture (and, optionally, real visits).
# Builds the throwaway clone sik_p14e from sik (8 audit triggers, grant on the clone only),
# loads the fixture, copies dr_tariff, builds the clone ledger with the FROZEN builder
# (env-guarded) and requires it to reproduce the ledger pin, retargets database.xml, bills the
# fixture with the DR consumer from an ENC-only input, runs the oracle (freeze-only, then the
# real form) on the fixture with --allow-strata, then optionally on the real visits, restores
# database.xml, and keeps the clone for the comparators.
#
# P15 safety (task doc §2 A): every validation runs BEFORE the EXIT trap (a refusal touches
# nothing); cleanup only undoes what THIS run did (its clone, its grant, its xml retarget, its
# harness process groups); pipefail + clone validation; integer-safe stop rule; ledger pin
# mismatch fails; exit codes below.
#
# Exit: 0 fixture oracle 4 (expected) and real oracle 0 (or no real run); 1 any other oracle
#       outcome or a stop rule; 3 refusal / build / pin / setup failure.
# Usage: DR_LOCK_SESSION=<id> bash p14_edge_run.sh <fixture-dir> [<real-visits-file>]
#   P14_FIXTURE_VISITS=<file>   bill only these fixture visits (pilot / kill test)
#   P14_GUARD_SELFTEST=1        prove the builder guard: unset P2_LEDGER_DB, call it, expect exit 3
set -u
set -o pipefail
cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1
FX=sik_p14e
FXDIR=${1:?fixture dir}
REAL=${2:-}
. ./dr_runlock.sh; dr_runlock_require p14_edge_run.sh
. ./p15_lib.sh
TS=$(date -u +%Y%m%dT%H%M%SZ)
RUNDIR=/opt/dr-benchmark/p15/runs
mkdir -p $RUNDIR
OUT=$RUNDIR/p14_edge_run_${TS}.md
DBXML="python3 /opt/Deers-Rock/tools/p6_dbxml.py"
SQL() { mysql -uroot -N -e "$1"; }
res() { echo "$1" | tee -a "$OUT"; }
CREATED=0; GRANTED=0; RETARGETED=0; KEEP=0; RIDS=""
PIN="356355:a66a3a546cc322d3eca31f2bc5558993e183b1c5afbf444d4a2a3781cfe7aea7"

run_builder() {
  # Guard (P14 §0): the frozen builder writes to P2_LEDGER_DB (default = live sik_bench).
  if [ "${P2_LEDGER_DB:-}" != "$FX" ] || [ "${P2_CONSUMER_DB:-}" != "$FX" ]; then
    res "BUILDER-GUARD: refusing (P2_LEDGER_DB='${P2_LEDGER_DB:-<unset>}' P2_CONSUMER_DB='${P2_CONSUMER_DB:-<unset>}', both must be $FX)"
    exit 3
  fi
  python3 build_dr_charge_ledger_p2.py --window ALL --cohort dr --require-tariff > /tmp/p14e_builder.log 2>&1
  local rc=$?
  res "builder: exit=$rc ($(grep -c . /tmp/p14e_builder.log) log lines)"
  grep -aE "rows:|FAIL|committed|tariff" /tmp/p14e_builder.log | cut -c1-160 | tee -a "$OUT"
  return $rc
}

cleanup() {
  # Undo only what this run did (P15 A2).
  if ! p15_kill_run_harness $RIDS; then
    res "CLEANUP-INCOMPLETE: a harness process group was not confirmed dead - database.xml, grant and clone left as they are (P17 A3)"
    exit 3
  fi
  [ "$RETARGETED" = "1" ] && $DBXML restore >> /tmp/p14e_dbxml.log 2>&1
  [ "$GRANTED" = "1" ] && SQL "REVOKE SELECT, INSERT, UPDATE, DELETE ON \`$FX\`.* FROM 'benchmark'@'localhost';" 2>/dev/null
  if [ "$CREATED" = "1" ]; then
    if [ "$KEEP" = "1" ]; then
      res "cleanup: clone $FX KEPT - run p14_drop_clone.sh after the comparators"
    else
      SQL "DROP DATABASE IF EXISTS $FX;"
      res "cleanup: clone $FX dropped (created by this run, not complete)"
    fi
  fi
  XML_STATE=$($DBXML probe 2>&1 | grep '^\[dbxml\]' | awk '{print $NF}' | sort -u | tr '\n' ' ')
  DB_STATE=$(SQL 'SHOW DATABASES' | grep '^sik' | tr '\n' ',')
  res "cleanup-final: sik_dbs=${DB_STATE} dbxml_targets=${XML_STATE} clone_grants=$(p15_grant_count $FX)"
}

{ echo "# P15 edge run (p14_edge_run.sh) $TS UTC"; echo "fixture: $FXDIR  real: ${REAL:-none}"; echo; } > "$OUT"

if [ "${P14_GUARD_SELFTEST:-0}" = "1" ]; then
  unset P2_LEDGER_DB P2_CONSUMER_DB
  res "guard self-test: calling run_builder with P2_LEDGER_DB unset"
  run_builder
  res "GUARD-SELFTEST-FAILED: run_builder returned instead of exiting 3"
  exit 1
fi

# --- validation: nothing below this line has touched anything yet; refusals exit without cleanup ---
python3 p14_edge_fixture.py --verify "$FXDIR" | tee -a "$OUT" | tail -1
[ "${PIPESTATUS[0]}" = "0" ] || { res "ABORT: fixture --verify failed"; exit 3; }
FVIS=${P14_FIXTURE_VISITS:-$FXDIR/p14_edge_visits.txt}
[ -s "$FVIS" ] || { res "ABORT: empty fixture visit list"; exit 3; }
[ -z "$REAL" ] || [ -s "$REAL" ] || { res "ABORT: empty real visit list"; exit 3; }
XML_PRE=$($DBXML probe 2>&1 | grep '^\[dbxml\]' | awk '{print $NF}' | sort -u)
[ "$XML_PRE" = "sik" ] || { res "ABORT: database.xml not on sik ($XML_PRE) - refusing, nothing touched"; exit 3; }
[ -n "$(SQL "SHOW DATABASES LIKE '$FX'")" ] && { res "$FX exists - refusing, nothing touched (run p14_drop_clone.sh first)"; exit 3; }
[ "$(df --output=avail -BG / | tail -1 | tr -dc 0-9)" -ge 20 ] || { res "STOP RULE: <20GB free"; exit 3; }
trap cleanup EXIT

res "clone: creating $FX"
SQL "CREATE DATABASE $FX CHARACTER SET $(SQL "SELECT default_character_set_name FROM information_schema.schemata WHERE schema_name='sik'") COLLATE $(SQL "SELECT default_collation_name FROM information_schema.schemata WHERE schema_name='sik'")" \
  || { res "ABORT: CREATE DATABASE failed"; exit 3; }
CREATED=1
T0=$(date +%s)
mysqldump -uroot --single-transaction --quick --skip-lock-tables sik | mysql -uroot $FX \
  || { res "ABORT: clone pipeline failed (pipefail: mysqldump or mysql exit != 0)"; exit 3; }
p15_clone_matches_sik $FX | tee -a "$OUT"
[ "${PIPESTATUS[0]}" = "0" ] || { res "ABORT: clone does not match sik"; exit 3; }
res "clone $FX ready in $(( $(date +%s) - T0 ))s ($(SQL "SELECT COUNT(*) FROM $FX.billing") billing rows)"

mysql -uroot $FX < "$FXDIR/p14_edge_fixture.sql" || { res "ABORT: fixture load failed"; exit 3; }
res "fixture loaded: reg=$(SQL "SELECT COUNT(*) FROM $FX.reg_periksa WHERE no_rawat LIKE '2027/12/31/%'") proc=$(SQL "SELECT COUNT(*) FROM $FX.rawat_jl_dr WHERE no_rawat LIKE '2027/12/31/%'") dpo=$(SQL "SELECT COUNT(*) FROM $FX.detail_pemberian_obat WHERE no_rawat LIKE '2027/12/31/%'")"
res "live untouched by the load: $(SQL "SELECT COUNT(*) FROM sik.reg_periksa WHERE no_rawat LIKE '2027/12/31/%'") fixture rows in sik.reg_periksa"

mysql -uroot $FX <<'TRG'
CREATE TABLE p7_write_audit (id BIGINT AUTO_INCREMENT PRIMARY KEY, tbl VARCHAR(40), op VARCHAR(8),
  no_rawat VARCHAR(17), acct VARCHAR(100), conn BIGINT, at DATETIME(6));
DELIMITER //
CREATE TRIGGER p7a_billing_i AFTER INSERT ON billing FOR EACH ROW BEGIN INSERT INTO p7_write_audit (tbl,op,no_rawat,acct,conn,at) VALUES ('billing','INSERT',NEW.no_rawat,USER(),CONNECTION_ID(),NOW(6)); END//
CREATE TRIGGER p7a_billing_d AFTER DELETE ON billing FOR EACH ROW BEGIN INSERT INTO p7_write_audit (tbl,op,no_rawat,acct,conn,at) VALUES ('billing','DELETE',OLD.no_rawat,USER(),CONNECTION_ID(),NOW(6)); END//
CREATE TRIGGER p7a_nota_i AFTER INSERT ON nota_jalan FOR EACH ROW BEGIN INSERT INTO p7_write_audit (tbl,op,no_rawat,acct,conn,at) VALUES ('nota_jalan','INSERT',NEW.no_rawat,USER(),CONNECTION_ID(),NOW(6)); END//
CREATE TRIGGER p7a_nota_d AFTER DELETE ON nota_jalan FOR EACH ROW BEGIN INSERT INTO p7_write_audit (tbl,op,no_rawat,acct,conn,at) VALUES ('nota_jalan','DELETE',OLD.no_rawat,USER(),CONNECTION_ID(),NOW(6)); END//
CREATE TRIGGER p7a_dnota_i AFTER INSERT ON detail_nota_jalan FOR EACH ROW BEGIN INSERT INTO p7_write_audit (tbl,op,no_rawat,acct,conn,at) VALUES ('detail_nota_jalan','INSERT',NEW.no_rawat,USER(),CONNECTION_ID(),NOW(6)); END//
CREATE TRIGGER p7a_dnota_d AFTER DELETE ON detail_nota_jalan FOR EACH ROW BEGIN INSERT INTO p7_write_audit (tbl,op,no_rawat,acct,conn,at) VALUES ('detail_nota_jalan','DELETE',OLD.no_rawat,USER(),CONNECTION_ID(),NOW(6)); END//
CREATE TRIGGER p7a_piut_i AFTER INSERT ON piutang_pasien FOR EACH ROW BEGIN INSERT INTO p7_write_audit (tbl,op,no_rawat,acct,conn,at) VALUES ('piutang_pasien','INSERT',NEW.no_rawat,USER(),CONNECTION_ID(),NOW(6)); END//
CREATE TRIGGER p7a_piut_d AFTER DELETE ON piutang_pasien FOR EACH ROW BEGIN INSERT INTO p7_write_audit (tbl,op,no_rawat,acct,conn,at) VALUES ('piutang_pasien','DELETE',OLD.no_rawat,USER(),CONNECTION_ID(),NOW(6)); END//
DELIMITER ;
TRG
TRIG_COUNT=$(SQL "SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema='$FX' AND trigger_name LIKE 'p7a_%'")
res "audit triggers: $TRIG_COUNT (need 8)"
[ "$TRIG_COUNT" = "8" ] || { res "ABORT: only $TRIG_COUNT audit triggers"; exit 3; }

SQL "CREATE TABLE $FX.dr_tariff LIKE sik_bench.dr_tariff; INSERT INTO $FX.dr_tariff SELECT * FROM sik_bench.dr_tariff;"
res "dr_tariff copied into $FX: $(SQL "SELECT COUNT(*) FROM $FX.dr_tariff") rows (sik_bench read only)"
export P2_LEDGER_DB=$FX P2_CONSUMER_DB=$FX
run_builder || { res "ABORT: builder failed"; exit 3; }
unset P2_LEDGER_DB P2_CONSUMER_DB
p15_ledger_pin_check $FX "$PIN" | tee -a "$OUT"
[ "${PIPESTATUS[0]}" = "0" ] || { KEEP=1; res "ABORT: clone ledger DIFFERS-FROM-PIN (P15 A6) - clone kept for inspection"; exit 3; }
res "clone ledger fixture rows: $(SQL "SELECT COUNT(*) FROM $FX.dr_charge_ledger WHERE no_rawat LIKE '2027/12/31/%'")"
if [ -f "$FXDIR/p14_edge_fixture_late.sql" ]; then
  # P14 amendment: visits the frozen builder cannot build (fractional jml) are loaded after it
  mysql -uroot $FX < "$FXDIR/p14_edge_fixture_late.sql" || { res "ABORT: late fixture load failed"; exit 3; }
  res "late fixture loaded after the ledger build: reg=$(SQL "SELECT COUNT(*) FROM $FX.reg_periksa WHERE no_rawat LIKE '2027/12/31/%'") (ledger rows for them: $(SQL "SELECT COUNT(*) FROM $FX.dr_charge_ledger WHERE no_rawat IN ('2027/12/31/900019','2027/12/31/900020')"))"
fi
KEEP=1   # the clone is complete and pinned: keep it for the comparators from here on

SQL "GRANT SELECT, INSERT, UPDATE, DELETE ON \`$FX\`.* TO 'benchmark'@'localhost';" || { res "ABORT: grant failed"; exit 3; }
GRANTED=1
GC=$(p15_grant_count $FX)
res "grant: benchmark@localhost on $FX (probe sees $GC privileges; positive case for P15 A7)"
[ "$GC" -ge 1 ] || { res "ABORT: grant probe cannot see the grant just added (vacuous probe)"; exit 3; }
$DBXML retarget $FX > /tmp/p14e_dbxml.log 2>&1
RETARGETED=1
grep -q "RETARGET-VERIFIED $FX" /tmp/p14e_dbxml.log || { res "ABORT: retarget not verified"; exit 3; }
res "harness+consumer database.xml -> $FX (RETARGET-VERIFIED)"

# Consumer baseline for the fixture: ENC-only lines (no OBAT, so detail_pemberian_obat is not rewritten)
MINI=$RUNDIR/consumer_enc_${TS}.txt
: > "$MINI"
while read -r NR; do
  [ -z "$NR" ] && continue
  echo "ENC $NR $(SQL "SELECT CONCAT(tgl_registrasi,' ',jam_reg) FROM $FX.reg_periksa WHERE no_rawat='$NR'")" >> "$MINI"
  echo "END" >> "$MINI"
done < "$FVIS"
DPO_BEFORE=$(SQL "SELECT COUNT(*), SUM(embalase), SUM(tuslah), SUM(total), SUM(jml) FROM $FX.detail_pemberian_obat WHERE no_rawat LIKE '2027/12/31/%'" | tr '\t' ' ')
python3 - "$MINI" <<'PY' | tee -a "$OUT"
import subprocess, sys
sys.path.insert(0, '/opt/Deers-Rock/tools'); import dbutil
mini = sys.argv[1]; log = mini.replace(".txt", ".log")
p = subprocess.run(["java", "-cp", dbutil.CONSUMER_CP, "KhanzaBillingConsumer", mini, log],
                   cwd=dbutil.KHANZA_DIR, capture_output=True, text=True, timeout=900)
print("consumer (ENC-only fixture baseline): rc=%d" % p.returncode)
sys.exit(p.returncode)
PY
[ "${PIPESTATUS[0]}" = "0" ] || { res "ABORT: consumer baseline failed"; exit 3; }
DPO_AFTER=$(SQL "SELECT COUNT(*), SUM(embalase), SUM(tuslah), SUM(total), SUM(jml) FROM $FX.detail_pemberian_obat WHERE no_rawat LIKE '2027/12/31/%'" | tr '\t' ' ')
res "consumer baseline billing rows for fixture: $(SQL "SELECT COUNT(*) FROM $FX.billing WHERE no_rawat LIKE '2027/12/31/%'")"
res "fixture detail_pemberian_obat before/after consumer: [$DPO_BEFORE] / [$DPO_AFTER]"
[ "$DPO_BEFORE" = "$DPO_AFTER" ] || { res "ABORT: consumer changed the fixture drug rows"; exit 3; }

oracle_run() {   # <label> <visits> <extra-flags>; returns the oracle exit, or 10 for a stop rule, 3 for freeze failure
  local label=$1 vis=$2 extra=$3
  local rid="p15e_${label}_${TS}"
  RIDS="$RIDS $rid"
  local ORACLE="python3 sampled_real_form_diff_r5.py --db-name $FX --stage B3 --visits-file $vis $extra"
  res "oracle[$label]: freeze-only (RUN_ID=$rid, $(wc -l < "$vis") visits)"
  env RUN_ID=$rid $ORACLE --freeze-only > /tmp/p15e_${label}.log 2>&1
  local fc=$?
  res "oracle[$label]: freeze-only exit=$fc"
  [ "$fc" -eq 0 ] || { tail -15 /tmp/p15e_${label}.log | tee -a "$OUT"; return 3; }
  local start; start=$(SQL "SELECT NOW(6)")
  echo "$start" > $RUNDIR/${label}_run_start_${TS}.txt
  res "oracle[$label]: run start (MySQL NOW(6), for fresh-B --since) = $start"
  local t0=$(date +%s)
  env RUN_ID=$rid $ORACLE >> /tmp/p15e_${label}.log 2>&1
  local rc=$?
  local el=$(( $(date +%s) - t0 ))
  res "oracle[$label]: real run exit=$rc elapsed=${el}s"
  grep -aE "reset |BILLED|FAILED|STAGE-RESTOR|ORACLE_|ALIGNED|ALLOW-STRATA|WRITER|VERDICT|NOT-COVERED" /tmp/p15e_${label}.log | cut -c1-220 | tee -a "$OUT"
  local hd="/opt/dr-benchmark/results/$rid/B3_oracle_run_r5"
  local n; n=$(wc -l < "$vis")
  local ok; ok=$(p15_count_sukses "$hd" true)
  local bad; bad=$(p15_count_sukses "$hd" false)
  res "form[$label]: distinct visits sukses=true $ok, sukses=false $bad (of $n); rate $(python3 -c "print('%.2f' % ($n / max($el,1) * 60))") visits/min"
  mkdir -p $RUNDIR/$label
  cp /tmp/p15e_${label}.log $RUNDIR/$label/oracle_${TS}.log
  cp "$vis" $RUNDIR/$label/
  for f in /opt/dr-benchmark/results/$rid/B3_sampled_form_diff_r5.*; do [ -f "$f" ] && cp "$f" $RUNDIR/$label/; done
  if p15_stop_rule_fires "$bad" "$n"; then
    res "STOP RULE[$label]: $bad/$n sukses=false (>2 %)"; return 10
  fi
  # P17 A13: every visit must have a sukses=true line. A harness killed before it wrote any line leaves
  # ok=0, bad=0 (the stop rule cannot fire) and the oracle can still exit 4, the value that is expected
  # for the out-of-envelope fixture strata.
  if [ "$ok" != "$n" ]; then
    res "FORM-INCOMPLETE[$label]: sukses=true for $ok of $n visits"; return 10
  fi
  # P19 N3: a batch the oracle marked FAILED (or a stage restore it could not verify) is not "the expected 4"
  if p15_oracle_batch_failed /tmp/p15e_${label}.log; then
    res "ORACLE-BATCH-FAILED[$label]: the oracle log shows a FAILED batch or a stage restore that was not verified"; return 10
  fi
  return $rc
}

oracle_run fixture "$FVIS" "--allow-strata"
FIX_RC=$?
res "fixture oracle rc=$FIX_RC (4 = PARTIAL-NOT-COVERED is the only expected value for out-of-envelope strata)"
REAL_RC=""
if [ "$FIX_RC" = "4" ] && [ -n "$REAL" ]; then
  oracle_run real "$REAL" ""
  REAL_RC=$?
  res "real oracle rc=$REAL_RC (0 expected)"
fi

$DBXML restore >> /tmp/p14e_dbxml.log 2>&1 && RETARGETED=0
XML_NOW=$($DBXML probe 2>&1 | grep '^\[dbxml\]' | awk '{print $NF}' | sort -u)
if [ "$RETARGETED" = "0" ] && [ "$XML_NOW" = "sik" ]; then
  res "database.xml restored (targets: $XML_NOW)"
else
  res "ABORT: database.xml not restored (targets: ${XML_NOW:-unreadable}) - clone kept; P17 A1"
  KEEP=1
  exit 3
fi
if p15_decide_exit "$FIX_RC" "$REAL_RC"; then
  res "P15E OK fixture_rc=$FIX_RC real_rc=${REAL_RC:-n/a} clone=$FX kept for comparators"
  exit 0
fi
res "P15E FAILED fixture_rc=$FIX_RC real_rc=${REAL_RC:-n/a} (clone kept for inspection)"
exit 1
