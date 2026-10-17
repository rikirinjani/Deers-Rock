set -e
cd /opt/dr-benchmark
# point P2 tools at the scratch fixture via a wrapper: override the DB constants.
# Simplest: run the tools with a small env-patched copy that targets *_p2 DBs.
echo "=== verify fixture numbers ==="
mysql -uroot -N -e "SELECT \"p2 billing\", COUNT(*) FROM sik_p2.billing; SELECT \"p2 dr_ledger\", COUNT(*) FROM sik_bench_p2.dr_charge_ledger; SELECT \"p2 dr_tariff\", COUNT(*) FROM sik_bench_p2.dr_tariff;"
echo "=== AC-2 fail-closed: empty the scratch dr_tariff, run builder WITHOUT fallback => expect rc=1 ==="
mysql -uroot sik_bench_p2 -e "DELETE FROM dr_tariff;"
mysql -uroot -N -e "SELECT \"tariff now\", COUNT(*) FROM sik_bench_p2.dr_tariff;"
