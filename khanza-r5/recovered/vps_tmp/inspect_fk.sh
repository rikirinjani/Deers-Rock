#!/bin/bash
export MYSQL_PWD="$(cat /opt/simrs-khanza/run-env/benchmark_pw)"
my() { mysql -ubenchmark -N -B "$@"; }
echo "=== dokter FKs ==="
my -e "SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA='sik' AND TABLE_NAME='dokter' AND REFERENCED_TABLE_NAME IS NOT NULL;"
echo "=== dokter counts (how many inserts landed before the FK error) ==="
my sik -e "SELECT COUNT(*) FROM dokter;"
my sik_bench -e "SELECT COUNT(*) FROM dokter;"
echo "=== reg_periksa FK on kd_dokter ==="
my -e "SELECT COLUMN_NAME, REFERENCED_TABLE_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA='sik' AND TABLE_NAME='reg_periksa' AND REFERENCED_TABLE_NAME IS NOT NULL;"
