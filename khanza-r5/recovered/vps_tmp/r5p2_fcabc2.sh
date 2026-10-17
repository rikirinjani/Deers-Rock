cd /opt/dr-benchmark/tools 2>/dev/null || cd /opt/Deers-Rock/tools
cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1
export P2_CONSUMER_DB=sik_p2
export P2_LEDGER_DB=sik_bench_p2
run(){ env RUN_ID="$1" python3 build_dr_charge_ledger_p2.py --window 2026-10 --cohort dr "$2" >/tmp/log_$1.log 2>&1; echo "$1 rc=$? $(grep -oE "FAIL-CLOSED|FALLBACK-USED|done:" /tmp/log_$1.log | head -1)"; }
# Case A: empty p2 tariff, no fallback
mysql -uroot sik_bench_p2 -e "DELETE FROM dr_tariff;" >/dev/null
run fcA ""
# Case B: empty p2 tariff, WITH fallback
run fcB "--allow-legacy-fallback"
# Case C: restore p2 tariff, no fallback => build
mysql -uroot sik_bench_p2 -e "INSERT INTO dr_tariff SELECT * FROM sik_bench.dr_tariff;" >/dev/null
echo "p2 tariff now: $(mysql -uroot -N -e "SELECT COUNT(*) FROM sik_bench_p2.dr_tariff;")"
run fcC ""
