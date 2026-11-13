# MS05r6a — Persist G13, final-source E and coupled assertion pins

| Header | Value |
|---|---|
| Depends on | Retained r1-r4 selection/evidence, r5p/r5/r5m and MS05b3 step evidence; S-OD3/S-OD4 contracts |
| Size / active time | Medium pin/code scope; evidence-heavy operation, approximately 2-3 hours hands-on |
| Machine time | Approximately 20-45 minutes, plus replacements if a candidate changes; <=540 s/invocation |
| Acceptance | Step evidence complete only; r6b alone accepts the recovery; no commit |
| Authority / review | S-OD2-S-OD4, CV6-03 (d), FS27-FS29; analyst cross-review |
| Status | Not started |

## Goal & business context

Persist G13 before freezing the complete current-source evidence and deliberately changed assertions.
The mega prerequisite is the approved S-OD3/S-OD4 contract, not fictional passes of r4's old limits.
The separate handoff prevents a
late full-GD failure from leaving an unreported E/publication state on the open tree.

## Scope

In: G13 saved-wire expansion, final-source approved-contract compatibility/recheck, complete GG/GR, genuine
replay/steps/player pins and the reviewed r4 default-pin list, focused checks and evidence.
Out: production/default changes, any other request-manifest expansion, guard/factor changes,
mega contract redesign, full quick/GD acceptance or a branch commit.

## Repository rules

Read AGENTS/checklist. No developer staging, commits, backups/ref changes, resets, pack/log
edits or discarding work. Preserve every earlier artifact; use `evidence/MS05r6a/`.
Announce each bounded run, obtain the shared slot, use `Invoke-Dv3Node`, jobs 1/no `--jobs`.
Project compound commands <=450 s and finish each <=540 s. Inspect each exit before the next
dependent action; do not run the whole E matrix in an unbounded shell loop.
Commands run from `generator/`; establish that app directory and the helper in each
PowerShell invocation rather than assuming a previous call's shell state persists.

The 2-3 hour estimate is hands-on evidence operation/review, not a falsely short coding task.
The orchestrator owns private backups and acceptance; this step writes no branch checkpoint.

## Inputs & context

Read r4's selection/failed original preflights and `default-pin-manifest.json` (pins and returned
premises are both empty at HEAD); r3's `quick-contracts.json`; r5p's new diagnostics; r5 tooling;
r5m's deep/quick mapping and b3's manual/reuse/item manifests. Keep allowance 256 and size-default
attempts, with no diagnostic override during E.

### A0 — G13 persistence first (S-OD3 (d))

Before any final-source recording, add **only G13** to `SG.fixtures.replayRecording.WIRE_IDS`
(`generator/tests/fixtures/replay-recording.js:32` at HEAD). The manifest becomes G09-G13, five
wires. All fourteen analysis requests stay byte-for-byte identical; G13 is samurai Nightmare seed 42,
now using the normal two-attempt size default. G14's request and its analysis-only status are unchanged;
it now uses the two-attempt default, so its B.2 analysis may change and is reviewed with the others.

Own the recorder header/rendering and related fixture tests. `replay-fixtures.js` header and
`replay-goldens.js` wire documentation currently say four/G09-G12. The `replay-recorders` suite
pins four IDs and `REQUESTS.slice(8,12)` at lines 60-67, treats G13 as an unknown wire ID around
845, and tests four-record reconstruction around 927. Migrate those specific expectations to five;
keep rejection coverage with a genuinely unknown ID, not deletion of the negative test.

`steps.golden`, `replay.entry` and Generator `player.goldenResult` already prefer `WIRE[id]`.
Write the G13 branch test in A0, using a spy that forbids pipeline regeneration. It must pass
after B.1 publishes the five-wire fixture and before B.2 starts; the saved G13 wire does not exist
yet in A0. Exercise the real fresh analysis after B.2 publishes it and C resolves coupled pins,
without bypassing semantic assertions. No Player-app fixture or external export changes.
Update directly related living fixture/test documentation.

The recorder still **regenerates** G13 under BUDGET_MS=120000. Persistence only removes repeated
generation in quick consumers, not the fresh wire/analysis obligation or that guard.

### A — Final-source approved-contract recheck

Create `evidence/MS05r6a/preflight/compatibility.json`, one row per G13/mega check:

