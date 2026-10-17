#!/bin/bash
for f in r6_a2 r6_a4 r6_a8; do
  echo "=== /tmp/$f.log ==="
  grep -aE "ORACLE_|verdict:|FAILED|STAGE-RESTORE|stage-restore|sukses|date 2026|BILLED|EXIT" /tmp/$f.log 2>/dev/null | head -12
  echo ""
done
