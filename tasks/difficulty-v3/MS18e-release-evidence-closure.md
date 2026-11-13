# MS18e — Final correctness and release evidence closure

| Header | Value |
|---|---|
| Depends on | MS18d accepted; all required owner actions resolved |
| Size / active time | Evidence/CI audit; 40-60 minutes plus GD/quick/final deep evidence |
| Owner / milestone | Release evidence and owner of the v3 PR's CI; M18 complete |
| Authority / review | R20-R24, S-OD3/S-OD4; orchestrator review, not routine analyst cross-review |
| Status | Not started |

## Goal & business context

Close the feature only when the final source, correctness, availability and cost evidence agree.
This task does not deploy, push, commit or edit the orchestrator's task logs.

## Scope and repository rules

In: final GD/quick/deep checks, complete item/evidence audit, final-tree workflow/PR-CI ownership,
living documentation/release record and tightly coupled CI manifest/group corrections.
Out: application/tuning/fixture repairs, blanket all/manual/browser runs, historical report or pack edits.
AGENTS/checklist; CRLF, both guide languages; no Git writes.

## Inputs & context

Final invariants: rating/cache 3, history/wire 1, 40 IDs/34 unscoped, two uniqueness IDs, fixed weights/
bands, selected cap/C and frozen pattern limits. Exact means canonical solved/in-band/required;
legacy history/imports remain honest. Complete final 135-cell qualification and >=90% performance
matrix use the accepted source/configuration. Fixed 520 hashes remain present.
The attempt policy is 8/4/2 by size, not a global eight; complete GR now has five G09-G13 wires
and fourteen analyses. Final offers apply (c1) without exceptions; bounded fallbacks are misses.

R20, verbatim:

> Record every reclassification, the old and v3 labels/requiredness, and the causing technique in
> `docs/difficulty-v3/notes.md`, in the task that introduces the change.

Consolidate, do not invent missing earlier evidence. Verify current references, old-history
retention, shallow warning/Retry and proof coverage are all documented in both languages.
S0 baseline old 202/204 versus qualified 91/204 is not a v3 result. Include isolated target and final
matched comparisons, per-cell losses, omitted levels and all performance misses.
No new floor certificate or target leaks into the external Player exchange.
Resume anchors at c9935cd: `generator/tests/manual/difficulty.test.js:1231`
(`hits the requested level in at least 90 %`), `:1259` (`I5: every puzzle has a complete proof`),
and the `digLevel makes one attempt` guarantee;
`generator/js/ui/cache.js:47` (`const SCHEMA_VERSION = 2` before MS17b),
`generator/js/ui/history.js:19` (`const VERSION = 1`). Find the quoted tests after later changes.

## Files to create/modify

- New `docs/difficulty-v3/release-v3.md`, notes/evidence links, docs/README.md.
- Applicable living Generator/Player designs and both user/developer guides, correcting actual final facts.
- `.github/scripts/generator-suites.sh`, its r6c portable manifest/helper, both
  `.github/workflows/pull-request.yml` and `pages.yml`, only for final bounded-tier correctness.
- No application, expected fixture, historical analysis report or task-pack file. The existing
  mega deep tool is run, not redesigned to bypass a slow final cell.

## Implementation steps

1. Reconcile all task handoffs and every inherited/new S-OD4 item against final sources/decisions.
2. Finish living guide/design/workflow/group corrections and create the release-report skeleton
   before the final quick fingerprint. Audit the workflows once on that final tree as below.
3. Run final GD and the complete bounded quick manifest; collect/reconcile final deep records.
   Every correctness failure blocks; time-only outcomes retain their real status and item owners.
4. Fill the data-only release report with actual counts, settings, versions, compatibility, availability,
   costs and PR-CI status. Do not edit hashed quick inputs after verification without replacing affected checks.
5. Give the orchestrator the sign-off/remaining items and CI responsibilities; no developer commit/deploy.

### Complete item and final-tree CI audit

Inventory the stable S-AV IDs from every task, not only the most recent report. For each retain
origin, old/new numbers, source/config/request, evidence, checkpoint/final owner and disposition.
Account explicitly for CV6, Killer Hard/Expert and its conditional owner question, large-board
Nightmare/hell1, classic9 Nightmare, quick-set cost/proposal and every guard/projection finding.
No item vanishes because a test moved tiers or a level became hidden: link its final qualification
or cost verdict. A proposal not approved is not an implemented change. No weights changed before
an answer; no missing S3 group, new unapproved evidence class or silent performance waiver.

