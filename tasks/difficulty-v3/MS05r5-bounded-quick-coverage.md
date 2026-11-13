# MS05r5 — Prepare complete, bounded quick-test coverage

| Header | Value |
|---|---|
| Depends on | MS05r5p step evidence; retained r4 selection/triage; S-OD3 and S-OD4 contracts |
| Size / active time | Medium; 40-60 minutes |
| Machine time | Approximately 1-5 minutes of registration/scripted/runner checks |
| Acceptance | Step evidence complete only; no commit or claim that the full quick set passed |
| Authority / review | S-OD2 recommendation 6, S-OD3/S-OD4; analyst cross-review |
| Status | Not started |

## Goal & business context

Prove that disjoint, bounded runs cover the **whole** Generator and Player quick sets. The
interim Generator chunks already took 714 s before steps/replay/player; splitting a command
does not make the suite faster or forgive a failed request. A reproducible inventory and
machine-readable results prevent a convenient set of passing filters from replacing coverage.

r4's original mega failures are retained history, not an unmet dispatch prerequisite. r5p has
installed the size default; r5m next owns the approved mega quick/deep replacement. This step
inventories the current tree without executing the expensive callbacks or changing their tiers.

## Scope

In: non-executing test inventory, optional exact-name selection/results, focused harness/runner
tests and a draft coverage manifest. Out: application changes, new time allowances, test moves,
deleted/skipped assertions, G13 persistence, changed fixture requests or mega fallback assertions.

## Repository rules

AGENTS/checklist; no Git/ref/pack/log edits. Built-in Node modules; no dependency or production
module. Preserve ordinary CLI output/selection/exit behavior. All timing work is serial, announced,
locked through `Invoke-Dv3Node`, <=540 s. Do not execute expensive quick cases at this step.

## Inputs & context

### Narrow harness/runner additions

Add these optional Node runner flags to **both** apps:

```text
--list-tests=<project-relative.json>  load/register selected suites, write inventory, run no test
--exact=<full name>                  exact case-sensitive full-name selection, not a substring
--results=<project-relative.json>    write the actual result rows after a completed run
```

`--exact` and `--filter` are mutually exclusive. Listing and results-writing are mutually
exclusive. Existing `--filter` remains case-insensitive substring matching, including manual
selectors; no change to default quick/manual/--suite behavior. A missing/empty/invalid path,
unknown option/suite or zero selection is nonzero. No new `--all`/`--manual` run is authorized.
Use project-relative paths; refuse evidence overwrite and writes outside the repository.

Extend `SG.test` with a read-only `list(options)` using the same ordered walk/selection as
`run(options)`. Rows have `{suite, ordinal, fullName, kind, skipped, timeoutMs}`.
`ordinal` is the zero-based leaf index **within the file suite before filtering**; preserve it
in result rows too. It distinguishes duplicate names and is stable when selecting suites in
a different command order. `list` executes no hook, test or benchmark body.
An inherited `describe.skip` is visible; a runtime skip cannot be predicted and remains a
result. Preserve registration/load errors explicitly; a listing with either cannot be used as
a valid inventory. Do not quietly omit a describe block that threw.

**Existing registration setup remains:** `full-grid.test.js:44-46` precomputes 1,000 grids;
`digger.test.js`'s “200 classic9 puzzles” describe builds that corpus; shared `solver.test.js`
builds the 200-case/20-grid stillUnique workloads; `pipeline.test.js:202-212` finds its two
VeryEasy single-sample seeds. The Node runner still performs that unchanged setup, just as
today; do not mock it, skip a file or move it into a test to make a “zero generation” claim.
Listing means no **test/hook/benchmark execution**, not zero registration-time generation.
Report/plan its load time and keep the lock/process ceiling. It is not quick-test acceptance.
The inventory unit tests distinguish registration setup from the read-only `SG.test.list` call.

Exact selection chooses all rows whose full name is equal; callers verify the expected
multiset. It does not rename existing tests or silently choose the first duplicate. Every
existing no-options run still executes the same callbacks in the same order with the same hooks.

