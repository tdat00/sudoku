# Review of the Generation Steps implementation task pack

- **Reviewer:** gpt-6-astra.
- **Date:** 2026-10-28.
- **Reviewed:** `tasks/generation-steps/check-list.md` and GS01–GS08, including their executable recipes.
- **Source baseline:** `8d9510aade5d99f4fec9fda3835245a31f411ede`; branch `generation-steps`.
- **Authority:** the signed [joint specification](../report-detailed.md), the user's decisions, and
  [golden acceptance data](4-acceptance-data.md). Remaining implementation details were settled by recommendation.
- **Scope:** task documents only. No product code, tests, existing fixtures or signed research were changed.
- **Notation:** repository paths are relative to the repository root. **E** is my experiment folder
  (not part of the repository); experiment references below use `E\file`.
- **Counting:** a fix is a numbered, related change group, not a changed line or diff hunk.

## 0. Verdict

**Ready for sequential implementation, starting with GS01. No blocking issue remains.**

I applied **45 change groups** directly to the nine task documents. Their Business and Technical acceptance
tables remain, and all eight Execution logs remain empty. The golden fixture literal is unchanged.
This is acceptance of the implementation instructions, not a claim that the unimplemented feature passes tests.

| File | Fix groups | Items below |
|---|---:|---|
| `check-list.md` | 5 | 1–5 |
| `GS01-replay-moves-and-ratings.md` | 6 | 6–11 |
| `GS02-views-selection-and-tiers.md` | 5 | 12–16 |
| `GS03-jump-explanations.md` | 4 | 17–20 |
| `GS04-worker-job-and-clients.md` | 5 | 21–25 |
| `GS05-replay-views-texts-and-preparation.md` | 6 | 26–31 |
| `GS06-steps-panel-callout-and-frames.md` | 5 | 32–36 |
| `GS07-documentation-consistency.md` | 3 | 37–39 |
| `GS08-final-verification.md` | 6 | 40–45 |
| **Total** | **45** | |

## 1. Corrections applied

### Checklist

1. **Dependencies and ownership.** GS04's complete-analysis tests require views and explanations, not just GS01.
   Its prerequisite is now accepted GS03. GS07 may edit its two Help locale entries, but not product logic.
   Evidence: GS04's loopback equality contract includes the GS02/GS03 fields; GS07 explicitly owns Help prose.

2. **Execution protocol.** Step 0 now verifies and uses the existing branch instead of recreating it.
   The orchestrator rechecks quick suites, but does not routinely repeat GS08's once-only full/browser gates.
   Evidence: the starting branch is already `generation-steps`; user decision Q9 c.

3. **Evidence location.** Replaced repository scratch work with external E and immutable snapshots.
   The player browser command explicitly runs from `E\candidate\player`.
   Evidence: `player/tests/browser/lib.js:15–35` creates screenshots/profiles beside the helper's source.

4. **Shared decisions and handoffs.** Synchronized D1/D3/D6/D15 and added D23–D26: the public view builder,
   explicit main-mode permission, progress completion, status reasons, controller races, rendering context,
   inactive-sign frames, restart deltas and qualified first-occurrence wording.
   These resolve implementation contracts without changing the user's selected design.

5. **Validation language.** Require immediate native exit-status checks. Existing browser failures are
   limitations to compare and report, not intentional successes. Golden mismatches go to the orchestrator,
   not to a developer changing expected numbers. Evidence: PowerShell can continue after a failed native command.

### GS01 — Moves and ratings

6. **Move-model failure shape.** Failed reconstruction retains the complete model metadata needed by fallback;
   known cell lists must contain distinct, in-range integers.
   Evidence: downstream view construction needs structure/sign information even when a log is unusable.

7. **Honest ratings and conservative fallback.** Initialize the full Rating shape, including empty cells,
   before a possible guard exception. A zero solution count is unscored contradiction, never a rated puzzle.
   Missing supplied final ratings produce `unverified` / `missingRating`, with no invented zero or fresh solve.
   Fallback constructs solution/structure only when available, then exactly one final/status step.
   Evidence: signed R4/R5/R9; `core/js/engine/dfs-solver.js:186–194`.

8. **Documentation order.** Update both developer guides before running Help and the complete quick set.
   Running the new replay suite first remains appropriate.
   Evidence: `generator/tests/suites/help.test.js` checks documented scripts and public API names.

