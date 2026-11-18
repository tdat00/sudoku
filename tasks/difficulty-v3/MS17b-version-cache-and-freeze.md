# MS17b — Version 3, current cache and frozen reference catalogue

| Header | Value |
|---|---|
| Depends on | MS17a accepted |
| Accepted implementation base | `5b94904` (MS17a); later pack-only commits do not replace this runtime baseline |
| Size / active time | Medium; 50-60 minutes of code plus limit-record reconciliation and bounded E/GD/quick gates |
| Owner / milestone | Generator integration; M17 release candidate frozen |
| Authority | R20/R22; SA2-Q-S05/S07/S10 |
| Review | SA1 cross-review before orchestrator acceptance; not template-only |
| Status | Implementation/E reported complete; GD Q6-Q7 settled below; final gates and SA1 review pending |

## Goal & business context

Publish the changed meaning of difficulty as one new rating/cache version while retaining old
Player imports and historical evidence. Freeze all measured new-pattern limits.

## Scope

In: rating/cache 3, classification-aware cache validation/comparison, current references/docs,
frozen limit record, full source-aware E and bounded GD as specified below.
Out: retuning, new techniques, history envelope change, external floor certificate, offers,
cache scheduler/cost-table changes or source acquisition.

## Repository rules

AGENTS/checklist; no Git/pack/log edits. No deployment before final evidence. Old positive-version
external claims remain imports, never fresh requiredness certificates.

### Accepted baseline — 2026-11-18

MS17a is accepted at **`5b94904`** after orchestrator template review and rechecks.
Use its **`quick-final/`** results and its fresh replay ledgers; the current hash ledgers
remain MS16's complete retained family. The order is **MS17b -> MS18a -> MS18b -> MS18c**,
with the unchanged final remainder and one writer. SA1 reviews this task before acceptance.

| App | Accepted tests / suites | Accepted quick time | Accepted fingerprint |
|---|---|---|---|
| Generator | **4,769 / 55** | **543.9 s** | `bae8cc894b398fb6b3f6ba868c37dedd90a6b219da2703d7d2e0aab110596d8f` |
| Player | **2,978 / 32** | **118.9 s** | `1dfe66ea5a761c58e10859d7aea226869cb58f35c15c14c4803e77179e1eb6d7` |

Preserve CI projections (seconds): **core-shared 170, steps 70, replay 70, mega 50,
own-fast 320, digger-target 30, pipeline 80, Generator player shard 90, Player job 180**.
Keep the four bounded Generator groups, suite membership, tiers, factors and workflow limits.
Derive final counts/fingerprints after the changes; maintain projections by the existing rule.
Final manifest metadata precedes its final CI check; a later metadata edit needs another check.

Accepted E identities:

- replay, both families: `9023f9eb3308b66cc84f3e0654e2785c33db5a50cf252e41c141f07344ffc99e`;
- hashes: `8740fd9e8ed34fe1d80fada564b59b5467d75f8f61be0d2c14abae92320dfb4e`.

All **40** GH examples match; the registry has **34 unscoped IDs**.
At this base rating/cache are **2**, history/worker wire are **1**, grouped `proofVersion`
is **2**. Only the first two become 3. MS17a correctly puts its explanatory title on the
earlier entry's **open button only**; no second note-span title is required or assigned here.

### Process: no implicit decisions, late plans or late source edits

**QUESTION before acting** on any unresolved contract/permission/evidence choice, including
an assumption, proposed default or judgment left for the reviewer. Report evidence/options,
then await an explicit answer and resumption. Once paused, no independent edits/runs or
acquisition. SA1 review at the end is not prior authorization for an unresolved choice.
Routine implementation inside the settled contract remains developer work.

**Write and verify each bounded plan before its phase**: commands, exact cases/requests,
source-qualified projections, expected statuses and output paths. A failed plan write or
edit anchor blocks dependent execution until fixed and verified. IR12 compounds need finite
per-item projections and actual elapsed-time admission; no unmetered retries or inferred
success from a timeout. Preserve the first failed/incomplete run and its true status.

Announce the plan and use the shared slot/locks, <=540 s process-tree ceiling and >=15 s
gaps; possibly >10-second/unknown generation work starts locked. Pentomino's completion
does not retire that protocol. Reuse the helper, not the old unlocked-trial path.

**Format before every E freeze**, including the `difficulty.js` rating-version header,
cache comments/validation code and tests: 110-character code convention, CRLF/no BOM, final
newline and trailing whitespace. Finish included-source edits before recording. A later
included byte change, even a comment, invalidates the affected families. Finish all
fingerprinted documentation/counts/tests before the final complete quick pair.

**S-OD12/S0:** no corpus scan or new source-acquisition campaign without prior owner permission.
This is not a new-ID task; no discovery quota, predecessor-specimen substitution permission
or unused own-limit adjustment transfers from an earlier task. The fixed E manifest,
scoped GD and existing all-40 GH check are authorized validation, not acquisition.
Unexpected lost examples/premises require QUESTION, not a seed scan or a silent pin refresh.

## Inputs & context

R22, verbatim:

> Set `RATING_VERSION=3` in `generator/js/engine/difficulty.js` and cache `SCHEMA_VERSION=3` in
> `generator/js/ui/cache.js`; purge schema 2.
> Cache comparison must include acceptance-relevant current classification, not just same grids,
> score and level.

