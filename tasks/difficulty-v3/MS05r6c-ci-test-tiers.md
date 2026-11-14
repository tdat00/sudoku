# MS05r6c — CI workflows for the v3 test tiers

| Header | Value |
|---|---|
| Depends on | MS05r6b's reviewed evidence, current complete quick manifest and per-app standing cost |
| Size / active time | Small-Medium; 30-50 minutes plus bounded checks |
| Machine time | Approximately 2-10 minutes locally; each remote test job fits <=30 minutes |
| Acceptance | CI closure inside the r6b combined boundary; no separate commit |
| Authority / review | CV6-03 sub-question (2), S-OD4; analyst cross-review |
| Status | Not started |

## Goal & business context

Make the v3 PR and Pages checks run the bounded quick contract actually validated by the recovery.
The old workflow groups include every manual suite and can exceed their job limit. Moving deep
mega work to a tool does not by itself fix those groups.

## Scope

In: Generator CI group/selector manifest, grouping script, both workflows, coverage/planning checks
and documentation of offline deep/manual evidence.
Out: engine/assertion/fixture changes, time-factor or timeout increases, source/evidence relabelling,
blanket manual/deep generation or another acceptance commit. Preserve Player browser coverage.

## Repository rules

Read AGENTS/check-list. No Git writes, workflow dispatch/push/PR creation, refs/backups or pack/log edits.
The orchestrator owns the PR and combined commit. For local checks over 10 seconds use `Invoke-Dv3Node`,
the shared slot, <=540 seconds and the 15-second gap. Shell scripts keep their declared LF exception;
ordinary files/docs use CRLF, no BOM/trailing whitespace.

## Inputs & context

### Current workflows at c9935cd

| File | Current behavior to replace/preserve |
|---|---|
| `.github/scripts/generator-suites.sh` | Five groups: sweep, engine, rules, rating, rest. Named groups include manual variants/killer/difficulty/perf; rest discovers core quick, Generator quick **and manual**. Old 2-4 minute estimates are stale. |
| `.github/workflows/pull-request.yml` | Generator jobs have timeout-minutes 30; core/Player 15; browser 30. Node 24, CI's inherited time factor 3. Preserve PR trigger, permissions, browser job and failure semantics. |
| `.github/workflows/pages.yml` | Same old Generator groups; no explicit job timeout at HEAD. Set bounded test-job ceilings of at most 30 minutes rather than inheriting a longer platform default. Preserve deployment dependencies and main-only publication. |
| r5/r5m/b3/r6a/r6b handoffs | r5's tooling, amended quick/deep mapping, new suites, final quick key manifest and actual process-wall cost per app. Use r6b's current manifest, not r5's obsolete first draft. |

### Required CI contract

1. Both workflows consume the **same checked bounded quick manifest** and Generator grouping entry
   point. Keep exactly the intended quick test keys, including shared suites in the Generator and
   Player environments; a separate core job is not a substitute for either app's shared coverage.
2. Materialize the portable execution part of r5/r6b's manifest beside the script, if needed, as
   `.github/scripts/generator-quick.json`. It contains project-relative suites/filters/exact names,
   expected membership and group ownership, not local result paths, Windows absolute paths or a
   promise that local hashes/Node versions prove CI. Preserve provenance to r6b.
3. Use whole suites only where bounded; retain the reviewed full-name/describe shards otherwise.
   The shell script may retain a listing mode and add an execution mode, or delegate to a small
   Node manifest reader in `.github/scripts/`. Execute argument arrays faithfully, not `eval`.
   Do not assume the former comma-separated suite list can express an exact-name shard.
4. Preflight selection through r5 listing and reconcile every current quick key exactly once within
   the Generator manifest. Unknown suites, missing/duplicate/unexpected keys, zero selections and
   registration/load errors fail the check. New suites must have an explicit group or a checked
   quick-only fallback; never discover manual files in `rest`.
5. Budget groups using r6b's actual process-wall sums, startup/registration and margin for CI.
   The per-job sum must fit 30 minutes; retain smaller bounded invocations within jobs. More/smaller
   groups are allowed, not larger guards. Record estimates versus actual remote durations distinctly.
6. **No raise of SG_TIME_FACTOR, CI tolerance or job timeouts.** Preserve PR's existing 15/30-minute
   ceilings. Adding an explicit <=30-minute Pages test timeout is a reduction of its implicit limit,
   not authorization to lengthen PR jobs. Do not mask failures with `continue-on-error` or a green wrapper.
