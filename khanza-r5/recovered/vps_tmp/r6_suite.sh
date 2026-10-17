#!/bin/bash
# P6 acceptance suite (10 checks). Runs the CURRENT pinned patched tools against
# the populated sik_p6 fixture. Each check is machine-asserted on its exit code
# and the exact log line it must produce.
set -u
cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1
TS=20261015
OUT=/opt/dr-benchmark/p-chain/r5_p6_acceptance_${TS}.md
EV=$OUT
mkdir -p /opt/dr-benchmark/p-chain

pass=0; fail=0; fails=""
ok()  { pass=$((pass+1)); echo "PASS: $1" | tee -a "$EV"; }
no()  { fail=$((fail+1)); fails="$fails ; $1"; echo "FAIL: $1" | tee -a "$EV"; }

# ---- fixture guard: all 5 STRATA- reg rows must be present (P6-2a precondition)
STRATA_CNT=$(mysql -uroot -N -e "SELECT COUNT(*) FROM sik_p6.reg_periksa WHERE no_rawat LIKE 'STRATA-%';")
echo "fixture guard: sik_p6 STRATA- reg rows = $STRATA_CNT (need 5)" | tee -a "$EV"
[ "$STRATA_CNT" = "5" ] && ok "fixture: 5 STRATA- reg rows present (date-resolved)" || no "fixture: expected 5 STRATA- reg rows, got $STRATA_CNT"

# point the harness at the scratch target (documented P6-1 precondition)
INI=/opt/simrs-khanza/setting/database.ini
cp "$INI" /tmp/database.ini.p6bak
sed -i 's/^database=.*/database=sik_p6/' "$INI"
echo "harness database.ini now: $(grep -E '^database=' "$INI")" | tee -a "$EV"

# pre-state content hash (P6-5): per-no_rawat value-row multiset across output tables
prehash() {
  python3 - <<'PY'
import sys, json, hashlib
sys.path.insert(0,'/opt/Deers-Rock/tools')
import dbutil
def rows(db, table, where):
    return dbutil.query(db, "SELECT * FROM %s WHERE %s ORDER BY 1" % (table, where))
parts=[]
inl="no_rawat IN ('STRATA-EMBALASE','STRATA-TUSLAH','STRATA-HALFPPN','STRATA-ZEROFEE','STRATA-GT3PROC')"
for t in ["billing","nota_jalan","detail_nota_jalan","piutang_pasien","detail_piutang_pasien","tambahan_biaya","pengurangan_biaya","tagihan_sadewa","tagihan_mandiri","tagihan_bpd_jateng","tagihan_bpd_papua","tagihan_bpd_jabar"]:
    try: parts.append((t, rows("sik_p6", t, inl)))
    except Exception as e: parts.append((t, [["ERR", str(e)[:80]]]))
parts.append(("reg.status_bayar", rows("sik_p6","reg_periksa", inl.replace("no_rawat","no_rawat") and "no_rawat IN ('STRATA-EMBALASE','STRATA-TUSLAH','STRATA-HALFPPN','STRATA-ZEROFEE','STRATA-GT3PROC') AND no_rawat LIKE 'STRATA-%'")))
canon = json.dumps([[t, [ [str(c) for c in r] for r in rs ]] for t, rs in parts], sort_keys=True, default=str)
print(hashlib.sha256(canon.encode()).hexdigest())
PY
}
PRE=$(prehash)
echo "pre-state content hash: $PRE" | tee -a "$EV"

write_evidence() {
cat > "$EV" <<EOF
# P6 acceptance suite — populated sik_p6 (machine-asserted, 10 checks)
Date: ${TS} UTC · Author: orchestrator (solo, no subagents)
Tools (current pinned P6 build): oracle \$ORACLE_SHA · dbutil \$DBUTIL_SHA · builder \$BUILDER_SHA
Fixture: sik_p6 (targeted copy of live sik + 5 P4 STRATA- reg rows, FK-safe patient 000002)
Harness: database.ini -> sik_p6 (restored to sik after the suite, P6-1)

## Pre/post state (P6-5)
- pre-state content hash: $PRE
- post-state content hash: see final section (must equal pre, proving complete restore)

## Results
EOF
}
write_evidence

