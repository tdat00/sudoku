# MS18e E4b handoff: Hell 1 ruling (a)+(c) applied (handoff revision 4)

Developer: dev (claude-sonnet-5.5). HEAD is still `5f697ef9`; everything below is uncommitted for the orchestrator's commit.
**No git write (git was used for reads only), no source or fingerprinted file edit, no Node command outside `run-locked-e.ps1`.** The raw records
(`handoff-v3.md`, `handoff-v3-2.md`, `handoff-v3-3.md`, `items.json`, `items-v2.json`, `gates.json`, `gates-v2.json`, `e2-summary.md`, the reconcile output
`preflight/deep-reconcile-hell1-v2.json`, the 14 Hell 1 records) are unchanged. Raw summary of the held rows: `e4a-summary.md`; clocks: the `e4b-*` rows of `lock-log.jsonl`.

## 1. The ruling applied

SA1's ruling (a)+(c), with SA2's binding ruling matching: the full 14-record Hell 1 reconcile is **a commit-label-only split**. Disposition (accepted wording):
"Complete, correct, source-compatible Hell 1 cohort; commit-only provenance difference verified separately. Raw strict reconciliation result retained."
It is not a general exit-1 allowance. Exact 0 of 14, the shallow fallbacks and the measured costs stay numerical findings, not relabelled as passed. Kept unchanged:
exit 1, `complete` true, `evidenceSound` false, `identity.commit` null, the one problem `mixed identities: commit has 2 values`, correctness pass (14), relations 6/0/0.
No tool edit, no record edit, no re-run.

## 2. The equivalence file (git reads only)

`preflight/deep-hell1-commit-equivalence.json` (sha256 `f8d20f509a95599978502646e111a7f7851b8c74165318f9f6b3e3be0ec737c9`; transcript `transcripts/e4b-equivalence-check.txt`, a copy of the
read-only console output, created with the file tool and labelled as such because the checks ran from the shell, not through Node). Contents:

- both full SHAs, `547168b48d5eb7a9165432db87a227a9d1c4b068` and `5f697ef9aae3df7b2116834b6111931b27129dda`, and the complete name-only diff (271 names, equal to git's own list), grouped;
- the diff limited to `core/`, `player/` and `generator/` outside `generator/tests/artifacts/`: **empty**;
- the `.github` changes described accurately: workflow comments **and** quick-manifest timing metadata (`generator-quick.json` `measuredSeconds` and provenance); none is a deep-recipe input;
- blob IDs at both commits for the **70** files the deep tool loads (the 64 ordered engine `SOURCE_FILES`, `node-runner.js`, `generator/tests/mega-contract.js`,
  `generator/tests/fixtures/mega-contract.js`, `tool-records.js`, `replay-fixtures.js`, `node-evidence.js`): **all 70 pairs equal**; the subtree IDs of `core`, `player`,
  `generator/js`, `css`, `assets`, `tests/fixtures`, `tests/suites` and `tests/manual` are equal;
- the 14 records with ID, file hash, commit and the remaining identity fields: one `sourceHash` (`b8ec138d...`), one `toolHash` (`7b797b5c...`), Node v26.13.0, allowance 256,
  budget 500,000 ms, process limit 540,000 ms, checks version 1, dirty false; **only the commit differs** (`547168b4` for the seven mega12 records, `5f697ef9` for the seven mega16 records);
- the raw reconcile file's hash (`fd567f18a551056efdf83c758e6c643b2ee465bcb47ef3d9c8514e9fb4a36357`) and its sole problem, the earlier partial reconcile's hash, and the ruling.

No loaded blob differed, so no `QUESTION:` arose.

## 3. Updated paths

- `audit/items-v3.json`: **regenerated** with the fourth patch `audit/items-e4b-ruling.json` (patch order: `items-e3-corrections`, `items-e4a-results`, `items-e4b-ruling`):
  30 inherited + 40 added = **70 items**, 63 tokens carried, 0 problems. New or replaced rows: `MS18e-DEEP-HELL1-14` (complete and correct, ruled (a)+(c), raw strict reconcile retained),
  `MS18e-HELL1-COMMIT-EQUIVALENCE` (new), `MS18e-SAV11-PROFILE` and inherited `S-AV11` (an open performance finding with a named future owner), `MS18e-ACCEPTANCE-STATE`
  (open for the remote-CI gate only; no A, B or W decision outstanding), `MS18d-DEEP-PUBLIC-REGISTRATIONS` override.
- `audit/gates-v3.json` (edited in place): `coverage` pass for the assigned scope (the 563 manual assertions are listed scope exclusions, unexecuted), `releaseReadyReasons` has **one** entry
  (the final matching-head remote CI), `coverage.deep.hell1` pass with the accepted wording and the equivalence file cited, `pending-ruling` removed from the vocabulary; non-blocking observations
  unchanged apart from S-AV11: the five GP misses (74 of 79, 72 required), S-AV14 (83 of 100), Hell 1 exactness and cost, S-AV11, the manual scope exclusions.
- `docs/difficulty-v3/release-v3.md`: acceptance state, status table, section 3 (the ruling and the equivalence file), section 4, section 5 (two new rows), evidence map, third revision note,
  70 items, and the explicit statement **acceptance does not authorize merge or deployment**.
- `docs/difficulty-v3/notes.md` (MS18e section), `.github/workflows/pull-request.yml` and `pages.yml` (comment line 15 only, kept as you asked: they go into the next commit and get the final CI run),
  `e4a-summary.md` (the stale "ruling requested" sentence and the attempts caveat).
- S-AV11, stated everywhere without a claim: the pipeline timings are summed over the 5 attempts, so which attempt carries the ~335 s of `fullGrid` and whether it is level-independent is unknown,
  the cause is unknown, and whether the offered Jigsaw levels are affected is not established; readers should go by the record's `e3` field.

## 4. Checks (all through `run-locked-e.ps1`, factor 2, `CI` unset)

- `e4b-items` (regeneration): exit 0, `items: ok (30 inherited + 40 added = 70 items; 63 tokens carried)`, 0 problems.
- `e4b-identities`: exit 0; Generator quick `46b3d0e2...`, Player quick `45dc0473...`, with-manual `d8d48983...`, replay `1cf64919...`, hash `344afdec...`: **unchanged** from `e4a-identities-end`.
- `e4b-helpers-hash-2`: exit 0, 9 files, `helpers-sha256-v3-4.txt` identical to `helpers-sha256-v3-3.txt` (the helpers did not change in this round).
- `e4b-format-check` (format on every changed text file), `e4b-outputs-hash` (`outputs-sha256-v3-6.txt`): see their transcripts and the lock log.
- CRLF: every file written or edited is CRLF-only with a final newline (checked by byte count: no LF-only line).

## 5. Disclosures

1. `audit/items-v3.json` (an uncommitted draft of the E4a round) was **deleted and regenerated** because the helper refuses to overwrite; `gates-v3.json` was edited in place. Neither was committed; no committed record was altered.
2. `e4b-helpers-hash` **failed** (exit 1, no output written): my command line carried a placeholder path instead of `phase-d/closeout.js` and `phase-c/readiness-probe.ps1`. It is kept in the lock log as a failed row;
   the corrected command ran as `e4b-helpers-hash-2` (a new id; the first row wrote nothing, so this is a corrected command line, not a retry of a measurement).
3. `transcripts/e4b-equivalence-check.txt` is a copy of the shell output of the read-only git checks, not a tee transcript.
4. `gate-1.txt` has my appended last line `exit=0` (disclosed earlier). The gate's timeout exit is 3, not the 6 the brief named.
5. The workflow comment edits touch `.github` after the CI head `7d0fb2c0`; they are comments only. Between `547168b4` and `5f697ef9` the `.github` diff also contains quick-manifest timing metadata (not mine to describe further; it is in the equivalence file).

## 6. Open

Only the final matching-head remote CI (orchestrator and owner). S-AV11 stays an open performance finding with a named future owner; it blocks nothing.
