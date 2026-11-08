set -u
sudo -n cp /tmp/p24.tar /data/noble/tmp/p24.tar
sudo -n /usr/sbin/chroot /data/noble /bin/bash -s <<'EOS'
set -u
cd /opt/Deers-Rock/tools
export DR_LOCK_SESSION=P24-CLAUDE-IB-20261105 DBUTIL_FORCE_ROOT=1
echo "== redeploy after pre-flight 1 (p24_a G4 pattern fixed) $(date -u +%FT%TZ)"
bash dr_runlock.sh status
mv /opt/dr-benchmark/p24/preflight /opt/dr-benchmark/p24/preflight1
mkdir -p /tmp/p24y; tar -C /tmp/p24y -xf /tmp/p24.tar
cp /tmp/p24y/p24_a_negctl.sh /tmp/p24y/p24_frozen_20261105.sha256 .
chmod +x p24_a_negctl.sh
echo "deployed vs manifest (prospective): $(sha256sum -c p24_frozen_20261105.sha256 2>/dev/null | grep -c ': OK')/$(grep -c . p24_frozen_20261105.sha256)"
sha256sum -c p24_frozen_20261105.sha256 2>&1 | grep -v ': OK$' | head -3
EOS
bash /tmp/ib_p24_pre.sh
