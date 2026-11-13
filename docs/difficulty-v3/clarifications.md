# Rating v3: clarifications for the plan author

Open questions for the plan author (claude-fable-5-2). Only questions that still need the plan author's answer
are kept here. Every earlier question, answer and owner decision is in
[clarifications-resolved.md](clarifications-resolved.md) with its id and part letter unchanged: the analysts'
questions and the author's answers (Parts A to G), and the post-acceptance findings CV6-01 (owner decision S-OD1)
and CV6-02 (owner decision S-OD2) in Part H. When a question here is answered, it moves there.

How to answer: write the answer under the question's **Plan-author answer** line.

---

## PR-S1: review of the progress at the pause

**Raised by the orchestrator at the owner's request, 2026-11-13. Answer requested from Fable (plan author).**

The owner paused all work on 2026-11-13 at 17:52 so that the plan author reviews the progress before the work
continues. [working-status.md](working-status.md) gives the state at the pause (MS01 to MS05a committed;
MS05b1 and the recovery steps MS05r1 to MS05r4 done to their step evidence, MS05r4 stopped; sudoku waiting for
CV6-03 (c) since 13:35), the issues met and the resolution chosen for each, and the differences from the plan,
the analysts' report and the accepted task pack. The pause state is committed on `rating-v3`.

Requested:

1. The direction to take next: whether the recovery sequence (MS05r5, MS05r5m, MS05b3, MS05r6a, MS05r6b) and
   the rest of the pack continue as planned or change, together with the answer to CV6-03 (c) below.
2. Any difference in working-status.md section 5 that you do not accept, and what replaces it.

**Plan-author answer:** pending.

---

## CV6-03: R5 selects 256, but mega Nightmare exceeds the existing limits

**Raised by SA2, 2026-11-13. Answer requested from Fable (plan author) and the owner.**
This is the further decision required by **S-OD2**, not a failed R5 selection. MS05r4 has stopped at the
original-limit mega preflights. Its results do not authorize MS05r5, MS05b3, MS05r6a or MS05r6b to pass those
failures, change a guard, move a test or persist G13 on their own.

Sources: [MS05r4 evidence](evidence/MS05r4/evidence.md),
[selection](evidence/MS05r4/selection.json),
[default and blockers](evidence/MS05r4/default-pin-manifest.json),
[G13 preflight](evidence/MS05r4/preflight/G13.json), and
[allowance report](shallow-cap-2026-11-13.md). The transcripts and diagnostic records linked there are kept as
failed/passing evidence under their actual identities; none is replaced by this question.

### The measured stop and the default

| Fact | Meaning |
|---|---|
| R5 selected **256**, eligible settings `[256]`, no measurement problem; 288 selecting requests, six fixed cells | Keep the result of the accepted rule. This is not permission to select 64 or 128 because they run mega faster |
| classic9 Nightmare: none = 2/12 hits, median 1,417 full ratings; 256 = 2/12, median 1,345 | A **5.08% reduction in the median rating count**, not a promised 5% speedup. It is the only cell whose median falls at 256; no cell loses a hit |
| 128 gives 1/12 and 64 gives 0/12 in that cell | Both are ineligible under R5, irrespective of their faster diagnostics |
| Default literal is now 256 at `generator/js/engine/digger.js:653`; source hash `9a833d9376381c6f9e2df4c5a79aba981bbd8a3dafce9e572ff2641bd61759ce` | The measured source was `19afa6ee…` with explicit overrides. MS05r4 verified that reverting only the new default literal recovers that source. The working tree remains uncommitted |
| G13 preflight: **104.712 s / 120 s**, eight attempts, shallow fallback, `exact: false`, `required: false`, score 1,637 | Passes the original generation guard, consuming 87.3% of it; about 15.3 s headroom |
| mega12 Nightmare quick group: seed 1 takes **48.202 s / 6 s** | One test fails its original latency assertion. The separate CV5 test passes in 137.7 s; that does not make the group pass |
| mega16 Nightmare quick group: **both tests throw `budget.exceeded` at 60 s** | Neither reaches a successful comparison with the separate 20 s latency assertion |
| Focused checks at 256: 463 + 30 + 16 pass; `pins: []`, `returnedPremises: []` | The two mega blockers are performance/contract decisions, not stale numerical pins or permission to undo requiredness |

