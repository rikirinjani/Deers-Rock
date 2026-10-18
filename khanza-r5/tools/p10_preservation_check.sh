#!/bin/bash
# P10-B6: the integrated recovery-preservation experiment, end to end, on the production
# wrapper. P10_INJECT=1 makes the suite cause a REAL harness failure (timeout) on a two-batch
# set: batch 1 FAILED with populated stage tables, batch 2 PENDING. Independent hashes of the
# stage tables, the sample visits, 20 protected non-sample visits and the live sik tables are
# recorded. A30 is then forced to FAIL (P9_FORCE_FAIL_CHECK=30), so the suite ends through its
# normal terminal path and the wrapper must exit 1 and KEEP the fixture. This script then:
#   1. re-hashes everything on the kept fixture (all must equal the pre-hashes),
#   2. retries the FAILED batch under writer exclusion (grant + retarget only for that run),
#      requiring per-operation verification lines and exit 0, and the protected visits and
#      live tables unchanged afterwards,
#   3. removes the fixture with the explicit --teardown-kept.
# Exits 0 only if every assertion holds. Usage (root on the VPS): bash p10_preservation_check.sh
set -u
cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1
SQL() { mysql -uroot -N -e "$1"; }
cnt() { local n; n=$(grep -ac "$1" "$2" 2>/dev/null); echo "${n:-0}"; }
TS=$(date -u +%Y%m%dT%H%M%SZ)
OUT=/opt/dr-benchmark/p-chain/r5_p10_preservation_${TS}.md
FX=sik_p6f
PC=/opt/dr-benchmark/p-chain
FAILS=0
ok() { if [ "$2" = "0" ]; then echo "- PASS: $1" | tee -a "$OUT"; else echo "- **FAIL**: $1" | tee -a "$OUT"; FAILS=$((FAILS+1)); fi; }
{
echo "# P10 integrated recovery-preservation check — run $TS (UTC)"
echo "Tools: $(sha256sum p6_acceptance_suite.sh p6_run_suite_fresh.sh sampled_real_form_diff_r5.py p10_hash_state.py p10_preservation_check.sh | awk '{print substr($1,1,12)" "$2}' | tr '\n' ';')"
echo ""
} > "$OUT"
[ -n "$(SQL "SHOW DATABASES LIKE '$FX'")" ] && { echo "ABORT: $FX already exists" | tee -a "$OUT"; exit 3; }
rm -f $PC/p10_preserve_pre.json

# 1. the failing suite run through the production wrapper
P10_INJECT=1 P9_FORCE_FAIL_CHECK=30 bash p6_run_suite_fresh.sh > /tmp/p10_pc_run.log 2>&1
RC=$?
EV=$(ls -t $PC/r5_p6_acceptance_*.md | head -1)
cp "$EV" $PC/r5_p10_preservation_suite_${TS}.md
echo "## 1. Failing suite run (P10_INJECT=1, P9_FORCE_FAIL_CHECK=30); suite evidence: $(basename "$EV")" | tee -a "$OUT"
grep -a "^P10 injection\|^A30\|^A0:\|^A13:\|^PASS=" "$EV" | tee -a "$OUT"
ok "wrapper exit is 1 (got $RC)" $([ "$RC" = "1" ] && echo 0 || echo 1)
ok "fixture kept after the failure" $([ "$(SQL "SHOW DATABASES LIKE '$FX'")" = "$FX" ] && [ "$(cnt "FIXTURE-KEPT: $FX kept because the suite failed (exit 1)" /tmp/p10_pc_run.log)" -ge 1 ] && echo 0 || echo 1)
ok "A30 is the only FAIL and is the forced one; the injected failure itself was real (P10 injection line: exit 4, batch 1 FAILED)" $([ "$(grep -ac "^A30: FAIL .*FORCED FAIL" "$EV")" = "1" ] && [ "$(grep -ac "^PASS=[0-9]* FAIL=1 " "$EV")" = "1" ] && [ "$(grep -ac "^P10 injection: oracle exit=4 batches=2026-10-01=FAILED,2026-10-06=PENDING" "$EV")" = "1" ] && echo 0 || echo 1)
ok "A13 live guard PASS in the failing run" $([ "$(grep -ac "^A13: PASS" "$EV")" = "1" ] && echo 0 || echo 1)

# 2. preservation: re-hash the kept fixture
echo "## 2. Preserved state on the kept fixture" | tee -a "$OUT"
PRE=$PC/p10_preserve_pre.json
python3 p10_hash_state.py $FX r6_p10 $PC/r6_two.txt $PC/r6_p10_protected.txt > /tmp/p10_post.json 2>/tmp/p10_post.err
RCH=$?
python3 - "$PRE" /tmp/p10_post.json <<'PY' | tee -a "$OUT"
import json, sys
a, b = (json.load(open(p)) for p in sys.argv[1:3])
print("stage tables: %d, populated rows: %d (pre) / %d (post)" % (len(a["stage"]), sum(a["stage_rows"].values()), sum(b["stage_rows"].values())))
for k in ("stage", "stage_rows", "sample", "protected", "live"):
    print("%s: %s" % (k, "EQUAL" if a[k] == b[k] else "DIFFERENT"))
print("ALL-EQUAL" if all(a[k] == b[k] for k in ("stage", "stage_rows", "sample", "protected", "live")) and sum(a["stage_rows"].values()) > 0 else "NOT-EQUAL")
PY
ok "independent hashes (stage tables, sample, $(grep -c . $PC/r6_p10_protected.txt) protected visits, live sik) equal after the failed terminal path; stage tables populated" $([ "$RCH" = "0" ] && grep -q "^ALL-EQUAL" "$OUT" && echo 0 || echo 1)

