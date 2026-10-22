#!/bin/bash
# Hard checks for the agent cycle. Run by the workflow, never by the coding agent; this copy comes from the
# trusted control checkout, so the agent cannot weaken it.
#   gates.sh <work dir> <base sha> <out dir> [quick|full]
# quick (every round, a few minutes): protected files, engine/server/fuzz tests and, only if app code changed,
#   both preview builds, the layout test on both looks (side by side) and a 390px screenshot comparison.
# full (once, after the reviewer approves): only what the change needs. If app code changed, the whole screenshot
#   comparison at 360/390/135% on both looks, and the score-safety tests (several phones, whole round, start hole).
#   A change to documents only needs nothing more.
# Writes <out>/gates.json, a log per check, and screenshots in <out>/design/.
set -u
WORK="$(cd "$1" && pwd)"; BASE="$2"; OUT="$(mkdir -p "$3" && cd "$3" && pwd)"; LEVEL="${4:-full}"
export NODE_PATH="${NODE_PATH:-$(npm root -g)}"
RESULTS="$OUT/results.tsv"; : > "$RESULTS"
record() { printf '%s\t%s\t%s\t%s\n' "$1" "$2" "$3" "$4" >> "$RESULTS"; }   # name, hard|info, ok|fail|skip, detail
cd "$WORK"
# Anything the coding agent left running (a test server on 8765/8766) would steal the ports these checks use.
free_port() { fuser -k -n tcp "$1" > /dev/null 2>&1 || { command -v ss > /dev/null && ss -ltnpH "sport = :$1" | grep -o 'pid=[0-9]*' | cut -d= -f2 | xargs -r kill; } ; }
free_port 8765; free_port 8766; sleep 1
serve() {   # $1 = port, $2 = dir; waits until it answers
  python3 -m http.server "$1" -d "$2" > /dev/null 2>&1 &
  for i in $(seq 1 20); do curl -sf -o /dev/null "http://localhost:$1/" && return 0; sleep 0.5; done
  return 1
}
layout_detail() {   # pass/fail counts, or why the test did not run at all
  p=$(grep -c '^PASS' "$1" 2>/dev/null); f=$(grep -c '^FAIL' "$1" 2>/dev/null)
  if [ "${p:-0}" = 0 ] && [ "${f:-0}" = 0 ]; then echo "did not run: $(grep -v '^\s*$' "$1" 2>/dev/null | tail -1 | cut -c1-150)"; else echo "$p pass, $f fail"; fi
}

CHANGED="$(git diff --name-only "$BASE" HEAD)"
APP="$(printf '%s\n' "$CHANGED" | grep -E '^(src/|build\.js$|data/fixture-seed\.json$)' || true)"
TESTS="$(printf '%s\n' "$CHANGED" | grep -E '^test/' || true)"
SCOPE=$([ -n "$APP" ] && echo app || ([ -n "$TESTS" ] && echo tests || echo docs))
record scope info ok "$LEVEL checks; change touches: $SCOPE ($(printf '%s\n' "$CHANGED" | grep -c .) files)"

build_previews() {   # $1 = dir to build in, $2 = prefix for output files
  (cd "$1" && rm -rf dist && NCGS_FIXTURE=1 node build.js > "$OUT/build-$2.log" 2>&1 && cp dist/preview.html "$OUT/$2-standard.html" \
    && NCGS_FIXTURE=1 NCGS_DESIGN=editorial node build.js >> "$OUT/build-$2.log" 2>&1 && cp dist/preview.html "$OUT/$2-editorial.html")
}
compare() {   # $1 = look, $2 = sizes ("" = all), $3 = name
  if [ -f "$OUT/base-$1.html" ] && [ -f "$OUT/head-$1.html" ]; then
    if DESIGN_SIZES="$2" timeout 900 node test/design.run.js "$OUT/base-$1.html" "$OUT/head-$1.html" "$OUT/design/$1" > "$OUT/$3.log" 2>&1; then r=ok; else r=fail; fi
    record "$3" info $r "$(grep -c '^PASS' "$OUT/$3.log") same controls+words, $(grep -c '^FAIL' "$OUT/$3.log") differ"
  else record "$3" info skip "base or head build missing"; fi
}
base_previews() {
  git worktree add -q "$OUT/base" "$BASE" 2>/dev/null && build_previews "$OUT/base" base
}

