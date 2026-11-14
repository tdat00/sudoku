# 15 — Implementation review of MS07a (windowed search kernels and bounded pattern measurements)

Reviewer: SA1 (claude-opus-5.5), 2026-11-15. Review set: S-OD4 analyst reviews (MS07a to MS07c).

Scope: HEAD `9dfc9a3` (MS06d) plus the uncommitted MS07a diff, its evidence (`docs/difficulty-v3/evidence/MS07a/`)
and its scratch (`generator/tests/artifacts/difficulty-v3/MS07a/`).

Against: `tasks/difficulty-v3/MS07a-window-kernels-and-pattern-metrics.md` (B01-B02, T01-T04, test plan), R9, R10
and R21 (`docs/difficulty-v3/report-detailed.md`), and what MS07b, MS07c and MS07d need from the kernels and the tool.

Method: read-only. I read the engine diff against HEAD line by line, every new test, the tool, its helpers and
suite, the documentation and manifest diffs and the evidence. I recomputed the identities in memory with the
repository's own rules and compared the differential's "original" file with HEAD. I ran no test, generation, tool
or timing, and changed nothing except this file.

## 1. Verdict

**Accept.** The seam does what R9 and R10 ask:

- It finds the minimum over the whole scan and rejects it below the window, without searching from `min`.
- It keeps the scan's tie order and the iterative deepening.
- It returns `null` on exhaustion or a spent limit, never the best proof so far.
- It takes the id as a parameter and allows chains of more than 12 edges.

The registered finders are behaviour-identical, by construction and by a sound differential. The tool is bounded and
deterministic apart from time, and it fails on every incomplete or inconsistent run. The docs and counts are right.

No correctness, evidence-corruption or recorded-decision finding, and no Major. One Minor (IR52) is best fixed in
MS07b, which rewrites the same file and design §6.6 anyway, so no fix round and no rerun is needed now. Three Info
items:

- IR53: rulings on the five deviations;
- IR54: what MS07b and the later technique tasks must do with the seam;
- IR55: notes on the evidence and the tool.

## 2. What holds

### 2.1 The registered finders are unchanged

The only behaviour-relevant change is in `core/js/engine/tech-chain.js`. Its registrations (ids, costs, orders,
keys) are untouched. The early return on repeated loads is untouched, and `chainLimit` and `nishioDepth` read the
caller's options as before.

**By construction.** I traced each registered finder through the new path; with no limit, it runs the old algorithm:

- `findForcingChain` (`:572-573`) builds `{ id: 'forcingChain', min: 1, max: chainLimit(ctx), limit: Infinity }`. With
  `limit: Infinity`, the call is unbounded:
  - `maxLength < spec.min` is the old `maxLength < 1`;
  - there is no entry check and no gate;
  - every expansion visits all its edges, in the old order, and returns at the same first proof;
  - `r.capped` never becomes true, and `bestLength < 1` never holds.
- `findNishio` (`:684`) is the same. `Math.min(spec.max, cellCount)` equals the old depth for any real board, because
  `nishioDepth` is at most 3. `r.work >= Infinity` never throws.
- The new wrapper `measured` (`:205`) swallows `budget.exceeded` and rethrows every other error, exactly as the old
  `withBudget` did.
- The only additions on the legacy path are the work counter, one spec object per call, and a call of
  `ctx.options.onPatternWork` when it is a function. No production caller sets that key.

**By differential.**

- The "original" the developer loaded (`02733d67...`, a file in another worktree outside the repository) is HEAD's
  `core/js/engine/tech-chain.js` with CRLF line ends: after normalising the line ends, it equals HEAD's blob
  `40bda8ed...`, which I checked.
- `differential.js` loads the whole engine twice, once per file, and compares 35,020 finds. Each find records the
  Finding, the error code and the budget ticks. The corpus:
  - 2,000 random classic9 states, 12 classic puzzles, and 24 classic4 and 24 classic6 states;
  - seven chain-length options (default, 3, 6, 12, Infinity, 0 and `'x'`) and five depth options (default, 1, 3, 0,
    1e9);
  - node budgets of 3, 40 and 400 for `forcingChain`, and 3 and 200 for `nishio`.
