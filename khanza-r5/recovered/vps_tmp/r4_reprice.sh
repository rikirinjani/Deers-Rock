#!/bin/bash
# r4_reprice.sh — idempotent rebuild of sik_bench.dr_charge_ledger prices from
# the source-of-truth price tables (dr_tariff first, databarang.ralan fallback
# for drugs), then recompute the tax component (11% drug subtotal, half-up).
# Usage: bash /tmp/r4_reprice.sh
set -eu
mysql -uroot --default-character-set=utf8mb4 sik_bench <<'SQL'
-- price authority table (empty until A1 seeds it; safe pre-A1)
CREATE TABLE IF NOT EXISTS dr_tariff (
  kind       VARCHAR(20) NOT NULL,
  code       VARCHAR(20) NOT NULL,
  dr_price   DOUBLE      NOT NULL,
  source_note VARCHAR(80) NULL,
  PRIMARY KEY (kind, code)
);

-- drugs: dr_tariff if wired, else databarang.ralan (same value pre-A1)
UPDATE dr_charge_ledger l
LEFT JOIN dr_tariff t ON t.kind='drug' AND t.code=l.code
JOIN sik.databarang d ON d.kode_brng = l.code
SET l.unit_price = COALESCE(t.dr_price, d.ralan),
    l.amount     = l.quantity * COALESCE(t.dr_price, d.ralan)
WHERE l.component='drug';

-- procedures: dr_tariff only (falls back = leaves current rawat_jl_dr value)
UPDATE dr_charge_ledger l
JOIN dr_tariff t ON t.kind='procedure' AND t.code=l.code
SET l.unit_price = t.dr_price,
    l.amount     = l.quantity * t.dr_price
WHERE l.component='procedure';

-- registration: dr_tariff only (falls back = leaves current DR clinic fee)
UPDATE dr_charge_ledger l
JOIN dr_tariff t ON t.kind='registration' AND t.code=l.code
SET l.unit_price = t.dr_price,
    l.amount     = l.quantity * t.dr_price
WHERE l.component='registration';

-- tax: 11% of per-visit drug subtotal, half-up to whole rupiah (Khanza rule)
UPDATE dr_charge_ledger x
JOIN (SELECT no_rawat, SUM(amount) s
        FROM dr_charge_ledger WHERE component='drug' GROUP BY no_rawat) g
  ON g.no_rawat = x.no_rawat
SET x.unit_price = FLOOR(g.s * 0.11 + 0.5),
    x.amount     = FLOOR(g.s * 0.11 + 0.5)
WHERE x.component='tax';
SQL
echo "reprice done: $(date -u +%FT%TZ)"
