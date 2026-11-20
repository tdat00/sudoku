# MS18e — Staged final audit and release dispatch

| Field | Contract |
|---|---|
| Baseline | Accepted MS18d implementation `1faa96c55afa6a4f0aa57e6b457fba86593cb3ce`; acceptance/index `c978a2ee1a274cbdc2b8bae83e6caac90e226c1c` |
| Initial release | E0 file-only preflight and E1 owned documentation/CI corrections, after SA1's requested dispatch review |
| Live release | E2 only for individually reviewed, credibly <=450 s commands in the E0 plan; an unknown bound is not GO |
| Final checks | E3 on the final fingerprinted files; E4 remote/PR actions are orchestrator/owner work |
| Developer | One serial developer; no Git writes, push, PR mutation, workflow dispatch, deployment or task-pack edits |
| Acceptance | Orchestrator review; explicit local, required-gate and remote-CI verdicts, never “all green” from a subset |

This leaf controls the concrete dispatch where older examples in the main MS18e
task name stale counts, a hidden public level or an unlocked metadata command.
It preserves the full recorded obligations. It does **not** release blanket
`--all`, `--manual`, live `SG_DEEP=1`, browser runs, new GP/GQ or generator tuning.

## 1. Ownership and execution rules

| Actor | Owns | Does not own |
|---|---|---|
| Developer | E0 inventories/reuse proofs/plans; assigned E1 edits; admitted E2/E3 checks; truthful new evidence/release report; bounded CI-failure investigation when assigned | Git/index/ref writes, acceptance ticks/logs, sending owner decisions, PR or remote-workflow actions |
| SA2 / SA1 | Dispatch/admission/compatibility interpretations within existing decisions; explicitly requested review | Owner waivers, unrecorded scope/threshold changes, automatic new attempts or fixture repairs |
| Orchestrator | Review/release command plans, serialize work, preserve failures, relay questions to owner on Discord, commit reviewed work, prepare/create/update the PR after the owner's push, verify exact-head CI and required checks | Push on the owner's behalf, merge/deploy, change protection/rulesets or dispatch workflows without separate authorization |
| Owner | Push the intended branch/commit set; decide proposed changes to recorded contracts/release scope and required-check policy | No correctness or unperformed-gate claim is inferred from silence or from accepting an earlier task |

Every local Node command, including inventory, syntax checks, hashes and fake
tests, uses the **unchanged**
`generator\tests\artifacts\difficulty-v3\MS18c\invoke-dv3node.ps1`
and **unchanged** `generator\tests\artifacts\difficulty-v3\MS18d\phase-c\tee-c.js`.
Use an exclusive new MS18e transcript, ordinary Node/non-detached execution,
shared locks, >=15 s gaps, <=450 s projected command time and the 540 s ceiling.
Announce timed work to the orchestrator; no other local timing, poller or Git work
overlaps it. Do not copy a GQ watchdog, GP/a3 quota or historical “no lock required”
example into this task.

