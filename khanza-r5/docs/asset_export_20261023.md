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
`p11_frozen_20261019/FROZEN.sha256`.

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