Keep worker wire version 1 and history store VERSION 1. Current own-cache wire must have explicit
boolean exact and a complete current-version rating; reject missing classification/old version,
not infer it from level equality. No new solve in a cache comparator. Compare exact, solved,
ratingVersion and normalized techniqueCounts in addition to existing givens/solution/score/level;
semantic model differences (units/regions/cages/signs) also cannot count as the same puzzle.
Ignore timings/work counters and symbol display mode. Only current canonical producer data enters
this cache; do not broaden requiredOf to imported summaries.
Validate the raw decoded wire's explicit boolean **before** `SG.pipeline.fromWire`: that function
already coerces an absent/non-boolean flag to false, so checking only the reconstructed result
cannot distinguish a valid shallow entry from missing classification. Preserve r3's internal work
and MS06 target transport while ignoring them for puzzle equality as specified.

### Cache boundary and compatibility details

- Keep `sg.cache.v1` as the storage key; the stored envelope becomes schema **3** and a
  schema-2 envelope is purged, not migrated or stamped as current. History's key/envelope,
  worker `v:1` and grouped `proofVersion:2` remain unchanged.
- Validate the result-side classification/explicit boolean before the normal cache write
  path can lose it through `pipeline.toWire`'s coercion, and validate the raw decoded wire
  before `fromWire`. Do not launder a missing/non-boolean exact flag into a valid false one.
  Valid **`exact:false`** solved fallbacks remain cacheable; never upgrade them from matching
  level names or derive a replacement flag.
- Require the complete documented current producer rating, not a version tag alone:
  current numeric `ratingVersion`, explicit `solved`, typed score/level/empties/counts and
  the other fields emitted by `difficulty.classify`. Preserve the existing exclusion of
  canonical unrated results (null score/level); do not broaden cache admission to them.
  No missing classification field is supplied by a default or a fresh solve.
- For equality, normalize valid technique-count maps by numeric counts/key order and
  omitted zero entries. Missing/non-object/array maps, unknown technique IDs, negative,
  fractional or non-finite counts and coerced strings are not an empty valid map.
  An explicitly empty valid map is different from missing counts.
  Missing/malformed incoming classification cannot compare equal; keep the existing
  stale/regeneration path rather than attaching a trace through defaulted metadata.
- Compare semantic model data as values: variant/digit/cell identity, canonical units and
  their relevant metadata, layout/region mapping, fixed cells, cage cell sets/sums/
  `distinct`, and directed inequalities. Changed constraints must not pass because a
  stored solution happens to satisfy both models. Ignore symbol display mode/labels;
  do not compare whole mutable model objects or object identity. This is a comparator
  for current canonical producer models, not a new arbitrary-import equivalence API.
- Ignore timing, attempts/work diagnostics, trace verbosity and target for puzzle equality,
  while preserving their existing transport/retrace behavior. Missing/malformed work stays
  unavailable, and absent/invalid target stays null, not zero or a band midpoint.
  Do not make optional diagnostic metadata a new classification-admission requirement.
- Preserve `configKey`, recorded/default attempt intent, cache capacities/pool scheduling,
  `COSTS`, pre-generation guards, cancellation and trace-regeneration fallback behavior.
  Keep the existing checksum/model/solution checks. Add no logical solve, floor solve,
  solution-count or generation work to validation/comparison.
- Current canonical origin remains a caller/producer precondition; this is not a
  cryptographic origin certificate. Preserve the existing imported-result exclusion
  from the cache, and never broaden `requiredOf` to arbitrary imported summaries.

**Coupled test update explicitly owned:** cache suite `MS05a-T01` currently accepts a cache
wire with missing exact as false (lines 505-514). Schema 3 deliberately replaces that
cache-only expectation with rejection of missing/non-boolean exact, keeping the valid
true/false round trips. Do **not** make the same change to the shared pipeline/worker
backward-compatibility tests: `fromWire` still defaults a legacy absent flag to false.
Retain the target/work compatibility tests and shallow-result warning assertions.
Exercise classification/model mismatch through the controller's real regeneration/stale
path as well as deserialization. Keep the existing comparator private; do not add a public
test-only comparison API.

### SA2 rulings — pre-implementation Q1-Q5, 2026-11-18

The developer stopped correctly before implementation or phase execution. These choices
need no owner escalation. The two short metadata commands belong in the disclosed run
record; they are not generation or completed validation gates. Resume only on the
orchestrator's explicit relay/resumption.

**Q1 — accept strict validation, with these precise bounds and local consistency checks.**
The rating must be a non-null, non-array record with all ten named fields present as own
properties; missing/undefined is not a nullable field. Extra fields are ignored.

| Field | Cache admission rule |
|---|---|
| `level` | String member of `SG.difficulty.LEVELS`; not a requirement that the achieved fallback level is offered by the variant |
| `score`, `rawScore` | Numeric finite integer `score >= 0`; `rawScore === score`, without coercion |
| `confidence` | Numeric finite value in `[0,1]` |
| `hardestTechnique`, `hardestGroup` | Both null, or a registered technique id with `hardestGroup` exactly equal to that technique's registered group. An arbitrary string group is not sufficient |
| `solved` | Exactly `true` for own-cache admission |
| `empties` | Integer in `[0, model.cellCount]`; model/cell-count shape must be usable, not guessed |
| `techniqueCounts` | The valid map defined in Q3, with no manufactured empty-map default |
| `ratingVersion` | Exactly the valid numeric current `SG.difficulty.RATING_VERSION` (3 after this task), not a parsed/coerced value or an inferred stamp |

This is shape/local-consistency validation, **not** a new rating proof. Do not recompute the
score/confidence, choose the hardest technique from the counts, derive exactness, recount
solutions or run a solver. The direct registered-id/group check is intentional and cheap.
Do not treat matching metadata as proof of canonical origin; the existing producer/model/
givens preconditions remain. No guessed version, count, score or boolean repairs an invalid entry.

`solved:true` is this cache's admission rule, **not** a claim that every Generator rating
is solved. Canonical unrated ratings with null score/level exist and remain outside the
cache, without changing how the generator/app handles them.

