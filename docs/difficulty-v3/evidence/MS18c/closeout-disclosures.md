# MS18c post-GQ closeout record: freeze, official merge, disclosures

Developer record for checkpoint A. Measured identity of every GQ record: **`ed2fe50c`, dirty**, engine
sources `0ca29eaeebc295b6`, qualifier `c0ef0d25f28518692bdccbde547814daf74f5834d35f9e117108d6321876fd77`.
This file is not part of the frozen trees; nothing under `runs\` or `qualification\` was edited, moved, added or
removed after the inventory was written (06:43:25 +07:00 on 2026-11-19, HEAD `585b3f4f`).

## 1. Freeze

| Item | Value |
|---|---|
| Inventory | `docs\difficulty-v3\evidence\MS18c\outputs-sha256-gq.txt`, written once with `inventory.cjs write` |
| Content | 2,201 files, 5,774,584 bytes: `runs\` 1,931 files / 4,776,462 bytes (410 folders), `qualification\` 270 files / 998,122 bytes (135 cell JSON + 135 Markdown) |
| Inventory SHA-256 | `016A5D42425FFAF2CBA1A53E343733463894EAE1D7AE1D48BADC57A5837866D7` (336,462 bytes) |
| Format | CRLF lines `<SHA-256>  <repository-relative path>`, sorted by path (UTF-16 code units) |
| Verification | `inventory.cjs verify` before the merge (`inventory-gq-verify-1.txt`) and after it (`inventory-gq-verify-2.txt`): file set and every hash equal |

Hidden files, journals, receipts, held attempts, status files, logs and `last-release.txt` are all in the
inventory (no hidden file exists). The preflight, `standin`, `standin-s3b` and the `-s3`/`-s3b` helper and output
inventories are unchanged.

## 2. Official merge

`qualify.js --merge=<qualification> --jobs=4 --json=merge\qualification-v3.json --markdown=merge\table.md`, run
through `Invoke-Dv3Node` (task `MS18c-merge`), on sources `0ca29eaeebc295b6`, HEAD `585b3f4f`.

| Item | Value |
|---|---|
| Exit | 0; no CORRECTNESS warning; `totals.invalid === 0` |
| Output | `merge\qualification-v3.json` SHA-256 `B8E546FC0BA5BD1F79F408984BF3BF8F82559305EA6BD63CBE6DC53BEFF0DF04` |
| Output | `merge\table.md` SHA-256 `55FA37C244218DC16FB61A21E93B9E250B8B894708E7918843A17922CDEE0965` |
| Transcript | `merge\merge-transcript.txt` (full, with the exit line) |
| Validation | `merge\merge-validation.txt` from `merge-check.cjs`: no problem in 135 cells |
| Hashes | `merge\merge-sha256.txt` |

**Disclosure:** my first merge run piped its transcript through `Select-Object -First 14`, which cut the transcript
and left the exit code unrecorded. The outputs were already written. I kept that transcript as
`merge\merge-transcript-run1-truncated.txt`, then ran the same command again with the full transcript. The second
run rewrote the same two output files byte for byte (identical SHA-256 values to the first run). No other file
changed.

### What `merge-check.cjs` verified (file-only, no solver)

- measured identity and header: sources, qualifier, rating 3, jobs 4, seed base 20260601, guard 120000 ms, the
  approved machine and attempt policy, probe 0, early stop on;
- totals: 135 cells, **4,313** requests, 3,783 exact hits, 503 approximate, **27 errors**, **0 invalid**,
  **79 offered / 56 hidden**, 54 stopped early;
- all 135 manifest keys exactly once; every request key, index and seed (a second round records its own indexes
  from 40 to 99); every non-error outcome valid and solved; no `valid:false`;
- the 27 `budget.exceeded` errors, by cell: mega16/Hell 1 **9**, samurai/Hell 1 **9**, sohei/Hell 1 **6**,
  Greater-Than/Hell 1 **2**, samurai/Nightmare **1**; maximum 120,051.7349 ms, below 130,000;
- the canonical `checkCell` of every merged cell with its manifest premises;
- every merged cell equal to its promoted cell record, and its summary equal to its receipt; every receipt
  `accepted` with exit 0 and no fault, T expiry, leftover or loss; the receipt's canonical and original hashes
  equal to the promoted file;
- every journal: valid hash chain, exactly one accepted record, 140 attempts, 960 events, five eligible
  `additional-consumer` holds each followed by exactly ordinal 2, no gap and no recovery;
- R equal in the journalled `qualifier-created`, the acceptance receipt and the final `status.post.monitor`;
- headline bounds: max R 7.8444534 s, min W-Q-R 0.1795489 s, max Q-S 1.0731562 s, W-Q 7.3844708 to 8.034013 s,
  max W 368.08897 s (samurai/Hell 1), sum W 6,760.276141 s, every R at most 45 s;
- the three second rounds: hyper/Expert 53 requests (indexes 87 to 99 in the second round), flower/Nightmare 50
  (90 to 99), wordoku/Normal 46 (94 to 99);
- each variant's support list equal to its offered cells; **79** offers; against the v2 archive (118 offers) **39
  removed and none added**;
- Greater-Than Normal 40/40, p95 10,192.4051 ms; diagonalX Expert 37/40, p95 11,795.9214 ms; Killer Hard 0/14
  (p95 6,887.1679 ms, misses) and Expert 2/12 (p95 34,368.4147 ms, time), all raw hidden verdicts;
- SA2's reviewed-set digest reproduced:
  `00d611b7760cdbe435cf74c76420a49aa527c90d32c4daf496fcb02b195d308a`;
- the derived log: 135 rows equal to the receipts (keys, slot, ordinal, verdict, counts and times within their
  display rounding).

## 3. Heartbeat disclosure (document, never repair)

In **53** of the 135 final `status.json` files `clocks.rSeconds` is still `null`: the last 10 s heartbeat came
before the qualifier was created. For all 135 cells the journalled `qualifier-created.rSeconds`, the acceptance
receipt R and `status.post.monitor.metrics.rSeconds` agree. `activeProcesses` and `clocks.elapsedSeconds` are the
last heartbeat's snapshots, not terminal job counts or the total outer time O. The completed run is established by
the native window/drain result (`status.window`), the receipt and the terminal logs. Across the 140 final status
files `writeFailures` and `window.callbackErrors` are both 0 and no window fault is recorded. No old status file
was changed and no time was invented.

## 4. The five eligible holds and their re-asks

All five were primary-slot additional-consumer holds; each was followed by exactly ordinal 2 and then accepted.
The minimum ordinary release-to-acquisition gap in the set is 15.015 s.

| Cell | Lock release to next acquisition | Lock release to journalled admission | Journal hold to journalled admission |
|---|---:|---:|---:|
| mega12/hell2 | 61.585 s | 63.993 s | 64.027 s |
| killer/hell2 | 61.814 s | 64.320 s | 64.355 s |
| butterfly/veryEasy | 61.976 s | 64.469 s | 64.504 s |
| flower/nightmare | 86.405 s | 88.945 s | 88.982 s |
| wordoku/hard | 77.356 s | 79.820 s | 79.855 s |

The first two columns are the orchestrator's measurements from the lock files. The third is computed from the
journal (`attempt-end` of ordinal 1 to `admission-begin` of ordinal 2). All are at least 60 s. The mega12 run ID
was allocated before a logged 22 s re-ask wait; run-ID timestamps are not admission timestamps.

## 5. Derived cell log

The orchestrator's per-cell TSV was briefly written as a file named `-` under `evidence\MS18c\` at 05:31:53
(+07:00), after GQ and outside `runs\` and `qualification\`, because a `node -` script used `process.argv[1]`
instead of its output argument. At about 05:52 it was moved to
`C:\Users\ledat\.copilot\session-state\c2f29688-8568-4f25-bace-e644d381e5f9\files\ms18c-gq-cell-log.tsv`.
No GQ evidence file was touched. It is copied byte for byte (26,231 bytes, 136 CRLF lines: a header and 135 rows)
to `evidence\MS18c\gq-cell-log.tsv`, SHA-256
`09B83DE1B174AC5F9E7504BD1B03EF5BD9961D96063D156A99A20ADD05D98148`, equal to the orchestrator's and SA2's value.
It is a derived convenience log with display-rounded times, never the authority; `evidence\MS18c\-` does not
exist.

## 6. Helpers and checkpoint A records

Three file-only helpers were added to `generator\tests\artifacts\difficulty-v3\MS18c\` for this continuation,
each run through `Invoke-Dv3Node`: `inventory.cjs` (write and verify the freeze inventory), `merge-check.cjs`
(the validation above) and `freeze.cjs` (the records below and `merge\merge-sha256.txt`). The `-s3b` helpers are
byte-identical to their `helpers-sha256-s3b.txt` values; the new records are `helpers-sha256-a.txt` (every
helper), `outputs-sha256-a.txt` (every evidence file outside the two frozen trees) and `format-check-a.txt`. The
frozen trees are never read, formatted or listed by `freeze.cjs`; their integrity is `outputs-sha256-gq.txt`.
The earlier `-s3`/`-s3b` records, the preflight and the stand-in evidence are kept and still verify.
