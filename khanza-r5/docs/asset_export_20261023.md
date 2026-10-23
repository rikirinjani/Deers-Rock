# DR asset export — 20261023T0633Z (UTC)

Built from the live benchmark VPS (source host). 692 MB total.

Excluded on purpose: `run-env/benchmark_pw` (DB password), `/opt/dr-benchmark/results/`
(1.3 GB of per-run outputs — evidence, not asset), and any `.env` / `.pem` / private key.
Verified: 0 credential files inside the three tarballs.

## Contents

| File | SHA-256 | Size |
|---|---|---|
| `simrs-khanza.tar.gz` | `0c99d418c3cec726384b0c3d22d0a2a685cca25ceae9e7982b53c39fb7ed5d6e` | 607 MB |
| `dr-benchmark.tar.gz` | `c35cee2466ff37d49079b3c7f3b2264f9908a878cc2f4a79d80cf2ee884e7a43` | 36 MB |
| `Deers-Rock-tools.tar.gz` | `8c086b3e919436cda50a73e879f2639aa360bfa5ac8908055d11aab14c976d93` | 655 KB |
| `db/sik.sql.gz` | `b8a2d87f6926ad40f436cf6e86a3e29444d4b4c1b4ccd33107c83a6f7d7f3508` | 25 MB |
| `db/sik_bench.sql.gz` | `08955de1c71a014a8e352997c25c6398ab03fe53ff18631ffb2a489f4b7e12d2` | 25 MB |

`simrs-khanza.tar.gz` — the Khanza tree: `dist/SIMRSKhanza.jar` (md5 `25acbbbe0faa71bc16c5c9c83157451d`,
matches the recorded build), `src/`, `build/`, `webapps/`, `consumer/`, `run-env/`, `KhanzaSecurity16bit/`, `.git`.
`dr-benchmark.tar.gz` — orchestrator scripts, `p-chain/` (fixture build inputs incl. `sik_p6f_build_*`),
`snapshots/d1_20261013T072755Z`, `state/`, `DECISIONS.md`, `PROGRESS.md`. No `results/`.
`Deers-Rock-tools.tar.gz` — `/opt/Deers-Rock` as-is: the seven frozen P11 tools plus
both frozen manifests (`p11_frozen_20261019/FROZEN.sha256` and `p11_frozen_20261020T0739Z.sha256`).
The tools are at the **final** P11 pin — `p11_negative_controls.sh` is
`0bba19319479a12b5f8fad14af600631c63bbcd69b2724af1c534ece67ebe578` (the `ensure_fx` stale-fixture fix),
and all seven verify against `p11_frozen_20261020T0739Z.sha256`. Verified by streaming the member back
out of the tarball at export time.

## Verified at capture

- every archive passes `gzip -t`; `sha256sum -c MANIFEST.sha256` → all OK.
- `sik` dump: 1179 tables (matches live).
- `sik_bench` dump: restored into a scratch DB → 23 tables, 356,355 `dr_charge_ledger` rows, and the
  **canonical ledger hash reproduced exactly**: `356355:a66a3a546cc322d3eca31f2bc5558993e183b1c5afbf444d4a2a3781cfe7aea7`.
  Scratch DB dropped afterwards; live untouched (356,355 rows before and after).
- **The ledger table lives in `sik_bench`, not `sik`.** `sik` holds the Khanza transactional data.

## Restore on the new box

```bash
# 1. packages (same majors as the source)
apt-get update && apt-get install -y openjdk-17-jdk openjdk-17-jre-headless \
    xvfb faketime mysql-server-8.0

# 2. trees
tar -C /opt -xzf simrs-khanza.tar.gz
tar -C /opt -xzf dr-benchmark.tar.gz
tar -C /opt -xzf Deers-Rock-tools.tar.gz

# 3. frozen P11 tools: verify, then re-apply immutability (tar does not carry chattr flags)
cd /opt/Deers-Rock/tools
sha256sum -c p11_frozen_20261019/FROZEN.sha256
chattr +i p6_acceptance_suite.sh p6_run_suite_fresh.sh sampled_real_form_diff_r5.py \
          p10_hash_state.py p10_preservation_check.sh p11_negative_controls.sh \
          p8_recovery_unit_test.py

# 4. databases (the dumps do not carry CREATE DATABASE / USE — name the target explicitly)
mysql -uroot -e "CREATE DATABASE IF NOT EXISTS sik CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci"
zcat db/sik.sql.gz | mysql -uroot sik
mysql -uroot -e "CREATE DATABASE IF NOT EXISTS sik_bench CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci"
zcat db/sik_bench.sql.gz | mysql -uroot sik_bench

# 5. DB credential: generate locally, never transported, and set the same value on the account
install -m 600 /dev/null /opt/simrs-khanza/run-env/benchmark_pw
openssl rand -base64 24 | tr -d '\n' > /opt/simrs-khanza/run-env/benchmark_pw
PW=$(cat /opt/simrs-khanza/run-env/benchmark_pw)
mysql -uroot -e "CREATE USER IF NOT EXISTS 'benchmark'@'localhost' IDENTIFIED BY '$PW';
                 GRANT ALL PRIVILEGES ON sik.* TO 'benchmark'@'localhost';
                 GRANT ALL PRIVILEGES ON sik_bench.* TO 'benchmark'@'localhost';
                 FLUSH PRIVILEGES;"
```

## Verify after the copy

```bash
sha256sum -c MANIFEST.sha256                      # all five lines must say OK
mysql -N -uroot -e "select count(*) from sik_bench.dr_charge_ledger"   # 356355
```

