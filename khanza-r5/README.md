# khanza-r5 — DR→Khanza E2E benchmark, R5/P5/P6 working set

Everything for the R5 fail-closed oracle work in one place. Previously spread
across `C:\Users\think\*.md`, `%TEMP%\opencode\`, `kaggle/deers-rock-assessment/`,
`Agentic Layer\qms\` and `self-harness\traces\`. Older R1–R4 run logs and CSVs
stay in [`../khanza-benchmark-asset/`](../khanza-benchmark-asset/).

| Folder | Contents |
|---|---|
| `tools/` | The deployed tools (source of truth; VPS copy is `/opt/Deers-Rock/tools/`): `sampled_real_form_diff_r5.py` (oracle), `dbutil.py`, `build_dr_charge_ledger_p2.py`, `charge_delta_per_component_p2.py`, `three_count_reconcile_p2.py`, `p6_acceptance_suite.sh`, `p6_run_suite_fresh.sh` (one command: fixture → suite → teardown), `p6_strata_recheck.sh`, `p6_smoke_a1.sh`, `p6_dbxml.py` |
| `tools/scripts/` | One-off R5/P5/P6 VPS probe/demo scripts (historical; not part of the pipeline) |
| `tools/kaggle/` | Astra task builders (`build_astra_task_r5.py`, `build_astra_task_r5p5.py`) and the v5 task source |
| `docs/` | R5 report, P5/P6 task docs, release manifest, Astra-r4 fix list, the 2026-10-15 session handoff |
| `evidence/` | Astra v5 output (43/100), P6 acceptance results pulled from the VPS, pre-deploy copies of the VPS tools |
| `records/` | Copies of the QMS verification records and pm1 traces (originals stay in their home repos) |

## Running on the VPS

Connection details live in `.vps.env` (gitignored; key at `~/.ssh/id_ed25519_dr_vps`).

```bash
. khanza-r5/.vps.env
scp $VPS_OPTS -P $VPS_PORT khanza-r5/tools/<file> root@$VPS_HOST:/opt/Deers-Rock/tools/
ssh $VPS_OPTS -p $VPS_PORT root@$VPS_HOST 'bash /opt/Deers-Rock/tools/p6_run_suite_fresh.sh'
```

`p6_run_suite_fresh.sh` builds the disposable `sik_p6f` fixture (~3 min), runs the suite
(~6 min) and always revokes the grant and drops the fixture afterwards.

**Keep everything here.** The old working folder `%TEMP%\opencode` was deleted by a temp
cleanup on 2026-10-16 (~1,790 files not gathered here are gone locally; many have copies
on the VPS under `/opt/dr-benchmark/` and `/tmp/`). Never treat a temp folder as storage.

Long runs: launch detached (`setsid nohup … &`) and poll the console log; an SSH
drop must not kill a run that has reset visits.

## Things that are easy to get wrong

- **The harness reads `setting/database.xml`, not `database.ini`.** Two copies
  (`/opt/simrs-khanza/setting/` and `/opt/simrs-khanza/run-env/setting/`), the
  DATABASE entry AES-encrypted. Retarget only with `tools/p6_dbxml.py
  retarget <db>` / `restore` (backup + round-trip verify). Editing
  `database.ini` leaves the form on live `sik`.
- **A scratch DB needs a `benchmark@localhost` DML grant** or the harness cannot
  connect (it then loops on error dialogs until the oracle timeout).
- **A billing run needs a prior `--freeze-only` pass** on the same RUN_ID/stage.
- **Fixture `sik_p6f`** = full `mysqldump` clone of `sik` + the 5 `STRATA-` reg
  rows. The older targeted `sik_p6` left 570 reference tables (e.g.
  `akun_bayar`) empty, so no visit could ever bill on it.
- **Clean visits must be DR-cohort visits** (`2026/10/01/8xxxxx`); the suite uses
  800085/800128, which billed `sukses=true` in the 2026-10-12 B3 run.
