#!/bin/bash
SRC=/opt/simrs-khanza/src/keuangan/DlgBilingRalan.java
echo "=== all insert/update/delete table refs in save area (5700-6250) ==="
sed -n '5700,6250p' "$SRC" | grep -oiE '(insert into|update|delete from) [a-z_0-9]+' | sort | uniq -c
echo "=== deletes anywhere in file ==="
grep -in 'delete from' "$SRC" | head -20
echo "=== detail_nota_jalan refs ==="
grep -in 'detail_nota_jalan' "$SRC" | head -10
echo "=== status_bayar update ==="
grep -in "status_bayar" "$SRC" | head -10
echo "=== jurnal refs in file ==="
grep -in 'jurnal' "$SRC" | head -10