7. Keep `tests/mega-contract.js` deep generation outside CI. State in both workflows which reviewed
   evidence replaces it: r5m's 14 requests/relations, b3's live CV3 outcomes (Addendum B1), r6b
   reconciliation, and the current-source evidence owned by later semantic tasks/MS18e. Also identify the offline GD/E/
   qualification/performance owners replacing the former implicit whole-manual CI claim.
8. Do not deploy the intermediate branch. A truthful named performance item is not a passing CI run.
   If CI itself exposes a time-only finding, record/reroute it under S-OD4 while continuing independent
   work; do not broaden the test-tier decision or claim PR readiness without successful required checks.

No full heavy run is needed to validate a YAML/grouping change. Retain r6b's quick result rows only
when their **exact final quick fingerprint** still matches; pure grouping validation/current inventories
prove membership, not execution. r5 hashes guides/designs/AGENTS as well as runtime and suite files.
If this task changes such an input (including its testing documentation), regenerate the affected
app's final inventory and execute its complete disjoint quick manifest with new results. Do not use
a narrow runtime-only compatibility claim to bypass r5/r6b's stricter quick identity rule.
A workflow/manifest/evidence-only change outside that fingerprint can retain the exact matching rows.
Neither case requires rerunning the fourteen deep requests or complete E unless relevant inputs changed.

## Files to create/modify (exclusive ownership)

- `.github/scripts/generator-suites.sh`, `.github/workflows/pull-request.yml`,
  `.github/workflows/pages.yml`.
- Optional portable `.github/scripts/generator-quick.json` and small manifest execution/validation
  helper; use existing r5 APIs, not a second test runner or new slow-evidence class.
- Focused existing harness/runner-contract tests if needed for grouping failures; own their actual
  suite lists/group membership. Prefer synthetic validation over a new suite for constants.
- Both developer guides and relevant design testing paragraphs, workflow/tier facts only.
- `docs/difficulty-v3/notes.md`, `docs/difficulty-v3/evidence/MS05r6c/`.
- No production, correctness assertion, canonical fixture or prior evidence edits.

## Implementation steps

1. Read r6b's current inventories/results/costs and all current discovered quick suite names.
2. Build the portable grouped manifest; reconcile its union against the current inventory.
3. Update both workflows to execute that same manifest; retain Node/permissions/triggers/deploy guards.
4. Validate syntax/selection/negative coverage and conservative job projections. If only unhashed CI
   inputs changed, a bounded representative execution plus retained exact-match quick rows suffices.
   If guides/suites/other quick inputs changed, replace complete affected-app quick coverage as above.
5. Record the CI ownership/evidence replacement in workflows/docs; hand back the combined package.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS05r6c-B01 | CI enforces the approved v3 quick tier, not the obsolete unbounded whole-manual grouping |
| MS05r6c-B02 | Deep evidence has a visible owner/replacement and is not silently discarded |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS05r6c-T01 | Both workflows use the same manifest; all intended Generator quick keys reconcile, no manual/deep catch-all |
| MS05r6c-T02 | Jobs fit <=30 minutes with margin; existing smaller PR ceilings and time factor are not raised |
| MS05r6c-T03 | Unknown/missing/duplicate/zero-test groups fail; argument/exit behavior and source identities remain truthful |
| MS05r6c-T04 | Player/core/browser coverage and deployment conditions remain; new-suite ownership and offline evidence are documented |
| MS05r6c-T05 | r6b audit plus CI closure, checks/durations and cumulative S-OD4 item list are ready for one combined commit |

## Test plan and commands

Use the repository's available shell/YAML validation, without adding dependencies or executing a
workflow/deploy. Exercise the manifest validator on complete/gap/duplicate/unknown/zero-selection
synthetic plans. From Generator, current inventory through the lock helper:

```powershell
Invoke-Dv3Node -Task MS05r6c -NodeArgs @('tests\node-runner.js','--list-tests=..\docs\difficulty-v3\evidence\MS05r6c\generator-inventory.json')
```

List Player too from its directory. Record the actual chosen script/helper invocation and every
group's command/membership/projection in the evidence. Run no generation merely to estimate a group
already measured at r6b. Remote CI is verified by the orchestrator on the PR, not invented locally.

## Stop rules

