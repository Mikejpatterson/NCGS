#!/bin/bash
# Hard checks for one round of the agent cycle. Run by the workflow, never by the coding agent.
# The script comes from the trusted control checkout, so the agent cannot weaken it.
#   gates.sh <work dir> <base sha> <out dir>
# Writes <out>/gates.json, one log per check in <out>/, and screenshots in <out>/design/.
# Hard gates (any failure blocks approval): protected files, unit tests, layout at 360/390/135%,
# several-phones score safety, a whole round, start hole. The design comparison is information for
# the reviewer, because a deliberate design change is expected to change pixels and sometimes words.
set -u
WORK="$(cd "$1" && pwd)"; BASE="$2"; OUT="$(mkdir -p "$3" && cd "$3" && pwd)"
export NODE_PATH="${NODE_PATH:-$(npm root -g)}"
RESULTS="$OUT/results.tsv"; : > "$RESULTS"
record() { printf '%s\t%s\t%s\t%s\n' "$1" "$2" "$3" "$4" >> "$RESULTS"; }   # name, hard|info, ok|fail|skip, detail
cd "$WORK"

# 1. Protected files: scoring, storage, sync, real data, the published site, workflows and this automation.
PROTECTED='^(src/engine\.js|src/server\.js|src/app/00-core\.js|src/app/10-data\.js|site/|deploy\.json|data/|\.github/|tools/agent/)'
CHANGED="$(git diff --name-only "$BASE" HEAD)"
BAD="$(printf '%s\n' "$CHANGED" | grep -E "$PROTECTED" | grep -vE '^data/fixture-seed\.json$' || true)"
if [ -n "$BAD" ]; then record protected-files hard fail "$(echo $BAD)"; else record protected-files hard ok "none touched"; fi
TESTS_CHANGED="$(printf '%s\n' "$CHANGED" | grep -E '^test/' || true)"
record tests-changed info "$([ -n "$TESTS_CHANGED" ] && echo fail || echo ok)" "${TESTS_CHANGED:-no test files changed}"
if [ -n "$(git ls-files data/seed.json data/ncgs-2026.json)" ]; then record real-data hard fail "real data file is tracked"; fi

# 2. Engine and server tests (score rules, saving, versions, conflicts)
if node --test test/engine.test.js test/server.test.js test/fuzz.engine.test.js test/fuzz.server.test.js > "$OUT/unit.log" 2>&1; then r=ok; else r=fail; fi
record unit-tests hard $r "$(grep -E '^# (pass|fail)' "$OUT/unit.log" | tr '\n' ' ')"

# 3. Previews from invented data, for this round and for the base
rm -rf dist "$OUT/base"
if NCGS_FIXTURE=1 node build.js > "$OUT/build.log" 2>&1 && cp dist/preview.html "$OUT/head-standard.html" \
  && NCGS_FIXTURE=1 NCGS_DESIGN=editorial node build.js >> "$OUT/build.log" 2>&1 && cp dist/preview.html "$OUT/head-editorial.html"; then
  record build hard ok "standard and editorial previews"
else
  record build hard fail "$(tail -3 "$OUT/build.log" | tr '\n' ' ')"
fi
git worktree add -q "$OUT/base" "$BASE" 2>/dev/null && (cd "$OUT/base" && NCGS_FIXTURE=1 node build.js > /dev/null 2>&1 && cp dist/preview.html "$OUT/base-standard.html" \
  && NCGS_FIXTURE=1 NCGS_DESIGN=editorial node build.js > /dev/null 2>&1 && cp dist/preview.html "$OUT/base-editorial.html")

# 4. Layout: nothing cut off or off screen, targets not too small, at 360, 390 and 135% text, both looks
mkdir -p "$OUT/serve"
python3 -m http.server 8765 -d "$OUT/serve" > /dev/null 2>&1 & SERVE=$!
sleep 1
for look in standard editorial; do
  if [ -f "$OUT/head-$look.html" ]; then
    cp "$OUT/head-$look.html" "$OUT/serve/preview.html"
    if timeout 400 node test/layout.run.js > "$OUT/layout-$look.log" 2>&1; then r=ok; else r=fail; fi
    record "layout-$look" hard $r "$(grep -c '^PASS' "$OUT/layout-$look.log") pass, $(grep -c '^FAIL' "$OUT/layout-$look.log") fail"
  else record "layout-$look" hard fail "no build"; fi
done
kill $SERVE 2>/dev/null

# 5. Design comparison against the base (information: what changed on screen)
for look in standard editorial; do
  if [ -f "$OUT/base-$look.html" ] && [ -f "$OUT/head-$look.html" ]; then
    if timeout 900 node test/design.run.js "$OUT/base-$look.html" "$OUT/head-$look.html" "$OUT/design/$look" > "$OUT/design-$look.log" 2>&1; then r=ok; else r=fail; fi
    record "design-compare-$look" info $r "$(grep -c '^PASS' "$OUT/design-$look.log") same controls+words, $(grep -c '^FAIL' "$OUT/design-$look.log") differ"
  else record "design-compare-$look" info skip "base or head build missing"; fi
done

# 6. Score safety with the full live-style build: several phones, a whole round, start hole.
#    data/seed.json is a temporary copy of the invented fixture, deleted straight after.
if [ -e data/seed.json ]; then record score-safety hard fail "data/seed.json already present"; else
  cp data/fixture-seed.json data/seed.json
  if node build.js > "$OUT/fullbuild.log" 2>&1; then
    node tools/devserver.js 8766 > "$OUT/devserver.log" 2>&1 & DEV=$!
    python3 -m http.server 8765 -d dist > /dev/null 2>&1 & SERVE=$!
    sleep 1
    for t in phones finish starthole; do
      if timeout 400 node "test/$t.run.js" > "$OUT/$t.log" 2>&1; then r=ok; else r=fail; fi
      record "$t" hard $r "$(grep -c '^PASS' "$OUT/$t.log") pass, $(grep -c '^FAIL' "$OUT/$t.log") fail"
    done
    kill $DEV $SERVE 2>/dev/null
  else record score-safety hard fail "full build failed"; fi
  rm -f data/seed.json
fi
rm -rf dist
git worktree remove --force "$OUT/base" 2>/dev/null

python3 - "$RESULTS" "$OUT/gates.json" <<'EOF'
import json, sys
rows = [l.rstrip('\n').split('\t') for l in open(sys.argv[1]) if l.strip()]
checks = [{"name": n, "kind": k, "result": r, "detail": d} for n, k, r, d in rows]
hard_ok = all(c["result"] == "ok" for c in checks if c["kind"] == "hard")
json.dump({"hard_ok": hard_ok, "checks": checks}, open(sys.argv[2], "w"), indent=1)
print(("ALL HARD GATES PASS" if hard_ok else "HARD GATE FAILED") + "\n" + "\n".join(f'{c["result"]:4}  {c["name"]}: {c["detail"]}' for c in checks))
EOF
