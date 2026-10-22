#!/bin/sh
# Design-branch guard: fails if this branch changes scoring, storage or sync code, real data, or the published site.
# The redesign is looks only. Run from the project folder:  sh tools/guard.sh [base]   (default base: origin/main)
set -e
cd "$(dirname "$0")/.."
BASE="${1:-origin/main}"
PROTECTED='^(src/engine\.js|src/server\.js|src/app/00-core\.js|src/app/10-data\.js|site/|deploy\.json|data/)'
ALLOWED='^data/fixture-seed\.json$'
CHANGED=$(git diff --name-only "$BASE"...HEAD)
BAD=$(printf '%s\n' "$CHANGED" | grep -E "$PROTECTED" | grep -vE "$ALLOWED" || true)
if [ -n "$BAD" ]; then
  echo "FAIL  this branch changes files the design work must not touch:"
  printf '      %s\n' $BAD
  echo "      Scoring, storage, sync, real data and the published site change only in a separate, reviewed pull request."
  exit 1
fi
echo "ok    no scoring, storage, sync, data or published-site files changed since $BASE"
