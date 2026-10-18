#!/bin/bash
# P9-A3: the production terminal path, end to end. One REAL check (A0) is forced to fail
# (P9_FORCE_FAIL_CHECK=0); P9_QUICK=1 skips the long middle of the suite, which still ends
# through its normal final exit line. The wrapper must exit non-zero, KEEP the fixture,
# and leave an evidence file showing exactly that FAIL; then --teardown-kept removes it.
# Exits 0 only if every assertion holds. Usage (root on the VPS): bash p9_terminal_path_check.sh
set -u
cd /opt/Deers-Rock/tools
SQL() { mysql -uroot -N -e "$1"; }
TS=$(date -u +%Y%m%dT%H%M%SZ)
OUT=/opt/dr-benchmark/p-chain/r5_p9_terminal_path_${TS}.md
FX=sik_p6f
{
echo "# P9 terminal-path check — run $TS (UTC)"
echo "Tools: $(sha256sum p6_acceptance_suite.sh p6_run_suite_fresh.sh p9_terminal_path_check.sh | awk '{print substr($1,1,12)" "$2}' | tr '\n' ';')"
} > "$OUT"
[ -n "$(SQL "SHOW DATABASES LIKE '$FX'")" ] && { echo "ABORT: $FX already exists" | tee -a "$OUT"; exit 3; }
P9_QUICK=1 P9_FORCE_FAIL_CHECK=0 bash p6_run_suite_fresh.sh > /tmp/p9_tp_run.log 2>&1
RC=$?
KEPT=$(SQL "SHOW DATABASES LIKE '$FX'")
EV=$(ls -t /opt/dr-benchmark/p-chain/r5_p6_acceptance_*.md | head -1)
A0F=$(grep -ac "^A0: FAIL .*FORCED FAIL by P9_FORCE_FAIL_CHECK" "$EV")
F1=$(grep -ac "^PASS=[0-9]* FAIL=1 " "$EV")
A13=$(grep -ac "^A13: PASS" "$EV")
KEPTMSG=$(grep -ac "FIXTURE-KEPT: $FX kept because the suite failed (exit 1)" /tmp/p9_tp_run.log)
XML=$(python3 p6_dbxml.py probe 2>&1 | awk '{print $NF}' | sort -u | tr '\n' ' ')
GRANT=$(SQL "SHOW GRANTS FOR benchmark@localhost" | grep -c "$FX")
{
echo "wrapper exit=$RC (must be 1)"
echo "fixture kept after the failed suite: '${KEPT}' (must be $FX); wrapper said FIXTURE-KEPT: $KEPTMSG"
echo "suite evidence: $(basename "$EV"): A0 forced FAIL lines=$A0F, 'FAIL=1' summary lines=$F1, A13 live guard PASS lines=$A13"
echo "database.xml targets after the run: $XML (must be sik); benchmark grant on $FX after the run: $GRANT (must be 0)"
} | tee -a "$OUT"
bash p6_run_suite_fresh.sh --teardown-kept > /tmp/p9_tp_teardown.log 2>&1
GONE=$(SQL "SHOW DATABASES LIKE '$FX'")
echo "after --teardown-kept: '$GONE' (must be empty); $(tail -1 /tmp/p9_tp_teardown.log)" | tee -a "$OUT"
if [ "$RC" = "1" ] && [ "$KEPT" = "$FX" ] && [ "$KEPTMSG" -ge 1 ] && [ "$A0F" = "1" ] && [ "$F1" = "1" ] && [ "$A13" = "1" ] \
   && [ "$XML" = "sik " ] && [ "$GRANT" = "0" ] && [ -z "$GONE" ]; then
  echo "TERMINAL-PATH-CHECK PASS" | tee -a "$OUT"; echo "evidence: $OUT"; exit 0
fi
echo "TERMINAL-PATH-CHECK FAIL" | tee -a "$OUT"; echo "evidence: $OUT"; exit 1
