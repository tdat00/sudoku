# 17 — Implementation review of MS07c (select the short-chain cutoff from exact hits)

Reviewer: SA1 (claude-opus-5.5), 2026-11-15. Review set: S-OD4 analyst reviews (MS07a to MS07c).

Scope: HEAD `1ee14fc` (MS07b) plus the uncommitted MS07c diff, its evidence (`docs/difficulty-v3/evidence/MS07c/`),
the selection note (`docs/difficulty-v3/chain-window-2026-11-15.md`) and the scratch
(`generator/tests/artifacts/difficulty-v3/MS07c/`). The orchestrator's time fix in MS07b's log is not reviewed.

Against: `tasks/difficulty-v3/MS07c-select-chain-cutoff.md` (B01-B02, T01-T04, the measurement tooling section, the
test plan), R9 and R23 (`docs/difficulty-v3/report-detailed.md`), the owner's decision SA1-Q-S1 (c)
(`docs/difficulty-v3/clarifications-resolved.md`), and my IR59 and IR60 (review 16).

Method: read-only. I read every diff against HEAD, recounted the experiment from its six ledgers, recomputed every
identity with the repository's own rules and compared the regenerated fixtures with HEAD. One short read-only
computation went through MS07b's scratch loader (no generation, no timing, nothing written): the constructed puzzles
solved with their historical certificate sets at the new default. I ran no test, generation, tool or timing, and
changed nothing except this file.

## 1. Verdict

**Accept with a short fix round (text only).** The experiment and the rule were applied as preregistered, the only
production change is the default literal, and E, the pilot, the cost record and both quick sets are complete and on
the final source. No correctness, evidence-corruption or recorded-decision finding, and no Major.

Two Minor findings need a text-only fix, with no code change and no rerun of E:

- IR62: design section 6.7's levels table still gives the C = 6 chain lengths;
- IR63: the notes do not record the two new reclassifications as R20 asks.

Three Info items: IR64 (a correction to my MS07b review), IR65 (evidence wording) and IR66 (rulings and handoffs).

The six questions, in short:

1. **Experiment and rule as preregistered: yes.** Fresh paired requests at both cutoffs, nothing re-scored; the rule
   gives C = 4 (section 2.1).
2. **IR60 at the setter only: satisfies my finding.** The engine needs no range check (IR66).
3. **The recorder layout change: in scope**, as a coupled, layout-only fix (IR66).
4. **The 37 changed hashes: caused by C = 4 alone.** The default literal is the only change among the 63 sources.
5. **The stale mega records can wait for MS18e.** MS07d and MS07e need nothing beyond correct labels (IR66).
6. **MS07e is not invalidated.** Its preconditions now hold, and it measures on the current source (IR66).

## 2. What holds

### 2.1 The experiment and the rule (R9, SA1-Q-S1 (c); B01, B02, T01)

- I recounted the six ledgers. Each is `complete`, has rows 0 to 11 and no request error, and the exact counts by
  `generationExact` are C = 4 12 / 12 / 12 and C = 6 2 / 10 / 12 (classic9, diagonalX, Jigsaw 9): **36 against 24**.
  The rule "more exact hits in total, C = 6 on a tie" selects 4; it needs only the two totals, and they differ by 12.
- **Fresh and paired.** Every request is generated anew by the soak; the old fixed-board figures (0 and 2 of 12) are
  not used. The C = 4 and C = 6 cells of a board have the same tags and pipeline seeds. Their `meta` differs only in
  `startedAt`, `argv`, `chainWindow` and `chainShortMax`.
- **One identity for all six.** They share the source `ddf2fa5a...` (the accepted MS07b source), the tool
  `efff9dcd...` (which is also the final tool: I recomputed it), Node, seed base 20260101 and allowance 256. Both
  cutoffs ran with an explicit `--chain-window`, so no ledger mixes a default with an override.
- **Per-variant reporting.** The note reports each variant's exact count, shallow outcomes and times separately (B02).
  I checked the totals: attempts 40 against 161 and full ratings 2,182 against 32,300. The C = 6 misses are classic9
  requests 1 and 3 to 11 and diagonalX 5 and 6; all are shallow in band, with final-path chains of 3 to 6 links.
- **The guard observer** is a `--require` module outside the soak, so the ledgers and `argv` are those of the soak of
  record. Its records show the three wrappers installed, no problem, and 15 request calls per cell (12 plus the I4
  repeats). It ran under both cutoffs alike.

### 2.2 The override and its tests (T03; IR60)

