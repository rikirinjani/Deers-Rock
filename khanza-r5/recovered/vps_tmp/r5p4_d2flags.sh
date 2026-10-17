set -e
echo "=== B3.log generation header (exact flags: days, start, mode, seed, dx, lowered) ==="
grep -iE "generating|mode=|seed=|dx|lowered|weekday lambda|B3_lowered|days" /opt/dr-benchmark/results/Bseries_20261012T045027Z/B3.log 2>/dev/null | head -6
echo "=== B2.log generation header (for comparison; B2 is 90d prefix) ==="
grep -iE "generating|mode=|seed=" /opt/dr-benchmark/results/Bseries_20261012T045027Z/B2.log 2>/dev/null | head -3
echo "=== does the generator write a sha256 into its .log on --no-load runs? check main() tail ==="
grep -nE "no-load|no_load|no-ledger|no_ledger|generate\(|argparse|args\." /opt/Deers-Rock/tools/generate_scale_encounters.py | head -25
