# Sudoku difficulty-v3: resume analysis and dispatch handoff

SA2 / Astra (gpt-6-astra), 2026-11-13. For the orchestrator and SA1 / Opus.
Authority: Fable's complete PR-S1/CV6-03 answers and owner decisions S-OD1 through S-OD4 in
`docs/difficulty-v3/clarifications-resolved.md`.

## 1. Boundary and result

The pack is ready for serial dispatch from **MS05r5p**, subject to the orchestrator's normal review.
This is specification readiness, not acceptance of the implementation at the pause.

- Audited HEAD: `c9935cd`, branch `rating-v3`, after pause commit `a7f6660`. The initial working tree
  was clean. Fable's HEAD change is clarification text, not an engine repair.
- MS01-MS05a remain the eight accepted executable tasks. MS05b1 and MS05r1-r4 remain retained
  implementation/step evidence; r4's stopped log is history, not rewritten acceptance.
- There are now 62 task files (plus the checklist), 58 executable entries including the retained
  implemented steps, and **45 developer dispatches remaining**: seven recovery steps, MS05e and
  the 37 MS06a-MS18e tasks. No existing ID was removed or renumbered.
- All six S3 groups remain. Size defaults, the mega contract, G13 persistence, lighter stops/reviews
  and CI ownership are applied as answered, not returned as new design questions.
- This work changed only the permitted task pack, clarification records and this analyst folder.
  No application, test, fixture, workflow, generated output, plan, report, notes or working-status edit.
  No test, generation, soak, qualification, performance, browser or timing run was made.
  No staging, commit, stash, reset, push, branch change or backup-ref action was performed.

## 2. Code-state findings

Line anchors below refer to c9935cd, not to the future post-task line numbers. Stable quoted symbols
are the dispatch locators. Historical anchors inside frozen tasks/answers are intentionally historical.

