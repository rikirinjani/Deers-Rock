#!/bin/bash
# r4_lockprobe: find what holds the lock on dr_charge_ledger, clear it, retry cleanup
echo "== processlist (non-sleep) =="
mysql -uroot -N -B -e "SELECT id, user, time, state, LEFT(CAST(info AS CHAR),80) FROM information_schema.processlist WHERE command<>'Sleep'"
echo "== innodb_trx =="
mysql -uroot -N -B -e "SELECT trx_id, trx_state, trx_started, trx_mysql_thread_id, trx_rows_modified FROM information_schema.innodb_trx"
echo "== kill stale queries on dr_charge_ledger =="
for pid in $(mysql -uroot -N -B -e "SELECT p.id FROM information_schema.processlist p WHERE p.info LIKE '%dr_charge_ledger%' AND p.command<>'Sleep' AND p.id<>CONNECTION_ID()"); do
  echo "killing $pid"; mysql -uroot -e "KILL $pid"
done
sleep 5
echo "== retry single-row DELETE =="
mysql -uroot -N -B sik_bench -e "DELETE FROM dr_charge_ledger WHERE no_rawat='2026/10/05/000001' AND component='procedure' AND code='RJ00861'" && echo DELETE_OK
echo "== post state =="
mysql -uroot -N -B sik_bench -e "SELECT CONCAT(COUNT(*),'|',ROUND(SUM(amount),2)+0) FROM dr_charge_ledger"
echo LOCKPROBE_DONE
