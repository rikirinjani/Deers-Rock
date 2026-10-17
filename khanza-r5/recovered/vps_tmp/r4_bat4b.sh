#!/bin/bash
# r4_bat4b v2: cleanup + clean A1 finalize (cohort-fixed builder, no concurrency) + fault #8
set -u
exec >> /tmp/r4_bat4b.log 2>&1
EV=$(ls -t /opt/dr-benchmark/p-chain/a2b_battery_run_*.md | head -1)
LOGDIR=/tmp/r4_bat_logs
mkdir -p "$LOGDIR"
fail() { echo "ABORT: $1"; printf '\n**ABORT: %s**\n' "$1" >> "$EV"; exit 9; }
note() { echo "== $1"; printf '%s\n' "$1" >> "$EV"; }
cd /opt/Deers-Rock/tools || fail "tools dir missing"

# ---- guard: nothing else touching the ledger ----
n_proc=$(ps aux | grep -E 'build_dr_charge|r4_bat4|r4_reprice' | grep -v grep | grep -v bat4b | wc -l)
[ "$n_proc" = "0" ] || fail "other battery/builder processes still running ($n_proc) - refusing to start"
note ""
note "## A1 finalize v2 (cleanup + cohort-fixed single run) + Fault #8"
note "- reconciliation of superseded ABORT lines above:"
note "  (a) first builder run (per-row REPLACE) was killed for speed; concurrent relaunch caused lock-wait timeouts (ERROR 1205) - run logs from that window are unreliable; live VALUES verified intact."
note "  (b) 'label count 0' ABORT: builder queried sik_bench for source tables (reg/proc/drug live in sik) -> wrote 0 rows; labels stayed at pre-A1 NULL. Fixed: source queries now hit sik."
note "  (c) 'clean builder changed money +250000' ABORT: post-fix run picked up non-DR visit 2026/10/05/000001 (patient 000059) because rawat_jl_dr contains non-DR rows; canonical ledger is DR-only. Fixed: proc/drug queries join reg_periksa with no_rkm_medis LIKE 'DR%%'."
note "  (d) the aborted run's 'restore bak2' used REPLACE INTO, which reverts matched keys (labels back to pre-run NULL) but cannot DELETE the extra key - live had 356356 rows with the 1 non-DR key. Cleaned via DELETE below."
note "  This section is the clean single-run A1 proof; ignore interleaved ABORT lines above."
note "- v2 attempts superseded: (1) anti-join DELETE vs bak2 ran O(n^2) (CTAS left bak2 without PK) - killed manually; (2) direct PK DELETE hit ERROR 1205 because the killed client's server-side query was still executing (1187s) - killed via KILL + retry succeeded, live verified canonical 356355|34870243633. This run starts from the verified-clean state."

# ---- assert dr_tariff current state ----
p8=$(mysql -uroot -N -B sik_bench -e "SELECT dr_price+0 FROM dr_tariff WHERE kind='drug' AND code='B000001135'")
p8i=$(printf '%.0f' "$p8")
[ "$p8i" = "34584" ] || fail "dr_tariff B000001135 = $p8 (expected 34584) - F8 pre-state wrong"

# ---- cleanup: direct PK delete of the known non-DR residue key ----
n_extra=$(mysql -uroot -N -B sik_bench -e "SELECT COUNT(*) FROM dr_charge_ledger WHERE no_rawat='2026/10/05/000001' AND component='procedure' AND code='RJ00861'")
if [ "$n_extra" != "0" ]; then
  note "- cleanup: deleting non-canonical key 2026/10/05/000001|procedure|RJ00861 (x$n_extra) left by aborted REPLACE-restore"
  mysql -uroot sik_bench -e "DELETE FROM dr_charge_ledger WHERE no_rawat='2026/10/05/000001' AND component='procedure' AND code='RJ00861'" || fail "cleanup delete failed"
fi
pre=$(mysql -uroot -N -B sik_bench -e "SELECT CONCAT(COUNT(*),'|',ROUND(SUM(amount),2)+0) FROM dr_charge_ledger")
[ "$pre" = "356355|34870243633" ] || fail "live not canonical after cleanup: $pre (expected 356355|34870243633)"

