# Run-lock negative control - 20261024T114634Z (UTC)
Tools: 5393989e2a09 dr_runlock.sh;39979e3c3e0f p6_run_suite_fresh.sh;e65238ca495a p11_negative_controls.sh;

## live state BEFORE
databases: sik sik_bench 
sik.reg_periksa=86676 sik.billing=1464593
ledger_rows=356355 sik_bench_tables=23 sik_tables=1179
benchmark grants (non-fixture): 5b3ffe53215c
database.xml: 9f9353791614 76a0c700bf08 76a0c700bf08 76a0c700bf08 76a0c700bf08 76a0c700bf08 76a0c700bf08 76a0c700bf08 76a0c700bf08 76a0c700bf08 76a0c700bf08 76a0c700bf08 2abfa7aa8fb1 76a0c700bf08 2abfa7aa8fb1 76a0c700bf08 76a0c700bf08 f5b7f4c2c427 76a0c700bf08 5fd44656cb4d 81ea12d26239 81ea12d26239 

## L1 no lock held
PASS  L1a wrapper without a lock (exit 3)
RUNLOCK-REFUSED: p6_run_suite_fresh.sh needs the VPS run lock and none is held (/opt/dr-benchmark/LOCK absent).
PASS  L1b NC driver without a lock (exit 3)
RUNLOCK-REFUSED: p11_negative_controls.sh needs the VPS run lock and none is held (/opt/dr-benchmark/LOCK absent).
PASS  L1 no fixture created
PASS  L1 NC log dir untouched

## L2 lock held by A
RUNLOCK-ACQUIRED: session=NCTEST-A-20261024T114634Z (/opt/dr-benchmark/LOCK)
PASS  L2a wrapper as session B (exit 3)
RUNLOCK-REFUSED: p6_run_suite_fresh.sh - the VPS is locked by session=NCTEST-A-20261024T114634Z pid=64206 since 2026-10-24T11:46:35Z (your DR_LOCK_SESSION='NCTEST-B-20261024T114634Z').
PASS  L2b wrapper with no session id (exit 3)
PASS  L2c NC driver as session B (exit 3)
RUNLOCK-REFUSED: p11_negative_controls.sh - the VPS is locked by session=NCTEST-A-20261024T114634Z pid=64206 since 2026-10-24T11:46:35Z (your DR_LOCK_SESSION='NCTEST-B-20261024T114634Z').
PASS  L2d second acquire while locked (exit 3)
PASS  L2 no fixture created
PASS  L2 NC log dir untouched

## L3 holder A runs a selective suite; B is refused while it runs
holder log so far: fixture sik_p6f: 61s; reg_periksa=86681 (sik 86676 + 5 STRATA-); billing=1464593
PASS  L3b session B while A is running (exit 3)
RUNLOCK-REFUSED: p6_run_suite_fresh.sh - the VPS is locked by session=NCTEST-A-20261024T114634Z pid=64206 since 2026-10-24T11:46:35Z (your DR_LOCK_SESSION='NCTEST-B-20261024T114634Z').
PASS  L3 A's fixture and grant survived B's refused attempt (grant lines 1 -> 1)
PASS  L3a holder A's own run (exit 0)
suite exit=0
teardown: databases now: sik sik_bench 
PASS  L3 fixture dropped after A's run

## L4 release
PASS  L4a release by non-owner (exit 3)
PASS  L4 lock still held
RUNLOCK-RELEASED
PASS  L4 owner release freed the lock

## L5 live state AFTER
databases: sik sik_bench 
sik.reg_periksa=86676 sik.billing=1464593
ledger_rows=356355 sik_bench_tables=23 sik_tables=1179
benchmark grants (non-fixture): 5b3ffe53215c
database.xml: 9f9353791614 76a0c700bf08 76a0c700bf08 76a0c700bf08 76a0c700bf08 76a0c700bf08 76a0c700bf08 76a0c700bf08 76a0c700bf08 76a0c700bf08 76a0c700bf08 76a0c700bf08 2abfa7aa8fb1 76a0c700bf08 2abfa7aa8fb1 76a0c700bf08 76a0c700bf08 f5b7f4c2c427 76a0c700bf08 5fd44656cb4d 81ea12d26239 81ea12d26239 
PASS  L5 live state identical before/after

=== RUNLOCK NEGATIVE CONTROL: PASS=9 FAIL=0 ===
evidence: /opt/dr-benchmark/p-chain/r5_runlock_negctl_20261024T114634Z.md   logs: /tmp/runlock_nc.g3t57f