Audit `.github/scripts/generator-suites.sh`, its portable manifest and both workflows against
the **final** suite inventory. Check every newly added suite's group, disjoint current quick
membership, no manual/deep catch-all, source/result completeness, realistic per-job cost <=30
minutes, unchanged time factor and no raised timeout. Preserve the PR's smaller existing limits,
core/Player/browser jobs and Pages dependency/trigger rules. Workflow comments must point to the
actual final offline deep/GD/E/GQ/GP evidence, not claim r5m's old source validates new techniques.

The orchestrator supplies the v3 PR/check-run identity and performs any required Git/PR actions.
This task owns reading/checking the final-head results and investigating bounded CI grouping
failures, forwarding application/correctness defects to their owner. Local success is not a
remote CI pass; if no matching final-head run exists, leave PR-CI sign-off explicitly pending.
No merge, push, workflow dispatch or new browser run is authorized by this task file.

### Final-source deep mega evidence

Use the existing r5m tool, as extended by MS07b, for the retained Nightmare and hell1 populations:
two boards x two levels x (invariants 1/2/3/4 plus independent CV5 3/3/4) = **28 occurrences**.
One request per locked process, board-default attempts, same 500 s diagnostic ceiling, current
source/config/guard identities and original relations. Fixed hidden requests are diagnostic only;
use the established temporary support guard and restore the original array, never normalize to
another level. Retain every outcome and all per-puzzle checks, not just a hit histogram.
Run once after the final engine change; reuse compatible current-source records if they already
exist, never stale recovery records or two aliases of one CV5 call. Reconcile without regeneration.
If a current final CV3 mega cell matches, apply its own checks to those records and identify the reuse.
Record >240 s/timeouts as named availability/cost outcomes; wrong puzzles/flags/warnings still block.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS18e-B01 | Players and the owner receive truthful v3 behavior, limitations and availability |
| MS18e-B02 | No unperformed or failed gate is reported as passed |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS18e-T01 | Final GD/quick correctness and actual performance verdicts are reconciled; no failed/incomplete gate is called green |
| MS18e-T02 | GS/GQ/GP/GG/GR/GH and 28 deep occurrences/relations have current compatible evidence or explicitly unsatisfied release status |
| MS18e-T03 | Living EN/VI docs match the final code; no application/tuning/fixture/pack edit |
| MS18e-T04 | Every S-OD4 item has an evidenced disposition or named outstanding owner; all six S3 groups remain |
| MS18e-T05 | Final workflow/group audit and matching-head PR-CI status are recorded; no time-factor/timeout raise or deep CI run |

## Test plan and gates

Generator:

```powershell
$offered = @(& node -e "require('./tests/replay-fixtures.js').nodeEnv().engine(); console.log(SG.variants.get('classic9').difficultySupport.join('\n'))")
if ($LASTEXITCODE -ne 0) { throw 'offered-level manifest failed' }
$offered = @($offered | Where-Object { $_ -ne '' })
$first = if ($offered -contains 'nightmare') { 'nightmare' } elseif ($offered.Count -gt 0) { $offered[0] } else { $null }
if ($null -ne $first) {
  Invoke-Dv3Node -Task MS18e -AllowExit1 -NodeArgs @('tests\node-runner.js','--suite=difficulty',"--filter=time) > $first >")
}
# Examples of ONE cell each: complete the full current per-level/variant manifest below.
Invoke-Dv3Node -Task MS18e -AllowExit1 -NodeArgs @('tests\node-runner.js','--suite=killer','--filter=> normal: 20 puzzles > I5:','--verbose')
Invoke-Dv3Node -Task MS18e -AllowExit1 -NodeArgs @('tests\node-runner.js','--suite=jigsaw','--filter=> normal: 20 puzzles > I5:','--verbose')
Invoke-Dv3Node -Task MS18e -AllowExit1 -NodeArgs @('tests\node-runner.js','--suite=greater-than','--filter=> normal: 20 puzzles > I5:','--verbose')
Invoke-Dv3Node -Task MS18e -AllowExit1 -NodeArgs @('tests\node-runner.js','--suite=extra-regions','--filter=> diagonalX normal: 20 puzzles > I5:','--verbose')
Invoke-Dv3Node -Task MS18e -AllowExit1 -NodeArgs @('tests\node-runner.js','--suite=wordoku','--filter=> normal: 20 puzzles > I5:','--verbose')
Invoke-Dv3Node -Task MS18e -AllowExit1 -NodeArgs @('tests\node-runner.js','--suite=variants','--filter=> variants: classic9 > CV3 normal:','--verbose')
Invoke-Dv3Node -Task MS18e -AllowExit1 -NodeArgs @('tests\node-runner.js','--suite=variants','--filter=> variants: classic9 > CV3 unsupported:','--verbose')
# Complete both app quick sets through the refreshed bounded manifest, not an unconditional whole run.
```

