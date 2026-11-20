# Rating v3: SA1's check of the final joint report (Sudoku)

Status: check, 2026-11-12 10:42-10:50, of `docs/difficulty-v3/report-detailed.md` (SA2's FINAL revision, 1,444
lines, answers at `1398dde` applied) and `docs/difficulty-v3/report-brief.md` (143 lines), against
`docs/difficulty-v3/clarifications.md`: every answer, "Part D: author's response", Part E and Part F (AC01, added
by the orchestrator). Read-only, except this file and, as allowed, SA1's signature line and one change-log row of
the report. No suite, gate or generation probe ran; small `git grep`/`Select-String` reads checked anchors and tool
options. "report:n" and "brief:n" are line numbers in those files, the report including SA1's change-log row
(report:35-37).

## 0. Summary

**Sign-off: signed subject to V1-V2.** Both are editorial (stale "verification pending" text and one line anchor);
no resolution, task, gate or decision changes. Applied exactly as written below, they need no re-check by SA1 and
the signature then reads "signed". AC01: agreed (§3); it goes to the plan author for a one-line confirmation.

## 1. What was checked

| Answer / item | Where in the report | Result |
|---|---|---|
| SA1-Q-S7 (a), SA2-Q-S02 (R2 A) | R2: derived `required` only from complete canonical ratings after S2.1; `certifyFloor` with the inherited budget only; cancellation/budget failures propagate; contradiction is an error (report:207-208); no `ensureFloor`, no `floor === undefined` fallback | applied |
| SA2-Q-S12 (c) (R5 C) | R5 (report:356-412): 64/128/256/none on the six cells; smallest finite cap with no exact-hit loss and a strict median reduction, else none; existing caps until measured | applied verbatim |
| SA2-Q-S03 / SA1-Q-S4, owner (R7 B) | R7 (report:474-519): one target through dig, `refineDown` (64-rating cap) and local search; raw-band uniform target; both positions; 17-cell before/after; hit loss reported to the owner; no post-exact polishing | applied |
| SA1-Q-S1, owner (R9 C); SA2-Q-S04 (b) | R9 (report:547-592): C=4 vs C=6, 36 requests per cutoff, tie 6, timeout/error a miss, per-variant report, fixed-board evidence only, MS18 recheck stops before GQ-final; `nishioDeep` minimum 2, default maximum 2, explicit 3; overrides only narrow | applied |
| SA2-Q-S08 (R10 costs B); SA2-Q-S05 (a) | report:628-641: the 14 base costs equal the answer; group `chain`; no global raw-cost assertion. report:648-673: the six starting limits, one evidenced own-limit change, frozen with v3 after MS17 | applied |
| SA2-Q-S10 (a) (R20 A), SA2-Q-S11 (a), SA2-Q-S09 (a) | R20 (v2 labels kept, `v3Expected`, reclassifications in `notes.md`); R21 (curated real examples, stop/report); R17 (no `cageLocked`, new quick `core/tests/suites/tech-cage.test.js`) | applied |
| AUTH-S1 (a) (R24 A), SA1-Q-S5 (a) | R24 and the GQ rows of §6: checkpoints only under `docs/difficulty-v3/`; MS18 copies v2 to `docs/difficulty-v3/qualification-v2.md`, then updates the live table; dropped levels in `notes.md` with hits (report:1115) | applied |
| SA2-Q-S07 / SA1-Q-S6 (a) | R22 (report:975-1008): `RATING_VERSION` 3, cache `SCHEMA_VERSION` 3, history store `VERSION = 1` kept, `ratingVersion` in `STORED_FIELDS`, `validEntry` unchanged, two strings per language, no exported certificate | applied |
| SA2-Q-S01, SA1-Q-S2, SA2-Q-S06 / SA1-Q-S3 (all a) | R1 (vacuous veryEasy, `floorLevel: null`), R3 (singles-only Easy is shallow), R4 (both warnings, `tune.shallow`) | applied |
| AUTH-S2 (a), PROC-S1 (a) | §5.2 order MS01, MS02, MS04, MS03, MS05-MS07, MS08-MS16, MS17, MS18 = baseline/tooling, S2.1, S1.1, S1.2, S2.2, S3, S2.3; GQ-first in MS07 (no support change), GQ-final in MS18 | applied |
| Part D, items 1-16 | §4 table D1-D16; item 13 superseded by SA2-Q-S12 (c) | applied |

Further checks, all passed:

- No `PENDING` in either file (case-sensitive search). Each decided item has one "Alternatives not chosen" line and
  no unchosen contract remains active. R17's fallback suite file is an implementation fallback, not a design branch.
- Model: the 26 HEAD IDs and the 14 new IDs, in ladder order with the R8, R9 and R11-R19 orders, have non-decreasing
  weights (HEAD orders from the `core/js/engine/tech-*.js` registrations, weights from
  `generator/js/engine/difficulty.js:71-98`); 6 scoped plus 34 unscoped IDs make 40.
