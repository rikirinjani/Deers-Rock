#!/bin/bash
# G2: syntax check + confirm the 5 tools are on-box
set +e
cd /opt/Deers-Rock/tools
echo "=== tool file sizes ==="
ls -la load_354_dr_visits.py three_count_reconcile.py charge_delta_per_component.py replay_determinism_check.py run_jasper_reports.py stage_a_g2.py 2>/dev/null
echo
echo "=== syntax check (each file) ==="
for f in load_354_dr_visits.py three_count_reconcile.py charge_delta_per_component.py replay_determinism_check.py run_jasper_reports.py stage_a_g2.py; do
  python3 -c "import ast; ast.parse(open('$f').read())" 2>&1 | head -1
  echo "$f: $?"
done
