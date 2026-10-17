#!/bin/bash
cd /opt/simrs-khanza/run-env/report
for r in rptKunjunganRalan rptRekapPendapatanRalan rptRekapObatPoli rptFrekuensiPenyakitRalan; do
  f=$r.jrxml
  echo "=== $f ==="
  if [ -f "$f" ]; then
    awk '/<queryString>/{flag=1} flag{print} /<\/queryString>/{flag=0}' "$f" | head -40
  else
    echo "(no jrxml present)"
  fi
done
echo "PROBE6_DONE"
