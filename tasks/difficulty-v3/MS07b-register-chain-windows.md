# MS07b — Register chain/depth windows with complete integration

| Header | Value |
|---|---|
| Depends on | MS07a accepted |
| Size / active time | Medium; 50-60 minutes plus E/GH and a two-request Hell 1 pilot |
| Owner / milestone | Shared solver and both apps; M7b split catalogue |
| Authority | R9/R10/R20/R21; SA1-Q-S1, SA2-Q-S04/S08/S11; MS07a review IR52-IR55 |
| Status | Not started |

## Goal & business context

Distinguish short/long chains and shallow/deep Nishio in ratings and hints, including when a single
ID is invoked alone. C=6 is only the initial measurement configuration, not the selected winner.

## Scope

In: wrappers, two new IDs, costs/weights, fixtures/locales/help, bounded Hell 1 pilot and the
pre-authorized mega hell1 quick/deep contract; IR52's strict budget gate and IR55's small
pattern-cost validation/test-output fixes and evidence handoff.
Out: selecting C, soak cutoff tooling or GP-cost records (both MS07c), grouped nodes,
qualification/offers, default depth 3.

## Repository rules

AGENTS/checklist and integration bundle B. No Git/pack/log writes, synthetic help examples or deferred
new-ID integration. All four IDs must work at one accepted boundary.

## Inputs & context

R9 table, verbatim:

| ID | Weight | Order | Window |
|---|---:|---:|---|
| forcingChain | 1100 | 190 | 1..C links |
| forcingChainLong | 1400 | 198 | C+1..12 links |
| nishio | 1700 | 200 | depth 1 |
| nishioDeep | 2600 | 202 | minimum 2; default maximum 2, explicit maximum 3 |

New baseCosts: forcingChainLong=118, nishioDeep=210; group chain, unscoped, no uniqueness assumption.
Keep existing costs. Expose `SG.chainSearch.SHORT_MAX`, initially 6, read at each wrapper call.
MS07c adds the soak `--chain-window=4|6` override and cost measurements; neither is needed for
this coupled registration/locales/help commit.

Caller options are existing `maxChainLength` and `maxNishioDepth`: absent/non-number/NaN uses the
ID default; numeric values are floored; <=0 disables; larger values/Infinity are clamped to the ID
ceiling. Long cannot return <=C, deep cannot return depth 1; deep default 2, explicit larger maximum
clamped to 3. Search from depth/length 1 to prove the minimum, then filter by the ID window.

### IR54 ruling — explicit work limits and windows for all four IDs

**Keep the two existing IDs unbounded in work:** `forcingChain` and `nishio` explicitly pass
`workLimit: null`. This retains their accepted work-limit policy; it does not disable their
inherited parent-budget/cancellation checks or their new R9 windows. The two **new** IDs
explicitly pass **50,000**, R10's approved starting work limit per new pattern finder, identical
on every board. No new limit is imposed on the old IDs by accidentally inheriting the seam default.
Any later own-new-limit adjustment still follows R10's once-only measured rule; this ruling
makes no such adjustment and changes no digger or qualification budget.

Resolve the caller's maximum under the paragraph above, then pass the ID and **both named
window bounds and `workLimit` explicitly on every wrapper's seam call**:

| Registered ID | Explicit minimum | Explicit maximum passed to the seam | Explicit `workLimit` (approved starting policy) |
|---|---|---|---|
| `forcingChain` | `minLength: 1` | `maxLength: C` by default; `min(C, floored caller maximum)` when numeric | `null` |
| `forcingChainLong` | `minLength: C + 1` | `maxLength: 12` by default; `min(12, floored caller maximum)` when numeric | `50000` |
| `nishio` | `minDepth: 1` | `maxDepth: 1` by default; `min(1, floored caller maximum)` when numeric | `null` |
| `nishioDeep` | `minDepth: 2` | `maxDepth: 2` by default; `min(3, floored caller maximum)` when numeric | `50000` |

Read `C = SG.chainSearch.SHORT_MAX` at each call, not once at registration. NaN/non-number/absent
means the **ID's** default; explicit Infinity reaches only the stated ceiling (3 for deep,
not its default 2). A non-positive maximum or a maximum below the minimum leaves an empty
window and returns null; do not raise that maximum to make the ID fire. Do not let the seam's
fallback minimum 1 or maximum 12/2 stand in for a missing wrapper property. The general,
unregistered seam and its defaults remain available for >12-edge algorithm tests.

