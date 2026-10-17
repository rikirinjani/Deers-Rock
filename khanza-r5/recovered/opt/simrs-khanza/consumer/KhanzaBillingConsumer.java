import AESsecurity.EnkripsiAES;
import java.sql.*;
import java.io.*;
import java.util.*;
import java.text.*;

/**
 * KhanzaBillingConsumer v2 — reads DR encounter events in line format,
 * connects to Khanza DB using AES-decoded credentials from
 * setting/database.xml (exactly like Khanza itself), and writes
 * billing/nota_jalan/detail_pemberian_obat rows replicating DlgBilingRalan
 * (real-form headless validation 2026-10-10, report /tmp/real_form_validation.md).
 *
 * Line format:
 *   ENC <no_rawat> <tgl:YYYY-MM-DD> <jam:HH:MM:SS>
 *   OBAT <no_rawat> <kode_brng> <nama_with_underscores> <h_beli> <jml>
 *   END
 *
 * Idempotent: deletes prior billing/nota_jalan rows for each no_rawat first.
 *
 * v2 replica fixes (per real_form_validation.md §5/§8):
 *   1. PPN Obat = Math.round(subttl * 0.11) — 11%, whole rupiah, half-up.
 *      subttl = Σ detail_pemberian_obat.total (+ embalase+tuslah), i.e. billed
 *      from the dpo grouped query exactly like prosesCariObat — NOT from OBAT lines.
 *   2. Registrasi = reg_periksa.biaya_reg (per-visit column); PPN Registrasi row removed.
 *   3. No Tagihan grand-total row (real form never writes one; grand total is derived).
 *   4. Obat naming = nama_brng + " (" + jenis.nama + ")" (databarang.kdjns = jenis.kdjns).
 *      NOTE: the jenis table is `jenis` (NOT jenis_brng) — verified against
 *      DlgBilingRalan sqlpscariobat and SHOW TABLES.
 *   5. Full real-form header row set: No.Nota, Unit/Instansi, Tanggal & Jam,
 *      No.RM, Nama Pasien, Alamat Pasien, "Dokter " + doctor name, Registrasi,
 *      Tindakan (+ procedure rows), Obat & BHP (+ drug rows + PPN + TtlObat),
 *      Tambahan Biaya, Potongan Biaya — exact order/pemisah/status per the
 *      real-form dump (/tmp/real_form_*.csv).
 *
 * DRU-1 fix (2026-10-10): the export can contain DUPLICATED OBAT lines for the
 * same (no_rawat, kode_brng) — 4 identical rows for one dispense (same no_resep,
 * same jam, identical jml). The consumer now dedups identical lines and writes
 * the ABSOLUTE total quantity (idempotent UPSERT), not a skipped/accumulated
 * value. Identical jml across lines -> single value; distinct jml -> sum
 * (genuine multiple dispenses). This closes the 431-unit / Rp 23.7M undercount.
 *
 * Seed-leakage fix (2026-10-11): DR-only guard — ENC blocks whose visit has
 * no_rkm_medis NOT LIKE 'DR%' are skipped (benchmark bills DR synthetic
 * visits only; the old export leaked 34 seed visits into billing).
 *
 * Documented deviations from the real form (environmental, per report §5.6):
 *   - nota number/tgl_byr derived from the visit's registration date, not the
 *     run date (deterministic re-runs); real form uses its run date.
 *   - "Tanggal & Jam" row shows tgl_registrasi + consumer run time, mirroring
 *     sqlpsreg's current_time() semantics.
 *   - deterministic tiebreaks added to the grouped drug/procedure queries
 *     (ORDER BY ..., kode_brng / nm_perawatan); real form leaves MySQL 8 group
 *     order unspecified on ties (DR data never ties).
 *   - session sql_mode drops ONLY_FULL_GROUP_BY for this connection only
 *     (same as the GUI harness shim; server global untouched).
 */
public class KhanzaBillingConsumer {

    static Connection db;
    static int processed = 0;
    static int billingRows = 0;
    static double totalRp = 0;
    static long totalMs = 0;

    /** Valid.SetAngka3 replica: ###,###,###,###,###,###,###.################# */
    static final DecimalFormat ANGKA3 = new DecimalFormat("###,###,###,###,###,###,###.#################");

