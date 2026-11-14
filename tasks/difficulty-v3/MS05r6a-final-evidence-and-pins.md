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

**Binding IR07 lock rule:**

> Without the lock, run only commands known to be short: registration-only listings (`--list-tests`),
> `--reconcile`, parity or plan scripts that generate nothing, and commands measured under 10 s on the
> same source. A command that generates puzzles and whose projection is above 10 s, or unknown, runs
> under `Invoke-Dv3Node` from the start. A kill timer is no exemption: no unlocked trial runs.

Do not reuse the unlocked-trial path of
`generator/tests/artifacts/difficulty-v3/MS05b3/run-cells.ps1`. This applies from the start to
G13 preflights, wire/analysis recordings, hash shards, generation-bearing quick selections and
any MEGA-REFRESH request. The no-generation examples are unlocked only while known short;
a flag name or a stopped probe is not evidence that an unknown command fits ten seconds.

The 2-3 hour estimate is hands-on evidence operation/review, not a falsely short coding task.
The orchestrator owns private backups and acceptance; this step writes no branch checkpoint.

## Inputs & context

Read r4's selection/failed original preflights and `default-pin-manifest.json` (pins and returned
premises are both empty at HEAD); r3's `quick-contracts.json`; r5p's new diagnostics; r5 tooling;
r5m's deep/quick mapping and b3's live CV3/manual/item manifests under binding Addendum B1.
The mega CV3 rows are `generation: live`, with r5m occurrence ids as references, not reused puzzles.
Keep allowance 256 and size-default attempts, with no diagnostic override during E.

**MS05b3 handoff at this dispatch (SA1 review section 7.4):** all 186 manual cells ran
(53 I5, 118 CV3 levels, 15 refusals); 167 passed and 19 retain failed availability assertions.
`deferred-cv3.json` has no outstanding cells. This task does not repeat those manual runs.
Carry their original fingerprints/statuses to r6b C's explicit IR08 compatibility audit.
The IR07 incident does not invalidate their correctness/availability, but `slot: none` timings
must remain labelled unprotected, not become protected projections or measurements for this task.

Link these actual b3 artifacts in the compatibility handoff:
`docs/difficulty-v3/evidence/MS05b3/cv3/cv3-mega16-nightmare.json`,
`cv3/cv3-mega12-nightmare.json`, `mega-reconciled.json` and `mega-reconciled-after.json`
(the latter three paths are relative to the same MS05b3 evidence directory).
Both deep match fields were true before the legacy-8 round. Its store-only proof is
`docs/difficulty-v3/evidence/MS05r5p/legacy-8-fix/store-diff.patch`, against the producer snapshot
`refs/dv3-wip/MS05r5m-done-20261114-0230` (`ad77fdf`), supplied read-only by the orchestrator.
After that round a false `currentMatches.sourceHash` is expected; apply A item 4, not a blanket
fourteen-record refresh. R6b C also applies that proof to the 186 manual results. Finish the
legacy-8 source/document changes before freezing E; this does not relax E's strict publication rules.

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
quick replacements. Apply the following explicit **IR04 deep-identity audit**:

1. Run `tests/mega-contract.js --reconcile` against the effective fourteen-record directory and save
   a fresh JSON outside that directory. Read **both**
   `identity.currentMatches.sourceHash === true` and `identity.currentMatches.toolHash === true`.
   `currentMatches` is an object, not one boolean; exit 0 does **not** establish compatibility
   (`exitCodeOfReconciliation` ignores these fields). Check completeness, evidence soundness,
   correctness and every original relation separately; missing/corrupt evidence is still a stop.
2. Record the actual old/current identities and both match fields in `compatibility.json`, together
   with the effective record paths and b3's live CV3 outcome links. The current hashes are available
   from the tool's exported `currentIdentity()`, called outside the runner-loaded suite. Compare
   request/normalized config/default/allowance, checks/protocol, Node, machine and guards as above.
   Even if both hashes match, review the unhashed shared paths: `replay-fixtures.js`'s `loadFixtures`
   and `nodeEnv`, and `tool-records.js`'s `withRequestedLevel`. A generation/check change there still
   invalidates affected evidence; G13-only recorder/rendering changes do not imply a loader change.
