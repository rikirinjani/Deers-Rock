# Assessment of the session handoff (state 2026-10-24) and of the P11 opencode work

Reviewer: orchestrator (Claude), read-only. Checked against git, the evidence files and the
records on the workstation. **Not checked:** the VPS boxes (no SSH this session), and the content
of each P11 code change beyond the hashes and evidence lines quoted below.

## 1. Verdict

| What | Verdict |
|---|---|
| **P11 work (opencode)** | **Accept, 26/28** on the P11 rubric (§3). The claims I checked are backed by evidence bound to frozen bytes. Two record gaps. |
| **The handoff document** | **Accurate in its UPDATE blocks, unsafe to push as it is, and structurally misleading** (§2). Rewrite it as a consolidated handoff before the next wave. |
| **Repo push state** | ~~17 local commits unpushed (`origin/khanza-r5-p6` = `39deb3a`; HEAD = `df2c1c9`). Three of them put the replacement VPS's public IPv6 address and tailnet IP into tracked files. Do not push them as they are.~~ **Resolved 2026-10-24 (owner-approved):** the addresses now live only in the gitignored `khanza-r5/.vps-mac-mini.env` (`VPS_HOST`, `VPS_TAILNET_HOST`) and `~/.ssh/config`. Only the 18 unpushed commits were rewritten (placeholders in two docs and one commit message, nothing else changed), then pushed as a fast-forward: origin = `6cd657c`, and no address appears in any file or message on origin. |

## 2. Findings on the handoff, most severe first

1. **Connection details in a public repo (blocker for push).** The handoff (commit `c97ae1d`
   onward) and `docs/asset_export_20261023.md` hold the box's public IPv6 address, its tailnet IP,
   user `root` and the key path. It is recorded as an owner-directed exception, but the repo is
   public and its own standing rule (§5) forbids it. The IPv6 address is the sensitive part:
   root SSH is key-only, but publishing it invites scanning. The tailnet `100.x` address is
   reachable only inside the tailnet, so it is low risk. **None of it is public yet.**
2. **Hard deadline tomorrow.** The old box terminates ~2026-10-25, and the handoff still says to
   flip `khanza-r5/.vps.env` "when the old box stops responding or on owner's word". After
   tomorrow, a session sourcing `.vps.env` will hit a dead host. The second deadline is
   ~2026-11-20: mac-mini-vultr itself goes, so a third home is needed within about 4 weeks.
3. **The body contradicts the UPDATE blocks.** §1–§7 still describe 2026-10-17. They say v6 is
   the latest score, "Astra v7 steps 2–3 pending", give the step-2/3 commands and the FREEZE rule,
   and call the suite "21-check, ~7 min, always tears down" (it is now 39 checks, ~45 min, and
   keeps the fixture on failure). There are 12 UPDATE blocks above it, newest first, two of them
   corrections of earlier ones. A new session reading top-down gets conflicting instructions.
4. **Internal inconsistency on hardening.** The migration block says "hardening DONE 2026-10-23
   — password auth disabled, key-only root". Its own open-items list then says "(2) sshd hardening
   on mac mini vultr (owner-deferred)". One of them is stale.
5. **The concurrency rule has no mechanism.** P11's worst incident was a second agent session
   rewriting tools on the same tree and VPS 19 s before an evidence run. The handoff asks the next
   session to "take an exclusive window", but there is no lock, owner tag or check that would stop
   a second session. Freezing the tools (`chattr +i`) protects the bytes, not the fixture or the
   run.
6. **Retrace is not clean** (it says trace-clean is required per wave). 5 untraced files, all from
   the AC-9 revision on 2026-10-20: `evidence/p11/r5_p10_preservation_20261020T062358Z.md`,
   `r5_p11_negative_controls_20261020T044131Z.md`, `r5_p11_unit_test_20261020T0631Z.txt`,
   `r5_p6_acceptance_20261020T061104Z.md`, `records/failures/20261020T0641Z-process-r5-p11-interrupted-nc-rerun.json`.
   Four of them are the re-taken final evidence, so the trace record is missing exactly the runs P11
   relies on.
7. **Open items are scattered.** MemPalace outbox delivery, the old-box decommission, sshd
   hardening, the third home, the ledger backup table retention (§3, from 10-17), the "published
   artifact" in R5 §12, and the untracked `kaggle/` files are spread over four blocks with no
   single owner/status table.

What the handoff does well: every UPDATE cites its evidence and commits, failures are kept and
named (`_FAILED`, `_CONTAMINATED`), and the process findings (concurrent writer, stray launcher,
post-deploy drift) are written down instead of hidden.

## 3. P11 re-score against the handoff rubric (`khanza_r5_task_p11_opencode_handoff.md` §9)