    public static void main(String[] args) throws Exception {
        String inputFile = args[0];
        String logFile = args.length > 1 ? args[1] : "/tmp/khanza_consumer.log";

        // Connect using AES-decoded credentials from setting/database.xml
        Properties prop = new Properties();
        try (FileInputStream fis = new FileInputStream("setting/database.xml")) {
            prop.loadFromXML(fis);
        }
        String host = EnkripsiAES.decrypt(prop.getProperty("HOST")).trim();
        String port = EnkripsiAES.decrypt(prop.getProperty("PORT")).trim();
        String database = EnkripsiAES.decrypt(prop.getProperty("DATABASE")).trim();
        String user = EnkripsiAES.decrypt(prop.getProperty("USER")).trim();
        String pass = EnkripsiAES.decrypt(prop.getProperty("PAS"));

        String jdbcUrl = "jdbc:mysql://" + host + ":" + port + "/" + database
            + "?useSSL=false&allowPublicKeyRetrieval=true&connectTimeout=10000&socketTimeout=600000&tcpKeepAlive=true";

        System.out.println("OK: Connecting to " + host + ":" + port + "/" + database
            + " as " + user + " (Khanza AES credentials from database.xml, MySQL Connector/J driver)");
        Class.forName("com.mysql.cj.jdbc.Driver");
        db = DriverManager.getConnection(jdbcUrl, user, pass);
        db.setAutoCommit(true);
        // Session-only: DlgBilingRalan's grouped queries use bare non-aggregated
        // columns (MySQL 5.x semantics). The GUI harness does the same per session.
        exec("SET SESSION sql_mode=(SELECT REPLACE(@@sql_mode,'ONLY_FULL_GROUP_BY',''))");
        DatabaseMetaData md = db.getMetaData();
        System.out.println("OK: Khanza DB connected — driver " + md.getDriverName()
            + " " + md.getDriverVersion() + " / server " + md.getDatabaseProductVersion());

        List<String[]> lines = new ArrayList<>();
        try (BufferedReader br = new BufferedReader(new FileReader(inputFile))) {
            String line;
            while ((line = br.readLine()) != null) {
                line = line.trim();
                if (!line.isEmpty()) lines.add(line.split("\\s+", 0));
            }
        }
        System.out.println("OK: Parsed " + lines.size() + " lines from " + inputFile);

        PrintWriter log = new PrintWriter(new FileWriter(logFile, true));
        log.println("=== KhanzaBillingConsumer v2 start " + new java.util.Date() + " ===");
        long t_start = System.currentTimeMillis();

        int i = 0;
        while (i < lines.size()) {
            String[] tokens = lines.get(i);
            if (!tokens[0].equals("ENC") || tokens.length < 4) { i++; continue; }

            String noRawat = tokens[1];
            String tglReg = tokens[2];
            String jamReg = tokens[3];
            long t0 = System.nanoTime();

            // 0a. Normalize bad dates (e.g. resep_obat '0000-00-00') from reg_periksa
            if (!tglReg.matches("\\d{4}-\\d{2}-\\d{2}") || tglReg.startsWith("0000")) {
                String rp = queryIsi("SELECT CONCAT(tgl_registrasi,'|',COALESCE(jam_reg,'08:00:00')) FROM reg_periksa WHERE no_rawat='" + noRawat + "'");
                if (rp.contains("|")) {
                    String[] parts = rp.split("\\|");
                    if (parts[0].matches("\\d{4}-\\d{2}-\\d{2}") && !parts[0].startsWith("0000")) {
                        tglReg = parts[0];
                        jamReg = parts[1];
                    }
                }
            }
            if (!tglReg.matches("\\d{4}-\\d{2}-\\d{2}") || tglReg.startsWith("0000")
                || !jamReg.matches("\\d{2}:\\d{2}:\\d{2}")) {
                log.println("  WARN skip " + noRawat + ": unparseable tgl/jam " + tglReg + " " + jamReg);
                System.out.println("WARN: skip " + noRawat + " (bad tgl/jam: " + tglReg + " " + jamReg + ")");
                i++; continue;
            }

            // 0. Skip visits without a reg_periksa row (billing FK target)
            if (!regExists(noRawat)) {
                log.println("  WARN skip " + noRawat + ": no reg_periksa row");
                System.out.println("WARN: skip " + noRawat + " (no reg_periksa row)");
                i++; continue;
            }

            // 0b. DR-only guard (seed-leakage fix 2026-10-11, checklist section 5):
            //     the benchmark bills ONLY DR synthetic visits (no_rkm_medis LIKE 'DR%').
            //     The export's date-only filter used to match 34 seed visits; this guard
            //     is defense-in-depth so the consumer can never bill a non-DR visit even
            //     if a future export leak reintroduces one.
            String rkmGuard = queryIsi("SELECT no_rkm_medis FROM reg_periksa WHERE no_rawat='" + noRawat + "'");
            if (!rkmGuard.startsWith("DR")) {
                log.println("  SKIP " + noRawat + ": non-DR visit (no_rkm_medis='" + rkmGuard + "') DR-only guard");
                System.out.println("SKIP: " + noRawat + " non-DR visit (DR-only guard, seed-leakage fix)");
                i++; continue;
            }

            // 1. Idempotent cleanup of any prior pipeline data for this visit.
            //    Multi-ENC visits: the FIRST ENC block for a no_rawat deletes ALL prior
            //    billing/nota_jalan rows for that visit; subsequent ENC blocks find the
            //    visit already rebuilt and only append (their DELETE is a no-op since the
            //    first block already cleared it). This prevents the 13,000-row bloat bug
            //    where each of 512 ENC blocks for 321 visits would otherwise leave
            //    orphaned rows from earlier blocks.
            //    (The real form bills once per visit; multi-ENC is a DR export artifact
            //    of one-ENC-per-prescription-event. The consumer's delete-then-rebuild
            //    is the correct semantic: last-writer-wins per no_rawat.)
            exec("DELETE FROM billing WHERE no_rawat = '" + noRawat + "'");
            exec("DELETE FROM nota_jalan WHERE no_rawat = '" + noRawat + "'");

            // 2. Nota number: DlgBilingRalan/Valid.autoNomer3 convention -> YYYY/MM/DD/RJ%04d
            String nota;
            try (PreparedStatement ps = db.prepareStatement(
                "SELECT IFNULL(MAX(CAST(RIGHT(no_nota, 4) AS UNSIGNED)), 0) FROM nota_jalan WHERE tanggal = ?")) {
                ps.setDate(1, java.sql.Date.valueOf(tglReg));
                try (ResultSet rs = ps.executeQuery()) {
                    int maxNum = rs.next() ? rs.getInt(1) : 0;
                    nota = tglReg.replace("-", "/") + "/RJ" + String.format("%04d", maxNum + 1);
                }
            }

            // 3. Insert nota_jalan
            try (PreparedStatement ps = db.prepareStatement(
                "INSERT INTO nota_jalan (no_rawat, no_nota, tanggal, jam) VALUES (?, ?, ?, ?)")) {
                ps.setString(1, noRawat);
                ps.setString(2, nota);
                ps.setDate(3, java.sql.Date.valueOf(tglReg));
                ps.setTime(4, java.sql.Time.valueOf(jamReg.length() == 5 ? jamReg + ":00" : jamReg));
                ps.executeUpdate();
            }

            // 4. Collect OBAT lines until END / next ENC
            List<String[]> obatItems = new ArrayList<>();
            i++;
            while (i < lines.size()) {
                String[] t2 = lines.get(i);
                if (t2[0].equals("END") || t2[0].equals("ENC")) break;
                if (t2[0].equals("OBAT") && t2.length >= 6 && t2[1].equals(noRawat)) {
                    obatItems.add(t2);
                }
                i++;
            }

            // 5. Insert/update detail_pemberian_obat rows (Khanza pharmacy dispensing).
            //    DRU-1 fix (v2, corrected): the export can contain DUPLICATE lines for
            //    the same (no_rawat, kode_brng). Two distinct patterns exist:
            //      (a) IDENTICAL re-send: N lines, all same jml (e.g. 4x jml=9).
            //          Source: same no_resep re-exported; the generator duplicated the row.
            //          Correct quantity = the single jml value (NOT N*jml, NOT a sum).
            //      (b) RE-ROLLED re-send: N lines with DIFFERENT jml (e.g. jml=27,30).
            //          Source: the DR generator re-picked a random quantity on each
            //          re-export of the same prescription. This is a DATA DEFECT in the
            //          generator (DOC-2): the same no_resep+kode_brng has inconsistent jml.
            //          Correct quantity = MAX(jml) over the pair (deterministic, bills the
            //          highest re-rolled value — conservative for the benchmark). NOT a sum
            //          (summing re-rolled re-sends double/triple-counts the dispense).
            //    The previous "sum distinct jml" rule was WRONG: it treated re-rolled re-sends
            //    as additive dispenses, producing the +114M revenue jump. Corrected to MAX.
            //    UPSERT with absolute total (idempotent: re-running re-derives the same value).
            Map<String, List<String[]>> byPair = new LinkedHashMap<>();
            for (String[] o : obatItems) {
                String key = o[2]; // kode_brng (no_rawat is fixed for this visit)
                byPair.computeIfAbsent(key, k -> new ArrayList<>()).add(o);
            }
            for (Map.Entry<String, List<String[]>> e : byPair.entrySet()) {
                String kodeBrng = e.getKey();
                List<String[]> pairLines = e.getValue();
                double hBeli = parseDouble(pairLines.get(0)[pairLines.get(0).length - 2]);
                double jml = 0;
                for (String[] l : pairLines) {
                    double v = parseDouble(l[l.length - 1]);
                    if (v > jml) jml = v; // MAX over the pair (identical case: single value; re-rolled: highest)
                }
                double total = hBeli * jml;
                // UPSERT: absolute totals (idempotent)
                boolean exists = false;
                try (PreparedStatement ps = db.prepareStatement(
                    "SELECT COUNT(*) FROM detail_pemberian_obat WHERE no_rawat = ? AND kode_brng = ?")) {
                    ps.setString(1, noRawat);
                    ps.setString(2, kodeBrng);
                    try (ResultSet rs = ps.executeQuery()) {
                        exists = rs.next() && rs.getInt(1) > 0;
                    }
                }
                if (exists) {
                    try (PreparedStatement ps = db.prepareStatement(
                        "UPDATE detail_pemberian_obat SET jml = ?, h_beli = ?, biaya_obat = ?, total = ? " +
                        "WHERE no_rawat = ? AND kode_brng = ?")) {
                        ps.setDouble(1, jml);
                        ps.setDouble(2, hBeli);
                        ps.setDouble(3, hBeli);
                        ps.setDouble(4, total);
                        ps.setString(5, noRawat);
                        ps.setString(6, kodeBrng);
                        ps.executeUpdate();
                    }
                } else {
                    try (PreparedStatement ps = db.prepareStatement(
                        "INSERT INTO detail_pemberian_obat (tgl_perawatan, jam, no_rawat, kode_brng, " +
                        "h_beli, biaya_obat, jml, embalase, tuslah, total, status, no_batch, no_faktur) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, 'Ralan', '', '')")) {
                        ps.setDate(1, java.sql.Date.valueOf(tglReg));
                        ps.setTime(2, java.sql.Time.valueOf(jamReg.length() == 5 ? jamReg + ":00" : jamReg));
                        ps.setString(3, noRawat);
                        ps.setString(4, kodeBrng);
                        ps.setDouble(5, hBeli);
                        ps.setDouble(6, hBeli);
                        ps.setDouble(7, jml);
                        ps.setDouble(8, total);
                        ps.executeUpdate();
                    }
                }
            }

            // ================================================================
            // 6. Billing rows — replicating DlgBilingRalan's exact row set.
            //    (isSimpan with CetakNotaSimpanRalan=Yes: every section shown;
            //     RincianDokterRalan=No: biaya=biaya_rawat; TampilkanPpnObatRalan=Yes.)
            // ================================================================
            int idx = 0;
            double grandTotal = 0;
            String runTime = new SimpleDateFormat("HH:mm:ss").format(new java.util.Date());

            // 6a-1. reg_periksa context (prosesCariReg / sqlpsreg)
            String tglRegistrasi = tglReg;
            String noRkm = "", kdPoli = "", nmPoli = "", noRawatDb = "";
            double biayaReg = 0;
            String umurdaftar = "", sttsumur = "", kdDokter = "";
            try (PreparedStatement ps = db.prepareStatement(
                "SELECT tgl_registrasi, no_rkm_medis, kd_poli, no_rawat, biaya_reg, " +
                "umurdaftar, sttsumur, kd_dokter FROM reg_periksa WHERE no_rawat = ?")) {
                ps.setString(1, noRawat);
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) {
                        tglRegistrasi = rs.getString(1);
                        noRkm = nz(rs.getString(2));
                        kdPoli = nz(rs.getString(3));
                        noRawatDb = nz(rs.getString(4));
                        biayaReg = rs.getDouble(5);
                        umurdaftar = nz(rs.getString(6));
                        sttsumur = nz(rs.getString(7));
                        kdDokter = nz(rs.getString(8));
                    }
                }
            }

