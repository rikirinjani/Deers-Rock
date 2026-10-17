set -e
cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1
echo "=== P4-E2: bounded 5x burst ? measure consumer throughput headroom ==="
echo "The B3 consumer ran at ~1,802 v/min (47.8 min for 86,101). A 5x burst would be ~9,000 v/min."
echo "We do NOT re-run the full 86k at 5x (wall budget); instead we measure the consumer's"
echo "actual ceiling on a bounded subset: drive the consumer over 2,000 visits and record v/min."
# Use the consumer on a 2000-visit slice of the B3 encounter set (first 2000 ENC blocks).
head -n 2000 /opt/dr-benchmark/results/Bseries_20261012T045027Z/B3.encounters.txt | \
  awk "BEGIN{v=0} /^ENC /{v++} {print} /^END/{if(v<=2) exit}" > /tmp/r5p4_e2_burst2000.txt 2>/dev/null || \
  # fallback: just take the ENC blocks cleanly
  python3 - <<PY
lines = open("/opt/dr-benchmark/results/Bseries_20261012T045027Z/B3.encounters.txt").readlines()
out, v, keep = [], 0, True
for l in lines:
    if l.startswith("ENC "):
        v += 1
        keep = v <= 2000
    if keep:
        out.append(l)
open("/tmp/r5p4_e2_burst2000.txt", "w").writelines(out)
print("burst input: %d ENC blocks" % v)
PY
echo "burst input lines: $(wc -l < /tmp/r5p4_e2_burst2000.txt)"
echo "=== run the consumer over the 2000-visit slice on the scratch target (sik_p2) ==="
# Point the consumer at sik_p2 via the harness database.ini
sed -i "s/^database=.*/database=sik_p2/" /opt/simrs-khanza/setting/database.ini
grep -E "^database=" /opt/simrs-khanza/setting/database.ini
cd /opt/simrs-khanza
t0=$(date +%s)
java -cp "consumer:KhanzaSecurity16bit/dist/KhanzaSecurity16bit.jar:lib/mariadb.jar:resumepasien/lib/commons-codec-1.10.jar:resumepasien/lib/org-apache-commons-codec.jar" \
  KhanzaBillingConsumer /tmp/r5p4_e2_burst2000.txt /tmp/r5p4_e2_burst.log 2>&1 | tail -5
t1=$(date +%s)
dur=$(( t1 - t0 ))
echo "=== burst result ==="
echo "visits=2000 wall=${dur}s -> v/min=$(( 2000 * 60 / (dur > 0 ? dur : 1) ))"
grep -E "Processed|Billing rows|Total revenue|DONE|avg" /tmp/r5p4_e2_burst.log 2>/dev/null | head
