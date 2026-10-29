# Golden acceptance data — Generation Steps

- **Researcher:** gpt-6-astra.
- **Date:** 2026-10-28.
- **Code:** `8d9510aade5d99f4fec9fda3835245a31f411ede`.
- **Scope:** Phase 4 research data, not an application implementation.
  Only this new report is written in the repository.
- **Decisions applied:** 13:54, 15:30 and 16:20; documentation paths follow 15:58.
- **Experiments:** `E\…` means **my experiment folder (not part of the repository)**.
- **Evidence:** `E\acceptance-data.json`, `E\acceptance-controls.json`, `E\acceptance-killer-search.json`;
  per-request records are `E\acceptance-G01.data.json` through `E\acceptance-G14.data.json`.

## 0. What these data establish

All **14 requests were freshly generated**, then analyzed without changing their results.
All **14 deterministic payloads matched the previously recorded results**, including configuration, model,
givens, solution, rating and dig log. Analysis left all 14 payloads unchanged.

| Measure | Result |
|---|---:|
| Current replay screens / screens missing numerical tables | **338 / 129** |
| Proposed compact screens / numeric tables | **101 / 101** |
| Proposed details screens / numeric tables | **814 / 814** |
| Compact / details decreases | **0 / 41** |
| Compact Q4 jumps / justified culprit frames | **13 / 5** |
| Current UI rating-budget errors in this run | **0** |
| Proper partial-board diagnostic ratings | **30** |
| Largest rating work count | **113177** |

Generation took **24580.875 ms** in aggregate; generation plus current/revised replay checks took **26781.532 ms**.
These are shared-host Node observations, not browser deadlines.
The original **35-request** pool still produces the selected **243-screen** compact policy.
The fourteen requests below are a coverage subset, not a new difficulty qualification.

No rebuilt Killer log was found: **0/7** previously saved Killer cases and **0/8** additional bounded searches.
The actual log-shape detector and a separately labelled synthetic positive control are specified below.
No application quick, heavy or browser test was run.
The user's implementation-stage task-pack, branch and final-validation decisions
are not executed in this research phase.

## 1. Exact requests and reading conventions

### 1.1 Request contract

Every golden request has these common fields, with **no other override**:

```js
{
  symbolMode: 'digits',
  symmetry: 'rotational180',
  digOrder: 'random',
  maxAttempts: 8,
  variantOptions: {}
}
```

Each G01–G14 header supplies the remaining **`variantId`, `difficulty`, `seed`**.
Together these are the exact object returned by `SG.store.toConfig`.
The store's seed input is the decimal string of the listed seed; the returned request contains its numeric value.
The request omits `trace`; the unchanged pipeline normalizes it to **`trace: 'summary'`**.
UI-only defaults, such as language/theme, are not generation-request fields.
Source: `generator/js/ui/store.js`; `generator/tests/node-runner.js` loads the public functions used here.

### 1.2 Indices, titles and flags

- **#** is the 1-based displayed compact step.
- **m** is the 0-based **normalized construction position**, with m=0 the filled solution.
  It is **not** the empty pre-generation player position 0.
- Details include the filled solution, applicable structure screen, every complete normalized change,
  and the separate final verification. The last equal score is intentional.
- **E** counts empty global logical cells, once per cell, including multigrid overlaps.
- **Δ** is the current rounded score minus the preceding displayed score.
- **J=Y** means `before > 0 && after >= 3 * before && after - before >= 100`.
- **Line=F** means “First rated puzzle” plus the hardest-technique line, without a multiplier.
- **Line=N** is the standalone new-hardest-technique line below the jump threshold:
  the endpoint's hardest technique was not used in the preceding displayed proof.
- **Line=—** means no additional standalone line. A J=Y callout already names its new hardest technique;
  it must not duplicate that text as another visible paragraph.
- **Culprit=—** forbids a score-cause frame/legend. Ordinary removed/restored-cell marks are separate.
  Sign indices are 0-based indices in the **original recorded sign list**, not the shrinking live-sign array.
- Formula terms below are printed to at most **6 decimal places**. Tests use exact integer scores/counts
  and a **0.000001** tolerance for these printed floating-point terms.

Phase codes and English title roles are below. Implemented visible strings must use bilingual `SG.i18n.t()` keys;
these roles are not a new public API or an instruction to hard-code English.

| Code | Phase | Title role |
|---|---|---|
| S/Sol | setup | Build the solution |
| S/Cag | setup | Build cages |
| S/Sig | setup | Build signs |
| D/Dig | random | Remove clues |
| G/Choose | guided | Choose clue removals |
| X/Adjust | search | Remove and/or restore clues |
| A/Restore | reveal | Restore clues |
| C/Clues | clues | Reveal initial clues |
| I/Signs | signs | Remove inequality signs |
| IM/Signs | signsMinimal | Remove redundant signs |
| multiple/Mixed | ordered constituent phases | Combined changes, naming the constituent operations |
| S/Restart | restart | Starting again |
| F/Final | final | Finished puzzle |

For example, `G+A/Mixed` includes guided removals and clue restoration, not merely the last reveal.

### 1.3 Fixed analysis policy

The prototype uses the **phase-preserving 243-screen policy** from
[the response](3-response-to-review.md), now with the selected explicit “Starting again” screen.
It preserves complete groups and complete combined removal/restoration changes, rates their endpoints,
uses zero compact drop tolerance, protects every eligible phase end and audits displayed jumps.
A numerical score is never interpolated or copied just because two totals match.

Canonical ratings use **1,000,000 checks**. Independent uniqueness validation uses **200,000 checks**.
The existing final rating is reused; the final position's givens and inequalities must match the result.
All actual positions in these fourteen cases were unique and completely rateable.
Unscorable/guard/restart behavior is covered separately, not fabricated as an occurrence in this corpus.

For the uniquely supported cause frame, the reviewed diagnostic policy is made explicit:

1. A one-sign or one-cell complete move has that single cause.
2. For one complete change of 2–4 cells, rate every proper nonempty subset privately.
3. If any probe is ambiguous, incomplete or guarded, show no culprit frame.
4. For a singleton score `s`, use the fraction
   `max(0, log(s / before) / log(after / before))` of the displayed logarithmic rise.
5. Frame a cell only when **exactly one** singleton reaches **0.9** or more.
   If every singleton is at most **0.1**, describe the joint effect; intermediate cases get factual partial scores.
6. For a several-move compact interval, these goldens certify no unique culprit and therefore no frame.

The 0.9/0.1 thresholds classify explanatory evidence, **not** difficulty or the Q4 badge.
They do not prove a clue or named technique mathematically indispensable.
Partial boards never enter either replay timeline. A cause frame uses a distinct legend entry and never
draws the later proof pattern on the clue board.

