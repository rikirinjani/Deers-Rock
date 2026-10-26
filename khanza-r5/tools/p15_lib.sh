#!/bin/bash
# P15 shared driver-safety functions (sourced by p13_wide_sample.sh and p14_edge_run.sh).
# Each function is small and unit-tested by p15_lib_test.sh.

# Stop rule (A4): ">2 % sukses=false" without integer truncation: fires iff bad*100 > 2*total.
p15_stop_rule_fires() { # bad total
  local bad=${1:-0} total=${2:-0}
  [ "$total" -gt 0 ] && [ $(( bad * 100 )) -gt $(( 2 * total )) ]
}

# Distinct visits with sukses=true / sukses=false in a harness log dir (each visit logs two lines).
p15_count_sukses() { # dir true|false
  grep -haoE '[0-9]{4}/[0-9]{2}/[0-9]{2}/[0-9]{6}.{0,80}sukses='"$2" "$1"/harness_*.log 2>/dev/null \
    | grep -oE '^[0-9]{4}/[0-9]{2}/[0-9]{2}/[0-9]{6}' | sort -u | wc -l
}

# Grant probe (A7): privileges the benchmark account holds on one schema. information_schema
# stores the grantee as 'benchmark'@'localhost' (single quotes); P13's double-quoted probe never
# matched. Callers assert a positive case (the grant they just added is visible).
p15_grant_count() { # schema
  mysql -uroot -N -e "SELECT COUNT(*) FROM information_schema.schema_privileges WHERE grantee=\"'benchmark'@'localhost'\" AND table_schema='$1'"
}

# Run-scoped harness kill (A2): only the process groups this run's oracle recorded in its
# harness_*.log.pid files under results/<run-id>/; never a global pkill.
p15_kill_run_harness() { # run-id...
  local rid f pid
  for rid in "$@"; do
    for f in /opt/dr-benchmark/results/"$rid"/*/harness_*.log.pid; do
      [ -f "$f" ] || continue
      pid=$(tr -dc 0-9 < "$f")
      [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null && kill -TERM -- -"$pid" 2>/dev/null
    done
  done
  return 0
}

# Clone validation (A3): same table count as sik and the same row counts on key tables.
p15_clone_matches_sik() { # clone
  local t a b
  a=$(mysql -uroot -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='sik'")
  b=$(mysql -uroot -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$1'")
  [ "$a" = "$b" ] || { echo "clone table count $b != sik $a"; return 1; }
  for t in reg_periksa billing rawat_jl_dr detail_pemberian_obat nota_jalan detail_nota_jalan; do
    a=$(mysql -uroot -N -e "SELECT COUNT(*) FROM sik.$t")
    b=$(mysql -uroot -N -e "SELECT COUNT(*) FROM $1.$t")
    [ "$a" = "$b" ] || { echo "clone $t rows $b != sik $a"; return 1; }
  done
  echo "clone matches sik: tables=$a-equal, 6 key tables row-equal"
}

# Ledger pin (A6): content hash of the non-fixture rows of <db>.dr_charge_ledger; returns 1 on mismatch.
p15_ledger_pin_check() { # db pin
  python3 - "$1" "$2" <<'PY'
import sys, hashlib
sys.path.insert(0, '/opt/Deers-Rock/tools'); import dbutil
db, pin = sys.argv[1], sys.argv[2]
rows = dbutil.query(db, "SELECT * FROM dr_charge_ledger WHERE no_rawat NOT LIKE '2027/12/31/%' "
                        "ORDER BY no_rawat, component, code", force_root=True)
h = hashlib.sha256()
for r in rows: h.update(("|".join(str(c) for c in r) + "\n").encode())
got = "%d:%s" % (len(rows), h.hexdigest())
print("ledger (non-fixture rows) %s: %s %s" % (db, got, "REPRODUCES-PIN" if got == pin else "DIFFERS-FROM-PIN"))
sys.exit(0 if got == pin else 1)
PY
}

# Exit decision (A5) for the P14 driver: fixture must end 4 (out-of-envelope strata, expected);
# the real run, when present, must end 0; a stop rule (rc 10) or anything else is a failure.
p15_decide_exit() { # fixture_rc real_rc("" = no real run)
  [ "$1" = "4" ] || return 1
  [ -z "$2" ] || [ "$2" = "0" ] || return 1
  return 0
}
