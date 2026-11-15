# MS07f — Move the approved slow checks to the manual tier

| Header | Value |
|---|---|
| Depends on | MS08a accepted and committed; S-OD8 approval of MS07e's section 9 proposal |
| Size / active time | Small–Medium; 30–45 minutes plus bounded quick/manual verification |
| Owner / milestone | Generator tooling; M7f approved quick-tier closure, before MS08b |
| Authority / review | S-OD8, 2026-11-15 14:42; S-AV08; orchestrator review |
| Gates owned | Both complete quick sets, only the four relocated manual cases, r6c CI inventory/group check |
| Status | Not started |

## Goal and scope

Reduce the standing quick cost by changing test membership, not what is tested. The owner
approved exactly the four cases proposed in
`docs/difficulty-v3/qualification-checkpoint-2026-11-15.md` §9, including the loss of their
PR-CI coverage. Three move wholly; the fourth keeps its classic9 request quick and moves
its two mega16 requests to one manual case.

Run **after MS08a**, not beside it: that task owns the current engine/fixtures/quick manifest.
Use its accepted source as the before-move baseline and finish before MS08b. No engine,
solver, generator, support-list, qualification, budget, weight, seed or expected-fixture change.
No other test moves, including `difficulty-floor`'s small-generated-samples case, even if the
new total remains above five minutes. S-OD7's Killer disposition is not implemented here.

Read AGENTS/checklist; no developer Git, task-pack or Execution-log edits. CRLF, UTF-8 without
BOM, final newline, no trailing whitespace. All possibly >10-second work uses `Invoke-Dv3Node`;
credible projection <=450 s, process ceiling 540 s, one locked command and the existing gap.
This task authorizes only the named manual selectors, never whole `perf`/`variants`, `--all`,
`--manual`, `SG_DEEP`, GP, GQ, GG/GR/GH or a fixture rewrite.

## Exact relocation contract

Anchors below are from the MS07e source; locate the same symbols after MS08a.

| Original source and test | Destination | Preserve |
|---|---|---|
| `generator/tests/suites/pipeline.test.js:654`, `generating puzzles: verbosity 'off' costs less than 2%` | `generator/tests/manual/perf.test.js`, independent `describe('instrumented generators: what the events cost', ...)` | `expect(costRatio(generateWork, 'off', 1.02, 5)).toBeLessThan(1.02);`, timeout 120000 |
| Same file `:658`, `generating puzzles: verbosity 'summary' costs less than 10%` | Same manual describe | `expect(costRatio(generateWork, 'summary', 1.10, 4)).toBeLessThan(1.10);`, timeout 120000 |
| Same file `:662`, `generating puzzles: verbosity 'full' costs less than 35%` | Same manual describe | `expect(costRatio(generateWork, 'full', 1.35, 4)).toBeLessThan(1.35);`, timeout 120000 |
| **Generator** `tests/suites/player.test.js:563`, `real top-level results with clues shown again replay faithfully (mega16, classic9)` | Quick case renamed `(classic9)`; one new case `(mega16)` under `describe('player: the replay steps of a result', ...)` in `generator/tests/manual/variants.test.js` | Quick: `['classic9', 'hell1', 3]`. Manual, original order: `['mega16', 'nightmare', 478576959]`, `['mega16', 'hell1', 2422420669]`. Identical loop assertions/helpers and timeout 60000 for each resulting test |

This is the Generator's **`player` suite/shard**, not `replay.test.js` and not the Player app.
The only allowed replay-body change is partitioning that three-element input array. Keep every
request tuple, `realResult` call, `expectFaithful` check and final/intermediate-value assertion
byte for byte. Test titles/containers may change to describe the actual partition; record the
old/new full names. Do not substitute saved goldens or a stub for either real mega16 generation.

Copy the necessary helpers without changing them. For the ratios this includes `now`, `emitFor`,
`bestTimes`, `costRatio`, `generateWork` and the same classic9 model construction. Preserve the
warm-up, six interleaved rounds, Easy seeds 1–24, Normal seeds 1–2 and the 5/4/4 **measurement**
attempt counts; they are not generator `maxAttempts` overrides. Helpers still used by quick
digging/full-grid/event tests stay there; do not move the whole describe.

