set -e
cd /opt/Deers-Rock/tools
echo "=== P4-LD (1): clean canonical ledger, --line-diff => expect PASS + LINE-DELTA=0 ==="
env RUN_ID=r5p4_ld_clean python3 charge_delta_per_component_p2.py --stage A --line-diff >/tmp/ld_clean.log 2>&1; echo "rc=$?"
grep -E "line-diff|LINE-DELTA|gate" /tmp/ld_clean.log | head -6
echo ""
echo "=== P4-LD (2): same-price wrong-code-quantity swap in the ledger => expect FAIL + named LINE-DELTA ==="
# pick a visit with a drug quantity>1 and re-allocate its ledger quantity between two codes at the SAME total price
mysql -uroot sik_bench -e "SELECT no_rawat, code, quantity, unit_price, amount FROM dr_charge_ledger WHERE component='drug' AND quantity>=3 AND no_rawat LIKE \"2026/10/01/%\" LIMIT 3;"
echo "--- inject: move 2 units of quantity from one drug code to another, SAME unit price (net amount unchanged) ---"
V=$(mysql -uroot -N -e "SELECT no_rawat FROM dr_charge_ledger WHERE component='drug' AND quantity>=4 AND no_rawat LIKE \"2026/10/01/%\" LIMIT 1;")
echo "target visit: $V"
mysql -uroot sik_bench -e "
  -- take 2 units off code A, add to code B, same unit price -> amount total unchanged, but per-code qty + per-visit component qty distribution shifts
  UPDATE dr_charge_ledger SET quantity=quantity-2 WHERE no_rawat='$V' AND component='drug' ORDER BY quantity DESC LIMIT 1;"
env RUN_ID=r5p4_ld_swap python3 charge_delta_per_component_p2.py --stage A --line-diff >/tmp/ld_swap.log 2>&1; echo "rc=$?"
grep -E "LINE-DELTA|gate|amount" /tmp/ld_swap.log | head -8
echo "--- restore ledger from the P2 backup, re-verify clean ---"
mysql -uroot sik_bench -e "DELETE FROM dr_charge_ledger; REPLACE INTO dr_charge_ledger SELECT * FROM dr_charge_ledger_p2bak;"
env RUN_ID=r5p4_ld_restore python3 charge_delta_per_component_p2.py --stage A --line-diff >/tmp/ld_restore.log 2>&1; echo "rc=$? $(grep -oE 'gate \(all deltas == 0, other == 0, LINE-DELTA == 0\): (PASS|FAIL)' /tmp/ld_restore.log)"
