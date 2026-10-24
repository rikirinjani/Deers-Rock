#!/bin/bash
# P12 step 1: re-run the whole evidence chain on the re-pinned (run-lock) bytes, under ONE held run lock.
#   frozen check -> suite 39 -> preservation -> unit test -> builder byte-identity -> NC 5/5 -> live state
# Usage (root on the VPS, detached): bash p12_rerun_chain.sh <session-id>
# Refuses if a lock is held. Always releases its own lock. Live sik/sik_bench are only read.
set -u
cd /opt/Deers-Rock/tools
SID=${1:?session id}
TS=$(date -u +%Y%m%dT%H%M%SZ)
OUT=/opt/dr-benchmark/p-chain/r5_p12_rerun_chain_${TS}.log
exec > >(tee -a "$OUT") 2>&1
bash dr_runlock.sh acquire "$SID" "p12 rerun chain" || exit 3
trap 'bash /opt/Deers-Rock/tools/dr_runlock.sh release "$SID"' EXIT
export DR_LOCK_SESSION=$SID
echo "=== P12 RERUN CHAIN $TS (UTC) session=$SID ==="
echo "=== STEP 0: frozen set ==="; sha256sum -c p11_frozen_20261024b.sha256; F0=$?; echo "frozen-check exit=$F0"
[ $F0 = 0 ] || exit 4
echo "=== STEP 1: FULL FRESH SUITE ==="; bash p6_run_suite_fresh.sh > /tmp/p12_suite.log 2>&1; S=$?; tail -6 /tmp/p12_suite.log; echo "suite exit=$S"
echo "=== STEP 2: PRESERVATION CHECK ==="; bash p10_preservation_check.sh > /tmp/p12_pres.log 2>&1; P=$?; grep -a "PRESERVATION-" /tmp/p12_pres.log | tail -3; echo "preservation exit=$P"
echo "=== STEP 3: UNIT TEST ==="; python3 p8_recovery_unit_test.py > /tmp/p12_unit.log 2>&1; U=$?; tail -2 /tmp/p12_unit.log; echo "unit exit=$U"
echo "=== STEP 4: BUILDER BYTE-IDENTITY ==="; bash p8_builder_all_check.sh > /tmp/p12_builder.log 2>&1; B=$?; tail -4 /tmp/p12_builder.log; echo "builder exit=$B"
echo "=== STEP 5: NEGATIVE CONTROLS ==="; bash p11_negative_controls.sh > /tmp/p12_nc.log 2>&1; N=$?; grep -a "^NC [0-9]:\|DISCRIMINATING=\|^evidence:" /tmp/p12_nc.log; echo "nc exit=$N"
echo "=== STEP 5b: RUN-LOCK NEGATIVE CONTROL (own lock released first, re-acquired after) ==="
bash dr_runlock.sh release "$SID" >/dev/null; bash runlock_negctl.sh > /tmp/p12_lockctl.log 2>&1; L=$?; grep -a "^PASS\|^FAIL\|=== RUNLOCK" /tmp/p12_lockctl.log | tail -4; echo "runlock-negctl exit=$L"
bash dr_runlock.sh acquire "$SID" "p12 rerun chain (resumed)" || exit 3
echo "=== STEP 5c: PER-ENCOUNTER RECONCILIATION (read-only) ==="
[ -f /opt/dr-benchmark/r4_sample/B3_sampled_form_diff.csv ] || { mkdir -p /opt/dr-benchmark/r4_sample; cp /opt/dr-benchmark/results/r4_b2_1000/B3_sampled_form_diff.csv /opt/dr-benchmark/r4_sample/; }
python3 p12_perencounter_reconcile.py --sample-csv /opt/dr-benchmark/r4_sample/B3_sampled_form_diff.csv --out /opt/dr-benchmark/p-chain/r5_p12_perencounter_diffs_${TS}.csv > /tmp/p12_recon.log 2>&1; R=$?; cat /tmp/p12_recon.log; echo "reconcile exit=$R (1 = the one documented residual, see R5 s24)"
echo "=== STEP 5d: RECONCILE NEGATIVE CONTROL ==="
bash p12_reconcile_negctl.sh /opt/dr-benchmark/r4_sample/B3_sampled_form_diff.csv > /tmp/p12_reconctl.log 2>&1; RN=$?; cat /tmp/p12_reconctl.log; echo "reconcile-negctl exit=$RN"
echo "=== STEP 6: LIVE-STATE PROOF ==="
echo "databases: $(mysql -uroot -N -e 'SHOW DATABASES' | grep '^sik' | tr '\n' ' ')"
echo "database.xml: $(find /opt -name database.xml -path '*setting*' 2>/dev/null | sort | xargs grep -L . 2>/dev/null | wc -l) empty; (targets verified by suite A-checks)"
python3 - <<'PY'
import sys, hashlib
sys.path.insert(0,'/opt/Deers-Rock/tools'); import dbutil
rows = dbutil.query("sik_bench", "SELECT * FROM dr_charge_ledger ORDER BY no_rawat, component, code", force_root=True)
h = hashlib.sha256()
for r in rows: h.update(("|".join(str(c) for c in r) + "\n").encode())
print("live ledger: %d:%s" % (len(rows), h.hexdigest()))
PY
echo "writer markers: $(ls /opt/dr-benchmark/results/.writer_exclusion_* 2>/dev/null | wc -l)"
echo "benchmark grant on sik_p6f: $(mysql -uroot -N -e "SHOW GRANTS FOR 'benchmark'@'localhost'" | grep -c sik_p6f)"
echo "frozen set after: $(sha256sum -c p11_frozen_20261024b.sha256 | grep -vc ': OK')  (0 = all OK)"
echo "=== CHAIN DONE: suite=$S pres=$P unit=$U builder=$B nc=$N lockctl=$L recon=$R reconctl=$RN ==="