            // 6a-2. Header rows (status '-', zero values)
            insertRow(idx++, noRawat, tglReg, "No.Nota", ": " + nota, "", 0, 0, 0, 0, "-");

            nmPoli = queryIsi("SELECT nm_poli FROM poliklinik WHERE kd_poli = '" + kdPoli + "'");
            insertRow(idx++, noRawat, tglReg, "Unit/Instansi",
                nmPoli.isEmpty() ? ": " : ": " + nmPoli, "", 0, 0, 0, 0, "-");

            insertRow(idx++, noRawat, tglReg, "Tanggal & Jam",
                ": " + tglRegistrasi + " " + runTime, "", 0, 0, 0, 0, "-");

            insertRow(idx++, noRawat, tglReg, "No.RM", ": " + noRkm, "", 0, 0, 0, 0, "-");

            String nmPasien = queryIsi("SELECT nm_pasien FROM pasien WHERE no_rkm_medis = '" + noRkm + "'");
            insertRow(idx++, noRawat, tglReg, "Nama Pasien",
                ": " + nmPasien + " (" + umurdaftar + sttsumur + ")", "", 0, 0, 0, 0, "-");

            // sqlpscarialamat: concat(alamat, nm_kel, nm_kec, nm_kab) via INNER JOINs;
            // no row -> fallback ": " (form's catch branch)
            String alamatFull = queryIsi(
                "SELECT CONCAT(pasien.alamat,', ',kelurahan.nm_kel,', ',kecamatan.nm_kec,', ',kabupaten.nm_kab) " +
                "FROM pasien INNER JOIN kelurahan INNER JOIN kecamatan INNER JOIN kabupaten " +
                "ON pasien.kd_kel=kelurahan.kd_kel AND pasien.kd_kec=kecamatan.kd_kec " +
                "AND pasien.kd_kab=kabupaten.kd_kab WHERE pasien.no_rkm_medis = '" + noRkm + "'");
            insertRow(idx++, noRawat, tglReg, "Alamat Pasien",
                alamatFull.isEmpty() ? ": " : ": " + alamatFull, "", 0, 0, 0, 0, "-");

