#!/bin/bash
# r4_bat1: battery setup (asserts, billing_baseline, tax sanity) + fault #1
#   Fault #1: mutate databarang.ralan +1000 for B000001135 -> reprice ledger
#             -> charge_delta must flag UNEXPLAINED drug -> revert -> PASS
set -u
TS=$(date -u +%Y%m%dT%H%M%SZ)
EV=/opt/dr-benchmark/p-chain/a2b_battery_run_${TS}.md
LOGDIR=/tmp/r4_bat_logs
mkdir -p "$LOGDIR"
fail() { echo "ABORT: $1"; printf '\n**ABORT: %s**\n' "$1" >> "$EV"; exit 9; }
note() { echo "== $1"; printf '%s\n' "$1" >> "$EV"; }

cd /opt/Deers-Rock/tools || fail "tools dir missing"

{
  echo "# R4 injection battery run ${TS}"
  echo "- started: $(date -u +%FT%TZ)"
  echo "- order: setup, F1, F2... (F8 after A1)"
  echo
} > "$EV"

# ---------- assert: preconditions ----------
note "## Setup asserts"
b_n=$(mysql -uroot -N -B sik -e "SELECT COUNT(*) FROM billing")
[ "$b_n" = "1464593" ] || fail "billing rows=$b_n != 1464593"
b_u=$(mysql -uroot -N -B sik -e "SELECT COUNT(DISTINCT CONCAT(no_rawat,'|',noindex)) FROM billing")
[ "$b_u" = "1464593" ] || fail "billing key not unique ($b_u)"
b_s=$(mysql -uroot -N -B sik -e "SELECT ROUND(SUM(totalbiaya),2)+0 FROM billing")
[ "$b_s" = "34895128580" ] || fail "billing sum=$b_s != 34895128580"
snap=$(cat /opt/dr-benchmark/snapshots/LATEST_D1 2>/dev/null)
[ -f "$snap/counts.json" ] || fail "D1 snapshot missing: $snap"
n_drug=$(mysql -uroot -N -B sik_bench -e "SELECT COUNT(*) FROM dr_charge_ledger WHERE component='drug'")
[ "$n_drug" = "113389" ] || fail "ledger drug rows=$n_drug != 113389"
note "- asserts OK: billing 1464593 rows unique sum $b_s; drug ledger 113389 rows; snapshot $snap"

# ---------- billing_baseline (mutation-test restore key) ----------
note "## billing_baseline"
mysql -uroot -e "DROP TABLE IF EXISTS sik_bench.billing_baseline; CREATE TABLE sik_bench.billing_baseline AS SELECT no_rawat, noindex, biaya, jumlah, totalbiaya FROM sik.billing"
bb_n=$(mysql -uroot -N -B sik_bench -e "SELECT COUNT(*) FROM billing_baseline")
bb_s=$(mysql -uroot -N -B sik_bench -e "SELECT ROUND(SUM(totalbiaya),2)+0 FROM billing_baseline")
[ "$bb_n" = "1464593" ] || fail "billing_baseline rows=$bb_n"
[ "$bb_s" = "34895128580" ] || fail "billing_baseline sum=$bb_s"
note "- billing_baseline: $bb_n rows, sum $bb_s (ties D1 counts.json)"