# ---- clean bak2 from canonical live (with PK so later anti-joins are index-assisted) ----
mysql -uroot sik_bench -e "DROP TABLE IF EXISTS dr_charge_ledger_bak2; CREATE TABLE dr_charge_ledger_bak2 AS SELECT * FROM dr_charge_ledger; ALTER TABLE dr_charge_ledger_bak2 ADD PRIMARY KEY (no_rawat, component, code)" || fail "bak2 failed"

# ---- clean builder run (cohort-fixed, dr_tariff authority, batched) ----
RUN_ID=r4_a1_final python3 build_dr_charge_ledger.py > "$LOGDIR/a1_final.log" 2>&1
rc=$?
[ "$rc" = "0" ] || { tail -3 "$LOGDIR/a1_final.log"; fail "clean builder rc=$rc"; }
post=$(mysql -uroot -N -B sik_bench -e "SELECT CONCAT(COUNT(*),'|',ROUND(SUM(amount),2)+0) FROM dr_charge_ledger")
[ "$pre" = "$post" ] || { mysql -uroot sik_bench -e "REPLACE INTO dr_charge_ledger SELECT * FROM dr_charge_ledger_bak2"; fail "clean builder changed money: $pre -> $post (restored bak2)"; }
n_new=$(mysql -uroot -N -B sik_bench -e "SELECT COUNT(*) FROM dr_charge_ledger l LEFT JOIN dr_charge_ledger_bak2 b ON b.no_rawat=l.no_rawat AND b.component=l.component AND b.code=l.code WHERE b.no_rawat IS NULL")
[ "$n_new" = "0" ] || fail "clean builder introduced $n_new new key(s) - cohort filter still broken"

# ---- Oct-scoped label assert: every Oct reg/proc/drug row must carry source='dr_tariff' ----
oct_tot=$(mysql -uroot -N -B sik_bench -e "SELECT COUNT(*) FROM dr_charge_ledger WHERE no_rawat LIKE '2026/10/%%' AND component IN ('registration','procedure','drug')")
oct_lbl=$(mysql -uroot -N -B sik_bench -e "SELECT COUNT(*) FROM dr_charge_ledger WHERE no_rawat LIKE '2026/10/%%' AND component IN ('registration','procedure','drug') AND source='dr_tariff'")
oct_proc=$(mysql -uroot -N -B sik_bench -e "SELECT COUNT(*) FROM dr_charge_ledger WHERE no_rawat LIKE '2026/10/%%' AND component='procedure'")
note "- clean builder OK: rc=0, values identical $post, new_keys=0"
note "- Oct labels: reg+proc+drug rows=$oct_tot source='dr_tariff'=$oct_lbl (procedure rows=$oct_proc, expect 7708 - non-DR row excluded)"
[ "$oct_tot" = "25499" ] || fail "Oct reg+proc+drug rows $oct_tot != 25499"
[ "$oct_lbl" = "25499" ] || fail "Oct dr_tariff label count $oct_lbl != 25499"
[ "$oct_proc" = "7708" ] || fail "Oct procedure rows $oct_proc != 7708"

# ---- reprice no-op with authority live ----
bash /tmp/r4_reprice.sh || fail "reprice failed"
post2=$(mysql -uroot -N -B sik_bench -e "SELECT CONCAT(COUNT(*),'|',ROUND(SUM(amount),2)+0) FROM dr_charge_ledger")
[ "$post" = "$post2" ] || fail "reprice not no-op: $post -> $post2"
note "- reprice no-op with authority live: $post2"

