# MS05r6 — Recovery acceptance milestone (r6a/r6b/r6c; not a dispatch)

| Header | Value |
|---|---|
| Depends on | MS05r6a step evidence, MS05r6b combined audit, then MS05r6c CI on the same candidate |
| Size / active time | Split; use the two dispatch files, not the former 45-60-minute estimate |
| Machine time | r6a 20-45 minutes; r6b 25-60 minutes; all invocations <=540 s |
| Acceptance | One combined boundary after r6b audit plus r6c CI, none at r6a |
| Authority | S-OD2; FS27-FS30; all original b1/b2/c/d and early b3 duties retained |
| Status | Superseded as a dispatch; preserved requirement/routing record |

## Current routing — binding S-OD3/S-OD4 resume amendment

- [MS05r4](MS05r4-select-recovery-allowance.md) selected 256; its original-limit mega failures
  remain historical. r5p/r5/r5m replace that prerequisite under S-OD3/S-OD4.
- [MS05r6a](MS05r6a-final-evidence-and-pins.md) owns the final-source compatibility/recheck,
  G13 persistence first, complete 520/5/14 E and listed default/golden pin repairs. Step evidence only;
  approximately 2-3 hands-on hours plus 20-45 machine minutes.
- [MS05r6b](MS05r6b-quick-gd-and-combined-acceptance.md) owns every final quick/GD assertion,
  early-manual reconciliation, measured standing quick cost/AGENTS/guides and the **sole
  combined audit**, including r5m's deep records and b3's live CV3 outcomes (Addendum B1).
  Approximately 1.5-2.5 hands-on hours plus 25-60 machine minutes.
- [MS05r6c](MS05r6c-ci-test-tiers.md) closes bounded quick CI after r6b, inside the combined commit.
  Its body states that pause commit a7f6660 was not green and was not acceptance.
- S-OD4 controls stops/reviews/items; performance-only findings continue with numbers and named
  MS07e/MS18c/MS18d owners. G13 persistence and the approved mega tier replacement are now allowed.

| Retained original requirement | Current evidence owner |
|---|---|
| MS05r6-B01/B02/B03 | r6a and r6b, combined audit at r6b |
| MS05r6-T01 | r4 history, r6a approved-contract recheck, r6b quick/deep reconciliation, r6c CI |
| MS05r6-T02 | r6a complete 520/5/14 E; r6b final no-generation merge checks |
| MS05r6-T03/T04 | r6b complete quick, classic9 GD and reconciled early/deferred manual coverage |
| MS05r6-T05/T06 | r6b combined duty/identity/commit audit and standing-cost acknowledgement package |

**Everything below is the archived pre-split contract.** Its late first preflight, old task
artifact paths, generic assertion-ownership wording and estimate are not executable instructions.
Use the current dispatch files and checklist. Historical/frozen references to “r6 acceptance”
mean r6b's audit with r6c's CI closure; no frozen r1-r4 instruction/log requires an edit.
Leave the Execution log for the orchestrator's combined sign-off.

## Archived pre-split specification

## Goal & business context

Finish the real requiredness improvement with its selected measured allowance, unchanged fixed
requests and complete validation. No green intermediate checkpoint was promised. If the measured
policy still cannot meet G13, mega or full quick, return the numbers to the owner rather than
turning the recovery into an unapproved slower contract.

## Scope

In: original-contract closure, final-source complete GG/GR, genuine replay/steps/player pins,
complete bounded quick coverage, classic9 GD, reconciliation of b3's early manual evidence and
one combined review package. Out: any new production policy, cap choice, source optimization,
guard/time-factor increase, G13 wire expansion, different request or new mega fallback assertion.

## Repository rules

AGENTS/checklist; no developer staging/commits/ref changes, resets, pack/log edits or discarding
the working tree. Keep MS05b1's interim evidence separate. Announce each measured shard and
obtain the exclusive slot; use `Invoke-Dv3Node`, jobs 1/no `--jobs`, <=540 s. Preflight projected
cost <=450 s; an unknown/single-test bound is not permission to start an unbounded run.

## Inputs & context

