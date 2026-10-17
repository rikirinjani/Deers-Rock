set -e
cd /opt/dr-benchmark
V="2026/10/01/800190"
echo "=== after the LIVE save (which succeeded via the Nota dialog), what changed for $V? ==="
echo "billing:        $(mysql -uroot -N -e "SELECT COUNT(*), COALESCE(SUM(totalbiaya),0) FROM sik.billing WHERE no_rawat='$V';")"
echo "nota_jalan:     $(mysql -uroot -N -e "SELECT COUNT(*), COALESCE(SUM(total),0) FROM sik.nota_jalan WHERE no_rawat='$V';")"
echo "detail_nota:    $(mysql -uroot -N -e "SELECT COUNT(*) FROM sik.detail_nota_jalan WHERE no_rawat='$V';")"
echo "piutang_pasien: $(mysql -uroot -N -e "SELECT COUNT(*) FROM sik.piutang_pasien WHERE no_rawat='$V';")"
echo "reg status_bayar: $(mysql -uroot -N -e "SELECT status_bayar FROM sik.reg_periksa WHERE no_rawat='$V';")"
echo ""
echo "=== was the pre-state (before unbill) billing=14? i.e. billing rows were consumer-produced, now gone ==="
echo "=== the form save: does it INSERT into billing at all? (bytecode) ==="
grep -oE "// String .*" /tmp/kjar3/dlg_biling.txt | grep -iE "insert into|billing|replace|VALUES" | sort -u | head
grep -nE "String [A-Za-z ]*INSERT|insert into billing|psbilling|pstelem" /tmp/kjar3/dlg_biling.txt | head