Player likewise uses `Invoke-Dv3Node`; a no-options run is allowed only with a current <=450 s
projection. Otherwise use the complete disjoint manifest and result reconciliation.
These consumers were corrected in MS05b2 and first executed with MS05b3's lazy corpora;
no blanket manual suite is inferred. Rebuild the current MS05b3 manifest: **one I5 per actual
level** of Killer/Jigsaw/Greater-Than/Wordoku, one per `(diagonalX|hyper,level)` in extra-regions,
one **CV3 per (variant, supported level)** and one separate unsupported-level refusal check
per variant. Never use a whole-variant CV3 selector: it still represents many requests.
Use each I5 suite's original `countOf`/`PER_LEVEL` and indexes/seeds; CV3 keeps its own 2/3
requests per supported level, seeds 1..perLevel and the 240-second request guard.
The four Normal examples use 20; top levels may use 8 or 10, not a guessed 20.
Keep the leading `> ` boundary in every filter so Easy cannot match Very Easy.
CV3 names are `CV3 <level>:` and `CV3 unsupported:`. Each selector must select exactly one
test: check its full name and the runner summary's total **1** before recording cell evidence;
zero, multiple or skipped tests do not establish that cell's result.
Retain a literal test/variant/level/count/seed/command manifest and prove no requested assertion
is missing or duplicated; never use one `--filter=I5:` for the whole multi-level corpus.

Qualification can hide a level. Reconcile the current manual population with the published
offers before executing: an unadapted fixed manual list requesting a now-hidden level is a
test/publication compatibility blocker for an assigned MS18c follow-up, not a zero-test pass,
permission to drop its assertion silently, or permission to enable hidden production requests.
Record every intended population change under final qualification. Fixed GG/GR recipes use
their separate diagnostic guards and remain complete.
Complete the difficulty suite through checklist section 7's disjoint offered-level/non-batch
manifest after the first selected shard; never repeat it in a whole-suite command. Record a
qualified-hidden Nightmare as absent from the offered manifest, not as a zero-test pass.
GD jobs 1/no --jobs; prefer latest matching-source per-level measurements,
including r6b's CV3/reuse outcomes and current Hell 1 evidence. Label older MS05b3
measurements with their actual source/allowance; they are not proved upper bounds.
Preflight every final CV3 cell before launching. A >450-second projection or missing credible
bound stops that command and creates a named final item; no automatic new tooling task and no MS05b3 deferral as a
final pass or silently omitted. Preserve counts and record current-source actuals; each command
under 540 seconds. A selector with no tests is not a pass. Use r6b's measured per-app standing
cost and current projections, not the obsolete one-minute/fifteen-second comments.
Use the shared lock for all commands expected over 10 seconds. **Announce to the orchestrator
before starting (pentomino runs in parallel on the same machine).** 540-second process ceiling (check-list section 7).
S-OD4 lets the task continue after a time/availability finding, not claim release gates passed.
Record unsatisfied final gates and pending PR CI explicitly. A change to a recorded gate needs
the owner; correctness/evidence corruption stops immediately. CV6's target remains S-OD1,
its performance-only stop is superseded. No new evidence class to hide a slow cell.
No new --all/--manual/browser/SG_DEEP permission is inferred.

## Definition of done & handoff

Return final B/T and gate verdicts, exact source/default/version identifiers, documents, counts,
durations, complete item audit, final-tree workflow audit, matching-head PR-CI status and usage if available.
The orchestrator owns logs/commit/release;
leave this Execution log empty.

## Resume rules — S-OD4

Review: orchestrator only. Correctness/evidence corruption or a proposed recorded-decision change
stops for the owner. Time/availability lets independent work continue but never turns an unsatisfied
release gate or pending PR check green. Use `Invoke-Dv3Node`, <=540 s, for all possibly >10-second
payloads, and keep the final bounded quick/deep manifests distinct. No new slow-cell evidence class.
The complete item audit and final-tree CI ownership above are mandatory parts of the final reply.

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
