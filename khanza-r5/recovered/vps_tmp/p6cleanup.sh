set -u
pgrep -af "[s]ampled_real|[b]uild_dr|[B]ilingHarness|[p]6_acceptance" && { echo "ABORT: runs active"; exit 1; }
echo "pre: $(mysql -uroot -N -e "SELECT COUNT(*), CAST(SUM(amount) AS DECIMAL(20,0)) FROM sik_bench.dr_charge_ledger")"
mysql -uroot -N -e "SELECT * FROM sik_bench.dr_charge_ledger WHERE no_rawat='STALE-TEST-KEY'"
mysql -uroot -e "DELETE FROM sik_bench.dr_charge_ledger WHERE no_rawat='STALE-TEST-KEY' AND component='drug' AND code='ZZFAKE' AND source='stale' AND amount=1; SELECT ROW_COUNT() deleted;"
echo "post: $(mysql -uroot -N -e "SELECT COUNT(*), CAST(SUM(amount) AS DECIMAL(20,0)) FROM sik_bench.dr_charge_ledger")"
mysql -uroot -e "REVOKE SELECT, INSERT, UPDATE, DELETE ON \`sik_p6f\`.* FROM \`benchmark\`@\`localhost\`;"
mysql -uroot -e "DROP DATABASE sik_p6; DROP DATABASE sik_p6f;"
echo "databases: $(mysql -uroot -N -e 'SHOW DATABASES' | grep '^sik' | tr '\n' ' ')"
mysql -uroot -N -e "SHOW GRANTS FOR benchmark@localhost"
python3 /opt/Deers-Rock/tools/p6_dbxml.py probe
