# Response to SA1's review: Sudoku rating v3

SA2, gpt-6-astra; 2026-11-12. Response to
`docs/difficulty-v3/claude-opus-5.5/2-review-of-gpt-6-astra.md`, against unchanged HEAD `6abcb9f`.
This records revised positions and the task order I would sign. The plan, clarification file, other
analyst's files and application code are unchanged.

No suite or heavy gate was run. A bounded in-memory probe rechecked the new prefix argument and both
chain splits. Full developer gate permission remains granted; new behavioural choices are not adopted
merely because a gate is permitted.

## 0. Changes in my position

1. **Accept derived requiredness for complete canonical ratings after S2.1.** SA1's prefix proof is
   correct under its stated same-solver-options premise. My separate capped floor solve is unnecessary
   in the generation hot path. Retain the reference solver and explicit failure semantics for tools.
2. **Do not extend that equivalence to the digging oracle.** It uses `assumeUniqueness:false`; canonical
   rating and reference certification use true. Its `tierUsed` remains a steering heuristic.
3. **The chain-count discrepancy is a predicate mismatch, not different puzzles.** Re-measurement gives
   six required lower floors but only two exact in-band Nightmare results for the four-link split.
4. **Accept order correction before acceptance, and first qualification after S2.2.** Final qualification
   remains after all S3. Do not remove levels from an intermediate diagnostic run.
5. **Restore task-scoped regression hash updates.** My phase-two consolidation advice was too broad:
   quick smoke tests pin eleven hash cells. The owner of a changed generated output owns its refresh.
6. **Keep target scope and an extra shallow-search cap as real decisions.** A 0.75-median trigger and a
   128-rating cap are proposals, not already selected constants.

## 1. Derived requiredness: accepted, with the correct boundary

### 1.1 Proof and code evidence

Let T be the actual, variant-filtered, canonical rating ladder and F its floor prefix. For a completed
rating, the restricted solver follows the same states until the first technique outside F is applied:

- The solver starts from identical givens and resets the ladder after every effective finding
  (`core/js/engine/logical-solver.js:238-269`).
- Every technique in F was tried and returned nothing at that first outside-F state. The restricted
  solver therefore stops stuck there.
- If no outside-F technique occurs and the full rating is solved, the restricted solve follows all
  of the same findings and solves too.

S2.1 makes the weight-threshold sets actual prefixes, including filtered variant ladders. Enforce
nondecreasing weights over the registry's **actual sorted sequence**, including order ties. The
secondary sort is baseCost then id (`core/js/engine/techniques.js:130-134`).

`SG.difficulty.rate` passes all techniques, default finder options and `assumeUniqueness:true`
(`generator/js/engine/difficulty.js:442-451`). The reference floor call uses the same uniqueness flag.
At HEAD the finders do not inspect the allowed-technique set; the chain finder reads only its length
and depth options (`core/js/engine/tech-chain.js:115-130`). Preserve that finder contract for S3.

For a complete canonical rating:

```text
vacuous = level index is 0 OR tierTechniques is empty
required = vacuous OR any positively counted technique is outside floorTechniques
exact = solved AND rating.level === requested AND required
```

In-band ratings cannot contain a technique above the allowed threshold: the scoring formula charges
at least 1.25 times its weight, before the nonnegative empty-cell term
(`generator/js/engine/difficulty.js:233-271, 344-348`). The outside-floor test is therefore the tier-use
test for the accepted in-band candidate. VeryEasy is the explicit vacuous base case while its actual
set-difference tier remains the three singles.

### 1.2 What this removes, and what it does not

**Remove from the generation hot path:**

- the second floor solve;
- its new deterministic cap and retry policy;
- delayed mutation by `ensureFloor`;
- a new generation-specific `unverified` state arising solely from that second solve.

The keeper can calculate its final distance immediately from canonical counts. This removes the
proposed pre/post-certification distance mismatch **once `distanceToLevel` uses the derived value**.
It does not remove the keeper's existing uniqueness check
(`generator/js/engine/digger.js:1051-1062`) or make score-only exactness correct by itself.

**Retain these boundaries:**

1. The certificate is conditional on a complete canonical report for the same model/givens, technique
   catalogue and version. `classify` also accepts arbitrary solver reports; it does not prove that the
   report was canonical (`generator/js/engine/difficulty.js:389-420`).
