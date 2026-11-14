# IG-S06 - Held-out requests and ordered sample composition

| Header | Value |
|---|---|
| Depends on | IG-S05 accepted; selection/budget hashes fixed |
| Developer | claude-sonnet-5.5 |
| Size /active time | Large;90-150 min |
| Machine allocation | 24 min, admission grace included |
| Owner /milestone | Full-request composition; M4 |
| Authority | Q05 request feasibility; Q03 identity; test-side S5b only |
| Status | Not started |

## Goal and scope

Check whether the measured multipliers compose into a useful **whole request**, including local search.
Do not manufacture the report's all-phase row by multiplying independent best cases or by deleting local
continuation. Compare a native request with an actual combined prototype on held-out paired seeds.

In H: `composed-request.cjs`, private ordered sample/quota scheduler, manifest, tests and evidence.
Out: production S5b, S4/S6/S7, changed rating/requiredness, increased attempts, UI/stock/bank and browser offers.
The partial S3 coverage remains labelled partial. No git; design questions go to Astra.

## Fixed modes

The current population is Nightmare, six H3 cells, but **held-out literal seeds201,202 for every cell**.
Native default attempts and12 samples/attempt; no successful-seed substitution.

| Mode | Solver | Sampling | Scheduler |
|---|---|---|---|
| N1 | native | native mixed kinds/caps | one complete native request on width1 |
| CA4 | scoped S3 | selected frontier on four eligible cell boards; native kinds on Killer/Greater-Than | IG-S02 attempt scheduler, width4; native shared attempt caps |
| CQ1 | scoped S3 | same selection; explicit quota protocol below on eligible cell boards | ordered quota reference, width1 |
| CQ4 | scoped S3 | exactly CQ1's algorithm | samples speculative on width4, consumed in native `(attempt,sample)` order |

For Killer/Greater-Than, CA4=CQ4 in algorithm/scheduler; run it once, recording the alias instead of
inventing a second observation. CQ1 there is native sampling with scoped solver and one lane.
CQ1 is required on classic9/mega12 and the synthetic scheduler cases. On mega16/samurai it is optional:
run N1,CA4,CQ4 first; a serial frontier request can far exceed180 s. Thus the maximum primary population
is40 request observations, plus four explicitly optional large-board CQ1 observations. Missing/censored
CQ1 cannot establish large-board CQ1=CQ4, even if the generic scheduler tests pass.

### Quota protocol (test algorithm, not production)

- Actual global defaults/attempt count and RNG forks stay native.12 samples per attempt.
- Per-sample canonical-rating quota64; reserve256 canonical ratings for the attempt's local continuation:
  `12*64+256=1024`. If the runtime's native cap is not1024, stop for the author rather than guess a split.
- Per-sample deepen proposal quota16; reserve `32768-12*16=32576` proposals for local continuation.
  Check the native cap and record these numbers as `ig-quota-v1`, not a production generator version.
- Every floor/DFS/canonical operation also spends the reviewed deterministic sample count vector.
  It does not create free work outside the shared accounting.
- Keep the best complete sample and intermediate candidate with the **current runtime** comparison/tie rule.
  Run one unchanged local-search strategy per attempt if the native entry conditions hold, with its reserved
  caps and the actual native post-shallow allowance (currently256). A local search is sequential; on two-attempt boards
  it never has four independent lanes.
- Unused sample quotas are not redistributed according to completion timing. The local reservation is a
  total256-rating cap as well as the inherited post-shallow rule; this intentionally differs from a native
  continuation that could use more ratings before its first shallow state. CA4 is the necessary control.
- Quotas intentionally change search paths. Require CQ1=CQ4 (and S3 parity), not CQ=N1.
  CA4 versus CQ4 separates the quota/scheduler change from a fictional extra S1 benefit.
- Only consumed-prefix events/results count. Capture CPU spent on speculative/discarded samples and
  synchronise candidate/keeper selection before publishing. Do not merge by score alone.
- The consumed order includes a barrier: local continuation of attempt a is resolved before any sample
  of attempt a+1 may win. Later work may execute speculatively, but a later exact sample cannot outrank
  an earlier local exact result merely by finishing first.

## Exact commands and shards

Logical blocks are cell/seed, not guaranteed single commands. Run the synthetic scheduler checks first;
then seed201 on classic9, mega12, mega16, samurai, killer, greaterThan; then seed202 in that same order.
The early small-board blocks establish CQ1/CQ4 identity before expensive large-board confirmation.
Order the primary modes within a block by the fixed seed-index rotation. Optional large-board CQ1
comes only after all primary blocks, if its projected serial cost is below180 s and the allocation fits.
Pack/split whole unstarted request arms using the pilot/screen costs and native IG-S02 local-stage cost;
a request reaching the180 s guard needs its own physical command. No four-arm large-board block is
promised to fit270 s. Keep an unstarted list; never shorten count work or increase a guard to fit.

