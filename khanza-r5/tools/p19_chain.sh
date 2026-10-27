#!/bin/bash
# P19 evidence chain (task doc s3 steps 5-6), one held lock, on the frozen P19 byte set.
#   0 frozen set + lsattr + live-state baseline
#   1 regression of the earlier controls on the new bytes: lib tests, P15 A1-A3, P16 A/E, P17 A, P18 A (history)
#   2 P19 safety controls (N3 oracle_run gate, N5 kill-function residuals)
#   3 C4 rerun: p14_edge_run.sh fixture + the 300 real visits on a fresh clone; comparators under the P18 rules
#     (the P13 comparator results are ASSERTED and counted; the unit gate is asserted in both modes); P17 and P18
#     predicate controls (history) and P19 predicate controls on the same clone; the P15 line / B6 controls; teardown
#   4 regression on the changed suite/preservation/oracle bytes: full fresh suite, preservation, unit test, P11 NC
#   4e release inventory ON THE BOX (read-only): every pin of every manifest against the on-disk bytes (P19 N6)
#   5 final live-state proof LAST: nothing below it touches the box. frozen set + lsattr re-checked.
# Usage: DR_LOCK_SESSION=<id> bash p19_chain.sh <bak-p14 (.bak_p15)> <bak-p15 (.bak_p16)> <bak-p16 (.bak_p17)> <bak-p17 (.bak_p18)> <bak-p18 (.bak_p19)> <p19-manifest>
set -u
cd /opt/Deers-Rock/tools
BAKP14=${1:?bak with the P14 bytes (.bak_p15_*)}; BAKP15=${2:?bak with the P15 bytes (.bak_p16_*)}
BAKP16=${3:?bak with the P16 bytes (.bak_p17_*)}; BAKP17=${4:?bak with the P17 bytes (.bak_p18_*)}; BAKP18=${5:?bak with the P18 bytes (.bak_p19_*)}; MAN=${6:?p19 manifest}
. ./dr_runlock.sh; dr_runlock_require p19_chain.sh
export DBUTIL_FORCE_ROOT=1
B=/opt/dr-benchmark/p19
FX=/opt/dr-benchmark/p14/fx_c
REAL=/opt/dr-benchmark/p15/p13_stage1_300_visits.txt
PIN="356355:a66a3a546cc322d3eca31f2bc5558993e183b1c5afbf444d4a2a3781cfe7aea7"
mkdir -p $B/chain
step() { echo; echo "=== $* ($(date -u +%H:%M:%SZ)) ==="; }
AF=0
asrt() { if [ "$2" = "$3" ]; then echo "ASSERT PASS $1 (got $2)"; else echo "ASSERT FAIL $1 (got $2, want $3)"; AF=$((AF+1)); fi; }
frozen() {
  echo "frozen P19: $(sha256sum -c "$MAN" 2>/dev/null | grep -c ': OK')/$(grep -c . "$MAN") OK"
  echo "lsattr i-flag: $(awk '{print $2}' "$MAN" | xargs lsattr 2>/dev/null | awk '{print $1}' | grep -c i)/$(grep -c . "$MAN")"
}
consumers() { mysql -uroot -N -e "SELECT CONCAT(name,'=',enabled) FROM performance_schema.setup_consumers WHERE name LIKE 'events_statements%'" | tr '\n' ' '; echo; }
cp "$REAL" $B/chain/ 2>/dev/null