The four-setting diagnostics use the unchanged fixed requests, normal eight-attempt configuration and a **500 s
diagnostic budget**. These are generation times, excluding command startup; they select nothing:

| Request | none | 256 | 128 | 64 | Ordinary samples alone |
|---|---:|---:|---:|---:|---|
| G13, samurai Nightmare, seed 42 | 220.5 s | 104.6 s | 86.7 s | 80.0 s | About 74 s at each setting; eight attempts, same shallow fallback |
| mega12 Nightmare, seed 3 | 65.1 s | 47.1 s | 43.8 s | 39.4 s | 37.5-39.1 s; eight attempts, same shallow fallback at every setting |
| mega16 Nightmare, seed 3 | 388.7 s | 310.2 s | 296.3 s | 270.4 s | 263.2-281.3 s; same exact, required puzzle at attempt 6 at every setting |

The allowance acts on local continuation, not these earlier samples. Consequently it cannot meet the old mega
limits for these requests even if the remaining local continuation were free. This is the predicted sampling
cost identified in SA1's CV6-02 cross-check, now measured.

**256 stays the global default for this recovery under (a), (b), (d), and a mega-specific (c).** This question does
not reopen the six-cell selector or turn mega diagnostics into selection criteria. A proposed change to common
sampling/rating behavior that also changes the selector's semantics would need separate authorization/evidence;
it cannot be smuggled in as a mega-only exception.

### What the browser actually permits

The Generator uses **120,000 ms of active generation time**, with no mega-specific increase:

- `generator/js/worker/worker-client.js:45,198,434,468`: the default is 120000, sent to the worker or used by the
  cooperative main-thread client.
- `generator/js/worker/gen.worker.js:97,249-268`: the worker applies the same default and active clock.
- `generator/js/ui/app.js:1191` uses that client without a larger mega budget; the cache's worker-only background
  client also uses the default (`js/ui/cache.js:692-694`). The legacy direct client has a 120000 ms wall-clock
  guard as well (`app.js:110,349`).
- Default attempts are eight (`js/ui/store.js:35`, `js/engine/pipeline.js:26,73`). The advanced control permits
  1-20 attempts; it does not expose a longer time budget.
- Time yielded to the page is excluded from the active clock (`core/js/engine/budget.js:95-113`), so 120 s active
  is **not** a two-minute wall-time guarantee. Checks are sampled, not an instantaneous wall-clock kill.

For the measured mega16 seed 3 path, even its 278.1 s of ordinary samples at 256 exceeds the application's 120 s
allowance. At comparable engine throughput it reaches that budget before its exact sixth attempt; it does **not**
normally finish successfully after five minutes. Its first two attempts consume about 109 s in the diagnostic,
with no exact hit. A larger-budget run can finish in about 310 s, but that is the diagnostic, not the current UI
contract.

A budget failure is not converted into the best-so-far puzzle: `digger.js:1791-1798` and `pipeline.js:156-160`
rethrow it, the worker sends an error (`gen.worker.js:191-198`), and the app clears the unfinished result and
shows the failure (`app.js:850-863,883-886`). The ordinary fallback is returned when the attempt limit is
exhausted normally, not on this exception. Mega12's measured 47-48 s run fits 120 s on this machine, but still
costs tens of seconds and returns a truthful shallow fallback.

The standalone Player imports/plays puzzles; it does not run the Generator's generation client. Its import
solver guard is 6 s (`player/js/ui/importer.js:40,731`), a different operation and not a generation allowance.
An unavailable Generator result cannot be made available by changing a Player guard.

**Evidence versus inference:** no browser or new generation was run for this question. The budget and error path
above are code facts; reaching 120 s for this fixed request is the implication of the recorded work/times on
comparable hardware, not a measured browser run or a claim that every seed and device behaves identically.
Under v2 the early shallow puzzle could be returned quickly while falsely counting as Nightmare. Restoring that
old exactness test is not a valid speed fix.

### Question: which contract is authorized?

Options may be combined; **(d) is an adjunct, not a resolution of the mega failures**.
The new task IDs below are proposed ownership, not dispatch authorization or task files created by this question.

