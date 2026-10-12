#!/bin/sh
# Everything in one go: the engine and server tests, then (when the real data is present) a build and every screen test.
# Run from the project folder:  sh tools/check.sh
set -e
cd "$(dirname "$0")/.."
node --test test/engine.test.js test/server.test.js test/fuzz.server.test.js test/fuzz.engine.test.js
if [ ! -f data/seed.json ]; then echo "No data/seed.json here, so the screen tests are skipped."; exit 0; fi
node build.js > /dev/null
python3 -m http.server 8765 -d dist > /dev/null 2>&1 &
SERVER=$!
node tools/devserver.js > /dev/null 2>&1 &
DEV=$!
trap 'kill $SERVER $DEV 2>/dev/null' EXIT
sleep 1
FAIL=0
for t in test/*.run.js; do
  if NODE_PATH="${NODE_PATH:-/opt/npm-tools/node_modules}" timeout 120 node "$t" > /tmp/ncgs-check.out 2>&1; then echo "ok    $t"; else echo "FAIL  $t"; grep -E "FAIL|Error" /tmp/ncgs-check.out | head -5; FAIL=1; fi
done
exit $FAIL
