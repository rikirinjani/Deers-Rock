"""
DR -> Khanza encounter export.
Reads DR patient/visit/prescription data from MariaDB `sik` and writes
encounter events in the line format expected by KhanzaBillingConsumer.java.
"""
import subprocess, sys, os

def run_sql(sql):
    """Execute MySQL query via temp file, return list of dicts."""
    sqlfile = "/tmp/_dr_export_query.sql"
    with open(sqlfile, "w") as f:
        f.write(sql + "\n")
    try:
        proc = subprocess.run(
            ["mysql", "-uroot", "-pdeersrock", "sik", "--batch", "-N", "-e", f"source {sqlfile}"],
            capture_output=True, text=True, timeout=60
        )
        # mysql -e "source ..." doesn't work. Use direct execution instead.
        # Just use mysql < file
        pass
    finally:
        os.unlink(sqlfile)
    # Actually just pipe
    proc = subprocess.run(
        ["mysql", "-uroot", "-pdeersrock", "sik", "--batch", "-N"],
        input=sql, capture_output=True, text=True, timeout=60
    )
    if proc.returncode != 0:
        print(f"SQL error: {proc.stderr}", file=sys.stderr)
        return []
    lines = proc.stdout.strip().split('\n')
    if not lines or lines[0].startswith('Warning'):
        # skip warning lines
        lines = [l for l in lines if not l.startswith('Warning')]
    if not lines:
        return []
    rows = []
    for line in lines:
        vals = line.split('\t')
        rows.append(vals)
    return rows

def main():
    output_file = sys.argv[1] if len(sys.argv) > 1 else "/tmp/dr_encounters.txt"

    # Get DR visits (resep_obat has no_rawat + tgl_perawatan + jam)
    visit_sql = """SELECT ro.no_rawat, ro.tgl_perawatan, COALESCE(ro.jam, '08:00:00') FROM resep_obat ro WHERE ro.no_rawat LIKE 'DR%' GROUP BY ro.no_rawat, ro.tgl_perawatan, ro.jam ORDER BY ro.no_rawat;"""
    visits = run_sql(visit_sql)
    print(f"Found {len(visits)} DR visits")

    # Get DR prescriptions (resep_obat + resep_dokter + databarang)
    rx_sql = """SELECT ro.no_rawat, rd.kode_brng, COALESCE(b.nama_brng, 'unknown'), COALESCE(CAST(b.ralan AS DECIMAL(12,2)), 0), COALESCE(rd.jml, 1) FROM resep_obat ro JOIN resep_dokter rd ON rd.no_resep = ro.no_resep LEFT JOIN databarang b ON b.kode_brng = rd.kode_brng WHERE ro.no_rawat LIKE 'DR%' ORDER BY ro.no_rawat, rd.kode_brng;"""
    rx_rows = run_sql(rx_sql)
    print(f"Found {len(rx_rows)} prescriptions")

    # Group by no_rawat
    rx_by_visit = {}
    for r in rx_rows:
        nr = r[0]
        if nr not in rx_by_visit:
            rx_by_visit[nr] = []
        rx_by_visit[nr].append({
            'kode_brng': r[1],
            'nama_brng': r[2].replace(' ', '_') if len(r) > 2 else 'unknown',
            'ralan_price': float(r[3]) if len(r) > 3 and r[3] else 0,
            'jml': int(float(r[4])) if len(r) > 4 and r[4] else 1,
        })

    with open(output_file, 'w') as f:
        for v in visits:
            nr = v[0]
            tgl = v[1]
            jam = v[2] if len(v) > 2 else '08:00:00'
            f.write(f"ENC {nr} {tgl} {jam}\n")

            for rx in rx_by_visit.get(nr, []):
                f.write(f"OBAT {nr} {rx['kode_brng']} {rx['nama_brng']} {rx['ralan_price']:.2f} {rx['jml']}\n")

            f.write("END\n")

    print(f"Wrote {len(visits)} encounters to {output_file}")

if __name__ == '__main__':
    main()
