set -euo pipefail
NEW=sik_p6f
B=/opt/dr-benchmark/p-chain/sik_p6f_build_$(date -u +%Y%m%dT%H%M%SZ)
mkdir -p $B
if [ -n "$(mysql -uroot -N -e "SHOW DATABASES LIKE '$NEW'")" ]; then echo "$NEW already exists - refusing"; exit 1; fi
mysql -uroot -N -e "SELECT a.table_name, a.table_rows FROM information_schema.tables a JOIN information_schema.tables b ON b.table_schema='sik_p6' AND b.table_name=a.table_name WHERE a.table_schema='sik' AND a.table_type='BASE TABLE' AND a.table_rows>0 AND b.table_rows=0 ORDER BY a.table_name" > $B/old_sik_p6_empty_tables.tsv
echo "old sik_p6 tables empty but populated in sik: $(wc -l < $B/old_sik_p6_empty_tables.tsv)"
mysqldump -uroot --no-create-info --skip-triggers sik_p6 reg_periksa --where="no_rawat LIKE 'STRATA-%'" > $B/strata_reg_rows.sql
CS=$(mysql -uroot -N -e "SELECT default_character_set_name FROM information_schema.schemata WHERE schema_name='sik'")
CO=$(mysql -uroot -N -e "SELECT default_collation_name FROM information_schema.schemata WHERE schema_name='sik'")
mysql -uroot -e "CREATE DATABASE $NEW CHARACTER SET $CS COLLATE $CO;"
T0=$(date +%s)
mysqldump -uroot --single-transaction --quick --skip-lock-tables sik | mysql -uroot $NEW
echo "clone wall=$(( $(date +%s) - T0 ))s"
mysql -uroot $NEW < $B/strata_reg_rows.sql
echo "reg_periksa sik=$(mysql -uroot -N -e 'SELECT COUNT(*) FROM sik.reg_periksa') $NEW=$(mysql -uroot -N -e "SELECT COUNT(*) FROM $NEW.reg_periksa") strata=$(mysql -uroot -N -e "SELECT COUNT(*) FROM $NEW.reg_periksa WHERE no_rawat LIKE 'STRATA-%'")"
echo "akun_bayar=$(mysql -uroot -N -e "SELECT COUNT(*) FROM $NEW.akun_bayar") billing sik=$(mysql -uroot -N -e 'SELECT COUNT(*) FROM sik.billing') $NEW=$(mysql -uroot -N -e "SELECT COUNT(*) FROM $NEW.billing")"
echo "grants on sik for harness/benchmark users:"; mysql -uroot -N -e "SELECT CONCAT(user,'@',host) FROM mysql.db WHERE db IN ('sik','sik_p6')"
echo "evidence dir: $B"