The generator-choice comparison is scoped to the logged generator **check**, not an unrestricted hypothetical score.
It binds to the exact accept-log offset; numeric maxima exclude unscored alternatives.
`chosen: null` means the limited check did not finish, **not score 0 and not a UI timeout**.
When the displayed interval is not a single comparable guided choice, say the comparison is unavailable.

First-use ordinals below are **1-based deductions in the endpoint's logical solution**, not generation-step numbers.
In particular, the example's Simple Colouring first appears at
**32/47**, which is array index **31**; do not describe index 31 as the 31st logical step.

## G01 — classic9, expert, seed 3275974478

Exact request: common fields + `{ variantId: 'classic9', difficulty: 'expert', seed: 3275974478 }`.

Current replay: **21 steps; 10 missing numerical tables**. New: **7 compact / 33 details**.
Board: **81** logical cells; **0** cages; signs **0 → 0**. Log: **normal**.

| # | m | Phase/title | E | Score | Δ | Hardest | J | Culprit | Line |
|---:|---:|---|---:|---:|---:|---|---|---|---|
| 1 | 0 | S/Sol | 0 | 0 | 0 | — | — | — | — |
| 2 | 7 | D/Dig | 14 | 23 | +23 | nakedSingle | — | — | F |
| 3 | 22 | D/Dig | 43 | 44 | +21 | nakedSingle | — | — | — |
| 4 | 23 | G/Choose | 45 | 551 | +507 | simpleColouring | Y | R1C2 | — |
| 5 | 26 | G/Choose | 51 | 568 | +17 | simpleColouring | — | — | — |
| 6 | 31 | X/Adjust | 51 | 992 | +424 | xyzWing | — | — | N |
| 7 | 31 | F/Final | 51 | 992 | 0 | xyzWing | — | — | — |

**Details scores, in display order:**

```text
0, 5, 9, 12, 15, 18, 20, 23, 25, 27, 28, 30, 31, 33, 34, 36, 37, 38, 40, 41, 42, 43, 44, 551, 557, 567, 568,
568, 568, 568, 568, 992, 992
```

### Jump at compact step 4: 44 → 551

| State | P | W | R | V | E | Level |
|---|---:|---:|---:|---:|---:|---|
| before | 1 | 43 | 1.364858 | 41.445783 | 43 | veryEasy |
| after | 360 | 768.25 | 148.321617 | 42.352941 | 45 | hard |

- Generator-check comparison: chosen **551**; other scored **9**, other unscored **0**;
  numerical maximum **45**. Accept log index **42**.
- Singleton diagnostics: remove R1C2 → **550**; remove R9C8 → **44**.
- Cause class: **single-culprit**; board frame: **R1C2**.
- First-use folded text: **32/47** (zero-based index **31**), `simpleColouring`:
  remove candidate 3@R5C2, 3@R8C3.
- Existing finding text key: `technique.simpleColouring.step`;
  format its original `i18nArgs` via `SG.i18n.t()`.

## G02 — classic9, veryEasy, seed 1

Exact request: common fields + `{ variantId: 'classic9', difficulty: 'veryEasy', seed: 1 }`.

Current replay: **7 steps; 1 missing numerical table**. New: **5 compact / 23 details**.
Board: **81** logical cells; **0** cages; signs **0 → 0**. Log: **normal**.

| # | m | Phase/title | E | Score | Δ | Hardest | J | Culprit | Line |
|---:|---:|---|---:|---:|---:|---|---|---|---|
| 1 | 0 | S/Sol | 0 | 0 | 0 | — | — | — | — |
| 2 | 4 | D/Dig | 8 | 15 | +15 | nakedSingle | — | — | F |
| 3 | 8 | D/Dig | 16 | 25 | +10 | nakedSingle | — | — | — |
| 4 | 21 | D/Dig | 41 | 43 | +18 | nakedSingle | — | — | — |
| 5 | 21 | F/Final | 41 | 43 | 0 | nakedSingle | — | — | — |

**Details scores, in display order:**

```text
0, 5, 9, 12, 15, 18, 20, 23, 25, 27, 29, 31, 32, 34, 35, 37, 38, 39, 40, 41, 42, 43, 43
```

No Q4 jump callout in this compact view.

## G03 — classic9, nightmare, seed 42

Exact request: common fields + `{ variantId: 'classic9', difficulty: 'nightmare', seed: 42 }`.

Current replay: **12 steps; 1 missing numerical table**. New: **6 compact / 29 details**.
Board: **81** logical cells; **0** cages; signs **0 → 0**. Log: **normal**.

| # | m | Phase/title | E | Score | Δ | Hardest | J | Culprit | Line |
|---:|---:|---|---:|---:|---:|---|---|---|---|
| 1 | 0 | S/Sol | 0 | 0 | 0 | — | — | — | — |
| 2 | 8 | D/Dig | 16 | 25 | +25 | nakedSingle | — | — | F |
| 3 | 22 | D/Dig | 43 | 44 | +19 | nakedSingle | — | — | — |
| 4 | 23 | G/Choose | 45 | 870 | +826 | xyWing | Y | — | — |
| 5 | 27 | G/Choose | 53 | 1572 | +702 | forcingChain | — | — | N |
| 6 | 27 | F/Final | 53 | 1572 | 0 | forcingChain | — | — | — |

**Details scores, in display order:**

```text
0, 5, 9, 12, 15, 18, 20, 23, 25, 27, 28, 30, 31, 33, 34, 36, 37, 38, 40, 41, 42, 43, 44, 870, 1234, 1570,
1571, 1572, 1572
```

### Jump at compact step 4: 44 → 870

| State | P | W | R | V | E | Level |
|---|---:|---:|---:|---:|---:|---|
| before | 1 | 43 | 1.364858 | 41.445783 | 43 | veryEasy |
| after | 650 | 737.25 | 177.728879 | 42.352941 | 45 | expert |

- Generator-check comparison: chosen **870**; other scored **11**, other unscored **0**;
  numerical maximum **45**. Accept log index **43**.
- Singleton diagnostics: remove R2C3 → **45**; remove R8C7 → **44**.
- Cause class: **together**; board frame: **—**.
- First-use folded text: **17/47** (zero-based index **16**), `xyWing`: remove candidate 9@R9C9.
- Existing finding text key: `technique.xyWing.step`; format its original `i18nArgs` via `SG.i18n.t()`.

## G04 — classic9, hell1, seed 2400651925

Exact request: common fields + `{ variantId: 'classic9', difficulty: 'hell1', seed: 2400651925 }`.

Current replay: **39 steps; 19 missing numerical tables**. New: **7 compact / 43 details**.
Board: **81** logical cells; **0** cages; signs **0 → 0**. Log: **normal**.

