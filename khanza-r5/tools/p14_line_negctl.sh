#!/bin/bash
# P14 T3 negative controls for p14_line_identity.py, on a scratch copy sik_p14n that holds
# the fixture rows of sik_p14e plus the lookup tables (no full dump needed).
#   (a) same-price code swap: one procedure line of 900007 is renamed to ANOTHER code with the
#       same Khanza price. The component delta must stay {} while line identity says DIFFER.
#   (b) qty/unit change with unchanged amount: one drug line of 900022 gets jumlah+1 and
#       biaya = amount/(jumlah+1). Component delta {} again, line identity DIFFER.
#   (c) collision rename: the drug line of 900021 becomes 'xxx (OBAT ORAL)' (2 codes, neither
#       in that encounter's ledger) -> AMBIGUOUS.
# Each plant asserts ROW_COUNT()=1. The unplanted copy must pass first.
# Usage: DR_LOCK_SESSION=<id> bash p14_line_negctl.sh
set -u
cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1
FX=sik_p14e; W=sik_p14n
. ./dr_runlock.sh; dr_runlock_require p14_line_negctl.sh
SQL() { mysql -uroot -N -e "$1"; }
[ -n "$(SQL "SHOW DATABASES LIKE '$FX'")" ] || { echo "ABORT: $FX missing"; exit 3; }
[ -n "$(SQL "SHOW DATABASES LIKE '$W'")" ] && { echo "ABORT: $W exists"; exit 3; }
trap 'SQL "DROP DATABASE IF EXISTS $W;"; echo "teardown: $W dropped"' EXIT
V=/opt/dr-benchmark/p14/nc_visits.txt
printf '2027/12/31/900007\n2027/12/31/900021\n2027/12/31/900022\n' > $V
SQL "CREATE DATABASE $W CHARACTER SET $(SQL "SELECT default_character_set_name FROM information_schema.schemata WHERE schema_name='sik'") COLLATE $(SQL "SELECT default_collation_name FROM information_schema.schemata WHERE schema_name='sik'")"
# Lookup tables hold legacy zero dates ('0000-00-00'): copy with a relaxed session sql_mode,
# then fail closed unless every copied table has exactly its source's row count (a silent
# partial copy made the first NC run vacuous: empty databarang -> every drug UNMAPPED).
for t in jns_perawatan databarang jenis; do
  SQL "SET SESSION sql_mode=''; CREATE TABLE $W.$t LIKE $FX.$t; INSERT INTO $W.$t SELECT * FROM $FX.$t;" || { echo "ABORT: copy of $t failed"; exit 3; }
  [ "$(SQL "SELECT COUNT(*) FROM $W.$t")" = "$(SQL "SELECT COUNT(*) FROM $FX.$t")" ] || { echo "ABORT: $t row count differs from $FX"; exit 3; }
done
for t in billing detail_nota_jalan p7_write_audit dr_charge_ledger; do
  SQL "SET SESSION sql_mode=''; CREATE TABLE $W.$t LIKE $FX.$t; INSERT INTO $W.$t SELECT * FROM $FX.$t WHERE no_rawat LIKE '2027/12/31/%';" || { echo "ABORT: copy of $t failed"; exit 3; }
  [ "$(SQL "SELECT COUNT(*) FROM $W.$t")" = "$(SQL "SELECT COUNT(*) FROM $FX.$t WHERE no_rawat LIKE '2027/12/31/%'")" ] || { echo "ABORT: $t row count differs from $FX"; exit 3; }
done
echo "scratch copy verified: lookup rows jns_perawatan=$(SQL "SELECT COUNT(*) FROM $W.jns_perawatan") databarang=$(SQL "SELECT COUNT(*) FROM $W.databarang") jenis=$(SQL "SELECT COUNT(*) FROM $W.jenis")"
echo "scratch $W: billing=$(SQL "SELECT COUNT(*) FROM $W.billing") ledger=$(SQL "SELECT COUNT(*) FROM $W.dr_charge_ledger")"
LI="python3 p14_line_identity.py $V --db $W --ledger-db $W"
echo "## unplanted"
$LI --out /tmp/p14_nc_clean.csv | grep -E "^ENC|^P14"; RC0=${PIPESTATUS[0]}
echo "unplanted exit=$RC0 (0 needed)"

