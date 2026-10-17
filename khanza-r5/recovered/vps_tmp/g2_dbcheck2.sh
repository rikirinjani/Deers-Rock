#!/bin/bash
# G2: verify consumer DB target + ledger state + dr_export source
set +e
echo "=== consumer DB target (database.ini) ==="
grep -iE 'user|database|host|port' /opt/simrs-khanza/setting/database.ini 2>/dev/null | head
echo
echo "=== dr_charge_ledger (sik_bench) row count + per-component ==="
echo -n "rows: "
mysql -uroot sik_bench -N -B -e "SELECT COUNT(*) FROM dr_charge_ledger" 2>/dev/null
mysql -uroot sik_bench -B -e "SELECT component, COUNT(*) c, SUM(amount) s FROM dr_charge_ledger GROUP BY component" 2>/dev/null
echo
echo "=== is the ledger built? check the build tool + last build log ==="
ls -la /opt/Deers-Rock/tools/build_dr_charge_ledger.py 2>/dev/null
echo
echo "=== build tool: which schema does it write to? ==="
grep -nE 'dbutil|DB|sik_bench|sik' /opt/Deers-Rock/tools/build_dr_charge_ledger.py 2>/dev/null | head -12
echo
echo "=== sik_bench source row counts (for the load step) ==="
for t in reg_periksa resep_obat resep_dokter detail_pemberian_obat rawat_jl_dr; do
  a=$(mysql -uroot sik -N -B -e "SELECT COUNT(*) FROM $t" 2>/dev/null)
  b=$(mysql -uroot sik_bench -N -B -e "SELECT COUNT(*) FROM $t" 2>/dev/null)
  echo "$t: sik=$a sik_bench=$b"
done
echo
echo "=== 354 DR visits in sik ==="
mysql -uroot sik -N -B -e "SELECT COUNT(*) FROM reg_periksa WHERE no_rawat LIKE '2026/10/%' AND no_rkm_medis LIKE 'DR%'" 2>/dev/null