- `parseArgs` accepts the text `4` or `6` exactly. Anything else is a usage error (exit 2) before the sources load,
  `--no-gate` included. `applyChainWindow` sets the value once after loading and before `execute`, which runs the
  weights or bands, the ordered-prefix check, the references and the requests. `main` and `execute` are synchronous,
  so the `finally` restore runs after the whole run. A source without `SHORT_MAX` refuses the flag (exit 2).
- The ledger records `chainWindow` (asked, else `null`) and `chainShortMax` (in force). `shardIdentityOf` includes
  both, so a C = 4 shard never merges with a C = 6 one, nor with one without the flag.
- The tests cover what the brief lists: the default (one premise constant), both overrides with their exact writes
  `[C, previous]`, the value read at the prefix check, at each reference and at each request, the restore after an
  error and after a refused weight, 19 refused texts, the missing setting, and real shard merges. The default premise
  moved to 4 and both override tests stay; no universal "default is 6" assertion is left.
- The chain statistics now count both windows (`forcingChainLong` lengths and `nishioDeep` depths with the short ones).
  This is R23's chain-length and Nishio-depth histogram after the split, and the handoff of MS07b. Given C in the
  ledger, nothing is lost: a length decides the id.

### 2.3 The new default and its pins (T02)

- `INITIAL_SHORT_MAX` 6 to 4 and its comments are the only engine change. The long ceiling, the depths, the weights,
  the work limits and the orders are untouched.
- The window tests follow C instead of assuming it. "The longest short chain equals C" is a non-vacuous boundary
  check. The 7- and 8-link stuck positions are built at C = 6 so that they keep their lengths. The registry fixtures
  give `forcingChainLong` 5- and 6-link positives (its lower boundary at C = 4) and add the boundary negative "a 5-link
  chain is not `forcingChain`'s". The 4/6 partition and window tests are kept.
- The re-derived pins keep their point:
  - G04 is the only exchange left, and the exchange tests use it;
  - the uniqueness-guard test moved to G06, because G04's new puzzle no longer exhausts a one-node count;
  - the shallow-fallback specimen of `cache`, `worker` and `pipeline` moved from seed 42 to seed 5 (exact false, both
    warnings), with the seed scan recorded.
- The manual `difficulty` suite: the "v3 reference" contract that MS07b left false is repaired (IR64). At C = 4 I
  found the historical certificates still hold:
  - every constructed puzzle is solved by its `solvableWith` set and stuck with its `notSolvableWith` set;
  - the three constructed Nightmare puzzles are solved through depth-1 `nishio` where their 5- and 6-link chains are
    now outside `forcingChain`;
  - they rate Hell 1 (2,704, 2,662 and 2,642), hardest `forcingChainLong`, matching `V3_EXPECTED` (Hell 1, not
    required). The quick `difficulty-floor` suite checks every `v3Expected` against the rater.

### 2.4 E, identities and counts (recomputed)

- **The 63-source identity is `d591e6f6...`, and `tech-chain.js` is the only changed source among the 63.** So the
  37 changed hashes, the two wires, the eight analyses and the help example all follow from the default alone.
- **GG:** the 104 ledgers carry `9d18d5c0...`, and the merge finds 520 of 520 against the fixture. Against HEAD, 37
  of 520 differ: classic9 Nightmare 18 (all but seeds 233 and 4181) and diagonalX Nightmare 19 (all but 2584). The
  Master keys (classic9 and Jigsaw 9) keep their hashes, although Master's oracle lost 5- and 6-link chains.
- **GR:** the 5 wire and 14 analysis ledgers carry `461933ba...` (the 63 sources and the four recorder files).
  - G10 and G13 changed among the wires.
  - Among the goldens, G03 and G14 changed only their score rows; G04 to G07, G10 and G13 come from changed digs (G04
    from position 23 on).
  - The superseded first recording has the same values as the final one in all 19 ledgers; only timings and the
    identity differ.
- **GH:** only `forcingChainLong` changed. The same discovered puzzle now gives a 6-link contradiction (above C).
- **Quick:** fingerprints Generator `1fa64d9d...` (163 files) and Player `ac24d3ed...` (130). All nine result files
  are `complete` and `sourceStable`: Generator 3,459 (+9 `difficulty-diagnostics`, +1 `techniques`), Player 1,750.
