#!/bin/bash
cp /tmp/build_dr_charge_ledger_patched.py /opt/Deers-Rock/tools/build_dr_charge_ledger.py || exit 1
python3 -c "import ast; ast.parse(open('/opt/Deers-Rock/tools/build_dr_charge_ledger.py').read())" || exit 1
grep -c 'dbutil.query("sik"' /opt/Deers-Rock/tools/build_dr_charge_ledger.py
echo deploy_ok
