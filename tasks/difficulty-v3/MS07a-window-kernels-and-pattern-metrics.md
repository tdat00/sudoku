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

For rare techniques, retain all existing 120/300 random states and minFirings=3. Add deterministic
real positive states to `opts.states` using H.assertSound's existing API, and assert the resulting
random-plus-supplement count. Do not lower minFirings, skip an ID or replace random inputs.
Use explicit fixture `after` arrays; historical LADDER is never extended.

### Anchors at `2c665bb`

| File:line / quote | Use |
|---|---|
| `core/js/engine/tech-chain.js:353-385`, `function buildChainFinding` | Parameterize ID/key |
| `core/js/engine/tech-chain.js:387-429`, `function findForcingChain` | Existing global minimum scan |
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
| MS07a-T04 | State immutability, cancellation, script/test lists and both quick sets pass |

## Test plan

Test a minimum 3-edge proof with requested min 5 => null, minimum 7 with [5,12] => Finding,
max 6 => null; two paths 4/6 => length 6. Nishio depth1 proof with [2,2] => null.
Test a shorter proof on a later root, ties, capped scan and supplementary/random counts.
Generator: `node tests\node-runner.js --suite=tech-chain,techniques,pattern-cost-tools,ui-contract,help`;
then both quick sets. Cost tool parser/render tests use fake results, not claimed gate evidence.

## Definition of done & handoff

Hand MS07b the inactive kernels and all later tasks the cost CLI/callback/fixture recipe. No registry
change, new ID or default cutoff is in force yet. No commit/log editing.

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