3. If either hash is false, list every changed file, including the complete changed `SOURCE_FILES`
   set and any changed tool/shared-loader/helper files. Obtain the actual producer source snapshot
   from the orchestrator and bind it to the recorded hash; a dirty record's commit or a diff against
   HEAD alone is not that snapshot. Retain the exact old-to-current diffs and their identities.
4. An **exact-diff compatibility proof** may retain the records when every changed source file lies
   outside the generation path: neither `SG.pipeline.normalizeConfig` nor `SG.pipeline.run` executes
   the changed code or depends on its effects. Prove that initialization/shared state, request
   normalization, RNG, generation, independent validation, recording and relations are unchanged.
   The tool/check identity must still match. An approved store-only CV6-04 migration fix, or another
   UI-only change, can qualify; a `js/ui/` path alone is not proof. `store.js` is in `SOURCE_FILES`, although
   these deep requests never call the store, so its edit can make all fourteen source matches false
   without invalidating their generation. G13 persistence itself currently changes neither mega hash;
   still review any shared-loader/helper diff for effects on the mega path.
5. Link the proof and its file/occurrence scope in `compatibility.json`. Keep the tool's false match
   values and the original records/hashes/times intact; report "retained by exact-diff compatibility",
   not "current hashes match" or a new timing measurement. If compatibility cannot be proved, execute
   **MS05r6a-MEGA-REFRESH** in A1. Never patch a digest, narrow `SOURCE_FILES`, or edit the tool to
   turn a mismatch into a match.

Do not regenerate fourteen requests merely because E, a guide or the task ID changed. Recheck the
quick replacements using their current inventory names, not the former two-test groups. B3's five
live CV3 requests are separate executions; their occurrence-id references do not add deep occurrences
or substitute for the independent CV5 repeats.

```powershell
# Only when G13's relevant identities require a rerun:
Invoke-Dv3Node -Task MS05r6a -NodeArgs @('tests\artifacts\difficulty-v3\MS05r4\g13-closure.cjs','--json=..\docs\difficulty-v3\evidence\MS05r6a\preflight\G13.json')
Invoke-Dv3Node -Task MS05r6a -NodeArgs @('tests\node-runner.js','--suite=mega,mega-contract','--list-tests=..\docs\difficulty-v3\evidence\MS05r6a\preflight\mega-selection.json')
# Run only the copied quick replacement names with --exact and fresh --results paths.
# No generation; currently under a second, so no lock is required by check-list section 7.
node tests\mega-contract.js --reconcile=..\docs\difficulty-v3\evidence\MS05r5m\records --json=..\docs\difficulty-v3\evidence\MS05r6a\preflight\mega-reconciled.json
# Inspect identity.currentMatches.sourceHash and .toolHash, not only the exit code.
```

The command names the original r5m directory. If a reviewed refresh already supplies the effective
records, use that directory and a fresh output name; keep the prior reconciliation.

G13 remains at 120000 ms and normal attempts. Mega retains seeds 1..4 and independent CV5's
3/3/4 in the deep tier with board-default attempts and the 500 s diagnostic ceiling; quick uses
the r5m replacement contract. The old 6/20-second Nightmare promise is historical, not a new pin.
Do not run a preflight again just because it has a new task ID when a valid compatible record
is retained. These rows become final quick coverage only if r6b's exact identity/key checks allow.

### A1 — MS05r6a-MEGA-REFRESH (only invalidated deep evidence)

If A cannot establish compatibility, name this step in the handoff and list its changed identities,
affected occurrence ids/relations, projections and replacement paths before running it. Freeze the
relevant sources/tools, then regenerate affected records through the existing one-request tool,
one `Invoke-Dv3Node` per occurrence, with the original requests/defaults and 500 s diagnostic budget.
Do not edit the tool, its fixture or the request manifest. Preserve every old record as historical.

