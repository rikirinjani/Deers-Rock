#!/usr/bin/env bash
# collect_results.sh — operator pull-back after an unattended run on the new VPS.
# Usage: collect_results.sh <run_id> [ssh_user@host]
# Draft-only. No secrets printed; no hardcoding of the DB password.
set -uo pipefail

RUN_ID="${1:-}"
TARGET="${2:-this-host}"     # operator fills in user@newvps when collecting remotely
LOCAL_OUT="${LOCAL_OUT:-$HOME/dr-benchmark-results/$RUN_ID}"

[ -n "$RUN_ID" ] || { echo "usage: collect_results.sh <run_id> [user@host]"; exit 1; }

log(){ echo "[collect $(date -u +%H:%M:%S)] $*"; }

fetch(){ # remote:path local:path
  if [ "$TARGET" = "this-host" ]; then
    [ -e "$2" ] || { log "MISSING local: $2"; return 1; }
  else
    scp -i "${SSH_KEY:-$HOME/.ssh/id_ed25519}" "$TARGET:$2" "$LOCAL_OUT/$3" || { log "scp failed: $2"; return 1; }
  fi
}

mkdir -p "$LOCAL_OUT"

log "fetching results/$RUN_ID artifacts"
# status marker (DONE or STOPPED_AT_<phase>)
if [ "$TARGET" = "this-host" ]; then SRC="/opt/dr-benchmark/results/$RUN_ID"; else SRC="$TARGET:/opt/dr-benchmark/results/$RUN_ID"; fi

for f in DONE STOPPED_AT_phase1_doc2.md STOPPED_AT_G1.md STOPPED_AT_G2.md \
         STOPPED_AT_stageB_B1.md STOPPED_AT_stageB_B2.md STOPPED_AT_stageB_B3.md \
         BENCHMARK_REPORT.md BENCHMARK_REPORT_publishable.md manifest.sha256; do
  if [ "$TARGET" = "this-host" ] && [ -e "$SRC/$f" ]; then cp "$SRC/$f" "$LOCAL_OUT/"; log "got $f"; fi
done

# tarball (if present)
if [ "$TARGET" = "this-host" ]; then
  [ -e "/opt/dr-benchmark/results/$RUN_ID.tar.gz" ] && cp "/opt/dr-benchmark/results/$RUN_ID.tar.gz" "$LOCAL_OUT/"
else
  scp -i "${SSH_KEY:-$HOME/.ssh/id_ed25519}" "$TARGET:/opt/dr-benchmark/results/$RUN_ID.tar.gz" "$LOCAL_OUT/" 2>/dev/null \
    && log "got $RUN_ID.tar.gz" || log "WARN: tarball not ready (run may still be in progress or stopped)"
fi

# verify the SHA-256 manifest locally
if [ -f "$LOCAL_OUT/$RUN_ID/manifest.sha256" ] || [ -f "$LOCAL_OUT/manifest.sha256" ]; then
  MANI="$( [ -f "$LOCAL_OUT/$RUN_ID/manifest.sha256" ] && echo "$LOCAL_OUT/$RUN_ID/manifest.sha256" || echo "$LOCAL_OUT/manifest.sha256" )"
  log "verifying SHA-256 manifest: $MANI"
  ( cd "$(dirname "$MANI")" && sha256sum -c "$(basename "$MANI")" ) || log "MANIFEST MISMATCH — do not trust the result set"
fi

# local gate re-verification (brief §7 checklist, lightweight)
log "re-running local verification gates"
echo "=== status ==="
[ -f "$LOCAL_OUT/DONE" ] && echo "DONE: $(cat "$LOCAL_OUT/DONE")" \
  || { [ -f "$LOCAL_OUT/STOPPED_AT_phase1_doc2.md" ] && echo "STOPPED at phase1/doc2" || echo "NO DONE/STOPPED marker yet"; }
echo "=== publishable scrub re-check (must return nothing) ==="
PUB="$( [ -f "$LOCAL_OUT/BENCHMARK_REPORT_publishable.md" ] && echo "$LOCAL_OUT/BENCHMARK_REPORT_publishable.md" || find "$LOCAL_OUT" -name 'BENCHMARK_REPORT_publishable.md' 2>/dev/null | head -1 )"
if [ -n "${PUB:-}" ]; then
  if grep -rEn '([0-9]{1,3}\.){3}[0-9]{1,3}|benchmark_pw|EnkripsiAES|<KHANZA_AES_KEY>|<KHANZA_AES_IV>|usere' "$PUB" 2>/dev/null; then
    log "PUBLISHABLE SCRUB FAILED — secrets/IPs still present; do NOT publish"
  else
    log "publishable scrub clean"
  fi
fi
echo "=== depth-label spot check (no oracle row called 'Khanza-computed') ==="
grep -rEn "oracle.*(Khanza-computed|computed by Khanza form)" "$LOCAL_OUT" 2>/dev/null | grep -v "oracle-computed\|replica" | head \
  && log "WARN: possible un-labelled oracle row; review" || log "depth labels OK on spot check"

log "COLLECT COMPLETE -> $LOCAL_OUT"
log "The laptop was off during the run; this is the pull-back. Next: read BENCHMARK_REPORT.md + the STOPPED_AT_* (if any)."
