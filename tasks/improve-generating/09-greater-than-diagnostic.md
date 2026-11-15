# IG-S09 - Greater-Than miss predicate and solve-first diagnostic

| Header | Value |
|---|---|
| Depends on | IG-S08 accepted |
| Developer | claude-sonnet-5.5 |
| Size /active time | Medium-large;60-90 min |
| Machine allocation | 15 min, ten admission periods included |
| Owner /milestone | Q16 diagnostic, not a production sign strategy |
| Authority | IG-S-Q16; CV6-05/MS05e set-aside disposition |
| Status | Not started |

## Goal and scope

Reproduce the exact miss split and measure whole-pass/whole-request work before proposing sign guidance.
Test only the sound-solve-first ordering in a private harness. A guided sign pool, setup-clue policy
change or production IR29 adoption is expressly out of scope.

Read `docs\difficulty-v3\cv6-guided-sign-dig-2026-11-14.md`, its committed MS05e evidence and restored
`greater-than.js`. Its before data is historical, not a substitute for these paired observations.
Add H `greater-than-diagnostic.cjs`, private hooks/order variant, tests and new evidence only.
Do not execute the old MS05e script or apply its saved candidate patch.

## Fixed arms and safety contract

**G0:** native first-allowed sign pass, native tuning/minimality/local work.

**G1:** in the first technique sign pass only, call the native restricted solve first with
`assumeUniqueness:false`. A complete sound proof permits skipping that candidate's DFS uniqueness count.
If the solve is genuinely stuck, run the native count and preserve the original ambiguous/techniques
reason. If no allowed-set solve applies, keep the original uniqueness path.

Do not classify contradiction/budget/error as ordinary stuck. Do not turn a partial proof or a
uniqueness-assuming proof into a uniqueness certificate. Keep `signs.minimal`, reveals, target handling,
sample alternation, canonical rating, keeper, local search and RNG order unchanged.
Uncensored G0/G1 outputs and accepted/rejected sign decisions should agree; physical work can differ.
Check whether the current source shares a count guard across oracle calls. If changed call ordering binds
that guard differently, retain the first differing guard/event as `guard-binding-difference`, not ordinary
identity equality or an unexplained correctness failure. Such an arm is a changed-budget diagnostic and
cannot support an identity-preserving optimisation claim. All other uncensored mismatches stop for Astra.

Preserve the semantic “one oracle question” counter while separately counting actual restricted solves,
DFS calls/checks and skipped DFS. Do not claim a physical saving from a renamed counter. If G1 wastes
logical work on candidates that G0 rejects cheaply by DFS, report the regression.

## Exact population and shards

- Greater-Than Normal, literal seeds300-319:20 paired requests.
- Greater-Than Nightmare, literal seeds700-709:10 paired requests.
- Trace **summary**, matching the historical diagnostic population; other options/defaults native.
  Do not compare these numbers directly to a trace-off headline without the label.
- Both arms capture the same per-sample snapshots/counters during generation; all independent rerating,
  uniqueness and minimality diagnosis is **after** the timed interval. Report observer overhead.
- Extra observer-overhead controls: unwrapped native Normal300 and Nightmare700, one each, compared
  with their captured G0 records. No extra seed search.

Shards: Normal300-304,305-309,310-314,315-319; Nightmare700-701,702-703,704-705,706-707,708-709;
one observer-control shard. Alternate arm order by seed index. Split unstarted work if admission requires it.

```powershell
& '.\generator\tests\artifacts\improve-generating\phase0\Invoke-IgTask.ps1' -Task IG-S09 -Round provisional-r1
```

Projection: approximately5 min generation,2.5 min bounded validation/margin and7.5 min grace =15 min.
Historical Normal20 is approximately40 s; Nightmare10 is of order100 s per arm, not a guaranteed bound.
The validation projection depends on the cheap predicate filtering and identity reuse below. Sixty
independent30 s validation allowances could take30 min; they are backstops, not additional authorised
time. Reserve admission/validation cost and stop with unknown checks inside the15 min ledger.

Frozen rerun, the same cohorts:

```powershell
& '.\generator\tests\artifacts\improve-generating\phase0\Invoke-IgTask.ps1' -Task IG-S09 -Round frozen-gate -FreezeReceipt '.\docs\improve-generating\evidence\phase0\freeze.json' -BudgetReceipt '.\docs\improve-generating\evidence\phase0\frozen-budget.json'
```

## Diagnostic record and predicates