9. **Test staging and identity.** GS01 no longer asserts GS02's unfinished compact-view contract.
   Synthetic tests changing givens must recompute the supplied final rating before installing no-solver spies.
   The 14 details goldens get identifiable browser test names. Result immutability checks include own keys,
   so attaching a sidecar property cannot hide behind the wire serializer.
   Evidence: final-rating memo seeding and the browser harness's per-test results.

10. **A real count-guard witness.** Replaced G01 with G04 in the `countNodes: 1` unverified test.
    G01 and G03 each return one solution after one check; they do not exhaust that guard.
    G04 and G05 throw `budget.exceeded` at check 2. G04's default count completes with one solution in 7 checks,
    and its rated total is 2879. Evidence: `E\phase5b-guard-controls.json`,
    `E\phase5b-bounded-controls.json`.

11. **Executable commands and fixture paths.** Added fail-fast PowerShell commands with location restoration.
    The fixture generator resolves source/output paths from its own app directory, not an incidental cwd,
    and writes only its new replay wire fixture.

### GS02 — Views, selection and tiers

12. **An implementable public builder.** Chose `SG.replay.buildViews(analysis)` returning
    `{ chapter, views, transitions }`, pure and shared by production and synthetic tests.
    Updated exports, acceptance and handoff; removed the unspecified audit options argument.
    Selector overrides are defined, while production uses the fixed defaults.

13. **Scored endpoints and fallback.** Selection ends at the last finite-scored position; an unscored tail
    cannot be attached to an older board. Empty/unscored inputs are specified, start rank survives `s === e`,
    and conservative fallback bypasses selection without duplicating its final position.
    Evidence: signed R1/R7/R9: a score must belong to the displayed board.

14. **Deltas and actual technique use.** Details retain the restart drop, including the synthetic 551 → 0
    delta of −551. New-hardest detection requires scored endpoints and a positive technique count;
    merely having a zero-valued key is not a previous use. Fallback final deltas are not forced to zero.
    Evidence: signed R3/R10 and the restart control in `4-acceptance-data.md`.

15. **Request-scoped jump identity.** The union is keyed by `(goldenId, from, to)`, not indices shared by
    unrelated puzzles. The expected totals remain 13 compact jumps, 16 details jumps and 19 distinct
    request-scoped transitions. Evidence: the 14-request golden corpus.

16. **Executable commands.** Every Node exit status is checked, with `finally` restoring each location.

### GS03 — Jump explanations

17. **Probe certification.** Removal-containing partial probes explicitly request `forceCount: true`.
    They cannot rely on a logical report alone when the audit requires an independent uniqueness count.
    Evidence: signed R14 and the unsafe half-exchange control.

18. **Honest proof and first-occurrence wording.** A collected first-use proof must finish before it is
    described as a solution. A multi-move transition whose endpoint technique was already used gets neutral
    combined wording. Earlier unscored positions require the `verifiedOnly` qualification.
    Added the corresponding cause field and controls; “needs” becomes “uses”.
    Evidence: signed R11 and the status contracts of GS01.

19. **Memo lifetime.** Endpoint proofs and pair facts may be shared only within the same analysis/request.
    Position indices alone are not cross-puzzle identities. Evidence: signed R15.

20. **Executable commands.** Added immediate native failure checks and location restoration.

### GS04 — Worker and clients

21. **Real prerequisite.** GS04 depends on GS03, because its expected analysis includes both views and
    explanations. This is reflected in the checklist and task header.

22. **Permission and error routing.** `replay` defaults to `allowMain: false`; main/direct execution requires
    an explicit grant. Worker failure after readiness cannot silently move replay calculation onto the page.
    Missing permission rejects with `budget.cancelled`, reason `replayConsentRequired`.
    Replay errors are handled even when the old generation record is null. Examples, docs and handoff agree.
    Evidence: `generator/js/ui/worker-client.js:284–289`; signed Q17/Q19.

23. **Progress and cancellation.** All schedulers retain the latest yielded progress and flush it before
    completion, including one-slice work and immediate fallback. Repeated explanation yields at the final
    count do not duplicate callbacks. Direct-client slices check their live token.
    Evidence: the iterator contract and GS04's required progress/cancellation tests.

