# MS02 — Baseline diagnostics and matched manifest

| Header | Value |
|---|---|
| ID | MS02 |
| Depends on | MS01 accepted and committed |
| Size / time | Medium; 45-60 active minutes plus serialized GS-before wall time |
| Owner | Generator tooling |
| Milestone | M2: honest before-data for the accepted v3 changes |
| Traceability | R23, R1/R2, AC01; PROC-S1 |
| Status | Not started |

## Goal & business context

Capture the baseline before any order, counter, acceptance or output change. Keep score-only hits
separate from requiredness-qualified hits, and distinguish a raw-band upper bias from the analytical
minimum imposed by a tier's first technique. No new generation behavior in this task.

## Scope

In: additive soak diagnostics, a machine-readable request ledger, pure reporting helpers/tests,
the fixed 17-cell baseline and its record.
Out: `p.exact`/I5 behavior change (MS05), production counters/options, derived-certificate activation,
new caps/windows/targets, weights/bands, support lists, fixture regeneration or qualification.

## Repository rules

`AGENTS.md` and the checklist apply. No Git write operations; no pack/log edits. GS-before is the only
heavy gate owned here: announce its exact shard and obtain the orchestrator's shared-machine slot.
Do not run a gate beside Pentomino's heavy work. No temporary-system directories or new dependencies.

## Inputs & context

### Accepted contracts (R23/AC01, copied)

```text
V = SG.difficulty.breakdown(rating.techniqueCounts, rating.empties).empty
wMin = minimum WEIGHTS[id] over tierTechniques(requested, model)
attainableMin = max(spec.min, 1.25 * wMin + V)
rawPosition = (rating.score - spec.min) / (spec.max - spec.min)
attainablePosition = (rating.score - attainableMin) / (spec.max - attainableMin)
```

`1.25 * w_min(tier) + V` is an analytic lower bound of the attainable range, not a reachability
guarantee. A below-bound target "steers toward the lowest scores the bounded search reaches".
Report null with a reason where the adjusted position is undefined: vacuous or empty tier, unrated or
off-band result, non-finite band, or non-positive width. Leave defined values unclamped and keep the
raw position next to the adjusted position. There is no change to target sampling, first-exact stop,
weights or budgets.

Shallow share is over **solved in-band** puzzles, not exact puzzles. Before S1, use the reference floor
after I1 has established uniqueness. Record old score-only hits and requiredness-qualified hits
separately; compare the latter against the full request denominator.

### Pack reporting contract

Add pure helpers under `SG.fixtures.difficultyDiagnostics` in a classic fixture script, for use by the
soak CLI and quick tests. They do not enter application script lists:

```text
positionOf({score,solved,V,min,max,tierWeights,vacuous}) ->
  { raw:number|null, adjusted:number|null, lower:number|null,
    reason:null|'unrated'|'non-finite-band'|'non-positive-width'|'off-band'|'empty-tier'|'vacuous-tier' }
```

Compute raw independently when solved/finite score and finite positive band width, even for an
off-band diagnostic result; do not include off-band rows in spread histograms. Adjusted guards, in
order: unrated, non-finite band, non-positive raw width, off-band, empty tier, vacuous tier, then
non-positive adjusted width. `lower` is null until a nonvacuous tier's analytic lower bound is defined.
Otherwise compute the accepted formula literally, with no rounding/clamping.

`summaryOf(rows)` reports requested/achieved matrix, error/unrated/in-band counts, old hits, qualified
hits, shallow share with its denominator, peak-ID histogram, raw/adjusted deciles and upper median for
separate exact and all-in-band cohorts. Empty cohorts give null statistics, never 0% or median 0.
Upper median is sorted index `floor(n/2)`; decile p is index `min(n-1,floor(p*n))`.

Extend soak with `--json=<project-relative-file>`. It enables these additional diagnostics, appends a
diagnostic summary after the existing text sections and writes the ledger; calls without it retain
their old text/work. The S0 gate stays unchanged. The file is UTF-8/CRLF, final newline; update it after
each completed request, then after deferred diagnostic results, and mark completion only at the end:

```text
{ schema:1, complete:boolean,
  meta:{ sourceHash, commit, dirty, node, machine, argv, seedBase, manifest },
  rows:[{ variant, requested, index, tag, pipelineSeed:null|number,
          outcome:'ok'|'error', error:null|{code,message},
          achieved, solved, score, ratingVersion, techniqueCounts, empties,
          scoreHit, generationExact, qualifiedHit, required:null|boolean,
          referenceStatus, referenceError:null|{code,message}, shallow:null|boolean, position,
          generationMs, diagnosticMs, fullRatings,
          proposals:null, shallowRatings:null, capHits:null,
          chainLengths:[], nishioDepths:[], target:null }],
  summary:... }
```

Null counters are **not exposed at this baseline**, not zero work. MS05 owns the extra cap/search
telemetry; MS06 owns targets; MS07 adds split-window diagnostics.

### Measurement algorithm

1. Preserve `generateOne`'s direct-vs-pipeline dispatch, tag/seed derivation, RNG streams, configuration
   and generation timing boundary. Do not silently route every variant through the pipeline.
2. A scoped wrapper around `SG.difficulty.rate` may count calls during the primary generation only;
   preserve arguments/return/errors and restore it in `finally`. Do not include I4 repetitions,
   diagnostic ratings or reference checks in `fullRatings`.
3. Keep I1-I7 and the old S0 hit/exit predicate. Add per-request error records so failures remain in
   the declared denominator; errors/invariant failures make the report fail, even when `--no-gate`
   suppresses the exit status. Never drop a failed request and claim n=12.
4. **Defer every new diagnostic solve until all primary generations and the existing I1-I7 checks
   for this invocation have finished.** Keep owned givens/ratings and the exact returned model per
   request; do not rebuild a Jigsaw/Killer/sign model from a different seed. The pre-MS04 subset
   finder has a persistent check-spacing counter (`core/js/engine/tech-subset.js:48,136`); interleaving
   extra floor/diagnostic solves could change a later generated puzzle. No counter fix belongs here.
   While generation is in progress, ledger rows say referenceStatus `not-run`.
5. In that deferred diagnostic phase, create one caller budget of 120,000 ms per request; only after
   the recorded I1 check proved uniqueness, run MS01's reference with that budget at the requested
   level. Record solved in-band + required as `qualifiedHit`, independently
   of the old `p.exact`/score-level equality. A reference failure has its own error/status and is not
   called shallow; it never replaces the generation outcome or silently changes S0's gate.
6. For final-path length/depth histograms, rate the final board separately with `collectSteps:true`
   under that same remaining diagnostic budget; do not renew it after the reference. This is outside
   the generation timer and production call counter. Check the recomputed
   counts/score against the returned rating; report a disagreement, do not overwrite it.
7. Count step lengths from `i18nArgs.length` on forcing-chain findings and depths from `i18nArgs.depth`
   on Nishio findings; report both step histograms and per-puzzle maxima. This is diagnostic work only.
8. Before MS04, always use the reference, not a derivation from counts. After activation, any future
   weight/band override must satisfy the prefix invariant or use the reference explicitly.

### Anchors at `2c665bb`

| File:line / quote | Use |
|---|---|
| `generator/tests/soak.js:52-59`, `--count=N` / `--seed=N` | One-cell count 12; default seed base 20260101 |
| `generator/tests/soak.js:185-193`, `c.n = opts.quick` | Do not use --quick or --per-combo for this manifest |
| `generator/tests/soak.js:202-228`, `function seedFor(tag)` / `function generateOne` | Preserve both routes and exact tags |
| `generator/tests/soak.js:234-241`, `const t0` / `rows.push` | Record generation time before diagnostics |
| `generator/tests/soak.js:242-287`, `// I1` through `// I7` | Uniqueness first; keep old assertions/gate in S0 |
| `generator/tests/soak.js:401-419`, `const ok = failed === 0` | Preserve old gate thresholds and --no-gate behavior |
| `generator/tests/node-runner.js:228`, `SG.test.node = Object.freeze` | Node-only CLI tests use fs/path/vm/root |

## Files to create/modify

