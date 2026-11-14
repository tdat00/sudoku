# MS18c — Final qualification and live offered levels

| Header | Value |
|---|---|
| Depends on | MS18b accepted, including any owner-directed replacement task/evidence |
| Size / active time | Medium; 35-50 minutes plus GQ |
| Owner / milestone | Qualification/publication; M18c |
| Authority / review | R24/R21, AUTH-S1, SA1-Q-S5, S-OD4 (c1), CV6-05; analyst cross-review |
| Status | Not started |

## Goal & business context

Let complete final evidence determine availability. Preserve the v2 record and keep the live table
at the path its readers already use.

## Scope

In: full 135-cell GQ-final, v2 archive, live table/support arrays, stored-request notification and
diagnostic/publication compatibility of the final offers; CV6-05's final S-AV01 disposition before GP.
Out: solver/generator tuning, weight changes, intermediate table publication or dropped cells.

## Repository rules

AGENTS/checklist; no Git/pack/log writes. This is the explicit exception permitting the live
`docs/difficulty-rating/qualification.md` update, not edits to other dated reports.

## Inputs & context

R24, verbatim:

> MS18 first copies the existing v2 live table to `docs/difficulty-v3/qualification-v2.md`, preserving
> that historical record. It then updates `docs/difficulty-rating/qualification.md` in place with
> the final v3 table and updates the variant `difficultySupport` lists together.

Use Q's 15 variants x 9 levels, jobs 4, base 20260601, 40/100 seeds, exact+valid+solved+not-approximate
hits and original p95 budgets. No diagnostic overrides or --probe. MS07d merge rejects incomplete/
mixed records. Captured request errors/timeouts remain misses; worker/IPC loss is a failed run.
Only after complete validation derive offered arrays, preserving global level order.
Use r5p's **board-default attempts**, never an explicit eight-attempt qualifier override.

**S-OD4 (c1), without exception:** at least 36 exact hits of 40 or 90 of 100 and p95 within
2/10/30 seconds for <=36/<=81/>81 cells. A bounded fallback, shallow result or timeout is a miss;
none keeps mega Nightmare/Hell or any other cell offered. A protocol-valid hidden verdict is
an accepted product outcome. Do not ask for a waiver before applying it, even for large grids.
Any proposal to retain an unqualified cell or raise a budget would change a recorded decision.
An invalid/non-unique puzzle, unsound proof or wrong exact flag/warning is a correctness stop,
not an availability miss that can be excused by hiding its cell.

**PR-S2 remark — expected outcome under the existing rule, not a new decision.**
Fable's answer (`92a7693`, `docs/difficulty-v3/clarifications-resolved.md`) confirms that cells
missing the exact-hit threshold or their p95 budget are not offered: 36 of 40 exact hits, or
90 of 100 where the existing protocol extends the cell, and p95 within the applicable budget.
On the present numbers, non-offering is likely for **mega16 Nightmare** and possible for the other
large-board Nightmare cells. This is an expectation, not a verdict assigned before final measurement:
use the complete final qualification, keep the 40/100 protocol and do not prune early or grant a waiver.
A hidden cell can be the honest v3 release outcome. The separately saved
`docs/improve-generating/plan.md` is not authorized now and is not a prerequisite for publication.

**IR17 — GD timing handoff (recovery source `00647f9`).** The classic9 GD Nightmare batch took
430.5 s, about 96% of the 450 s planning budget and 80% of the 540 s ceiling. Any rerun must
state a current-source projection with an explicit conservative margin for the whole command;
**449 s is not a reusable bound**. If no credible margin fits within 450 s, treat it as a
population above 450 s and follow the existing named unexecuted-item rule, without changing
counts or guards. Carry this warning and the current projection/margin to MS18e if Nightmare
remains offered. This does not add a GD run to MS18c or replace GQ's separate 40/100 protocol.

Reconcile all inherited availability items (including Killer Hard/Expert and large-grid Nightmare/
hell1) with final verdicts. If a Killer calibration decision was requested at MS07e, apply only its
recorded disposition; no weight change here. A hidden verdict needs no calibration to be legitimate.
Route remaining cost findings to MS18d; include the complete item list for MS18e.

### CV6-05 — the three fixed S-AV01 endings, before MS18d timing

The sign pool was measured and set aside; Greater-Than uses its restored first-allowed sign
pass. S-AV01 enters final work open at 5,209 ms against 1,400 ms on CV6's seeds and 10.6 s p95
on 7000-7039. These are historical cohorts, not qualification verdicts. Normal's CV6 base
remains 700 ms and GP rules stay unchanged until the specific decision below.

- If Normal fails final qualification, hide it by (c1), close S-AV01 as **"not offered"**, and
  record its CV6 case's treatment with the same hidden-cell manual population policy as every
  other cell. No Normal-specific exception, skipped assertion or diagnostic request loss.
