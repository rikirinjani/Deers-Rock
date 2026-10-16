#!/bin/bash
# Re-check of the R5 §14 / P4 "edge strata through the real form on a scratch
# clone" claim. P4 retargeted database.ini, which the harness never reads, so
# its form runs hit live sik where the STRATA- visits did not exist. This run:
#  - full clone of sik (FX), harness+consumer retargeted via database.xml
#  - EMBALASE / TUSLAH strata authored as copies of DR visit 800085 (which the
#    form bills) with embalase / tuslah set on its drug line
#  - oracle freeze + run with --allow-strata; every step asserted from logs
set -u
cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1
FX=sik_p4r
SRC=2026/10/01/800085
TS=$(date -u +%Y%m%dT%H%M%SZ)
OUT=/opt/dr-benchmark/p-chain/r5_p4_strata_recheck_${TS}.md
DBXML="python3 /opt/Deers-Rock/tools/p6_dbxml.py"
SQL() { mysql -uroot -N -e "$1"; }
res() { echo "$1" | tee -a "$OUT"; }
cleanup() {
  $DBXML restore >> /tmp/p4r_dbxml.log 2>&1
  pkill -f BilingHarness 2>/dev/null
  SQL "REVOKE SELECT, INSERT, UPDATE, DELETE ON \`$FX\`.* FROM \`benchmark\`@\`localhost\`;" 2>/dev/null
  true
}
trap cleanup EXIT
[ -n "$(SQL "SHOW DATABASES LIKE '$FX'")" ] && { echo "$FX exists - refusing"; exit 3; }
{ echo "# P4 edge-strata re-check (real form, verified database.xml target)"; echo "Run $TS UTC"; echo; } > "$OUT"

XML_PRE=$($DBXML probe 2>&1 | awk '{print $NF}' | sort -u | tr '\n' ' ')
[ "$XML_PRE" = "sik " ] || { res "ABORT: database.xml not on sik before the run ($XML_PRE)"; exit 3; }

T0=$(date +%s)
SQL "CREATE DATABASE $FX CHARACTER SET $(SQL "SELECT default_character_set_name FROM information_schema.schemata WHERE schema_name='sik'") COLLATE $(SQL "SELECT default_collation_name FROM information_schema.schemata WHERE schema_name='sik'");"
mysqldump -uroot --single-transaction --quick --skip-lock-tables sik | mysql -uroot $FX
res "clone sik -> $FX: $(( $(date +%s) - T0 ))s, billing rows $(SQL "SELECT COUNT(*) FROM $FX.billing") (sik $(SQL "SELECT COUNT(*) FROM sik.billing"))"

author() {  # author <new_no_rawat> <column> <value>
  local NEW=$1 COL=$2 VAL=$3
  [ "$(SQL "SELECT COUNT(*) FROM $FX.reg_periksa WHERE no_rawat='$NEW'")" = "0" ] || { res "ABORT: $NEW already exists"; exit 3; }
  for t in reg_periksa rawat_jl_dr detail_pemberian_obat diagnosa_pasien billing; do
    mysql -uroot $FX -e "CREATE TEMPORARY TABLE tcp AS SELECT * FROM \`$t\` WHERE no_rawat='$SRC'; UPDATE tcp SET no_rawat='$NEW'; INSERT INTO \`$t\` SELECT * FROM tcp;" \
      || { res "ABORT: copy of $t for $NEW failed"; exit 3; }
  done
  SQL "UPDATE $FX.detail_pemberian_obat SET $COL=$VAL WHERE no_rawat='$NEW';"
  res "authored $NEW from $SRC with $COL=$VAL: dpo=$(SQL "SELECT CONCAT(kode_brng,' jml=',jml,' biaya=',biaya_obat,' emb=',embalase,' tus=',tuslah) FROM $FX.detail_pemberian_obat WHERE no_rawat='$NEW'") billing_rows=$(SQL "SELECT COUNT(*) FROM $FX.billing WHERE no_rawat='$NEW'")"
}
author 2026/10/01/890001 embalase 2500
author 2026/10/01/890002 tuslah 1500
printf "2026/10/01/890001\n2026/10/01/890002\n" > /tmp/p4r_visits.txt

SQL "GRANT SELECT, INSERT, UPDATE, DELETE ON \`$FX\`.* TO \`benchmark\`@\`localhost\`;"
$DBXML retarget $FX > /tmp/p4r_dbxml.log 2>&1
grep -q "RETARGET-VERIFIED $FX" /tmp/p4r_dbxml.log || { res "ABORT: retarget not verified"; cat /tmp/p4r_dbxml.log; exit 3; }
res "harness+consumer database.xml -> $FX (RETARGET-VERIFIED)"

ORACLE="python3 sampled_real_form_diff_r5.py --db-name $FX --stage B3 --visits-file /tmp/p4r_visits.txt --allow-strata"
env RUN_ID=p4r_$TS $ORACLE --freeze-only > /tmp/p4r_freeze.log 2>&1; FZ=$?
env RUN_ID=p4r_$TS $ORACLE > /tmp/p4r_run.log 2>&1; RC=$?
res "freeze exit=$FZ · run exit=$RC"
grep -aE "ALLOW-STRATA|BILLED|FAILED|STAGE-RESTOR|stage-drop|ORACLE_|Traceback" /tmp/p4r_run.log | cut -c1-220 | tee -a "$OUT"
HL=$(ls /opt/dr-benchmark/results/p4r_$TS/B3_oracle_run_r5/harness_*.log 2>/dev/null | head -1)
res "form: $(grep -aoE 'VISIT \S+ DONE sukses=\S+' "$HL" 2>/dev/null | tr '\n' ';')"
CSV=$(ls /opt/dr-benchmark/results/p4r_$TS/*.csv 2>/dev/null | head -1)
res "result CSV:"; cat "$CSV" | tee -a "$OUT"
res "form billing rows after the run (status | item | biaya | jumlah | total):"
SQL "SELECT no_rawat, status, nm_perawatan, biaya, jumlah, totalbiaya FROM $FX.billing WHERE no_rawat IN ('2026/10/01/890001','2026/10/01/890002') AND (biaya<>0 OR totalbiaya<>0) ORDER BY no_rawat, noindex" | tee -a "$OUT"

$DBXML restore >> /tmp/p4r_dbxml.log 2>&1
XML_POST=$($DBXML probe 2>&1 | awk '{print $NF}' | sort -u | tr '\n' ' ')
res "database.xml after: $XML_POST"
cp /tmp/p4r_freeze.log /tmp/p4r_run.log "$HL" "$(dirname "$OUT")/" 2>/dev/null
echo "P4R DONE exit=$RC evidence=$OUT"