## Notes for whoever runs this

- MySQL 8.0.46 with the default `innodb_buffer_pool_size` (128 MB) makes the restore slow
  (`sik` took 3 min). Set `innodb_buffer_pool_size=3G` before loading if RAM allows.
- `/opt/dr-benchmark/results/` is the only thing left behind; copy it separately if the run history
  matters (1.3 GB).
- The seven tools arrive matching the frozen manifest; do not edit them until you `chattr -i`.
- The ledger check `356355:a66a3a54…` above is the same value P11 closed on: AC-9 was closed by the
  parallel session at `2026-10-20T07:32Z` with one uncontended 5/5 negative-control run
  (`evidence/p11/r5_p11_negative_controls_20261020T073218Z.md`), so this export carries a passing
  P11 tool set, not the intermediate one.

## Post-restore wiring — executed & verified 2026-10-23 (replacement-VPS migration)

These steps were run for real on the replacement box (2 vCPU / 16 GB / 94 GB, Ubuntu 24.04.5,
x86_64) and are part of the restore, not optional:

1. **MySQL config** before loading (`/etc/mysql/mysql.conf.d/drbench.cnf`):
   `innodb_buffer_pool_size=6G`, `skip-log-bin`, `innodb_flush_log_at_trx_commit=1`.
   With the pool set, `sik` loaded in **63 s** and `sik_bench` in **21 s** (vs ~3 min on the old box).
2. **`benchmark@localhost`** — create with a fresh password (written to
   `/opt/simrs-khanza/run-env/benchmark_pw`, mode 600) and **exactly these grants** (the live-proof
   invariant requires zero standing grants on `sik_p6f`; the suite adds and revokes those itself):
   ```sql
   GRANT SELECT,INSERT,UPDATE,DELETE ON sik.* TO 'benchmark'@'localhost';
   GRANT ALL PRIVILEGES ON sik_bench.* TO 'benchmark'@'localhost';
   ```
3. **`database.xml` re-encode** — the exported XML still encrypts the *old* password. Patch both
   copies with the fresh one (`PatchDbXml` re-encodes USER and PAS):
   ```bash
   CP="/opt/simrs-khanza/consumer:/opt/simrs-khanza/KhanzaSecurity16bit/build/classes:/opt/simrs-khanza/lib/mariadb.jar:/opt/simrs-khanza/resumepasien/lib/commons-codec-1.10.jar"
   java -cp "$CP" PatchDbXml /opt/simrs-khanza/setting/database.xml benchmark "$PW"
   java -cp "$CP" PatchDbXml /opt/simrs-khanza/run-env/setting/database.xml benchmark "$PW"
   ```
   Classpath notes: `lib/mariadb.jar` **is** MySQL Connector/J 8.4.0 (renamed); `EnkripsiAES` lives
   under `KhanzaSecurity16bit/build/classes/AESsecurity/`, so the classpath root is
   `…/build/classes`; commons-codec is required by `EnkripsiAES`. All five properties
   (HOST/PORT/DATABASE/USER/PAS) are AES-encoded in the XML — anything reading it must decrypt all
   five, exactly as `KhanzaBillingConsumer` does.
4. **Re-freeze the tools**: `cd /opt/Deers-Rock/tools && chattr +i` on the seven files (tar does not
   carry immutable flags).

**Verified end state on the replacement box:** export manifest `sha256sum -c` OK on the box itself;
JAR md5 `25acbbbe…` MATCH; the seven tools OK against `p11_frozen_20261020T0739Z.sha256` and
re-frozen; `sik` 1179 tables, `sik_bench` 23; restored-ledger hash
`356355:a66a3a546cc322d3eca31f2bc5558993e183b1c5afbf444d4a2a3781cfe7aea7` MATCH; `benchmark` login
OK; a JDBC probe through the real credential path (AES-decoded `database.xml` → Connector/J) gives
**identical output on old and new box** (`user=benchmark db=sik billing_rows=1464593`); grants on
`benchmark@localhost` identical to the old box; `results/` copied 1.3 GB / 8633 files, identical
counts; databases exactly `sik sik_bench` (plus system).

## Box naming (2026-10-23, per owner)

- **mac mini vultr** — the replacement box (this migration): hostname `mac-mini-vultr`, labelled in
  `/etc/machine-label`, SSH alias `mac-mini-vultr` in `~/.ssh/config`, credentials in
  `khanza-r5/.vps-mac-mini.env` (gitignored). Per the owner, both boxes stay live; the older vultr
  box remains the target of `khanza-r5/.vps.env` until decommission is decided, and any stream still
  working there is unaffected.

**Hardening — DONE 2026-10-23 (was deferred, completed once the box joined the tailnet):**
`passwordauthentication no`, `kbdinteractiveauthentication no`, `permitrootlogin prohibit-password`
(`sshd -T` verified; config validated with `sshd -t` before reload; backup at
`/etc/ssh/sshd_config.bak-hardening-20261023T125514Z`). Note: `50-cloud-init.conf` had
`PasswordAuthentication yes`; the hardening drop-in `/etc/ssh/sshd_config.d/00-hardening.conf`
overrides it by lexical first-match. Key-only root access confirmed by a fresh post-reload
connection. Access paths now: **tailnet `<tailnet IP: VPS_TAILNET_HOST in khanza-r5/.vps-mac-mini.env>`** (preferred — works regardless of home
IPv6) and the original IPv6 `<public IPv6: VPS_HOST in khanza-r5/.vps-mac-mini.env>`. The box joined the tailnet as
`mac-mini-vultr` (owner completed `tailscale up` login from the Vultr console).
