#!/bin/bash
# P11-B6: the integrated recovery-preservation experiment with a PRE-OPERATION baseline
# (P11-T2) and honest negative controls. P10_INJECT=1 makes the suite cause a REAL harness
# failure (timeout) on a two-batch set: batch 1 FAILED with populated stage tables, batch 2
# PENDING. An independent snapshot of the sample visits, 20 protected non-sample visits and
# the live sik tables is taken BEFORE the destructive operation (the P10 pre-hash, taken
# after the failure, is no longer the baseline). A30 is then forced to FAIL
# (P9_FORCE_FAIL_CHECK=30), so the suite ends through its normal terminal path and the
# wrapper must exit 1 and KEEP the fixture. This script then asserts SEPARATELY:
#   (a) immediate restoration: the sample visits equal the pre-operation snapshot,
#   (b) preservation: the stage tables equal their state at the failure (the pre-hash),
#   (c) retry: the protected visits and the live tables equal the pre-operation snapshot.
# The negative control R5_NEGCTL_SKIP_IMMEDIATE_RESTORE=1 makes the failure path in
# _bill_date skip the immediate stage_restore while still recording restored=True; the
# assertion (a) must FAIL with it and PASS without it.
#
# P11-T7 honest experiment:
#   - the perturbing UPDATE's changed-row count is compared to the count BEFORE it
#     (asserted, not just printed);
#   - an EXIT trap always restores database.xml to sik and revokes the benchmark grant
#     on the fixture, even if an assertion fails;
#   - on any failed assertion the fixture is KEPT (no --teardown-kept) and the teardown
#     command is printed; P11_FORCE_FAIL=<n> forces one named assertion to FAIL to prove
#     this behaviour.
# Exits 0 only if every assertion holds. Usage (root on the VPS): bash p10_preservation_check.sh
set -u
cd /opt/Deers-Rock/tools
# P15 A2: the lock is checked before anything else, so a refused run installs no EXIT trap
# (its cleanup would restore database.xml and revoke the fixture grant of the run holding the lock).
. ./dr_runlock.sh; dr_runlock_require p10_preservation_check.sh
export DBUTIL_FORCE_ROOT=1
SQL() { mysql -uroot -N -e "$1"; }
cnt() { local n; n=$(grep -ac "$1" "$2" 2>/dev/null); echo "${n:-0}"; }
FX=sik_p6f
PC=/opt/dr-benchmark/p-chain
TS=$(date -u +%Y%m%dT%H%M%SZ)
OUT=$PC/r5_p10_preservation_${TS}.md
PREOP_OUT=$PC/r5_p10_preservation_preop_${TS}.md
PREOP=$PC/p11_preserve_preop.json   # P11-T2: the suite's P10_INJECT block writes the PRE-OPERATION snapshot here (BEFORE the injected run)
PRE=$PC/p10_preserve_pre.json       # the suite's post-failure pre-hash (preservation reference for assertion b)
FAILS=0
FORCED=0
# P16 A1: the EXIT trap acts only on what THIS run did (flags set immediately before the action).
XML_TOUCHED=0; GRANTED=0
FORCE_FAIL=${P11_FORCE_FAIL:-}   # P11-T7: force assertion <n> to FAIL (0..99; empty = none)
ok() {
  local name=$1 pass=$2
  # P11-T7: force assertion <n> to FAIL to prove the keep-on-fail + EXIT-trap behaviour
  if [ -n "$FORCE_FAIL" ]; then
    local n; n=$(grep -c "^- " "$OUT" 2>/dev/null)
    [ "$n" -eq "$FORCE_FAIL" ] && pass=1
  fi
  local line
  if [ "$pass" = "0" ]; then
    line="- PASS: $name"
  else
    line="- **FAIL**: $name"
  fi
  echo "$line" | tee -a "$OUT"
  [ "$pass" != "0" ] && FAILS=$((FAILS+1))
}
# P11-T7 EXIT trap: always restore database.xml to sik and revoke the benchmark grant on
# the fixture; the fixture itself is kept on failure (no --teardown-kept) and the teardown
# command is printed so an operator can inspect it.
pcleanup() {
  [ "$XML_TOUCHED" = "1" ] && python3 /opt/Deers-Rock/tools/p6_dbxml.py restore >> /tmp/p11_pc_xml.log 2>&1
  [ "$GRANTED" = "1" ] && SQL "REVOKE SELECT, INSERT, UPDATE, DELETE ON \`$FX\`.* FROM \`benchmark\`@\`localhost\`;" 2>/dev/null
  XML=$(python3 p6_dbxml.py probe 2>&1 | awk '{print $NF}' | sort -u | tr '\n' ' ')
  GR=$(SQL "SHOW GRANTS FOR benchmark@localhost" | grep -c "$FX")
  echo "P11-T7 exit-trap: database.xml targets: $XML · benchmark grant on $FX: $GR" | tee -a "$OUT"
}
trap pcleanup EXIT
{
echo "# P11 integrated recovery-preservation check (pre-operation baseline + negative controls) — run $TS (UTC)"
echo "Tools: $(sha256sum p6_acceptance_suite.sh p6_run_suite_fresh.sh sampled_real_form_diff_r5.py p10_hash_state.py p10_preservation_check.sh | awk '{print substr($1,1,12)" "$2}' | tr '\n' ';')"
echo ""
} > "$OUT"
# Allow running on a kept r6_p10 fixture (from a failing wrapper run); abort only
# if the fixture exists but has no recognisable r6_p10 state (a foreign kept fixture).
if [ -n "$(SQL "SHOW DATABASES LIKE '$FX'")" ]; then
  HAS_P10_STATE=$(SQL "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$FX' AND table_name LIKE 'r5\\_stage\\_B3\\_r6\\_p10\\_%';")
  if [ "${HAS_P10_STATE:-0}" -eq 0 ]; then
    echo "ABORT: $FX exists but has no r6_p10 stage state (a foreign kept fixture?)" | tee -a "$OUT"
    exit 3
  fi
  echo "reusing kept $FX fixture (r6_p10 stage tables: $HAS_P10_STATE)" | tee -a "$OUT"