Required handoffs: r1 profiles; r2 consumer/prefix/manual changes; r3 counter/shard tests;
r4 288 selecting + 12 non-selecting outcomes and finite winner; r5 tooling/planned quick
manifest; b3 parity/early I5/CV3 results and explicit `deferred-cv3.json` (empty if none).
Preserve all original MS05b1 B/T requirements; only its independent acceptance boundary moved.

### A — Original-contract preflight, before fresh E

1. Generate **the actual G13 request** once with its original 120000 ms generation guard,
   normal maxAttempts/default allowance and no diagnostic override. Record result/error,
   generation time, attempts, exact/required/score/warnings and copied work. This is a
   generation-only preflight, not a golden or independent-validity pass.
2. Run mega12 and mega16 Nightmare's original two-test groups, separately:
   four seeds 1..4 and CV5's 3/3/4, unmodified `60000` ms generation guard and
   `SG.test.timeLimit(3000)` / `SG.test.timeLimit(10000)` design assertions. Record the actual
   factor/environment; do not set a friendlier factor. A fallback is not exempted.
3. If any fails, stop before E and bring the data to the owner. Never persist G13, alter a
   budget/request or change mega's assertions as a repair. Successful preflights do not replace
   final quick assertions; retain them in final coverage only if their full source identity
   and expected test keys still match, otherwise rerun those keys on the final source.

Create a small owned `generator/tests/artifacts/difficulty-v3/MS05r6/g13-closure.cjs`.
Its exact generation core is:

```js
const path = require('path');
const loader = require(path.resolve('tests', 'replay-fixtures.js'));
const env = loader.nodeEnv();
env.engine();
const SG = loader.loadFixtures(['tests/fixtures/replay-goldens.js']);
const g = SG.fixtures.replayGoldens.find((entry) => entry.id === 'G13');
if (!g || g.request.variantId !== 'samurai' || g.request.difficulty !== 'nightmare' ||
    String(g.request.seed) !== '42' || loader.BUDGET_MS !== 120000) {
  throw new Error('G13 closure request/guard changed');
}
const result = SG.pipeline.run(SG.store.toConfig(g.request), null,
  SG.budget.create({ ms: loader.BUDGET_MS }));
```

Wrap that one call with a wall timer and catch/write of the truthful outcome. Use the existing
loader identity plus the script hash, normal configuration and default value in the JSON;
write one fresh project-relative file atomically, never over old evidence. Return exit 1 on
generation error, 0 only for a completed run. No instrumentation wrapper, second request,
retry, source patch, saved result or replacement 500-second diagnostic budget. Record copied
`result.work`; on error partial work may be unavailable, with a reason rather than zero.
This script is task evidence tooling, not a new public test/recorder contract.

From Generator, with the helper in the same shell invocation:

```powershell
Invoke-Dv3Node -Task MS05r6 -NodeArgs @('tests\artifacts\difficulty-v3\MS05r6\g13-closure.cjs','--json=..\docs\difficulty-v3\evidence\MS05r6\preflight\G13.json')
Invoke-Dv3Node -Task MS05r6 -NodeArgs @('tests\node-runner.js','--suite=mega','--filter=> mega puzzles > mega12 nightmare:','--verbose','--results=..\docs\difficulty-v3\evidence\MS05r6\preflight\mega12-nightmare.json')
Invoke-Dv3Node -Task MS05r6 -NodeArgs @('tests\node-runner.js','--suite=mega','--filter=> mega puzzles > mega16 nightmare:','--verbose','--results=..\docs\difficulty-v3\evidence\MS05r6\preflight\mega16-nightmare.json')
```

Preflight each mega selector with `--list-tests` first; it selects exactly two existing tests.
When they pass all original calls ran; a failed test may have aborted its loop, so record the
unexecuted remainder, not four successful seeds. Allow roughly 1-120 s for G13 plus overhead
and 1-240 s for each mega group, subject to the actual projection.

### B — Freeze, complete GG/GR, then coupled pins

Finish every engine/locale/production comment before recording. Freeze the selected no-override
default; record current source/manifest identities. r4's experiment source differs only by its
documented default-literal edit. Do not mix its overrides or interim b1 ledgers into final E.

1. Record all four wires G09-G12 into `evidence/MS05r6/wire`.
2. Check complete merge, review intentional differences, write/check the wire fixture.
3. **After publishing wire**, record every analysis G01-G14 into `evidence/MS05r6/analysis`,
   starting with G13. Its 120000 ms recorder guard stays unchanged. Complete strict merge,
   review fields, write/check the analysis fixture.
