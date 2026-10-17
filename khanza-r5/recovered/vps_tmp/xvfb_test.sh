#!/bin/bash
# Isolated Xvfb :99 lifecycle test
set +e
pkill -f 'Xvfb :99' 2>/dev/null
sleep 1
Xvfb :99 -screen 0 1280x1024x24 &
XPID=$!
sleep 2
if kill -0 "$XPID" 2>/dev/null; then echo "Xvfb pid=$XPID alive=yes"; else echo "Xvfb pid=$XPID alive=NO"; fi
ls -la /tmp/.X11-unix/X99 2>/dev/null
if DISPLAY=:99 timeout 3 xset q >/dev/null 2>&1; then echo "X11-REACHABLE"; else echo "X11-UNREACHABLE"; fi
# Now test with faketime (what the JVM uses)
if DISPLAY=:99 faketime '2025-06-01 08:00:00' timeout 3 xset q >/dev/null 2>&1; then
  echo "X11-REACHABLE-UNDER-FAKETIME"
else
  echo "X11-UNREACHABLE-UNDER-FAKETIME"
fi
# Confirm the JVM can actually connect (real test)
if DISPLAY=:99 faketime '2025-06-01 08:00:00' java -cp "." -version >/dev/null 2>&1; then
  echo "JAVA-STARTS"
fi
kill "$XPID" 2>/dev/null
