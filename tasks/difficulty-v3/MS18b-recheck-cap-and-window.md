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
Resume anchors at `c9935cd`: `generator/tests/soak.js:378` (`seedFor`), `:388-403` (`generateOne`),
`:484` (generation timer). Find symbols after later changes; overrides come from r3/MS07c.
The R5 default in force is 256 unless a later recorded decision changed it; r5p did not reselect it.
Keep size-dependent attempt defaults and the unchanged six-cell/three-cell populations.

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
6. If final ordinary-sample cost suggests a sample-level bound, report data as its own proposed
   decision. S-OD4 does not authorize implementing that bound here or silently changing what R5 measures.

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
seconds/cell, approximately 1-5 hours total; 540-second process ceiling.
**Announce to the orchestrator before starting (pentomino runs in parallel on the same machine).**
Evidence-only; no new application test or blanket hash rewrite. Incomplete evidence blocks the milestone.

## Definition of done & handoff

Return winner/default pairs, raw records, per-cell losses/costs and any owner decision needed.
If an inserted implementation task changes the candidate, replace stale affected final evidence
before qualification rather than mixing source identities.

## Resume rules — S-OD4

Review: orchestrator only. A changed selected cap/window needs the recorded owner decision before
GQ-final; correctness/evidence corruption also stops. Mere time/availability findings are named
numerical MS18c/MS18d items and other bounded work continues, not an automatic tooling task.
Use `Invoke-Dv3Node` for all possibly >10-second payloads, <=540 s, with existing exact-index shards.
Return the inherited/new item list and explicit keep/change decision status; no suite/CI edits here.

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