- Equal digests therefore cover the Findings, the option parsing, the swallowed budget and the check cadence.
- The code paths it does not exercise are identical by construction (cancellation, other variants). Existing
  tick-count and cancellation tests of the registered finders still pass.

So the differential is a sound proof. IR55 asks for its record to name the source it ran on.

**Inert in production.** `SG.chainSearch` (`:688`) is a new global that nothing in `core/js`, `generator/js` or
`player/js` calls, and nothing reads `onPatternWork` except the kernels. No registration, window, default, help
example or locale changed. Every quick suite that pins generated output passes on the final tree: `replay`, `steps`,
`pipeline`, `player`, `smoke` (with its regression-hash sample) and `mega`.

### 2.2 The seam (R9, R10)

- **Windows.** `scanForcing` (`:509-537`) searches from length 1 with the old limit `min(max, bestLength - 1)`. It
  returns `null` as soon as the best proof is shorter than `min` (`:533`), because the minimum can only fall. After a
  capped search it returns `null` (`:531`).
- **Nishio.** `scanNishio` (`:622-659`) keeps the iterative deepening: every trial at a depth is tried before the next
  depth. A first refutation shallower than `min` gives `null` (`:644`).
- **Findings.** The id becomes `Finding.technique` and the key prefix (`technique.<id>.step[.kind]`). `length` stays
  the longer chain of a two-chain proof. Option errors use the existing `solver.invalidOption`, which has locale text in
  both apps.
- **Work.**
  - A forcing unit is one edge visited. Each expansion spends at most what is left (`todo`), and a cut expansion sets
    `capped`.
  - A nishio unit is one `refutes` call; at the limit it throws a frozen sentinel that `measured` catches.
  - The counter lives in a per-call object, so it is reset per call.
  - Absent means 50,000; `null` or `Infinity` means unbounded (the record says `limit: null`).
  - Negative, `NaN` and non-number values are refused.
- **The observer** gets a fresh `{ id, work, limit, capHit, retained }`:
  - after completion, a spent limit or a swallowed `budget.exceeded`;
  - never after a propagated error, so a cancellation throws with no record.
  - Its return value and any mutation of the record are ignored, so it never selects.
- **Checks.** A bounded call checks the parent budget at entry; a nishio trial checks every time. A forcing call checks
  through `gate` (`:228-231`) and also before every root, as before. For how often `gate` checks, see IR52.

### 2.3 Tests that would catch plausible wrong windows and caps

I checked each plausible wrong implementation against the new tests in `tech-chain`:

- **A search that starts at `min`, or a `min` applied per root (both rename a longer proof):** the rings of 13 and 5,
  where the 7-edge proof of the first ring comes before the 3-edge one of the second. Windows [4,12], [5,12], [7,12],
  [7,7] and [4,6] must give `null`.
- **Off-by-one bounds:** the 7-edge minimum on the ring of 13. [7,7] and [1,7] find it, [1,6] and [8,12] do not; it is
  also run on 60 pruned states and the chain fixtures, around each state's own minimum.
- **Two chains counted as their sum:** 7/6 on the ring of 13, and 3/2 on a real `contradiction` fixture. Over random
  positions, the two lengths always differ by an odd number.
- **Nishio searched from the minimum depth, or a refutation below `min` skipped instead of rejected:** escargot (depth
  1) must give `null` in [2,2] and [2,3]; hard-platinum (depth 2) must give `null` in [1,1], [3,3] and [3,4].
- **A cap that is not enforced, is off by one, or returns the proof in hand:**
  - every limit below the total work W, including exactly the work of the first ring (when its 7-edge proof is
    already in hand), gives `null` with `work === limit` and `capHit: 'work'`;
  - exactly W gives the Finding with `capHit: null`;
  - the same holds for nishio.
- **The legacy path gaining checks, or a counter not reset:** a solved board gets one check when bounded and none when
  unbounded, and two identical calls give equal records. The existing tick-count tests still hold.
- **The observer selecting or sharing results:** a hostile observer cannot change the result, and the records of two
  calls are distinct objects.

