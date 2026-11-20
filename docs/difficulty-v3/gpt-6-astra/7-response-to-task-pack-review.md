# Sudoku difficulty-v3 — response to the task-pack review

| Field | Value |
|---|---|
| Date | 2026-11-12–13 (+07:00); runtime disposition added 2026-11-13 |
| Author | SA2, gpt-6-astra |
| Review | `../claude-opus-5.5/6-review-of-task-pack.md`, FS01-FS26; round 3 is section 12, received 2026-11-13 |
| Code checked | `f788e02`, accepted MS05a; current uncommitted MS05b1 engine/tests inspected for RF01 |
| Authority | Accepted R1-R24; CV6-01 answer and owner S-OD1 at 18:20 |
| State | Three pack-review rounds complete: 26 accepted, 0 disputed; MS05b1 runtime acceptance remains separate and BLOCKED under RF01/CV6-02 |
| Changes | Task-pack/response documents only; no implementation, tests, fixtures or execution logs edited; no staging/commit |

Sections 1-6 retain the first **FS01-FS10 tranche**. Section 7 appends the requested second-round
dispositions of FS11-FS24 and the corresponding pack revisions; it supersedes the earlier
tranche-only scope, not its accepted decisions.
Section 8 records the separate runtime blocker. Section 9 resolves FS25/FS26 without deciding
CV6-02 or restructuring the activation/budget tasks.

## 1. Dispositions

| Finding | Disposition | Owning correction |
|---|---|---|
| FS01 worker/cache coverage | Accepted | Already applied to frozen MS05a at dispatch; MS05b1/b2 target lists include worker/cache; MS05c explicitly owns work round trips |
| FS02 keeper-zero local stop | Accepted | MS05b1 gives the exact three-part loop condition and no-next-proposal test |
| FS03 refined-state continuation | Accepted | MS05b1 gives all three outcomes and rebuilds local state only for the in-band shallow continuation |
| FS04 size of MS05b | Accepted | Split into MS05b1 engine/UI/GG/GR and MS05b2 consumers/prefix/manual contracts, in sequential waves 9a/9b |
| FS05 miss.required | Accepted | MS05a dispatch prepared the null schema; MS05b1 explicitly emits null for every miss, solved off-band included |
| FS06 override-prefix algorithm | Accepted | Full filtered ordered-prefix algorithm and pre-generation exit 2 in MS05b2, with a pure tested helper and valid CLI failure vector |
| FS07 local/refinement counts | Accepted | MS05c amendment: count refinement ratings and use their real local ordinal; require per-request conservation |
| FS08 moved anchors/sharding | Accepted | Current soak anchors and `--from` with unchanged absolute request tags/seeds in MS05c; MS05d consumes it |
| FS09 GD duration and timing misses | Accepted with a bounded-run adjustment | Keep the ten-minute ceiling; use the Nightmare run as a retained shard and split the remaining suite by existing describe groups instead of increasing the ceiling |
| FS10 fused prose numbers | Accepted | Spacing pass over undispatched files/checklist only; frozen MS01-MS05a and orchestrator logs remain untouched |

All ten concerns are accepted; **no disputed finding**. FS09's proposed longer-ceiling mechanism is replaced
by coverage-preserving sharding, not by an assertion or request-count reduction.

## 2. Frozen MS05a and named handoff owners

MS05a was accepted as `f788e02`. Its Execution log confirms FS01/FS05 were applied at dispatch.
Its document and execution history are **not edited** by this response. Its remaining work is assigned:

| Handoff | Owner |
|---|---|
| `explain-data.js` lacks `tune.shallow` highlight | MS05b1, mapping to the existing retry line and a focused test |
| Tune explanation still equates achieved/requested levels | MS05b1, engine explanation/comment plus both Generator locale texts |
| English “a Easy technique” | MS05b1, “a technique from the {level} tier”; same Vietnamese meaning and localized placeholder |
| `soak.js:281` exactness inferred from names | MS05b2, strict `r.exact === true` |
| Qualifier hit predicate lacks exact flag | MS05b2, retain independent validity/solved/warning guards and require the flag |

The old undispatched MS05b file is replaced by:

- `tasks/difficulty-v3/MS05b1-required-exactness-engine.md`;
- `tasks/difficulty-v3/MS05b2-required-exactness-consumers.md`.

MS05c depends on MS05b2. The check-list owns the alias for references in frozen/history documents;
those historical references are not rewritten. Engine-output changes and GG/GR occur in MS05b1 only.
MS05b2 changes diagnostic/manual interpretation without changing puzzles or running qualification.

MS05b READY

## 3. CV6-01 / S-OD1 implementation contract

`tasks/difficulty-v3/MS05e-guided-sign-dig.md` is written after MS05d and before MS06a. It includes:

- diagnosis before any production change, with a stop when the stated trap is not dominant;
- only the technique-oracle sign pass uses the pool; tier-first R6 ranking, existing shuffled order,
  temporary-sign rollback, inherited work accounting, cooperative identity and existing keep/reject/accept log;
- initially 8, at most one planned comparison per tried value 4/8/16, then a fixed literal;
- unchanged floors, caps, tune rounds, orders/weights/bands/exactness, minimal pass and CV6 assertion;
- literal seed cohorts, matched repeats, Easy/Hard/Expert controls, errors and full closure evidence;
- exact locked GS/GD/GG/GR/GH routes and the author's fixed stop/report fallback(b).

Publication clarification: existing GG/GR tools reject incomplete writes. MS05e therefore records complete
current-source envelopes as invariant controls, while allowing **only Greater-Than entries** to change.
It does not fabricate current-source ledgers or broaden the permitted fixture changes. Wire publication
precedes analysis recording. Fixed Greater-Than help sources are checked before considering any refresh.

MS06a now depends on the accepted MS05e disposition. MS06b has the requested one-line duty to forward a
present `options.target` (including null) into the sign-dig context; MS06c supplies the one sample target.
The helper-only commit draws/activates no target. The inequality refinement guard remains unchanged.

The check-list now carries S-OD1, gate ownership, traceability and the exact mutual-exclusion wrapper.
No timing run was performed to author this task; the performance numbers remain the recorded MS04 evidence,
not a claim that the proposed repair has already succeeded.

## 4. MS05c/MS05d: counting, shards and GD

FS07 is applied as a conservation contract, not just a comparison suggestion. A local invocation
includes its refinement ratings, with one-based ordinals; initial shallow is zero and refinement
becoming shallow on rating three is three. The identifying call does not consume the additional
allowance. Memo visits are proposals, not new ratings. Error work is retained; missing evidence
is not a zero or a passed conservation check. Worker/cache round-trip files and selectors are named.

FS08 includes the optional shard improvement because it preserves the fixed experimental requests:
MS05c supplies `--from` and `--total-count`, with absolute tags/seeds and logical reference endpoints.
MS05d merges raw rows exactly once, not medians. Current soak anchors and quoted source text replace
the pre-MS02 numbers. The six-cell rule and all 288 primary requests are unchanged.

FS09 does not authorise longer runs. The current manual `difficulty` suite's cache is per level,
so its Nightmare filter really isolates that batch. The checklist retains that run as a coverage
shard, lists all other level/non-batch groups and requires nonzero, complete, disjoint coverage.
MS05d, MS07e, MS17b and MS18e use this procedure. A later hidden Nightmare is reported from the
offered manifest, not represented by a zero-test pass. A single overlong group stops for an assigned
bounded solution; its request count/assertions are not reduced.

Intermediate requiredness-related hit/median-time failures remain **failed assertions** and go to
MS18d with their measurements; they do not automatically invalidate the cap-selection experiment.
Correctness or incomplete evidence blocks. The final release still needs an explicit disposition
of any remaining failure. CV6 follows the separate, fixed S-OD1 fallback.

