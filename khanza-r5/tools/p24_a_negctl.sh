#!/bin/bash
# P24 controls (docs/khanza_r5_task_p24_p23_review_fixes.md package B). Run under the run lock. OLD = the P23 bytes kept in <bak-p24>.
#   G1  the free-disk floor and the log line of p14_edge_run.sh (the MINFREE..free-disk-check lines, extracted, `df` and `res` shadowed):
#       OLD accepts a threshold of 0 (the stop rule is off) and logs nothing; NEW refuses 0, 1 and 2 (rc 3, 'below the floor', the check is
#       not passed), accepts 3 and 8, and logs "free-disk check: threshold NGB, MGB free on /" only on the pass path.
#   G2  p24_release_inventory.py: the --local order names manifest b of P23 and the P24 manifest (OLD p23_release_inventory.py lacks b);
#       a dynamic run against a synthetic tree built from every manifest named in the local order: every entry found, not_ok empty.
#   G3  the freshness helper of p24_chain.sh (extracted): fresh / older / empty / missing / FUTURE-dated / missing start marker.
#   G4  the asserted list of p24_chain.sh holds the P24 additions (fixture_lines.csv, fixture_lines_encounters.json, both run-start files,
#       the marker check, the verdict line, the df sampler); p23_chain.sh holds none of them.
# Run it twice before freezing, with P14_MIN_FREE_GB unset and exported (P23 lesson: a control about an environment variable).
# Usage: DR_LOCK_SESSION=<id> bash p24_a_negctl.sh <bak-p24 (P23 bytes)>
set -u
cd /opt/Deers-Rock/tools
BAK=${1:?bak p24 dir (P23 bytes)}
. ./dr_runlock.sh; dr_runlock_require p24_a_negctl.sh
P=0; F=0
chk() { if [ "$2" = "$3" ]; then echo "PASS $1 (got $2)"; P=$((P+1)); else echo "FAIL $1 (got $2, want $3)"; F=$((F+1)); fi; }
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT

chk "precondition: OLD and NEW p14_edge_run.sh differ" "$(cmp -s $BAK/p14_edge_run.sh p14_edge_run.sh && echo same || echo differs)" differs
echo "## G1 the floor and the log line"
OLDL=$(sed -n '/^MINFREE=/,/STOP RULE/p' $BAK/p14_edge_run.sh)
NEWL=$(sed -n '/^MINFREE=/,/free-disk check/p' p14_edge_run.sh)
chk "G1 the OLD lines (3) and the NEW lines (5) are extracted" "$(echo "$OLDL" | grep -c .)/$(echo "$NEWL" | grep -c .)" 3/5
run_line() { # lines avail-GB env-assignment -> "rc|output"
  # the variable is unset first: an environment that sets P14_MIN_FREE_GB must not leak into the "unset" cases
  printf '%s\n' "res() { echo \"RES: \$*\"; }" "df() { printf 'Avail\n %sG\n' $2; }" "unset P14_MIN_FREE_GB" "$3" "$1" "echo PASSED-THE-CHECK" > $T/l.sh
  out=$(bash $T/l.sh 2>&1); rc=$?
  echo "$rc|$(echo "$out" | tr '\n' ' ')"
}
R=$(run_line "$OLDL" 14 "export P14_MIN_FREE_GB=0"); chk "G1 OLD, threshold 0, 14 GB free: passes the check (the stop rule is off: the defect)" "${R%%|*}/$(echo "$R" | grep -c 'PASSED-THE-CHECK')/$(echo "$R" | grep -c 'free-disk check')" 0/1/0
for lo in 0 1 2; do
  R=$(run_line "$NEWL" 14 "export P14_MIN_FREE_GB=$lo"); chk "G1 NEW, threshold $lo: refused (rc 3, 'below the floor', not passed, no log line)" "${R%%|*}/$(echo "$R" | grep -c 'below the floor')/$(echo "$R" | grep -c 'PASSED-THE-CHECK')/$(echo "$R" | grep -c 'free-disk check')" 3/1/0/0
done
R=$(run_line "$NEWL" 14 "export P14_MIN_FREE_GB=3"); chk "G1 NEW, threshold 3, 14 GB free: passes and logs the threshold and the free GB" "${R%%|*}/$(echo "$R" | grep -c 'free-disk check: threshold 3GB, 14GB free on /')/$(echo "$R" | grep -c 'PASSED-THE-CHECK')" 0/1/1
R=$(run_line "$NEWL" 14 "export P14_MIN_FREE_GB=8"); chk "G1 NEW, threshold 8, 14 GB free: passes and logs 8 and 14" "${R%%|*}/$(echo "$R" | grep -c 'free-disk check: threshold 8GB, 14GB free on /')/$(echo "$R" | grep -c 'PASSED-THE-CHECK')" 0/1/1
R=$(run_line "$NEWL" 70 ":");                          chk "G1 NEW, variable unset, 70 GB free: passes with the default 20 in the log line" "${R%%|*}/$(echo "$R" | grep -c 'free-disk check: threshold 20GB, 70GB free on /')" 0/1
R=$(run_line "$NEWL" 14 ":");                          chk "G1 NEW, variable unset, 14 GB free: STOP RULE <20GB, rc 3, no log line (the default is unchanged)" "${R%%|*}/$(echo "$R" | grep -c 'STOP RULE: <20GB free')/$(echo "$R" | grep -c 'free-disk check')" 3/1/0
R=$(run_line "$NEWL" 70 "export P14_MIN_FREE_GB=8GB"); chk "G1 NEW, '8GB': still refused as not a whole number" "${R%%|*}/$(echo "$R" | grep -c 'not a whole number')" 3/1