# (a) same-price swap target: a unique-named code, same Khanza price as the pA line, not in 900007
PA=$(python3 -c "import json;print(json.load(open('/opt/dr-benchmark/p14/fx_a/p14_edge_manifest.json'))['meta']['pair_price_codes'][0])")
PRICE=$(SQL "SELECT total_byrdr FROM $W.jns_perawatan WHERE kd_jenis_prw='$PA'")
X=$(SQL "SELECT j.kd_jenis_prw FROM $W.jns_perawatan j WHERE j.total_byrdr=$PRICE AND j.kd_jenis_prw NOT IN (SELECT code FROM $W.dr_charge_ledger WHERE no_rawat='2027/12/31/900007') AND (SELECT COUNT(*) FROM $W.jns_perawatan k WHERE k.nm_perawatan=j.nm_perawatan)=1 ORDER BY j.kd_jenis_prw LIMIT 1")
XN=$(SQL "SELECT nm_perawatan FROM $W.jns_perawatan WHERE kd_jenis_prw='$X'")
PAN=$(SQL "SELECT nm_perawatan FROM $W.jns_perawatan WHERE kd_jenis_prw='$PA'")
echo "plant (a): 900007 line $PA ('$PAN', $PRICE) renamed to $X ('$XN', same price)"
RA=$(SQL "UPDATE $W.billing SET nm_perawatan='$XN' WHERE no_rawat='2027/12/31/900007' AND nm_perawatan='$PAN' AND pemisah=':' LIMIT 1; SELECT ROW_COUNT();")
echo "plant (a) ROW_COUNT=$RA"
# (b) drug line of 900022: qty+1, unit = amount/(qty+1)
RB=$(SQL "UPDATE $W.billing SET biaya=totalbiaya/(jumlah+1), jumlah=jumlah+1 WHERE no_rawat='2027/12/31/900022' AND status='Obat' AND pemisah=':' AND nm_perawatan NOT LIKE 'PPN%' ORDER BY noindex LIMIT 1; SELECT ROW_COUNT();")
echo "plant (b) ROW_COUNT=$RB"
# (c) collision rename on 900021
RCC=$(SQL "UPDATE $W.billing SET nm_perawatan='xxx (OBAT ORAL)' WHERE no_rawat='2027/12/31/900021' AND status='Obat' AND pemisah=':' AND nm_perawatan NOT LIKE 'PPN%' ORDER BY noindex LIMIT 1; SELECT ROW_COUNT();")
echo "plant (c) ROW_COUNT=$RCC"
echo "## planted"
$LI --out /tmp/p14_nc_plant.csv | grep -E "^ENC|^P14"; RC1=${PIPESTATUS[0]}
echo "planted exit=$RC1 (1 needed)"
J=/tmp/p14_nc_plant_encounters.json
python3 - "$J" "$PA" "$X" <<'PY'
import json, sys
r = {e["no_rawat"]: e for e in json.load(open(sys.argv[1]))}
pa, x = sys.argv[2], sys.argv[3]
lines = open("/tmp/p14_nc_plant.csv").read()
a = r["2027/12/31/900007"]; b = r["2027/12/31/900022"]; c = r["2027/12/31/900021"]
ok_a = a["verdict"] == "DIFFER" and a["delta"] == {} and ("900007,procedure,%s" % pa) in lines and ("900007,procedure,%s" % x) in lines
ok_b = b["verdict"] == "DIFFER" and b["delta"] == {}
ok_c = c["verdict"] == "AMBIGUOUS"
print("NC(a) same-price swap: verdict=%s component_delta=%s -> %s" % (a["verdict"], a["delta"], "CAUGHT (line level only)" if ok_a else "NOT CAUGHT"))
print("NC(b) qty/unit with same amount: verdict=%s component_delta=%s -> %s" % (b["verdict"], b["delta"], "CAUGHT (line level only)" if ok_b else "NOT CAUGHT"))
print("NC(c) collision rename: verdict=%s -> %s" % (c["verdict"], "CAUGHT" if ok_c else "NOT CAUGHT"))
sys.exit(0 if ok_a and ok_b and ok_c else 1)
PY
RCJ=$?
if [ "$RC0" = "0" ] && [ "$RC1" = "1" ] && [ "$RA" = "1" ] && [ "$RB" = "1" ] && [ "$RCC" = "1" ] && [ "$RCJ" = "0" ]; then
  echo "P14-LINE-NC: DISCRIMINATING (unplanted pass; (a),(b),(c) caught; ROW_COUNT()=1 each)"; exit 0
fi
echo "P14-LINE-NC: NOT-DISCRIMINATING (clean=$RC0 planted=$RC1 rows=$RA/$RB/$RCC judge=$RCJ)"; exit 1
