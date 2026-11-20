# MS18e held rows executed under the owner's decision A (RATIOS=A; MEGA16-H1=A; SAV11=A)

Owner answer message `1573242656648069141`, 2026-11-20 14:44:38 +07:00, recorded in pack commit `5f697ef9`
(`MS18e-dispatch-and-release-gates.md` section 7, "Recorded held-row decisions"). Source identity re-verified before the first row
(`transcripts/e4a-identities-start.txt`): with-manual `d8d48983...`, Generator quick `46b3d0e2...`, Player quick `45dc0473...`, replay `1cf64919...`,
hash `344afdec...`, all equal to the E2/E3 source identity. Every row is one unchanged invocation through `run-locked-e.ps1` (`SG_TIME_FACTOR=2`,
`CI` unset, gaps of at least 15 s, 540 s ceiling), strictly serial, no retry, with the exact command of `preflight/admission-plan-v2.json` (the three
ratio selectors were first listed, 1 test each: `preflight/e4a-selectors/`). Authoritative clocks: `lock-log.jsonl`.

## Rows

| Row | Start (+07:00) | Tee s | Exit | Result | Transcript |
|---|---|---:|---:|---|---|
| DEEP-mega16-hell1-invariant-1 | 14:48:16 | 320.737 | 0 | outcome ok, correctness pass, exact false, attempts 2 of 2, warnings difficulty.approximate and difficulty.shallow | `transcripts/DEEP-mega16-hell1-invariant-1.txt` |
| DEEP-mega16-hell1-invariant-2 | 14:53:52 | 360.546 | 0 | same | `transcripts/DEEP-mega16-hell1-invariant-2.txt` |
| DEEP-mega16-hell1-invariant-3 | 15:00:08 | 336.865 | 0 | same | `transcripts/DEEP-mega16-hell1-invariant-3.txt` |
| DEEP-mega16-hell1-invariant-4 | 15:06:00 | 329.378 | 0 | same | `transcripts/DEEP-mega16-hell1-invariant-4.txt` |
| DEEP-mega16-hell1-cv5-a | 15:11:44 | 342.589 | 0 | same | `transcripts/DEEP-mega16-hell1-cv5-a.txt` |
| DEEP-mega16-hell1-cv5-b | 15:17:42 | 334.665 | 0 | same | `transcripts/DEEP-mega16-hell1-cv5-b.txt` |
| DEEP-mega16-hell1-cv5-other | 15:23:32 | 324.607 | 0 | same | `transcripts/DEEP-mega16-hell1-cv5-other.txt` |
| RATIO-off | 15:29:11 | 120.554 | 0 | 1 of 1 passed (test 120,112.5 ms) | `transcripts/RATIO-off.txt`, `manual/ratios/off.json` |
| RATIO-summary | 15:31:27 | 120.527 | 0 | 1 of 1 passed (test 120,079.3 ms) | `transcripts/RATIO-summary.txt`, `manual/ratios/summary.json` |
| RATIO-full | 15:33:43 | 121.352 | 0 | 1 of 1 passed (test 120,828.7 ms) | `transcripts/RATIO-full.txt`, `manual/ratios/full.json` |
| deep-reconcile-hell1-v2 (file-only) | 15:35:54 | 0.734 | **1** | see below | `transcripts/deep-reconcile-hell1-v2.txt`, `preflight/deep-reconcile-hell1-v2.json` |
| sav11-run-1 | 15:39:22 | 342.803 | 0 | record written; request returned, exact true | `transcripts/sav11-run-1.txt`, `profile/s-av11/record-1.json` |

No row exceeded the 540 s ceiling, none was killed, none was retried. The deep records are in `deep/hell1/mega16-hell1-*.json`. The ratio results are
complete and source-stable on `d8d48983...`, factor 2. A ratio test is synchronous and the harness does not stop it at its 120,000 ms timeout
(`core/tests/harness.js:415-418`); each passed on its first attempt at about 120 s.

## Full 14-record Hell 1 reconcile (raw)

`tests/mega-contract.js --reconcile=<deep/hell1> --level=hell1 --json=<preflight/deep-reconcile-hell1-v2.json>`: **exit 1**.
`requests 14, records 14, complete true, evidenceSound false, generation 14 produced, correctness pass (14 passed, 0 failed, 0 unevaluated),
relations 6 pass / 0 fail / 0 unevaluated`; `identity.sourceHash b8ec138d...` and `toolHash 7b797b5c...` are single values and
`currentMatches` is true for both. mega12: 7 of 7 produced, exact 0, 7 shallow fallbacks, generation min 92.102 s, median 99.364 s, max 103.711 s,
guard 160 s (margin 56.008 s). mega16: 7 of 7 produced, exact 0, 7 shallow fallbacks, generation min 319.837 s, median 333.628 s, max 359.556 s,
over 120 s: 7, guard 500 s (margin 140.265 s). **The one problem** (hence `evidenceSound` false and exit 1,
`mega-contract.js:1181`): `mixed identities: commit has 2 values`, the seven mega12 records `547168b4...` (E2) and the seven mega16 records
`5f697ef9...` (HEAD when they ran). `547168b4..5f697ef9` changed only `docs/`, `tasks/`, `.github/` and the helper `audit.cjs`; the source, test,
guide and design files are identical and the with-manual fingerprint is unchanged. Not edited, not re-run. Ruled (a)+(c) afterwards (SA1's ruling, SA2's
binding ruling matching): a commit-label-only split verified in `preflight/deep-hell1-commit-equivalence.json`; the raw result above stays as recorded.

## S-AV11 profile (record `profile/s-av11/record-1.json`)

Gate `gate-1.txt` (the unchanged `gp-gate3.ps1`, scheduling only): pass at 15:39:21, absence 123 s, exit 0. Host snapshots (unchanged
`readiness-probe.ps1`, PID 1968 copilot.exe, created 2026-11-13 19:26:33 +07:00) at 15:39:22.282 and 15:45:06.434 (`host-before-1.json`,
`host-after-1.json`). Between them (344.152 s): the host gained 0.19 CPU-s/s (65.09 s); no other process except System Idle reached 0.5 CPU-s/s
(next: System, MsMpEng.exe, MsSense.exe and an svchost at 0.03). Raw context only; the Node call itself is not in either snapshot.
Record checks: `identity.sourceHash b8ec138d...` (equal to the E2 deep records), `dirty` false, commit `5f697ef9...`, request the original four
fields (jigsaw9 / expert / 1111 / trace off), `ownerDecision` `1573242656648069141`, `timingKeysComplete` true, `cellCount` 81, default attempts 8,
offered levels after the call veryEasy, easy, normal, hard, master, hell2 (Expert absent: the guard restored them).
Outcome: returned, exact true, achieved expert, score 979, solved, 5 attempts, 33 clues, no warnings. Clocks: hrtime 342,091.5 ms, performance.now
342,091.5 ms, Date 342,093 ms; tee 342.803 s. The seven `pipeline.timings` fields (ms, summed over attempts): configure 0.759, buildModel 37.238,
**fullGrid 335,178.670 (98.0 %)**, extraStructure 0.317, dig 6,719.969 (2.0 %), rate 147.849, tune 0.396; sum 342,085.2. The historical whole-request
time was 325.313 s on an older engine: **the delay reproduces** (342.092 s), and the pipeline's own timing places it in `fullGrid`, not in `dig`.
This is a measurement of one request, with no cause asserted. The timings are summed over the 5 attempts: which attempt carries the `fullGrid` time is unknown.