The table uses the seam's `workLimit` API. Its normalizer represents null as internal
`spec.limit === Infinity`; do not pass literal null as the private `forcingWith`/`nishioWith`
spec's `limit`, which would not mean unbounded. Do not change the seam's 50,000 default to
work around an omitted wrapper option.

**Generated output may change in MS07b.** The R9 window split, new IDs/tiers and the new IDs'
R10 limits are intentional algorithm changes; fresh GG/GR/GH, references and explained pins
are already owned here. Retaining null for the existing IDs adds no accidental 50,000 cutoff,
but is not a promise that this registration task preserves MS07a's puzzles or differential
digests. Budget-limited outcomes may also change with the corrected check schedule below.

### IR52 ruling — implement the strict gate, not a weaker promise

Keep R10's **entry check and no more than 256 work units between parent-budget checks** on
bounded scans. Replace the modulo-block gate in `tech-chain.js` with per-call work-at-last-check
tracking (`checkedAt` or equivalent). Before a batch of `n` edges, if
`work + n - checkedAt > 256`, check the parent budget and update the checkpoint to the current
work. Successful bounded entry/root checks also establish that checkpoint; it is not shared
between calls. Nishio already checks each trial and keeps doing so.

Do not assume an expansion can never exceed 256 edges: split an oversized expansion into
bounded pieces or check within it, preserving edge visitation/BFS tie order. Count each visited
edge exactly once, including an early Finding, a work-cap cut and a thrown budget. Preserve
the exact work-limit boundary and the rule that an incomplete minimum returns null, never the
best proof so far. The two unbounded legacy paths keep their accepted check cadence: no added
entry/periodic checks merely to make them resemble the new bounded IDs (IR53).

Update the engine header, the gate comment and Generator design §6.6 together. The present
`1 + 1 + 2` cadence test is not a sufficient regression: add an uneven-expansion case that
would expose the old >256 gap, check the 256 boundary and the final tail, and retain the
unbounded/entry/cap/cancellation checks. Existing budget-error plus observer seams can expose
work at a check without adding production instrumentation. No wall-clock threshold is needed.

### IR54 handoff — budget records and scoped supplements

- `measured` swallows `budget.exceeded` and can report `capHit: null`; that is also the value
  for a complete scan. **A consumer must check its own budget after the finder/kernel returns,
  before accepting a result or classifying a record as complete.** Keep the existing post-find
  check in `generator/tests/fixtures/pattern-cost.js`. MS07c's diagnostic/cost consumers must
  follow it; null `capHit`, a null Finding or a complete-looking observer record is no substitute.
  Cancellation and other errors still propagate. No new observer field or cap enum is needed.
- MS07a wired `F.supplements` only into the **unscoped classic9** sweep. `supplementItems` and
  its validation use `model9`/81-character puzzles. These four IDs are unscoped and may use that
  route, preserving the complete original seeded random prefix, counts, `minFirings: 3` and
  `stats.states === count + supplements.length`.
- **MS14b's scoped `lawOfLeftovers` cannot inherit that wiring automatically.** Its owner must
  append model/structure-correct supplements at the scoped call site in `techniques.test.js`,
  using that site's `H.model(id)`, count and seed, retaining the existing random population,
  maxSteps and firing requirement. Adapt the model-aware supplement construction/validation
  there, not by running Killer states through the classic9 helper or replacing the random
  sweep. This is a named later-task handoff, not permission to implement R17 in MS07b.
  The cost tool's scoped-ID adapter likewise remains MS14b's; do not remove its current refusal.

Finding (R10):

```text
{technique:id,cells:number[],placements:[cell,digit][],eliminations:[cell,digit][],
 i18nKey:string,i18nArgs:plain cloneable data}
```

Chain keys in BOTH apps/languages: name, desc, `.step.endpoints`, `.step.contradiction`,
`.step.forced`. Deep Nishio needs name/desc/`.step`. Keep numeric digit argument conventions.
Two real positive exact-Finding fixtures and one negative per new ID; use <=4 short and >=7 long
fixtures/examples where possible so either measured cutoff is valid. Archive unchanged v2
forcingChain/nishio fixture records; use current overrides for the new definitions, not old labels.
Update current reference expectations, record reclassifications; never fit weights to labels.

