#!/bin/bash
# r4_bat4: A1 (seed dr_tariff + wire builder + sandbox + no-op reprice) then fault #8
# Detached-safe: all output appended to /tmp/r4_bat4.log
set -u
exec >> /tmp/r4_bat4.log 2>&1
EV=$(ls -t /opt/dr-benchmark/p-chain/a2b_battery_run_*.md | head -1)
LOGDIR=/tmp/r4_bat_logs
mkdir -p "$LOGDIR"
fail() { echo "ABORT: $1"; printf '\n**ABORT: %s**\n' "$1" >> "$EV"; exit 9; }
note() { echo "== $1"; printf '%s\n' "$1" >> "$EV"; }
cd /opt/Deers-Rock/tools || fail "tools dir missing"

note ""
note "## A1: dr_tariff authority (seed + wire + sandbox + no-op)"

# ---- seed dr_tariff from observed ledger prices ----
note "### Seed dr_tariff from ledger observed prices"
mysql -uroot sik_bench <<SQL || fail "seed dr_tariff failed"
INSERT IGNORE INTO dr_tariff (kind, code, dr_price, source_note)
  SELECT 'drug', code, MAX(unit_price), 'DR-adopted-bundle'
  FROM dr_charge_ledger WHERE component='drug' GROUP BY code;
INSERT IGNORE INTO dr_tariff (kind, code, dr_price, source_note)
  SELECT 'procedure', code, MAX(unit_price), 'DR-adopted-bundle'
  FROM dr_charge_ledger WHERE component='procedure' GROUP BY code;
INSERT IGNORE INTO dr_tariff (kind, code, dr_price, source_note)
  SELECT 'registration', code, MAX(unit_price), 'DR-adopted-bundle'
  FROM dr_charge_ledger WHERE component='registration' GROUP BY code;
SQL
tf_n=$(mysql -uroot -N -B sik_bench -e "SELECT COUNT(*) FROM dr_tariff")
tf_drug=$(mysql -uroot -N -B sik_bench -e "SELECT COUNT(*) FROM dr_tariff WHERE kind='drug'")
tf_proc=$(mysql -uroot -N -B sik_bench -e "SELECT COUNT(*) FROM dr_tariff WHERE kind='procedure'")
tf_reg=$(mysql -uroot -N -B sik_bench -e "SELECT COUNT(*) FROM dr_tariff WHERE kind='registration'")
note "- dr_tariff seeded: total=$tf_n (drug=$tf_drug procedure=$tf_proc registration=$tf_reg; 6 pre-existing orphan rows retained)"