echo "## G2 the inventory order"
chk "G2 NEW inventory (local order) names manifest b of P23" "$(grep -c 'r5_p23_frozen_manifest_20261101b.sha256' p24_release_inventory.py)" 1
chk "G2 NEW inventory (local order) names the P24 manifest" "$(grep -c 'r5_p24_frozen_manifest_20261105.sha256' p24_release_inventory.py)" 1
chk "G2 NEW inventory (box order) globs the P24 manifest" "$(grep -c 'p24_frozen_\*.sha256' p24_release_inventory.py)" 1
chk "G2 OLD p23_release_inventory.py lacks manifest b (the defect)" "$(grep -c 'manifest_20261101b' p23_release_inventory.py)" 0
NM=$(grep -o 'evidence/p[0-9]*/[A-Za-z0-9_]*\.sha256' p24_release_inventory.py | sort -u | wc -l)
mkdir -p $T/r/tools; i=0
for m in $(grep -o 'evidence/p[0-9]*/[A-Za-z0-9_]*\.sha256' p24_release_inventory.py | sort -u); do
  i=$((i+1)); mkdir -p "$T/r/$(dirname $m)"; echo "synthetic $i" > $T/r/tools/f$i.txt
  echo "$(sha256sum $T/r/tools/f$i.txt | cut -d' ' -f1)  f$i.txt" > "$T/r/$m"
done
python3 -B p24_release_inventory.py --local $T/r > $T/inv.json 2> $T/inv.err
chk "G2 dynamic: every manifest named in the local order is read (synthetic tree), none missing" "$(python3 -c "import json;d=json.load(open('$T/inv.json'));print(len(d['manifests_in_order']),d['files'],d['ok'],len(d['not_ok']))")" "$NM $NM $NM 0"

echo "## G3 the freshness helper of p24_chain.sh"
FN=$(sed -n '/^p24_isfresh() {/,/^}/p' p24_chain.sh)
chk "G3 the helper is extracted from the chain" "$(echo "$FN" | grep -c .)" 5
mkdir -p $T/b/chain $T/nb/chain; : > $T/b/chain/.t0
sleep 1
echo '{"x":1}' > $T/b/chain/new.json
echo '{"x":1}' > $T/b/chain/old.json;    touch -d '2 hours ago' $T/b/chain/old.json
echo '{"x":1}' > $T/b/chain/future.json; touch -d '2 hours' $T/b/chain/future.json
: > $T/b/chain/empty.json
echo '{"x":1}' > $T/nb/chain/new.json
fr() { bash -c "B=$1; $FN; p24_isfresh $1/chain/$2"; }
chk "G3 a file written after the marker is fresh" "$(fr $T/b new.json)" fresh
chk "G3 a file older than the marker (shipped from another box) is stale" "$(fr $T/b old.json)" stale
chk "G3 an empty file is stale" "$(fr $T/b empty.json)" stale
chk "G3 a missing file is stale" "$(fr $T/b nothere.json)" stale
chk "G3 a FUTURE-dated file is stale (P24 S4: -nt alone passed it)" "$(fr $T/b future.json)" stale
chk "G3 with no start marker nothing is fresh (P24 S4: -nt against a missing marker is true)" "$(fr $T/nb new.json)" stale

echo "## G4 the asserted list and the chain additions"
chk "G4 NEW chain asserts fixture_lines.csv and fixture_lines_encounters.json fresh" "$(grep -c 'fixture_lines.csv fixture_lines_encounters.json' p24_chain.sh)" 1
chk "G4 OLD p23_chain.sh does not" "$(grep -c 'fixture_lines.csv fixture_lines_encounters.json' p23_chain.sh)" 0
chk "G4 NEW chain asserts both run-start files fresh" "$(grep -c 'run-start file is newer than the chain start' p24_chain.sh)" 2
chk "G4 NEW chain asserts the start marker exists and aborts if it cannot be created" "$(grep -c 'the start marker exists' p24_chain.sh)/$(grep -c 'cannot create' p24_chain.sh)" 1/1
chk "G4 NEW chain ends with a verdict line and exits with it" "$(grep -c '^echo "chain verdict:' p24_chain.sh)/$(tail -1 p24_chain.sh)" "1/exit \$RC"
chk "G4 NEW chain runs the df sampler during step 3 and stops it at the teardown" "$(grep -c 'df_samples.txt' p24_chain.sh)" 2

echo "P24-A-NC: PASS=$P FAIL=$F"
[ "$F" = "0" ]
