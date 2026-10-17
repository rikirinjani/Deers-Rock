#!/usr/bin/env bash
# dxrecon.sh — READ-ONLY recon for the ICD-10 pipeline: consumer parser, schema, master.
set -uo pipefail
echo "=== 0. safety ==="
systemctl is-active dr-bench 2>/dev/null || echo "dr-bench inactive"
systemctl is-active p-chain 2>/dev/null || echo "p-chain inactive"
pgrep -af "run_all|KhanzaBillingConsumer|pchain" || echo "no stray procs"

echo
echo "=== 1. generator on-box == local context copy? ==="
sha256sum /opt/Deers-Rock/tools/generate_scale_encounters.py
ls -la /opt/Deers-Rock/tools/generate_scale_encounters.py*

echo
echo "=== 2. consumer: find + parser ==="
CJ=$(find /opt/simrs-khanza -maxdepth 3 -name "KhanzaBillingConsumer.java" 2>/dev/null | head -1)
echo "java source: $CJ"
grep -n "diagnosa\|penyakit\|icd\|Icd\|ICD" "$CJ" || echo "(no diagnosis mentions in consumer)"
echo "--- line parsing (ENC/OBAT/END + unknown-line handling):"
grep -n "startsWith\|split\|ENC\|OBAT\|END\|else" "$CJ" | head -40

echo
echo "=== 3. diagnosa_pasien schema ==="
mysql -uroot sik -B -e "SHOW COLUMNS FROM diagnosa_pasien;"
echo "--- existing rows (usage weights, real outpatient prevalence proxy):"
mysql -uroot sik -B -e "SELECT kd_penyakit, COUNT(*) c FROM diagnosa_pasien GROUP BY kd_penyakit ORDER BY c DESC LIMIT 12;"
mysql -uroot sik -N -B -e "SELECT COUNT(DISTINCT kd_penyakit), COUNT(*) FROM diagnosa_pasien;"

echo
echo "=== 4. penyakit master ==="
mysql -uroot sik -B -e "SHOW COLUMNS FROM penyakit;" | head -12
mysql -uroot sik -N -B -e "SELECT COUNT(*) FROM penyakit;"
mysql -uroot sik -B -e "SELECT kd_penyakit, nm_penyakit FROM penyakit LIMIT 5;"

echo
echo "=== 5. generator: export writer + template pools + rng (line refs) ==="
grep -n "def write_encounters\|def generate\|ENC \|OBAT \|END \|TEMPLATE\|POOLS\|day_rng\|md5\|def load_to_db" /opt/Deers-Rock/tools/generate_scale_encounters.py | head -40
echo
echo "=== 6. encounters file shape (B1 canonical head) ==="
head -6 /opt/dr-benchmark/results/Bseries_20261012T045027Z/B1.encounters.txt
