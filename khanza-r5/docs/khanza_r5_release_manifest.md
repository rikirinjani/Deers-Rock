# R5-P4 Release Packaging Manifest (D3, agent-runnable slice)

Date: 2026-10-14 UTC (P5 tool-SHA update 2026-10-15; P6 re-pin 2026-10-16; P8 re-pin 2026-10-18) · Author: orchestrator (solo, no subagents)
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
| DR ground-truth ledger | rows / amount / content | 356,355 rows / Rp 34,870,243,633 · content SHA-256 `a66a3a546cc322d3eca31f2bc5558993e183b1c5afbf444d4a2a3781cfe7aea7` (rows ordered by no_rawat, component, code; `\|`-joined). **Rebuilt 2026-10-17 (P7 §5 option A, owner-approved)** from live `sik` with the pinned builder `7f6e79c4…` `--window ALL`; identical to a scratch rebuild of 2026-10-16, i.e. reproducible. Superseded content `d2b65d8e5c4d5d07abbcf915a9c2cf5603ec8e9f608e0ce0883d6a9542509f12` kept as `sik_bench.dr_charge_ledger_bak_20261017` (diff: 1 quantity 23→25 on 2026/10/01/000298 B000000240, 260,800 `source` NULL→filled; 0 key/amount/unit-price changes). `charge_delta --line-diff` now PASS on both windows. |
| Live billing snapshot | rows / amount | 1,464,593 rows / Rp 34,895,128,580 |

## Pinned gate/oracle tool SHAs (the verification surface)

| Tool | SHA-256 |
|---|---|
| `sampled_real_form_diff_r5.py` (P5 fail-closed + P6 + P7 + P8: unreadable/foreign hash file fails closed; resume proves no writer before restoring (`WRITER-ALIVE` otherwise); `--retry-failed`; no `crash_safe` field) | `2aa3ef22cea42cdd2f79a2351a410ccaf3f452d0e3705e17c410428f87d9f6d8` |
| `dbutil.py` (P5-5b split + P6-3 `session()` single-session transaction; `query/scalar(force_root=)`) | `f85958b4213e43db34bfd7a09089b094334b21312ec68a19692553a9d88f40b0` |
| `charge_delta_per_component_p2.py` (P2 + P4 line-diff; §17 `--window ALL` = whole DR cohort) | `584e36c57e467e46f9cf3e7e3f7b8a923960fd5c811ee17073d10d8d4e63c753` |
| `three_count_reconcile_p2.py` (P2 independent B; §17 ALL scope; P7 exit contract (0 for PASS/PARTIAL) + working `--verify-form-save`; P8 Decimal half-up for paid sums) | `3f6ca5203b20e8c04b810191ecb5b3112091750e7e8ef0646ba598adab740fcf` |
| `build_dr_charge_ledger_p2.py` (P6-3 single-session replace; §17 ALL scope; P7 exact integer tax `(s*11+50)//100`; P8 delete scope = window AND cohort, Decimal half-up `irup`) | `736506c3c9d3093cc5a71a2ff7b020ae4c5db4e26ef387806d28916d17ffbbab` |
| `p6_acceptance_suite.sh` (P8: 29 checks incl. A10d/A10e/A17/A18a/A18b/A19/A20/A21; per-property summary; archives earlier results; refuses a live fixture) | `fc53f8ebe617caf98d970240b4010fa6bc83b9e28cfc6660539993c102af1ae2` |
| `p6_dbxml.py` (verified `database.xml` retarget/restore) | `469c698e01fb95eba09714e78de096eaa4625fc47814c4055743a6973c0225a9` |
| `p6_run_suite_fresh.sh` (one-command fixture build → suite → teardown) | `d11cd16f5f17508aa6cd645f6606d071357f2052c5afeb99ad3bc4afcbba851e` |
| `p6_strata_recheck.sh` (§17 edge-strata re-check on a verified target) | `1fdc29cbec027131021b34ea5787b8508686fdb2276ebd27a02d52703b191e7b` |
| `p7_ledger_rebuild.sh` (live ledger backup + rebuild + gates, owner-approved) | `6a9233d6d0778fd98fd9bf002e770f69f8d8c4910310eed6c8dfe7201f168d03` |
| `p7_write_provenance.sh` (audited form run: who writes billing) | `70f3f1fbcd6927421d4bdec4c115c585489d2461a5c0fd6c9a4fcd4fd60d9f1c` |
| `p7_tax_rule_check.py` (consumer vs integer tax rule over all subtotals; P8: exits 1 on any defect, detects duplicate tax rows, `--db`) | `049e76809111038971140139404061db73d913db42272d95f866862a1e453c0f` |
| `p8_recovery_unit_test.py` (P8 recovery decisions with the DB mocked, 11 cases) | `a2d4c5068058fe3b66a47e497c1d692997d2f85bd2a5c6d7a0e2b9f65c94cbb6` |
| `p8_builder_all_check.sh` (P8 builder `--window ALL` into an empty scratch ledger must reproduce the live ledger) | `2200a40be3ec3e566cf96453f30d0aced03827c644e3fffac9562bc510552778` |
| `p7_three_count_contract_test.py` (three_count exit-code contract) | `3857538f01eb1a927e2d47e4ba3ab07e1b191450caec4430178c37862723466a` |

> P8 (2026-10-18) re-pins the oracle (`9bc6f79d…`→`2aa3ef22…`), three_count (`b0d5971f…`→`3f6ca520…`),
> builder (`84c49f0d…`→`736506c3…`), suite (`325b333a…`→`fc53f8eb…`) and tax check
> (`fd1a1ec2…`→`049e7680…`); adds `p8_recovery_unit_test.py` and `p8_builder_all_check.sh`.
> Local (LF) and VPS hashes verified identical. The P8 builder reproduces the pinned ledger
> content `a66a3a54…` byte-identically. See R5 §19.
>
> P7 (2026-10-17) re-pins the oracle (`ee74ceee…`→`9bc6f79d…`), three_count (`9ff4396c…`→`b0d5971f…`),
> builder (`7f6e79c4…`→`84c49f0d…`) and suite (`a2212fdc…`→`325b333a…`). See R5 §18.
>
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