# verify seeded price == ledger observed price (100%)
tf_bad=$(mysql -uroot -N -B sik_bench -e "
SELECT COUNT(*) FROM dr_tariff t
JOIN (SELECT code, MAX(unit_price) p FROM dr_charge_ledger WHERE component='drug' GROUP BY code) l
  ON l.code=t.code AND t.kind='drug' WHERE t.dr_price<>l.p")
[ "$tf_bad" = "0" ] || fail "seed price mismatch drug=$tf_bad"
note "- seed consistency: 0 drug price mismatches vs ledger"

# ---- deploy patched builder ----
note "### Deploy patched build_dr_charge_ledger.py (dr_tariff-first)"
[ -f /opt/Deers-Rock/tools/build_dr_charge_ledger.py.bak_r4 ] || cp /opt/Deers-Rock/tools/build_dr_charge_ledger.py /opt/Deers-Rock/tools/build_dr_charge_ledger.py.bak_r4
cp /tmp/build_dr_charge_ledger_patched.py /opt/Deers-Rock/tools/build_dr_charge_ledger.py || fail "deploy patched builder failed"
python3 -c "import ast; ast.parse(open('/opt/Deers-Rock/tools/build_dr_charge_ledger.py').read())" || fail "patched builder syntax error"
note "- patched builder deployed (backup .bak_r4); syntax OK"

# ---- sandbox rebuild ----
note "### Sandbox rebuild with authority wired"
mysql -uroot sik_bench -e "DROP TABLE IF EXISTS dr_charge_ledger_bak; CREATE TABLE dr_charge_ledger_bak AS SELECT * FROM dr_charge_ledger" || fail "bak table failed"
pre_rows=$(mysql -uroot -N -B sik_bench -e "SELECT CONCAT(COUNT(*),'|',ROUND(SUM(amount),2)+0) FROM dr_charge_ledger")
RUN_ID=r4_a1_sandbox python3 build_dr_charge_ledger.py > "$LOGDIR/a1_sandbox.log" 2>&1
rc=$?
note "- builder rc=$rc (log tail: $(tail -1 "$LOGDIR/a1_sandbox.log"))"
[ "$rc" = "0" ] || fail "sandbox builder rc=$rc"
post_rows=$(mysql -uroot -N -B sik_bench -e "SELECT CONCAT(COUNT(*),'|',ROUND(SUM(amount),2)+0) FROM dr_charge_ledger")
if [ "$pre_rows" != "$post_rows" ]; then
  mysql -uroot sik_bench -e "REPLACE INTO dr_charge_ledger SELECT * FROM dr_charge_ledger_bak"
  fail "sandbox money/rows differ: $pre_rows -> $post_rows (restored bak)"
fi
note "- sandbox OK: rows|sum identical $post_rows (source labels now dr_tariff)"
src_drug=$(mysql -uroot -N -B sik_bench -e "SELECT COUNT(*) FROM dr_charge_ledger WHERE component='drug' AND source='dr_tariff'")
note "- source relabel: $src_drug drug rows now source='dr_tariff'"

# ---- reprice must still be no-op with authority live ----
bash /tmp/r4_reprice.sh || fail "reprice with authority failed"
post2=$(mysql -uroot -N -B sik_bench -e "SELECT CONCAT(COUNT(*),'|',ROUND(SUM(amount),2)+0) FROM dr_charge_ledger")
[ "$post_rows" = "$post2" ] || fail "reprice not no-op after authority: $post_rows -> $post2"
note "- reprice no-op with authority live: $post2"

# ---- gates green post-A1 ----
RUN_ID=r4_a1_gates python3 charge_delta_per_component.py --stage A > "$LOGDIR/a1_cd.log" 2>&1; c1=$?
RUN_ID=r4_a1_gates python3 three_count_reconcile.py --stage A > "$LOGDIR/a1_tc.log" 2>&1; c2=$?
n_bad=$(mysql -uroot sik -N -B -e "SELECT COUNT(*) FROM (SELECT SUBSTRING_INDEX(r.no_rawat,'/',2) ym, COUNT(DISTINCT r.no_rawat)-COUNT(DISTINCT b.no_rawat) d FROM reg_periksa r LEFT JOIN billing b ON b.no_rawat=r.no_rawat WHERE r.no_rkm_medis LIKE 'DR%' GROUP BY ym) x WHERE d>0")
note "- post-A1 gates: charge_delta rc=$c1, three_count rc=$c2, unbilled=$n_bad"
[ "$c1" = "0" ] && [ "$c2" = "0" ] && [ "$n_bad" = "0" ] || fail "post-A1 gates not all PASS"
note "## A1 result: PASS (authority seeded, builder wired, no-op proof)"

# ================= Fault #8 =================
note ""
note "## Fault #8: price_mapping_fault (dr_tariff B000001135 +5000)"
orig8=$(mysql -uroot -N -B sik_bench -e "SELECT dr_price FROM dr_tariff WHERE kind='drug' AND code='B000001135'")
[ "$orig8" = "34584" ] || fail "F8: unexpected original price $orig8"
mysql -uroot sik_bench -e "UPDATE dr_tariff SET dr_price=dr_price+5000 WHERE kind='drug' AND code='B000001135'" || fail "F8 mutate failed"
bash /tmp/r4_reprice.sh || fail "F8 reprice failed"
sum8=$(mysql -uroot -N -B sik_bench -e "SELECT ROUND(SUM(amount),2)+0 FROM dr_charge_ledger")
note "- dr_tariff mutated 34584 -> 39584; ledger repriced (sum $sum8)"
RUN_ID=r4_f8 python3 charge_delta_per_component.py --stage A > "$LOGDIR/f8_cd.log" 2>&1; cd8=$?
n8=$(grep -c "UNEXPLAINED .* drug:" "$LOGDIR/f8_cd.log" || true)
note "- charge_delta rc=$cd8, UNEXPLAINED drug lines=$n8 (top: $(grep 'UNEXPLAINED .* drug:' "$LOGDIR/f8_cd.log" | head -1 | sed 's/.*UNEXPLAINED/UNEXPLAINED/'))"
[ "$cd8" != "0" ] && [ "$n8" -ge 1 ] || fail "F8 not detected"
grep -c "UNEXPLAINED" "$LOGDIR/f8_cd.log" >> "$EV"
note "- DETECTED: charge_delta UNEXPLAINED (A1 acceptance)"

mysql -uroot sik_bench -e "UPDATE dr_tariff SET dr_price=$orig8 WHERE kind='drug' AND code='B000001135'" || fail "F8 revert failed"
bash /tmp/r4_reprice.sh || fail "F8 reprice revert failed"
sum8r=$(mysql -uroot -N -B sik_bench -e "SELECT ROUND(SUM(amount),2)+0 FROM dr_charge_ledger")
[ "$sum8r" = "34870243633" ] || fail "F8 ledger sum not restored: $sum8r"
RUN_ID=r4_f8_restore python3 charge_delta_per_component.py --stage A > "$LOGDIR/f8_cd_r.log" 2>&1; cd8r=$?
RUN_ID=r4_f8_restore python3 three_count_reconcile.py --stage A > "$LOGDIR/f8_tc_r.log" 2>&1; ct8r=$?
n_bad8=$(mysql -uroot sik -N -B -e "SELECT COUNT(*) FROM (SELECT SUBSTRING_INDEX(r.no_rawat,'/',2) ym, COUNT(DISTINCT r.no_rawat)-COUNT(DISTINCT b.no_rawat) d FROM reg_periksa r LEFT JOIN billing b ON b.no_rawat=r.no_rawat WHERE r.no_rkm_medis LIKE 'DR%' GROUP BY ym) x WHERE d>0")
note "- post-revert: sum=$sum8r, charge_delta rc=$cd8r, three_count rc=$ct8r, unbilled=$n_bad8"
[ "$cd8r" = "0" ] && [ "$ct8r" = "0" ] && [ "$n_bad8" = "0" ] || fail "F8 post-revert gates not PASS"
note "## Fault #8 result: PASS (A1 co-delivery acceptance met)"
note ""
note "## Battery verdict so far: F1-F8 all PASS (mutation test pending)"
echo BAT4_DONE