```powershell
& '.\generator\tests\artifacts\improve-generating\phase0\Invoke-IgTask.ps1' -Task IG-S06 -Round provisional-r1
```

**Projection:** serial frontier sample work alone is `A*12*t_sample`; with A=2 and15-45 s/sample that
is360-1080 s before local work. Ideal sample width4 reduces that component to90-270 s, not the whole
request to a quarter. Native attempt width4 has only two active lanes on these boards.
Eight primary large-board pooled observations reaching180 s already cost24 min before baseline, smaller
boards, validation and grace. The former13-min work estimate is therefore withdrawn.
The24 min allocation is a bounded prioritised confirmation, not a guarantee of all40 records.
Before running, emit `request-reprojection.json` using measured grid/sample/local/startup costs, actual
attempts, scheduler lanes and guards; the author/orchestrator reviews admission. Stop with explicit
unstarted/censored coverage if the primary matrix cannot fit. Optional CQ1 is not a reason to take reserve.

### Frozen confirmatory rerun

After separate approval, the one command below uses request seeds201-240 for the four frontier decision
cells. Confirmatory modes are **native-mixed and the selected frontier only**, both
with reference solver, native shared attempt caps and IG-S02 width4 scheduling. Thus the S1/S2 gate is
not credited with partial S3 or changed S5b quotas. Keep sample-origin and local-origin hits separate.
Each native kind and proposal-only are compared on IG-S05's40 grid clusters, not three additional full-
request populations here. This is320 confirmatory requests, not640, before any retained diagnostics.

Retain the six-cell two-seed primary diagnostic/invariance population beside this larger gate
population. Do not count its repeated201/202 outcomes again as independent confirmatory observations.
The controls and frontier gate records are distinct modes; only one accepted record per key.

```powershell
& '.\generator\tests\artifacts\improve-generating\phase0\Invoke-IgTask.ps1' -Task IG-S06 -Round frozen-gate -FreezeReceipt '.\docs\improve-generating\evidence\phase0\freeze.json' -BudgetReceipt '.\docs\improve-generating\evidence\phase0\frozen-budget.json'
```

This expanded run is not authorised by24 min or by the first round's180 min. Plan the cost first.
It supplies actual full-request on-time exact fractions **beside** Q05's rate-based feasibility projection,
not a replacement26/40 gate. No independence among dozens of correlated samples is assumed.
Wordoku, sohei, flower and butterfly remain outside these measurements, with no inferred allowlisting.

## Acceptance criteria - Business

| ID | Criterion |
|---|---|
| B01 | Six headline cells have paired request evidence or explicit budget-limited missing coverage, never invented after times |
| B02 | The report includes retained local work, extra/quota failures and speculation, not only successful samples |
| B03 | Pre-freeze outcomes never activate S1 or decide the bank route |

## Acceptance criteria - Technical

| ID | Criterion |
|---|---|
| T01 | CQ1/CQ4 agree on completed small-board pairs and synthetic cases; large-board unproved equality is labelled |
| T02 | Quota sums, one local continuation/attempt and count-vector charges cannot be exceeded silently |
| T03 | CA4 uses native shared caps; reference controls are not accidentally switched to quota semantics |
| T04 | Independent validation covers every returned result; a sample hit in an unconsumed task is not a request hit |
| T05 | Source/selection/budget identity and exact coverage/aliases are reconciled |

## Test plan and records

Synthetic scheduler cases: early exact sample; lower-ordinal slow result; simultaneous exact results;
all misses; sample budget then later success; off-band local entry; first shallow late versus at entry;
local proposal/rating exhaustion; keeper tie; cancellation and stale messages. Include a mutation that
incorrectly divides/dispatches one local continuation across four lanes.

Common records plus `quota-manifest.json`, `request-reprojection.json`, `request-pairs.json`, `pool-invariance.json`,
`gate-inputs.json`, `summary.json/md`. Publish per-cell N1/CA4/CQ1/CQ4 median/max, CPU/wall ratios, native
versus frontier hits, local entry/exit cost and cap reasons. With n2, show both raw observations; do not
sell the larger one as a reliable production p95.

## Definition of done and handoff

The report says which headline estimate is directly measured, partially implemented, or still only
projected. Equality failure blocks the scheduler, not permission to update a golden. IG-S07 receives
the slow/missed request ids and unchanged source identity for attribution.

## Execution log

| Field | Value |
|---|---|
| Status | |
| Start /end | |
| Developer /model | |
| Files /source identities | |
| Verification /evidence | |
| Machine charged /priority wait | |
| Findings /author answers | |
| Orchestrator review /acceptance | |
| Handoff | |