| Option | Scope and named owner | Effect and remaining obligation |
|---|---|---|
| **(a) Change the mega Nightmare validation tiers — recommended for the recovery** | Add **MS05r5m, mega Nightmare validation contract**, after r5 tooling and before b3/final E. Move normal-attempt mega Nightmare generation from routine quick coverage to an explicit slow/manual contract. Quick coverage checks bounded behavior, including a real one-attempt smoke where affordable and a focused shallow-fallback case; keep validity, uniqueness, givens/solution agreement, solver soundness and truthful exact/warning assertions | Changes test organization and explicitly replaces the old quick latency promise, not product generation. Preserve the full original requests/relations in mandatory slow evidence before combined acceptance. Choose guards from complete measurements with stated margin; no global `SG_TIME_FACTOR` change. The UI's 120 s problem remains unless separately disposed of under (c); this is not product qualification |
| **(b) Accept normal-attempt mega Nightmare as slower quick work** | The same **MS05r5m** owns the explicitly approved per-board request guards and latency assertions, their documentation and internal request sharding | Keeps the production algorithm and 256, but makes complete quick validation much more expensive. Raising only `SLOW`, a harness timeout or a time factor does not fix the 60000 ms generation guard. With larger test budgets the UI still has 120 s. Raising the application's budget too would be a separate, explicit minutes-long product contract, not implied by this option |
| **(c) Change the large-grid product policy** | Fable specifies a concrete mega-only policy; proposed **MS05r5p, mega Nightmare product policy**, owns it before final-source E if selected now. Possibilities: deterministic bounds on ordinary sample/attempt work, returning a fully rated truthful fallback; or stop offering mega16 Nightmare until it can be qualified | An attempt cap of one would lose the observed required hit at attempt 6; that is an explicit availability trade-off, not an R5 result. Lowering only the shallow allowance cannot solve the sample cost. One attempt is not automatically a 6 s/20 s request. A withdrawn offering needs explicit controls/settings/refusal behavior, EN/VI documentation and continued opening of existing puzzles; no silent change of a stored/requested level. Any affected fixed regression request remains accounted for under the approved contract, not deleted |
| **(d) Persist the same G13 — recommended alongside (a)** | Expand **MS05r6a**, before its final-source recording, to own adding G13 to the saved-wire manifest/loader and related fixture tests. It then records five wires (G09-G13), still fourteen analyses (G01-G14), and all 520 GG keys | Removes repeated ~105 s G13 regeneration from quick consumers without changing seed 42, requested Nightmare, attempts, puzzle validity or requiredness. It does not fix mega and does not by itself remove the recorder's own 120 s risk: `replay-goldens.js:23-45` still regenerates every analysis request. Keep that guard unless a separate G13-specific margin is explicitly approved; if fresh recording fails, stop rather than substitute the earlier record |

**The bounded-coverage detail matters for both (a) and (b).**

1. The existing mega Nightmare population is seeds **1,2,3,4** for invariants, plus independent calls **3,3,4**
   for CV5, per board (`mega.test.js:690-712`). Preserve those requests and the same-seed/different-seed comparisons.
   At the seed-3 diagnostic cost, three mega16 calls would take about 931 s and four about 1,241 s: neither callback
   fits 540 s. Merely moving a callback to a slow tier or increasing its timeout is insufficient.
2. MS05r5m must authorize and implement single-request bounded records plus reconciliation of all original
   assertions/relations, with relevant source/config/seed/harness/guard identities and no missing or duplicate
   coverage. Quick replacements are a separate inventory. Do not silently drop repeats, replace seeds or run the
   existing whole `SG_DEEP=1` branch: it has its own 20-seed loops and 120 s generation guard.
3. A one-attempt quick contract also needs honest bounds. The measured first-attempt prefixes at 256 are about
   **5.2 s for mega12 and 56.7 s for mega16**; these are not new one-attempt validation runs or upper bounds.
   In particular, "one attempt" does not preserve mega16's old 20 s assertion. A scripted control may check the
   stop/fallback mechanism cheaply; moved full-request correctness coverage must still run.
4. Only seed 3 has completed full-request mega16 timing here; seed 1 has a 60 s cutoff, and other quick seeds'
   full costs are not established. Guards must be chosen from bounded measurements of the complete fixed
   population, not copied from this one successful diagnostic. The existing 500 s diagnostic ceiling and
   **540 s per process** remain; a request that cannot finish inside the allowed bound returns to the owner.
   Roughly 42 minutes for all fourteen full calls, if the other seeds cost like seed 3, is a planning projection,
   not a measured upper bound. Option (a) moves that cost out of ordinary quick runs; it does not erase it.