| Area | Finding at HEAD | Pack consequence |
|---|---|---|
| Attempt defaults | `generator/js/engine/pipeline.js:26,73,360` still has/exported DEFAULT_MAX_ATTEMPTS=8. `digger.js:624,1807` independently defaults to 8. `store.js:35` has MAX_ATTEMPTS.default=8. Fable's cited anchors hold. | r5p owns one exported defaultMaxAttempts(cellCount), used by both engine routes and the store. UI stays 1-20; existing explicit API validation is not silently narrowed. |
| Board size before building | VariantDef has digits but no cellCount metadata. Pipeline normalization and store normalization run without a built model. Multigrid digits=9 does not mean 81 cells. | r5p owns minimal deterministic size metadata/access, especially butterfly 144, flower 189, sohei 288, samurai 369; no extra seeded Jigsaw build or RNG draw merely to find a size. |
| Store/control | `store.js` defaults 147, normalize 193, toConfig 258, URL patch 339, URL output 361, set 618, load 652 all carry a number. `controls.js:201-209` sets defaultValue from the static 8; its hints are in inline EN/VI packs. | r5p must represent default versus explicit intent, migrate only eligible legacy stored large-board 8 once, preserve new explicit 8/URL overrides, and show/reset the effective default. Numeric equality alone cannot implement the migration safely. |
| Requiredness | `difficulty.js:391` derives requiredness; the reference solve remains at 409. `digger.js:1705,1717` uses model-aware isExact/qualityOf, including shallow quality 0.5. Keeper is at 1173 and keptPuzzle at 1207. | Retain b1; no old level-equality exactness, second production floor solve, dark switch or reimplementation. |
| Allowance/work | `digger.js:653` is SHALLOW_SEARCH_DEFAULT=256. Existing caps remain 1024 ratings, 32768 proposals, 64 refinement ratings, 200000 uniqueness nodes and 100000 objective steps. rateCounted is at 1013; enterLocal/leaveLocal at 1043/1058; localSearchSteps is now a collector wrapper at 1469 around runLocalSearch at 1481. | MS06 anchors and instructions preserve the wrapper/finally, per-attempt localSearches, firstShallowAt and counted refinement; changing the inner path must not reset or double-charge work. |
| Target seam | No target is drawn yet. digLevelSteps starts at 1304; resolved options at 1324, strategy call 1349, attemptBest 1890, sample RNG fork 1903, search handoff 1927. | MS06b inert forwarding, c1 nullable transport and c2 atomic activation remain distinct; no partial sign-only activation. |
| Internal wire | pipeline toWire/fromWire are at 307/335; exact is strict boolean and r3 work is deeply copied. Absent exact becomes false; absent/malformed work stays unavailable. | MS06 transport must retain work. MS17b must inspect raw cache-wire exactness before coercion, or a missing flag looks like a legitimate shallow false. Wire version stays 1. |
| Soak | `soak.js:378` seedFor; 388-403 generateOne; 484 generation timer. Both routes already consume strict producer flags and omit maxAttempts. The non-shard count calculation has a minimum of five. | Headers/default tests belong to r5p. The alleged two-request MS07b/c pilot was stale: it now uses `--from=0 --count=2 --total-count=2`. Seventeen-cell and selector populations keep their original tags/counts. |
| Qualification | `qualify.js:143,186,223,320` are child, hitOf, decide and certain. Workers already omit maxAttempts; hits need valid, solved, not approximate, strict exact and requested level. Constants remain 40/100, 36/90 hits, seed 20260601, 120000 ms request guard, 2/10/30-second p95 budgets. | MS07d records size-policy identity without changing scheduling. MS18c applies (c1) to every board/level; a timeout or fallback is a miss, never an exception preserving an offer. |
| Recovery diagnostics | `difficulty-recovery.js` and recovery-profile helper already run one fixed request with a shared 500 s diagnostic/check budget. Diagnostic mode requires --shallow-cap; it does not set maxAttempts. `recovery-profile.test.js:221-233` explicitly pins all diagnostics to 8. | r5p uses the existing driver with cap 256 equal to production, updates the obsolete universal-eight test, and runs G13 seed 42 plus both mega seed-3 requests once each. No new diagnostic class. |
| R5 evidence | The report/notes/selection preserve 288 requests and winner 256. Only classic9 Nightmare lowers the median at 256: 1417 to 1345, 2/12 hits retained. 64 and 128 lose hits. The six selector boards have 81 cells. | Keep 256 until MS18b. r5p invalidates the large-board diagnostic-time applicability, not the selector. A 5.08% rating-count reduction is not a promised 5% speedup. |
| Mega quick tests | `mega.test.js:653-658` has a 60000 ms generation budget and extra config argument. Lines 690-712 run four invariant seeds and independent CV5 calls 3,3,4 per board. TIME_FACTOR is 2 locally or 3 for CI; SLOW is not the generation guard. | r5m maps all fourteen occurrences/relations to the approved deep tool, retains the real one-attempt mega12 smoke and scripted mega16 stop control, and preserves correct exact/warning semantics. |
| Old mega DEEP | The separate SG_DEEP branch runs 20 seeds, uses a 120 s guard and still counts level-name equality. | It is not the new approved deep contract and is not authorized by a deep-tool request. No blanket SG_DEEP run or silent substitution. |
| Manual corpora/CV3 | The five I5 corpora and variants corpus are still eager. variants has a 240 s request guard, two mega16 seeds and three mega12 seeds. checkLevels retains exact===0 availability failure; correctness/warnings remain separate obligations. | b3 keeps seeds/counts/eager aggregate API, makes per-level access lazy, and checks mega16 Nightmare now. Matching deep records may be reused with CV3's own checks; >240 s is a named availability item, not an owner stop. |
| G13 persistence | `replay-recording.js:32` still has four WIRE_IDS. Recorder headers/tests pin G09-G12, reject G13 as unknown and reconstruct four records. The three quick golden loaders already prefer WIRE[id]. | r6a adds only G13, migrates those exact tests while retaining a real unknown-ID negative, proves no quick regeneration, then records five wires/fourteen analyses/520 hashes. Fresh G13 still uses the 120 s recorder guard. |
| Replay source | r4's g13-closure.cjs accepts the unchanged request and reads current store/default behavior. Its embedded task name remains MS05r4 even in a later invocation. | Reuse that frozen script without editing it; r6a's outer manifest identifies the fresh invocation and actual producer/hash. Old eight-attempt preflight cannot be relabelled current. |
| Greater-Than | MAX_TUNE_ROUNDS remains 8 at line 40; solveWithin 193; stats 249; digPass 303; technique pass 380; keeper offer 403. Signs can be unregistered/wrapped; built-in cells cannot. | MS05e anchors corrected. Its authorized algorithm/diagnosis and target-forwarding contract stay; a timing-only CV6 miss becomes S-AV01 and no longer blocks MS06a. A different strategy/target still needs a decision. |
| Suite names | Existing suites include events and steps, not explain. Explain-data/highlight checks live in events; explanation-card checks live in steps. | Removed the nonexistent MS06c2 `--suite=explain` dependency; long selectors are coverage payloads, not unconditional compound runs. |
| Generic technique history | Core catalogue is still 26 total/21 unscoped, one uniqueness ID. The generic test at techniques.test.js:45-56 assumes the only historical/current difference is jellyfish order. | MS07b, the first new registration owner, updates that current-versus-history projection without mutating v2 history. Planned 28/23 at MS07b and final 40/34 with two uniqueness IDs are consistent with the full pack. |
| Core/player anchors | Fish owner tables and complete units, UR geometry, subset per-call reset, chain minimum search, Player localizeArgs, both formatChains, history VERSION=1 and jigsawSpec remain at their quoted symbols. | Later algorithm contracts still apply. MS08a is the cross-reviewed template; scoped/inactive work uses its applicable subset rather than deferring integration or weakening generic soundness. |
| Hidden stored requests | closestSupportedLevel picks nearest/easier-on-tie, but load normalizes without adjustments and emits an empty list; app loads before controls exist. | MS18c owns a focused startup-note compatibility test/fix. Existing mathematical normalization is not evidence that the note appears on initial render. No invented qualified level if an empty-offer case needs compatibility work. |
| Hash/performance tools | 26 COMBOS x 20 Fibonacci seeds remain 520 keys. perf hash selectors/merges are bounded; timing measure still runs a whole 50-seed cell and has no timing-shard CLI. | Preserve GG keys, distinguish hash from GP, preflight GP means, and record unsafe/slow populations as items; no improvised two-process percentile merge or automatic extra tooling task. |
| CI | generator-suites.sh includes manual suites, including its rest glob. PR Generator timeout is 30 minutes, core/Player 15, browser 30. Pages has no explicit timeout at HEAD. Node 24 in both. | r6c uses the bounded quick manifest in both workflows, keeps deep outside CI, preserves smaller PR ceilings and adds <=30-minute Pages test ceilings. No SG_TIME_FACTOR/timeout increase. MS18e owns the final tree/PR check audit. |