24. **Strict worker-only generation.** `forceMode: 'worker'` must also be honored after failed worker respawn.
    The existing automatic generation fallback remains unchanged for ordinary auto mode.
    Evidence: `generator/js/ui/worker-client.js:367–380,443–468`; otherwise GS05's automatic cache trace could
    unexpectedly run generation on the page.

25. **Executable commands.** Added fail-fast validation; the permission-positive and permission-negative
    cases are explicit rather than relying on an unstated main-mode grant.

### GS05 — Preparation and replay UI

26. **Explicit rendering context.** Every Step carries one shared, read-only `context: { moves, signs }`.
    GS06 can resolve a change or `kMove` without inaccessible `analysis`/`built` variables.
    The context is not attached to the generation result or persisted.

27. **Controller state and races.** Specified the captured client, active job, mode, running flag and per-run
    identity; bound `job.result`; preserved same-result consent when a trace is attached.
    Synchronous throws follow the rejection path. Progress/publication are guarded, including after callbacks.
    Early unavailability is latched; live main mode overrides stale worker readiness before fallback browsing.
    Evidence: `generator/js/ui/app.js:858–873` mutates the same result object when attaching its log.

28. **Cache trace gate.** Latch early consent, initialize the gate once, define mode resolution, and recheck
    live mode before starting. Automatic traces use a worker-only background client; consented main traces
    use the uncached inner client directly. `startTrace` takes that chosen client instead of reacquiring one.
    Empty logs can be replaced by an attached nonempty log. Sign and cell runs share defined reject-reason logic.
    Evidence: `generator/js/ui/cache.js:984–1108`; the old trace starts automatically.

29. **Correct migration of an existing test.** The large-board synthetic at
    `generator/tests/suites/player.test.js:354–377` has no `keep` events.
    Its complete moves are solution, search removal and exchange; UI title kinds are
    solution/search/search/final. It is not two guided moves plus a detached search addition.
    Preserve its geometry and correct the supplied final-rating setup.

30. **A truthful intermediate milestone.** GS05 delivers all table models and the existing scored-table
    adapter; GS06 delivers zero/status DOM tables. Interim guides and Help say this accurately.
    Preserve restart deltas, guard a predecessor-less fallback table, and keep browsing disabled until
    preparation finishes, not merely until the button is pressed.
    Evidence: `generator/js/ui/step-view.js:415–426` still renders the old no-technique paragraph before GS06.

31. **Executable commands.** Added fail-fast commands and required controls for early consent, unavailable
    traces, same-result attachment, empty logs and worker-to-main races.

### GS06 — Tables, explanations and frames

32. **Reachable data.** `explain(table, step)` explicitly reads `step.context.moves/signs`.
    The copied Cause contract includes `verifiedOnly`; no unprovided private player variables are assumed.

33. **Complete, honest copy.** Added missing-rating and contradiction status text, qualified grouped-first-use
    text, and neutral combined-move text. Improved Vietnamese restoration/exchange, unscored-choice and
    audit-scope phrasing. Unfinished proofs and unknown predecessors cannot become necessity claims.
    Evidence: signed R5/R11 and the corrected GS01/GS03 data contracts.

34. **A frame, not a revived sign.** A culprit sign stays in `removed`.
    Draw a separate padded SVG rectangle around the original sign's bounds, with `sign--cause`,
    `data-cause-sign` and no `data-sign`. Remove stale frames; do not frame hidden/invalid geometry.
    The original glyph retains its removed styling. Tests inspect both identities and geometry.
    Evidence: G11's removed sign 6; `core/js/ui/board-view.js:983–993`;
    `core/css/board.css:242–254`.

35. **Zero-state deltas and final docs.** Render the modeled zero total rather than hard-coding its text:
    the details restart can show `0 (−551)`. Add its test and replace GS05's interim Help wording with
    the completed every-state table behavior. Evidence: signed R3/R9.

36. **Executable commands.** Fail fast and run both apps' quick sets because the shared board renderer/CSS
    changes in this task.

### GS07 — Documentation consistency

37. **Do not legalize defects.** Approved example counts are expectations, not placeholders to replace with
    whatever the implementation produces. Report mismatches to the orchestrator.
    The additional guide examples were independently reproduced; numbers are in §3.