fi
# NOTE (P11): $PRE ($PC/p10_preserve_pre.json) and $PREOP ($PC/p11_preserve_preop.json)
# are written by the suite's P10_INJECT block (post-failure pre-hash and the
# PRE-OPERATION snapshot). They must SURVIVE into the reuse path, so they are
# deliberately NOT deleted here; each P10_INJECT build overwrites both.

# 1. the failing suite run through the production wrapper (P10_INJECT now records BOTH the
#    post-failure pre-hash and the PRE-OPERATION snapshot, see the suite's P10_INJECT block)
# P11-T2 negative-control switch (inert unless set by the NC script): skip the immediate
# restore on the failure path, forcing assertion (a) to DIFFER. The pre-op snapshot is
# taken by the suite's P10_INJECT block BEFORE the destructive oracle run.
if [ -z "$(SQL "SHOW DATABASES LIKE '$FX'")" ]; then
  # no kept fixture: build+keep one through the failing wrapper (P10_INJECT)
  if [ "${R5_NEGCTL_SKIP_IMMEDIATE_RESTORE:-}" = "1" ]; then   # P16 E2: exactly 1, 0 is inert
    P10_INJECT=1 P9_FORCE_FAIL_CHECK=30 R5_NEGCTL_SKIP_IMMEDIATE_RESTORE=1 bash p6_run_suite_fresh.sh > /tmp/p10_pc_run.log 2>&1
  else
    P10_INJECT=1 P9_FORCE_FAIL_CHECK=30 bash p6_run_suite_fresh.sh > /tmp/p10_pc_run.log 2>&1
  fi
else
  # a kept r6_p10 fixture from the NC script's build: the failing wrapper already
  # ran (it recorded the pre-op snapshot and the post-failure pre-hash); skip the
  # re-build and reuse the kept fixture
  printf "P10 reuse: kept $FX fixture (r6_p10 stage tables present; no wrapper re-run)\n" > /tmp/p10_pc_run.log