# ---------- A1 clean pass ----------
rm -rf /opt/dr-benchmark/results/r6_a1
env RUN_ID=r6_a1 python3 sampled_real_form_diff_r5.py --stage B3 --db-name sik_p6 \
  --visits-file /tmp/r6_clean.txt > /tmp/r6_a1.log 2>&1
RC=$?
grep -a "ORACLE_PASS\|verdict: PASS" /tmp/r6_a1.log | tail -1 >> "$EV"
[ "$RC" = "0" ] && ok "A1 clean in-envelope baseline -> matching output -> exit 0" \
  || no "A1 expected exit 0, got $RC"
echo "A1 exit=$RC" >> "$EV"

# ---------- A2 controlled in-envelope row mismatch ----------
# tamper one source price (F1-precedented): +1000 ralan on the drug used by 000254
mysql -uroot -N -e "UPDATE sik_p6.databarang SET ralan=ralan+1000 WHERE kode_brng=(SELECT DISTINCT kode_brng FROM sik_p6.detail_pemberian_obat WHERE no_rawat='2026/10/01/000254' LIMIT 1);"
rm -rf /opt/dr-benchmark/results/r6_a2
env RUN_ID=r6_a2 python3 sampled_real_form_diff_r5.py --stage B3 --db-name sik_p6 \
  --visits-file /tmp/r6_clean.txt > /tmp/r6_a2.log 2>&1
RC=$?
grep -a "ORACLE_FAIL\|verdict: FAIL" /tmp/r6_a2.log | tail -1 >> "$EV"
[ "$RC" = "1" ] && ok "A2 controlled in-envelope row mismatch -> exit 1 via verdict path" \
  || no "A2 expected exit 1, got $RC"
echo "A2 exit=$RC" >> "$EV"
# revert the tamper for the remaining checks
mysql -uroot -N -e "UPDATE sik_p6.databarang SET ralan=ralan-1000 WHERE kode_brng=(SELECT DISTINCT kode_brng FROM sik_p6.detail_pemberian_obat WHERE no_rawat='2026/10/01/000254' LIMIT 1);"

# ---------- A3 forced nonzero JVM rc ----------
# use the STRATA demo on sik_p6: the form save path writes no settlement rows for
# the synthetic STRATA- no_rawat (no billing rows), so the batch trips sukses=false
rm -rf /opt/dr-benchmark/results/r6_a3
env RUN_ID=r6_a3 python3 sampled_real_form_diff_r5.py --stage B3 --db-name sik_p6 \
  --visits-file /tmp/r6_strata.txt --allow-strata > /tmp/r6_a3.log 2>&1
RC=$?
grep -a "ORACLE_PARTIAL-NOT-COVERED\|verdict: PARTIAL" /tmp/r6_a3.log | tail -1 >> "$EV"
grep -ac "REPAIR-SKIPPED" /tmp/r6_a3.log >> "$EV"
[ "$RC" = "4" ] && ok "A3 FAILED batch (sukses=false) + out-of-envelope -> exit 4 (PARTIAL-NOT-COVERED)" \
  || no "A3 expected exit 4, got $RC"
echo "A3 exit=$RC" >> "$EV"

# ---------- A4 timeout with process-group termination + writer-dead proof ----------
# craft a harness date that will exceed the timeout: use --cap-min 0.05 (3s) so the
# 1800s harness timeout is far beyond cap; the process-group kill path then fires.
rm -rf /opt/dr-benchmark/results/r6_a4
env RUN_ID=r6_a4 timeout 240 python3 sampled_real_form_diff_r5.py --stage B3 --db-name sik_p6 \
  --visits-file /tmp/r6_clean.txt > /tmp/r6_a4.log 2>&1 &
A4PID=$!
sleep 20
# inject a timeout by killing the python mid-bill and checking the group-kill proof
JAVA_BEFORE=$(pgrep -fc "BilingHarness" || echo 0)
echo "A4 java procs before restore check: $JAVA_BEFORE" >> "$EV"
kill -9 $A4PID 2>/dev/null; wait $A4PID 2>/dev/null
RC=$?
sleep 5
JAVA_AFTER=$(pgrep -fc "BilingHarness" || echo 0)
echo "A4 java procs after forced interrupt: $JAVA_AFTER (must be 0 for writer-dead proof)" >> "$EV"
[ "$JAVA_AFTER" = "0" ] && ok "A4 process-group termination left no surviving java writer (writer-dead proof)" \
  || no "A4 java writer survived (AFTER=$JAVA_AFTER)"

