# MS05r6a — Final-source E and coupled assertion pins

| Header | Value |
|---|---|
| Depends on | r1-r5 and post-selection MS05b3 step evidence; r4 finite selection and passed original-limit preflights |
| Size / active time | Medium pin/code scope; evidence-heavy operation, approximately 2-3 hours hands-on |
| Machine time | Approximately 20-45 minutes, plus replacements if a candidate changes; <=540 s/invocation |
| Acceptance | Step evidence complete only; r6b alone accepts the recovery; no commit |
| Authority | S-OD2, FS27/FS28/FS29; original r6 phases A/B and unchanged R5 |
| Status | Not started |

## Goal & business context

Close the current-source output evidence and deliberately changed assertions before the final
quick/GD audit. Early original-limit failures already stop at r4; do not spend this evidence
operation on a candidate whose guards were never closed. The separate handoff prevents a
late full-GD failure from leaving an unreported E/publication state on the open tree.

## Scope

In: final-source compatibility/recheck of original G13/mega guards, complete GG/GR, genuine
replay/steps/player pins and the reviewed r4 default-pin list, focused checks and evidence.
Out: changing production/default/recorder policy, request manifests, guards/factors, G13
persistence, mega fallback assertions, full quick/GD acceptance or a branch commit.

## Repository rules

Read AGENTS/checklist. No developer staging, commits, backups/ref changes, resets, pack/log
edits or discarding work. Preserve every earlier artifact; use `evidence/MS05r6a/`.
Announce each bounded run, obtain the shared slot, use `Invoke-Dv3Node`, jobs 1/no `--jobs`.
Project compound commands <=450 s and finish each <=540 s. Inspect each exit before the next
dependent action; do not run the whole E matrix in an unbounded shell loop.
Commands run from `Q:\git\sudoku\generator`; establish that directory and the helper in each
PowerShell invocation rather than assuming a previous call's shell state persists.

The 2-3 hour estimate is hands-on evidence operation/review, not a falsely short coding task.
The orchestrator owns private backups and acceptance; this step writes no branch checkpoint.

## Inputs & context

Read r4's selection/diagnostic data, original-limit preflights and `default-pin-manifest.json`;
r3's `quick-contracts.json`; r5's tooling/draft; b3's early manual/deferred manifests.
The production default must equal the recorded finite R5 winner. No diagnostic override.

### A — Final-source original-contract recheck

Create `evidence/MS05r6a/preflight/compatibility.json`, one row per G13/mega check:

```text
priorEvidence, currentInputIdentities, compatible, reason, action:'retain'|'rerun',
effectiveEvidence, outcome
```

Compare production/loader/protocol/script identities, actual request/config/default, Node,
machine and guard; for mega also compare the suite, runner/harness and actual time factor.
Keep old evidence under its real identity. Retention is an explicit compatibility proof,
not rewriting an old JSON hash/date or calling an old timing a new measurement.

G13's exact request/guard script is r4's owned `g13-closure.cjs`; reuse it unchanged.
Unrelated test/document changes do not by themselves change its generation contract, but any
changed relevant input requires a rerun. The fresh G13 **analysis** in B is mandatory even
when this generation-only preflight is retained.

r5 changed the runner/harness: ordinarily both mega groups need a fresh run here. Use the
now-available listing/results flags; the original callbacks/requests/limits stay intact.
Each group must select exactly its two existing tests, pass both and skip none. A guard,
latency or behavioral failure is an owner stop, not a pin to refresh.

```powershell
# Only when G13's relevant identities require a rerun:
Invoke-Dv3Node -Task MS05r6a -NodeArgs @('tests\artifacts\difficulty-v3\MS05r4\g13-closure.cjs','--json=..\docs\difficulty-v3\evidence\MS05r6a\preflight\G13.json')
Invoke-Dv3Node -Task MS05r6a -NodeArgs @('tests\node-runner.js','--suite=mega','--filter=> mega puzzles > mega12 nightmare:','--list-tests=..\docs\difficulty-v3\evidence\MS05r6a\preflight\mega12-selection.json')
Invoke-Dv3Node -Task MS05r6a -NodeArgs @('tests\node-runner.js','--suite=mega','--filter=> mega puzzles > mega12 nightmare:','--verbose','--results=..\docs\difficulty-v3\evidence\MS05r6a\preflight\mega12-nightmare.json')
Invoke-Dv3Node -Task MS05r6a -NodeArgs @('tests\node-runner.js','--suite=mega','--filter=> mega puzzles > mega16 nightmare:','--list-tests=..\docs\difficulty-v3\evidence\MS05r6a\preflight\mega16-selection.json')
Invoke-Dv3Node -Task MS05r6a -NodeArgs @('tests\node-runner.js','--suite=mega','--filter=> mega puzzles > mega16 nightmare:','--verbose','--results=..\docs\difficulty-v3\evidence\MS05r6a\preflight\mega16-nightmare.json')
```