No runtime behavior was inferred as a newly measured result. The old times are labelled by their
old source/eight-attempt configuration. The new defaults' actual closure numbers remain r5p's work.

## 3. Record and pack changes

### Records, index and routing

- `docs/difficulty-v3/clarifications.md`: answered PR-S1 and CV6-03 removed, unchanged, to the archive;
  now records no open question at this handoff. No new decision was invented.
- `docs/difficulty-v3/clarifications-resolved.md`: appended both complete blocks, with IDs/headings,
  questions, cross-checks and answers intact. Added the adjacent S-OD1-S-OD4 current owner-decision
  register, including (c1)/(c2), scope, stops, reviews, evidence and CI. The original archive is retained.
- `tasks/difficulty-v3/check-list.md`: updated authority and current anchors; reset only the erroneous
  r1-r3 acceptance checkboxes; added r5p/r5m/r6c and dependencies; updated section 2/4 decision rows,
  ownership, combined boundary, five-wire E, named-item rules, review matrix and CI ownership.
  Old stops are explicitly historical/superseded, not erased. The execution summary is unchanged.
- Routing/status files amended: `MS05b1-required-exactness-engine.md`,
  `MS05b2-required-exactness-consumers.md`, `MS05c-shallow-budget-instrumentation.md`,
  `MS05d-select-shallow-budget.md`, `MS05r6-combined-recovery-acceptance.md`, all under
  `tasks/difficulty-v3/`. They point at the resumed sequence, do not request reimplementation,
  and retain their original requirement IDs/archived bodies and empty logs.
- Frozen MS01-MS05a and MS05r1-r4 files/logs were not edited. Neither was working-status.md,
  shallow-cap-2026-11-13.md, notes.md, plan.md or the reports.

### Common remaining-task amendment

Every MS06a-MS18e file now states its S-OD4 review mode, correctness/decision-only owner stops,
named numerical item route, `Invoke-Dv3Node`/540 s limit, bounded quick coverage and relevant CI
ownership. Existing business/technical acceptance tables and empty Execution logs remain.
This is not a blanket green waiver: failed/incomplete checks retain their actual status, no
population is silently dropped, and final qualification/publication/release gates remain truthful.

The table below identifies **every remaining task file**, its specific revision and dispatch
addendum. Together with the five routing files and checklist above, it is the full task-file
change inventory. New files are labelled new. This response is the only new analyst report.

## 4. Rules to put in every dispatch packet

1. Supply AGENTS.md, the current checklist, the named task file, its predecessor's actual handoff,
   the applicable resolved S-OD decisions and the cumulative item list. Freeze the task file at
   dispatch; later corrections are binding addenda, not developer edits to the pack.
2. One claude-sonnet-5.5 developer at a time in this repository. No independent worktree or second
   Sudoku developer. Shared-machine timing work also waits for Pentomino's slot.