SA1's report-only seventh-cell suggestion is not added to the selection sweep: S-OD1 leaves the
MS05a-MS05d decision rule unchanged, and MS05e now captures its own matched post-MS05d Greater-Than
control before changing the sign dig.

## 5. Pack consistency and verification

- The executable index has **49 distinct tasks**, every linked file present. Inserted waves 9a/9b
  and 11a are sequential; historical/frozen MS05b references are explicitly aliased to the two parts.
- Index, dependencies, ownership, gate rows and business traceability include the split and MS05e.
  The original undispatched MS05b file is removed. Orchestrator Done marks and execution history
  were preserved by targeted edits.
- FS10 spacing fixes cover undispatched prose/algorithm statements, including orders, weights,
  costs and numeric limits. Real IDs (`classic9`, `hell1`, G09, task IDs) stay unchanged. Frozen
  MS01-MS05a and the already-ready MS05b1/MS05b2 were not included in the later bulk pass.
- The new task logs were created empty; only the orchestrator fills them. MS05b1/MS05b2 were
  normalised and marked ready before work continued
  on MS05c/MS05d and the remaining spacing pass.
- The shared lock helper passed PowerShell syntax parsing **without being executed**. It uses
  exclusive lock creation, a post-acquisition race check, bounded Node execution, argument-safe
  invocation and owned-process/lock cleanup. Its definition must share the invocation with a
  command, or be dot-sourced from the task's own artifact folder.
- Structural checks passed: 49 index entries/49 unique IDs, no missing task link, no old MS05b
  dispatch file, and no FS10 requested-pattern hit in undispatched bodies. Final formatting and
  diff checks cover the documents only.

No application suite, generation, soak, calibration, fixture recorder, timing run or browser test
was run for these document changes. No implementation code or test assertion was edited.

## 6. Questions and sign-off

**New question for the plan author: none.** S-OD1 is applied as answered, and FS01-FS10 require
no scoring-policy decision. FS09 uses bounded sharding instead of overriding the existing run limit.
No new clarification entry is needed.

The requested tranche is ready for the orchestrator's review: **10 accepted, 0 disputed**.
This is not sign-off on the subsequent FS11-FS19 findings, whose design/split review remains a
separate tranche. Nothing is staged or committed.

## 7. Second-round dispositions (FS11-FS24)

Review basis: SA1's completed `6-review-of-task-pack.md`, sections 5-11, read on
2026-11-12 after the 22:06 dispatch request. MS05a is committed and MS05b1 is in progress:
neither task nor its Execution log is edited. This section is appended in dispatch order;
each READY line releases only the named, completed tranche.

### 7.1 MS05b2 and FS22's earliest owner

**FS22 accepted.** No new engine/consumer defect was found in MS05b2. Its seven manual edits
were only syntax-checked, and four variant contracts otherwise first ran at release. The
bounded tooling is now explicitly assigned to **MS05b3 — Lazy per-level manual corpora and
early contract evidence**, immediately after MS05b2 and before MS05c. It **does not need to
precede MS05b2**: it builds on that task's accepted predicates and executes them before any
further engine change.

MS05b3 preserves the whole request manifest, makes one-level I5/CV6 access lazy, splits
Killer I5 without relaxing its assertions, proves scripted full-manifest/real-prefix parity,
and runs every variant I5 plus variants CV3 selectors early. The full classic9 GD remains
MS05d's. Corpus-wide aggregate tests are not falsely advertised as per-level bounded.
MS14c's unnecessary whole Killer GD and MS18e's selectors are corrected in the later tranche.

MS05b2 now hands the precise changed-site/test-name inventory to MS05b3 and explicitly says
syntax checks are not GD acceptance. Index, wave 9c, ownership, traceability and gate assignment
are in the checklist. No finding requires a scoring-policy or owner decision.

MS05b2 READY

### 7.2 MS05c-MS05e

MS05c/MS05d retain the already-accepted FS07-FS09 counter/conservation/selection rules.
MS05c now depends on MS05b3. MS05d distinguishes its classic9 GD from the already-executed
variant-contract manifest; no seventh selection cell, weakened assertion or changed seed is added.

**FS20 accepted for the target connection.** MS05e already specifies the finite/null/tier-first
comparator vectors. Its caller-to-strategy proof belongs to MS06b/MS06c2, explicitly named now.
The preparatory MS06c1 must not send a finite target into the already-active sign comparator:
that would change Greater-Than output before atomic activation. The MS06 tranche below resolves
that split hazard without changing S-OD1's algorithm.

**FS22 applied to MS05e's coupled gate too:** the former whole `greater-than` invocation still
contained aggregate all-corpus tests even after lazy caches. It is replaced by all nine existing
per-level CV6 and I5 assertions (18 selectors), using the original 20/10 counts and literal
seeds. The report must call this CV6/I5 coverage, not whole-suite coverage. S-OD1 requires the
unchanged Normal CV6 and matched controls, not an unbounded invocation of unrelated manual tests.
The source change's remaining contracts stay covered by the focused sign/replay/steps tests.
All timeouts and availability failures remain visible; Normal CV6 still invokes the fixed
owner fallback when it fails.

FS24's numerical spacing is corrected in this tranche; the remaining pack-wide pass follows.
No new plan-author question arises from these changes.

MS05c-MS05e READY

### 7.3 MS06 dispositions and split

| Finding | Disposition | Correction |
|---|---|---|
| FS11 stale soak anchors | Accepted | MS06a/MS06d use the `f788e02` anchors 260, 267-283 and 353 plus exact function/timer quotes; both name the accepted shard/lock protocol |
| FS12 current requiredness in `acceptReveal` | Accepted | Add `currentIsExact` as well as `nextIsExact`, an explicit pure predicate and complete Expert-band vectors |
| FS13 refused pool winner | Accepted | A successful bounded winner that fails the apply table ends the cells guided pass through its single normal end epilogue; an all-refused pool still advances |
| FS14 local ceiling | Accepted | Explicit `next.solved && next.score < spec.max && preferRated(...)`; independent keeper offers remain before local acceptance |
| FS15 oversized activation | Accepted, split adjusted for S-OD1 | MS06c1 nullable transport/objective types with no draw or policy change; MS06c2 draws once and activates every stage together |
| FS16 refinement test origin | Accepted | Expert `[700,1000)`, target 850; sequential 1100 -> 920 -> 880; initial exact 920 enters `localSearchSteps`, which does no work |
| FS20 target/sign handoff | Accepted | MS06b's literal hasOwn forwarding and three-case spy; MS06c2's explicit sample/options/resolved/signs/result route and real Expert pipeline association test |

FS12's "next 900 is not nearer" is specified as **880 -> 900**, after the preceding accepted
920 -> 880 reveal. From 920, 900 would be nearer to 850. This is a clarified sequential vector,
not a changed refinement policy.

The split deliberately does **not** copy the review's suggestion to draw/send the target in
the transport-only commit. MS05e already ranks signs by a supplied finite target; doing that
would activate sign-only targeting and invalidate MS06c1's unchanged-output gate. The safe
split draws nothing in normal production until MS06c2. The earlier task still proves nullable
metadata/keeper/worker transport and wraps objectives with exactly the old numeric ranking.
MS06c1 owns complete GG **check-only** and deliberate GR; MS06c2 owns full behavioral GG/GR.
No temporary production switch, policy rollback or altered RNG stream is introduced.

The sample-specific keeper view captures a scalar and delegates to the live model-aware keeper,
so no variant algorithm edit or mutable global target is needed. Unrelated samples retain
quality-only, encounter-order ties. All accepted first-exact, sign and work guards remain.

The old undispatched MS06c file is replaced by MS06c1/MS06c2; the index, dependencies, sequential
waves 14a/14b, ownership, traceability and gate rows match. These are implementation clarifications
under R6/R7/S-OD1, not reopened owner decisions. **No new question.**

MS06 READY

### 7.4 Remaining dispositions

