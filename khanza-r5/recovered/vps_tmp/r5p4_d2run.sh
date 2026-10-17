set -e
cd /opt/Deers-Rock/tools
echo "=== B3.log: did it use --dx? (check for dx mentions in the canonical B3) ==="
grep -icE "dx|diagnos" /opt/dr-benchmark/results/Bseries_20261012T045027Z/B3.log 2>/dev/null || echo "0 dx mentions"
echo "=== where is run_all.sh? ==="
ls /opt/dr-benchmark/*.sh 2>/dev/null | head
echo "=== re-derive B3 (365 days, base, seed 20261012, start 2026-10-01, NO --dx, --no-load --no-ledger) ==="
RUN_ID=r5p4_d2 python3 generate_scale_encounters.py --days 365 \
  --out /tmp/r5p4_d2_B3.encounters.txt --no-load --no-ledger >/tmp/r5p4_d2_regen.log 2>&1
echo "regen rc=$?"
grep -iE "wrote|sha256|visits, sha256" /tmp/r5p4_d2_regen.log | head -4
echo "=== byte-compare re-derivation vs canonical ==="
echo "canonical sha256:"; sha256sum /opt/dr-benchmark/results/Bseries_20261012T045027Z/B3.encounters.txt
echo "re-derived sha256:"; sha256sum /tmp/r5p4_d2_B3.encounters.txt
echo "line counts:"; wc -l /opt/dr-benchmark/results/Bseries_20261012T045027Z/B3.encounters.txt /tmp/r5p4_d2_B3.encounters.txt
echo "diff line count (expect 0):"; diff /opt/dr-benchmark/results/Bseries_20261012T045027Z/B3.encounters.txt /tmp/r5p4_d2_B3.encounters.txt | wc -l