4. Record all 26 hash combinations x all 20 fixed seeds = 520 keys into
   `evidence/MS05r6/hashes`. Use <=5 seeds/shard, smaller only to meet the process bound.
   Review each changed-key class against HEAD **and** b1's interim 149 improved/56 shallow
   classifications. R5 promises six-cell hit preservation, not preservation of all 149 puzzle
   identities; explain actual gains/losses rather than claiming that broader guarantee.
5. Complete strict GG merge, review, write/check. Keep requests/keys/seed arrays unchanged.
6. Update genuine coupled quick-test pins, especially G06/G07 in `steps`, `replay` and
   Generator `player`, from the fresh complete analysis. Keep their semantic branch/proof
   assertions; do not replace exact values with permissive/truthy checks or remove a case.
   A former branch absent from its changed golden needs the same assertion against an existing
   appropriate fixed example; if none exists, report rather than discard coverage.

Exact payloads (expand the **complete** checklist E manifest, not just these examples):

```powershell
Invoke-Dv3Node -Task MS05r6 -NodeArgs @('tests\replay-fixtures.js','--ids=G09','--record=..\docs\difficulty-v3\evidence\MS05r6\wire\G09.json')
# Repeat G10-G12; an expected pre-write mismatch is recorded, never a successful check.
Invoke-Dv3Node -Task MS05r6 -AllowExit1 -NodeArgs @('tests\replay-fixtures.js','--merge=..\docs\difficulty-v3\evidence\MS05r6\wire','--check')
Invoke-Dv3Node -Task MS05r6 -NodeArgs @('tests\replay-fixtures.js','--merge=..\docs\difficulty-v3\evidence\MS05r6\wire','--write')
Invoke-Dv3Node -Task MS05r6 -NodeArgs @('tests\replay-fixtures.js','--merge=..\docs\difficulty-v3\evidence\MS05r6\wire','--check')
Invoke-Dv3Node -Task MS05r6 -NodeArgs @('tests\replay-goldens.js','--ids=G13','--record=..\docs\difficulty-v3\evidence\MS05r6\analysis\G13.json')
# Repeat G01-G12 and G14 once, then inspect the complete merge.
Invoke-Dv3Node -Task MS05r6 -AllowExit1 -NodeArgs @('tests\replay-goldens.js','--merge=..\docs\difficulty-v3\evidence\MS05r6\analysis','--check')
Invoke-Dv3Node -Task MS05r6 -NodeArgs @('tests\replay-goldens.js','--merge=..\docs\difficulty-v3\evidence\MS05r6\analysis','--write')
Invoke-Dv3Node -Task MS05r6 -NodeArgs @('tests\replay-goldens.js','--merge=..\docs\difficulty-v3\evidence\MS05r6\analysis','--check')
Invoke-Dv3Node -Task MS05r6 -NodeArgs @('tests\perf.js','--hash-key=classic4/veryEasy','--hash-from=0','--hash-count=5','--hash-record=..\docs\difficulty-v3\evidence\MS05r6\hashes\classic4-veryEasy-00.json')
# Complete all 520 keys, then inspect the complete merge before writing.
Invoke-Dv3Node -Task MS05r6 -AllowExit1 -NodeArgs @('tests\perf.js','--hash-merge=..\docs\difficulty-v3\evidence\MS05r6\hashes','--check-hashes')
Invoke-Dv3Node -Task MS05r6 -NodeArgs @('tests\perf.js','--hash-merge=..\docs\difficulty-v3\evidence\MS05r6\hashes','--update-hashes')
Invoke-Dv3Node -Task MS05r6 -NodeArgs @('tests\perf.js','--hash-merge=..\docs\difficulty-v3\evidence\MS05r6\hashes','--check-hashes')
```

`-AllowExit1` permits inspection of an **expected stale-value comparison only**. Missing,
duplicate, unexpected, stale-source or failed-generation entries still stop before any write.
No weakened merge, old G13 substitution or added G13 wire. No GH is needed: no technique/help
source changes in this recovery. If a hashed source changes, replace all affected final ledgers;
do not edit their digest or count a comment-only change as exempt.

