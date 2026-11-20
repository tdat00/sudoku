# MS05c — Allowance instrumentation absorbed by MS05r3

| Header | Value |
|---|---|
| Depends on | No independent dispatch; MS05r3 follows MS05r2 on the active tree |
| Size / active time | Absorbed; see MS05r3 |
| Owner / milestone | Generator/tooling; M5c selectable diagnostic allowance |
| Authority | R5/R23; SA2-Q-S12; S-OD2 recovery |
| Status | Superseded as a dispatch and acceptance boundary |

## Current routing — binding S-OD2-S-OD4 amendment

[MS05r3](MS05r3-recovery-allowance-instrumentation.md) already delivered the instrumentation;
MS05r4 selected **256**, now active. Do not redispatch either step or restore Infinity.
Work conservation, refinement ordinals, cancellation and absolute-index shards remain.
r5p changes size-dependent default attempts, not this allowance or the six-cell R5 result.
b3 follows r5p/r5/r5m; r6a records five wires/fourteen analyses, r6b audits and r6c closes CI.

| Retained requirement | Current evidence owner |
|---|---|
| MS05c-B01/B02, T01/T02 | MS05r3 exact local allowance/counter semantics; no guessed default |
| MS05c-T03 | MS05r3 Infinity parity and owned/partial work conservation/transport |
| MS05c-T04 | MS05r3 override/reference/shard tests; MS05r6b complete final quick coverage |
| Original GR obligation | MS05r6a complete final-source wire/analysis, once after selection |

The old prerequisite, independent GR/whole-quick commands and acceptance wording below are
**archived**. Current r3/r6a/r6b files and checklist control. No checkpoint commit or overwritten
MS05b1 evidence; leave the Execution log for the orchestrator.

## Archived pre-S-OD2 specification

## Goal & business context

Measure the extra work of searching past a shallow band state without guessing a cap. Production
continues with no additional allowance limit until MS05d applies the approved measured selection.

## Scope

In: per-local-invocation accounting, runtime diagnostic setting, work transport, soak override/data
and absolute-index request shards (`--from`, `--total-count`).
Out: selecting a number, changed attempt caps, per-variant caps, targets or qualification.

## Repository rules

AGENTS/checklist; no Git/pack/log writes. Deterministic work counters, never elapsed-time stopping.
No new user setting or exchange field. All inherited cancellation still propagates.
MS05b3 owns the per-level manual-corpus refactor and early I5/CV3 run; do not fold that work into
these counters or reinterpret its retained availability failures as successful assertions.

## Inputs & context

R5, verbatim:

> Existing bounds remain `CAP_RATINGS=1024`, `CAP_PROPOSALS=32768`, `REFINE_RATINGS=64`,
> `UNIQUE_NODES=200000`, `OBJECTIVE_STEPS=100000`.
> The extra allowance counts full ratings inside one local-search invocation after its first valid
> in-band shallow candidate (including an initially shallow state); earlier layout/dig ratings do
> not consume it. Start counting once and do not reset when the path leaves the band.

Add runtime-read `SG.digger.SHALLOW_SEARCH_RATINGS`, default Infinity in this task. Soak accepts
`--shallow-cap=64|128|256|none`, off by default; `none` sets Infinity. No per-level variant tuning.

Extend the existing per-attempt `work` records, not a second counting system:

```text
work[] = {ratings, proposals, maxRatings, maxProposals, localSearches:[
  {ratings, proposals, firstShallowAt:null|integer, shallowRatings,
   shallowLimit:null|integer, capHit:null|'shallow'|'ratings'|'proposals'}
]}
```

`shallowLimit:null` encodes Infinity in JSON. An invocation entered in-band shallow has
`firstShallowAt = 0`. Count **every full rating inside the local invocation**, including its initial
above-band `refineDown`, in the same one-based local rating ordinal. If refinement produces the
first shallow candidate on its third rating, `firstShallowAt = 3`, not 0; that identifying rating
is not an additional rating *after* the state. The allowance starts at the first valid in-band
shallow candidate encountered, whether it comes from refinement or the proposal loop and whether
or not the local path chooses it. Charge subsequent non-memo full rating invocations only.
Memo visits still count proposals. The marker survives band exits. Check allowance before the next
full rating; exhaustion returns the existing best verified candidate. Each local invocation starts
fresh; earlier Killer layout ratings count only toward the enclosing attempt. Enter the local
collector before refinement and restore the prior collector in `finally`; keep it per attempt,
never a process-global counter that can leak between cooperative requests. Count an invoked rating
that throws, but not a call refused before invoking the rater. Do not allocate a second solve.