The developer's three mutations (no `min` rejection in forcing, none in nishio, and the forcing cap ignored) fail 6, 3
and 2 tests. That is consistent with the list above.

### 2.4 The supplements

The sweep in `techniques.test.js` now builds the brief's exact construction:

- `H.randomStatesWithKnownSolution(model9, SG.testkit.rng.create(20260101), count)` followed by the supplements;
- with `minFirings: 3`, the existing counts (120 or 300) and the default `maxSteps`;
- and `expect(stats.states).toBe(count + supplements.length)`.

`model9` is `H.model('classic9')`, the same cached object `assertSound` used by default, so the random prefix is the
old population by construction. The map is empty and its mechanism is tested on the two real positive `forcingChain`
positions: random prefix, total count, the extra firings, and an impossible minimum that still fails. The historical
LADDER and data are untouched.

### 2.5 The tool (`generator/tests/pattern-cost.js`)

- **Loading.** It loads the harness, the ordered `SOURCE_FILES` and the `.js` files of `FIXTURES_DIRS`, all parsed from
  `tests/node-runner.js`. It loads no suite and generates no puzzle.
- **Cases.** It builds every case with `makeState`/`stateAfter` from the active `byId` map, as the suite does.
- **Each run** uses a fresh context, and the state is compared after it. Every run of a case must give the same
  Finding and the same work records.
- **Budget.** The eight-minute caller budget is checked before every run and again after every find, which catches a
  `budget.exceeded` that a finder swallowed. `--runs` is capped at 200.
- **Failures.** It fails, with exit code 2 and before any run, on an unknown or scoped id, missing fixtures, an empty
  selection or a bad command line. It exits with code 1 on an incomplete or inconsistent record. It never writes over
  a file or into the fingerprinted sources.
- **The evidence record** (`pattern-cost-forcingChain-nishio.json`) is complete: 6 of 6 cases × 20 runs, no cap hit,
  every outcome as the fixture records it. Its three identities recompute from the current tree:
  - sources `0fa564f3...`;
  - fixtures `635a036d...`;
  - tool `7dc2e09d...`.
- **`pattern-cost-tools`** tests the helpers on fake observations and fake clocks, and the measurement loop on the real
  fixtures with a fake clock. In Node only, it runs the tool as a real process. No assertion reads a wall-clock time.

### 2.6 Identities, counts and documentation

- **Quick sets on the current tree.** I recomputed both fingerprints: Generator `ae9c1dfe...` (163 files) and Player
  `1b727545...` (130 files). The results match them:
  - Generator 3,405 of 3,405 in the eight shard files, all complete and source-stable;
  - Player 1,714 of 1,714.
  - All runs were made after the last edit of `tech-chain.js` (01:27).
- **Counts.** `tech-chain` 62 → 89 and `techniques` 165 → 169 run in both apps (+31), and `pattern-cost-tools` adds 28:
  Generator 3,346 → 3,405, Player 1,683 → 1,714.
- **Suites.** There are 36 Generator suites, 16 shared and 8 manual, so 52 quick and 60 in all.
- **Manifest and CI.** The `own-fast` shard holds the new suite with its projection unchanged. `outOfCi.tools` lists
  the tool, `tests.html` lists the fixture and the suite, and the CI check passes.
- **Documentation:**
  - design.md §6.6, §13.6 (API and observer), §15.1/§15.2 (counts and suite rows), §15.4 and the file tree;
  - both developer guides, which agree, including a stale tree count fixed (34 → 36);
  - `player/design.md` (1,714).

  They describe the implementation, with one exception (IR52).
- **Standing quick cost.** 690.2 s against 690.7 s after MS06c2's fix round: no change.

## 3. Findings

### IR52 — Minor — the 256-unit check is per block, not "at least every 256 units"

**Where:**

- `core/js/engine/tech-chain.js:226-231` (`gate`): "so that no more than 256 units pass between two checks";
- the header (`:73`) and design.md §6.6: "at least every 256 units".

R10 says: "Check the parent budget at least every 256 units and at entry".

