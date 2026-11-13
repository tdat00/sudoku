# Sudoku difficulty-v3 — cross-check of the resume revision

| Field | Value |
|---|---|
| Date | 2026-11-13, 21:20 (+07:00) |
| Reviewer | SA1, claude-opus-5.5 |
| Author reviewed | SA2, gpt-6-astra |
| Basis | The plan author's answers to PR-S1 and CV6-03 and the owner decision S-OD4 (commit `c9935cd`, now in [`clarifications-resolved.md`](../clarifications-resolved.md)); SA1's CV6-03 cross-check, conditions (i)-(iii); SA2's [resume analysis](../gpt-6-astra/8-resume-analysis.md), section 7 |
| Code examined | `c9935cd` (HEAD, equal to `origin/rating-v3`) with SA2's uncommitted revision: 50 modified files, the untracked MS05r5p, MS05r5m and MS05r6c, and the resume analysis. The reviewed files were last written between 19:39 and 20:14 and did not change during the review |
| Runs | Read-only `git` commands and file reads. No test, generation, landscape or timing run |
| Changes made | This file only. No task, check-list, record, code or evidence was edited; nothing was staged or committed |
| Result | 1 Blocking (RS01, MS05r5p), 1 Major (RS02), 7 Minor (RS03-RS09). MS05r5p can be dispatched once RS01 is fixed |

## 1. Scope and method

Paths are repository-relative. Task files are in [`tasks/difficulty-v3/`](../../../tasks/difficulty-v3/).
Line numbers are those of the reviewed working-tree files; code lines are at `c9935cd`.

1. Record and dispatch consistency: both clarifications files; check-list sections 1, 2, 4 and 7; the
   routing sections of MS05b1, MS05b2, MS05c, MS05d and MS05r6.
2. In full: MS05r5p, MS05r5, MS05r5m, MS05b3, MS05r6a, MS05r6b, MS05r6c and MS05e, against the CV6-03
   answer ((c1), (c2), sub-questions (1)-(3) and the order) and against the code.
3. The semantic instructions of MS06b, MS06c1, MS06c2, MS07a, MS07b, MS07c, MS08a (as the template),
   MS13a, MS13b, MS13c, MS15a, MS17b and MS18c, and the process wiring of MS07e, MS18d and MS18e.

MS05r5p and the check-list rules were checked first.

## 2. What holds

**Records.** PR-S1 and CV6-03 are in `clarifications-resolved.md` (lines 861 and 943) with the same ids,
byte-equal to the `c9935cd` text after newline normalization, and are no longer in `clarifications.md`.
The S-OD register lists S-OD4.

**Check-list.** Section 1 lists MS05r5p, MS05r5, MS05r5m, MS05b3, MS05r6a, MS05r6b and MS05r6c with the
prerequisites of the answer's order (lines 56-63 and 125). Section 2's S-OD4 protocol (lines 226-267) has the
answer's stop rule (correctness, evidence corruption or a change to a recorded decision), the item routing
(MS07e, then MS18c/MS18d) and the review list, and keeps the 540-second ceiling. The combined commit subject
and the body sentence about `a7f6660` agree in check-list lines 313 and 315, MS05r6, MS05r6b and MS05r6c.
Section 4 records S-OD4. Section 7's `Invoke-Dv3Node` and the gate rows for the size diagnostics (line 657),
the mega contract (658) and the CI tiers (663) match the tasks. The routing sections of MS05b1, MS05b2,
MS05c, MS05d and MS05r6 point to the new steps.

**Recovery files against the answer.**

- (c2): MS05r5p defines 8/4/2 for at most 81, 82-144 and over 144 cells, once, on `SG.digger`, used by the
  pipeline, the direct digger and the store. T01-T05 cover every test the answer requires (boundaries
  81/82/144/145; pipeline and digger agree; an explicit 8 on mega16 runs 8; the store migration; mega12
  shallow after exactly 4 attempts with both warnings; qualifier and soak on the default) and T06 the
  documents. The anchors hold: `pipeline.js:26,73,360`, `digger.js:624,653,1807,1999`, the eight `store.js`
  lines, `controls.js:201-209`, `recovery-profile.test.js:221-233`, `soak.js:388-403`, `qualify.js:143-173`.
  The three diagnostics (G13 samurai Nightmare seed 42; mega12 and mega16 Nightmare seed 3; `--shallow-cap=256`)
  use the existing driver correctly: it writes a record and exits 0 for a failed generation too
  (`tests/difficulty-recovery.js:26`), refuses an existing file (`:117`), creates the folder (`:143`) and
  keeps its 500000 ms budget below the helper's 540 s. Every suite the task names exists.
- (c1): MS18c decides every offer on the final qualification with 36/40 or 90/100 hits and a p95 inside
  `qualify.js` `budgetOf` (2/10/30 s, lines 127-130). A fallback or a timeout is a miss. No task prunes a
  level early or raises a browser budget.
