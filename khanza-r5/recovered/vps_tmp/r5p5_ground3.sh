echo "=== r5p5 run dirs ==="
ls -d /opt/dr-benchmark/results/r5p5_* 2>/dev/null
for d in /opt/dr-benchmark/results/r5p5_strata /opt/dr-benchmark/results/r5p5_drift /opt/dr-benchmark/results/r5p5_clean; do
  [ -d "$d" ] || continue
  echo ""
  echo "=== $d ==="
  find "$d" -maxdepth 2 -name "B3_sampled_form_diff_r5.csv" 2>/dev/null
  R=$(find "$d" -maxdepth 2 -name "B3_sampled_form_diff_r5.csv" | head -1)
  if [ -n "$R" ]; then echo "--- CSV ($R) ---"; cat "$R"; fi
  S=$(find "$d" -maxdepth 2 -name ".state.json" | head -1)
  if [ -n "$S" ]; then echo "--- state.json ---"; python3 - "$S" << 'PY'
import json, sys
st = json.load(open(sys.argv[1]))
print("phase:", st.get("phase"))
print("out_of_envelope:", st.get("out_of_envelope"))
for d, b in st.get("batches", {}).items():
    print("batch", d, "status=", b.get("status"), "restored=", b.get("restored"),
          "fail_reason=", b.get("fail_reason"), "rc=", b.get("rc"),
          "sukses=", b.get("sukses"))
PY
fi
done
echo ""
echo "=== run transcripts ==="
ls /tmp/p5_strata_run.log /tmp/p5d_run.log /tmp/p5c3_run.log 2>/dev/null
grep -h "ORACLE_\|CLEAN RUN\|FINAL\|REPAIR-SKIPPED\|FAILED\|ALLOW-STRATA\|stage-drop\|EXIT" /tmp/p5_strata_run.log 2>/dev/null | head -20
