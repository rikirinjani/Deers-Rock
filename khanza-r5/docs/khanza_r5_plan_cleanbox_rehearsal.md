# R5 clean-box archive and rehearsal: plan (2026-10-31, written before any action)

Source: Astra v13 (74/100) single next step, the independent P22 review recommendation (stop iterating on bytes), handoff items 12 and 26
(open: third home before ~2026-11-20; the export archives). Nothing in this plan has been run. Decisions that are the owner's are marked **[owner]**.

## 0. Why the repo alone is not enough (checked against the tools, 2026-10-31)
- `evidence`: the export of 2026-10-23 (`docs/asset_export_20261023.md`) predates P13-P22: it holds the seven P11 tools, not the 42-file P22 set, no `.bak_*` dirs,
  no P15+ run logs, and the ledger/`sik_bench` state is the 10-23 state.
- `p22_chain.sh` takes seven OLD-byte directories (`.bak_p15_20261026` ... `.bak_p22_20261031`) that exist only on the box; the controls diff NEW against them.
  Their bytes are recoverable from git history (the hashes are in `evidence/p15..p22/*bak*` and `local_git_hashes_before.txt`), but nobody has rebuilt them.
- Step `3z` of `p22_chain.sh` asserts a positive control on a log that exists only on the box
  (`/opt/dr-benchmark/p15/runs/real/oracle_20261027T130408Z.log`, the P20 first-chain failed real-300 log, 57,042 bytes). On a rebuilt box that assertion fails unless the log is shipped.
- The Khanza tree, the dumps and all secrets are external (`docs/khanza_r5_reproduce.md` §2).

## 1. Phase A, archive first (this week, before anything else; box ends ~2026-11-20)
A1 **[owner]** durable off-box storage for the archives (where, who holds the key, how long). The archives hold a clinical-style dump and the Khanza tree: not for the public repo.
A2 Fresh export from the box, read-only, under the run lock, taken after the P22 release (state = P22 final): `sik` and `sik_bench` dumps (canonical ledger hash
   `356355:a66a3a54...` must reproduce after restore), the Khanza tree tarball, `/opt/Deers-Rock/tools` **including every `.bak_*` dir and all 42 frozen files with `chattr` state listed**,
   `/opt/dr-benchmark/p15/runs/` oracle logs, `p-chain/` fixture inputs, `evidence/` of waves P13-P22, the run lock script. No `.env`, `.pem`, key, `benchmark_pw`.
A3 Verify each archive: `gzip -t`, a `MANIFEST.sha256`, a scan for credential files and for addresses inside text members, and a restore of the dumps into a scratch DB
   on the box (counts and ledger hash), then drop the scratch DB. Record transcripts with `date -u` stamps.
A4 Copy the archives and the manifest to the A1 location; check the copy by hash from there. Only then is the archive step done.
A5 Write `docs/asset_export_<date>.md` (like the 10-23 one) with sizes and hashes only, no addresses.

## 2. Phase B, third home **[owner]**
B1 Provider, size (the P22 box: 94 GB disk, MySQL 8.0, OpenJDK 17, Ubuntu 24.04; confirm from the export doc), cost and how long it must live.
B2 The box is provisioned by the owner; ssh alias goes to `~/.ssh` only, never to the repo.
B3 A different, stricter alternative if a second VPS is not wanted: rebuild in a local VM or container with the same package versions. Say which; it changes what the rehearsal proves.

## 3. Phase C, the rehearsal (a "second operator")
C1 The operator is a **fresh session that has not seen this one**: it gets only the repo at the pushed HEAD, the A4 archives and `docs/khanza_r5_reproduce.md` + the asset-export doc. It writes down every step it had to guess.
C2 Rebuild per `khanza_r5_reproduce.md` §3, then the missing parts this plan adds: rebuild the seven `.bak_*` dirs from git by hash, ship the 3z positive-control log, install the 42 files, `verify_published.sh` = `ALL-MATCH`, freeze with `sha256sum -c` of the P22 manifest and `chattr +i`.
C3 Run one full `p22_chain.sh` under the run lock on the new box. Acceptance: the same exit codes as `evidence/p22/chain.log` (all 0), C4 fixture 27/27 and real 300/300 with the same counts (the encounter set is fixed), `asserts-failed=0`, inventory 65 files ok, canonical ledger hash `356355:a66a3a54...`.
C4 Differences are the result, not a failure of the rehearsal: list each (timing, the hang risk seen once in P20, package versions, anything the operator had to guess) and fix the doc or the tool in a follow-up wave, with the usual unfreeze procedure.
C5 The report states what the rehearsal does and does not establish: it shows a rebuild from repo + archives works for someone who did not write it; it does not remove the external inputs (Khanza jar, dumps, secrets).

## 4. Acceptance criteria
AC-1 archives verified and stored off the box before 2026-11-18, copy checked by hash. AC-2 the operator needed no help beyond the written docs, or every question it had is listed and answered in the docs. AC-3 the full chain reproduces the P22 results on the new box. AC-4 no address, credential or hostname in the repo (staged-diff scan with a plain pattern, every hit read, result stated in the report). AC-5 sentences about what the rehearsal shows are checked against its transcripts before the commit (the pattern of P15-P22).

## 5. Out of scope
Further tool-byte waves, C3 code-identity observation, X2, the 44 retrace files, the P14 ledger scope gaps (all listed as limits in R5 §34); the international version (design starts after AC-3, see §6).

## 6. International version, what carries over (from the P22 review, section 7c; not yet scoped)
Reusable: run lock, freeze/unfreeze/re-freeze with hashed transcripts, paired OLD/NEW controls, the fail-closed helper idiom, the release inventory, the source-row line-identity comparator pattern with unit-gate assertions.
Khanza-specific and to be replaced: the SIMRS schema, the charge-ledger builder, the tariff/PPN folding, the 27+300 samples, the Java harness and consumer, the box layout.
A scoping note for the international version is a separate document after Phase C, written with the owner (target system, data, oracle).

## 7. Order and time
A (1-2 days of work, mostly waiting on copies) -> B (owner) -> C (about one day of operator time plus the chain, ~1 h) -> report. If B is not ready by ~2026-11-15, do A and stop: AC-1 alone already removes the single-point-of-failure risk the box lifetime creates.

## Erratum (P23, after the rehearsal)
- §0 says the seven `.bak_*` directories "exist only on the box". The export of 2026-10-31 (`Deers-Rock-tools.tar.gz`) carries them, and the rehearsal also rebuilt them from git: 40 of 40 files equal (`evidence/cleanbox_rehearsal/bak_rebuild_git_vs_archive.txt`). Recipe in `docs/khanza_r5_reproduce.md` §5.
- C3 assumed a machine that passes `p14_edge_run.sh:95`. It did not: see `docs/khanza_r5_cleanbox_rehearsal_report.md` (b-9) and P23.