The current reconciler requires one source/tool identity across all fourteen records. A changed
common generation/check identity therefore affects the whole fourteen-record cohort unless A's
non-generation-file compatibility exception applies; do not combine old-hash records with new-hash
ones or collapse independent CV5 calls. Record a complete effective cohort under a fresh directory:

```powershell
Invoke-Dv3Node -Task MS05r6a -NodeArgs @('tests\mega-contract.js','--request=mega12-invariant-1','--record=..\docs\difficulty-v3\evidence\MS05r6a\mega-refresh\records\mega12-invariant-1.json')
# Repeat for each affected occurrence, one separately inspected locked command; no generation loop.
node tests\mega-contract.js --reconcile=..\docs\difficulty-v3\evidence\MS05r6a\mega-refresh\records --json=..\docs\difficulty-v3\evidence\MS05r6a\mega-refresh\reconciled.json
```

Inspect the fresh reconciliation's two `currentMatches` fields, completeness, checks and relations;
replace the effective-evidence links in `compatibility.json`, not the original digests. A timeout is
an unavailable request/unevaluated relation and named S-OD4 item, never a passing replacement.
The tool returns 3 for a generation/check error or unfinished checks; inspect the written record
even when the lock helper reports failure, and classify the actual error, not merely its exit code.
Missing or corrupt prior evidence remains a correctness stop, not something a refresh conceals.
Report refresh time separately; it is not standing quick cost.

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
affected E ledgers, including a comment-only change. A's mega compatibility exception does not
relax E's strict publication identity or r6b's final quick fingerprints.
No GH: no technique/help source changes.

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
2. Complete A's explicit currentMatches/compatibility audit and recheck; when required, execute
   A1's named MS05r6a-MEGA-REFRESH step. Distinguish S-OD4 items from correctness failures.
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
| MS05r6a-T01 | G13 persistence/120 s guard and the mega contract have honest current evidence; both deep currentMatches fields are checked, with an exact-diff non-generation-file proof or named MEGA-REFRESH for mismatches |
| MS05r6a-T02 | Complete 520 GG keys, five wires and fourteen analyses are explained, written and checked |
| MS05r6a-T03 | Every listed default/golden pin has a justified exact update and passing bounded selection |
| MS05r6a-T04 | The handoff states exact publication/source status; full quick/GD/combined acceptance remain r6b |

## Test plan and gates

A-C are the executable plan. Check pure reconciliation helpers with synthetic missing,
duplicate, unexpected and mixed-source records; use the existing strict E tools for publication.
Expected operating allowance is 2-3 hours hands-on plus 20-45 machine minutes; use actual
per-command projections. Every possibly >10 s invocation is locked/announced, <=540 s, one process
at a time, with unknown generation projections locked from the start. The explicitly identified
subsecond no-generation reconciliations need no lock only while known short; no unlocked trial path.
No full quick, GD, GQ, GH, GP, browser, `--all`, `--manual` or `SG_DEEP` run here.

## Stop rules

Apply S-OD4: stop for invalid output, wrong flags/warnings, corrupt/misrepresented evidence,
unjustified pins or a proposed recorded-decision change. A guard or command-cost exceedance
becomes a named numerical item for MS07e/MS18c/MS18d; continue independent work. Do not write
an incomplete E merge, substitute an old G13 record, raise its guard or fake an original-limit
pass. If E is incomplete, state exactly what could not be published; an item is not acceptance.

## Definition of done & handoff

Hand r6b the frozen candidate, complete E/compatibility/pin manifests and focused results,
including the raw deep currentMatches fields, exact diffs/proof, any MEGA-REFRESH record paths and
b3's live CV3 outcomes with deep occurrence-id references.
Carry the IR07 incident/timing labels and IR08 store-only proof links with that handoff;
do not turn retained manual outcomes into new runs or slot-protected measurements.
r6b owns final quick/GD/deep reconciliation, per-app standing cost and the combined audit; r6c
then closes CI inside the same commit. Include the inherited/new S-OD4 item list.
If a later assigned pin fix returns here, preserve prior evidence and replace every affected
identity/coverage record; do not silently append a pass to stale data. One commit only after r6b/r6c.

