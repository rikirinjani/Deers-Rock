#!/bin/bash
# VPS run lock (2026-10-24): the "exclusive window" made real.
#   Lock file : ${DR_LOCK_FILE:-/opt/dr-benchmark/LOCK}   (key=value lines)
#               session=<id>  pid=<acquiring pid>  start_utc=<UTC>  host=<hostname>  note=<text>
#   Owner     : whoever exports DR_LOCK_SESSION=<id> equal to the lock's session= value.
#               Child processes inherit it, so the nested wrapper calls made by
#               p10_preservation_check.sh / p11_negative_controls.sh pass.
# Commands (run as root on the VPS):
#   bash dr_runlock.sh acquire <session-id> [note]   atomic create; exit 3 if already locked
#   bash dr_runlock.sh status                         print the lock; exit 0 locked, 1 free
#   bash dr_runlock.sh release <session-id>           owner only; exit 3 otherwise
#   bash dr_runlock.sh release --force                break a lock (owner/operator decision;
#                                                     check `status` first - pid is informational,
#                                                     a one-shot ssh acquire has a dead pid)
# Sourced by the guarded tools:  . ./dr_runlock.sh; dr_runlock_require <tool-name>
#   -> returns when the caller owns the lock; otherwise prints why and exits 3.
# The lock is ADVISORY (a cooperative guard against a second agent session, not a security
# boundary): it stops the guarded tools, not an operator running mysql by hand.
DR_LOCK_FILE=${DR_LOCK_FILE:-/opt/dr-benchmark/LOCK}

_dr_lock_field() { sed -n "s/^$1=//p" "$DR_LOCK_FILE" 2>/dev/null | head -1; }

dr_runlock_require() { # tool-name
  local tool=${1:-tool}
  if [ ! -e "$DR_LOCK_FILE" ]; then
    echo "RUNLOCK-REFUSED: $tool needs the VPS run lock and none is held ($DR_LOCK_FILE absent)." >&2
    echo "  take it: bash /opt/Deers-Rock/tools/dr_runlock.sh acquire <session-id>; then run with DR_LOCK_SESSION=<session-id>" >&2
    exit 3
  fi
  if [ -z "${DR_LOCK_SESSION:-}" ] || [ "$DR_LOCK_SESSION" != "$(_dr_lock_field session)" ]; then
    echo "RUNLOCK-REFUSED: $tool - the VPS is locked by session=$(_dr_lock_field session) pid=$(_dr_lock_field pid) since $(_dr_lock_field start_utc) (your DR_LOCK_SESSION='${DR_LOCK_SESSION:-}')." >&2
    exit 3
  fi
  return 0
}

dr_runlock_acquire() { # session-id [note]
  local sid=${1:-}
  case "$sid" in ''|*[!A-Za-z0-9._-]*) echo "acquire: need a session id of [A-Za-z0-9._-]" >&2; return 3;; esac
  if ( set -C; printf 'session=%s\npid=%s\nstart_utc=%s\nhost=%s\nnote=%s\n' \
        "$sid" "$PPID" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$(hostname)" "${2:-}" > "$DR_LOCK_FILE" ) 2>/dev/null; then
    echo "RUNLOCK-ACQUIRED: session=$sid ($DR_LOCK_FILE)"; return 0
  fi
  echo "RUNLOCK-REFUSED: already locked by session=$(_dr_lock_field session) pid=$(_dr_lock_field pid) since $(_dr_lock_field start_utc)" >&2
  return 3
}

dr_runlock_release() { # session-id | --force
  [ -e "$DR_LOCK_FILE" ] || { echo "RUNLOCK-RELEASE: no lock held"; return 0; }
  if [ "${1:-}" != "--force" ] && [ "${1:-}" != "$(_dr_lock_field session)" ]; then
    echo "RUNLOCK-REFUSED: lock belongs to session=$(_dr_lock_field session); not released" >&2; return 3
  fi
  rm -f "$DR_LOCK_FILE" && echo "RUNLOCK-RELEASED"
}

dr_runlock_status() {
  [ -e "$DR_LOCK_FILE" ] || { echo "RUNLOCK-FREE"; return 1; }
  local p; p=$(_dr_lock_field pid)
  cat "$DR_LOCK_FILE"
  if [ -n "$p" ] && kill -0 "$p" 2>/dev/null; then echo "pid_alive=yes"; else echo "pid_alive=no (informational: a one-shot ssh acquire always shows no)"; fi
  return 0
}

# CLI mode only when executed, not when sourced
if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  case "${1:-}" in
    acquire) shift; dr_runlock_acquire "$@"; exit $? ;;
    status)  dr_runlock_status; exit $? ;;
    release) shift; dr_runlock_release "$@"; exit $? ;;
    *) echo "usage: dr_runlock.sh acquire <session-id> [note] | status | release <session-id>|--force" >&2; exit 2 ;;
  esac
fi
