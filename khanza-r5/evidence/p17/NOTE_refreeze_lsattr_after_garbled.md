# Note (P19 N9): `refreeze_lsattr_after.txt` is garbled

`refreeze_lsattr_after.txt` in this directory was captured in P17 after the manifest-b re-freeze. Three of its lines carry
`uniq -c` prefixes (`      1 ----i---------e------- p10_preservation_check.sh`) and its last line is truncated
(`----i---------e------- p6_acceptance_suite`, without `.sh`). It is kept unchanged as the original capture and is
**not** evidence of `lsattr` on all 27 files.

What stands in for it, for the same 27 files:
- `evidence/p18/chain/lsattr_chain_start.txt` (31 files, all with `i`, captured at 01:25Z on 2026-10-27, the state the
  P17 re-freeze left);
- `evidence/p18/lock_free_and_lsattr_before.txt` (27 files with `i`, before the P18 unfreeze);
- `evidence/p17/chain_b.log` step 0 and step 3 (`lsattr i-flag: 27/27`).
