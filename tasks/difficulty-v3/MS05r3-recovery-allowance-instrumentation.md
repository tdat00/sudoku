# MS05r3 — Instrument the active shallow-search allowance

| Header | Value |
|---|---|
| Depends on | MS05r2 step evidence complete; same requiredness-active uncommitted tree |
| Size / active time | Medium; 45-60 minutes |
| Machine time | Approximately 2-10 minutes of focused/scripted checks |
| Acceptance | Step evidence complete only; no branch acceptance or commit |
| Authority | S-OD2; absorbed MS05c; R5/R23 and SA2-Q-S12 |
| Status | Not started |

## Goal & business context

Make the approved four-setting experiment measurable on the active path. Keep Infinity as the
normal default until the measured selection. No unmeasured 64/128/256 default is introduced.

## Scope

In: per-local work/allowance, internal work transport, soak override/absolute-index shards and
counter/reference diagnostics. Out: selecting a value, changing any existing bound, production
timing decisions, targets, qualification or fixture refresh.

## Repository rules

AGENTS/checklist; no Git/ref/pack/log edits; classic IIFEs and existing Node tools, both guide
languages, CRLF/no BOM/final newline.

Do not require a green whole quick set or GR at this intermediate step. MS05r6a owns final E
and coupled pins; MS05r6b owns full quick/GD and the sole acceptance. New focused regressions
must pass; known unrun stale-pin/budget failures
remain explicitly outstanding. Lock all possibly >10-second commands; jobs 1/no `--jobs`.

## Inputs & context

R5 contract:

```text
CAP_RATINGS=1024, CAP_PROPOSALS=32768, REFINE_RATINGS=64,
UNIQUE_NODES=200000, OBJECTIVE_STEPS=100000 remain unchanged.
SG.digger.SHALLOW_SEARCH_RATINGS is read at runtime; default Infinity here.
Soak --shallow-cap=64|128|256|none; absent means the normal default, none means Infinity.
```

One common local allowance, not a cap on earlier layout/dig/sample work or the number of attempts.

```text
work[] = {ratings, proposals, maxRatings, maxProposals, localSearches:[
  {ratings, proposals, firstShallowAt:null|integer, shallowRatings,
   shallowLimit:null|integer, capHit:null|'shallow'|'ratings'|'proposals'}
]}
```

`shallowLimit:null` represents Infinity. Enter the local collector **before** its initial
above-band refinement; restore it in `finally`, per attempt/context, never a process-global
mutable collector. Count every invoked full rating inside that local invocation, including
refinement and a rating that throws, but not a call refused before invoking the rater.

An initially in-band shallow state has `firstShallowAt=0`. Otherwise record the one-based local
rating ordinal that first produces a valid in-band shallow candidate, even if the path rejects
it. Refinement becoming shallow on its third rating gives 3, not 0. That identifying rating is
not additional work *after* the state. Start once; never reset after a band exit.
Memo visits count proposals, not new ratings. Check the allowance before the next new full
rating; exhaustion returns the existing best verified candidate. No extra solve.

The existing first-exact stop has priority: current/keeper exact means no further proposal/
rating and no fabricated cap hit. Preserve the actual enclosing cap reason if it already stopped
the loop. Refinement still above band returns without a proposal tail, as the MS05b1 tree does.

### Transport, failed work and conservation

Pipeline result/toWire/fromWire carry owned plain work data internally. Soak records sums of
attempt ratings/proposals, local shallow ratings, and cap hits `{shallow,ratings,proposals}`.
Its `generateOne` returns work on **both** direct and pipeline routes, not just from the worker.
For each generation request:

```text
fullRatings === sum(work[].ratings) === scoped SG.difficulty.rate wrapper count
sum(localSearches[].ratings) <= enclosing attempt ratings
```

The wrapper excludes subsequent uniqueness/reference/replay diagnostics. A discrepancy fails
the step; identify and account for a real direct call outside `rateCounted`, never silently
tolerate it. Old wire/cache data without work remains unavailable (null/reason), not zero.
Deep-copy nested arrays across worker/cache round trips; no timings inside deterministic work.
Update intentional **exact-key** result/wire assertions for the new internal `work` field,
including `pipeline.test.js`'s “has exactly the fields of the contract” under PuzzleResult
(baseline lines 869-873). Also update the exact nested work literal in **MS05b1-T03: an exact
keeper ends the sampling and the attempt** (baseline line 2148): keep all four existing numeric
fields and require `localSearches: []`, since that path performs no local search. Keep the
structural equality; do not replace it with partial matching or remove the check.
Do not defer either known schema change as an unexplained final failure.
No new exchange/export field or end-user option is introduced.