**Q2 — accept validation in `serialize` and before `fromWire`.**
Require an **own** `exact` property whose type is boolean, plus the Q1 rating, on both
the result-side write boundary and the raw decoded wire. Throw the existing
`GenerationError('unexpected')` via the cache's invalid-data path on failure.
`putResult`/public `put` keep their existing catch-and-false behavior.
Share the validator with `verify`; a check only after `fromWire` is insufficient.

The earlier write refusal of an unrated result is accepted: do not store something the
cache already refuses to serve. Do **not** describe unrated production states as
unreachable or change generator handling to make them disappear. Cover this cache-only
refusal with a controlled canonical-unrated result. Do not harden the generic low-level
store adapter into a different API, change `pipeline.toWire/fromWire`, or remove their
legacy worker compatibility. An explicit valid false flag still survives unchanged.

**Q3 — accept the count normalization and conservative model policy; expand rating equality.**
Both sides must have explicit boolean exactness and a Q1-valid rating. Missing/malformed
comparison input is **not equal**, using the existing stale/regeneration path, never a
match through defaults or a swallowed metadata error.

Compare givens/solution, exact, and the complete standardized rating tuple:
**level, score, rawScore, confidence, hardestTechnique, hardestGroup, solved, empties,
ratingVersion, normalized techniqueCounts**. Q1 already makes rawScore equal to score
and binds group to technique, so redundant physical checks need not be duplicated.
The other rating fields are not timing diagnostics: a changed stored rating must not
silently match just because score/level/counts happened to match. No re-rating is needed.
Ignore extra rating fields and, as proposed, warnings, attempts, work, timings, target,
config and trace for this equality; preserve their existing validity, key/identity,
transport, retrace and controller rules rather than removing those checks.

A count map is an ordinary/null-prototype dictionary, not an array or other collection.
Validate **every own enumerable key**, even one whose value is zero: a current registered
id and a non-negative safe integer value are required. Drop valid zeros and sort keys on
an owned projection for equality; never mutate the original map. `{}` is valid, missing
is invalid. Do not relax unknown ids or coerce strings/fractions.

The proposed model field set is accepted for current canonical `SG.model.create` outputs:
variantId/cellCount/digits, fixedCells, layout rows/cols/cellRow/cellCol/cellRegion, overlays
(kind and cell membership), subGrids, index-aligned units with kind/gridIndex/partial,
cages with cells/sum/distinct, and directed inequalities.
Exclude unitMeta.label, symbols mode/labels and derived cellUnits/peers.
At this base `model.create` normalizes unit metadata to those three non-display fields
plus label; partial absence is the canonical false case.

Keep the **outer** order of units/cages/signs/overlays/subGrids strict. Sort copies of
unordered membership cell lists, retaining lengths/multiplicity; do not deduplicate bad
data, sort the board-indexed vectors, or reverse inequality endpoints. Preserve input
purity and compare element values, not object/typed-array identity. A representation
permutation can conservatively be non-equal; that is not a claim that it proves a
different mathematical puzzle. No graph-isomorphism/import-normalization framework is
assigned. Structurally malformed compared model data cannot match.

Add focused coverage of the tightened group/empties bounds and a changed otherwise
well-typed rating field, as well as the proposed classification/model/count cases.
Exercise the controller stale path and preserve the no-new-solve and purity premises.

**Q4 — accept the listed header/pin/legacy-stub choices, with precise gate staging.**
Both `difficulty.js` current-producer headers (line 2 and the rating shape around 513)
become v3. The current producer assertions at manual lines 783, 786-791 and 1396 become 3.
Also rename the current-classifier group `difficulty: the score of rating v2` to
`difficulty: the score of rating v3`; record the rename and derive GD selectors from
the new inventory. This does not rename historical v2 reference/certificate material.

Keep the listed fake-worker version at manual 399, rendering/reference stubs at replay
1711 and diagnostics 171, and diagnostics' deliberately differing manifest versions
3/4 at 827/886. They are controlled inputs, not assertions about today's producer.
Keep dynamic uses dynamic and retain old imports/history/worker/proof-version cases.
List the before/after changes and unchanged-intent cases; no global 2-to-3 replacement.

It is acceptable to schedule the **replay suite after the complete wire publication**
as a fixture consumer; mark it as scheduled/not yet run, not as a fabricated version-only
failure or a pre-freeze pass. Do **not** defer pipeline or worker speculatively:
they have no identified saved-wire dependency at this base, and their fresh-producer/
wire-compatibility checks belong in the pre-freeze focused work.
Any further deferred case must have its exact name and actual old-wire dependency
identified in the plan. No blanket expected-red suite/exception allowance follows.
After wire publication, run every deferred consumer and all final required coverage.
Any other/unexplained failure uses QUESTION before a pin or source repair.

**Q5 — accept the overall sequence with source-qualified mutation/format ordering.**