### IR55 — evidence provenance and cost-tool correctness

1. **Name reproducible differential inputs.** The original of MS07a's differential is
   **`9dfc9a3:core/js/engine/tech-chain.js`**, HEAD's blob at MS07a's start, not an absolute
   path in the improve-generating worktree and not the moving HEAD after MS07a is committed.
   In MS07b's evidence add the immutable commit/blob reference and the full SHA-256 of **each
   actual compared file**, original and candidate, next to each cited comparison/digest.
   Distinguish the raw Git blob from a CRLF materialization and state any newline conversion;
   a combined source fingerprint is not the individual file's hash.
   Use the orchestrator-supplied immutable source/accepted MS07a snapshot and preserved records;
   capture the accepted input identity before editing. Never hash the later MS07b file and
   label it MS07a's compared candidate. If an intermediate snapshot is not recoverable, say
   its file identity was not recorded, rather than inventing it. Preserve the old transcripts
   and measurements; this provenance correction requires no rerun of MS07a.
2. **Carry the measured wrapper cost into v3 notes.** Add a source-qualified line citing
   `docs/difficulty-v3/evidence/MS07a/evidence.md` §4 and `transcripts.txt`: MS07a's final wrapper
   measured **428.7 versus 417.8 ms find-only (+2.6%)** on the mostly-short-find corpus, with
   no visible standing-quick change (690.2 versus 690.7 s). This is a historical microbenchmark,
   not a generator-wide slowdown, final-source claim or new S-AV item; MS18d can find it there.
3. **A fixture-outcome mismatch must fail the cost record.** In
   `generator/tests/fixtures/pattern-cost.js`, make `matchesFixture === false` a case-keyed
   validation problem, including in `problemsOf`. `documentOf` must set `complete: false`;
   `exitCodeOf`/the CLI must return **1**, even if every run finished deterministically or a
   caller supplies a misleading `complete: true`. Preserve the measured Finding, work, times
   and mismatch count in the failed record; never rewrite them to the expectation. Keep
   `matchesFixture: null` as "no fixture expectation", not a fabricated match or mismatch.
   Unknown IDs/options still fail preflight with 2. Add focused positive/negative mismatch
   regressions and keep the matching/old failure paths. This small validator fix belongs here;
   the real GP-cost collection and cutoff tooling still belong to MS07c. Cost consumers
   must reject mismatches, including in old records whose producer marked them complete.
4. **No permanent quick test writes to a non-ignored folder.** Relocate the Node-only
   `pattern-cost-tools` sandbox from `tests/artifacts/difficulty-v3/MS07a/sandbox-pattern-cost`
   to a neutral, repository-owned ignored location, for example repository-root
   `.scratch-pattern-cost-tools/<unique-run>/`, covered by the existing root `.gitignore`
   rule `.scratch-*/`. Give each invocation its own directory and remove only that owned
   directory in `finally`; never delete a shared base or another run's files. A killed run
   must leave only ignored scratch, not task evidence or fingerprinted input.
   Keep all test-generated files and child-CLI outputs in the ignored tree; rejection tests
   aimed at protected paths must still prove that **no file was written**. Do not use system
   temporary directories. This concerns test scratch, not the explicitly owned E/GH/evidence
   publication commands. No new ignore rule is needed for the example location.

### Real source and non-vacuous Hell 1 handoff (FS18/FS19)

After registration, Hell 1's tier contains `nishioDeep`: its weight 2600 gives the unrounded
lower term `1.25 * 2600 = 3250`, below Hell 1's maximum 3600 but not Nightmare's 2400.
Hell 1 is no longer a vacuous exactness case; each miss can consume every attempt.

Inspect/replay the existing real `SG.helpExamples.nishio.source.puzzle` before discovery.
At resume HEAD `c9935cd`, `player/js/ui/help-examples.js:46` still has
`hint.stepArgs.depth: 1`, source `Classic Sudoku 9x9,Hell 1,8`, step 17.
Its old requested label is **not** evidence of depth 2. Prefer it for shallow `nishio` if it
still replays under the new registry; do not relabel its Finding as `nishioDeep`.
If the current source actually exposes a minimum-depth-2 Finding after replay, it may supply
deep instead, with a different real depth-1 source for shallow. Every snapshot must be generated
by the real Player and match the registered window, never hand-transformed.

