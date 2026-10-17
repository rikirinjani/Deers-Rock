#!/bin/bash
# r4_dumpfmt: inspect D1 dump headers (format only, no secrets)
SNAP=/opt/dr-benchmark/snapshots/d1_20261013T072755Z
echo "== sik_billing.sql head =="
head -30 "$SNAP/sik_billing.sql"
echo "== billing CREATE present? =="
grep -c "CREATE TABLE" "$SNAP/sik_billing.sql"
grep -m2 "DROP TABLE\|CREATE TABLE\|USE " "$SNAP/sik_billing.sql"
echo "== sik_bench_full.sql head (first CREATE/USE/DROP lines) =="
grep -m6 "DROP TABLE\|CREATE TABLE\|USE " "$SNAP/sik_bench_full.sql"
echo "== tables in sik_bench_full =="
grep -o "CREATE TABLE \`[a-z_0-9]*\`" "$SNAP/sik_bench_full.sql" | head -10
echo "== sik_full.sql first USE/DROP =="
grep -m3 "USE \|DROP TABLE" "$SNAP/sik_full.sql"
echo DUMPFMT_DONE
