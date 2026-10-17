#!/usr/bin/env bash
set -euo pipefail
rm -rf /tmp/pchain_stage && mkdir -p /tmp/pchain_stage
mv /tmp/pchain_p1_final.sh   /tmp/pchain_stage/pchain_p1.sh
mv /tmp/pchain_p2_final.sh   /tmp/pchain_stage/pchain_p2.sh
mv /tmp/pchain_p3_final.sh   /tmp/pchain_stage/pchain_p3.sh
mv /tmp/pchain_p4_final.sh   /tmp/pchain_stage/pchain_p4.sh
mv /tmp/pchain_p5_final.sh   /tmp/pchain_stage/pchain_p5.sh
mv /tmp/run_p_chain_final.sh /tmp/pchain_stage/run_p_chain.sh
mv /tmp/prelaunch_final.sh   /tmp/pchain_stage/prelaunch.sh
mv /tmp/p4_builder_patch_final.py /tmp/pchain_stage/p4_builder_patch.py
mv /tmp/build_report_onbox.py     /tmp/pchain_stage/build_report_onbox.py
mv /tmp/install_pchain.sh    /tmp/pchain_stage/install_pchain.sh
bash /tmp/pchain_stage/install_pchain.sh
