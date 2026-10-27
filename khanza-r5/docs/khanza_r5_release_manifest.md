# R5-P4 Release Packaging Manifest (D3, agent-runnable slice)

Date: 2026-10-14 UTC (P5 tool-SHA update 2026-10-15; P6 re-pin 2026-10-16; P8 + P9 + P10 re-pins 2026-10-18; P11 re-pin 2026-10-19) · Author: orchestrator (solo, no subagents)
Task: `C:\Users\think\khanza_r5_task_p4_agentblock.md` · Deliverable 5 of 6.

This is the agent-runnable part of D3: tag + pin + manifest. The DOI-Zenodo
archive is the human step (out of scope). The manifest below is the
reproducibility anchor — every runtime component is pinned by version and/or
SHA-256 ~~so the benchmark is re-derivable without the original live box~~ *(P15 D1, 2026-10-26: overclaim withdrawn. The pins identify the bytes; they do not supply the Khanza tree, the DB dumps or the secrets, and no clean-box rebuild has been done. Correct claim: repeatable on the existing installation.)*

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
| `sampled_real_form_diff_r5.py` (P5–P10 + P11: complete source-content hash; transactional stage backup; quiet interval before a FAILED retry; writer exclusion on fixture restores with an atomic/fsynced marker and fail-closed recovery; pre-reset hash computed from the staged rows; RETRY-REFUSED clears the restored flag; per-batch restore state in the result file; test-only `R5_NEGCTL_*` switches, inert unless set) | `e2c1d2f9318724f329f560a8e60d15c93ad2916fcb3348601cca22b73d105ecc` |
| `dbutil.py` (P5-5b split + P6-3 `session()` single-session transaction; `query/scalar(force_root=)`) | `f85958b4213e43db34bfd7a09089b094334b21312ec68a19692553a9d88f40b0` |
| `charge_delta_per_component_p2.py` (P2 + P4 line-diff; §17 `--window ALL` = whole DR cohort) | `584e36c57e467e46f9cf3e7e3f7b8a923960fd5c811ee17073d10d8d4e63c753` |
| `three_count_reconcile_p2.py` (P2 independent B; §17 ALL scope; P7 exit contract (0 for PASS/PARTIAL) + working `--verify-form-save`; P8 Decimal half-up for paid sums) | `3f6ca5203b20e8c04b810191ecb5b3112091750e7e8ef0646ba598adab740fcf` |
| `build_dr_charge_ledger_p2.py` (P6-3 single-session replace; §17 ALL scope; P7 exact integer tax; P8 delete scope = window AND cohort, Decimal half-up; P10 a NULL/empty/non-numeric amount fails the build) | `2a4a1c48b6ee1423626a9988f6d505a94fd8802d5b639b492f19fead2ee22234` |
| `p6_acceptance_suite.sh` (P10: 39 checks incl. A26–A29, A31; `P10_INJECT` for the preservation check. P11: discriminating A28'/A31'/A22b extensions, pre-operation snapshot in `P10_INJECT`, `P11_ONLY` selective mode) | `7ecb20ef7bdcf615bbf832c6d3f48c05fde05b8eafa581a515d53e20e5ab5365` |
| `p6_dbxml.py` (verified `database.xml` retarget/restore) | `469c698e01fb95eba09714e78de096eaa4625fc47814c4055743a6973c0225a9` |
| `p6_run_suite_fresh.sh` (one-command fixture build → suite → teardown; P9: keeps the fixture when the suite fails, `--teardown-kept`; P11: forwards `P11_ONLY`/`R5_NEGCTL_*`/`P11_FORCE_FAIL`; 2026-10-24: refuses with exit 3 without the run lock; P12: STRATA dump pinned by sha256, refuses otherwise) | `39979e3c3e0f790724dff0d24bf3d8d12c5b8cc4b04a29506c8820a7669e924a` |
| `p6_strata_recheck.sh` (§17 edge-strata re-check on a verified target) | `1fdc29cbec027131021b34ea5787b8508686fdb2276ebd27a02d52703b191e7b` |
| `p7_ledger_rebuild.sh` (live ledger backup + rebuild + gates, owner-approved) | `6a9233d6d0778fd98fd9bf002e770f69f8d8c4910310eed6c8dfe7201f168d03` |
| `p7_write_provenance.sh` (audited form run: who writes billing) | `70f3f1fbcd6927421d4bdec4c115c585489d2461a5c0fd6c9a4fcd4fd60d9f1c` |
| `p7_tax_rule_check.py` (consumer vs integer tax rule over all subtotals; P8: exits 1 on any defect, detects duplicate tax rows, `--db`) | `049e76809111038971140139404061db73d913db42272d95f866862a1e453c0f` |
| `p8_recovery_unit_test.py` (P8–P11 recovery decisions with the DB mocked, 33 cases: malformed/valid/crash marker, old fail-open path by monkeypatch, stage-vs-live hash agreement) | `73b6468f1bfb7bbbbb2485b9039aa0ad2140e2f2df54e16bb2e557fa24890299` |
| `p10_hash_state.py` (P10 independent hashes: stage tables, sample, protected visits, live sik; P11: a missing table, NULL checksum or empty inventory is an error with a non-comparable `ERROR:<table>` value, strict `--stage-tables-list` inventory assertion) | `d59b18fb4bc3c92a6e9373c4104739fd1ef9f60f3ab126ea385628889a559daa` |
| `p10_preservation_check.sh` (P10 integrated recovery-preservation experiment through the wrapper; P11: pre-operation baseline with separate (a)/(b)/(c) assertions, asserted perturbation row count, EXIT trap, keep-on-failure, `P11_FORCE_FAIL`) | `e5d39756de395966d34e8379800650909906698457b7b0901826ff9b88125678` |
| `p11_negative_controls.sh` (P11: runs each check twice, with and without its `R5_NEGCTL_*` switch, and exits 0 only if every NC is DISCRIMINATING; 2026-10-24: refuses with exit 3 without the run lock) | `e65238ca495aa155352524f459648112785437bc344354b1622fc6f6464ae9c5` |
| `dr_runlock.sh` (2026-10-24: VPS run lock `/opt/dr-benchmark/LOCK`; `acquire`/`status`/`release`; sourced by the wrapper and NC driver) | `5393989e2a0990ab0d3ff38b298cf884b7e22987223461edaf341f069c971b4d` |
| `runlock_negctl.sh` (2026-10-24: run-lock negative control on the fixture, 9 checks; exits 0 only if all hold) | `6447f55478c67e2bd67942f793b66904931089e9caee9b1abe947480292cbdbc` |
| `p12_perencounter_reconcile.py` (P12: read-only per-encounter A/B/C reconciliation over the DR cohort and the R4 sample; `P12_*_DB` test overrides) | `a418916c142f274f3cc645106fc2a1bb03364b2a508f8bda230f1ea7997ce2bd` |
| `p12_reconcile_negctl.sh` (P12: plants +1 in a scratch ledger copy, asserts the plant took effect, requires exit 1 and the planted encounter reported) | `d51492f3de31ca830f7399315d207776ccad2aeac9cd46d485dbec8a2070e3ba` |
| `p12_visit_replay.sh` (P12: re-runs the real form for ONE visit on an audited throwaway clone and prints baseline vs after-form payment and totals; needs the run lock; not in the frozen set) | `4f5d42900f7ca41341ad9a0f099c66ef87ac290d7eee43c5697c3fcd73f85e28` |
| `p12_rerun_chain.sh` (P12: one-lock evidence chain: frozen check, suite, preservation, unit, builder, NC, lock NC, reconciliation, live proof) | `c5eeb67224ca17d65e642fed54e06f4e6bc369076ef7b371415bd9edfbd22bf6` |
| `stagea_common.py` (published from the box, no secrets; see `docs/khanza_r5_reproduce.md`) | `4b94f3c877d1274d99424101ec3c0182008790b9039a11033f60bd4018a4b9ad` |
| `p8_builder_all_check.sh` (builder `--window ALL` into an empty scratch ledger must reproduce the live ledger; P9: exits 1 on a difference, `P9_PLANT_MISMATCH` test hook) | `4d9118a586605e02f53d80a91f7b7ff797977e51157a4b19a53c93342bb96878` |
| `p9_terminal_path_check.sh` (P9: forced real-check failure through the wrapper → exit 1, fixture kept, then `--teardown-kept`) | `63f4dcc45692a93ca7c8cf4eaea317f478dc51558126b2a06e10d5c4c4223372` |
| `p7_three_count_contract_test.py` (three_count exit-code contract) | `3857538f01eb1a927e2d47e4ba3ab07e1b191450caec4430178c37862723466a` |
| `p13_draw_sample.py` (P13 T1: SELECT-only deterministic stratified sampler; `random.Random(20261024)`; `--verify` negative-control mode) | `ec28a18ea6ca6de79b9e8ad6b00455ccb67b28b0f05dd72fa5155454d669ed0a` |
| `p13_wide_sample.sh` (P13 T2: run driver — builds `sik_p13w` clone with 8 audit triggers, retargets `database.xml`, runs oracle freeze+form, restores xml, keeps clone for comparator; EXIT trap restores on every exit) | `da013ebef95ea52eb988a6288e99b64cd287717c9badc91499c29487463d64cf` |
| `p13_sample_compare.py` (P13 T3: per-encounter A_form/C/B/fresh-B comparator, batched queries, SELECT-only; exit 0 = all equal, 1 = differences in CSV) | `fbded01ffdc3e764ff7faae60fd36295c7e5999b81c86b26912405812d296bb0` |
| `p13_drop_clone.sh` (P13: drops the `sik_p13w` clone after the comparator; revokes the benchmark grant, restores xml, drops the DB; needs the run lock) | `93a77adbdf95e1522a02fbd0a51ecde631ca7362bbc70ceb7bd4403170c35488` |
| `p13_compare_negctl.sh` (P13 T3 NC: scratch-copy plant test — +1 on one billing, +1 on one payment, ROW_COUNT()=1 asserted; DISCRIMINATING when exit 1 names both plants) | `bc6f28f9358c1a420546477d267666ae5dc9afaac2b41a3a499872f5c07cf7e3` |
| `p13_kill_test.sh` (P13 T2 kill-test driver: starts a 5-visit pilot, SIGTERMs the driver mid-run, asserts clean post-kill state: xml on sik, no grant, no marker, clone not half-state) | `26e8df4d87f22d949108d6b67f47cbf9619f339f75bb6a0992ee5e4cc221322e` |