2. Do not certify an imported/stale summary merely because it has `techniqueCounts`. At generation
   call sites, ratings come through `rateCounted` (`generator/js/engine/digger.js:991-996`); keep that
   contract explicit. Recompute or use the reference for a genuinely different report.
3. A null/unrated/unsolved rating is not exact. An API may return no derived certificate/null for it;
   do not turn missing evidence into a positive vacuous result.
4. The puzzle must still have its existing uniqueness guarantee before publication. Deriving a floor
   does not authorize uniqueness-assuming reasoning to prove uniqueness.
5. `certifyFloor` remains a useful reference for tests, measurements and noncanonical inputs. A budget
   exception is not "stuck", and contradiction is not requiredness. It should propagate cancellation
   and preserve a distinct failure outcome in tools rather than returning `required:true`.
6. Collecting steps does not change semantics. A completed default-options bounded solve can still
   satisfy the proof; a timeout, altered depth/length option or non-prefix ladder cannot be silently
   treated as the same certificate.

A practical internal helper is `requiredOf(rating, spec)`, using the new floor/tier arrays already
available to keeper/local/refinement callers. It returns a boolean only for a valid current complete
canonical rating, otherwise null/error under its documented contract. Its result need not be persisted
inside every rating. If a certificate is attached for UI/tools, include its requested level; do not
reuse it for another level accidentally.
Canonical origin is a caller/entry-point precondition, not something inferable from counts or a
`ratingVersion` field alone; unrestricted `classify` outputs must not enter this path without that proof.

### 1.3 Why my oracle qualification still stands

`boundedObjective` solves with `assumeUniqueness:false`
(`generator/js/engine/digger.js:674-678`). The canonical `rate()` and floor reference permit uniqueness
techniques after the existing uniqueness proof. Their ladders differ once UR/BUG may apply. Thus:

- canonical rating counts can give exact operational requiredness under the prefix proof;
- oracle counts remain a cheap guidance signal, not the final certificate.

These are different claims. SA1's new rating argument is valid; its broader earlier statement that
S2.1 alone makes the oracle's `tierUsed` exact is not. Acceptance must use the former.

### 1.4 Independent equivalence check

The successful read-only probe:

- loaded engine sources in the node runner's declared order;
- saved the twelve old classic9 Nightmare puzzles before any changes;
- changed only the three S2.1 registration orders **in memory**;
- checked the monotone sorted-weight invariant;
- compared derived requiredness with an independent restricted solve on 18 constructed fixtures,
  the twelve old Nightmare puzzles and nine new samples: Killer/Jigsaw/Greater-Than at Normal,
  Hard and Expert, seed 1.

Result: **39/39 agree**, including three vacuous VeryEasy cases; no mismatch. This supports SA1's
96/96 HEAD sample, but the proof and invariant, not either sample size, justify the optimization.
An initial probe attempt used the obsolete classic-fixture path and stopped before the comparison;
the corrected load is `core/tests/fixtures/classic.js`.

All generation/rating/floor calls had 20-second budgets. The combined successful equivalence and
chain re-measurement took **13.480 seconds**. No fixture or engine source was written.

## 2. Chain windows: reconciliation of six and two

Re-measured classic9 Nightmare seeds 1..12 at HEAD, then re-rated those exact boards with in-memory
short/long and shallow/deep registrations. Long-chain weight was 1400, deep-Nishio weight 2600; all
other weights were unchanged. Both windows enforced their inclusive minimum as well as maximum.
Repeated the comparison both with HEAD orders and with all three S2.1 moves: the table was identical.

| Seed | Original score | Old maximum chain links | Four-link split score / level | Master floor stuck? | Exact Nightmare? |
|---|---:|---:|---|---|---|
| 1 | 1840 | 5 | 2253 / Nightmare | yes | yes |
| 2 | 1968 | 5 | 2420 / Hell 1 | yes | no |
| 3 | 2288 | 5 | 2850 / Hell 1 | yes | no |
| 4 | 1931 | 4 | 1931 / Nightmare | no | no |
| 5 | 1572 | 3 | 1572 / Nightmare | no | no |
| 6 | 2364 | 6 | 2940 / Hell 1 | yes | no |
| 7 | 1589 | 4 | 1589 / Nightmare | no | no |
| 8 | 1695 | 4 | 1695 / Nightmare | no | no |
| 9 | 1799 | 4 | 1799 / Nightmare | no | no |
| 10 | 2215 | 5 | 2721 / Hell 1 | yes | no |
| 11 | 1600 | 3 | 1600 / Nightmare | no | no |
| 12 | 1746 | 5 | 2172 / Nightmare | yes | yes |