- Sub-question (1): MS05b3 reuses r5m's deep records with CV3's own per-puzzle checks, and a request over
  240 s is a named item for MS07e/MS18c. MS07b applies the same rule to mega hell1.
- Sub-question (2): MS05r6c is inside the combined commit and raises no `SG_TIME_FACTOR` or timeout. Each
  later suite-adding task owns its CI group, and MS18e owns the v3 pull request's CI (check-list lines 202
  and 404).
- Sub-question (3): the order r5p, r5, r5m, b3, r6a (G13 persistence first, then the final-source recheck,
  then the complete E: 5 wires, 14 analyses, 520 keys), r6b, r6c, the combined commit, then MS05e, holds
  in every file.
- SA1's conditions for the deep tier hold in MS05r5m: (i) a tool, not a `*.test.js` suite; (ii) one request
  per locked run with the 500 s budget, keyed by request identity, reconciled by r6b and reused by b3;
  (iii) quick keeps a real one-attempt mega12 Nightmare request and a scripted mega16 stop control.

**Semantics and wiring.** MS07c's pilot now uses exact shards (`--from=0 --count=2 --total-count=2`) and its
`soak.js` anchors hold (`parseArgs` at 127; overrides after source loading at 273-295). MS07b's
`techniques.test.js:45-56`, and MS08a's `techniques.test.js:91-107` and `tech-fish.js:56-125,281-305`, hold.
MS17b checks the raw wire before `fromWire`, which coerces `exact` (`pipeline.js:335`). MS18c's (c1) matches
the answer. MS07e carries the Killer Hard/Expert question and the quick-set proposal; MS18d and MS18e take
the routed items. MS06b, MS06c1, MS06c2, MS07a, MS13a-c and MS15a changed in their resume rules, anchors
(all checked at HEAD) and directly coupled references: five wires in MS06c1's GR, r3's local-search
accounting kept in MS06c2, and no `explain` suite (none exists at HEAD). Their semantics are unchanged and
agree with S-OD4.

## 3. Findings

| Id | Severity | File:line | Summary |
|---|---|---|---|
| RS01 | Blocking (MS05r5p) | `MS05r5p-size-dependent-default-attempts.md:62-75,85-87,119` | Replays of a recorded recipe and the default/explicit intent are not specified |
| RS02 | Major | `MS07c-select-chain-cutoff.md:45-46` | The shard-merge rule lost its words |
| RS03 | Minor | `MS05r5p-size-dependent-default-attempts.md:134-141` | The focused commands omit `difficulty-diagnostics` (and the RS01 suites) |
| RS04 | Minor | `MS05r5p-size-dependent-default-attempts.md:90-91` | Three `design.md` places with the default 8 or the stored shape are not named |
| RS05 | Minor | `MS05r6a-final-evidence-and-pins.md:51` | "G14 is unchanged" reads as an unchanged analysis |
| RS06 | Minor | `MS05r6a-final-evidence-and-pins.md:59-61` | The G13 wire-branch check cannot pass in A0 |
| RS07 | Minor | `MS05b3-bounded-manual-corpora.md:85-86` | The anchor `variants.test.js:486-491` misses the checked lines |
| RS08 | Minor | `MS16-sue-de-coq.md:96`, `MS17b-version-cache-and-freeze.md:120`, `MS18e-release-evidence-closure.md:179` | Stale "Ten-minute command ceiling" |
| RS09 | Minor | `MS18c-qualify-and-publish-offers.md:101`, `check-list.md:426` | Whitespace artifacts |

### RS01 — Blocking for MS05r5p: replays and the attempts intent

The store section (lines 62-75) defines default mode, explicit settings, the legacy migration and the URL,
but not the paths that replay a recorded recipe. A result's `config.maxAttempts` is the number the pipeline
resolved (`pipeline.js:73,246`), and history stores that number (`history.js:77`). Then:

- history restore (`history.js:105-117,308`) and the stale-cache regeneration (`cache.js:977-1000`) call
  `app.generate(overrides)`, which applies them with `store.set(overrides, { source: 'app' })` and then
  generates from the store (`app.js:867-874`). These are the only callers that pass overrides; the controls
  use `source: 'controls'` (`controls.js:799`);
- export regenerates the history entries it exports from
  `toConfig(Object.assign(defaults(), overridesOf(entry)))` (`export.js:790-793`), without the store.

Each of the two obvious representations breaks a recorded contract:

- "A number is explicit, null is default": one restore of any classic9 puzzle makes 8 explicit, and the next
  mega16, samurai or sohei request runs 8 attempts again. One click undoes (c2)'s bound.
- "A number plus an explicit flag": the recorded 8 of an older mega16 entry meets the default-mode flag of
  `defaults()` or of the store, so restore and export regenerate with 2 and silently give another puzzle.
  That breaks line 69 ("Do not migrate history recipes, exported puzzles") and the entry contract "The store
  state that rebuilds the entry's puzzle" (`history.js:105`).

T04 tests neither path, so the developer would have to choose. This is not an owner question: the rule below
follows from (c2) ("the store default follows the selected variant; explicit values win") and from the
recipe contract.

