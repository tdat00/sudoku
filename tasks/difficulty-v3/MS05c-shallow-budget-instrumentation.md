# MS05c — Measurable shallow-search allowance

| Header | Value |
|---|---|
| Depends on | MS05b accepted |
| Size / active time | Medium; 45-60 minutes plus GR |
| Owner / milestone | Generator/tooling; M5c selectable diagnostic allowance |
| Authority | R5/R23; SA2-Q-S12 |
| Status | Not started |

## Goal & business context

Measure the extra work of searching past a shallow band state without guessing a cap. Production
continues with no additional allowance limit until MS05d applies the approved measured selection.

## Scope

In: per-local-invocation accounting, runtime diagnostic setting, work transport, soak override/data.
Out: selecting a number, changed attempt caps, per-variant caps, targets or qualification.

## Repository rules

AGENTS/checklist; no Git/pack/log writes. Deterministic work counters, never elapsed-time stopping.
No new user setting or exchange field. All inherited cancellation still propagates.

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

`shallowLimit:null` encodes Infinity in JSON. Initially shallow => firstShallowAt=0. Otherwise mark
the current local rating ordinal when the first shallow candidate is observed; that identifying
rating is not an additional rating *after* the state. Charge subsequent non-memo full ratings only.
Memo visits still count proposals. The marker survives band exits. Check allowance before the next
full rating; exhaustion returns the existing best verified candidate. Each local invocation starts
fresh; earlier Killer layout ratings count only toward the enclosing attempt.

Pipeline result/toWire/fromWire carry owned plain `work` data internally. Soak records fullRatings
as sum(work.ratings), proposals likewise; shallowRatings as sum(localSearches.shallowRatings);
capHits is `{shallow,ratings,proposals}`. Compare fullRatings with MS02's scoped wrapper.
Keep times outside deterministic work data. No target property until MS06c.
On a generation failure, preserve a copied partial work record on the same error when possible;
rethrow its original identity/code, especially cancellation. Soak retains those counters and its
scoped full-rating count. A genuinely unavailable counter is null with a reason, never zero;
do not omit failed requests from work medians.

Now derive requiredness from complete canonical returned ratings. Keep independent floor references
for request indexes 0 and n-1 (deduplicate for n=1), after uniqueness and outside generation timing.
Other rows say `referenceStatus:'not-selected'`, not reference failure. All requests still count;
reference errors never overwrite the derived certificate or count as a stuck-floor proof.

### Anchors at `2c665bb`

| File:line / quote | Change |
|---|---|
| `generator/js/engine/digger.js:1017-1025`, `function newCaps` | Per-attempt collector |
| `generator/js/engine/digger.js:1320-1499`, `function* localSearchSteps` | Local allowance |
| `generator/js/engine/digger.js:1756-1760`, `work: work.map` | Existing work output |
| `generator/js/engine/pipeline.js:291-333`, `function toWire` | Preserve internal work |
| `generator/tests/soak.js:87-88` | Diagnostic override parsing |

## Files to create/modify

- `generator/js/engine/digger.js`, `pipeline.js`; `generator/tests/soak.js`.
- Existing digger/pipeline/difficulty-diagnostics quick suites and diagnostic helper.
- Affected E GR fixtures, `generator/design.md` 6.8/15.3/15.4 and both developer guides.

## Implementation steps

1. Add local counters/guard while leaving the default Infinity.
2. Handle initial/first-observed shallow, memo reuse, band exit and independent invocations.
3. Preserve existing work values, add wire transport, expose the bounded diagnostic override.
4. Populate soak data and bounded reference sample; keep production timing and denominators intact.
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
| MS05c-T02 | Start-once, initially shallow, band exits and enclosing caps are exact |
| MS05c-T03 | Infinity preserves prior output; work survives worker round trip |
| MS05c-T04 | Override validation, reference sampling/errors and both quick sets pass |

## Test plan

Script 3 earlier ratings, first shallow at local ordinal 2, then 64 new full ratings: the extra
allowance starts at 2, not generation ordinal 5; the next full call is refused. Include memo-only
visits, cancellation, two invocations, and an initially shallow state with zero additional allowance
in a direct unit test (CLI selection remains the four approved values).

Generator: `node tests\node-runner.js --suite=digger,pipeline,difficulty-diagnostics,difficulty-floor`.
Both quick sets. GR uses complete E with MS05c:

```powershell
node tests\replay-fixtures.js --ids=G09 --record=..\docs\difficulty-v3\evidence\MS05c\wire\G09.json
node tests\replay-goldens.js --ids=G01 --record=..\docs\difficulty-v3\evidence\MS05c\analysis\G01.json
```

Jobs=1, no --jobs; 1-120 seconds/request, 5-35 minutes total estimate. **Announce to the orchestrator
before starting (pentomino runs in parallel on the same machine).** No selection sweep yet.

## Definition of done & handoff

Give MS05d the exact counter semantics, Infinity default and four override values. Report wire
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