S-OD4 applies. A missing correctness check, masked exit or corrupt source identity is a correctness
failure; unauthorized tier/time-factor/budget changes need a decision. A cost exceedance is a named
item, not permission to drop a group or stop all remaining development for the owner.

## Definition of done, commit and handoff

Return the portable manifest, coverage check, per-job projections, validation commands/results,
offline evidence links and all named items. From now on **each suite-adding task owns its CI group**;
MS18e audits the final tree and owns the v3 PR's CI.

The orchestrator completes the r6b/r6c review and makes the combined commit, not a separate CI commit:
`difficulty-v3 MS05: required exactness with measured bounded recovery`.
Include r6c and state in the body: **"The earlier pause commit a7f6660 was not green and was not acceptance."**
Preserve required trailers, historical logs and backup safeguards. MS05e starts only after this commit.

## Execution log

| Field | Value |
|---|---|
| Status | Accepted in the combined commit `difficulty-v3 MS05: required exactness with measured bounded recovery` (with MS05r6b's audit; S-OD2) |
| Start | 2026-11-14 11:25 (+07:00) |
| End | 2026-11-14 12:13 developer (with SA1's addendum IR14, IR15, IR19); 12:26 orchestrator review and combined commit |
| Duration | 48 min developer (final quick runs: four locked Generator groups 652 s, Player 31.4 s); about 15 min review |
| Model | claude-sonnet-5.5 (developer); analyst implementation review claude-opus-5.5 (SA1, `10-review-of-recovery-steps.md`); orchestrator review claude-opus-5.5 |
| Token usage | 115 model calls; 26,139,695 input tokens (25,802,778 cache reads); 163,986 output tokens |
| AI credits | about 506 (developer) |
| Verification | Developer (`evidence/MS05r6c/`): `generator-suites.sh check` exit 0 (every one of the 3,262 Generator tests in exactly one shard; no manual or unknown suite; no empty shard); the self-test 50/50 synthetic checks (gap, duplicate, unknown, manual, empty, registration error, missing shared suite, over-limit job, exit semantics); `run nope` and the old group `sweep` exit 2; `actionlint` and a YAML parse of both workflows; `bash -n`; final quick runs on the final tree through the CI entry, one group per locked command: Generator 3,262/3,262 in 7 of 7 shards (`6b40d218…`), Player 1,683/1,683 (`547e4a4e…`), 0 missing, duplicate, unexpected or skipped. No remote CI run was made or claimed |
| Acceptance | MS05r6c-B01..B02 and T01..T05 met locally; the remote run of the pull request is pending (owned by MS18e). Four Generator CI groups over MS05r6b's seven shards: `shared-small` (core-shared, steps, replay, mega; 1,464 tests), `own-suites` (1,579), `pipeline` (150), `replay-player` (69); projected jobs 630-1,260 s, each at most 1,800 s; the Player in one job (projected 360 s). `.github/scripts/generator-quick.json` with `generator-quick.js` and its self-test; the deep mega tier, the manual corpora and GD stay out of CI, and both workflow headers name the evidence that replaces them; no `SG_TIME_FACTOR` or timeout raised; Pages gains test timeouts. SA1's addendum: `AGENTS.md` no longer promises a heavy-tier duration or a CI `--all`; the stale durations of both developer guides and `generator/design.md` removed |
| Issues & resolutions | (1) IR14's pointer: "Continuous integration" is a paragraph of "Running the tests", not a heading; the line names the real place. (2) R6C-I01: the `test-generator` job names changed from five to four (branch protection, if any, must follow). (3) R6C-I02: remote job durations unknown until the pull request runs. (4) R6C-I03: `docs/architecture.md`'s "five jobs of about 2 to 4 minutes" corrected by the orchestrator (not a fingerprinted file). (5) R6C-I04: `player/design.md:437` says the browser scripts are not part of CI although the PR workflow runs them (pre-existing; MS18e). (6) R6C-I05: each later suite-adding task adds its shard and bound, or `check` fails. (7) R6C-I06: MS05r6b's quick rows and the first pass are superseded by the final rows |
| Handoff | MS05e and later: every new suite owns its CI shard and bound (R6C-I05); the heavy tiers stay offline. MS18e: the remote PR run and its durations, R6C-I01, R6C-I04. Items: S-AV01..S-AV15 and MS05r6a-COV01 carried; standing Generator cost 648.0 s |
