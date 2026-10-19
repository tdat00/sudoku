# Rating v2 — brief report

| | |
|---|---|
| Date | 2026-10-19, 09:12 – 20:50 (local time) |
| Who | orchestrator: GitHub Copilot CLI (Claude Opus 5.5) · researchers / implementers: **claude-opus-5.5** and **gpt-6-astra** (both long context, max reasoning) |
| Repositories | `sudoku-generator` (base `fb07fef`) and `sudoku-player` (base `e64b01e`) |
| State | implemented, reviewed and tested; **not committed or pushed** — waiting for the user's tests |
| Details | [`report-detailed.md`](report-detailed.md) (Part I: the agreed joint report; Part II: implementation, review, verification) |

## What was asked

Research how the generator scores a puzzle and builds a difficulty — two researchers in parallel, then a cross-check
and one joint report — and then implement it in the generator and the player:

- keep very easy, easy, medium, hard, **very hard**, expert, evil; add harder levels (nightmare …);
- one score formula for every variant, from the empty cells and the techniques needed only; drop the "Bonus points for
  difficult techniques" (the level must come from the score, not the reverse);
- every variant reaches the highest level it can, and hides the levels it cannot generate;
- change only the scoring and the generated puzzles; slight UI changes are acceptable if reported; the new formula has
  priority.

## Result in brief

- **Score** = `round( 80·E/(E+40) + P + 0.25·P·log₂(1 + W/P) )` — `E` empty cells, `P` the weight of the hardest
  technique used, `W` the sum of weight × uses. Same formula for every variant; no floor, no size scaling. A puzzle that
  logic cannot finish is unrated and never generated.
- **Nine levels** on fixed bands: very easy 0–44 · easy 45–179 · medium 180–399 · hard 400–699 · **very hard**
  700–999 · expert 1,000–1,499 · evil 1,500–2,399 · **nightmare 1** 2,400–3,599 · **nightmare 2** 3,600 +.
- **Generation** aims at the score band of the requested level (guided digging, fast proposals refined into the band,
  local search, a cage-layout search for Killer); every returned puzzle passes an independent uniqueness check.
- **Levels offered = measured** (40 fixed seeds per level, ≥ 90 % exact hits within the time budget,
  [`qualification.md`](qualification.md)):

| variant | v1 | v2 |
|---|---|---|
| classic4 | very easy, easy | very easy |
| classic6 | very easy, easy | very easy, hard |
| classic9 / wordoku | 6 / 5 levels | very easy … nightmare 1 |
| killer, greaterThan, diagonalX, hyper, jigsaw9, mega12, mega16, samurai, sohei, butterfly, flower | 4–6 levels | **all nine**, up to nightmare 2 |

## Timeline

| time | what was done | found | fixed / decided |
|---|---|---|---|
| 09:12 | brief; both researchers start independently, in parallel | | |
| 09:21 | | | reports to be written in English |
| 09:39 | gpt-6-astra's report (1,175 generations measured) | the code has 6 levels, no very hard; the bonus row is a "technique floor" taken from the level; levels above expert are switched off by policy, not impossible | proposes peak + log-work formula |
| 10:10 | claude-opus-5.5's report (7,800 puzzles sampled) | the floor hides a size bug: without it 45 % of Samurai puzzles drop a level; on 6×6 one colouring step was "expert" | proposes `Σ c·√n + 5·√E` |
| 10:25 – 10:28 | | | the user adds implementation; formula first, slight UI changes allowed |
| 10:56 – 11:03 | cross-reviews with a head-to-head on a common corpus | the peak + log-work formula is more consistent across sizes (0.38 vs 0.63), more robust to the solver's path (0 vs 5 level changes) and more stable when a clue is removed | claude-opus-5.5 adopts gpt-6-astra's formula |
| 11:20 – 12:53 | responses; resolutions R1–R10 | both reports overstated parts of classic6; the "guess" score for unsolved puzzles was wrong | all ten accepted; R6 amended: over-hard proposals are brought down by re-adding clues |
| 13:01 – 13:32 | joint report | 23 corrections from the two researchers | both sign off; the report becomes the spec |
| 13:35 | reports saved in the generator docs; implementation starts | | generator: claude-opus-5.5 · player: gpt-6-astra |
| 13:56 | player implemented | | 1,628 / 1,628 tests, 7 / 7 Edge runs |
| 16:43 | generator implemented; first qualification (5,053 requests) | Killer very hard missed the 90 % bar; some top-tier requests took up to 106 s | Killer layout search keeps widened clues (39 / 40); deterministic guards (106 s → 8 s); 3,497 tests pass |
| 17:42 | independent review of the generator | **B1** fallback dropped a nearer valid puzzle · **B2** rating cap not fully counted · **B3** replay showed re-added clues one step early · **B4** qualification could certify after a lost request · S1–S5, N1–N2 | sent back for fixes |
| 18:59 | fixes | S1: re-checking refused cells would be 4.6× slower for the same hit rate | B1–B4, S2–S5, N1–N2 fixed; S1 kept as a documented, measured heuristic; re-qualified, lists unchanged; 3,512 tests |
| 19:15 | orchestrator's own test runs | one time check failed while the CPU was busy (Greater-Than very hard 10.7 s > 10 s); GitHub runs the tests on slower machines | sent back for fixes |
| 19:22 | re-check of the fixes | B1–B4 confirmed; **B5**: a Killer fallback path skipped the independent uniqueness check (an injected faulty technique produced a puzzle with two solutions) | sent back for fixes |
| 20:05 | last fixes | | B5: every fallback candidate is counted by DFS before it is kept · time checks use budget × 2 (× 3 on CI) · 3,513 tests; qualification and regression hashes unchanged |
| 20:30 | final verification by the orchestrator | | generator 3,513 / 3,513 · player 1,628 / 1,628 · B5 probe: 3 / 3 puzzles with one solution |
| 20:16 – 20:50 | docs reorganised | | `report-v1.md`, `report-v2/` with this brief, the detailed report, `qualification.md` and the numbered researcher files |

