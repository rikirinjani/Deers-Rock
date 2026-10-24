#!/bin/bash
# dr_export.sh — export DR encounters to line format for KhanzaBillingConsumer.
# Run from /opt/simrs-khanza/ (setting/ found relative, DB creds from database.ini).
# Output: /tmp/dr_encounters.txt
#   ENC <no_rawat> <tgl> <jam>
#   OBAT <no_rawat> <kode_brng> <nama_spaced->underscored> <h_beli=ralan> <jml>
#   END
#
# DR-only guard (seed-leakage fix 2026-10-11, checklist section 5): every arm
# joins reg_periksa and requires no_rkm_medis LIKE 'DR%'. The old date-only
# filter (no_rawat LIKE '2026/10%') also matched 34 seed visits with October
# prescriptions and leaked them into billing.
#
# procedure-only ENC extension (unbilled-67 fix 2026-10-11, checklist section 6):
# DR visits with a procedure (rawat_jl_dr) but no prescription (resep_obat) now
# get an ENC/END header block so registration + procedure charges reach Khanza.
set -e
cd /opt/simrs-khanza

INIFILE=setting/database.ini
DBUSER=$(grep -oiP '^user\s*=\s*\K.*' "$INIFILE" | tr -d '\r' | xargs)
DBPASS=$(grep -oiP '^(pass|password)\s*=\s*\K.*' "$INIFILE" | tr -d '\r' | xargs)
DBNAME=$(grep -oiP '^database\s*=\s*\K.*' "$INIFILE" | tr -d '\r' | xargs)
: "${DBUSER:=root}"; : "${DBNAME:=sik}"

MYSQLCMD="mysql -u $DBUSER"
[ -n "$DBPASS" ] && MYSQLCMD="$MYSQLCMD -p$DBPASS"

$MYSQLCMD $DBNAME -N -B -e "
SELECT line FROM (
  SELECT ro.no_rawat nr, 0 seq, CONCAT('ENC ', ro.no_rawat, ' ', ro.tgl_perawatan, ' ', COALESCE(ro.jam,'08:00:00')) line
    FROM resep_obat ro
    INNER JOIN reg_periksa rp ON rp.no_rawat = ro.no_rawat
    WHERE ro.no_rawat LIKE '2026/10%' AND rp.no_rkm_medis LIKE 'DR%'
    GROUP BY ro.no_rawat, ro.tgl_perawatan, ro.jam
  UNION ALL
  SELECT r.no_rawat nr, 0 seq, CONCAT('ENC ', r.no_rawat, ' ', r.tgl_registrasi, ' ', COALESCE(r.jam_reg,'08:00:00')) line
    FROM reg_periksa r
    WHERE r.no_rkm_medis LIKE 'DR%' AND r.no_rawat LIKE '2026/10%'
      AND NOT EXISTS (SELECT 1 FROM resep_obat ro WHERE ro.no_rawat = r.no_rawat)
      AND EXISTS (SELECT 1 FROM rawat_jl_dr j WHERE j.no_rawat = r.no_rawat)
  UNION ALL
  SELECT ro.no_rawat nr, 1 seq, CONCAT('OBAT ', ro.no_rawat, ' ', rd.kode_brng, ' ',
         REPLACE(REPLACE(COALESCE(b.nama_brng, rd.kode_brng), ' ', '_'), CHAR(9), ''), ' ',
         COALESCE(b.ralan,0), ' ', rd.jml) line
    FROM resep_obat ro
    INNER JOIN reg_periksa rp ON rp.no_rawat = ro.no_rawat
    INNER JOIN resep_dokter rd ON rd.no_resep = ro.no_resep
    LEFT JOIN databarang b ON b.kode_brng = rd.kode_brng
    WHERE ro.no_rawat LIKE '2026/10%' AND rp.no_rkm_medis LIKE 'DR%'
  UNION ALL
  SELECT v.no_rawat nr, 2 seq, 'END' line FROM (
    SELECT DISTINCT ro.no_rawat FROM resep_obat ro
      INNER JOIN reg_periksa rp ON rp.no_rawat = ro.no_rawat
      WHERE ro.no_rawat LIKE '2026/10%' AND rp.no_rkm_medis LIKE 'DR%'
    UNION
    SELECT r.no_rawat FROM reg_periksa r
      WHERE r.no_rkm_medis LIKE 'DR%' AND r.no_rawat LIKE '2026/10%'
        AND NOT EXISTS (SELECT 1 FROM resep_obat ro WHERE ro.no_rawat = r.no_rawat)
        AND EXISTS (SELECT 1 FROM rawat_jl_dr j WHERE j.no_rawat = r.no_rawat)
  ) v
) x ORDER BY nr, seq, line
" > /tmp/dr_encounters.txt

ENC_COUNT=$(grep -c '^ENC ' /tmp/dr_encounters.txt)
OBAT_COUNT=$(grep -c '^OBAT ' /tmp/dr_encounters.txt)
echo "OK: exported $ENC_COUNT encounters, $OBAT_COUNT drug lines -> /tmp/dr_encounters.txt"
head -8 /tmp/dr_encounters.txt