| Finding | Disposition | Owning correction |
|---|---|---|
| FS17 supplied states replace the random sweep | Accepted | MS07a explicitly constructs the complete seeded random prefix, concatenates supplements, retains 120/300 and minFirings 3, and checks both prefix and total |
| FS18 oversized MS07b | Accepted | Move soak cutoff override/tests/config identity and split-ID GP-cost to MS07c; revise sizes/ownership/gates. Registration, locales, real sources and E/GH stay coupled in MS07b |
| FS19 non-vacuous Hell 1 timing | Accepted with the existing bounded-run rule | MS07b owns the two-request pilot; MS07c replaces it if C changes. MS07e and later GD owners project/retain separate Nightmare/Hell 1 batches; no longer ceiling is authorized |
| FS21 moved line anchors | Accepted | Correct MS08a/MS11c/MS17b/MS18a/b/d/e at explicit `f788e02` anchors, retaining/adding searchable quotes |
| FS22 whole-corpus manual gates/late testing | Accepted | MS05b3 early tooling/evidence, MS05e per-level CV6/I5, MS14c corpus-free only, MS18e per-level/variant manifest; checklist matches |
| FS23 late discovery of oversized GP cells | Accepted | MS18d mandatory complete GQ-mean preflight before any GP; >450-second/missing-data cases stop for assigned bounded measurement tooling, not unsupported seed/percentile splits |
| FS24 remaining fused numerals | Accepted | Targeted prose/algorithm spacing across undispatched tasks/checklist; no code identifiers, frozen task or orchestrator log edits |

FS18 source check: the actual `SG.helpExamples.nishio` snapshot at the reviewed source has
`hint.stepArgs.depth: 1` (`help-examples.js:46`), despite its source's Hell 1 label. The task
now says so, uses it as a shallow candidate, and explicitly owns bounded acquisition of a real
depth-2 source. It does not claim one was found during this document revision.

The early/final variants selector is **`variants: <id> > CV3` without a colon**. The actual
registration is `it(check.id + ' ' + check.title, ...)`, so a `CV3:` suffix would select zero
tests. The new tooling contract and checklist use the verified names. Per-level I5 suffixes
retain their existing colon.

MS18c also audits final publication against fixed manual level lists before handing off:
`pipeline.js:58-59` rejects a newly hidden request. An incompatible old manual population
requires an explicitly assigned publication/test follow-up, not silently omitted final
selectors or relabelled seeds. This is a closure check under the accepted qualification
decision, not permission to change thresholds or a new offer policy.

FS23 preflight preserves the actual GP protocol: 50 outcomes, seed step 101, summary trace,
zero warmup and strict p95 comparison. GQ's raw times are a scheduling estimate, not a GP
result. A new measurement tool or cold/warm protocol change is not silently authorized by
this revision; a flagged preflight blocks the first GP command until the orchestrator assigns
the bounded solution. This implements the review's early-stop recommendation without claiming
the future cells have already been timed.

### 7.5 Second-round summary and verification

**Second round: 14 accepted, 0 disputed** (FS11-FS24). Across both rounds: **24 accepted,
0 disputed**, matching SA1's 11 Major / 13 Minor / 0 Blocker inventory. The adjusted mechanisms
for FS15 and FS19 accept the findings while preserving S-OD1's atomic activation and the
existing time ceiling.

New executable files:

- `tasks/difficulty-v3/MS05b3-bounded-manual-corpora.md`, after MS05b2 and before MS05c;
- `tasks/difficulty-v3/MS06c1-target-transport.md`;
- `tasks/difficulty-v3/MS06c2-activate-target-policy.md`.

The two MS06 files replace the old, undispatched `MS06c-target-through-all-stages.md`.
The index has **51 executable files / 51 unique IDs**, all linked files present; all waves
remain sequential. MS07b/MS07c are resized without another split because the remaining
MS07b registration/locales/examples are one coupled integration.

The requested `MS05b2 READY`, `MS05c-MS05e READY` and `MS06 READY` markers were appended in
dispatch order and remain standalone. MS05b3 need not precede MS05b2. MS05a/MS05b1, their logs,
Done marks and the orchestrated execution summary were not edited.

**New question for the plan author/owner: none.** No clarification entry is needed: the
changes resolve implementation/tooling contracts under existing decisions. Missing real
sources, incomplete runtime evidence, oversized cells and publication compatibility problems
remain explicit execution blockers, not new pre-authorized policy choices.

Validation uses direct committed/current code reads, document structure/command parsing and
small pure contract checks only. Checks passed: 51 unique task links/files, required sections
and balanced fences, 42 undispatched empty Execution logs, inserted dependency order, all
three standalone markers, 60 concrete PowerShell blocks parsed without execution, and 25 pure
target/reveal/RNG/projection vectors. Format checks cover the 44 owned/undispatched documents:
CRLF, no BOM, no trailing whitespace, final newline; `git diff --check` passes.
No application suite, generation, soak, calibration, hash
writer, qualification, timing-sensitive run or browser test was run for these document changes.
No application/test implementation or expected fixture was edited; nothing was staged or committed.

## 8. Runtime finding RF01 — the no-allowance activation cannot pass its acceptance gate

**Severity: Blocker. Date: 2026-11-13. Disposition: MS05b1 is not accepted.**
The proposed recovery needs an explicit revised acceptance boundary; CV6-02 is appended to
`../clarifications.md` Part H for the plan author and owner. No provisional cap, budget increase,
fixture replacement or failed-test waiver is authorized by this finding.

Basis: `../evidence/MS05b1/evidence.md`, `../notes.md`'s MS05b1 section, the current uncommitted
engine/tests at `f788e02`, accepted R3-R5/R21/R24 and the final SA2-Q-S12 answer.
Measurements below are the developer's recorded runs, not new SA2 timing measurements.
The existing 24 accepted review findings remain closed; this is a new empirical acceptance failure.

### 8.1 What was foreseen, and what was not authorized

The cost mechanism was foreseen explicitly:

- R3 changes sample, keeper, local and outer stopping from score-band membership to required
  exactness. R4 specifies the resulting flags/warnings/consumers; it supplies no search allowance.
- R5 says: **"Until the measurement, use the existing attempt caps only."** It preserves
  1024 full ratings and 32768 proposals per attempt, the existing attempt count and other bounds.
- SA2-Q-S12's final answer says the same, and approves comparing **64, 128, 256, none** on the
  six fixed cells. Both analysts withdrew the unmeasured 128 proposal. Part D item 13 and the
  status tables confirm that withdrawal. There is no implicit 64 or 128 activation default.
- The extra allowance counts **full ratings after the first in-band shallow state within one
  local invocation**, not all proposals, elapsed time, every generation rating or every attempt.
  Earlier dig/layout work is outside it. A measured winner of **none remains valid**.
- R4/R24 allow recorded intermediate manual availability shortfalls; that is not permission
  to call `budget.exceeded`, incomplete GR, missing validity checks or a red quick suite passed.

The task pack made the no-allowance baseline an **independently green, committed prerequisite**
of its own measurement. That acceptance split is the defect I own. The original MS05 milestone
contained activation and budget selection together; splitting it did not establish that the
interim state would fit old recorder/test budgets. FS09 anticipated longer manual batches,
but did not establish a bound for these large-board quick requests.

Neither "no extra cap until measured" nor "a cap is measured later" means that the present
implementation has already met MS05b1-T05. The earlier READY markers certify task specifications,
not this implementation or a waiver of its failed prerequisite.

### 8.2 Recorded evidence and the distinct budget layers

