import sys
sys.path.insert(0, "/opt/Deers-Rock/tools")
import oracle_diff_30_50 as m

half = m._visit_rows("AND rp.no_rawat IN " + m.HALF_RUPIAH_SUBQ + " ")
print("half-rupiah _visit_rows:", [v["no_rawat"] for v in half])

rows = m._q("SELECT no_rawat, SUM(total+embalase+tuslah) s FROM detail_pemberian_obat "
            "GROUP BY no_rawat HAVING ABS((((SUM(total+embalase+tuslah))*0.11) MOD 1) - 0.5) < 0.000001")
print("raw HAVING query:", rows)

sel, cov, sh, tags = m.select_visits()
nrs = [v["no_rawat"] for v in sel]
print("000423 in sel:", "2026/10/24/000423" in nrs)
print("000464 in sel:", "2026/10/22/000464" in nrs)
print("half tags:", tags["half_rupiah"])
print("last 5 sel:", nrs[-5:])
