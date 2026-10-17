import java.io.*;
import java.util.*;

public class MiniParse {
    public static void main(String[] a) throws Exception {
        BufferedReader br = new BufferedReader(new FileReader("/tmp/dr_encounters.txt"));
        String line; int n = 0, bad = 0;
        while ((line = br.readLine()) != null) {
            line = line.trim(); n++;
            if (line.isEmpty()) continue;
            String[] t = line.split("\\s+", 0);
            if (t[0].equals("ENC")) {
                try {
                    java.sql.Date.valueOf(t.length > 2 ? t[2] : "?");
                    java.sql.Time.valueOf(t.length > 3 ? (t[3].length() == 5 ? t[3] + ":00" : t[3]) : "00:00:00");
                } catch (Exception e) {
                    bad++;
                    if (bad <= 5) {
                        System.out.println("BAD line " + n + " len=" + t.length + " exc=" + e);
                        for (int k = 0; k < t.length; k++) {
                            StringBuilder sb = new StringBuilder("  tok[" + k + "]='");
                            for (char c : t[k].toCharArray()) sb.append((int) c < 32 ? "\\" + (int) c : c);
                            System.out.println(sb.append("'").toString());
                        }
                    }
                }
            }
        }
        System.out.println("total=" + n + " bad=" + bad);
    }
}