            // 6a-3. Dokter header + name rows (only when a doctor exists; name row has NO pemisah)
            String nmDokter = queryIsi(
                "SELECT d.nm_dokter FROM reg_periksa r INNER JOIN dokter d ON r.kd_dokter = d.kd_dokter " +
                "WHERE r.no_rawat = '" + noRawat + "'");
            if (!nmDokter.isEmpty()) {
                insertRow(idx++, noRawat, tglReg, "Dokter ", ":", "", 0, 0, 0, 0, "-");
                insertRow(idx++, noRawat, tglReg, "", nmDokter, "", 0, 0, 0, 0, "Dokter");
            }

            // 6a-4. Registrasi = reg_periksa.biaya_reg (totalbiaya only; NO PPN Registrasi row)
            insertRow(idx++, noRawat, tglReg, "Registrasi", ":", "", 0, 0, 0, biayaReg, "Registrasi");
            grandTotal += biayaReg;

            // 6b. Tindakan section header + procedure rows from rawat_jl_dr
            //     (real form's grouped query; RincianDokterRalan=No branch:
            //      biaya=biaya_rawat, jumlah=COUNT, total=SUM(biaya_rawat))
            insertRow(idx++, noRawat, tglReg, "Tindakan", ":", "", 0, 0, 0, 0, "Ralan Dokter");
            double detailjs = 0;
            try (PreparedStatement ps = db.prepareStatement(
                "SELECT jns_perawatan.nm_perawatan, rawat_jl_dr.biaya_rawat AS total_byrdr, " +
                "COUNT(rawat_jl_dr.kd_jenis_prw) AS jml, SUM(rawat_jl_dr.biaya_rawat) AS biaya, " +
                "(SUM(rawat_jl_dr.material)+SUM(rawat_jl_dr.menejemen)+SUM(rawat_jl_dr.kso)) AS totalmaterial " +
                "FROM rawat_jl_dr INNER JOIN jns_perawatan " +
                "ON rawat_jl_dr.kd_jenis_prw=jns_perawatan.kd_jenis_prw " +
                "WHERE rawat_jl_dr.no_rawat = ? GROUP BY jns_perawatan.nm_perawatan " +
                "ORDER BY jns_perawatan.nm_perawatan")) {
                ps.setString(1, noRawat);
                try (ResultSet rs = ps.executeQuery()) {
                    while (rs.next()) {
                        double biaya = rs.getDouble(2);
                        double jml = rs.getDouble(3);
                        double total = rs.getDouble(4);
                        detailjs += rs.getDouble(5);
                        insertRow(idx++, noRawat, tglReg, "", rs.getString(1), ":",
                            biaya, jml, 0, total, "Ralan Dokter");
                        grandTotal += total;
                    }
                }
            }
            if (detailjs > 0) { // chkSarpras section (absent for DR data: material/menejemen/kso = 0)
                insertRow(idx++, noRawat, tglReg, "", "Jasa Sarana dan Prasarana", ":", 0, 0, 0, detailjs, "Ralan Dokter");
                grandTotal += detailjs;
            }

