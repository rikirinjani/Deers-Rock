#!/usr/bin/env bash
# run_p_chain.sh — P1→P5 master chain (sequential, detached via systemd unit p-chain).
# Short-circuits: P3 before-snapshot empty (exit 3) or P4 B1-replay sha mismatch
# (exit 4) → mark FAILED, P4/P5 (resp. P5) SKIPPED, stop. P1/P2/P5 are read-only
# and never block the chain on their own failure.
set -uo pipefail
OUT=/opt/dr-benchmark/p-chain
STATUS=$OUT/PSTATUS.json
cd "$OUT" || exit 1

setstatus(){
  python3 - "$STATUS" "$1" "$2" "$3" "$4" <<'PY'
import json, sys, datetime
p, step, state, log, res = sys.argv[1:6]
try:
    d = json.load(open(p))
except Exception:
    d = {}
d[step] = {"state": state,
           "ts": datetime.datetime.now(datetime.timezone.utc).strftime(
               "%Y-%m-%dT%H:%M:%SZ"),
           "log": log, "result": res}
json.dump(d, open(p, "w"), indent=1)
PY
}
MASTER=$OUT/p_master.log
: > "$MASTER"
echo "=== p-chain master start $(date -u) ===" | tee -a "$MASTER"
rm -f "$STATUS"; setstatus chain RUNNING "$MASTER" "P1..P5 sequential"

run_step(){ # $1=name $2=script
  local n=$1 s=$2 rc
  setstatus "$n" RUNNING "$OUT/${n,,}.log" "started"
  echo "[$(date -u +%H:%M:%S)] === $n start ===" >> "$MASTER"
  bash "$s" >> "$MASTER" 2>&1
  rc=$?
  echo "[$(date -u +%H:%M:%S)] === $n end rc=$rc ===" >> "$MASTER"
  return $rc
}

# ---- P1 (read-only; failure never blocks) ----
run_step P1 pchain_p1.sh; RC1=$?
[ $RC1 -eq 0 ] && setstatus P1 DONE "$OUT/p1.log" "root-cause written (p1_rootcause.md)" \
              || setstatus P1 FAILED "$OUT/p1.log" "rc=$RC1 (read-only; chain continues)"

# ---- P2 (analysis read-only + run_all.sh gate install; failure never blocks) ----
run_step P2 pchain_p2.sh; RC2=$?
[ $RC2 -eq 0 ] && setstatus P2 DONE "$OUT/p2.log" "12-month table + gate installed + p2_report.md" \
              || setstatus P2 FAILED "$OUT/p2.log" "rc=$RC2 (chain continues)"

# ---- P3 (short-circuit on empty before-snapshot) ----
run_step P3 pchain_p3.sh; RC3=$?
case $RC3 in
  0) setstatus P3 DONE "$OUT/p3.log" "pool tuned + 20-run latency + p3_report.md" ;;
  3) setstatus P3 FAILED "$OUT/p3.log" "SHORT-CIRCUIT: before-snapshot empty"
     setstatus P4 SKIPPED "$OUT/p4.log" "skipped: P3 short-circuit"
     setstatus P5 SKIPPED "$OUT/p5.log" "skipped: P3 short-circuit"
     setstatus chain FAILED "$MASTER" "stopped at P3 (empty snapshot)"
     exit 1 ;;
  *) setstatus P3 FAILED "$OUT/p3.log" "rc=$RC3 (aborted; DB state uncertain)"
     setstatus P4 SKIPPED "$OUT/p4.log" "skipped: P3 failed"
     setstatus P5 SKIPPED "$OUT/p5.log" "skipped: P3 failed"
     setstatus chain FAILED "$MASTER" "stopped at P3"
     exit 1 ;;
esac

# ---- P4 (short-circuit on B1-replay sha mismatch) ----
run_step P4 pchain_p4.sh; RC4=$?
if [ $RC4 -eq 4 ]; then
  setstatus P4 FAILED "$OUT/p4.log" "SHORT-CIRCUIT: B1 replay sha256 mismatch"
  setstatus P5 SKIPPED "$OUT/p5.log" "skipped: P4 sha mismatch"
  setstatus chain FAILED "$MASTER" "stopped at P4 (replay sha mismatch)"
  exit 1
fi
P5_MUST=0
if [ $RC4 -eq 0 ]; then
  setstatus P4 DONE "$OUT/p4.log" "reports reworded + replay MATCH + fault-injection verdict"
else
  setstatus P4 FAILED "$OUT/p4.log" "rc=$RC4 (P5 still runs: read-only, never blocks)"
  P5_MUST=1
fi

# ---- P5 (read-only) ----
run_step P5 pchain_p5.sh; RC5=$?
[ $RC5 -eq 0 ] && setstatus P5 DONE "$OUT/p5.log" "mapper status + p5_report.md" \
              || setstatus P5 FAILED "$OUT/p5.log" "rc=$RC5"

if [ $P5_MUST -eq 1 ] || [ $RC5 -ne 0 ] || [ $RC1 -ne 0 ] || [ $RC2 -ne 0 ]; then
  setstatus chain FAILED "$MASTER" "completed with failures (see steps)"
  exit 1
fi
setstatus chain DONE "$MASTER" "P1..P5 all DONE"
echo "=== p-chain master done $(date -u) ===" >> "$MASTER"
exit 0