The first-exact stop of MS05b1 takes precedence: an exact current/keeper result terminates with no
new proposal/rating and no invented cap hit. Otherwise retain the actual stopping reason; if an
enclosing rating/proposal cap already ended the loop, do not report the same stop as an extra
shallow-cap hit. Refinement that remains off band still returns as MS05b1 specifies.

Pipeline result/toWire/fromWire carry owned plain `work` data internally. Soak records fullRatings
as sum(work.ratings), proposals likewise; shallowRatings as sum(localSearches.shallowRatings);
capHits is `{shallow,ratings,proposals}`. **Per-request conservation must hold**:

```text
fullRatings === sum(work[].ratings) === MS02 scoped SG.difficulty.rate wrapper count
sum(localSearches[].ratings) <= the enclosing attempt's ratings
```

The request wrapper covers generation only, not later reference/replay diagnostics. A discrepancy
fails acceptance; a genuine direct `SG.difficulty.rate` call outside `rateCounted` must be identified,
attributed per request and brought into the stated accounting rather than silently tolerated.
An older wire/cache entry without work keeps it unavailable; decoding must not manufacture a
zero-work measurement. Cover absent work as well as a detached nested localSearches round trip.
Keep times outside deterministic work data. No target property until MS06c.
On a generation failure, preserve a copied partial work record on the same error when possible;
rethrow its original identity/code, especially cancellation. Soak retains those counters and its
scoped full-rating count. A genuinely unavailable counter is null with a reason, never zero;
do not omit failed requests from work medians.
A null work value is not a passed conservation check; missing work evidence must be resolved
before MS05d can select a cap from that cell. Completed failure rows with known counters remain
in the comparison rather than being dropped.

Now derive requiredness from complete canonical returned ratings. Keep independent floor references
for request indexes 0 and n-1 (deduplicate for n=1), after uniqueness and outside generation timing.
Other rows say `referenceStatus:'not-selected'`, not reference failure. All requests still count;
reference errors never overwrite the derived certificate or count as a stuck-floor proof.

### Bounded soak shards (FS08)

Add `--from=<k>` (default 0) and `--total-count=<N>` for one explicitly selected variant/level
with `--count=<n>`. The shard executes absolute request indexes `k..k+n-1`; require integer
`k >= 0`, `n > 0`, `N >= k+n`. With `--from > 0`, `--total-count` is required. With no shard flags,
preserve the existing whole-cell/multi-cell behavior exactly. Reject combinations with
`--quick`, `--full`, `--per-combo` or multiple cells when shard flags are supplied.

Use the **absolute** index in the existing tag `variant:level:index`; keep the direct `base.fork(tag)`
and pipeline FNV `seedFor(tag)` routes. Never restart tags at zero in the second shard.
Record `from`, executed count and logical total in the JSON configuration; row indexes remain
absolute. Reference sampling uses logical indexes 0 and N-1, not each shard's endpoints.
The shard's own summary describes its actual outcomes, not a fictional complete logical cell.
The consumer merges rows by `(variant, level, absoluteIndex)` and requires exactly 0..N-1 once.
Compatibility ignores only the execution span (`from`, executed count); it still requires the
same logical total, variant/level, base seed, source/tool/Node identity and generation settings.
Do not merge shard medians: recompute work/time summaries from the complete raw rows.

Test a 12-request logical manifest as 0..5 plus 6..11 against the unsharded seed/tag plan, without
generating 24 real expensive puzzles in a quick test. A small scripted run proves full outcome
identity and only indexes 0/11 receive references. Gaps, duplicates and incompatible source/config
are errors for the evidence consumer. No new measurement or RNG policy is introduced.

