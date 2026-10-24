# P11 negative controls — run 20261024T113529Z (UTC)
Tools: 7ecb20ef7bdc p6_acceptance_suite.sh;39979e3c3e0f p6_run_suite_fresh.sh;e2c1d2f93187 sampled_real_form_diff_r5.py;d59b18fb4bc3 p10_hash_state.py;e5d39756de39 p10_preservation_check.sh;73b6468f1bfb p8_recovery_unit_test.py;

## NC1 (T1): A28' discriminating re-backup
A28: FAIL — A28' a failed re-backup keeps the earlier staged rows (C0 == C1): the transactional backup rolls back and the staged content is unchanged; with R5_NEGCTL_BACKUP_NO_TXN (autocommit) the live-row change leaks into the stage tables and this check FAILS
A28: PASS — A28' a failed re-backup keeps the earlier staged rows (C0 == C1): the transactional backup rolls back and the staged content is unchanged; with R5_NEGCTL_BACKUP_NO_TXN (autocommit) the live-row change leaks into the stage tables and this check FAILS
NC 1: with-switch=FAIL without=PASS -> DISCRIMINATING
## NC2 (T2): pre-operation baseline immediate-restore assertion
PRESERVATION-CHECK FAIL (2)
PRESERVATION-CHECK PASS
NC 2: with-switch=FAIL without=PASS -> DISCRIMINATING
## NC3 (T5): RETRY-REFUSED clears the stale restored flag
A22b: FAIL — A22b' RETRY-REFUSED clears the stale flag: state shows restored=False, restore_state=refused, nothing re-billed
A22b: PASS — A22b' RETRY-REFUSED clears the stale flag: state shows restored=False, restore_state=refused, nothing re-billed
NC 3: with-switch=FAIL without=PASS -> DISCRIMINATING
## NC4 (T6): hash(stage) == hash(live) coherence
A31: FAIL — A31' immediately after a backup, hash(stage) == hash(live) for the batch (snapshot coherence); with R5_NEGCTL_HASH_FROM_LIVE_LATE a live row drifted between commit and hashing, so hash(stage) != hash(live) and this check FAILS
A31: PASS — A31' immediately after a backup, hash(stage) == the stored pre-reset hash == hash(live) for the batch (snapshot coherence, the hash is computed FROM the staged rows), and the two hash functions agree on identical data
NC 4: with-switch=FAIL without=PASS -> DISCRIMINATING
## NC5 (T3): dropped stage table -> preservation T3 assertion FAILS
dropping stage table: r5_stage_B3_r6_p10_billing
PRESERVATION-CHECK FAIL (2)
PRESERVATION-CHECK PASS
NC 5: with-switch=FAIL without=PASS -> DISCRIMINATING
=== P11 NEGATIVE CONTROLS: DISCRIMINATING=5 NOT-DISCRIMINATING=0 ===
