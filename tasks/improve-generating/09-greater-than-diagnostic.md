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
| Status | |
| Start /end | |
| Developer /model | |
| Files /source identities | |
| Verification /evidence | |
| Machine charged /priority wait | |
| Findings /author answers | |
| Orchestrator review /acceptance | |
| Handoff | |
