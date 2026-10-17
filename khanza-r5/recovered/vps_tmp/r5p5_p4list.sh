ls /opt/dr-benchmark/p-chain/ 2>/dev/null
echo "---"
for f in /opt/dr-benchmark/p-chain/r5_p4* ; do echo "== $f =="; cat "$f" 2>/dev/null | tr -d "\r"; echo; done