Proposed fix: add a fifth bullet to the store section, with the tests and ownership it needs.

- A replay generates with its recorded number, so every recipe reproduces its puzzle; an older large-board
  entry with 8 runs 8.
- After a store replay (`source: 'app'`), a recorded number equal to the replayed variant's size default
  leaves the intent unchanged: default mode stays default, and an explicit setting stays explicit with that
  number. Any other number becomes explicit, as today.
- `toConfig` over `defaults()` plus a numeric `maxAttempts` uses that number (the export path).
- T04 adds: in default mode, restore a classic9 entry, then switch to mega16: the effective value is 2.
  Restore and export an older mega16 entry with 8: both generate with 8; after the restore the control
  shows an explicit 8.
  A replay never turns an explicit setting into default mode.
- Add the `history` and `export` suites (and `cache` if touched) to the owned tests (lines 85-87) and to the
  focused commands. If the rule cannot stay inside `store.js`, add the touched UI file to the ownership list
  (line 84) and to check-list row 180.

### RS02 — Major: MS07c's shard-merge rule

Lines 45-46 read "Record the effective cutoff and explicit override/null in diagnostic configuration so
shard", followed by " Existing `--from/--total-count` and absolute tags remain unchanged." The revision
deleted the words "merges cannot mix C=4 with C=6." (they are in the HEAD text) and left a leading space.
The rule protects the selection evidence of the cutoff, so it must be readable before MS07c is dispatched.

Fix: restore "... in diagnostic configuration so shard merges cannot mix C=4 with C=6. Existing
`--from/--total-count` and absolute tags remain unchanged." without the leading space.

### RS03 — Minor: MS05r5p's focused commands

T05 requires the qualifier and both soak routes to keep using the default. Their fake-worker and hit tests
are in the quick suite `difficulty-diagnostics`. The block at lines 134-139 names only the manual
`difficulty` suite with `--filter=qualification:`, and line 141 says only "diagnostic cases".

Fix: add `Invoke-Dv3Node -Task MS05r5p -NodeArgs @('tests\node-runner.js','--suite=difficulty-diagnostics')`.
With RS01, add a line for each changed suite among `history`, `export`, `cache`, `worker` and `digger`;
use `--filter=MS05r5p-` where a whole suite would exceed the 450-second projection.

### RS04 — Minor: MS05r5p's documents

Line 90 names `design.md`'s pipeline options and section 6.8. Three other places state the old default or
the stored shape: section 10.4's control table (`generator/design.md:1309`, default 8), section 14.2's URL
table (`:1844`, "default 8") and section 14.3's `sg.lastConfig.v1` shape (`:1861`), which gains the intent
marker. Fix: name sections 10.4, 14.2 and 14.3 on line 90.

### RS05 — Minor: "G14 is unchanged"

G14 (mega16 hell2, seed 12) has no `maxAttempts` in its request (`replay-goldens.js:433`). It is regenerated
with mega16's new default of 2, and its B.2 analysis may change. Fix: "G14's request and its analysis-only
status are unchanged; it now uses the two-attempt default, so its B.2 analysis may change and is reviewed
with the others."

### RS06 — Minor: A0's G13 wire-branch check

Lines 59-61 ask A0 to verify with a spy that G13 takes the `WIRE[id]` branch, and to exercise the real saved
wire. That wire exists only after B.1 writes the G09-G13 fixture, and A0 comes before any final-source
recording. Fix: "Write this test in A0; it must pass after B.1 publishes the five-wire fixture and before
B.2 starts."

### RS07 — Minor: MS05b3's anchor

`variants.test.js:486-491` (line 86) covers only the fake definition. The corpus fill, the floor change and
the CV4 expectation are at 493-497, inside `it('has teeth: ...')` at 472-499. Fix: cite
`generator/tests/manual/variants.test.js:487-498`.

### RS08 — Minor: the ten-minute ceiling

MS16:96, MS17b:120 and MS18e:179 still say "Ten-minute command ceiling." Check-list section 2 (lines
228-230) and section 7 keep a 540-second process ceiling, and the resume sections of the same files say
<=540 s (MS16:108, MS17b:132, MS18e:197). Fix: replace the sentence with "540-second process ceiling
(check-list section 7)." MS16 is outside the analysts' review list; the orchestrator can apply it with the
others.

### RS09 — Minor: whitespace

MS18c:101 has "This       audit does not" and check-list.md:426 has "result.   Recovery's". Fix: single
spaces.

## 4. Result

MS05r5p can be dispatched after RS01 is fixed. No other finding blocks it, and the check-list rules it
relies on (section 2's S-OD4 protocol, section 7's helper and gate rows) are consistent. RS02 must be fixed
before MS07c is dispatched. The Minor findings can be fixed in the same pass. After SA2's fix, only the RS01
text, MS05r5p's ownership list and its command block need a re-check.

SUDOKU CROSS-CHECK DONE: 1 blocking, 1 major, 7 minor
