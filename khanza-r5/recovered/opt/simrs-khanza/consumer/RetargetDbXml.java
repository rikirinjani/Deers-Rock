import AESsecurity.EnkripsiAES;
import java.util.*;
import java.io.*;

/**
 * RetargetDbXml — Stage A G2 helper (benchmark runtime config, not Khanza source).
 *
 * Usage:
 *   java RetargetDbXml <database.xml>              -> prints current DATABASE (no changes)
 *   java RetargetDbXml <database.xml> <newdbname>  -> rewrites the DATABASE property
 *                                                     (AES-encoded, same key as Khanza)
 *
 * Only the DATABASE property is touched. HOST/PORT/USER/PAS are preserved
 * byte-for-byte. Nothing except the database NAME is ever printed (no host,
 * no port, no user, no password) so logs stay secret-free.
 *
 * Same pattern as PatchDbXml.java (which rewrites USER/PAS for the benchmark
 * user; see DECISIONS.md 2026-10-11 fixer launch notes).
 */
public class RetargetDbXml {
    public static void main(String[] args) throws Exception {
        String xmlPath = args[0];

        Properties prop = new Properties();
        try (FileInputStream fis = new FileInputStream(xmlPath)) {
            prop.loadFromXML(fis);
        }
        String cur = EnkripsiAES.decrypt(prop.getProperty("DATABASE")).trim();

        if (args.length < 2) {
            System.out.println(cur);
            return;
        }
        String newDb = args[1].trim();
        if (newDb.equals(cur)) {
            System.out.println("OK: " + xmlPath + " DATABASE already=" + newDb);
            return;
        }
        prop.setProperty("DATABASE", EnkripsiAES.encrypt(newDb));
        try (FileOutputStream fos = new FileOutputStream(xmlPath)) {
            prop.storeToXML(fos, "Stage A G2: DATABASE retargeted (reversible; backup kept by caller)");
        }
        // verify round-trip from disk
        Properties verify = new Properties();
        try (FileInputStream fis = new FileInputStream(xmlPath)) {
            verify.loadFromXML(fis);
        }
        String dec = EnkripsiAES.decrypt(verify.getProperty("DATABASE")).trim();
        if (!dec.equals(newDb)) {
            System.out.println("FAIL: round-trip mismatch after patch");
            System.exit(3);
        }
        System.out.println("OK: " + xmlPath + " DATABASE " + cur + " -> " + newDb + " (round-trip verified)");
    }
}
