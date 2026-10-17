#!/bin/bash
# Create required tables in sik_bench + grant ALL to benchmark user (for Phase 2 tools)
set -e
mysql -uroot sik_bench <<'SQL'
CREATE TABLE IF NOT EXISTS diagnosa_pasien LIKE sik.diagnosa_pasien;
CREATE TABLE IF NOT EXISTS penyakit LIKE sik.penyakit;
CREATE TABLE IF NOT EXISTS dr_charge_ledger (
  no_rawat VARCHAR(17),
  component ENUM('registration','procedure','drug','tax'),
  code VARCHAR(20),
  quantity DOUBLE,
  unit_price DOUBLE,
  amount DOUBLE,
  source VARCHAR(40),
  PRIMARY KEY (no_rawat, component, code)
);
SQL
echo "tables created"
mysql -uroot -e "GRANT ALL ON sik_bench.* TO 'benchmark'@'localhost'; FLUSH PRIVILEGES;"
echo "benchmark user granted ALL on sik_bench"
echo "=== verify ==="
mysql -uroot sik_bench -N -e "SHOW TABLES" | head -20