The agreed distinction to put in the joint report is:

- **6/12 need the long ID / have a stuck Master floor.**
- **2/12 satisfy that condition and remain in the Nightmare band.**
- Four move above 2400 and are **shallow Hell 1**, because Nightmare's technique set still solves them.
- Under the six-link split: **0/12 required and 0/12 exact Nightmare**.

SA1's phase-two table actually labels its six as "need the long id"; that count agrees with mine. Calling
all six "qualifying Nightmare" conflates two predicates. There is no seed, S2.1-order or chain-length
disagreement in these measurements. I sent SA1 these results for its parallel response.

This is not new-generation qualification and includes none of the future S3 additions. It favours
testing the four-link alternative, but cannot prove either window's final availability or justify a
promise of six exact hits. My position remains: compare fixed-puzzle results and new-generation
required/exact rates before selecting the cutoff. The owner can select four now with that caveat.

Independently enforce long/deep minimums inside each finder wrapper. A caller can use only the long ID;
the public solver's `allowedTechniques` permits that (`core/js/engine/logical-solver.js:100-114`).
Running a twelve-link maximum alone can return a three-link proof. Earlier short-ID precedence is not
an API guard.

## 3. Point-by-point response to the remaining review

### 3.1 Main positions D1-D10

| SA1 item | Response | Resulting change |
|---|---|---|
| D1: derive required from canonical counts | **Accept with section 1's contract.** | Remove the extra generation solve/cap and delayed keeper certification. Keep a reference helper, noncanonical/failed-input boundaries and uniqueness checks. Plan author should confirm this equivalent mechanism. |
| D2: S2.1 before S1 | **Accept; already adopted in my phase-two schedule.** | Baseline first, then tooling and orders, then acceptance/target integration. Do not activate derived requiredness before the prefix invariant holds. |
| D3: select <=4 / 5-12 | **Partly.** | Six floor-required cases are correct; exact Nightmare count is two. Prefer measured selection over declaring a cutoff qualified. Default deep depth 2, explicit maximum 3 remains agreed. |
| D4: guided target first; extend only if Expert median >0.75 | **Partly; retain as an owner alternative.** | Staged measurement is useful, but a coherent target through refinement/local search is still my preferred final behaviour. The threshold is new, its sample must be specified, and the final S3 catalogue can change its outcome. |
| D5: regression hashes belong to output-changing tasks | **Accept; correct my phase-two consolidation.** | `generator/tests/suites/smoke.test.js:17-19, 60-64` pins eleven cells. Update justified hashes in the owning task; qualification can still be consolidated. |
| D6: first qualification after S2.2 | **Accept.** | Earlier samples are diagnostics, not support-list updates. Qualify after a coherent S1/S2.2 checkpoint, then finally after S3/version integration. |
| D7: history needs stored version and honest wording | **Accept; agreement now.** | Unknown old entries are "earlier version", not provably v2; selecting them regenerates with current code. Cache/wire acceptance metadata and exported claims remain separate decisions. |
| D8: VeryEasy actual tier plus vacuous base certificate | **Accept; agreement now.** | Keep the three-single tier, `floorLevel:null`, and explicit level-index-zero exemption. |
| D9: question triage | **Mostly accept.** | VeryEasy, internal raw costs, existing Killer behaviour and real-example tooling are author/implementation contracts. An optional synthetic help format or a new numerical search cap remains a behavioural decision. |
| D10: effort units differ | **Accept.** | Use sized packs and actual gate durations, not an average of engineering hours and agent hours. |

### 3.2 Other review claims and corrections

