import AESsecurity.EnkripsiAES;
import java.util.*;
import java.io.*;

/**
 * Patches setting/database.xml to use benchmark@localhost credentials (AES-encoded).
 * Args: <path-to-database.xml> <username> <password>
 * HOST/PORT/DATABASE are kept as-is (already decode to localhost/3306/sik).
 */
public class PatchDbXml {
    public static void main(String[] args) throws Exception {
        String xmlPath = args[0];
        String user = args[1];
        String pass = args[2];

        Properties prop = new Properties();
        try (FileInputStream fis = new FileInputStream(xmlPath)) {
            prop.loadFromXML(fis);
        }
        prop.setProperty("USER", user);
        prop.setProperty("PAS", pass); // raw; we re-encode below
        // Re-encode USER and PAS with AES (the xml stores AES blobs, not plaintext)
        prop.setProperty("USER", EnkripsiAES.encrypt(user));
        prop.setProperty("PAS", EnkripsiAES.encrypt(pass));

        try (FileOutputStream fos = new FileOutputStream(xmlPath)) {
            prop.storeToXML(fos, "Patched for benchmark user");
        }
        System.out.println("OK: " + xmlPath + " -> USER=" + user + " PAS=[AES blob]");
        // Verify round-trip
        Properties verify = new Properties();
        try (FileInputStream fis = new FileInputStream(xmlPath)) {
            verify.loadFromXML(fis);
        }
        String decUser = EnkripsiAES.decrypt(verify.getProperty("USER"));
        String decPass = EnkripsiAES.decrypt(verify.getProperty("PAS"));
        System.out.println("  round-trip USER=" + decUser + " PAS len=" + decPass.length());
    }
}
