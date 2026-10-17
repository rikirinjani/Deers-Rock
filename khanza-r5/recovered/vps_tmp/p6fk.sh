pgrep -af "[s]ampled_real|[p]6_smoke|[X]vfb" | cut -c1-120
echo "akun_bayar sik=$(mysql -uroot -N -e 'SELECT COUNT(*) FROM sik.akun_bayar') sik_p6=$(mysql -uroot -N -e 'SELECT COUNT(*) FROM sik_p6.akun_bayar')"
echo "--- stage dnj rows nama_bayar:"; mysql -uroot -N -e "SELECT DISTINCT s.nama_bayar, (SELECT COUNT(*) FROM sik_p6.akun_bayar a WHERE a.nama_bayar=s.nama_bayar) in_p6, (SELECT COUNT(*) FROM sik.akun_bayar a WHERE a.nama_bayar=s.nama_bayar) in_sik FROM sik_p6.r5_stage_B3_smoke_041421_detail_nota_jalan s"
echo "--- orphan dnj in sik_p6 overall:"; mysql -uroot -N -e "SELECT COUNT(*) FROM sik_p6.detail_nota_jalan d LEFT JOIN sik_p6.akun_bayar a ON a.nama_bayar=d.nama_bayar WHERE a.nama_bayar IS NULL"
echo "--- live sik orphan dnj:"; mysql -uroot -N -e "SELECT COUNT(*) FROM sik.detail_nota_jalan d LEFT JOIN sik.akun_bayar a ON a.nama_bayar=d.nama_bayar WHERE a.nama_bayar IS NULL"
echo "--- current state of the 2 visits (sik_p6 vs stage):"
for t in billing nota_jalan detail_nota_jalan; do echo "$t live=$(mysql -uroot -N -e "SELECT COUNT(*) FROM sik_p6.$t WHERE no_rawat IN ('2026/10/01/000254','2026/10/01/000289')") stage=$(mysql -uroot -N -e "SELECT COUNT(*) FROM sik_p6.r5_stage_B3_smoke_041421_$t")"; done
cat /opt/dr-benchmark/results/smoke_041421/B3_oracle_run_r5/.state.json
grep -n "harness:\|^=== \|sukses\|Exception\|ERROR" /opt/dr-benchmark/results/smoke_041421/B3_oracle_run_r5/harness_2026_10_01.log | head -20