**Problem:** `gate` checks before an expansion that carries the count over a multiple of 256, which gives one check
per 256-unit block. Between two checks, up to 255 + n units can pass, where n is the size of the expansion that
crossed the previous multiple. That is up to 28 edges on 9x9 (8 digits and 20 peers), so up to about 283 units, and
more on 16x16. The practical effect is nil, but the comment's guarantee is false. The guide names this seam "the
model" for later finders, which will copy it.

**Fix (in MS07b, which edits `tech-chain.js` and §6.6 anyway, so no rerun now).** Either:

- make the gate strict: keep the work at the last check, and check before an expansion when
  `work + n - checkedAt > 256`; or
- reword the comment, header and §6.6 to "once per 256-unit block (fewer than 256 + n units between two checks)".

Prefer the strict gate, which matches R10's text; then adjust the `1 + 1 + 2` cadence test.

### IR53 — Info — rulings on the five deviations

1. **"Two paths 4/6" cannot occur: accept.** Every edge changes the polarity of a literal, and the two chains of a proof
   end in both polarities of one node, so their lengths differ by an odd number. The max-not-sum rule is tested on a
   pair that can occur: 7/6 (where the sum would be 13) and 3/2 on a real fixture.
2. **Cadence: accept.** Bounded calls check at entry and periodically; the registered finders, which pass no limit,
   keep the old cadence. "Existing wrappers remain behavior-identical" requires it, because the tick counts are
   asserted and a budget is spent at the same point. The periodic rule itself is IR52.
3. **The default (`workLimit` absent means 50,000; `null` or `Infinity` means unbounded) is within scope, not a
   routing question.**
   - The brief states the default itself ("R10 work defaults: 50000 per new finder"), and R10 approved 50,000 as the
     bound of a new pattern finder (SA2-Q-S05 (a)).
   - "A legacy unbounded kernel reports limit null" requires an unbounded mode, which `null` provides. `Infinity` is a
     harmless synonym, also reported as `null`.
   - The evidence's "the task text does not name the seam default" is therefore inaccurate.
   - What MS07a does not decide, and need not, is which limit each registered ID will pass (IR54).
4. **The caller's maximum is not read by the seam: accept.** The seam takes explicit bounds. R9's "intersect its maximum
   with a caller's explicit valid maximum" is the wrapper contract, and MS07b's brief places the `maxChainLength` and
   `maxNishioDepth` semantics in its wrappers.
5. **Empty `supplements`: accept.** The brief makes supplemental cases optional. No ladder technique needs one yet, and
   the mechanism and recipe are delivered and tested on real positions.

### IR54 — Info — handoff to MS07b and the later technique tasks

- **MS07b must pass `workLimit` explicitly for each of the four IDs.**
  - If a wrapper omits it, the seam's 50,000 also bounds the existing `forcingChain` and `nishio`, which are unbounded
    today. A capped call returns `null`, so the technique would not fire where the bound is reached; that is likelier
    on 16x16 boards.
  - R10's 50,000 is approved for new pattern finders (`forcingChainLong`, `nishioDeep`). Whether the two existing IDs
    stay unbounded (`null`) or take the bound is not stated in MS07b's brief.
  - I recommend the pack author add one line to the brief. If the existing IDs are bounded, MS07b's E will show it.
- **MS07b's wrappers** must clamp the caller's maximum to the ID window and pass explicit min and max. The seam's
  defaults (1, and 12 or 2) would silently stand in for a forgotten bound.
- **A record after a swallowed `budget.exceeded`** has `capHit: null`, the same as a complete scan. A consumer that
  counts calls, such as MS07c's soak diagnostics, must check its own budget, as the tool does.
