#!/bin/bash
set +e
echo "=== find DlgBilingRalan.java on-box ==="
find /opt/simrs-khanza -name 'DlgBilingRalan.java' 2>/dev/null
echo
echo "=== if source is not on-box, check the compiled class for the save path / status_bayar gating ==="
CLS=/opt/simrs-khanza/dist/SIMRSKhanza.jar
if [ -f "$CLS" ]; then
  echo "jar present: $CLS"
  echo "=== strings in the class referencing status_bayar / Sudah Bayar / INSERT INTO billing ==="
  cd /tmp && rm -rf _x && mkdir _x && cd _x
  unzip -o "$CLS" 'keuangan/DlgBilingRalan*.class' >/dev/null 2>&1
  strings keuangan/DlgBilingRalan*.class 2>/dev/null | grep -iE 'status_bayar|Sudah Bayar|Belum Bayar|INSERT INTO|REPLACE INTO|detail_pemberian_obat|billing|nota_jalan|piutang' | head -40
fi