- **The pilot** is on `d591e6f6...` with the default (`chainWindow` null, `chainShortMax` 4). Both requests are in
  band and shallow:
  - request 0: 2 `forcingChain` and 5 `forcingChainLong` steps;
  - request 1: 3 and 7, plus 2 depth-1 `nishio`.

  Neither has a `nishioDeep` step.
- **The cost record** (`d591e6f6...`, fixtures `8cf28004...`) is complete: 7 of 7 cases, 140 finds, no mismatch,
  nothing capped, at most 10,039 of 50,000 units.
- **IR59:** no guard refusal in 221,824 solves of the six cells or in 18,306 solves of the pilot.

## 3. Findings

### IR62 — Minor — design section 6.7 still gives the C = 6 chain lengths

`generator/design.md:589-590`, the levels table ("Techniques that become available"):

- `master`: "W-Wing, Unique Rectangle, forcing chain (up to 6 links)"; it is now up to 4 links;
- `nightmare`: "long forcing chain (7 to 12 links), Nishio (depth 1)"; it is now 5 to 12 links.

Sections 6.6, 15.3 and 15.4, both developer guides and the Player design were updated; this table was not. The
brief asks for the design's selected-cutoff facts. **Fix:** "up to 4 links" and "5 to 12 links". `generator/design.md`
is an input of the Generator quick fingerprint, so the fingerprint changes. The orchestrator decides what to re-run,
as for IR57.

### IR63 — Minor — the notes do not record the two new reclassifications (R20)

R20 asks for every reclassification of a reference puzzle to be recorded in `docs/difficulty-v3/notes.md` by the task
that introduces it. The record must give the old and v3 labels and requiredness and the technique that causes it.

MS07c moves `constructed-nightmare-1` and `-3` from Nightmare, not required, to Hell 1, not required (scores 2,704 and
2,642). The cause is that their 5- and 6-link chains are `forcingChainLong` (1,400) at C = 4. The notes only list
"the three constructed Nightmare puzzles which are Hell 1" among the pins and refer to the evidence. Evidence section 5
has the labels and the cause but not the scores. MS07b's notes had a paragraph for `-2`.

**Fix (text only):** add a short reclassification paragraph to the MS07c notes. Optionally also note that `-2`, Hell 1
since MS07b, now scores 2,662 instead of 2,632.

### IR64 — Info — correction to my MS07b review (IR61, deviation 2)

I accepted MS07b's edits to the manual `difficulty` suite as matching the registry. They did not. The "v3 reference"
test still asserted that every constructed puzzle keeps the level of its label, with only `classic-medium` moved, and
that has been false for `constructed-nightmare-2` (Hell 1) since MS07b. I had checked only the certificate contract.

MS07c found the gap and repaired it correctly: the three Nightmare puzzles are named and the moved list has four
entries. The suite's first run is still MS07e's GD. No action is needed beyond this record.

### IR65 — Info — evidence wording

- Evidence section 1 says "five mutations detected". Section 2 lists four (M1, M2, M3, M5) and their combined run, and
  the combined run's counts were not kept as a transcript.
- The S-AV02/03/24 row says the 28 deep records "describe C = 6". Only MS07b's 14 Hell 1 records do. The 14 Nightmare
  records of MS05r5m predate the split: chains of up to 12 links were Master's `forcingChain`, and Nightmare's tier was
  the old `nishio` (depth up to 2). Call them pre-split history.
- The engine comment "36 exact hits in 72 Nightmare requests against 24 for 6" reads as 36 of 72. The result is 36 of
  36 against 24 of 36.

### IR66 — Info — rulings and handoffs

Deviations (evidence section 11):

1. **Chain statistics of both windows: accept.** R23 needs them after the split, and MS07b handed them over.
2. **The guard observer outside the soak: accept.** It is a read-only scratch module; it changes no argument, result,
   error or tool hash, it ran under both cutoffs alike, and its transcripts give the command actually run.
3. **IR60 at the setter: closes IR60.**
   - The soak is the only writer outside the tests, and it accepts exactly 4 or 6, stricter than the 1 to 11 I
     suggested.
   - The engine needs no check: `SHORT_MAX` is a plain property with no production writer.
   - The tests deliberately write 5, 12 and invalid values to prove the reader.
   - The brief allows only the default as a production change.
4. **The recorder layout change and the second GR recording: accept.**
   - It is coupled: the new long-ID keys made generated lines of 122 to 124 characters, against `replay-recorders`'
     120. Raising that limit would have weakened a test.
   - It is layout-only: the values are identical.
   - Because the recorder is part of the GR identity, recording again was the correct handling, and the first set is
     kept.
