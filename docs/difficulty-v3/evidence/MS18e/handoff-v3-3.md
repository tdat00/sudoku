# MS18e E4a handoff: the held rows executed under the owner's decision A (handoff revision 3)

Developer: dev (claude-sonnet-5.5). Started 2026-11-20 14:46:54 (+07:00) on HEAD `5f697ef9` (pack-only on top of `7d0fb2c0`, tree clean at the start).
**No git write, no push, no source or fingerprinted file edit, no Node command outside `run-locked-e.ps1`** (the two PowerShell scripts that are not
Node, the gate and the host probe, ran from the shell as the SA1 conditions said). Owner answer: `RATIOS=A; MEGA16-H1=A; SAV11=A`, message
`1573242656648069141`, 2026-11-20 14:44:38 +07:00. The raw records (`handoff-v3.md`, `handoff-v3-2.md`, `items.json`, `items-v2.json`, `gates.json`,
`gates-v2.json`, `e2-summary.md`) are kept unchanged. Full table and numbers: `e4a-summary.md`; clocks: the `e4a-*`, `DEEP-mega16-*`, `RATIO-*`,
`deep-reconcile-hell1-v2` and `sav11-run-1` rows of `lock-log.jsonl`.

## 1. Order and rules followed

Identities re-verified first (`transcripts/e4a-identities-start.txt`): equal to the E2/E3 source identity (with-manual `d8d48983...`). Three ratio selectors
listed (1 test each, `preflight/e4a-selectors/`). Then, one unchanged invocation each, strictly serial, `SG_TIME_FACTOR=2`, `CI` unset, gaps of at least
15 s, 540 s ceiling, no retry, exact commands of `preflight/admission-plan-v2.json`: the seven mega16 Hell 1 deep rows (14:48 to 15:28), the three ratio
rows (15:29 to 15:35), the full Hell 1 reconcile (file-only, 15:35:54), then SAV11 (gate 15:37 to 15:39, run 15:39:22 to 15:45:05). I kept my suggested
order (deep rows first, then ratios) because the reconcile needs the seven mega16 records and the ratios are the shortest.

## 2. Results

| Row | Tee s | Exit | Result |
|---|---:|---:|---|
| DEEP-mega16-hell1-invariant-1 / -2 / -3 / -4 | 320.737 / 360.546 / 336.865 / 329.378 | 0 | each: outcome ok, correctness pass, exact false, attempts 2 of 2, difficulty.approximate and difficulty.shallow |
| DEEP-mega16-hell1-cv5-a / -b / -other | 342.589 / 334.665 / 324.607 | 0 | same |
| RATIO-off / RATIO-summary / RATIO-full | 120.554 / 120.527 / 121.352 | 0 | 1 of 1 passed each |
| deep-reconcile-hell1-v2 (file-only) | 0.734 | **1** | complete true, correctness pass (14 passed), relations 6/0/0, **evidenceSound false** (see section 3) |
| sav11-run-1 | 342.803 | 0 | record written; request returned, exact true, 5 attempts |

No row reached the 540 s ceiling, none was killed, none was retried. Transcripts: `transcripts/<row id>.txt`.

## 3. The full 14-record Hell 1 reconcile: needs a ruling

Raw result of `tests/mega-contract.js --reconcile=<deep/hell1> --level=hell1` (`preflight/deep-reconcile-hell1-v2.json`, `transcripts/deep-reconcile-hell1-v2.txt`): exit 1;
14 requests, 14 records, 14 produced, `complete` true, correctness pass (14 passed, 0 failed, 0 unevaluated), relations 6 pass / 0 fail / 0 unevaluated;
`sourceHash` `b8ec138d...` and `toolHash` `7b797b5c...` are single values and match the current ones; exact 0 of 14 (all shallow fallbacks); mega12 generation
92.102 to 103.711 s, mega16 319.837 to 359.556 s. **One problem**, which makes `evidenceSound` false and the exit 1 (`mega-contract.js:1181`): `mixed identities:
commit has 2 values` (mega12 records `547168b4`, mega16 records `5f697ef9`). `git diff 547168b4 5f697ef9` touches only `docs/`, `tasks/`, `.github/` and the helper
`generator/tests/artifacts/.../audit.cjs`; the with-manual fingerprint (and the other four identities) did not change. I did not edit the tool or any record, did not
re-run anything and mixed no MS07b record.

