# MS18e — Final correctness and release evidence closure

| Header | Value |
|---|---|
| Depends on | MS18d accepted; all required owner actions resolved |
| Size / active time | Small; 25-40 minutes plus GD/quick |
| Owner / milestone | Release evidence; M18 complete |
| Authority | R20-R24 and every implemented resolution |
| Status | Not started |

## Goal & business context

Close the feature only when the final source, correctness, availability and cost evidence agree.
This task does not deploy, push, commit or edit the orchestrator's task logs.

## Scope and repository rules

In: final GD/quick checks, evidence completeness review, living documentation/release record.
Out: code/tuning/fixture repairs, blanket all/manual/browser runs, editing analysis reports or pack.
AGENTS/checklist; CRLF, both guide languages; no Git writes.

## Inputs & context

Final invariants: rating/cache 3, history/wire 1, 40 IDs/34 unscoped, two uniqueness IDs, fixed weights/
bands, selected cap/C and frozen pattern limits. Exact means canonical solved/in-band/required;
legacy history/imports remain honest. Complete final 135-cell qualification and >=90% performance
matrix use the accepted source/configuration. Fixed 520 hashes remain present.

R20, verbatim:

> Record every reclassification, the old and v3 labels/requiredness, and the causing technique in
> `docs/difficulty-v3/notes.md`, in the task that introduces the change.

Consolidate, do not invent missing earlier evidence. Verify current references, old-history
retention, shallow warning/Retry and proof coverage are all documented in both languages.
S0 baseline old 202/204 versus qualified 91/204 is not a v3 result. Include isolated target and final
matched comparisons, per-cell losses, omitted levels and all performance misses.
No new floor certificate or target leaks into the external Player exchange.
Anchors at `f788e02`: `generator/tests/manual/difficulty.test.js:1232`
(`hits the requested level in at least 90 %`), `:1262` (`I5: every puzzle has a complete proof`),
`:1413` (`expect(puzzle.exact)` in `digLevel makes one attempt`);
`generator/js/ui/cache.js:47` (`const SCHEMA_VERSION = 2` before MS17b),
`generator/js/ui/history.js:19` (`const VERSION = 1`). Find the quoted tests after later changes.

## Files to create/modify

- New `docs/difficulty-v3/release-v3.md`, notes/evidence links, docs/README.md.
- Applicable living Generator/Player designs and both user/developer guides, correcting actual final facts.
- No application, expected fixture, historical analysis report or task-pack file.

## Implementation steps

1. Check every task's output/evidence handoff against the final source identity and intended manifests.
2. Run final named GD and both quick sets; every correctness failure blocks completion.
3. Consolidate actual counts, settings, versions, compatibility, availability and costs.
4. Write release evidence with unresolved failures explicitly blocking release, never a fabricated pass.
5. Give the orchestrator data to fill its release record/logs/summary and make the accepted commit.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS18e-B01 | Players and the owner receive truthful v3 behavior, limitations and availability |
| MS18e-B02 | No unperformed or failed gate is reported as passed |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS18e-T01 | Final GD and both quick sets pass; source/version/default identities are reconciled |
| MS18e-T02 | GS/GQ/GP/GG/GR/GH coverage and reclassification/compatibility records are complete |
| MS18e-T03 | Living EN+VI docs match the code; no code or pack edits in this closure task |

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
Invoke-Dv3Node -Task MS18e -NodeArgs @('tests\node-runner.js')
```

Player, under the same lock: `Invoke-Dv3Node -Task MS18e -NodeArgs @('tests\node-runner.js')`.
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
GD jobs 1/no --jobs; prefer latest matching-source/post-allowance per-level measurements,
including MS05d's deferred-CV3 outcomes and current Hell 1 evidence. Label older MS05b3
measurements with their actual source/allowance; they are not proved upper bounds.
Preflight every final CV3 cell before launching. A >450-second projection or missing credible
bound stops that command for assigned bounded completion; no MS05b3 deferral is inherited as a
final pass or silently omitted. Preserve counts and record current-source actuals; each command
under 540 seconds. A selector with no tests is not a pass. Quick baseline was about one minute
Generator and fifteen seconds Player, but record actual expanded-suite counts/times.
Use the shared lock for all commands expected over 10 seconds. **Announce to the orchestrator
before starting (pentomino runs in parallel on the same machine).** Ten-minute command ceiling.
Final offered-level hit or timing failures are not waived by the earlier intermediate rule:
record the failed gate and obtain an explicit owner disposition before release. S-OD1 controls CV6.
No new --all/--manual/browser/SG_DEEP permission is inferred.

## Definition of done & handoff

Return final B/T and gate verdicts, exact source/default/version identifiers, documents, counts,
durations, remaining risks and actual usage if available. The orchestrator owns logs/commit/release;
leave this Execution log empty.

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