For the replay case retain/copy its needed private `realResult`, `analysisOf`, `viewsOf`,
`stepsOf`, `clues`, `sameValues` and `expectFaithful` helpers and aliases/caches unchanged.
Use isolated describe/IIFE scope where needed, not a new application or shared fixture API.
Keep the existing quick helpers and other replay/structure cases.

**Manual does not mean warn-only.** `perf.test.js` currently has warn-only timing samples.
The three relocated ratio assertions remain hard failures, in their own describe: no
`SG.test.skip`, warning wrapper, catch-and-ignore, relaxed threshold or changed timeout.
The mega16 case is independent of the variant sweep's lazy corpus; selecting it must not
construct every supported level or run the aggregate CV3/CV4/CV5 checks.

Expected membership delta relative to the accepted post-MS08a tree: quick tests **-3**,
Generator `player` test count unchanged, manual tests **+4**, total registered tests **+1**
because the old three-request replay case becomes two cases. Suite count is unchanged.
Derive actual inventories; do not copy the historical 3,505/154/69 totals over MS08a's changes.

## Files to modify

- The four test files in the relocation table, including their directly affected header comments.
- `.github/scripts/generator-quick.json`: current shard counts, provenance, measured seconds and
  justified projections for groups `pipeline` and `replay-player`, preserving all other MS08a
  additions. Keep the existing group/job IDs, factor 3, overhead and timeout limits.
- `DEVELOPERGUIDE.md`, `DEVELOPERGUIDE.vn.md`, `generator/design.md` test-tier/count sections
  (15.1/15.2/15.4 and any other directly affected count references).
- `docs/difficulty-v3/recovery-quick-cost.md`: append the new measured standing-cost section,
  preserving every earlier source's observations; update its current-status pointer.
- `docs/difficulty-v3/evidence/MS07f/`: inventories, relocation map, results, timing/CI records.

No new suite/file in application script lists. The existing two manual suites are already loaded
by their normal test routes; no `tests.html`, workflow, runner, fixture or production-code edit
is expected. Report a genuinely required out-of-list change for assignment.

## Before/after evidence and implementation

1. Record the accepted MS08a identity, Node/machine/time factor, complete quick inventories and
   the original full test names/bodies/request lists. Make a relocation map with old/new file
   and full name, each preserved request, assertion/helper comparison and final selector.
   The orchestrator's source review must show only the approved relocation/scaffolding/docs/manifest.
2. Obtain the **before** complete quick times for both apps. Prefer MS08a's accepted final result
   files when their fingerprints/environment match this pre-move tree; otherwise collect one
   bounded complete before set. Do not rerun valid matching evidence merely for this task.
   MS07e's 692.1 s Generator and 33.5 s Player figures are historical context, not this baseline.
3. Perform the exact moves/split and update both language guides, design and inventory counts.
   State the accepted CI loss explicitly: the three generation-cost ratios and the two real
   mega16 replays no longer gate PRs; classic9 Hell 1, the structural event tests, short
   digging/full-grid cost tests and G01-G14 replay goldens remain quick. The latter do not
   constitute the two relocated mega16 requests.
4. Freeze all fingerprinted files before the final manual/quick records. Preflight the named
   selectors, run the relocated cases and both complete quick sets on that source, and retain
   failed outcomes honestly. No assertion may be changed to get a pass.
5. Reconcile quick coverage against the new inventory (every current key exactly once, no
   missing/duplicate/unexpected key), and reconcile the relocated map against all four manual
   case results. Verify the classic9-only case was exercised in the complete quick run.
6. Update r6c's manifest from the actual inventories/times and run its registration/group check.
   Both workflows retain their matrix/group names and exclude the manual tier. Lower projections
   only with measured margin, never by blindly subtracting the proposal's historical estimates.
   The current quick fingerprint excludes `.github/`, evidence and `recovery-quick-cost.md`;
   if that contract changed in MS08a, respect the actual inputs rather than invalidating a
   final result through a later metadata edit.
