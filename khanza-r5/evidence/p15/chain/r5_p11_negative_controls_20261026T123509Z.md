# P11 negative controls — run 20261026T123509Z (UTC)
Tools: 4c7a8b768bf1 p6_acceptance_suite.sh;39979e3c3e0f p6_run_suite_fresh.sh;1bd83aa8cadf sampled_real_form_diff_r5.py;d59b18fb4bc3 p10_hash_state.py;75b91bccb14f p10_preservation_check.sh;767b6fba96b1 p8_recovery_unit_test.py;

## NC1 (T1): A28' discriminating re-backup
A28: FAIL — A28' a failed re-backup keeps the earlier staged rows (C0 == C1): the transactional backup rolls back and the staged content is unchanged; with R5_NEGCTL_BACKUP_NO_TXN (autocommit) the live-row change leaks into the stage tables and this check FAILS
A28: FAIL — A28' a failed re-backup keeps the earlier staged rows (C0 == C1): the transactional backup rolls back and the staged content is unchanged; with R5_NEGCTL_BACKUP_NO_TXN (autocommit) the live-row change leaks into the stage tables and this check FAILS
NC 1: with-switch=FAIL without=FAIL -> NOT-DISCRIMINATING
## NC2 (T2): pre-operation baseline immediate-restore assertion
PRESERVATION-CHECK FAIL (2)
PRESERVATION-CHECK PASS
NC 2: with-switch=FAIL without=PASS -> DISCRIMINATING
## NC3 (T5): RETRY-REFUSED clears the stale restored flag
A22b: FAIL — A22b' RETRY-REFUSED clears the stale flag: state shows restored=False, restore_state=refused, nothing re-billed
A22b: PASS — A22b' RETRY-REFUSED clears the stale flag: state shows restored=False, restore_state=refused, nothing re-billed
NC 3: with-switch=FAIL without=PASS -> DISCRIMINATING
## NC4 (T6): hash(stage) == hash(live) coherence
A31: FAIL — A31' with a live drift injected between the stage copy and the hashing (both arms), the stored pre-reset hash equals the independently recomputed staged content, and stage equals live afterwards; with R5_NEGCTL_HASH_FROM_LIVE_LATE the stored hash captures the drifted live row and this check FAILS
A31: PASS — A31' with a live drift injected between the stage copy and the hashing (both arms), the stored pre-reset hash equals the independently recomputed staged content, and stage equals live afterwards; with R5_NEGCTL_HASH_FROM_LIVE_LATE the stored hash captures the drifted live row and this check FAILS
NC 4: with-switch=FAIL without=PASS -> DISCRIMINATING
## NC5 (T3): dropped stage table -> preservation T3 assertion FAILS
dropping stage table: r5_stage_B3_r6_p10_billing
PRESERVATION-CHECK FAIL (2)
PRESERVATION-CHECK PASS
NC 5: with-switch=FAIL without=PASS -> DISCRIMINATING
=== P11 NEGATIVE CONTROLS: DISCRIMINATING=4 NOT-DISCRIMINATING=1 ===
