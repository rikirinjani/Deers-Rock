#!/bin/bash
# r4_delprobe: what is the slow DELETE doing?
mysql -uroot -N -B -e "SELECT id, time, state, LEFT(CAST(info AS CHAR),90) FROM information_schema.processlist WHERE command<>'Sleep' AND info IS NOT NULL"
echo ---COUNT---
mysql -uroot -N -B sik_bench -e "SELECT COUNT(*) FROM dr_charge_ledger"
echo ---INNODB---
mysql -uroot -N -B -e "SELECT * FROM sys.innodb_lock_waits" 2>/dev/null | head -5 || echo no-lockwaits-view
echo DONE
