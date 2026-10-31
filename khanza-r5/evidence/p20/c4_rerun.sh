#!/bin/bash
# P20 C4 rerun (ad hoc, not frozen): the first chain's real-300 run lost a batch to a harness hang (harness rc=-1 after the 1800 s timeout).
# These are the SAME lines as steps 3-3c, 3g, 4e and 5 of the frozen p20_chain.sh, run again alone on the frozen bytes.
#!/bin/bash
# P20 evidence chain (task doc s3 steps 5-6), one held lock, on the frozen P20 byte set.
# P20_SHORT=1 (pre-flight only): skips the clone builds, the real-300 run, the suite and the NC runner, but runs the
# controls that need no clone, the inventory (success path) and the final capture, so every new file runs once unfrozen.
#   0 frozen set + lsattr + live-state baseline
#   1 regression of the earlier controls on the new bytes: lib tests, P15 A1-A3, P16 A/E, P17 A, P18 A, P19 A (history)
#   2 P20 safety controls (O1 patterns one at a time, O2 reason text and mutant, O6d pid files)
#   3 C4 rerun: p14_edge_run.sh fixture + the 300 real visits on a fresh clone; comparators under the P18 rules
#     (the P13 comparator results are ASSERTED and counted; the unit gate is asserted in both modes); P17 and P18
#     predicate controls (history) and P19 predicate controls on the same clone; the P15 line / B6 controls; teardown
#   4 regression on the changed suite/preservation/oracle bytes: full fresh suite, preservation, unit test, P11 NC
#   4e release inventory ON THE BOX (read-only): every pin of every manifest against the on-disk bytes (P19 N6)
#   5 final live-state proof LAST: nothing below it touches the box. frozen set + lsattr re-checked.
# Usage: DR_LOCK_SESSION=<id> bash p20_chain.sh <bak-p14 (.bak_p15)> <bak-p15 (.bak_p16)> <bak-p16 (.bak_p17)> <bak-p17 (.bak_p18)> <bak-p18 (.bak_p19)> <bak-p19 (.bak_p20)> <p20-manifest>
set -u
cd /opt/Deers-Rock/tools
BAKP14=${1:?bak with the P14 bytes (.bak_p15_*)}; BAKP15=${2:?bak with the P15 bytes (.bak_p16_*)}
BAKP16=${3:?bak with the P16 bytes (.bak_p17_*)}; BAKP17=${4:?bak with the P17 bytes (.bak_p18_*)}; BAKP18=${5:?bak with the P18 bytes (.bak_p19_*)}; BAKP19=${6:?bak with the P19 bytes (.bak_p20_*)}; MAN=${7:?p20 manifest}
SHORT=${P20_SHORT:-0}
L2=skip; L3=skip; L4=skip; L5=skip; L9=skip; L11=skip; L13=skip; L14=skip; C4=skip; C5=skip; C6=skip; L6=skip; L10=skip; L12=skip; L7=skip; L8=skip; S1=skip; S2=skip; S3=skip; S4=skip; L1=skip   # P20_SHORT=1 leaves the skipped steps unset otherwise (set -u)
. ./dr_runlock.sh; dr_runlock_require p20_chain.sh
export DBUTIL_FORCE_ROOT=1
B=/opt/dr-benchmark/p20
FX=/opt/dr-benchmark/p14/fx_c
REAL=/opt/dr-benchmark/p15/p13_stage1_300_visits.txt
PIN="356355:a66a3a546cc322d3eca31f2bc5558993e183b1c5afbf444d4a2a3781cfe7aea7"
mkdir -p $B/chain
step() { echo; echo "=== $* ($(date -u +%H:%M:%SZ)) ==="; }
AF=0
asrt() { if [ "$2" = "$3" ]; then echo "ASSERT PASS $1 (got $2)"; else echo "ASSERT FAIL $1 (got $2, want $3)"; AF=$((AF+1)); fi; }
frozen() {
  echo "frozen P20: $(sha256sum -c "$MAN" 2>/dev/null | grep -c ': OK')/$(grep -c . "$MAN") OK"
  echo "lsattr i-flag: $(awk '{print $2}' "$MAN" | xargs lsattr 2>/dev/null | awk '{print $1}' | grep -c i)/$(grep -c . "$MAN")"
}
consumers() { mysql -uroot -N -e "SELECT CONCAT(name,'=',enabled) FROM performance_schema.setup_consumers WHERE name LIKE 'events_statements%'" | tr '\n' ' '; echo; }
cp "$REAL" $B/chain/ 2>/dev/null

B=/opt/dr-benchmark/p20/rerun; mkdir -p $B/chain; SHORT=0
step "0 FROZEN + BASELINE (rerun)"; frozen; bash p14_live_state.sh p20-rerun-baseline | tee $B/chain/live_state_baseline.txt
step "3 C4 FIXTURE + 300 REAL ON A FRESH CLONE"
bash p14_edge_run.sh "$FX" "$REAL" > $B/chain/c4_driver.log 2>&1; C4=$?
grep -aE "clone matches|REPRODUCES|DIFFERS|grant:|oracle\[|form\[|P15E|STOP|FORM-INCOMPLETE|ABORT|cleanup|database.xml restored" $B/chain/c4_driver.log
echo "driver exit=$C4"
FS=$(ls /opt/dr-benchmark/p15/runs/fixture_run_start_*.txt 2>/dev/null | sort | tail -1); RS=$(ls /opt/dr-benchmark/p15/runs/real_run_start_*.txt 2>/dev/null | sort | tail -1)
FSINCE=$(cat "$FS" 2>/dev/null); RSINCE=$(cat "$RS" 2>/dev/null)
echo "run starts: fixture=$FSINCE ($FS) real=$RSINCE ($RS)"
step "3a FIXTURE (expect mode, clone ledger)"
python3 p15_line_identity.py $FX/p14_edge_visits.txt --db sik_p14e --ledger-db sik_p14e --since "$FSINCE" \
  --expect $FX/p14_edge_manifest.json --out $B/chain/fixture_lines.csv > $B/chain/fixture_compare.txt 2>&1; C5=$?
