#!/bin/bash
# Verify that the sources published in this repo are byte-identical to what runs on the box.
#   1. repo files vs src/PUBLISHED.sha256            (local)
#   2. each DEPLOY_MAP entry: box sha256 == repo sha256   (needs ssh; alias mac-mini-vultr or $BOX)
# Usage (from khanza-r5/): bash src/verify_published.sh   -> exit 0 only if everything matches.
cd "$(dirname "$0")/.." || exit 2
BOX=${BOX:-mac-mini-vultr}
rc=0
sha256sum -c src/PUBLISHED.sha256 | grep -v ': OK$' && rc=1
echo "local manifest: $([ $rc = 0 ] && echo OK || echo FAIL)"
while read -r repo box; do
  case "$repo" in ''|\#*) continue;; esac
  l=$(sha256sum "$repo" | cut -d' ' -f1); b=$(ssh -n "$BOX" "sha256sum '$box'" 2>/dev/null | cut -d' ' -f1)
  [ "$l" = "$b" ] && echo "SAME  $repo" || { echo "DIFF  $repo (repo ${l:0:12} box ${b:0:12})"; rc=1; }
done < src/DEPLOY_MAP.txt
echo "verify_published: $([ $rc = 0 ] && echo ALL-MATCH || echo MISMATCH)"
exit $rc
