set -e
echo "=== which DB does the P2 builder query for its source reg/proc/drug rows? ==="
grep -nE "SIC_DB|from reg_periksa|FROM reg_periksa|rawat_jl_dr|detail_pemberian_obat" /opt/Deers-Rock/tools/build_dr_charge_ledger_p2.py | head -20
echo "=== the P2 gate charge_delta reads consumer from which DB? ==="
grep -nE "CONSUMER_DB|khanza_matrix|FROM billing" /opt/Deers-Rock/tools/charge_delta_per_component_p2.py | head