```text
priorEvidence, currentInputIdentities, compatible, reason, action:'retain'|'rerun'|'record-item',
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
The old r4 eight-attempt preflight is not compatible with r5p. The script's embedded `task:'MS05r4'`
is its producer label: retain it and its hash; record this fresh invocation as r6a in the outer manifest.

r5m owns the original mega requests/relations in its deep tool and their separately inventoried
quick replacements. Reconcile deep records by actual relevant engine/config/tool/check identities;
do not rerun all fourteen just because E or a guide changed. Where a broad loader hash changes only
for G13 persistence, record the exact compatibility diff; never patch a digest. A meaningful
generation/check change requires fresh affected evidence. Recheck quick replacements using their
current inventory names, not the former two-test groups.

```powershell
# Only when G13's relevant identities require a rerun:
Invoke-Dv3Node -Task MS05r6a -NodeArgs @('tests\artifacts\difficulty-v3\MS05r4\g13-closure.cjs','--json=..\docs\difficulty-v3\evidence\MS05r6a\preflight\G13.json')
Invoke-Dv3Node -Task MS05r6a -NodeArgs @('tests\node-runner.js','--suite=mega,mega-contract','--list-tests=..\docs\difficulty-v3\evidence\MS05r6a\preflight\mega-selection.json')
# Run only the copied quick replacement names with --exact and fresh --results paths.
# Reconcile r5m's deep records without generation through its approved tool/compatibility path.
```

G13 remains at 120000 ms and normal attempts. Mega retains seeds 1..4 and independent CV5's
3/3/4 in the deep tier with board-default attempts and the 500 s diagnostic ceiling; quick uses
the r5m replacement contract. The old 6/20-second Nightmare promise is historical, not a new pin.
Do not run a preflight again just because it has a new task ID when a valid compatible record
is retained. These rows become final quick coverage only if r6b's exact identity/key checks allow.

### B — Frozen source, complete GG/GR

Finish every production/locale/comment change before recording. Verify the frozen source,
finite default and manifest identities. If a production/measurement fix is still needed,
return it to its owner and replace invalidated selection/diagnostic/preflight evidence.
This task makes no such fix. Never mix interim b1/trial ledgers with final-source records.

1. Record wires G09-G13; check the complete merge, review, write/check the wire fixture.
   Then run A0's focused G13 saved-wire branch test under `Invoke-Dv3Node`; it must pass before B.2.
2. **Only after publishing wire**, record all analyses G01-G14, starting with G13. Its
   recorder guard stays 120000 ms. Complete strict merge, review all changes, write/check.
3. Record all 26 hash combinations x all 20 fixed seeds = **520 keys**, <=5 seeds/shard,
   smaller only to meet the process bound. Complete strict merge, review, write/check.
4. Explain changed-key classes against HEAD and b1's interim 149 improved/56 shallow record.
   R5 guarantees six-cell hit preservation, not preservation of all 149 puzzle identities.
   Account separately for the selected allowance and r5p's size-default change; the old mega16
   attempt-6 diagnostic hit is knowingly unavailable at the new default. Keep every fixed key/seed;
   the only enlarged wire manifest is the approved addition of G13.

Use the **complete checklist E manifest**, not only these first-record examples:

```powershell
Invoke-Dv3Node -Task MS05r6a -NodeArgs @('tests\replay-fixtures.js','--ids=G09','--record=..\docs\difficulty-v3\evidence\MS05r6a\wire\G09.json')
# Repeat G10-G13; inspect an expected stale-value comparison before any write.
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
- `generator/tests/fixtures/replay-recording.js`, `generator/tests/replay-fixtures.js`,
  `replay-goldens.js`, `suites/replay-recorders.test.js`: the G13-only persistence scope above.
- Generator `steps`, `replay`, `player` suites' intentional coupled assertions, and the exact
  quick suite files/tests enumerated in the reviewed r4 default-pin manifest.
- Evidence/MS05r6a, notes, associated completion facts in the affected guides/designs;
  task-owned reconciliation scripts under `generator/tests/artifacts/difficulty-v3/MS05r6a/`.
- Directly coupled `docs/puzzle-exchange/fixtures.md` living saved-wire facts, if needed.
- No engine/default/guard edit or other request expansion. New unexplained
  files/failures require orchestrator assignment/classification, not opportunistic repairs.

## Implementation steps

1. Review approved prerequisites/selection and the owned pin list; implement A0's G13 persistence first.
2. Complete A's compatibility/recheck; distinguish S-OD4 items from correctness failures.
3. Freeze and complete B, preserving wire-before-analysis and all 520/5/14 identities.
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
| MS05r6a-T01 | G13 persistence/120 s guard and the approved mega quick/deep contract have current compatible evidence and honest item status |
| MS05r6a-T02 | Complete 520 GG keys, five wires and fourteen analyses are explained, written and checked |
| MS05r6a-T03 | Every listed default/golden pin has a justified exact update and passing bounded selection |
| MS05r6a-T04 | The handoff states exact publication/source status; full quick/GD/combined acceptance remain r6b |

## Test plan and gates

A-C are the executable plan. Check pure reconciliation helpers with synthetic missing,
duplicate, unexpected and mixed-source records; use the existing strict E tools for publication.
Expected operating allowance is 2-3 hours hands-on plus 20-45 machine minutes; use actual
per-command projections. Every invocation <=540 s, locked/announced, one process at a time.
No full quick, GD, GQ, GH, GP, browser, `--all`, `--manual` or `SG_DEEP` run here.

## Stop rules

Apply S-OD4: stop for invalid output, wrong flags/warnings, corrupt/misrepresented evidence,
unjustified pins or a proposed recorded-decision change. A guard or command-cost exceedance
becomes a named numerical item for MS07e/MS18c/MS18d; continue independent work. Do not write
an incomplete E merge, substitute an old G13 record, raise its guard or fake an original-limit
pass. If E is incomplete, state exactly what could not be published; an item is not acceptance.

## Definition of done & handoff

Hand r6b the frozen candidate, complete E/compatibility/pin manifests and focused results.
r6b owns final quick/GD/deep reconciliation, per-app standing cost and the combined audit; r6c
then closes CI inside the same commit. Include the inherited/new S-OD4 item list.
If a later assigned pin fix returns here, preserve prior evidence and replace every affected
identity/coverage record; do not silently append a pass to stale data. One commit only after r6b/r6c.

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
