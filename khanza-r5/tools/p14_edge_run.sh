#!/bin/bash
# P14 T2: run driver for the edge-strata fixture (and, optionally, real visits for T5).
# Builds the throwaway clone sik_p14e from sik (8 audit triggers, grant on the clone only),
# loads the fixture, copies dr_tariff, builds the clone ledger with the FROZEN builder
# (env-guarded), retargets database.xml, bills the fixture with the DR consumer from an
# ENC-only input, runs the oracle (freeze-only, then the real form) on the fixture with
# --allow-strata, then optionally on the real visits, restores database.xml, and keeps the
# clone for the comparators. EXIT trap restores database.xml and revokes the grant even on failure.
#
# Usage: DR_LOCK_SESSION=<id> bash p14_edge_run.sh <fixture-dir> [<real-visits-file>]
#   P14_FIXTURE_VISITS=<file>   bill only these fixture visits (pilot / kill test)
#   P14_GUARD_SELFTEST=1        prove the builder guard: unset P2_LEDGER_DB, call it, expect exit 3
# Derived from p13_wide_sample.sh.
set -u
cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1
FX=sik_p14e
FXDIR=${1:?fixture dir}
REAL=${2:-}
. ./dr_runlock.sh; dr_runlock_require p14_edge_run.sh
TS=$(date -u +%Y%m%dT%H%M%SZ)
mkdir -p /opt/dr-benchmark/p14/runs
OUT=/opt/dr-benchmark/p14/runs/p14_edge_run_${TS}.md
DBXML="python3 /opt/Deers-Rock/tools/p6_dbxml.py"
SQL() { mysql -uroot -N -e "$1"; }
res() { echo "$1" | tee -a "$OUT"; }
BUILT=0
ORACLE_RC=0
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
  $DBXML restore >> /tmp/p14e_dbxml.log 2>&1
  pkill -f '[B]ilingHarness' 2>/dev/null
  SQL "REVOKE SELECT, INSERT, UPDATE, DELETE ON \`$FX\`.* FROM \`benchmark\`@\`localhost\`;" 2>/dev/null
  if [ "$BUILT" = "1" ] && [ "$ORACLE_RC" -ne 3 ]; then
    res "cleanup: clone $FX KEPT - run p14_drop_clone.sh after the comparators"
  elif [ "$BUILT" = "1" ]; then
    SQL "DROP DATABASE IF EXISTS $FX;"
    res "cleanup: clone $FX dropped (half-built or freeze failure)"
  fi
  XML_STATE=$($DBXML probe 2>&1 | grep '^\[dbxml\]' | awk '{print $NF}' | sort -u | tr '\n' ' ')
  DB_STATE=$(SQL 'SHOW DATABASES' | grep '^sik' | tr '\n' ',')
  GR=$(SQL "SELECT COUNT(*) FROM information_schema.schema_privileges WHERE grantee LIKE '%benchmark%' AND table_schema='$FX'")
  res "cleanup-final: sik_dbs=${DB_STATE} dbxml_targets=${XML_STATE} clone_grants=${GR}"
}
trap cleanup EXIT

{ echo "# P14 edge run $TS UTC"; echo "fixture: $FXDIR  real: ${REAL:-none}"; echo; } > "$OUT"

if [ "${P14_GUARD_SELFTEST:-0}" = "1" ]; then
  unset P2_LEDGER_DB P2_CONSUMER_DB
  res "guard self-test: calling run_builder with P2_LEDGER_DB unset"
  run_builder
  res "GUARD-SELFTEST-FAILED: run_builder returned instead of exiting 3"
  exit 1
fi

python3 p14_edge_fixture.py --verify "$FXDIR" | tee -a "$OUT" | tail -1
[ "${PIPESTATUS[0]}" = "0" ] || { res "ABORT: fixture --verify failed"; exit 3; }
FVIS=${P14_FIXTURE_VISITS:-$FXDIR/p14_edge_visits.txt}