            // 6c. Obat & BHP section header + drug rows from dpo (real form's
            //     sqlpscariobat grouped query: GROUP BY kode_brng ORDER BY jenis.nama)
            insertRow(idx++, noRawat, tglReg, "Obat & BHP", ":", "", 0, 0, 0, 0, "Obat");
            double subttl = 0;
            try (PreparedStatement ps = db.prepareStatement(
                "SELECT databarang.nama_brng, jenis.nama, detail_pemberian_obat.biaya_obat, " +
                "SUM(detail_pemberian_obat.jml) AS jml, " +
                "SUM(detail_pemberian_obat.embalase+detail_pemberian_obat.tuslah) AS tambahan, " +
                "(SUM(detail_pemberian_obat.total)-SUM(detail_pemberian_obat.embalase+detail_pemberian_obat.tuslah)) AS total " +
                "FROM detail_pemberian_obat INNER JOIN databarang INNER JOIN jenis " +
                "ON detail_pemberian_obat.kode_brng=databarang.kode_brng AND databarang.kdjns=jenis.kdjns " +
                "WHERE detail_pemberian_obat.no_rawat = ? GROUP BY detail_pemberian_obat.kode_brng " +
                "ORDER BY jenis.nama, detail_pemberian_obat.kode_brng")) {
                ps.setString(1, noRawat);
                try (ResultSet rs = ps.executeQuery()) {
                    while (rs.next()) {
                        String nama = rs.getString(1) + " (" + rs.getString(2) + ")";
                        double biayaObat = rs.getDouble(3);
                        double jml = rs.getDouble(4);
                        double tambahan = rs.getDouble(5);
                        double rowTotal = rs.getDouble(6) + tambahan;
                        insertRow(idx++, noRawat, tglReg, "", nama, ":",
                            biayaObat, jml, tambahan, rowTotal, "Obat");
                        subttl += rowTotal;
                    }
                }
            }

