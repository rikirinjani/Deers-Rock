#!/bin/bash
# G2 recon: check schemas, charge ledger, Jasper, consumer DB target, row counts
set +e
echo "=== dr_charge_ledger columns (sik_bench) ==="
mysql -uroot sik_bench -N -B -e "SHOW COLUMNS FROM sik_bench.dr_charge_ledger" 2>/dev/null
echo "=== dr_charge_ledger row count + sample ==="
mysql -uroot sik_bench -N -B -e "SELECT COUNT(*) FROM sik_bench.dr_charge_ledger" 2>/dev/null
mysql -uroot sik_bench -B -e "SELECT * FROM sik_bench.dr_charge_ledger LIMIT 4" 2>/dev/null
echo
echo "=== consumer DB target (database.ini) ==="
grep -iE 'user|database|host|port' /opt/simrs-khanza/setting/database.ini 2>/dev/null | head
echo
echo "=== where is billing written? ==="
echo -n "sik.billing: "
mysql -uroot sik -N -B -e "SELECT COUNT(*) FROM sik.billing" 2>/dev/null
echo -n "sik_bench.billing: "
mysql -uroot sik_bench -N -B -e "SELECT COUNT(*) FROM sik_bench.billing" 2>/dev/null
echo
echo "=== Jasper available? ==="
ls /opt/jasper* /opt/simrs-khanza/jasper* 2>/dev/null | head
find /opt -name '*.jrxml' 2>/dev/null | head -3
which java
echo
echo "=== sik vs sik_bench source row counts ==="
for t in reg_periksa pasien dokter poliklinik jns_perawatan databarang resep_obat resep_dokter detail_pemberian_obat rawat_jl_dr; do
  a=$(mysql -uroot sik -N -B -e "SELECT COUNT(*) FROM $t" 2>/dev/null)
  b=$(mysql -uroot sik_bench -N -B -e "SELECT COUNT(*) FROM $t" 2>/dev/null)
  echo "$t: sik=$a sik_bench=$b"
done
echo
echo "=== 354 DR visits count ==="
mysql -uroot sik -N -B -e "SELECT COUNT(*) FROM reg_periksa WHERE no_rawat LIKE '2026/10/%' AND no_rkm_medis LIKE 'DR%'" 2>/dev/null
echo
echo "=== build_dr_charge_ledger.py — what table/schema does it write? ==="
grep -nE 'INSERT INTO|CREATE TABLE|REPLACE INTO|db=|DB=|sik_bench|dr_charge_ledger' /opt/Deers-Rock/tools/build_dr_charge_ledger.py 2>/dev/null | head -20
