IB="/c/Users/think/AppData/Local/Temp/../AppData/Local/Programs/instabox/instabox.exe"
IB="/c/Users/think/AppData/Local/Programs/instabox/instabox.exe"
EV=/c/Users/think/Project_v2/Deers-Rock/khanza-r5/evidence/cleanbox_rehearsal
# ibx LOGNAME cmd...  : run on host via exec, log with date stamps
ibx() { n=$1; shift; { echo "## $(date -u +%FT%TZ) [local] $*"; "$IB" exec <box> --timeout 600 -- "$@"; rc=$?; echo "## $(date -u +%FT%TZ) rc=$rc"; } 2>&1 | tee -a $EV/$n.txt; }
# chr LOGNAME script : run string inside chroot
chr() { n=$1; shift; ibx $n "sudo chroot /data/noble bash -c '$*'"; }
