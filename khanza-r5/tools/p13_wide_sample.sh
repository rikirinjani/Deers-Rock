#!/bin/bash
# P13 T2: run driver for the wide sample. Builds a throwaway clone with 8 audit
# triggers, retargets database.xml, runs the oracle (freeze + real form run),
# restores database.xml, and keeps the clone for the comparator.
#
# Usage: DR_LOCK_SESSION=<id> bash p13_wide_sample.sh <stage-name> <visits-file>
#
# The clone is ALWAYS kept after a successful run (the comparator runs on it).
# Use p13_drop_clone.sh to tear it down after the comparator finishes.
#
# EXIT trap restores database.xml and revokes the grant even on failure.
# Derived from p12_visit_replay.sh structure.
set -u
cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1
FX=sik_p13w
STAGE=${1:?stage name}
VISITS=${2:?visits file}
. ./dr_runlock.sh; dr_runlock_require p13_wide_sample.sh
TS=$(date -u +%Y%m%dT%H%M%SZ)
OUT=/opt/dr-benchmark/p-chain/r5_p13_wide_${STAGE}_${TS}.md
DBXML="python3 /opt/Deers-Rock/tools/p6_dbxml.py"
SQL() { mysql -uroot -N -e "$1"; }
res() { echo "$1" | tee -a "$OUT"; }
BUILT=0
ORACLE_RC=0
TOTAL_VISITS=0

cleanup() {
  # Always restore database.xml and revoke the grant. The clone is kept
  # unless BUILT=0 (it was never created). On freeze-only failure the clone
  # may be half-built — drop it in that case.
  $DBXML restore >> /tmp/p13w_dbxml.log 2>&1
  pkill -f BilingHarness 2>/dev/null
  SQL "REVOKE SELECT, INSERT, UPDATE, DELETE ON \`$FX\`.* FROM \`benchmark\`@\`localhost\`;" 2>/dev/null
  if [ "$BUILT" = "1" ] && [ "$ORACLE_RC" -ne 3 ]; then
    res "cleanup: clone $FX KEPT — run p13_drop_clone.sh after the comparator"
  else
    SQL "DROP DATABASE IF EXISTS $FX;"
    res "cleanup: clone $FX dropped"
  fi
  # Post-cleanup proof line
  XML_STATE=$($DBXML probe 2>&1 | grep '^\[dbxml\]' | awk '{print $NF}' | sort -u)
  DB_STATE=$(SQL 'SHOW DATABASES' | grep '^sik' | tr '\n' ',')
  res "cleanup-final: sik_dbs=${DB_STATE} dbxml_targets=${XML_STATE}"
}
trap cleanup EXIT

# Pre-state: database.xml must be on sik (both copies)
XML_PRE=$($DBXML probe 2>&1 | grep '^\[dbxml\]' | awk '{print $NF}' | sort -u)
echo "pre-state database.xml targets: $XML_PRE"
[ "$XML_PRE" = "sik" ] || { res "ABORT: database.xml not on sik ($XML_PRE)"; exit 3; }

# Build the clone (fail-closed: refuse if already present)
[ -n "$(SQL "SHOW DATABASES LIKE '$FX'")" ] && { res "$FX exists - refusing (run p13_drop_clone.sh first)"; exit 3; }
{ echo "# P13 wide sample - stage $STAGE"; echo "Run $TS UTC - $(wc -l < "$VISITS") visits"; echo; } > "$OUT"
res "clone: creating $FX"
SQL "CREATE DATABASE $FX CHARACTER SET $(SQL "SELECT default_character_set_name FROM information_schema.schemata WHERE schema_name='sik'") COLLATE $(SQL "SELECT default_collation_name FROM information_schema.schemata WHERE schema_name='sik'")"
BUILT=1
mysqldump -uroot --single-transaction --quick --skip-lock-tables sik | mysql -uroot $FX || { res "ABORT: mysqldump failed (half-clone will be dropped by EXIT trap)"; exit 3; }
res "clone $FX ready ($(SQL "SELECT COUNT(*) FROM $FX.billing") billing rows)"

# 8 audit triggers (same as p12_visit_replay.sh)
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
[ "$TRIG_COUNT" = "8" ] || { res "ABORT: only $TRIG_COUNT audit triggers (will drop half-built clone)"; exit 3; }

# Grant benchmark on the clone
SQL "GRANT SELECT, INSERT, UPDATE, DELETE ON \`$FX\`.* TO \`benchmark\`@\`localhost\`;"
res "grant: benchmark@localhost on $FX"

# Retarget database.xml to the clone
$DBXML retarget $FX > /tmp/p13w_dbxml.log 2>&1
grep -q "RETARGET-VERIFIED $FX" /tmp/p13w_dbxml.log || { res "ABORT: retarget not verified (will drop clone)"; exit 3; }
res "harness+consumer database.xml -> $FX (RETARGET-VERIFIED)"