| Claim or proposed resolution | Response and evidence |
|---|---|
| Existing probes, shallow samples, five false constructed-fixture assertions and `label` field | **Accept.** Keep historical certificates and add current floor expectations. Our 39-case probe independently includes all 18 constructed fixtures. |
| Every planned acceptance site has uniqueness evidence | **Accept with ordering preserved.** The keeper still counts before retaining; a derived certificate does not replace that check. |
| Missing certificate may mean exact | **Reject.** The original plan fallback remains unsafe. Derived classification avoids absent certificates for its valid canonical domain, not for null, failed, imported or differently computed ratings. |
| The keeper bug disappears by construction | **Accept conditionally.** Update distance and exactness to use the pure derived value everywhere; just adding a helper export does not alter the current score-only `distanceToLevel`/`keptPuzzle` behaviour (`generator/js/engine/digger.js:1047-1091`). |
| `required` is never null in events | **Partly.** Valid completed canonical ratings have a boolean. Unrated/capped results still exist (`generator/js/engine/digger.js:1001-1008`); do not label them required merely because the level is vacuous. Preserve a clear unavailable value or omit the certificate. |
| `localSearchSteps` uses `spec.level`; comparator is discriminated and strictly improving | **Accept.** Keep tier retention, finite rejected pools, deterministic ties and proposal priority separate from real score targeting. |
| Fixed-weight bands have unreachable lower portions | **Accept.** Report that fact; do not change existing weights/bands to satisfy a uniform-score histogram. |
| Exactness must reach pipeline/soak/qualification consumers | **Accept.** Add/derive `exact` consistently across `run`, `toWire` and `fromWire`, not only the direct return. Today all three omit it (`generator/js/engine/pipeline.js:234-245, 291-307, 313-333`). |
| Cache equality was not rechecked by SA1 | **Verified again.** `generator/js/ui/cache.js:277-284` compares grids plus rating score/level only. v3 must also compare the acceptance-relevant current classification/metadata. |
| Help generator has no Jigsaw support | **Accept the narrower correction.** It already generates Jigsaw inputs; snapshot `cellRegion` and rebuild in help with `SG.textBoards.jigsawSpec` (`player/tests/tools/make-technique-examples.js:33, 134-147`; `player/js/ui/help.js:70-79`; `player/js/engine/text-boards.js:141-160`). |
| Tools must be bounded and preserve line endings before GH/GR | **Accept.** Keep stage files project-relative, deterministic and CRLF where required. `--puzzles` alone currently does not bound stage-1 generation. Do not weaken fixture/help assertions. |
| The 14 analysis goldens need a separate recorder | **Accept.** The existing replay tool records wire snapshots, not their analysis expectations. The output-changing task owns both where affected. |
| Steps assertions change with every output change | **Partly.** They can change and must be checked, but do not rewrite unaffected goldens automatically. `generator/tests/suites/steps.test.js:879-889` is an explicit pin. |
| Global subset counter only matters with the proposed floor cap | **Reject that exclusivity.** `generator/js/engine/digger.js:641, 683-687` already imposes a 100,000-check objective guard. `core/js/engine/tech-subset.js:136` spaces checks using a persistent counter. The derived certificate removes one new exposure, not this existing deterministic-boundary risk. Localize the counter when implementing bounded catalogue work and test interleaving. |
| `cageLocked` unnecessary; use ordinary Killer regression | **Accept.** Existing cageCombo covers the demonstrated behaviours. Stronger assignment-derived patterns would be a different scope. |
| S3 soundness contracts, grouped-node representation, fixture/help inventory and source lists | **Accept.** Keep the detailed first-report contracts. Final catalogue is 40 registered IDs, 34 unscoped, if no extra optional ID is added. Every new ID needs its real help example and applicable positive/negative fixtures. |
| Positive baseCosts increasing with weight, ALS in `chain` | **Accept as an author contract, not an additional user-facing group.** Preserve existing costs; publish the exact new cost table. Raw baseCost affects solver reporting, although calibrated rating removes its contribution when recovering E (`generator/js/engine/difficulty.js:373-381`). |
| Earlier-window scarcity proves final levels unreachable | **Reject as a conclusion.** It is a risk requiring fresh generation and the final S3 catalogue. First/final qualification timing is agreed; intermediate measurements must not delete supported levels. |
| Easy and final qualification outcomes need new owner confirmation | **Reject reopening the fixed decisions.** Easy needing its nonvacuous tier follows the chosen all-level rule. Accepting final qualification outcomes is already the plan's policy. Document both consequences. |
| Target test using six Hard seeds protects the change | **Reject; SA1 now agrees.** It passes at HEAD. Use a comparator seam with scripted objectives and real exactness/determinism integration cases. |
| Every output-changing task can shard hash recording with current variant/level flags | **New correction.** `generator/tests/perf.js:122-126, 195-218, 246-247` updates/checks the full corpus before applying measurement filters. `--variant`/`--level` do not currently shard hashes. Add bounded recording support if needed, preserving all 26 cells x 20 seeds, not a silently reduced corpus. |