- `generator/tests/soak.js`.
- New `generator/tests/fixtures/difficulty-diagnostics.js` and
  `generator/tests/suites/difficulty-diagnostics.test.js`.
- `generator/tests.html`: fixture and suite lists.
- New `docs/difficulty-v3/baseline.md` and `docs/difficulty-v3/evidence/MS02/` JSON/text evidence.
- Docs: `generator/design.md` 15.3/15.4 (diagnostics, not v3 production acceptance yet);
  `DEVELOPERGUIDE.md` and `.vn.md`, soak usage/columns.

No application engine file is owned. Do not edit historical difficulty-rating reports or existing fixtures.

## Implementation steps

1. Implement/test the pure position and summary helpers; keep language-independent numbers/statuses.
2. Add additive CLI JSON output and diagnostics with the exact generation route/timing preserved.
3. Validate one existing small request both with and without diagnostics; puzzle identity and old gate
   inputs must agree. Keep timing fields out of deterministic equality.
4. Run targeted/quick checks. Announce GS-before, then execute one manifest cell per bounded command.
5. Write baseline metadata, all denominators, both distributions, shallow/cap visibility and failures.
   The record describes this pre-order/pre-v3 code, not a future production guarantee.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS02-B01 | Baseline separates score-only hits from needing the requested tier |
| MS02-B02 | Raw and analytic positions cannot hide shallow, undefined or failed outcomes |
| MS02-B03 | All 17 cells/204 requests are accounted for without changing generation |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS02-T01 | Formula, null reasons, unclamped values, cohorts and upper median match this task |
| MS02-T02 | Uniqueness precedes the reference; errors never become required=true |
| MS02-T03 | Seeds/routes/timing boundary and S0 gate are preserved; all new solves follow all original generation/check work |
| MS02-T04 | JSON ledger survives a partial run and records source/config/count identity |
| MS02-T05 | Both quick sets pass; GS evidence is complete or explicitly blocked, never falsely green |

## Test plan

Pure cases: Expert score 900, V=40, tier weight 650 gives lower 852.5, raw 2/3, adjusted 47.5/147.5.
At score 852 the adjusted value is negative and remains so. At score 650 for that band, adjusted is
null/off-band and raw is -1/6. Test every null reason, empty/exact/all-in-band cohorts, upper median
of `[1,2,3,4]` = 3, a failed request in the hit denominator, and shallow share over in-band only.
Test cancellation/reference errors and a diagnostic failure without modifying the returned puzzle.
Add a call-order regression proving no new reference or collectSteps solve runs between two baseline
generations; it would fail for a naive inline-diagnostics implementation.

From `generator/`: `node tests\node-runner.js --suite=difficulty-diagnostics,difficulty-floor,help,ui-contract`,
then `node tests\node-runner.js`; from `player/`: `node tests\node-runner.js`.
Check `$LASTEXITCODE` after every command and stop on a quick-check failure.

GS-before command, from `generator/`, once for each row/cell:

```powershell
node tests\soak.js --variant=<id> --level=<level> --count=12 --seed=20260101 --no-gate --json=..\docs\difficulty-v3\evidence\MS02\<id>-<level>.json
```

| Variant | Levels |
|---|---|
| classic9 | normal, hard, expert, master, nightmare, hell1 |
| killer | normal, hard, expert |
| jigsaw9 | normal, hard, expert, nightmare |
| greaterThan | normal, hard, expert |
| diagonalX | nightmare |

All are offered at HEAD. If any command reaches ten minutes, stop it, preserve its completed rows,
report incomplete evidence and investigate; do not manufacture a complete pass. These are diagnostic
baseline shards, not `qualify.js` or `perf.js` gates.

## Definition of done & handoff

Give MS03/MS05/MS06/MS18 the manifest, ledger schema, null/counter meanings, source identities,
baseline outcomes and exact commands. Report any incomplete cell or invariant failure explicitly.
Do not fill the log or commit.

## Execution log

| Field | Value |
|---|---|
| Status | |
| Start | |
| End | |
| Duration | |
| Model | |
| Token usage | |
| AI credits | |
| Verification | |
| Acceptance | |
| Issues & resolutions | |
| Handoff | |
