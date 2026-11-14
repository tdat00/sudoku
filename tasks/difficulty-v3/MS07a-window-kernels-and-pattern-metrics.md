# MS07a — Windowed search kernels and bounded pattern measurements

| Header | Value |
|---|---|
| Depends on | MS06d accepted |
| Size / active time | Medium; 50-60 minutes |
| Owner / milestone | Shared solver/tooling; M7a inactive kernels |
| Authority | R9/R10/R21 |
| Status | Not started |

## Goal & business context

Make shortest-proof windowing testable without changing registered techniques yet. Supply the
bounded measurement/rare-fixture infrastructure every following technique task needs.

## Scope

In: parameterized unregistered kernels, measurement CLI, deterministic supplemental sweep inputs.
Out: new registrations/windows/defaults, new help examples, generated-output changes.

## Repository rules

AGENTS/checklist; no Git/pack/log edits. Classic core code; Node tooling may use CommonJS. No
dependencies, temp-system paths or production timing decisions. Existing wrappers remain behavior-identical.

## Inputs & context

R9, verbatim:

> Search the shortest represented proof, enforce the inclusive window inside each ID, and intersect
> its maximum with a caller's explicit valid maximum. A larger override never enlarges the registered
> ID's window. Long/deep called alone must not relabel a short/shallow proof.
> `length` counts edges; for two-path findings it is their maximum length, not sum.

Provide internal/test seam:

```text
SG.chainSearch.forcing(model,state,ctx,{id,minLength,maxLength,workLimit?})
SG.chainSearch.nishio(model,state,ctx,{id,minDepth,maxDepth,workLimit?})
```

Find the minimum over the whole represented search up to max, then reject a minimum below min.
Do not begin searching at min and rename a shorter available proof. Preserve existing BFS tie order
and Nishio's iterative deepening. Exhaustion before a minimum is established returns null.
Parameterize Finding.technique and i18n prefix; the general seam permits >12-edge algorithm tests.
Keep existing registered wrappers calling their old defaults until MS07b.

R10 work defaults: 50000 per new finder, entry check and at least every 256 work units; reset per
call. A chain unit is an edge expansion; Nishio uses trial/assignment extensions. Cancellation and
non-budget errors propagate. Optional diagnostic `ctx.options.onPatternWork(record)` receives:

```text
{id, work, limit:number|null, capHit:null|'work'|'records'|'nodes',
 retained:number|null}
```

It observes, never selects, results. Return copied metadata on completion/exhaustion. A legacy
unbounded kernel reports limit null. Parent cancellation still throws.

Create `generator/tests/pattern-cost.js --ids=id[,id] --runs=20 --json=<file> [--case=<text>]`.
Load the existing runner's harness, ordered SOURCE_FILES and FIXTURES_DIRS, but no suites. Use
H.makeState/stateAfter on real registered fixtures; repeat identical read-only finds, collect
work/cap/Finding data and p50/p95/max time per case. Record source/fixture/tool hashes, Node/config.
Fail unknown IDs, missing fixtures, empty selection or incomplete runs. Eight-minute caller budget;
check it again after a finder that may swallow budget.exceeded. No generated puzzle discovery.
Pure parser/aggregation tests go in a quick suite; never assert wall-clock thresholds there.

For rare techniques, retain all existing 120/300 random states and minFirings=3.
`H.assertSound` uses `opts.states` **instead of** generating random states, so never pass only
the supplements. Use this exact construction with the call site's existing model, count, seed
and other options; the unexported default seed is 20260101:

```js
const seed = opts.seed === undefined ? 20260101 : opts.seed;
const random = H.randomStatesWithKnownSolution(m, SG.testkit.rng.create(seed), count);
opts.states = random.concat(supplements);
opts.minFirings = 3;
const stats = H.assertSound(t, techniqueId, opts);
expect(stats.states).toBe(count + supplements.length);
```

Keep the existing count (120 or 300), `maxSteps` and seed; do not lower minFirings, skip an ID
or replace random inputs. Test the actual random prefix as well as the total count.
Use explicit fixture `after` arrays; historical LADDER is never extended.

### Anchors verified at c9935cd

| File:line / quote | Use |
|---|---|
| `core/js/engine/tech-chain.js:356-385`, `function buildChainFinding` | Parameterize ID/key |
| `core/js/engine/tech-chain.js:389-429`, `function findForcingChain` | Existing global minimum scan |
| `core/js/engine/tech-chain.js:472-513`, `function findNishio` | Iterative depths |
| `core/tests/fixtures/techniques-helper.js:577-625`, `function assertSound` | Existing supplied-states route |
| `generator/tests/node-runner.js:102-105`, `const HARNESS_FILE` | Reuse loader contract |

## Files to create/modify

- `core/js/engine/tech-chain.js`; `core/tests/suites/tech-chain.test.js`, `techniques.test.js`;
  current technique fixtures only for supplementary metadata, historical data read-only.
- New `generator/tests/pattern-cost.js`, pure fixture helper if needed, new
  `generator/tests/suites/pattern-cost-tools.test.js`; `generator/tests.html` lists.
- Core/source API documentation in Generator design 6.6/13.6/15.4 and both developer guides.

## Implementation steps