### 3.3 Target and shallow-budget decisions

For the owner's optional refinement decision, my preference remains one target per sample, preserved
through guided digging, downward refinement and local search where these stages apply. Requiredness
takes priority, proposal-state scores remain distinct, and the existing per-attempt caps remain binding.

SA1's conditional alternative is implementable if the decision specifies:

- the fixed seed/configuration sample, at least the existing classic9 Expert seeds 1..12;
- median of normalized band positions of certified exact hits, with misses/shallow results separately
  reported and no inference when too few exact hits remain;
- the strict `>0.75` trigger and whether it is repeated after S3;
- what refinement/local objective changes are activated by that trigger;
- an attached timing and exact-hit comparison, not only a score median.

I would not treat a one-time <=0.75 median as proof the final pipeline has no top-edge fallback bias.
Likewise the existing finite 1,024-rating/32,768-proposal caps already terminate local searching.
An additional 128-full-rating limit after first reaching a shallow in-band state is a new hit-rate/cost
policy. Recommend measuring a common cap, not adopting 128 without its answer (SA2-Q-S12).

## 4. Final position table

Every original ID and the new process issues are included below. Analyst agreement is not a substitute
for an answer to a genuinely new behavioural choice.

| Item | My final position | SA1's position as understood from its review | Status |
|---|---|---|---|
| SA2-Q-S01: VeryEasy | Actual singles tier; vacuous base certificate; null floor level. | Now agrees. | for plan author |
| SA2-Q-S02: second floor solve/cap | Withdraw from generation if the canonical prefix mechanism is adopted. Reference/tool failures must still be explicit. | Remove second solve/cap, keep reference helper. | agreed |
| Derived `required` mechanism | Accept for complete current canonical ratings after S2.1, with identical finder options and retained uniqueness proof. Noncanonical/failed inputs do not inherit it. | Derived from complete canonical `rate()` counts; reference for other cases. | for plan author |
| Oracle `tierUsed` | Remains heuristic because uniqueness flags differ. | Earlier review says S2.1 makes the steering signal exact; new proof specifically addresses canonical ratings. | disputed |
| SA1-Q-S1 + SA2-Q-S04: chain/depth windows | Measure <=4 and <=6 on fixed and fresh puzzles; enforce both window bounds; deep defaults to 2, maximum 3 explicit. | Prefer <=4 / 5-12; same depth default. | for owner |
| Six versus two Nightmare cases | Six required floors, two exact Nightmare, four shallow Hell 1; identical with/without S2.1. | Its table counts six needing the long ID, not reweighted in-band exactness. | agreed |
| SA1-Q-S2: Easy needs a tier | Fixed all-level decision; document, do not reopen. | Yes, asks owner confirmation. | agreed |
| SA1-Q-S3 + SA2-Q-S06: warnings/events | Approximate plus shallow warning; explicit shallow event/status text; no misleading "wanted X, got X". | Same. | for owner |
| SA1-Q-S4 + SA2-Q-S03: target scope | Prefer a coherent target through refine/local; a conditional approach needs a fixed sample and final-catalogue recheck. | Guided first; extend only if Expert median exceeds 0.75. | disputed |
| SA2-Q-S05: pattern/search bounds | Document common deterministic limits selected with evidence; full named scope is not exhaustive unbounded enumeration. | Same. | for owner |
| SA1-Q-S5: lost offered levels | Accept final qualification as already decided; no intermediate support-list pruning or silent weight changes. | Accept results; asks confirmation. | agreed |
| SA1-Q-S6 + SA2-Q-S07: history/persistence | New history version, honest unknown legacy wording; no external floor export by default. Current wire/cache must preserve or derive exactness from current valid evidence. | New version field, earlier-version note, no floor export. | for owner |
| SA2-Q-S08: raw costs/ALS group | Exact positive cost table from author; existing costs unchanged; ALS uses `chain`. | Same grouping and positive increasing-cost convention. | for plan author |
| SA2-Q-S09: ordinary Killer behaviour | Existing cageCombo plus focused quick regression, no duplicate ID. | Same. | agreed |
| SA2-Q-S10: reference labels | Preserve v2 history and add v3 expectations; reconcile contrary plan assertions without changing existing weights. | Same; implementer resolution. | for plan author |
| SA2-Q-S11: help examples | Curated real puzzles and bounded deterministic tooling. Synthetic candidate-state format only if separately approved. | Same; escalate only if an ID cannot get a real example. | agreed |
| SA2-Q-S12: shallow-search limit | Measure cap versus exact-hit/cost effect; existing caps until a new number is selected. | Additional 128-rating shallow-search cap. | for owner |
| Task order | Baseline/tooling, then S2.1, S1, S2.2, all S3, version/final evidence. | Same. | agreed |
| Qualification timing | First coherent checkpoint after S2.2; final after S3; diagnostics earlier do not alter support. | Same. | agreed |
| GG/GR/GH timing | Necessary regeneration in the output-changing task; no blind rewriting. Heavy qualification remains consolidated. | Now agrees. | agreed |
| Persistent check-spacing counter | Existing objective guard already makes history-sensitive checks relevant; localize when bounded catalogue work lands. | Says exposure disappears with the new floor cap removed. | disputed |

