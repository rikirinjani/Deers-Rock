import AESsecurity.EnkripsiAES;
import net.sf.jasperreports.engine.*;
import net.sf.jasperreports.engine.export.JRCsvExporter;
import net.sf.jasperreports.engine.util.JRLoader;
import java.sql.*;
import java.io.*;
import java.util.*;
import java.text.SimpleDateFormat;

/**
 * JasperHeadless — Stage A G2 headless Jasper report filler.
 *
 * Usage: java JasperHeadless <report.jasper> <out.csv> [yyyy-MM-dd yyyy-MM-dd]
 *
 * Connects using AES-decoded credentials from setting/database.xml (run with
 * cwd=/opt/simrs-khanza/run-env so the retargeted copy is used — same file the
 * real form reads). The Khanza report dialogs populate the `temporary` table
 * in-app before filling; the caller (run_jasper_reports.py) populates
 * `temporary` with the template-SQL first, so this filler runs the REAL
 * compiled .jasper over the REAL data — genuinely exercising the Jasper engine
 * (fill + CSV export) rather than only running SQL.
 *
 * Prints only: db name, OK rows=N, or the first exception line. No host/user/
 * password is ever printed. Exit codes: 0 ok, 3 fill/export failure.
 */
public class JasperHeadless {
    public static void main(String[] args) throws Exception {
        String jasperPath = args[0];
        String csvOut = args[1];
        String d1 = args.length > 2 ? args[2] : "2026-10-01";
        String d2 = args.length > 3 ? args[3] : "2026-10-31";

        Properties prop = new Properties();
        try (FileInputStream fis = new FileInputStream("setting/database.xml")) {
            prop.loadFromXML(fis);
        }
        String host = EnkripsiAES.decrypt(prop.getProperty("HOST")).trim();
        String port = EnkripsiAES.decrypt(prop.getProperty("PORT")).trim();
        String database = EnkripsiAES.decrypt(prop.getProperty("DATABASE")).trim();
        String user = EnkripsiAES.decrypt(prop.getProperty("USER")).trim();
        String pass = EnkripsiAES.decrypt(prop.getProperty("PAS"));

        Connection conn = DriverManager.getConnection(
            "jdbc:mysql://" + host + ":" + port + "/" + database
            + "?useSSL=false&allowPublicKeyRetrieval=true&connectTimeout=10000&socketTimeout=300000",
            user, pass);
        System.out.println("OK: connected to " + database);

        JasperReport report = (JasperReport) JRLoader.loadObject(new File(jasperPath));

        // Auto-fill declared parameters with safe defaults; date params get the
        // period bounds. Khanza header params (namars, alamatrs, ...) do not
        // affect the CSV data columns.
        Map<String, Object> params = new HashMap<String, Object>();
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd");
        for (JRParameter p : report.getParameters()) {
            if (p.isSystemDefined()) continue;
            String name = p.getName();
            Class<?> cls = p.getValueClass();
            Object v = null;
            if (cls == java.util.Date.class) {
                v = sdf.parse(name.toLowerCase().contains("2") ? d2 : d1);
            } else if (cls == String.class) {
                v = "";
            } else if (cls == Integer.class || cls == Long.class || cls == Short.class) {
                v = Integer.valueOf(0);
            } else if (cls == Double.class || cls == Float.class) {
                v = Double.valueOf(0);
            } else if (cls == java.io.InputStream.class) {
                v = null; // logo — unused for CSV data
            }
            params.put(name, v);
        }

        JasperPrint print;
        try {
            print = JasperFillManager.fillReport(report, params, conn);
        } catch (JRException e) {
            Throwable r = e;
            while (r.getCause() != null) r = r.getCause();
            System.out.println("ERR fill: " + r.toString().substring(0, Math.min(200, r.toString().length())));
            System.exit(3);
        }
        JRCsvExporter exporter = new JRCsvExporter();
        exporter.setParameter(JRCsvExporterParameter.JASPER_PRINT, print);
        exporter.setParameter(JRCsvExporterParameter.OUTPUT_FILE_NAME, csvOut);
        exporter.exportReport();
        System.out.println("OK rows=" + print.getPages().size() + " -> " + csvOut);
        conn.close();
    }
}