| # | m | Phase/title | E | Score | Δ | Hardest | J | Culprit | Line |
|---:|---:|---|---:|---:|---:|---|---|---|---|
| 1 | 0 | S/Sol | 0 | 0 | 0 | — | — | — | — |
| 2 | 9 | D/Dig | 18 | 27 | +27 | nakedSingle | — | — | F |
| 3 | 22 | D/Dig | 43 | 44 | +17 | nakedSingle | — | — | — |
| 4 | 25 | G/Choose | 49 | 47 | +3 | hiddenSingleBox | — | — | N |
| 5 | 26 | G/Choose | 51 | 1206 | +1159 | wWing | Y | R6C5 | — |
| 6 | 41 | X/Adjust | 52 | 2879 | +1673 | nishio | — | — | N |
| 7 | 41 | F/Final | 52 | 2879 | 0 | nishio | — | — | — |

**Details scores, in display order:**

```text
0, 5, 9, 12, 15, 18, 20, 23, 25, 27, 29, 31, 32, 34, 35, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 1206,
1206, 1206, 1964, 1964, 1964, 1964, 1964, 1964, 1964, 1964, 1964, 2279, 2294, 2346, 2879, 2879
```

### Jump at compact step 5: 47 → 1206

| State | P | W | R | V | E | Level |
|---|---:|---:|---:|---:|---:|---|
| before | 1.25 | 49.75 | 1.67203 | 44.044944 | 49 | easy |
| after | 850 | 1493 | 310.849719 | 44.835165 | 51 | master |

- Generator-check comparison: chosen **1206**; other scored **1**, other unscored **0**;
  numerical maximum **48**. Accept log index **66**.
- Singleton diagnostics: remove R4C5 → **47**; remove R6C5 → **1205**.
- Cause class: **single-culprit**; board frame: **R6C5**.
- First-use folded text: **22/60** (zero-based index **21**), `wWing`:
  remove candidate 2@R2C2, 2@R8C1, 2@R9C1.
- Existing finding text key: `technique.wWing.step`; format its original `i18nArgs` via `SG.i18n.t()`.

## G05 — classic9, hell1, seed 2299986211

Exact request: common fields + `{ variantId: 'classic9', difficulty: 'hell1', seed: 2299986211 }`.

Current replay: **106 steps; 50 missing numerical tables**. New: **7 compact / 77 details**.
Board: **81** logical cells; **0** cages; signs **0 → 0**. Log: **normal**.

| # | m | Phase/title | E | Score | Δ | Hardest | J | Culprit | Line |
|---:|---:|---|---:|---:|---:|---|---|---|---|
| 1 | 0 | S/Sol | 0 | 0 | 0 | — | — | — | — |
| 2 | 9 | D/Dig | 18 | 27 | +27 | nakedSingle | — | — | F |
| 3 | 22 | D/Dig | 43 | 44 | +17 | nakedSingle | — | — | — |
| 4 | 28 | G/Choose | 55 | 50 | +6 | hiddenSingleLine | — | — | N |
| 5 | 29 | X/Adjust | 55 | 2010 | +1960 | forcingChain | Y | — | — |
| 6 | 75 | X/Adjust | 53 | 3274 | +1264 | nishio | — | — | N |
| 7 | 75 | F/Final | 53 | 3274 | 0 | nishio | — | — | — |

**Details scores, in display order:**

```text
0, 5, 9, 12, 15, 18, 20, 23, 25, 27, 29, 31, 32, 33, 34, 36, 37, 38, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49,
50, 2010, 2010, 2010, 2010, 2010, 2010, 2010, 2010, 2010, 2010, 2010, 2010, 2010, 2010, 2010, 2010, 2010,
2010, 2010, 2010, 2010, 2010, 2010, 2010, 2010, 2010, 2010, 2010, 2010, 2010, 2010, 2010, 2010, 2010, 2010,
2010, 2010, 2010, 2010, 2010, 2010, 2010, 2010, 2010, 2281, 2377, 3274, 3274
```

### Jump at compact step 5: 50 → 2010

| State | P | W | R | V | E | Level |
|---|---:|---:|---:|---:|---:|---|
| before | 1.5 | 60.5 | 2.013463 | 46.315789 | 55 | easy |
| after | 1100 | 8591.75 | 863.294758 | 46.315789 | 55 | nightmare |

- Generator-check comparison: **not applicable** to this complete displayed interval; no invented maximum.
- Singleton diagnostics: remove R2C1 → **50**; remove R8C9 → **50**;
  restore R4C6 → **49**; restore R6C4 → **49**.
- Cause class: **together**; board frame: **—**.
- First-use folded text: **12/75** (zero-based index **11**), `forcingChain`: remove candidate 6@R4C2.
- Existing finding text key: `technique.forcingChain.step.contradiction`;
  format its original `i18nArgs` via `SG.i18n.t()`.

## G06 — jigsaw9, nightmare, seed 42

Exact request: common fields + `{ variantId: 'jigsaw9', difficulty: 'nightmare', seed: 42 }`.

Current replay: **16 steps; 2 missing numerical tables**. New: **7 compact / 33 details**.
Board: **81** logical cells; **0** cages; signs **0 → 0**. Log: **normal**.

| # | m | Phase/title | E | Score | Δ | Hardest | J | Culprit | Line |
|---:|---:|---|---:|---:|---:|---|---|---|---|
| 1 | 0 | S/Sol | 0 | 0 | 0 | — | — | — | — |
| 2 | 8 | D/Dig | 16 | 25 | +25 | nakedSingle | — | — | F |
| 3 | 22 | D/Dig | 43 | 44 | +19 | nakedSingle | — | — | — |
| 4 | 27 | G/Choose | 53 | 49 | +5 | hiddenSingleBox | — | — | N |
| 5 | 28 | G/Choose | 55 | 138 | +89 | boxLine | — | — | N |
| 6 | 31 | G+A/Mixed | 57 | 1678 | +1540 | forcingChain | Y | — | — |
| 7 | 31 | F/Final | 57 | 1678 | 0 | forcingChain | — | — | — |

**Details scores, in display order:**

```text
0, 5, 9, 12, 15, 18, 20, 23, 25, 27, 29, 31, 32, 34, 35, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49,
138, 1778, 2967, 1678, 1678
```

- Compact step **6** folds peak **2967** into endpoint **1678**;
  interval removes **4** and restores **2** clues, and removes **0** signs (gross counts).

### Jump at compact step 6: 138 → 1678

| State | P | W | R | V | E | Level |
|---|---:|---:|---:|---:|---:|---|
| before | 50 | 449.5 | 41.506058 | 46.315789 | 55 | easy |
| after | 1100 | 3099.25 | 531.472743 | 47.010309 | 57 | nightmare |

