mkdir -p /srv/shim; printf '#!/bin/sh\n# local stand-in for: ssh -n <alias> "<cmd>"  (verify_published.sh expects a remote box; here the box is this chroot)\nwhile [ "${1#-}" != "$1" ]; do shift; done; shift; exec sh -c "$*"\n' > /srv/shim/ssh; chmod +x /srv/shim/ssh
echo "== install the 42 frozen files from the repo (cp -p over the archive copies; cmp first)"
cd /opt/Deers-Rock/tools
for n in $(awk '{print $2}' /srv/repo/khanza-r5/evidence/p22/r5_p22_frozen_manifest_20261031.sha256); do cmp -s /srv/repo/khanza-r5/tools/$n $n || echo "DIFFERS before install: $n"; cp -p /srv/repo/khanza-r5/tools/$n $n; done
sha256sum -c /srv/repo/khanza-r5/evidence/p22/r5_p22_frozen_manifest_20261031.sha256 | grep -c ': OK'
echo "== verify_published"
cd /srv/repo/khanza-r5 && PATH=/srv/shim:$PATH bash src/verify_published.sh 2>&1 | tail -20
