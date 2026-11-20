# MS11c — Guarded BUG+1

| Header | Value |
|---|---|
| Depends on | MS11b accepted |
| Size / active time | Medium; 45-60 minutes plus gates |
| Owner / milestone | Shared wings / both apps; M11 complete |
| Authority | R10/R14/R20/R21 |
| Status | Not started |

## Goal & business context

Add the globally justified uniqueness deduction, not the unsafe shortcut of counting three local
occurrences near one cell.

## Scope

In: BUG+1 and full B, including the expanded uniqueness list. Out: general guessing or other BUG forms.

## Repository rules

AGENTS/checklist; no Git/pack/log writes. Unique real puzzles required; known solution alone is
insufficient. Both apps/languages and real help land with registration.

## Inputs & context

R14, verbatim:

> Require one trivalue open cell and every other open cell bivalue. After removing the proposed extra
> digit, every unplaced digit in every relevant complete unit has exactly two occurrences; fixed
> values are accounted for. The global Boolean structure then admits a solution flip without that
> extra digit, contradicting uniqueness. Place the extra digit. Reject cages, inequalities,
> unsupported partial constraints, a second trivalue cell, and a merely local "three occurrences" test.

Register bugPlusOne: wing/order 182/weight 920/baseCost 72, unscoped, assumesUniqueness=true.
Direct find also honors ctx.assumeUniqueness=false.
R10 Finding; key `technique.bugPlusOne.step`, args `{cell,label,digit}`; one placement at the
trivalue cell, no eliminations. cells contains the proving/placed cell(s), sorted owned data.

For each candidate extra digit, virtually remove it without modifying state. Count every digit in
every complete constraint unit, with placed digits excluded correctly; do not inspect only the
three units touching the trivalue cell. A unit where an unplaced digit has one/three/zero occurrences
breaks the proposed Boolean remainder. Extra complete units participate; unsupported partial
constraints/cages/signs reject the form. Limit 50000 tested occurrence/extensions, standard checks.
Do not treat a contradictory artificial remainder as a fabricated uniqueness fixture.

Baseline `core/js/engine/tech-wing.js:477-528` (`function findUniqueRectangle`);
`core/tests/suites/techniques.test.js:75-79` at `c9935cd` (`expect(assuming)`).

### Pre-E rulings — SA2, 2026-11-16

These implement the existing R10/R14/B contracts; no owner or Fable decision is needed. Keep
182/920/72, wing, unscoped, Master and `assumesUniqueness:true`; no other finder limit changes.