## Problems found after the implementation, and their fixes

| id | problem | fix |
|---|---|---|
| B1 | when the level was missed, a farther puzzle could be returned while a nearer valid one had been seen | keep every verified candidate; return the closest |
| B2 | some full ratings (Greater-Than tuning, the last rating after a search) were not counted against the cap | one counted entry point for every full rating |
| B3 | the replay showed re-added clues one step too early | apply the reveal after the pending removals |
| B4 | the qualification could pass a level after a worker crashed | a crash or lost request fails the whole run |
| B5 | a Killer fallback candidate could skip the independent uniqueness check | DFS count before a candidate is kept |
| T1 | time checks too tight for busy or slower machines (CI) | budget × 2 locally, × 3 on CI; exact budgets still enforced by the qualification |
| S1–S5, N1–N2 | wording, documentation, test certificates, an optional Help badge | fixed (the badge removed); S1 documented as a measured heuristic |

## What you will see (UI/UX)

- **Generator:** the Difficulty Score table keeps its layout but loses the "Bonus points" row and shows the new
  weights and shares; three new levels (Very hard, Nightmare 1, Nightmare 2 / Rất khó, Ác mộng 1, Ác mộng 2) and
  reworded descriptions; per-variant level lists as above; scores on a smaller scale; rewritten Help sections; a new
  replay sentence when clues are shown again; four new error messages; `ratingVersion: 2` in exports; the puzzle cache
  is emptied once; old links and history entries may produce a different puzzle; fewer top levels are pre-generated.
- **Player:** only the three new level names and the reworded descriptions; gameplay and saved progress unchanged.

Full list: [`report-detailed.md`](report-detailed.md) §15.

## How to test

- Generator (`index.html`): check each variant's level list; generate nightmare levels on Killer, Greater-Than or
  Samurai; check the Summary table, the Generation Steps replay, Help → scoring, history, export and the "Play" link.
- Player: import a puzzle with a new level; old exported files still import.
- `node tests/node-runner.js` in each repository (≈ 9 min for the generator); `node tests/qualify.js --variant=<id>`.

## Documents

| file | content |
|---|---|
| `report-brief.md` | this file |
| [`report-detailed.md`](report-detailed.md) | Part I: the joint report (research, diagnosis, choice of formula, agreed design); Part II: implementation, review findings and fixes, visible changes, verification |
| [`qualification.md`](qualification.md) | the levels each variant offers and how they were measured (read by `tests/suites/difficulty.test.js`) |
| [`claude-opus-5.5/`](claude-opus-5.5/) `1-report.md` … `5-fix-report.md` | research report → review of the other report → response → generator implementation → fixes |
| [`gpt-6-astra/`](gpt-6-astra/) `1-report.md` … `5-implementation-review.md` | research report → review of the other report → response → player implementation → review of the generator |
| [`gpt-6-astra/evidence/`](gpt-6-astra/evidence/) | probe scripts and recorded outputs behind B1–B5 (how to re-run them: its `README.md`) |
| [`../report-v1.md`](../report-v1.md) | the final QA report of version 1 (before this work) |

The researchers' other experiment scripts and raw data (about 20 MB) are not part of the repository; the reports quote
every number they rely on.