1. Extract/parameterize kernels while old wrappers retain old output.
2. Test min/max filtering and budget behavior directly through the unregistered seam.
3. Implement bounded cost recording from existing fixtures, with no suite or generation side effects.
4. Add optional supplemental sweep cases while preserving every random input and coverage assertion.
5. Run narrow and both quick sets; no heavy discovery or canonical refresh here.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS07a-B01 | Later split IDs cannot claim a deeper proof when a shallower one was found |
| MS07a-B02 | Rare patterns can be measured and tested without weakening coverage |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS07a-T01 | Minimum/max edge semantics, two-path max, depth minimum and exhaustion are tested |
| MS07a-T02 | Existing wrappers/fixtures stay unchanged and generic >12 tests remain possible |
| MS07a-T03 | Metric records are bounded, deterministic apart from time, complete or explicit failure |
| MS07a-T04 | State immutability, cancellation, unchanged random prefix plus supplements, script/test lists and both quick sets pass |

## Test plan

Test a minimum 3-edge proof with requested min 5 => null, minimum 7 with [5,12] => Finding,
max 6 => null; two paths 4/6 => length 6. Nishio depth 1 proof with [2,2] => null.
Test a shorter proof on a later root, ties, capped scan and supplementary/random counts.
Generator: `node tests\node-runner.js --suite=tech-chain,techniques,pattern-cost-tools,ui-contract,help`;
then both quick sets. Cost tool parser/render tests use fake results, not claimed gate evidence.

## Definition of done & handoff

Hand MS07b the inactive kernels and all later tasks the cost CLI/callback/fixture recipe. No registry
change, new ID or default cutoff is in force yet. No commit/log editing.

## Resume rules — S-OD4

Review: analyst cross-review. Correctness/evidence corruption or changing a recorded decision stops;
performance/availability is a named numerical item for MS07e then MS18c/MS18d, not an owner stop.
Continue under existing bounds; no additional evidence class/tooling task for a slow cell.
All possibly >10-second payloads use `Invoke-Dv3Node`, <=540 s; quick sets use the current r5
bounded manifest. Own `pattern-cost-tools` and any other added suite's r6c CI group/manifest entry.
Return the inherited/new item list, quick coverage and CI ownership.

## Execution log

| Field | Value |
|---|---|
| Status | Accepted (SA1 verdict: accept, no fix round; IR52 carried to MS07b) |
| Start | 2026-11-15 00:29 (+07:00) |
| End | 2026-11-15 01:48 developer; 01:50-02:10 SA1 implementation review (`claude-opus-5.5/15-review-of-ms07a.md`); orchestrator commit |
| Duration | 1 h 19 min developer (final quick groups 690.2 s, Player 31.8 s); about 20 min review |
| Model | claude-sonnet-5.5 (developer); claude-opus-5.5 (SA1 review); claude-opus-5.5 (orchestrator) |
| Token usage | 233 model calls; 92,404,025 input tokens (91,741,126 cache reads); 295,908 output tokens |
| AI credits | about 1,379 (developer) |
| Verification | Developer: unregistered windowed kernels in `core/js/engine/tech-chain.js` (`SG.chainSearch`), measurement CLI `generator/tests/pattern-cost.js` with fixtures, tests `tech-chain` 62 -> 89, `techniques` 165 -> 169, new `pattern-cost-tools` 28 (Generator quick 3,405, Player 1,714); three kernel mutations detected; differential against HEAD's `tech-chain.js`: 35,020 `forcingChain`/`nishio` finds (findings, error codes, budget ticks) identical in all 66 runs; the registered finders keep their old cadence; output-pinning suites pass; wrapper cost +2.6 % on a find-only microbenchmark. CLI `--ids=forcingChain,nishio --runs=20`: 6/6 cases complete, largest forcing case 22,221 of 50,000 units. Final quick runs on the final tree: Generator 3,405/3,405 (690.2 s; `ae9c1dfe…`), Player 1,714/1,714 (`1b727545…`); CI check exit 0. SA1 recomputed both fingerprints and the CLI record hashes. Orchestrator: locked focused re-run `--suite=tech-chain,techniques,pattern-cost-tools,replay,steps,help` 527/527 (35.3 s); CI check 3,405 of 3,405 |
| Acceptance | MS07a's criteria met: the kernels are unregistered and inert in production (no registration, window, default, help example or generated-output change); the differential is a sound proof of unchanged behaviour; the tests catch wrong windows, off-by-one bounds, summed chains, a skipped Nishio depth 1, unenforced caps and stale counters; the CLI is deterministic and bounded (480 s budget, `--runs` <= 200, incomplete runs fail). Evidence: `docs/difficulty-v3/evidence/MS07a/` |
| Issues & resolutions | IR53 deviation rulings: the impossible "4/6" case replaced by 7/6 and 3/2 (accepted); the old cadence for the registered finders (accepted); absent `workLimit` = 50,000 and `null`/`Infinity` = unbounded is within scope (R10's "50000 per new finder"; the evidence's "the task does not name a default" is inaccurate); the seam leaves `maxChainLength`/`maxNishioDepth` to the MS07b wrapper (accepted); empty `supplements` (accepted). IR52 (Minor): up to about 283 units can pass between budget checks on 9x9 while the engine comment and design 6.6 say 256 -> MS07b. IR54/IR55 (Info) -> MS07b's brief |
| Handoff | MS07b: explicit `workLimit` for each of the four IDs (SA2 ruling on the existing `forcingChain`/`nishio` limit), explicit min/max windows, own budget checks (a swallowed budget error reports `capHit: null`), supplements at the scoped `lawOfLeftovers` call site; IR52 strict gate or rewording; IR55 evidence notes. Items unchanged; S-AV08 690.2 s |
