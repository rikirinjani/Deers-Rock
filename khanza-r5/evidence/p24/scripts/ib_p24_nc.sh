set -u
sudo -n /usr/sbin/chroot /data/noble /bin/bash -s <<'EOS'
cd /opt/Deers-Rock/tools
export DR_LOCK_SESSION=P24-CLAUDE-IB-20261105 DBUTIL_FORCE_ROOT=1 P14_MIN_FREE_GB=8
B=/opt/dr-benchmark/p24/chain
{
echo "== 4d RE-RUN (chain 1 ended nc=1: the NC5 harness hung and was terminated) $(date -u +%FT%TZ)"
echo "frozen p24: $(sha256sum -c p24_frozen_20261105.sha256 2>/dev/null | grep -c ': OK')/48; lsattr i: $(awk '{print $2}' p24_frozen_20261105.sha256 | xargs lsattr | awk '{print $1}' | grep -c i)/48"
timeout 1500 bash p11_negative_controls.sh > $B/e_nc_rerun.log 2>&1; echo "nc re-run exit=$?"
grep -a "^NC [0-9]:\|DISCRIMINATING=\|^evidence:" $B/e_nc_rerun.log
echo "harness procs: $(ps -eo cmd | grep -E 'BilingHarness|sampled_real_form' | grep -v grep | wc -l)"
echo "== FINAL capture after the 4d re-run $(date -u +%FT%TZ)"
echo "frozen p24: $(sha256sum -c p24_frozen_20261105.sha256 2>/dev/null | grep -c ': OK')/48; lsattr i: $(awk '{print $2}' p24_frozen_20261105.sha256 | xargs lsattr | awk '{print $1}' | grep -c i)/48"
bash p14_live_state.sh p24-final-after-nc-rerun | tee $B/live_state_final_after_nc_rerun.txt
echo "databases: $(mysql -uroot -N -e 'SHOW DATABASES' | grep '^sik' | tr '\n' ' ')"
echo "== done $(date -u +%FT%TZ)"
} > /opt/dr-benchmark/p24/nc_rerun_stdout.log 2>&1
EOS
