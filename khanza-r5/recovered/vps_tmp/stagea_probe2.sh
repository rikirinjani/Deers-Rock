#!/bin/bash
export MYSQL_PWD=$(cat /opt/simrs-khanza/run-env/benchmark_pw)
M="mysql -ubenchmark -N -B"
echo "=== sik_bench tables ==="
$M -e "SHOW TABLES FROM sik_bench" | head -60
echo "=== count of tables: sik_bench vs sik ==="
$M -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='sik_bench'"
$M -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='sik'"
echo "=== harness-needed tables present in sik_bench? ==="
for t in billing nota_jalan detail_nota_jalan piutang_pasien detail_piutang_pasien tambahan_biaya pengurangan_biaya tagihan_sadewa tagihan_mandiri jurnal detailjurnal akun_bayar set_nota admin jenis kelurahan kecamatan kabupaten pasien dokter rawat_jl_dr resep_obat resep_dokter detail_pemberian_obat databarang jns_perawatan poliklinik reg_periksa dr_charge_ledger; do
  n=$($M -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='sik_bench' AND table_name='$t'")
  echo "$t present=$n"
done
echo "=== javap EnkripsiAES ==="
cd /opt/simrs-khanza && javap -cp KhanzaSecurity16bit/dist/KhanzaSecurity16bit.jar AESsecurity.EnkripsiAES 2>&1 | head -10
echo "=== PatchDbXml precedent ==="
grep -rl "PatchDbXml" /opt --include="*.java" --include="*.py" --include="*.sh" 2>/dev/null | head -5
echo "=== G2 stop console tail ==="
tail -20 /opt/dr-benchmark/run_console.log
echo "=== latest run stageA log ==="
ls /opt/dr-benchmark/results/20261011T173055Z/ 2>/dev/null
tail -5 /opt/dr-benchmark/results/20261011T173055Z/stageA.log 2>/dev/null
echo "=== report candidates ==="
ls /opt/simrs-khanza/run-env/report/ | grep -iE 'kunjunganpoli|pendapatan|pemakaianobat|diagnosapasien|penyakit' | grep -v jrxml | head -12
echo "PROBE_DONE"
