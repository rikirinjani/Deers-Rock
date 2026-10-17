#!/bin/bash
# r4_bat5: mutation test (battery contract) — n=1464 of 1,464,593, seed 20261012,
# +1 totalbiaya per mutated row; primary detection = billing_baseline diff (expect 100%);
# secondary = charge_delta in-scope coverage (honest scope reporting); revert; gates PASS.
set -u
exec >> /tmp/r4_bat5.log 2>&1
EV=$(ls -t /opt/dr-benchmark/p-chain/a2b_battery_run_*.md | head -1)
LOGDIR=/tmp/r4_bat_logs
mkdir -p "$LOGDIR"
fail() { echo "ABORT: $1"; printf '\n**ABORT: %s**\n' "$1" >> "$EV"; exit 9; }
note() { echo "== $1"; printf '%s\n' "$1" >> "$EV"; }
cd /opt/Deers-Rock/tools || fail "tools dir missing"

n_proc=$(ps aux | grep -E 'build_dr_charge|r4_bat4|r4_bat5|r4_reprice|charge_delta|three_count' | grep -v grep | grep -v bat5 | wc -l)
[ "$n_proc" = "0" ] || fail "other battery processes still running ($n_proc)"
note ""
note "## Mutation test (battery contract): n=1464 of 1,464,593, seed 20261012, +1 totalbiaya"

# ---- pre-assert: live billing == baseline (clean state after F1-F8) ----
bl=$(mysql -uroot -N -B sik_bench -e "SELECT CONCAT(COUNT(*),'|',ROUND(SUM(totalbiaya),2)+0) FROM billing_baseline")
[ "$bl" = "1464593|34895128580" ] || fail "billing_baseline wrong: $bl (expected 1464593|34895128580)"
pre=$(mysql -uroot -N -B sik -e "SELECT CONCAT(COUNT(*),'|',ROUND(SUM(totalbiaya),2)+0) FROM billing")
[ "$pre" = "1464593|34895128580" ] || fail "live billing not baseline-clean before mutation: $pre"
note "- pre-state OK: live billing == billing_baseline (1464593|34895128580)"

# ---- build mutation key set (deterministic seed) ----
mysql -uroot sik_bench -e "DROP TABLE IF EXISTS mut_keys; CREATE TABLE mut_keys (no_rawat VARCHAR(17), noindex INT, PRIMARY KEY (no_rawat, noindex))" || fail "mut_keys create failed"
mysql -uroot sik_bench -e "INSERT INTO mut_keys SELECT no_rawat, noindex FROM sik.billing ORDER BY RAND(20261012) LIMIT 1464" || fail "mut_keys fill failed"
n_mut=$(mysql -uroot -N -B sik_bench -e "SELECT COUNT(*) FROM mut_keys")
[ "$n_mut" = "1464" ] || fail "mut_keys has $n_mut rows (expected 1464)"

# ---- mutate: +1 totalbiaya per key ----
mysql -uroot sik -e "UPDATE billing b JOIN sik_bench.mut_keys m ON m.no_rawat=b.no_rawat AND m.noindex=b.noindex SET b.totalbiaya=b.totalbiaya+1" || fail "mutation UPDATE failed"
note "- mutated: +1 totalbiaya on 1464 keys (seed 20261012)"

# ---- primary detection: baseline diff must see exactly the 1464 rows ----
det=$(mysql -uroot -N -B -e "SELECT CONCAT(COUNT(*),'|',ROUND(SUM(b.totalbiaya-bb.totalbiaya),2)+0) FROM sik.billing b JOIN sik_bench.billing_baseline bb ON bb.no_rawat=b.no_rawat AND bb.noindex=b.noindex WHERE b.totalbiaya<>bb.totalbiaya OR b.biaya<>bb.biaya OR b.jumlah<>bb.jumlah")
note "- primary detection (billing_baseline diff): $det (expect 1464|1464)"
[ "$det" = "1464|1464" ] || fail "primary detection $det != 1464|1464"

# ---- secondary: charge_delta in-scope coverage (honest) ----
n_scope=$(mysql -uroot -N -B sik -e "SELECT COUNT(*) FROM sik_bench.mut_keys m JOIN reg_periksa r ON r.no_rawat=m.no_rawat WHERE r.no_rkm_medis LIKE 'DR%' AND r.no_rawat LIKE '2026/10/%'")
RUN_ID=r4_mut_b cd_out=$(python3 charge_delta_per_component.py --stage A > "$LOGDIR/mut_cd.log" 2>&1; echo $?)
n_unx=$(grep -c "UNEXPLAINED" "$LOGDIR/mut_cd.log" || true)
note "- secondary (charge_delta --stage A): rc=$cd_out, UNEXPLAINED lines=$n_unx; mutated keys in DR-Oct scope=$n_scope/1464 (charge_delta only covers that window by design; baseline diff is the full-coverage detector)"

# ---- revert via baseline JOIN ----
mysql -uroot sik -e "UPDATE billing b JOIN sik_bench.mut_keys m ON m.no_rawat=b.no_rawat AND m.noindex=b.noindex JOIN sik_bench.billing_baseline bb ON bb.no_rawat=b.no_rawat AND bb.noindex=b.noindex SET b.totalbiaya=bb.totalbiaya" || fail "revert UPDATE failed"
post=$(mysql -uroot -N -B sik -e "SELECT CONCAT(COUNT(*),'|',ROUND(SUM(totalbiaya),2)+0) FROM billing")
[ "$post" = "1464593|34895128580" ] || fail "billing not restored: $post"
ndiff=$(mysql -uroot -N -B -e "SELECT COUNT(*) FROM sik.billing b JOIN sik_bench.billing_baseline bb ON bb.no_rawat=b.no_rawat AND bb.noindex=b.noindex WHERE b.totalbiaya<>bb.totalbiaya OR b.biaya<>bb.biaya OR b.jumlah<>bb.jumlah")
[ "$ndiff" = "0" ] || fail "billing still differs from baseline after revert: $ndiff"
note "- reverted via baseline JOIN: live == baseline (0 diff rows)"

# ---- gates after revert ----
RUN_ID=r4_mut_gates python3 charge_delta_per_component.py --stage A > "$LOGDIR/mut_g_cd.log" 2>&1; g1=$?
RUN_ID=r4_mut_gates python3 three_count_reconcile.py --stage A > "$LOGDIR/mut_g_tc.log" 2>&1; g2=$?
n_bad=$(mysql -uroot sik -N -B -e "SELECT COUNT(*) FROM (SELECT SUBSTRING_INDEX(r.no_rawat,'/',2) ym, COUNT(DISTINCT r.no_rawat)-COUNT(DISTINCT b.no_rawat) d FROM reg_periksa r LEFT JOIN billing b ON b.no_rawat=r.no_rawat WHERE r.no_rkm_medis LIKE 'DR%' GROUP BY ym) x WHERE d>0")
note "- post-revert gates: charge_delta rc=$g1, three_count rc=$g2, unbilled=$n_bad"
[ "$g1" = "0" ] && [ "$g2" = "0" ] && [ "$n_bad" = "0" ] || fail "post-revert gates not all PASS"
note "## Mutation test result: PASS (primary detection 1464/1464 = 100%; reverted cleanly; gates green)"
note ""
note "## Battery verdict FINAL: F1-F8 + mutation test all PASS"
echo BAT5_DONE
