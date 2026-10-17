#!/usr/bin/env bash
# Rung-aware resume + reports branch + neutralize stale marker. Back up first.
set -euo pipefail
F=/opt/dr-benchmark/run_all.sh
cp -a "$F" /opt/dr-benchmark/run_all.sh.bak-rungaware

python3 - "$F" <<'PY'
import sys, re
p = sys.argv[1]
s = open(p).read()

# 1. Run rung-completeness check into the loop in phase5_stageB_ladder.
# The loop body currently is:
#   for rung in B1 B2 B3; do
#     log "  rung $rung on fresh sik_bench restore"
#     sql_sik_bench_restore_clean
#     run_scale_rung "$rung" || { gate_fail "stageB_${rung}"; }
#     [ "$rung" = "B3" ] && \
#       log "  B3 month-end + year-end report extractions vs ledger (per-month error)"
#   done
# Insert a skip-check right after the restore line.
anchor = '    sql_sik_bench_restore_clean\n    run_scale_rung "$rung" || { gate_fail "stageB_${rung}"; }'
skip = '''    sql_sik_bench_restore_clean
    # fixer 2026-10-12: rung-aware resume — skip a rung whose three artifacts already exist and PASS
    _tc="$RESULTS/$RUN_ID/stageA_three_count_${rung}.log"
    _cd="$RESULTS/$RUN_ID/stageA_charge_delta_${rung}.log"
    _sd="$RESULTS/$RUN_ID/${rung}_sampled_form_diff.md"
    if [ -f "$_sd" ] && [ -f "$_tc" ] && [ -f "$_cd" ] \\
       && grep -q "three-count reconcile PASS" "$_tc" \\
       && grep -q "charge delta PASS" "$_cd"; then
      log "  rung $rung already complete (sampled-diff + three-count + charge-delta PASS) — skipping"
    else
      run_scale_rung "$rung" || { gate_fail "stageB_${rung}"; }
    fi'''
assert anchor in s, "anchor not found"
s = s.replace(anchor, skip, 1)

# 2. Add reports resume branch to main() case.
main_anchor = '    stageB_ladder) phase5_stageB_ladder && phase6_reports && phase7_burst_optional && write_done ;;'
assert main_anchor in s, "main anchor not found"
s = s.replace(main_anchor, main_anchor + '\n'
    + '    reports) phase6_reports && phase7_burst_optional && write_done ;;', 1)

open(p, "w").write(s)
print("patched run_all.sh")
PY
bash -n "$F" && echo SYNTAX_OK
grep -n "rung-aware\|reports) phase6" "$F"
