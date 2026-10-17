set -e
cd /opt/dr-benchmark
echo "=== required NOT-NULL columns on reg_periksa ==="
mysql -uroot -N -e "SELECT GROUP_CONCAT(COLUMN_NAME ORDER BY ORDINAL_POSITION) FROM information_schema.columns WHERE table_schema=\"sik_p2\" AND table_name=\"reg_periksa\" AND is_nullable=\"NO\" AND column_default IS NULL;"
echo "=== template: copy all values from a real 2026-10 DR row, only override no_rawat + stratum marker ==="
# Best approach: INSERT ... SELECT from a real DR row, overriding no_rawat. This preserves every FK-valid field.
RKM_ROW="SELECT no_rawat, no_rkm_medis, kd_poli, biaya_reg FROM sik_p2.reg_periksa WHERE no_rawat=\"2026/10/01/000254\";"
mysql -uroot sik_p2 -e "
DELETE FROM reg_periksa WHERE no_rawat LIKE 'STRATA-%';
-- 5 STRATA- rows: copy a real DR reg row, override no_rawat + (for zero-fee) biaya_reg
INSERT INTO reg_periksa
  SELECT 'STRATA-EMBALASE', t.* FROM (SELECT * FROM reg_periksa WHERE no_rawat='2026/10/01/000254' LIMIT 1) t
   WHERE NOT EXISTS (SELECT 1 FROM reg_periksa WHERE no_rawat='STRATA-EMBALASE');
" 2>&1 | head -3
# The INSERT...SELECT with a full-row copy is cleanest. Do all 5:
mysql -uroot sik_p2 -e "
INSERT INTO reg_periksa
  SELECT 'STRATA-TUSLAH', t.* FROM (SELECT * FROM reg_periksa WHERE no_rawat='2026/10/01/000289' LIMIT 1) t
   WHERE NOT EXISTS (SELECT 1 FROM reg_periksa WHERE no_rawat='STRATA-TUSLAH');
INSERT INTO reg_periksa
  SELECT 'STRATA-HALFPPN', t.* FROM (SELECT * FROM reg_periksa WHERE no_rawat='2026/10/01/000298' LIMIT 1) t
   WHERE NOT EXISTS (SELECT 1 FROM reg_periksa WHERE no_rawat='STRATA-HALFPPN');
INSERT INTO reg_periksa
  SELECT 'STRATA-ZEROFEE', t.* FROM (SELECT * FROM reg_periksa WHERE no_rawat='2026/10/01/000332' LIMIT 1) t
   WHERE NOT EXISTS (SELECT 1 FROM reg_periksa WHERE no_rawat='STRATA-ZEROFEE');
UPDATE reg_periksa SET biaya_reg=0 WHERE no_rawat='STRATA-ZEROFEE';
INSERT INTO reg_periksa
  SELECT 'STRATA-GT3PROC', t.* FROM (SELECT * FROM reg_periksa WHERE no_rawat='2026/10/01/000358' LIMIT 1) t
   WHERE NOT EXISTS (SELECT 1 FROM reg_periksa WHERE no_rawat='STRATA-GT3PROC');
" 2>&1 | head -3
echo "=== STRATA- reg rows present ==="
mysql -uroot -N -e "SELECT no_rawat, no_rkm_medis, kd_poli, biaya_reg, status_bayar, stts, stts_daftar FROM sik_p2.reg_periksa WHERE no_rawat LIKE 'STRATA-%';"
