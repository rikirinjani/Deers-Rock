set -e
echo "=== verify root can read sik_r5 ==="
mysql -uroot -N -e "SELECT COUNT(*) FROM sik_r5.billing;"
echo "=== verify the DBUTIL_FORCE_ROOT path (simulated: root query on sik_r5) ==="
DBUTIL_FORCE_ROOT=1 python3 -c "import sys; sys.path.insert(0,'/opt/Deers-Rock/tools'); import dbutil; print('root rows:', dbutil.scalar('sik_r5','SELECT COUNT(*) FROM billing'))"
