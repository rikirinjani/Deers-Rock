#!/bin/bash
# r4_bat2: fault #2 (unmappable_drug) — kode_brng not in databarang
#   inject dpo row (FK off) + ledger drug row simulating a buggy load that
#   mapped the unmappable code from dpo.h_beli; recompute V tax.
#   expect: three_count GAP G2-BC-DRUG + charge_delta UNEXPLAINED drug+tax
set -u
TS=$(date -u +%Y%m%dT%H%M%SZ)
EV=$(ls -t /opt/dr-benchmark/p-chain/a2b_battery_run_*.md | head -1)
LOGDIR=/tmp/r4_bat_logs
V='2026/10/01/000254'
fail() { echo "ABORT: $1"; printf '\n**ABORT: %s**\n' "$1" >> "$EV"; exit 9; }
note() { echo "== $1"; printf '%s\n' "$1" >> "$EV"; }
cd /opt/Deers-Rock/tools || fail "tools dir missing"

note ""
note "## Fault #2: unmappable_drug (kode_brng not in databarang)"

# ---- baseline state of V ----
dpo_before=$(mysql -uroot -N -B sik -e "SELECT COUNT(*) FROM detail_pemberian_obat WHERE no_rawat='$V'")
note "- V dpo rows before: $dpo_before"

# ---- inject: dpo row with FK checks off + ledger drug row + tax recompute ----
mysql -uroot --default-character-set=utf8mb4 sik <<SQL || fail "inject dpo failed"
SET FOREIGN_KEY_CHECKS=0;
INSERT INTO detail_pemberian_obat
  (tgl_perawatan,jam,no_rawat,kode_brng,h_beli,biaya_obat,jml,embalase,tuslah,total,status,kd_bangsal,no_batch,no_faktur)
VALUES
  ('2026-10-01','09:07:00','$V','ZZFAKE01',7000,7000,1,0,0,7000,'Ralan',NULL,'FAULT2','FAULT2');
