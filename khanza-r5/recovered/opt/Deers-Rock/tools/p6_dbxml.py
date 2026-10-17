#!/usr/bin/env python3
"""p6_dbxml.py — retarget the database the Khanza harness/consumer actually use.

The harness (cwd /opt/simrs-khanza/run-env) and consumer (cwd /opt/simrs-khanza)
read setting/database.xml (AES-encrypted DATABASE entry), NOT database.ini, so
editing database.ini never moved the form off live `sik`. This wraps the
backup+verify retarget in stagea_common.py.

  p6_dbxml.py probe             print the DATABASE each copy targets
  p6_dbxml.py retarget <db>     point both copies at <db> (backups kept)
  p6_dbxml.py restore           restore the backups, then probe (must be sik)
"""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import stagea_common as sc  # noqa: E402

# Khanza's AES class needs commons-codec Base64, which stagea_common's
# RETARGET_CP leaves out (the probe dies with NoClassDefFoundError).
sc.RETARGET_CP += ":resumepasien/lib/commons-codec-1.10.jar"


def log(m):
    print("[dbxml] " + m, flush=True)


def probe():
    cur = {x: sc._xml_current_db(x) for x in sc.DB_XMLS}
    for x, d in cur.items():
        bak = " (backup present)" if os.path.exists(x + ".stagea_bak") else ""
        log("%s -> %s%s" % (x, d, bak))
    return cur


def main(argv):
    cmd = argv[1] if len(argv) > 1 else "probe"
    if cmd == "probe":
        probe()
        return 0
    if cmd == "retarget" and len(argv) == 3:
        sc.retarget_database(log, argv[2])
        ok = all(d == argv[2] for d in probe().values())
        log("RETARGET-VERIFIED %s" % argv[2] if ok else "RETARGET-FAILED")
        return 0 if ok else 1
    if cmd == "restore":
        sc.restore_database(log)
        ok = all(d == "sik" for d in probe().values())
        log("RESTORE-VERIFIED sik" if ok else "RESTORE-FAILED (not sik)")
        return 0 if ok else 1
    print(__doc__)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv))
