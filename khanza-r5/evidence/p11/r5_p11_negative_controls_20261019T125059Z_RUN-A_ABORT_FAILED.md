# P11 negative controls — run 20261019T125059Z (UTC)
Tools: 983104f6a136 p6_acceptance_suite.sh;0865400d162e p6_run_suite_fresh.sh;07fcda437888 sampled_real_form_diff_r5.py;376ee38df8c7 p10_hash_state.py;fc4c4eaa1c82 p10_preservation_check.sh;73b6468f1bfb p8_recovery_unit_test.py;

## NC1 (T1): A28' discriminating re-backup
A28: FAIL — A28' a failed re-backup keeps the earlier staged rows (C0 == C1): the transactional backup rolls back and the staged content is unchanged; with R5_NEGCTL_BACKUP_NO_TXN (autocommit) the live-row change leaks into the stage tables and this check FAILS
A28: PASS — A28' a failed re-backup keeps the earlier staged rows (C0 == C1): the transactional backup rolls back and the staged content is unchanged; with R5_NEGCTL_BACKUP_NO_TXN (autocommit) the live-row change leaks into the stage tables and this check FAILS
NC 1: with-switch=FAIL without=PASS -> DISCRIMINATING
## NC2 (T2): pre-operation baseline immediate-restore assertion
ABORT: NC2 with-build failed