### Anchors

Engine anchors are at `2c665bb`, found by their quoted names after MS05b1.
Soak anchors below are at `f788e02` (MS02 already moved them); MS05b2 adds the prefix check nearby.

| File:line / quote | Change |
|---|---|
| `generator/js/engine/digger.js:1017-1025`, `function newCaps` | Per-attempt collector |
| `generator/js/engine/digger.js:1320-1499`, `function* localSearchSteps` | Local allowance |
| `generator/js/engine/digger.js:1756-1760`, `work: work.map` | Existing work output |
| `generator/js/engine/pipeline.js:291-333`, `function toWire` | Preserve internal work |
| `generator/tests/soak.js:104-105`, `opts.weights`, `opts.bands` | Existing diagnostic override parsing |
| `:260`, `function seedFor(tag)`; `:267-283`, `function generateOne` | Preserve both routes and absolute tags |
| `:353`, `const t0 = process.hrtime.bigint()` | Generation timing boundary |
| `:586`, `const ok = failed === 0` | No suppressed invariant failure |

## Files to create/modify

- `generator/js/engine/digger.js`, `pipeline.js`; `generator/tests/soak.js`.
- Existing digger/pipeline/difficulty-diagnostics quick suites and diagnostic helper;
  `generator/tests/suites/worker.test.js` and `cache.test.js` for owned work round trips.
- Affected E GR fixtures, `generator/design.md` 6.8/15.3/15.4 and both developer guides.

## Implementation steps

1. Add local counters/guard while leaving the default Infinity.
2. Handle initial/first-observed shallow, refinement ordinals, memo reuse, band exit and independent invocations.
3. Preserve existing work values, add wire transport, expose the bounded diagnostic override.
4. Populate soak data, reference endpoints and absolute-index shards; require per-request counter conservation.
5. Test scripted counts and unchanged Infinity outputs; document the new fields.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS05c-B01 | The next task can compare real benefit and cost on identical requests |
| MS05c-B02 | No guessed cap or hidden restriction on structure search is activated |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS05c-T01 | 64 permits exactly 64 additional full ratings; memo hits do not consume them |
| MS05c-T02 | Start-once, refinement/initial ordinals, band exits and enclosing caps are exact |
| MS05c-T03 | Infinity preserves prior output; owned work survives worker/cache round trips; per-request full-rating counts agree |
| MS05c-T04 | Override validation, reference sampling/errors, absolute-index shards and both quick sets pass |

## Test plan

Script 3 earlier attempt ratings, first shallow at local ordinal 2, then 64 new full ratings: the extra
allowance starts at 2, not generation ordinal 5; the next full call is refused. Include memo-only
visits, cancellation, two invocations, and an initially shallow state with zero additional allowance
in a direct unit test (CLI selection remains the four approved values). Add refinement that becomes
shallow on its third rating: the local total includes all three, firstShallowAt is 3, then exactly
64 subsequent full calls are allowed. A throwing invoked call is counted and keeps its original
error identity. A still-above refinement creates no proposal tail. Assert request conservation,
with zero double-counting between local totals and the attempt total.

Generator: `node tests\node-runner.js --suite=digger,pipeline,difficulty-diagnostics,difficulty-floor,worker,cache`.
Both quick sets. GR uses complete E with MS05c:

```powershell
node tests\replay-fixtures.js --ids=G09 --record=..\docs\difficulty-v3\evidence\MS05c\wire\G09.json
# Complete, inspect, write and check the wire envelope first; then record all analysis IDs.
node tests\replay-goldens.js --ids=G01 --record=..\docs\difficulty-v3\evidence\MS05c\analysis\G01.json
```

Jobs=1, no --jobs; 1-120 seconds/request, 5-35 minutes total estimate. **Announce to the orchestrator
before starting (pentomino runs in parallel on the same machine).** Use the checklist lock wrapper
for every command expected over 10 seconds; 540-second process ceiling. No selection sweep yet.

## Definition of done & handoff

Give MS05d the exact counter semantics, Infinity default, four override values and shard CLI. Report wire
changes, zero behavior changes with Infinity and all B/T evidence; no commit/log edit.

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
