set -u
sudo -n /usr/sbin/chroot /data/noble /bin/bash -s <<'EOS'
cd /opt/Deers-Rock/tools
export DR_LOCK_SESSION=P24-CLAUDE-IB-20261105 DBUTIL_FORCE_ROOT=1 P14_MIN_FREE_GB=8
echo "== [cmd] start full P24 chain $(date -u +%FT%TZ) P14_MIN_FREE_GB=$P14_MIN_FREE_GB" > /opt/dr-benchmark/p24/chain_stdout.log
bash p24_chain.sh .bak_p15_20261026 .bak_p16_20261026 .bak_p17_20261027 .bak_p18_20261027 .bak_p19_20261027 .bak_p20_20261027 .bak_p22_20261031 .bak_p23_20261101 .bak_p24_20261105 p24_frozen_20261105.sha256 >> /opt/dr-benchmark/p24/chain_stdout.log 2>&1
echo "chain exit=$? $(date -u +%FT%TZ)" >> /opt/dr-benchmark/p24/chain_stdout.log
EOS
