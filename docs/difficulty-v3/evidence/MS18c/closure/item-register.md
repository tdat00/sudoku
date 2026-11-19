# MS18c closure: item register and verification summary

Prepared for SA1's final review. Commits: A `6a473f7a`, B `387a4c8d`, pack HEAD `1b3980f9`; the closure commit
is the orchestrator's. Times are +07:00.

## Identities

| identity | value |
|---|---|
| measured sources (GQ, never retagged) | `0ca29eaeebc295b6` |
| publication sources (after the 13 support-array edits) | `75b0955e3e356bd1` |
| qualifier tool hash | `c0ef0d25f28518692bdccbde547814daf74f5834d35f9e117108d6321876fd77` (unchanged) |
| Generator quick fingerprint (final) | `fc31c9db8a2cea17e480f5130d531042a4c073bc4dd0d2c97296afc6a6079ac2` |
| Player quick fingerprint (final) | `4c21573fbc00ca82a4e6d0a15bf6e8201be84940d00f87840a49e2046bd3d25a` |
| Generator with the manual trees (the `variants` shards) | `13cd63bfb0f5af687bc8e841d522cc7f216aa116125394b33fbc32a53ab1ef3f` |
| E replay identity (5 wire + 14 analysis ledgers) | `1cf64919a9004259a203e65bc7e537b15b981f4ed52610f4cd62d28cf6950fcc` |
| E hash identity (104 hash ledgers) | `1032ab2f510fe2b9ed1bac744f534d5cfee7e039f456fc56d3e19682d53158a0` |

Each ledger and results file records the identity above (checked: 5 + 14 + 104 ledgers, 9 quick results, 18
`variants` shards, one identity each) and `final/identities-final.txt` recomputes all five from the final tree.
MS17b's were `ff55cbce...` (replay) and `b1c78ecb...` (hashes): they moved with the support arrays, the guards and the
perf data of this task, as expected, and no expected hash, wire, analysis or help example changed.

## Verification

| gate | result | evidence |
|---|---|---|
| GQ (135 cells) | 135/135 `record-accepted`, 4,313 requests, 79 offered, 56 hidden, 27 `budget.exceeded` timeouts, 0 invalid, 0 gaps, 0 recoveries | `merge/`, `outputs-sha256-gq.txt` |
| GQ inventory re-verified | 2,201 listed, 2,201 on disk, every hash equal | `final/inventory-gq-verify-3.txt` |
| v2 archive re-verified | SHA-256 `6D148C5E...162FF`, 19,785 bytes, 233 CRLF, blob `b64f7ede...` equal to A and ed2fe50c | `v2-archive.md` |
| Publication check | OK against A (13 lists differ, 15 of 15 definitions equal, live report 135 rows and 39 removals) | `final/publication-check-final-2.txt` |
| Complete manual `variants` | **285 of 285**, 18 disjoint whole-test shards, each test exactly once, one source identity | `manual-variants/` |
| E route | 5 wires, 14 analyses, 520 hashes unchanged; three merge-checks check-only; 123 shards, 0 nonzero exits, 0 over projection | `e/` |
| GH catalogue | all 40, check only: 28 puzzles replayed, 40 of 40 match, 4.2 s | `gh/gh-check-all-40.txt` |
| Generator quick | **4,807 of 4,807**, 55 suites, four group commands 547.6 s, complete and source-stable | `quick-dev/` |
| Player quick | **2,981 of 2,981**, 32 suites, 118.7 s, complete and source-stable | `quick-dev/player-quick.json` |
| CI check | exit 0; groups 1,260 / 1,260 / 420 / 450 s of 1,800, Player job 720 s of its actual 900; no projection rises | `ci/`, `final/ci-check-final.txt` |
| Population map | 111 removed public registrations, 17 added, 10 other removed; perf 79 / 39 / 17; recovery-profile tool hash `47110866ae0c...` to `c7e90ca9d081...` | `population-map.md`, rerun byte-identical |

## Items