Acquire a genuine depth-2 source within B's four batches/48 requests, first from existing
real unique fixtures, then the bounded Hell 1 discovery command below. A missing source blocks;
report the exact attempts and missing ID rather than expanding the bound or faking a snapshot.

After integration/GH and with provisional C=6, run the two-request classic9 Hell 1 pilot below
once. Retain both request outcomes, exact/shallow/error status, per-request ms, counts and
source/defaults. Project the unchanged 20-request Hell 1 GD batch as `20 * mean(ms)` and the
serial-equivalent first 40 GQ requests as `40 * mean(ms)`; GQ's jobs-4 scheduling/early stops
make that an estimate, not a proof of its wall time. Report a GD projection >450 seconds
before its owner starts. Never raise the 540-second process ceiling.
MS07c repeats this pilot only if selecting C=4 changes the default/source; MS07e uses the latest
applicable measurement, not an old vacuous-tier timing. Pilot requests are not selection hits.

### Mega hell1 contract decided in advance (S-OD4 / CV6-03 (1))

Do not rediscover the Nightmare stop when `nishioDeep` makes Hell 1 non-vacuous.
Apply r5m's approved rule to **mega12 and mega16 hell1 now**, preserving the current fixed population:
invariants seeds 1/2/3/4 and independent CV5 calls 3/3/4 per board, fourteen additional occurrences.
Extend the existing deep tool/manifest, not a new suite/tooling class or blanket `SG_DEEP` run.
Use board-default attempts 4/2, one request per locked process, 500 s diagnostic ceiling.
Keep every correctness/relationship check; a shallow result needs both warnings and is a miss.
Keep existing Nightmare occurrence IDs stable; give hell1 distinct level-qualified IDs. Allow an
explicit level-selected record/reconciliation manifest for this fourteen-call addition, never
label that partial population the complete final 28-call manifest.

Quick keeps a real one-attempt mega12 hell1 smoke with its measured/margined bound and a scripted
mega16 hell1 stop/fallback control, as for Nightmare. Retain the existing other levels/tests.
No raised browser/manual guard or `SG_TIME_FACTOR`. A >240 s request or any latency/projection
exceedance becomes a named item for MS07e/MS18c (cost also MS18d), not an owner stop; wrong puzzles,
deductions, exact flags, warnings or corrupted evidence still block. Match current default/proof
identities before reusing a deep puzzle for CV3's own checks.

Record the fourteen hell1 occurrences once on this task's final C=6 source; reconcile original
relations. r5m's Nightmare records remain historical recovery evidence, not fresh measurements.
MS18e owns the final-source rerun/reconciliation of the complete retained Nightmare/hell1 deep
population after all engine changes; other technique tasks do not acquire a blanket deep gate.
Update the bounded quick manifest and CI group in this task, with no silent lost request.

The first new registrations also supersede `core/tests/suites/techniques.test.js:45-56`'s
"only jellyfish moved" equality between historical and current IDs. Preserve the frozen v2 ladder
and old-ID relative-order assertions; compare its old-ID projection to the expanded current
registry rather than asserting both full catalogues still contain exactly the same IDs.

### Anchors in the accepted MS07a source (2026-11-15; use symbols after edits)

| File:line / quote | Change |
|---|---|
| `core/js/engine/tech-chain.js:152,160`, `chainLimit`, `nishioDepth` | Preserve caller parsing, intersect with each ID's explicit window |
| `:175-200`, `seamOptions`; `:205-223`, `measured` | Explicit work-limit normalization; swallowed budget is not observable from `capHit` alone |
| `:226-231`, `gate`; `:425-463`, expansion loops; `:512,529`, entry/root checks | Strict checked-work cadence on bounded scans, exact edge accounting |
| `:568-573,679-688`, seam entries and existing finders; `:690-711`, registrations | All four wrapper policies explicit; generic seams retained |
| `core/tests/suites/tech-chain.test.js:1626-1652` | Replace/extend the block-cadence assertion with the actual <=256 guarantee |
| `core/tests/suites/techniques.test.js:43-58,176-196` | Existing classic9 supplement helpers versus the separate scoped call site |
| `generator/tests/fixtures/pattern-cost.js:331,381-456` | Keep caller-budget recheck; reject fixture mismatches in record validation/exit status |
| `generator/tests/suites/pattern-cost-tools.test.js:473,521-567` | Neutral ignored per-run output, no shared-folder deletion or protected-path writes |
| `player/js/ui/help-examples.js`, `nishio:` / `"depth":1` at resume | Inspect the old real source; not an assumed deep example |