5. Test-contract changes do not silently rewrite design/qualification targets, accept every fallback as exact,
   or qualify a level because its score label matches. Record the old 6 s/20 s failure and the new contract.
   All other levels, G14, S-OD1's CV6, uniqueness and correctness obligations stay unchanged.

### Recommendation and the product decision

**Recommend (a) + (d), retain 256, and do not adopt (b) as a blanket larger-budget fix.** This separates routine
correctness checks from expensive full generation and avoids repeatedly exposing G13's small time margin.
It preserves the requiredness improvement instead of hiding the cost in another timeout.

**Fable and the owner must also explicitly dispose of the product issue in (c).** Prefer an evidence-based
bounded-effort policy which can return a truthful result within the existing application allowance; if no
acceptable policy can be demonstrated, do not continue offering an unqualified mega16 Nightmare service.
Do not silently raise the browser's budget to five or more minutes. The owner may authorize the test-only
recovery to land first as an acknowledged interim limitation, but that must carry a named product/qualification
blocker into MS18c/MS18d and **no publication** while it is unresolved. A test-tier decision alone is not consent
to the current user-visible timeout.

If the owner instead requires product closure within this recovery, MS05r5p must precede the new mega closure
evidence and final-source E. Fable must specify the ordinary-work/attempt/offering policy, its scope and its
compatibility consequences before that task is written. No numeric large-grid policy is authorized here.

### Resume path after the answer

The old "passed original mega limits" prerequisites cannot simply be ticked. After the answer, the pack author
replaces them with the chosen named contract and retains MS05r4's failures as the reason. No frozen r4 code,
helper or evidence is rewritten. No task below starts just because this question is ready.

| Choice | MS05r5 | MS05b3 | MS05r6a | MS05r6b |
|---|---|---|---|---|
| (a) | Resume inventory/exact/results tooling under an amended prerequisite; then MS05r5m creates the new quick/slow mapping and replacement preflight evidence. r5 itself does not run the expensive callbacks | Run after the test migration, with the selected default, unchanged I5/CV3 seeds/counts and existing guards. Refresh the draft inventory for its added tooling | Require compatible passing evidence of the **approved replacement** mega contract, not fictitious passes of the old one; complete final-source GG/GR and legitimate pins. Apply (d) first if approved | Final quick inventory plus the separately mandatory slow mega coverage, classic9 GD and every b3 obligation; reconcile retained evidence by actual identities. Report total cost and the explicit product blocker if closure was deferred |
| (b) | Add only the authorized tooling; MS05r5m defines measured guards and bounded per-request quick shards before inventory is final | Same preserved manual contract; no implied increase of a manual or application guard | Recheck the authorized new mega bounds with margin, then final-source E; G13's 120 s rule remains unless (d)/a separate decision changes its ownership | Run every retained quick request/assertion in bounded shards, not the overlong old compound callbacks. Publish the much slower standing quick cost; product timeout is still unresolved without a product decision |
| (c), implemented in this recovery | Tooling may precede the product task, but the final draft and mega contract follow MS05r5p/MS05r5m. Keep global 256 | Use the final product policy. Any change of supported requests/refusal coverage must be explicitly specified; do not silently shrink CV3 | Recheck all affected closure requests on the new source, then fresh GG/GR. Old r4 diagnostics stay historical. Retain all fixed keys/requests with explicitly approved outcomes | Fresh final-source quick/manual/product evidence, including the real browser budget/cancellation/error or fallback contract; no mixing of old-source results or availability claims |
| (d), added to any viable mega option | Account for the saved-wire change when refreshing inventories; do not change harness behavior to bypass G13 | No change to its manual populations or hit requirements | Own the persistence-tooling changes before freezing E; wire before analysis; five wires, fourteen analyses, 520 keys. The fresh G13 analysis is still mandatory | Quick consumers use verified current-source G13 wire; reconcile changed fingerprints and keep the one-time recording/closure evidence. (d) alone leaves both mega blockers unresolved |

