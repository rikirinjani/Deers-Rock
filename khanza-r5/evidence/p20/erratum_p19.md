# P20 erratum to the P19 evidence (independent review of P19: findings O1, O3, O4, O5, O6)

Written 2026-10-27 during P20; the P19 files are not edited, this file corrects how to read them.

1. **Why `pass` was False for all 300 encounters in the live equal-mode discovery (O3).** `evidence/p19/a2_live_equal.txt`
   (last line) says "it is the payment column", and R5 §31 said "because the payment sum differs there". Both were my
   statements of a cause I had not looked up. `evidence/p19/preflight/a2_live_equal_encounters.json` shows `B = ""` and
   `B_rows = 0` for **all 300** encounters: **live has no payment row (`detail_nota_jalan`) for these visits**, so
   `b[0] is not None` fails. It is not a different sum. The unit gate result of that run (`unit_src` MATCH 300/300,
   `unit_keys_checked` 698, `unchecked` 0) is unaffected.
2. **When the live discovery ran and on which bytes (review could-not-verify list).** `evidence/p20/a2_provenance.txt`:
   the files `a2_live_equal*` were written at 2026-10-27 08:38:32Z, the scratch comparator `p15_line_identity.py` next to
   them at 08:38:31Z, i.e. before the P19 unfreeze (08:42:32Z); its sha256 (`8c7a13a8…`) equals the frozen
   `p15_line_identity.py` of the P19 manifest.
3. **The "processes … 0" line (review could-not-verify list).** In `evidence/p19/lock_free_and_lsattr_before.txt` the line
   came from `ps -eo pid,etime,args | grep -E "[B]ilingHarness|[s]ampled_real" | wc -l`, a filter that cannot match its own
   command. The P20 transcripts name the command behind each line (`[cmd]` markers).
4. **`evidence/p19/local_eq_box_manifest.txt` (review could-not-verify list).** It was produced locally after the P19
   re-freeze: for each line of the box manifest, `sha256sum` of the committed `tools/` file with CR removed, compared with
   the manifest hash (35 lines, 35 EQUAL). `evidence/p20/local_eq_box_manifest.txt` carries its command and time in its
   header.
5. **The AMBIGUOUS/UNMAPPED exclusion (O4).** In the P19 comparator the unit count leaves out billed keys whose code starts
   with `AMBIGUOUS:` or `UNMAPPED:` (`tools/p15_line_identity.py:196`). It was not in the plan or among the amendments of
   P19 §7 and had no control; it is now recorded there (addendum) and covered by `p20_b_negctl.sh` (same bytes, new
   coverage): such an encounter fails by its verdict in both modes.
6. **AC-7 of P19 ("repeatable from the committed traces") (O5).** It was scored as met. The second run in
   `evidence/p19/retrace_trace_clean.txt` printed `UNTRACED: 44`; AC-7 was **partly** met. P20 tried to copy the 15 missing older
   khanza-r5 traces into `records/traces/`; 4 of them hold network addresses of the box, so all 15 were removed again before any
   commit. The second run (`evidence/p20/retrace_trace_clean.txt`) still lists **44** uncovered files, so AC-7 stays **partly** met.
7. **Handoff item 25 (O1).** "a FAILED oracle batch can no longer end `P15E OK`" was too strong: the helper did not match
   the oracle's `STAGE-DROP-FAILED` and `STAGE-KEEP` words. Struck in the handoff; P20 adds both words to the helper.
