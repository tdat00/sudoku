# MS14c — Quick regressions for existing Killer interactions

| Header | Value |
|---|---|
| Depends on | MS14b accepted |
| Size / active time | Small; 25-40 minutes |
| Owner / milestone | Core tests; M14 complete |
| Authority | R17; SA2-Q-S09 |
| Status | Not started |

## Goal & business context

Demonstrate the two already implemented Killer interactions in quick tests. Do not implement or
advertise a duplicate cageLocked technique.

## Scope and repository rules

In: core-built Killer positive/negative regression cases, list/doc updates. Out: stronger assignment
pruning, new ID/weight, production engine changes. AGENTS/checklist; no Git/pack/log edits.

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

Baseline `core/js/engine/tech-cage.js:118-139` (`function pointOutOfCage`), `:173-191`;
`generator/tests/manual/killer.test.js:559-574`; both tests.html CORE_SUITE_FILES lists.

## Files to create/modify

- New core cage suite and pure fixture data if needed; Generator/Player tests.html list entries.
- `generator/design.md` 6.6, Player technique coverage and both developer guides.
- Evidence/MS14c. No existing engine or generated fixture.

## Implementation steps

1. Build small exact core models demonstrating each existing behavior.
2. Add positives/near-misses and run them through cageCombo, not a test-only imitation.
3. Register the shared suite in both HTML pages; Node discovery is automatic.
4. Run quick sets and only the corpus-free Killer combination-table selector below; document the
   deliberate no-new-ID outcome. Do not generate the unchanged whole Killer corpus here.

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
| MS14c-T03 | Both quick sets and the corpus-free Killer combination-table check pass; no unnecessary whole-corpus GD |

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
No GG/GR/GH, qualification, whole Killer generation or production rewrite.

## Definition of done & handoff

Report both exact behaviors and that cageCombo remains the sole corresponding ID. If an actual
engine defect is found, report it for assignment rather than adding stronger pruning here.

## Resume rules — S-OD4

Review: orchestrator against MS08a's applicable test-only template and generic soundness/order
suites, not routine analyst cross-review. Correctness/evidence corruption or changing a decision
stops; time/availability is a named numerical MS18c/MS18d item and work continues.
Use `Invoke-Dv3Node` for every possibly >10-second payload, <=540 s; use the bounded quick manifest.
Own the new shared `tech-cage` suite's CI group in addition to both HTML lists.
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