step "0 FROZEN + LIVE BASELINE"; frozen; awk '{print $2}' "$MAN" | xargs lsattr > $B/chain/lsattr_chain_start.txt; bash p14_live_state.sh p19-chain-baseline | tee $B/chain/live_state_baseline.txt; echo "consumers: $(consumers)"
step "1a LIB TEST"; bash p15_lib_test.sh "$PIN" > $B/chain/a_lib_test.txt 2>&1; L1=$?; tail -1 $B/chain/a_lib_test.txt; echo "lib exit=$L1"
step "1b P15 A1-A3 CONTROLS (old = .bak_p15)"; bash p15_a_negctl.sh "$BAKP14" "$FX" "$REAL" > $B/chain/p15_a_negctl.txt 2>&1; L2=$?; grep -a "^FAIL\|P15-A-NC" $B/chain/p15_a_negctl.txt; echo "p15-a-nc exit=$L2"
step "1c P16 A/E4 CONTROLS"; bash p16_a_negctl.sh "$BAKP15" > $B/chain/p16_a_negctl.txt 2>&1; L3=$?; grep -a "^FAIL\|P16-A-NC" $B/chain/p16_a_negctl.txt; echo "p16-a-nc exit=$L3"
step "1d P16 E1-E3 CONTROLS"; bash p16_e_negctl.sh "$BAKP15" > $B/chain/p16_e_negctl.txt 2>&1; L4=$?; grep -a "^FAIL\|P16-E-NC" $B/chain/p16_e_negctl.txt; echo "p16-e-nc exit=$L4"
step "1e P17 SAFETY CONTROLS (history, on the P18 bytes)"; bash p17_a_negctl.sh "$BAKP16" "$BAKP15" "$FX" "$REAL" > $B/chain/p17_a_negctl.txt 2>&1; L5=$?; grep -a "^FAIL\|P17-A-NC" $B/chain/p17_a_negctl.txt; echo "p17-a-nc exit=$L5"
step "1f P18 SAFETY CONTROLS (history, on the P19 bytes; B4 builds its own clone)"; bash p18_a_negctl.sh "$BAKP17" "$BAKP16" "$BAKP15" "$FX" "$REAL" > $B/chain/p18_a_negctl.txt 2>&1; L9=$?; grep -a "^FAIL\|P18-A-NC" $B/chain/p18_a_negctl.txt; echo "p18-a-nc exit=$L9"
step "2 P19 SAFETY CONTROLS (N3 oracle_run gate, N5 kill-function residuals)"; bash p19_a_negctl.sh "$BAKP18" > $B/chain/p19_a_negctl.txt 2>&1; L11=$?; grep -a "^PASS\|^FAIL\|P19-A-NC" $B/chain/p19_a_negctl.txt; echo "p19-a-nc exit=$L11"

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
step "3c P13 COMPARATOR (asserted and counted, P18 M10)"
python3 p13_sample_compare.py $REAL --db sik_p14e --since "$RSINCE" --out $B/chain/p13cmp_pos.csv > $B/chain/p13cmp_pos.txt 2>&1; asrt "p13 positive (since=run start) exit" "$?" 0; tail -2 $B/chain/p13cmp_pos.txt
python3 p13_sample_compare.py $REAL --db sik_p14e --out $B/chain/p13cmp_nosince.csv > $B/chain/p13cmp_nosince.txt 2>&1; asrt "p13 no --since exit" "$?" 2
python3 p13_sample_compare.py $REAL --db sik_p14e --since "2099-01-01 00:00:00" --out $B/chain/p13cmp_future.csv > $B/chain/p13cmp_future.txt 2>&1; asrt "p13 since in the future exit" "$?" 1
{ head -3 $REAL; head -1 $REAL; } > /tmp/p18_dup.txt
python3 p13_sample_compare.py /tmp/p18_dup.txt --db sik_p14e --since "$RSINCE" > $B/chain/p13cmp_dup.txt 2>&1; asrt "p13 duplicate list exit" "$?" 2
asrt "fixture compare exit" "$C5" 0
asrt "real compare exit" "$C6" 0
step "3d P17 PREDICATE CONTROLS (history, on the P18 bytes)"
bash p17_b_negctl.sh "$FX" "$FSINCE" "$BAKP16" "$BAKP15" > $B/chain/p17_b_negctl.txt 2>&1; L6=$?; grep -a "^FAIL\|P17-B-NC" $B/chain/p17_b_negctl.txt; echo "p17-b-nc exit=$L6"
step "3d' P18 PREDICATE CONTROLS (B7, B8)"
bash p18_b_negctl.sh "$FX" "$FSINCE" "$BAKP17" "$BAKP16" "$BAKP15" > $B/chain/p18_b_negctl.txt 2>&1; L10=$?; grep -a "^PASS\|^FAIL\|P18-B-NC" $B/chain/p18_b_negctl.txt; echo "p18-b-nc exit=$L10"
step "3d'' P19 PREDICATE CONTROLS (N1 mixed plant, equal-mode unit gate, N2)"
bash p19_b_negctl.sh "$FX" "$FSINCE" "$BAKP18" "$BAKP16" > $B/chain/p19_b_negctl.txt 2>&1; L12=$?; grep -a "^PASS\|^FAIL\|P19-B-NC" $B/chain/p19_b_negctl.txt; echo "p19-b-nc exit=$L12"
step "3e P15 LINE CONTROLS (old p15 comparator = P15 bytes)"
bash p15_line_negctl.sh "$FX" "$FSINCE" "$BAKP15" > $B/chain/line_negctl.txt 2>&1; L7=$?; grep -a "^FAIL\|P15-LINE-NC" $B/chain/line_negctl.txt; echo "line-nc exit=$L7"
step "3f B6 CONTROL (old p12 = P14 bytes)"
bash p15_b6_negctl.sh "$BAKP14" "$REAL" > $B/chain/b6_negctl.txt 2>&1; L8=$?; grep -a "^FAIL\|P15-B6" $B/chain/b6_negctl.txt; echo "b6 exit=$L8"
step "3g TEARDOWN"; bash p14_drop_clone.sh sik_p14e

