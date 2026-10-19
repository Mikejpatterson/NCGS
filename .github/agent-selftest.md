Self-test of the agent cycle (documentation only, no app changes).
In docs/TEST-PLAN.md, add a short section "Design branch checks" describing, in the plain style of that file:
tools/guard.sh (what it blocks), test/design.run.js (what it compares and when it fails), and building previews
from invented data with NCGS_FIXTURE=1 and NCGS_DESIGN=editorial. Check every command against the real files
before writing it down. Do not change any other file.