1. Plan D, implement code/current producer pins and source headers, and perform focused
   validation (with Q4's explicit replay staging). Finish the documentation/count
   premises before running tests that read them.
2. Format the **target source and tests before the mutation run**, retain its first run,
   and identify its bytes/selectors. Do not leave source-comment/code rewraps until after
   claiming final-source mutation coverage. If a target or relevant test changes, keep
   the old result and rerun the affected set on the final bytes. A timeout, script error
   or absent result is not a detected mutant.
3. Confirm the limit-inventory audit and source-affecting documentation are complete,
   resolve every outstanding interpretation, then format-check/freeze. Ordinary guide/notes edits
   outside E inputs can be finalized later, before their quick fingerprints.
4. E stays **five wires -> merge-check (declared version-only exit 1) -> exact explanation
   -> complete write -> check -> deferred consumers -> fourteen analyses -> 520 hashes**.
   The latter two families are expected check-only against canonical values.
   Apply IR12 per-item projections/admission to compounds; "under 450 seconds" alone
   is not a plan. The 540-second process ceiling stays.
5. GH, bounded GD, then all final fingerprinted docs/counts before the complete quick
   pair. Finish projections/manifest metadata **before** the final CI check.
   Final fingerprint/E-identity reads and evidence-only completion follow that check.

SA1 cross-review remains required before acceptance. A review, mutant or gate fix that
changes included bytes invalidates the affected E families and quick-source coverage
under the existing rules; no review exemption or retagging. None of these rulings grants
new source acquisition, finder tuning, version-independent schema changes or extra scope.

### SA2 rulings — Q6/Q7: GD worked example and continuation, 2026-11-18

The developer stopped correctly after GD #15 (`score-v3`) failed, 14/15, before editing
the pin or running another GD command. This is a stale current-ladder expectation, not
an aggregate availability failure or a reason to change production rating behavior.
These rulings do not accept the eighteen claimed equivalent mutants; SA1 still reviews them.

**Q6 / GD #15 — choose B, preserving both meanings of the existing test.**
The test contains a published fixed-count calculation **and** a live canonical rating.
Do not replace the former with the latter:

1. Keep the entire classic9 calculation/live-rating branch unchanged: counts as recorded,
   53 empties, score **499**, level **hard**.
2. Keep the published Samurai count map with `simpleColouring:1` and its `D.breakdown`
   assertions unchanged: E **263**, peak **360**, work **1372**, empty term **69.44**
   (existing tolerance), score **633**. Those fixed inputs still reproduce the formula.
3. Give the live Samurai branch a separate, independently pinned current count map:

```javascript
{
  nakedSingle: 204,
  hiddenSingleBox: 42,
  hiddenSingleLine: 17,
  pointing: 6,
  boxLine: 1,
  nakedPair: 1,
  xWing: 1,
  skyscraper: 1
}
```

Its expected `simpleColouring` key is **absent**, not retained as 1 or derived from the
actual result. Assert current `r.empties === 263`, `r.score === 593`, `r.level === 'hard'`
and exact count-map equality. The corresponding current breakdown has peak **330**,
work **1342**, empty term **69.44** and score **593**; it does not replace the published
633 calculation above.

**Correct the prose:** 263 is the number of **empty cells**, not givens. The unchanged
Samurai text contains **369 cells / 106 givens**. Keep that text, model construction and
registry/allowed-technique behavior unchanged; do not disable Skyscraper or install a
historical ladder to make the current rating equal 633.

Rename/comment the single test so that it distinguishes published calculations
**499/633** from current canonical ratings **499/593**. Keep it one test, with every
previous formula assertion retained, so #15 still selects fifteen tests.
Update only the directly related `generator/design.md` section 15.2 row to state that
distinction and current rating v3. Do not globally replace 633/593 or rewrite historical
worked-example records; the guides' other 593 values describe unrelated replay facts.

The existing transcript `worked-example.txt` supplies the exact current counts. The
production `difficulty.js` diff is version/header-only, and the finders are unchanged
from the accepted base: this is an earlier Skyscraper choice exposed by the deferred
manual suite, **not an MS17b scoring change**. Record that distinction in the evidence/notes.
Do not defer the stale assertion to MS18c/d/e as an unresolved performance item.

Save/verify the repair plan before running it. Re-run **only #15**, locked with expected
exit 0, to **new result/log paths**; retain the original 14/15 failure and original
plan/inventory. Preserve the pre-repair manual-test bytes/hash before editing, so the
selected-test retention proof has an actual before state. Record the test-name/expectation
mapping and use the repaired fifteen-test
record for acceptance, not both old and new copies as duplicate coverage.
Earlier GD groups whose runtime and selected test bodies/inputs are unchanged need not be
rerun: retain their actual identities and the narrow diff proof, not a relabelled
final-source fingerprint. Refresh the current inventory/coverage mapping after the rename.

This repair changes only the manual test and directly related documentation. They are
not E inputs. Verify the frozen runtime/recorder bytes and both E identities still match;
then retain the existing E records, with **no E regeneration or canonical write**.
Do not edit/retag the frozen records. Finish fingerprinted docs/counts before the planned
final quick pair; this ruling does not exempt any later runtime change from revalidation.

**Q7 / GD #16-#23 — resume them, but reject unconditional continue-on-failure.**
After the scoped repair/recheck and a saved, verified continuation plan, run the eight
independent groups serially under their existing bounds: score-table, labelled, removing,
oracle, guarantees, cap, unreachable and safety (**43 tests**).
The plan's unadmitted Hell 1 and confusion-matrix populations stay unstarted and named;
they are not hidden in these selectors or converted to passes.

Each of these eight commands expects **exit 0**, with no blanket `-AllowExit1`.
Keep stop-on-unexpected-exit and inspect the failing assertions before any later group.
Only a definitively classified, already-authorized S-OD4 performance/availability outcome
permits independent continuation; new stale pins, unexplained non-batch assertions,
incorrect puzzles/flags/warnings, unsound deductions or evidence problems require the
existing QUESTION/correctness stop. Do not alter the driver to swallow every nonzero
exit, treat a batch label as proof that its failure was only aggregate, or finish the
remaining groups before reporting a newly unresolved failure.
No new stop-rule waiver, scope, source acquisition or limit adjustment is granted.

Keep exports' existing positive ratingVersion field and no external floor/target/work certificate.
Do not blindly replace literal 2 in legacy/stub/import tests or old help source text.
Current reference fields are `v3Expected:{level,required}`; unrated null/null. Historical labels,
v2 family certificates and preprocessing arrays remain history. Consolidate every reclassification.
Final catalogue 40 IDs/34 unscoped, uniqueness IDs exactly UR/BUG+1; orders 190/194/196/198/200/202.

Write the actual selected limits (not just starting values), scope/counter definitions, cap and C
decisions and source evidence in `docs/difficulty-v3/limits-v3.md`. New-pattern limits freeze with
v3: subsequent changes require a new rating version. MS18 cannot tune them.
Record the actual shallow allowance (256 unless later decided otherwise), size-attempt policy
8/4/2, CV6-05's restored first-allowed sign pass (no sign-pool constant; target transported, not
consumed there) and selected C separately from new-pattern limits. MS05e's rejected candidate
belongs to historical evidence, not the frozen production configuration. Do not copy obsolete
global-eight or Infinity-default descriptions from the pause evidence.

