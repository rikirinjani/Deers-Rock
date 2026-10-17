set -e
cd /opt/Deers-Rock/tools
echo "=== confirm --allow-strata now present on-box ==="
python3 -c "import ast; ast.parse(open(\"sampled_real_form_diff_r5.py\").read()); print(\"on-box P1 tool syntax OK\")"
grep -c "allow-strata\|allow_strata" sampled_real_form_diff_r5.py
export DBUTIL_FORCE_ROOT=1
export P2_CONSUMER_DB=sik_p2
export P2_LEDGER_DB=sik_bench_p2
export RUN_ID=r5p4_b3
rm -rf /opt/dr-benchmark/results/r5p4_b3
printf "STRATA-EMBALASE\nSTRATA-TUSLAH\nSTRATA-HALFPPN\nSTRATA-ZEROFEE\nSTRATA-GT3PROC\n" > /tmp/r5p4_b3_visits.txt
echo "=== P1 oracle --allow-strata (freeze-only) on the 5 STRATA- visits ==="
env RUN_ID=r5p4_b3 python3 sampled_real_form_diff_r5.py --stage B3 --db-name sik_p2 \
  --visits-file /tmp/r5p4_b3_visits.txt --allow-strata --freeze-only >/tmp/r5p4_b3_freeze.log 2>&1
echo "freeze rc=$?"
grep -E "ALLOW-STRATA|FROZEN|verify|ABORT|refusing|Traceback|Error|eligible" /tmp/r5p4_b3_freeze.log | head -15