tail -1 $B/chain/fixture_compare.txt | cut -c1-400; echo "fixture compare exit=$C5"
step "3b REAL 300 (equal mode, live-pinned ledger)"
python3 p15_line_identity.py $REAL --db sik_p14e --ledger-db sik_bench --since "$RSINCE" \
  --out $B/chain/real300_lines.csv > $B/chain/real300_compare.txt 2>&1; C6=$?
tail -1 $B/chain/real300_compare.txt | cut -c1-400; echo "real compare exit=$C6"
step "3b' UNIT GATE ASSERTS (P19 N1/AC-5: both modes)"
ug() { python3 -c "import json,sys;print(json.load(open(sys.argv[1]))[sys.argv[2]])" "$1" "$2"; }
asrt "fixture unit_keys_unchecked" "$(ug $B/chain/fixture_lines_summary.json unit_keys_unchecked)" 0
asrt "fixture unit_keys_checked > 0" "$([ "$(ug $B/chain/fixture_lines_summary.json unit_keys_checked)" -gt 0 ] && echo yes || echo no)" yes
asrt "real300 unit_keys_unchecked" "$(ug $B/chain/real300_lines_summary.json unit_keys_unchecked)" 0
asrt "real300 unit_keys_checked > 0" "$([ "$(ug $B/chain/real300_lines_summary.json unit_keys_checked)" -gt 0 ] && echo yes || echo no)" yes
asrt "real300 all unit_src MATCH" "$(python3 -c "import json;print(sum(1 for e in json.load(open('$B/chain/real300_lines_encounters.json')) if e['unit_src']!='MATCH'))")" 0
for d in fixture real; do OL=$(ls -t /opt/dr-benchmark/p15/runs/$d/oracle_*.log 2>/dev/null | head -1); asrt "O1 helper on the chain's own clean $d oracle log ($(basename "$OL"))" "$(p15_oracle_batch_failed "$OL" && echo match || echo none)" none; done
step "3c P13 COMPARATOR (asserted and counted, P18 M10)"
python3 p13_sample_compare.py $REAL --db sik_p14e --since "$RSINCE" --out $B/chain/p13cmp_pos.csv > $B/chain/p13cmp_pos.txt 2>&1; asrt "p13 positive (since=run start) exit" "$?" 0; tail -2 $B/chain/p13cmp_pos.txt
python3 p13_sample_compare.py $REAL --db sik_p14e --out $B/chain/p13cmp_nosince.csv > $B/chain/p13cmp_nosince.txt 2>&1; asrt "p13 no --since exit" "$?" 2
python3 p13_sample_compare.py $REAL --db sik_p14e --since "2099-01-01 00:00:00" --out $B/chain/p13cmp_future.csv > $B/chain/p13cmp_future.txt 2>&1; asrt "p13 since in the future exit" "$?" 1
{ head -3 $REAL; head -1 $REAL; } > /tmp/p18_dup.txt
python3 p13_sample_compare.py /tmp/p18_dup.txt --db sik_p14e --since "$RSINCE" > $B/chain/p13cmp_dup.txt 2>&1; asrt "p13 duplicate list exit" "$?" 2
asrt "fixture compare exit" "$C5" 0
asrt "real compare exit" "$C6" 0
step "3g TEARDOWN"; bash p14_drop_clone.sh sik_p14e
step "4e RELEASE INVENTORY ON THE BOX (read-only, P19 N6; success path pre-flighted in P20)"; python3 p20_release_inventory.py > $B/chain/release_inventory_box.json 2> $B/chain/release_inventory_box.err; IV=$?; python3 -c "import json;d=json.load(open('$B/chain/release_inventory_box.json'));print('files',d['files'],'ok',d['ok'],'not_ok',d['not_ok'],'manifests',len(d['manifests_in_order']))"; asrt "inventory on the box: not_ok" "$(python3 -c "import json;print(len(json.load(open('$B/chain/release_inventory_box.json'))['not_ok']))")" 0

step "5 FINAL (the last box capture of this wave; nothing below touches the box)"; frozen; awk '{print $2}' "$MAN" | xargs lsattr > $B/chain/lsattr_chain_end.txt; bash p14_live_state.sh p20-chain-final | tee $B/chain/live_state_final.txt
echo "consumers: $(consumers)"
echo "databases: $(mysql -uroot -N -e 'SHOW DATABASES' | grep '^sik' | tr '\n' ' ')"
echo "harness procs: $(ps -eo cmd | grep -E 'BilingHarness|sampled_real_form' | grep -v grep | wc -l)"
echo
echo "=== P20 CHAIN DONE (short=$SHORT): lib=$L1 p15-a=$L2 p16-a=$L3 p16-e=$L4 p17-a=$L5 p18-a=$L9 p19-a=$L11 p20-a=$L13 c4=$C4 fixture=$C5 real=$C6 asserts-failed=$AF p17-b=$L6 p18-b=$L10 p19-b=$L12 p20-b=$L14 line-nc=$L7 b6=$L8 suite=$S1 preservation=$S2 unit=$S3 nc=$S4 ==="

