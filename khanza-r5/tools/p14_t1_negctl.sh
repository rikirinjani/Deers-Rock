#!/bin/bash
# P14 T1 negative controls: --verify must exit 1 naming each plant.
set -u
cd /opt/Deers-Rock/tools; export DBUTIL_FORCE_ROOT=1
B=/opt/dr-benchmark/p14
for nc in live_visit live_sql; do
  rm -rf $B/fx_nc_$nc; cp -r $B/fx_a $B/fx_nc_$nc
done
# NC1: plant a real live visit (the T0 template) into the visits file
echo "2026/10/01/800162" >> $B/fx_nc_live_visit/p14_edge_visits.txt
python3 - <<'PY'
import json; p="/opt/dr-benchmark/p14/fx_nc_live_visit/p14_edge_manifest.json"
m=json.load(open(p)); m["visits"]["2026/10/01/800162"]={"stratum":"E1","no_rkm_medis":"DR000085","expected_delta":{}}
json.dump(m,open(p,"w"))
PY
echo "## NC1: planted live visit 2026/10/01/800162"
python3 p14_edge_fixture.py --verify $B/fx_nc_live_visit; echo "nc1_rc=$?"
# NC2: plant a SQL line that names the live database
echo "DELETE FROM sik.billing WHERE no_rawat='2027/12/31/900001';" >> $B/fx_nc_live_sql/p14_edge_fixture.sql
echo "## NC2: planted SQL line naming sik."
python3 p14_edge_fixture.py --verify $B/fx_nc_live_sql; echo "nc2_rc=$?"
rm -rf $B/fx_nc_live_visit $B/fx_nc_live_sql
