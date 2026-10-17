#!/bin/bash
# r4_bat3: faults #3-#7
#   F3: reg_periksa without billing -> check_billed UNBILLED-2026/10
#   F4: duplicate billing row (clone noindex=12 of V) -> three_count G2-BC-DRUG
#   F5: drug jumlah off by 1 on V noindex=12 -> charge_delta UNEXPLAINED drug
#   F6: PPN row totalbiaya +1 (V noindex=13) -> charge_delta UNEXPLAINED tax
#   F7: whole month 2027/02 billing deleted -> check_billed UNBILLED-2027/02
set -u
EV=$(ls -t /opt/dr-benchmark/p-chain/a2b_battery_run_*.md | head -1)
LOGDIR=/tmp/r4_bat_logs
V='2026/10/01/000254'
fail() { echo "ABORT: $1"; printf '\n**ABORT: %s**\n' "$1" >> "$EV"; exit 9; }
note() { echo "== $1"; printf '%s\n' "$1" >> "$EV"; }
cd /opt/Deers-Rock/tools || fail "tools dir missing"

unbilled_months() {
  mysql -uroot sik -N -B -e "
    SELECT ym, d FROM (
      SELECT SUBSTRING_INDEX(r.no_rawat,'/',2) ym,
             COUNT(DISTINCT r.no_rawat)-COUNT(DISTINCT b.no_rawat) d
      FROM reg_periksa r LEFT JOIN billing b ON b.no_rawat=r.no_rawat
      WHERE r.no_rkm_medis LIKE 'DR%' GROUP BY ym) x WHERE d>0"
}

# ================= Fault #3 =================
note ""
note "## Fault #3: reg_without_billing (reg row, no billing row)"
# dynamic column clone (schema-safe): copy template row, override no_rawat
cols=$(mysql -uroot -N -B sik -e "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='sik' AND TABLE_NAME='reg_periksa' AND COLUMN_NAME<>'no_rawat' ORDER BY ORDINAL_POSITION" | tr '\n' ',' | sed 's/,$//')
quoted=$(echo "$cols" | awk -F, '{for(i=1;i<=NF;i++) printf "`%s`%s", $i, (i<NF?",":"")}')
mysql -uroot --default-character-set=utf8mb4 sik -e "INSERT INTO reg_periksa (no_rawat, $quoted) SELECT '2026/10/11/900001', $quoted FROM reg_periksa WHERE no_rawat='$V'" || fail "F3 inject failed"
u3=$(unbilled_months)
note "- injected reg 2026/10/11/900001; unbilled months: [$(echo $u3 | tr '\n' ' ')]"
echo "$u3" | grep -q "^2026/10" || fail "F3: no UNBILLED-2026/10"
note "- DETECTED: check_billed UNBILLED-2026/10"
mysql -uroot sik -e "DELETE FROM reg_periksa WHERE no_rawat='2026/10/11/900001'" || fail "F3 cleanup failed"
[ -z "$(unbilled_months)" ] || fail "F3: unbilled months remain after cleanup"
note "## Fault #3 result: PASS"

