# IG-S10 - Reconcile measurements and prepare the frozen rerun

| Header | Value |
|---|---|
| Depends on | IG-S09 accepted, all earlier evidence available |
| Developer | claude-sonnet-5.5 |
| Size /active time | Medium;30-60 min |
| Machine allocation | 4 min, one admission period included |
| Owner /milestone | Evidence closure; M5 |
| Authority | IG-S-Q05; "Direction after the joint report"; first-round scope |
| Status | Not started |

## Goal and scope

Deliver an estimate-versus-measured report with no mixed populations, lost failures or fabricated gates.
Make the same harnesses executable later against the frozen catalogue with their one documented command.
This task reads results and tests reporting; it generates no new puzzle.

In H: `reconcile.cjs`, `gate.cjs`, report tests/README updates. New round-level `report.json/md`,
`coverage.json`, `gate.json`, `budget-summary.json`, `frozen-rerun-plan.json`.
Out: new measurements, population expansion, performance tuning, production/default/offer changes,
edits to historical records or task Execution logs, and git actions.

## Steps

1. Reconcile every declared key for IG-S01-IG-S09: completed, censored, early-exact skipped, explicit
   alias, unstarted or blocked. Validate identities and exact input populations. Keep every failure.
2. Separate observed native generation, paired prototype timings, instrumented profiles and post-timing
   validation. Do not combine source/trace/caps/pool widths under one distribution.
3. Fill a generated copy of the check-list's estimate table in `report.md` (the evidence report, not this
   task pack). The orchestrator alone later fills the check-list/Execution logs.
4. For S5a/S3 show CPU and wall, cold/startup/cleanup, parity and discarded work. For S3 state the implemented
   finder coverage. For SM2 show all six variants and both controls, not only the selected row.
5. Distinguish sample-origin versus local-origin hits, grid-return versus full-request rates, zero versus
   unmeasured, and first-shallow256 versus other attempt-cap endings.
6. Compute the prescribed paired seed-cluster intervals and full-request on-time lower bounds where
   data support them. Label three/eight-cluster intervals descriptive. The real current `gate.json` must
   remain `not-evaluable-pre-freeze`. Frozen output distinguishes collected rate/projection inputs from
   the plan author's feasibility decision; the direct26/40 statistic never becomes a substitute gate.
7. Test the frozen gate evaluator using **synthetic**40-cluster fixtures: source not attested; mismatched
   limits; incomplete paired controls; zero hits; budget/censored observations; no pseudo-count;
   on-time exact lower bound below/above0.5 without automatic go; non-inferiority failure; invalid claimed
   hit; missing projection assumptions produces `projection-awaits-author-review`; sample-only evidence
   cannot establish request-level qualification. Synthetic statistics are not a real frozen decision.
8. Produce `frozen-rerun-plan.json`: dependencies, exact commands/populations,40-seed expansions,
   adapter capabilities, current timing-based projections and required separate approval.
   The command is ready to rerun, not a claim that an unknown future source has already passed adapters.
   List wordoku, sohei, flower and butterfly as separate **unapproved** Nightmare extensions, not covered
   by classic9/samurai. For each propose pilot11,12, SM2 grid101-140 and request201-240 populations with the
   same mode counts. Project cost from available cell-specific historical costs plus measured frontier
   costs; if a proxy is necessary name it and its uncertainty. Record formula, calls, grace and unknown/
   censored cost bounds rather than silently pricing them at zero. These rows grant no execution authority.
   Budget the four current frozen request cells as two modes x40 requests, not four modes x40.
9. Recheck all current source/firewall identities by file reads. Report budget spent, charged grace,
   excluded priority wait, unused allocation and every censored/unstarted item. No automatic catch-up run.

## Exact command and rerun

One reconciliation/self-test shard, no engine generation:

```powershell
& '.\generator\tests\artifacts\improve-generating\phase0\Invoke-IgTask.ps1' -Task IG-S10 -Round provisional-r1
```

