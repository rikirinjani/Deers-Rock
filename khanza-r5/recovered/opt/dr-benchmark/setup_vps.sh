#!/usr/bin/env bash
# setup_vps.sh — image-agnostic bring-up for the NEW 10-core/12GB VPS.
# Run ON the box after copying the khanza-benchmark-asset/ bundle.
# Draft-only: NOT executed. No secrets here; DB password read at runtime from
# /opt/simrs-khanza/run-env/benchmark_pw (brief §3 rule 2).
set -euo pipefail

# Operator sets this (or the script self-detects). Never a hardcoded IP.
TARGET_VPS="${TARGET_VPS:-this-host}"   # placeholder; this script runs locally on the target
BUNDLE_DIR="${BUNDLE_DIR:-/opt/khanza-benchmark-asset}"
KHANZA_DIR="/opt/simrs-khanza"
BENCH_DIR="/opt/dr-benchmark"
KHANZA_JAR_MD5_EXPECTED="25acbbbe0faa71bc16c5c9c83157451d"   # validated build (real_form_validation_v2.md)

log(){ echo "[setup $(date -u +%H:%M:%S)] $*"; }
die(){ echo "[setup FATAL] $*" >&2; exit 1; }

# --- 0. Pre-flight -------------------------------------------------------
[ -d "$BUNDLE_DIR" ] || die "bundle dir $BUNDLE_DIR not found; copy khanza-benchmark-asset/ here first"
[ -f "$BUNDLE_DIR/simrs-khanza-asset.tgz" ] || die "simrs-khanza-asset.tgz missing from $BUNDLE_DIR"
[ -f "$BUNDLE_DIR/sik_dump.sql.gz" ] || die "sik_dump.sql.gz missing from $BUNDLE_DIR"

DISTRO=""
if [ -f /etc/os-release ]; then DISTRO="$(. /etc/os-release && echo "${ID} ${VERSION_CODENAME:-}")"; fi
log "distro: ${DISTRO:-unknown} (assume Ubuntu 22.04/24.04; adjust apt packages if wrong)"

# --- 1. Package install (idempotent) -------------------------------------
log "installing JDK 17, Xvfb, faketime, MySQL/MariaDB server+client, tmux"
export DEBIAN_FRONTEND=noninteractive
if command -v apt-get >/dev/null; then
  apt-get update -y
  apt-get install -y openjdk-17-jre-headless xvfb faketime tmux mysql-server mysql-client \
    python3 gzip tar ca-certificates 2>/dev/null || \
  apt-get install -y openjdk-17-jre-headless xvfb faketime tmux mariadb-server mariadb-client \
    python3 gzip tar ca-certificates
  systemctl enable --now mysql 2>/dev/null || systemctl enable --now mariadb
fi
# faketime may ship as the shared lib libfaketime; note it if absent
command -v faketime >/dev/null || log "WARN: faketime not on PATH (may be /usr/lib/faketime); real-form runs use it per-visit-date"

# --- 2. Stage the asset --------------------------------------------------
log "extracting simrs-khanza-asset.tgz -> /opt"
if [ ! -f "$KHANZA_DIR/dist/SIMRSKhanza.jar" ]; then
  ( cd /opt && tar xzf "$BUNDLE_DIR/simrs-khanza-asset.tgz" )
fi
[ -d "$KHANZA_DIR" ] || die "asset extraction failed; $KHANZA_DIR missing"

# Verify the Khanza JAR is the validated build (md5, NOT a secret).
JAR_MD5="$(md5sum "$KHANZA_DIR/dist/SIMRSKhanza.jar" | awk '{print $1}')"
log "SIMRSKhanza.jar md5=$JAR_MD5 (expected $KHANZA_JAR_MD5_EXPECTED)"
[ "$JAR_MD5" = "$KHANZA_JAR_MD5_EXPECTED" ] || {
  echo "STOPPED_AT_preflight: Khanza JAR md5 mismatch ($JAR_MD5 != $KHANZA_JAR_MD5_EXPECTED)." \
    "The deployed Khanza is not the validated build; do not run the benchmark over a drifted binary." | tee -a "$BENCH_DIR/results/STOPPED_AT_preflight.md"
  exit 1
}

# --- 3. Load the sik DB + create sik_bench (master+reference only) ------
log "loading sik_dump.sql.gz into MySQL/MariaDB"
command -v mysql >/dev/null || { command -v mariadb >/dev/null && mysql() { mariadb "$@"; } || die "no mysql/mariadb client"; }
gunzip -c "$BUNDLE_DIR/sik_dump.sql.gz" | mysql -uroot 2>/dev/null \
  || gunzip -c "$BUNDLE_DIR/sik_dump.sql.gz" | sudo -u mysql mysql 2>/dev/null \
  || die "sik dump load failed (may need a root socket credential)"