Capture each sample's actual model/givens, initial setup clues, final clues, tune reveals, floor,
attempt/sample ordinal, sign-pass metrics and local entry/cap data. Instrument the origin of setup reveals:
clue-floor rule, unit-floor rule or solvability help; an origin is not proof of present necessity.

The named trap is exactly:

```text
complete canonical rating below requested band
AND finalClues <= spec.minClues + 1
AND independently proved minimal sign set
```

Do not omit the clue-floor clause, call every below-band sample the trap, or substitute score-only
in-band for exact. Minimality means removing each remaining sign admits another solution; a count cap
is unknown, not minimal. Keep unknown validation and residual categories visible.
Evaluate the cheap clue-floor clause and complete canonical below-band clause **before** minimality.
Only samples satisfying both need an independent minimality proof for the named-trap classification.
The historical Normal20 corpus had376 misses but only83 candidate traps after those clauses; proving
minimality for every miss would answer a different, much more expensive question.
Reuse G0's post-timing proof for a G1 sample only when the full canonical input/solution/sign/givens digest,
source and guard settings match; a matching final request alone is insufficient. Record `validationReusedFrom`.
Other samples' sign minimality is `not-required-for-trap`, not implicitly proved. Budget-limited eligible
samples remain trap-unknown; report coverage and lower/upper trap shares, not a fabricated complete split.

Disjoint summary: exact; shallow in-band; above/not-rated/stuck; below+named trap; below+post-setup
tune reveal; below+no tune reveal+setup at least two above floor; other/unknown below.
The predicate order prevents double counting. Record raw flags so the reviewer can reconstruct it.

For the first missed sample of each request, probe at most the first three above-floor setup groups
in their recorded order, after timing, against the saved **post-setup/full-signs** parent:
pure clue/unit-floor block, bounded uniqueness result and restricted-solve result after removal.
Record this limited counterfactual coverage; do not turn it into population intervention coverage.
Validation/probes have a30 s per-request host budget, with remaining checks explicitly unknown/unstarted.

Measure actual local-stage time separately from the total time of requests that contain a capped local
search. The old95% is a request-group share, not the measured local-stage fraction.

## Acceptance criteria - Business

| ID | Criterion |
|---|---|
| B01 | The named trap uses the exact full predicate, with denominators and unknowns visible |
| B02 | Whole-pass/request costs and physical DFS savings are measured, not inferred from per-probe cost |
| B03 | G1 stays a diagnostic; its outcome authorises no guided pool, IR29 or setup change in production |

## Acceptance criteria - Technical

| ID | Criterion |
|---|---|
| T01 | G1 skips DFS only after a complete sound non-uniqueness-assuming proof |
| T02 | Unbound completed pairs preserve identity; any demonstrated shared-guard difference is separately classified |
| T03 | All samples, setup origins, local stages and capped/unknown checks are accounted for |
| T04 | Generation and post-timing validation/probes have separate CPU/wall fields |
| T05 | Capture overhead is reported; no contaminated diagnostic number is called an uninstrumented headline |

## Test plan and outputs

Synthetic oracle cases: solved proof, true stuck/unique, true stuck/ambiguous, count unknown, contradiction,
budget failure and disallowed uniqueness assumptions. Test exact miss categories at floor/floor+1/floor+2,
with and without tune reveals; a missing minimality proof must not enter the named trap.
Also test the cheap-clause short circuit, exact-input validation reuse, a changed sign/input forbidding
reuse, exhausted validation budget and a shared-count-guard ordering difference.

Common records plus `samples.json`, `sign-passes.json`, `setup-probes.json`, `miss-split.json`,
`order-parity.json`, `summary.json/md`. The markdown gives the exact numerator/denominator for every
percentage, physical calls per removal/pass/request, generation/local CPU/wall, and source/trace identity.
No causal “only22% can benefit” conclusion follows merely from an ending category.

## Definition of done and handoff

Return G0/G1 paired evidence, minimality coverage, observer overhead and unresolved setup/local causes.
A faster G1 still needs a later design/owner decision; a slower G1 is accepted research evidence.

## Execution log

