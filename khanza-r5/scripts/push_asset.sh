#!/usr/bin/env bash
# Push the verified asset export (built 20261023T0633Z) to a new VPS and verify it there.
#
# Usage:  push_asset.sh <dest-host> [dest-port] [dest-user] [dest-key-path]
# Source: the current benchmark VPS (credentials from khanza-r5/.vps.env).
# Run from Git Bash on the workstation. Nothing is written to the source.
#
# The payload is already compressed, so it is streamed uncompressed through tar
# (ssh source -> local -> ssh dest). Expect ~700 MB each way.
set -euo pipefail

HERE=$(cd "$(dirname "$0")/.." && pwd)
DEST_HOST=${1:?usage: push_asset.sh <dest-host> [port] [user] [key]}
DEST_PORT=${2:-22}
DEST_USER=${3:-root}
DEST_KEY=${4:-}

DK=""
[ -n "$DEST_KEY" ] && DK="-i $DEST_KEY"

set -a
. "$HERE/.vps.env"
set +a

SRC="ssh $VPS_OPTS -i $VPS_KEY -p $VPS_PORT -o BatchMode=yes root@$VPS_HOST"
DST="ssh $DK -p $DEST_PORT -o BatchMode=yes $DEST_USER@$DEST_HOST"
DIR=/opt/dr-asset-export/20261023T0633Z

echo "== target preflight =="
$DST 'df -h / | tail -1; command -v mysql tar gzip >/dev/null && echo tools-ok'

echo "== streaming $DIR =="
$DST "mkdir -p $DIR"
$SRC "cd $DIR && tar -cf - ." | $DST "tar -xf - -C $DIR"

echo "== verify on target =="
$DST "cd $DIR && sha256sum -c MANIFEST.sha256 && du -sh . && ls -1"

echo "== done. Next on the target: read $DIR/RESTORE.md =="
