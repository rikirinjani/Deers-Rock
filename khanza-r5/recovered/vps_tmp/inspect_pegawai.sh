#!/bin/bash
export MYSQL_PWD="$(cat /opt/simrs-khanza/run-env/benchmark_pw)"
my() { mysql -ubenchmark -N -B "$@"; }
echo "=== pegawai rows for existing dokter codes ==="
my sik -e "SELECT nik, nama, jk, jbtn FROM pegawai WHERE nik IN ('-','D0000002','D0000003','D0000004','D0000005');"
echo "=== pegawai FKs ==="
my -e "SELECT COLUMN_NAME, REFERENCED_TABLE_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA='sik' AND TABLE_NAME='pegawai' AND REFERENCED_TABLE_NAME IS NOT NULL;"
echo "=== pegawai NOT NULL columns ==="
my sik -e "SHOW COLUMNS FROM pegawai" | awk '$3=="NO" && $5=="NULL" {printf "%s ", $1} END {print ""}'
echo "=== spesialis distinct kd_sps sample ==="
my sik -e "SELECT kd_sps FROM spesialis LIMIT 8;"
