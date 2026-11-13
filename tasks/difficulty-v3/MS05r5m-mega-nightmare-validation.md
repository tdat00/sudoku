# MS05r5m — Mega Nightmare validation contract

| Header | Value |
|---|---|
| Depends on | MS05r5 tooling/step evidence; MS05r5p's final size policy; retained r4 selection 256 |
| Size / active time | Medium implementation, evidence operation; approximately 1.5-2 hours |
| Machine time | Approximately 20-40 minutes at the new defaults, projection only; <=540 s per process |
| Acceptance | Step evidence complete only; r6b reconciles these records, r6c closes CI, one combined commit |
| Authority / review | S-OD3 (a), SA1 conditions (i)-(iii), S-OD4/CV6-03; analyst cross-review |
| Status | Not started |

## Goal & business context

Replace the false routine quick-latency promise without losing any original request, correctness
assertion or same/different-seed relation. A slow deep run is not product qualification; a shallow
fallback is not exact. The approved deep tier is a tool, not a discovered `*.test.js` generation suite.

## Scope

In: the mega Nightmare quick/deep mapping, bounded per-request records and reconciliation, quick
replacements, pure tooling tests, CV3 reuse interface and documentation.
Out: engine/default/offer changes, R5 re-selection, browser/recorder/manual guard increases, global
time-factor changes, or running the old `SG_DEEP=1` branch. Other mega levels and G14 stay unchanged
here; MS07b separately owns the already authorized hell1 application.

## Repository rules

Read AGENTS/check-list; no Git/ref/backup/pack/log edits. Use `Invoke-Dv3Node` for every possibly
>10-second command, one announced locked request at a time, <=540 s/process and a 15-second gap.
No parallel requests and no compound seven-request callback. Preserve original failures and every
failed/incomplete attempt. This is S-OD3's named contract, not another evidence class/tooling task
invented to work around an unrelated slow cell.

## Inputs & context

At c9935cd, `generator/tests/suites/mega.test.js` has:

- `LEVELS` at line 22, containing nightmare and hell1.
- `generate(id, level, seed, extra)` at 653-658: `extra` already allows `{maxAttempts:1}`;
  generation guard 60000 ms. `SLOW=120000` is a harness argument, not this generation guard.
- `checkInvariants` at 662-684: uniqueness, valid Latin solution, givens/solution agreement, clue
  floor, band/group checks and soundness of every returned logical step.
- The two tests at 690-712: seeds 1,2,3,4, then separate CV5 calls 3,3,4 for each board.
- The old Nightmare time assertions use 3000/10000 ms times the actual harness factor
  (2 locally, 3 with CI); r4 measured failures, never passes.
- The old DEEP branch is a different 20-seed protocol and still counts matching names. It is not
  this contract and is not authorized by running a new tool.

### Frozen deep population and relations

| Board | Request IDs | Literal seeds | Effective attempts, no explicit override |
|---|---|---|---|
| mega12 | mega12-invariant-1 through mega12-invariant-4 | 1,2,3,4 | 4 |
| mega12 | mega12-cv5-a, mega12-cv5-b, mega12-cv5-other | 3,3,4 | 4 |
| mega16 | mega16-invariant-1 through mega16-invariant-4 | 1,2,3,4 | 2 |
| mega16 | mega16-cv5-a, mega16-cv5-b, mega16-cv5-other | 3,3,4 | 2 |

Every request is Nightmare, trace off, existing default symbol/options/symmetry/dig order. Keep
separate occurrence IDs for equal configurations: the CV5 seed-3 calls are **independent generation**,
not two reads of one record. Fourteen calls in all. Preserve same-seed givens, solution and score
equality and seed-4 versus seed-3 solution inequality, per board.

Run once after the last engine change (r5p). Each record uses the approved **500000 ms diagnostic
budget**, with no work/default override; normal attempts come from the board. Choose any narrower
reported per-board guard from completed fixed-population measurements with an explicit margin;
never extrapolate a successful seed 3 to unmeasured seeds. No guard exceeds 500 s and no process 540 s.
Record the old 6/20-second failures as replaced quick contracts, not changed design/qualification targets.

