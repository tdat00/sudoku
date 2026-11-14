#!/usr/bin/env bash
# The one entry point of both workflows (pull-request.yml, pages.yml) to the Generator quick tier, whose groups are
# declared in .github/scripts/generator-quick.json and checked and run by generator-quick.js (a manifest reader: the
# argument arrays are executed as they are, with no eval).
#
#   generator-suites.sh check [--keep=<dir>]   every quick suite and test of the Generator in exactly one shard, no
#                                              manual or unknown suite, no empty shard, every job inside its limit
#   generator-suites.sh matrix                 the job matrix of the workflows (one JSON line)
#   generator-suites.sh list <group>           the suites of a group, comma separated
#   generator-suites.sh run <group> [--dry-run]  run the shards of a group, each as its own node command
#   generator-suites.sh selftest               the checks on synthetic plans (gap, duplicate, unknown, empty ...)
#
# The old groups (sweep, engine, rules, rating, rest) ran every manual suite and picked up any new one in "rest". Now a
# suite that is added later fails `check` until it has a shard, and tests/manual is never run by CI.
set -euo pipefail

cd "$(dirname "$0")/../.."

case "${1:-}" in
  selftest) exec node .github/scripts/generator-quick.selftest.js ;;
  *) exec node .github/scripts/generator-quick.js "$@" ;;
esac