### Limit-freeze inventory checked at 5b94904

`limits-v3.md` must name each production value, symbol, scope, counter, stop/fallback
semantics, selecting/retaining owner and source-qualified evidence. The following is the
dispatch inventory, not permission to reselect. Evidence paths below are under
`docs/difficulty-v3/evidence/<task>/`; follow their cost/decision links and preserve
distinctions between constructed, seeded, real-finder and whole-generation observations.
An introducing task's unused adjustment does not survive into MS17.
MS13b's consumers, MS14c's regressions and MS17a's history marker made no new limit selection.
For each owner, record the retained/changed decision and rationale, not just its starting
literal. Lifted diagnostic limits, recorder timeouts and test/command ceilings are not
selected production pattern bounds; no fresh measurement campaign is needed to compile them.

| Finder / scope | Selected production setting and counter | Decision/evidence to preserve |
|---|---|---|
| Skyscraper | `tech-fish.js` `SKYSCRAPER_WORK_LIMIT = 50000`; tested base-line pairs | MS08a `evidence.md`, Work/Pattern cost; retained |
| Two-string kite | `KITE_WORK_LIMIT = 50000`; tested row/column pair of a digit, bridges inside that unit | MS08b final `evidence.md` and retained `pass-1/evidence.md`; retained |
| Empty rectangle | `EMPTY_RECTANGLE_WORK_LIMIT = 50000`; tested box/conjugate-unit pair of a digit, at most eight internal trials | MS08c `evidence.md`, Work/structural maximum/cost; retained |
| Finned X-Wing | `FINNED_X_WING_WORK_LIMIT = 50000`; tested complete two-base combination, cover work inside it | MS09a `evidence.md`; retained |
| Finned Swordfish | `FINNED_SWORDFISH_WORK_LIMIT = 50000`; three-base combination; independent from the X-Wing allowance | MS09b `evidence.md`, cost/census and S-AV31; retained |
| Remote Pairs | `tech-wing.js` `REMOTE_PAIRS_WORK_LIMIT = 50000`; same-pair edge extensions and tested endpoint pairs | MS10a `evidence.md`; retained. S-OD9's prior correction is not a work-limit adjustment |
| WXYZ-Wing | `WXYZ_WORK_LIMIT = 50000`; tested partial-quartet cell extensions, including rejected extensions | MS10b `evidence.md`, S-AV33; retained |
| UR types 3/4, second pass | `UNIQUE_RECTANGLE_WORK_LIMIT = 50000`; Type 3 real-cell extensions / Type 4 conjugacy tests | MS11a `evidence.md`, S-AV34. The proposed three-real-cell cap was removed, not frozen: k reaches the eligible unit cells / digits minus one |
| Hidden UR, third pass | `UNIQUE_RECTANGLE_HIDDEN_WORK_LIMIT = 50000`; tested eligible target/link-digit pairs, separate counter | MS11b `evidence.md` section 8/C4; retained. Preserve buffered per-pass records |
| BUG+1 | `BUG_PLUS_ONE_WORK_LIMIT = 50000`; a unit's cell tallied for one proposed extra digit | MS11c `evidence.md` section 8/C4; retained |
| New singleton-chain kernels | `tech-chain.js` `NEW_FINDER_WORK_LIMIT = 50000`; BFS edge expansions or Nishio assumption trials | MS07a/MS07b integration and MS07c split-ID cost. `nishioDeep` retains this; the long forcing ID's production path is now the grouped row below |
| Restricted XY-chain | `NEW_FINDER_WORK_LIMIT = 50000`; restricted-graph BFS expansions; ceiling 12 edges (actual endpoint proofs odd, 3..11), caller may narrow | MS12 `evidence.md` section 8/C4; retained |
| Grouped forcing attempt, both forcing IDs | `GROUP_NODE_LIMIT = 4096` additional groups and `GRAPH_WORK_LIMIT = 50000`, construction plus search on one guard; construction charges group candidates, cell-candidate pairs and every same-digit node pair, then search expansions | MS13a preparation, S-OD11 option A and MS13c `evidence.md` section 5; both numerical limits retained, S-AV36 open |
| Law of Leftovers | `tech-subset.js` `LEFTOVER_LIMITS = { units:2, cells:4, work:50000 }`; per-side selected units/difference cells, and one whole-call unit/assignment-extension guard | MS14a preparation and MS14b `evidence.md` section 6; retained, S-AV37 open. MS14c introduced no new cage limit/ID |
| ALS enumeration / ALS-XZ | `tech-als.js` `LIMITS = { cells:4, records:4096, work:50000 }`; effective cells clipped to digits minus one; one ALS-XZ guard across enumeration extensions, pair visits, opened x/z scans and peer-cell visits | MS15a D1-D8/SA1 handoff and MS15b `evidence.md` section 5; retained, S-AV39 open |
| Sue de Coq | `SDC_WORK_LIMIT = 50000`, separate per-call guard using the shared 4/4096 enumeration bounds; MS16's nine-point P3 counter | MS16 `evidence.md` section 5 and final-byte rechecks; retained, S-AV39 open |

