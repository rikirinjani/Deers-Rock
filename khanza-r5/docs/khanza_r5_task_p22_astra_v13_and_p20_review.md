# R5-P22 task: Astra v13 findings and the open P20-review items (written before execution, 2026-10-31)

Source: Astra v13 (run 5766429, 74/100), verified against the source in `evidence/astra_v13_5766429_NOTE.md`, plus the P20 review
items Q4, Q5, Q6, Q8 that P21 left open. Owner decision 2026-10-31: finish this wave fast; box lifetime is not a constraint on this
wave; the next work after it is the international version. Rules unchanged: run lock for every driver run, unfreeze/re-freeze
procedure, hashed transcripts, every new file run once on unfrozen bytes (pre-flight) before freezing, final live-state proof last,
no address or credential committed, no push without the owner.

## 1. Findings, verified (all opened at the line)
| ID | Finding | Line | Verified |
|---|---|---|---|
| R1 | `p15_oracle_batch_failed` returns "no match" for a missing or unreadable log (grep exit 2); caller treats that as no failure | `tools/p15_lib.sh:59-61` | yes (Astra, P20 Q5) |
| R2 | `$DBXML restore` in the EXIT-trap cleanup is unchecked; a failed restore leaves no message and no exit change | `tools/p14_edge_run.sh:58`, `tools/p13_wide_sample.sh:39` | yes |
| R3 | `p15_clone_matches_sik` accepts two empty strings as equal (two failed `mysql` calls); message says "row-equal" but compares `COUNT(*)` | `tools/p15_lib.sh:115-126` | yes |
| R4 | Step `3z` of `p20_chain.sh` passes "none" on a missing log and may skip its positive control | `tools/p20_chain.sh:107-112` | yes (P20 Q5) |
| R5 | After-TERM case in `p20_a_negctl.sh` discriminates only the post-KILL message | `tools/p20_a_negctl.sh:104-110` | yes (P20 Q4) |
| R6 | First canned log holds two patterns (`: FAILED (` and `NOT restored`) | `tools/p20_a_negctl.sh:32` | yes (P20 Q6) |
| R7 | Handoff section 1 stale ("Latest wave: P17 done", "trace-clean") | handoff l.14, l.19 | yes (Astra) |
| R8 | P20 Q8 small points (rerun banner, line number in the 1445 record, asserts-failed 0 includes two vacuous assertions) | see review | taken from review |
Not confirmed, not worked: `.bak_p17fix1` overstated in the manifest; P18 dated before P17.

## 2. Packages
- **A (lib, `p15_lib.sh`).** R1: the helper returns 0 (= failed) when the log is missing, unreadable or empty-of-newline-and-unreadable; message on stderr "log missing - treated as FAILED". R3: both counts must match `^[0-9]+$`, each `mysql` rc is checked, and the message says "count-equal". Controls (`p22_a_negctl.sh`): OLD lib (`.bak_p22`) vs NEW on a missing log (OLD 10 / NEW 4 through the extracted `oracle_run`), on empty strings (a shadowed `mysql` that fails), and on a non-numeric value; clean paths unchanged.
- **B (drivers).** R2: in the cleanup of `p14_edge_run.sh` and `p13_wide_sample.sh`, a failing `$DBXML restore` prints `CLEANUP-RESTORE-FAILED` and exits 3, as the CLEANUP-INCOMPLETE branch does. Control: extract the cleanup with `sed`, shadow `$DBXML` with a function that fails, OLD vs NEW (OLD no message, rc 0 / NEW message, rc 3); a succeeding restore stays silent.
- **C (controls).** R4: `3z` asserts "missing" for an absent log and an absent positive-control file is an `asrt` failure. R5: the after-TERM case asserts elapsed time (the wait loop did not break on 2) and the count of shadow `kill -KILL` calls. R6: split the first canned log so each pattern has its own line. A new `p22_chain.sh` sources the lib, runs 3z first, then the rest.
- **D (documents).** R7, R8 and the P22 section R5 section 34; the Astra v13 line in the handoff and ROADMAP; records.
- **E (chain and proof).** Full chain on the new manifest in ONE run (this closes the "no single full chain on the final wrapper" limit), C4 fixture and real-300, inventory, final live-state proof last, lock released and the box left as found.

## 3. Acceptance criteria
AC-1 each fix has a paired OLD/NEW control that fails on the old bytes. AC-2 no clean path changes (lib tests 23/23 and earlier controls still green). AC-3 one full chain on the new manifest, no re-run of C4 alone. AC-4 every new file run once on unfrozen bytes first. AC-5 no address or credential in the diff (scan). AC-6 sentences about gates checked against code lines; each changed record line reopened after the edit. AC-7 handoff section 1 states the real latest wave.

## 4. Limits stated in advance
Not worked: the clean-box rebuild and third home, X2, C3 code-identity observation, the P14 ledger scope gaps, the 44 retrace files, A8 failing branch, B4 unpaired, `.bak_p17fix1` never hashed.

## 5. Rubric
Same R1-R12 (0/1/2, /24; critical R2, R3, R6, R9) as P20 section 6; the self-score is not the verdict; an independent re-score follows.

## 7. Result (filled after execution, 2026-10-31)
Executed under lock `P22-CLAUDE-20261031` (13:11:29Z-15:59:21Z). All of §2 A-E done; R1-R7 as in R5 section 34. One full chain on manifest
`p22_frozen_20261031.sha256` (42 files): every step green, `asserts-failed=0`, inventory 65/65. Amendments: (1) the R1 helper also checks that the log is a regular file and
treats a grep error as FAILED (the first pre-flight found a directory passed as a log); (2) R5 pairing is an ad hoc mutant run, only the timing assertion discriminates;
(3) `p22_chain.sh` inherits the label `p20-chain-final` in its live-state header. Self-score 20/24 (R4, R5, R9, R10 = 1); Accept rule not met (R9 = 1). Details in R5 section 34.

**Erratum (P22 independent review S6, 2026-10-31):** §2A says the empty-log oracle_run case is "OLD 10 / NEW 4": reversed, the transcript (`evidence/p22/chain.log:108`) and the control say OLD 4 / NEW 10.
§2A says "each `mysql` rc is checked": the code checks the output (empty / non-numeric), not the exit status. §2C says the new chain "runs 3z first": 3z stays after step 4d, as in `p20_chain.sh`.
Independent score of P22: **18/24** (R3, R4, R5, R9, R10, R11 = 1); Accept rule not met (R3 and R9 = 1).