| Field | Value |
|---|---|
| Status | Accepted (pack author: IG-S09 ACCEPT as an authorised partial diagnostic; F1-F5 closed). Normal 20/20 pairs, Nightmare 6/10; eight request rows (Nightmare 706-709) unstarted; controls 2/2. No further generation authorised |
| Start /end | 2026-11-15 09:17:35-10:06 (+07:00) first pass, stopped on the machine budget with a QUESTION; 10:15 author ruling (b): +90 s for `observer-control` only; 10:18-10:32 control and r1 report; 10:50 author review (accept with fixes F1-F5); 10:55-11:07 r2; 11:12 author check (F2 open); 11:13-11:16 F2 follow-up; 11:20 author acceptance; orchestrator commit |
| Developer /model | claude-sonnet-5.5; 255 model calls, 96,193,587 input tokens (93,591,427 cache reads), 469,791 output tokens, about 2,056 AI credits. Author rulings and reviews gpt-6-astra; orchestrator claude-opus-5.5 |
| Files /source identities | New under `phase0/`: `greater-than-diagnostic.cjs`, `adapters/gt-diagnostic.cjs` (23 in-memory transforms), `plans/ig-s09.cjs`, `ig09-worker.cjs`, `ig09-run.cjs`, `ig09-aggregate.cjs`, `ig09-dev-check.cjs`, `ig09-test.cjs` (36/36); one dispatch line each in `run.cjs` and `worker.cjs`; README. Fingerprints: runtime `36b2b832…`, commands `9da69f60…`, adapter `d5fd6349…`, r1 writer `89105175e832…`, r2 writer `d414ebac…`, final harness after the F2 follow-up `bbd5db2da6cd…` (corrections were not engine-rerun) |
| Verification /evidence | `docs/improve-generating/evidence/phase0/provisional-r1/IG-S09/` (r2 current: `samples-r2.json`, `sign-passes-r2.json`, `setup-probes-r2.json`, `miss-split-r2.json`, `order-parity-r2.json`, `summary-r2.json/md`; r1 kept). 26/26 pairs identical (request digests, final states, ratings, semantic oracle counters, every sign decision); no guard-binding difference; G1 skipped 56,556 counts only after a complete non-uniqueness-assuming proof, 0 fallbacks. G0/G1 ratio of cohort totals (ready wall): Normal 41.30 / 40.08 s = 1.030 (paired median wall 1.083); Nightmare 51.95 / 305.89 s = 0.170 (paired median 0.174); differences only in the first technique sign pass (Normal 10.5 vs 8.9 s; Nightmare 23.8 vs 277.9 s, 2,541 extra solves on candidates the count rejects cheaply). Miss split identical in both arms: Normal 394 samples (exact 18, shallow 21, named trap 83 = 22.1 % of 376 misses, tune reveal 85, setup two or more above floor 187, other 0; minimality decided 83/83); Nightmare 175 samples (exact 6, shallow 56, trap 19 of 169 misses, tune 87, setup-two 7; minimality 19/19). Setup probes: 15 executed group checks plus 15 reused rows (13 donor, 13 recipient requests). Local-stage share of engine wall: Normal G0 71.3 %, G1 74.7 %; Nightmare G0 36.1 %, G1 6.1 % (the old 95 % is the request-group share). Observer controls: Normal 300 ratio 1.005, Nightmare 700 0.993, compatible with captured G0 (two singletons; no population-wide overhead claim). The author reran the pure tests (36/36, plus four valid-map checks in the loader realm) and reproduced all six r2 JSON reports |
| Machine charged /priority wait | 895.678 s of 990 s (900 s + 90 s approved for `observer-control` only; dev check 52.035 s counted once); 94.3 s unused. Known priority waits 914.187 s for the eight shard/control commands, not charged; the dev-check wait is unknown |
| Findings /author answers | Ruling (b): no completion of Nightmare 706-709 in this pre-freeze round (unstarted, not excluded, failed or replaced). Accepted deviations: symmetric proof reuse on identical full inputs (`validationReusedFrom`), the three disclosed dev-check requests, catalogue from the ready message. Review findings closed: F1 counter units (`counts.dfsEntries` in the 52 recorded rows are `countSolutions` calls, not DFS node entries; `UNIQUE_NODES` counts budget checks; CPU is total CPU incl. startup/cleanup; p95 wording), F2 failures and guards (unexpected errors, contradictions, uniqueness-assuming or malformed proofs stop the G1 request; guard differences only from recorded guard events; technique-count map validated, `ig09.g1-malformed-report`), F3 30 s diagnosis deadline (unfinished vs unstarted), F4 executed vs reused probes, F5 wait provenance. Acceptance: B01, B02, T02 met for the recorded requests; B03, T01, T04 met; T03 partial; T05 met for the two singleton controls only |
| Orchestrator review /acceptance | Only harness and evidence folders changed; formats checked. No global G1 winner and no production adoption |
| Handoff | IG-S10: modest observed Normal benefit, substantial Nightmare regression; preserve cohort separation, the partial coverage (eight unstarted rows, IG-S06 deferred), the counter erratum and the singleton-overhead limitation; propose any frozen follow-up prospectively, with no automatic catch-up |
