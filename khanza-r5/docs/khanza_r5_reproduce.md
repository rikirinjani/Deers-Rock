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
