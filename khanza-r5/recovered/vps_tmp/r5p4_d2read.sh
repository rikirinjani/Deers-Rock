set -e
echo "=== generate_scale_encounters.py: CLI args + seed + window + output ==="
grep -nE "add_argument|argparse|def main|seed|20261012|window|days|encounters|sha256|hashlib|md5|\.encounters\.txt|output" /opt/Deers-Rock/tools/generate_scale_encounters.py | head -40
echo "=== determinism_audit_checklist.md (how B1/B3 hash compare was done) ==="
sed -n "1,60p" /opt/dr-benchmark/determinism_audit_checklist.md 2>/dev/null
echo "=== canonical B3 encounters: line count + first lines ==="
wc -l /opt/dr-benchmark/results/Bseries_20261012T045027Z/B3.encounters.txt
head -3 /opt/dr-benchmark/results/Bseries_20261012T045027Z/B3.encounters.txt
echo "=== B3.log cohort line ==="
grep -iE "cohort|generated visits|86101|seed" /opt/dr-benchmark/results/Bseries_20261012T045027Z/B3.log 2>/dev/null | head -4