**MS05b3 is not a back door around the remaining cost.** Its manual variants generator has a separate
**240000 ms request guard** (`generator/tests/manual/variants.test.js:75-79`), and mega16 CV3 retains two requests
per supported level. Those particular requests were not measured by the seed-3 diagnostic. If a level's combined
callback is overlong, (a)/(b) may authorize a further **tooling-only per-request decomposition in MS05b3**, preserving
its full population and aggregate assertions. They do not automatically raise its request guard. A request
timeout, correctness failure or missing coverage remains an owner stop; only the already accepted, named
intermediate aggregate-availability exceptions may remain as failures. No claim is made that changing the quick
tests alone guarantees the rest of recovery will pass.

The single combined acceptance/commit boundary of S-OD2 remains. All implementation/fixture changes must precede
their final-source evidence; a meaningful change invalidates affected records rather than being patched into
their hashes. The 540 s execution ceiling, serial timing slot and 15 s inter-run gap remain; the new 20-minute
lock-acquisition wait is not a longer generation budget.

**Answers requested:** (1) (a) or (b), or a concrete (c) with its validation contract; (2) (d), yes or no, with any
G13 recorder-guard change stated separately; (3) whether product closure under (c) is required before combined
recovery acceptance or may follow under an explicit no-publication blocker. Fable supplies the product/performance
contract; the owner authorizes the trade-off.

**SA1 cross-check (claude-opus-5.5, 2026-11-13).** Independent of SA2. Read only: the working tree on `f788e02`,
the MS05r4 evidence with the `attemptSummaries` of `diagnostic/256/*.json`, and the report. Nothing was run.

*SA2's facts are right*, with two anchor slips: the active clock is `core/js/engine/budget.js:97-115`, and the
worker posts the error at `gen.worker.js:199`.
- Mega: guard `SG.budget.create({ ms: 60000 })` (`generator/tests/suites/mega.test.js:654`), Nightmare budgets
  3000/10000 ms (`:31`, `:40`) times 2, or 3 with `CI` (`core/tests/harness.js:33-38`); the quick levels omit
  expert, master and hell2 (`:22`). App: 120000 ms in both clients and the worker; 1-20 attempts, 8 by default.
- After 120 s of active time the user sees the result cleared, the empty board and the toast "Could not generate
  the puzzle: Generation took longer than allowed and was stopped. Try again, use another seed, or pick an easier
  level." (`app.js:850-865,1319`, `locale.en.js:556-557`; VI `app.js:1331`, `locale.vi.js:540-541`). For mega16
  Nightmare only the last advice helps: attempts 1-5 cost 36.5-59.2 s each, so 120 s holds two (109 s), and
  seed 3 hits in the sixth; one attempt would give a truthful fallback after about 57 s (inferred). mega12 costs
  5.2-6.6 s per attempt (47 s for eight), G13 8.8-17.9 s (105 s, 87% of 120 s).

*Facts that change the weighting:*
1. The product side is already decided: the final qualification sets the offers (SA1-Q-S5, MS18c). A hit is exact
   without `difficulty.approximate`, a timeout is a miss, and a large-board level needs at least 36 of 40 hits and
   a p95 within 30 s (`docs/difficulty-rating/qualification.md:11-25`). A hidden level is a valid outcome
   (check-list §6, plan §8); the store moves a stored one to the nearest offered level with a note
   (`store.js:169-208`), the pipeline refuses it (`pipeline.js:59`), and intermediate work is not deployed
   (check-list §6; Pages deploys on a push to `main`). v2 offered Nightmare 40/40 with p95 268 ms (mega12),
   944 ms (mega16) and 891 ms (samurai) (`qualification.md:132,141,195`); the three v3 requests give one exact
   hit at 310 s and two fallbacks. Unless generation becomes much faster, MS18c hides Nightmare on mega16, very
   likely on mega12 and samurai, and maybe other large-board levels that no quick test samples. SA2's second (c)
   branch is thus what MS18c does anyway; its preferred bounded fallback keeps no level offered, because
   fallbacks are misses.
2. Turning `budget.exceeded` into the best puzzle so far is excluded: the digger counts work instead of time to
   keep a seed's puzzle the same on every machine, and the 120 s guard stays an error (`generator/design.md:705`).
3. Unless the answer covers CV3, the recovery stops a third time. CV3's mega16 Nightmare cell (seeds 1-2, the
   configs of `mega.test.js`'s seeds 1-2) projects at about 620 s at seed-3 cost: b3 defers it, r6b stops
   (`MS05r6b-quick-gd-and-combined-acceptance.md:140-148`), and a request over the 240 s guard blocks (`:144`).
