set -u
sudo -n /usr/sbin/chroot /data/noble /bin/bash -s <<'EOS'
set -u
cd /opt/Deers-Rock/tools
export DR_LOCK_SESSION=P24-CLAUDE-IB-20261105 DBUTIL_FORCE_ROOT=1
PF=/opt/dr-benchmark/p24/preflight; mkdir -p $PF
BAKS=".bak_p15_20261026 .bak_p16_20261026 .bak_p17_20261027 .bak_p18_20261027 .bak_p19_20261027 .bak_p20_20261027 .bak_p22_20261031 .bak_p23_20261101 .bak_p24_20261105"
echo "== pre-flight on UNFROZEN bytes $(date -u +%FT%TZ)"
sha256sum p14_edge_run.sh p24_chain.sh p24_a_negctl.sh p24_release_inventory.py | tee $PF/hash_header.txt
echo "-- p24_a, P14_MIN_FREE_GB unset"
env -u P14_MIN_FREE_GB bash p24_a_negctl.sh .bak_p24_20261105 > $PF/p24_a_unset.txt 2>&1; echo "rc=$?"; grep -a "FAIL\|P24-A-NC" $PF/p24_a_unset.txt
echo "-- p24_a, P14_MIN_FREE_GB=8 exported"
P14_MIN_FREE_GB=8 bash p24_a_negctl.sh .bak_p24_20261105 > $PF/p24_a_set8.txt 2>&1; echo "rc=$?"; grep -a "FAIL\|P24-A-NC" $PF/p24_a_set8.txt
echo "-- p23_a on the NEW p14_edge_run.sh (its F1 extraction must still work), unset and 8"
env -u P14_MIN_FREE_GB bash p23_a_negctl.sh .bak_p23_20261101 > $PF/p23_a_unset.txt 2>&1; echo "rc=$?"; grep -a "FAIL\|P23-A-NC" $PF/p23_a_unset.txt
P14_MIN_FREE_GB=8 bash p23_a_negctl.sh .bak_p23_20261101 > $PF/p23_a_set8.txt 2>&1; echo "rc=$?"; grep -a "FAIL\|P23-A-NC" $PF/p23_a_set8.txt
echo "-- P24_SHORT chain on unfrozen bytes"
P24_SHORT=1 P14_MIN_FREE_GB=8 bash p24_chain.sh $BAKS p24_frozen_20261105.sha256 > $PF/p24_chain_short.txt 2>&1; echo "short chain rc=$?"
grep -a "frozen P24\|ASSERT FAIL\|CHAIN DONE\|chain verdict\|p24-a-nc\|ASSERT PASS 3b'' the start\|inventory on the box\|files " $PF/p24_chain_short.txt | cut -c1-260
echo "== pre-flight done $(date -u +%FT%TZ)"
EOS