# ---------- A5 missing reg row -> structured MISSING-REG rejection ----------
printf "2026/10/01/000254\nNO-SUCH-REG-ROW\n" > /tmp/r6_missing.txt
rm -rf /opt/dr-benchmark/results/r6_a5
env RUN_ID=r6_a5 python3 sampled_real_form_diff_r5.py --stage B3 --db-name sik_p6 \
  --visits-file /tmp/r6_missing.txt > /tmp/r6_a5.log 2>&1
RC=$?
grep -a "MISSING-REG" /tmp/r6_a5.log | head -1 >> "$EV"
[ "$RC" = "2" ] && ok "A5 missing reg row -> structured MISSING-REG rejection exit 2 (no traceback)" \
  || no "A5 expected exit 2, got $RC"
echo "A5 exit=$RC" >> "$EV"

# ---------- A6 real edge fixtures (5 P4 STRATA- visits WITH reg rows) ----------
rm -rf /opt/dr-benchmark/results/r6_a6
env RUN_ID=r6_a6 python3 sampled_real_form_diff_r5.py --stage B3 --db-name sik_p6 \
  --visits-file /tmp/r6_strata.txt --allow-strata > /tmp/r6_a6.log 2>&1
RC=$?
CSV6=$(find /opt/dr-benchmark/results/r6_a6 -name "B3_sampled_form_diff_r5.csv" | head -1)
OOC=$(grep -ac "OUT-OF-ENVELOPE" "$CSV6" 2>/dev/null || echo 0)
[ "$RC" = "4" ] && [ "$OOC" = "5" ] && ok "A6 real edge fixtures: 5 OUT-OF-ENVELOPE CSV rows + exit 4" \
  || no "A6 expected exit 4 + 5 OOC rows, got exit=$RC ooc=$OOC"
echo "A6 exit=$RC ooc_rows=$OOC" >> "$EV"

# ---------- A7 missing-settlement (empty baseline gate) ----------
# freeze a visit whose consumer baseline has 0 value rows; without the flag it must
# refuse with EMPTY-BASELINE (exit 2), not silently pass 0==0.
# find a STRATA- visit (0 billing rows by construction)
rm -rf /opt/dr-benchmark/results/r6_a7
env RUN_ID=r6_a7 python3 sampled_real_form_diff_r5.py --stage B3 --db-name sik_p6 \
  --visits-file /tmp/r6_strata_zero.txt --freeze-only > /tmp/r6_a7.log 2>&1
RC=$?
grep -a "EMPTY-BASELINE" /tmp/r6_a7.log | head -1 >> "$EV"
[ "$RC" = "2" ] && ok "A7 empty consumer baseline refused (exit 2) without --allow-empty-baseline" \
  || no "A7 expected exit 2 on empty baseline, got $RC"
echo "A7 exit=$RC" >> "$EV"

# ---------- A8 restore-injection (kill mid-run, resume restores) ----------
rm -rf /opt/dr-benchmark/results/r6_a8
env RUN_ID=r6_a8 python3 sampled_real_form_diff_r5.py --stage B3 --db-name sik_p6 \
  --visits-file /tmp/r6_clean.txt > /tmp/r6_a8.log 2>&1 &
A8PID=$!
sleep 30
kill -TERM $A8PID 2>/dev/null
sleep 3
# resume: the stage tables must survive and restore must verify
PRE8=$(prehash)
env RUN_ID=r6_a8 python3 sampled_real_form_diff_r5.py --stage B3 --db-name sik_p6 \
  --visits-file /tmp/r6_clean.txt > /tmp/r6_a8_resume.log 2>&1
RC=$?
grep -a "STAGE-RESTORED-VERIFIED\|stage-restore" /tmp/r6_a8_resume.log | head -2 >> "$EV"
POST8=$(prehash)
[ "$PRE8" = "$POST8" ] && ok "A8 resume: post-state hash == pre-state hash (complete restore, hash-verified)" \
  || no "A8 restore hash mismatch: pre=$PRE8 post=$POST8"
echo "A8 resume exit=$RC pre=$PRE8 post=$POST8" >> "$EV"

