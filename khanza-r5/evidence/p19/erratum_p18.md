# P19 erratum to the P18 evidence (independent review of P18, findings N4, N7, N8, N9)

Written 2026-10-27 after the P19 chain; the P18 files are not edited, this file corrects how to read them.

1. **`evidence/p18/a1_clone_state.txt` lines 33-34 (N4).** The label `mysql binlog/ddl drop time:` and the value
   `2026-10-27 00:51:28` do not record a drop. The command that followed the label was `SELECT NOW()`; the value is the
   query time. The label was my error. The T0 clone `sik_p14e` was already absent when P18 started; **who dropped it and
   when is still not evidenced**.
2. **Same file, line 5 `harness/java procs: 1` (N4).** The count came from `pgrep -fc "sampled_real_form|khanza|harness_"`
   run inside an `ssh` command line that contains the pattern, so it most likely counted itself. A `ps` filter that
   cannot match its own command (`grep -E "[B]ilingHarness|[s]ampled_real"`) gave 0 at the start of P19
   (`evidence/p19/lock_free_and_lsattr_before.txt`) and `harness procs: 0` at the end of P18 and P19.
3. **All pre-flight iterations of P18 (N7).** The P18 records and R5 §30 mention only the first faults. The full list
   (`evidence/p18/preflight/`): `p18_a_negctl` run 1: 9 FAIL (empty helper command in B2, the B4 trigger created before the
   consumer baseline, a wrong log assumption in B5); run 2: 1 FAIL, a **second wrong B5 hypothesis** ("the P16 A31′ never
   calls the restore at all", refuted by its own result `got 1/0`); the B5 assertion was then rewritten a **third** time and
   **not re-run on the unfrozen bytes**; its first run is in the chain (50/50) after the freeze. `p18_b_negctl` run 1: 3 FAIL
   (the OLD arms of B3a and B4 used the P17 comparator, which already had the fix); run 2: 33/33.
4. **Record time stamps (N7).** `records/failures/20261027T0105Z-…` describes the retrace produced at 02:40Z, and
   `…T0120Z-…` describes runs made at 01:22Z; both stamps are nominal slots, not write times. P19 records are stamped
   with `date -u` at the moment they are written.
5. **The `host=` redaction (N8).** The redaction of the alias in three lock transcripts (`evidence/p18/redaction_note.txt`)
   achieved nothing: the alias is the ssh alias of the box (no IP, no domain) and appears in 21 committed files. Owner
   decision of 2026-10-27: the alias is not a secret; the redaction claim in the P18 record is dropped and nothing else
   is done (no further redaction, no history rewrite).
6. **`evidence/p17/refreeze_lsattr_after.txt` (N9).** Marked garbled in `evidence/p17/NOTE_refreeze_lsattr_after_garbled.md`.
