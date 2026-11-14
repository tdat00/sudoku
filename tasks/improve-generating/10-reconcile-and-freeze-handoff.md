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
| Status | |
| Start /end | |
| Developer /model | |
| Files /source identities | |
| Verification /evidence | |
| Machine charged /priority wait | |
| Findings /author answers | |
| Orchestrator review /acceptance | |
| Handoff | |
