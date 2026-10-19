# Evidence of the implementation review (gpt-6-astra)

The probe scripts and recorded outputs behind the blocking findings B1–B5 of
[`../5-implementation-review.md`](../5-implementation-review.md) and their fixes in
[`../../claude-opus-5.5/5-fix-report.md`](../../claude-opus-5.5/5-fix-report.md). In the review, `E\<file>` means the
file of this folder. They were copied from the reviewer's experiment folder, which is not part of the repository; the
rest of the researchers' experiment data (about 20 MB) was not copied.

Changes made when copying: the two scripts find the repository root four levels up (one line each), and the absolute
path prefixes in recorded stack traces were cut to repository-relative paths. Nothing else was changed.

## Files by finding

| finding | recorded when the problem was found (review, 17:03–17:30) | recorded at the re-check (19:07–19:20) and after the fix |
|---|---|---|
| B1 — the fallback dropped a nearer valid puzzle | `implementation-closest.json` | `phase8-closest.json` (4 / 4 returned = closest verified) |
| B2 — full ratings not all counted against the cap | `implementation-caps.json`, `implementation-cap-boundary.json` | `phase8-caps.json`, `phase8-cap-boundary.json` (calls = counted) |
| B3 — re-added clues one replay step early | `implementation-replay.json`, `implementation-contracts.json` (minimal synthetic case) | `phase8-replay.json`, `phase8-contracts.json` (0 errors) |
| B4 — qualification passed after a lost request | `implementation-qualification-fault.json` (39 outcomes, "offered") | `phase8-qualification-fault.log` (the run now fails) |
| B5 — a Killer fallback skipped the uniqueness check | `phase8-keeper-safety.json` (two solutions) | `phase9-keeper-safety.json` (implementer), `orchestrator-keeper-safety.json` (orchestrator): one solution on all three seeds |
| Killer fallback replay | | `phase8-fallback-replay.json` |
| S1 — refused cells stay refused | `implementation-rejections.json`, `implementation-rejections-high.json` | |
| S4, N1 — fingerprint, design example | `implementation-fixtures.json` | |
| qualification cells reproduced | `implementation-qualified-classic6-hard.json`, `implementation-qualified-killer-veryHard.json`, `implementation-qualified-mega16-nightmare2.json` | |
| generator → player exports | `implementation-exchange.json` | |
| generation sample (input of the replay mode) | `implementation-generation.json` | |
| full suite at review time | `implementation-tests.log` | |

## Running the probes again

From the repository root, with the sudoku-player checkout next to it (the `contracts` and `exchange` modes read the
player's files). The scripts write `<prefix>-<mode>.json` into this folder; set a prefix so that the recorded outputs
are not overwritten:

```powershell
$env:SG_REVIEW_OUTPUT_PREFIX = 'rerun'
node docs\report-v2\gpt-6-astra\evidence\implementation-probes.js closest        # also: caps, cap-boundary, replay,
                                                                                # contracts, keeper-safety, fallback-replay,
                                                                                # generation, exchange, fixtures, rejections
node docs\report-v2\gpt-6-astra\evidence\implementation-qualification-fault.js  # must fail the qualification run
```

`keeper-safety` registers a deliberately unsound test technique in memory only; no source file is changed by any mode.