### Evidence shape

Inventory:

```text
{schema:1, app, node, sourceHash, files:[{path,hash}], timeFactor, selection, registrationMs,
 complete:true, tests:[{suite,ordinal,fullName,kind,skipped,timeoutMs}], registrationErrors:[]}
```

Results:

```text
{schema:1, app, node, sourceHash, timeFactor, selection, complete, wallMs,
 results:{total,passed,failed,skipped,bailed,tests:[...existing fields,ordinal],...}}
```

Fingerprint the runner, shared harness, loaded application/fixture files, **all discovered
quick suite files**, HTML/source-list inputs (`index.html`, `tests.html`, Player `help.html`,
Generator worker entry), `AGENTS.md` and guides/design files read by quick tests, using one stable path order.
Include Generator's manual files for manual inventories/results. The quick fingerprint must
not shrink to just a selected shard: all same-app quick shards on a frozen tree share it.
Return the actual hashed file list; do not hash output/artifact/evidence directories or the
task pack or the data-only `docs/difficulty-v3/recovery-quick-cost.md` report. The latter is
filled from final evidence; no quick assertion depends on its measured numeric contents.
Its linked path will exist before final link checks. This identity is separate from GG/GR.

Write results on ordinary test failure as well as success; preserve exit 1. Registration
failures, bail, a killed process or incomplete execution cannot produce a complete passing
coverage row. No result file after a killed process is evidence of no result, not a pass.
Use the existing built-in Node filesystem/crypto patterns and atomic project-relative writes.
Do not redesign the test harness or introduce an external test runner.

### Draft shard manifest

Create `docs/difficulty-v3/evidence/MS05r5/quick-manifest.json`, one section per app:

```text
inventoryPath, inventoryHash, sourceHash, node, timeFactor,
shards:[{id,app,args,expectedTestKeys,projectionSeconds,projectionBasis,resultPath}],
coverage:{missing:[],duplicates:[],unexpected:[]}, status:'planned'
test key = app + suite + ordinal (also retain fullName for review)
```

Choose whole file suites where projected <=450 s; otherwise group at a describe boundary or
use `--exact` for individual tests. Preflight each selection with `--list-tests`; its rows,
not the spelling of a filter, define coverage. The disjoint union must equal the no-options
quick inventory, including benchmarks and the existing explicit skips. Source/selection
counts must match; never omit a slow test, count a listed row as executed or sum only successes.

Initially isolate `pipeline`, `mega`, `steps`, `replay` and Generator's `player` suite. Player
**app** quick tests are separate from that Generator suite. Shared core suites must run once
in each app environment. Do not combine cached costs from several fresh processes: a split
may regenerate G13 and other cases, so record the actual cache boundary in each projection.

Keep related assertions together where their unchanged cache and <=450 s projection allow.
If one original test callback cannot fit, report it as a named numerical item; do not split its
internal loop, reduce seeds or change a guard here. The approved Nightmare decomposition belongs
to r5m, and G13 persistence to r6a; neither is forbidden by the resumed decisions.
The selected cap is a changed source, not a proof that a former timing is a current bound.

The draft is refreshed after r5m's approved replacements, MS05b3's `manual-corpus` tests, r6a's pin updates
and r6b's standing instruction corrections. r6b owns the **final** inventory, reconciliation and passing
results; a planned manifest at this step is not full-quick acceptance.

## Files to create/modify (exclusive ownership)

- `core/tests/harness.js`, existing `core/tests/suites/harness.test.js`.
- `generator/tests/node-runner.js`, `player/tests/node-runner.js`.
- If factoring is useful, one Node-only `core/tests/node-evidence.js` with injected paths;
  it knows neither application and is not an application script-list entry.
- Existing harness tests or a small shared runner-contract suite; add a new shared suite to
  both apps' `tests.html` only if introduced. Do not edit unrelated test bodies.
- Both developer guides and Generator/Player design testing sections, v3 notes/evidence/MS05r5.
- No engine, request manifest, manual cache, generated fixture, test guard or time-factor edit.

## Implementation steps