fi
# P15 E1/E4: the suite evidence of THIS build (the wrapper prints "evidence: <path>"), never ls -t.
EV=${P15_SUITE_EV:-$(grep -a '^evidence: ' /tmp/p10_pc_run.log 2>/dev/null | tail -1 | sed 's/^evidence: //')}
[ -n "$EV" ] && [ -f "$EV" ] || { echo "ABORT: suite evidence of this build not identified (set P15_SUITE_EV or run the build here)" | tee -a "$OUT"; exit 3; }
cp "$EV" $PC/r5_p10_preservation_suite_${TS}.md
echo "## 1. Failing suite run (P10_INJECT=1, P9_FORCE_FAIL_CHECK=30); suite evidence: $(basename "$EV")" | tee -a "$OUT"
grep -a "^P10 injection\|^A30\|^A0:\|^A13:\|^PASS=" "$EV" | tee -a "$OUT"
ok "fixture kept with populated r6_p10 stage tables" $([ "$(SQL "SHOW DATABASES LIKE '$FX'")" = "$FX" ] && [ "$(SQL "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$FX' AND table_name LIKE 'r5\\_stage\\_B3\\_r6\\_p10\\_%';")" -gt 0 ] && echo 0 || echo 1)
# record the PRE-OPERATION snapshot (the P11-T2 baseline: before any re-hash or retry).
# When the P10_INJECT suite block recorded it (wrapper build), reuse it; when reusing a
# kept fixture record it now, before the destructive re-hash.
# P15 E4: a missing pre-operation snapshot ABORTS. Re-recording it here (pre-P15) produced a
# post-failure baseline labelled pre-operation, the exact v10 failure mode.
[ -f "$PREOP" ] || { echo "ABORT: pre-operation snapshot missing ($PREOP) - never re-recorded after a failure" | tee -a "$OUT"; exit 3; }
[ -f "$PRE" ] || { echo "ABORT: post-failure pre-hash missing ($PRE)" | tee -a "$OUT"; exit 3; }
# P15 E4: both snapshots must have been written by THIS build's suite run (mtime at or after the
# suite run's start, taken from its evidence file name r5_p6_acceptance_<UTC>.md), not survive
# from an earlier run under the same global file names.
python3 - "$EV" "$PREOP" "$PRE" <<'PY' | tee -a "$OUT"
import os, re, sys, calendar, time
ev, preop, pre = sys.argv[1:4]
# P17 A7: each snapshot has a sidecar naming the suite evidence file that wrote it; it must equal ours
for p in (preop, pre):
    try:
        who = open(p + ".run").read().strip()
    except OSError:
        who = ""
    if who != os.path.basename(ev):
        print("SNAPSHOT-BINDING ERROR: %s was written by %r, not by %s" % (os.path.basename(p), who or "(no sidecar)", os.path.basename(ev)))
        sys.exit(1)
m = re.search(r"r5_p6_acceptance_(\d{8}T\d{6}Z)\.md$", ev)
if not m:
    print("SNAPSHOT-BINDING ERROR: cannot read the suite start from %s" % os.path.basename(ev)); sys.exit(1)
start = calendar.timegm(time.strptime(m.group(1), "%Y%m%dT%H%M%SZ"))
bad = [p for p in (preop, pre) if os.path.getmtime(p) < start]
print("SNAPSHOT-BINDING suite start %s; pre-op and post-failure snapshots %s"
      % (m.group(1), "written by this run" if not bad else "OLDER than this run: %s" % bad))
sys.exit(1 if bad else 0)
PY
[ "${PIPESTATUS[0]}" = "0" ] || { echo "ABORT: snapshots not bound to this run" | tee -a "$OUT"; exit 3; }
# P11-T2: the pre-op snapshot is taken BEFORE the run creates stage tables, so its
# stage inventory is legitimately empty. The expected stage inventory for assertion
# (b) is the POST-FAILURE pre-hash ($PRE), written right after the injected run.
POSTF=$PC/p11_preserve_after_fail.json
# P11-T3: assert the stage inventory is COMPLETE (exactly the table set recorded in
# the post-failure pre-hash) — a dropped stage table makes this hash call exit 1
# with a "expected stage tables missing" error instead of silently passing.
EXP_LIST=$(python3 - "$PRE" <<'PY'
# P15 E4: the expected inventory is the oracle's SPECIFICATION (one stage table per reset
# table + the _reg table), not the post-failure observation; the observation must equal it.
import json, sys
sys.path.insert(0, '/opt/Deers-Rock/tools')
import sampled_real_form_diff_r5 as o
pfx = o._stage_prefix('r6_p10', 'B3')
spec = sorted(["%s_%s" % (pfx, t) for t in o.RESET_TABLES] + ["%s_reg" % pfx])
seen = sorted(json.load(open(sys.argv[1])).get("stage", {}))
if seen != spec:
    sys.stderr.write("INVENTORY-SPEC MISMATCH: post-failure observation %s vs specification %s\n"
                     % (sorted(set(spec) ^ set(seen)), len(spec)))
print(",".join(spec))
sys.exit(1 if seen != spec else 0)
PY
)
SPEC_RC=$?
python3 p10_hash_state.py $FX r6_p10 $PC/r6_two.txt $PC/r6_p10_protected.txt --stage-tables-list "$EXP_LIST" > "$POSTF" 2>/tmp/p11_post.err
RCH=$?
[ "$RCH" = "0" ] || grep -a "HASH-STATE ERROR" /tmp/p11_post.err | tee -a "$OUT"
python3 - "$PREOP" "$POSTF" "$PRE" <<'PY' | tee -a "$OUT" > "$PREOP_OUT"
import json, sys
preop, postf, pre = (json.load(open(p)) for p in sys.argv[1:4])
def eq(a, b, k): return a.get(k) == b.get(k)
# the pre-op stage inventory is empty by construction (the run creates the tables);
# assertion (b) is therefore post-fail vs the POST-FAILURE pre-hash, not vs pre-op.
print("stage: pre-op vs post-fail = %s · failure pre-hash vs post-fail = %s"
      % ("EQUAL" if eq(preop, postf, "stage") else "DIFFERENT",
         "EQUAL" if eq(postf, pre, "stage") else "DIFFERENT"))
print("sample: pre-op vs post-fail = %s (immediate restoration, assertion a)"
      % ("EQUAL" if eq(preop, postf, "sample") else "DIFFERENT"))
print("protected: pre-op vs post-fail = %s"
      % ("EQUAL" if eq(preop, postf, "protected") else "DIFFERENT"))
print("live: pre-op vs post-fail = %s"
      % ("EQUAL" if eq(preop, postf, "live") else "DIFFERENT"))
ok_a = eq(preop, postf, "sample")
ok_b = eq(postf, pre, "stage_rows") and eq(postf, pre, "stage")
ok_c = eq(preop, postf, "protected") and eq(preop, postf, "live")
print("PRESERVATION-RESULT a(sample-immediate)=%s b(stage-preservation)=%s c(protected-live)=%s"
      % ("EQUAL" if ok_a else "DIFFERENT", "EQUAL" if ok_b else "DIFFERENT",
         "EQUAL" if ok_c else "DIFFERENT"))
if not (ok_a and ok_b and ok_c):
    print("PRESERVATION-RESULT NOT-EQUAL (kept for inspection; P11-T7)")
PY
ok "independent hashes: sample equal to the pre-operation snapshot (a); stage tables preserved (b); protected + live unchanged (c); stage tables populated" $([ "$RCH" = "0" ] && [ "$SPEC_RC" = "0" ] && grep -q "PRESERVATION-RESULT a(sample-immediate)=EQUAL b(stage-preservation)=EQUAL c(protected-live)=EQUAL" "$PREOP_OUT" && echo 0 || echo 1)
if [ "${R5_NEGCTL_SKIP_IMMEDIATE_RESTORE:-}" = "1" ]; then   # P16 E2: exactly 1, 0 is inert
  # P11-T2 NC: the switch was set, so the oracle's failure path skipped the
  # immediate stage_restore; assertion (a) must therefore be DIFFERENT.
  ok "negative control R5_NEGCTL_SKIP_IMMEDIATE_RESTORE: with the switch the immediate-restore assertion (a) FAILS (the sample no longer equals the pre-op snapshot)" $([ "$(grep -c 'a(sample-immediate)=DIFFERENT' "$PREOP_OUT")" -ge 1 ] && echo 0 || echo 1)
fi

# 3. retry under writer exclusion on the kept fixture
echo "## 3. Retry of the FAILED batch on the kept fixture (writer exclusion)" | tee -a "$OUT"
GRANTED=1
SQL "GRANT SELECT, INSERT, UPDATE, DELETE ON \`$FX\`.* TO \`benchmark\`@\`localhost\`;"
# make the retry NEED a restore (so it runs under writer exclusion): change every billing
# row of the FAILED batch's visit after the preservation hashes were taken; P11-T7 asserts
# the number of rows the UPDATE changed equals the number counted BEFORE it (ROW_COUNT()).
NCH_BEFORE=$(SQL "SELECT COUNT(*) FROM $FX.billing WHERE no_rawat='2026/10/01/800085';")
NCH=$(mysql -uroot -N -e "UPDATE $FX.billing SET totalbiaya=totalbiaya+1 WHERE no_rawat='2026/10/01/800085'; SELECT ROW_COUNT();")
echo "perturbation: counted $NCH_BEFORE billing rows of 2026/10/01/800085 before; the UPDATE changed $NCH rows (+1 each)" | tee -a "$OUT"
ok "perturbation row count asserted: the UPDATE changed exactly the number of rows counted before it ($NCH_BEFORE)" $([ -n "$NCH" ] && [ "$NCH" = "$NCH_BEFORE" ] && [ "$NCH" -gt 0 ] && echo 0 || echo 1)
XML_TOUCHED=1
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
python3 p10_hash_state.py $FX r6_p10 $PC/r6_two.txt $PC/r6_p10_protected.txt > /tmp/p11_after.json 2>/dev/null
python3 - "$PREOP" /tmp/p11_after.json <<'PY' > /tmp/p11_after_cmp.txt
import json, sys
a = json.load(open(sys.argv[1]))
try:
    b = json.load(open(sys.argv[2]))
except Exception:
    b = {}
print("protected (post-retry vs pre-op):", "EQUAL" if a["protected"] == b.get("protected") else "DIFFERENT")
print("live (post-retry vs pre-op):", "EQUAL" if a["live"] == b.get("live") else "DIFFERENT")
PY
cat /tmp/p11_after_cmp.txt | tee -a "$OUT"
ok "retry exit 0 with per-operation lines: writer proof + fence; current state != pre-reset detected; WRITER-EXCLUSION on (DML revoked) and off (grants as before); restore hash-verified; both batches BILLED" $([ "$RCR" = "0" ] && [ "$(cnt "WRITER-DEAD-PROOF (resume" /tmp/p10_pc_retry.log)" -ge 1 ] && [ "$(cnt "FENCE (P9-B4)" /tmp/p10_pc_retry.log)" -ge 1 ] && [ "$(cnt "current state is not the pre-reset state" /tmp/p10_pc_retry.log)" -ge 1 ] && [ "$(cnt "WRITER-EXCLUSION on (P10-B4) $FX: revoked=\['DELETE', 'INSERT', 'UPDATE'\]" /tmp/p10_pc_retry.log)" -ge 1 ] && [ "$(cnt "WRITER-EXCLUSION off (P10-B4) $FX: restored=\['DELETE', 'INSERT', 'UPDATE'\]" /tmp/p10_pc_retry.log)" -ge 1 ] && [ "$(cnt "grants not as before" /tmp/p10_pc_retry.log)" = "0" ] && [ "$(cnt "STAGE-RESTORED-VERIFIED" /tmp/p10_pc_retry.log)" -ge 1 ] && [ "$(cnt "rc=0 visits=1 sukses_true=1 -> BILLED" /tmp/p10_pc_retry.log)" = "2" ] && echo 0 || echo 1)
ok "protected non-sample visits and live sik unchanged by the retry (assertion c, pre-operation baseline)" $(grep -q "^protected (post-retry vs pre-op): EQUAL" /tmp/p11_after_cmp.txt && grep -q "^live (post-retry vs pre-op): EQUAL" /tmp/p11_after_cmp.txt && echo 0 || echo 1)

# 4. teardown: on success drop the fixture; on failure KEEP it and print the teardown command
if [ "$FAILS" = "0" ]; then
  bash p6_run_suite_fresh.sh --teardown-kept > /tmp/p10_pc_td.log 2>&1
  ok "explicit --teardown-kept leaves only sik and sik_bench ($(tail -1 /tmp/p10_pc_td.log))" $([ -z "$(SQL "SHOW DATABASES LIKE '$FX'")" ] && echo 0 || echo 1)
  XML=$(python3 p6_dbxml.py probe 2>&1 | awk '{print $NF}' | sort -u | tr '\n' ' ')
  ok "database.xml back on sik ($XML); benchmark grant on $FX removed" $([ "$XML" = "sik " ] && [ "$(SQL "SHOW GRANTS FOR benchmark@localhost" | grep -c "$FX")" = "0" ] && echo 0 || echo 1)
else
  echo "P11-T7: $FAILS assertion(s) failed — the fixture $FX is KEPT (no --teardown-kept); inspect it, save evidence, then:" | tee -a "$OUT"
  echo "  bash p6_run_suite_fresh.sh --teardown-kept" | tee -a "$OUT"
  XML=$(python3 p6_dbxml.py probe 2>&1 | awk '{print $NF}' | sort -u | tr '\n' ' ')
  ok "database.xml back on sik ($XML); benchmark grant on $FX removed (P11-T7 keep-on-fail path)" $([ "$XML" = "sik " ] && [ "$(SQL "SHOW GRANTS FOR benchmark@localhost" | grep -c "$FX")" = "0" ] && echo 0 || echo 1)
fi
if [ "$FAILS" = "0" ]; then echo "PRESERVATION-CHECK PASS" | tee -a "$OUT"; echo "evidence: $OUT"; exit 0; fi
# save the pre-op comparison transcript as durable evidence before the keep-on-fail exit
cp "$PREOP_OUT" "$PC/r5_p10_preservation_preop_${TS}.md" 2>/dev/null || true
echo "PRESERVATION-CHECK FAIL ($FAILS)" | tee -a "$OUT"; echo "evidence: $OUT"; exit 1
