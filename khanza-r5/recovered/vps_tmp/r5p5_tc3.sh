grep -aE "Count|gate:|verdict|== " /tmp/p5_tc2.log | tr -d "\r" | Select-String -First 0
echo "--- full key lines ---"
grep -aE "Count |gate:|verdict" /tmp/p5_tc2.log | tr -d "\r"