3. Developers do not stage/commit/stash/reset/push/switch branches or touch backup refs/logs.
   The orchestrator owns review, logs, acceptance and commits. Questions go to SA2; a required
   owner/Fable decision becomes a numbered clarification, never a developer's improvised policy.
4. **Until the combined commit:** pass the retained b1/r1-r4 tree and evidence, not a clean-base
   reconstruction. The pause commit saved them but was not green. After each reviewed step the
   orchestrator records step evidence and maintains its approved private backup, including new
   files, using the separate-index recipe in resolved CV6-02. Preserve existing
   `refs/dv3-wip/*`; developers perform no backup/restore/ref command. r6b is the audit boundary;
   r6c CI remains inside the same acceptance. No intermediate branch commit or acceptance checkbox.
5. After r6c, use the subject:
   `difficulty-v3 MS05: required exactness with measured bounded recovery`.
   Include r6c and the required trailers. The body must state:
   **"The earlier pause commit a7f6660 was not green and was not acceptance."**
   Do not retrospectively manufacture independently green commits. MS05e follows that commit.
6. Supply the current `Invoke-Dv3Node` helper in the same shell invocation: 20-minute lock
   acquisition wait, 540-second process ceiling, one locked command, 15-second inter-run gap.
   Compound projections stay <=450 s. The explicitly approved single-request deep diagnostics
   retain their 500 s budget, not a longer process limit. No inline generating node command outside it.
7. Before r5 is complete, do not use its future --list-tests/--exact/--results flags. Afterwards,
   refresh actual inventories and use disjoint current quick shards. A listed test is not executed
   coverage; local Node/source/factor evidence is not a CI pass on another environment.
8. E after r6a is 520 hashes, five G09-G13 wires and fourteen analyses. Publish wire before
   recording analysis. Current-source ledgers cannot be forged from old ones; finish hashed
   input changes before recording. Retain all original request/seed identities and failed outcomes.
9. Apply S-OD4 precisely: stop for correctness, evidence corruption or a recorded-decision change;
   performance/availability becomes a named item and safe work continues. Do not start an unsafe
   command, fake an incomplete matrix, change a gate, or create another slow-cell tooling/evidence
   class. Mandatory proof/real-example contracts are not dropped under this rule.
10. Every final reply carries inherited/new items: ID, source/default/request, measured numbers or
    labelled projection, limit, outcome, artifact and next owner. Starter items S-AV01-S-AV08 are
    in checklist section 2. Before MS07e route there first; final owners are MS18c for availability
    and MS18d for cost, with MS18e auditing everything.
11. After r6c each suite-adding task owns its CI group; changed explicit test selectors own their
    coupled manifest correction too. Deep is not silently picked up by CI. Do not request routine
    analyst review outside the S-OD4 list; the orchestrator applies MS08a's template to the others.

## 5. Dispatch order and per-task briefs

Paths in the File column are relative to `tasks/difficulty-v3/`. Every row includes the common
packet above. Before the combined commit prerequisites mean reviewed step evidence; afterwards
they mean the normally accepted/committed predecessor unless a recorded owner action says otherwise.