The wrapper is retained even for this short Node analysis command. Projection: under3.25 min analysis/
validation plus0.75 min grace. No scenario generator is run to test the statistics.

Frozen closure, only after the separately approved earlier frozen tasks:

```powershell
& '.\generator\tests\artifacts\improve-generating\phase0\Invoke-IgTask.ps1' -Task IG-S10 -Round frozen-gate -FreezeReceipt '.\docs\improve-generating\evidence\phase0\freeze.json' -BudgetReceipt '.\docs\improve-generating\evidence\phase0\frozen-budget.json'
```

## Acceptance criteria - Business

| ID | Criterion |
|---|---|
| B01 | Every headline row/multiplier has measured evidence, an explicitly partial scope, or a named unanswered item |
| B02 | No current result is used as the frozen gate or as permission to change production |
| B03 | Frozen rerun commands/populations and the larger approval requirement are unambiguous |

## Acceptance criteria - Technical

| ID | Criterion |
|---|---|
| T01 | Coverage reconciliation rejects duplicates, silent exclusions and incompatible identities |
| T02 | Statistics preserve paired request/grid clusters, failure denominators and CPU inclusion |
| T03 | Provisional real records cannot produce a formal go; sample-only data cannot fabricate full-request eligibility |
| T04 | Synthetic frozen-gate tests exercise actual analysis behaviour, not only constants |
| T05 | Budget/firewall/format checks pass and no real generation occurs in this task |

## Required final report

JSON and markdown must include:

- actual source/catalogue identities and the literal provisional label;
- each planned versus observed population and cap/timeout/unknown count;
- paired per-seed rows, descriptive summaries and uncertainty, not only means;
- estimate-supported/refuted/inconclusive for the **implemented scope**, with original estimates labelled P;
- native/S5a/partial-S3/composed results for all six headline cells;
- all SM2 variants, floor/DFS costs, S2 audits and selected-versus-held-out outcomes;
- bounded SM3 stage attribution, not an invented uncensored325 s rerun;
- Greater-Than exact miss split and physical work, not a blanket causal fraction;
- remaining decisions for Astra/Fable, including any adapter/guard/footprint problem;
- machine accounting and the explicit later frozen approval request.

A task can close with “hypothesis not supported” or “inconclusive within budget”. It cannot close with a
false exact puzzle, a changed identity hidden by a new fixture, or an unfinished request counted as a pass.

## Execution log

