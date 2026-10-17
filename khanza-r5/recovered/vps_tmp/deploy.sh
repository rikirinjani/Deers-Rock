#!/bin/bash
set -e
echo "=== consumer file identity + line endings ==="
sha256sum /opt/simrs-khanza/consumer/KhanzaBillingConsumer.java /opt/khanza-benchmark-asset/KhanzaBillingConsumer.java
cr=$(grep -c $'\r' /opt/simrs-khanza/consumer/KhanzaBillingConsumer.java || true)
echo "CRLF lines in consumer .java: $cr"
echo "=== deploy tools ==="
chmod +x /opt/Deers-Rock/tools/*.py
python3 -m py_compile /opt/Deers-Rock/tools/dbutil.py /opt/Deers-Rock/tools/fix_doc2_canonical_jml.py /opt/Deers-Rock/tools/fix_seed_leakage.py /opt/Deers-Rock/tools/emit_procedure_only_encounters.py /opt/Deers-Rock/tools/map_dr_doctors.py /opt/Deers-Rock/tools/verify_resend_idempotent.py /opt/Deers-Rock/tools/dr_perf_profile_30d.py /opt/Deers-Rock/tools/write_explicit_sim_dates.py && echo "py_compile OK"
echo "=== deploy run_all.sh ==="
cp /opt/dr-benchmark/run_all.sh "/opt/dr-benchmark/run_all.sh.bak-$(date -u +%Y%m%dT%H%M%SZ)"
mv /opt/dr-benchmark/run_all.sh.new /opt/dr-benchmark/run_all.sh
chmod +x /opt/dr-benchmark/run_all.sh
bash -n /opt/dr-benchmark/run_all.sh && echo "run_all.sh syntax OK"
grep -n "export RUN_ID" /opt/dr-benchmark/run_all.sh
grep -n "sql_sik_bench_zero_seed_check()" /opt/dr-benchmark/run_all.sh
echo "=== install JDK (javac) for consumer recompile ==="
DEBIAN_FRONTEND=noninteractive apt-get install -y -q openjdk-17-jdk-headless 2>&1 | tail -3
which javac && javac -version
echo "=== pre-verify zero-seed check function works ==="
export MYSQL_PWD="$(cat /opt/simrs-khanza/run-env/benchmark_pw)"
mysql -ubenchmark -N -B sik_bench <<'SQL'
SELECT (SELECT COUNT(*) FROM reg_periksa WHERE no_rkm_medis NOT LIKE 'DR%')
     + (SELECT COUNT(*) FROM billing   WHERE no_rawat IN (SELECT no_rawat FROM reg_periksa WHERE no_rkm_medis NOT LIKE 'DR%'))
     AS seed_rows_in_bench;
SQL
