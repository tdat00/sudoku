# MS18e E0 and E1 handoff, round 2

Developer: dev (claude-sonnet-5.5). Round 2 follows the joint ruling of 2026-11-20 12:21 (+07:00); worked from 12:21 to about 12:40.
**No E2 live command, no E3, no browser run, no git write.** HEAD is `b0a29ffd7e7bd45b962c4d3221e3ee1acb3b5859`; the tree holds
the E1 edits of both rounds and this evidence. `handoff.md` (round 1) is kept as it was; where they differ this file is current.

## 1. What changed in round 2

| Ruling | Result | Evidence |
|---|---|---|
| 1 Both guards | `difficulty.test.js:997-999` (`MS18e-COMPAT-CLASSIC-HELL1-FLOOR`) and `:1447-1449` (`MS18e-COMPAT-CLASSIC-HELL1-SYMMETRY`) per-call `withRequestedLevel('classic9', ...)` guards, original expressions kept. Rescan of all 8 manual suites: **0 unguarded hidden-level requests** | `audit/manual-hidden-requests-final-v2.json` |
| 2 Time factor | `run-locked-e.ps1` sets `SG_TIME_FACTOR=2`, refuses to start when `CI` is set; both v2 inventories record `timeFactor: 2`. My round 1 premise (factor 1 locally) was wrong: `core/tests/harness.js:36-41` defaults to 2 | `preflight/questions-v2.md`, `lock-log.jsonl` (the `env` of every row) |
| 3 S-AV14 | `GD-normal` carries the exit policy (7 of 8 expected, 83 of 100 only if reported, raw exit-1 inspected by the orchestrator, no automatic `-AllowExit1`) | `preflight/admission-plan-v2.json` |
| 4 COV01 | recorded as "moved at MS09a, still asserted", not an erroneous label | `preflight/questions-v2.md` |
| 5 Docs before E2 | `player/design.md` directory block and the §2.2 techniques row; the weights bullet of both DEVELOPERGUIDE files; the four guides audited for the other stale-fact classes | `preflight/plan-v2.json` |
| 6 Refresh | identities, inventories, compatibility proof, hidden-level scan, targets re-check and the plan, all as new `-v2` files bound to the corrected tree; the plan keeps the 88 row IDs, projections and statuses (reviewed plan sha256 `f411c2f7...e447c9` matches) | `audit/final-identities-v2.txt`, `preflight/*-v2.*` |
| 7 S-AV11 driver | `profile-s-av11.cjs` prepared; run only without `--owner-decision`: plan printed, **exit 2**, nothing loaded or called, no profile folder | `transcripts/sav11-noflag-2.txt` |

Identities (round 2): Generator quick `46b3d0e2...`, Player quick `45dc0473...`, with manual `d8d48983...`; replay, hashes, sources and
targets unchanged. The E2 source identity for with-manual runs is `d8d48983...`.

## 2. Superseded and regenerated, stated plainly

- Superseded, kept unedited: `preflight/inventory-all-after-e1.json`, `inventory-variants.json`, `inventory-variants-2.json`,
  `variants-compatibility.json`, `variants-compatibility-2.json`, `audit/manual-hidden-requests-final.json` (2 hits),
  `audit/final-identities.txt`, `audit/targets-recheck-final.json` (byte-identical to the v2 one), `preflight/admission-plan.json`
  (the reviewed plan), `scope-map.json`, `reuse-map.json`, `questions.md`, `plan.json`, `handoff.md`, `helpers-sha256.txt`,
  `outputs-sha256.txt`. Their identity fields name the earlier tree; none is the E2 source identity.
- **Deleted and regenerated (round 1), not kept:** the first outputs of `plan-write` (`admission-plan.json`, `scope-map.json`,
  `reuse-map.json`) were deleted and written again as `plan-write-2` after two mapping corrections. The pre-deletion bytes do not
  exist any more; the files now carrying those names are the regenerated ones (the reviewed plan, sha256 `f411c2f7...`, is one).
- **Converted in place (round 1):** seven generated JSON files (`manual-hidden-requests-before.json`, `-final.json`,
  `admission-plan.json`, `scope-map.json`, `reuse-map.json`, `variants-compatibility.json`, `variants-compatibility-2.json`)
  had LF inside and CRLF at the end; `transcripts/crlf-fix.txt` rewrote them to CRLF (old and new hash prefixes are in it). The
  mixed-ending bytes are not kept. The plan's reviewed sha256 is of the converted file.
- Development and failed runs in `lock-log.jsonl` this round: `sav11-noflag` (the caller did not accept the helper's designed
  exit-2 throw; fixed with an exact-match rule, rerun as `sav11-noflag-2`), `scan-final-v2` (my own syntax error in `audit.cjs`,
  fixed, rerun as `scan-final-v2b`), and `format-check` of round 1 (the seven mixed-ending files).

## 3. Disclosures that still stand

Read-only `git` and PowerShell file reads ran from the shell, not through the caller (no Node ran outside it); `audit.cjs` has
long lines; the `candidate-same-work` bounds rest on MS17b timings with a margin of 2 that is my proposal; the workflow comments
and the report data outside the fingerprints are deferred; the variants reuse is accepted subject to the final recheck at E3.

## 4. Questions

None new. Q-I5-BOUND, Q-RATIO-BOUND, Q-DEEP-BOUND and Q-SAV11-ROUTE are in the orchestrator's release table or held (see
`preflight/questions-v2.md`).
