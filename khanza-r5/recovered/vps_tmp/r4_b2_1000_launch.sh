#!/bin/bash
# r4_b2_1000: launch 1,000-visit sampled_real_form_diff B3 run detached.
# rate 116/10000 x 86101 cohort ~ 1000 visits; ~12s/visit => ~3.5h.
set -u
n_proc=$(ps aux | grep -E 'sampled_real_form_diff|build_dr_charge|r4_bat|r4_reprice|charge_delta|three_count' | grep -v grep | grep -v b2_1000 | wc -l)
[ "$n_proc" = "0" ] || { echo "ABORT: other battery/sample processes running ($n_proc)"; exit 9; }
cd /opt/Deers-Rock/tools || { echo "ABORT: tools dir missing"; exit 9; }
echo "launching r4_b2_1000 at $(date -u)"
setsid nohup env RUN_ID=r4_b2_1000 python3 sampled_real_form_diff.py --stage B3 --rate 116 --per 10000 --cap-min 360 > /tmp/r4_b2_1000.log 2>&1 &
sleep 2
ps aux | grep sampled_real_form_diff | grep -v grep | head -2 || { echo "ABORT: process did not start"; tail -5 /tmp/r4_b2_1000.log; exit 9; }
echo LAUNCH_OK
