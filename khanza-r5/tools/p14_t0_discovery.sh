#!/bin/bash
# P14 T0: discovery for the edge-strata fixture. SELECT-only on live sik/sik_bench.
# Usage: bash p14_t0_discovery.sh > t0_discovery.txt
set -u
Q() { echo; echo "### $1"; echo "\$ $2"; mysql -uroot -t -e "$2" 2>&1; }

echo "# P14 T0 discovery — $(date -u +%Y-%m-%dT%H:%M:%SZ) (SELECT-only)"

Q "columns: detail_pemberian_obat" "SELECT COLUMN_NAME, COLUMN_TYPE FROM information_schema.columns WHERE table_schema='sik' AND table_name='detail_pemberian_obat' ORDER BY ORDINAL_POSITION"
Q "columns: rawat_jl_dr" "SELECT COLUMN_NAME, COLUMN_TYPE FROM information_schema.columns WHERE table_schema='sik' AND table_name='rawat_jl_dr' ORDER BY ORDINAL_POSITION"
Q "columns: reg_periksa" "SELECT COLUMN_NAME, COLUMN_TYPE FROM information_schema.columns WHERE table_schema='sik' AND table_name='reg_periksa' ORDER BY ORDINAL_POSITION"
Q "columns: billing" "SELECT COLUMN_NAME, COLUMN_TYPE FROM information_schema.columns WHERE table_schema='sik' AND table_name='billing' ORDER BY ORDINAL_POSITION"
Q "columns: jns_perawatan" "SELECT COLUMN_NAME, COLUMN_TYPE FROM information_schema.columns WHERE table_schema='sik' AND table_name='jns_perawatan' ORDER BY ORDINAL_POSITION"
Q "columns: sik_bench.dr_tariff" "SELECT COLUMN_NAME, COLUMN_TYPE FROM information_schema.columns WHERE table_schema='sik_bench' AND table_name='dr_tariff' ORDER BY ORDINAL_POSITION"

Q "DR cohort date range and size" "SELECT MIN(tgl_registrasi), MAX(tgl_registrasi), COUNT(*) FROM sik.reg_periksa WHERE no_rkm_medis LIKE 'DR%'"
Q "all-visit date range" "SELECT MIN(tgl_registrasi), MAX(tgl_registrasi), COUNT(*) FROM sik.reg_periksa"
Q "candidate fixture date 2027-12-31: visits on it (need 0)" "SELECT COUNT(*) FROM sik.reg_periksa WHERE tgl_registrasi='2027-12-31' OR no_rawat LIKE '2027/12/31/%'"
Q "reserved no_rawat range 2027/12/31/9xxxxx anywhere (need 0)" "SELECT (SELECT COUNT(*) FROM sik.reg_periksa WHERE no_rawat LIKE '2027/12/31/%') reg, (SELECT COUNT(*) FROM sik.billing WHERE no_rawat LIKE '2027/12/31/%') bil, (SELECT COUNT(*) FROM sik_bench.dr_charge_ledger WHERE no_rawat LIKE '2027/12/31/%') led"

Q "embalase/tuslah in the DR cohort (expect 0, consumer writes 0)" "SELECT COUNT(*), SUM(d.embalase<>0), SUM(d.tuslah<>0) FROM sik.detail_pemberian_obat d JOIN sik.reg_periksa r ON r.no_rawat=d.no_rawat WHERE r.no_rkm_medis LIKE 'DR%'"
Q "biaya_reg values in the DR cohort" "SELECT biaya_reg, COUNT(*) FROM sik.reg_periksa WHERE no_rkm_medis LIKE 'DR%' GROUP BY biaya_reg"
Q "procedures per DR visit (distribution)" "SELECT n, COUNT(*) FROM (SELECT r.no_rawat, COUNT(rj.kd_jenis_prw) n FROM sik.reg_periksa r LEFT JOIN sik.rawat_jl_dr rj ON rj.no_rawat=r.no_rawat WHERE r.no_rkm_medis LIKE 'DR%' GROUP BY r.no_rawat) t GROUP BY n"

Q "template visit: one DR visit with 2 procedures and >=2 drugs" "SELECT r.* FROM sik.reg_periksa r WHERE r.no_rkm_medis LIKE 'DR%' AND (SELECT COUNT(*) FROM sik.rawat_jl_dr x WHERE x.no_rawat=r.no_rawat)=2 AND (SELECT COUNT(*) FROM sik.detail_pemberian_obat d WHERE d.no_rawat=r.no_rawat)>=2 ORDER BY r.no_rawat LIMIT 1\\G"
T=$(mysql -uroot -N -e "SELECT r.no_rawat FROM sik.reg_periksa r WHERE r.no_rkm_medis LIKE 'DR%' AND (SELECT COUNT(*) FROM sik.rawat_jl_dr x WHERE x.no_rawat=r.no_rawat)=2 AND (SELECT COUNT(*) FROM sik.detail_pemberian_obat d WHERE d.no_rawat=r.no_rawat)>=2 ORDER BY r.no_rawat LIMIT 1")
echo; echo "TEMPLATE_VISIT=$T"
Q "template rawat_jl_dr rows" "SELECT * FROM sik.rawat_jl_dr WHERE no_rawat='$T'\\G"
Q "template detail_pemberian_obat rows" "SELECT * FROM sik.detail_pemberian_obat WHERE no_rawat='$T'\\G"
Q "template billing rows (form/consumer output)" "SELECT noindex, no, nm_perawatan, pemisah, biaya, jumlah, tambahan, totalbiaya, status FROM sik.billing WHERE no_rawat='$T' ORDER BY noindex"
Q "template ledger rows" "SELECT * FROM sik_bench.dr_charge_ledger WHERE no_rawat='$T'"