5. **Manual suite edited, not run: accept** (IR64). Its first run is MS07e's GD. Expect the certificate and
   v3-reference tests to pass, and the classic9 Hell 1 batch (at least 90 % exact of 20) to fail (S-AV25). Record it
   as a handoff, not as an S-AV item: it has no number.
6. **The boundary negative: accept.** It is T02's boundary case, and it adds the matching pattern-cost case.
7. **No pre-announcement:** as in MS07b; the lock is the mechanism.
8. **The Player design note:** accurate.
9. **The CI manifest:** information only.

**IR59: closed for what was measured.** That is 9x9 Nightmare at both cutoffs and classic9 Hell 1, with no refusal.
Large boards, where scans are longer, were not measured. Keep the guard in mind as a possible cause if their
availability moves; it is no item now.

**Named items:**

- S-AV08 at 683.7 s: accept.
- S-AV04, S-AV07, S-AV19 and the diagonalX Nightmare part of S-AV20: accept as window-cell or single-request numbers
  for MS07e to re-measure. S-AV20's Jigsaw 9 Expert part does not depend on C.
- S-AV22's two Nightmare losses (classic9 request 1, diagonalX request 6) and S-AV23's Jigsaw 9 Nightmare cost belong
  to the same seeds and cells. Both losses are exact at C = 4, and the Jigsaw 9 cell is 12 of 12 at a 142 ms median.
  Add both as window-cell numbers.
- S-AV25 and S-AV26 with the pilot: accept.

**The stale deep mega records can wait for MS18e:**

- MS18e already owns "run once after the final engine change" and refuses stale records. The S3 tasks will change the
  engine again, so a rerun now would only make another stale set.
- MS07d (the record merger) does not read them.
- MS07e's GQ runs the mega Nightmare and Hell 1 cells on the current source, as complete cells or as named
  cost-bounded items.
- Correctness at C = 4 is covered meanwhile by the quick one-attempt mega12 Nightmare and Hell 1 smokes and by GQ's
  per-request checks.
- What is needed is the labels: S-AV02, S-AV03 and S-AV24 are history on their own sources (IR65), and MS07e must not
  compare them as current.

**MS07e is not invalidated:**

- Its preconditions now hold. The cutoff is recorded, and R9's "GQ-first only with the selected default in force,
  without an override" is met once MS07c is committed. MS07e reads MS07c's pilot as its brief says.
- **The C = 4 cells are the final behaviour.** The source differs from `ddf2fa5a...` plus `--chain-window=4` only by the
  literal the override replaced, with the same tool. MS07e may use those cells, labelled with their identity, for its
  projections. An example is IR17's classic9 GD Nightmare margin: the classic9 cell's generation is now 2.1 s for 12
  requests.
- MS07e should know three side effects that the Nightmare-only experiment did not measure:
  - **Master** loses 5- and 6-link chains from its oracle and its tier. The 40 Master hashes did not move, but Master
    availability at C = 4 is first measured by GQ.
  - **Greater-Than Nightmare's CV6 margin** (19,192 of 20,000 ms at the restored source) was not measured at C = 4.
    MS07e's GD is its first measurement on this source. If it fails, it is a new named item attributed to this source,
    as the checklist says.
  - **Large-board Nightmare and Hell 1** are unmeasured at C = 4. GQ is their first current-source evidence.

## 4. Handoff

- **MS07d and MS07e:**
  - the default 4 and the selection note;
  - the pilot (GD 111.3 s, GQ 222.6 s) and the cost record;
  - the manual-suite expectations (IR66);
  - the three unmeasured side effects (IR66);
  - the C = 4 window cells as current-behaviour projection data.
- **MS18b:** repeats the rule with the same override; a different result goes to the owner.
- **MS18e:** the final-source deep mega population (28 occurrences).
- **Named items:**
  - S-AV08, S-AV04, S-AV07, S-AV19, S-AV20, S-AV25 and S-AV26 with MS07c's numbers;
  - S-AV22 and S-AV23 with the window-cell numbers (IR66);
  - S-AV02, S-AV03 and S-AV24 as history (IR65);
  - the inherited list is otherwise unchanged.
- **Current identities:**
  - 63 sources `d591e6f6...`; GG `9d18d5c0...`; GR `461933ba...`; soak tool `efff9dcd...`;
  - Generator quick `1fa64d9d...` (changes with IR62's fix) and Player quick `ac24d3ed...`.

MS07c REVIEW DONE