- If Normal qualifies, obtain its **final-source CV6 result** before the MS18d handoff: retain
  compatible existing evidence or run only the unchanged Normal CV6 selector below. If it still
  fails, return the final-source numbers through the orchestrator to the plan author under
  CV6-05, before MS18d's final timing runs. Do not select a budget in this task.
  The decided contract's form is fixed: one base value in milliseconds for `BUDGET_MS.normal`,
  the same base for a Greater-Than Normal GP target if GP has one, factor application only
  through `SG.test.timeLimit`, and no base above **10,000 ms** (Expert/qualification budget).
  The test, corresponding GP target, `generator/design.md` section 9.1 (the `greaterThan` Normal
  cell) and both developer guides change in the same assigned contract step. Until the recorded
  decision, 700 ms stands; qualification does not make CV6 pass.
- If CV6 passes on the final source, close S-AV01 with that measurement, not an inferred waiver.

This conditional single-cell check does not move full GD from MS18e. Preserve raw old-contract
failures and source identities if a contract is subsequently changed; the final audit must not
relabel them as new-contract passes. If no bounded complete final-source CV6 record can be
obtained, keep the missing evidence/item explicit and resolve the contract handoff through the
orchestrator before final GP; continue independent publication/audit work, not an unsafe command.

S-AV16 and S-AV17 remain withdrawn as current-source pool regressions, with their observations
retained as history. Any later regression has its own originating task/source and named item.

### Publication and diagnostic compatibility

The qualifier's --markdown writes a table BODY. Render to an evidence file, then compose the live
report with protocol, machine/Node/jobs/source, complete table and removals; do not erase its
explanatory metadata by blindly replacing it with the table body.
Record measured source identity and publication identity separately. Support-array-only changes
after measurement are documented: qualification already enables every level in its workers.
Any solver/algorithm change invalidates qualification, unlike that declared publication step.

Fixed regression/replay corpora remain all original keys/recipes. MS03a/d tooling temporarily
enables hidden requested levels. Apply the same diagnostic-only guard around the quick replay
loader's toConfig/pipeline call, restoring the original array in finally. Do not change requests,
silently normalize them to another offered level or advertise hidden levels again.

Resume anchors at c9935cd: `qualify.js:143,186,223,320` (`child`, `hitOf`, `decide`, `certain`);
the later MS07d merge owns current output. Quick loaders are `replay.entry` at 22, `steps.golden`
at 41 and Generator `player.goldenResult` at 29; all prefer saved wires. `store.closestSupportedLevel`
at 170, `normalize` at 193 and `load` at 652 govern fallback; pipeline refusal is at 58-59.

At HEAD `store.load` normalizes with no adjustments and announces `adjustments:[]`; app startup
loads before constructing controls. Do not assume the existing nearest-level calculation already
shows a **stored-request** correction note. Own the focused end-to-end correction if r5p has not
supplied it: a stored hidden level becomes the nearest offered one (easier on ties), with the
existing EN/VI note visible on initial render. Preserve explicit/default attempt intent and URL
priority. Hidden explicit pipeline requests must still throw; existing Player puzzles still open.

## Files to create/modify

- Evidence/MS18c and final qualification JSON under docs/difficulty-v3.
- New `docs/difficulty-v3/qualification-v2.md`; live qualification.md; notes with every removed level.
- Only `difficultySupport` arrays in `generator/js/variants/*.js`.
- `generator/js/ui/store.js`, `controls.js` and app startup only as needed for the stored-request
  correction note; existing EN/VI keys or both languages if a new message is necessary. No generation policy.
- All three fixed golden quick loaders/helpers and focused restoration tests, not only replay.
  Enumerate directly affected quick/manual offer assertions/populations before editing; preserve original
  diagnostic requests and public refusal coverage. Existing reader path remains.
- Generator design 5.1/15.4 and both guides' actual availability facts.
- Only if CV6-05's conditional final decision is actually needed and recorded: an orchestrator-assigned
  contract step owns Normal's `BUDGET_MS` in `generator/tests/manual/greater-than.test.js`,
  the matching Greater-Than Normal target in `generator/tests/fixtures/perf-helper.js` if present,
  `generator/design.md` section 9.1 (the `greaterThan` Normal cell) and both developer guides
  together. No value is authorized in advance; no seed/count/other-budget edit.

## Implementation steps

1. Finish the narrowly coupled compatibility logic/tests on controlled hidden-level fixtures, without
   pruning live offers. Then freeze candidate/defaults and archive v2 before any live-table change.
2. Collect all 135 complete cells, merge/check, distinguish hidden verdicts from failures.
3. Update live report and exact matching support arrays together; record every addition/removal.
   Audit MS05b3's manual level/selector population against those offers now. Some variant suites
   have fixed `LEVELS` arrays; requesting a newly hidden level through the normal pipeline throws
   `difficulty.unsupportedLevel`. Identify any such test/publication compatibility work before
   claiming publication accepted and assign a bounded follow-up through the orchestrator.
   Do not leave MS18e to discover it, silently drop a selector, enable hidden production requests,
   compact surviving seed indexes, or present a zero-test result as passed. This audit does not
   authorize weakening an I5/hit threshold; record the explicit qualification-driven population
   disposition and keep the independent fixed GG/GR diagnostic populations unchanged.