- Gates: every option used in §6 exists (`generator/tests/soak.js:8-9,52-87`; `generator/tests/qualify.js:9,67-94`;
  `generator/tests/perf.js:7,50-55,72-80`; `replay-fixtures.js --check`); `--suite=difficulty` runs a manual suite
  by name (`generator/tests/node-runner.js:14,127,271`). New suites are discovered automatically (`node-runner.js:105`,
  `player/tests/node-runner.js:69`), and the CI "rest" shard runs them without editing
  `.github/scripts/generator-suites.sh`. All 17 GS cells are offered at HEAD, so GS-before needs no
  `--include-unsupported`. 135 = 15 variants x 9 levels. Request counts 204/288/72 and the effort sum 59-92 add up.
- Anchors re-read and correct: `difficulty.js:58,214-222,239-268`; `digger.js:630-641,1100-1147,1667-1739`;
  `history.js:19,21,92-98,100-103,153-156`; `cache.js:47,277-284`; `soak.js:147-154`; `tech-chain.js:380-385`;
  `tech-cage.js:118-139,173-191`; `generator/tests.html:129`; `player/tests.html:135`;
  `manual/difficulty.test.js:759-767,1316`; `replay.test.js:1601`. One exception: V2.
- Brief against report: formula, exactness, warnings, target, 40 IDs, orders 44/46/137/198, cutoff 4 or 6 with long
  ending at 12, Nishio depths, versions, findings (Hard 24/24 required and 3/24 top quarter; Expert 9/12 and 812.5 =
  1.25 x xyWing 650, the lowest weight of Expert's tier {xyWing, xyzWing}; Nightmare 0/12 and 2/12), quick baseline,
  decisions and who decided (Part E), task/gate table, 135 cells with four workers and effort all match. Only V1
  differs.

## 2. Required changes (editorial)

**V1. Status text still says SA1's verification is pending.** Fixes, after this check:

- report:6, Authors row: replace "Verification of this answers-applied revision is pending." with "SA1 verified this
  answers-applied revision (`claude-opus-5.5/5-check-of-final-report.md`)."
- brief:8, State: replace "SA2 signed, SA1's verification of this revision is pending." with "Signed by both
  analysts (SA1's check: `claude-opus-5.5/5-check-of-final-report.md`)."
- brief:5, Date: end time "10:29" becomes the time of the last edit; after brief:80 add the timeline row
  "| 10:42-10:50 | SA1 verified the final report and brief: signed, two editorial corrections (V1-V2); AC01 agreed. |".
- brief:140, Documents: "SA1's independent report, cross-review, response and joint-draft check" becomes "SA1's
  independent report, cross-review, response, joint-draft check and final-report check".
- report §10, SA1 row: "signed subject to V1-V2" (written by SA1 now) becomes "signed" once V1-V2 are applied.

**V2. R7 anchor.** report:514: replace `generator/js/engine/digger.js:1344-1352` with
`generator/js/engine/digger.js:1342-1347`. The early return is the `if (rating.score >= spec.max)` block that calls
`refineDown` and returns (1342-1347); lines 1348-1352 already start the dig set-up (`SG.symmetry.groups`).

## 3. Position on AC01

**Agree, as proposed in Part F.** It qualifies wording and reporting only; the owner's R7 branch B, the raw-band
target, the first-exact stop, caps, weights and budgets are unchanged. Evidence for its two points:

1. The bound is valid for the unrounded score of every in-band required rating, and only for that score. An
   in-band rating cannot use a technique above the level's allowed set (`spec` allows a technique only if
   1.25 w < max, `difficulty.js:347`), so a required one uses a tier technique; `outranks` takes the largest weight
   (`difficulty.js:214-222`), so P >= w_min; W >= P gives a work term >= 0.25 P (`difficulty.js:244`). Hence
   unrounded >= V + 1.25 w_min. The published score is `Math.round(unrounded)` (`difficulty.js:269`): an exact puzzle
   can sit up to 0.5 below the bound (a small negative attainable position), and a shallow in-band puzzle need not
   use a tier technique at all. R23 reports both unclamped and keeps the exact and all-in-band cohorts apart.
2. With the first-exact stops (`digger.js:1687,1712`), the 64-rating refinement cap (`digger.js:633`) and the
   attempt caps (`digger.js:630-641`), the search cannot certify a minimum; it returns the first exact result it
   reaches, steered toward the target within each stage. "Steering toward the lowest scores reached" is the
   implementable reading of "simply selects the lowest attainable puzzle".

**For the plan author:** confirm AC01 in Part F (one line, "accepted as proposed"). A literal global minimum would
need a new search and stop policy against the approved caps; that would be an owner decision, not an edit here.

## 4. Non-blocking notes

- **N1.** report:1337-1338 and brief:121: the "about 25 minutes" is the v2 record's 1,531 s "in total" for the
  first 40 requests of every level (`docs/difficulty-rating/qualification.md:72`); the record does not say how that
  relates to wall time with `--jobs` workers, and second rounds add requests. Cite that source rather than "SA1's
  planning estimate". "Two minutes and 25-30 seconds" reads more clearly as "about 111-112 s (Generator) and
  25-30 s (Player)".
- **N2.** brief:122-123 claims no usage total; the Pentomino brief (same orchestration) gives the usage measured at
  10:38 for both repositories. Cite the same figures or keep the statement; either is consistent if stated.