| Order / ID | File | Prerequisite | What to pass beyond the file; change and reason |
|---|---|---|---|
| 1 MS05r5p (new) | `MS05r5p-size-dependent-default-attempts.md` | Retained r4 + S-OD3/S-OD4 | r4 selection/default-pin manifest and three diagnostic identities. One size function and once-only store migration; RS01 preserves recorded attempts through history/cache/export and preserves prior intent when a source:app replay equals its variant's default. Include the replay suites and all named design sections. Diagnostics: G13 seed 42, mega12/16 seed 3, once each. No R5 rerun/E yet. |
| 2 MS05r5 | `MS05r5-bounded-quick-coverage.md` | r5p | r5p defaults/diagnostics and known expensive registrations. Prerequisite now approved contracts, not old mega passes; inventory only, then r5m refreshes its mapping. No expensive callbacks here. |
| 3 MS05r5m (new) | `MS05r5m-mega-nightmare-validation.md` | r5 | Current r5p engine, r5 tools/draft, old mega requests/relations and r4 failures. Fourteen separate default-attempt records, quick controls, honest guard margins and CV3 reuse interface. Once after last recovery engine change; deep is a tool, not a discovered generation suite. |
| 4 MS05b3 | `MS05b3-bounded-manual-corpora.md` | r5m | All seven r2 contract sites, original seed/count manifests, deep wires/identities and current projections. Keep eager aggregate API while making six adapters lazy; mega16 Nightmare checked now, own CV3 checks on reused records, >240 s named rather than blocking. |
| 5 MS05r6a | `MS05r6a-final-evidence-and-pins.md` | b3 and prior recovery evidence | Empty r4 pin list, r3 premise list, current b3/r5m outcomes and known G06/G07 pins. Write G13 persistence/tests first; its branch test passes after B.1 wire publication and before B.2. Complete 520/5/14 E and coupled pins. G14 keeps its request/analysis-only status, but its analysis may change at two attempts. Old evidence stays unchanged. |
| 6 MS05r6b | `MS05r6b-quick-gd-and-combined-acceptance.md` | r6a | All retained b1 B/T and absorbed duties, final E/pins, deep relations and b3 reuse/outstanding list. Reconcile rather than regenerate compatible deep records; measure complete quick cost separately per app. >5-minute Generator item goes to MS07e. Audit ready is not permission to commit before r6c. |
| 7 MS05r6c (new) | `MS05r6c-ci-test-tiers.md` | r6b audit/manifest | Final quick membership/cost and offline deep/manual identities. Replace manual-inclusive workflow groups, <=30-minute jobs, no factor/timeout raise; preserve smaller PR limits/browser coverage. Guide/suite changes require new complete affected-app quick rows, not a runtime-only compatibility waiver. Return CI closure for the combined commit. |
| Combined commit | Checklist section 2 | r6b + r6c accepted together | Orchestrator only; subject/body above, retained history, no retrospective green sequence. |
| 8 MS05e | `MS05e-guided-sign-dig.md` | Combined commit | Actual 256/size-default source, S-AV01, b3 lazy selectors and five-wire E. Diagnose the authorized trap; timing-only CV6 failure now continues with an item and full output evidence, not an owner stop before MS06a. New suite owns CI. |
| 9 MS06a | `MS06a-pre-target-evidence.md` | MS05e | Exact sign-pool/source and any still-red CV6 item; immutable MS02/r4 records. Capture all 17 cells/204 outcomes under the actual policy, not an assumed CV6 repair. Updated soak anchors. |
| 10 MS06b | `MS06b-target-policy-primitives.md` | MS06a | Before-record and real sign comparator handoff. Inert helpers/explicit forwarding only; current keeper/collector anchors and new digger-target CI membership. |
| 11 MS06c1 | `MS06c1-target-transport.md` | MS06b | Inert helper/forwarding tests, r3 work schema, five-wire E. Nullable target/typed objectives without draws or sign activation; strict 520-key unchanged check, deliberate metadata GR. |
| 12 MS06c2 | `MS06c2-activate-target-policy.md` | MS06c1 | Captured keeper target API, original sample RNG route, prepared tests and r3 collector regressions. Activate all stages atomically; preserve wrapper/finally/work. Explain checks belong to events/steps, not a nonexistent suite. |
| 13 MS06d | `MS06d-target-comparison.md` | MS06c2 | Immutable MS06a source/cohort and current flags/defaults. Compare identical 204 identities; every hit/time loss becomes an MS07e/final item, not policy rollback. |
| 14 MS07a | `MS07a-window-kernels-and-pattern-metrics.md` | MS06d | Current singleton minimum/depth code and complete random soundness population. Inactive kernels/cost tool, no output change; new tooling suite owns CI. |
| 15 MS07b | `MS07b-register-chain-windows.md` | MS07a | Cost/seam contracts, genuine shallow nishio source, real-example limits and r5m tool. Preserve old-history projection as new IDs appear. Two-request pilot uses exact shard flags. Apply the mega hell1 quick/deep rule in advance, with fourteen original occurrences and items, not another stop. |
| 16 MS07c | `MS07c-select-chain-cutoff.md` | MS07b | Provisional C=6, source maps, pilot and deep identity. Cutoff/override metadata prevents C=4 and C=6 shards mixing; test rejection explicitly. Select 72 requests by the original rule; do not retain a stale default-six pin if 4 wins. Repeat the exact two-request pilot only if C changes. |
| 17 MS07d | `MS07d-qualification-record-merger.md` | MS07c | Selected cap/C/attempt policy and actual qualifier scheduler/seed protocol. Merger preserves worker errors/early-stop rules; metadata includes size defaults; new suite owns CI. |
| 18 MS07e | `MS07e-first-qualification.md` | MS07d | Cumulative S-AV list, latest pilot, per-app quick cost and 135-cell protocol. Report Killer Hard/Expert and draft owner calibration-versus-hidden question if hidden; propose actual quick-to-manual keys if needed. No weights/moves or live pruning before a decision. |
| 19 MS08a | `MS08a-skyscraper.md` | MS07e handoff | Checkpoint/items and all existing real source maps. Analyst reviews this as the complete technique template; later tasks get its reviewed checklist and generic soundness/order coverage. Five-wire E and CI membership are part of the template. |
| 20 MS08b | `MS08b-two-string-kite.md` | MS08a | Reviewed template, current fish geometry/fixtures/sources and items. Corrected fixture anchor and unconditional whole-quick assumption; orchestrator/template review only. |
| 21 MS08c | `MS08c-empty-rectangle.md` | MS08b | Template/current geometry and all-member visibility contract. Common S-OD4/item/lock/CI rules added; algorithm unchanged. |
| 22 MS09a | `MS09a-finned-x-wing.md` | MS08c | Template and ordinary-fish invariant controls. Common rules/540 s ceiling; only n=2 activates, shared n=3 remains inactive. |
| 23 MS09b | `MS09b-finned-swordfish.md` | MS09a | Shared fin enumeration and already selected n=2 limit. Common rules/CI; new ID's bound only, no retuning predecessor. |
| 24 MS10a | `MS10a-remote-pairs.md` | MS09b | Template, current wing/chain real sources and items. Common rules/CI/540 s ceiling; nontrivial odd-edge witness contract unchanged. |
| 25 MS10b | `MS10b-wxyz-wing.md` | MS10a | Template/current wing fixtures; fixed Master prior. Common rules/CI; no performance-based weight fitting. |
| 26 MS11a | `MS11a-rectangle-types-three-four.md` | MS10b | Template and old type-1/2 priority/unique-fixture evidence. Common rules/CI; no new ID or relaxed uniqueness. |
| 27 MS11b | `MS11b-hidden-rectangle.md` | MS11a | Ordered subtype dispatcher and deadly-geometry guards. Common rules/CI, existing algorithm unchanged. |
| 28 MS11c | `MS11c-bug-plus-one.md` | MS11b | Template and current uniqueness list, still one before this task. Verified list anchor; common rules/CI; final list becomes exactly two. |
| 29 MS12 | `MS12-xy-chain.md` | MS11c | Template, restricted-edge/minimum kernel, current sources already affected by WXYZ. Common rules/CI; no relabelled general chain or synthetic help. |
| 30 MS13a | `MS13a-group-graph-and-proof-checker.md` | MS12 | Singleton graph/proof checker and current actual buffers. Analyst review; inactive graph, independent checks, common item/CI rules. |
| 31 MS13b | `MS13b-group-proof-consumers.md` | MS13a | Canonical group schema/checker, legacy examples and Wordoku/hex vectors. Analyst review; true disjunction/false conjunction, no solver activation. |
| 32 MS13c | `MS13c-activate-grouped-chains.md` | MS13b | Complete graph/consumer handoffs and selected C; old singletons are controls. Analyst review; GP preflight/cost misses are named items, not a new tooling task. |
| 33 MS14a | `MS14a-leftover-support-kernel.md` | MS13c | Applicable inactive-kernel template, current subset per-call reset and Jigsaw model helpers. Orchestrator/template review; complete multiset support, no premature registration. |
| 34 MS14b | `MS14b-register-law-of-leftovers.md` | MS14a | Complete support kernel, actual Jigsaw source/region map, source-tool contract. Common rules/CI; scoped B and real Player replay remain mandatory. |
| 35 MS14c | `MS14c-killer-interaction-regressions.md` | MS14b | Template's test-only subset and existing cageCombo behavior. New tech-cage suite owns both HTML entries and CI; no generated Killer corpus or new cageLocked. |
| 36 MS15a | `MS15a-als-enumerator.md` | MS14c | Current eight source lists, shared work-guard interface and limits. Analyst review; tech-als CI group added alongside eight source/two suite lists; inactive output. |
| 37 MS15b | `MS15b-als-xz.md` | MS15a | Reviewed enumerator, individually complete records and current C/order. Template review; one shared guard, applicable GP projection/item route, no automatic slow-cell tooling. |
| 38 MS16 | `MS16-sue-de-coq.md` | MS15b | Final ALS limits/current sources and template. Common rules/CI; preserve all six groups and final 40/34 count; no retuning shared ALS limits. |
| 39 MS17a | `MS17a-history-version-marker.md` | MS16 | Complete catalogue, real result ratingVersion and r5p explicit/default intent. Orchestrator review; history envelope/key stay 1 and recipes retain explicit attempts. |
| 40 MS17b | `MS17b-version-cache-and-freeze.md` | MS17a | All selected limits, sources/reclassifications/items. Analyst review; raw-wire exact check before coercion, rating/cache 3, history/wire 1, record actual 256/8-4-2/sign-pool/C policies. |
| 41 MS18a | `MS18a-final-matched-soak.md` | MS17b | Immutable MS02 qualified cohort and MS06 isolated comparison, frozen candidate. Updated soak/default anchors; common final item/lock rules, no source changes. |
| 42 MS18b | `MS18b-recheck-cap-and-window.md` | MS18a | Exact original 288/72 manifests and selected defaults. Changed winner remains a real decision stop; mere cost findings do not. Sample-level bound may only be proposed with data as a separate decision. |
| 43 MS18c | `MS18c-qualify-and-publish-offers.md` | MS18b and required owner action | Complete candidate/recheck decisions, all availability items, original v2 table and final 135-cell protocol. Analyst review; (c1) without exceptions, startup correction note, all golden loaders/manual population compatibility and Player imports. No incomplete matrix publication. |
| 44 MS18d | `MS18d-performance-and-final-hashes.md` | MS18c | Validated GQ raw times, exact final offers/targets, cost/CV6 items. Orchestrator review; unsafe GP cells stay named/incomplete, not omitted or automatically assigned new tooling; final aggregate is never computed from a convenient subset. |
| 45 MS18e | `MS18e-release-evidence-closure.md` | MS18d and required dispositions | All task/item/decision handoffs and the v3 PR/check-run identity supplied by the orchestrator. Final 28-occurrence Nightmare/hell1 deep record, GD/quick/CI/source audit; workflows checked once on final tree. PR CI remains pending if no matching run exists. No code tuning/deploy/commit. |

