set -u
sudo -n cp /tmp/p24.tar /data/noble/tmp/p24.tar
sudo -n /usr/sbin/chroot /data/noble /bin/bash -s <<'EOS'
set -u
cd /opt/Deers-Rock/tools
export DR_LOCK_SESSION=P24-CLAUDE-IB-20261105 DBUTIL_FORCE_ROOT=1
echo "== P24 deploy $(date -u +%FT%TZ): lock FIRST"
bash dr_runlock.sh status
bash dr_runlock.sh acquire P24-CLAUDE-IB-20261105
mkdir -p /opt/dr-benchmark/p24
echo "frozen p23 manifest b before: $(sha256sum -c p23_frozen_20261101b.sha256 2>/dev/null | grep -c ': OK')/45; lsattr i: $(awk '{print $2}' p23_frozen_20261101b.sha256 | xargs lsattr | awk '{print $1}' | grep -c i)/45"
awk '{print $2}' p23_frozen_20261101b.sha256 | xargs lsattr > /opt/dr-benchmark/p24/lsattr_before.txt
echo "== unfreeze p14_edge_run.sh only"
chattr -i p14_edge_run.sh
mkdir -p .bak_p24_20261105; cp -p p14_edge_run.sh .bak_p24_20261105/
echo "bak_p24 (P23 bytes):"; sha256sum .bak_p24_20261105/p14_edge_run.sh
mkdir -p /tmp/p24x; tar -C /tmp/p24x -xf /tmp/p24.tar
echo "staged:"; (cd /tmp/p24x && sha256sum *)
cp /tmp/p24x/p14_edge_run.sh /tmp/p24x/p24_chain.sh /tmp/p24x/p24_a_negctl.sh /tmp/p24x/p24_release_inventory.py /tmp/p24x/p24_frozen_20261105.sha256 .
chmod +x p14_edge_run.sh p24_chain.sh p24_a_negctl.sh
echo "deployed vs manifest (prospective): $(sha256sum -c p24_frozen_20261105.sha256 2>/dev/null | grep -c ': OK')/$(grep -c . p24_frozen_20261105.sha256)"
sha256sum -c p24_frozen_20261105.sha256 2>&1 | grep -v ': OK$' | head
echo "== deploy done $(date -u +%FT%TZ)"
EOS
