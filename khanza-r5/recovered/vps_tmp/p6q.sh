mysql -uroot -N sik_p6 -e "
SELECT 'EMB_TUS', d.no_rawat, r.tgl_registrasi, SUM(d.embalase<>0) emb, SUM(d.tuslah<>0) tus, (SELECT COUNT(*) FROM billing b WHERE b.no_rawat=d.no_rawat) bill
FROM detail_pemberian_obat d JOIN reg_periksa r ON r.no_rawat=d.no_rawat
WHERE (d.embalase<>0 OR d.tuslah<>0) AND d.no_rawat LIKE '%' GROUP BY d.no_rawat, r.tgl_registrasi HAVING bill>0 ORDER BY r.tgl_registrasi, d.no_rawat LIMIT 5;
SELECT 'GT2PROC', j.no_rawat, r.tgl_registrasi, COUNT(*) nproc, (SELECT COUNT(*) FROM detail_pemberian_obat d WHERE d.no_rawat=j.no_rawat AND (d.embalase<>0 OR d.tuslah<>0)) etc, (SELECT COUNT(*) FROM billing b WHERE b.no_rawat=j.no_rawat) bill
FROM rawat_jl_dr j JOIN reg_periksa r ON r.no_rawat=j.no_rawat WHERE j.no_rawat LIKE '%' GROUP BY j.no_rawat, r.tgl_registrasi HAVING nproc>2 AND bill>0 ORDER BY r.tgl_registrasi, j.no_rawat LIMIT 5;
SELECT 'OCT_BILLED_VISITS', COUNT(DISTINCT no_rawat) FROM billing WHERE no_rawat LIKE '2026/10/%';"
