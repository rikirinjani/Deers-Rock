#!/bin/bash
for f in r6_a1 r6_a3 r6_a6 r6_a7 r6_a10; do
  echo "=== /tmp/$f.log ==="
  tail -8 /tmp/$f.log 2>/dev/null
  echo ""
done