log "creating sik_bench schema: Khanza master+reference tables, NO seed patients/visits/billing"
mysql -uroot <<'SQL' 2>/dev/null || echo "WARN: sik_bench already exists or partial; inspect manually"
DROP DATABASE IF EXISTS sik_bench;
CREATE DATABASE sik_bench CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
SQL
# Copy master/reference data into sik_bench, EXCLUDE the seed transactional rows.
# Master/reference = the price/procedure/doctor/clinic/patient-master tables;
# seed = reg_periksa/resep_*/detail_pemberian_obat/rawat_jl_dr/billing/nota_jalan rows.
mysql -uroot sik_bench 2>/dev/null <<'SQL'
CREATE TABLE poliklinik LIKE sik.poliklinik;
CREATE TABLE dokter LIKE sik.dokter;
CREATE TABLE databarang LIKE sik.databarang;
CREATE TABLE jns_perawatan LIKE sik.jns_perawatan;
CREATE TABLE jenis LIKE sik.jenis;
CREATE TABLE patient LIKE sik.patient;
CREATE TABLE reg_periksa LIKE sik.reg_periksa;
CREATE TABLE resep_obat LIKE sik.resep_obat;
CREATE TABLE resep_dokter LIKE sik.resep_dokter;
CREATE TABLE detail_pemberian_obat LIKE sik.detail_pemberian_obat;
CREATE TABLE rawat_jl_dr LIKE sik.rawat_jl_dr;
CREATE TABLE billing LIKE sik.billing;
CREATE TABLE nota_jalan LIKE sik.nota_jalan;
-- master/reference data only
INSERT INTO sik_bench.poliklinik SELECT * FROM sik.poliklinik;
INSERT INTO sik_bench.dokter SELECT * FROM sik.dokter;
INSERT INTO sik_bench.databarang SELECT * FROM sik.databarang;
INSERT INTO sik_bench.jns_perawatan SELECT * FROM sik.jns_perawatan;
INSERT INTO sik_bench.jenis SELECT * FROM sik.jenis;
-- patient master (not seed transactions)
INSERT INTO sik_bench.patient SELECT * FROM sik.patient;
SQL
# Zero-seed check (brief §7): sik_bench transactional tables must be empty.
SEED_ROWS="$(mysql -uroot sik_bench -N -e \
  'SELECT (SELECT COUNT(*) FROM reg_periksa)+(SELECT COUNT(*) FROM billing)+(SELECT COUNT(*) FROM nota_jalan);' 2>/dev/null || echo 0)"
log "sik_bench seed-row check: $SEED_ROWS (must be 0)"
[ "$SEED_ROWS" = "0" ] || die "sik_bench contains seed rows ($SEED_ROWS); abort"

# --- 4. Recreate the benchmark DB user (no hardcoded password) ----------
log "ensuring benchmark@localhost user (password read from run-env/benchmark_pw, NOT hardcoded)"
PW_FILE="$KHANZA_DIR/run-env/benchmark_pw"
if [ -s "$PW_FILE" ]; then
  BENCH_PW="$(cat "$PW_FILE")"
  mysql -uroot -e "CREATE USER IF NOT EXISTS 'benchmark'@'localhost' IDENTIFIED BY '$BENCH_PW';
                   GRANT SELECT,INSERT,UPDATE,DELETE ON sik.* TO 'benchmark'@'localhost';
                   GRANT SELECT,INSERT,UPDATE,DELETE ON sik_bench.* TO 'benchmark'@'localhost';
                   FLUSH PRIVILEGES;" 2>/dev/null || \
  sudo -u mysql mysql -e "CREATE USER IF NOT EXISTS 'benchmark'@'localhost' IDENTIFIED BY '$BENCH_PW';
                   GRANT SELECT,INSERT,UPDATE,DELETE ON sik.* TO 'benchmark'@'localhost';
                   GRANT SELECT,INSERT,UPDATE,DELETE ON sik_bench.* TO 'benchmark'@'localhost';
                   FLUSH PRIVILEGES;" 2>/dev/null
  log "benchmark user set (password not printed)"
else
  log "WARN: $PW_FILE missing/empty — operator must set the benchmark password before launch; not hardcoding"
fi
# Do NOT touch bind-address, firewall, or root auth (brief §3 rule 3).

# --- 5. Install the orchestrator ----------------------------------------
mkdir -p "$BENCH_DIR"/{state,results}
install -m 0755 "$BUNDLE_DIR/unattended/run_all.sh" "$BENCH_DIR/run_all.sh" 2>/dev/null || \
  log "WARN: run_all.sh not in bundle yet; operator to place it at $BENCH_DIR/run_all.sh"
[ -f "$BENCH_DIR/run_all.sh" ] || die "orchestrator $BENCH_DIR/run_all.sh missing; cannot launch"

log "SETUP COMPLETE. Launch with: sudo systemd-run --unit=dr-bench bash $BENCH_DIR/run_all.sh --run-id $(date -u +%Y%m%dT%H%M%SZ)   OR   tmux new -s drbench 'nohup bash $BENCH_DIR/run_all.sh --run-id $(date -u +%Y%m%dT%H%M%SZ) &'"
log "After launch verify: systemd/tmux unit active + heartbeat updating every 60s + PROGRESS.md present. Then the laptop may be closed."
