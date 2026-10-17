#!/bin/bash
R=/opt/dr-benchmark/results/20261011T173055Z
# 1. Fill the STOPPED_AT diagnosis (expected stop: Phase 4 Stage A tools not built yet)
python3 - "$R" <<'EOF'
import sys, io
r = sys.argv[1]
p = r + "/STOPPED_AT_phase1_G2.md"
s = open(p).read()
diag = """## Diagnosis
- EXPECTED STOP: Phase 4 Stage A (GATE G2) tools are not yet built
  (load_354_dr_visits.py / three_count_reconcile.py / charge_delta_per_component.py /
  replay_determinism_check.py / Jasper reports) — bash rc=127 on the first one.
- NOTE: the marker filename prefix 'phase1_' is a run_all.sh gate_fail() naming quirk;
  the actual phase at stop is stageA_G2 (see state.json above).
- Everything up to and including Phase 3 GATE G1 PASSED this run (first attempt):
  results/20261011T173055Z/g1_validation.md (VERDICT: PASS, 100.00% value-row exactness,
  207/207 rows, 50/50 visits sukses, source drift NONE, single clean general_log 847==847,
  half-rupiah PPN cases verified exact).
## Conservative default applied
No G2 evidence exists yet; nothing was accepted. Build the Stage A tools, then re-launch.
"""
s = s.replace("""## Diagnosis
(agent fills: what failed, evidence file paths under results/$RUN_ID, what was tried)

## Conservative default applied
Per brief section 3 rule 6: ambiguous -> conservative choice recorded in DECISIONS.md.""", diag)
open(p, "w").write(s)
print("diagnosis filled")
EOF
# 2. scrub check: no IPs / secrets in the g1 artifacts of this run + tool + DECISIONS
grep -rEn '([0-9]{1,3}\.){3}[0-9]{1,3}|benchmark_pw|EnkripsiAES|<KHANZA_AES_KEY>|<KHANZA_AES_IV>|usere' \
  "$R/g1_validation.md" "$R/g1_oracle.log" "$R/general_log_G1.log" /opt/Deers-Rock/tools/oracle_diff_30_50.py 2>/dev/null | grep -v 'connectTimeout\|socketTimeout' | head -5
echo "SCRUB-CHECK-DONE (no output above = clean)"
# 3. confirm general_log is OFF now
mysql -uroot -N -e "SELECT @@general_log"