### Bounded tool and record contract

Create `generator/tests/mega-contract.js` using existing loader/record helpers. Its CLI:

```text
--list                                      list the fixed request/relationship manifest; no generation
--request=<one fixed ID> --record=<new.json>  exactly one real request once, plus its checks
--reconcile=<records directory> --json=<new.json>  no generation; validate all records and relations
```

Reject unknown/duplicate/conflicting options, missing IDs, overwrite, absolute/out-of-repository
paths and mixed identities. Use built-in modules and the established plain-wire representation.
An optional pure `tests/fixtures/mega-contract.js` owns the manifest, checks and reconciliation;
its discovered quick suite must use synthetic records/scripted producers, not the deep population.

Keep the existing source/tool/request/Node/guard identity conventions. Each raw record contains
the occurrence ID and original request, normalized configuration/effective attempts, allowance,
actual source-file and tool identities, Node/machine, elapsed generation and check time separately,
outcome/error, actual attempts/work, puzzle digest and owned plain wire when a puzzle returned.
Record every validation result explicitly. A killed process has incomplete evidence, not a result;
retain its transcript/item and never manufacture a successful row.

The fixed deep requests survive later qualification hiding. Use the existing diagnostic-only
`toolRecords.withRequestedLevel` guard when necessary, restore the original support array in
`finally`, and record that override. Never pass a hidden request through store normalization
that silently changes its level; this does not enable that level in the application.

Preserve all original invariant assertions on each corresponding request and add the shared
requiredness/warning contract on every returned puzzle:

```text
exact === (complete canonical rating in the requested level AND requiredOf(...).required === true)
approximate present iff !exact
shallow present iff !exact AND complete canonical rating is in the requested level
```

Independently verify valid solution, exactly one solution, givens/solution agreement, clue floor,
original band/group checks and every logical placement/elimination against the solution. A
fallback can be valid; it never waives these checks. Preserve budget/cancellation identity.
No timeout is turned into a returned best puzzle or an exact hit.

Reconciliation requires all 14 independent occurrence IDs exactly once, immutable request/config/
default identities and each original relation. Separate generation, correctness and timing verdicts.
An unavailable request retains its error and the resulting unevaluated relation; do not claim a
comparison passed without two puzzles. Under S-OD4 record the availability item and continue
other bounded work; a wrong puzzle/flag/warning or corrupt/missing evidence is a correctness stop.
A complete request-outcome inventory is not falsely labelled complete passing correctness.

### Quick replacements and CV3 reuse

Replace only the full-attempt Nightmare callbacks. Quick keeps:

1. A **real one-attempt mega12 Nightmare request**, seed 3 through `generate(..., {maxAttempts:1})`,
   all applicable invariants and exact/required/warning checks. Measure this completed smoke under
   the unchanged 60000 ms request ceiling and document a bounded smoke limit with stated margin;
   the old 6-second promise does not apply. This quick request is not one of the 14 deep occurrences.
2. A **scripted mega16 stop/fallback control** on the real pipeline/digger path, proving size-default
   termination, truthful two-warning shallow fallback, explicit override precedence and propagated
   cancellation/budget error. Reuse r5p's controlled seams; do not add a minute-long real mega16 attempt.

List old quick keys, their deep owners/relations and new quick keys separately. Use r5's inventory
to prove no unrelated test disappeared. Refresh the draft manifest after this replacement.

Provide a read-only record consumer for b3: match board, Nightmare, literal seed, normalized
configuration, current engine/defaults and producer/validation identities; decode the copied wire.
Mega16 CV3 uses invariant seeds 1/2, mega12 uses 1/2/3 (its volume is three). b3 applies its **own**
per-puzzle checks and availability threshold, not this tool's summary. Original generation time is
preserved; it is not a new 240 s guarded generation. Reusing these puzzles does not collapse CV5's
independently generated repeats.

## Files to create/modify (exclusive ownership)

- `generator/tests/suites/mega.test.js`, Nightmare mapping and quick controls only.
- New `generator/tests/mega-contract.js`, optional pure fixture, and
  `generator/tests/suites/mega-contract.test.js`; `generator/tests.html` fixture/suite entries.
