#!/bin/bash
# Run on new VPS: setup_vps.sh
cd /opt/khanza-benchmark-asset
BUNDLE_DIR=/opt/khanza-benchmark-asset
KHANZA_DIR=/opt/simrs-khanza
BENCH_DIR=/opt/dr-benchmark
KHANZA_JAR_MD5_EXPECTED="25acbbbe0faa71bc16c5c9c83157451d"

log(){ echo "[setup $(date -u +%H:%M:%S)] $*"; }

log "=== 1. Package install ==="
export DEBIAN_FRONTEND=noninteractive
apt-get update -y 2>/dev/null
apt-get install -y openjdk-17-jre-headless xvfb faketime tmux mysql-server mysql-client python3 gzip tar ca-certificates 2>&1 | tail -5
systemctl enable --now mysql 2>/dev/null || true
command -v faketime >/dev/null && log "faketime: $(which faketime)" || log "WARN: faketime not on PATH"

log "=== 2. Stage the asset ==="
if [ ! -f "$KHANZA_DIR/dist/SIMRSKhanza.jar" ]; then
  ( cd /opt && tar xzf "$BUNDLE_DIR/simrs-khanza-asset.tgz" )
fi
[ -d "$KHANZA_DIR" ] || { echo "FATAL: extraction failed"; exit 1; }
log "extracted $KHANZA_DIR"

log "=== 3. Verify Khanza JAR md5 (must be the validated build) ==="
JAR_MD5="$(md5sum "$KHANZA_DIR/dist/SIMRSKhanza.jar" | awk '{print $1}')"
log "SIMRSKhanza.jar md5=$JAR_MD5 (expected $KHANZA_JAR_MD5_EXPECTED)"
if [ "$JAR_MD5" != "$KHANZA_JAR_MD5_EXPECTED" ]; then
  echo "STOPPED_AT_preflight: JAR md5 mismatch" > "$BENCH_DIR/results/STOPPED_AT_preflight.md" 2>/dev/null || true
  echo "FATAL: Khanza JAR is not the validated build"
  exit 1
fi
log "JAR md5 OK"

log "=== 4. Load sik DB ==="
command -v mysql >/dev/null || { command -v mariadb >/dev/null && alias mysql=mariadb || echo "no mysql client"; }
gunzip -c "$BUNDLE_DIR/sik_dump.sql.gz" | mysql -uroot 2>/dev/null || \
  gunzip -c "$BUNDLE_DIR/sik_dump.sql.gz" | sudo -u mysql mysql 2>/dev/null || \
  gunzip -c "$BUNDLE_DIR/sik_dump.sql.gz" | mysql 2>/dev/null
log "sik DB loaded (or already present)"

log "=== 5. Create sik_bench (Khanza master+reference, NO seed) ==="
mysql -uroot <<'SQL' 2>/dev/null
DROP DATABASE IF EXISTS sik_bench;
CREATE DATABASE sik_bench CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
SQL
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
INSERT INTO poliklinik SELECT * FROM sik.poliklinik;
INSERT INTO dokter SELECT * FROM sik.dokter;
INSERT INTO databarang SELECT * FROM sik.databarang;
INSERT INTO jns_perawatan SELECT * FROM sik.jns_perawatan;
INSERT INTO jenis SELECT * FROM sik.jenis;
INSERT INTO patient SELECT * FROM sik.patient;
SQL
log "sik_bench created with master+reference data"
SEED_ROWS="$(mysql -uroot sik_bench -N -e "SELECT (SELECT COUNT(*) FROM reg_periksa)+(SELECT COUNT(*) FROM billing)+(SELECT COUNT(*) FROM nota_jalan);" 2>/dev/null || echo 0)"
log "sik_bench seed-row check: $SEED_ROWS (must be 0)"
if [ "$SEED_ROWS" != "0" ]; then
  echo "FATAL: sik_bench has seed rows"
  exit 1
fi

log "=== 6. Recreate benchmark user ==="
PW_FILE="$KHANZA_DIR/run-env/benchmark_pw"
if [ -s "$PW_FILE" ]; then
  BENCH_PW="$(cat "$PW_FILE")"
  mysql -uroot -e "CREATE USER IF NOT EXISTS 'benchmark'@'localhost' IDENTIFIED BY '$BENCH_PW';
    GRANT SELECT,INSERT,UPDATE,DELETE ON sik.* TO 'benchmark'@'localhost';
    GRANT SELECT,INSERT,UPDATE,DELETE ON sik_bench.* TO 'benchmark'@'localhost';
    FLUSH PRIVILEGES;" 2>/dev/null
  log "benchmark user set (password not printed)"
else
  log "WARN: $PW_FILE missing/empty - operator must set benchmark password before launch"
fi

log "=== 7. Install orchestrator ==="
mkdir -p "$BENCH_DIR"/{state,results}
install -m 0755 "$BUNDLE_DIR/unattended/run_all.sh" "$BENCH_DIR/run_all.sh" 2>/dev/null || \
  cp /opt/dr-benchmark/run_all.sh "$BENCH_DIR/run_all.sh" 2>/dev/null || true
[ -f "$BENCH_DIR/run_all.sh" ] || { echo "FATAL: run_all.sh not found"; exit 1; }
chmod +x "$BENCH_DIR/run_all.sh"

log "=== SETUP COMPLETE ==="
log "Launch with: sudo systemd-run --unit=dr-bench bash $BENCH_DIR/run_all.sh --run-id $(date -u +%Y%m%dT%H%M%SZ)"
log "OR: tmux new -s drbench 'nohup bash $BENCH_DIR/run_all.sh --run-id $(date -u +%Y%m%dT%H%M%SZ) &'"
