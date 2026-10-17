#!/bin/bash
# R4 recon5: which builder wrote the current ledger? baseline gates? code inventory?
export RUN_ID=r4_recon
echo "=== DISTINCT ledger source labels (tells which builder) ==="
mysql -uroot sik_bench -e "SELECT source, COUNT(*) c FROM dr_charge_ledger GROUP BY source ORDER BY c DESC;" 2>&1
echo "=== ledger builder grep ==="
grep -l "dr_charge_ledger" /opt/Deers-Rock/tools/*.py 2>/dev/null
echo "=== mtimes ==="
ls -la --time-style=long-iso /opt/Deers-Rock/tools/build_dr_charge_ledger.py /opt/Deers-Rock/tools/load_354_dr_visits.py /opt/Deers-Rock/tools/stage_a_g2.py 2>/dev/null
echo "=== dr_tariff mtime ==="
ls -la --time-style=long-iso /opt/dr-benchmark/p-chain/ | grep -i tariff
echo "=== code inventory (Oct DR) ==="
mysql -uroot sik -N -B -e "
SELECT 'distinct_drugs_oct', COUNT(DISTINCT d.kode_brng) FROM detail_pemberian_obat d JOIN reg_periksa r ON r.no_rawat=d.no_rawat WHERE r.no_rawat LIKE '2026/10/%' AND r.no_rkm_medis LIKE 'DR%';
SELECT 'distinct_procs_oct', COUNT(DISTINCT rw.kd_jenis_prw) FROM rawat_jl_dr rw JOIN reg_periksa r ON r.no_rawat=rw.no_rawat WHERE r.no_rawat LIKE '2026/10/%' AND r.no_rkm_medis LIKE 'DR%' AND rw.kd_jenis_prw IS NOT NULL AND rw.kd_jenis_prw<>'';
SELECT 'distinct_drugs_all_dr', COUNT(DISTINCT d.kode_brng) FROM detail_pemberian_obat d JOIN reg_periksa r ON r.no_rawat=d.no_rawat WHERE r.no_rkm_medis LIKE 'DR%';
SELECT 'distinct_procs_all_dr', COUNT(DISTINCT rw.kd_jenis_prw) FROM rawat_jl_dr rw JOIN reg_periksa r ON r.no_rawat=rw.no_rawat WHERE r.no_rkm_medis LIKE 'DR%' AND rw.kd_jenis_prw IS NOT NULL AND rw.kd_jenis_prw<>'';" 2>&1
echo "=== jns_perawatan real cols ==="
mysql -uroot sik -N -B -e "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='sik' AND TABLE_NAME='jns_perawatan';" 2>&1 | tr '\n' ' '
echo
echo "=== candidate fault-#8 drug: top Oct DR drug by amount + its ralan ==="
mysql -uroot sik -e "
SELECT d.kode_brng, db.nama_brng, db.ralan, COUNT(*) rows_oct, SUM(d.jml) qty
FROM detail_pemberian_obat d JOIN reg_periksa r ON r.no_rawat=d.no_rawat JOIN databarang db ON db.kode_brng=d.kode_brng
WHERE r.no_rawat LIKE '2026/10/%' AND r.no_rkm_medis LIKE 'DR%'
GROUP BY d.kode_brng, db.nama_brng, db.ralan ORDER BY rows_oct DESC LIMIT 5;" 2>&1
echo "=== template reg row for injection (full cols) ==="
mysql -uroot sik -e "SELECT * FROM reg_periksa WHERE no_rkm_medis LIKE 'DR%' AND no_rawat='2026/10/01/000254'\G" 2>&1
echo "=== collision checks ==="
mysql -uroot sik -N -B -e "
SELECT 'reg_900001', COUNT(*) FROM reg_periksa WHERE no_rawat='2026/10/11/900001';
SELECT 'reg_900002', COUNT(*) FROM reg_periksa WHERE no_rawat='2026/10/11/900002';
SELECT 'pasien_DR000020', no_rkm_medis FROM pasien WHERE no_rkm_medis='DR000020';
SELECT 'oct_dr_regs', COUNT(*) FROM reg_periksa WHERE no_rawat LIKE '2026/10/%' AND no_rkm_medis LIKE 'DR%';" 2>&1
echo "=== baseline gates (RUN_ID=r4_baseline) ==="
RUN_ID=r4_baseline python3 /opt/Deers-Rock/tools/three_count_reconcile.py --stage A 2>&1 | tail -6
RUN_ID=r4_baseline python3 /opt/Deers-Rock/tools/charge_delta_per_component.py --stage A 2>&1 | tail -6
echo "=== check_billed_eq_dr baseline (verbatim run_all.sh fn) ==="
out="$(mysql -uroot sik -N -B -e "
    SELECT SUBSTRING_INDEX(r.no_rawat,'/',2) ym,
           COUNT(DISTINCT r.no_rawat)-COUNT(DISTINCT b.no_rawat)
    FROM reg_periksa r LEFT JOIN billing b ON b.no_rawat=r.no_rawat
    WHERE r.no_rkm_medis LIKE 'DR%' GROUP BY ym" 2>/dev/null)"
echo "$out"
echo "$out" | grep -qE "	[1-9]" && echo "BASELINE-GATE: FAIL (unbilled present)" || echo "BASELINE-GATE: PASS (rc=0)"
echo "=== billing + ledger sizes for dump planning ==="
mysql -uroot -N -B -e "SELECT 'billing_rows', COUNT(*) FROM sik.billing; SELECT 'ledger_rows', COUNT(*) FROM sik_bench.dr_charge_ledger; SELECT 'reg_rows', COUNT(*) FROM sik.reg_periksa;" 2>&1