Do not collapse these into "every call has a 50,000 limit":

- UR's legacy first pass has no new local work cap. The second and hidden third passes
  have **independent** 50,000 counters. A second-pass local cap can continue into the
  hidden pass; a parent stop cannot. They are not a single 50,000 whole-call allowance.
- S-OD11: short forcing first makes the bounded grouped attempt. **Only a local work/node
  cap**, with the parent still available, allows the complete singleton fallback with
  **no local work cap**, same parent/window. The minimum then belongs to the singleton
  domain. Long forcing has no fallback/second allowance; incomplete graph/minimum yields
  no Finding. Preserve IR54 and the phase/whole-call observer distinctions.
- The legacy `nishio` is depth **1**, no local work cap, parent budget/cancellation intact.
  `nishioDeep` has minimum/default depth **2**, an explicit caller ceiling **3**, nested
  candidates at most **3**, and its 50,000 trial allowance. Do not label its default as 3.
  The shared seam's `DEFAULT_WORK_LIMIT = 50000` is not a new local limit on those legacy
  unbounded production paths; registered callers supply their policies explicitly.
- Per-call/per-pass counters, entry and <=256-unit checks, truthful local caps/parent stops,
  complete-proof requirements and the existing diagnostic seams stay. An ALS record-quota
  prefix can prove a constructive witness; it cannot prove absence. A spent shared work
  guard is not renewed. Record fixed technique forms separately from tunable work bounds.
- Freezing is a versioned **policy/record**, not removal of diagnostic overrides or
  `Object.freeze` of mutable diagnostic namespaces needed by the owned MS18b comparisons.
  No new census, candidate-bound trial, counter redefinition or finder refactor belongs here.

Record these **separate generation/window policies**, not as newly selected pattern limits:

| Policy | Accepted value / authority |
|---|---|
| R9 selected C | **4**, `INITIAL_SHORT_MAX` / `SG.chainSearch.SHORT_MAX`, MS07c: 36/36 exact at C4 versus 24/36 at C6. Short 1..4, long 5..12; ceiling 12 unchanged. Do not copy the report's initial C6 or tests' historical C6 specimen recipes |
| R5 shallow allowance | **256**, `SHALLOW_SEARCH_DEFAULT` / `SG.digger.SHALLOW_SEARCH_RATINGS`, MS05r4 and recovery closure. Full ratings of one local search after its first shallow state; not a per-request, layout/dig/sample or attempt-count cap |
| Size attempts | **8 / 4 / 2** for <=81 / 82..144 / >144 cells, MS05r5p / S-OD4(c2); explicit settings and recorded-recipe intent remain. Pipeline's exported small-board 8 is not a global-eight policy |
| Other existing dig bounds | `CAP_RATINGS=1024`, `CAP_PROPOSALS=32768`, `REFINE_RATINGS=64`, `UNIQUE_NODES=200000`, `OBJECTIVE_STEPS=100000`, dig tries 12 / coarse 30: unchanged existing guards, not new MS17 selections |
| Greater-Than | CV6-05 restored first-allowed sign pass; no guided sign-pool constant. The target is transported, not consumed there |

MS18b owns the already-planned final R5/C comparisons. A changed winner requires the
recorded owner disposition before final qualification; it is not permission for MS17b
or MS18 to silently retune a frozen finder.

Carry **S-AV36-S-AV39** with the selection/counter/source distinctions above, **S-AV33/34**
and other earlier open coverage items, **MS15b-Q6, MS15b-GP-J, MS15b-GP-U and MS16-Q6**.
In particular S-AV38's earlier 50-cell GP population and MS15b's 37-cell population are
not interchangeable; pilot-only/unmeasured cells do not become passes when limits freeze.
S-AV39 includes MS16's 2 work caps in 488 seeded calls, one hiding a Finding needing
101,791 units, versus 301 reached real calls with no cap. Do not call 50,000 exhaustive
or a universally loss-free selection. Availability/cost/audit stay with MS18c/d/e.

### Anchors verified at 5b94904

| File:line / quote | Change |
|---|---|
| `generator/js/engine/difficulty.js:68`, `RATING_VERSION = 2`; `:513`, rating header; `:530`, `classify` | Bump actual producer and current header, not weights/counts/scoring logic |
| `generator/js/ui/cache.js:47`, `const SCHEMA_VERSION = 2` | Purge old cache |
| `generator/js/ui/cache.js:208`, `serialize`; `:228`, `verify`; `:258`, `deserialize`; `:277`, `sameResult`; `:996`, regeneration comparison | Enforce the cache boundary and actual stale/replay path |
| `generator/js/engine/pipeline.js:323`, `toWire`; `:354-366`, `fromWire` | Both coerce exact; preserve their worker-v1 compatibility, validate at cache boundaries |
| `generator/tests/suites/cache.test.js:505-514` | Replace only the superseded own-cache missing-exact acceptance |
| `generator/tests/manual/difficulty.test.js:783,786-791,1396` | Current producer-version assertions; fake-worker version at 399 is a separate intent |
| `generator/tests/manual/difficulty.test.js:1220-1252` | Offered classic9 groups; seeds 7000+i, 100 requests / top-level 20, lazy per-level cache |
| `generator/tests/suites/replay.test.js:1711`, stub `ratingVersion: 2` | Inspect stub intent, not blind replacement |
| `player/tests/suites/importer.test.js:207-219,267`; `player/js/ui/importer.js:632-633` | Keep legacy positive v2 claims; add current positive v3 compatibility, not a new import trust rule |

