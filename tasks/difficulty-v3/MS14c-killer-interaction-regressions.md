# MS14c — Quick regressions for existing Killer interactions

| Header | Value |
|---|---|
| Depends on | MS14b accepted |
| Accepted implementation base | `0e3a0c4` (MS14b); later pack-only commits do not replace this runtime baseline |
| Size / active time | Small; 25-40 minutes |
| Owner / milestone | Core tests; M14 complete |
| Authority | R17; SA2-Q-S09; S-OD4, S-OD12/S0 and IR72 source-aware closure |
| Review | Orchestrator against the applicable MS08a/IR72 template; no routine SA1 review |
| Status | Not started; ready for serial dispatch from `0e3a0c4` |

## Goal & business context

Demonstrate the two already implemented Killer interactions in quick tests. Do not implement or
advertise a duplicate cageLocked technique.

## Scope and repository rules

In: core-built Killer positive/negative regression cases, list/doc updates. Out: stronger assignment
pruning, new ID/weight, production engine changes. AGENTS/checklist; no Git/pack/log edits.

### Accepted baseline and MS14b handoff — 2026-11-17

MS14b is accepted at **`0e3a0c4`**. The serial order is **MS14c -> MS15a**; no run-ahead or
second writer. The final accepted evidence is `docs/difficulty-v3/evidence/MS14b/evidence.md`
section 11: Generator `quick-final-2/`, Player `quick-final/` (not the superseded Generator
results in `quick-final/` or the failed development pair).

| App | Accepted tests / suites | Complete quick wall | Accepted fingerprint |
|---|---|---|---|
| Generator | **4,526 / 53** | **501.9 s** | `c44d7bd6500c800f27ec4f26a01ab49497274b684ec30f2df73a3a1c5ffb690e` |
| Player | **2,753 / 30** | **96.4 s** | `63329fbe66ee263e165115954e0b14b17393499515dfd5892d3e17645f9a772f` |

Preserve CI projections (seconds): **core-shared 130, steps 70, replay 70, mega 40,
own-fast 320, digger-target 30, pipeline 80, Generator player shard 90, Player job 150**.
Add `tech-cage` to the existing `core-shared` shard and both HTML suite lists. Derive final
inventories/fingerprints after the additions and maintain projections by the measured rule;
do not reset predecessor counts, selectors or projections. The complete Generator quick set
uses the four existing bounded groups, not one unbounded no-options invocation.

The catalogue stays **38**, including `lawOfLeftovers` from Jigsaw Hard seed 5. Preserve
MS14b's G06 analysis/pins and 22 changed Jigsaw hashes, its active leftover registration and
the S-OD11 grouped-chain policy/consumers. Its final **E-2** ledgers are the top-level
`MS14b/wire`, `analysis` and `hashes` folders, not the superseded `e-1/` folders. No source,
example or pin is restored from MS13c merely because this task changes no finder.

### S-AV37 — measured handoff only

Carry accepted **`0e3a0c4`**, `docs/difficulty-v3/evidence/MS14b/evidence.md` section 6 and
`s-av37.json`. Limits remain **2 units/side, 4 difference cells/side, 50,000 work units/call**;
MS14b did not use the once-only R10 adjustment, and this task does not inherit permission to tune.

| Population | Accepted observation |
|---|---|
| Five constructed blank layouts, including the boxes control | `staggered` and `wavy` cap at 50,000 (2/5); the other three do not. MS14a's full work counts for the two capped layouts were 98,530 and 81,664. |
| 60 seeded positions: five layouts x two orientations x seeds 1-6 | 0/60 caps; maximum **5,842** work units/call |
| 14 real puzzles: twelve Jigsaw Hard requests and two existing help sources; 38 calls | 0/38 caps; maximum **3,845** work units/call |

Keep those populations separate. Generated-layout cap rates, real positions beyond these
fourteen puzzles and whole-generation cost remain unmeasured; these samples are not a
universal cap/availability claim or a GP verdict. S-AV37 stays open.

This task remains the corpus-free **Killer regression** task: no Jigsaw census, new generation/
discovery campaign, leftover-kernel change, limit tuning or extra cost gate. A green Killer
regression does not close the Jigsaw item. MS18c receives measured availability consequences,
MS18d cost and MS18e the audit. Carry S-AV36/S-AV38 and the other inherited items without
turning their unresolved measurement gaps into new MS14c work.