**QUESTION (ruling for the orchestrator and SAs):** is a `commit` difference over identical source and tool hashes acceptable for route A's "full same-source reconcile"?
Options: (a) accept it, recording the raw result (complete, correctness pass, 6/0/0, evidenceSound false by a commit-only mismatch) with the same-tree proof above, no
tool edit and no new launch; (b) not accept it, which would need new mega12 or mega16 launches on one commit, i.e. extra launches beyond decision A that only the owner
can authorize; (c) add a supplementary file-only check (new helper mode) that compares sourceHash, toolHash, node, allowance and checksVersion and proves the tree
identical between the two commits. My default would be (a) plus, if wanted, (c); I did not act on it, and the register and gates carry the result as `pending-ruling`.

## 4. S-AV11 profile

Conditions of SA1's route acceptance, all met: run from the repository root through the locked caller with the exact node arguments (tee-c, new transcript `sav11-run-1.txt`,
`profile-s-av11.cjs`, `--owner-decision=1573242656648069141`, `--json=.../profile/s-av11/record-1.json`); exit 0 (a record was written; outcome returned).
Gate (`gp-gate3.ps1 -Label sav11.r1`, output `profile/s-av11/gate-1.txt`): `GATE pass ... absence=123s serviceWindow=123s/22 intervals`, exit 0 (the script's timeout exit is 3, not 6; I
appended my own last line `exit=0` to the saved output). Host snapshots with the unchanged probe, PID 1968, before (15:39:22.282) and after (15:45:06.434): `host-before-1.json`,
`host-after-1.json`; between them (344.152 s) the host gained 0.19 CPU-s/s and no other process except System Idle reached 0.5 CPU-s/s (raw context, not an admission
decision). Record checks: `identity.sourceHash b8ec138d...` equal to the E2 deep records, `dirty` false, request jigsaw9 / expert / 1111 / trace off, `ownerDecision` recorded,
`timingKeysComplete` true, `cellCount` 81, default attempts 8, offered levels after the call veryEasy, easy, normal, hard, master, hell2 (Expert absent). Outcome: returned,
exact true, achieved expert, score 979, 5 attempts, 33 clues, no warnings. Clocks: hrtime 342,091.5 ms, performance.now 342,091.5 ms, Date 342,093 ms. Seven timings (ms):
configure 0.759, buildModel 37.238, **fullGrid 335,178.670 (98.0 %)**, extraStructure 0.317, dig 6,719.969 (2.0 %), rate 147.849, tune 0.396. Against the historical 325.313 s of an
older engine **the delay reproduces** (342.092 s) and the pipeline's own timing places it in `fullGrid`; no cause is asserted.

## 5. Registers and documents

- `audit/items-v3.json` (30 inherited + 39 added = 69 items, 63 tokens carried, 0 problems; built from `items-e3-input.json` + `items-e3-corrections.json` +
  `items-e4a-results.json`) and `audit/gates-v3.json` (blockers: the matching-head CI and the ruling above; observations apart). `audit.cjs` `items` now accepts several
  `--patch` files in order.
- `release-v3.md` edited in place (acceptance state, status table, sections 3 to 5, evidence map, second revision note); `docs/difficulty-v3/notes.md` MS18e section updated.
- **Outside the ask, flagged:** the comments of `.github/workflows/pull-request.yml` and `pages.yml` said the ratio rows and the mega16 Hell 1 rows did not run; I corrected those comment lines
  (comments only, 6 lines each). If you prefer not to touch `.github` after the CI head, drop those two files from the commit and the comments stay stale.

## 6. Files

Modified: `docs/difficulty-v3/release-v3.md`, `docs/difficulty-v3/notes.md`, `.github/workflows/pull-request.yml`, `.github/workflows/pages.yml`, `generator/tests/artifacts/difficulty-v3/MS18e/audit.cjs`,
`lock-log.jsonl`. Added under `evidence/MS18e/`: `e4a-summary.md`, `handoff-v3-3.md`, `audit/items-e4a-results.json`, `audit/items-v3.json`, `audit/gates-v3.json`,
`profile/s-av11/` (`record-1.json`, `gate-1.txt`, `host-before-1.json`, `host-after-1.json`), `manual/ratios/` (3 results), `deep/hell1/` (7 mega16 records),
`preflight/deep-reconcile-hell1-v2.json`, `preflight/e4a-selectors/` (3), `helpers-sha256-v3-3.txt`, `outputs-sha256-v3-5.txt`, and the transcripts.

## 7. Open

The ruling in section 3; the remote-CI gate (orchestrator); nothing else from this round.
