# P6 acceptance suite — populated sik_p6f
Date: 2026-10-18 01:21 UTC · run 20261018T012150Z
Tools: 8e0cca5bbec4 sampled_real_form_diff_r5.py;f85958b4213e dbutil.py;736506c3c9d3 build_dr_charge_ledger_p2.py;
Fixture: sik_p6f (full mysqldump clone of live sik + the 5 P4 STRATA- reg rows; the earlier targeted sik_p6 copy left reference tables such as akun_bayar empty). A10 on a scratch ledger copy inside sik_p6f.

live guard pre: sik output-table checksums 3775596682:3305332401:875851501:3457918559:1305427359:3813399011:
live guard pre: sik_bench ledger 356355:a66a3a546cc322d3eca31f2bc5558993e183b1c5afbf444d4a2a3781cfe7aea7 · database.xml targets: sik 
fixture guard: sik_p6f STRATA- reg rows = 5 (need 5)
A0: FAIL — fixture: 5 STRATA- reg rows present (date-resolved, P6-2a precondition) [FORCED FAIL by P9_FORCE_FAIL_CHECK]
fixture guard: pre-existing stage tables on sik_p6f = 0
harness+consumer database.xml -> sik_p6f (RETARGET-VERIFIED; restored by EXIT trap)
previous suite results/logs archived to /opt/dr-benchmark/results/archive/20261018T012150Z (108 entries)
P9_QUICK=1: only A0 and the live guards (A13) run; checks A1-A12, A14-A25 skipped
live guard post: sik_bench ledger 356355:a66a3a546cc322d3eca31f2bc5558993e183b1c5afbf444d4a2a3781cfe7aea7 · database.xml targets: sik 
live guard post: sik output-table checksums 3775596682:3305332401:875851501:3457918559:1305427359:3813399011:
A13: PASS — live sik_bench ledger + live sik output tables (billing, nota_jalan, detail_nota_jalan, piutang, reg_periksa) untouched; both database.xml copies on sik

## Summary (one row per asserted property; P8-A2)

| Check | Status | Property asserted |
|---|---|---|
| A0 | **FAIL** | fixture: 5 STRATA- reg rows present (date-resolved, P6-2a precondition) [FORCED FAIL by P9_FORCE_FAIL_CHECK] |
| A13 | PASS | live sik_bench ledger + live sik output tables (billing, nota_jalan, detail_nota_jalan, piutang, reg_periksa) untouched; both database.xml copies on sik |

PASS=1 FAIL=1 — a PASS covers only the property in its row, on fixture sik_p6f.

Raw transcripts: /tmp/r6_a*.log (copied next to this file as r5_p6_logs_20261018T012150Z.tgz).