XML_PRE=$($DBXML probe 2>&1 | grep '^\[dbxml\]' | awk '{print $NF}' | sort -u)
[ "$XML_PRE" = "sik" ] || { res "ABORT: database.xml not on sik ($XML_PRE)"; exit 3; }
[ -n "$(SQL "SHOW DATABASES LIKE '$FX'")" ] && { res "$FX exists - refusing (run p14_drop_clone.sh first)"; exit 3; }
[ "$(df --output=avail -BG / | tail -1 | tr -dc 0-9)" -ge 20 ] || { res "STOP RULE: <20GB free"; exit 3; }

res "clone: creating $FX"
SQL "CREATE DATABASE $FX CHARACTER SET $(SQL "SELECT default_character_set_name FROM information_schema.schemata WHERE schema_name='sik'") COLLATE $(SQL "SELECT default_collation_name FROM information_schema.schemata WHERE schema_name='sik'")"
BUILT=1
ORACLE_RC=3   # until the oracle has run, a failure drops the half-built clone
T0=$(date +%s)
mysqldump -uroot --single-transaction --quick --skip-lock-tables sik | mysql -uroot $FX || { res "ABORT: mysqldump failed"; exit 3; }
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
python3 - "$FX" "$PIN" <<'PY' | tee -a "$OUT"
import sys, hashlib
sys.path.insert(0, '/opt/Deers-Rock/tools'); import dbutil
fx, pin = sys.argv[1], sys.argv[2]
rows = dbutil.query(fx, "SELECT * FROM dr_charge_ledger WHERE no_rawat NOT LIKE '2027/12/31/%' ORDER BY no_rawat, component, code", force_root=True)
h = hashlib.sha256()
for r in rows: h.update(("|".join(str(c) for c in r) + "\n").encode())
got = "%d:%s" % (len(rows), h.hexdigest())
fxn = dbutil.scalar(fx, "SELECT COUNT(*) FROM dr_charge_ledger WHERE no_rawat LIKE '2027/12/31/%'", force_root=True)
print("clone ledger (non-fixture rows): %s %s" % (got, "REPRODUCES-PIN" if got == pin else "DIFFERS-FROM-PIN"))
print("clone ledger fixture rows: %s" % fxn)
PY
unset P2_LEDGER_DB P2_CONSUMER_DB
if [ -f "$FXDIR/p14_edge_fixture_late.sql" ]; then
  # P14 amendment: visits the frozen builder cannot build (fractional jml) are loaded after it
  mysql -uroot $FX < "$FXDIR/p14_edge_fixture_late.sql" || { res "ABORT: late fixture load failed"; exit 3; }
  res "late fixture loaded after the ledger build: reg=$(SQL "SELECT COUNT(*) FROM $FX.reg_periksa WHERE no_rawat LIKE '2027/12/31/%'") (ledger rows for them: $(SQL "SELECT COUNT(*) FROM $FX.dr_charge_ledger WHERE no_rawat IN ('2027/12/31/900019','2027/12/31/900020')"))"
fi

SQL "GRANT SELECT, INSERT, UPDATE, DELETE ON \`$FX\`.* TO \`benchmark\`@\`localhost\`;"
res "grant: benchmark@localhost on $FX"
$DBXML retarget $FX > /tmp/p14e_dbxml.log 2>&1
grep -q "RETARGET-VERIFIED $FX" /tmp/p14e_dbxml.log || { res "ABORT: retarget not verified"; exit 3; }
res "harness+consumer database.xml -> $FX (RETARGET-VERIFIED)"

# Consumer baseline for the fixture: ENC-only lines (no OBAT, so detail_pemberian_obat is not rewritten)
MINI=/opt/dr-benchmark/p14/runs/consumer_enc_${TS}.txt
: > "$MINI"
while read -r NR; do
  [ -z "$NR" ] && continue
  echo "ENC $NR $(SQL "SELECT CONCAT(tgl_registrasi,' ',jam_reg) FROM $FX.reg_periksa WHERE no_rawat='$NR'")" >> "$MINI"
  echo "END" >> "$MINI"
done < "$FVIS"
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
res "consumer baseline billing rows for fixture: $(SQL "SELECT COUNT(*) FROM $FX.billing WHERE no_rawat LIKE '2027/12/31/%'")"
res "fixture detail_pemberian_obat unchanged by consumer: $(SQL "SELECT COUNT(*), SUM(embalase), SUM(tuslah), SUM(total) FROM $FX.detail_pemberian_obat WHERE no_rawat LIKE '2027/12/31/%'" | tr '\t' ' ')"