Q "dr_tariff: kinds and counts" "SELECT kind, COUNT(*), MIN(dr_price), MAX(dr_price), SUM(dr_price=0) FROM sik_bench.dr_tariff GROUP BY kind"
Q "dr_tariff: registration row(s)" "SELECT * FROM sik_bench.dr_tariff WHERE kind='registration'"
Q "E3: procedure codes used by DR with EQUAL dr_tariff price (pairs, top 10 prices)" "SELECT t.dr_price, COUNT(*) n, GROUP_CONCAT(t.code ORDER BY t.code SEPARATOR ',') codes FROM sik_bench.dr_tariff t WHERE t.kind='procedure' AND t.code IN (SELECT DISTINCT kd_jenis_prw FROM sik.rawat_jl_dr rj JOIN sik.reg_periksa r ON r.no_rawat=rj.no_rawat WHERE r.no_rkm_medis LIKE 'DR%') GROUP BY t.dr_price HAVING n>=2 ORDER BY n DESC LIMIT 10"
Q "E3: Khanza jns_perawatan price for DR procedure codes (vs dr_tariff)" "SELECT j.kd_jenis_prw, j.nm_perawatan, j.total_byrdr, t.dr_price FROM sik.jns_perawatan j LEFT JOIN sik_bench.dr_tariff t ON t.kind='procedure' AND t.code=j.kd_jenis_prw WHERE j.kd_jenis_prw IN (SELECT DISTINCT kd_jenis_prw FROM sik.rawat_jl_dr rj JOIN sik.reg_periksa r ON r.no_rawat=rj.no_rawat WHERE r.no_rkm_medis LIKE 'DR%') ORDER BY j.kd_jenis_prw LIMIT 40"
Q "E5: procedures with Khanza price 0 among DR codes" "SELECT j.kd_jenis_prw, j.nm_perawatan, j.total_byrdr, t.dr_price FROM sik.jns_perawatan j LEFT JOIN sik_bench.dr_tariff t ON t.kind='procedure' AND t.code=j.kd_jenis_prw WHERE j.total_byrdr=0 LIMIT 10"

Q "E4: DR drugs and ralan prices (mod 100) used by the cohort" "SELECT b.kode_brng, b.nama_brng, b.ralan, MOD(b.ralan,100) m, t.dr_price FROM sik.databarang b LEFT JOIN sik_bench.dr_tariff t ON t.kind='drug' AND t.code=b.kode_brng WHERE b.kode_brng IN (SELECT DISTINCT d.kode_brng FROM sik.detail_pemberian_obat d JOIN sik.reg_periksa r ON r.no_rawat=d.no_rawat WHERE r.no_rkm_medis LIKE 'DR%') ORDER BY m, b.ralan LIMIT 40"
Q "E8: drug display-name collisions (nama_brng (jenis.nama)) across ALL databarang" "SELECT CONCAT(b.nama_brng,' (',j.nama,')') k, COUNT(*) n, GROUP_CONCAT(b.kode_brng) codes FROM sik.databarang b JOIN sik.jenis j ON j.kdjns=b.kdjns GROUP BY k HAVING n>1 ORDER BY n DESC LIMIT 10"
Q "E8: drug display-name collisions among DR-used drugs only" "SELECT CONCAT(b.nama_brng,' (',j.nama,')') k, COUNT(*) n, GROUP_CONCAT(b.kode_brng) codes FROM sik.databarang b JOIN sik.jenis j ON j.kdjns=b.kdjns WHERE b.kode_brng IN (SELECT DISTINCT d.kode_brng FROM sik.detail_pemberian_obat d JOIN sik.reg_periksa r ON r.no_rawat=d.no_rawat WHERE r.no_rkm_medis LIKE 'DR%') GROUP BY k HAVING n>1 LIMIT 10"
Q "procedure name collisions in jns_perawatan" "SELECT nm_perawatan, COUNT(*) n, GROUP_CONCAT(kd_jenis_prw) FROM sik.jns_perawatan GROUP BY nm_perawatan HAVING n>1 ORDER BY n DESC LIMIT 10"
Q "billing status values for DR visits (sample 2026-10-01)" "SELECT status, COUNT(*) FROM sik.billing WHERE no_rawat LIKE '2026/10/01/%' GROUP BY status"
echo; echo "# END T0"
