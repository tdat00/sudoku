# MS18e E0 and E1 handoff

Developer: dev (claude-sonnet-5.5). Dispatch `tasks/difficulty-v3/MS18e-dispatch-and-release-gates.md` at
`b0a29ffd7e7bd45b962c4d3221e3ee1acb3b5859`. Started 2026-11-20 10:55:10 (+07:00). E0 and E1 only: **no E2 live command, no
E3 quick set, no browser run, no git write.** HEAD is unchanged; the tree holds the E1 edits and this evidence.

## 1. What was done

| Stage | Result | Evidence |
|---|---|---|
| Baseline identities | all seven values equal the dispatch values | `preflight/baseline-identities.txt` |
| Targets re-check before any edit | exit 0; 135 / 79 active / 56 absent / 62 retained / 17 updated; no problems | `preflight/targets-recheck-before.json` |
| Registration (all suites) | 5,836 tests, 63 suites, 0 skipped, 31 benchmarks, no registration error | `preflight/inventory-all.json` |
| B1 static scan, before | 116 call sites in 8 suites, all classified, 4 unguarded hidden hits (2 assigned, 2 new) | `preflight/manual-hidden-requests-before.json` |
| E1 edits | see `preflight/plan.json` (`e1Edits`, with code citations and item dispositions) | the tree |
| B1 static scan, final | 116 sites, 2 unguarded hidden hits left (the two new ones); the two assigned are guarded | `audit/manual-hidden-requests-final.json` |
| Variants reuse proof | `reused-compatible`: 88 of the 89 compared blobs identical (the one other is `perf-helper.js`, criterion 2), perf-helper diff 12 rows / 17 values and comments only, no consumer on the loaded path, `--suite=variants` loads only its file, 285 of 285 (ordinal, full name) equal MS18c | `preflight/variants-compatibility-2.json` (final), `variants-compatibility.json` (superseded, see 4) |
| Scope, reuse and admission | 88 rows; the matrix and the questions | `preflight/scope-map.json`, `reuse-map.json`, `admission-plan.json`, `questions.md` |
| Registration after E1 | same 5,836 tests (suite, ordinal, name, kind, skipped, timeout); only the fingerprint moved | `preflight/inventory-all-after-e1.json` |
| Targets re-check after the last edit | byte-identical to the one before (same JSON SHA-256) | `audit/targets-recheck-final.json` |
| Identities after E1 | Generator quick `8863c705...`, Player quick `c4c6caec...`, with manual `79f53764...`; replay, hashes, sources, targets unchanged | `audit/final-identities.txt` |
| CI helper | selftest 67 checks, 0 failed; `check` passed: 4,807 tests in 55 suites, 2,981 in 32, Player 750 s of 900 s | `transcripts/ci-selftest.txt`, `ci-check-after-e1.txt`, `ci/check-after-e1/` |
| F1 (browser help script) | `TECHNIQUES = 40`; node `help` suite 28 of 28; syntax valid; not run in a browser | `transcripts/f1-*.txt` |
| F2 (`.gitattributes`) | `text eol=crlf` set for `replay-wire.js`; `i/lf w/crlf attr/text eol=crlf`; not listed by `git status` | `preflight/plan.json` |

## 2. Where to look first

- `preflight/questions.md`: eight questions; **Q-B1-EXTRA** (two more hidden-level hits in `difficulty.test.js:1445` and `:997`)
  is the one that changes the E2 plan.
- `preflight/admission-plan.json`: per row the command, population, evidence, and one status:
  `candidate-same-work` (22 rows: the seven classic9 batches, the confusion matrix (187.7 s measured, projected 376 s) and
  the 14 other difficulty groups), `candidate-envelope-different-cohort` (32 I5 selectors), `no-defensible-bound`
  (32: the three ratios, the 28 deep occurrences and S-AV11), `reuse-no-run` (the 94 CV3 selectors and the mega16 replay).
  Nothing is admitted by this file.
- `preflight/scope-map.json`: the manual assertions that are **outside** this dispatch stay unexecuted and are not reported
  as "the suite passed": extra-regions 117, greater-than 103, jigsaw 82, killer 91, perf 48, wordoku 122 tests.

## 3. Commands

Every Node command is a row of `lock-log.jsonl` (schema `ms18e-lock-1`, per-row tee and helper seconds), with its transcript in
`transcripts/`. All short (the longest, the compatibility proof, 28-29 s of git reads); nothing generated a puzzle.

## 4. Disclosures

1. **Development runs are logged too.** `scan-enumerate` (wrong child arguments, my mistake), `scan-enumerate-2/3` (exit 1 by
   design: unclassified sites while the rules were written), `compat-dry`, `plan-dry`..`plan-dry-4` (no output file) and
   `plan-write` are in the log. `plan-write`'s three outputs were **deleted and regenerated** as `plan-write-2` after two own
   mapping corrections (the MS17b qualification group and the preference for a repaired run over its failed run).
2. **Mixed line ends in my own generated JSON.** `JSON.stringify(..., 2)` plus a final CRLF gave seven files with LF inside and
   CRLF at the end, which `core.safecrlf` would refuse. The helper now writes CRLF throughout and `crlf-fix`
   (`transcripts/crlf-fix.txt`) rewrote the seven files in place (only line ends changed; old and new hashes are in the transcript).
3. **Superseded pair.** `preflight/inventory-variants.json` and `variants-compatibility.json` were produced before the two
   user-guide edits; their fingerprint inputs are therefore stale. `inventory-variants-2.json` and
   `variants-compatibility-2.json` are the proof on the final tree. The first pair is kept, not edited.
4. **Read-only commands outside the caller.** `git` reads (diff stats, log, rev-parse, status, check-attr, ls-files) and
   PowerShell file reads ran from the shell, not through the caller; no Node and nothing timed ran outside it.
5. **Long lines.** `audit.cjs` has 191 lines above 110 characters (the rule is for the engines); my additions to the two CI
   scripts reach 120 (the existing lines reach 126).
6. **Deferred inside E1:** the workflow comments (dispatch section 4 item 5) need the release map and the E2 results; not
   changed, not claimed. `docs/difficulty-v3/release-v3.md`, `docs/README.md`, `notes.md` and the other guide counts are later stages.
7. **Same-work evidence is old evidence.** The `candidate-same-work` bounds rest on MS17b timings (same machine class, same Node,
   same deterministic seeds, engine files unchanged except variant support arrays and two UI files, per `git diff`). The margin
   of 2 is my proposal. MS17b ran at `SG_TIME_FACTOR=2`; see Q-TIME-FACTOR.
8. **MS05r6a-COV01** names G11, but the reveal fold is asserted on G12 today (`questions.md`, last section).
