#!/usr/bin/env bash
# Prints the suites (comma separated) that one CI job of the generator tests runs: the groups below, and "rest",
# which is every other suite, so that a suite added later is run without editing this file.
# The times are those of the CI run of 2026-10-20 (a whole run took 17 minutes in one job); keep each group at
# about 2 to 4 minutes and put suites that belong together in one group.
set -euo pipefail

# Every puzzle of every registered variant at every level (~295 s): the longest suite, it cannot be shared.
sweep='variants,variants-registry,smoke'

# The solving techniques, and the killer cages that build on them (~250 s).
engine='killer,logical-solver,solver,steps,digger,techniques,technique-weights,tech-basic,tech-chain,tech-fish,tech-subset,tech-wing'

# Variants that add rules to the grid: inequality signs, extra regions, jigsaw regions (~230 s).
rules='greater-than,extra-regions,jigsaw'

# Rating of the puzzles, speed of the generation and the pipeline that runs it, on the large boards too (~250 s).
rating='difficulty,perf,pipeline,worker,cache,mega,multigrid,wordoku'

cd "$(dirname "$0")/../.."

case "${1:-}" in
  sweep) echo "$sweep" ;;
  engine) echo "$engine" ;;
  rules) echo "$rules" ;;
  rating) echo "$rating" ;;
  rest)
    named=",$sweep,$engine,$rules,$rating,"
    for file in core/tests/suites/*.test.js generator/tests/suites/*.test.js generator/tests/manual/*.test.js; do
      name=$(basename "$file" .test.js)
      case "$named" in *",$name,"*) ;; *) echo "$name" ;; esac
    done | sort -u | paste -sd, -
    ;;
  *)
    echo "usage: generator-suites.sh sweep|engine|rules|rating|rest" >&2
    exit 2
    ;;
esac
