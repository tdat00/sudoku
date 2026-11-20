# MS18e E3 corrections (handoff revision 2)

Developer: dev (claude-sonnet-5.5). Started 2026-11-20 14:16:08 (+07:00), on HEAD `c5ee3df1` (the E3 commit, tree clean at the start), after the
binding SA2 findings with SA1 concurring. **Evidence and report only: no fingerprinted file changed, no git write, no Node command outside
`run-locked-e.ps1`.** The raw records (`handoff-v3.md`, `items.json`, `gates.json`, `e2-summary.md`) are kept unchanged and are superseded where
they differ from this file; the commands of this round are the `e3c-*` rows of `lock-log.jsonl`.

## 1. Corrections made

| # | Finding | Result | Where |
|---|---|---|---|
| 1 | Hell 1 partial reconcile, exit 1 | Classified **expected, missing-only incomplete, not a correctness failure**. Raw values kept (exit 1, `complete` false, `evidenceSound` false, `correctness` incomplete; 7 problems = exactly the 7 approved missing mega16 IDs; source and tool hashes match; 7 present and passed; relations 3 pass / 0 fail / 3 unevaluated). The earlier expectation of exit 3 was wrong: `generator/tests/fixtures/mega-contract.js:1030` adds the missing occurrences to `problems`, `:1054` sets `evidenceSound = problems.length === 0`, `:1180-1182` returns 1 before the incomplete branch that returns 3. No tool edit; no blanket rule that exit 1 is allowed | `audit/items-v2.json` (`MS18e-DEEP-HELL1-INCOMPLETE`), `audit/gates-v2.json`, `release-v3.md` section 3 |
| 2 | S-AV09, S-AV10, S-AV12, S-AV13 | The range closure is withdrawn. Four addressable rows with their MS05b3 history (`MS05b3/evidence.md:164,165,167,168`, `generator-state-2026-11-14.md:715-719`, `qualification-checkpoint-2026-11-15.md:154-158`, `MS05b3-bounded-manual-corpora.md:411`) and the final status read from `MS18c/merge/qualification-v3.json` (see below). `requiredTokenCoverage` now has all of S-AV01..S-AV39 (63 tokens). The false text is gone from `items-v2.json` | `audit/items-v2.json` |
| 3 | Acceptance state | Stated in `release-v3.md` and here (section 2); added as item `MS18e-ACCEPTANCE-STATE` | `release-v3.md`, `audit/items-v2.json` |
| 4 | `gates.json` | New version `audit/gates-v2.json`: `releaseReadyReasons` lists only the two real blockers; `nonBlockingObservations` holds the five GP misses (74 of 79, 72 required), S-AV14, the mega12 Hell 1 finding and the 563 manual assertions outside the dispatch; the ratio line reads "illustrative all-attempt estimates 558.2 / 464.3 / 519.5 s, not bounds" | `audit/gates-v2.json`, `items-v2.json` |
| 5 | Killer master guard | It ran: GD-rest-14, difficulty test 145, pass, 4,969.92 ms (the row passed 3 of 3). Three of four guards ran (GD-rest-08, GD-rest-11, GD-rest-14); only the perf serializer guard did not | `items-v2.json` (`MS18c-COMPAT-DIFFICULTY-KILLER-MASTER`), `release-v3.md` section 4, `gates-v2.json` |
| 6 | Reconcile file paths | `release-v3.md` evidence map names `preflight/deep-reconcile-nightmare.json` and `preflight/deep-reconcile-hell1-partial.json` and the difference from the dispatch paths (`deep/reconcile-nightmare.json`, `deep/reconcile-hell1.json`); the files are not moved | `release-v3.md` section 7 |

**Final statuses of S-AV09, S-AV10, S-AV12, S-AV13** (read from `qualification-v3.json`, matching SA1's table):

| Item | Final status |
|---|---|
| S-AV09 | Killer Master 11/14 and Nightmare 18/22, both hidden on time (p95 42,674.0885 and 32,738.6213 ms) |
| S-AV10 | Wordoku Normal 35/46, hidden (misses). Nightmare 40/40, offered; its E2 I5 test passed (1 of 1); its GP miss (p95 2,800.4616 ms against 1,500) stays the separate item `MS18d-GP-MISS-wordoku-nightmare` |
| S-AV12 | Sohei Nightmare 29/30 and Flower Nightmare 42/50, both hidden (time). Butterfly Nightmare 40/40, offered and met its GP target (p95 15,151.7914 ms against 30,000). The 2026-11-15 checkpoint's older conclusion (all three offered) is not carried over |
| S-AV13 | Butterfly Easy 1/15 and Flower Easy 0/14, both hidden (misses) |

S-AV11 stays separately held (`MS18e-Q-SAV11`).

## 2. Acceptance state

E0, E1, E2 and E3 are completed stages. **MS18e stays OPEN** until the owner answers the held questions (`MS18e-Q-GD-DEEP`: `RATIO-off`,
`RATIO-summary`, `RATIO-full` and the seven `DEEP-mega16-hell1-*`; `MS18e-Q-SAV11`: the S-AV11 profile) and their outcome is complete:
**A** one launch of each held row plus the full 14-record Hell 1 reconcile; **B** recorded as held, **not** as a waiver. The only other route is an
explicit, scoped acceptance waiver. Green CI closes only the remote-CI gate.

## 3. How the corrected register was built

`audit.cjs` gained a `--patch` option for `items` (removeAdded, replaceAdded, added, inherited overrides, heldRows; both files hashed into the
output) and its required tokens are now S-AV01..S-AV39 (before: S-AV09, S-AV10, S-AV12 omitted). `audit/items-e3-input.json` is untouched; the
revision is `audit/items-e3-corrections.json`; the output is `audit/items-v2.json`: 30 inherited + 38 added = 68 items, 63 tokens carried,
0 problems, every evidence path exists.

## 4. Checks (all locked, file-only)

`e3c-items` and `e3c-items-2` (items), the format check, the helper hash, the identities capture and the outputs inventory; see `lock-log.jsonl` for
tee, helper and caller seconds. Disclosure: the first corrected register written by `e3c-items` had the withdrawn phrase quoted in its own revision
note; I deleted that uncommitted draft (`items-v2.json`, written two minutes earlier), reworded the note and wrote the register again as
`e3c-items-2` to the same path. The `e3c-items` transcript and its lock row are kept as the record of that superseded draft.

## 5. Files

Modified: `docs/difficulty-v3/release-v3.md` (in place, with a revision note), `generator/tests/artifacts/difficulty-v3/MS18e/audit.cjs`,
`lock-log.jsonl`. Added: `audit/items-e3-corrections.json`, `audit/items-v2.json`, `audit/gates-v2.json`, this file, `helpers-sha256-v3-2.txt`,
`outputs-sha256-v3-4.txt` (current inventory, excluding this file, the lock log and its own transcript; the earlier inventories are kept) and the
`e3c-*` transcripts.

## 6. Open

`MS18e-Q-GD-DEEP` and `MS18e-Q-SAV11` unanswered; remote CI pending; no question about these corrections.