## Execution log

| Field | Value |
|---|---|
| Status | Step evidence complete (S-OD2; no acceptance or commit of its own; the combined commit follows MS05r6b and MS05r6c) |
| Start | 2026-11-14 07:07 (+07:00) |
| End | 2026-11-14 09:13 developer; fix round 09:40-09:51 (IR10, IR11); 10:00 orchestrator review and backup ref |
| Duration | 2 h 06 min + 11 min fix round (Pentomino's MP12b1 alternated with every lock turn; longest wait 310 s); about 25 min review |
| Model | claude-sonnet-5.5 (developer); analyst implementation review claude-opus-5.5 (SA1, `docs/difficulty-v3/claude-opus-5.5/10-review-of-recovery-steps.md` §8); orchestrator review claude-opus-5.5 |
| Token usage | 296 model calls; 113,492,103 input tokens (112,257,791 cache reads); 317,362 output tokens |
| AI credits | about 1,748 (developer) |
| Verification | Developer (`evidence/MS05r6a/`): G13 persistence tests 3/3 after publication; fresh G13 recheck 21.872 s of 120 s (2 attempts, score 1637, not exact, both warnings); E recorded by the exact routes and published (`replay-wire.js`, `replay-goldens.js`, `regression.js`), final merge checks pass; pins: 15 changed or new tests each pass by `--exact`; full runs `steps` 57, `replay` 153, `player` 69, `replay-recorders` 39, `perf-tooling` 31, Generator `help`+`ui-contract` 97, store group 251, Player `help`+`ui-contract` 89, `mega` quick 4, `mega-contract` 37. Orchestrator re-run under the lock: `replay-recorders,steps,replay,player,mega-contract,help,ui-contract` 452/452 (173.7 s): the `steps`, `replay` and `player` pins failing since MS05b1 now pass. SA1's review: correctness and E hold, nothing to redo |
| Acceptance | MS05r6a-B01, B02 and T01..T04 met. G13 persisted (`WIRE_IDS` G09-G13; the refusal test now uses G14). E on the final source: wires G09-G12 differ from HEAD only by the new `work` field, G13 new; analyses G06 (now ends at 2348, was 1678) and G07 (2340, was 1938) changed, both now required puzzles as MS05b1 found, the other 12 unchanged; 520 hashes, 9 changed against HEAD (against MS04: 371 unchanged, 140 of MS05b1's 149 improvements kept, 5 return to MS04's puzzle, 4 third puzzles). IR10 measured outside E (15 requests): of the 9 changed keys, the allowance alone explains 6, the size default alone 1, the allowance with the size default's cut 2; the 81-cell keys change by the allowance only. Deep records kept by the exact-diff proof (`store.js` only, equal to `store-diff.patch`; tool files identical); no MEGA-REFRESH. 13 pins re-derived (`pins/resolved.json`), the guides' example and `design.md` updated |
| Issues & resolutions | (1) Specimens that went with the old G06/G07 (multi-move jump 3 to 2, same end position 3 to 2, new hardest at a flat score 3 to 2, reveal fold 3 to 1): SA1 found no test weakened; IR11's search of the `player` suite's 11 fixed results found no second reveal fold, so G11 stays the single specimen, coverage item **MS05r6a-COV01** for MS18e. (2) Compounds (one locked call of several independent shard processes, each projected, at most 450 s): accepted by SA1 and the orchestrator; the driver now carries per-item projections (IR12), and the check-list states the rule. (3) The owned-file list was recorded after exploration (process note). (4) Non-generating merges, listings and git comparisons ran unlocked (under 1 s, git about 10 s), within IR07 |
| Handoff | MS05r6b: the final E and pins; 3 new and 7 renamed test names are renames in the inventory (IR13); partial suite times `player` 139.1 s, `steps` 11.5 s, `replay` 11.1 s (S-AV08); MS05r6a-COV01 for MS18e. Items: S-AV04 updated (G13 21.9 s of 120 s); S-AV01..S-AV03, S-AV05..S-AV13 carried |
