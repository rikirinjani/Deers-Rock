# R5-P4 Release Packaging Manifest (D3, agent-runnable slice)

Date: 2026-10-14 UTC (P5 tool-SHA update 2026-10-15; P6 re-pin 2026-10-16) · Author: orchestrator (solo, no subagents)
Task: `C:\Users\think\khanza_r5_task_p4_agentblock.md` · Deliverable 5 of 6.

This is the agent-runnable part of D3: tag + pin + manifest. The DOI-Zenodo
archive is the human step (out of scope). The manifest below is the
reproducibility anchor — every runtime component is pinned by version and/or
SHA-256 so the benchmark is re-derivable without the original live box.

## Pinned runtime components

| Component | Pin | Value |
|---|---|---|
| Khanza SIMRS jar | SHA-256 | `34b0d77e3a37243075cdac6321802e886580557c8e3ae0d3f72153332d8a829d` (`/opt/simrs-khanza/dist/SIMRSKhanza.jar`) |
| JDK | version | OpenJDK 17.0.20.1 (2026-08-18) |
| MySQL server | version | 8.0.46-0ubuntu0.24.04.4 |
| MySQL client / mysqldump | version | 8.0.46-0ubuntu0.24.04.4 |
| Canonical B3 encounter set | SHA-256 | `84991ca4b143ada732c3679e991b5ab6edb5de52699c4e8695d45f551fab7b08` (285,126 lines, 86,101 visits; re-derived in P4-D2) |
| DR ground-truth ledger | rows / amount | 356,355 rows / Rp 34,870,243,633 (P2 builder output, byte-for-byte reproducible). A stray `STALE-TEST-KEY` test row (356,356 / …634) found 2026-10-16 was removed; verified back at the pin (R5 §16) |
| Live billing snapshot | rows / amount | 1,464,593 rows / Rp 34,895,128,580 |

## Pinned gate/oracle tool SHAs (the verification surface)

| Tool | SHA-256 |
|---|---|
| `sampled_real_form_diff_r5.py` (P5 fail-closed + P6-2a..g + P6-4 group kill/SIGTERM handler + verified restore/drop) | `ee74ceee62e81f9f0e391f2f92e1214a0998dad38939a222b9f4f94069fdd65c` |
| `dbutil.py` (P5-5b split + P6-3 `session()` single-session transaction; `query/scalar(force_root=)`) | `f85958b4213e43db34bfd7a09089b094334b21312ec68a19692553a9d88f40b0` |
| `charge_delta_per_component_p2.py` (P2 + P4 line-diff; §17 `--window ALL` = whole DR cohort) | `584e36c57e467e46f9cf3e7e3f7b8a923960fd5c811ee17073d10d8d4e63c753` |
| `three_count_reconcile_p2.py` (P2 independent B; §17 `--window ALL` = whole DR cohort) | `9ff4396cde9db8aa4f71b6702467a934741293a04a640ce14ba06b14a2c2f436` |
| `build_dr_charge_ledger_p2.py` (P6-3 single-session cohort replace; tax from in-build subtotals; §17 ALL scope) | `7f6e79c41bed6f85a86c0c378dc5da247194e44497d358435cdac14b1beff727` |
| `p6_acceptance_suite.sh` (P6 18-check suite) | `a2212fdcd62405bf96851ee6f386241786c0af377c0dec2867677c6a122b0f91` |
| `p6_dbxml.py` (verified `database.xml` retarget/restore) | `469c698e01fb95eba09714e78de096eaa4625fc47814c4055743a6973c0225a9` |
| `p6_run_suite_fresh.sh` (one-command fixture build → suite → teardown) | `d11cd16f5f17508aa6cd645f6606d071357f2052c5afeb99ad3bc4afcbba851e` |
| `p6_strata_recheck.sh` (§17 edge-strata re-check on a verified target) | `1fdc29cbec027131021b34ea5787b8508686fdb2276ebd27a02d52703b191e7b` |

> §17 (2026-10-16, later the same day) re-pins the two gate tools and the builder after the
> `--window ALL` fix (gate pins `84604d95…` / `01abcb72…` and builder `57a0adbc…` superseded).
> Ledger reproducibility: a full `--window ALL` rebuild from source into a scratch copy
> reproduces all 356,355 keys and every amount and unit price of the pinned ledger; it differs
> in one quantity (the pinned row 2026/10/01/000298 drug is wrong, 23 vs 25) and in
> `source` labels (260,800 pinned rows carry NULL from an older builder). "Byte-for-byte" now
> holds for keys/amounts/prices, not for the whole row. See R5 §17.
>
> P6 (2026-10-16) supersedes the P5 pins `70f37ba3…` (oracle), `7ce404a1…` (dbutil) and
> `6f81ec1f…` (builder). **Pin drift found:** at the start of P6 the VPS carried none of
> those — it had an intermediate P6 build (`785beb35…`, `a1a3f701…`, `d0b79425…`, copies
> in `evidence/vps_predeploy_20261016/`), so the P5 pins did not describe the deployed
> tools. Local (`khanza-r5/tools/`) and VPS (`/opt/Deers-Rock/tools/`) hashes were
> verified identical after every P6 deploy. See R5 report §16.

> P5 (2026-10-15, first pass) replaced the pre-P5 oracle SHA `8b69eec0…` and builder SHA
> `8b23c549…`. The v5-validation pass (same day, after the Kaggle validation model caught two
> evidence defects — the STRATA CSV emitted zero rows for FAILED batches, and the drift demo
> had exited 1 via an uncaught CREATE-privilege traceback rather than the exit contract)
> re-patched the oracle: per-visit rows for non-BILLED batches in the result CSV/MD, the
> P5-5b DDL/DML privilege split (stage-table CREATE/DROP as root via dbutil `force_root`,
> all DML on the benchmark user; `DBUTIL_FORCE_ROOT=1` routes every op to root for
> scratch-clone runs), and stage-backup failure marked FAILED + stop. Current oracle SHA
> `70f37ba3…`, dbutil SHA `7ce404a1…` (newly pinned). See R5 report §15.

## Determinism seeds
- Master seed: `20261012`; per-day RNG key: `md5("<seed>|<date>|<rate-mode>")[:16]`.
- Mutation-test seed: `20261012` (1,464 random billing rows).
- B1 encounter-set replay hash: `75889b60…4ca0d` (R4); B3 encounter-set hash:
  `84991ca4…` (P4-D2, newly archived).

## Source provenance
- Khanza jar: `dist/SIMRSKhanza.jar` (git `722b82e` per the harness docstring — the
  compiled class version the harness drives; jar SHA-256 above is the authoritative
  on-box binary pin).
- DR/adapter/consumer: the on-box `/opt/Deers-Rock` tree is not a git checkout; the
  tool SHAs above are the reproducibility anchor. The local research repo
  `C:\Users\think\Project_v2\Deers-Rock` is at commit `257e05fc1661f953b967f089e363edc0805c9cc1`
  ("docs: Khanza DR scaling study — 3d to 1yr results").

## Honest limitation
- No DOI-Zenodo archive (human step, D3 remainder). The manifest + pinned SHAs let a
  third party reproduce the *gates and oracle* given the Khanza jar + DB schema; the
  raw 12-month DB images are too large to pin by hash and are the human-archival
  responsibility.
- The P4-E2 burst found the consumer ceiling is ~1,802 v/min (warm) / ~916 v/min
  (cold scratch), so a 5× burst is not a provided headroom (see P4-E2 evidence).