## 5. Merged task breakdown I would sign

Adopt SA1's S-01..S-19 numbering, with two important corrections: implement the reference/set API in
S-01 but enable the derived helper with S2.1 in S-04; put bounded hash recording and Jigsaw help
reconstruction into the tooling task. All behaviour-changing rows own their required GG/GR/GH updates.

One developer holds the repository write/validation lease. Every task updates directly affected living
docs and paired guides. S/M/L mean approximately 100-300 / 300-800 / 800-1,600 changed lines including
tests; split a selected task before dispatch if its contract exceeds L.

### 5.1 Shared integration ownership

The introducing/output-changing task exclusively owns the affected members of this bundle:

```text
generator/js/engine/difficulty.js
core/tests/fixtures/techniques.js
core/tests/suites/techniques.test.js
generator/tests/suites/technique-weights.test.js
generator/tests/fixtures/rated.js
generator/tests/fixtures/regression.js
generator/tests/fixtures/replay-goldens.js
generator/tests/fixtures/replay-wire.js
generator/tests/suites/steps.test.js
generator/tests/suites/replay.test.js
generator/js/ui/locale.en.js
generator/js/ui/locale.vi.js
player/js/ui/locale.en.js
player/js/ui/locale.vi.js
generator/js/ui/help.js
player/js/ui/help.js
generator/tests/suites/help.test.js
player/tests/suites/help.test.js
player/js/ui/help-examples.js
generator/design.md
player/design.md
USERGUIDE.md
USERGUIDE.vn.md
DEVELOPERGUIDE.md
DEVELOPERGUIDE.vn.md
```

For a new core module, the source-list owner also has:

```text
generator/index.html
generator/tests.html
generator/tests/node-runner.js
generator/js/worker/gen.worker.js
player/index.html
player/help.html
player/tests.html
player/tests/node-runner.js
```

The two HTML test pages additionally need their core-suite lists updated for a new core suite.
Do not delegate a parallel locale/fixture edit to these same files.

### 5.2 Tasks

In prerequisites, "S06 answer", for example, means SA2-Q-S06, not task S-06.