if [ "$LEVEL" = quick ]; then
  # Protected files: scoring, storage, sync, real data, the published site, workflows and this automation.
  PROTECTED='^(src/engine\.js|src/server\.js|src/app/00-core\.js|src/app/10-data\.js|site/|deploy\.json|data/|\.github/|tools/agent/)'
  BAD="$(printf '%s\n' "$CHANGED" | grep -E "$PROTECTED" | grep -vE '^data/fixture-seed\.json$' || true)"
  if [ -n "$BAD" ]; then record protected-files hard fail "$(echo $BAD)"; else record protected-files hard ok "none touched"; fi
  record tests-changed info "$([ -n "$TESTS" ] && echo fail || echo ok)" "${TESTS:-no test files changed}"
  if [ -n "$(git ls-files data/seed.json data/ncgs-2026.json)" ]; then record real-data hard fail "real data file is tracked"; fi

  if node --test test/engine.test.js test/server.test.js test/fuzz.engine.test.js test/fuzz.server.test.js > "$OUT/unit.log" 2>&1; then r=ok; else r=fail; fi
  record unit-tests hard $r "$(grep -E '^# (pass|fail)' "$OUT/unit.log" | tr '\n' ' ')"

  if [ "$SCOPE" != docs ]; then
    if build_previews "$WORK" head; then record build hard ok "standard and editorial previews"; else record build hard fail "$(tail -3 "$OUT/build-head.log" | tr '\n' ' ')"; fi
    base_previews
    mkdir -p "$OUT/serve"; cp "$OUT"/head-*.html "$OUT/serve/" 2>/dev/null
    serve 8765 "$OUT/serve" || record test-server hard fail "could not start the test web server on port 8765"
    SERVE=$!
    if grep -q LAYOUT_URL test/layout.run.js; then          # both looks side by side
      PIDS=""
      for look in standard editorial; do
        ( LAYOUT_URL="http://localhost:8765/head-$look.html" timeout 400 node test/layout.run.js > "$OUT/layout-$look.log" 2>&1; echo $? > "$OUT/layout-$look.rc" ) &
        PIDS="$PIDS $!"
      done
      wait $PIDS
    else                                                    # older test file: one look at a time
      for look in standard editorial; do
        cp "$OUT/head-$look.html" "$OUT/serve/preview.html"
        timeout 400 node test/layout.run.js > "$OUT/layout-$look.log" 2>&1; echo $? > "$OUT/layout-$look.rc"
      done
    fi
    kill $SERVE 2>/dev/null
    for look in standard editorial; do
      r=$([ "$(cat "$OUT/layout-$look.rc" 2>/dev/null)" = 0 ] && echo ok || echo fail)
      record "layout-$look" hard $r "$(layout_detail "$OUT/layout-$look.log")"
    done
    [ "$SCOPE" = app ] && compare editorial 390 design-compare-editorial-390
  else
    record app-checks info skip "documents only: no build, layout or screenshots needed"
  fi
else
  if [ "$SCOPE" = app ]; then
    base_previews; build_previews "$WORK" head
    compare standard "" design-compare-standard & C1=$!          # the two looks side by side
    compare editorial "" design-compare-editorial & C2=$!
    wait $C1 $C2
    # Score safety with the full live-style build. data/seed.json is a temporary copy of the invented fixture.
    if [ -e data/seed.json ]; then record score-safety hard fail "data/seed.json already present"; else
      cp data/fixture-seed.json data/seed.json
      if node build.js > "$OUT/fullbuild.log" 2>&1; then
        node tools/devserver.js 8766 > "$OUT/devserver.log" 2>&1 & DEV=$!
        serve 8765 dist || record test-server hard fail "could not start the test web server on port 8765"
        SERVE=$!
        for i in $(seq 1 20); do curl -sf -o /dev/null http://localhost:8766/ && break; sleep 0.5; done
        for t in phones finish starthole; do
          if timeout 400 node "test/$t.run.js" > "$OUT/$t.log" 2>&1; then r=ok; else r=fail; fi
          record "$t" hard $r "$(layout_detail "$OUT/$t.log")"
        done
        kill $DEV $SERVE 2>/dev/null
      else record score-safety hard fail "full build failed"; fi
      rm -f data/seed.json
    fi
  else
    record full-checks info skip "no app code changed: screenshot comparison and score-safety tests not needed"
  fi
fi
rm -rf dist
git worktree remove --force "$OUT/base" 2>/dev/null

python3 - "$RESULTS" "$OUT/gates.json" "$LEVEL" <<'EOF'
import json, sys
rows = [l.rstrip('\n').split('\t') for l in open(sys.argv[1]) if l.strip()]
checks = [{"name": n, "kind": k, "result": r, "detail": d} for n, k, r, d in rows]
hard_ok = all(c["result"] == "ok" for c in checks if c["kind"] == "hard")
json.dump({"level": sys.argv[3], "hard_ok": hard_ok, "checks": checks}, open(sys.argv[2], "w"), indent=1)
print(("ALL HARD GATES PASS" if hard_ok else "HARD GATE FAILED") + f" ({sys.argv[3]})\n" + "\n".join(f'{c["result"]:4}  {c["name"]}: {c["detail"]}' for c in checks))
EOF