## Files to create/modify

- `generator/js/engine/difficulty.js`, `generator/js/ui/cache.js`; cache/export/history/pipeline/
  worker/replay current-version tests, manual difficulty reference/version assertions.
- E's explained version-bearing wire data; fresh full E evidence. Analysis/hash canonical
  fixtures are expected unchanged; no unexplained rewrite permission.
- Player importer/fixtures tests only for positive-version compatibility,
  never rewrite old puzzle/export fixture claims.
- Limits-v3, notes, `docs/README.md`; Generator design 6.6/6.7/6.8/13.7/14.3 and limitations;
  Player design 6.2/8.3/9/10; both user/developer guides.
- `.github/scripts/generator-quick.json`: owned counts/timing/projection metadata.
  Finder files, history behavior, pipeline/wire format, source-identity tools, offered tables,
  historical references and old imported fixtures are not new production-edit surfaces.

## Implementation steps

1. Check all preceding integration/evidence and selected values; no missing technique cleanup here.
2. Bump rating/cache atomically, validate current classification and preserve history/imports.
3. Add comparator/corruption/legacy vectors; update only current-version assertions.
4. Freeze real limit values and consolidate current references, counts, limitations and docs links.
5. Explain/publish only the version-bearing wire delta; close every E family and GH as below.
6. Run/reconcile bounded GD and both quick sets, final CI and source identities; obtain SA1 review.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS17b-B01 | Old cached classification cannot masquerade as v3 exactness |
| MS17b-B02 | Old puzzles/history remain usable and reclassifications are honest |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS17b-T01 | Rating/cache 3, history/wire 1, cache 2 purge and explicit exactness enforced |
| MS17b-T02 | Same-grid different classification/model rejected; timing/display differences ignored |
| MS17b-T03 | Current references, 40/34 catalogue, selected limit record and old imports pass |
| MS17b-T04 | Full source-aware E/GH, both quick sets and CI pass; complete GD inventory/results with any unsafe/unexecuted population or availability/median-time miss explicit under section 7, never labelled passed |

## Test plan and gates

Generator focused set: `cache,history,export,pipeline,worker,replay,technique-weights,difficulty-floor`
plus affected `i18n,help,ui-contract`; project/shard it rather than assuming one command fits.
Player focused: `importer,fixtures,help,i18n,ui-contract`; both complete quick sets and final CI.
Test schema 2 purge, schema 3 missing exact/counts/version, exact/shallow same score/grid, changed cages,
Wordoku display-only change and old positive ratingVersion 2 import. Add current version 3 and
history old/missing/future-marker compatibility without replacing the legacy cases.
Counts key order / explicit zero must compare equally; changed counts or semantic constraints
must exercise rejection through the real cache-controller regeneration path.

### E: both identities change; canonical values do not all change

The version literal in `difficulty.js` belongs to **both** source hashes; cache.js additionally
belongs to replay's whole Generator source list. Thus the retained MS17a replay and MS16 hash
ledgers are comparison history, **not current-source ledgers after the bump**.
Do not alter identity filters or retag old records.

| Family | Actual value contract at this base | Required closure |
|---|---|---|
| Five G09-G13 wires | `pipeline.toWire` / `replay.toPlainWire` preserve the producer rating. Each accepted wire currently has exactly one `rating.ratingVersion:2`; expect that field to become 3. Worker `v:1`, puzzle/model/solution, score/level/counts, exactness, target, warnings and log remain otherwise unchanged | Fresh full family; merge-check, explain the exact per-record path/value diff, then publish the intended wire change from the complete ledgers and check again **before analyses** |
| Fourteen G01-G14 analyses | `replayRecording.goldenOf` projects scores, counts, boards, folds/jumps and historical `today`; it does **not** store ratingVersion. Accepted projections have no such field | Fresh full family/current identity; expected unchanged values and merge-check only. Do not write merely because the source hash changed |
| 520 regression hashes | `perf-helper.serialize` hashes givens, solution, regions, cages, inequalities and symbol labels, **not the rating/version** | Fresh bounded 520-key ledgers/current identity and complete merge-check, expected unchanged values. No `regression.js` rewrite is expected or authorized just for a version bump |

The old "full GG check belongs to final evidence" sentence is superseded for **record
identity closure now**: full fresh hash records/checks belong to MS17b too. MS18d's final
obligation remains. Recording unchanged values is not authority to write a changed hash.

Before E, finish the version/cache implementation, relevant current-producer test/header edits,
format check, and source freeze. Save/verify per-item plans and bounds. Record **5 wires ->
14 analyses -> 520 hashes**, preserving every request/seed and G13's 120000 ms recorder guard.
Declare the expected version-only wire merge-check exit 1 in advance, keep its transcript,
and verify the actual differences before the explicit write; recheck after writing.
No producer/publication step is compounded with its dependent analysis.

List every current-version pin changed with intent and before/after values. Current producer
assertions and the declared wire version fields may become 3; old imports/claims, worker/history
version 1, grouped proofVersion 2, historical v2 certificates/recipes and unrelated numeric 2s
must not. No blanket replacement in fixtures or in-memory comparison erases the evidence.
Any changed puzzle/rating/requiredness/proof/golden/hash beyond the explained metadata is a
QUESTION before publication or consumer-pin repair, not an automatic fixture refresh.

Example individual shards and complete merges (not the whole execution plan):