# ================= Fault #4 =================
note ""
note "## Fault #4: duplicate_billing (second identical row for V noindex=12)"
mysql -uroot sik -e "CREATE TABLE sik.billing_f4bak AS SELECT * FROM billing WHERE no_rawat='$V'" || fail "F4 backup failed"
bn=$(mysql -uroot -N -B sik -e "SELECT COUNT(*) FROM billing WHERE no_rawat='$V'")
mysql -uroot sik -e "INSERT INTO billing SELECT * FROM billing WHERE no_rawat='$V' AND noindex=12" || fail "F4 inject failed"
RUN_ID=r4_f4 python3 three_count_reconcile.py --stage A > "$LOGDIR/f4_tc.log" 2>&1; ct4=$?
n_gap=$(grep -c "GAP \[" "$LOGDIR/f4_tc.log" || true)
note "- three_count rc=$ct4, GAP lines=$n_gap"
grep "GAP \[" "$LOGDIR/f4_tc.log" | head -3 >> "$EV" || true
[ "$ct4" != "0" ] || fail "F4: three_count still PASS"
grep -q "G2-BC-DRUG\|G2-AB-DRUG" "$LOGDIR/f4_tc.log" || fail "F4: no DRUG gap code"
note "- DETECTED: three_count DRUG count mismatch (GAP)"
mysql -uroot sik -e "DELETE FROM billing WHERE no_rawat='$V'; INSERT INTO billing SELECT * FROM billing_f4bak WHERE 1=1" || fail "F4 restore failed"
bn2=$(mysql -uroot -N -B sik -e "SELECT COUNT(*) FROM billing WHERE no_rawat='$V'")
[ "$bn2" = "$bn" ] || fail "F4 restore row count $bn2 != $bn"
mysql -uroot sik -e "DROP TABLE billing_f4bak"
RUN_ID=r4_f4_restore python3 three_count_reconcile.py --stage A > "$LOGDIR/f4_tc_r.log" 2>&1; ct4r=$?
[ "$ct4r" = "0" ] || fail "F4 post-cleanup three_count not PASS"
note "## Fault #4 result: PASS (restored, gates green)"

# ================= Fault #5 =================
note ""
note "## Fault #5: quantity_off_by_one (V noindex=12 jumlah+1)"
mysql -uroot sik -e "CREATE TABLE sik.billing_f5bak AS SELECT * FROM billing WHERE no_rawat='$V'" || fail "F5 backup failed"
tb12=$(mysql -uroot -N -B sik -e "SELECT totalbiaya FROM billing WHERE no_rawat='$V' AND noindex=12")
b12=$(mysql -uroot -N -B sik -e "SELECT biaya FROM billing WHERE no_rawat='$V' AND noindex=12")
mysql -uroot sik -e "UPDATE billing SET jumlah=jumlah+1, totalbiaya=totalbiaya+$b12 WHERE no_rawat='$V' AND noindex=12" || fail "F5 inject failed"
RUN_ID=r4_f5 python3 charge_delta_per_component.py --stage A > "$LOGDIR/f5_cd.log" 2>&1; cd5=$?
n_drug=$(grep -c "UNEXPLAINED .* drug:" "$LOGDIR/f5_cd.log" || true)
note "- charge_delta rc=$cd5, UNEXPLAINED drug lines=$n_drug (totalbiaya $tb12 -> $((tb12+b12)))"
grep "UNEXPLAINED .* drug:" "$LOGDIR/f5_cd.log" | head -2 >> "$EV" || true
[ "$cd5" != "0" ] && [ "$n_drug" -ge 1 ] || fail "F5 not detected"
note "- DETECTED: charge_delta UNEXPLAINED drug"
mysql -uroot sik -e "DELETE FROM billing WHERE no_rawat='$V'; INSERT INTO billing SELECT * FROM billing_f5bak; DROP TABLE billing_f5bak" || fail "F5 restore failed"
RUN_ID=r4_f5_restore python3 charge_delta_per_component.py --stage A > "$LOGDIR/f5_cd_r.log" 2>&1; cd5r=$?
[ "$cd5r" = "0" ] || fail "F5 post-cleanup charge_delta not PASS"
note "## Fault #5 result: PASS (restored, gates green)"

