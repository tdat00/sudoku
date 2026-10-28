# Generation Steps — brief report

| | |
|---|---|
| Date | 2026-10-28, from 13:13 (local time, +07:00) |
| Who | orchestrator: GitHub Copilot CLI (Claude Opus 5.5) · researchers: **claude-opus-5.5** (Claude Opus 5.5, 1M context, max reasoning) and **gpt-6-astra** (GPT-6 Astra, long context, max reasoning) · implementers: claude-sonnet-5.5 sub-agents |
| Code examined | `8d9510a` (branch `main`) |
| State | research done; joint report and implementation spec written and checked by both researchers (§11 of the detailed report); implementation in the task pack [`tasks/generation-steps/`](../../tasks/generation-steps/check-list.md), branch `generation-steps`, not pushed |
| Details | [`report-detailed.md`](report-detailed.md) (Part I: the joint report and the implementation spec; Part II, the implementation and its verification, follows) |

## What was asked

Redesign the **Generation Steps** of the generator. Example: Classic 9×9, Expert, seed 3275974478 — steps 11 to 18
show no score table, and at step 19 the score jumps. Requirements:

- keep the generation algorithm: the finished puzzle is already right, only the explanation of the steps is confusing;
- every step has a score table, even when the score does not change;
- the scores rise steadily (for example 35, 100, 300, 1000 rather than 35, 40, 40, 1000);
- (13:54) a jump that no grouping or splitting of steps can remove is accepted, but the page must explain why the score
  jumped.

Two researchers in parallel, then cross-reviews, responses and one joint report; then a task pack for claude-sonnet-5.5
sub-agents, one commit per task on a new branch, no push.

## Result in brief

- **Why steps had no table** (all in the page, `generator/js/ui/player.js:512–553`): only random and guided dig steps
  were rated, so clues shown again, sign removals and the Greater-Than dig never had a table; the fixed-size batching
  cut each **exchange** of the local search (remove a clue group, show another one again) in two, and the removal half
  has two or more solutions, so it cannot be rated; the solution, cages and signs steps had a sentence instead of a
  table. On 78 sampled requests, 316 of 1,258 steps (25 %) had no table. The 400 ms clock budget was never the cause.
- **The 1849 at step 19 never existed for the generator**: it is the board between the two halves of the fifth
  exchange; the generator kept the whole exchange (992).
- **The real jump is 44 → 551**: removing one symmetric pair (R1C2, R9C8) makes the generator's solution use Simple
  Colouring (weight 360), which counts in full in the score. No recorded board lies between 44 and 551, so no grouping
  can remove it; it is shown as one step and explained.
- **The design changes the replay only** (generator, puzzles, regression hashes, cache, history and export unchanged).
  The page reads the dig log as complete **moves** (an exchange is one move), rates every board once in the worker
  after the puzzle is shown, and offers two views:
  - **compact** (default): steps chosen by score, about ×2 apart, never going down, cut at every phase end;
  - **Show every move**: one step per move, real decreases included.
- **The example becomes 7 steps: `0, 23, 44, 551, 568, 992, 992`**, each with its table; "Show every move" gives 33.
  On 107 sampled requests: 5–10 compact steps (median 7), all with a table, no decrease, 84 explained jumps, none that
  a recorded board could have avoided.

## Timeline

