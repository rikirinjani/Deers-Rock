# P6 acceptance suite — populated sik_p6f
Date: 2026-10-20 01:06 UTC · run 20261020T010644Z
Tools: e2c1d2f93187 sampled_real_form_diff_r5.py;f85958b4213e dbutil.py;2a4a1c48b6ee build_dr_charge_ledger_p2.py;
Fixture: sik_p6f (full mysqldump clone of live sik + the 5 P4 STRATA- reg rows; the earlier targeted sik_p6 copy left reference tables such as akun_bayar empty). A10 on a scratch ledger copy inside sik_p6f.

live guard pre: sik output-table checksums 3775596682:3305332401:875851501:3457918559:1305427359:3813399011:
live guard pre: sik_bench ledger 356355:a66a3a546cc322d3eca31f2bc5558993e183b1c5afbf444d4a2a3781cfe7aea7 · database.xml targets: sik 
fixture guard: sik_p6f STRATA- reg rows = 5 (need 5)
A0: PASS — fixture: 5 STRATA- reg rows present (date-resolved, P6-2a precondition)
fixture guard: pre-existing stage tables on sik_p6f = 0
fixture guard: benchmark grants on sik_p6f = DELETE,INSERT,SELECT,UPDATE
harness+consumer database.xml -> sik_p6f (RETARGET-VERIFIED; restored by EXIT trap)
previous suite results/logs archived to /opt/dr-benchmark/results/archive/20261020T010644Z (2 entries)
P9_QUICK/P10_INJECT: only A0, the injection (if any) and the live guards (A13) run; the other checks are skipped
  freeze r6_a28p/B3 exit=0
A28' C0=2297340603:3005306964:0:884997566:0:0:3120539456:0:0:0:0:56426825:0: C1=2297340603:3005306964:0:884997566:0:0:3120539456:0:0:0:0:56426825:0: mode=
A28: PASS — A28' a failed re-backup keeps the earlier staged rows (C0 == C1): the transactional backup rolls back and the staged content is unchanged; with R5_NEGCTL_BACKUP_NO_TXN (autocommit) the live-row change leaks into the stage tables and this check FAILS
live guard post: sik_bench ledger 356355:a66a3a546cc322d3eca31f2bc5558993e183b1c5afbf444d4a2a3781cfe7aea7 · database.xml targets: sik 
live guard post: sik output-table checksums 3775596682:3305332401:875851501:3457918559:1305427359:3813399011:
A13: PASS — live sik_bench ledger + live sik output tables (billing, nota_jalan, detail_nota_jalan, piutang, reg_periksa) untouched; both database.xml copies on sik

## Summary (one row per asserted property; P8-A2)

| Check | Status | Property asserted |
|---|---|---|
| A0 | PASS | fixture: 5 STRATA- reg rows present (date-resolved, P6-2a precondition) |
| A28 | PASS | A28' a failed re-backup keeps the earlier staged rows (C0 == C1): the transactional backup rolls back and the staged content is unchanged; with R5_NEGCTL_BACKUP_NO_TXN (autocommit) the live-row change leaks into the stage tables and this check FAILS |
| A13 | PASS | live sik_bench ledger + live sik output tables (billing, nota_jalan, detail_nota_jalan, piutang, reg_periksa) untouched; both database.xml copies on sik |

PASS=3 FAIL=0 — a PASS covers only the property in its row, on fixture sik_p6f.

Raw transcripts: /tmp/r6_a*.log (copied next to this file as r5_p6_logs_20261020T010644Z.tgz).