step "4a FULL FRESH SUITE"; bash p6_run_suite_fresh.sh > $B/chain/e_suite.log 2>&1; S1=$?; grep -a "^PASS=\|^evidence:" $B/chain/e_suite.log | tail -2; echo "suite exit=$S1"
step "4b PRESERVATION CHECK"; bash p10_preservation_check.sh > $B/chain/e_preservation.log 2>&1; S2=$?; grep -a "SNAPSHOT-BINDING\|PRESERVATION-\|^evidence:" $B/chain/e_preservation.log | tail -5; echo "preservation exit=$S2"
step "4c RECOVERY UNIT TEST"; python3 p8_recovery_unit_test.py > $B/chain/e_unit.txt 2>&1; S3=$?; tail -1 $B/chain/e_unit.txt; echo "unit exit=$S3"
step "4d P11 NEGATIVE CONTROLS"; bash p11_negative_controls.sh > $B/chain/e_nc.log 2>&1; S4=$?; grep -a "^NC [0-9]:\|DISCRIMINATING=\|^evidence:" $B/chain/e_nc.log; echo "nc exit=$S4"
[ "$(mysql -uroot -N -e "SHOW DATABASES LIKE 'sik_p6f'")" = "sik_p6f" ] && echo "note: sik_p6f still present after the NC runner"
step "4e RELEASE INVENTORY ON THE BOX (read-only, P19 N6)"; python3 p19_release_inventory.py > $B/chain/release_inventory_box.json 2> $B/chain/release_inventory_box.err; IV=$?; python3 -c "import json;d=json.load(open('$B/chain/release_inventory_box.json'));print('files',d['files'],'ok',d['ok'],'not_ok',d['not_ok'],'manifests',len(d['manifests_in_order']))"; asrt "inventory on the box: not_ok" "$(python3 -c "import json;print(len(json.load(open('$B/chain/release_inventory_box.json'))['not_ok']))")" 0

step "5 FINAL (the last box capture of this wave; nothing below touches the box)"; frozen; awk '{print $2}' "$MAN" | xargs lsattr > $B/chain/lsattr_chain_end.txt; bash p14_live_state.sh p19-chain-final | tee $B/chain/live_state_final.txt
echo "consumers: $(consumers)"
echo "databases: $(mysql -uroot -N -e 'SHOW DATABASES' | grep '^sik' | tr '\n' ' ')"
echo "harness procs: $(ps -eo cmd | grep -E 'BilingHarness|sampled_real_form' | grep -v grep | wc -l)"
echo
echo "=== P19 CHAIN DONE: lib=$L1 p15-a=$L2 p16-a=$L3 p16-e=$L4 p17-a=$L5 p18-a=$L9 p19-a=$L11 c4=$C4 fixture=$C5 real=$C6 asserts-failed=$AF p17-b=$L6 p18-b=$L10 p19-b=$L12 line-nc=$L7 b6=$L8 suite=$S1 preservation=$S2 unit=$S3 nc=$S4 ==="