SET FOREIGN_KEY_CHECKS=1;
SQL
unmapped=$(mysql -uroot -N -B sik -e "
SELECT COUNT(*) FROM detail_pemberian_obat d
LEFT JOIN databarang g ON g.kode_brng=d.kode_brng
WHERE d.kode_brng='ZZFAKE01' AND g.kode_brng IS NULL")
mapped_via_innerjoin=$(mysql -uroot -N -B sik -e "
SELECT COUNT(*) FROM detail_pemberian_obat d
JOIN databarang g ON g.kode_brng=d.kode_brng
WHERE d.kode_brng='ZZFAKE01'")
note "- dpo row injected; unmapped probe=$unmapped (expect 1); consumer-style INNER JOIN databarang yields $mapped_via_innerjoin rows (expect 0) -> consumer would reject/skip this drug"

mysql -uroot sik_bench <<SQL || fail "inject ledger failed"
INSERT INTO dr_charge_ledger (no_rawat,component,code,quantity,unit_price,amount,source)
VALUES ('$V','drug','ZZFAKE01',1,7000,7000,'fault2_unmappable_inject');
UPDATE dr_charge_ledger x
JOIN (SELECT no_rawat, SUM(amount) s FROM dr_charge_ledger WHERE component='drug' AND no_rawat='$V' GROUP BY no_rawat) g ON g.no_rawat=x.no_rawat
SET x.unit_price=FLOOR(g.s*0.11+0.5), x.amount=FLOOR(g.s*0.11+0.5)
WHERE x.component='tax' AND x.no_rawat='$V';
SQL
tax_new=$(mysql -uroot -N -B sik_bench -e "SELECT amount FROM dr_charge_ledger WHERE no_rawat='$V' AND component='tax'")
note "- ledger drug row ZZFAKE01 injected; V tax recomputed to $tax_new (expect 12183)"

# ---- detect ----
RUN_ID=r4_f2 python3 charge_delta_per_component.py --stage A > "$LOGDIR/f2_cd.log" 2>&1; cd2=$?
RUN_ID=r4_f2 python3 three_count_reconcile.py --stage A > "$LOGDIR/f2_tc.log" 2>&1; ct2=$?
n_drug_unex=$(grep -c "UNEXPLAINED .* drug:" "$LOGDIR/f2_cd.log" || true)
n_tax_unex=$(grep -c "UNEXPLAINED .* tax:" "$LOGDIR/f2_cd.log" || true)
n_gap=$(grep -c "GAP \[" "$LOGDIR/f2_tc.log" || true)
note "- charge_delta rc=$cd2 (drug UNEXPLAINED=$n_drug_unex tax UNEXPLAINED=$n_tax_unex); three_count rc=$ct2 (GAP lines=$n_gap)"
grep -E "UNEXPLAINED" "$LOGDIR/f2_cd.log" | head -4 >> "$EV" || true
grep -E "GAP \[" "$LOGDIR/f2_tc.log" | head -4 >> "$EV" || true
[ "$cd2" != "0" ] || fail "fault #2: charge_delta still PASS"
[ "$n_drug_unex" -ge 1 ] || fail "fault #2: no UNEXPLAINED drug"
[ "$n_gap" -ge 1 ] || fail "fault #2: no three_count GAP"
note "- DETECTED: three_count GAP + charge_delta UNEXPLAINED (as required by contract)"

# ---- cleanup: exact scope ----
mysql -uroot sik_bench <<SQL || fail "cleanup ledger failed"
DELETE FROM dr_charge_ledger WHERE no_rawat='$V' AND component='drug' AND code='ZZFAKE01';
UPDATE dr_charge_ledger x
JOIN (SELECT no_rawat, SUM(amount) s FROM dr_charge_ledger WHERE component='drug' AND no_rawat='$V' GROUP BY no_rawat) g ON g.no_rawat=x.no_rawat
SET x.unit_price=FLOOR(g.s*0.11+0.5), x.amount=FLOOR(g.s*0.11+0.5)
WHERE x.component='tax' AND x.no_rawat='$V';
SQL
mysql -uroot --default-character-set=utf8mb4 sik <<SQL || fail "cleanup dpo failed"
SET FOREIGN_KEY_CHECKS=0;
DELETE FROM detail_pemberian_obat WHERE no_rawat='$V' AND kode_brng='ZZFAKE01' AND no_batch='FAULT2';
SET FOREIGN_KEY_CHECKS=1;
SQL
dpo_after=$(mysql -uroot -N -B sik -e "SELECT COUNT(*) FROM detail_pemberian_obat WHERE no_rawat='$V'")
[ "$dpo_after" = "$dpo_before" ] || fail "dpo not restored: $dpo_after != $dpo_before"
v_drug_sum=$(mysql -uroot -N -B sik_bench -e "SELECT ROUND(SUM(amount),2)+0 FROM dr_charge_ledger WHERE no_rawat='$V' AND component='drug'")
[ "$v_drug_sum" = "103752" ] || fail "V drug sum not restored: $v_drug_sum"
v_tax=$(mysql -uroot -N -B sik_bench -e "SELECT amount FROM dr_charge_ledger WHERE no_rawat='$V' AND component='tax'")
[ "$v_tax" = "11413" ] || fail "V tax not restored: $v_tax"
note "- cleanup OK: dpo $dpo_after rows, V drug sum $v_drug_sum, V tax $v_tax"

# ---- gates green again ----
RUN_ID=r4_f2_restore python3 charge_delta_per_component.py --stage A > "$LOGDIR/f2_cd_r.log" 2>&1; cd2r=$?
RUN_ID=r4_f2_restore python3 three_count_reconcile.py --stage A > "$LOGDIR/f2_tc_r.log" 2>&1; ct2r=$?
note "- post-cleanup gates: charge_delta rc=$cd2r, three_count rc=$ct2r"
[ "$cd2r" = "0" ] && [ "$ct2r" = "0" ] || fail "post-cleanup gates not PASS"
note "## Fault #2 result: PASS"
echo "DONE"
