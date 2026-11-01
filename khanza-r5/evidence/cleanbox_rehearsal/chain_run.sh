cd /opt/Deers-Rock/tools
echo "== [cmd] start full chain $(date -u +%FT%TZ)"
export DR_LOCK_SESSION=P23-REHEARSAL-OP2
bash p22_chain.sh .bak_p15_20261026 .bak_p16_20261026 .bak_p17_20261027 .bak_p18_20261027 .bak_p19_20261027 .bak_p20_20261027 .bak_p22_20261031 /srv/repo/khanza-r5/evidence/p22/r5_p22_frozen_manifest_20261031.sha256 > /opt/dr-benchmark/p22/chain_stdout.log 2>&1
echo "chain exit=$? $(date -u +%FT%TZ)" >> /opt/dr-benchmark/p22/chain_stdout.log