- Generator-check comparison: **not applicable** to this complete displayed interval; no invented maximum.
- Cause class: **multi-move**; board frame: **—**.
- First-use folded text: **16/71** (zero-based index **15**), `forcingChain`: remove candidate 5@R7C5.
- Existing finding text key: `technique.forcingChain.step.endpoints`;
  format its original `i18nArgs` via `SG.i18n.t()`.

## G07 — jigsaw9, nightmare, seed 3962167687

Exact request: common fields + `{ variantId: 'jigsaw9', difficulty: 'nightmare', seed: 3962167687 }`.

Current replay: **17 steps; 2 missing numerical tables**. New: **9 compact / 33 details**.
Board: **81** logical cells; **0** cages; signs **0 → 0**. Log: **normal**.

| # | m | Phase/title | E | Score | Δ | Hardest | J | Culprit | Line |
|---:|---:|---|---:|---:|---:|---|---|---|---|
| 1 | 0 | S/Sol | 0 | 0 | 0 | — | — | — | — |
| 2 | 8 | D/Dig | 16 | 25 | +25 | nakedSingle | — | — | F |
| 3 | 21 | D/Dig | 42 | 43 | +18 | nakedSingle | — | — | — |
| 4 | 23 | G/Choose | 46 | 46 | +3 | hiddenSingleLine | — | — | N |
| 5 | 24 | G/Choose | 48 | 252 | +206 | nakedPair | Y | — | — |
| 6 | 28 | G/Choose | 56 | 666 | +414 | simpleColouring | — | — | N |
| 7 | 29 | G/Choose | 58 | 1938 | +1272 | forcingChain | — | — | N |
| 8 | 31 | G+A/Mixed | 58 | 1938 | 0 | forcingChain | — | — | — |
| 9 | 31 | F/Final | 58 | 1938 | 0 | forcingChain | — | — | — |

**Details scores, in display order:**

```text
0, 5, 9, 12, 15, 18, 20, 23, 25, 27, 29, 31, 32, 34, 35, 37, 38, 39, 40, 41, 42, 43, 45, 46, 252, 288, 305,
591, 666, 1938, 2515, 1938, 1938
```

- Compact step **8** folds peak **2515** into endpoint **1938**;
  interval removes **2** and restores **2** clues, and removes **0** signs (gross counts).

### Jump at compact step 5: 46 → 252

| State | P | W | R | V | E | Level |
|---|---:|---:|---:|---:|---:|---|
| before | 1.5 | 49 | 1.902468 | 42.790698 | 46 | easy |
| after | 120 | 798.75 | 88.099138 | 43.636364 | 48 | normal |

- Generator-check comparison: chosen **252**; other scored **12**, other unscored **0**;
  numerical maximum **47**. Accept log index **73**.
- Singleton diagnostics: remove R1C4 → **136**; remove R9C6 → **47**.
- Cause class: **mixed**; board frame: **—**.
- First-use folded text: **21/63** (zero-based index **20**), `nakedPair`: remove candidate 3@R5C8.
- Existing finding text key: `technique.nakedPair.step`; format its original `i18nArgs` via `SG.i18n.t()`.

## G08 — killer, veryEasy, seed 1

Exact request: common fields + `{ variantId: 'killer', difficulty: 'veryEasy', seed: 1 }`.

Current replay: **8 steps; 2 missing numerical tables**. New: **6 compact / 24 details**.
Board: **81** logical cells; **31** cages; signs **0 → 0**. Log: **normal**.

| # | m | Phase/title | E | Score | Δ | Hardest | J | Culprit | Line |
|---:|---:|---|---:|---:|---:|---|---|---|---|
| 1 | 0 | S/Sol | 0 | 0 | 0 | — | — | — | — |
| 2 | 0 | S/Cag | 0 | 0 | 0 | — | — | — | — |
| 3 | 4 | D/Dig | 8 | 15 | +15 | nakedSingle | — | — | F |
| 4 | 8 | D/Dig | 16 | 25 | +10 | nakedSingle | — | — | — |
| 5 | 21 | D/Dig | 41 | 43 | +18 | nakedSingle | — | — | — |
| 6 | 21 | F/Final | 41 | 43 | 0 | nakedSingle | — | — | — |

**Details scores, in display order:**

```text
0, 0, 5, 9, 12, 15, 18, 20, 23, 25, 27, 29, 31, 32, 34, 35, 37, 38, 39, 40, 41, 42, 43, 43
```

No Q4 jump callout in this compact view.

## G09 — killer, expert, seed 3514204290

Exact request: common fields + `{ variantId: 'killer', difficulty: 'expert', seed: 3514204290 }`.

Current replay: **24 steps; 2 missing numerical tables**. New: **10 compact / 41 details**.
Board: **81** logical cells; **15** cages; signs **0 → 0**. Log: **normal**.

| # | m | Phase/title | E | Score | Δ | Hardest | J | Culprit | Line |
|---:|---:|---|---:|---:|---:|---|---|---|---|
| 1 | 0 | S/Sol | 0 | 0 | 0 | — | — | — | — |
| 2 | 0 | S/Cag | 0 | 0 | 0 | — | — | — | — |
| 3 | 7 | D/Dig | 14 | 23 | +23 | nakedSingle | — | — | F |
| 4 | 20 | D/Dig | 39 | 42 | +19 | nakedSingle | — | — | — |
| 5 | 21 | D/Dig | 41 | 96 | +54 | cageCombo | — | — | N |
| 6 | 22 | D/Dig | 43 | 98 | +2 | cageCombo | — | — | — |
| 7 | 36 | G/Choose | 71 | 168 | +70 | boxLine | — | — | N |
| 8 | 37 | G/Choose | 73 | 533 | +365 | ruleOf45 | Y | — | — |
| 9 | 38 | G/Choose | 75 | 968 | +435 | cageSplit | — | — | N |
| 10 | 38 | F/Final | 75 | 968 | 0 | cageSplit | — | — | — |

**Details scores, in display order:**

```text
0, 0, 5, 9, 12, 15, 18, 20, 23, 25, 27, 29, 31, 32, 34, 35, 36, 37, 38, 40, 41, 42, 96, 98, 124, 129, 137,
145, 149, 152, 156, 158, 161, 162, 163, 165, 165, 168, 533, 968, 968
```

### Jump at compact step 8: 168 → 533

| State | P | W | R | V | E | Level |
|---|---:|---:|---:|---:|---:|---|
| before | 50 | 1975.75 | 66.754803 | 51.171171 | 71 | easy |
| after | 260 | 2485 | 221.01447 | 51.681416 | 73 | hard |

- Generator-check comparison: chosen **533**; other scored **2**, other unscored **0**;
  numerical maximum **169**. Accept log index **203**.