1. Add list/exact/result contracts without executing registered callbacks to discover them.
2. Test nested scopes, filtering, ordinals, skips, load errors and successful/failing reporters.
3. Inventory both default quick sets; plan the disjoint <=450 s-projected shards.
4. Preflight each planned selector without running tests; retain existing registration setup
   and record gaps/overlaps as errors.
5. Hand the tooling/draft to r5m, then b3/r6a/r6b/r6c. No full quick, golden/hash gate or G13 run here.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS05r5-B01 | Full quick means every current quick assertion in each app; r5m explicitly maps moved Nightmare coverage |
| MS05r5-B02 | Bounded execution does not weaken request, runtime, skip or fallback contracts |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS05r5-T01 | Listing executes no callbacks/hooks/benchmarks and retains registration errors/skips |
| MS05r5-T02 | Existing substring behavior is unchanged; exact selection and stable per-file ordinals work |
| MS05r5-T03 | Result exits/completeness/source identities are truthful, including failure/bail/zero selection |
| MS05r5-T04 | Both app inventories and the draft have no missing/duplicate/unexpected test keys |

## Test plan and commands

Use the existing isolated-harness tests. Check Easy/Very Easy substring behavior is unchanged,
exact selects one intended full name, duplicate names retain separate ordinals, filtering does
not renumber rows, repeated list calls execute nothing, hooks still run in original order,
load/describe failures remain visible, and benches/skip inheritance are retained.
Test serialization/path rejection/exit handling with tiny scripted suites, not a costly child
quick run inside another quick test. Exercise each runner's options using a bounded real suite.

From Generator, then Player (define/dot-source the checklist helper in each shell invocation):

```powershell
Invoke-Dv3Node -Task MS05r5 -NodeArgs @('tests\node-runner.js','--suite=harness,ui-contract,help','--results=..\docs\difficulty-v3\evidence\MS05r5\generator-tooling.json')
Invoke-Dv3Node -Task MS05r5 -NodeArgs @('tests\node-runner.js','--list-tests=..\docs\difficulty-v3\evidence\MS05r5\generator-inventory.json')
Invoke-Dv3Node -Task MS05r5 -NodeArgs @('tests\node-runner.js','--suite=mega','--filter=> mega puzzles > mega12 nightmare:','--list-tests=..\docs\difficulty-v3\evidence\MS05r5\mega12-nightmare-selection.json')
```

```powershell
Set-Location ..\player
Invoke-Dv3Node -Task MS05r5 -NodeArgs @('tests\node-runner.js','--suite=harness,ui-contract,help','--results=..\docs\difficulty-v3\evidence\MS05r5\player-tooling.json')
Invoke-Dv3Node -Task MS05r5 -NodeArgs @('tests\node-runner.js','--list-tests=..\docs\difficulty-v3\evidence\MS05r5\player-inventory.json')
```

Preflight every other manifest selector the same way, with a unique output path. `--exact`
takes the copied inventory full name, not a hand-abbreviated title. Include any new runner-contract
suite in the focused check. Allow seconds to about 60 s per tooling command, 1-5 minutes total;
all use the shared-machine slot if possibly >10 s and all finish <=540 s. No SG_TIME_FACTOR,
CI or SG_DEEP changes to make acceptance easier.

## Stop rules

Stop/report correctness defects: executed test/hook/benchmark bodies during listing, changed callback
semantics, hidden registration errors or corrupt/overlapping coverage. Under S-OD4 a single costly
callback is a named availability/cost item, not an owner stop; keep its planned membership and continue
the tooling. Route its numbers to r5m where already authorized, otherwise MS07e and MS18c/MS18d.
Do not invent another evidence class/tooling task or edit a test merely to avoid its timing failure.

## Definition of done & handoff

Return the additive tooling diff, focused results, both inventories and the planned shard
table with conservative projections and the inherited/new S-OD4 item list. **Step evidence complete**;
MS05r5m follows on the same candidate, then b3/r6a/r6b. r6c uses the final manifest for CI inside
the combined commit. No independent commit or backup/ref action.

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