G13 remains at 120000 ms, normal attempts; mega retains seeds 1..4 and CV5's 3/3/4, 60000 ms
generation guards, `timeLimit(3000)`/`timeLimit(10000)` and the actual unchanged factor.
Do not run a preflight again just because it has a new task ID when a valid compatible record
is retained. These rows become final quick coverage only if r6b's exact identity/key checks allow.

### B — Frozen source, complete GG/GR

Finish every production/locale/comment change before recording. Verify the frozen source,
finite default and manifest identities. If a production/measurement fix is still needed,
return it to its owner and replace invalidated selection/diagnostic/preflight evidence.
This task makes no such fix. Never mix interim b1/trial ledgers with final-source records.

1. Record wires G09-G12; check the complete merge, review, write/check the wire fixture.
2. **Only after publishing wire**, record all analyses G01-G14, starting with G13. Its
   recorder guard stays 120000 ms. Complete strict merge, review all changes, write/check.
3. Record all 26 hash combinations x all 20 fixed seeds = **520 keys**, <=5 seeds/shard,
   smaller only to meet the process bound. Complete strict merge, review, write/check.
4. Explain changed-key classes against HEAD and b1's interim 149 improved/56 shallow record.
   R5 guarantees six-cell hit preservation, not preservation of all 149 puzzle identities.
   Keep every fixed request/key/seed; no replacement puzzle or enlarged wire manifest.

Use the **complete checklist E manifest**, not only these first-record examples:

```powershell
Invoke-Dv3Node -Task MS05r6a -NodeArgs @('tests\replay-fixtures.js','--ids=G09','--record=..\docs\difficulty-v3\evidence\MS05r6a\wire\G09.json')
# Repeat G10-G12; inspect an expected stale-value comparison before any write.
Invoke-Dv3Node -Task MS05r6a -AllowExit1 -NodeArgs @('tests\replay-fixtures.js','--merge=..\docs\difficulty-v3\evidence\MS05r6a\wire','--check')
Invoke-Dv3Node -Task MS05r6a -NodeArgs @('tests\replay-fixtures.js','--merge=..\docs\difficulty-v3\evidence\MS05r6a\wire','--write')
Invoke-Dv3Node -Task MS05r6a -NodeArgs @('tests\replay-fixtures.js','--merge=..\docs\difficulty-v3\evidence\MS05r6a\wire','--check')
Invoke-Dv3Node -Task MS05r6a -NodeArgs @('tests\replay-goldens.js','--ids=G13','--record=..\docs\difficulty-v3\evidence\MS05r6a\analysis\G13.json')
# Repeat G01-G12 and G14 once, then inspect the complete merge.
Invoke-Dv3Node -Task MS05r6a -AllowExit1 -NodeArgs @('tests\replay-goldens.js','--merge=..\docs\difficulty-v3\evidence\MS05r6a\analysis','--check')
Invoke-Dv3Node -Task MS05r6a -NodeArgs @('tests\replay-goldens.js','--merge=..\docs\difficulty-v3\evidence\MS05r6a\analysis','--write')
Invoke-Dv3Node -Task MS05r6a -NodeArgs @('tests\replay-goldens.js','--merge=..\docs\difficulty-v3\evidence\MS05r6a\analysis','--check')
Invoke-Dv3Node -Task MS05r6a -NodeArgs @('tests\perf.js','--hash-key=classic4/veryEasy','--hash-from=0','--hash-count=5','--hash-record=..\docs\difficulty-v3\evidence\MS05r6a\hashes\classic4-veryEasy-00.json')
# Complete all 520 keys, then inspect before updating the canonical fixture.
Invoke-Dv3Node -Task MS05r6a -AllowExit1 -NodeArgs @('tests\perf.js','--hash-merge=..\docs\difficulty-v3\evidence\MS05r6a\hashes','--check-hashes')
Invoke-Dv3Node -Task MS05r6a -NodeArgs @('tests\perf.js','--hash-merge=..\docs\difficulty-v3\evidence\MS05r6a\hashes','--update-hashes')
Invoke-Dv3Node -Task MS05r6a -NodeArgs @('tests\perf.js','--hash-merge=..\docs\difficulty-v3\evidence\MS05r6a\hashes','--check-hashes')
```

`-AllowExit1` only permits inspection of a stale-value comparison. Missing, duplicate,
unexpected, mixed-source or failed-generation entries stop **before writing**. Never weaken a
merge, substitute an old G13 record or edit a digest. A changed hashed source requires fresh
affected ledgers, including a comment-only change. No GH: no technique/help source changes.