- Singleton diagnostics: remove R3C6 → **167**; remove R7C4 → **340**.
- Cause class: **mixed**; board frame: **—**.
- First-use folded text: **17/116** (zero-based index **16**), `ruleOf45`:
  remove candidate 2@R7C5, 5@R7C5.
- Existing finding text key: `technique.ruleOf45.step`; format its original `i18nArgs` via `SG.i18n.t()`.

## G10 — killer, nightmare, seed 42

Exact request: common fields + `{ variantId: 'killer', difficulty: 'nightmare', seed: 42 }`.

Current replay: **28 steps; 5 missing numerical tables**. New: **9 compact / 45 details**.
Board: **81** logical cells; **19** cages; signs **0 → 0**. Log: **normal**.

| # | m | Phase/title | E | Score | Δ | Hardest | J | Culprit | Line |
|---:|---:|---|---:|---:|---:|---|---|---|---|
| 1 | 0 | S/Sol | 0 | 0 | 0 | — | — | — | — |
| 2 | 0 | S/Cag | 0 | 0 | 0 | — | — | — | — |
| 3 | 8 | D/Dig | 16 | 25 | +25 | nakedSingle | — | — | F |
| 4 | 22 | D/Dig | 43 | 98 | +73 | cageCombo | — | — | N |
| 5 | 35 | G/Choose | 69 | 168 | +70 | boxLine | — | — | N |
| 6 | 36 | G/Choose | 71 | 529 | +361 | ruleOf45 | Y | — | — |
| 7 | 38 | G/Choose | 75 | 607 | +78 | ruleOf45 | — | — | — |
| 8 | 42 | G+A/Mixed | 71 | 1940 | +1333 | forcingChain | Y | — | — |
| 9 | 42 | F/Final | 71 | 1940 | 0 | forcingChain | — | — | — |

**Details scores, in display order:**

```text
0, 0, 5, 9, 12, 15, 18, 20, 23, 25, 27, 29, 31, 32, 34, 35, 37, 38, 39, 40, 41, 96, 97, 98, 116, 132, 137,
144, 148, 151, 154, 160, 162, 164, 165, 165, 168, 529, 568, 607, 2997, 2780, 2788, 1940, 1940
```

- Compact step **8** folds peak **2997** into endpoint **1940**;
  interval removes **2** and restores **6** clues, and removes **0** signs (gross counts).

### Jump at compact step 6: 168 → 529

| State | P | W | R | V | E | Level |
|---|---:|---:|---:|---:|---:|---|
| before | 50 | 1998.75 | 66.958401 | 50.642202 | 69 | easy |
| after | 260 | 2392.75 | 217.808837 | 51.171171 | 71 | hard |

- Generator-check comparison: chosen **529**; other scored **3**, other unscored **0**;
  numerical maximum **170**. Accept log index **208**.
- Singleton diagnostics: remove R3C7 → **168**; remove R7C3 → **168**.
- Cause class: **together**; board frame: **—**.
- First-use folded text: **28/113** (zero-based index **27**), `ruleOf45`:
  remove candidate 1@R7C1, 6@R7C1, 7@R7C1, 9@R7C1.
- Existing finding text key: `technique.ruleOf45.step`; format its original `i18nArgs` via `SG.i18n.t()`.

### Jump at compact step 8: 607 → 1940

| State | P | W | R | V | E | Level |
|---|---:|---:|---:|---:|---:|---|
| before | 260 | 5783.5 | 295.022051 | 52.173913 | 75 | hard |
| after | 1100 | 6942.25 | 789.276307 | 51.171171 | 71 | nightmare |

- Generator-check comparison: **not applicable** to this complete displayed interval; no invented maximum.
- Cause class: **multi-move**; board frame: **—**.
- First-use folded text: **39/127** (zero-based index **38**), `forcingChain`: remove candidate 5@R1C2.
- Existing finding text key: `technique.forcingChain.step.contradiction`;
  format its original `i18nArgs` via `SG.i18n.t()`.

## G11 — greaterThan, expert, seed 42

Exact request: common fields + `{ variantId: 'greaterThan', difficulty: 'expert', seed: 42 }`.

Current replay: **23 steps; 22 missing numerical tables**. New: **9 compact / 114 details**.
Board: **81** logical cells; **0** cages; signs **108 → 3**. Log: **normal**.

| # | m | Phase/title | E | Score | Δ | Hardest | J | Culprit | Line |
|---:|---:|---|---:|---:|---:|---|---|---|---|
| 1 | 0 | S/Sol | 0 | 0 | 0 | — | — | — | — |
| 2 | 0 | S/Sig | 0 | 0 | 0 | — | — | — | — |
| 3 | 24 | C+I/Mixed | 60 | 135 | +135 | ineqChain | — | — | F |
| 4 | 35 | I/Signs | 60 | 135 | 0 | ineqChain | — | — | — |
| 5 | 108 | I+A+IM/Mixed | 50 | 242 | +107 | nakedPair | — | — | N |
| 6 | 109 | I/Signs | 50 | 242 | 0 | nakedPair | — | — | — |
| 7 | 110 | I/Signs | 50 | 973 | +731 | xyWing | Y | s6(R2C4<R1C4) | — |
| 8 | 111 | I/Signs | 50 | 973 | 0 | xyWing | — | — | — |
| 9 | 111 | F/Final | 50 | 973 | 0 | xyWing | — | — | — |

**Details scores, in display order:**

```text
0, 0, 274, 274, 274, 274, 274, 274, 275, 274, 274, 274, 274, 274, 274, 271, 271, 270, 270, 270, 270, 273,
273, 273, 272, 135, 135, 135, 135, 135, 135, 135, 135, 135, 135, 135, 135, 274, 273, 273, 273, 270, 271, 271,
271, 271, 271, 271, 271, 271, 271, 271, 271, 271, 271, 271, 270, 270, 270, 270, 270, 281, 1049, 1049, 1046,
1046, 1046, 1043, 1039, 1039, 1039, 1039, 1039, 1039, 1046, 1065, 1065, 1065, 1065, 1065, 1065, 1065, 1071,
1065, 1065, 1062, 1062, 1119, 1114, 1112, 1112, 1109, 1109, 1109, 1107, 1104, 1104, 1104, 1104, 1109, 1107,
1032, 552, 552, 1967, 1264, 250, 995, 1017, 242, 242, 973, 973, 973
```

Alive signs by compact step: **108, 108, 85, 74, 6, 5, 4, 3, 3**.

- Compact step **3** folds peak **275** into endpoint **135**;
  includes initial clue construction and **23** sign removals.
- Compact step **5** folds peak **1967** into endpoint **242**;
  interval removes **0** and restores **10** clues, and removes **68** signs (gross counts).

