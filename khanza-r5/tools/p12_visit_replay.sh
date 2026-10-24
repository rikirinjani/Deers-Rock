#!/bin/bash
# P12 replay (derived from p12_visit_replay.sh): re-run the REAL form for ONE visit on a throwaway clone and
# compare the saved payment (detail_nota_jalan) with the live baseline. Needs the run lock.
# Usage: DR_LOCK_SESSION=<id> bash p12_visit_replay.sh <no_rawat>
# (original header follows)
# P7-4: who writes billing / nota_jalan / detail_nota_jalan / piutang_pasien during a real
# form run? Row-level audit triggers on a throwaway full clone record the writing account
# and connection for every INSERT and DELETE. The oracle runs as root (DBUTIL_FORCE_ROOT=1);
# the Khanza form runs inside the harness JVM, which connects as benchmark@localhost via
# setting/database.xml. BilingHarness.java itself contains no SQL (it drives DlgBilingRalan
# and clicks BtnSimpan), so any benchmark-account write is Khanza's own save path.
set -u
cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1
FX=sik_p12r
V=${1:?visit no_rawat}
. ./dr_runlock.sh; dr_runlock_require p12_visit_replay.sh
TS=$(date -u +%Y%m%dT%H%M%SZ)
OUT=/opt/dr-benchmark/p-chain/r5_p12_visit_replay_${TS}.md
DBXML="python3 /opt/Deers-Rock/tools/p6_dbxml.py"
SQL() { mysql -uroot -N -e "$1"; }
res() { echo "$1" | tee -a "$OUT"; }
BUILT=0
cleanup() {
  $DBXML restore >> /tmp/p12r_dbxml.log 2>&1
  pkill -f BilingHarness 2>/dev/null
  SQL "REVOKE SELECT, INSERT, UPDATE, DELETE ON \`$FX\`.* FROM \`benchmark\`@\`localhost\`;" 2>/dev/null
  [ "$BUILT" = "1" ] && SQL "DROP DATABASE IF EXISTS $FX;"
  echo "cleanup: databases $(SQL 'SHOW DATABASES' | grep '^sik' | tr '\n' ' ')· database.xml $($DBXML probe 2>&1 | awk '{print $NF}' | sort -u | tr '\n' ' ')" | tee -a "$OUT"
}
trap cleanup EXIT
[ -n "$(SQL "SHOW DATABASES LIKE '$FX'")" ] && { echo "$FX exists - refusing"; exit 3; }
{ echo "# P12 visit replay (real form, audited clone)"; echo "Run $TS UTC · visit $V"; echo; } > "$OUT"
XML_PRE=$($DBXML probe 2>&1 | awk '{print $NF}' | sort -u | tr '\n' ' ')
[ "$XML_PRE" = "sik " ] || { res "ABORT: database.xml not on sik ($XML_PRE)"; exit 3; }

SQL "CREATE DATABASE $FX CHARACTER SET $(SQL "SELECT default_character_set_name FROM information_schema.schemata WHERE schema_name='sik'") COLLATE $(SQL "SELECT default_collation_name FROM information_schema.schemata WHERE schema_name='sik'");"
BUILT=1
mysqldump -uroot --single-transaction --quick --skip-lock-tables sik | mysql -uroot $FX || exit 3
res "clone $FX ready"

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
res "audit triggers present: $(SQL "SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema='$FX' AND trigger_name LIKE 'p7a_%'") (need 8)"
[ "$(SQL "SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema='$FX' AND trigger_name LIKE 'p7a_%'")" = "8" ] || exit 3

SQL "GRANT SELECT, INSERT, UPDATE, DELETE ON \`$FX\`.* TO \`benchmark\`@\`localhost\`;"
$DBXML retarget $FX > /tmp/p12r_dbxml.log 2>&1
grep -q "RETARGET-VERIFIED $FX" /tmp/p12r_dbxml.log || { res "ABORT: retarget not verified"; exit 3; }
res "harness+consumer database.xml -> $FX (RETARGET-VERIFIED)"
res "BASELINE payment rows (clone of live) for $V: $(SQL "SELECT GROUP_CONCAT(CONCAT(nama_bayar,':',besar_bayar,'+ppn',besarppn)) FROM $FX.detail_nota_jalan WHERE no_rawat='$V'")"
res "BASELINE billing total (value rows) for $V: $(SQL "SELECT COALESCE(SUM(totalbiaya),0) FROM $FX.billing WHERE no_rawat='$V' AND status NOT LIKE 'Ttl%' AND (biaya>0 OR totalbiaya>0)")"
res "billing rows for $V before the run: $(SQL "SELECT COUNT(*) FROM $FX.billing WHERE no_rawat='$V'")"

printf "%s\n" "$V" > /tmp/p12r_visit.txt
ORACLE="python3 sampled_real_form_diff_r5.py --db-name $FX --stage B3 --visits-file /tmp/p12r_visit.txt"
env RUN_ID=p12r_$TS $ORACLE --freeze-only > /tmp/p12r_run.log 2>&1
env RUN_ID=p12r_$TS $ORACLE >> /tmp/p12r_run.log 2>&1; RC=$?
res "oracle exit=$RC"
grep -aE "reset |BILLED|FAILED|STAGE-RESTOR|ORACLE_" /tmp/p12r_run.log | cut -c1-200 | tee -a "$OUT"
res "form: $(grep -aoE 'VISIT \S+ DONE sukses=\S+' /opt/dr-benchmark/results/p12r_$TS/B3_oracle_run_r5/harness_*.log 2>/dev/null | tr '\n' ' ')"

res ""
res "## Audit: writes per table, operation and account (visit $V)"
res "| table | op | account | rows | first | last |"
res "|---|---|---|---|---|---|"
SQL "SELECT CONCAT('| ',tbl,' | ',op,' | ',acct,' | ',COUNT(*),' | ',MIN(at),' | ',MAX(at),' |') FROM $FX.p7_write_audit WHERE no_rawat='$V' GROUP BY tbl, op, acct ORDER BY MIN(at)" | tee -a "$OUT"
res ""
res "connections seen: $(SQL "SELECT GROUP_CONCAT(DISTINCT CONCAT(acct,'#',conn) ORDER BY conn) FROM $FX.p7_write_audit")"
res "AFTER-FORM payment rows for $V: $(SQL "SELECT GROUP_CONCAT(CONCAT(nama_bayar,':',besar_bayar,'+ppn',besarppn)) FROM $FX.detail_nota_jalan WHERE no_rawat='$V'")"
res "AFTER-FORM billing total (value rows) for $V: $(SQL "SELECT COALESCE(SUM(totalbiaya),0) FROM $FX.billing WHERE no_rawat='$V' AND status NOT LIKE 'Ttl%' AND (biaya>0 OR totalbiaya>0)")"
res "ledger total for $V: $(SQL "SELECT SUM(amount) FROM sik_bench.dr_charge_ledger WHERE no_rawat='$V'")"
res "billing rows for $V after the run: $(SQL "SELECT COUNT(*) FROM $FX.billing WHERE no_rawat='$V'")"
cp /tmp/p12r_run.log "$(dirname "$OUT")/p12r_run_${TS}.log"
echo "P12R DONE exit=$RC evidence=$OUT"