All rows are serial. Parent milestones and the five retained/routing status files add no developer
dispatch. A pure evidence task uses its unchanged quick baseline rather than inventing new unit tests.
No implementing developer must rediscover the S-OD3/S-OD4 choices from raw historical questions.

## 6. Questions and carried items

**No new open question is required for this resume.** `docs/difficulty-v3/clarifications.md` records that
state. The answered text was moved, not paraphrased in place. Everything required for r5p-r6c dispatch
is decided by S-OD3/S-OD4.

Conditional later requests are already owned:

- MS07e: if Killer Hard/Expert are checkpoint-hidden, ask inside-v3 recalibration versus remaining
  hidden until later calibration, with both cells' numbers. No weights change before that answer.
- MS07e: a concrete quick-tier proposal if Generator remains above about five minutes. It is not an
  automatic test move. If the owner wants hidden large-board Nightmare/Hell restored, any speed task
  belongs after S3 and requires its own decision.
- MS18b: a different cap/window winner or a proposed sample-level bound needs the recorded decision.
- A correctness/compatibility defect or another proposed recorded-decision change is escalated when
  observed, with evidence; not pre-emptively turned into an unanswered prerequisite now.

S-AV01-S-AV08 retain the pause findings. Their old values are not new-policy performance promises.
The task-final item list and MS18e audit are required even when no new item arose.

