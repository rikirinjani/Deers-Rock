set -e
echo "=== run_all.sh B3 generator invocation ==="
grep -nE "generate_scale_encounters|B3.encounters|B2.encounters|B1.encounters|B3\.log|--days 365|--days 90|--days 30" /opt/dr-benchmark/run_all.sh 2>/dev/null | head -20
echo "=== B3.log generation + sha lines (the canonical hash) ==="
grep -iE "generating|sha256|visits, sha256|written" /opt/dr-benchmark/results/Bseries_20261012T045027Z/B3.log 2>/dev/null | head -8
echo "=== generator arg defaults (days/start/mode) ==="
grep -nE "add_argument|DEFAULT|default=|start|--days|--out|--lowered|rate" /opt/Deers-Rock/tools/generate_scale_encounters.py | head -30
