#!/bin/bash
# cleanup2.sh — secret scan + scratch removal
cd /opt/dr-benchmark/results/B1dry
echo "=== secret/IP scan ==="
PAT='([0-9]{1,3}\.){3}[0-9]{1,3}'
grep -rEn "$PAT|benchmark_pw|EnkripsiAES|<KHANZA_AES_KEY>|<KHANZA_AES_IV>" . 2>/dev/null | head -5
if [ $? -ne 0 ]; then echo "no hits"; fi
echo "=== sha256 check of encounters still stable post-cleanup ==="
sha256sum B1.encounters.txt | cut -c1-16
rm -rf /tmp/gl_b1dry /tmp/regen2.txt /tmp/gen2a.txt /tmp/gen2b.txt /tmp/probe.sh /tmp/probe2.sh \
       /tmp/smoke1.sh /tmp/smoke1r.sh /tmp/smoke2.sh /tmp/smoke2r.sh /tmp/smoke3.sh /tmp/smoke3r.sh \
       /tmp/smoke4.sh /tmp/smoke4r.sh /tmp/exitprobe.out /tmp/b1dry.sh /tmp/b1dryr.sh \
       /tmp/cleanup.sh /tmp/cleanupr.sh /tmp/cleanup2.sh
echo CLEANED