| item | disposition |
|---|---|
| S-AV01 / CV6-05 | **Closed "not offered"**: Greater-Than Normal 40/40 hits, p95 10,192.4051 ms against 10,000. No Normal contract change; its public CV6 registration is removed like every other hidden cell (population map). |
| S-AV05 / S-AV06 | **S-OD7**: Killer Hard (0/14) and Expert (2/12) did not qualify and are withheld by decision; no weight or rating change. |
| S-AV27 / Q-MS07e-2 | **Closed**: all six cells ran in GQ and are hidden on time. |
| IR17 | **Carried**: classic9 Nightmare stays offered; the old 430.5 s GD warning and the remaining GD belong to MS18e. |
| MS18c-GQ-ENGINE-COST | **Open to MS18d, MS18e audits.** Added measurement: the real mega16 replay shard took 331.6 s against 118 s at MS07f (2.8 times, over its 300 s projection, inside 450 s). No tuning, budget relaxation or new GQ. |
| MS18c-Q1 / Q2 / S-OD13 | GQ complete and jointly accepted; five eligible holds re-asked once; all raw strict screens failed under the declared host-active policy. Immutable manifest, receipts, journals and identities retained. |
| MS18c-Q3 / S-OD14 | No recovery used. |
| Close misses | Greater-Than Normal (above) and diagonalX Expert 37/40, p95 11,795.9214 ms against 10,000; both hidden, not repeated. |
| MS18a / MS18b items, S-AV14, S-AV15, S-AV25, S-AV28-S-AV30, S-AV18-S-AV23, S-AV31-S-AV34, S-AV36-S-AV39, MS15b-GP-J/U, MS15b-Q6, MS16-Q6, MS17b-GD21-PROCESS | Carried with their dispositions; GQ does not replace GD or GP. |

## New named items from this closure (numbers, owners)

1. **17 offered cells measured a GQ p95 above their `design.md` 9.1 target** (for example sohei/hell2 27.2 s against
   20 s, mega16/hell2 25.2 s against 10 s, butterfly/nightmare 16.1 s against 8 s) and three smoke cells exceed
   their warn-only targets (`wordoku/easy` 974 ms against 250, `classic9/normal`, `killer/normal`). No target was
   changed; recalibration is MS18d's.
2. **The five manual suites (killer, jigsaw, greater-than, extra-regions, wordoku) and `perf` were not run.**
   Policy and implementation are resolved by the ruling and verified by `--list-tests` inventories, sandbox probes
   and the population map; live validation is MS18e. Named risk: the extra-regions cross-level hit-share assertion
   keeps its full original population, hidden levels included.
3. **Standing quick cost (S-AV08):** Generator 547.6 s (command seconds, four groups) against 549.0 s at MS17b,
   Player 118.7 s against 117.2 s; +23 Generator tests (own-fast +20, replay, steps and player +1 each).
4. Docs: `recovery-quick-cost.md` is the dated MS07f record and still reads "manual tier 1,148" for that date; the
   current counts are in `generator/design.md` 15.1 (quick 4,807, manual tier 1,029). Not edited (not an MS18c file).

## Disclosures

- 294 `.log` files of the frozen trees are force-added by the orchestrator at A (`.gitignore` has `*.log`).
- `run-locked.ps1` wraps the verbatim `Invoke-Dv3Node` (shared lock, 450/540) and adds a lock log and a transcript.
- Four lock-log entries (exit 2, no node run) come from a call of the helper with a mistyped parameter name, and the
  first `final/publication-check-final.txt` (exit 1) ran with the baseline `HEAD`, which is B since B was committed
  (0 lists differ, not 13): kept as superseded, the helper now names checkpoint A and `final/publication-check-final-2.txt`
  is the passing run.
- The helpers were reformatted to the 110-character rule after their evidence runs; `population-map.cjs` and
  `variants-shards.cjs check` were re-run and their outputs are byte-identical, and every other helper was run or
  syntax-checked (`final/`).
- Earlier unlocked file-only `node -e` and `node --check` calls, one `Set-Content` scratch file (deleted at once) and
  one PowerShell `.Replace` rewrite of `manual-corpus.test.js` (CRLF preserved) departed from the create/edit-only
  rule; none generated or ran a solver.