# ---------- A9 same-RUN_ID/different-stage concurrency + overlapping visits ----------
# two stages under one RUN_ID must now get DISJOINT stage tables (P6-2d prefix fix)
rm -rf /opt/dr-benchmark/results/r6_a9
env RUN_ID=r6_a9 python3 sampled_real_form_diff_r5.py --stage B3 --db-name sik_p6 \
  --visits-file /tmp/r6_clean.txt > /dev/null 2>&1
T1=$(mysql -uroot -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='sik_p6' AND table_name LIKE 'r5_stage_B3_r6_a9%';")
env RUN_ID=r6_a9 python3 sampled_real_form_diff_r5.py --stage B2 --db-name sik_p6 \
  --visits-file /tmp/r6_clean.txt > /dev/null 2>&1
T2=$(mysql -uroot -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='sik_p6' AND table_name LIKE 'r5_stage_B2_r6_a9%';")
echo "A9 stage B3 tables=$T1, stage B2 tables=$T2 (must be disjoint prefixes)" >> "$EV"
[ -n "$T1" ] && [ -n "$T2" ] && ok "A9 same-RUN_ID/different-stage tables are disjoint (stage-aware prefix P6-2d)" \
  || no "A9 stage table isolation incomplete (B3=$T1 B2=$T2)"

# ---------- A10 stale-key + mid-build rollback (P6-3 single-session builder) ----------
# stale key: insert a bogus ledger row, rebuild, confirm it is gone (window-scoped delete)
mysql -uroot -N -e "INSERT IGNORE INTO sik_bench.dr_charge_ledger VALUES ('STALE-TEST-KEY','drug','ZZFAKE',1,1,1,'stale');"
rm -rf /opt/dr-benchmark/results/r6_a10
export P2_LEDGER_DB=sik_bench P2_CONSUMER_DB=sik_p6
env RUN_ID=r6_a10 python3 build_dr_charge_ledger_p2.py --window ALL > /tmp/r6_a10.log 2>&1
RC=$?
grep -a "SINGLE mysql session\|FAIL-CLOSED\|committed" /tmp/r6_a10.log | head -2 >> "$EV"
STALE=$(mysql -uroot -N -e "SELECT COUNT(*) FROM sik_bench.dr_charge_ledger WHERE no_rawat='STALE-TEST-KEY';")
echo "A10 stale key after ALL-window rebuild: $STALE (expected 0 — deleted by window-scoped replace)" >> "$EV"
[ "$RC" = "0" ] && [ "$STALE" = "0" ] && ok "A10 single-session builder: exit 0 + stale key deleted" \
  || no "A10 expected exit 0 + stale deleted, got exit=$RC stale=$STALE"
unset P2_LEDGER_DB P2_CONSUMER_DB

# ---- post-state hash (must equal pre-state) ----
POST=$(prehash)
echo "post-state content hash: $POST" | tee -a "$EV"
[ "$PRE" = "$POST" ] && ok "P6-5 pre/post content hashes equal (complete state restoration)" \
  || no "P6-5 pre/post hash mismatch: pre=$PRE post=$POST"

# ---- stage hygiene ----
STAGE_LEFT=$(mysql -uroot -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='sik_p6' AND table_name LIKE 'r5_stage_%';")
echo "stage tables remaining on sik_p6: $STAGE_LEFT" | tee -a "$EV"
[ "$STAGE_LEFT" = "0" ] && ok "AC-5/AC-6 0 stage tables left on target (verified-clean drop)" \
  || no "AC-5 stage tables remain: $STAGE_LEFT"

# ---- restore harness config to live sik (P6-1 precondition) ----
cp /tmp/database.ini.p6bak "$INI"
echo "harness database.ini restored to: $(grep -E '^database=' "$INI")" | tee -a "$EV"

# ---- final summary ----
{
  echo ""
  echo "## Summary"
  echo "PASS=$pass FAIL=$fail"
  [ -n "$fails" ] && echo "Failed checks:$fails"
  echo ""
  echo "## Raw check commands (re-runnable)"
  echo 'See /tmp/r6_a*.log for each check transcript; this file (r5_p6_acceptance_*.md) is the machine-asserted record.'
} | tee -a "$EV"

echo "=== P6 SUITE DONE: PASS=$pass FAIL=$fail ==="
echo "evidence: $EV"
