cd /opt/Deers-Rock/tools
# recreate the 5 STRATA- visits file (same as P5 demo A)
printf "STRATA-EMBALASE\nSTRATA-TUSLAH\nSTRATA-HALFPPN\nSTRATA-ZEROFEE\nSTRATA-GT3PROC\n" > /tmp/r5p5_strata_visits.txt
echo "=== visits file ==="
cat /tmp/r5p5_strata_visits.txt
echo ""
echo "=== verify STRATA- visits exist in sik_p2 (from P4 fixture) ==="
export DBUTIL_FORCE_ROOT=1
python3 -c "
import sys; sys.path.insert(0,'.')
import dbutil
for n in [\"STRATA-EMBALASE\",\"STRATA-TUSLAH\",\"STRATA-HALFPPN\",\"STRATA-ZEROFEE\",\"STRATA-GT3PROC\"]:
    r = dbutil.scalar(\"sik_p2\", \"SELECT COUNT(*) FROM reg_periksa WHERE no_rawat='%s'\" % n)
    print(n, \"reg rows:\", r)
"