```powershell
node tests\replay-fixtures.js --ids=G09 --record=..\docs\difficulty-v3\evidence\MS17b\wire\G09.json
node tests\replay-fixtures.js --merge=..\docs\difficulty-v3\evidence\MS17b\wire --check
# Only after the complete version-only difference is explained:
node tests\replay-fixtures.js --merge=..\docs\difficulty-v3\evidence\MS17b\wire --write
node tests\replay-fixtures.js --merge=..\docs\difficulty-v3\evidence\MS17b\wire --check
node tests\replay-goldens.js --ids=G01 --record=..\docs\difficulty-v3\evidence\MS17b\analysis\G01.json
node tests\replay-goldens.js --merge=..\docs\difficulty-v3\evidence\MS17b\analysis --check
node tests\perf.js --hash-key=classic4/veryEasy --hash-from=0 --hash-count=5 --hash-record=..\docs\difficulty-v3\evidence\MS17b\hashes\classic4-veryEasy-00.json
node tests\perf.js --hash-merge=..\docs\difficulty-v3\evidence\MS17b\hashes --check-hashes
```

Final GH is **all-40 check-only**, from Player, with existing sources:

```powershell
node tests\tools\make-technique-examples.js ..\generator --max-puzzles=64 --max-hints=400 --check
```

No example displacement is expected from producer/cache version metadata. A missing/moved
example requires QUESTION; no write, discovery or corpus route is granted here.
Recheck final E identities against the records after all gates/review fixes. Any included-source
byte change requires fresh affected-family records before acceptance.

### GD: complete inventory, bounded execution, honest outcomes

MS17b's GD is the **current manual `difficulty` suite** under checklist section 7 / FS09.
Do not turn this into `--manual`, `--all`, a whole-variant run or a new variant-I5/CV3/deep
campaign. Final variant correctness, live CV3 and the 28-occurrence mega cohort remain
with MS18e; a version bump is not a blanket deep rerun or proof that older deep hashes match.

**Plan before the first GD generation:**

1. Capture the registration-only final-source `--suite=difficulty --list-tests` inventory,
   actual offered classic9 levels and exact top-level group names. Preserve a rename map
   for current-version headings; the historical FS09 group list is a locator, not a
   substitute for the current inventory.
2. Plan one full retained level group per offered level, Nightmare first and Hell 1 early
   when offered. `batch(level)` is per process/level: retain its **100 requests**, or **20
   for Hell 1/Hell 2**, seeds **7000+i**, options, all I1-I7/requiredness/warning assertions
   and existing timing thresholds/factor. Never replace the group with a small pilot.
3. Plan every non-batch top-level group once, with its exact `difficulty > <name>` prefix,
   including fake-worker qualification, reference/scoring and digger correctness/safety
   groups. They are not a new real qualification run. Do not rerun the entire suite afterwards.
4. Every command needs a credible current-source **<=450 s** projection including setup,
   generated requests and its assertions. Identify older-source estimates as such; old
   pre-S3 pilot means, a per-puzzle target or missing data are not current bounds.
   Never start an unknown/unsafe group as an unlocked timing trial.
5. Preflight each exact selector's nonzero selected names/counts; inventory all keys once
   across the planned selections. Use results/transcripts and preserve actual exit codes.
   No bail/skip, reduced request count, changed seed, timeout/factor raise or new request
   splitter/merger. Keep the existing per-level batch reuse within a group.

Examples (each needs its own preflight/plan; repeat for the actual inventory):

```powershell
Invoke-Dv3Node -Task MS17b -AllowExit1 -NodeArgs @('tests\node-runner.js','--suite=difficulty','--filter=time) > nightmare >')
Invoke-Dv3Node -Task MS17b -AllowExit1 -NodeArgs @('tests\node-runner.js','--suite=difficulty','--filter=difficulty > digger.generate: guarantees')
```

Use `-AllowExit1` only for a per-item declared expected failure, not every possible exception.
An aggregate exact-hit/median-time miss stays a failed assertion with counts, timing, source
and S-OD4 item; continue independent bounded work. Invalid/non-unique puzzles, unsound
deductions, wrong exact/warning data or corrupt evidence block and are escalated.
If a group cannot be admitted or completes only partially, keep its precise unexecuted
tests/requests, projection/unknown basis and next owner as a named item. Do not call partial
GD green or transfer an unexecuted group as a pass. MS18c/d/e must reconcile it.
No new slow-cell evidence/tooling class or automatic retry follows.

E is jobs 1/no --jobs. MS17a measured its two replay compounds at the same algorithmic
boundary; use its per-item records as a labelled planning basis. The last fresh 520-key
hash family is MS16's (380.8 s process wall), not a 520-generation run in MS17a.
These are not guaranteed bounds: apply IR12 to every item, release the lock between
compounds, and stop at 540 s. No GS, GQ, generation-GP or fresh pattern-cost selection
campaign is assigned to this version/cache step.

## Definition of done & handoff

Give MS18 the immutable release-candidate identity, actual frozen settings, reference catalogue and
all compatibility results. Include the explained wire metadata publication, fresh three-family E
identities/checks, all-40 GH, bounded GD inventory/results including gaps, actual quick/CI
fingerprints, the complete limit-decision ledger and every inherited/new item.
No support publication or claim of final qualification/performance/deep closure yet.

## Resume rules — S-OD4

Review: analyst cross-review. Correctness/evidence corruption or changing a recorded decision
stops; time/availability is a named numerical MS18c/MS18d item and work continues.
Use `Invoke-Dv3Node` for every possibly >10-second payload, <=540 s, and the current bounded quick
manifest. A cost-bounded unexecuted GD population stays explicit, not a passed gate or owner stop
solely for time. Any added suite owns its r6c CI group; no new slow-cell evidence/tooling class.
Return the inherited/new item list and actual frozen policy/source identities.

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
