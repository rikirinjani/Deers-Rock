set -e
cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1
export P2_CONSUMER_DB=sik_p2
export P2_LEDGER_DB=sik_bench_p2
# Rebuild the p2 ledger so it MATCHES the p2 consumer (clean baseline) before injecting faults.
env RUN_ID=r5p2_base python3 build_dr_charge_ledger_p2.py --window 2026-10 --cohort dr >/dev/null 2>&1 || true
echo "=== clean baseline: charge_delta should PASS ==="
env RUN_ID=r5p2_base env P2_CONSUMER_DB=sik_p2 P2_LEDGER_DB=sik_bench_p2 \
  python3 charge_delta_per_component_p2.py --stage A 2>&1 | grep -E "cohort visits|overall delta|gate" | head
echo "=== AC-6 fault injection (each must FAIL a gate with a named reason) ==="
# pick a real 2026-10 DR visit
V=$(mysql -uroot -N -e "SELECT no_rawat FROM sik_p2.reg_periksa WHERE no_rawat LIKE \"2026/10/%\" AND no_rkm_medis LIKE \"DR%\" ORDER BY no_rawat LIMIT 1;")
echo "fault-target visit: $V"
echo "-- (a) +Rp1000 drug error in a NON-October visit (full-window detection) --"
NV=$(mysql -uroot -N -e "SELECT no_rawat FROM sik_p2.reg_periksa WHERE no_rawat LIKE \"2026/11/%\" AND no_rkm_medis LIKE \"DR%\" ORDER BY no_rawat LIMIT 1;")
echo "non-Oct target: $NV"
