echo "=== strata tool log ==="
cat /opt/dr-benchmark/results/r5p5_strata/sampled_real_form_diff_r5.log 2>/dev/null | head -20
echo ""
echo "=== check harness database.ini (must point to sik_p2 for STRATA, or we use live sik) ==="
echo "current: $(grep -E \"^database=\" /opt/simrs-khanza/setting/database.ini)"
echo ""
echo "=== which db does the STRATA demo need? ==="
echo "STRATA- visits are authored in sik_p2 (P4 fixture). The harness bills via database.ini."
echo "For a scratch-only STRATA demo, database.ini must = sik_p2."