1. **Stuck-proposal population: accept (a), not (b).** This specifically authorizes replacing
   the seed in `['classic9', 'master', 16, true, null]` in `digger-target.test.js`, in place.
   Search seeds **1..30 ascending**, excluding retained Master proposal seed 7 and the already
   failing seed 16. Choose the first whose unchanged real pass has **at least nine genuine
   stuck kept proposals**, restoring that case's former contribution, not merely clearing
   `stuck > 30` with six. If none qualifies, send `QUESTION:` with the attempted seeds; no
   larger scan, lower threshold or six-stuck fallback is authorized.
   Preserve the exact model/level/proposal/null-target settings, `grid`/`dig` RNG forks,
   registered techniques and limits. Retain the script, source identity and per-seed trace;
   verify actual `STUCK_SCORE + unsolvedCount` priorities and null-scored keeps through the
   existing candidate/winner/end replay. Do not manufacture them by disabling techniques,
   reducing budgets, fabricating logs, substituting failures, or duplicating a retained case.
   Keep the other 28 tuples (including MS11b's Hell 1 seed 14), titles, 29-pass count and every
   assertion: `stuck > 30`, `scores > 300`, all refusal reasons, `applied > 100`, full replay.
   Run the actual updated matrix and record its counts; an additional contract failure is
   investigated, not avoided by searching past the first qualifier. Preserve the baseline
   comparison (`stuck-count.txt` and `stuck-count-base.txt`); do not claim new aggregates from
   a scratch script still using the old case list. The changed pass has **31 -> 32 keeps**
   (22+9 -> 30+2), not only a one-for-one
   conversion of seven stuck events into scored events. Use the existing locked bounded route.
2. **Work unit/limit: accept.** One unit is one cell of one constraint unit tallied under one
   proposed digit; fixed and open cells both count, and a repeated cell in another unit is
   another tally operation. Keep 50,000, the local counter and entry/at-most-256 cadence.
   Three proposals give the bound `3 * sum(unit.length)` on these complete-unit models:
   729 classic9, 2,304 on 16 digits, 3,645 Samurai/Flower. This bounds tally work, not guard/
   initialization cost, latency or the parent budget. No adjustment or new item is required
   solely for this non-binding limit; keep final census, pattern cost and reduced-limit tests.
   Label uncaged/unconstrained test-helper models honestly; do not imply BUG+1 supports cages.
3. **Finding: accept.** `cells:[T]`, `placements:[[T,X]]`, `eliminations:[]`; arguments
   `{cell:T,label:cellLabel(T),digit:X}` with numeric cell index and string label, under
   `technique.bugPlusOne.step`. The global proof need not list the whole board as Finding cells.
   Keep the owned arrays, purity, deterministic ascending candidate order and localized rendering.
4. **Guards: accept, including the stale-candidate guard.** Require exactly one open trivalue
   cell and every other open cell bivalue; reject empty/single/four-candidate cells and a second
   trivalue cell. Keep the whole-model cage/inequality/partial-unit rejection and inspect every
   complete unit, including distant units and additional complete constraints.
   A proposed X already fixed in a unit containing T cannot be placed at T. Rejecting that
   stale candidate is a placement-feasibility/soundness guard, not an arbitrary extra restriction.
   The test after virtually removing X could otherwise hide that conflict. Retain the stale
   candidate, duplicate-fixed-value and missing-holder negatives; never mutate state while
   testing the remainder. Do not reject X just because it is fixed somewhere outside T's units.
5. **Observer/helper: accept.** One `bugPlusOne` record on each normal return whose uniqueness
   context did not reject the call, including work 0 for an ordinary guard refusal. Keep
   `retained:null`, local-cap `capHit:'work'`, parent-budget `capHit:null` with the budget still
   spent, and no records on search cancellation/unexpected error or `assumeUniqueness:false`.
   The shared helper's ID parameter must leave UR's per-pass IDs, ordering, limits, deferred
   publication and error behavior unchanged; keep those regressions green on final source.

   **Mutants 16-20: accept as equivalent, with this non-circular argument.** Do not assume
   "each placed digit occurs once with no open holder" before the check has established it.
   In a complete N-cell unit with valid digit masks, let S be the number of fixed cells and P
   the number of distinct fixed digits (P<=S). After virtually removing X, each open cell has
   two candidates. The actual tally sum is **A = 2N-S**; the required-count sum is
   **E = 2N-P >= A**.
   - #16 (`<` rejects) and #18 (also allow 3) can accept only counts at least their required
     values. E>=A then forces E=A and equality for every digit.
   - #17 (`>` rejects) requires every count to be at most its required value. Each placed
     digit must therefore have exactly one fixed occurrence and no open holder: S=P. Equal
     sums then force all unplaced counts to be two.
   - #19/#20 omit one digit q. If q is unplaced, the checked placed counts give S=P, and the
     sum forces q's count to two. If q has m fixed occurrences, checked placed digits cannot
     be duplicated, so S-P=m-1; the sum would require q's tally to be 2-m, while it is at
     least m. Hence m=1 and q's tally is one. The omitted equality is implied in either case.
   Every version therefore accepts/rejects the same unit before moving to the next; tallying
   cells, not the digit comparisons, spends work, so work/check positions are unchanged too.
   Keep the explicit equality/all-digit code for clarity. Report **62 detected + 5 equivalent**,
   not 67 detected. The 850,557-state search is corroboration, not an exhaustive proof.
   SA2 also checked all 10,000 single-unit four-cell fixed/bivalue configurations, including
   duplicate fixed values and stale open holders, with zero disagreements; that is a bounded
   unit check, not an exhaustive whole-engine test. Re-run mutations on final source.
6. **Names: accept. Text: change the solution-count clause.** Flipping gives a distinct second
   solution whenever one exists; independent components may give more than two. In both apps'
   `.desc` and `.step`, use:
   - EN: `Such a position has no solution or at least two solutions`
   - VI: `Một vị trí như vậy không có lời giải hoặc có ít nhất hai lời giải`
   Keep the following uniqueness assumption and forced-placement conclusion, with normal sentence
   punctuation. Do not state exactly two solutions. The rest of the global-count explanation
   and the EN/VI names stand; use the same precise statement in designs/guides.
7. **GH: change the header and metadata; retain the real puzzle.** A computed Master rating is
   not a Generator-request provenance, and corpus seed 4242 is not a Generator pipeline seed.
   Follow the established test-kit format. In
   `player/tests/artifacts/difficulty-v3/MS11c/sources.json`, retain the schema-1 source map and
   use this entry for corpus index 14, with the original nine rows:

   ```json
   {"variantId":"classic9","level":null,"seed":"testkit-4242-14","text":"#1,Classic Sudoku 9x9,,testkit-4242-14\n<9 unchanged rows>"}
   ```

   Use the actual index for every other source. Keep the level null, the header level empty
   and the seed non-numeric; put corpus/index and diagnostic ratings in evidence, not extra
   keys in the strictly checked source entry. The current 57-hint feasibility run does not
   waive replay after correcting provenance. Curated sources consume no discovery batch:
   run the task's `--write`, then `--check`, using normal `game.hint()` and unchanged givens.
   Check the **35 existing IDs** first without letting the absent new entry prevent their
   checks; refresh every affected old example via IR72 H1, and finish GH for **all 36**.
   If curated replay fails, follow B's existing bounded route and report missing data honestly;
   no fabricated snapshot, forced finder or false Generator header is an alternative.
8. **Sweep fit: accept three.** Three distinct real unique supplements that actually fire
   meet the unchanged minimum of three; no spare margin or additional source campaign is
   required. Preserve every seeded random input/minimum and all independent soundness checks.
   Report zero random 9-digit firings separately from the three supplemental firings; do not
   claim random coverage or lower the minimum if a later change invalidates a supplement.

Apply the corrections and verify the focused contracts before freezing generation-source bytes.
Complete full E (five G09-G13 wires, fourteen G01-G14 analyses, 520 hashes; wire publication/check
before analyses), R20, pattern cost, complete GH, both quick sets and CI. A clean pin preview or
zero reference changes does not waive E. Finish fingerprinted guides/designs before final quick
verification; later fingerprinted source changes replace their affected evidence. Preserve the
pre-ruling records and disclosed failed gates. Keep IR12 admission, the shared lock, 15 s gaps,
540 s process-tree ceiling and the CI projection rule/actual Player 900 s limit. Continue to
carry the inherited item list; no new performance/coverage item is inferred from zero sampled
caps or an exactly met supplemental minimum.

## Files to create/modify

- Wing engine/suite; `core/tests/suites/techniques.test.js` uniqueness list becomes exactly
  uniqueRectangle,bugPlusOne; full B/E and both design/guide languages.
- The single Master proposal seed entry in `generator/tests/suites/digger-target.test.js` and
  its traceability comment, only as authorized above; no threshold, matcher or policy change.

## Implementation steps

1. Implement full-state and unit-occurrence guards before considering a placement.
2. Prove uniqueness of two real positive fixtures; add false-context and global-count negatives.
3. Register/weight/integrate explanations and a genuine Player example.
4. Preserve v2 records, update current reference expectations, run cost/E/GH and quick checks.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS11c-B01 | The extra digit is forced by a global uniqueness proof, not a local heuristic |
| MS11c-B02 | Ordinary non-uniqueness solving never invokes this deduction |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS11c-T01 | All-unit/fixed-value checks, second trivalue, partial/cage/sign and ctx=false negatives pass |
| MS11c-T02 | Real uniqueness counts, exact placement, immutable state, registry and full B pass |
| MS11c-T03 | E/GH/cost and both quick sets pass |

## Test plan and gates

Include a distant unit with a wrong digit count while the trivalue cell's own units look valid.
Include a near-identical extra-candidate state, placed digits and an added complete diagonal.
Generator `node tests\node-runner.js --suite=tech-wing,techniques,technique-weights,difficulty-floor,tech-chain,i18n,pattern-cost-tools,digger-target`;
Player `--suite=play,i18n,help,help-example-tools,tech-chain,tech-wing,techniques`; both quick sets.
Complete E MS11c:

```powershell
node tests\perf.js --hash-key=classic4/veryEasy --hash-from=0 --hash-count=5 --hash-record=..\docs\difficulty-v3\evidence\MS11c\hashes\classic4-veryEasy-00.json
node tests\replay-goldens.js --ids=G01 --record=..\docs\difficulty-v3\evidence\MS11c\analysis\G01.json
node tests\pattern-cost.js --ids=bugPlusOne --runs=20 --json=..\docs\difficulty-v3\evidence\MS11c\pattern-cost.json
```

Player:

```powershell
node tests\tools\make-technique-examples.js ..\generator --ids=bugPlusOne --sources=tests\artifacts\difficulty-v3\MS11c\sources.json --max-puzzles=8 --max-hints=400 --write
node tests\tools\make-technique-examples.js ..\generator --ids=bugPlusOne --sources=tests\artifacts\difficulty-v3\MS11c\sources.json --max-puzzles=8 --max-hints=400 --check
```

B sources: uniqueness/chain examples, then bounded classic9 master/nightmare. Jobs 1/no --jobs;
E 10-90 minutes, cost 1-30 seconds, curated GH 1-120 seconds/discovery<=8 minutes.
**Announce to the orchestrator before starting (pentomino runs in parallel on the same machine).**
One evidenced own-limit adjustment; no process beyond 540 seconds.

## Definition of done & handoff

Report global proof/uniqueness evidence and every guard. M11 ends with exactly two uniqueness IDs.

## Resume rules — S-OD4

Review: orchestrator against MS08a's template and generic soundness/order-invariant suites,
not routine analyst cross-review. Correctness/evidence corruption or changing a decision stops;
time/availability is a named numerical item for MS18c/MS18d and work continues within the bounds.
Use `Invoke-Dv3Node` for all possibly >10-second payloads, <=540 s, and the current bounded quick
manifest. Any added suite owns its r6c CI group. No new slow-cell evidence/tooling class.
Return the inherited/new item list, actual gates and CI membership.

## Execution log

| Field | Value |
|---|---|
| Status | Accepted (orchestrator check against IR72 A-J; outside the analyst review set). Eight points before E: SA2 accepted six and changed two (`f7a2967`): the step text says "no solution or at least two solutions" (a global flip proves at least two), and the GH source uses the test-kit provenance `testkit-4242-14` with `level: null`; the stale-candidate check is a soundness guard; mutants #16-#20 are equivalent by SA2's non-circular proof |
| Start | 2026-11-16 17:20 (+07:00), base `1d702a5` |
| End | About 18:10 stop before E (8 points); 18:27 SA2 ruling (`f7a2967`); 19:23 final report; orchestrator re-check and commit at about 19:27 |
| Duration | About 1 h 46 min developer (50 min to the questions, 56 min after the ruling); about 17 min for the ruling; locked commands in `docs/difficulty-v3/evidence/MS11c/lock-log.jsonl` |
| Model | claude-sonnet-5.5 (developer); gpt-6-astra (SA2 ruling and pack amendment); claude-opus-5.5 (orchestrator) |
| Token usage | 371 model calls; 122,229,639 input tokens (120,534,736 cache reads); 394,462 output tokens (developer) |
| AI credits | about 2,023 (developer) |
| Verification | `bugPlusOne` in `core/js/engine/tech-wing.js` (wing group, order 182, base cost 72, weight 920, Master, unscoped, `assumesUniqueness: true`), between Unique Rectangle and Forcing Chain: exactly one open cell with three candidates and every other open cell with two, the whole model without cages, inequalities or partial units, and every unit tally showing exactly two holders per unplaced digit without X; the stale-candidate guard refuses an X already placed in a unit of T; Finding `cells: [T]`, `placements: [[T, X]]`; 50,000 tally units per call; one observer record on a normal return. EN/VI text with SA2's solution-count clause. Tests: `tech-wing` 435 -> 496, `techniques` 251 -> 259, `technique-weights` +1, i18n +1 per app; three real supplements (puzzles 720, 903, 3456) meet the sweep minimum. Mutants: 62 detected + 5 equivalent. Reach (seed 4242): 62 of 30,000 positions, 98 of 20,000 complete solves. **E** on frozen bytes: wires and analyses all unchanged; **3 of 520 hashes changed** (`classic9/nightmare` seeds 377 and 987, `diagonalX/nightmare` seed 2), the same 3 with and without the technique, none below Master. R20: 0 of 26 change. GH: 35 checked first (none differs), `bugPlusOne` from `testkit-4242-14` step 40 (R9C8 = 2); 36/36. Pins: `digger-target` Master seed 16 -> 30 (15 stuck keeps; aggregate 655 scored, 40 stuck), help counts 35 -> 36. Quick sets: Generator 4,289/4,289 (395.0 s), Player 2,529/2,529 (65.8 s); no projection rises; fingerprints match; CI check passes. Orchestrator: locked `tech-wing,tech-fish,tech-chain,techniques,technique-weights,difficulty-floor,i18n,digger-target` 1,567/1,567 (73.4 s), Player `help,help-example-tools,play,i18n` 214/214 (9.4 s), CI shard check 4,289 of 4,289 |
| Acceptance | MS11c-B01, B02, T01-T03 met; IR72 A-J pass (developer's table in `docs/difficulty-v3/evidence/MS11c/evidence.md` section 9, acceptance in section 10) |
| Issues & resolutions | The `digger-target` coverage pin fell to 27 stuck proposals (BUG+1 finishes Master seed 16); replaced by seed 30 under SA2's ruling, threshold unchanged. The first equivalence argument for #16-#20 was circular; SA2 supplied the tally-sum proof (2N-S against 2N-P). Random sweeps give zero BUG+1 firings; the sweep minimum is met exactly by the three supplements. Process: the edit tool sometimes replaced the nearest lines on a partial match; every such edit was re-read and fixed (listed in the evidence header); no PowerShell file writes. Not run: the manual `difficulty` suite (pure assertions evaluated by script), qualification, soak |
| Handoff | To MS12: the uniqueness group is complete (Unique Rectangle passes 1-3, BUG+1 at order 182); IR72 A-J is the checklist; base quick totals Generator 4,289 (395.0 s) and Player 2,529 (65.8 s); help catalogue 36; S-AV01-S-AV34 open as recorded; ask before E |
