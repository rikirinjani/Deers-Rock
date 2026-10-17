#!/bin/bash
export MYSQL_PWD=$(cat /opt/simrs-khanza/run-env/benchmark_pw)
M="mysql -ubenchmark -N -B"
echo "=== reg-only DR visits (no resep, no proc) ==="
$M sik -e "SELECT COUNT(*) FROM reg_periksa r WHERE r.no_rawat LIKE '2026/10/%' AND r.no_rkm_medis LIKE 'DR%' AND NOT EXISTS (SELECT 1 FROM resep_obat ro WHERE ro.no_rawat=r.no_rawat) AND NOT EXISTS (SELECT 1 FROM rawat_jl_dr j WHERE j.no_rawat=r.no_rawat)"
echo "=== fresh export (read-only vs sik) ==="
bash /opt/simrs-khanza/consumer/dr_export.sh 2>&1 | head -3
grep -c '^ENC ' /tmp/dr_encounters.txt
echo "=== diagnosa_pasien rows for DR cohort ==="
$M sik -e "SELECT COUNT(*) FROM diagnosa_pasien WHERE no_rawat LIKE '2026/10/%'"
echo "=== penyakit size ==="
$M sik -e "SELECT COUNT(*) FROM penyakit"
$M sik -e "SELECT COUNT(*) FROM sik_bench.penyakit"
echo "=== jrxml parameters for the 4 reports ==="
for r in rptKunjunganRalan rptRekapPendapatanRalan rptRekapObatPoli rptFrekuensiPenyakitRalan; do
  f=/opt/simrs-khanza/run-env/report/$r.jrxml
  echo "--- $r ---"
  if [ -f "$f" ]; then
    grep -oE '<parameter name="[^"]+"[^>]*class="[^"]+"' "$f" | head -12
    grep -oE '<queryString><!\[CDATA\[[^]]{0,400}' "$f" | head -1
  else
    echo "(no jrxml)"
  fi
done
echo "PROBE5_DONE"
