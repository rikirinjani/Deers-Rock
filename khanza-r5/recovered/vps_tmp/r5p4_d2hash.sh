set -e
echo "=== generator arg defaults (days/start/mode/output) ==="
grep -nE "add_argument|DEFAULT_|default=|days|start|lowered|rate|_mode|def main|out" /opt/Deers-Rock/tools/generate_scale_encounters.py | grep -iE "add_argument|default|DEFAULT" | head -20
echo "=== B3.log full generation lines ==="
grep -iE "generating|sha256|wrote|visits" /opt/dr-benchmark/results/Bseries_20261012T045027Z/B3.log 2>/dev/null | head
echo "=== canonical B3.encounters.txt sha256 + first/last ==="
sha256sum /opt/dr-benchmark/results/Bseries_20261012T045027Z/B3.encounters.txt
wc -l /opt/dr-benchmark/results/Bseries_20261012T045027Z/B3.encounters.txt
echo "=== run_all B3 label/days context ==="
sed -n '360,375p' /opt/dr-benchmark/run_all.sh