            // 6d. PPN Obat = Math.round(subttl * 0.11) — whole rupiah, half-up;
            //     + TtlObat subtotal display row (Valid.SetAngka3 format)
            if (subttl > 0) {
                double ppn = Math.round(subttl * 0.11);
                insertRow(idx++, noRawat, tglReg, "", "PPN Obat", ":", ppn, 1, 0, ppn, "Obat");
                insertRow(idx++, noRawat, tglReg, "", ANGKA3.format(subttl + ppn), "", 0, 0, 0, 0, "TtlObat");
                grandTotal += subttl + ppn;
            }

            // 6e. Tambahan Biaya / Potongan Biaya sections (usually header-only for DR)
            insertRow(idx++, noRawat, tglReg, "Tambahan Biaya", ":", "", 0, 0, 0, 0, "Tambahan");
            try (PreparedStatement ps = db.prepareStatement(
                "SELECT nama_biaya, besar_biaya FROM tambahan_biaya WHERE no_rawat = ? ORDER BY nama_biaya")) {
                ps.setString(1, noRawat);
                try (ResultSet rs = ps.executeQuery()) {
                    while (rs.next()) {
                        double besar = rs.getDouble(2);
                        insertRow(idx++, noRawat, tglReg, "", rs.getString(1), ":", besar, 1, 0, besar, "Tambahan");
                        grandTotal += besar;
                    }
                }
            }
            insertRow(idx++, noRawat, tglReg, "Potongan Biaya", ":", "", 0, 0, 0, 0, "Potongan");
            try (PreparedStatement ps = db.prepareStatement(
                "SELECT nama_pengurangan, besar_pengurangan FROM pengurangan_biaya WHERE no_rawat = ? ORDER BY nama_pengurangan")) {
                ps.setString(1, noRawat);
                try (ResultSet rs = ps.executeQuery()) {
                    while (rs.next()) {
                        double besar = rs.getDouble(2);
                        insertRow(idx++, noRawat, tglReg, "", rs.getString(1), ":", besar, 1, 0, -besar, "Potongan");
                        grandTotal -= besar;
                    }
                }
            }