### Jump at compact step 7: 242 → 973

| State | P | W | R | V | E | Level |
|---|---:|---:|---:|---:|---:|---|
| before | 120 | 593.25 | 77.141203 | 44.444444 | 50 | normal |
| after | 650 | 1484.25 | 278.722853 | 44.444444 | 50 | expert |

- Generator-check comparison: **not applicable** to this complete displayed interval; no invented maximum.
- Cause class: **single-sign**; board frame: **s6(R2C4<R1C4)**.
- First-use folded text: **25/61** (zero-based index **24**), `xyWing`: remove candidate 5@R5C1.
- Existing finding text key: `technique.xyWing.step`; format its original `i18nArgs` via `SG.i18n.t()`.

Frame the original sign's gap, not its index in the current live-sign array.
Do not redraw the removed sign as an active constraint, and do not frame the proof's R5C1 elimination instead.

## G12 — greaterThan, hard, seed 3115968914

Exact request: common fields + `{ variantId: 'greaterThan', difficulty: 'hard', seed: 3115968914 }`.

Current replay: **12 steps; 11 missing numerical tables**. New: **5 compact / 106 details**.
Board: **81** logical cells; **0** cages; signs **108 → 6**. Log: **normal**.

| # | m | Phase/title | E | Score | Δ | Hardest | J | Culprit | Line |
|---:|---:|---|---:|---:|---:|---|---|---|---|
| 1 | 0 | S/Sol | 0 | 0 | 0 | — | — | — | — |
| 2 | 0 | S/Sig | 0 | 0 | 0 | — | — | — | — |
| 3 | 92 | C+I/Mixed | 57 | 130 | +130 | ineqChain | — | — | F |
| 4 | 103 | I/Signs | 57 | 638 | +508 | simpleColouring | Y | — | — |
| 5 | 103 | F/Final | 57 | 638 | 0 | simpleColouring | — | — | — |

**Details scores, in display order:**

```text
0, 0, 149, 149, 150, 150, 150, 150, 150, 150, 150, 150, 150, 150, 150, 149, 149, 149, 148, 148, 148, 148,
148, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 147, 148, 148, 148, 148, 148, 148, 148, 146, 146, 146,
146, 146, 146, 146, 146, 146, 146, 146, 146, 148, 148, 148, 148, 148, 148, 148, 154, 154, 154, 154, 154, 134,
134, 134, 134, 152, 152, 152, 152, 152, 152, 152, 152, 152, 152, 156, 154, 154, 153, 153, 152, 152, 152, 152,
152, 152, 152, 151, 151, 130, 649, 649, 647, 647, 647, 647, 647, 647, 647, 642, 638, 638
```

Alive signs by compact step: **108, 108, 17, 6, 6**.

- Compact step **3** folds peak **156** into endpoint **130**;
  includes initial clue construction and **91** sign removals.
- Compact step **4** folds peak **649** into endpoint **638**;
  interval removes **0** and restores **0** clues, and removes **11** signs (gross counts).

### Jump at compact step 4: 130 → 638

| State | P | W | R | V | E | Level |
|---|---:|---:|---:|---:|---:|---|
| before | 40 | 741 | 42.872506 | 47.010309 | 57 | easy |
| after | 360 | 1765.5 | 230.55601 | 47.010309 | 57 | hard |

- Generator-check comparison: **not applicable** to this complete displayed interval; no invented maximum.
- Cause class: **multi-move**; board frame: **—**.
- First-use folded text: **47/75** (zero-based index **46**), `simpleColouring`:
  remove candidate 4@R7C4, 4@R8C3.
- Existing finding text key: `technique.simpleColouring.step`;
  format its original `i18nArgs` via `SG.i18n.t()`.

## G13 — samurai, nightmare, seed 42

Exact request: common fields + `{ variantId: 'samurai', difficulty: 'nightmare', seed: 42 }`.

Current replay: **14 steps; 1 missing numerical table**. New: **8 compact / 134 details**.
Board: **369** logical cells; **0** cages; signs **0 → 0**. Log: **normal**.

| # | m | Phase/title | E | Score | Δ | Hardest | J | Culprit | Line |
|---:|---:|---|---:|---:|---:|---|---|---|---|
| 1 | 0 | S/Sol | 0 | 0 | 0 | — | — | — | — |
| 2 | 8 | D/Dig | 16 | 25 | +25 | nakedSingle | — | — | F |
| 3 | 47 | D/Dig | 94 | 59 | +34 | nakedSingle | — | — | — |
| 4 | 98 | D/Dig | 195 | 69 | +10 | nakedSingle | — | — | — |
| 5 | 113 | G/Choose | 225 | 72 | +3 | hiddenSingleLine | — | — | N |
| 6 | 114 | G/Choose | 227 | 1483 | +1411 | forcingChain | Y | G2-R8C9 | — |
| 7 | 132 | G/Choose | 263 | 1637 | +154 | forcingChain | — | — | — |
| 8 | 132 | F/Final | 263 | 1637 | 0 | forcingChain | — | — | — |

**Details scores, in display order:**

```text
0, 5, 9, 12, 15, 18, 20, 23, 25, 27, 29, 31, 32, 34, 35, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 48,
49, 50, 50, 51, 52, 52, 53, 53, 54, 54, 55, 55, 56, 56, 57, 57, 58, 58, 58, 59, 59, 59, 60, 60, 60, 61, 61,
61, 62, 62, 62, 62, 63, 63, 63, 63, 64, 64, 64, 64, 65, 65, 65, 65, 65, 66, 66, 66, 66, 66, 66, 67, 67, 67,
67, 67, 67, 68, 68, 68, 68, 68, 68, 68, 69, 69, 69, 69, 69, 69, 69, 69, 70, 70, 70, 70, 71, 71, 71, 71, 71,
71, 71, 72, 72, 72, 1483, 1483, 1484, 1484, 1485, 1618, 1618, 1618, 1619, 1619, 1619, 1620, 1620, 1620, 1621,
1621, 1622, 1623, 1637, 1637
```

### Jump at compact step 6: 72 → 1483

| State | P | W | R | V | E | Level |
|---|---:|---:|---:|---:|---:|---|
| before | 1.5 | 229.5 | 2.725045 | 67.924528 | 225 | easy |
| after | 1100 | 1332 | 314.775919 | 68.014981 | 227 | master |

- Generator-check comparison: chosen **null (check unfinished)**;
  other scored **6**, other unscored **0**; numerical maximum **72**. Accept log index **229**.
- Singleton diagnostics: remove G2-R8C9 → **1483**; remove G3-R2C1 → **72**.
- Cause class: **single-culprit**; board frame: **G2-R8C9**.
- First-use folded text: **209/228** (zero-based index **208**), `forcingChain`:
  remove candidate 1@G2-R1C2.
