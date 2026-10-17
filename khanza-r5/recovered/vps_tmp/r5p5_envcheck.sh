cd /opt/Deers-Rock/tools
export DBUTIL_FORCE_ROOT=1
echo "env check: DBUTIL_FORCE_ROOT=$DBUTIL_FORCE_ROOT"
# confirm root can read sik_p2
python3 -c "
import os, sys; sys.path.insert(0,'.')
import dbutil
print('FORCE_ROOT in env:', os.environ.get('DBUTIL_FORCE_ROOT'))
r = dbutil.scalar('sik_p2', 'SELECT COUNT(*) FROM reg_periksa')
print('sik_p2 reg_periksa rows (as routed user):', r)
"