## 7. Files for Opus's cross-check

First check record/dispatch consistency:

- `docs/difficulty-v3/clarifications.md`, `clarifications-resolved.md` and this file.
- `tasks/difficulty-v3/check-list.md`, especially sections 1/2/4/7 and the unchanged execution summary.
- Current routing sections of MS05b1, MS05b2, MS05c, MS05d and MS05r6.

Then review the full resumed recovery files: MS05r5p, MS05r5, MS05r5m, MS05b3, MS05r6a,
MS05r6b, MS05r6c and MS05e. Check especially migration intent, fourteen independent deep calls,
CV3 own checks/no mega16 deferral, five-wire E, compatible record reuse and CI-before-commit.

For remaining semantic instructions check MS06b/c1/c2, MS07a/b/c, MS08a's template,
MS13a/b/c, MS15a, MS17b and MS18c. The table above gives their exact filenames.
For this **pack revision**, also check the checkpoint/final process wiring in MS07e/MS18d/MS18e:
Killer question, quick proposal, final item/CI audit and no false green/incomplete qualification.
That is not a request for routine analyst review of those later developers' implementation.
Other technique task diffs are common template/stop/lock/CI amendments, not changed algorithms.

Read-only source checks worth particular attention: default-size metadata before a model exists;
store load-before-controls note; recovery-profile's universal-eight pin; r3 collector wrapper;
soak's minimum-five non-shard behavior; no explain suite; the first expanded-registry history
assertion; raw cache flag coercion; Pages' absent explicit timeout.

## 8. Remaining time estimate

These are planning ranges, not new measurements or time-budget permissions. They exclude owner
waits, sleep, lock contention with Pentomino, remote CI queueing and unexpected correctness fixes.