| ID | Title / scope | Depends on | Principal files owned in addition to the bundle where needed | Gates / size |
|---|---|---|---|---|
| S-01 | Tier algebra and reference floor API; no output change | Author base-case/uniqueness contracts | `generator/js/engine/difficulty.js`, new `generator/tests/suites/difficulty-floor.test.js`, `generator/tests.html` | Generator quick; M |
| S-02 | Soak floor/peak/position/chain-depth columns and v2 baseline | S-01 | `generator/tests/soak.js`, new baseline evidence | GS-before in bounded shards; M |
| S-03 | Bounded golden/example/hash tooling; Jigsaw snapshots and help reconstruction | S-02 | `generator/tests/replay-fixtures.js` or new analysis recorder, `generator/tests/perf.js`, `generator/tests/fixtures/perf-helper.js` if sharding needed, `player/tests/tools/make-technique-examples.js`, `player/js/ui/help.js`, `player/tests/suites/help.test.js`, `player/tests/suites/text-boards.test.js` | Recorder/checker parity at HEAD, targeted help/quick tests; L |
| S-04 | S2.1 monotone orders, frozen/current ladder split, canonical derived helper and equivalence tests | S-03; author accepts mechanism | `core/js/engine/tech-cage.js`, `core/js/engine/tech-ineq.js`, `core/js/engine/tech-fish.js`, `core/tests/suites/tech-fish.test.js`, `generator/tests/manual/killer.test.js`, `generator/tests/manual/greater-than.test.js`, difficulty-floor and weight suites | Both quick; affected GG/GR/GH/GD; M-L |
| S-05 | Strict exactness and pure keeper distance; all consumers and shallow outcomes | S-04; S06/S12 answers | `generator/js/engine/digger.js`, `generator/js/variants/killer.js`, `generator/js/engine/pipeline.js`, `generator/js/engine/events.js`, `generator/js/ui/result-view.js`, `generator/js/ui/app.js`, `generator/tests/soak.js`, `generator/tests/qualify.js`, digger/pipeline/events/result-view suites | Both quick; GG/GR; L |
| S-06 | Target draw, discriminated objective/comparator, tier-preserving stop; agreed refine/local policy | S-05; S03 answer | `generator/js/engine/digger.js`, `generator/tests/suites/digger.test.js`, difficulty-floor suite, affected help/locales/docs | Both quick; GG/GR; bounded target-distribution comparison; L |
| S-07 | Short/long and shallow/deep IDs with enforced windows and internal general finder seam | S-06; S04 answer | `core/js/engine/tech-chain.js`, `core/tests/suites/tech-chain.test.js`, integration bundle | Both quick; GG/GR/GH/GD; first GQ checkpoint; L |
| S-08 | Skyscraper and two-string kite | S-07 | `core/js/engine/tech-fish.js`, `core/tests/suites/tech-fish.test.js`, bundle | Both quick; affected GG/GR/GH; M-L |
| S-09 | Empty rectangle, grouped implication and transpose/visibility cases | S-08 | Same fish module/suite and bundle | Both quick; affected GG/GR/GH; M |
| S-10 | Finned X-Wing/Swordfish, including sashimi | S-09 | Same fish module/suite and bundle | Both quick; affected GG/GR/GH; L |
| S-11 | Remote pairs and WXYZ-Wing | S-10; S05 pattern limits | `core/js/engine/tech-wing.js`, `core/tests/suites/tech-wing.test.js`, bundle | Both quick; affected GG/GR/GH; L |
| S-12 | UR types 3/4/hidden and guarded BUG+1 | S-11 | Same wing module/suite, uniqueness registry tests, bundle | Both quick; affected GG/GR/GH; L |
| S-13 | Restricted XY-chain | S-12 | `core/js/engine/tech-chain.js`, `core/tests/suites/tech-chain.test.js`, bundle | Both quick; affected GG/GR/GH; M-L |
| S-14 | Group-node graph, bounded search, proof encoding/checker and UI consumers | S-13; S05 limits | `core/js/engine/tech-chain.js`, chain suite/proof checker, `generator/js/ui/i18n.js`, `player/js/ui/i18n.js`, `player/js/ui/play.js`, both format/i18n/play test coverage | Both quick; affected GG/GR/GH; GP chain shard; L, split graph/UI if needed |
| S-15 | Law of leftovers and ordinary Killer quick coverage; local check-spacing state | S-14; S05 limits | `core/js/engine/tech-subset.js`, `core/tests/suites/tech-subset.test.js`, `core/tests/suites/tech-cage.test.js`, bundle | Both quick; affected GG/GR/GH; GD variant selector; L |
| S-16 | Bounded ALS enumerator and ALS-XZ | S-15; S05/S08 contracts | New `core/js/engine/tech-als.js`, new `core/tests/suites/tech-als.test.js`, all eight source lists/two suite lists, bundle | Both quick; affected GG/GR/GH; GP shard; L |
| S-17 | Sue de Coq and final long-chain order 198 | S-16 | `core/js/engine/tech-als.js`, `core/js/engine/tech-chain.js`, ALS/chain suites, bundle | Both quick; affected GG/GR/GH; L |
| S-18 | Rating/cache version 3, history/wire/export compatibility and release notes | S-17; S07/S10 answers | `generator/js/engine/difficulty.js`, `generator/js/engine/pipeline.js` if final wire contract needs it, `generator/js/ui/cache.js`, `generator/js/ui/history.js`, `generator/js/ui/export.js` only if selected, cache/history/export/manual-difficulty suites, new notes and `docs/README.md` | Both quick; justified final GG/GR/GH/GD; M-L |
| S-19 | Final full-catalogue qualification, matched soak and p95 evidence | S-18 | New `docs/difficulty-v3/qualification.md`, affected support lists in `generator/js/variants/*.js`, report/target metadata only where justified, living docs links | GS-after, GQ-final, GP, GD, final both quick; M plus runs |