## Files to create/modify

- `core/js/engine/tech-chain.js`, its suite. `generator/tests/soak.js` is read/run, not edited.
- `generator/tests/fixtures/pattern-cost.js`, `generator/tests/suites/pattern-cost-tools.test.js`;
  `generator/tests/pattern-cost.js` only if a coupled exit/help correction is needed. No new
  tool, scoped adapter, GP-cost gate or cutoff option is added here.
- Full B for four affected IDs: weights, active/current fixtures, current registry order, both apps'
  locales/help/tests, real help catalogue, v3 notes; E generated fixtures.
- Generator design 6.6/13.6, the affected 15.2/15.4 cost-tool descriptions and Player hint design;
  both user/developer guides, including matching cost-tool failure semantics.
- `docs/difficulty-v3/evidence/MS07b/` for the IR55 provenance addendum and actual task evidence;
  `docs/difficulty-v3/notes.md` for the source-qualified +2.6% note and selected wrapper policy.
  Preserve completed MS07a evidence; no rerun just to correct its source labels.
- `generator/tests/suites/mega.test.js`, existing `mega-contract.js`/helper/tests: hell1 mapping above;
  bounded quick/CI manifest membership/counts and tier documentation, no new evidence class.
  Test scratch follows IR55's already-ignored path; `.gitignore` needs no change for that route.

## Implementation steps

1. Wire the explicit IR54 windows/limits, exposed C and the two registrations/weights at final
   orders. Implement IR52's strict bounded gate while preserving unbounded legacy cadence.
2. Add wrapper/window/work/cadence regressions and full locale/help integration, preserving
   historical records. Apply IR55's mismatch failure and ignored test-scratch fixes; retain
   post-find caller-budget checks and document the scoped-supplement handoff.
3. Check/replay the existing shallow source and acquire the genuinely deep source within B's bound.
4. Capture real sources separately with --record-sources, combine maps, publish a complete catalogue.
5. Apply the mega hell1 contract, run its new deep occurrences, E, quick sets and the exact
   two-request classic9 Hell 1 pilot; hand provisional C=6, source maps and
   observed/projection timings to MS07c/MS07e, with IR55's source hashes and historical-cost note.
   Cost recording and override tooling belong to MS07c.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS07b-B01 | Labels name the minimum represented proof window, not whichever ID was allowed |
| MS07b-B02 | Each new ID has a real, correctly replaying explanation |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS07b-T01 | C/C+1/12/13 and depth 1/2/3, alone/mixed, invalid/off/oversized options pass; all wrapper bounds and legacy-null/new-ID R10 limits (starting at 50000) are explicit |
| MS07b-T02 | Catalogue is 28/23 unscoped; monotone weights, cost table and full B pass |
| MS07b-T03 | Cancellation/exhaustion cannot publish an unproved minimum |
| MS07b-T04 | Both quick sets, E and real GH pass; two-request Hell 1 outcomes/projections are retained without a vacuous-tier assumption |
| MS07b-T05 | Mega hell1's original requests/relations, quick replacements and CI membership survive; time-only findings continue as named items |
| MS07b-T06 | Bounded check gaps are at most 256 work units, including uneven/final batches; legacy cadence, exact work limits, cancellation and no-partial-proof behavior stay valid |
| MS07b-T07 | A fixture mismatch yields a failed record/CLI exit 1; caller-budget recheck stays; test writes are ignored/per-run; differential inputs and wrapper-cost provenance are explicit |

## Test plan and gates

Before the publication gates, cover:

- Every registered wrapper's **effective** min/max and work policy, not only direct seam defaults.
  Retain >12-edge seam tests, empty/off windows, invalid/default/Infinity options, shortest-proof
  rejection and work-cap boundaries. Include a bounded/unbounded contrast that would catch an
  accidental 50,000 limit on a legacy wrapper, without turning a quick case into discovery.
- IR52's strict checkpoint positions/gaps on uneven expansion sizes, exact 256 boundary and
  final/capped tail; an oversized expansion must not violate the stated guarantee. Keep
  no-extra-entry/periodic checks on the unbounded path and exact work totals/Findings without
  an exhausted parent budget. No wall-clock assertion or changed BFS/trial ordering.