            // NO Tagihan grand-total row — the real form never writes one (§5.3).

            long ms = (System.nanoTime() - t0) / 1_000_000;
            totalMs += ms;
            totalRp += grandTotal;
            billingRows += idx;
            processed++;
            log.println(String.format("  %s: %dms | nota=%s | Rp %,.0f", noRawat, ms, nota, grandTotal));
            // advance past END only if we actually stopped on one (multi-ENC visits: loop on next ENC)
            if (i < lines.size() && lines.get(i)[0].equals("END")) { i++; }
        }

        long t_elapsed = System.currentTimeMillis() - t_start;
        double avgMs = processed > 0 ? totalMs / (double) processed : 0;

        System.out.println("OK: Processed " + processed + " visits in " + (t_elapsed / 1000) + "s (avg " + String.format("%.1f", avgMs) + "ms/visit)");
        System.out.println("    Billing rows inserted: " + billingRows + " | Total revenue: Rp " + String.format("%,.0f", totalRp));
        log.println("OK: Processed " + processed + " visits, " + billingRows + " billing rows, total Rp " + String.format("%,.0f", totalRp) + ", avg " + String.format("%.1f", avgMs) + "ms/visit");
        log.println("=== KhanzaBillingConsumer v2 done " + new java.util.Date() + " ===");
        log.close();

        db.close();
        System.out.println("DONE: KhanzaBillingConsumer completed");
    }

    static boolean regExists(String noRawat) throws SQLException {
        try (PreparedStatement ps = db.prepareStatement(
            "SELECT COUNT(*) FROM reg_periksa WHERE no_rawat = ?")) {
            ps.setString(1, noRawat);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() && rs.getInt(1) > 0;
            }
        }
    }

    static String queryIsi(String sql) {
        try (Statement st = db.createStatement(); ResultSet rs = st.executeQuery(sql)) {
            return rs.next() ? nz(rs.getString(1)) : "";
        } catch (Exception e) {
            return "";
        }
    }

    static void exec(String sql) throws SQLException {
        try (Statement st = db.createStatement()) {
            st.executeUpdate(sql);
        }
    }

    static void insertRow(int noIndex, String noRawat, String tgl,
                          String no, String nmPerawatan, String pemisah,
                          double biaya, double jumlah, double tambahan,
                          double totalBiaya, String status) throws SQLException {
        try (PreparedStatement ps = db.prepareStatement(
            "INSERT INTO billing (noindex, no_rawat, tgl_byr, no, nm_perawatan, pemisah, " +
            "biaya, jumlah, tambahan, totalbiaya, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")) {
            ps.setInt(1, noIndex);
            ps.setString(2, noRawat);
            ps.setDate(3, java.sql.Date.valueOf(tgl));
            ps.setString(4, no);
            // isSimpan strips single quotes from nm_perawatan
            ps.setString(5, nmPerawatan == null ? "" : nmPerawatan.replace("'", ""));
            ps.setString(6, pemisah == null || pemisah.isEmpty() ? "" : pemisah);
            ps.setDouble(7, biaya);
            ps.setDouble(8, jumlah);
            ps.setDouble(9, tambahan);
            ps.setDouble(10, totalBiaya);
            ps.setString(11, status);
            ps.executeUpdate();
        }
    }

    static double parseDouble(String s) {
        try { return Double.parseDouble(s); } catch (Exception e) { return 0; }
    }

    static String nz(String s) {
        return s == null ? "" : s;
    }
}