| # | Self | Mine | Basis (checked this session) |
|---|---|---|---|
| R1–R2, R5–R6 | 2 | 2 | NC transcript `r5_p11_negative_controls_20261020T073218Z.md`: "NC 1…5: with-switch=FAIL without=PASS -> DISCRIMINATING", "DISCRIMINATING=5 NOT-DISCRIMINATING=0"; header shows the frozen SHAs |
| R3 | 1 | 1 | Agree with the self-score: the sentinel path is in `p10_hash_state.py` (line 60, `ERR(n)`), but no transcript shows it firing |
| R4, R7, R8 | 2 | 2* | Preservation transcripts show `PRESERVATION-RESULT a=EQUAL b=EQUAL c=EQUAL` and the forced failure `PRESERVATION-CHECK FAIL (1)` with the fixture kept. *Code for the marker fsync and the §21 wording not re-read line by line |
| R9 | 2 | 2 | As R1; one uncontended invocation, exit 0 |
| R10 | 2 | 2 | `r5_p6_acceptance_20261020T061104Z.md` "PASS=39 FAIL=0"; `r5_p10_preservation_20261020T062358Z.md` "PRESERVATION-CHECK PASS" with frozen SHAs; failed runs kept |
| R11 | 2 | 2 | `r5_p11_live_state.txt`: databases `sik sik_bench`, xml `sik`, ledger `356355:a66a3a54…`, markers 0, grant 0 |
| R12 | 2 | **1** | §22, task doc, QMS, manifest re-pin and P11 traces exist, but retrace is NOT clean (finding 6) |
| R13 | 2 | 2 | Gaps disclosed (R3, contaminated runs, the concurrent writer) |
| R14 | 2 | 2 | Within P11's own commits: no push, no Kaggle, LF hashes match. The IP commits came later (migration) and are scored in §2, not here |
| **Total** | 27 | **26/28** | |

**Binding:** the seven frozen tools in `evidence/p11/r5_p11_frozen_manifest_20261020T0739Z.sha256`
are byte-identical (LF) to the working tree and to HEAD. All seven MATCH.

**Rubric application error in the report:** it calls 27/28 "Accept with fixes" because R3 is 1.
The rubric's Accept rule requires ≥ 24 and R1, R2, R9, R10, R11 at 2; R3 is not one of those. By
its own rule the result is **Accept**, and it still is at my 26/28.

## 4. Recommendations for the next session (in order)

**Today (before the old box dies):**
1. **Decide the push path for the 17 unpushed commits.** Recommended: keep the connection
   details only in the gitignored `khanza-r5/.vps-mac-mini.env` and `~/.ssh/config` (alias
   `mac-mini-vultr`). Replace them in the handoff and `asset_export_20261023.md` with "see
   `.vps-mac-mini.env` / `ssh mac-mini-vultr`". Then rewrite **only the unpushed** commits so the
   addresses never reach origin, and push. Rewriting unpushed history is low risk but is a history
   rewrite, so it needs the owner's explicit OK. The alternative (owner's choice) is to accept
   publishing the tailnet IP only, never the public IPv6 address.
2. **Flip `.vps.env` to mac-mini-vultr** on the owner's word, today, and run the read-only
   parity probe and live proof against it (databases, `database.xml` targets, ledger hash, frozen
   tool `sha256sum -c`).

**First task of the new session:**
3. **Write a consolidated handoff** `docs/khanza_session_handoff_20261024.md` and mark the
   2026-10-17 one as history. Contents: a one-screen current-state table (score 63/100 v10,
   P11 accepted 26/28, box + deadlines, quota, open items with owner/status), the standing rules
   updated (39-check suite, ~45 min, keep-on-fail, frozen tools + unfreeze/refreeze steps, LF
   deploy, the heredoc-backslash trap), and the next wave. Resolve the hardening contradiction
   (finding 4) by checking the box read-only.
4. **Make the exclusive window real:** a VPS lock file (for example
   `/opt/dr-benchmark/LOCK` holding session id, pid and UTC start) that `p6_run_suite_fresh.sh`
   and the NC driver refuse to run without, plus one git worktree per agent session on the
   workstation. Add a negative control: a second run while locked must exit 3.
5. **Close the record gaps:** trace the 5 untraced files (finding 6) and correct the report's
   Accept/Accept-with-fixes wording (strike-through).

**Then the next wave (P12), from the v10 top-3 that P11 did not address:**
6. **Reproducibility closure** (v10 #2; the reproducibility score has been 6 for five
   assessments). Publish `stagea_common.py` with secrets read from the environment, the Java
   harness/consumer sources and the STRATA SQL; pin the STRATA dump by hash instead of
   `ls … | head -1`. This doubles as the third-home rehearsal: rebuild on a clean box from the
   repo plus the export, before ~11-20.
7. **Independent financial validation** (v10 #3): per-encounter B–C reconciliation on identical
   encounter sets, and re-examine the R4 0/999 sample.
8. **Next assessment:** v11 only after the quota resets. Use the merged method, cap the content
   at v10's 316k chars, and embed the new consolidated handoff, not the stacked one.

**Delegation (to preserve quota):** P11 shows opencode can do the grunt work, but only against
frozen bytes and a held lock. Keep that pattern for P12: a handoff with hard rules,
negative controls and a rubric, then a read-only review here.