# ================= Fault #6 =================
note ""
note "## Fault #6: tax_rounding_error (V PPN row totalbiaya +1)"
mysql -uroot sik -e "CREATE TABLE sik.billing_f6bak AS SELECT * FROM billing WHERE no_rawat='$V'" || fail "F6 backup failed"
mysql -uroot sik -e "UPDATE billing SET totalbiaya=totalbiaya+1 WHERE no_rawat='$V' AND noindex=13" || fail "F6 inject failed"
RUN_ID=r4_f6 python3 charge_delta_per_component.py --stage A > "$LOGDIR/f6_cd.log" 2>&1; cd6=$?
n_tax=$(grep -c "UNEXPLAINED .* tax:" "$LOGDIR/f6_cd.log" || true)
note "- charge_delta rc=$cd6, UNEXPLAINED tax lines=$n_tax"
grep "UNEXPLAINED .* tax:" "$LOGDIR/f6_cd.log" | head -2 >> "$EV" || true
[ "$cd6" != "0" ] && [ "$n_tax" -ge 1 ] || fail "F6 not detected"
note "- DETECTED: charge_delta UNEXPLAINED tax"
mysql -uroot sik -e "DELETE FROM billing WHERE no_rawat='$V'; INSERT INTO billing SELECT * FROM billing_f6bak; DROP TABLE billing_f6bak" || fail "F6 restore failed"
RUN_ID=r4_f6_restore python3 charge_delta_per_component.py --stage A > "$LOGDIR/f6_cd_r.log" 2>&1; cd6r=$?
[ "$cd6r" = "0" ] || fail "F6 post-cleanup charge_delta not PASS"
note "## Fault #6 result: PASS (restored, gates green)"

# ================= Fault #7 =================
note ""
note "## Fault #7: missing_month (delete all 2027/02 DR billing)"
pre_n=$(mysql -uroot -N -B sik -e "SELECT COUNT(*) FROM billing")
pre_s=$(mysql -uroot -N -B sik -e "SELECT ROUND(SUM(totalbiaya),2)+0 FROM billing")
f7_n=$(mysql -uroot -N -B sik -e "SELECT COUNT(*) FROM billing WHERE no_rawat IN (SELECT no_rawat FROM reg_periksa WHERE no_rkm_medis LIKE 'DR%' AND no_rawat LIKE '2027/02/%')")
mysql -uroot sik -e "CREATE TABLE sik.billing_f7bak AS SELECT * FROM billing WHERE no_rawat IN (SELECT no_rawat FROM reg_periksa WHERE no_rkm_medis LIKE 'DR%' AND no_rawat LIKE '2027/02/%')" || fail "F7 backup failed"
bk_n=$(mysql -uroot -N -B sik -e "SELECT COUNT(*) FROM billing_f7bak")
[ "$bk_n" = "$f7_n" ] || fail "F7 backup $bk_n != $f7_n"
mysql -uroot sik -e "DELETE FROM billing WHERE no_rawat IN (SELECT no_rawat FROM reg_periksa WHERE no_rkm_medis LIKE 'DR%' AND no_rawat LIKE '2027/02/%')" || fail "F7 delete failed"
u7=$(unbilled_months)
note "- deleted $f7_n rows; unbilled months: [$(echo $u7 | tr '\n' ' ')]"
echo "$u7" | grep -q "^2027/02" || fail "F7: no UNBILLED-2027/02"
note "- DETECTED: check_billed UNBILLED-2027/02"
mysql -uroot sik -e "INSERT INTO billing SELECT * FROM billing_f7bak; DROP TABLE billing_f7bak" || fail "F7 restore failed"
post_n=$(mysql -uroot -N -B sik -e "SELECT COUNT(*) FROM billing")
post_s=$(mysql -uroot -N -B sik -e "SELECT ROUND(SUM(totalbiaya),2)+0 FROM billing")
[ "$post_n" = "$pre_n" ] && [ "$post_s" = "$pre_s" ] || fail "F7 restore mismatch: $post_n/$post_s vs $pre_n/$pre_s"
[ -z "$(unbilled_months)" ] || fail "F7: unbilled months remain"
[ "$post_n" = "1464593" ] || fail "F7: global count $post_n != 1464593"
note "- restored: $post_n rows, sum $post_s (matches pre-delete and D1)"
note "## Fault #7 result: PASS (restored, gates green)"
echo "DONE"
