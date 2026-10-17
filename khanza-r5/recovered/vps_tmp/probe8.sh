#!/bin/bash
GLF=/opt/dr-benchmark/results/g1test/g1_attempt1/gl/general_log_G1.2026-10-02
echo "=== gl head (first 15 lines) ==="
head -15 "$GLF"
echo "=== gl line-type census (tab-cut first field) ==="
cut -f3 "$GLF" | cut -c1-12 | sort | uniq -c | sort -rn | head -12
echo "=== DlgBilingRalan insert grep (case-insensitive) ==="
grep -in 'insert into' /opt/simrs-khanza/src/keuangan/DlgBilingRalan.java | head -20
echo "=== DlgBilingRalan: save area — BtnSimpan action ==="
grep -n 'BtnSimpanActionPerformed\|private void btnSimpan' /opt/simrs-khanza/src/keuangan/DlgBilingRalan.java | head -5