The tee path is `tests\artifacts\difficulty-v3\MS18d\phase-c\tee-c.js` from
`generator\`, `..\generator\tests\artifacts\difficulty-v3\MS18d\phase-c\tee-c.js`
from `player\`, and prefixed by `generator\` from the repository root.
The actual child command follows the tee path and new transcript in `-NodeArgs`.
PowerShell console redirection alone is not a Node transcript.
Record tee/helper/runner/wait clocks separately; CI m remains successful tee
`seconds`. Log a thrown failure/timeout and incomplete output before stopping.
No stale `LASTEXITCODE`, silent retry or overwrite.

For admitted manual/deep checks, retain genuine nonzero outcomes. A complete
manual result with only timing/availability failures remains **failed**, not
passed by `-AllowExit1`; classify it before any later command. Wrong puzzle,
non-uniqueness, unsound deduction, wrong exactness/warning or damaged evidence
stops immediately for review. A selector with zero/multiple unintended tests,
a skipped required test or a killed process is not completed coverage.

## 2. Exact write boundary

### Living files

- **Create** `docs\difficulty-v3\release-v3.md`: final data-only verdict/limitations,
  evidence map, decisions and remote status. Create its skeleton before final
  guide/link checks; fill results without editing hashed inputs afterward.
- **Update** `docs\README.md`: links to release, qualification, limits and performance.
- **Append/consolidate only** `docs\difficulty-v3\notes.md`: link actual recorded
  reclassifications/requiredness/causing-technique evidence; never invent a cause,
  erase history or relabel old v2/S0 measurements as final v3.
- **Update** `generator\design.md`: current section 18 Tests row and genuinely
  stale current facts found by this audit. Preserve the accepted section 9.1
  target table, R6 provenance and all eleven retained-budget contrasts.
- **Update** `player\design.md`: directory/testing/CI descriptions (currently
  lines 65, 608–644), including the false “browser scripts are not part of CI”
  claim and the current table's stale inactive-grouped-graph description.
  Preserve dated historical MS13a/inactive observations as history.
- **Only directly coupled current-fact corrections**, together in both languages:
  `USERGUIDE.md`, `USERGUIDE.vn.md`, `DEVELOPERGUIDE.md`, `DEVELOPERGUIDE.vn.md`.
  Audit v3 exactness/shallow warnings/Retry, old history/import semantics,
  defaults, counts, bounded-proof limitations and real CI scope. No redesign.
- `.github\scripts\generator-quick.js` and
  `.github\scripts\generator-quick.selftest.js`: the narrow Player-budget check
  correction in E1, with focused synthetic tests.
- `.github\scripts\generator-quick.json`: existing timing metadata maintenance;
  no membership/group/command change without an explicit bounded regrouping assignment.
- `.github\scripts\generator-suites.sh`, `.github\workflows\pull-request.yml`,
  `.github\workflows\pages.yml`: final-evidence comments and only explicitly
  reviewed bounded-tier correctness corrections. Preserve triggers, permissions,
  test coverage, dependencies, platforms, factors and all current timeouts.

No application, manual/quick suite, canonical fixture, support array, weight,
band, work limit, cache/wire contract or frozen earlier helper/evidence edit.
No automatic test/publication repair. Report a needed out-of-scope correction
with its exact file/assertion and obtain a scoped assignment first.

### New task-owned files

All new evidence goes under **`docs\difficulty-v3\evidence\MS18e\`**:

```text
preflight\plan.json
preflight\baseline-identities.txt
preflight\targets-recheck-before.json
preflight\inventory-all.json
preflight\inventory-<selected-suite>.json
preflight\scope-map.json
preflight\reuse-map.json
preflight\variants-compatibility.json
preflight\admission-plan.json
preflight\questions.md
manual\difficulty\
manual\i5\
manual\ratios\
manual\mega-replay\
cv3\
deep\nightmare\
deep\hell1\
deep\reconcile-nightmare.json
deep\reconcile-hell1.json
profile\s-av11\
quick\
ci\
audit\items.json
audit\coverage.json
audit\gates.json
audit\source-bindings.json
audit\workflow-audit.json
audit\remote-ci.json
audit\final-identities.txt
audit\targets-recheck-final.json
transcripts\
lock-log.jsonl
helpers-sha256.txt
outputs-sha256.txt
handoff.md
```

Directories for unadmitted work stay empty; do not create fake completed records.
Use exclusive, numbered new filenames for corrected runs and preserve superseded
outcomes. Developer remote-ci output may initially be explicitly pending; the
orchestrator supplies actual remote facts, never guessed URLs/results.

Optional persisted helpers are limited to:

```text
generator\tests\artifacts\difficulty-v3\MS18e\audit.cjs
generator\tests\artifacts\difficulty-v3\MS18e\test-audit.cjs
generator\tests\artifacts\difficulty-v3\MS18e\run-locked-e.ps1
```

They are file-only manifest/reconciliation helpers and a thin locked caller,
not new benchmark/profiling/resume frameworks. Use existing tools and pure APIs.
Do not run older task-owned writers that hard-code earlier output directories.
All MS18c/MS18d records, operator/SA1 archives, base records, journals and the
completed GP log/final merge are read-only; do not rerun or refreeze that campaign.

## 3. E0 — inventory, compatibility and admission before live work

### Accepted baseline

Read MS18d Phase D `handoff.md`, `bindings.json`, both target re-checks,
`quick-coverage.json`, `quick-cost.json`, the final CI inventories, its 30-item
register, final GP report and the accepted MS18c handoff/population map.
Preserve the accepted disclosures: one unlocked `node --check`, four corrected
own-helper failures and long lines in the frozen Phase D helpers. Do not call
them locked/successful by rewriting history or reformat accepted artifacts.
Audit any affected-evidence assessment; unresolved correctness/evidence integrity
is a question, not an assumed waiver.

Capture with the unchanged `MS18c\identities-now.cjs`, through tee/lock:

```text
Generator quick: 10ed919c848f1466be70aae71e690ffd2bc1b7818ec8a3df1bba0dfd6ce9b0ec
Player quick: 00db9a687404f50e4591a0b0f92571ebcc3fb0e69b2744fa8190f6a7c720f799
Generator with manual: a818c0b9e0fdcbc8111ac75c365783859afd894c285bfbd8763cfe25d1cc6e3a
Replay: 1cf64919a9004259a203e65bc7e537b15b981f4ed52610f4cd62d28cf6950fcc
Hashes: 344afdeca4e2afe58ec552ddf4390608f6aee2febe9eb9c958b0c03b7bb8c1f1
Producer sources: 75b0955e3e356bd1
Targets: 3d0bffdb19cc8d0e4c2495163858bfcbf3fd6e3d8567f4718dc722a23746963a
```

The last two values require the unchanged
`tests\artifacts\difficulty-v3\MS18d\phase-b\freeze-targets.js` from `generator\`,
with `--preflight=..\docs\difficulty-v3\evidence\MS18d\gp-preflight.json` and a
fresh MS18e `--json` path. Run it before edits and after final living-doc edits.
Require 135 positions /79 active /56 absent /62 retained /17 updated, matching
table and producer, design equal/bold17, all eleven design/EN/VI pairs, no
problems and exit 0. Label these **MS18e re-checks**, not new Phase B freezes;
do not change the reused tool's fixed historical `kind`/`note`.

### Registration and scope map

Registration-only `--all --list-tests=<fresh MS18e JSON>` is expressly allowed
for E0, under tee/lock: no test/hook/benchmark execution. Never use `--all`
without `--list-tests`. Alternatively collect named-suite inventories.
Keep `SG_DEEP` unset. Use `(suite, ordinal, fullName)` and the actual source hash,
not substring counts alone. Every live selector is rechecked against the final
inventory after E1 edits.

The scope map must contain:

| Family | Required population / treatment |
|---|---|
| `difficulty` | Complete ordinary manual suite, split into disjoint offered-level batches and exact remaining tests. Current classic9 offers seven levels; each offered batch generates 100 requests, seeds `7000+i`, eight assertions. Retain all non-batch/diagnostic tests too |
| Five I5 corpora | The existing MS05b3/MS18e per-public-level I5 contract, one selected test each: Killer 3, Jigsaw 6, Greater-Than 5, Wordoku 6, diagonalX 6 and hyper 6 = **32 I5 selectors**. Original level indexes/seeds/options/counts are preserved |
| CV3/refusals | **79 public CV3 cells plus 15 refusal checks**, reconciled within the accepted 285-test `variants` coverage; live-only provenance, never supplied by deep records |
| S-OD8 | Three exact hard-failing generation-cost ratios; one `variants` mega16 replay case with its two fixed requests, reusable only by the compatibility proof below |
| Deep tool | **28 independent occurrences**, fourteen Nightmare and fourteen Hell 1, all original relations and defaults |
| S-AV11 | One fixed diagnostic tuple, held until its separate bound/transport plan is approved |
| Other manual assertions | Explicitly label covered, required by an existing named contract, or outside this dispatch. Do not silently convert a whole-suite claim into I5-only coverage |

The five I5 suites retain fixed diagnostic corpora behind their public
registrations: original nine levels, Wordoku eight, restoring hidden-level
guards and aggregate API semantics. This dispatch does not newly assign every
aggregate/stress test merely because its file is inventoried. If an additional
assertion is claimed as required, identify its recorded assignment and plan it;
otherwise report it as unexecuted, not “the whole suite passed”.

For current I5 selectors the published counts are: Killer 20 each; Jigsaw 20
except Hell 2=8; Greater-Than Very Easy/Easy=20 and Hard/Master/Hell 2=10;
Wordoku 20 each; diagonalX/hyper 20 except Hell 2=8. Confirm from the inventory
and original builders, never derive seeds from a newly compacted published list.
Greater-Than Normal and Wordoku Normal are hidden: the old Normal example
commands are not valid public I5 selections.

### Reuse is explicit, never hash retagging

MS18c `closure\manual-variants\reconciliation.json` records **285/285 passed**,
no failures/skips, under
`13cd63bfb0f5af687bc8e841d522cc7f216aa116125394b33fbc32a53ab1ef3f`.
It includes every public CV3/refusal and the mega16 replay. Its fingerprint is
not the current with-manual fingerprint.

Prepare `variants-compatibility.json` before proposing reuse. Compare all
fingerprinted inputs from accepted `e0596801` to the final MS18e tree; require
unchanged selected test names/ordinals, request recipes, assertions, relevant
fixtures/loaders/engine/options/defaults and no source instability.
At this dispatch the intervening changed inputs are the two developer guides,
Generator design, the **target literals only** in `perf-helper.js`, and the
`manual-corpus`, `mega` and `multigrid` quick-suite changes. The selected
`manual\variants.test.js` and `manual-corpus.js` are unchanged. Prove that those
differences do not affect the selected variants tests; a file list alone is not proof.
Include later E1 documentation changes in that analysis.

**SA2/SA1 must concur with the concrete compatibility proof before reuse.**
Keep old hashes/receipts and label `reused-compatible`, not fresh-current-hash.
If approved, reuse the 285 tests and do not regenerate their CV3/replay requests.
If not, identify precisely invalidated coverage and submit bounded replacement
commands; no blind whole-variant rerun. The earlier approximately 332 s mega replay
already exceeded its old 300 s projection: do not inherit that old bound.

The same principle is stricter for deep records: inspect both
`identity.currentMatches.sourceHash` and `.toolHash`. A mismatched record is
retained only through the already-recorded exact non-generation-diff exception,
with tool/check/request/default identities unchanged and explicit review.
Otherwise refresh a coherent fourteen-record level cohort; never mix sources,
copy one CV5 result into two occurrences or rewrite old identity fields.
Use current compatible GS/GQ/GP/GG/GR/GH evidence and explicit maps; no new GP/GQ,
help discovery, fixture rewrite or E recording follows merely from this audit.

### Admission plan and stop point

Each proposed live command records: family, exact selector/occurrence, source
and tool identities, all requested counts/seeds/options/trace/guards, lazy setup
and checking work, projection and margin with its basis, output/transcript,
expected selected total, allowed exit interpretation and dependencies.
Unknown or >450 s means **not admitted**. A test timeout, the deep 500 s budget,
GQ/GP time, a different seed/trace/options cohort, or historical 430.5/449 s is
not by itself a current whole-command bound. No pilot/trial run to discover one.

In particular, the `difficulty` confusion-matrix assertion calls **all seven
batches (700 requests)** in a fresh process. Do not hide it in a cheap
“non-batch” shard or consider per-level passes a substitute. Its single-test
bound needs its own row. Preserve all remaining exact tests, not just the first
Nightmare batch.

Return the scope/reuse/admission matrix and QUESTIONS to the orchestrator.
**No E2 live command starts until that row is explicitly released.**
Continue independent E1/file-only work while a performance-bound row is held;
do not mark the held gate green or remove it from the required population.

## 4. E1 — current documents and bounded CI correctness

1. Correct Generator section 18's stale 56/48/~2900 counts from the inventory:
   current **63 suites =55 quick +8 manual**, 4,807 quick, with 37 own quick and
   18 shared. State actual combined/manual counts only from registration, not
   an old 3,910 total. Do not overwrite dated historical counts elsewhere.
2. Correct Player directory/section 10/table: its 32 suites/2,981 tests remain
   quick; the existing PR workflow **also runs browser scripts**. Pages runs
   core/Generator/Player checks before deployment, not that PR browser job.
   Fix the current inactive-chain wording to match S-OD11 activation/fallback;
   preserve the dated inactive MS13a history.
3. Audit both guide languages against actual v3 code: rating/cache 3, history/wire 1,
   grouped proofVersion 2, 40 IDs/34 unscoped, two uniqueness IDs, frozen new-pattern
   bounds, generation defaults 8/4/2, R5=256/C=4, exact/shallow/warning semantics,
   immutable legacy history/import claims and final 79 offers/56 hidden.
   Keep “bounded proof/minimum in its stated domain” distinct from exhaustive
   deduction coverage. A documentation fix must not invent a behavior change.
4. Fix the CI helper's **known Player limit mismatch** within its existing
   validation/reporting path: Player must be checked/printed against **900 s**,
   not the Generator's generic 1800 s. Keep the actual workflow timeout 15 minutes,
   factor 3, overhead 180 s and all selections unchanged. Add focused existing-file
   synthetic tests: 190 projects 750 and is valid; 240 projects 900 and is valid;
   250 projects 930 and must fail although below 1800. No new manifest schema or
   configurable larger Player limit is needed. This enforces an existing
   contract and needs no owner waiver.
5. Update workflow comments to reference the final release/evidence map and the
   actual 28-occurrence obligation/results. Do not claim old r5m records alone
   validate later techniques or call registration-only evidence a live pass.
   Keep honest pending/failed states where final offline coverage is incomplete.
6. Preserve current workflow behavior and actual limits in seconds: core 900, plan 600,
   each Generator group 1800, Player 900, PR browser 1800; Node 24/Ubuntu,
   default CI factor 3; PR targets main; Pages triggers on main push/manual
   dispatch and deploy waits for its test dependencies. Do not trigger Pages.

R6C-I01/I02/I04, IR21/IR22 and MS05r6a-COV01 each get an explicit disposition.
For COV01 inspect the actual G11 fixture and positive reveal-fold assertions,
including the current `generator\tests\suites\player.test.js` coverage; a passing
test name alone does not prove a branch executed. No new discovery or fixture repair.

Record a static scope finding: `manual\perf.test.js`'s serializer test still calls
Greater-Than Normal seed1 directly, although Normal is hidden. That non-ratio
block is **not assigned here**. Do not run it speculatively, repair it silently or
claim the entire manual `perf` suite passed. If broader perf coverage is required,
raise a scoped publication-compatibility QUESTION for the orchestrator first.

Complete these edits and refresh inventories/identities/target re-check before
final verification. Both designs are quick-fingerprint inputs, so these known
corrections require both complete quick sets again; Phase D's passes remain valid
history, not final results for changed documents.

## 5. E2 — only individually admitted existing live recipes

### GD and I5

Use the ordinary selected suite through `tests\node-runner.js`, with a new
`--results`, `--verbose` and the inventory's exact selection. No `--bail`.
For I5 require selected total **1**:

```text
--suite=killer|jigsaw|greater-than|wordoku --filter=> <level>: <original count> puzzles > I5:
--suite=extra-regions --filter=> <diagonalX|hyper> <level>: <original count> puzzles > I5:
```

The alternatives above describe separate commands, not literal pipe arguments.
Prefer the inventory's exact full name when available; check that `--exact`
also selects exactly one ordinal. Keep the leading boundary so Easy cannot match
Very Easy. Preserve all original assertions, corpora and per-call restoring guards.

For `difficulty`, use the reviewed per-level describe selections plus disjoint
exact remaining tests, including the separately planned confusion matrix.
Preserve 100 requests per current offered classic9 level, original `7000+i`
seeds, and all eight per-level assertions. The median-budget assertion retains
its own statistic and `SG.test.timeLimit`; do not replace it with GP's p95 or
recalibrated GP target. Keep fixed hidden diagnostic requests in non-batch tests.
Record reported numbers faithfully; a pass that proves only a threshold is not
permission to invent an exact unreported hit count.

### CV3 and the relocated replay

Reuse compatible MS18c live coverage only after the E0 decision. Any required
replacement CV3 uses exactly one public cell:

```text
--suite=variants --filter=> variants: <id> > CV3 <level>:
--suite=variants --filter=> variants: <id> > CV3 unsupported:
```

Require total 1, original seeds 1..perLevel and **240000 ms request guard**;
perLevel is 2 for samurai/sohei/flower/mega16/butterfly and 3 otherwise.
No hidden public CV3, provider/replay entry point or deep record supplying puzzles.
Keep deep occurrence IDs only as cross-references.

The one S-OD8 replay case is:
`variants > player: the replay steps of a result > real top-level results with clues shown again replay faithfully (mega16)`.
It contains Nightmare seed478576959 and Hell1 seed2422420669, with its existing
diagnostic support restoration. Do not replace it with another wire or split its
meaning. It is already present in the accepted 285-test evidence if reuse is approved.
Classic9 Hell1 seed3 stays covered by the final quick set.

### S-OD8's three hard ratios — not the whole perf suite

One exact test per admitted command, in suite `perf`:

```text
perf > instrumented generators: what the events cost > generating puzzles: verbosity 'off' costs less than 2%
perf > instrumented generators: what the events cost > generating puzzles: verbosity 'summary' costs less than 10%
perf > instrumented generators: what the events cost > generating puzzles: verbosity 'full' costs less than 35%
```

Confirm these names/ordinals via inventory. Preserve limits 1.02/1.10/1.35,
the existing warmup, six interleaved rounds and up-to 5/4/4 internal measurements.
Each work call generates 24 Easy plus 2 Normal puzzles; account for full internal
work, not assumed early success. Those original repetitions are part of the test,
not permission for external rerun-to-green. Timing failures are hard failed
assertions under S-OD4, not the unrelated warn-only perf samples' skip behavior.
No 19-cell warn-only sweep or 26 hash-combination test sweep is inferred here.

### Final deep tool — 28 occurrences

Use unchanged `tests\mega-contract.js`, not live `SG_DEEP` suite branches:

```text
--list --level=nightmare
--list --level=hell1
--request=<exact listed id> --record=..\docs\difficulty-v3\evidence\MS18e\deep\<level>\<id>.json
--reconcile=..\docs\difficulty-v3\evidence\MS18e\deep\<level> --level=<level> --json=..\docs\difficulty-v3\evidence\MS18e\deep\reconcile-<level>.json
```

The two `--list` and reconciliation calls are file-only but still locked/teed.
Run any needed refreshed occurrence once per process, with original trace off,
board defaults 4/2, allowance 256 and **500000 ms shared generation/check budget**.
That diagnostic budget is not a <=450 s launch projection or a raised process
ceiling. Per board/level preserve invariant seeds 1/2/3/4 and independent CV5
3/3/4 calls; all original relations must be checked. Never alias duplicate seed3 calls.
Keep records-only directories separate from reconciliation outputs.

For records: exit 0 means returned/all correctness checks passed; exit 1 means a
failed check; exit 3 means error/unfinished checks. Reconciliation exit 1 is an
evidence/check/relation problem, exit 3 incomplete. Inspect the JSON and both
currentMatches fields even on exit 0. Preserve errors, unavailable/unevaluated
checks and failed relations; no automatic retry after a budget/kill.
The seven public-deep registration removals and mega12 Nightmare's retained
3000 ms base are audited from Phase B evidence; that does not authorize or
claim execution of the separate 20-request `SG_DEEP` public timing branches.

### S-AV11 — still conditional

Tuple: **jigsaw9 / Expert / seed 1111 / trace off / default 8 attempts**, no option,
attempt, seed or guard substitution. The existing diagnostic path is
`toolRecords.withRequestedLevel` around the original `SG.pipeline.run` request;
`pipeline` already returns its seven-key `timings`. The 325.313 s observation is
whole-request history, not a current bound or known digging cause.

E0 must propose a credible current-tuple whole-command bound plus the exact
existing-stage capture/admission/output route. S-OD15's conditional profile
environment permission is not a bound or reuse of the closed GP transport.
No profile call, new profiler/resume framework, new CPU exemption or attempt
extension until that plan is separately released by the orchestrator with
technical review. Never append to the closed C log or reuse its run folders.
If a new driver/path outside this file list is needed, obtain that assignment
before writing it. If admitted and the delay no longer reproduces, say so;
report actual existing stage/counter scopes and null/unknown where absent.

## 6. E3 — final quick, source and item reconciliation

- Re-run both complete quick sets after final fingerprinted edits: the existing
  eight Generator shards and whole Player, normal local factor 2, same selections.
  Baseline projections are 170/70/70/50/**350**/30/80/90 and Player **190**.
  Use the Phase D recipe with new MS18e outputs, never its writer/log directories.
  Expect 4,807/55 suites and 2,981/32; reconcile by app/suite/ordinal, all tests once,
  complete source-stable results, zero failures/skips. Any change is a QUESTION.
- Run the existing CI helper selftest and final `check --keep=<fresh MS18e dir>`.
  Maintain raises-only timing metadata by `max(old,10*ceil(1.5*teeSeconds/10))`.
  Finalize metadata before the final coverage/job-budget check. CI metadata is
  outside app fingerprints; docs/code/fixture changes are not.
- Confirm final five identities **plus** producer/table and target-document
  checks. Current engine/replay/hash/targets should not change in this scope.
  Do not auto-record E on unexpected drift; route the cause first.
- Retain/check accepted full GG520, GR5 wires/14 analyses, GH40, GS selection,
  GQ135 and GP79/74 evidence with their own compatible identities/recipes.
  Use existing file-only checks where needed; no regenerated outputs or new
  qualification/performance campaign merely to relabel an audit.
- Extend the accepted **30-item MS18d register**, not replace it. Inventory all
  earlier stable S-AV IDs and task handoffs too, including withdrawn/history
  items, S-AV02/03/04/08, Remote Pairs S-AV32/S-OD9 and Jellyfish S-AV35 with
  S-OD10/S-OD12's bounded, case-specific history. No new discovery quota.
  Keep all six S3 group closure/proof/cost records and MS15b-GP-J/U cohorts.
- Keep S-AV01 closed **not offered**, and **S-OD7 / S-AV05 / S-AV06** explicit:
  Killer Hard/Expert remain hidden until later calibration, with their raw
  qualification results kept separately from owner withholding. S-AV27's final
  GQ execution gap is closed; its historical scheduler/cost caveats remain.
  Preserve MS18c-GQ-ENGINE-COST's two distinct comparator definitions, sources
  and cohorts, not a new GP ratio or causal finding.
- Give each finder-cap item an evidence-qualified audit disposition: retained
  limits/caps and sampled/constructed populations are not universal coverage or
  causal speedup claims. No new census/profile is implied.
- The five GP misses retain their exact numbers, source and future owner.
  **GP already passed 74/79 with 72 required**; those five alone require no owner
  waiver, target change or retest. Retain all three consumed a3 grants, F3
  dispositions, four epochs, 114 ledgers, nine holds, gate limitations and the
  single final merge. Do not execute archived operator or SA1 recompute scripts.

Fill `audit\gates.json` with separate coverage, correctness, exactness/availability,
timing and remote statuses: pass/fail/incomplete/not-applicable/reused-compatible
as actually established. A completed audit is not a release-ready claim while a
required gate is unexecuted or correctness/evidence is unresolved. Preserve all
time-only failures and their S-OD4 dispositions; do not translate “continue” into
“all manual gates passed”.

## 7. E4 — orchestrator/owner remote path

The developer provides the local candidate tree, final fingerprints, bounded
workflow audit, per-job arithmetic and unresolved items. **The orchestrator**
reviews and commits all intended changes; **the owner** pushes the intended
`rating-v3` commit set. No developer push, PR creation, remote rerun or deploy.

After that push the orchestrator prepares/creates or updates the PR targeting
`main` and records its number/URL and actual current head. Read the actual
required-check/ruleset configuration; do not assume recovery's old names suffice.
Current job names are:

```text
Test core
Plan generator tests
Test generator (shared and small suites)
Test generator (own suites)
Test generator (pipeline)
Test generator (replay player)
Test player
Test player in a browser
```

Record whether each is required and whether the Plan job needs a policy decision.
No branch-protection/ruleset edits are assigned. Missing permission to inspect
configuration is a pending owner/maintainer action, not “no required checks”.

For actual PR CI record run/job URLs/IDs, attempts, conclusions, Node24/Linux/
factor3, browser/version, durations including checkout/setup, and actual timeout
comparisons. Record PR head/base and the **actual checked-out commit**: the
default PR checkout may be a synthetic merge, not literally the head SHA.
Confirm it corresponds to the current PR head/base and intended tested tree;
a changed head/base or fingerprint invalidates a prior matching-tree claim.
Retain failures/cancellations and diagnose them; no blind rerun-to-green.

PR CI already includes browser coverage; observing that run is not permission
for a new local browser campaign. Pages gets a static trigger/dependency/limit
audit here; its main-push/deploy behavior is not executed by creating the feature
PR. Do not dispatch/deploy Pages to obtain a pre-merge badge.

No remote result yet means **remote CI pending**, never local success promoted
to Linux/Node24/browser success. Final sign-off needs the intended current
candidate's actual required checks and policy disposition. Finish the intended
commit set before the final push/check; if another repository commit is made
after verification, repeat matching-head verification after its owner push.
Keep the last CI attestation in PR/orchestrator records rather than advancing
HEAD solely to claim that the new HEAD was already tested. No merge is authorized
by this dispatch.

## 8. Questions and final acceptance

All owner/Fable matters go **through the orchestrator to the owner on Discord**.
Record the exact question, named scope/measurements, message/time/verbatim reply
and decision binding. Do not contact Fable directly or infer a new delegation.

| Situation | Routing / rule |
|---|---|
| Ordinary measured time/availability failure or GP's five misses | S-OD4 named numerical disposition; continue independent safe work. No automatic owner stop or gate waiver |
| Missing credible <=450 bound for required GD/deep, including IR17/confusion matrix | Hold that command and report full requested population/basis. If release requires waiving/changing the gate or a new execution route, ask owner `MS18e-Q-GD-DEEP`; no trial run or silent omission |
| S-AV11 still lacks a defensible bound/approved capture route | Report held/unknown, obtain technical plan review; ask owner `MS18e-Q-SAV11` only if proposing changed scope/contract or release with that assigned profile outstanding |
| Failed required assertion would need new threshold, budget, request count, tier, limit, offer or fixture | Owner/delegated decision first; correctness/evidence failure blocks. Neither task acceptance nor a past GQ/GP exception supplies the grant |
| Required-check configuration mismatch or policy change | Owner/maintainer decision `MS18e-Q-CI-POLICY`; orchestrator does not silently alter protection |
| Candidate ready but not pushed | Owner action, not a Fable decision: orchestrator sends exact branch/SHA and waits for the owner's push |
| New ambiguity needing Fable interpretation | State the exact conflicting contract to the owner; Fable acts only on a recorded owner delegation |

The old CV6-05 Normal/Fable trigger is **not active**: Greater-Than Normal failed
qualification and S-AV01 closed “not offered”, with its 700 ms retained base and
fixed diagnostic seed4 unchanged. Do not reopen that settled question.

Suggested owner-question wording, filled with actual E0 rows/numbers:

> **MS18e-Q-GD-DEEP:** Các kiểm tra [tên/selector, số yêu cầu] chưa có cận toàn
> lệnh <=450 giây; giới hạn tiến trình vẫn 540 giây. Em chưa chạy và không tính
> là đạt. Anh muốn giữ nguyên yêu cầu và chưa chốt phát hành cho tới khi có kế
> hoạch hợp lệ, hay phê duyệt một thay đổi cụ thể về phạm vi/cách chạy/điều kiện
> chấp nhận sau review? Không tự tăng giới hạn, bỏ mẫu, đổi assertion hay dùng
> kết quả GP/GQ thay thế.

> **MS18e-Q-SAV11:** Profile Jigsaw Expert seed 1111, trace off, mặc định 8 lượt
> vẫn [chưa có cận hợp lệ/kết quả thực tế]. Số 325,313 giây cũ không chứng minh
> cận hiện tại hay nguyên nhân. Anh muốn tiếp tục giữ yêu cầu/chưa chốt phần
> này, hay có quyết định rõ cho việc chốt với thiếu sót đã nêu? Không tự đổi
> seed, trace, số lượt, guard hay ghi là đã đo.

Do not post speculative questions instead of doing E0; use real findings.
Technical source-compatibility or scoped CI corrections within existing policy
go to the orchestrator/analysts, not automatically to the owner.

Final handoff lists every changed file, identity, test/occurrence and reuse proof;
all passed/failed/blocked gates and actual costs; every inherited item/decision;
local CI arithmetic and exact remote status; owner actions still outstanding.
The developer leaves execution-log/index writes to the orchestrator.
No “M18 complete”, release-ready or all-green claim while required coverage,
correctness/evidence, owner decisions or matching-head remote checks remain unmet.