38. **Historical text is not a live contract.** Classify stale-term hits before editing.
    Keep clearly identified historical task-card wording and unrelated uses of “steps”.
    Evidence: the scope is current behavior documentation, not rewriting the repository's history.

39. **Checks must fail visibly.** Added native exit checks and a guarded absolute-path search that fails on
    a match instead of merely printing it, while handling an empty file list.

### GS08 — Final verification

40. **External, immutable evidence.** Replaced repository scratch recipes with full tracked-tree snapshots
    in E, using `git archive` without worktrees, stashes or binary pipes.
    Import browser helpers from the candidate snapshot. Keep scripts, logs, JSON, string review and screenshots;
    delete only owned snapshots/profiles after checking ownership.
    Evidence: user Q6 b; `player/tests/browser/lib.js:15–35`.

41. **Actual identity assertions.** `digest.js` now asserts all six baseline values, not just the puzzle hash.
    It checks serialized result and own-key immutability around analysis. Protected-path diffs reject
    unexpected engine/storage/player/fixture changes rather than merely printing them.
    Evidence: all six assertions passed against HEAD; values are in §3.

42. **Full golden sweep and cost.** Check compact rows, every details score, signs, terms, levels, causes,
    probes, choices, first-use keys/effects and folds; count jumps in both views and the request-scoped union.
    Measure full preparation, position work and post-position work, complete JSON bytes and approximate
    retained heap/array-buffer deltas. These are not peak-memory measurements.
    Evidence: frozen golden data; signed R15.

43. **A meaningful browser comparison.** Check newly failing tests, runtime-error multiplicities and missing
    files on both snapshots. Require all 14 named golden details tests to pass, not skip.
    Close resources in `finally`, including launch failures. Baseline equivalence is not an all-pass claim.
    Evidence: `generator/tests.html:247–285`.

44. **Real behavior, not only DOM absence.** Instrument before app startup to distinguish requested generation
    from replay solving. Prove no automatic main-mode replay, worker analysis off the page, and no new solves
    on navigation/toggle/locale changes. Check every example total, callout sentences and opened Why content,
    exact cell identity, and the rectangle around inactive sign 6.
    Evidence: `generator/js/ui/app.js:1199–1203`; G01/G11 and Q17/Q19.

45. **Runnable, fail-fast final gates.** Assert clean committed branch, Node 24, browser executable, no upstream,
    free gate ports and an unchanged candidate SHA. Capture native exit codes and durable logs.
    The player gate runs seven script files in eight executions, because fragment runs in both modes.
    Cleanup checks owned profiles and all gate ports. GS08 owns the once-only full/browser gate evidence;
    product fixes require an explicitly recorded replacement candidate, not a silent rerun or waived assertion.

## 2. Deliberately unchanged

- **User decisions and selection policy.** Compact by default, complete-move details, unsplit symmetry groups,
  nondecreasing compact scores, eligible phase ends, the exact jump predicate and one-decimal floor all remain.
- **Golden data.** G01 remains `0, 23, 44, 551, 568, 992, 992`, with 33 details steps.
  The 14 requests retain 101 compact screens, 814 details screens and 5 culprit frames.
  No regression hash, stored fixture or expected golden number was changed to make a check pass.
- **Valid source contracts.** `budget.nodes` exists; `SG.i18n.formatNumber(n, options)` is correct.
  The UI contract allows extra exported members. Its existing `PLAYER_INSTANCE` does not require `rateStep`,
  so its additive extension was correct. Evidence: `core/js/engine/budget.js:22–90`;
  `generator/js/ui/i18n.js:271–318`; `generator/tests/suites/ui-contract.test.js:51–74`.
- **Explicit pack conventions.** Kept first-rated labeling once per view, plural placeholders, the staged
  `stats` adapter, and the absence of a new autoplay control. Existing scrubber ticks are not new jump marks.
- **Locale-neutral formatting.** `steps.techniques.change` is a placeholder-only format, not untranslated prose.
  No arbitrary difference was added between its English and Vietnamese formats.
- **Generation fallback.** Ordinary auto-mode generation may still fall back to main as before.
  Only explicit worker-only requests and replay consent need the stricter behavior.
- **Final-gate scope.** No full/manual/browser test was run during this review. Those executions remain GS08's
  authorized final work; there is no reason to delay GS01 for them.