# ---- gates ----
RUN_ID=r4_a1f_gates python3 charge_delta_per_component.py --stage A > "$LOGDIR/a1f_cd.log" 2>&1; c1=$?
RUN_ID=r4_a1f_gates python3 three_count_reconcile.py --stage A > "$LOGDIR/a1f_tc.log" 2>&1; c2=$?
n_bad=$(mysql -uroot sik -N -B -e "SELECT COUNT(*) FROM (SELECT SUBSTRING_INDEX(r.no_rawat,'/',2) ym, COUNT(DISTINCT r.no_rawat)-COUNT(DISTINCT b.no_rawat) d FROM reg_periksa r LEFT JOIN billing b ON b.no_rawat=r.no_rawat WHERE r.no_rkm_medis LIKE 'DR%' GROUP BY ym) x WHERE d>0")
note "- gates: charge_delta rc=$c1, three_count rc=$c2, unbilled=$n_bad"
[ "$c1" = "0" ] && [ "$c2" = "0" ] && [ "$n_bad" = "0" ] || fail "A1 gates not all PASS"
note "## A1 result: PASS (clean single-run proof)"

# ---- Fault #8 (numeric compare) ----
note ""
note "## Fault #8: price_mapping_fault (dr_tariff B000001135 +5000)"
mysql -uroot sik_bench -e "UPDATE dr_tariff SET dr_price=dr_price+5000 WHERE kind='drug' AND code='B000001135'" || fail "F8 mutate failed"
p8m=$(printf '%.0f' "$(mysql -uroot -N -B sik_bench -e "SELECT dr_price+0 FROM dr_tariff WHERE kind='drug' AND code='B000001135'")")
[ "$p8m" = "39584" ] || fail "F8 mutate shows $p8m (expected 39584)"
bash /tmp/r4_reprice.sh || fail "F8 reprice failed"
sum8=$(mysql -uroot -N -B sik_bench -e "SELECT ROUND(SUM(amount),2)+0 FROM dr_charge_ledger")
note "- mutated 34584 -> 39584; ledger repriced (sum $sum8)"
RUN_ID=r4_f8b python3 charge_delta_per_component.py --stage A > "$LOGDIR/f8b_cd.log" 2>&1; cd8=$?
n8=$(grep -c "UNEXPLAINED .* drug:" "$LOGDIR/f8b_cd.log" || true)
note "- charge_delta rc=$cd8, UNEXPLAINED drug lines=$n8"
grep "UNEXPLAINED .* drug:" "$LOGDIR/f8b_cd.log" | head -2 >> "$EV" || true
[ "$cd8" != "0" ] && [ "$n8" -ge 1 ] || fail "F8 not detected"
note "- DETECTED: charge_delta UNEXPLAINED (A1 acceptance)"

mysql -uroot sik_bench -e "UPDATE dr_tariff SET dr_price=34584 WHERE kind='drug' AND code='B000001135'" || fail "F8 revert failed"
bash /tmp/r4_reprice.sh || fail "F8 revert reprice failed"
sum8r=$(mysql -uroot -N -B sik_bench -e "SELECT ROUND(SUM(amount),2)+0 FROM dr_charge_ledger")
[ "$sum8r" = "34870243633" ] || fail "F8 ledger sum not restored: $sum8r"
RUN_ID=r4_f8b_restore python3 charge_delta_per_component.py --stage A > "$LOGDIR/f8b_cd_r.log" 2>&1; cd8r=$?
RUN_ID=r4_f8b_restore python3 three_count_reconcile.py --stage A > "$LOGDIR/f8b_tc_r.log" 2>&1; ct8r=$?
n_bad8=$(mysql -uroot sik -N -B -e "SELECT COUNT(*) FROM (SELECT SUBSTRING_INDEX(r.no_rawat,'/',2) ym, COUNT(DISTINCT r.no_rawat)-COUNT(DISTINCT b.no_rawat) d FROM reg_periksa r LEFT JOIN billing b ON b.no_rawat=r.no_rawat WHERE r.no_rkm_medis LIKE 'DR%' GROUP BY ym) x WHERE d>0")
note "- post-revert: sum=$sum8r, charge_delta rc=$cd8r, three_count rc=$ct8r, unbilled=$n_bad8"
[ "$cd8r" = "0" ] && [ "$ct8r" = "0" ] && [ "$n_bad8" = "0" ] || fail "F8 post-revert gates not PASS"
note "## Fault #8 result: PASS (A1 co-delivery acceptance met)"
note ""
note "## Battery verdict: F1-F8 all PASS (mutation test next)"
echo BAT4B_DONE