On failure attach/capture copied partial work where possible, preserving the original error
identity/code and cancellation. Soak keeps known error-work counts and the independent wrapper
count. Missing work is not a zero or a passed conservation check; it blocks a work-based selection
until resolved. Retain all requests/errors in denominators. Extend the MS05r1 driver only as
needed to copy the richer work shape; its transparent profile protocol/requests stay unchanged.

**FS33 forward handoff; MS05r1 is frozen.** Its “immutable driver/profile” wording protects the
recorded profile evidence and established profile protocol. This later, explicitly assigned
handoff permits **MS05r3 alone** to extend the driver/helper/tests to copy `localSearches` and
the richer owned work, and to use the now-available diagnostic allowance API. Preserve all old
fields, request/seed identities, stage classification, timing/budget boundaries and delegation.
Record the old/new driver hashes; never overwrite/relabel r1's profile files. No r1 task edit,
developer addendum, changed request or repeated baseline profile is required.

Derived requiredness uses the complete canonical returned rating and actual model. Independent
reference checks remain after uniqueness and outside generation timing, at logical request indexes
0 and N-1 (deduplicate N=1); other rows say not-selected. Reference failure is not a floor-stuck proof.
For new ledgers keep `generationExact` as the strict producer flag (R5's hit column), populate
`required`/`qualifiedHit`/`shallow` from the derived certificate on every returned canonical
rating, and keep sampled `referenceRequired`/`referenceStatus`/`referenceError` separately.
An error/not-selected reference must not erase the derived verdict or make a hit false.
Require producer/derived exactness agreement on valid current results; disagreement is an
invariant failure. Mark new metadata `acceptance:'canonical-required-tier'`; do not reinterpret
or rewrite MS02's old reference-based rows. Update current summaries so 10 unselected references
do not masquerade as 10 unmeasured derived verdicts.

### Bounded soak shards

Add `--from=<k>` (default 0) and `--total-count=<N>` with `--count=<n>` for exactly one selected
variant/level. Require integers k>=0, n>0, N>=k+n; from>0 requires total-count. Reject shard flags
with quick/full/per-combo/multiple cells. With no shard flags preserve existing whole-cell behavior.

Tags remain `variant:level:absoluteIndex`, with unchanged direct `base.fork(tag)` and pipeline
FNV `seedFor(tag)` routes. Record from/executed count/logical total and absolute indexes. Reference
endpoints are 0 and N-1, not each shard's ends. Each file describes only its executed span.
The R5 consumer merges raw rows by `(variant,level,index)`, requiring exactly 0..N-1 once with
same source/tool/Node/settings/seed/logical total; ignore only the span when comparing compatibility.
Recompute medians from rows, never merge shard medians.

### Quick assertion ownership before selection (FS29 part 1)

This task owns both schema updates above and tests whose purpose requires **no additional
shallow allowance**, including implicit premises. In `pipeline.test.js`, **MS05b1-T02: removing
a sign starts a new memo** (baseline lines 1981-2008) uses `maxProposals: 400` to reach a sign
change; a finite allowance can otherwise end that setup first. Scope Infinity for that test
with a named helper/`try/finally`, restoring the previous setting after the operation finishes.
Keep its original seed, 400-proposal limit, uniqueness checks and every memo assertion.

Review the owned suites for the same premise. Do not blanket-force Infinity around MS05b1
or ordinary generation: first-exact, normal-default and allowance tests must still exercise
their intended setting. Never override G13/mega's closure requests. A changed schema or
fixture premise may be repaired here; a failed validity, exactness, cancellation, cap invariant
or performance contract is not permission to weaken an assertion.

Write `evidence/MS05r3/quick-contracts.json` with each changed file/full test name, kind
(`schema` or `no-extra-allowance-premise`), before/after expectation or scoped setting,
preserved behavioral requirement, rationale and focused result. Run **all `MS05b1-` pipeline
cases**, not only the new allowance block. r4 repeats them with its selected default.
If r4 later exposes another such premise, it returns here for an assigned test-only fix;
actual instrumentation/source changes require replacement of affected measurement evidence.

### Anchors (find quotes after preceding edits)

| File:line in MS05b1 tree at `f788e02` | Duty |
|---|---|
| `generator/js/engine/digger.js:994`, `function rateCounted`; `:1021`, `function newCaps` | Enclosing counters/collector |
| `:1335`, `function* localSearchSteps`; `:1825`, `work: work.map` | Local accounting/output |
| `generator/js/engine/pipeline.js:237-248`, result; `function toWire` / `function fromWire` | Internal work transport |
| `generator/tests/soak.js:260`, `function seedFor`; `:267`, `function generateOne`; `:353`, `const t0` | Stable request/timing boundaries |

## Files to create/modify (exclusive ownership)

- `generator/js/engine/digger.js`, `pipeline.js`; `generator/tests/soak.js`, diagnostic helper/suite.
- Existing digger/pipeline/worker/cache/floor/diagnostic suites, including the two named
  pipeline work literals and the no-extra-allowance premises above; `tests/difficulty-recovery.js` and its pure
  helper/suite only for richer copied work. No selection, new profile requests or artifact overwrite.
- Generator design 6.8/13.9/15.3/15.4 and its internal-wire contract, both developer guides,
  v3 notes/evidence/MS05r3.
- No hash/golden refresh here. Finish engine formatting/comments before MS05r4 measures.

## Implementation steps

1. Add the runtime-read allowance/collector at Infinity; retain every existing cap/stop.
2. Implement ordinals, refinement, memo/band-exit behavior and failure work conservation.
3. Carry owned work through worker/cache and populate soak's authoritative diagnostics.
4. Add validated absolute-index shards and reference endpoints.
5. Prepare existing tests whose purpose explicitly or implicitly assumes *no additional allowance*
   to scope Infinity in `try/finally`, recording the precise premise, so r4's finite default
   does not invalidate that setup. Include the named sign-memo case. Do not globally
   force Infinity in ordinary generation tests, and never override G13/mega closure requests.
6. Pass the widened focused tests and publish the quick-contract manifest. Finish source/docs/
   formatting; final-source GR/whole quick waits for r6a/r6b, not these known test repairs.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS05r3-B01 | The selected cap will be based on actual active-path benefit/work, not an inactive baseline |
| MS05r3-B02 | No guessed default, variant-specific shortcut or hidden restriction on earlier search |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS05r3-T01 | Exact allowance counting, first-exact priority, refinement ordinals/memos/band exits and caps tested |
| MS05r3-T02 | Per-request conservation, partial errors and owned worker/cache work round trips pass |
| MS05r3-T03 | Infinity preserves generated outputs; seeded shard plans/reference endpoints match unsharded runs |
| MS05r3-T04 | Focused checks pass; only the declared final-source gates remain deferred |
| MS05r3-T05 | Full/inner work shapes and explicit/implicit no-allowance premises are owned, preserved and covered by the MS05b1 pipeline selection |

## Test plan and commands

Script 3 earlier attempt ratings, first local shallow at ordinal 2, then 64 new full ratings:
refuse the next call, not the identifying call. Include initial shallow/zero test-only allowance,
refinement first shallow at 3, memo-only proposals, band exit, two invocations, throwing rating,
parent cancellation, still-above refinement and an exact keeper found before exhaustion.
Use explicit Infinity for the old-cap-only premise; production CLI still has only four settings.

Test a 12-row manifest as 0..5 plus 6..11 with a scripted producer: identical tags/outcomes,
references only 0/11, duplicates/gaps/incompatible settings rejected. A tiny real model verifies
Infinity parity, not a large 24-request performance run. Register any new focused block under
`recovery: shallow allowance` so it can be selected independently of the 295 s pipeline suite.
For diagnostics, an in-band derived-required/exact row remains a qualified hit when its
independent reference is unselected or fails; retain that reference outcome separately.
Also test producer/derived disagreement as an invariant error, not another kind of miss.

From Generator:

```powershell
Invoke-Dv3Node -Task MS05r3 -NodeArgs @('tests\node-runner.js','--suite=digger,difficulty-diagnostics,difficulty-floor,worker,cache,recovery-profile')
Invoke-Dv3Node -Task MS05r3 -NodeArgs @('tests\node-runner.js','--suite=pipeline','--filter=recovery: shallow allowance','--verbose')
Invoke-Dv3Node -Task MS05r3 -NodeArgs @('tests\node-runner.js','--suite=pipeline','--filter=> pipeline: the PuzzleResult (design.md 13.9) > has exactly the fields of the contract','--verbose')
Invoke-Dv3Node -Task MS05r3 -NodeArgs @('tests\node-runner.js','--suite=pipeline','--filter=MS05b1-','--verbose')
```

Each selector must run its intended nonzero cases. Expect seconds to a few minutes per command,
2-10 minutes total machine time; announce/lock as required, all commands <=540 s. No GS selection,
GG/GR, manual generated corpus or full quick yet.

## Stop rules

Stop on unexplained output/counter drift, missing required work, broken seeds/references,
cancel/error swallowing or failed focused checks. Do not invent a finite default or make an
incomplete diagnostic count as zero. Existing unrun acceptance gates are still outstanding.

## Definition of done & handoff

Hand MS05r4 the Infinity default, four settings, exact counter/shard schema, all focused results,
quick-contract manifest and stable engine/driver identities. Only the profile evidence/protocol
remain immutable across the authorized driver extension. **Step evidence complete**, not branch
acceptance; no commit.

## Execution log

| Field | Value |
|---|---|
| Status | Step evidence complete (S-OD2: no acceptance and no commit of its own; the combined acceptance and the one commit come after MS05r6b) |
| Start | 2026-11-13 10:34 (+07:00) |
| End | 2026-11-13 11:42 developer; 11:45 orchestrator review |
| Duration | 68 min developer; about 3 min review (with the orchestrator's 92 s focused run) |
| Model | claude-sonnet-5.5 (developer); orchestrator review claude-opus-5.5 |
| Token usage | 282 model calls; 73,694,843 input tokens (72,727,275 cache reads); 347,628 output tokens |
| AI credits | about 1,317 (developer) |
| Verification | Developer, every run through `Invoke-Dv3Node -Task MS05r3` (lock wait 0): `--suite=digger,difficulty-diagnostics,difficulty-floor,worker,cache,recovery-profile` 463/463 (91.9 s, again 92.3 s at the end); `--suite=pipeline --filter=recovery: shallow allowance` 16/16; the PuzzleResult field-contract test 1/1; `--filter=MS05b1-` 30/30; `--suite=help` 30/30; soak identity check (`sourceHash`/`toolHash` equal the ledgers); mega12 Nightmare parity (`puzzleHash` equals MS05r1's, 635 ratings, proposals cap); five soak ledgers (whole cell, shards 0-5 and 6-11, the same at cap 64): `mergeShards` accepts valid pairs and rejects mixed settings, a gap and a duplicate. Orchestrator re-run under the sudoku lock: the six-suite selector 463/463 (91.9 s), the three pipeline filters 16/16, 30/30, 1/1; `SHALLOW_SEARCH_DEFAULT = Infinity` at `digger.js:653` |
| Acceptance | MS05r3-B01, B02 and T01..T05 met as step evidence. The allowance is one setting, `SG.digger.SHALLOW_SEARCH_RATINGS` (default literal `Infinity`, read when each local search starts, `Infinity` or an integer >= 0, otherwise `digger.invalidOption`): after the first shallow rating of a local search (`firstShallowAt`), at most that many further full ratings (`shallowRatings`), then `capHit: 'shallow'`. `PuzzleResult.work` and `work[].localSearches[]` carry `firstShallowAt`, `shallowRatings`, `shallowLimit`, `capHit`, conserved in every soak row, across the worker wire and the cache. The soak takes `--shallow-cap=64|128|256|none` and shards (`--from`, `--count`, `--total-count`), `mergeShards` checks ledger identity (source, tool, node, seed base, setting). `quick-contracts.json`: 8 owned contract changes (7 schema, 1 premise). No value is chosen here; nothing is special-cased per variant |
| Issues & resolutions | (1) `mergeShards`/`shardIdentityOf` and `meta.toolHash` are the developer's reading of "duplicates/gaps/incompatible settings rejected" (not named by the task); accepted. (2) The sign-memo premise (MS05b1-T02) fails only at allowance 0, not at 64-256; its scope stays `Infinity` as the task requires. (3) The premise audit (not an acceptance command) preloaded the setting in the main realm only: 3 cross-realm `gen.worker.js` failures are artifacts, and the audit process then hung to the 540 s limit; recorded as a timeout. (4) The helper inherits stdout, so results are recorded from the console, not log files. (5) The recovery CLI's diagnostic mode is enabled but not run (r4's). (6) The developer removed a default-pinning assertion from its own new pipeline test, so r4 can change the literal without a test edit. (7) The developer's line counts include the earlier tasks' uncommitted work |
| Handoff | MS05r4: the only production edit for a selected value is the literal `SHALLOW_SEARCH_DEFAULT` at `digger.js:653`; the soak sets the value with `--shallow-cap=64|128|256|none` after the sources load (`none` = `Infinity`); shards with `--from=k --count=n --total-count=N` for one variant and level, tags `variant:level:absoluteIndex`, references at 0 and N-1; read `meta.shallowCap`, `meta.shallowSearchRatings` (null = `Infinity`), and per row `work[].localSearches[].shallowLimit`/`capHit`; merge with `SG.fixtures.difficultyDiagnostics.mergeShards(ledgers)` and compute from its `rows` (`row.generationExact` for the hit, `row.fullRatings` for the upper median at `floor(12/2)`, `row.workCheck.status` must be `'ok'`; also `row.outcome`, `ledger.complete`, `summary.checks.result`); the recovery CLI `--mode=diagnostic --shallow-cap=...` sets and restores the value with 8 attempts; after the literal changes, repeat `--filter=MS05b1-` (a test that needs the old caps alone returns to r3 as a test-only fix) |