### C — Explicitly owned pin repairs (FS29 part 3)

Own the **exact quick files/tests in the orchestrator-reviewed r4 pin manifest**, in addition
to the genuine coupled `steps`, `replay` and Generator `player` assertions (notably G06/G07).
Record the concrete owned file list in the handoff before editing; this is the named owner,
not a blanket exemption for failing tests. r3 still owns schema/no-allowance-premise fixes.

For each listed pin: retain its original request and behavioral requirement, derive the new
exact datum from the selected source/fresh complete analysis, update the precise expectation,
and record before/after, reason and verification. Do not turn strict equality into a permissive
check, drop an assertion or alter a correctness/latency/availability requirement.
If an old branch is absent from its changed golden, preserve that assertion against an
existing appropriate fixed example; if none exists, report rather than discard coverage.

Use r5's inventory to select every changed assertion by its actual full name. For example:

```powershell
Invoke-Dv3Node -Task MS05r6a -NodeArgs @('tests\node-runner.js','--suite=steps,replay,player','--list-tests=..\docs\difficulty-v3\evidence\MS05r6a\pins\replay-inventory.json')
```

For each manifest entry, copy its exact inventory name into `--exact=<full name>`, its actual
suite into `--suite=<name>` and a fresh `--results` path, all through `Invoke-Dv3Node`.
No zero-test/skipped selection is a pass. Group only disjoint known bounded cases; do not
run the old unbounded combined replay/steps/player command.
Write `evidence/MS05r6a/pins/resolved.json` reconciling **every** r4 entry plus each coupled
golden pin; unresolved or unjustified entries block this handoff.

## Files to create/modify (exclusive ownership)

- Final E fixtures `generator/tests/fixtures/regression.js`, `replay-wire.js`, `replay-goldens.js`.
- Generator `steps`, `replay`, `player` suites' intentional coupled assertions, and the exact
  quick suite files/tests enumerated in the reviewed r4 default-pin manifest.
- Evidence/MS05r6a, notes, associated completion facts in the affected guides/designs;
  task-owned reconciliation scripts under `generator/tests/artifacts/difficulty-v3/MS05r6a/`.
- No engine/default/recorder/request/guard edit, no G13 saved-wire expansion. New unexplained
  files/failures require orchestrator assignment/classification, not opportunistic repairs.

## Implementation steps

1. Review prerequisites, finite selection, r4 passed guards and the owned pin list.
2. Complete A's compatibility/recheck on the current source; stop on a real failure.
3. Freeze and complete B, preserving wire-before-analysis and all 520/4/14 identities.
4. Repair/verify C's explicitly owned pins and finish their documentation.
5. Write an evidence/publication-state handoff for r6b, including source/default identities,
   every gate count/exit/duration, all fixture/pin diffs and remaining manual/quick obligations.
6. Return **step evidence complete**; no combined acceptance or commit.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS05r6a-B01 | Final output evidence corresponds to the measured policy and every original request |
| MS05r6a-B02 | Intentional data pins are corrected without weakening the behavior they protect |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS05r6a-T01 | Current-source G13/mega guards have compatible retained or fresh passing evidence |
| MS05r6a-T02 | Complete 520 GG keys, four wires and fourteen analyses are explained, written and checked |
| MS05r6a-T03 | Every listed default/golden pin has a justified exact update and passing bounded selection |
| MS05r6a-T04 | The handoff states exact publication/source status; full quick/GD/combined acceptance remain r6b |

## Test plan and gates

A-C are the executable plan. Check pure reconciliation helpers with synthetic missing,
duplicate, unexpected and mixed-source records; use the existing strict E tools for publication.
Expected operating allowance is 2-3 hours hands-on plus 20-45 machine minutes; use actual
per-command projections. Every invocation <=540 s, locked/announced, one process at a time.
No full quick, GD, GQ, GH, GP, browser, `--all`, `--manual` or `SG_DEEP` run here.

## Stop rules

Stop on incompatible/unavailable guard evidence, any original-limit failure, incomplete or
unexplained E, invalid output, unjustified/unresolved pins or a required command that cannot
fit. Return actual source/default/request/work/time/error/limit and r4's four-setting table.
No new policy, guard, G13 persistence or mega fallback assertion. The orchestrator returns
semantic/performance failures to the owner; a written E alone is not acceptance.

## Definition of done & handoff

Hand r6b the frozen candidate, complete E/compatibility/pin manifests and focused results.
r6b owns all final quick/GD coverage, standing-cost acknowledgement and the combined audit.
If a later assigned pin fix returns here, preserve prior evidence and replace every affected
identity/coverage record; do not silently append a pass to stale data. One commit only after r6b.

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
