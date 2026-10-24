import java.sql.*;

public class JdbcProbe {
    public static void main(String[] a) throws Exception {
        String url = "jdbc:mysql://localhost:3306/sik?useSSL=false&allowPublicKeyRetrieval=true&connectTimeout=10000&socketTimeout=600000";
        Class.forName("com.mysql.cj.jdbc.Driver");
        try (Connection c = DriverManager.getConnection(url, "root", "")) {
            DatabaseMetaData md = c.getMetaData();
            System.out.println("PROBE OK driver=" + md.getDriverName() + " " + md.getDriverVersion()
                + " server=" + md.getDatabaseProductVersion());
            try (Statement s = c.createStatement(); ResultSet r = s.executeQuery("SELECT COUNT(*) FROM billing")) {
                r.next();
                System.out.println("PROBE billing count=" + r.getInt(1));
            }
        }
    }
}