7. Publish before/after per-app process-wall sum/max, shard/test counts, fingerprints and
   lock waits separately; report absolute/percentage change and the moved-case times. Distinguish
   runner body time, process time and lock wait. Fill the un-fingerprinted cost report after
   measurement; do not put newly measured seconds into a hashed guide after its final checks.

The proposal's "about 300 s" is **not a passing threshold or a promise**. Its 392.1 s includes
the approximately 6 s classic9 request which stays quick, and MS08a may change the timings.
Report the actual result even if it exceeds five minutes; further moves require another decision.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS07f-B01 | The approved quick-cost reduction changes tier membership only; every original workload, request and assertion survives |
| MS07f-B02 | The owner-approved CI loss is explicit, with manual validation now and a final MS18e owner, not forgotten coverage |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS07f-T01 | Exactly the three ratio cases move to manual `perf`, with original helpers/workloads/assertions/limits/timeouts; they remain hard failures |
| MS07f-T02 | The replay case keeps classic9 Hell 1 seed 3 quick and moves the two exact mega16 tuples to one manual `variants` case; assertion bodies and helpers are unchanged |
| MS07f-T03 | The before/after inventories and relocation map account for the -3/+4 membership delta; both complete quick sets and the four selected manual cases have actual results with no new skip |
| MS07f-T04 | The r6c manifest/group check passes on the final inventory, preserving MS08a's additions, existing groups and unchanged CI limits/factor; manual cases are outside CI |
| MS07f-T05 | Both developer guides/design are accurate; source-qualified before/after quick costs are recorded for both apps; no production, qualification, expected-fixture or other tier change |

## Test plan and bounded commands

From `generator`, first list each selector with `--list-tests`: selected totals must be **3**
for the ratios and **1** for the two-mega replay case. Verify the renamed quick classic9 case
also registers once, retaining its original callback and timeout. Lists generate nothing.

```powershell
Invoke-Dv3Node -Task MS07f -AllowExit1 -NodeArgs @('tests\node-runner.js','--suite=perf','--filter=> instrumented generators: what the events cost > generating puzzles:','--verbose','--results=..\docs\difficulty-v3\evidence\MS07f\manual\ratios.json')
Invoke-Dv3Node -Task MS07f -AllowExit1 -NodeArgs @('tests\node-runner.js','--suite=variants','--filter=> player: the replay steps of a result > real top-level results with clues shown again replay faithfully (mega16)','--verbose','--results=..\docs\difficulty-v3\evidence\MS07f\manual\mega-replay.json')
```

The old ratios total about 281 s and the whole old replay case about 111 s; these are projections
only. Re-project after MS08a, with margin; split the three ratios into their individual exact
selectors if their combined command cannot credibly fit 450 s. Never run either whole manual suite.
The classic9 case needs no duplicate generation outside the full quick verification.
`-AllowExit1` preserves a raw failed result for reporting; it never waives an assertion or
turns a performance-only failure into a pass.

Run the four current r6c Generator groups through the lock, recording each shard with the
existing `generator-quick.js run <group> --results-dir=<...>` entry; run the Player's complete
quick set under its normal bounded route. Keep the same process-sum timing convention as the
before record. Finish with `.github/scripts/generator-suites.sh check` (registration/group
validation only); use Git bash on Windows as the earlier tasks do, not Git actions.
No source/fixture-generation tool is authorized by this tier move.

## Definition of done and handoff

Return the relocation map and exact manual selectors, current quick/CI coverage, strict manual
verdicts, before/after per-app times and the complete item list. S-AV08 routes here; report its
actual disposition rather than asserting a five-minute target was met. MS08b follows this task.
MS18e reruns these exact four manual cases on the final source and audits S-OD8. MS18c owns
any later diagnostic-only support override needed to retain a fixed mega request after hiding
a level; do not change a request or assertion or add that override prematurely here.

Review is orchestrator-only under S-OD4. Correctness/evidence corruption or changing a recorded
decision stops; a timing finding is retained with numbers, never used to relax an assertion.
No Git/pack/log edits by the developer.

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