### QUESTION pause, S-OD12/S0 and format-before-freeze

**Any `QUESTION:` stops this task for the orchestrator.** Return the state, evidence, options
and proposed default; do not apply the default, continue independent edits/runs or start more
gates until the answer and resumption are explicit. Preserve/finish or safely interrupt an
already-running owned bounded command through the normal helper; leave no orphaned process.
Settled performance findings remain named items under S-OD4, not automatic owner stops.

**S-OD12/S0 is case-by-case prior permission, not a standing corpus route.** Neither S-OD10
nor S-OD12 supplies unused acquisition quota to MS14c. This test-only task owns no discovery
batch or source scan; GH below checks already-owned sources only. Any proposed acquisition
or scope expansion needs an explicit ruling, and any owner exception must precede the work.

**Run the format check before any E source freeze**, including comments, CRLF/BOM, final
newline and trailing whitespace; engine lines remain at most 110 characters. This task
does not edit an unowned engine to repair a format issue: report it for assignment.
Keep an exact source/diff record if an included input must change. A later included-source
byte change, even a comment wrap, invokes ordinary fresh-record rules; never retag a ledger.
Also finish all fingerprinted docs, counts, fixtures and list changes before the final
quick-set freeze. The MS14b E-1/E-2 incident is not an exemption from either boundary.

## Inputs & context

R17, verbatim:

> No new `cageLocked` ID: existing `pointOutOfCage`/cageCombo already implement the ordinary required
> digit locked to a unit and the two-cell Killer pair.

Create `core/tests/suites/tech-cage.test.js`; none exists at the baseline. Build the model via
SG.model.create with complete row/column/box units and explicit cages, enable existing core cage
propagation as the helper requires. Do not rely on Generator variants in a shared suite.
Case 1: every feasible cage combination contains digit d and every location for d in the cage is
within one unit; remove d from outside-cage candidates in that unit.
Case 2: a two-cell cage's allowed pair is confined to its unit; remove pair digits from other cells.
Near misses: d absent from one combination, a cage position outside the unit, or a target not in
the common unit. Check exact nonempty eliminations and true solution preservation.

Confinement concerns the **candidate locations of d**, not every cell of the cage: the
outside-unit negative must include an outside-unit cell that can hold d. Pointing can use
every unit common to those locations (including a box), so a target-negative must exclude
all applicable common units. Isolate other deductions or assert absence of the particular
elimination; do not demand a null Finding when another legitimate elimination remains.
Use the existing surviving-combination filter, not stronger assignment matching.

Baseline `core/js/engine/tech-cage.js:118-139` (`function pointOutOfCage`), `:173-191`;
`generator/tests/manual/killer.test.js:559-574`; both tests.html CORE_SUITE_FILES lists.

## Files to create/modify

- New core cage suite and pure fixture data if needed; Generator/Player tests.html list entries.
  Node suite/fixture discovery is automatic; do not change production `SOURCE_FILES`.
- `.github/scripts/generator-quick.json`: `core-shared` membership and measured metadata.
- `generator/design.md` 6.6, Player technique coverage and both developer guides.
- `docs/difficulty-v3/evidence/MS14c/` and `docs/difficulty-v3/notes.md`.
  No existing engine or generated fixture edits.

## Implementation steps

1. Build small exact core models demonstrating each existing behavior.
2. Add positives/near-misses and run them through cageCombo, not a test-only imitation.
3. Register the shared suite in both HTML pages; Node discovery is automatic.
4. Run quick sets and only the corpus-free Killer combination-table selector below; document the
   deliberate no-new-ID outcome. Do not generate the unchanged whole Killer corpus here.
5. Complete the source-aware E/GH check-only closure below and CI; preserve all predecessor
   fixtures and report the current-source handoff.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS14c-B01 | Both requested interactions are evidenced without duplicate naming |
| MS14c-B02 | No stronger unapproved Killer pruning is introduced |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS14c-T01 | Exact positive/negative behavior, core-only construction and both runners pass |
| MS14c-T02 | Suite lists/docs and catalogue counts remain correct |
| MS14c-T03 | Both quick sets, corpus-free Killer combination-table check, current-source E merge-checks, complete GH check and CI pass; no unnecessary whole-corpus GD |

## Test plan and gate

Each app: `node tests\node-runner.js --suite=tech-cage,techniques,ui-contract,help`, then quick set.
Generator's existing corpus-free combination-table tests:

```powershell
Invoke-Dv3Node -Task MS14c -NodeArgs @('tests\node-runner.js','--suite=killer','--filter=killer: combination table (P4)')
```

Jobs 1/no `--jobs`; expect seconds for this selector, with no `corpus()`/pipeline generation.
Record nonzero selected counts. Quick sets use the shared lock when >10 seconds; 540-second
ceiling. This is GD-fake/corpus-free only, not a whole-variant GD claim.
MS05b3 already executed the manual exactness contracts; MS18e owns their final per-level rerun.
No qualification, whole Killer generation, pattern-cost campaign or production rewrite.

### E is normally reuse/check-only, not fresh generation

The old blanket "No GG/GR/GH" wording is superseded by checklist section 7's IR72 rule.
The planned new tests/fixtures, HTML test lists, guides/designs and CI metadata do **not**
change the required E source identities: the recorders hash production `SOURCE_FILES` and
their explicit recorder/helper inputs, not the quick-test suites/docs. No production edit
is necessary or authorized. A new task/commit or changed quick fingerprint is not by itself
a reason to regenerate E.

On final source, retain MS14b's accepted E-2 ledgers and record these complete merge-checks
from Generator (the `--merge`/`--hash-merge` modes generate nothing):

```powershell
node tests\replay-fixtures.js --merge=..\docs\difficulty-v3\evidence\MS14b\wire --check
node tests\replay-goldens.js --merge=..\docs\difficulty-v3\evidence\MS14b\analysis --check
node tests\perf.js --hash-merge=..\docs\difficulty-v3\evidence\MS14b\hashes --check-hashes
```

Require current-source identity, exact complete coverage **5 / 14 / 520**, and unchanged
canonical fixtures; keep MS14c's transcripts and links to the original records. SA2 checked
all three on accepted `0e3a0c4`: they pass with nothing generated. Do not substitute bare
regenerating `--check` commands or copy/retag the earlier ledgers as new observations.

If an authorized edit actually changes a required E identity, IR72 requires fresh recording
of each **whole affected family** on final post-format source (5 wires, 14 analyses and/or
520 hashes as applicable), with the ordinary ordering/admission rules and check-only
publication against unchanged fixtures. This does not authorize an engine edit or output
change. An unexpected mismatch, out-of-scope change or changed canonical output is a
`QUESTION:`/correctness stop, not permission to refresh pins or bypass the identity check.

### GH and final closure

IR72 also requires a complete **existing-source check**, not acquisition or a catalogue write.
From Player:

```powershell
node tests\tools\make-technique-examples.js ..\generator --max-puzzles=64 --max-hints=400 --check
```

Require all **38** IDs to match, retaining the Jigsaw example's actual region map. No
`--discover`, corpus scan, `--write` or example replacement is authorized. If an example
unexpectedly fails, raise `QUESTION:` rather than using an earlier task's acquisition route.
Finish format/docs/inventories before the final complete quick sets, update measured CI
metadata under the standing rule, and run the existing CI membership/budget check.

## Definition of done & handoff

Report both exact behaviors and that cageCombo remains the sole corresponding ID. If an actual
engine defect is found, report it for assignment rather than adding stronger pruning here.
Carry S-AV37 with MS14b's source, limits, evidence and disposition; preserve any unmeasured gap.
Report the three E merge-check outcomes, all-38 GH check, nonzero corpus-free selector coverage,
both final quick inventories/fingerprints and the new suite's CI ownership.

## Resume rules — S-OD4

Review: orchestrator against MS08a's applicable test-only template and generic soundness/order
suites, not routine analyst cross-review. **MS15a is the next task in the SA1 review set**.
Correctness/evidence corruption or changing a decision
stops; time/availability is a named numerical MS18c/MS18d item and work continues.
The QUESTION pause above applies immediately; no unanswered default is self-approved.
Use `Invoke-Dv3Node` for every possibly >10-second payload, <=540 s; use the bounded quick manifest.
Own the new shared `tech-cage` suite's CI group in addition to both HTML lists.
Announce the bounded gates before starting; keep the shared lock, <=450 s compound admission
and >=15 s release gap even though Pentomino is complete. Report apparently stale locks before cleanup.
No new slow-cell evidence/tooling class. Return the inherited/new item list and corpus-free outcomes.

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
