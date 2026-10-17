#!/bin/bash
# Run on new VPS: recreate sik_bench (zero-seed) + grant benchmark user
set -e
echo '=== Recreating sik_bench ==='
mysql -uroot << 'SQL'
DROP DATABASE IF EXISTS sik_bench;
CREATE DATABASE sik_bench CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
SQL
mysql -uroot sik_bench << 'SQL'
CREATE TABLE poliklinik LIKE sik.poliklinik;
CREATE TABLE dokter LIKE sik.dokter;
CREATE TABLE databarang LIKE sik.databarang;
CREATE TABLE jns_perawatan LIKE sik.jns_perawatan;
CREATE TABLE jenis LIKE sik.jenis;
CREATE TABLE pasien LIKE sik.pasien;
CREATE TABLE reg_periksa LIKE sik.reg_periksa;
CREATE TABLE resep_obat LIKE sik.resep_obat;
CREATE TABLE resep_dokter LIKE sik.resep_dokter;
CREATE TABLE detail_pemberian_obat LIKE sik.detail_pemberian_obat;
CREATE TABLE rawat_jl_dr LIKE sik.rawat_jl_dr;
CREATE TABLE billing LIKE sik.billing;
CREATE TABLE nota_jalan LIKE sik.nota_jalan;
INSERT INTO poliklinik SELECT * FROM sik.poliklinik;
INSERT INTO dokter SELECT * FROM sik.dokter;
INSERT INTO databarang SELECT * FROM sik.databarang;
INSERT INTO jns_perawatan SELECT * FROM sik.jns_perawatan;
INSERT INTO jenis SELECT * FROM sik.jenis;
INSERT INTO pasien SELECT * FROM sik.pasien;
SQL
echo '=== sik_bench zero-seed check (must be 0) ==='
mysql -uroot sik_bench -N -e 'SELECT (SELECT COUNT(*) FROM reg_periksa)+(SELECT COUNT(*) FROM billing)+(SELECT COUNT(*) FROM nota_jalan) AS seed_rows'
echo '=== Grant benchmark user access to sik_bench ==='
mysql -uroot -e "GRANT SELECT,INSERT,UPDATE,DELETE ON sik_bench.* TO 'benchmark'@'localhost'; FLUSH PRIVILEGES;"
echo '=== benchmark user can read sik_bench ==='
BENCH_PW=$(cat /opt/simrs-khanza/run-env/benchmark_pw)
mysql -ubenchmark -p"$BENCH_PW" sik_bench -N -e 'SELECT COUNT(*) FROM poliklinik' 2>/dev/null && echo 'benchmark user OK on sik_bench' || echo 'WARN: benchmark access issue'
echo '=== ALL DONE ==='