| Evidence | Meaning for acceptance |
|---|---|
| 149/520 GG keys change from an old shallow puzzle to a different required puzzle; mean attempts 1.13 -> 2.38 | The change has a real requiredness benefit; do not revert the predicate to recover old timings |
| Other keys: 313 still exact, 56 unchanged puzzles now honestly shallow, 2 already approximate; 462 current exact overall | An unchanged puzzle hash does not mean unchanged exactness, attempts or cost |
| G13, samurai Nightmare 42: same hash `93f9be5f208b`, score 1637; old 0.16 s/one attempt, new 219.7 s/eight attempts with a 500 s diagnostic budget | A completed slow fallback exists, but not under the recorder's accepted budget; its per-local rating/proposal split is not in this evidence |
| G13 recording: 120.2 s, `budget.exceeded`, no ledger; 13/14 analysis records, strict merge refuses | GR is incomplete. An old G13 golden cannot be relabelled as a current-source record merely because the puzzle hash matches |
| G06/G07 change to required Jigsaw puzzles; 51/92 golden fields differ | Finish a valid complete GR before updating their coupled steps/replay/player pins; do not hand-edit around the missing G13 |
| Generator's 26-suite chunk: 1390 pass / 172.7 s; pipeline: 127 pass / 294.8 s; mega: 107 pass, 4 fail / 246.3 s | These disjoint chunks already total **713.8 s**, before steps/replay/player and other shared suites. There is no basis for a <=540 s whole quick command |
| Player app quick set: 1670 pass / 29.3 s | It is not the failing Generator `player` suite; do not conflate the two |

**Important correction to the reported mega budget:** its ordinary quick helper at
`generator/tests/suites/mega.test.js:653-658` creates `SG.budget.create({ms:60000})`, not 120000.
`SLOW = 120000` at line 18 is the harness argument, and the 120000 generation budget at line 895
belongs to the **SG_DEEP-only** branch, which was not requested. Four approximately 60-second
generation failures are consistent with the measured 246.3-second suite.
`core/tests/harness.js:410-414` applies its timer to returned promises, not synchronous CPU work;
raising `SLOW` alone cannot fix the synchronous `budget.exceeded`.

There is a separate, much smaller **latency assertion** at `mega.test.js:692-699`:
`out.ms < SG.test.timeLimit(b.budgets[level])`, with Nightmare design values **3000 ms for
mega12 and 10000 ms for mega16** (lines 31/42). At the local default factor 2 these are 6 s/20 s;
record the actual factor rather than assuming it. Increasing a 60-second guard only lets a
slow request finish; it does not make that latency assertion pass.

G13's recorder uses `replay-fixtures.js:37`'s 120000 constant, imported and used by
`replay-goldens.js:23,43`. Its quick consumers independently use 120000 at
`steps.test.js:45`, `replay.test.js:26` and `player.test.js:34`.
Their per-suite caches are populated only after successful generation. A timeout therefore
causes later tests to try the same G13 again; after a successful build they reuse it within
that suite, but the three suites do not share one cache.

### 8.3 Options and their consequences

| Option | G13 and mega | Quick-set time and existing evidence | MS05b2/MS05b3/MS05c/MS05d |
|---|---|---|---|
| **(a) Active-path R5 recovery before a combined acceptance boundary — recommended** | Measure the approved rule on the actual requiredness-active candidate; then test the selected default on G13 and the original mega requests. A finite winner may help but is not guaranteed to fix either. None, insufficient saving or a remaining mega latency failure returns to the decision; no automatic pass | Do not keep refreshing the same incomplete interim GR. Instrumentation/selection changes source identity, so record final-source GG/GR once the candidate is stable. Complete quick coverage may still need bounded shards; that is not a claim that total quick time returned to 118 s | Bring b2's measurement-consumer correctness and c's counters/override forward on the open b1 tree; run d's unchanged 288-request selection before acceptance. Move b3's early manual execution after the selected default, still before MS05e/MS06. Accept only the completed recovery bundle, not red intermediate tasks |
| **(b) Provisional additional allowance in b1** | If the owner explicitly requests a trial default, **64** is the smallest approved experiment candidate, not an already authorized default or a proved fix. 128 was withdrawn; 256 is also unselected. The limiter may not bind a particular slow invocation and may lose required hits | A smaller tail might restore budgets, but output/time evidence is required. Any engine change invalidates current-source GG/GR. A later different R5 winner requires another refresh; the 149 gains are not guaranteed to survive | Still needs c's precise local accounting, so this is not a one-line `maxRatings` change. b2/b3 still apply. d must later compare all four settings including none, without making the provisional value the control |
| **(c) Measure c/d on the inactive, old-exactness path** | **Not a valid recovery.** An in-band shallow result is still called exact and exits before the new tail. The experiment cannot measure the work or required hits that caused G13/mega to fail | It can look fast and select none vacuously, but activation brings the original failures back. Inactive instrumentation alone can preserve old outputs; it supplies no valid active-path selection evidence | Preparatory instrumentation may be inactive, but selection must execute the new active semantics. A diagnostic preview of the new path is active-path measurement, not option (c); do not add a permanent production feature flag |
| **(d) Recorder/test-tooling change, with production search unchanged** | A named tooling task could retain G13's request, use an explicitly approved larger bounded recorder guard, and add its fresh current result to the existing saved-wire mechanism. The analysis recorder currently always regenerates, so adding a wire alone does not close GR. Mega still has its 60 s generation guard and 3 s/10 s design assertions; changing the recorder fixes neither | G13 persistence can avoid repeated quick regeneration. The rest of the quick set remains slower and needs measured partitioning. Recorder-only changes invalidate GR identities, not automatically GG; test-only changes do not change generated outputs. No guard increase is pre-approved here | A proposed **MS05b1v validation-recovery task** owns recorders, affected loader/recorder tests, any approved saved-wire manifest expansion, complete gate recipe updates and full quick coverage. b2/b3/c/d otherwise keep their semantic work; this option defers rather than measures the active search-cost decision |
| **(e) Explicitly accept a slower interim/product validation contract** | Requires actual completed validity/correctness evidence and an explicit decision about mega's latency assertions, not only longer watchdogs. G13 still needs a complete current record. Current `budget.exceeded` outcomes are not successful slower puzzles | A longer total quick set, moving specific costly generation checks to a named gated/manual route, or different latency limits must be documented and approved with unchanged coverage. A collection of incomplete runs is not acceptance. Do not silently use `SG_TIME_FACTOR`, skip tests or raise the 540 s process ceiling | b2/b3/c/d can proceed only under that explicit revised acceptance contract. R5 is still mandatory; none is not an excuse to omit its measurement. Final qualification, GP and CV6-01 remain their own unchanged decisions unless separately amended |
| **(f) Replace G13 with a faster seed/level** | Changes the fixed regression request and removes this observed failure instead of resolving it. Does nothing for mega | Violates the accepted fixed GR manifest without a new decision and a specified replacement for G13's coverage. Same label or similar-looking output is not equivalent | Does not repair the b1 -> c/d acceptance cycle. Not recommended. Persisting the **same** G13 under (d) is different from replacing it |

Why no value is promised under (a) or (b): the limiter concerns additional **full ratings**.
`digger.js:1411-1486` still counts memo/invalid proposals without a new rating; it also performs
uniqueness work before rating. Earlier stages and all eight attempts remain. Samurai and the
two mega Nightmare cells are **not in R5's six selection cells**. Their closure measurements
must be additional diagnostics, not a secretly enlarged/tuned selection criterion.

### 8.4 Recommended recovery, subject to CV6-02 approval

1. **Keep MS05b1 open and preserve its work/evidence.** Do not discard the implementation,
   call its partial GR complete, mark b2/c/d accepted to break a dependency, or run the same
   failing whole suites again. The existing GG/wire refreshes remain uncommitted and explained.
2. **Authorize one revised MS05 acceptance boundary**, replacing independently green b1/b2/c/d
   checkpoints with a sequential recovery bundle on this same uncommitted tree. The orchestrator
   must explicitly record how it accepts/commits the combined change and absorbs/transfers the
   original task scopes; it must not pretend red intermediate commits passed.
   This is the requested exception to the pack's accepted-and-committed prerequisite rule.