- IR54: a swallowed `budget.exceeded` may yield null with `capHit: null`; the caller's own
  subsequent budget check still fails. Never treat that observation as a completed negative.
- IR55: deterministic, full-count positive/negative fixture mismatches remain in the record but
  make it incomplete/exit 1, including a falsely asserted complete flag; matching records still
  pass, and a missing expectation stays unknown. The real CLI's outputs and cleanup stay in
  the ignored, uniquely owned sandbox; protected-path refusal still leaves no file.

Generator: `node tests\node-runner.js --suite=tech-chain,techniques,technique-weights,difficulty-floor,pattern-cost-tools`.
Both quick sets. Full E with MS07b (GG/GR); first commands:

```powershell
node tests\perf.js --hash-key=classic4/veryEasy --hash-from=0 --hash-count=5 --hash-record=..\docs\difficulty-v3\evidence\MS07b\hashes\classic4-veryEasy-00.json
node tests\replay-goldens.js --ids=G01 --record=..\docs\difficulty-v3\evidence\MS07b\analysis\G01.json
Invoke-Dv3Node -Task MS07b -NodeArgs @('tests\soak.js','--variant=classic9','--level=hell1','--from=0','--count=2','--total-count=2','--seed=20260101','--no-gate','--json=..\docs\difficulty-v3\evidence\MS07b\hell1-pilot.json')
```

Player GH discovery source command (repeat separately for deep with `--ids=nishioDeep --levels=hell1`):

```powershell
node tests\tools\make-technique-examples.js ..\generator --ids=forcingChainLong --discover --variants=classic9 --levels=nightmare --max-puzzles=12 --max-hints=400 --record-sources=tests\artifacts\difficulty-v3\MS07b\long.json
node tests\tools\make-technique-examples.js ..\generator --ids=forcingChain,forcingChainLong,nishio,nishioDeep --sources=tests\artifacts\difficulty-v3\MS07b\sources.json --max-puzzles=16 --max-hints=400 --write
node tests\tools\make-technique-examples.js ..\generator --ids=forcingChain,forcingChainLong,nishio,nishioDeep --sources=tests\artifacts\difficulty-v3\MS07b\sources.json --max-puzzles=16 --max-hints=400 --check
```

Use existing/curated sources first; complete the source map for all selected IDs. Follow B's finite
discovery limit; missing real examples block, never synthesize them. Jobs=1, no --jobs. Estimate
10-90 minutes E, 10-480 seconds per discovery and initially 1-300 seconds for the Hell 1 pilot
(record actuals, hard stop 540 seconds). If even two requests project too long, use MS05c's
`--from=0 --count=1 --total-count=2` and `--from=1 --count=1 --total-count=2` without changing
the two seeds/reference endpoints. Bare `--count=2` is wrong at HEAD: the non-shard route has a
minimum of five. Run the new mega hell1 deep IDs with r5m's one-request tool/record route, not
the old seven-request callbacks. Add roughly 10-35 minutes for those fourteen unmeasured calls,
subject to actual projections and S-OD4 item handling. **Announce to the orchestrator before starting (pentomino
runs in parallel on the same machine).** Every possibly >10-second command uses the lock helper.

## Definition of done & handoff

Report provisional cutoff, exact windows, current-reference changes, real source manifests and
the Hell 1 pilot with GD/GQ projections. Include explicit per-ID limits, strict bounded cadence,
the mismatch/exit and ignored-output tests, exact differential input hashes and the historical
+2.6% wrapper note. MS07c adds its override/cost tooling and selects C; it must retain caller-budget
checks and reject mismatched cost records. Carry the scoped `lawOfLeftovers` supplement/adapter
handoff to MS14b. This task makes no qualification claim or offer change.

## Resume rules — S-OD4

Review: analyst cross-review. Correctness/evidence corruption or changing a recorded decision stops;
time/availability becomes a named numerical item for MS07e then MS18c/MS18d and work continues.
Use `Invoke-Dv3Node` for every possibly >10-second payload, <=540 s; no new evidence/tooling class
for another slow cell. Keep mandatory real proof/examples and the approved acquisition bound.
Both quick sets use the current bounded manifest; own changed mega membership and every added
suite's r6c CI group. Return the complete inherited/new item list and actual gate verdicts.

