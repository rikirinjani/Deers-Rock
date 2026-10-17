set -e
cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1
export P2_CONSUMER_DB=sik_p2
export P2_LEDGER_DB=sik_bench_p2
export RUN_ID=r5p4_b3
# The visits file was lost (tmp was cleaned). Recreate it.
printf "STRATA-EMBALASE\nSTRATA-TUSLAH\nSTRATA-HALFPPN\nSTRATA-ZEROFEE\nSTRATA-GT3PROC\n" > /tmp/r5p4_b3_visits.txt
echo "=== P1 oracle freeze on 5 STRATA- visits ==="
env RUN_ID=r5p4_b3 python3 sampled_real_form_diff_r5.py --stage B3 --db-name sik_p2 \
  --visits-file /tmp/r5p4_b3_visits.txt --freeze-only >/tmp/r5p4_b3_freeze.log 2>&1; echo "freeze rc=$?"
grep -E "ALIGNED|FROZEN|verify|eligible|NOT|REBUILT|ERROR|Traceback|FileNotFound" /tmp/r5p4_b3_freeze.log | head -15