- Existing finding text key: `technique.forcingChain.step.contradiction`;
  format its original `i18nArgs` via `SG.i18n.t()`.

## G14 — mega16, hell2, seed 12

Exact request: common fields + `{ variantId: 'mega16', difficulty: 'hell2', seed: 12 }`.

Current replay: **11 steps; 1 missing numerical table**. New: **6 compact / 79 details**.
Board: **256** logical cells; **0** cages; signs **0 → 0**. Log: **normal**.

| # | m | Phase/title | E | Score | Δ | Hardest | J | Culprit | Line |
|---:|---:|---|---:|---:|---:|---|---|---|---|
| 1 | 0 | S/Sol | 0 | 0 | 0 | — | — | — | — |
| 2 | 10 | D/Dig | 20 | 29 | +29 | nakedSingle | — | — | F |
| 3 | 68 | D/Dig | 136 | 65 | +36 | hiddenSingleBox | — | — | N |
| 4 | 69 | G/Choose | 138 | 1646 | +1581 | forcingChain | Y | R8C4 | — |
| 5 | 77 | G/Choose | 154 | 4476 | +2830 | nishio | — | — | N |
| 6 | 77 | F/Final | 154 | 4476 | 0 | nishio | — | — | — |

**Details scores, in display order:**

```text
0, 5, 9, 12, 15, 18, 20, 23, 25, 27, 29, 31, 32, 34, 35, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 48,
49, 50, 50, 51, 52, 52, 53, 53, 54, 54, 55, 55, 56, 56, 57, 57, 58, 58, 58, 59, 59, 59, 60, 60, 60, 61, 61,
61, 62, 62, 62, 62, 63, 64, 64, 64, 64, 65, 65, 65, 65, 1646, 1660, 2111, 3587, 3853, 4225, 4375, 4458, 4476,
4476
```

### Jump at compact step 4: 65 → 1646

| State | P | W | R | V | E | Level |
|---|---:|---:|---:|---:|---:|---|
| before | 1.25 | 143 | 2.140781 | 61.818182 | 136 | easy |
| after | 1100 | 2628.75 | 484.326851 | 62.022472 | 138 | nightmare |

- Generator-check comparison: chosen **null (check unfinished)**;
  other scored **6**, other unscored **0**; numerical maximum **66**. Accept log index **84**.
- Singleton diagnostics: remove R8C4 → **1652**; remove R9C13 → **65**.
- Cause class: **single-culprit**; board frame: **R8C4**.
- First-use folded text: **84/146** (zero-based index **83**), `forcingChain`: remove candidate 12@R13C14.
- Existing finding text key: `technique.forcingChain.step.contradiction`;
  format its original `i18nArgs` via `SG.i18n.t()`.

## 2. Additional acceptance controls

### 2.1 Equal scores must not mean copied tables

G01's five 568 positions all have **E=51**, **P=360**, `pointing:2`, `boxLine:1`, `simpleColouring:2`,
but these basic counts differ:

| m | Score | Naked Singles | Box Hidden Singles | W |
|---:|---:|---:|---:|---:|
| 26 | 568 | 29 | 22 | 906.5 |
| 27 | 568 | 30 | 21 | 906.25 |
| 28 | 568 | 30 | 21 | 906.25 |
| 29 | 568 | 31 | 20 | 906 |
| 30 | 568 | 28 | 23 | 906.75 |

The compact interval before 992 starts at m=26; the last individual exchange starts at m=30.
Do not mix their W baselines. No score-jump badge belongs to 568 → 992; the XYZ-Wing line does.

### 2.2 The Hell1 two-solution half-change must disappear

For G04, current step **35** is `guided`, and the old rater returns **3422**, `solved:true`,
with a uniqueness-assuming proof. Bounded DFS finds **at least 2 solutions**.
The normalized replay contains **no** position with this givens array:

```text
070301000405060130100000008052008000000604000000200890600000004043070609000406080
```

The actual final puzzle is **2879** and unique.
This tests the complete-change boundary and uniqueness gate, not a change to the generation algorithm.

### 2.3 A real unscorable board: retain attempted techniques, never a total

This is G01's **old removal-only step 11**, not a new canonical move.
Use it as an isolated analyzer/status-renderer control:

```text
004600000721000000900004070070061005400807002600520080060700009000000728000005600
```

With the canonical all-techniques options, the solver returns **`status:'stuck'`**, `solved:false`,
**E=53**, and **no score**. The techniques used before stopping are:

```js
{
  nakedSingle: 2,
  hiddenSingleBox: 15,
  pointing: 6,
  boxLine: 1,
  nakedPair: 2,
  hiddenPair: 2,
  wWing: 2,
  uniqueRectangle: 1,
  forcingChain: 4
}
```

Independent DFS also finds **at least 2 solutions**.
A details move with such a result stays its **own step** with a status table:
label these counts as attempted deductions, show the known failure reason and **no total**.
Do not convert the partial counts into a difficulty score or present them as a completed solution.
The reason may include both facts when both checks ran: the logical solve stopped and uniqueness failed.
Do not insert this known unsafe half into G01's actual 33-step details sequence merely to exercise the renderer.

For a pure stuck-versus-contradiction reason, retain `SG.logicalSolver.solve(...).status` and classify its report
with `SG.difficulty.classify`, using the same options as `SG.difficulty.rate`.

### 2.4 Guard exhaustion and no-Worker behavior

As a deterministic guard control, rating G01's final givens with **one check** throws **`budget.exceeded`**.
The analysis must still reuse the known final **992** rather than replace it with a failed optional rating.
An actually guarded intermediate move gets an honest status, **no retry button**, and no fabricated attempted counts
when the interrupted API did not return them.

With no Worker:

- Show **“Prepare score tables”** and the warning that the page may pause.
- Before the explicit click: **0 analysis solver calls**, including on navigation or locale change.
- The finished puzzle and its existing Summary remain usable.
- The click starts the bounded analysis; no background automatic preparation or automatic retry.

A pre-generation player position 0 is **“Not a puzzle yet”**, with no numerical difficulty.
The filled solution and cage/sign setup screens have numerical **0** tables.
These are distinct states, although both refer to early replay positions.

### 2.5 Restart folding — selector-only synthetic control

No real restart occurred in these fourteen cases. This deliberately synthetic scored trace tests the policy,
not the existence of a Sudoku puzzle with those intermediate numbers:

```text
source:  0, 23, 44, 551, 0 [restart], 23, 44, 600, 992
compact: 0 [solution], 0 [Starting again], 23, 44, 600, 992, 992 [final]
details: 0, 23, 44, 551, 0 [Starting again], 23, 44, 600, 992, 992 [final]
```

