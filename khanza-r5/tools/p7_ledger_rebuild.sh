#!/bin/bash
# P7 §5 option A (owner-approved 2026-10-17): back up the live DR ledger, rebuild it from
# source with the pinned builder (--window ALL), prove the diff is exactly what the scratch
# rebuild predicted, and re-run every gate including --line-diff.
set -u
cd /opt/Deers-Rock/tools
TS=$(date -u +%Y%m%dT%H%M%SZ)
OUT=/opt/dr-benchmark/p-chain/r5_p7_ledger_rebuild_${TS}.md
BAK=dr_charge_ledger_bak_20261017
SQL() { mysql -uroot -N -e "$1"; }
res() { echo "$1" | tee -a "$OUT"; }
lh() { python3 - "$1" "$2" <<'PY'
import sys, hashlib
sys.path.insert(0,'/opt/Deers-Rock/tools'); import dbutil
rows = dbutil.query(sys.argv[1], "SELECT * FROM %s ORDER BY no_rawat, component, code" % sys.argv[2], force_root=True)
h = hashlib.sha256()
for r in rows: h.update(("|".join(str(c) for c in r) + "\n").encode())
print("%d:%s" % (len(rows), h.hexdigest()))
PY
}
{ echo "# P7 live ledger rebuild (option A)"; echo "Run $TS UTC"; echo; } > "$OUT"

# preconditions
[ "$(pgrep -fc 'sampled_real_form_diff|build_dr_charge_ledger|BilingHarness')" = "0" ] || { res "ABORT: benchmark processes running"; exit 3; }
[ -n "$(SQL "SHOW TABLES FROM sik_bench LIKE '$BAK'")" ] && { res "ABORT: backup table $BAK already exists"; exit 3; }
res "builder sha256: $(sha256sum build_dr_charge_ledger_p2.py | cut -c1-16) (manifest pin 7f6e79c41bed…)"

# 1. backup + verify
PRE=$(lh sik_bench dr_charge_ledger)
res "pre: rows/amount $(SQL "SELECT CONCAT(COUNT(*),' / ',CAST(SUM(amount) AS DECIMAL(20,0))) FROM sik_bench.dr_charge_ledger") · content $PRE"
SQL "CREATE TABLE sik_bench.$BAK LIKE sik_bench.dr_charge_ledger; INSERT INTO sik_bench.$BAK SELECT * FROM sik_bench.dr_charge_ledger;"
BH=$(lh sik_bench $BAK)
res "backup $BAK: $BH"
[ "$BH" = "$PRE" ] || { res "ABORT: backup content differs from live ledger"; exit 3; }
res "BACKUP-VERIFIED (identical content hash)"

# 2. rebuild from source (live sik read-only, sik_bench ledger rewritten in one transaction)
T0=$(date +%s)
RUN_ID=p7_rebuild_$TS python3 build_dr_charge_ledger_p2.py --window ALL > /tmp/p7_rebuild.log 2>&1; RC=$?
res "builder --window ALL exit=$RC wall=$(( $(date +%s) - T0 ))s"
grep -aE "rows:|SINGLE mysql session|FAIL-CLOSED|Traceback" /tmp/p7_rebuild.log | cut -c1-200 | tee -a "$OUT"
[ "$RC" = "0" ] || { res "ABORT: builder failed — live ledger left as the transaction left it; backup $BAK intact"; exit 4; }
POST=$(lh sik_bench dr_charge_ledger)
res "post: rows/amount $(SQL "SELECT CONCAT(COUNT(*),' / ',CAST(SUM(amount) AS DECIMAL(20,0))) FROM sik_bench.dr_charge_ledger") · content $POST"

# 3. diff vs backup — expected: same keys, amounts, unit prices; 1 quantity; source labels
res "diff vs backup:"
SQL "SELECT 'only_backup', COUNT(*) FROM sik_bench.$BAK b LEFT JOIN sik_bench.dr_charge_ledger l USING (no_rawat,component,code) WHERE l.no_rawat IS NULL;
     SELECT 'only_new', COUNT(*) FROM sik_bench.dr_charge_ledger l LEFT JOIN sik_bench.$BAK b USING (no_rawat,component,code) WHERE b.no_rawat IS NULL;
     SELECT 'diff_amount', SUM(l.amount<>b.amount), 'diff_unit', SUM(l.unit_price<>b.unit_price), 'diff_qty', SUM(l.quantity<>b.quantity), 'diff_source', SUM(NOT (l.source <=> b.source)) FROM sik_bench.dr_charge_ledger l JOIN sik_bench.$BAK b USING (no_rawat,component,code);
     SELECT 'qty_changed', l.no_rawat, l.component, l.code, b.quantity, l.quantity FROM sik_bench.dr_charge_ledger l JOIN sik_bench.$BAK b USING (no_rawat,component,code) WHERE l.quantity<>b.quantity;" | tee -a "$OUT"

# 4. every gate, both windows, incl. line-diff
for w in 2026-10 ALL; do
  RUN_ID=p7_gates_${TS}_$w python3 charge_delta_per_component_p2.py --window $w > /tmp/p7_cd_$w.log 2>&1; a=$?
  RUN_ID=p7_gates_${TS}_${w}_ld python3 charge_delta_per_component_p2.py --window $w --line-diff > /tmp/p7_ld_$w.log 2>&1; b=$?
  RUN_ID=p7_gates_${TS}_${w}_tc python3 three_count_reconcile_p2.py --window $w > /tmp/p7_tc_$w.log 2>&1; c=$?
  res "window $w: charge_delta exit=$a · line-diff exit=$b · three_count exit=$c"
  grep -ahE "gate \(|LINE-DELTA |Count [AC] " /tmp/p7_cd_$w.log /tmp/p7_ld_$w.log /tmp/p7_tc_$w.log | cut -c1-170 | tee -a "$OUT"
done
cp /tmp/p7_rebuild.log /tmp/p7_cd_*.log /tmp/p7_ld_*.log /tmp/p7_tc_*.log "$(dirname "$OUT")/" 2>/dev/null
echo "P7 REBUILD DONE evidence=$OUT"