| Field | Value |
|---|---|
| Status | Accepted (pack author: IG-S10 ACCEPT; F1-F4 closed). Authorised pre-freeze round complete; deferred (IG-S06) and unstarted (IG-S09 Nightmare 706-709) work remains unexecuted. Owner decision 2026-11-15 12:20: finish improve-generating with IG-S10 only, then resume difficulty-v3 |
| Start /end | 2026-11-15 11:22:34-12:23 (+07:00) first pass (the wrapper admitted the shard after about 22.5 min behind MS07e); 12:40 author review (accept with fixes F1-F4); 12:42-12:54 r2 (report-only, unwrapped read-only aggregation, uncharged); 13:00 author acceptance; orchestrator commit |
| Developer /model | claude-sonnet-5.5; 236 model calls, 85,501,554 input tokens (83,739,838 cache reads), 450,803 output tokens, about 1,729 AI credits. Author reviews gpt-6-astra; orchestrator claude-opus-5.5 |
| Files /source identities | New under `phase0/`: `gate.cjs`, `reconcile.cjs`, `reconcile-report.cjs`, `reconcile-build.cjs`, `reconcile-render.cjs`, `frozen-plan.cjs`, `ig10-run.cjs`, `ig10-test.cjs` (33/33), `plans/ig-s10.cjs`; `run.cjs` (an `analysis` shard kind and the IG-S10 hook); README. Round outputs in `docs/improve-generating/evidence/phase0/provisional-r1/`: r1 `report.json/md`, `coverage.json`, `gate.json`, `budget-summary.json`, `frozen-rerun-plan.json` and `IG-S10/reconcile/` (kept); **r2 current** `report-r2.json/md`, `coverage-r2.json`, `gate-r2.json`, `budget-summary-r2.json`, `frozen-rerun-plan-r2.json` (each with `revision.supersedes` r1 hashes). Fingerprints: runtime `36b2b832…`, catalogue `d035b740…`, run harness `9a8afa85b3ff…`, r2 writer `8f0018b5c36d…`; per-task measurement, report-writer and corrected-harness fingerprints listed separately in the report |
| Verification /evidence | One wrapped shard `IG-S10/reconcile`: complete, exit 0, 28/28 in-shard tests. The author reran the pure tests (33/33 after r2) and the dry run: 480 planned keys reconciled, 0 problems, 118/118 recomputed values equal to the accepted summaries; r2 output and superseded-r1 hash links verified. Coverage: S01 4/4; S02 30 + 6 Killer rows by the hash-linked audit overlay; S03 43/43; S04 64/64; S05 243 complete + 13 budget-ended; S06 deferred unmeasured; S07 12/12; S08 2 + 1 censored (240.015 s); S09 54 + 8 unstarted. `gate-r2.json` `not-evaluable-pre-freeze` (formal gate disabled, never go/no-go; sample-only evidence `not-established-sample-only`); 13 synthetic 40-cluster gate cases plus 15 reconciliation cases, and the F4 invalid-evidence/duplicate-seed rejections. No engine runs in the fix round |
| Machine charged /priority wait | IG-S10 53.535 s of 240 s (8.535 s occupied + 45 s grace); excluded wait 1,347.934 s. Round final: **6,610.418 s of 10,800 s** (77 wrapped commands 6,609.948 s plus the 0.470 s IG-S07 pre-check debit, wall time once, no grace); **4,189.582 s unused**. Known priority waits 13,796.813 s (ledger 13,342.190 s + auxiliary receipts 454.623 s); three command waits unknown (two IG-S01 evidence-only, the IG-S09 dev check). Approvals 522 s in all |
| Findings /author answers | F1 verdict scope: invented "Today"/SM1 thresholds removed (descriptive differences); partial S3 "no material net gain demonstrated; full-S3 forecast untested/inconclusive" from the median paired incremental ratios (1.01, 1.02, 1.02, 0.91, 0.98, 0.93); Killer S5a "planning-factor estimate refuted on these 3 pairs (x2.07-2.65 versus x2.8-3.0)", not a refutation of the x2.55 pool improvement. F2 final accounting after the command (structural tests). F3 phase-separated command packing (extensions central: wordoku 3 commands 328 s, sohei 8 / 1,792 s, flower 6 / 1,471 s, butterfly 6 / 1,313 s; IG-S06 low 5,759 s, central 8,442 s; guard scenario an incomplete upper bound), all unapproved planning scenarios. F4 invalid frozen inputs rejected; decision owners Fable (plan author) and Astra (pack author). Headline: S5a supported on mega16 (x1.92), mega12 (x3.22), samurai (x1.79), classic9 (x3.22); Greater-Than S5a inconclusive (x2.62); first and all phases inconclusive everywhere |
| Orchestrator review /acceptance | Only harness and evidence folders changed; formats checked; §8 of the check-list filled from `report-r2.md` §3. Closing note appended to `docs/improve-generating/clarifications.md` |
| Handoff | Round closed; difficulty-v3 resumed. Future decisions D1-D8 (frozen order/budget; composition after zero yield; projection assumptions and non-inferiority margin; four extensions; missing Nightmare pairs; MS07b chain attribution; versioned S7 limits; adapter/guard/footprint carry-overs) and approvals A1-A6 (freeze attestation, budget, assumptions/margin, IG-S06, each extension, the missing Nightmare pairs) are in `report-r2.md` §12-§13 and `frozen-rerun-plan-r2.json`. No frozen run is authorised |