## Execution log

| Field | Value |
|---|---|
| Status | Accepted (SA1 verdict: accept with a text-only fix round; fix round applied) |
| Start | 2026-11-15 02:32 (+07:00) |
| End | 2026-11-15 05:30 developer first pass; 05:32-05:53 SA1 implementation review (`claude-opus-5.5/16-review-of-ms07b.md`); 05:55-06:35 text fix round with final quick runs; orchestrator re-check and commit |
| Duration | 2 h 58 min developer + 40 min fix round (E, GH, the Hell 1 pilot and 14 mega Hell 1 records, redone once after a comment-only source change); about 21 min review |
| Model | claude-sonnet-5.5 (developer); claude-opus-5.5 (SA1 review); claude-opus-5.5 (orchestrator) |
| Token usage | 532 model calls; 208,456,061 input tokens (206,477,000 cache reads); 526,742 output tokens |
| AI credits | about 3,086 (developer) |
| Verification | Developer: four chain/depth IDs registered with explicit windows and work limits (IR54: `forcingChain`/`nishio` `workLimit: null`, `forcingChainLong`/`nishioDeep` 50,000), IR52's strict <= 256-unit gate with a gap regression, weights in `difficulty.js`, locales/help/explanations in both apps (GH 28 examples; `nishioDeep` from the published Escargot puzzle); tests `tech-chain` 89 -> 107, `techniques` 169 -> 186, `pattern-cost-tools` 28 -> 32, `difficulty-diagnostics` 84 -> 85, `mega-contract` 37 -> 44, `mega` 111 -> 108 (Generator 3,449, Player 1,749); four engine mutations detected. E on the final source: 5/5 wires, 14/14 analyses, 520/520 hashes match the refreshed fixtures; 6 of 520 hashes changed, all Nightmare (classic9 #2, #3, #6765, diagonalX #89, #377, #610); G14 changed. Hell 1 pilot (C = 6): 2/2 in band, 0 exact, about 5 s per request. Mega Hell 1: 14/14 correct, 0 exact; mega12 29.3-34.4 s, mega16 99.9-123.3 s. Final quick runs on the final tree: Generator 3,449/3,449 (744.9 s; `f752e35b…`), Player 1,749/1,749 (`f0749637…`); CI check exit 0. SA1 recomputed every identity. Orchestrator: locked focused re-runs 721/721 (first pass) and 450/450 after the fix round (`help`, `i18n`, `mega-contract`, `tech-chain`, `techniques`); CI check 3,449 of 3,449 |
| Acceptance | MS07b's criteria met: R9 windows and R10 limits per IR54, explicit bounds so the kernel defaults never stand in; legacy cadence preserved with the strict gate for bounded calls; the help, locale and explanation integration is complete in both apps; Hell 1 is no longer vacuous (FS18/FS19). Evidence: `docs/difficulty-v3/evidence/MS07b/` |
| Issues & resolutions | SA1 findings: IR56 (the six changed hashes are explained by labels and weights, allowed sets, budget-check counts and the 50,000 limit; #377's dig itself changed), IR57 (user-guide counts 21 -> 23 and 26 -> 28; fingerprinted, quick sets rerun), IR58 (ledger source identities, Hell 2's vacuous requiredness, S-AV24's 30 s figure) applied in the fix round. IR61: the six developer deviations accepted (a premise edit in MS07c's `difficulty-diagnostics`, the manual `difficulty` suite edited but not run, E redone after a comment-only source change with the first set kept in `superseded-first-source/`, discovery before the fixture search, the existing Expert-tier mega16 control, read-only git commands in the first pass). Items S-AV08 (744.9 s) and new S-AV24-S-AV26 added to check-list section 2 |
| Handoff | MS07c: IR59 (the dig's `OBJECTIVE_STEPS` guard now counts the new entry and gate checks and the second scan) and IR60 (`SHORT_MAX` has no range check; MS07c owns the setter); MS07c repeats the Hell 1 pilot only if C = 4 changes the default/source. MS07e: SA1 expects the classic9 Hell 1 GD batch (at least 90 % exact) to fail; S-AV24-S-AV26. MS14b: scoped `lawOfLeftovers` supplements. MS18e: the handoffs listed in `evidence/MS07b/evidence.md` |
