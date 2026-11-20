# MS18d Phase D developer handoff

Developer record of the Phase D closeout (dispatch `MS18d-phase-d-dispatch.md` at `b54e67aec1cdaff12c6dcc2b9dd8ba3b4dfe73d0`).
The orchestrator reviews, accepts and commits; no developer commit or push was made, and MS18e is not released by this record.

## Result

- Final GP: 79 of 79 cells, 3,950 requests, **74/79 meet strict `p95 < target` (72 required)**, five misses retained (mega12/expert,
  sohei/hell2, butterfly/hell2, wordoku/expert, wordoku/nightmare), 114 consumed ledgers (22 + 0 + 89 + 3), 9 holds, one pre-window
  event, 35 extra cold starts, 30 cold-start-sensitive cells. `phase-d/provenance-audit.json` found no problem in the 114 ledgers,
  nine holds, four epoch tuples, 125 C-log lines and the final merge; SA1's recompute and the operator archive are cited, not re-run.
- R6 applied: `generator/design.md` section 9.1, both developer guides (same facts in both languages) and the new
  `docs/difficulty-v3/performance-v3.md` (all 79 rows, the misses, cold starts, holds, owner exceptions, consumers, the 17 target
  changes, identities, GG, quick, CI and the register).
- Identities: Generator quick `10ed919c848f1466be70aae71e690ffd2bc1b7818ec8a3df1bba0dfd6ce9b0ec`, Player quick
  `00db9a687404f50e4591a0b0f92571ebcc3fb0e69b2744fa8190f6a7c720f799`, Generator with manual
  `a818c0b9e0fdcbc8111ac75c365783859afd894c285bfbd8763cfe25d1cc6e3a`, replay `1cf64919...0fcc` and hash `344afdec...b1f1` unchanged,
  producer sources `75b0955e3e356bd1`, target table `3d0bffdb...6963a`; the baseline before the edits equalled the dispatch (M2).
  Both `freeze-targets.js` re-checks exit 0 with the exact B1 counts, byte-identical (labelled Phase D re-checks).
- GG (file-only): 104 ledgers, 520 keys exactly once, all 520 puzzles unchanged.
- Quick: Generator 4,807 of 4,807 in eight shard commands and Player 2,981 of 2,981, zero failures and skips, coverage bijective by
  `(suite, ordinal)`; the existing counts (55 and 32 suites) are unchanged.
- CI metadata: own-fast 330 to 350 and the Player job 180 to 190 by the existing rule on the tee final seconds; groups 1,260 / 1,320 /
  420 / 450 of 1,800, Player job 750 of its actual 900; final CI check exit 0 (local, not remote CI).

## Files

Changed (living): `generator/design.md`, `DEVELOPERGUIDE.md`, `DEVELOPERGUIDE.vn.md`, `.github/scripts/generator-quick.json`.
Added: `docs/difficulty-v3/performance-v3.md`; the owned helpers `generator/tests/artifacts/difficulty-v3/MS18d/phase-d/closeout.js`,
`test-closeout.js`, `run-locked-d.ps1`; everything else under `docs/difficulty-v3/evidence/MS18d/phase-d/` except the read-only
`operator/` and `sa1-recompute/`. Final SHA-256 of the living files at hand-over:

| File | SHA-256 |
|---|---|
| `generator/design.md` | `cd4880473c1d7c85748de3b40a49e2423dbe064a40101f181bfe6beaeaad1a8a` |
| `DEVELOPERGUIDE.md` | `c6b0f088db73ce1c6b16ce83eeb9bd0ca5154450e400e9a089b589d1f8959fa3` |
| `DEVELOPERGUIDE.vn.md` | `5cac5edfc703297656dff9924d62065a4d98c4485bc4ace9ddb3d1331cd607e3` |
| `.github/scripts/generator-quick.json` | `eed4c4ac41a2b6347c0bf5572bbef543a892c4f184aa39b1deeef77b37d8f34a` |
| `docs/difficulty-v3/performance-v3.md` | `edfd68703c2e094b0daec86ed32bc32fb11abb6cdc765381da32a3ea8ae5354b` |

`helpers-sha256.txt` holds the SHA-256 of the three owned helpers and `outputs-sha256.txt` that of every Phase D output (all files of
`phase-d/` except `operator/`, `sa1-recompute/`, `lock-log.jsonl`, itself and the transcripts of the hashing and verification
commands, which exist while or after the inventory is written). The two lists are verified by the existing
`phase-c/check-format.js --verify`. `lock-log.jsonl` is the complete Phase D command log and keeps its own growth (its last row is the
verification command).

## Commands and clocks

`plan.json` lists the commands in order; `lock-log.jsonl` has one row per command (arguments, helper line, tee marker and seconds,
caller seconds, derived lock wait, slept gap, outcome). Every Node command went through the unchanged `Invoke-Dv3Node` and the unchanged
`phase-c/tee-c.js` via `run-locked-d.ps1`; the minimum gap between commands was 15.014 s; no command hit the 540 s ceiling (the longest,
Generator `own-fast`, took 232.404 s of tee time). Four of my own helper runs failed on defects of the helper (`closeout-audit`,
`closeout-audit-2`, `closeout-consumers`, `closeout-consumers-2`: acquisition-hold folders without journals or readiness, the shape of the
SA1 equality field, a consumer-category count) and were corrected under numbered new transcripts; their transcripts and rows stay.

## Disclosures and limits

- `TEE_QUIET=1` was set by the caller (console copy only; every line is in the transcripts). No other tee or controller setting was used.
- One unlocked top-level `node --check closeout.js` (a syntax check of the new helper: no test, no output file, no repository read) ran
  before the locked caller was used for the helper; every other Node command is locked and teed.
- The controller and wrapper style tooling folders (`--keep`) of earlier epochs were not used here; nothing was kept outside `phase-d/`.
- Several lines of `closeout.js` and `test-closeout.js` are longer than 110 characters (the format tool checks CRLF, BOM, trailing whitespace and
  the final newline of these files, not their line length); `run-locked-d.ps1` has none.
- The reconciliation of the 37-cell MS15b cohort with the current cells (15 offered and measured, 12 meet, 3 miss; 22 hidden) was computed
  read-only from `MS15b/logs/affected-cells.txt` and `gp-cells.csv` and is stated in the register, not produced by a Phase D command.
- `gp-cells-table.md` (the generated rows that the report's table is checked against) is an auxiliary output not named in the dispatch.
- Nothing of the frozen records, helpers, base records, journals, the C log, `final.m1`, `operator/` or `sa1-recompute/` was written; no new GP,
  profile, manual, deep, replay or help recording, `final.m1` or cell merge ran.

## Open for MS18e and the orchestrator

Matching-head PR and workflow verification (remote CI) and any browser work; the dispositions of the five numerical misses under S-OD4
(explicit authorization needed for any generator or target work); GD and final deep admission (IR17); the held S-AV11 profile; the
finder-cap audits S-AV31 to S-AV39 and MS15b-GP-J/U; MS18c-GQ-ENGINE-COST; the standing quick-cost and tier audit (S-AV08); the final MS18e
audit. None of these is closed by Phase D.
