# MS18e — Final correctness and release evidence closure

| Header | Value |
|---|---|
| Depends on | MS18d accepted; all required owner actions resolved |
| Size / active time | Small; 25-40 minutes plus GD/quick |
| Owner / milestone | Release evidence; M18 complete |
| Authority | R20-R24 and every implemented resolution |
| Status | Not started |

## Goal & business context

Close the feature only when the final source, correctness, availability and cost evidence agree.
This task does not deploy, push, commit or edit the orchestrator's task logs.

## Scope and repository rules

In: final GD/quick checks, evidence completeness review, living documentation/release record.
Out: code/tuning/fixture repairs, blanket all/manual/browser runs, editing analysis reports or pack.
AGENTS/checklist; CRLF, both guide languages; no Git writes.

## Inputs & context

Final invariants: rating/cache3, history/wire1,40 IDs/34 unscoped, two uniqueness IDs, fixed weights/
bands, selected cap/C and frozen pattern limits. Exact means canonical solved/in-band/required;
legacy history/imports remain honest. Complete final135-cell qualification and >=90% performance
matrix use the accepted source/configuration. Fixed520 hashes remain present.

R20, verbatim:

> Record every reclassification, the old and v3 labels/requiredness, and the causing technique in
> `docs/difficulty-v3/notes.md`, in the task that introduces the change.

Consolidate, do not invent missing earlier evidence. Verify current references, old-history
retention, shallow warning/Retry and proof coverage are all documented in both languages.
S0 baseline old202/204 versus qualified91/204 is not a v3 result. Include isolated target and final
matched comparisons, per-cell losses, omitted levels and all performance misses.
No new floor certificate or target leaks into the external Player exchange.
Baseline anchors `generator/tests/manual/difficulty.test.js:1182,1212,1363` (updated exactness
contracts), `generator/js/ui/cache.js:47`, `generator/js/ui/history.js:19` (version boundaries).

## Files to create/modify

- New `docs/difficulty-v3/release-v3.md`, notes/evidence links, docs/README.md.
- Applicable living Generator/Player designs and both user/developer guides, correcting actual final facts.
- No application, expected fixture, historical analysis report or task-pack file.

## Implementation steps

1. Check every task's output/evidence handoff against the final source identity and intended manifests.
2. Run final named GD and both quick sets; every correctness failure blocks completion.
3. Consolidate actual counts, settings, versions, compatibility, availability and costs.
4. Write release evidence with unresolved failures explicitly blocking release, never a fabricated pass.
5. Give the orchestrator data to fill its release record/logs/summary and make the accepted commit.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS18e-B01 | Players and the owner receive truthful v3 behavior, limitations and availability |
| MS18e-B02 | No unperformed or failed gate is reported as passed |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS18e-T01 | Final GD and both quick sets pass; source/version/default identities are reconciled |
| MS18e-T02 | GS/GQ/GP/GG/GR/GH coverage and reclassification/compatibility records are complete |
| MS18e-T03 | Living EN+VI docs match the code; no code or pack edits in this closure task |

## Test plan and gates

Generator:

```powershell
node tests\node-runner.js --suite=difficulty
node tests\node-runner.js --suite=killer --filter="I5:"
node tests\node-runner.js --suite=jigsaw --filter="I5:"
node tests\node-runner.js --suite=greater-than --filter="I5:"
node tests\node-runner.js --suite=extra-regions --filter="I5:"
node tests\node-runner.js --suite=wordoku --filter="I5:"
node tests\node-runner.js --suite=variants --filter=CV3
node tests\node-runner.js
```

Player: `node tests\node-runner.js`.
These targeted manual consumers were corrected with MS05b; no blanket manual suite is inferred.
GD jobs1/no --jobs, estimated1-8 minutes per selector; quick baseline was about one minute Generator and fifteen
seconds Player, but record the actual expanded-suite counts/times. **Announce to the orchestrator
before starting (pentomino runs in parallel on the same machine).** Ten-minute command ceiling.
Final offered-level hit failures are not waived by the earlier "intermediate availability" rule.
No new --all/--manual/browser/SG_DEEP permission is inferred.

## Definition of done & handoff

Return final B/T and gate verdicts, exact source/default/version identifiers, documents, counts,
durations, remaining risks and actual usage if available. The orchestrator owns logs/commit/release;
leave this Execution log empty.

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