3. First take b2's strict direct/pipeline exactness consumers and required measurement guards.
   In particular, current `soak.js:281` still uses `r.rating.level === combo.level`; it cannot
   supply R5's generation-exact counts. Retain the qualifier/manual fixes under their named
   ownership rather than losing them when the tasks are regrouped.
4. Implement c's existing **local** counter/allowance and bounded soak shards, initially
   Infinity. Retain first-exact stopping, caller cancellation, the 64-rating refinement allowance,
   pre-shallow/earlier-layout exclusions, memo accounting and per-request count conservation.
   Run focused scripted/helper/transport checks while full acceptance remains pending.
5. Execute d's exact experiment on that **requiredness-active** source: classic9
   normal/master/nightmare, killer hard/expert, jigsaw9 expert; 12 derived requests each for
   64/128/256/none, seed base 20260101, unchanged direct/pipeline routes. Apply the existing
   per-cell no-hit-loss and strict median-full-rating improvement rule. No extra selection
   cell, guessed default or alternative timing-based winner.
6. With the chosen value as the no-override default, run **closure checks before fresh E**:
   original G13 within its current 120 s generation guard; mega's two Nightmare groups with
   their existing 60 s generation guards, four original seeds and CV5 repeats, unchanged
   design-time assertions; pipeline and complete bounded quick coverage. Capture local work,
   cap hits, attempts and time for G13/mega so an unbound limiter is distinguishable from a
   merely too-large selected value. These diagnostics cannot change the approved selector.
7. If none wins or a closure failure remains, **stop and return the evidence**. Do not choose
   64 anyway, broaden the R5 matrix, lower the existing global caps, swallow a parent timeout
   and return a fallback, or automatically increase recorder/test/performance budgets.
   A tightly bounded, output-identical optimization could be investigated if supported by a
   profile, but there is no evidence here that it alone restores the contracts.
8. Once a candidate can complete the required gates, record fresh complete E, publish wire
   before analysis, update the genuine G06/G07 pins, and verify every quick assertion on the
   final source. Use disjoint suite/full-name shards with a complete test manifest if a whole
   quick command cannot fit 540 s. Missing/duplicate selectors and zero-test runs are not
   coverage; sharding alone never cures a failed per-request budget or mega latency assertion.
   The command ceiling remains 540 s; do not count a process killed at that limit as a pass.
   Retain MS05d's classic9 GD obligation too, with its existing distinction between recorded
   intermediate availability assertions and blocking correctness/incomplete coverage. The
   recovery boundary does not silently drop a gate from an absorbed task.
9. Run b3's early, per-level manual contract evidence on the selected default, before MS05e.
   Finish/attribute the absorbed b2/c/d documentation and tests in the recovery acceptance.
   MS05e remains the separate Greater-Than CV6-01 repair, and MS06a must still capture its
   isolated baseline only after that disposition. MS18 repeats the approved cap-selection rule.

This is not permission to change source now: the plan author/owner must approve the acceptance
exception in CV6-02. It is also not a proposal to measure a false inactive baseline or to accept
the current failures merely because later work might improve them.

### 8.5 What evidence can be retained

- Preserve the current 520-key ledgers, four wire ledgers, 13 analysis ledgers, attribution and
  failed attempts as the **interim no-extra-cap** record in their existing source identity.
  Do not overwrite that evidence with a trial; use separate setting/source directories.
- Any edit of engine bytes covered by the digest, including instrumentation or a comment,
  changes GG and GR identities. Final acceptance needs fresh complete records for the final
  source even if the puzzle hashes happen to be identical. No manual digest substitution.
- A change only to `replay-fixtures.js`/`replay-goldens.js` changes both GR digests because those
  files are in `RECORDER_FILES`. Re-record all four wire/fourteen analysis entries (or the
  explicitly approved expanded wire manifest), not just G13; keep merge completeness strict.
- GG's digest is separately built by `perf.js:250-259` from `engineFiles()` plus
  `perf-helper.js`, `tool-records.js` and `perf.js`. A recorder-only guard edit does **not**
  automatically invalidate GG. Reuse it only if its actual source/manifest identity remains
  valid; modifying a shared hashed helper or the engine would invalidate it.
- Pure test-shard/guard edits do not by themselves change generation identity. They still
  require their own successful coverage and cannot transform earlier failures into passes.
  A same-board claim is not a substitute for re-running the current analysis.

### 8.6 Decision and work boundary

**Recommendation: CV6-02(a), an active-path measured recovery and deferred combined acceptance.**
There is no authorized provisional number and no demonstrated all-gates-passing task-level
one-line fix. New validation budgets or acceptance of a slower contract, if eventually needed,
must be named and decided from the closure measurements.

The question is pending in Part H. Only this response and `clarifications.md` are changed in
this turn; task files, checklist, engine, tests, fixtures, developer evidence and Execution logs
are untouched. No generator, quick suite, recorder or timing probe was run while Pentomino's
gate is finishing. Source inspection established the 60 s mega correction; it is not a new
performance measurement.

MS05b1 DISPOSITION READY

## 9. Third-round dispositions — FS25 and FS26

**Date: 2026-11-13. Both findings accepted; neither disputed.**
Basis: SA1's section 12, ending `SUDOKU ROUND 3 DONE`; current harness/runner and
`generator/tests/manual/variants.test.js` at the MS05b1 working-tree boundary.
SA1 confirms FS11-FS24. These corrections are independent of RF01/CV6-02.

| Finding | Disposition | Owning correction |
|---|---|---|
| FS25, Major: Easy filters also select Very Easy | Accepted | MS05b3/MS05e/MS18e/checklist now use the leading `> ` describe boundary. Each completed cell requires the runner's selected total 1 and intended full name, with `--verbose` transcripts |
| FS26, Major: one CV3 test generates every level | Accepted | MS05b3 owns the narrow variants cache/CV3 registration split; per-level generation and a separate refusal test preserve the aggregate API. Project every CV3 level; explicitly hand overlong/unbounded unrun cells to MS05d after selection. MS18e uses the same units without inheriting a deferral as a final pass |

### 9.1 Filter contract

`core/tests/harness.js:503,518-519` lower-cases the filter/full name and uses `indexOf`.
The fixed forms are:

```text
> <level>: <count> puzzles > I5:
> <level>: <count> puzzles > CV6:
> <variantId> <level>: <count> puzzles > I5:   (extra-regions)
> variants: <id> > CV3 <level>:
> variants: <id> > CV3 unsupported:
```

The leading boundary stays **inside the quoted `--filter` argument**. The first four suites'
Easy and Very Easy have the same count, so a suffix without that boundary is not unique.
Every example and manifest instruction was corrected; the difficulty suite's existing
`time) > <level> >` form already has a boundary and remains unchanged.
An exit 0 does not override a zero/multiple/skipped selection or a wrong full name.

### 9.2 CV3 isolation without lost coverage or API changes

The old `checkLevels` calls `ctx.corpus()` and materializes all supported levels. For a nine-level
heavy variant it makes 18 pipeline requests; naming the variant in the filter never made that
one test a bounded level unit. MS05b3 now explicitly owns `variants.test.js`:

- Add lazy `ctx.corpusOf(level)` with unchanged seeds 1..perLevel, default 2/3 volumes,
  trace, options and 240000 ms request guard.
- Preserve **eager aggregate `corpus()`** for existing callers. It must still fill every key
  before returning: the existing `sweepMoving` test (`variants.test.js:486-491`) deliberately
  fills the old corpus before changing the clue floor. Returning an unmaterialized lazy map
  there would invalidate that regression.
- Extract the unchanged per-level assertions, including MS05b2's exactness/warnings semantics
  and existing hit threshold; register one `CV3 <level>:` test per supported level.
- Keep a separate `CV3 unsupported:` test per variant for the same unsupported complement,
  without building a supported corpus. Record an empty complement honestly for all-level
  variants; it is not permission to skip the test.
