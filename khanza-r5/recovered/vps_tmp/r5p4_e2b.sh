set -e
cd /opt/dr-benchmark
# Properly extract the first 2000 ENC...END blocks from the canonical B3 encounter set.
python3 - <<PY
lines = open("results/Bseries_20261012T045027Z/B3.encounters.txt").readlines()
out, v, keep = [], 0, False
for l in lines:
    if l.startswith("ENC "):
        v += 1
        keep = v <= 2000
    if keep:
        out.append(l)
open("/tmp/r5p4_e2_burst2000.txt","w").writelines(out)
print("burst input: %d ENC blocks, %d lines" % (v, len(out)))
PY
echo "slice check: $(grep -c '^ENC ' /tmp/r5p4_e2_burst2000.txt) ENC blocks"
echo "=== P4-E2: drive the consumer over the 2000-visit slice on sik_p2 (bounded burst) ==="
cd /opt/simrs-khanza
sed -i "s/^database=.*/database=sik_p2/" setting/database.ini
echo "harness DB target: $(grep -E '^database=' setting/database.ini)"
# Clean the slice's billing rows first so the burst is a fresh bill (not a no-op on existing rows).
mysql -uroot sik_p2 -e "DELETE FROM billing WHERE no_rawat LIKE '2026/10/%' AND no_rawat IN ($(python3 -c "import re; print(','.join(chr(39)+m+chr(39) for m in re.findall(r'ENC (\S+)', open('/tmp/r5p4_e2_burst2000.txt').read()))[:2000])"));" 2>/dev/null || echo "(delete-best-effort)"
t0=$(date +%s)
java -cp "consumer:KhanzaSecurity16bit/dist/KhanzaSecurity16bit.jar:lib/mariadb.jar:resumepasien/lib/commons-codec-1.10.jar:resumepasien/lib/org-apache-commons-codec.jar" \
  KhanzaBillingConsumer /tmp/r5p4_e2_burst2000.txt /tmp/r5p4_e2_burst.log 2>&1 | tail -4
t1=$(date +%s); dur=$((t1-t0)); [ $dur -eq 0 ] && dur=1
echo "=== P4-E2 burst result ==="
echo "visits=2000 wall=${dur}s -> measured=$(( 2000 * 60 / dur )) v/min (consumer)"
grep -E "Processed|Billing rows|Total revenue|avg" /tmp/r5p4_e2_burst.log 2>/dev/null