> 2026-10-25 (R5 §25, P13) adds the six P13 tool pins above; frozen set of 21 files: `evidence/p13/r5_p13_frozen_manifest_20261025.sha256` (the 15 P12 files + 6 P13 files, new files only in the P13 manifest). P13 wide-sample evidence: `evidence/p13/` (stage 0/1/2 driver + oracle + comparator, sampler, both NC transcripts, kill test, live-state proof).

| `p14_t0_discovery.sh` (P14 T0: SELECT-only discovery (schema, DR cohort shape, tariff groups, name collisions)) | `c6b29dd3fca31b1f2fcb8a2ad5cdaf2940031fcbad327d20aff4335e24272d47` |
| `p14_live_state.sh` (P14: SELECT-only live-state proof (databases, xml, markers, grants, ledger hash, fixture rows in live, frozen sets, lock)) | `32c0faad259f0386149d883cca5c10a8bd0e6e5e3e1995490741bdbc059dabcb` |
| `p14_edge_fixture.py` (P14 T1: deterministic B3 edge-strata fixture author (27 visits, 8 strata, predicted form/ledger lines and expected deltas); `--verify` NC mode) | `da1018b5623dba198d5bfc3b00f39dd1d776bf8a71f98601e24f061966094f7b` |
| `p14_fixture_split.py` (P14 amendment: splits the verified fixture into main + late SQL (fractional-jml visits loaded after the ledger build)) | `bf2ffae77d302d62624149ce4c628e6d4a2219f0b61c054496bc78aef71ecc63` |
| `p14_edge_run.sh` (P14 T2: run driver (clone `sik_p14e`, 8 audit triggers, fixture load, dr_tariff copy, env-guarded frozen builder, ENC-only consumer baseline, oracle fixture `--allow-strata` + optional real run, EXIT trap)) | `8988972cab856f0e4f1d2f55bacdd36b02e46af500e806b682cdd38ffc4bc5ae` |
| `p14_line_identity.py` (P14 T3: per-encounter charge-line identity comparator (name/ctx mapping, EQUAL/EQUAL-CTX/DIFFER/UNMAPPED/AMBIGUOUS, component deltas, B, fresh-B, `--expect`)) | `9fdfa3f94f1b0661cbeb7da5517ed2f771a1e64ba7304f43aca1127d02f72f82` |
| `p14_line_negctl.sh` (P14 T3 NC: same-price code swap, qty/unit with same amount, collision rename on a verified scratch copy; ROW_COUNT()=1 each) | `2702d02711c88ec501da8148213e8a2e60e78d6de33d843463c3caf35bd295d3` |
| `p14_kill_test.sh` (P14 T2 kill test: SIGTERM to the driver's process group during the real form run; asserts clean post-kill state) | `5ff662e37bd8256a990208b129e66d30ed5fbeff50ebb9f5f62c4e57970d6a4c` |
| `p14_drop_clone.sh` (P14: drops `sik_p14e`/`sik_p14n` only; restores xml, revokes grant; needs the run lock) | `e498eb2781586ee30136d1826459a1f0bd4fb13ee1bd1055e898f0eca45f58f1` |
| `p14_t1_negctl.sh` (P14 T1 NC: planted live visit and planted `sik.` SQL line, `--verify` must exit 1 naming each) | `71cba69e92dd6f4eeef2a25c4ea57a4f5499c5f757862e43b2c84b8dba82659e` |
| `p14_post.sh` (P14 post chain: T4 fixture comparator, T3 NC, T5 real-300 line identity, teardown, final live state) | `33ef1eda2dc08e72ef123e6d9a2727313126c4ec4a206b54fe5d5c8120a7a584` |
| `p14_nc_rerun.sh` (P14: fixture-only rebuild + NC rerun after the scratch-copy fix) | `b0fb14ae7ed4b60cda8e3de7442c2eaf337072f9ca9631da0fdd9f3cea53cbb0` |

> 2026-10-26 (R5 §26, P14) adds the twelve P14 tool pins above; frozen on the box (`chattr +i`, `sha256sum -c` 12/12 OK): `evidence/p14/r5_p14_frozen_manifest_20261026.sha256` (P14 files only; the 21 P12+P13 files stay under their manifests, 15/15 and 6/6 OK before and after P14). P14 evidence: `evidence/p14/`.

| `sampled_real_form_diff_r5.py` (P15) | `1bd83aa8cadfcfc19e89d48c36dea317ea6553cf4ac52f796dce3891d7044b31` |
| `p6_acceptance_suite.sh` (P15) | `6a071595c45bcf660ead21bd9f98e9bd6d7b9c169894aff16aeceac061d05d95` |
| `p10_preservation_check.sh` (P15) | `75b91bccb14f55f977634894cc72bec81e7da5a38f0a100debd7982f45d401dc` |
| `p8_recovery_unit_test.py` (P15) | `767b6fba96b1e4afcd01823fae799f1ea929ebe8b68f9525f79eb50258e212ed` |
| `p11_negative_controls.sh` (P15) | `f116ee53ed511dfa56b9ae4446adf4a938a5464f276899e1eda3b845c4d55173` |
| `p12_perencounter_reconcile.py` (P15) | `56f55ee268c45de6134508f0b45f2b023bfd71131ec5c372511a52fc192988c1` |
| `p13_wide_sample.sh` (P15) | `e72c5be3ecdef1415da4f20ece98d3708360f4c2325ec2ce3d40dbdaae9b5c73` |
| `p13_sample_compare.py` (P15) | `5c11b900b58e583543460804314f8b7247e74f28d049bbfe435e9c9baf705936` |
| `p13_kill_test.sh` (P15) | `7e0a566562bf6d279ac1ef423aed87142b6ebf6f4fa675ce06ef716bce3f4008` |
| `p14_edge_run.sh` (P15) | `57649869f47eb121f2337442f11ec073623c7e2a217be8309eba026855dfa770` |
| `p15_lib.sh` (P15) | `53f4682e6939dd5804e3c4053aef7dcba74807058335a263963dda82553c0cf0` |
| `p15_lib_test.sh` (P15) | `a9195de37e75303bbe34b59f7c760a114b3e3f7b85ac0380c4cd407d7d5deff2` |
| `p15_line_identity.py` (P15) | `f4f6a0f523256fd2da63536f6a8a061c587b8d088ed2b41405e7289947df7046` |
| `p15_line_negctl.sh` (P15) | `2420c101ade0f2691630450eba70eda7047e1e725fe08ffbea44f831ba199134` |
| `p15_a_negctl.sh` (P15) | `081325a3d358816d43fb90f301b878b2e725e66123a3bb8a2e24f4ea077ea070` |
| `p15_b6_negctl.sh` (P15) | `7b22021692754e0e5fbe371d87511bbdecd1e7709f4a338eb1744827fd8b057a` |
| `p15_chain.sh` (P15) | `6e3689badc3b54f069746d4abfc0af27c5bac6e314fd0ca4d5a2915daa1952bf` |
| `p15_chain_e.sh` (P15) | `35654e4886fbdcda1953296fa4a7caee4cba4e0556c2a78fe62a1e55e6dab0c2` |

> 2026-10-26 (R5 §27, P15) re-pins the 10 changed files above and adds 8 new ones; frozen on the box (`chattr +i`, 18/18 OK): `evidence/p15/r5_p15_frozen_manifest_20261026b.sha256` (manifest a, 17 files, kept as history). Where a file appears in an earlier pin row, **this row supersedes it** for evidence after P15; earlier evidence stays bound to the bytes it names (originals in `.bak_p15_20261026/` on the box).

> 2026-10-24 (R5 §23) re-pins the wrapper (`0865400d…`→`6967805d…`) and the NC driver (`0bba1931…`→`e65238ca…`) and adds `dr_runlock.sh` and `runlock_negctl.sh`; frozen manifest `evidence/runlock/r5_frozen_manifest_20261024.sha256`.
>
> 2026-10-24 (R5 §24, P12) re-pins the wrapper again (`6967805d…`→`39979e3c…`, STRATA pin) and adds the four rows above; frozen set of 15 files: `evidence/p12/r5_frozen_manifest_20261024c.sha256`. Published sources: `src/PUBLISHED.sha256`.
>
> P11 (2026-10-19/20) re-pins the oracle (`c3bdd2d6…`→`e2c1d2f9…`), suite (`8b89d431…`→`7ecb20ef…`),
> wrapper (`2e6097be…`→`0865400d…`), unit test (`345bc6ae…`→`73b6468f…`), `p10_hash_state.py`
> (`8bf6c811…`→`d59b18fb…`), `p10_preservation_check.sh` (`7d05ef23…`→`e5d39756…`) and adds
> `p11_negative_controls.sh` (`0bba1931…`). Builder, dbutil, three_count and tax check unchanged.
> Local (LF) and VPS hashes verified identical for all seven. The P11 builder still reproduces the
> pinned ledger content `a66a3a54…` byte-identically. See R5 §22.
>
> **The P11 pins were frozen before the final required runs.** Earlier P11 values — suite
> `3375e681…` then `3559e5ce…`, preservation `9c0e8f3a…` then `8de03df0…`, NC script
> `16097c08…` — were superseded during the day and are **not** reproducible artifacts: those
> bytes no longer exist, so runs made against them cannot be bound to this manifest. The seven
> frozen files carry `chattr +i` on the VPS and are snapshotted with a `FROZEN.sha256` manifest
> (`/opt/Deers-Rock/tools/p11_frozen_20261019/`); every required run re-executed after the freeze
> verifies `sha256sum -c FROZEN.sha256` before and after. A second agent session shared this
> working tree and the VPS during P11 and rewrote the tools mid-run; that is recorded in
> `records/failures/20261019T2135Z-process-r5-p11-concurrent-writer-evidence-unbinding.json`
> and is why the pins, not the run order, are the reproducibility anchor.
>
> **Final P11 run (2026-10-20T07:32Z).** After the `ensure_fx` stale-fixture fix the NC script was re-deployed (`0bba1931.`) and run once, uncontended: 5/5 DISCRIMINATING, exit 0, fixture dropped (`evidence/p11/r5_p11_negative_controls_20261020T073218Z.md`). The seven files were then re-frozen (`chattr +i`) and re-hashed: `evidence/p11/r5_p11_frozen_manifest_20261020T0739Z.sha256`, `sha256sum -c` OK, local (LF) == VPS for all seven.
>
> P10 (2026-10-18) re-pins the oracle (`8e0cca5b…`→`c3bdd2d6…`), builder (`736506c3…`→`2a4a1c48…`),
> suite (`9ae16c46…`→`8b89d431…`) and unit test (`3bda6882…`→`345bc6ae…`); adds
> `p10_hash_state.py` and `p10_preservation_check.sh`. The P10 builder reproduces the pinned
> ledger content `a66a3a54…`. Local (LF) and VPS hashes verified identical. See R5 §21.
>
> P9 (2026-10-18) re-pins the oracle (`2aa3ef22…`→`8e0cca5b…`), suite (`fc53f8eb…`→`9ae16c46…`),
> wrapper (`d11cd16f…`→`2e6097be…`), unit test (`a2d4c506…`→`3bda6882…`) and builder check
> (`2200a40b…`→`4d9118a5…`); adds `p9_terminal_path_check.sh`. Builder, three_count and tax check
> unchanged. Local (LF) and VPS hashes verified identical. See R5 §20.
>
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
  raw 12-month DB images ~~are too large to pin by hash and~~ *(P15 D2: size is not a reason; a 25 MB dump hashes in under a second. They are unpinned because they are not archived yet)* are the human-archival
  responsibility.
- The P4-E2 burst found the consumer ceiling is ~1,802 v/min (warm) / ~916 v/min
  (cold scratch), so a 5× burst is not a provided headroom (see P4-E2 evidence).

| `p10_preservation_check.sh` (P16) | `a197308eb89b712d8e46498a3965f27eaa14134a256973bef7e8b33044206820` |
| `p13_sample_compare.py` (P16) | `8c72b6f6390e0411d180d0e744dbaf5f11e2e8f0bf92e3fa61c6aefa80eeab90` |
| `p15_lib.sh` (P16) | `49bae7fb5c104de78943a20b5a2989d5b338fb04867ddaae99532fa656000d83` |
| `p15_lib_test.sh` (P16) | `77122517c4f004ffe65b522db5b8d8d3a0a4800ca77cef76e1445a31e3707bfa` |
| `p15_line_identity.py` (P16) | `d063cf8b8d6b0a8a237749eae1381a3c58266d9e3e2c9cef32178598f5afee42` |
| `p15_line_negctl.sh` (P16, fix 1) | `401e4aced487cf45c86e46dc6a4849624c94992c2a7ecfd8ae0fdb22565e5fb2` |
| `p15_b6_negctl.sh` (P16) | `5e4af38f662718b9c1f3a8353acc56a6316fee873e371e0a1a9ac485149924ff` |
| `p6_acceptance_suite.sh` (P16) | `35de05bb346bf842fed32d4a876052b0abf0c1dacf8f4112838ffd50b1107d4e` |
| `p16_a_negctl.sh` (P16) | `b68e2343308df5819a11f1fe669c9dc68a1d213764480a915491866fbe20f8a0` |
| `p16_e_negctl.sh` (P16) | `5d21f2dab59ac92110161e77a84c7d6cf8bd6f2214f4e832d4a570c28363ad29` |
| `p16_chain.sh` (P16) | `586eb3757db043b96f613bf7d293d2cdaf380d94cce413080adaf96c39d7bc9b` |
| `p16_chain_b.sh` (P16) | `fd59399c86f2b61087e2482bfd3bf5ce73bca2a9606595fd3c3513c294f94f08` |

> 2026-10-26 (R5 §28, P16) re-pins the 8 changed files above (supersedes the P15 rows of the same names) and adds 4 new ones; frozen on the box (`chattr +i`, `sha256sum -c` 22/22 OK, `lsattr` `i` on 22/22): `evidence/p16/r5_p16_frozen_manifest_20261026b.sha256` (manifest a, 21 files, kept as history; only `p15_line_negctl.sh` and the new `p16_chain_b.sh` differ). Originals: `.bak_p16_20261026/` and `.bak_p16fix1_20261026/` on the box.

| `p15_lib.sh` (P17) | `6b928cb00dec7df40dcee01844a547905bd5b8d2a47f25246647c1c6312eba00` |
| `p14_edge_run.sh` (P17) | `a2e333e005a82783a967e61edd62b3c242b3680f0df54cd841b3d82d3e27218f` |
| `p13_wide_sample.sh` (P17) | `fb9675328787f51b08e5ba1c0e20ed6b20e9b8a97e760832e55ec5a18344548b` |
| `p15_a_negctl.sh` (P17) | `13e6cc908f1ae7612a28902e4f41e87fc51e29d30530434e38688664a873498c` |
| `p6_acceptance_suite.sh` (P17) | `0a49143955d185f16ba17d6331d86851170ce6c522c816442b993c24c78f54e6` |
| `p10_preservation_check.sh` (P17) | `85157c7d3b672c370f4ce8924686866f29eb9e95d7919800b636852960689a0e` |
| `sampled_real_form_diff_r5.py` (P17) | `6620d8d06d8ed4f43cd6deda47b77413b3d0dd362c327095a12304a1ac80deec` |
| `p15_line_identity.py` (P17) | `164cb10d741fef4de63b5bfb589917115ce96a524cd0ad74c09414f65e73d9d2` |
| `p13_sample_compare.py` (P17) | `268441780197ffe5d49bc5b772d926307079a6ef2e056c35e3273423d3776b4a` |
| `p16_a_negctl.sh` (P17) | `15818aec02f34a1cb03f8a56cfb70bbf40712de5d424900a60df09f76ea80cc4` |
| `p16_e_negctl.sh` (P17) | `a4c3a0b5650c06b1e7fe6a5ba34ac8fc62c5bf198aeee0d935bf6ffbac204f00` |
| `p17_a_negctl.sh` (P17) | `3e329c6e4e9dcaac518ea4e0c10442e53a39c5c95dabdc1572fc90d55a195a42` |
| `p17_b_negctl.sh` (P17) | `750eeaefbb49d8ede811ee25f9c7c2aeb81f651dcb5b306d281d16f63f6d679c` |
| `p17_chain.sh` (P17) | `d4adb8e0dec219159873a7f38ccd59e302f8366ed68cd39b0b204f791a465f6c` |
| `p17_chain_b.sh` (P17) | `80e833a97a6ed329ecaf5fc41fb8b1e4f95e8e9c295df25a083aae508c7b2495` |
| `p17_c3_t0.sh` (P17) | `a8fb6ecee0e4700327977c0dd9f35954b1b449035ee657ae8d0e0bd1924982d6` |

> 2026-10-27 (R5 §29, P17) re-pins the 11 changed files above (supersedes the P15/P16 rows of the same names) and adds 5 new ones; frozen on the box (`chattr +i`, `sha256sum -c` 27/27 OK, `lsattr` `i` on 27/27): `evidence/p17/r5_p17_frozen_manifest_20261027b.sha256` (manifest a, 25 files, kept as history). `evidence/release_inventory.json` is the single machine-readable current inventory (47 tool files, each file with the pin of the newest manifest that names it and the sha256 on disk); generated by the read-only `tools/p17_release_inventory.py` (not box-frozen). Originals: `.bak_p17_20261027/` and `.bak_p17fix1_20261027/` on the box, byte-equal to git `bb3a6d8` (`evidence/p17/bak_equals_git.txt`).

| `p15_lib.sh` (P18) | `c24c05a1f3cf00167f2621495e62319f1c25dfa09999d451cfa06e2b5e0f6583` |
| `p6_acceptance_suite.sh` (P18) | `3b770d554c167a4a355b43816e11e0972f3a3f916a00be7de4bda559bcf8505a` |
| `p13_wide_sample.sh` (P18) | `ea1c3f2811d8afe6e63b89129f1cb91f1e4f1b4f2c4295522271888658a3aea6` |
| `p15_line_identity.py` (P18) | `ae2185e4f37d3b3c482391598e910deaf6b58a8ca353b677d321e706bde74ce2` |
| `p16_a_negctl.sh` (P18) | `70c9335b13517030512226f6fcaacf28dea8d0e78e3bd4db2bae933e2adfb277` |
| `p18_a_negctl.sh` (P18) | `ce95ad4a78ce266c5bb2723c3341e0e74dae6842798537e0a88ecbdfcdc7134a` |
| `p18_b_negctl.sh` (P18) | `afb7bdcf7c1194acf877ec54573e733e2cb8384dffeff4aa3b1f80745c0a931c` |
| `p18_chain.sh` (P18) | `ea38f574cf5de043131c045899e0ccce6e18ff77ac462c6afe02404fb8677cb6` |
| `p6_dbxml.py` (P18 pin only, bytes unchanged) | `469c698e01fb95eba09714e78de096eaa4625fc47814c4055743a6973c0225a9` |

> 2026-10-27 (R5 section 30, P18) re-pins the 5 changed files above (supersedes the P15-P17 rows of the same names), adds 3 new tools and pins `p6_dbxml.py` (first manifest entry; its bytes did not change); frozen on the box (`chattr +i`, `sha256sum -c` 31/31 OK, `lsattr` `i` on 31/31): `evidence/p18/r5_p18_frozen_manifest_20261027.sha256` (31 files; the P17 manifest b of 27 files is kept as history). Local = box by sha256 for 31/31 (`evidence/p18/local_eq_box_manifest.txt`). Originals of the 5 changed files: `.bak_p18_20261027/` on the box, byte-equal to git `a60b100` (`evidence/p18/bak_equals_git.txt`). `evidence/release_inventory.json` is regenerated by `tools/p18_release_inventory.py` (read-only, not box-frozen), now including the P13 manifest and failing when a manifest in its list matches nothing.

| `p15_lib.sh` (P19) | `5c1fa9837d2a49b1f1e1eb6800e6514173b12a6622f5fc3fa98fbec9d783162c` |
| `p14_edge_run.sh` (P19) | `a6e1ae200f3d5ba1d832093824a2e9766c2f729c4fad2cdb9affc84406a7299a` |
| `p15_line_identity.py` (P19) | `8c7a13a89dafa7ad8002b0de202bbff6be35b849b4c37315a85b3aea9ce14e57` |
| `p19_a_negctl.sh` (P19) | `3b1b93dc24f5cbccf5c5a99ab37a0296accfbb68bf3a29180b109320690384aa` |
| `p19_b_negctl.sh` (P19) | `49a5f063a04ddeeb74a437a4fb09bce241e99acb218966aac36a151f9e14ed51` |
| `p19_chain.sh` (P19) | `a43951c5e4b74a549870e2f5edf31e2e101f9c7c8dbbe778c1c35385274e18e2` |
| `p19_release_inventory.py` (P19) | `070dde148f12a8025e86f2fd881eedf674c07f4442877adf3e93076e08468e3b` |

> 2026-10-27 (R5 section 31, P19) re-pins the 3 changed files above (supersedes the P15-P18 rows of the same names) and adds 4 new tools; frozen on the box (`chattr +i`, `sha256sum -c` 35/35 OK, `lsattr` `i` on 35/35): `evidence/p19/r5_p19_frozen_manifest_20261027.sha256` (35 files; the P18 manifest of 31 files is kept as history). Local = box by sha256 for 35/35 (`evidence/p19/local_eq_box_manifest.txt`). Originals of the 3 changed files: `.bak_p19_20261027/` on the box, byte-equal to git `63ef8ca` (`evidence/p19/bak_equals_git.txt`). `evidence/release_inventory.json` is now the output of `tools/p19_release_inventory.py` run **on the box** (58 files, 8 manifests, 58 ok); the `--local` result is `evidence/p19/release_inventory_local.json`.

| `p15_lib.sh` (P20) | `2d93fad4f50e0e4840929eb57193c3046deb1aad013eed2522e5b55ff61ad371` |
| `p20_a_negctl.sh` (P20) | `a866204dc2dd48e9690aedea006a30d6285bf4e68f081f9aac199562cec45dbe` |
| `p20_b_negctl.sh` (P20) | `56694cfb541da4d27bdb03c0f396d5ce707d324f8a8d4f2205fd183580b45084` |
| `p20_release_inventory.py` (P20) | `994d240949ed2466d6a78b0230925fd7d1de018eb3ebfebdd338f6acd9c23922` |
| `p20_chain.sh` (P20, manifest b, fix-up 1) | `6975b5225141796deb7e8d33c9e6e31686ab838ffcfd749acb3147124ca4b385` |
| `p20_chain.sh` (P20, manifest a, superseded) | `cb1545dab180cccab0ce5395de7e96bcdc58a42353d3f91693dd8741b29706eb` |

> 2026-10-27 (R5 section 32, P20) re-pins `p15_lib.sh` (supersedes the P15-P19 rows) and adds 4 tools; frozen on the box (`chattr +i`, `sha256sum -c` 39/39 OK, `lsattr` `i` on 39/39): `evidence/p20/r5_p20_frozen_manifest_20261027b.sha256` (manifest b; manifest a, `…27.sha256`, differs only in `p20_chain.sh` and is kept as history; the P19 manifest of 35 files is kept). Local = box by sha256 for 39/39 (`evidence/p20/local_eq_box_manifest_b.txt`). Original of `p15_lib.sh`: `.bak_p20_20261027/` on the box, byte-equal to git `9d91d80`; original of `p20_chain.sh` (manifest a): `.bak_p20fix1_20261027/`. `evidence/release_inventory.json` is the output of `tools/p20_release_inventory.py` run **on the box** in chain b (62 files, 10 manifests, 62 ok).
