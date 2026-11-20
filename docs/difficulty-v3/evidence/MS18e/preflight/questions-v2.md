# MS18e questions: status after the joint ruling (round 2)

Written 2026-11-20 12:35 (+07:00). This file supersedes `questions.md` where the two differ; `questions.md` is kept as it was.
Nothing here admits an E2 row: the E2 release table is the orchestrator's.

## Resolved by the ruling

| Question | Ruling | What was done | Evidence |
|---|---|---|---|
| Q-B1-EXTRA | add both guards, nothing else | `difficulty.test.js:997-999` (`MS18e-COMPAT-CLASSIC-HELL1-FLOOR`): `SG.fixtures.toolRecords.withRequestedLevel('classic9', LEVELS[i - 1], function () { return D.spec(LEVELS[i - 1], model9); }).value.allowedTechniques`; `difficulty.test.js:1447-1449` (`MS18e-COMPAT-CLASSIC-HELL1-SYMMETRY`): `var p = SG.fixtures.toolRecords.withRequestedLevel('classic9', level, function () { return SG.digger.generate(model9, level, SG.rng.create(8550 + i), {}); }).value;`. The original expressions, requests and assertions are unchanged. Validation status: static scan only; neither test has run. | `audit/manual-hidden-requests-final-v2.json`: 116 sites in 8 suites, **0 unguarded hidden-level requests**, 0 unclassified, 0 stale rules; the three `difficulty.test.js` guards (killer master, FLOOR, SYMMETRY) are each matched to a `withRequestedLevel` call in the three preceding lines |
| Q-TIME-FACTOR | my premise was wrong | `core/tests/harness.js:36-41` gives 2 when neither `SG_TIME_FACTOR` nor `CI` is set (3 with `CI`); the first version of this file said 1 and was wrong. `run-locked-e.ps1` now sets `SG_TIME_FACTOR=2` explicitly, refuses to start (exit 2, a `refused-before-start` row) when `CI` is set, and records both in every `lock-log.jsonl` row | `preflight/inventory-all-v2.json` and `inventory-variants-v2.json` record `timeFactor: 2` (the metadata of `--list-tests` and `--results` comes from the same field, `core/tests/node-evidence.js:292` and `:308`); the older inventories also say 2 (the default) |
| Q-GD-KNOWN | preserve S-AV14 | `GD-normal` carries `exitPolicy`: expected 7 of 8, the hit-rate assertion about 83 of 100; the orchestrator inspects the raw exit-1 result before continuing; no automatic `-AllowExit1`, no retry, no relabelling as a pass; 83 of 100 is claimed only if the new evidence reports it; a different outcome means review | `preflight/admission-plan-v2.json` |
| MS05r6a-COV01 | not an erroneous label | MS05r6a used G11 (compact step 2, peak 1,967); MS09a (`4cf0cb35`) moved the assertion to G12 (compact step 4, peak 3,221): **moved at MS09a, still asserted** at `generator/tests/suites/player.test.js:703-728` (and, on a synthetic jump table, `replay.test.js:999-1012`). G11 is the sign-jump specimen of `player.test.js:952-976`. No test or fixture was changed; E3 executes it | this file |
| Docs before E2 | finish every fingerprinted guide and design edit | `player/design.md`: the directory block rewritten to the real layout (own `js/engine/`, `js/ui/`, `css/`, `tests/` and what is shared in `../core/`, `../docs/puzzle-exchange/fixtures.md`, `../docs/qa/browser-run.md`, `../.github/`) and the §2.2 techniques row (31 → the 40 registered). `DEVELOPERGUIDE.md` and `DEVELOPERGUIDE.vn.md`: the weights bullet (30 techniques → the 40 weights of `SG.difficulty.WEIGHTS`, `generator/js/engine/difficulty.js:81`, the v2 ones measured and the v3 ones priors, as `generator/design.md` section 18 says). Audited and left unchanged: counts, CI scope, exactness/shallow/Retry text, history and defaults in the four guides (the DEVELOPERGUIDE already carries the 55 / 4,807 / 63, 32 / 2,981 and the PR browser job). Workflow comments and report data outside the fingerprints follow the measured results | `preflight/plan-v2.json`; node `help` suites re-run: Player 28 of 28, Generator 30 of 30 (`transcripts/v2-help-*.txt`) |

## Still open (held in the release table; no change from `questions.md`)

- **Q-I5-BOUND:** the 32 I5 rows rest on a different-cohort envelope; the orchestrator's release table gives each its P.
- **Q-RATIO-BOUND:** the three S-OD8 ratios have no defensible bound (worst cases 558, 464 and 520 s); held.
- **Q-DEEP-BOUND:** the 21 Nightmare/mega12-Hell 1 runs are released with P30/P150/P230 in the orchestrator's table; the 7
  `DEEP-mega16-hell1-*` stay held; the old records are not current (a fresh cohort per level).
- **Q-SAV11-ROUTE:** the route is now prepared as `generator/tests/artifacts/difficulty-v3/MS18e/profile-s-av11.cjs`, run only
  without `--owner-decision` (exit 2, nothing loaded or called). The real call waits for the owner's answer to
  `MS18e-Q-SAV11` and a technical route review.
- **Q-MS17B-FILES:** no action.

## Not edited, for the record

`player/design.md:70` of the first version (`docs/ fixtures.md · qa.md`) is gone with the directory block rewrite; the paths now
named exist (`docs/puzzle-exchange/fixtures.md`, `docs/qa/browser-run.md`). The dated MS13a/MS13b/MS13c and §2.1/§2.2 text under
the "one repository" note of `player/design.md` is history and was not touched, except the technique count of the §2.2 row.
