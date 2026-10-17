set -e
cd /opt/dr-benchmark
echo "=== add 3 valid procedure lines to STRATA-GT3PROC (copy a real proc row, override no_rawat + kd_jenis_prw + biaya_rawat) ==="
mysql -uroot sik_p2 -e "
INSERT INTO rawat_jl_dr (no_rawat,kd_jenis_prw,kd_dokter,tgl_perawatan,jam_rawat,material,bhp,tarif_tindakandr,kso,menejemen,biaya_rawat,stts_bayar)
SELECT 'STRATA-GT3PROC', 'J000376', kd_dokter, tgl_perawatan, jam_rawat, material, bhp, tarif_tindakandr, kso, menejemen, 5000, stts_bayar
FROM (SELECT * FROM rawat_jl_dr WHERE no_rawat='2026/10/01/000254' LIMIT 1) t;
"
mysql -uroot sik_p2 -e "
INSERT INTO rawat_jl_dr (no_rawat,kd_jenis_prw,kd_dokter,tgl_perawatan,jam_rawat,material,bhp,tarif_tindakandr,kso,menejemen,biaya_rawat,stts_bayar)
SELECT 'STRATA-GT3PROC', 'J000377', kd_dokter, tgl_perawatan, jam_rawat, material, bhp, tarif_tindakandr, kso, menejemen, 7000, stts_bayar
FROM (SELECT * FROM rawat_jl_dr WHERE no_rawat='2026/10/01/000254' LIMIT 1) t;
"
mysql -uroot sik_p2 -e "
INSERT INTO rawat_jl_dr (no_rawat,kd_jenis_prw,kd_dokter,tgl_perawatan,jam_rawat,material,bhp,tarif_tindakandr,kso,menejemen,biaya_rawat,stts_bayar)
SELECT 'STRATA-GT3PROC', 'J000378', kd_dokter, tgl_perawatan, jam_rawat, material, bhp, tarif_tindakandr, kso, menejemen, 9000, stts_bayar
FROM (SELECT * FROM rawat_jl_dr WHERE no_rawat='2026/10/01/000254' LIMIT 1) t;
"
echo "STRATA-GT3PROC proc lines: $(mysql -uroot -N -e "SELECT COUNT(*) FROM sik_p2.rawat_jl_dr WHERE no_rawat='STRATA-GT3PROC';")"
echo "=== 5 STRATA- visits ready; run P1 oracle (freeze-only first to confirm eligibility) ==="
export DBUTIL_FORCE_ROOT=1
export P2_CONSUMER_DB=sik_p2
export P2_LEDGER_DB=sik_bench_p2
export RUN_ID=r5p4_b3
# point the P1 oracle at the scratch DBs
sed -i 's/^DB = "sik"/DB = os.environ.get("P2_CONSUMER_DB", "sik")/' /opt/Deers-Rock/tools/sampled_real_form_diff_r5.py 2>/dev/null || echo "(P1 tool DB override via env: rely on P2_CONSUMER_DB)"
cd /opt/Deers-Rock/tools
echo "=== P1 oracle: freeze + run the 5 strata visits on sik_p2 (real form via clone) ==="
echo "Note: the P1 tool bills through the real form (Xvfb+faketime). Point the harness at sik_p2."
sed -i 's/^database=.*/database=sik_p2/' /opt/simrs-khanza/setting/database.ini
echo "harness DB target now: $(grep -E '^database=' /opt/simrs-khanza/setting/database.ini)"