### C — Full quick coverage on the final source

Re-list both default quick sets after b3/new tooling and every pin/document update. Freeze
inventory/source identities and reconcile r5's draft. First run the relevant real G13
consumers and the remaining heavy suite shards with the original 120000 ms guards, then all
other shards. Prefer existing suite/describe cache boundaries where they fit.

```powershell
Invoke-Dv3Node -Task MS05r6 -NodeArgs @('tests\node-runner.js','--list-tests=..\docs\difficulty-v3\evidence\MS05r6\quick\generator-inventory.json')
Invoke-Dv3Node -Task MS05r6 -NodeArgs @('tests\node-runner.js','--suite=pipeline','--verbose','--results=..\docs\difficulty-v3\evidence\MS05r6\quick\generator-pipeline.json')
```

The second command is allowed only if its current projection <=450 s; otherwise use preflighted
describe/`--exact` shards from the manifest. The same applies to every other suite. From Player:

```powershell
Set-Location ..\player
Invoke-Dv3Node -Task MS05r6 -NodeArgs @('tests\node-runner.js','--list-tests=..\docs\difficulty-v3\evidence\MS05r6\quick\player-inventory.json')
Invoke-Dv3Node -Task MS05r6 -NodeArgs @('tests\node-runner.js','--verbose','--results=..\docs\difficulty-v3\evidence\MS05r6\quick\player-all.json')
```

Retain an already completed preflight as a shard only if the r5 identity/selection contract
matches this final inventory; otherwise rerun it and count only the final row. Use a coverage
reconciler over raw results: exactly every inventory key once for each app, zero missing/
duplicate/unexpected, same source/Node/factor, no bail/zero-test/incomplete process and no new
skips. Preserve existing explicit environment skips with their reasons, never add one to avoid
a failure. Report total machine time honestly; do not call this a <=540 s whole quick command.

Any remaining quick failure is an S-OD2 owner stop, **including** mega latency/fallback assertions.
The classic9 manual availability exception below never applies to a quick assertion.

### D — Retained manual gates and combined audit

Run all MS05d classic9 GD obligations using checklist section 7's per-level and non-batch
manifest, same offered levels and 100 requests (20 for Hell levels), no `--manual`/`--all`.
Preflight/reconcile the registered tests using r5's listing, retain each command's raw results.
Nightmare first, then other levels and every non-batch group exactly once:

```powershell
Set-Location ..\generator
Invoke-Dv3Node -Task MS05r6 -AllowExit1 -NodeArgs @('tests\node-runner.js','--suite=difficulty','--filter=time) > nightmare >','--verbose','--results=..\docs\difficulty-v3\evidence\MS05r6\gd\classic9-nightmare.json')
Invoke-Dv3Node -Task MS05r6 -NodeArgs @('tests\node-runner.js','--suite=difficulty','--filter=difficulty > digger.generate: guarantees','--verbose','--results=..\docs\difficulty-v3\evidence\MS05r6\gd\guarantees.json')
```

Before a 100-request batch, project its **unchanged total**. A batch that cannot fit is an
outstanding gate and owner stop, not permission to lower its count or average smaller medians.

Reconcile b3's full I5/CV3/refusal manifest. Its early evidence may be retained when application,
manual corpus/assertions, Node/factor/default/request identities are unchanged; a test-runner
fingerprint change caused solely by later golden/pin publication needs a documented file-diff
compatibility check, not relabelled JSON. Rerun any genuinely affected cell. r6 owns b3's exact
deferred CV3 list; if still >450 s or without a credible bound, **stop for the owner** rather
than launch, waive, prune or push it to release. No deferred row is a passed gate.

Per-puzzle validity/uniqueness/requiredness, digLevel, cancellation, request timeouts and missing
coverage block. Existing intermediate **aggregate hit-rate** failures, or classic9 median-time
assertions coupled to the requiredness hit loss, may remain recorded under the accepted R4/GD
exception, with exact counts/times and named MS18c/MS18d handoff. They stay failed assertions;
do not call all GD green. This grants no new exception to quick tests or S-OD1's CV6.

## Files to create/modify (exclusive ownership)