| time | what was done | found | decided |
|---|---|---|---|
| 13:13 | brief; both researchers start independently | | |
| 13:33 | gpt-6-astra's report | the missing tables are the split exchanges and the unrated kinds, not the timeout; 1849 is a half-exchange; 44 → 551 is a real jump | |
| 13:54 | | | the user accepts unavoidable jumps; the page must explain them |
| 14:08 – 14:33 | gpt-6-astra's addendum; claude-opus-5.5's report (with its jump explanation, C11) | a half-exchange board with two solutions was even "rated" 3422 (Hell 1) | |
| 15:11 – 15:18 | cross-reviews, head-to-heads on common corpora | score-chosen steps: median 7 steps instead of 13, no drop over 10 % | gpt-6-astra adopts the compact view |
| 15:30 | | | Q1–Q5: compact + "Show every move"; never split a symmetric group; the compact view never decreases; jump = ×3 and +100; short callout + "Why?" |
| 15:58 | | | Q6–Q9: no absolute paths in the documents (experiments stay outside the repository); a task pack then implementation by claude-sonnet-5.5; branch `generation-steps`; quick suites per task, heavy and browser tests once at the end |
| 16:01 – 16:04 | responses; resolutions R1–R17 / R1–R14 | every review point accepted or answered | |
| 16:20 | | | Q10–Q18: frame the clue that causes a jump; level, generator's choice and first use in "Why?"; phase ends always cut; restarts folded; unscorable moves get a status table; Killer rebuilt log recognised by shape; no slider marks; no Worker → "Prepare score tables" button; guard exhausted → honest status |
| 16:37 | absolute paths removed from the reports | | |
| 17:11 – 17:39 | golden acceptance data (gpt-6-astra, 14 requests), checked independently by claude-opus-5.5 | 1,505 of 1,514 fields equal, every golden number equal | |
| 17:21 | joint report drafted (claude-opus-5.5) | | |
| 18:28 | gpt-6-astra's check of the joint report | 13 must-fix corrections (contracts, wording, Vietnamese copy) | |
| 18:39 – 18:40 | | | Q19: without a Worker the replay waits for "Prepare score tables"; the user lets the orchestrator decide the rest by recommendation |
| 19:04 | corrections applied | | |
| 19:05 → | sign-off; task pack | | slow golden cases checked from saved generation results (orchestrator) |

## What you will see (UI/UX), once implemented

- **Generation Steps tab**: about 7 steps instead of 9–106; a score table on **every** step (0 on the solution, cages
  and signs steps); the Total shows its change ("551 (+507)", "992 (unchanged)").
- **A score jump** (×3 and +100 points or more): a badge "Score jump ×12.5", two or three sentences (what changed, the
  technique the generator's solution now uses and its weight, the clue that causes it), a "Why?" disclosure (P, W, E,
  V, R before → after, the level, the generator's choice, the first use of the technique), the technique's row labelled
  "New hardest technique" and the culprit clue framed on the board. Smaller rises that bring a new hardest technique get
  one line.
- **"Show every move"** toggle: one step per move, with real decreases; a move that cannot be scored shows a status
  table (no total) instead of a number.
- A short "Preparing the score tables… k of N" while the worker rates the boards (milliseconds on 9×9; under a second
  on the largest boards). Opened from `file://` (no Worker): a notice and a **Prepare score tables** button, with a
  warning that the page may pause; nothing runs before it is pressed.
- About 70 new or changed strings in English and Vietnamese; updated user and developer guides (both languages),
  `generator/design.md` and the Help text of the replay.

## Effort (research and report)

| agent | model | AI credits | tokens in / out |
|---|---|--:|--:|
| claude-opus-5.5 (researcher) | Claude Opus 5.5 | 8,368.65 | 193,663,132 / 1,436,059 |
| gpt-6-astra (researcher) | GPT-6 Astra | 12,344.85 | 41,591,454 / 564,696 |
| orchestrator | Claude Opus 5.5 | 2,442.51 | 17,392,480 / 103,672 |

Measured at 19:05 from the local usage records; the implementation's costs are in each task's execution log.

## Documents

| file | content |
|---|---|
| `report-brief.md` | this file |
| [`report-detailed.md`](report-detailed.md) | Part I: the joint report and implementation spec (diagnosis, the user's 19 decisions, the design R1–R19, the example, results, strings, files, tests, sign-off); Part II: implementation and verification (to come) |
| [`claude-opus-5.5/`](claude-opus-5.5/) `1-report.md` … `4-check-of-acceptance-data.md` | research report → review of the other report → response → independent check of the golden data |
| [`gpt-6-astra/`](gpt-6-astra/) `1-report.md` … `6-review-of-task-pack.md` | research report (with the addendum after 13:54) → review → response → golden acceptance data → check of the joint report → review of the task pack (45 fixes applied to it) |
| [`../../tasks/generation-steps/`](../../tasks/generation-steps/check-list.md) | the implementation task pack and its execution logs |

The researchers' experiment scripts and raw data are not part of the repository; the reports quote every number they
rely on (`E\…` in the reports names a file in those folders).