- Retain one aggregate CV3 in `CHECKS` and the existing
  `sweepVariant(def,{only:['CV3']})` result shape/behavior. Do not register an extra old
  aggregate CV3 harness test alongside the split tests.
- Extend scripted full-manifest parity and the small real-prefix proof to this sixth adapter.
  Preserve every other aggregate check and its population.

### 9.3 Projection and deferred ownership

MS05b3 records an explicit `evidence/MS05b3/deferred-cv3.json` list (empty if none) before
launching risky cells. Each unrun projected >450-second cell retains its estimate/basis,
source/allowance/seed cohort, exact selector, original seed/count manifest and **MS05d**
as its post-selection owner. Missing credible bounded evidence has a distinct deferral reason,
not a zero-cost estimate. No executed count, exit or time is invented for an unrun row;
an observed failure cannot be relabelled deferred.

MS05d receives only that named list in addition to its existing classic9 GD. After selection,
it re-projects and runs the original per-level checks where bounded. Remaining incomplete
cells stay blocking gates for assigned completion; they are not silently transferred to release.
No new R5 cell or selection criterion, altered count, timing budget or process ceiling is added.
MS18e rebuilds the final manifest and must close final coverage, not reuse an early deferral.

Timing qualification: the 220 s observation is samurai **seed 42**, while CV3 uses seeds 1/2.
It establishes a risk, not the measured duration of those two requests. Earlier pre-allowance
data is labelled historical planning context and newer applicable measurements take priority.
It is not a proved upper bound for a changed source/policy, which can return different puzzles
or use a different number of attempts. This precision does not dispute FS26.

### 9.4 Boundary preserved and validation

The minimal MS05b2/MS05b3/MS05d/checklist notes explicitly separate these fixes from CV6-02.
No prerequisite, wave, task ID, commit boundary or R5 selection rule is changed here.
MS05b1 and MS05c task files, implementation, fixtures, logs and `clarifications.md` are untouched.
The source/allowance used for projections must be reconciled with the eventual CV6-02 answer;
these edits do not authorize dispatch through the open prerequisite or waive its quick gates.

Read-only checks, each under 10 seconds:

- Real harness with synthetic labels: **5 old Easy collisions reproduced**; **82**
  boundary-prefixed I5/CV6/CV3/refusal selectors each chose the intended one test, including
  case-insensitive matching. No application engine was loaded.
- Existing `variants` helper with a **stubbed** producer: aggregate CV3 made **18** requests,
  nine levels x seeds 1/2, each with its unchanged 240000 ms guard; its public report has one
  CV3 verdict. No real generation or manual suite ran.
- **13** concrete PowerShell blocks parsed without execution.
- **16** concrete cell filters audited; no stale unanchored/whole-variant form remains.
  The index still has 51 unique task links, original dependencies and empty logs are preserved,
  all seven edited documents pass CRLF/no-BOM/trailing-whitespace/final-newline checks, and
  `git diff --check` passes.

**Round 3: 2 accepted, 0 disputed. Total pack review: 26 accepted, 0 disputed
(13 Major, 13 Minor).** RF01 is a separate unresolved runtime blocker, not a reopened FS finding.
No heavy/timing run, application/test implementation edit, staging or commit was performed.

FS25-FS26 DONE

## 10. S-OD2 — Recovery tasks on the preserved active tree

**Date: 2026-11-13. Authority: owner S-OD2, 06:45, and the orchestrator's execution notes in Part H.**
RF01/CV6-02 is answered; this section replaces the pending acceptance-boundary proposal,
not the observed failures. No application implementation or failed gate is declared repaired.
MS05b1 remains open and uncommitted at the current `f788e02` boundary.

### 10.1 Dispatch order and acceptance

Seven sequential dispatches, one developer at a time:

| Task | Scope | Prerequisite | Active estimate | Machine estimate |
|---|---|---|---:|---:|
| [MS05r1](../../../tasks/difficulty-v3/MS05r1-profile-active-recovery.md) | Profile G13 and mega12/mega16 Nightmare seed 3, maxAttempts 1; sample/local work and time | Preserved MS05b1 WIP, not a restored HEAD | 45-60 min | 3-15 min |
| [MS05r2](../../../tasks/difficulty-v3/MS05r2-recovery-consumers.md) | Strict soak/qualifier consumers, ordered-prefix rejection, seven manual contract sites | r1 step evidence | 35-50 min | 1-5 min |
| [MS05r3](../../../tasks/difficulty-v3/MS05r3-recovery-allowance-instrumentation.md) | Local accounting/allowance at Infinity, internal work, conserved error work and absolute-index shards | r2 step evidence | 45-60 min | 2-10 min |
| [MS05r4](../../../tasks/difficulty-v3/MS05r4-select-recovery-allowance.md) | All four diagnostic settings for the same three requests; unchanged six-cell R5 selector | r3 step evidence | 30-45 min | 20-75 min |
| [MS05r5](../../../tasks/difficulty-v3/MS05r5-bounded-quick-coverage.md) | Test inventory, exact-name/results tooling, complete bounded-quick plan | r4 finite result | 40-60 min | 1-5 min |
| [MS05b3](../../../tasks/difficulty-v3/MS05b3-bounded-manual-corpora.md) | Lazy manual corpora and early I5/CV3/refusal evidence on the selected default | r5 step evidence | 45-60 min | 20-90 min |
| [MS05r6](../../../tasks/difficulty-v3/MS05r6-combined-recovery-acceptance.md) | Original-contract G13/mega closure; final E, full quick, classic9 GD and complete recovery audit | r1-r5 and b3 step evidence | 45-60 min | 35-110 min |

Total planning allowance: **285-395 active minutes**, plus **82-310 serial machine minutes** if
all stages complete. These broad ranges include the added diagnostic/inventory tooling; they
are not a new budget or a promise of recovery. The selected-source manifests replace estimates
with actual projections. Every invocation remains at most 540 s; project compound cases at most
450 s, announce the slot and obey the shared lock. No timing/quick processes run concurrently.

r1-r5 and b3 have **step evidence complete** handoffs, not independently accepted/committed
checkpoints. r6 alone carries the combined acceptance. A READY marker certifies the task
specification, not a green implementation. Every new dispatch has its own scope, exclusive
serial file ownership, B/T criteria, exact command payloads, stops and empty Execution log.

### 10.2 What is retained, absorbed or moved

| Original scope | Current disposition |
|---|---|
| MS05b1 implementation and B/T requirements | Keep the existing tree, notes and interim artifacts. Not a new dispatch; r6 closes all original duties |
| MS05b2 consumers/prefix/manual predicates | Absorbed completely by r2; its old file is an explicit routing/archive record |
| MS05c work/allowance/shards | Absorbed by r3; Infinity until the measurement, no independent GR/quick checkpoint |
| MS05d selection/default | r4 owns the exact selector and selected literal |
| MS05d E, complete quick, classic9 GD and outstanding CV3 | r6 owns final-source closure, not an earlier partial refresh |
| MS05b3 early manual evidence | **After finite selection/r5, before r6 acceptance and MS05e**, same populations/assertions |
| MS05e | Waits for the combined r6 commit; S-OD1 algorithm, closure/fallback and MS06a dependency remain |

The checklist's index, waves, ownership, per-task/commit exception, gate owners, decisions and
traceability now reflect this sequence. Old waves 9a/9b/9c/10/11 are replaced by
9r1/9r2/9r3/9r4/9r5/9r5b/9r6. The four retained/absorbed rows are not extra dispatches.
MS06a's prerequisite/default wording now points through r6/MS05e, without changing its isolated
before-data experiment. Historical references to the “MS05d default” mean r4's value accepted at r6.

### 10.3 The adopted diagnostics and unchanged selector

- r1 uses the **actual G13 fixture request** and the existing mega CV5 seed 3 for each board.
  Only these short profiles use maxAttempts 1. Transparent stage/strategy observation retains
  the digger's work and the time of ordinary sample triplets versus the repeated-sample local
  continuation; it does not guess the split from the inherited strategy name.
