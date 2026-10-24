import keuangan.DlgBilingRalan;
import fungsi.akses;
import fungsi.pengaturanbillingralan;
import java.awt.Component;
import java.awt.Container;
import java.awt.Window;
import java.lang.reflect.Field;
import javax.swing.*;
import javax.swing.border.Border;

/**
 * Headless driver for the REAL keuangan.DlgBilingRalan (compiled classes from
 * dist/SIMRSKhanza.jar, git 722b82e). Entry sequence copied verbatim from
 * simrskhanza.DlgKasirRalan: setText -> isCek() -> isRawat() -> setVisible(true),
 * then BtnSimpan.doClick() (the real save path incl. all gating).
 *
 * R5-HARNESS-FIX (v4): the save path pops a modal CONFIRM dialog
 * ("Data pembayaran belum tersimpan, apa anda mau menyimpannya...????") that
 * must be answered YES for the commit to proceed. v1-v3 reaper only DISPOSED
 * every modal JDialog, which kills that confirm without an answer -> save
 * aborts -> sukses=false, 0 rows written. Now the reaper CLICKS the default
 * (Yes/OK) button on modal confirm dialogs and disposes plain message dialogs.
 * The main loop additionally waits (bounded) for billing.sukses to flip true.
 */
public class BilingHarness {
    static volatile boolean running = true;

    public static void main(String[] args) throws Exception {
        boolean smoke = "--smoke".equals(args[0]);
        String[] visits = smoke ? new String[]{args[1]} : args;

        // Reaper v4: answer modal dialogs properly.
        // - showConfirmDialog (yes/no "Data pembayaran belum tersimpan...")
        //     -> click the YES button (JOptionPane type 0 = YES_NO, buttons
        //        "Yes"/"No") so the commit proceeds.
        // - showMessageDialog (e.g. "Proses simpan selesai") -> dispose.
        // - connect-retry ("Gagal koneksi ... Sisa percobaan") -> click OK so
        //     Khanza's own retry loop proceeds (a human would click OK).
        Thread reaper = new Thread(() -> {
            while (running) {
                try {
                    for (Window w : Window.getWindows()) {
                        if (w.isShowing() && w instanceof JDialog) {
                            JDialog dlg = (JDialog) w;
                            String title = String.valueOf(dlg.getTitle());
                            boolean modal = dlg.isModal();
                            // The save-confirm ("Konfirmasi", yes/no) needs YES.
                            JButton yes = findButton(dlg, "Yes", "Ya", "Simpan", "OK", "Ok");
                            if (modal && yes != null) {
                                System.out.println("[reaper] click YES on confirm dialog '" + title + "'");
                                SwingUtilities.invokeLater(yes::doClick);
                            } else if (modal && "Konfirmasi".equals(title)) {
                                // diagnostic: dump every button label so we can
                                // pick the right one on the next pass.
                                java.util.List<String> labels = new java.util.ArrayList<String>();
                                for (Component cc : ((java.awt.Container) dlg.getContentPane()).getComponents()) {
                                    if (cc instanceof Container) {
                                        for (Component x : ((Container) cc).getComponents()) {
                                            if (x instanceof JButton) {
                                                labels.add(String.valueOf(((JButton) x).getText()));
                                            }
                                        }
                                    } else if (cc instanceof JButton) {
                                        labels.add(String.valueOf(((JButton) cc).getText()));
                                    }
                                }
                                System.out.println("[reaper] KONFIRMASI-BUTTONS=" + labels + " disposing");
                                SwingUtilities.invokeLater(dlg::dispose);
                            } else {
                                System.out.println("[reaper] dispose dialog: '" + title + "'");
                                SwingUtilities.invokeLater(dlg::dispose);
                            }
                        }
                    }
                    Thread.sleep(150);
                } catch (Throwable t) { }
            }
        }, "dialog-reaper");
        reaper.setDaemon(true);
        reaper.start();

        pengaturanbillingralan.SetBillingRalan();   // real startup: load set_nota
        akses.setData("spv", "server");             // real login row from sik.admin
        System.out.println("[harness] login kode=" + akses.getkode()
            + " billing_ralan=" + akses.getbilling_ralan()
            + " cetakNota=" + pengaturanbillingralan.getCetakNotaSimpanRalan());

        Field btnField = DlgBilingRalan.class.getDeclaredField("BtnSimpan");
        btnField.setAccessible(true);
        Field tblField = DlgBilingRalan.class.getDeclaredField("tbBilling");
        tblField.setAccessible(true);
        Field suksesField = DlgBilingRalan.class.getDeclaredField("sukses");
        suksesField.setAccessible(true);

        for (String noRawat : visits) {
            System.out.println("=== VISIT " + noRawat + " START ===");
            long t0 = System.currentTimeMillis();
            DlgBilingRalan billing = new DlgBilingRalan(null, false);
            billing.setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
            billing.TNoRw.setText(noRawat);
            billing.isCek();
            billing.isRawat();
            billing.setVisible(true);
            Thread.sleep(2000);
            JTable tb = (JTable) tblField.get(billing);
            System.out.println("[" + noRawat + "] tbBilling rows=" + tb.getRowCount());
            if (!smoke) {
                // real cashier action: enter full payment into the default akun bayar row
                double total = 0;
                for (int r = 0; r < tb.getRowCount(); r++) {
                    try { total += Double.parseDouble(tb.getValueAt(r, 7).toString()); }
                    catch (Exception e) { }
                }
                Field akunField = DlgBilingRalan.class.getDeclaredField("tbAkunBayar");
                akunField.setAccessible(true);
                JTable tbA = (JTable) akunField.get(billing);
                if (tbA.getRowCount() > 0 && total > 0) {
                    tbA.setValueAt(String.valueOf(total), 0, 2);
                    billing.isKembali();
                    System.out.println("[" + noRawat + "] payment entered=" + total + " akunrows=" + tbA.getRowCount());
                } else {
                    System.out.println("[" + noRawat + "] no payment needed total=" + total + " akunrows=" + tbA.getRowCount());
                }
                System.out.println("[" + noRawat + "] BtnSimpan.doClick() ...");
                ((AbstractButton) btnField.get(billing)).doClick();
                // R5-HARNESS-FIX: bounded wait for the real save to commit (sukses flips
                // true only after the confirm dialog is answered YES and the row is
                // written). 30 s cap so a genuinely-failing save still terminates.
                long deadline = System.currentTimeMillis() + 30000;
                while (System.currentTimeMillis() < deadline) {
                    if (suksesField.getBoolean(billing)) {
                        System.out.println("[" + noRawat + "] sukses=true after "
                            + (System.currentTimeMillis() - t0) + " ms (waited)");
                        break;
                    }
                    Thread.sleep(300);
                }
            }
            System.out.println("=== VISIT " + noRawat + " DONE sukses=" + billing.sukses
                + " ms=" + (System.currentTimeMillis() - t0) + " ===");
            billing.dispose();
            Thread.sleep(700);
        }
        running = false;
        Thread.sleep(1000);
        System.exit(0);
    }

    /** First focusable button whose text matches one of the given labels. */
    private static JButton findButton(Window w, String... labels) {
        for (Component c : w.getComponents()) {
            if (c instanceof Container) {
                for (Component cc : ((Container) c).getComponents()) {
                    if (cc instanceof JButton) {
                        JButton b = (JButton) cc;
                        String t = String.valueOf(b.getText()).trim();
                        for (String l : labels) {
                            if (t.equalsIgnoreCase(l)) {
                                return b;
                            }
                        }
                    }
                }
            }
        }
        return null;
    }
}