| Work | Developer / hands-on | Exclusive machine |
|---|---:|---:|
| Seven recovery dispatches through r6c | about 7.5-11.5 h | about 1.5-4.5 h |
| MS05e diagnosis/repair/evidence | about 1 h | about 1-5 h, depending on permitted pool trials |
| MS06a-MS18e, all six S3 groups and final audit | about 25-33.5 h | working allowance about 15.5-25.5 h |
| Remaining total | **about 34-46 h** | **about 18-35 h** |

With serial Sudoku work, expect roughly **52-81 hours before waits/review overhead**, not a
guaranteed completion date. Final qualification (two 135-cell checkpoints), real example acquisition,
repeated E and expanded quick sets dominate uncertainty. Existing per-gate estimates admit a
wider tail; S-OD4 requires recording a slow/incomplete outcome, not exceeding a command ceiling to
make this forecast come true. r5p/r5m/r6b actuals should replace the recovery projections promptly.

## 9. File-only verification

Archived PR-S1/CV6-03 bodies were compared to HEAD after newline normalization and are unchanged.
All existing task Execution logs and the historical execution summary were compared to HEAD and
are unchanged. All 37 later executable files have their S-OD4 resume section. The 54-file change
scope, links, CRLF/no-BOM/final-newline format, new task templates/index entries and literal suite
names were verified without loading/running the application. Final whitespace validation uses
`git diff --check`; an extra blank line in clarifications.md found by that check was removed.
No test or generation result is claimed by this analysis.

## 10. Response to the resume cross-check (RS01-RS09)

All nine findings in `docs/difficulty-v3/claude-opus-5.5/9-cross-check-of-resume.md` are accepted.
RS01 was fixed first, including its task/checklist ownership and replay tests. No finding needs
a new Fable or owner decision; the changes apply the existing size-default and recorded-recipe contracts.
No code, tests, fixtures, workflows, clarifications, historical evidence or Execution log changed in this pass.

Task paths below are under `tasks/difficulty-v3/`; this report's dispatch briefs were updated too.

| Finding | Changed file(s) | Disposition |
|---|---|---|
| RS01 | `MS05r5p-size-dependent-default-attempts.md`, `check-list.md` | Recorded numeric attempts win in history, stale-cache rebuild and export. A source:app replay equal to the replayed variant's default preserves prior default/explicit intent; a different number becomes explicit. `toConfig(defaults + numeric override)` keeps the number. Added current UI anchors, narrow optional caller ownership and history/export/cache regression cases; no history/version/format migration. |
| RS02 | `MS07c-select-chain-cutoff.md` | Restored the missing no-mixed-C4/C6 shard-merge rule and required a rejection check for otherwise-compatible shards with different cutoffs. |
| RS03 | `MS05r5p-size-dependent-default-attempts.md` | Added explicit difficulty-diagnostics and history/export/cache commands; changed digger/worker cases have separate tagged commands. Filters must select nonzero tests; whole suites still require the bounded projection. |
| RS04 | `MS05r5p-size-dependent-default-attempts.md` | Named design sections 10.4, 14.2 and 14.3 in addition to pipeline/API and 6.8; controls, URL defaults and the stored intent shape are owned. |
| RS05 | `MS05r6a-final-evidence-and-pins.md` | G14 retains its request and analysis-only status, not an asserted unchanged analysis; the two-attempt result is reviewed in B.2. |
| RS06 | `MS05r6a-final-evidence-and-pins.md` | Write the G13 branch test in A0, require it after B.1 publishes wire and before B.2; fresh analysis/pin checks follow their own publication. |
| RS07 | `MS05b3-bounded-manual-corpora.md` | Corrected the eager-corpus/floor-change anchor to `generator/tests/manual/variants.test.js:487-498`. |
| RS08 | `MS16-sue-de-coq.md`, `MS17b-version-cache-and-freeze.md`, `MS18e-release-evidence-closure.md` | Replaced the remaining ten-minute sentences with the 540-second process ceiling and check-list section 7 reference. |
| RS09 | `MS18c-qualify-and-publish-offers.md`, `check-list.md` | Removed both accidental internal-space runs. |

RS01 re-check scope: MS05r5p's recorded-recipe bullet, caller/test ownership, T04, replay vectors and
focused command blocks, plus the checklist's ownership rows. The new recipe tests use scripted clients,
not an eight-attempt real mega16 quick test. A previous rating version can still regenerate a different
puzzle; the preserved contract here is the recorded numeric attempt budget and correct current UI intent.
No disagreement or new open clarification remains. This pass runs file-only validation, no tests or generation.

RS FIXED

SUDOKU PACK READY