## 3. Verification and evidence

### Golden and document checks

`E\phase5b-validate.cjs` and `E\phase5b-task-validation.json` record:

- **2469 assertions, 0 errors**, including **2157 fixture assertions**.
- All **14** requests, **101** compact rows and **814** details scores compared with the raw acceptance data.
- Configurations, board metadata, alive signs, folds and jump explanation fields checked too.
- The complete golden JavaScript literal compared unchanged with its pre-review copy.
- **98** bilingual string rows checked for placeholder agreement; prose translation differs appropriately.
- **16** explicit source line-range bounds checked, plus local Markdown links.
- All **6** embedded GS08 JavaScript programs compile.
- All **11** protected research/specification files retain their pre-review SHA-256 values.

A separate PowerShell parser check accepts all **19** PowerShell fences, including the indented GS07 example.
Neither syntax check executes a final gate. Initial validator assumptions about indentation, the raw sign-index
field and language-neutral formats were corrected in E; they did not require changing expected data.

To repeat the main static/data check, run `node .\phase5b-validate.cjs` from E.
The pre-review task copies are in `E\phase5b-before`; protected hashes are in `E\phase5b-protected.json`.

### Bounded source controls

`E\phase5b-bounded-controls.json` records fresh generation plus revised-prototype preparation:

| Request | Clues | Final | Today's steps | Compact scores | Details | Measured ms |
|---|---:|---:|---:|---|---:|---:|
| Classic9 easy, seed 3 | 34 | 46 | 9 | 0, 14, 24, 34, 44, 46, 46 | 26 | 29.52 |
| Killer hell2, seed 11 | 12 | 3723 | 21 | 0, 0, 27, 98, 162, 517, 579, 3723, 3723 | 38 | 695.42 |

These confirm the task pack's additional guide examples without weakening their expectations.
The count-guard controls are quoted in item 10.

The extracted `E\phase5b-validation\digest.js` and `common.js` passed the six baseline assertions:

```text
payload  d350758d7af16c41f4910469df513f56a7516966407285e1f39d9d983df68f2d
cache    2 sg.cache.v1
key      82d89648e2b42748872a110f6355d7c3416055201dcae2a5d340383d5371503e
entry    14fcbdf8dde2a49a69def46ecbb6643751dce0369185618c98461e25124d9d12
history  fa83aa721063b3ff02812713601afeb1e7bf0ce7c9733afc99a9e7261d188b03
export   897e6f3033f5e0036a12e685744465d67b5d796bd2d635949b974e9d6a5889a7
```

The APIs exercised were `SG.store.toConfig`, `SG.pipeline.run`, `SG.pipeline.toWire`,
`SG.budget.create`, `SG.dfs.countSolutions`, the existing serializers and the read-only acceptance prototype.
The new implementation APIs do not exist yet; their acceptance tests are instructions for the developers.

## 4. Non-blocking implementation remarks

1. **Run the task-local tests as the code lands.** In particular, exercise the consent/readiness races and
   fake-DOM sign bounds; static review is not a substitute for those tests.
2. **Keep ownership disciplined.** If an accepted prerequisite has a defect, report it to the orchestrator
   for a surgical correction. Do not alter goldens, old fixtures or the signed spec to fit implementation output.
3. **Treat final browser evidence honestly.** Record baseline failures, infrastructure limitations and any
   justified script-selector adjustment. Never silently waive a new product failure.
4. **Measure costs at GS08.** Retained-memory deltas are noisy and are not peak memory; both views' explanation
   work belongs in the full preparation measurement.
5. **No new product decision is needed before GS01.** These remarks can be handled during implementation.

## 5. Repository integrity

All nine task files and this new report use UTF-8 without BOM and consistent CRLF.
The existing research/specification files are unchanged; no product code was edited.
HEAD and branch remain the stated baseline and `generation-steps`. No commit, staging, stash or push was made.

Starting `git status --short`:

```text
?? docs/generation-steps/
?? tasks/
```

Ending `git status --short`:

```text
?? docs/generation-steps/
?? tasks/
```

Both the tracked working-tree diff and the staged diff are empty. The untracked directory status includes the
pre-existing research/task pack and the authorized task-document/report changes from this review.