The compact restart step folds the abandoned dig, including its **551** peak, into its text.
It shows the actual full-solution restart state and a **0** table, before the surviving dig's positive scores.
The compact view never decreases; details preserve both digs and the real **551 → 0** transition.
Canonical compact indices before the extra final screen are **0, 4, 5, 6, 7, 8**.

## 3. Killer rebuilt-log coverage

The seven previously saved Killer requests all had normal logs.
An additional search checked these eight configurations, all with **maxAttempts=1**, other common fields unchanged,
and `variantOptions:{cageSize:<tilt>}`:

| Requested level | Seed | Tilt | Final score | Rebuilt |
|---|---:|---:|---:|---|
| master | 2 | 0 | 1031 | no |
| expert | 3 | 2 | 571 | no |
| master | 7 | -2 | 642 | no |
| nightmare | 19 | -2 | 665 | no |
| master | 42 | 2 | 1078 | no |
| expert | 314159 | -2 | 573 | no |
| nightmare | 3275974478 | 2 | 1921 | no |
| master | 20261028 | 0 | 1100 | no |

This search took **8006.840 ms**. Limits: **8 requests**, **45000 ms** outer check,
**12000 ms** per generation. There were no timed-out results in the table.
Some results missed their requested band; that does not make their normal logs rebuilt.
**No real rebuilt-log golden is claimed.**

Use the source shape without changing the engine:
`generator/js/variants/killer.js:784–834` writes one `pass:random` with 81 clues, followed only by accepts,
one per empty symmetry group, in group order.
Recognize it only for Killer at Expert or above, with accepted groups matching the final absent groups and endpoint.

A positive **synthetic shape** control can be constructed from G09's unchanged final model/givens:

```js
const groups = SG.symmetry.groups(result.model, result.config.symmetry);
const rebuiltLog = [{ op: 'pass', pass: 'random', clues: 81 }].concat(
  groups.filter(g => g.every(c => result.givens[c] === 0)).map(g => ({
    op: 'accept', cells: Array.from(g)
  }))
);
const copy = Object.assign({}, result, { digLog: rebuiltLog });
```

Expected: G09's actual **208-entry** log is **not rebuilt**; this **39-entry** synthetic copy is recognized.
Do not mutate `result`, and do not call the copy a separately generated request.
The recognized presentation uses neutral “rebuilt from final clues” wording and **no candidate-choice sentence**.

## 4. Reproducing in tests using repository public functions only

The existing Node runner supplies `SG`; no experiment script, saved wire, external fixture or absolute path
is needed by implementation tests.

1. Build the literal store request from the common fields and the selected case header:

   ```js
   const config = SG.store.toConfig(Object.assign({}, SG.store.defaults(), {
     variantId: 'classic9',
     difficulty: 'expert',
     seed: '3275974478',
     symbolMode: 'digits',
     symmetry: 'rotational180',
     digOrder: 'random',
     maxAttempts: 8,
     variantOptions: {}
   }));
   const result = SG.pipeline.run(config, null, SG.budget.create({ ms: 30000 }));
   ```

2. The historical baseline is `SG.player.buildSteps(result)` plus `SG.player.create({}).rateStep(index)`
   after `load(result)`. A numerical table currently needs a non-null result with at least one positive technique count.
   Those historical counts describe the named commit; they must not be reasserted as the intended new UI behavior.
3. In the new module, normalize the log from `result.solution`: accept a whole clue group or sign, combine adjacent
   removal/search-reveal records, retain standalone reveals and restarts, and bundle the opening clue construction.
   Bind candidate comparisons to the accept's exact log index, never “the last accept with matching cells”.
4. At each position, construct its alive-sign model with `SG.greaterThan.withSigns` when applicable.
   Use `SG.difficulty.rate` with the stated guard, `SG.difficulty.provesUniqueness`, and bounded
   `SG.dfs.countSolutions(model, values, 2, budget)` as required.
   Validate the final inequalities as well as givens before reusing `result.rating`.
5. Use `SG.difficulty.breakdown(counts, empties)` for P/W/R/V/E,
   `SG.difficulty.levelOfScore(score)` for levels, and `SG.model.cellLabel(model, cell)` for labels.
   Call `SG.difficulty.rate(..., {collectSteps:true, budget})` for the first-use finding;
   format its original `i18nKey`/`i18nArgs` through `SG.i18n.t()`.
6. Compare the production replay module's public output against these literal compact indices, scores, flags
   and details sequences. Derive a fresh engine rating of selected snapshots to catch stale-table reuse.
   The implementation's eventual API name is not invented here.
7. Test restart, unavailable, guard and no-Worker states with the isolated controls above.
   Do not add a heavy seeded search to a quick suite merely to manufacture one of those conditions.

Sources: `generator/js/engine/difficulty.js:224–272,334–368,426–453`;
`generator/js/ui/player.js:513–551`;
`generator/js/variants/greater-than.js:103–121`;
`core/js/engine/model.js:472–490`.

The selected phase-end rule, whole-group policy, zero compact tolerance, exact jump predicate, source-scoped
candidate text, first-use disclosure, culprit legend and status-only failures are all fixed acceptance behavior.
No slider jump marks, no proof-on-board view and no retry button belong to this change.

## 5. Re-run artifacts and integrity

- `E\acceptance-data.cjs`: fresh 14-request generation and all golden numeric data.
- `E\acceptance-core.cjs`: revised normalization metadata, scoring, selected segmentation and explanations.
- `E\acceptance-controls.cjs`: unsafe half-change, partial counts, plateau and rebuilt-shape controls.
- `E\acceptance-find-killer.cjs`: the bounded eight-request search.
- `E\acceptance-render.cjs`: table rendering, not engine logic.
- `E\acceptance-preservation.json`: hashes of the six earlier research reports.
- `E\acceptance-verify.cjs` / `E\acceptance-verification.json`: final data, encoding/path and repository checks.

With `$E` already set in the shell to the external experiment folder:

```powershell
Set-Location $E
node "$E\acceptance-data.cjs" --fresh
node "$E\acceptance-controls.cjs"
node "$E\acceptance-find-killer.cjs"
node "$E\acceptance-verify.cjs"
```

The main run uses a **120000 ms** outer check and **30000 ms** per generation.
Reusing its saved wires omits generation; the golden assertions do not depend on elapsed time.
The historical peer helper used by the research prototype remains read-only;
production tests must use the repository functions, not that helper.

Start and end `git --no-pager status --short`:

```text
?? docs/generation-steps/
```

No tracked or staged code changes, commit or branch change was made.
The six earlier reports remain byte-identical to their phase-start copies.
This report is UTF-8 without BOM, uses CRLF, and uses only repository-relative and experiment-notation paths.