# 3. retry under writer exclusion on the kept fixture
echo "## 3. Retry of the FAILED batch on the kept fixture (writer exclusion)" | tee -a "$OUT"
SQL "GRANT SELECT, INSERT, UPDATE, DELETE ON \`$FX\`.* TO \`benchmark\`@\`localhost\`;"
# make the retry NEED a restore (so it runs under writer exclusion): change every billing
# row of the FAILED batch's visit after the preservation hashes were taken
SQL "UPDATE $FX.billing SET totalbiaya=totalbiaya+1 WHERE no_rawat='2026/10/01/800085';"
echo "changed all $(SQL "SELECT COUNT(*) FROM $FX.billing WHERE no_rawat='2026/10/01/800085'") billing rows of 2026/10/01/800085 (+1 each) so the retry must restore" | tee -a "$OUT"
python3 p6_dbxml.py retarget $FX > /tmp/p10_pc_xml.log 2>&1
if grep -q "RETARGET-VERIFIED $FX" /tmp/p10_pc_xml.log; then
  env RUN_ID=r6_p10 python3 sampled_real_form_diff_r5.py --db-name $FX --stage B3 --visits-file $PC/r6_two.txt --retry-failed > /tmp/p10_pc_retry.log 2>&1
  RCR=$?
else
  RCR=9; echo "retarget failed" | tee -a "$OUT"
fi
python3 p6_dbxml.py restore >> /tmp/p10_pc_xml.log 2>&1
SQL "REVOKE SELECT, INSERT, UPDATE, DELETE ON \`$FX\`.* FROM \`benchmark\`@\`localhost\`;" 2>/dev/null
grep -a "FENCE\|WRITER-DEAD-PROOF\|WRITER-EXCLUSION\|RETRY\|STAGE-RESTORED-VERIFIED\|BILLED\|stage-drop\|FINAL" /tmp/p10_pc_retry.log | cut -c1-220 | tee -a "$OUT"
cp /tmp/p10_pc_retry.log $PC/r5_p10_preservation_retry_${TS}.log
python3 p10_hash_state.py $FX r6_p10 $PC/r6_two.txt $PC/r6_p10_protected.txt > /tmp/p10_after.json 2>/dev/null
python3 - "$PRE" /tmp/p10_after.json <<'PY' > /tmp/p10_after_cmp.txt
import json, sys
a = json.load(open(sys.argv[1]))
try:
    b = json.load(open(sys.argv[2]))
except Exception:
    b = {}
print("protected:", "EQUAL" if a["protected"] == b.get("protected") else "DIFFERENT")
print("live:", "EQUAL" if a["live"] == b.get("live") else "DIFFERENT")
PY
cat /tmp/p10_after_cmp.txt | tee -a "$OUT"
ok "retry exit 0 with per-operation lines: writer proof + fence; current state != pre-reset detected; WRITER-EXCLUSION on (DML revoked) and off (grants as before); restore hash-verified; both batches BILLED" $([ "$RCR" = "0" ] && [ "$(cnt "WRITER-DEAD-PROOF (resume" /tmp/p10_pc_retry.log)" -ge 1 ] && [ "$(cnt "FENCE (P9-B4)" /tmp/p10_pc_retry.log)" -ge 1 ] && [ "$(cnt "current state is not the pre-reset state" /tmp/p10_pc_retry.log)" -ge 1 ] && [ "$(cnt "WRITER-EXCLUSION on (P10-B4) $FX: revoked=\['DELETE', 'INSERT', 'UPDATE'\]" /tmp/p10_pc_retry.log)" -ge 1 ] && [ "$(cnt "WRITER-EXCLUSION off (P10-B4) $FX: restored=\['DELETE', 'INSERT', 'UPDATE'\]" /tmp/p10_pc_retry.log)" -ge 1 ] && [ "$(cnt "grants not as before" /tmp/p10_pc_retry.log)" = "0" ] && [ "$(cnt "STAGE-RESTORED-VERIFIED" /tmp/p10_pc_retry.log)" -ge 1 ] && [ "$(cnt "rc=0 visits=1 sukses_true=1 -> BILLED" /tmp/p10_pc_retry.log)" = "2" ] && echo 0 || echo 1)
ok "protected non-sample visits and live sik unchanged by the retry" $(grep -q "^protected: EQUAL" /tmp/p10_after_cmp.txt && grep -q "^live: EQUAL" /tmp/p10_after_cmp.txt && echo 0 || echo 1)
XML=$(python3 p6_dbxml.py probe 2>&1 | awk '{print $NF}' | sort -u | tr '\n' ' ')
ok "database.xml back on sik ($XML); benchmark grant on $FX removed" $([ "$XML" = "sik " ] && [ "$(SQL "SHOW GRANTS FOR benchmark@localhost" | grep -c "$FX")" = "0" ] && echo 0 || echo 1)

# 4. explicit teardown
bash p6_run_suite_fresh.sh --teardown-kept > /tmp/p10_pc_td.log 2>&1
ok "explicit --teardown-kept leaves only sik and sik_bench ($(tail -1 /tmp/p10_pc_td.log))" $([ -z "$(SQL "SHOW DATABASES LIKE '$FX'")" ] && echo 0 || echo 1)
if [ "$FAILS" = "0" ]; then echo "PRESERVATION-CHECK PASS" | tee -a "$OUT"; echo "evidence: $OUT"; exit 0; fi
echo "PRESERVATION-CHECK FAIL ($FAILS)" | tee -a "$OUT"; echo "evidence: $OUT"; exit 1
