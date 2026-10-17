#!/usr/bin/env bash
# Clean up run_all.sh: remove duplicate reports) line + redundant in-loop skip block.
set -euo pipefail
F=/opt/dr-benchmark/run_all.sh
cp -a "$F" "$F.bak-cleanup-$(date -u +%H%M%S)"
python3 - "$F" <<'PY'
import sys
p=sys.argv[1]
s=open(p).read()

# 1. Remove duplicate reports) branch (keep first occurrence)
line="    reports) phase6_reports && phase7_burst_optional && write_done ;;\n"
n=s.count(line)
assert n==2, "expected 2 reports) lines, got %d"%n
i=s.find(line); j=s.find(line, i+len(line))
s = s[:j] + s[j+len(line):]
assert s.count(line)==1, "dup removal failed"

# 2. Remove the in-loop skip block (redundant with pre-loop rung_complete guard)
block=('''    # fixer 2026-10-12: rung-aware resume — skip a rung whose three artifacts already exist and PASS
    _tc="$RESULTS/$RUN_ID/stageA_three_count_${rung}.log"
    _cd="$RESULTS/$RUN_ID/stageA_charge_delta_${rung}.log"
    _sd="$RESULTS/$RUN_ID/${rung}_sampled_form_diff.md"
    if [ -f "$_sd" ] && [ -f "$_tc" ] && [ -f "$_cd" ] \\
       && grep -q "three-count reconcile PASS" "$_tc" \\
       && grep -q "charge delta PASS" "$_cd"; then
      log "  rung $rung already complete (sampled-diff + three-count + charge-delta PASS) — skipping"
    else
      run_scale_rung "$rung" || { gate_fail "stageB_${rung}"; }
    fi
''')
assert block in s, "in-loop skip block not found"
s = s.replace(block, '    run_scale_rung "$rung" || { gate_fail "stageB_${rung}"; }\n', 1)

open(p,"w").write(s)
print("cleaned")
PY
bash -n "$F" && echo SYNTAX_OK
echo "reports-lines: $(grep -c 'reports) phase6_reports' $F)"
echo "in-loop-_tc: $(grep -c '_tc=' $F)"
echo "=== phase5 loop now ==="
sed -n '308,325p' "$F"
echo "=== main case now ==="
sed -n '438,448p' "$F"
