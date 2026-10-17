#!/usr/bin/env bash
set -euo pipefail
OUT=/opt/dr-benchmark/p-chain
mv -f $OUT/p1_B1_gl.log $OUT/p1_b1_gl.log 2>/dev/null || true
mv -f $OUT/p1_B2_gl.log $OUT/p1_b2_gl.log 2>/dev/null || true
echo "--- gl captures distinct? ---"
ls -la $OUT/p1_b1_gl.log $OUT/p1_b2_gl.log
sha256sum $OUT/p1_b1_gl.log $OUT/p1_b2_gl.log
diff -q $OUT/p1_b1_gl.log $OUT/p1_b2_gl.log >/dev/null && echo "IDENTICAL FILES (suspicious)" || echo "distinct captures (expected: same size, differing timestamps/thread ids)"
echo "--- rerun md artifacts ---"
ls -la $OUT/p1_b1_rerun.md $OUT/p1_b2_rerun.md
grep -m2 "cohort\|drift" $OUT/p1_b1_rerun.md || true
echo "--- launch wave2 ---"
rm -f /tmp/r2w2.done
nohup bash /tmp/r2_wave2.sh > /tmp/r2w2.out 2>&1 &
echo "wave2 launched pid=$!"
sleep 60
echo "--- wave2 progress ---"
tail -20 $OUT/r2_wave2.log 2>/dev/null || tail -5 /tmp/r2w2.out
