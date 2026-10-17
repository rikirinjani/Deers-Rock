set -e
echo "=== find encounter-set / determinism tooling + archived hashes ==="
grep -rlE "75889b60|encounter.*sha|sha256.*encounter|md5.*seed|seed.*date.*mode" /opt/Deers-Rock/tools /opt/dr-benchmark/scripts /opt/dr-benchmark/p-chain 2>/dev/null | head -20
echo "=== B3 canonical run dir ==="
ls -d /opt/dr-benchmark/results/Bseries_20261012T045027Z 2>/dev/null
echo "=== look for encounter-set archive (per-day md5 or full-set sha) ==="
find /opt/dr-benchmark -maxdepth 3 -iname "*encounter*" 2>/dev/null | head
find /opt/dr-benchmark -maxdepth 3 -iname "*replay*" -o -iname "*determinism*" 2>/dev/null | head
echo "=== B3.log cohort line (confirm 86101) ==="
grep -iE "cohort|86101|generated visits" /opt/dr-benchmark/results/Bseries_20261012T045027Z/B3.log 2>/dev/null | head -4