- Final E fixtures `generator/tests/fixtures/regression.js`, `replay-wire.js`, `replay-goldens.js`.
- Intentional coupled assertions in Generator `steps`, `replay`, `player` suites; their exact
  semantic coverage retained. Other quick assertion edits need explicit orchestrator assignment.
- Recovery closure/reconciliation scripts under `generator/tests/artifacts/difficulty-v3/MS05r6/`;
  evidence/MS05r6, v3 notes, cap/profile reports and completion facts in the affected guides/designs.
- No engine/recorder/request/test-budget/default-policy edit. No G13 saved-wire manifest expansion.

## Implementation steps

1. Review every prerequisite B/T result and finite selection; preserve baseline artifacts.
2. Run A's original-contract preflights. Stop immediately for a remaining failure.
3. Freeze and execute B's complete final-source E; review/update only coupled genuine pins.
4. Execute/reconcile C's full final quick manifests for both apps; no unbounded whole Generator run.
5. Complete D's classic9 GD and reconcile every early manual/deferred row.
6. Produce one combined acceptance table covering b1 and r1-r6/b3 plus absorbed b2/c/d duties.
   List every allowed intermediate availability failure separately from passing evidence.
7. Hand the full candidate to the orchestrator. Developer makes no commit.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS05r6-B01 | Requiredness remains active with the measured common default and truthful fallbacks |
| MS05r6-B02 | Every fixed request and correctness contract survives; no slower contract is smuggled in |
| MS05r6-B03 | Only a complete recovery is accepted; remaining failures return to the owner with numbers |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS05r6-T01 | Original G13 guard and both original mega Nightmare groups pass without override |
| MS05r6-T02 | Final-source 520 GG keys, four wires and fourteen analyses complete, explained, written and checked |
| MS05r6-T03 | Both full quick inventories reconcile exactly once; every required assertion passes |
| MS05r6-T04 | Classic9 GD and early I5/CV3/refusal coverage complete, only explicitly permitted intermediate failures retained |
| MS05r6-T05 | All original b1 and absorbed b2/c/d B/T duties plus r1-r5/b3 step evidence have an audited outcome |
| MS05r6-T06 | One reviewed final source, fixed requests, no checkpoint commits, no unapproved guard/default/fallback change |

## Test plan and gates

Phases A-D above are the complete executable plan: original-contract preflight, complete E,
every final quick assertion, classic9 GD and reconciled early manual coverage. Preserve their
requests, guards, order, exact selection manifests and named failure treatment. No GQ, GH,
GP, browser, `--all`, `--manual` or `SG_DEEP` run is authorized by this recovery task.

## Timing, stop rules and commit plan

Planning: preflights 2-8 minutes; E 12-45; full quick 10-30; classic9/deferred GD 10-25.
Use actual projections; these ranges are not permissions to exceed 540 s per invocation.
Every run that may exceed 10 s needs the announced shared-machine slot and lock.
Do not overlap this work with Pentomino or another Sudoku command.

**Owner stops:** none winner (r4); selected-setting invalid/error diagnostic; G13/mega guard,
latency or quick failure; incomplete/still-unbounded required coverage; invalid/ambiguous
puzzle; untrustworthy/mixed-source evidence. Return the selected setting, original request,
work split/cap hits/attempts, actual time/error/limit, source, and the full four-setting
diagnostic table. G13 persistence or mega fallback-assertion changes are owner decisions then,
not authorized recovery work. Do not proceed to MS05e or commit an incomplete bundle.

On complete acceptance, the orchestrator makes **one meaningful combined commit**:
`difficulty-v3 MS05: required exactness with measured bounded recovery`.
Include b1's retained implementation, r1-r6/b3 tooling/selection/contracts, relevant evidence
and docs as one reviewed unit, with the required commit trailers. No reconstructing a series
of independently green intermediate commits and no extra parent/tooling checkpoint commits.
Private backup refs are orchestrator safeguards, not branch acceptance.

## Definition of done & handoff

Return acceptance IDs, manifests/counts/durations, request/default/source identities, explained
GG/GR diffs, full quick totals, GD outcomes and named availability handoffs. MS05e starts only
after this combined acceptance is reviewed and committed; MS06a still waits for MS05e's
separate S-OD1 disposition. Preserve every earlier stopped/failed outcome as history.

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