# ---------- tax formula sanity (precheck before any recompute) ----------
note "## Tax formula sanity (ledger tax rows == FLOOR(drug subtotal*0.11+0.5))"
tax_bad=$(mysql -uroot -N -B sik_bench -e "
SELECT COUNT(*) FROM dr_charge_ledger t
JOIN (SELECT no_rawat, SUM(amount) s FROM dr_charge_ledger WHERE component='drug' GROUP BY no_rawat) g ON g.no_rawat=t.no_rawat
WHERE t.component='tax' AND t.amount <> FLOOR(g.s*0.11+0.5)")
[ "$tax_bad" = "0" ] || fail "tax rows not matching formula: $tax_bad"
tax_rows=$(mysql -uroot -N -B sik_bench -e "SELECT COUNT(*) FROM dr_charge_ledger WHERE component='tax'")
note "- tax sanity OK: $tax_rows tax rows, 0 formula mismatches"

# ---------- reprice must be a NO-OP pre-A1 (price sources uniform) ----------
sum_before=$(mysql -uroot -N -B sik_bench -e "SELECT CONCAT(COUNT(*),'|',ROUND(SUM(amount),2)) FROM dr_charge_ledger")
bash /tmp/r4_reprice.sh || fail "reprice failed"
sum_after=$(mysql -uroot -N -B sik_bench -e "SELECT CONCAT(COUNT(*),'|',ROUND(SUM(amount),2)) FROM dr_charge_ledger")
[ "$sum_before" = "$sum_after" ] || fail "pre-A1 reprice NOT idempotent: $sum_before -> $sum_after"
note "- pre-A1 reprice no-op: $sum_after (unchanged)"

# ---------- fault #1 ----------
note "## Fault #1: databarang.ralan +1000 for B000001135"
orig=$(mysql -uroot -N -B sik -e "SELECT ralan FROM databarang WHERE kode_brng='B000001135'")
[ -n "$orig" ] && [ "$orig" != "NULL" ] || fail "code B000001135 not found in databarang"
vis12=$(mysql -uroot -N -B sik_bench -e "SELECT COUNT(DISTINCT no_rawat) FROM dr_charge_ledger WHERE component='drug' AND code='B000001135' AND no_rawat LIKE '2026/10/%'")
note "- original ralan=$orig; Oct visits with code=$vis12 (expect 12)"

mysql -uroot -e "UPDATE sik.databarang SET ralan=ralan+1000 WHERE kode_brng='B000001135'" || fail "mutate databarang failed"
bash /tmp/r4_reprice.sh || fail "reprice after mutation failed"
newp=$(mysql -uroot -N -B sik -e "SELECT ralan FROM databarang WHERE kode_brng='B000001135'")
[ "$newp" = "$(python3 -c "print($orig+1000)")" ] || fail "mutation not applied: $newp"
note "- mutated databarang.ralan: $orig -> $newp; ledger repriced"

RUN_ID=r4_f1 python3 charge_delta_per_component.py --stage A > "$LOGDIR/f1_detect.log" 2>&1
rc=$?
n_unex=$(grep -c "UNEXPLAINED" "$LOGDIR/f1_detect.log" || true)
n_drug_unex=$(grep -c "UNEXPLAINED .* drug:" "$LOGDIR/f1_detect.log" || true)
note "- charge_delta rc=$rc, UNEXPLAINED lines=$n_unex, drug-specific=$n_drug_unex"
grep -E "UNEXPLAINED|gate \(" "$LOGDIR/f1_detect.log" | head -8 >> "$EV" || true
[ "$n_drug_unex" -ge 1 ] || fail "fault #1 NOT detected: no UNEXPLAINED drug line"
[ "$rc" != "0" ] || fail "fault #1: charge_delta still returned 0"
note "- DETECTED by charge_delta (gate FAIL as required)"

# revert + reprice + gates
mysql -uroot -e "UPDATE sik.databarang SET ralan=$orig WHERE kode_brng='B000001135'" || fail "revert databarang failed"
bash /tmp/r4_reprice.sh || fail "reprice after revert failed"
rev=$(mysql -uroot -N -B sik -e "SELECT ralan FROM databarang WHERE kode_brng='B000001135'")
[ "$rev" = "$orig" ] || fail "revert failed: $rev != $orig"
sum_restored=$(mysql -uroot -N -B sik_bench -e "SELECT ROUND(SUM(amount),2)+0 FROM dr_charge_ledger")
[ "$sum_restored" = "34870243633" ] || fail "ledger sum after revert=$sum_restored != 34870243633"
note "- reverted databarang=$rev; ledger sum restored $sum_restored"

RUN_ID=r4_f1_restore python3 charge_delta_per_component.py --stage A > "$LOGDIR/f1_restore_cd.log" 2>&1; cd1=$?
RUN_ID=r4_f1_restore python3 three_count_reconcile.py --stage A > "$LOGDIR/f1_restore_tc.log" 2>&1; ct1=$?
n_bad=$(mysql -uroot sik -N -B -e "
    SELECT COUNT(*) FROM (SELECT SUBSTRING_INDEX(r.no_rawat,'/',2) ym,
           COUNT(DISTINCT r.no_rawat)-COUNT(DISTINCT b.no_rawat) d
    FROM reg_periksa r LEFT JOIN billing b ON b.no_rawat=r.no_rawat
    WHERE r.no_rkm_medis LIKE 'DR%' GROUP BY ym) x WHERE d>0")
note "- post-revert gates: charge_delta rc=$cd1, three_count rc=$ct1, unbilled months=$n_bad"
[ "$cd1" = "0" ] && [ "$ct1" = "0" ] && [ "$n_bad" = "0" ] || fail "post-revert gates not all PASS"
note "- fault #1 VERDICT: DETECT then RESTORE clean (PASS)"
note ""
note "## Fault #1 result: PASS"

echo "DONE $EV"