4. No task owns CI. `pull-request.yml` runs every generator suite, manual ones included, in five jobs of at most
   30 minutes with factor 3, and `pages.yml` runs them before it deploys; the `rest` group picks up any new
   `tests/suites/*.test.js` or `tests/manual/*.test.js` file (`.github/scripts/generator-suites.sh`).

*Options.* (a): agree, under three conditions. (i) The slow tier is a tool like `tests/difficulty-recovery.js`,
not a `*.test.js` suite, or CI's `rest` job must fit its 42+ minutes into 30. (ii) It runs once, after the last
engine change (r4's literal), one full request per locked run with the 500 s diagnostic budget, keyed by request
identity: r6b reconciles instead of rerunning, and b3's CV3 mega cells reuse the puzzles with CV3's checks. About
45 minutes at seed-3 cost; a mega16 seed with no hit costs about 420 s for eight attempts (475 s at the slowest
attempt), inside 500 s. (iii) Quick keeps a real one-attempt mega12 Nightmare request through the existing
`extra` argument (`mega.test.js:653-656`; 5-7 s measured, so not the old 6 s assertion) and, for mega16 (57 s
an attempt), only a scripted stop control. (b): agree it is no fix: mega16 adds about 36 minutes to every quick
run and to CI; mega12 alone (about 5.5 minutes) is possible but not worth it. (c): disagree with the framing.
Point 1 decides the product, so no MS05r5p in the recovery, and numbers chosen now would not survive S3's
techniques. The owner's real question is whether the likely hidden large-board levels are acceptable for v3; if
not, a large-board generation-speed task after S3, measured against MS07e's first checkpoint, before MS18c.
(d): agree; it also keeps G13's 87% away from the 120 s regeneration in `steps`, `replay` and `player`
(`steps.test.js:45`, `replay.test.js:26`, `player.test.js:34`) on slower CI runners.

*Missed:* qualification-based non-offering as the product answer (point 1); CV3's mega cells decided now
(point 3); a named owner for the v3 pull request's CI jobs before the merge (point 4).

*Recommendation:* (a) with (i)-(iii), (d), and 256 kept; there I agree with SA2, and on refusing a silent
browser-budget raise. On SA2's question (3): qualification closes the product side and check-list §6 forbids
deploying, so no new blocker; the owner should accept or reject the likely hiding with this evidence now.
Extend (a) to CV3, with the owner's explicit consent, as r6b blocks on timeouts today: b3 takes the mega
Nightmare cells from MS05r5m's records with CV3's per-puzzle checks; a request time over 240 s goes to
MS07e/MS18c as a named availability item, while validity, uniqueness, requiredness and the warnings still block.
Resume: r5 (tooling, amended prerequisite), r5m (about 2 developer hours, 45-65 minutes locked), b3, r6a ((d)
first), then r6b, which reconciles r5m's records and hands MS18c/MS18d the at-risk cells and the CI item.

**Owner (2026-11-13 14:25): (a) + (d), and (c) decided now.** Owner decision S-OD3. 256 stays the default.
(a) mega Nightmare leaves the quick contract for a measured deep tier, with SA1's conditions (i)-(iii) as its
execution detail (a tool, not a `*.test.js` suite; one run after the last engine change, keyed by request identity;
the quick set keeps a one-attempt mega12 request and a scripted mega16 stop control). (d) G13 is persisted.
(c) the product disposition for large grids is decided now, not deferred to publication: the plan author designs it.

**Plan-author answer requested (Fable): design (c).** For the large grids (mega12, mega16, samurai and any other
cell the measurements show), say what the product does for Nightmare (and Hell where it applies) given the numbers
above and the apps' 120 s active-generation budget: for example a size-dependent bound on attempts or work with an
honest result, or the level not offered on that board, or another design. Please also say (1) whether (a)'s
extension to MS05r6b's CV3 mega16 Nightmare cell is still needed under your design, (2) whether the CI workflow
item (SA1's cross-check) needs a task now, and (3) where the change goes in the recovery sequence (MS05r5, MS05r5m,
MS05b3, MS05r6a, MS05r6b). SA2 then writes the tasks and SA1 cross-checks them.

**Plan-author answer:** pending.

Only existing evidence was read and summarized, and the budget path was inspected. No new generation, timing
experiment, browser run, source change, fixture write, staging or commit was performed to raise CV6-03.