- r4 measures those **same three full requests at none/64/128/256**, with their normal attempts:
  twelve non-selecting outcomes. The profile's one-attempt none is not reused as a full control.
  Retain all errors/partial work. The diagnostic 500 s ceiling is labelled and never substituted
  for a 120 s G13 or 60 s mega acceptance guard.
- The selector remains six cells x twelve derived requests x four settings = **288 primary
  requests**, seed base 20260101, unchanged direct/pipeline routes. Per-cell integer exact-hit
  counts use the authoritative `generationExact`; full-rating upper medians include every
  request with known conserved work. A gap, mixed source or unknown work blocks selection.
- Choose the smallest finite no-hit-loss setting with strict median improvement in at least
  one cell, otherwise none. No extra cell, per-variant value, time-based winner or provisional
  literal. Only after selection is the one production default changed.
- Derived current certificates and sampled independent references remain separate in the
  new diagnostic rows. An unselected/error reference does not erase the canonical verdict.
  Old MS02 rows are not rewritten as though they had the new acceptance meaning.

SA1's diagnostic points (1)/(2) are adopted. Its proposed G13 persistence, changed mega fallback
assertions, dark switch and checkpoint branch commits are **not** authorized.

### 10.4 Closure, stops and one commit

r6 first checks the original G13 guard and both original two-test mega Nightmare groups.
The mega groups retain seeds 1..4 and CV5's 3/3/4; their design assertions and actual factor
are not changed. A diagnostic result alone is not a passed acceptance test.

After those preflights: record final-source wires G09-G12, publish/check them, record all fourteen
analyses (G13 first), then the complete 520 hash keys. No old-source/interim G13 substitution,
expanded wire manifest or weakened merge. Update genuine coupled G06/G07 pins only from the
complete fresh evidence. R5 promises six-cell hit preservation, not preservation of all 149
interim puzzle identities; the final comparison explains actual changes without that false claim.

r5's additive inventory/results/exact-selection tooling makes the whole quick population
auditable. r6 rebuilds it after b3 and pin changes, retains every assertion in both application
environments, and reconciles disjoint bounded result rows. A listed test is not executed coverage;
no omitted slow callback, new skip or relaxed assertion. A single callback that still cannot
fit is a stop, not permission to restructure its request loop. MS05e also inherits this
bounded full-quick procedure rather than repeating an unbounded whole Generator command.

The complete classic9 GD obligation survives. b3's early I5/CV3/refusal results are reconciled
with the final source; every outstanding CV3 cell must close or stop for the owner. Its old
post-selection handoff to MS05d is now r6, since selection already preceded b3. Existing narrow
intermediate aggregate-availability reporting remains; missing coverage, timeout, invalidity
and quick-test failures do not acquire that exception.

**Mandatory owner stops:** none winner; selected-setting invalid/error/incomplete diagnostic;
G13 or mega guard/latency/fallback-assertion failure; any remaining quick failure; still-unbounded
or incomplete required coverage; invalid/ambiguous output or untrustworthy evidence.
Return the fixed request, source/default, work/cap hits/attempts, actual time/error/limit and all
four diagnostic settings. Do not select another value, alter a guard, persist G13 or change
mega's fallback assertions. Those choices return to the owner only if this recovery stops.

**Commit plan:** one meaningful orchestrator commit, only after combined acceptance:
`difficulty-v3 MS05: required exactness with measured bounded recovery`.
Retain the required trailers. No branch checkpoint or retrospectively fabricated green
intermediate history. Private backup refs remain the orchestrator's safeguards, including
new files; developers neither edit refs nor restore the backup over this tree.

### 10.5 Validation and remaining decisions

Light, read-only validation only:

- **57** distinct index task links resolve; seven recovery dispatches have all template
  sections, their own B/T IDs and empty Execution logs. The archived scope files explicitly
  forbid an independent dispatch. Existing accepted logs/checkboxes were not changed.
- **28** concrete PowerShell blocks parse with no errors; `git diff --check` passes.
- All **15** owned documents pass UTF-8/no-BOM, CRLF, final-newline and trailing-whitespace
  checks; **72** relative links resolve. The seven-step index order and empty logs reconcile.
- Isolated Mega registration exposes **111** cases. Each specified Nightmare selector selects
  exactly its original **two** tests; zero generator/solver calls and no test bodies ran.
- A guarded broader registration probe exposed existing eager setup in full-grid, digger,
  solver and pipeline suites. r5 now explicitly retains and accounts for that work: listing
  is non-execution of test/hook/benchmark bodies, **not** a false zero-generation claim.
  The blocked/stubbed partial inventory is not used as full coverage or passing evidence.
- The new `work` field's exact-key PuzzleResult assertion is explicitly assigned to r3 and
  selected in its focused checks; it is not left to become an unexplained final quick failure.

No quick suite, soak, recorder, qualification, real profile or timing gate was run; no source,
fixture or developer evidence was changed. No staging, commits, backups or branch operations.
**No new design/owner question is needed now.** The next decision is conditional on the measured
stops already specified by S-OD2. SA1's cross-check still precedes dispatch.

RECOVERY TASKS READY

## 11. Fourth-round dispositions — FS27-FS33

**Date: 2026-11-13. Seven accepted, none disputed: three Major, four Minor.**
Basis: SA1 section 14 and the current MS05b1 working-tree assertions. MS05r1 has been
dispatched and is frozen; its task file is not edited. This section supersedes section 10's
late preflight, unsplit r6 and optimistic closing-task estimates, not S-OD2 or the R5 rule.

| Finding | Disposition | Binding correction / owner |
|---|---|---|
| FS27, Major | Accepted | Move original-limit G13 and both mega Nightmare checks to the end of r4, before r5/b3. r6a checks final-source compatibility and repeats where needed; no early use of r5-only runner flags |
| FS28, Major | Accepted | Split r6 into r6a (final E/pins, step evidence) and r6b (full quick/GD/audit, sole acceptance). One commit after r6b; use realistic multi-hour evidence-operation estimates |
| FS29, Major | Accepted | r3 owns schema/no-allowance premises and runs all MS05b1 pipeline cases. r4 repeats the widened checks and classifies failures. r6a owns the specifically listed genuine default-coupled pins |
| FS30, Minor | Accepted | r6b reports each app's measured standing quick cost/shard count for acknowledgement with acceptance; correct AGENTS/developer-guide testing instructions without changing any guard |
| FS31, Minor | Accepted | Every r4 focused command uses the lock helper, with the wider FS29 selections |
| FS32, Minor | Accepted, orchestrator-owned | The orchestrator corrects the actual backup recipe in clarifications; no analyst edit there, no developer backup/ref permission or copied temporary-index recipe |
| FS33, Minor | Accepted | Forward-compatible r3 note: profile evidence/protocol remain immutable; r3 alone may extend copied work handling and record new driver identity. No r1 edit or addendum needed |

### 11.1 MS05r2/MS05r3

MS05r2 has no review defect; only its final-gate routing names now distinguish r6a/r6b.
MS05r3 explicitly owns `pipeline.test.js:2148`'s new `localSearches: []` in the exact-keeper
work literal, as well as the existing PuzzleResult key list. Both remain strict structural
checks. The sign-memo test at lines 1981-2008 keeps its seed, `maxProposals: 400` and behavioral
assertions, with scoped/restored Infinity for its no-extra-allowance premise.

The focused commands now include `--suite=pipeline --filter=MS05b1-`, alongside the existing
work-shape and new allowance selections. A named quick-contract manifest carries schema and
premise changes to r4. No global Infinity wrapper or override of closure requests is allowed.
The r3 driver note resolves FS33 prospectively; r1's existing evidence is never rewritten.

The two command blocks parse; both files pass formatting checks. No test or generation ran.

