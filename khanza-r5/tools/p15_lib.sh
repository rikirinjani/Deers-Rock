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
# P17 A4: process start time in ms since the epoch (from /proc/<pid>/stat starttime + btime); empty if unreadable.
p15_proc_start_ms() { # pid
  # boot instant = now - uptime (btime in /proc/stat is whole seconds and biases the result by up to 1 s)
  local st hz up now
  st=$(awk '{ s=$0; sub(/^.*\) /, "", s); split(s, a, " "); print a[20] }' "/proc/$1/stat" 2>/dev/null)
  hz=$(getconf CLK_TCK 2>/dev/null)
  up=$(awk '{ printf "%d", $1 * 1000 }' /proc/uptime 2>/dev/null); now=$(date +%s%3N)
  { [ -n "$st" ] && [ -n "$hz" ] && [ -n "$up" ] && [ -n "$now" ]; } || return 1
  echo $(( now - up + st * 1000 / hz ))
}
# any live process in process group $1 (a zombie does not count). P18 B2 (M3c): selected by process-group id
# from `ps -e -o pgid=,stat=`; `ps -g N` selects by SESSION id in procps-ng 4.0.4 (a setpgid group inside a
# larger session reports no members; evidence/p18/a2_ps_semantics.txt), so it is not used.
# P19 N5b: returns 0 alive, 1 dead, 2 UNKNOWN (ps itself failed); callers treat 2 as "not confirmed dead".
p15_group_alive() { # pgid
  local out
  out=$(ps -e -o pgid=,stat= 2>/dev/null) || return 2
  printf '%s\n' "$out" | awk -v g="$1" '$1 == g && $2 !~ /^Z/ { f = 1 } END { exit f ? 0 : 1 }'
}
# P18 B2: does a live member of process group $1 look like this run's harness (its command line names
# BilingHarness or the harness log whose .pid file recorded the group)?
p15_group_is_harness() { # pgid log-path
  local p
  for p in $(ps -e -o pid=,pgid= 2>/dev/null | awk -v g="$1" '$2 == g { print $1 }'); do
    tr '\0' ' ' < "/proc/$p/cmdline" 2>/dev/null | grep -qF -e BilingHarness -e "$2" && return 0
  done
  return 1
}
# P19 N3: does an oracle log show a failed batch? The oracle exits 4 for FAILED batches and for out-of-envelope
# visits alike, and the driver treats 4 as the expected value for the fixture strata.
p15_oracle_batch_failed() { # log
  grep -aEq ': FAILED \(|STAGE-RESTORE-ERROR|NOT restored' "$1"
}
# P17 A3/A4 + P18 B2 + P19 N5: signal a recorded harness group only if it is provably this run's. Live leader: it
# leads its group and started no later than its pid file was written (to the millisecond); an unreadable start
# time is NOT a reason to skip quietly (returns 1). A leader that passed kill -0 but whose pgid cannot be read any
# more has vanished: it is treated as gone (P19 N5a). Dead leader with a live group (a child keeps the pgid, and a
# pid in use as a pgid is never reused): the group is signalled when a member's command line names the harness;
# if ps itself fails the answer is "not confirmed" (return 1, P19 N5b). After TERM the group gets 10 s to die,
# then KILL; the function returns non-zero if a member is still alive or unknown, and the drivers then leave
# database.xml, the grant and the clone as they are and exit 3.
p15_kill_run_harness() { # run-id...
  local rid f pid pg st fm i rc=0 lead ga
  for rid in "$@"; do
    for f in /opt/dr-benchmark/results/"$rid"/*/harness_*.log.pid; do
      [ -f "$f" ] || continue
      pid=$(tr -dc 0-9 < "$f")
      [ -n "$pid" ] || continue
      fm=$(stat -c %.3Y "$f" 2>/dev/null | tr -d .)
      lead=gone
      if kill -0 "$pid" 2>/dev/null; then
        pg=$(ps -o pgid= -p "$pid" 2>/dev/null | tr -d " ")
        if [ -n "$pg" ]; then
          lead=live
          [ "$pg" = "$pid" ] || { echo "kill-run-harness: pid $pid is not a process-group leader - not signalled" >&2; continue; }
        fi
      fi
      if [ "$lead" = live ]; then
        st=$(p15_proc_start_ms "$pid")
        if [ -z "$st" ] || [ -z "$fm" ]; then
          echo "kill-run-harness: pid $pid leads a live group but its start time is unreadable - not signalled, NOT CONFIRMED" >&2; rc=1; continue
        fi
        [ "$st" -le $((fm + 50)) ] || { echo "kill-run-harness: pid $pid started after $f was written - a reused pid, not signalled" >&2; continue; }
      else
        p15_group_alive "$pid"; ga=$?
        [ "$ga" = 1 ] && continue
        if [ "$ga" = 2 ]; then
          echo "kill-run-harness: ps failed while looking for group $pid - NOT CONFIRMED" >&2; rc=1; continue
        fi
        if ! p15_group_is_harness "$pid" "${f%.pid}"; then
          echo "kill-run-harness: group $pid is alive but no member looks like this run's harness - not signalled, NOT CONFIRMED" >&2; rc=1; continue
        fi
        echo "kill-run-harness: leader $pid is gone but its harness group is alive - signalling the group" >&2
      fi
      kill -TERM -- -"$pid" 2>/dev/null
      for i in $(seq 1 20); do p15_group_alive "$pid"; [ $? -eq 1 ] && break; sleep 0.5; done
      p15_group_alive "$pid"; if [ $? -ne 1 ]; then kill -KILL -- -"$pid" 2>/dev/null; sleep 1; fi
      p15_group_alive "$pid"; if [ $? -ne 1 ]; then echo "kill-run-harness: group $pid still alive (or unknown) after KILL" >&2; rc=1; fi
    done
  done
  return $rc
}

# Clone validation (A3): same table count as sik and the same row counts on key tables.
p15_clone_matches_sik() { # clone
  local t a b ta tb
  ta=$(mysql -uroot -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='sik'")
  tb=$(mysql -uroot -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$1'")
  [ "$ta" = "$tb" ] || { echo "clone table count $tb != sik $ta"; return 1; }
  for t in reg_periksa billing rawat_jl_dr detail_pemberian_obat nota_jalan detail_nota_jalan; do
    a=$(mysql -uroot -N -e "SELECT COUNT(*) FROM sik.$t")
    b=$(mysql -uroot -N -e "SELECT COUNT(*) FROM $1.$t")
    [ "$a" = "$b" ] || { echo "clone $t rows $b != sik $a"; return 1; }
  done
  echo "clone matches sik: tables=$ta (= sik), 6 key tables row-equal"   # P17 A12: the table count, not the last row count
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
