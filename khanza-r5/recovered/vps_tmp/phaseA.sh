#!/usr/bin/env bash
# phaseA.sh — finish the B3 rung: sampled diff (with REAL general-log capture)
# + three-count + charge-delta. Idempotent; appends to existing per-stage logs.
# Writes /tmp/phaseA.done on full success, /tmp/phaseA.fail on gate failure.
set -uo pipefail
export RUN_ID=Bseries_20261012T045027Z
R=/opt/dr-benchmark/results/$RUN_ID
TOOLS=/opt/Deers-Rock/tools
ts(){ date -u +%H:%M:%S; }

echo "[$(ts)] === Phase A start: finish B3 rung ==="
mysql -uroot -N -B -e "SELECT 1" >/dev/null 2>&1 || { echo "[$(ts)] BLOCKER: mysql not reachable"; echo fail > /tmp/phaseA.fail; exit 9; }
echo "[$(ts)] mysql OK (SELECT 1)"

# ---- 1. sampled real-form diff with general-log wrapper (owner fix: the
# mysql server runs as user 'mysql' and cannot write root-owned files — the
# reason B1/B2 general logs were 0 bytes)
F="$R/general_log_B3.log"
: > "$F"
chown mysql:mysql "$F" 2>/dev/null || chmod 666 "$F"
GL_ON=0
if mysql -uroot -e "SET GLOBAL general_log=ON; SET GLOBAL general_log_file='$F';" 2>/tmp/phaseA_gl.err; then
  GL_ON=1
  echo "[$(ts)] general_log ON -> $F (owner $(stat -c '%U:%G' "$F"))"
else
  echo "[$(ts)] WARN: SET GLOBAL general_log failed (continuing without capture):"
  sed 's/^/    /' /tmp/phaseA_gl.err
fi

set -o pipefail
python3 $TOOLS/sampled_real_form_diff.py --stage B3 --rate 25 --per 10000 --cap-min 45 \
  2>&1 | tee -a "$R/B3.log" "$R/B3_oracle.log"
rc_sfd=${PIPESTATUS[0]}
set +o pipefail
if [ "$GL_ON" = "1" ]; then mysql -uroot -e "SET GLOBAL general_log=OFF;" 2>/dev/null || true; fi
echo "[$(ts)] sampled diff rc=$rc_sfd | general_log_B3.log bytes=$(stat -c %s "$F")"
if [ "$rc_sfd" != "0" ] && [ ! -f "$R/B3_sampled_form_diff.md" ]; then
  echo "[$(ts)] PHASE A FAIL: sampled diff rc=$rc_sfd and no artifact written"
  echo "sampled_diff rc=$rc_sfd" > /tmp/phaseA.fail
  exit 1
fi

# ---- 2. three-count reconcile (October-scoped by design — recorded, not a failure)
python3 $TOOLS/three_count_reconcile.py --stage B3 2>&1 | tee -a "$R/B3.log"
rc_tc=${PIPESTATUS[0]}
echo "[$(ts)] three-count rc=$rc_tc"
[ "$rc_tc" = "0" ] || { echo "[$(ts)] PHASE A FAIL: three-count rc=$rc_tc"; echo "three_count rc=$rc_tc" > /tmp/phaseA.fail; exit 2; }

# ---- 3. charge delta per component
python3 $TOOLS/charge_delta_per_component.py --stage B3 2>&1 | tee -a "$R/B3.log"
rc_cd=${PIPESTATUS[0]}
echo "[$(ts)] charge-delta rc=$rc_cd"
[ "$rc_cd" = "0" ] || { echo "[$(ts)] PHASE A FAIL: charge-delta rc=$rc_cd"; echo "charge_delta rc=$rc_cd" > /tmp/phaseA.fail; exit 3; }

echo "[$(ts)] === PHASE A COMPLETE: sampled-diff + three-count + charge-delta all rc=0 ==="
echo ok > /tmp/phaseA.done
