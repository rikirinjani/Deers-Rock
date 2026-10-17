cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1
echo "=== revert drift-demo price tamper (ralan B000001135) ==="
mysql -uroot -N -e "SELECT kode_brng, ralan FROM sik.databarang WHERE kode_brng='"'"'B000001135'"'"';"
echo "(value shown is current; the P5 drift demo tampered it to +1000 from the F1 baseline 34,584)"
mysql -uroot -N -e "UPDATE sik.databarang SET ralan=34584 WHERE kode_brng='"'"'B000001135'"'"';"
echo "reverted. now: $(mysql -uroot -N -e "SELECT ralan FROM sik.databarang WHERE kode_brng='"'"'B000001135'"'"';")"
echo ""
echo "=== consumer-rebill the 2 drift-demo visits back to canonical (consumer settlement) ==="
# the drift demo BILLED 000254+000289 through the form; consumer settlement may now differ.
# Re-run the consumer over these 2 visits to restore the canonical billing rows.
printf "2026/10/01/000254\n2026/10/01/000289\n" > /tmp/r5p5_rebill.txt
python3 - << "PY"
import sys; sys.path.insert(0,'.')
import dbutil
# use the consumer to re-settle these 2 visits (canonical)
# The P5 drift demo already left them form-billed; verify current billing state
for n in ["2026/10/01/000254","2026/10/01/000289"]:
    rows = dbutil.query("sik", "SELECT status,nm_perawatan,biaya,jumlah,totalbiaya FROM billing WHERE no_rawat='"'"'%s'"'"' ORDER BY noindex" % n)
    print(n, "billing rows:", len(rows))
    for r in rows[:6]:
        print("   ", r)
PY
echo ""
echo "=== stage tables left on sik (should be none after finalize stage_drop) ==="
mysql -uroot -N -e "SHOW TABLES FROM sik LIKE '"'"'r5_stage_%'"'"';"
echo "stage table count: $(mysql -uroot -N -e "SHOW TABLES FROM sik LIKE '"'"'r5_stage_%'"'"';" | wc -l)"
echo ""
echo "=== drop any lingering r5_stage_* on sik ==="
mysql -uroot -N -e "SELECT CONCAT('DROP TABLE IF EXISTS sik.', t, ';') FROM information_schema.tables WHERE table_schema='"'"'sik'"'"' AND table_name LIKE '"'"'r5_stage_%'"'"';" | grep -v '^$' | grep -v '^SELECT' > /tmp/r5p5_drops.sql
mysql -uroot < /tmp/r5p5_drops.sql
echo "after drop: $(mysql -uroot -N -e "SHOW TABLES FROM sik LIKE '"'"'r5_stage_%'"'"';" | wc -l)"
