cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1
# confirm the 2 drift-demo visits are form-settled (sukses path) in canonical state
for n in 2026/10/01/000254 2026/10/01/000289; do
  echo "=== $n ==="
  mysql -uroot -N -e "SELECT COUNT(*) FROM sik.detail_nota_jalan WHERE no_rawat='"'"'$n'"'"';"
  mysql -uroot -N -e "SELECT status_bayar FROM sik.reg_periksa WHERE no_rawat='"'"'$n'"'"';"
done
echo ""
echo "=== canonical ledger (unchanged?) ==="
mysql -uroot -N -e "SELECT COUNT(*), COALESCE(SUM(amount),0) FROM sik_bench.dr_charge_ledger;"