The main chain is S-01 -> S-02 -> S-03 -> S-04 -> S-05 -> S-06 -> S-07 -> S-08 -> ... -> S-19.
The source-list, weight, locale and generated-data overlap is deliberate serial ownership. Conceptual
independence of fish, wings and ALS does not make their integration edits parallel-safe. Pentomino can
be implemented concurrently; performance/qualification measurements should reserve a quiet-machine slot.

### 5.3 Gate ledger

| Gate | Owner | Required command/evidence |
|---|---|---|
| Routine | Each relevant task | From the app directory, `node tests\node-runner.js`; both apps after core changes. Record counts, failures and time; Node 24 remains the CI baseline. |
| GS-before | S-02 | Bounded explicit variant/level/count selections through `generator/tests/soak.js`, including classic9 Normal/Hard/Expert and top-level/variant floor samples; shallow share over in-band, not exact-only. |
| GG | Each task whose generated puzzle output changes | From Generator, `node tests\perf.js --update-hashes` then `--check-hashes`; preserve/review intended changes. Current selectors do not shard this mode. If over budget, S-03 supplies bounded full-corpus recording/checking, not omitted cells or seeds. |
| GR | Each affected output/solver task | From Generator, `node tests\replay-fixtures.js` then `--check`, plus S-03's separate analysis recorder/checker for all 14 goldens. Keep only justified expectation changes. |
| GH | S-04 when order invalidates examples; every new-ID S-07..S-17 task | Bounded adapted example recorder from Player; real example per ID, current hint replay, two positive/one negative unscoped fixtures and explicit scoped Jigsaw positives. |
| GQ-first | S-07 | Full 40/100-seed protocol in complete bounded variant/level shards via `generator/tests/qualify.js`; new v3 output paths. Diagnostic checkpoint only: no premature permanent support pruning before S3. |
| GD | S-04 affected order pins, S-07 checkpoint, S-15 variant work, S-18/S-19 final | From Generator, `node tests\node-runner.js --suite=difficulty`; affected `--suite=killer,greater-than` selectors are manual suites, despite their syntax. No blanket unrelated heavy suite is inferred. |
| GP | S-14/S-16 cost shards, S-19 final | From Generator, `node tests\perf.js --variant=<id> --level=<ids> --runs=50 --gate`; hash mode is not a timing gate. Aggregate the complete requested matrix and record misses. |
| GS-after / GQ-final | S-19 | Matched before/after distributions, final offered-level qualification, recorded complete outcomes including timeouts/misses, support lists and living links from final evidence only. |

Do not run an unbounded qualification command and then discard slow seeds. A shard may need bounded
tooling support when even one full cell exceeds the allowed run length; retain the fixed seeds,
completeness checks and original qualification thresholds. Keep bounded work attached and monitored.
All generated working-tree files follow the repository's CRLF rules and explicit LF exceptions.

## 6. Remaining disputes and sign-off

The derived canonical certificate is now an agreement, pending the plan author's contract confirmation.
It removes the major generation floor-budget disagreement without weakening the fixed required-tier rule.
Six-versus-two is resolved by naming the predicates; it is not evidence that the final four-link generator
has been qualified.

Remaining behavioural choices are the chain cutoff, target scope/conditional trigger, shallow-search
cap, documented pattern limits and optional history/help presentation. The oracle-equivalence and
counter-exposure statements need technical correction, not an owner preference vote. Other question
dispositions are recorded in the complete table above.