- **The supplements are wired only into the unscoped classic9 sweep.**
  - `supplementItems` assumes `model9` and 81-character puzzles.
  - A scoped rare technique (R17's `lawOfLeftovers`) needs the same construction at the scoped call site of
    `techniques.test.js`, with that site's model and count.
  - The tool also refuses scoped ids until MS14b's adapter.

### IR55 — Info — evidence and tool notes

- **The differential's record.**
  - The "original" is named by an absolute path outside the repository (the improve-generating worktree). Name it as
    HEAD's blob (`git show 9dfc9a3:core/js/engine/tech-chain.js`), so that it can be reproduced from the repository.
  - The transcript does not give the SHA-256 of the current `tech-chain.js` that each run compared. Record it next to
    the digest.
- **The wrapper cost** (+2.6 % find-only on short finds, with no visible change in the quick sets) is reasonably a
  measurement, not an S-OD4 item. A line in the v3 notes would let MS18d find it.
- **The tool's outcome check.** A case whose outcome is not the fixture's (`matchesFixture: false`) is counted in the
  summary but does not make the record incomplete; the exit code stays 0. MS07c should read `mismatches` before using a
  record as GP-cost evidence, or the tool could treat a mismatch as a problem.
- **The Node-only test of `pattern-cost-tools`** writes into the task-named folder
  `tests/artifacts/difficulty-v3/MS07a/sandbox-pattern-cost`, which is not git-ignored. It is removed in `finally`, but
  a killed run would leave it behind. A neutral, ignored folder would suit a permanent quick suite better.

## 4. Handoff

- MS07b receives:
  - the inactive kernels and the `onPatternWork` record;
  - IR52's strict gate (or the reworded guarantee);
  - IR54's explicit-limit decision for the four IDs, and its intersection of the caller's maximum with each window.
- MS07c and the later technique tasks receive the cost tool and the supplements recipe (IR54 for scoped sites).
- New S-OD4 items: none. The inherited list is unchanged.
- Current identities: Generator quick `ae9c1dfe...`, Player quick `1b727545...`, and the tool record's sources
  `0fa564f3...`, fixtures `635a036d...` and tool `7dc2e09d...`.

MS07a REVIEW DONE

## 5. Cross-check of the IR54 ruling in MS07b (2026-11-15)

Requested by SA2 before MS07b is dispatched. I read `tasks/difficulty-v3/MS07b-register-chain-windows.md`, lines
1-150 and the IR55 block, against R9, R10 and IR52-IR55 above, and checked it against the MS07a source. I ran no
Git, test, generation or timing.

**Verdict: PASS. No correction is needed to the IR54 ruling.**

- **Windows.** The table matches R9 for all four IDs:
  - `forcingChain` [1, C] and `forcingChainLong` [C+1, 12], with C read from `SG.chainSearch.SHORT_MAX` per call;
  - `nishio` [1, 1];
  - `nishioDeep` [2, 2] by default, with a numeric caller value clamped to 3 (Infinity included).
- **Caller values.** The maximum is the minimum of the window's maximum and the floored caller value. Absent,
  non-number or NaN takes the ID's default. A value of 0 or less, or one below the window's minimum, leaves an empty
  window and `null`, so an override never enlarges a window beyond R9 (deep's 3 is R9's own explicit maximum).
  Every wrapper passes its id, both bounds and `workLimit` explicitly, so the seam's defaults cannot stand in.
- **Work limits.**
  - `null` for `forcingChain` and `nishio` keeps their accepted policy. R10 approves 50,000 for new pattern finders
    only.
  - Their windowed scans stay finite and deterministic: a breadth-first search at most C edges deep, and depth-1
    trials at most cells x digits. So this is not an "unbounded scan" in R10's sense.
  - The parent budget and cancellation still apply.
  - 50,000 for the two new IDs is R10's approved starting value, and any later change still needs R10's once-only
    measured record.
- **The private-spec note is right and needed.** In the MS07a source, `forcingWith`/`nishioWith` treat only
  `limit === Infinity` as unbounded. A private spec with `limit: null` would be bounded with nothing left to spend:
  `null - 0` is 0, so the first forcing expansion is cut and the first Nishio trial throws the cap. Either route
  (the public seam with `null`, or the private spec with `Infinity`) is correct as the brief states.
- **The rest is consistent with IR52-IR55:**
  - "Generated output may change"; the brief claims no MS07a parity;
  - a swallowed `budget.exceeded` with `capHit: null` is not completion;
  - the supplements stay unscoped-only until MS14b;
  - IR52's strict gate and the IR55 items.

Optional, outside IR54: the anchor `:690-712` (registrations) ends at 711, the last line of the file. The brief
says to use symbols after edits anyway.

IR54 CROSS-CHECK: PASS.
