# MS18c — Final qualification and live offered levels

| Header | Value |
|---|---|
| Depends on | MS18b accepted, including any owner-directed replacement task/evidence |
| Size / active time | Medium; 35-50 minutes plus GQ |
| Owner / milestone | Qualification/publication; M18c |
| Authority | R24/R21; AUTH-S1, SA1-Q-S5 |
| Status | Not started |

## Goal & business context

Let complete final evidence determine availability. Preserve the v2 record and keep the live table
at the path its readers already use.

## Scope

In: full135-cell GQ-final, v2 archive, live table/support arrays, diagnostic fixed-corpus compatibility.
Out: solver/generator tuning, weight changes, intermediate table publication or dropped cells.

## Repository rules

AGENTS/checklist; no Git/pack/log writes. This is the explicit exception permitting the live
`docs/difficulty-rating/qualification.md` update, not edits to other dated reports.

## Inputs & context

R24, verbatim:

> MS18 first copies the existing v2 live table to `docs/difficulty-v3/qualification-v2.md`, preserving
> that historical record. It then updates `docs/difficulty-rating/qualification.md` in place with
> the final v3 table and updates the variant `difficultySupport` lists together.

Use Q's15 variants x9 levels, jobs4, base20260601, 40/100 seeds, exact+valid+solved+not-approximate
hits and original p95 budgets. No diagnostic overrides or --probe. MS07d merge rejects incomplete/
mixed records. Captured request errors/timeouts remain misses; worker/IPC loss is a failed run.
Only after complete validation derive offered arrays, preserving global level order.

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

Baseline `generator/tests/qualify.js:141-171` (`function child`), `:443-466` (summary);
`generator/tests/suites/replay.test.js:22-31` (`function entry`);
`generator/tests/manual/difficulty.test.js:297-317` (full live table/offer assertions).

## Files to create/modify

- Evidence/MS18c and final qualification JSON under docs/difficulty-v3.
- New `docs/difficulty-v3/qualification-v2.md`; live qualification.md; notes with every removed level.
- Only `difficultySupport` arrays in `generator/js/variants/*.js`.
- Quick replay diagnostic loader/helper and focused regression; manual offered-table expectations
  only if directly affected. Existing reader path remains.
- Generator design5.1/15.4 and both guides' actual availability facts.

## Implementation steps

1. Freeze candidate/defaults and archive v2 before any live-table change.
2. Collect all135 complete cells, merge/check, distinguish hidden verdicts from failures.
3. Update live report and exact matching support arrays together; record every addition/removal.
4. Preserve fixed diagnostic recipes after hiding levels and restore arrays even on failure.
5. Verify publication-only engine diff; hand MS18d the offered/performance manifest.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS18c-B01 | Only genuinely qualified levels are offered; losses are reported to the owner |
| MS18c-B02 | V2 history/read paths and fixed evidence requests are preserved |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS18c-T01 | Complete135-cell/jobs4 protocol, exact source/defaults and checked merge |
| MS18c-T02 | Live table equals support lists; archive unchanged; no algorithm tuning |
| MS18c-T03 | Hidden-level diagnostics restore arrays, recipes unchanged, both quick sets pass |

## Test plan and gates

Generator, first cell then every Q cell:

```powershell
node tests\qualify.js --variant=classic4 --level=veryEasy --jobs=4 --json=..\docs\difficulty-v3\evidence\MS18c\qualification\classic4-veryEasy.json --markdown=..\docs\difficulty-v3\evidence\MS18c\qualification\classic4-veryEasy.md
node tests\qualify.js --merge=..\docs\difficulty-v3\evidence\MS18c\qualification --jobs=4 --json=..\docs\difficulty-v3\qualification-v3.json --markdown=..\docs\difficulty-v3\evidence\MS18c\table.md
```

GQ jobs4; estimate10-540 seconds/cell, 1-12 hours total planning allowance.
**Announce to the orchestrator before starting (pentomino runs in parallel on the same machine).**
Stop/investigate at ten minutes; a slow unsplittable cell blocks, never disappears.
Generator `node tests\node-runner.js --suite=variants-registry,smoke,replay,help,ui-contract`;
both quick sets. Test restoration after diagnostic failure and unchanged request identity for a
temporarily hidden G04 request. Final full GD is MS18e; no hash rewrite just to hide a support error.

## Definition of done & handoff

Give MS18d/e full qualification/provenance, offered lists, v2 archive and reported removals.
If any variant has no offered level and current UI/registry cannot represent that, report a blocker
for an assigned compatibility fix; never invent a qualified level.

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
