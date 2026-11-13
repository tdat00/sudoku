# MS18b — Final cap and chain-window rechecks

| Header | Value |
|---|---|
| Depends on | MS18a accepted |
| Size / active time | Small; 25-40 minutes plus GS |
| Owner / milestone | Evidence; M18b defaults reconfirmed or escalated |
| Authority | R5/R9/R24 |
| Status | Not started |

## Goal & business context

Check whether the completed technique catalogue changes either measured choice before final
qualification. This task measures; it cannot retune the release candidate itself.

## Scope and repository rules

In: repeat both fixed experiments, apply their selection rules on paper, report decisions.
Out: code/default/fixture edits or qualification before any required owner decision.
AGENTS/checklist; no Git/pack/log writes.

## Inputs & context

R5, verbatim:

> If the rule then selects another value than the one in force, MS18 stops before GQ-final and the
> orchestrator asks the owner: keep the value, or insert a task that changes it and re-runs GG, GR,
> GH and GD before MS18 resumes. MS18 changes no generation or solver logic or tuning constant.

Cap: classic9 normal/master/nightmare, killer hard/expert, jigsaw9 expert; 12 requests each for
64/128/256/none => 288 outcomes. Smallest finite cap with no per-cell exact-hit loss vs none and a
strict full-rating upper-median reduction in at least one cell; else none.
Window: classic9/diagonalX/jigsaw9 nightmare, 12 requests each for C4 and C6 => 72 outcomes.
More total exact hits wins; tie 6. Total 360 requests. Same base 20260101/routes/budgets/configuration
as original experiments, changing only the dimension being measured. All failures are misses.
Use the other default currently in force; never run both overrides in one comparison request.
Anchors at `f788e02`: `generator/tests/soak.js:260` (`function seedFor(tag)`),
`:267-283` (`function generateOne(combo, tag)`), `:353` (`const t0 = process.hrtime.bigint()`).
Find quotes after later changes; runtime overrides come from MS05c/MS07c, not MS07b.

## Files to create/modify

- Evidence/MS18b; final-recheck sections of cap/window records; notes/limits-v3 evidence links only.
- No default, source, generated expectation, support list or task-pack change.

## Implementation steps

1. Record defaults/source and both full manifests.
2. Run distinct per-setting paths; verify 288+72 complete outcomes and invariant/error status.
3. Recompute both exact selection rules; compare with settings in force.
4. If changed, report and stop this milestone before GQ-final. Only the orchestrator obtains the
   owner's keep/change decision and inserts implementation/refresh work.
5. After reconfirmation/recorded decision, hand qualification the final candidate identity.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS18b-B01 | The complete catalogue cannot silently invalidate an earlier measured choice |
| MS18b-B02 | A new winner never becomes an unauthorized late retune |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS18b-T01 | Exactly 360 outcomes, same request identities and isolated overrides |
| MS18b-T02 | Both deterministic rules, ties, errors and work medians applied literally |
| MS18b-T03 | Changed choice blocks GQ until recorded owner action; no source edit here |

## Test plan and gates

Generator:

```powershell
node tests\soak.js --variant=classic9 --level=normal --count=12 --seed=20260101 --no-gate --shallow-cap=64 --json=..\docs\difficulty-v3\evidence\MS18b\cap-64\classic9-normal.json
node tests\soak.js --variant=classic9 --level=nightmare --count=12 --seed=20260101 --no-gate --chain-window=4 --json=..\docs\difficulty-v3\evidence\MS18b\window-4\classic9-nightmare.json
```

Repeat all cap cells/settings and window cells/settings. Jobs 1/no --jobs. Estimate 10-540
seconds/cell, approximately 1-5 hours total; ten-minute command ceiling.
**Announce to the orchestrator before starting (pentomino runs in parallel on the same machine).**
Evidence-only; no new application test or blanket hash rewrite. Incomplete evidence blocks the milestone.

## Definition of done & handoff

Return winner/default pairs, raw records, per-cell losses/costs and any owner decision needed.
If an inserted implementation task changes the candidate, replace stale affected final evidence
before qualification rather than mixing source identities.

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
