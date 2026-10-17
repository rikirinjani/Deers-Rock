set -e
cd /opt/dr-benchmark
echo "=== payment account source (the akunrows the form needs) ==="
for T in akunrekening detail_akunrekening rekening pembayaran; do
  c=$(mysql -uroot -N -e "SELECT COUNT(*) FROM sik.$T;" 2>/dev/null | head -1)
  echo "sik.$T rows=$c"
done
echo "=== which table holds the 'akun' for ralan payment? ==="
mysql -uroot -N -e "SELECT table_name FROM information_schema.tables WHERE table_schema='sik' AND table_name LIKE '%akun%';"
echo "=== r5 payment tables ==="
mysql -uroot -N -e "SELECT table_name FROM information_schema.tables WHERE table_schema='sik_r5' AND table_name LIKE '%akun%';"
echo "=== did R4 successful runs log 'akunrows=1'? ==="
grep -l "akunrows=1" /opt/dr-benchmark/results/r4_b2_1000/B3_oracle_run/harness_*.log 2>/dev/null | head -2
R4LOG=$(grep -l "akunrows=1" /opt/dr-benchmark/results/r4_b2_1000/B3_oracle_run/harness_*.log 2>/dev/null | head -1)
[ -n "$R4LOG" ] && grep -E "akunrows|sukses|payment" "$R4LOG" | head -5
