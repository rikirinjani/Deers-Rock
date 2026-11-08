set -u
sudo -n /usr/sbin/chroot /data/noble /bin/bash -s <<'EOS'
set -u
cd /opt/Deers-Rock/tools
export DR_LOCK_SESSION=P24-CLAUDE-IB-20261105 DBUTIL_FORCE_ROOT=1
echo "== P24 re-freeze $(date -u +%FT%TZ)"
awk '{print $2}' p24_frozen_20261105.sha256 | xargs chattr +i
chattr +i p24_frozen_20261105.sha256
echo "frozen p24: $(sha256sum -c p24_frozen_20261105.sha256 2>/dev/null | grep -c ': OK')/$(grep -c . p24_frozen_20261105.sha256); lsattr i: $(awk '{print $2}' p24_frozen_20261105.sha256 | xargs lsattr | awk '{print $1}' | grep -c i)/48"
awk '{print $2}' p24_frozen_20261105.sha256 | xargs lsattr > /opt/dr-benchmark/p24/lsattr_after_refreeze.txt
lsattr p24_frozen_20261105.sha256
echo "== p24_a on the FROZEN bytes, variable unset"
env -u P14_MIN_FREE_GB bash p24_a_negctl.sh .bak_p24_20261105 > /opt/dr-benchmark/p24/p24_a_frozen_unset.txt 2>&1; echo "rc=$?"; grep -a "FAIL\|P24-A-NC" /opt/dr-benchmark/p24/p24_a_frozen_unset.txt
echo "== done $(date -u +%FT%TZ)"
EOS