- Existing r5 tooling is consumed, not redesigned. Pure reuse checks may be shared with b3.
- `generator/design.md` test-tier facts, both developer guides; user guides only if a stated
  performance promise needs correction, in both languages.
- `docs/difficulty-v3/notes.md`, `docs/difficulty-v3/evidence/MS05r5m/`, refreshed r5 draft manifest.
- No engine, canonical fixture, support list or workflow edit (r6c owns the first CI change).

## Implementation steps

1. Freeze the original seven-per-board request/relationship table and current r5p source/defaults.
2. Implement one-request recording and strict no-generation reconciliation; test with synthetic data.
3. Implement/map the two quick replacements, measure the mega12 smoke and document its margin.
4. Finish relevant source/tool changes before the first deep record. Run each of the 14 once, serially.
5. Reconcile requests/checks/relations and refresh quick membership. Hand b3 the immutable reuse inputs.
6. Hand r6a/r6b compatibility identities, timings and item list. They reconcile, not rerun merely
   because their task ID differs. A meaningful engine/config/check change requires fresh affected evidence.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS05r5m-B01 | Quick latency is not falsely promised; full original mega Nightmare correctness/relations remain accounted for |
| MS05r5m-B02 | A bounded fallback remains a miss, never an exception to final qualification |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS05r5m-T01 | Exactly 14 independent occurrence identities, board-default attempts and original CV5 relations reconcile |
| MS05r5m-T02 | Per-puzzle validity/uniqueness/soundness/exactness/warnings are checked; timing misses and unevaluated checks are explicit |
| MS05r5m-T03 | One-request 500 s diagnostics/540 s processes; no whole DEEP branch, dropped repeat, changed seed or time factor |
| MS05r5m-T04 | Quick mega12 real smoke and mega16 scripted control run; replacement mapping and draft inventory are complete |
| MS05r5m-T05 | Compatible records can supply CV3 puzzles without replacing CV3 checks or their original times |
| MS05r5m-T06 | Pure tooling checks, docs, CI handoff and cumulative S-OD4 item list are complete |

## Test plan and commands

Test missing/duplicate/unexpected occurrence, equal seeds with different occurrence IDs, incompatible
source/default/guard, tampered wire/digest, incorrect exact/warning, failed generation and relation mismatch.
Test same-seed score as well as arrays, and different-seed solution inequality. Unit tests generate no
deep puzzles. After r5 listing preflights, from Generator:

```powershell
Invoke-Dv3Node -Task MS05r5m -NodeArgs @('tests\node-runner.js','--suite=mega-contract,ui-contract,help')
Invoke-Dv3Node -Task MS05r5m -NodeArgs @('tests\mega-contract.js','--list')
Invoke-Dv3Node -Task MS05r5m -NodeArgs @('tests\mega-contract.js','--request=mega12-invariant-1','--record=..\docs\difficulty-v3\evidence\MS05r5m\records\mega12-invariant-1.json')
# Repeat once for each OTHER fixed occurrence, one locked invocation at a time, not one shell loop.
Invoke-Dv3Node -Task MS05r5m -NodeArgs @('tests\mega-contract.js','--reconcile=..\docs\difficulty-v3\evidence\MS05r5m\records','--json=..\docs\difficulty-v3\evidence\MS05r5m\reconciled.json')
```

Run the new quick controls by their copied inventory names with `--exact` and `--results`.
The 14-record run includes checks within its diagnostic allowance; retain a check timeout separately
from generation time. No GG/GR/GH, full quick, qualification, soak or GP gate here.

## Stop rules

Use S-OD4, not the former original-limit prerequisite: correctness/evidence corruption or a
recorded-decision change stops for the owner. Time/availability becomes a named item with actual
numbers for MS07e and MS18c/MS18d. Continue safe work, never extend the ceiling or fake coverage.

## Definition of done & handoff

Return the old/new quick mapping, deep manifest/records/relations, per-board guards/margins, source
identities, CV3 reuse contract, all B/T verdicts and item list. b3 follows; r6b reconciles this work,
r6c keeps the deep tool out of CI. Step evidence only; backups/logs/combined commit are the orchestrator's.

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
