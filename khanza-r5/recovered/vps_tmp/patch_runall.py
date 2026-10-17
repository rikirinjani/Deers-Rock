#!/usr/bin/env python3
"""patch_runall.py — rung-aware resume for run_all.sh (option 3).

Anchored exact-string replacements; aborts loudly if any anchor is not
found exactly once. Writes run_all.sh.new, bash -n checks it, backs up the
original, then installs.
"""
import subprocess
import sys
import datetime

PATH = "/opt/dr-benchmark/run_all.sh"
NEW = PATH + ".new"

src = open(PATH, "r", encoding="utf-8").read()

PATCHES = [
    # 1. rung_complete helper before run_scale_rung
    ("run_scale_rung(){ # rung",
     """# fixer 2026-10-12: rung-aware resume — a rung whose sampled real-form diff
# AND both reconcile PASS lines exist is COMPLETE; --resume stageB_ladder skips
# it instead of re-running from B1 (recovery for Bseries_20261012T045027Z).
rung_complete(){ # rung label
  local L="$1"
  [ -f "$RESULTS/$RUN_ID/${L}_sampled_form_diff.md" ] || return 1
  grep -q "=== three-count reconcile PASS" "$RESULTS/$RUN_ID/stageA_three_count_${L}.log" 2>/dev/null || return 1
  grep -q "=== charge delta PASS" "$RESULTS/$RUN_ID/stageA_charge_delta_${L}.log" 2>/dev/null || return 1
  return 0
}
run_scale_rung(){ # rung"""),
    # 2. skip complete rungs in the ladder loop
    ("""  for rung in B1 B2 B3; do
    log "  rung $rung on fresh sik_bench restore"
""",
     """  for rung in B1 B2 B3; do
    if rung_complete "$rung"; then log "  rung $rung already complete (sampled-diff + three-count PASS + charge-delta PASS) — skipping"; continue; fi
    log "  rung $rung on fresh sik_bench restore"
"""),
    # 3. same guard for the optional lowered-rate re-run
    ("""    run_scale_rung "B3_lowered_rate" || gate_fail "stageB_B3_lowered"
""",
     """    if rung_complete "B3_lowered_rate"; then log "  B3_lowered_rate already complete — skipping"; else run_scale_rung "B3_lowered_rate" || gate_fail "stageB_B3_lowered"; fi
"""),
    # 4. set all_gates_passed when the ladder completes (Phase 7 enablement;
    #    gate_fail still exits earlier on any failing rung — no gate weakened)
    ("""  state_set percent 95
  log "Stage B complete"
""",
     """  state_set percent 95
  log "Stage B complete"
  # fixer 2026-10-12: all gates passed (phase5 reached its end without
  # gate_fail) — enables the optional Phase 7 burst gate check
  state_set all_gates_passed 1
"""),
    # 5. reports resume branch
    ("""    stageB_ladder) phase5_stageB_ladder && phase6_reports && phase7_burst_optional && write_done ;;
""",
     """    stageB_ladder) phase5_stageB_ladder && phase6_reports && phase7_burst_optional && write_done ;;
    reports) phase6_reports && phase7_burst_optional && write_done ;;
"""),
]

for i, (old, new) in enumerate(PATCHES, 1):
    n = src.count(old)
    if n != 1:
        sys.stderr.write("ABORT: anchor %d found %d times (expected 1): %r\n"
                         % (i, n, old[:60]))
        sys.exit(2)
    src = src.replace(old, new)
    print("anchor %d: applied" % i)

with open(NEW, "w", encoding="utf-8", newline="\n") as f:
    f.write(src)
r = subprocess.run(["bash", "-n", NEW], capture_output=True, text=True)
if r.returncode != 0:
    sys.stderr.write("ABORT: bash -n failed on patched file:\n%s\n" % r.stderr)
    sys.exit(3)
print("bash -n: OK on patched file")

ts = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
bak = "%s.bak-%s" % (PATH, ts)
subprocess.run(["cp", "-p", PATH, bak], check=True)
subprocess.run(["mv", NEW, PATH], check=True)
r2 = subprocess.run(["bash", "-n", PATH], capture_output=True, text=True)
if r2.returncode != 0:
    sys.stderr.write("FATAL: bash -n failed AFTER install (restoring backup)\n")
    subprocess.run(["cp", "-p", bak, PATH], check=True)
    sys.exit(4)
print("installed %s (backup: %s); bash -n on installed file: OK" % (PATH, bak))