oracle_run() {   # <label> <visits> <extra-flags>
  local label=$1 vis=$2 extra=$3
  local rid="p14e_${label}_${TS}"
  local ORACLE="python3 sampled_real_form_diff_r5.py --db-name $FX --stage B3 --visits-file $vis $extra"
  res "oracle[$label]: freeze-only (RUN_ID=$rid, $(wc -l < "$vis") visits)"
  env RUN_ID=$rid $ORACLE --freeze-only > /tmp/p14e_${label}.log 2>&1
  local fc=$?
  res "oracle[$label]: freeze-only exit=$fc"
  [ "$fc" -eq 0 ] || { tail -15 /tmp/p14e_${label}.log | tee -a "$OUT"; return 3; }
  local t0=$(date +%s)
  env RUN_ID=$rid $ORACLE >> /tmp/p14e_${label}.log 2>&1
  local rc=$?
  local el=$(( $(date +%s) - t0 ))
  res "oracle[$label]: real run exit=$rc elapsed=${el}s"
  grep -aE "reset |BILLED|FAILED|STAGE-RESTOR|ORACLE_|ALIGNED|ALLOW-STRATA|WRITER|VERDICT|NOT-COVERED" /tmp/p14e_${label}.log | cut -c1-220 | tee -a "$OUT"
  local hd="/opt/dr-benchmark/results/$rid/B3_oracle_run_r5"
  local ok=$(grep -haoE '[0-9]{4}/[0-9]{2}/[0-9]{2}/[0-9]{6}.{0,80}sukses=true' $hd/harness_*.log 2>/dev/null | grep -oE '^[0-9]{4}/[0-9]{2}/[0-9]{2}/[0-9]{6}' | sort -u | wc -l)
  local bad=$(grep -haoE '[0-9]{4}/[0-9]{2}/[0-9]{2}/[0-9]{6}.{0,80}sukses=false' $hd/harness_*.log 2>/dev/null | grep -oE '^[0-9]{4}/[0-9]{2}/[0-9]{2}/[0-9]{6}' | sort -u | wc -l)
  res "form[$label]: distinct visits sukses=true $ok, sukses=false $bad (of $(wc -l < "$vis")); rate $(python3 -c "print('%.2f' % ($(wc -l < "$vis") / max($el,1) * 60))") visits/min"
  mkdir -p /opt/dr-benchmark/p14/runs/$label
  cp /tmp/p14e_${label}.log /opt/dr-benchmark/p14/runs/$label/oracle_${TS}.log
  cp "$vis" /opt/dr-benchmark/p14/runs/$label/
  for f in /opt/dr-benchmark/results/$rid/B3_sampled_form_diff_r5.*; do [ -f "$f" ] && cp "$f" /opt/dr-benchmark/p14/runs/$label/; done
  if [ "$bad" -gt 0 ] && [ $(( bad * 100 / $(wc -l < "$vis") )) -gt 2 ]; then
    res "STOP RULE[$label]: >2% sukses=false"; return 1
  fi
  return $rc
}

oracle_run fixture "$FVIS" "--allow-strata"
FIX_RC=$?
ORACLE_RC=$FIX_RC
res "fixture oracle exit=$FIX_RC (4 = PARTIAL-NOT-COVERED is the expected exit for out-of-envelope strata)"
case "$FIX_RC" in 0|1|4) ;; *) res "STOP: fixture oracle exit $FIX_RC"; exit "$FIX_RC" ;; esac

if [ -n "$REAL" ]; then
  oracle_run real "$REAL" ""
  REAL_RC=$?
  res "real oracle exit=$REAL_RC (0 expected)"
  [ "$REAL_RC" -eq 3 ] && ORACLE_RC=1
fi

$DBXML restore >> /tmp/p14e_dbxml.log 2>&1
res "database.xml restored (exit=$?)"
res "P14E fixture_rc=$FIX_RC real_rc=${REAL_RC:-n/a} clone=$FX kept for comparators"
exit 0