4. Preserve fixed diagnostic recipes after hiding levels and restore arrays even on failure.
   Verify all three golden consumers, mega deep requests and every affected fixed quick request.
   Keep diagnostic generation separate from public unsupported-level refusal; no lost request
   or reindexed manual seed is disguised as a qualification-driven test update.
   Verify stored hidden-request nearest-level selection and its visible initial note in both languages.
5. Verify publication-only engine diff and resolve S-AV01 by the three CV6-05 endings above.
   Hand MS18d the offered/performance manifest, final-source CV6 evidence and any recorded
   same-step Normal contract change before its final timing runs.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS18c-B01 | Only genuinely qualified levels are offered; losses are reported to the owner |
| MS18c-B02 | V2 history/read paths and fixed evidence requests are preserved |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS18c-T01 | Complete 135-cell/jobs 4 protocol, exact source/defaults and checked merge |
| MS18c-T02 | Live table equals support lists; archive unchanged; no algorithm tuning |
| MS18c-T03 | Hidden-level diagnostics restore arrays, recipes unchanged, both quick sets pass |
| MS18c-T04 | (c1) covers every board/level, fallbacks miss, stored hidden requests show the note, Player imports remain compatible, all items reconcile, and S-AV01's CV6-05 disposition precedes MS18d timing |

## Test plan and gates

Generator, first cell then every Q cell:

```powershell
node tests\qualify.js --variant=classic4 --level=veryEasy --jobs=4 --json=..\docs\difficulty-v3\evidence\MS18c\qualification\classic4-veryEasy.json --markdown=..\docs\difficulty-v3\evidence\MS18c\qualification\classic4-veryEasy.md
node tests\qualify.js --merge=..\docs\difficulty-v3\evidence\MS18c\qualification --jobs=4 --json=..\docs\difficulty-v3\qualification-v3.json --markdown=..\docs\difficulty-v3\evidence\MS18c\table.md
```

**Conditional Normal CV6 only (CV6-05):** if Normal qualifies and no compatible final-source
record exists, preflight the exact selector with `--list-tests` (selected total 1), then use
the current-source projection and existing lock/450 s planning/540 s ceiling rules:

```powershell
Invoke-Dv3Node -Task MS18c -AllowExit1 -NodeArgs @('tests\node-runner.js','--suite=greater-than','--filter=> normal: 20 puzzles > CV6:','--verbose','--results=..\docs\difficulty-v3\evidence\MS18c\cv6\normal-results.json')
```

Keep all 20 requests and original seeds; `-AllowExit1` records the expected timing failure,
not acceptance. No whole Greater-Than corpus or other CV6/I5 selector is added here.
Hand this record and its identity to MS18e for coverage reconciliation; any later changed
contract/fingerprint requires the normal compatibility/replacement handling.

GQ jobs 4; estimate 10-540 seconds/cell, 1-12 hours total planning allowance.
**Announce to the orchestrator before starting (pentomino runs in parallel on the same machine).**
Stop an invocation at 540 seconds. A slow cell without an existing bounded route is a named
availability item; continue safe cells and independent audit work, never invent a hidden verdict
or a new tooling class. **Do not publish an incomplete matrix.** The final record must say if
publication remains unready; changing the qualification/publication rule requires the owner.
Generator candidate selectors: `--suite=variants-registry,store,controls,smoke,replay,steps,player,help,ui-contract`;
both quick sets. Test restoration after diagnostic failure and unchanged request identity for a
temporarily hidden G04 request. Final full GD is MS18e; no hash rewrite just to hide a support error.
Run the stored-load notification through actual startup/control initialization, not only
`sanitizeWithNotes`. Preserve r5p's explicit 8 and default-mode migration behavior.

## Definition of done & handoff

Give MS18d/e full qualification/provenance, offered lists, v2 archive, compatibility evidence and
the cumulative numerical item list, including S-AV01's fixed ending and any decided Normal
contract update completed before GP. A correctly hidden large-board cell is a valid result, not a blocker.
If any variant has no offered level and current UI/registry cannot represent that, report a blocker
for an assigned compatibility fix; never invent a qualified level.

## Resume rules — S-OD4

Review: analyst cross-review. Correctness/evidence corruption or changing a recorded decision
stops; time/availability is a named numerical item, not an owner stop or offer waiver.
Use `Invoke-Dv3Node` for every possibly >10-second payload, <=540 s; preserve GQ jobs 4 and the
current bounded quick manifest. Any authorized new suite owns its r6c CI group/manifest entry.
No new slow-cell evidence/tooling class. Return all item dispositions to MS18d/MS18e and never
publish an incomplete or unqualified offer as though (c1) passed.

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
