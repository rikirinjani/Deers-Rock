set -e
cd /opt/dr-benchmark
echo "=== a sample harness log (why sukses=true=0) ==="
ls results/r5_p1_demo/B3_oracle_run_r5/harness_2027*.log | head -1
HL=$(ls results/r5_p1_demo/B3_oracle_run_r5/harness_2027*.log | head -1)
echo "--- $HL ---"
head -40 "$HL"
echo "=== sik_r5 admin row? ==="
mysql -uroot -N -e "SELECT COUNT(*) FROM sik_r5.admin WHERE user_name='spv';" 2>&1
echo "=== sik_r5 setting tables? (form reads set_nota from DB) ==="
mysql -uroot -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='sik_r5' AND table_name LIKE 'set%';" 2>&1
echo "=== sik_r5 poliklinik / billing config ==="
mysql -uroot -N -e "SELECT COUNT(*) FROM sik_r5.poliklinik;" 2>&1