# Oracle: freeze-only, then the real run (same RUN_ID, same visits list)
ORACLE="python3 sampled_real_form_diff_r5.py --db-name $FX --stage B3 --visits-file $VISITS"
RUN_ID="p13w_${TS}"
res "oracle: freeze-only (RUN_ID=$RUN_ID)"
env RUN_ID=$RUN_ID $ORACLE --freeze-only > /tmp/p13w_freeze.log 2>&1
FC=$?
res "oracle: freeze-only exit=$FC"
if [ "$FC" -ne 0 ]; then
  res "ABORT: freeze-only failed (exit $FC) - clone will be dropped by EXIT trap"
  tail -20 /tmp/p13w_freeze.log | tee -a "$OUT"
  ORACLE_RC=3
  exit 3
fi

res "oracle: real run (RUN_ID=$RUN_ID)"
T0=$(date +%s)
env RUN_ID=$RUN_ID $ORACLE >> /tmp/p13w_freeze.log 2>&1
ORACLE_RC=$?
T1=$(date +%s)
ELAPSED=$((T1 - T0))
res "oracle: real run exit=$ORACLE_RC elapsed=${ELAPSED}s"
grep -aE "reset |BILLED|FAILED|STAGE-RESTOR|ORACLE_|ALIGNED|WRITER" /tmp/p13w_freeze.log | cut -c1-200 | tee -a "$OUT"

# Collect per-visit form output from ALL harness logs (one per date batch)
# The harness produces one log per date; grep -ac across all of them.
# Each line has exactly one of: sukses=true or sukses=false.
RUNID_HARNESS_DIR="/opt/dr-benchmark/results/$RUN_ID/B3_oracle_run_r5"
HLOG_ALL="$RUNID_HARNESS_DIR"/harness_*.log
# Count successes and failures across all harness logs (each log has 1 line per visit)
SUKESES_TRUE=$(grep -hc 'sukses=true' $HLOG_ALL 2>/dev/null | awk '{s+=$1}END{print s+0}')
SUKESES_FALSE=$(grep -hc 'sukses=false' $HLOG_ALL 2>/dev/null | awk '{s+=$1}END{print s+0}')
TOTAL_VISITS=$((SUKESES_TRUE + SUKESES_FALSE))
res "form: $SUKESES_TRUE/$TOTAL_VISITS sukses=true, $SUKESES_FALSE sukses=false"
if [ "$TOTAL_VISITS" -gt 0 ]; then
  PCT=$((SUKESES_FALSE * 100 / TOTAL_VISITS))
  res "sukses: $SUKESES_FALSE/$TOTAL_VISITS false ($PCT%)"
  if [ "$PCT" -gt 2 ]; then
    res "STOP RULE: >2% sukses=false - keeping clone, stopping here"
    exit 1
  fi
fi

# Restore database.xml (clone stays for the comparator)
$DBXML restore >> /tmp/p13w_dbxml.log 2>&1
RES=$?
res "database.xml restored (exit=$RES)"
XML_POST=$($DBXML probe 2>&1 | grep '^\[dbxml\]' | awk '{print $NF}' | sort -u)
[ "$XML_POST" = "sik" ] || res "WARN: database.xml not on sik after restore ($XML_POST)"

# Copy the oracle result files to the stage directory
mkdir -p /opt/dr-benchmark/p-chain/p13_${STAGE}/
cp "$VISITS" /opt/dr-benchmark/p-chain/p13_${STAGE}/ 2>/dev/null
cp /tmp/p13w_freeze.log /opt/dr-benchmark/p-chain/p13_${STAGE}/oracle_${TS}.log 2>/dev/null
for f in /opt/dr-benchmark/results/$RUN_ID/B3_sampled_form_diff_r5.*; do
  [ -f "$f" ] && cp "$f" /opt/dr-benchmark/p-chain/p13_${STAGE}/
done

# Rate
if [ "$TOTAL_VISITS" -gt 0 ] && [ "$ELAPSED" -gt 0 ]; then
  RATE=$(python3 -c "print('%.2f' % ($TOTAL_VISITS / $ELAPSED * 60))")
  res "rate: ${RATE} visits/min"
fi

res "P13W stage=$STAGE oracle_exit=$ORACLE_RC elapsed=${ELAPSED}s visits=$(wc -l < "$VISITS")"

# Keep the clone on success (comparator runs next); drop only on failure
if [ "$ORACLE_RC" -eq 0 ]; then
  res "clone $FX KEPT for the comparator (drop with p13_drop_clone.sh)"
else
  res "clone $FX - oracle exit $ORACLE_RC, will be dropped by EXIT trap unless a stop rule fired"
fi

exit "$ORACLE_RC"
