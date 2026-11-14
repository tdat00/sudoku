# 16 — Implementation review of MS07b (register chain/depth windows with complete integration)

Reviewer: SA1 (claude-opus-5.5), 2026-11-15. Review set: S-OD4 analyst reviews (MS07a to MS07c).

Scope: HEAD `959aae0` (MS07a) plus the uncommitted MS07b diff, its evidence (`docs/difficulty-v3/evidence/MS07b/`)
and its scratch (`generator/tests/artifacts/difficulty-v3/MS07b/`, `player/tests/artifacts/difficulty-v3/MS07b/`).
Astra's edits to the MS07b brief and section 5 of my review 15 are also uncommitted; they are not reviewed here.

Against: `tasks/difficulty-v3/MS07b-register-chain-windows.md` (B01-B02, T01-T07, the IR54, IR52 and IR55 sections,
the mega Hell 1 contract, the test plan), R9, R10, R20 and R21 (`docs/difficulty-v3/report-detailed.md`), FS18/FS19
(the non-vacuous Hell 1) and my IR52-IR55.

Method: read-only. I read the engine and weight diffs line by line, the new and changed tests, the fixtures, locales,
help examples, documentation, CI manifest and the evidence, and recomputed every identity in memory with the
repository's own rules. Two short read-only computations went through the developer's scratch loader (no
generation, no timing, nothing written): the three constructed Nightmare fixtures solved with the manual suite's
certificate sets (deviation 2), and the work of the two forcing windows on the stuck positions of three famous
puzzles (IR56, IR59). I ran no test, generation, tool or timing, and changed nothing except this file.

## 1. Verdict

**Accept with a short fix round (text only).** The registration is what R9, R10 and the IR54 ruling ask:

- four wrappers with explicit windows and work limits: `forcingChain` 1..C and `nishio` depth 1, both unbounded;
  `forcingChainLong` C+1..12 and `nishioDeep` 2..3 (default 2), both at 50,000; C is read at every call;
- weights 1400 and 2600, baseCosts 118 and 210, orders 198 and 202, group `chain`, unscoped, no uniqueness
  assumption;
- IR52's strict gate (at most 256 units between two checks, oversized expansions split), with the legacy cadence
  intact, proven by gap regressions and four detected mutations;
- complete locale, help and example integration in both apps, and R20's one reclassification recorded;
- the mega Hell 1 contract applied as decided in advance (S-OD4 / CV6-03 (1)), with a complete and sound deep record.

No correctness, evidence-corruption or recorded-decision finding, and no Major. Two Minor findings need a short fix
round, with no code change and no rerun of E:

- IR56: the explanation of the six changed hashes names one cause and "nothing else"; one of the six (#377)
  contradicts it;
- IR57: three stale technique counts in the user guides (both languages).

Four Info items: IR58 (evidence wording, can ride along), IR59 (the dig's objective guard counts the new checks),
IR60 (`SHORT_MAX` is not range-checked) and IR61 (rulings on the deviations and the named items).

## 2. What holds

### 2.1 Wrappers, windows, work limits and registrations (R9, R10, IR54; B01, T01-T03)

- `findForcingChain`: min 1, max `min(C, callerMax(maxChainLength, C))`, limit `Infinity` (the seam's `null`).
- `findForcingChainLong`: min C + 1, max `min(12, callerMax(maxChainLength, 12))`, limit 50,000.
- `findNishio`: min 1, max `min(1, callerMax(maxNishioDepth, 1))`, limit `Infinity`.
- `findNishioDeep`: min 2, max `min(3, callerMax(maxNishioDepth, 2))`, limit 50,000.
- `callerMax` is the brief's caller-option table: absent, non-number or NaN gives the ID's default; a number is
  floored; `Infinity` is clamped by the ceiling; a maximum below the minimum is an empty window, `null` with work 0.
- C is `SG.chainSearch.SHORT_MAX` (6), read by every call of the two forcing wrappers; a non-number throws
  `solver.invalidOption`.
- The private spec gets `Infinity` for the unbounded IDs, never `null` (which would cap at once there), as the IR54
  note requires. The pattern-work record reports `limit: null` for them and 50,000 for the new IDs; a test pins all
  four, empty windows included.
- Each window search starts at length or depth 1 and then filters by its window, so a long or deep ID never labels
  a short or shallow proof (B01), and a spent limit gives `null`, never a partial minimum (T03).

Registrations: `forcingChainLong` 118 / 198 / 1400 and `nishioDeep` 210 / 202 / 2600 (baseCost / order / weight),
both `chain`, `variantScope: null`, `assumesUniqueness: false`; the existing IDs keep 90 / 190 / 1100 and
140 / 200 / 1700. These are R9's and R10's tables. Nothing else lies between orders 190 and 202, so the old relative
order holds; the weights stay monotone along the registry, and the catalogue is 28, 23 of them unscoped (T02).

What follows from `1.25 x weight < band max` (Master 1,500, Nightmare 2,400, Hell 1 3,600):

| Level | Chain IDs allowed | Change against MS07a |
|---|---|---|
| Master | `forcingChain` (1..C) | loses chains of 7 to 12 links (`forcingChainLong` 1,750 is not below 1,500) |
| Nightmare | + `forcingChainLong`, `nishio` (depth 1) | loses depth-2 Nishio (`nishioDeep` 3,250 is not below 2,400) |
| Hell 1 | + `nishioDeep` | gains a tier (`nishioDeep`): no longer vacuous |
| Hell 2 | all | tier still empty (vacuous, as before) |

### 2.2 The strict gate and the legacy cadence (IR52; T06)

- `gate(run, n)` checks before `work + n - checkedAt > 256` and sets `checkedAt = work`; the entry and root checks of
  a bounded call also set it. `expand()` splits an expansion into pieces of at most 256 edges, each behind the gate,
  counts every visited edge once (up to and including a proof edge) and marks a cut at the limit. So
  `work - checkedAt <= 256` holds throughout.
- An unbounded call (`forcingChain`, `nishio`) has no entry check and no gate: root checks only, as before. Every
  Nishio trial is checked, bounded or not.
- The tests would catch the plausible wrong gates:
  - stars of 40, 100, 250 and 300 spokes, with expansions of 1 or 2 edges next to ones of 41 to 301: every gap is
    at most 256, and exactly 256 where pieces are full (the old modulo gate let up to 553 pass here);
  - the exact boundary: a ring of 201 pair units checks at 0, 0, 255 and 510;
  - the split: a star of 300 spokes checks at 0, 0, 256, 301 and 557; limits 255 to 302 each cut at the limit;
  - a Finding in the second piece (a hub of 300 spokes): work 300, a limit of 299 stops one edge short, a budget
    spent at the gate has counted 256;
  - the legacy cadence (one root check, a 300-unit gap) and Nishio's per-trial checks;
  - the mutations M1 (the old modulo gate), M2 (no split), M3 (no checkpoint at the root) and M5 (`forcingChain`
    at 50,000) were each detected.
- IR54's contrast is there: an odd ring of 2,001 pair units before a ring of 5 needs more than 50,000 units before
  the short proof. `forcingChain` reaches it, the seam's default would not, and `forcingChainLong` is cut at 50,000.
- A swallowed `budget.exceeded` gives `null` with `capHit: null`, and the test shows the caller's own check failing
  afterwards (IR54).

### 2.3 Integration in both apps (R9, R10; B02)

- Locales: all four files (Generator and Player, English and Vietnamese) have the 16 keys of the four IDs (name,
  `.desc`, the three `.step.*` keys of each forcing ID, `.step` of each Nishio ID), with the same placeholders
  (`{length}`, `{chains}`; `{depth}`, `{label}`, `{digit}`).
- Help: Hell 1's tier lists `nishioDeep` (Generator `help`). The Player has 28 examples. Each new one is a real
  snapshot, replayed with the Player's hint code: `forcingChainLong` (7 links) from a discovered Nightmare puzzle and
  `nishioDeep` (depth 2) from the published Escargot. The old `forcingChain` (4 links) and `nishio` (depth 1) sources
  still replay, and `--check` reproduces the file. The short example (4 links) and the long one (7) keep their IDs
  for C = 4 and C = 6.
- Registry fixtures: `forcingChainLong` has 7- and 8-link positives and two negatives ("no chain at all" and "a
  4-link chain is `forcingChain`'s"); `nishioDeep` has depth-2 positives on two famous puzzles and the negative
  "Escargot's depth-1 refutation is `nishio`'s". The v2 ladder stays frozen, and the old IDs keep their relative
  order in the expanded registry.
- The proposal objective excludes the chain group by group, so the new IDs are excluded there as well.
- R20: `constructed-nightmare-2` (two 7-link steps) goes from Nightmare, not required, to Hell 1, not required, and
  the notes record it with its cause; the labelled floor row and `V3_EXPECTED` were re-derived, not fitted.
- Design sections 6.6 and 13.6 (windows, weights, the levels table), both developer guides, the Player design and
  the counts are accurate, except IR57. The pins (`replay` G14, `pipeline`'s capped-trace request, `purity`, the
  Player's 28) each have a stated, checkable reason.

### 2.4 E, identities and counts (recomputed)

- Quick fingerprints: Generator `a56f1350...5d54d1` (163 files) and Player `ebdceab3...bf041c` (130 files), as
  claimed. All nine result files are `complete` and `sourceStable`, with no failure or skip: Generator
  1,209 + 75 + 108 + 1,623 + 154 + 69 + 154 + 57 = 3,449, Player 1,749.
- Counts: Generator +44 (`tech-chain` +18, `techniques` +17, `pattern-cost-tools` +4, `difficulty-diagnostics` +1,
  `mega-contract` +7, `mega` -3), Player +35 (the two shared suites). The CI manifest's shard counts match.
- GG: the 104 ledgers carry `ed6b9f2e...` (recomputed from the 45 engine sources and the three perf files); the
  merge finds 520 of 520 unchanged against the refreshed fixture, and exactly 6 of the 520 differ from HEAD:
  classic9 Nightmare seeds 2, 3 and 6765, diagonalX Nightmare seeds 89, 377 and 610.
- GR: the 5 wire and 14 analysis ledgers carry `9fe78e3a...` (recomputed from the 63 sources and the four recorder
  files); `replay-wire.js` is unchanged, and of the goldens only G14 differs from HEAD.
- The pilot and the 14 mega records carry `ddf2fa5a...` (the 63 sources alone, recomputed). The Nightmare mega
  manifest hash is unchanged (`758f5b0a...`); the Hell 1 one is `243452b9...`, as the reconciliation says.
- IR55 provenance: both blobs, their LF and CRLF SHA-256 and the final file's SHA-256 are exactly those of evidence
  section 2, and the scratch copy of the accepted MS07a file is the CRLF form of `959aae0`'s blob.
- IR55 tool fixes: a fixture mismatch now makes a record incomplete and the CLI exit 1, also against a forged
  `complete: true`; the suite writes into a per-run folder under the ignored `.scratch-pattern-cost-tools/`.

### 2.5 Hell 1 and mega evidence (FS18/FS19; T04, T05)

- The pilot's two classic9 Hell 1 requests are in band (3,052 and 3,199) and shallow, and their technique counts
  confirm the stated reason: forcing chains of at most 6 links (7 and 10 steps) and two depth-1 Nishio steps each,
  no long or deep step. Mean 5,142.5 ms; projections GD 102.8 s and GQ 205.7 s, below the 450 s threshold.
- Mega Hell 1: the population is the decided one (seeds 1 to 4 and CV5 calls 3, 3 and 4 per board, level-qualified
  ids, its own manifest and record kind; the Nightmare ids and hash unchanged). The reconciliation is complete and
  sound on the final source and tool: 14 of 14 produced and correct, 6 of 6 relations, 0 of 14 exact, each a
  truthful fallback with both warnings; mega12 29.3 to 34.4 s, mega16 99.9 to 123.3 s.
- Quick: the four full-attempt Hell 1 tests leave `mega`, a one-attempt mega12 Hell 1 smoke joins (7.74 s against
  18 s before the factor), and the scripted mega16 control serves both levels (IR61).

## 3. Findings

### IR56 — Minor — the explanation of the six changed hashes is incomplete, and #377 contradicts it

**Where:** evidence section 4 ("The cause is the new tier of the Nightmare level ... #89 and #377 changed because an
earlier candidate of the same seed is now accepted. Nothing else in the 520 changed") and the notes, MS07b, "Output
differences and what caused each" (one cause: a 7- to 12-link chain is now a Nightmare-tier `forcingChainLong`).

**Problem.** The differential proves that MS07b's source causes the six changes. The stated mechanism is only one of
the ways MS07b changes a dig, and it cannot explain #377:

- The new #377 is exact at attempt 4 with one chain-group step, a `nishio` (depth 1), score 2,378. With no
  `forcingChainLong` or `nishioDeep` step, its rating is the same under the old registry, and it would have been
  exact there too: in the Nightmare band, required, with `nishio`, the old Nightmare tier. The old run went on to
  attempt 8, so it never produced this puzzle at attempt 4. The dig changed, not the verdict on the same candidate.
- MS07b changes a dig in four ways, all allowed by the IR54 ruling ("R9 windows/new IDs/new-ID caps and
  budget-bound outcomes"):
  1. labels and weights: a 7- to 12-link proof is a Nightmare-tier `forcingChainLong` (1400), and a depth-2 proof a
     Hell 1-tier `nishioDeep` (2600); this changes acceptance and the scores the guided dig reads;
  2. the oracles' allowed sets (table in section 2.1): Nightmare's oracle no longer has depth-2 Nishio, which the
     old `nishio` searched by default, and Master's no longer has 7- to 12-link chains (the two Master keys did not
     change);
  3. the number of budget checks, which the dig's objective guard counts (IR59);
  4. the 50,000 work limit of the two new IDs. It could change a rating (a long chain missed, `nishio` instead),
     but hardly on 9x9: a complete negative scan of the long window costs 4,562 to 4,851 units on the stuck
     positions of hard-platinum, Escargot and the 2012 puzzle. So #377's rating argument above holds.
- Design section 6.6 states both relabellings; the evidence and the notes name only the chain half.

**Fix (text only, no rerun).** In evidence section 4 and the notes:

- replace the single cause by the four mechanisms above;
- keep the relabelling as the probable explanation of the classic9 keys, #89 and #610: each new result has a
  `forcingChainLong` step (an earlier candidate is now exact, or the fallback ranks another candidate first);
- say that #377's new candidate comes from a changed dig, most likely the Nightmare oracle without depth-2 Nishio,
  with no per-attempt attribution.

"Nothing else in the 520 changed" stays true as a count (24 of 26 keys unchanged); it is not evidence that a single
mechanism acted.

### IR57 — Minor — three stale technique counts in the user guides

- `USERGUIDE.md:111`: "scored from 21 human solving techniques (singles, ..., chains)"; 23 classic techniques now
  have a weight.
- `USERGUIDE.vn.md:111`: "tính điểm từ 21 kỹ thuật giải của con người": the same.
- `USERGUIDE.md:359`: "a real example for each of the 26": 28. The Vietnamese line (`:354`) was updated.

The brief asks for both user guides. The Player's `help` suite checks only "one of 28 techniques", so these passed.

**Fix:** 21 to 23 twice, 26 to 28 once. Both guides are inputs of both quick fingerprints (`EVIDENCE_INPUTS`) and are
read by both `help` suites, so the fix changes both fingerprints. The orchestrator decides between re-running the two
`help` suites with the new fingerprints recorded and re-running the quick sets.

### IR58 — Info — evidence wording

- Evidence section 8: "The source hash of the engine ledgers, the pilot and the mega records is `ddf2fa5a...`". Only
  the pilot and the mega records carry it. The GR ledgers carry `9fe78e3a...` (the 63 sources and the four recorder
  files) and the GG ledgers `ed6b9f2e...` (the perf identity); I recomputed both, and both merges say "recorded from
  the current sources".
- Notes: "The famous puzzles stay Hell 2 and required, now through `nishioDeep`". Hell 2's tier is empty, so their
  requiredness is vacuous, as before; `nishioDeep` is their hardest technique, as evidence section 3 says correctly.
- S-AV24 in the notes gives only the 120 s application guard. Evidence section 9 also has the 30 s qualification
  figure (mega12 6 of 7 over it, mega16 7 of 7), the figure the PR-S2 remark under S-AV03 uses for mega Nightmare.
  Carry both into the item.

### IR59 — Info — the dig's objective guard counts the new checks (handoff MS07c, MS07e)

- `boundedObjective` (`generator/js/engine/digger.js`) wraps the solve's budget and refuses the removal
  (`REFUSED_TECHNIQUES`) after `OBJECTIVE_STEPS` = 100,000 checks. Every `ctx.check()` of a finder counts, and the
  statistics do not tell a guard refusal from a stuck solve.
- From Nightmare up, MS07b adds checks to the oracle's solves:
  - the entry and gate checks of `forcingChainLong` (and of `nishioDeep` from Hell 1);
  - a second scan wherever the short or shallow ID finds nothing: each window search starts at length or depth 1
    (R9's contract), so `forcingChainLong` checks the roots again and `nishioDeep` the depth-1 trials. On the
    stuck positions of three famous puzzles the long window's negative scan does exactly the short one's work
    (4,562 to 4,851 units each), so it doubles the chain-scan work there and adds about 19 gate checks.
- The guard's comment sets its margin at "about twice what the costliest 9x9 solve needed ... (44,000)", measured
  on the old cadence. Larger boards, with longer scans, are the likelier place to meet it.
- R5 fixes the bound ("not new calibration freedoms"), and the IR54 ruling allows budget-bound outcomes, so MS07b has
  nothing to change. MS07c and MS07e should count this among the possible causes of any availability or cost
  movement after MS07b; it becomes an S-OD4 item if it shows, not a stop.

### IR60 — Info — `SHORT_MAX` is not range-checked

`shortMax()` refuses a non-number or NaN and floors anything else:

- C of 0 or less turns `forcingChain` off and makes every chain long;
- C of 12 or more leaves `forcingChainLong` an empty window;
- C = `Infinity` lets `forcingChain` search past R9's 12-link ceiling (the seam has none of its own).

R9 allows C = 4 or C = 6 only. No production path sets C, and MS07c's `--chain-window=4|6` validates its own input,
so this is not a defect. MS07c may add a range check where it owns the setter.

### IR61 — Info — rulings on the deviations and the named items

Deviations, in the orchestrator's numbering (evidence section 10's number in brackets):

1. **[1] Premise edit in `difficulty-diagnostics.test.js` (MS07c's suite): accept.** The registration makes its old
   premise (an empty Hell 1 tier) false. The edit keeps each test's point with a Very Easy row or a fabricated empty
   tier, adds one test for the real Hell 1 position (lower bound 3,280, adjusted `(3,300 - 3,280) / 320`), and leaves
   the diagnostics of the new IDs to MS07c, as handed off.
2. **[2] Manual `difficulty` suite edited, not run: accept.**
   - The brief's commands do not include it. Its edits (the tier "firsts", the weights table, the one-step list, the
     famous puzzles' `nishioDeep`) match the registry.
   - The scratch check's output is not kept. I checked the one contract it covers that could plausibly break: the
     three constructed Nightmare puzzles are still solved by the historical `chains` set and stuck with `wings`
     (`constructed-nightmare-2` now through a depth-1 `nishio` where it used two 7-link chains). A one-line result in
     evidence section 3 would close the gap.
   - Its first run is MS07e's GD. Expect the classic9 Hell 1 batch ("at least 90 %" exact of 20) to fail there
     (S-AV25): an availability result, not a regression of this edit.
3. **[5] Comment-only header edit and complete re-recording: correct.** E, the pilot and the mega records are all on
   the final source; the superseded set is kept and labelled.
4. **[3] Discovery before the fixture search: accept as a recorded process deviation.** The outcome is what the
   preferred order gives (a real published fixture), the bound held (24 of 48 requests), and nothing was synthesised.
   The extra discovery is useful data: no depth-2 step in 12 Hell 1 puzzles.
5. **[4] Scripted mega16 control: accept.** Nightmare's control is the same Expert-tier control, for the same reason
   (a scripted strategy cannot stand in for the real proposal ratings of those tiers), and the policy it proves does
   not depend on the level, so "as for Nightmare" is met.
6. **[8] Read-only git: not a deviation** from the brief ("No Git/pack/log writes"); no action. **[7]** No
   announcement before E in a non-interactive run: the lock helper is the binding mechanism, and it was used and
   honoured; no action.

Named items (all proposed numbers checked against the records):

- **S-AV08** 739.2 s (+49.0 s, +7.1 %): accept. The per-shard comparison supports the G14 attribution (`player`
  +29.3 s, `replay` +7.5 s, `steps` +7.3 s of +48.5 runner seconds). `player` (162.4 of 180 s) and `pipeline` (327.6
  of 360 s) are within about 10 % of their projections; MS07c and MS07e should watch them.
- **S-AV24** mega Hell 1 request time: accept, with both limits (IR58).
- **S-AV25** Hell 1 exactness: accept. It is the expected consequence of FS18/FS19 and the most consequential item
  for MS07e. Add the discovery batch (no depth-2 step in 12 Hell 1 puzzles) and the expected GD outcome: with the
  mega records and the pilot, no `nishioDeep` step in 28 Hell 1 generations on this source.
- **S-AV26** classic9 Hell 1 request time: accept as an indication. It is two requests in Node on the development
  machine, not section 9.1's p95 of 50 runs on the reference machine; relate it to S-AV19 (section 9.1 flags, MS18d).
  The GD's own time assertion (median below 5,000 ms times the time factor) is looser and not threatened.

## 4. Handoff

- MS07c:
  - the choice of C: C = 4 would move 5- and 6-link proofs to `forcingChainLong`. The registry fixtures and help
    examples are already safe (at most 4 and at least 7 links), but the suite's default-C expectations on the 5-link
    fixture, GG/GR/GH and the pilot would change, as the brief foresees;
  - the diagnostics of the new IDs, and the cost tool's rules (a mismatch fails; the caller-budget recheck stays);
  - IR59 and IR60.
- MS07e: S-AV08 and S-AV24 to S-AV26 with IR58's and IR61's additions, the latest pilot (on `ddf2fa5a...`), and the
  expected GD Hell 1 outcome.
- MS14b: the scoped `lawOfLeftovers` supplements and adapter (unchanged from IR54).
- MS18e: the final-source rerun of the complete Nightmare and Hell 1 deep population.
- New S-OD4 items: S-AV24, S-AV25 and S-AV26 as proposed, with the additions above; the inherited list is unchanged.
- Current identities: Generator quick `a56f1350...` and Player quick `ebdceab3...` (both change with IR57's fix),
  GG ledgers `ed6b9f2e...`, GR ledgers `9fe78e3a...`, pilot and mega records `ddf2fa5a...`.

MS07b REVIEW DONE
