#!/bin/bash
# r4_d1demo: D1 snapshot restore demo — damage 2027/02 billing rows, restore from
# snapshot via d1_restore.sh, verify counts.json + gates, write evidence md.
set -u
exec >> /tmp/r4_d1demo.log 2>&1
TS=$(date -u +%Y%m%dT%H%M%SZ)
EV="/opt/dr-benchmark/p-chain/d1_restore_demo_${TS}.md"
fail() { echo "ABORT: $1"; printf '\n**ABORT: %s**\n' "$1" >> "$EV"; exit 9; }
note() { echo "== $1"; printf '%s\n' "$1" >> "$EV"; }
cd /opt/Deers-Rock/tools || fail "tools dir missing"

n_proc=$(ps aux | grep -E 'build_dr_charge|r4_bat|r4_reprice|charge_delta|three_count|d1_restore' | grep -v grep | grep -v d1demo | wc -l)
[ "$n_proc" = "0" ] || fail "other battery/restore processes running ($n_proc)"

note "# D1 snapshot restore demo — $TS"
note "- snapshot: $(cat /opt/dr-benchmark/snapshots/LATEST_D1)"
note "- scenario: F7-style damage (DELETE 2027/02 billing rows) -> restore from snapshot -> verify counts.json + gates"
note "- this replaces the naive prefix-DELETE restore, which could not recover deleted rows"

# ---- pre-damage ----
pre=$(mysql -uroot -N -B sik -e "SELECT CONCAT(COUNT(*),'|',ROUND(SUM(totalbiaya),2)+0) FROM billing")
n2702=$(mysql -uroot -N -B sik -e "SELECT COUNT(*) FROM billing WHERE no_rawat LIKE '2027/02/%'")
[ "$pre" = "1464593|34895128580" ] || fail "pre-damage billing not canonical: $pre"
note "- pre-damage: billing=$pre (2027/02 rows=$n2702)"

# ---- damage ----
mysql -uroot sik -e "DELETE FROM billing WHERE no_rawat LIKE '2027/02/%'" || fail "damage DELETE failed"
dmg=$(mysql -uroot -N -B sik -e "SELECT CONCAT(COUNT(*),'|',ROUND(SUM(totalbiaya),2)+0) FROM billing")
[ "$dmg" != "$pre" ] || fail "damage had no effect"
n_bad_dmg=$(mysql -uroot sik -N -B -e "SELECT COUNT(*) FROM (SELECT SUBSTRING_INDEX(r.no_rawat,'/',2) ym, COUNT(DISTINCT r.no_rawat)-COUNT(DISTINCT b.no_rawat) d FROM reg_periksa r LEFT JOIN billing b ON b.no_rawat=r.no_rawat WHERE r.no_rkm_medis LIKE 'DR%' GROUP BY ym) x WHERE d>0")
note "- damage applied: billing=$dmg (deleted $n2702 rows); unbilled month-groups now=$n_bad_dmg (expect >0 — gate would FAIL)"

# ---- restore from snapshot ----
bash /opt/dr-benchmark/scripts/d1_restore.sh billing > /tmp/r4_d1demo_restore.log 2>&1 || { tail -5 /tmp/r4_d1demo_restore.log; fail "d1_restore.sh billing failed"; }
post=$(mysql -uroot -N -B sik -e "SELECT CONCAT(COUNT(*),'|',ROUND(SUM(totalbiaya),2)+0) FROM billing")
[ "$post" = "1464593|34895128580" ] || fail "billing not restored to snapshot state: $post"
note "- restore OK: billing=$post matches counts.json (1464593|34895128580); SHA256SUMS verified by d1_restore.sh (see /tmp/r4_d1demo_restore.log)"

# ---- untouched components still canonical ----
reg=$(mysql -uroot -N -B sik -e "SELECT COUNT(*) FROM reg_periksa")
dpo=$(mysql -uroot -N -B sik -e "SELECT COUNT(*) FROM detail_pemberian_obat")
led=$(mysql -uroot -N -B sik_bench -e "SELECT CONCAT(COUNT(*),'|',ROUND(SUM(amount),2)+0) FROM dr_charge_ledger")
[ "$reg" = "86676" ] || fail "reg_periksa changed: $reg"
[ "$dpo" = "113445" ] || fail "detail_pemberian_obat changed: $dpo"
[ "$led" = "356355|34870243633" ] || fail "dr_charge_ledger changed: $led"
note "- untouched components verified: reg_periksa=$reg, dpo=$dpo, dr_ledger=$led"

# ---- gates ----
RUN_ID=r4_d1demo python3 charge_delta_per_component.py --stage A > /tmp/r4_bat_logs/d1demo_cd.log 2>&1; g1=$?
RUN_ID=r4_d1demo python3 three_count_reconcile.py --stage A > /tmp/r4_bat_logs/d1demo_tc.log 2>&1; g2=$?
n_bad=$(mysql -uroot sik -N -B -e "SELECT COUNT(*) FROM (SELECT SUBSTRING_INDEX(r.no_rawat,'/',2) ym, COUNT(DISTINCT r.no_rawat)-COUNT(DISTINCT b.no_rawat) d FROM reg_periksa r LEFT JOIN billing b ON b.no_rawat=r.no_rawat WHERE r.no_rkm_medis LIKE 'DR%' GROUP BY ym) x WHERE d>0")
note "- post-restore gates: charge_delta rc=$g1, three_count rc=$g2, unbilled=$n_bad"
[ "$g1" = "0" ] && [ "$g2" = "0" ] && [ "$n_bad" = "0" ] || fail "post-restore gates not all PASS"
note "## D1 restore demo result: PASS (damage -> snapshot restore -> counts verified -> gates green)"
echo "D1DEMO_DONE $EV"