MS05r2 READY

MS05r3 READY

### 11.2 MS05r4 — fail early, then hand over only owned pins

FS27/FS29 part 2/FS31 are carried together. After the finite default, r4 runs the wider
six-suite focused check plus the `MS05b1-` and `recovery: shallow allowance` pipeline filters,
all through `Invoke-Dv3Node`. A scoped-premise problem returns to r3. A genuine changed data
pin is recorded with its exact file/test/assertion, old/actual values, source/default and
preserved behavioral requirement in `default-pin-manifest.json`, owned by r6a. Contractual
failures, including exactness requirements and runtime limits, cannot use that route.

The original-limit G13 script moves to r4's owned artifact directory. It and both original
mega Nightmare groups run **before r5/b3**, with no allowance override. Mega uses only the
already available suite/filter/verbose flags; full raw console output and the two-test
summary are retained. No `--list-tests`, `--exact` or `--results` before r5. Any original-limit
failure returns to the owner, not to another cap. The selector and its 288 + 12 outcomes are
unchanged. r4's estimate is now 45-60 active minutes plus 25-90 machine minutes.

All four concrete PowerShell blocks parse; no r5-only flag occurs in them. Formatting passes.

MS05r4 READY

### 11.3 Closing split, standing cost and downstream routing

| Dispatch | Scope / acceptance | Hands-on estimate | Machine estimate |
|---|---|---:|---:|
| [MS05r6a](../../../tasks/difficulty-v3/MS05r6a-final-evidence-and-pins.md) | Final-source guard compatibility/recheck; complete 520/4/14 E; every specifically listed default/golden pin; **step evidence only** | 2-3 h | 20-45 min |
| [MS05r6b](../../../tasks/difficulty-v3/MS05r6b-quick-gd-and-combined-acceptance.md) | Every final quick/GD assertion; early/deferred manual reconciliation; measured standing cost and combined audit; **sole acceptance** | 1.5-2.5 h | 25-60 min |

These are evidence-operation estimates based on the actual E workload, not misleading
45-60-minute coding allowances. The checklist distinguishes them from ordinary implementation
tasks. The old r6 file is a routing/requirement milestone with its former dispatch explicitly
archived. The order is now r1 -> r2 -> r3 -> r4 -> r5 -> b3 -> **r6a -> r6b**.
One combined commit remains at the end; no r6a checkpoint.

r6a owns the exact quick files/assertions in the reviewed r4 pin manifest in addition to
G06/G07 and the other genuine coupled replay/steps/player pins. It keeps strict behavioral
requirements and runs the changed assertions. It hands over an explicit publication/source/
pin state, rather than a late interrupted whole-recovery session. r6b does not edit assertions:
a newly discovered issue is classified/reassigned, never silently relaxed.

The early r4 guards do not disappear into E. r6a compares the relevant final inputs, retaining
only genuinely compatible evidence or rerunning. r5's runner/harness changes normally require
fresh mega results. r4's raw transcripts cannot be relabelled as r5-format coverage records.
G13's fresh analysis remains mandatory even when its generation-only preflight is compatible.

**FS30:** r6b reports actual per-app shard counts, complete test totals, process-wall sums and
maxima, source/Node/machine/factor/default and the accepted nonoverlapping coverage set.
Lock waits, retries and superseded runs are separate from the standing cost. The partial
713.8-second interim b1 data is not called a completed baseline.

AGENTS' stale quick-time comments and both developer-guide testing paragraphs are corrected
**before** the final quick fingerprint, pointing to a data-only measured-cost report. That
report exists for link checks and is filled after the runs; it is not a numeric quick-test
input. r5's fingerprint explicitly includes AGENTS/instruction inputs but not this data report.
Thus recording the actual cost does not silently invalidate or relabel the successful quick
rows. A changed real input still requires fresh affected evidence.

The cost is presented for the owner's acknowledgement **with normal combined acceptance**;
it is not a new total-time gate, a new stop or permission to change individual guards.
MS05b3's outstanding CV3 owner is now r6b. MS05e and MS06a route through r6b's combined commit;
their algorithm/isolated-baseline contracts are unchanged. Index, waves, ownership, gate owners,
traceability, estimates and the one-commit rule all follow that route.

FS32 stays with the orchestrator's clarification correction; no backup/index/ref command was
performed or added to a developer dispatch. FS33 needs **no r1 developer addendum**.
No new plan-author or owner policy question is introduced by these task-level corrections.

### 11.4 Validation and release of the remaining specifications

- **59** distinct index task links and **78** relative links resolve; the eight recovery
  dispatches are in the required order, with r6 retained only as a milestone.
- All **15** edited/created documents pass UTF-8/no-BOM, CRLF, final-newline and
  trailing-whitespace checks. The remaining dispatch templates/acceptance IDs/logs reconcile.
- **24** active concrete PowerShell blocks parse with no errors; archived recipes are not
  treated as current dispatches. `git diff --check` passes.
- Frozen r1's SHA-256 remains
  `549F9D749B7C61B3B72FA0C3D6049F055EB45A4FB6BA88380525EDDB38081318`.
  No r1 task edit or addendum, application/test implementation edit, real gate/profile run,
  staging, commit, backup or ref operation was performed.

**Round 4: 7 accepted, 0 disputed (3 Major, 4 Minor).** Cumulative task-pack review:
33 accepted, 0 disputed (16 Major, 17 Minor); RF01 remains the separately decided recovery
boundary, not a passed runtime gate. All READY lines certify specifications, not execution.

MS05r5-r6 READY

## 12. Shared-helper acquisition wait

2026-11-13, orchestrator request. The checklist's `Invoke-Dv3Node` now waits up to 20 minutes for a timing
slot, rather than 10. Its fairness paragraph explains the 590-second Pentomino run boundary and states that
the 540-second Node execution limit, five-second polling and 15-second inter-run gap are unchanged.

Checked MS05r5, MS05b3, MS05r6a, MS05r6b, MS05e and the MS06-and-later task files. None embeds another
`Invoke-Dv3Node` definition or its ten-minute acquisition deadline, so no undispatched task file needed editing.
The historical MS05r1 timeout record is unchanged. MS05r4's dispatched task/helper and live evidence were not
touched.

Validation is limited to helper syntax, the acquisition/execution limits and document formatting; no lock,
generation, test suite, staging or commit operation was run.

HELPER WAIT 20

## 13. Owner stop CV6-03: mega Nightmare after the R5 selection

2026-11-13. Added [CV6-03](../clarifications.md#cv6-03-r5-selects-256-but-mega-nightmare-exceeds-the-existing-limits)
to Part H, after CV6-02. It cites the completed MS05r4 selection, diagnostics, default/pin manifest and preflights.
The default remains 256: the only eligible setting, preserving all six cells' hits and lowering classic9
Nightmare's median full-rating count by 5.08%. G13 passes at 104.712/120 s; mega's original limits do not.

The product check found a 120000 ms **active-time** generation budget in both worker/cooperative modes, no mega
increase, and no best-so-far recovery from `budget.exceeded`. The 310 s mega16 result belongs to a 500 s diagnostic;
on comparable throughput the ordinary samples already exceed the browser allowance. This is a code/evidence
inference, not a new browser measurement. The standalone Player does not generate puzzles.

The recommendation is (a) + (d), keeping 256, with an explicit (c) product disposition before publication, not
blanket larger budgets. The question assigns proposed MS05r5m/MS05r5p scopes, G13 persistence to an expanded r6a
only if authorized, and the r5/b3/r6a/r6b resume duties under every option. It preserves all fixed seed/CV5 relations,
the independent manual guards, final-source evidence and the combined acceptance boundary. No recovery dispatch,
test move, new guard, persistence or product change is authorized by the question itself.

Only document edits and read-only inspection/arithmetic were performed; no production/test code, live evidence,
task file, fixture, lock or Git state was changed.

CV6-03 READY
