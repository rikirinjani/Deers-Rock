echo "=== on-box P5-5b tool SHAs ==="
sha256sum /opt/Deers-Rock/tools/sampled_real_form_diff_r5.py /opt/Deers-Rock/tools/dbutil.py /opt/Deers-Rock/tools/build_dr_charge_ledger_p2.py 2>/dev/null | sed "s#/opt/Deers-Rock/tools/##"
