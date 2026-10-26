#!/bin/bash
# P17 C3 T0 discovery gate (task doc s2 C). Is the code the FORM used observable without editing Khanza and
# without a persistent change to the live MySQL server?
#   (i)   performance_schema statement history can be switched on at runtime (non-persistent consumer toggle,
#         restored on exit; original and final states are printed);
#   (ii)  the harness's statements carry literal kd_jenis_prw / kode_brng values;
#   (iii) statements can be attributed to an encounter;
#   (iv)  the instrumentation does not change any billed value (the fixture comparator is unchanged).
# It runs the fixture-only P14 driver once with a poller that copies the clone's statements out of
# events_statements_history_long into a file, then analyses the file. Everything is on the throwaway clone
# sik_p14e; the only server-level change is the consumer toggle.
# Usage: DR_LOCK_SESSION=<id> bash p17_c3_t0.sh <fixture-dir>
set -u
cd /opt/Deers-Rock/tools
FXDIR=${1:?fixture dir}
. ./dr_runlock.sh; dr_runlock_require p17_c3_t0.sh
export DBUTIL_FORCE_ROOT=1
D=/opt/dr-benchmark/p17/c3; mkdir -p $D; : > $D/capture.tsv; rm -f $D/stop
SQL() { mysql -uroot -N -B -e "$1"; }
[ -n "$(SQL "SHOW DATABASES LIKE 'sik_p14e'")" ] && { echo "ABORT: sik_p14e exists - refusing, nothing touched"; exit 3; }
echo "## (i) performance_schema"
echo "performance_schema=$(SQL 'SELECT @@performance_schema')  history_long_size=$(SQL 'SELECT @@performance_schema_events_statements_history_long_size')  max_sql_text_length=$(SQL 'SELECT @@performance_schema_max_sql_text_length')"
SQL "SELECT name, enabled FROM performance_schema.setup_consumers WHERE name IN ('global_instrumentation','statements_digest','events_statements_current','events_statements_history','events_statements_history_long')" | tee $D/consumers_before.txt
ORIG_LONG=$(SQL "SELECT enabled FROM performance_schema.setup_consumers WHERE name='events_statements_history_long'")
ORIG_CUR=$(SQL "SELECT enabled FROM performance_schema.setup_consumers WHERE name='events_statements_current'")
echo "statement instruments enabled: $(SQL "SELECT COUNT(*) FROM performance_schema.setup_instruments WHERE name LIKE 'statement/%' AND enabled='YES'")"
restore() {
  touch $D/stop; sleep 1
  SQL "UPDATE performance_schema.setup_consumers SET enabled='$ORIG_LONG' WHERE name='events_statements_history_long'" 2>/dev/null
  SQL "UPDATE performance_schema.setup_consumers SET enabled='$ORIG_CUR' WHERE name='events_statements_current'" 2>/dev/null
  echo "consumers restored: long=$(SQL "SELECT enabled FROM performance_schema.setup_consumers WHERE name='events_statements_history_long'") (was $ORIG_LONG) current=$(SQL "SELECT enabled FROM performance_schema.setup_consumers WHERE name='events_statements_current'") (was $ORIG_CUR)"
}
trap restore EXIT
SQL "UPDATE performance_schema.setup_consumers SET enabled='YES' WHERE name IN ('events_statements_current','events_statements_history_long')" || { echo "T0 STOP: cannot enable the consumers at runtime"; exit 3; }
echo "consumers now: long=$(SQL "SELECT enabled FROM performance_schema.setup_consumers WHERE name='events_statements_history_long'") current=$(SQL "SELECT enabled FROM performance_schema.setup_consumers WHERE name='events_statements_current'")"

LOG=$D/driver.log
poller() {
  # wait for the oracle phase of the fixture run, then copy the clone's statements out every 0.2 s
  until grep -aq "oracle\[fixture\]: run start" "$LOG" 2>/dev/null || [ -e $D/stop ]; do sleep 0.5; done
  local last=0 chunk
  while [ ! -e $D/stop ]; do
    chunk=$(SQL "SELECT THREAD_ID, EVENT_ID, TIMER_START, CURRENT_SCHEMA, REPLACE(REPLACE(REPLACE(SQL_TEXT, CHAR(13), ' '), CHAR(10), ' '), CHAR(9), ' ') FROM performance_schema.events_statements_history_long WHERE CURRENT_SCHEMA='sik_p14e' AND TIMER_START > $last AND (SQL_TEXT LIKE '%2027/12/31/9000%' OR SQL_TEXT LIKE '%jns_perawatan%' OR SQL_TEXT LIKE '%databarang%') ORDER BY TIMER_START" 2>/dev/null)
    if [ -n "$chunk" ]; then
      echo "$chunk" >> $D/capture.tsv
      last=$(echo "$chunk" | awk -F'\t' 'BEGIN{m=0} {if ($3+0 > m) m=$3+0} END{printf "%d", m}')
    fi
    sleep 0.2
  done
}
poller &
POLLPID=$!
echo "## fixture-only driver with the poller ($(date -u +%H:%M:%SZ))"
bash p14_edge_run.sh "$FXDIR" > $LOG 2>&1; DRC=$?
echo "driver exit=$DRC"; grep -aE "oracle\[|form\[|P15E|ABORT" $LOG | cut -c1-160
touch $D/stop; wait $POLLPID 2>/dev/null
echo "captured statements: $(wc -l < $D/capture.tsv)"
FS=$(ls /opt/dr-benchmark/p15/runs/fixture_run_start_*.txt | sort | tail -1); FSINCE=$(cat "$FS")
echo "## (iv) the fixture comparator with the instrumentation on (must equal the chain: 27 pass, DIFFER 12 / EQUAL 12 / EQUAL-SRC 3)"
python3 p15_line_identity.py $FXDIR/p14_edge_visits.txt --db sik_p14e --ledger-db sik_p14e --since "$FSINCE" --expect $FXDIR/p14_edge_manifest.json --out $D/fixture_lines.csv > $D/fixture_compare.txt 2>&1; echo "comparator exit=$?"; tail -1 $D/fixture_compare.txt | cut -c1-300
echo "## (ii)/(iii) first captured statements (shape) and the code literals"
awk -F'\t' '{print $5}' $D/capture.tsv | sed -E "s/'[^']*'/'?'/g; s/[0-9]+/N/g" | cut -c1-150 | sort | uniq -c | sort -rn | head -25 | tee $D/shapes.txt
echo "rows with a kd_jenis_prw literal: $(grep -ac "kd_jenis_prw *= *'" $D/capture.tsv)   with a kode_brng literal: $(grep -ac "kode_brng *= *'" $D/capture.tsv)   with the placeholder form (kd_jenis_prw=? or kode_brng=?): $(grep -acE "(kd_jenis_prw|kode_brng) *= *\\?" $D/capture.tsv)"
echo "distinct threads: $(awk -F'\t' '{print $1}' $D/capture.tsv | sort -u | wc -l)"
echo "T0 capture file: $D/capture.tsv ; clone sik_p14e KEPT for the analysis (drop with p14_drop_clone.sh)"
