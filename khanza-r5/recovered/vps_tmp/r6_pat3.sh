#!/bin/bash
set -e
echo "=== sample no_rkm_medis (real patients) ==="
mysql -uroot -N -e "SELECT no_rkm_medis FROM sik.reg_periksa WHERE no_rkm_medis IS NOT NULL LIMIT 8;"
echo "=== pick one ==="
PAT=$(mysql -uroot -N -e "SELECT no_rkm_medis FROM sik.reg_periksa WHERE no_rkm_medis IS NOT NULL LIMIT 1;" | head -1)
echo "PAT=[$PAT]"
