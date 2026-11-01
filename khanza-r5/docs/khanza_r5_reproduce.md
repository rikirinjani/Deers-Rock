# Reproducing the R5 benchmark: what is published, what is not (2026-10-24)

Reproducibility closure for assessment v10 finding #2. **Status: sources published and pinned;
the clean-box rebuild itself has not been done** (needs the third home, see the handoff).

## 1. Published in this repo (byte-pinned)

| What | Where | Pin |
|---|---|---|
| Consumer (`KhanzaBillingConsumer.java`), config helpers (`PatchDbXml`, `RetargetDbXml`, `TestAES`, `JdbcProbe`, `MiniParse`, `JasperHeadless`), export scripts | `src/consumer/` | `src/PUBLISHED.sha256` |
| Real-form harness (`BilingHarness.java`, `EncodeAES.java`) | `src/harness/` | `src/PUBLISHED.sha256` |
| `stagea_common.py` (the helper the oracle imports) | `tools/stagea_common.py` | `src/PUBLISHED.sha256`; it holds **no secret** (it calls `dbutil.py`; the DB password is read at run time from `run-env/benchmark_pw`, never from the repo) |
| STRATA row dump (5 `STRATA-` registration rows) | `evidence/p6/sik_p6f_build_20261016T042629Z/strata_reg_rows.sql` | sha256 `c8980819…`; **`p6_run_suite_fresh.sh` refuses to run on any other content** (it used to take `ls … \| head -1`) |
| Oracle, gates, suite, wrapper, run lock, reconciliation | `tools/` | `docs/khanza_r5_release_manifest.md`, `evidence/runlock/`, `evidence/p12/` frozen manifest |

`bash src/verify_published.sh` (from `khanza-r5/`) checks the local manifest and that every published
file is byte-identical to the copy running on the box (`DEPLOY_MAP.txt`). A tamper control was run:
appending one line to a published file makes it print `DIFF` and exit 1.
`recovered/` still holds the older archive copies; `src/` is the working set.

## 2. Not in the repo, and why

| Input | Why | Where it is |
|---|---|---|
| Khanza SIMRS tree incl. `dist/SIMRSKhanza.jar` (md5 `25acbbbe0faa71bc16c5c9c83157451d`), `KhanzaSecurity16bit`, `lib/` | third-party application, 607 MB | export `simrs-khanza.tar.gz` (`docs/asset_export_20261023.md`) |
| `sik` and `sik_bench` dumps | clinical-style data, 25 MB each | export `db/*.sql.gz`; ledger hash after restore must be `356355:a66a3a54…` |
| DB password, Khanza AES key/IV | secrets | generated per box; the AES key is inside the Khanza jar (`EnkripsiAES`) and must never be committed |
| Export archives themselves | not in git | **owner to confirm durable storage before ~2026-11-20** (the box that holds the only copy ends then) |

## 3. Rebuild order on a clean box

1. Packages and trees, MySQL config, dumps, `benchmark@localhost` grants, `database.xml` re-encode:
   `docs/asset_export_20261023.md` ("Restore on the new box" and "Post-restore wiring").
2. `git clone` the repo; copy `tools/` to `/opt/Deers-Rock/tools/`, `src/consumer` and `src/harness`
   into the Khanza tree; `bash src/verify_published.sh` must print `ALL-MATCH`.
3. Compile the consumer/harness classes (as in the export; classpath notes in the asset-export doc).
4. Freeze: `sha256sum` the tools against `evidence/p12/r5_frozen_manifest_20261024b.sha256`, `chattr +i`.
5. Acquire the run lock, run `p12_rerun_chain.sh <session>`; expected end state is in
   `docs/khanza_benchmark_report_R5.md` §24.

## 4. What this does and does not establish

Establishes: the code that produced the evidence is public, hash-pinned, and identical to what runs;
the one fixture input is pinned by content. Does not establish: that a third party can rebuild from
the repo alone (the Khanza tree, dumps and secrets remain external inputs), nor that the rebuild
works on a clean box (not rehearsed).

## 5. Lessons of the clean-box rehearsal (P23; `docs/khanza_r5_cleanbox_rehearsal_report.md`)
1. **Disk precondition.** `tools/p14_edge_run.sh` stops with `STOP RULE: <NGB free` when `/` has less than N GB free; N is 20 by default. From P23 the threshold is `P14_MIN_FREE_GB` (a whole number; anything else is refused). A machine with a 20 GiB disk must set it (`P14_MIN_FREE_GB=8` was used on the InstaBox free machine, which has about 15 GB free in the chroot; the clone and stage tables need roughly 2 GB). Without it the C4 steps and every control that needs the clone do not run.
2. **Fresh outputs.** `p23_chain.sh` moves an existing `/opt/dr-benchmark/p23/chain` aside (`chain.prev_<UTC>`), writes `argv.txt` there (the exact command line) and asserts that the step-3 outputs and the newest oracle logs are newer than the chain start. A rebuilt box ships the source box's `p22/chain/` and `p15/runs/` from the archive; before P23 those stale files made 9 assertions pass without a C4 run.
3. **`verify_published.sh`** has a local mode: `BOX=local bash src/verify_published.sh` (no ssh).
4. **Rebuilding the OLD-byte directories from git** (the arguments 1 to 8 of `p23_chain.sh`): for each wave take `git show <commit>:khanza-r5/tools/<file>` (raw bytes) for every file in the matching `.bak_*` directory at the commit of the wave before: p15 `60b19c7`, p16 `3d96c96`, p17 `bb3a6d8`, p18 `a60b100`, p19 `63ef8ca`, p20 `9d91d80`, p22 `875d55a`, p23 `e61f604` (the P22 commit of `p14_edge_run.sh`). `SHA256SUMS` files inside `.bak_p16*` and `.bak_p17*` are not in git and are not used by any tool.
5. **Compile commands** (the export doc has none): in a POSIX-locale chroot `javac` needs `-encoding UTF-8`. Consumer: `cd /opt/simrs-khanza/consumer && javac -encoding UTF-8 -cp "$CP" KhanzaBillingConsumer.java PatchDbXml.java RetargetDbXml.java TestAES.java JdbcProbe.java MiniParse.java`; harness: `cd /opt/simrs-khanza/run-env/harness && javac -encoding UTF-8 -cp ".:shim:../../dist/SIMRSKhanza.jar:../../KhanzaSecurity16bit/dist/KhanzaSecurity16bit.jar" BilingHarness.java`; `EncodeAES.java` with `$CP`. `$CP` is the classpath of "Post-restore wiring" step 3. The rehearsal's eight classes came out byte-identical to the shipped ones; `JasperHeadless.java` needs jasper jars and is not used by the chain. Scripts: `evidence/cleanbox_rehearsal/scripts/wire.sh`.
6. **Uploading archives to an InstaBox machine from Git Bash:** set `MSYS_NO_PATHCONV=1` (otherwise `/data/...` becomes `C:/Program Files/Git/data/...` and the CLI reports `missing_parent` only after uploading everything), create the parent directory first, and split files above about 100 MB into parts (about 0.25 MB/s per stream; parts upload in parallel and a single 635 MB push has no resume), then reassemble and check `MANIFEST.sha256` on the machine.
7. **`JdbcProbe`** connects as `root` with an empty password and fails on a rebuilt box; the credential path is exercised by the suite instead. Not fixed.
8. **Grants:** see the correction in `docs/asset_export_20261023.md` (first `GRANT ALL ... sik` is wrong).
