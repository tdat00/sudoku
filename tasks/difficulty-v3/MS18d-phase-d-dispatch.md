# MS18d — Phase D dispatch: final attribution, quick verification and handoff

| Field | Instruction |
|---|---|
| Scope | MS18d steps 9–11 only; complete the existing task, not another GP campaign |
| Dispatch evidence | `732d1b66b31e00f996365a796251de1a19dedd53`; final GP report/receipts are committed |
| Developer | One serial developer; no Git writes, pack edits or task-log edits |
| Review | SA1 objected to `6e4d97bc` with B1–B3 and M1–M4; concurrence follows incorporation of those conditions, with no further review round requested |
| Release | This amendment incorporates B1/M1–M4 and the committed B2/B3 inputs below; the orchestrator releases the task and accepts its implementation |
| Not yet complete | Phase D documentation, both final-fingerprint quick sets, final file-only GG check and item handoff |

This leaf controls the current dispatch where the main MS18d leaf still describes
earlier holds or conditional releases. Read `AGENTS.md`, the main leaf's steps 9–11
and R6 in `MS18d-r24-request-ledger.md`. All local Node commands, including file-only
checks and registration, go through the unchanged **`Invoke-Dv3Node`** in
`generator\tests\artifacts\difficulty-v3\MS18c\invoke-dv3node.ps1` and the
mandatory unchanged **`phase-c\tee-c.js`** transport specified below.
Keep serial execution, shared locks, >=15 s gaps, <=450 s admitted projections and
the 540 s hard ceiling. These are functional/documentation checks, not new GP
samples; do not run the GP recorder/controller or acquire another GP run slot.

## 1. Immutable inputs and the completed campaign

Use the existing final report:

`docs\difficulty-v3\evidence\MS18d\gp\all-79\final.m1\report.json`

Its checkout-byte SHA-256 at dispatch is
`0d2c8baf1ef8131081935747484923dd8593f78f606dd202a0303d7ec324e349`.
Read its sibling `request.json`, `result.json`, `wrapper.json`, `binding.json`,
`journals.json`, cleanup records and stdout/stderr/transcript; never rewrite them.

The report records **complete=true, meets=true, 79/79 complete cells, 3,950
requests, 74 meeting strict p95 < target, required 72, 35 extra cold starts,
zero problems**. `result.json` records exit 0, zero stderr and clean cleanup.
The report has **114 consumed complete raw ledgers**, not 117:
**22 B1 + 0 B2 + 89 B3 + 3 B4**. The a3s are the previously unstarted chunks'
first actual payloads, not additional sample sets or reruns.

The final C log has **125 lines**: 114 successful recorder runs, nine control-holds,
one zero-admission pre-window event and the one successful final merge.
Of the nine control-holds, eight were consumer/readiness holds and one was the
mega16-easy a2 release-history acquisition hold. Keep all of them as holds.

Preserve and cite:

- B1/B2/B3 declarations and proofs; the transport/history repairs and their reviews.
- B4 `6e60b06c7d1af482ecafe28ce2fb35a03c2a54be`;
  record/proof commit `553ef96466bbeeb664e738dc4ddc8dce9afa5245`.
- H4 `9699d3ee76b1a1848412b1a6f5bd3a25c8e8daf5576cdeaa781ea8c529323c15`,
  57 entries, in `phase-c\helpers-c4-sha256.txt`.
- V1 and V2, including V2 canonical identity
  `7d63342a0ffb1a3a6794959276ba4a5aa2ef116f8f6ef154b9888220f0b7dd69`,
  232 slots and default cap two.
- Owner decisions S-OD16/17/18 at
  `f2f345a1d1748e041ca296ad898adcbfa971b837`, the exact question records,
  Q4 wording archive `d0b746bb`, and all three committed F3 lines.
- The three **disposition objects**: mega16-easy in base-3's `lineDisposition`,
  plus `MS18d-hyper-hard-line-disposition.json` and
  `MS18d-butterfly-master-line-disposition.json`. Do not invent a separate
  mega16-easy disposition file.
- Original-queue checkpoint `e76eb34a3eb8b0c7fd26a5c2041c74b7b81dcda5`,
  a3 checkpoint `e1e2233f044021741cd15fb2752a2d62f103416c`,
  and final-merge checkpoint `732d1b66`.

All source/epoch/plan checks are against the **saved campaign HEADs** and their
declared tuples, not a fictional single common HEAD. Later Phase D document edits
are legitimate post-campaign work; do not try to admit them as a new C2 HEAD,
retag old records, edit the frozen merger, or rerun `final.m1` to accommodate them.
SA1's independent raw-ledger recomputation is now committed as an input below.
Attach its outcome; do not repeat it or acquire another real merge invocation.
The provenance audit also covers R5's captured executed contents and empty
`execArgv`/`NODE_OPTIONS`, complete saved A-readiness and the committed host/ruling
version actually used by each admission. A summary boolean alone is not that audit.

### Committed B2/B3 review inputs — read only, do not rerun

The orchestrator published both inputs in
**`84a591adb81696dbc04359bdd91b9f50609b5474`**:

- `docs\difficulty-v3\evidence\MS18d\phase-d\operator\`:
  `operator-records.json` (`ms18d-operator-records-v1`, labelled **operational
  record, not authority**) and 16 retained operator files. Use the per-file
  source/committed SHA, size, timestamps and role, reconstructed gate-version
  mapping, manual-launch reconciliation, a3 gate rows and explicit unknown list.
  The committed copies use CRLF; `merge-pre.ps1` was normalized from LF and has
  distinct source/committed digests. Do not call that copy byte-identical.
- `docs\difficulty-v3\evidence\MS18d\phase-d\sa1-recompute\`:
  `sa1-gp-recompute.cjs`, its tee `transcript.txt` and `recompute.json`, whose
  checkout-byte SHA-256 is
  `1779f78ba4451e3906492df53cee88bfff0cc35e30e3d8764f835542ec663409`.
  The recorded run exited 0 with zero problems, independently matching all
  79 cells, all 114 consumed ledgers, totals and holds against the final report.

These two directories already exist and are **orchestrator/SA1-owned immutable
inputs**, not developer output directories. Cite/read/hash them; do not execute
their scripts, rerun their checks, edit or overwrite them. Authority remains with
the committed campaign records, declarations and rulings, not the operator scripts.

## 2. Exact write boundary

### Living files

1. **Create** `docs\difficulty-v3\performance-v3.md`.
2. **Update** `generator\design.md`, section 9.1's attribution/status and directly
   coupled historical/pending wording only; preserve its entire numeric table.
3. **Update together** `DEVELOPERGUIDE.md` and `DEVELOPERGUIDE.vn.md`, the Generator
   performance-tool paragraph and any directly coupled final-GP wording.
4. **Timing metadata only, if required by the existing rule:**
   `.github\scripts\generator-quick.json` — counts, measured seconds,
   `projectionSeconds` and dated provenance. No IDs, selections, groups, commands,
   tiers, `outOfCi`, factor, overhead or workflow-timeout change.

No other living document is assigned. In particular, do not edit the user guides,
historical reports, `AGENTS.md`, workflows or CI tools to manufacture a pass.
Use the new performance report for this task's measured quick-cost update.
No application, fixture, suite, target-table, qualification/publication or frozen
Phase A/B/C helper/evidence edit is authorized; the main leaf's earlier Phase B/C
write permissions are not reopened.

### New Phase D evidence

Everything new goes under
**`docs\difficulty-v3\evidence\MS18d\phase-d\`**, never an older phase/run.
The existing `operator\` and `sa1-recompute\` subdirectories are excluded from
developer writes:

| Path relative to that directory | Contents |
|---|---|
| `plan.json` | Exact commands, selectors, projections/bases, outputs, dependency/order and clocks; explicitly label both target outputs as Phase D re-checks despite the reused tool's fixed Phase B kind/note |
| `provenance-audit.json` | Frozen input identities, epoch/HEAD checks, receipts, attempts/holds and declaration references |
| `gp-cells.csv` | All 79 report rows: n, p50, p95, max, target, verdict, k, extra starts and cold-start flags |
| `item-register.json` | Every mandatory item below, source/population, numbers, status, limitations and next owner |
| `external-consumers.json` | Consumer/hold and scheduling-version audit, sourced wait/expiry values and explicit unknowns |
| `identities-before.txt`, `identities-final.txt`, `identities-after-quick.txt` | Actual five-identity outputs from the existing identity tool |
| `targets-recheck-before.json`, `targets-recheck-final.json` | Mandatory unchanged `phase-b\freeze-targets.js` outputs before any living-file edit and after the last R6 edit, respectively |
| `bindings.json` | The five identity-tool values plus producer-sources and target-table identities from both target re-checks, with target/design/budget-pair validation |
| `ci-before\`, `ci-final\` | Fresh retained inventories from the existing CI coverage check; no overwriting |
| `results\focused-docs.json` | Focused `perf-tooling,smoke,help` results, excluded from full-quick coverage accounting |
| `quick\generator-<shard-id>.json` | Exactly the eight final Generator shard result files below |
| `quick\player-quick.json` | Final whole Player quick results |
| `quick-coverage.json`, `quick-cost.json` | Per-app exact coverage reconciliation and separately labelled clocks/projection arithmetic |
| `transcripts\` | New exclusive transcripts for every command, including failed/superseded attempts |
| `lock-log.jsonl` | Phase D command/exit/wait/duration records only |
| `helpers-sha256.txt`, `outputs-sha256.txt`, `handoff.md` | Final owned-helper/output inventory and developer handoff |

If a persisted helper is useful, only these new task-owned paths are authorized:

```text
generator\tests\artifacts\difficulty-v3\MS18d\phase-d\closeout.js
generator\tests\artifacts\difficulty-v3\MS18d\phase-d\test-closeout.js
generator\tests\artifacts\difficulty-v3\MS18d\phase-d\run-locked-d.ps1
```

They are optional, narrowly scoped file-only report/coverage checks and a thin
locked caller, not new measurement tooling. Reuse existing identity/CI/hash tools
and pure target-parsing exports. Add focused synthetic rejection cases only for
new validation behavior, such as a missing/duplicate test ordinal or stale
fingerprint. Add no package or registered quick suite.

Do not invoke historical log-writing wrappers unchanged: Phase B's wrapper writes
Phase B's log, and Phase C's writes the frozen C log. A Phase D caller uses the
unchanged shared helper and **`phase-c\tee-c.js`**, writes exclusively to Phase D,
retains partial output/real exits and enforces gaps. Never overwrite evidence;
use a numbered new filename for a corrective rerun.

### M1 — mandatory transcripts and failure handling

`Invoke-Dv3Node` gives Node the host console. PowerShell
`*>&1 | Out-File` captures the helper's `exit= seconds=` line, **not the Node
command's output**; it is not a command transcript.
Every Phase D Node invocation therefore has this argument structure:

```text
Invoke-Dv3Node -NodeArgs @(<unchanged tee-c.js path>, <new Phase-D transcript>,
                         <actual child tool/script>, <its arguments>...)
```

Use the tee path appropriate to the command's working directory:

| Working directory | Tee path |
|---|---|
| `generator\` | `tests\artifacts\difficulty-v3\MS18d\phase-c\tee-c.js` |
| `player\` | `..\generator\tests\artifacts\difficulty-v3\MS18d\phase-c\tee-c.js` |
| Repository root | `generator\tests\artifacts\difficulty-v3\MS18d\phase-c\tee-c.js` |

This includes identities, both target re-checks, registration/CI, focused/full
quick runs, file-only GG and any new helper tests. The tee refuses an existing
transcript and retains incremental/partial output if the 540 s ceiling kills it.
Use ordinary Node/non-detached mode; no tee/controller environment setting may
redirect records into archived runs.

The caller must record any exception thrown by `Invoke-Dv3Node`, actual exit or
absence of an exit, transcript path/completeness and timing, **then stop**.
Never reuse a previous `LASTEXITCODE` after a timeout, suppress a failure or
accept exit 1 as a successful quick/check result.
Store the tee's final `seconds`, the helper's `seconds`, and the runner's own
time as distinct clocks. For the CI projection rule, **m is the tee's final
`seconds` from a successful complete-coverage run**, not either other clock.

## 3. Step 9 — validate and assemble the final result

Build the report from `final.m1\report.json` and its bound records, not rounded CLI
stdout, GQ p95s, a scheduler completion count or an average of chunk percentiles.
Validate the expected set of 79 cells and each complete cell's 50 original
indices/seeds, target and consumed-ledger references. Retain the merger's exact
values and verdicts; display rounding must not drive a comparison.

The existing R24 statistics are sorted raw indexes **[24]/[47]/[49]** for p50/p95/max,
with **strict** `p95 < target`. The aggregate is 74/79, not “all cells passed”.
Keep these five named items, with exact numbers available from the JSON:

| Item | Cell | Display p95 ms | Target ms | Disposition |
|---|---|---:|---:|---|
| MS18d-GP-MISS-mega12-expert | mega12/expert | 4208.3516 | 3000 | Current GP miss; retained |
| MS18d-GP-MISS-sohei-hell2 | sohei/hell2 | 35522.675 | 30000 | Current GP miss; retained |
| MS18d-GP-MISS-butterfly-hell2 | butterfly/hell2 | 15496.1127 | 15000 | Current GP miss; retained |
| MS18d-GP-MISS-wordoku-expert | wordoku/expert | 604.149 | 600 | Current GP miss; retained |
| MS18d-GP-MISS-wordoku-nightmare | wordoku/nightmare | 2800.4616 | 1500 | Current GP miss; retained |

No target fitting, offering/pruning, budget increase, generator tuning, new seed,
warmup or rerun follows from a miss. Aggregate GP passed; individual misses remain
performance items for MS18e/future explicitly authorized work.

Report 62 one-chunk cells and 17 cells with 52 chunks, 114 successful recording
payloads, and **35 extra cold starts relative to one process per cell**. No
numerical equivalence to a monolithic fresh-process-per-cell benchmark is claimed.
The saved report flags **30 cold-start-sensitive cells**: keep each first-request
index/time, including index 0 versus extra starts, and the tie-inclusive
`time >= sorted[47]` rule. The flag is descriptive, not proof of causation.

Include the fixed Node/machine/policy tuple from the records: Node v26.13.0,
AMD EPYC 7763 64-Core Processor, **16 logical processors**, 64 GB, win32 10.0.26300,
serial jobs 1, trace summary, warmup 0, seeds `7000 + i*101`, selected
**MS18d-GP-host-active**. Keep raw `ready` separate from policy `admitted`.
This is neither strict-quiet-machine timing, Chrome/i5 reference-machine timing
nor a CI/browser performance pass.

### MS18d-C2-EXTERNAL-CONSUMERS and clocks

Include all observed consumer categories, with retained run/record references:
EventLog svchost; Dnscache svchost; Intune PowerShell/AgentExecutor; SenseIR
PowerShell; BackgroundDownload; MsMpEng; and **1ESDevBoxHibernationDelayAgent**.
The last appeared during wordoku-veryEasy a1 readiness at 04:30:11,
0.508 CPU-s/s; a2 succeeded. A gate pass never guaranteed that no later consumer
would appear. No service disabling, ancestry-wide CPU exemption or normalization.

Use this **reconstructed** mapping from the committed operator record. It is
based on file creation/last-write times and shell order, not retained byte-exact
copies of every historical script version. The ranges refer to original
attempts; all three a3s are listed separately in the last row.

| Chunks | Added scheduling gate / pack ruling | Operator script |
|---|---|---|
| 1–41 | None; authoritative A readiness/lock watches still applied | `gp-next.ps1` for B1 chunks 1–23 (created 18:27, rewritten 22:59 for B3 chunk 24 a1); `gp-next2.ps1` for B3 chunks 25–41 (created 23:04), with the automatic 65 s re-ask |
| 42–57 | `b0c0bfac752248c4223f633f2ed55bd67f6f6cdc` | `gp-gate2.ps1`, pre-00:54 version (Intune lineage + EventLog/Dnscache), via `gp-next3.ps1` |
| 58–97 | `2a5cb26ab37c91e1127310dbd348c2ca17533289` | `gp-gate2.ps1`, edited at 00:54:40 to add SenseIR descendants |
| 98–114 and the three a3s | `55c4e8671dce081f88cb314d4de4b8c8ad150215` | `gp-gate3.ps1`, via the 03:32 version of `gp-next3.ps1` and via `gp-a3.ps1` |

`gp-gate.ps1` (created 23:28:55) was **dry-tested only** and ran no real chunk.
Its sole `gp-gate-log.jsonl` row is that dry test, not a campaign gate record.
`gp-gate2.ps1` was created at 23:43:00 and passed two dry tests; `gp-next3.ps1`
was created at 23:48:13 and used it for real chunks 42 onward.
Only the final in-place-edited scripts remain: the 23:43 version of `gp-gate2`
and pre-03:32 version of `gp-next3` were not retained.
`gp-gate3.ps1` was created at 03:24:07, last written at 03:28:37; `gp-next3`
switched to it at 03:32:26. The 65 s re-ask came from **`gp-next2.ps1`**.
The archived `gp-chunk.ps1` was later edited at 06:31 to accept attempt 3
(`ValidateSet 1,2` to `1,2,3`); do not present it as an earlier executed snapshot.

SA1 reconciled **121 `gp-results.jsonl` rows to 121 of the 124 recorder-related
C-log events**. The three absent from that runner log were direct manual
`gp-chunk.ps1` invocations:

| C-log line | Invocation / source | Outcome and accounting |
|---|---|---|
| L24 | mega16-easy a2, B1; shell 13290 after a manual 58 s sleep | Pre-window give-up, no folder, zero admissions; not a missing payload ledger |
| L25 | mega16-easy a2, B2/H2; shell 13413 | Acquisition control-hold, consuming the second admission |
| L27 | mega16-normal a2, B3/H3; shell 13580 | Successful recorder payload |

Match event type and epoch as well as run ID: L24 and L25 share an a2 name.
A manual sleep duration alone is not the full release-to-request interval.
The runner log's **`code` is its own exit (0 even on its recorded holds)**;
it is not the authoritative recorder outcome. Its `seconds` is the enclosing
runner clock, not the recorder-process duration.

Use the actual pack notes, receipts and committed **operator-records.json**
for gate waits, reset episodes and 30-minute expiries, by version.
The outer gate was read-only outside the repository: its wait/expiry totals are
**not recoverable merely by counting C-log rows or subtracting payload times**.
Carry its explicit unknown/not-recorded list: per-chunk gate waits/resets/samples
and any 30-minute expiry/exit-6 pauses for chunks 42–114, plus the missing
historical script versions. Do not turn those unknowns into zeros, derive them
from `gp-results`, or run a new sampling campaign to reconstruct them.

**M3 — L24's actual record versus incident history:** L24 says
`heldAt:"foreign-lock-watch"` and its **last** watch is **4.233 s**.
The enclosing invocation lasted **about 1,203 s** according to
`MS18d-epoch2-transport-repair.md`, section **“Frozen incident and preserved
state”**, which also identifies the foreign-lock wording as misleading.
Cite that source for the approximate elapsed time; it is not a duration read
from L24, an outer-gate 30-minute expiry or proof of a foreign lock/CPU episode.

Known operator-reported a3 gate waits are **325 / 124 / 247 s** in S order
(696 s total for those three only). Keep their provenance and precision.
The mega16 gate row was copied by hand from shell output, not a saved gate
transcript; `a3-pre-mega16.txt` contains earlier pre-launch checks only.
The hyper and butterfly rows come from `a3-hyper.txt` and `a3-butterfly.txt`.
Do not promote them to total campaign waits or infer zero expiries.
Keep scheduled cooldown, outer gate, lock/pre-window, controller/readiness,
recorder process, raw request times and whole campaign wall span distinct.

**Clock correction:** the reported “31/30/40 s payloads” are rounded enclosing
runner clocks (`gp-results` records **31.1 / 30.4 / 39.5 s**), not saved
recorder-process durations. The tee exit markers are **0.921 / 1.118 / 10.124 s**
in S order; corresponding controller spans are **10.564 / 10.780 / 19.811 s**.
The final merge's tee duration is **6.889 s**, controller span **9.602 s**,
not the approximately 28 s enclosing invocation. Cite each field/clock; do not
reconstruct an exact wrapper duration from rounded announcements. Never add waits
to or subtract them from the raw GP request times.
Admission/gate observations are not whole-payload resource traces. Do not assign
the five misses or any apparent speedup to an external consumer without supporting
evidence, or discard a measured result on that speculation.

## 4. Step 10 — R6 living-document wording

Finish fingerprinted design/guide edits **before** final quick evidence.

### Generator design 9.1

Keep all 135 positions (79 positive / 56 absent), the exact integer-ms targets,
17 bold updates, 62 retained values and qualification-derived arithmetic unchanged.
Clarify the original Chrome/i5 reference contract and replace “later measurement”
wording with a completed-campaign reference. Do not recast the qualification
target-setting step as GP or claim the new Node run was on the reference machine.

The status must say, in substance:

> Final rating-v3 GP (MS18d) measured all 79 offered cells, 50 original requests
> each, using the task-owned R24 recorder invoking unchanged
> `SG.fixtures.perfTools.measure`. The single check-only raw-ledger merge completed
> 3,950 requests and found 74/79 cells meeting strict p95 < target (72 required);
> five misses remain reported. These numbers are not `perf.js`'s rounded stdout.
> The shared-slot, CLI-host-active Node campaign used 114 successful chunk
> payloads and 35 extra cold process starts; it is not a Chrome/reference-machine
> measurement or proof of equivalence to one fresh process per cell.

Link `../docs/difficulty-v3/performance-v3.md`. Preserve the stock CLI's legitimate
measurement-tool description, retained manual/deep budgets and regression-hash
role. Preserve all **eleven** retained-versus-GP contrasts and the closed seven
deep-registration removals; no section 15 test-contract change is assigned.

### Both developer guides

Add a short matching final-GP provenance/result paragraph to the Generator
Performance discussion, linking `docs/difficulty-v3/performance-v3.md`.
Do not remove valid stock-CLI examples or imply that their stdout supplied this
campaign. In Vietnamese the essential attribution is:

> GP cuối của xếp hạng v3 (MS18d) dùng bộ ghi R24 riêng của nhiệm vụ, gọi
> `SG.fixtures.perfTools.measure` không đổi và gộp kiểm tra các thời gian thô;
> không lấy số liệu từ stdout đã làm tròn của `perf.js`. Đủ 79/79 ô, mỗi ô 50
> yêu cầu; 74/79 đạt `p95 < mục tiêu` (cần 72), còn năm ô trượt được giữ nguyên.
> Đây là số đo Node theo chính sách shared-slot, CLI-host-active, với 35 lần
> khởi động tiến trình lạnh bổ sung, không phải số đo Chrome trên máy tham chiếu.

The English/Vietnamese facts must agree. Keep the existing quick counts unless
registration proves a change: **4,807 / 55 suites Generator; 2,981 / 32 Player**.
A deviation is a QUESTION, not permission to change tests/counts to fit.

### Final performance report

Include methodology and source/epoch/owner provenance; all 79 metric rows;
five explicit misses; cold starts/flags; nine holds and the pre-window event;
all three consumed owner exceptions and F3 dispositions; scheduling limitations;
the 17 pre-GP target changes; final GG/quick/CI evidence; and the full item
register below. Preserve GQ's measured source `0ca29eaeebc295b6` separately from
publication/GP source `75b0955e3e356bd1`; do not retag qualification evidence.
Report which results are local and which gates are still MS18e's responsibility.

## 5. Final identities, GG and complete bounded quick sets

### Existing read-only tools

- `generator\tests\artifacts\difficulty-v3\MS18c\identities-now.cjs` prints
  **five** identities: Generator quick, Player quick, Generator with manual,
  replay and hash, **without registering or running manual tests**. It prints
  neither producer-sources nor the target-table identity. Its input
  recipes match the current runners. Capture before edits, after final docs and
  after quick/CI completion, through the shared helper, from the repository root.
- **B1 is mandatory:** execute the unchanged `phase-b\freeze-targets.js`
  twice as specified below. Optional pure parsers or quick suites are not
  substitutes: no quick suite checks the 9.1 table or all eleven documented
  retained-versus-GP budget pairs.
- `tests\perf.js --hash-merge=..\docs\difficulty-v3\evidence\MS18d\hashes --check-hashes`
  from `generator\` is the required **file-only** final GG check.
  The existing folder has **104 ledgers / 520 keys / 26 combinations**.
  Capture a new Phase D transcript; no hash recording or update flag.
- From the repository root, use
  `.github\scripts\generator-quick.js check --keep=docs\difficulty-v3\evidence\MS18d\phase-d\ci-before`
  (later `ci-final`; fresh numbered directories for any rerun). It
  retains `generator-all.json`, `player-all.json` and `shard-<id>.json` inventories
  without running tests. Invoke its Node entry point through the shared helper
  and mandatory tee, not an unlocked shell wrapper.

### B1 — mandatory producer/target/document re-checks

From `generator\`, use these **child arguments after the mandatory tee path and
new transcript**, through `Invoke-Dv3Node`:

```text
tests\artifacts\difficulty-v3\MS18d\phase-b\freeze-targets.js --preflight=..\docs\difficulty-v3\evidence\MS18d\gp-preflight.json --json=..\docs\difficulty-v3\evidence\MS18d\phase-d\targets-recheck-before.json
tests\artifacts\difficulty-v3\MS18d\phase-b\freeze-targets.js --preflight=..\docs\difficulty-v3\evidence\MS18d\gp-preflight.json --json=..\docs\difficulty-v3\evidence\MS18d\phase-d\targets-recheck-final.json
```

Run the **before re-check** before any living-file/R6 edit; run the **final
re-check** after the last R6 edit and before focused/full quick runs. Use exclusive transcripts
`transcripts\targets-recheck-before.txt` and `transcripts\targets-recheck-final.txt`.
The caller must check that the JSON/part output paths are unused too; the reused
tool is not permission to overwrite an earlier re-check.

Both runs must exit 0 and report:

```text
positions 135: active 79, absent 56; retained 62, updated 17
table sha256 3d0bffdb19cc8d0e4c2495163858bfcbf3fd6e3d8567f4718dc722a23746963a
hash identity 344afdeca4e2afe58ec552ddf4390608f6aee2febe9eb9c958b0c03b7bb8c1f1
replay identity 1cf64919a9004259a203e65bc7e537b15b981f4ed52610f4cd62d28cf6950fcc (unchanged)
retained budgets that differ: 11 (documented 11)
```

Check the JSON as well: `identities.sources` is `75b0955e3e356bd1`,
`designTable.equalToFrozen` is true, `designTable.bold` is 17, all eleven
`retainedBudgets.statedIn` entries have **design/en/vi all true**, and
`problems` is empty. Any other result is a **QUESTION**.

The tool's printed `was 1032ab2f...58a0` is its historical pre-target hash,
not a Phase D before/after change; both new re-checks must have current
`344afdec...`. Keep the tool and its generated JSON unchanged. In `plan.json`
and the handoff, label these as **Phase D re-checks**: the tool's fixed
`kind`/`note` still says Phase B and “before GG”, not the chronology of these calls.

### M2 — expected pre-edit baseline, not a quick-pass claim

The first `identities-now.cjs` capture must show:

```text
Generator quick: 49089814be577a8cf821c85a22c843bbd9060014555790a933abcaecd95bb1f8
Player quick: aa352658286737074b8b5b9dc21b6d67fc6f082b32ce38a609e77f220b51d8c4
Generator with manual: 176f9c95f17492b5947df8ba393aff0a6956ea8a64ee6add3bac52f2407e9567
replay family: 1cf64919a9004259a203e65bc7e537b15b981f4ed52610f4cd62d28cf6950fcc
hash family: 344afdeca4e2afe58ec552ddf4390608f6aee2febe9eb9c958b0c03b7bb8c1f1
```

An unexplained baseline mismatch is a QUESTION. Phase B's guide edits changed
the Player fingerprint; **no committed Player quick evidence exists for
`aa352658...`**. Do not infer it passed because that fingerprint is expected.
Run the complete Player set on the final Phase D fingerprint; a failure is a
**QUESTION**, not permission to weaken an assertion or assume a known green baseline.

Expected unchanged identities:

```text
producer sources: 75b0955e3e356bd1
hash family: 344afdeca4e2afe58ec552ddf4390608f6aee2febe9eb9c958b0c03b7bb8c1f1
replay family: 1cf64919a9004259a203e65bc7e537b15b981f4ed52610f4cd62d28cf6950fcc
target table: 3d0bffdb19cc8d0e4c2495163858bfcbf3fd6e3d8567f4718dc722a23746963a
```

The Generator quick, Generator-with-manual and Player quick fingerprints **will
change with their design/guide inputs**; capture full actual hashes and explain
the input delta. Changed with-manual fingerprint is not permission to execute a
manual suite. Unexpected E/source/target/offer drift stops for QUESTION, not an
automatic rerecording, fixture rewrite or new generation campaign.

### Run order and selectors

1. Before any living-file edit, capture the M2 baseline identities and run
   `targets-recheck-before.json` through the mandatory tee/lock.
2. Complete R6 edits and create the report/link target. After the last such edit,
   capture final five-line identities and run `targets-recheck-final.json`;
   require every B1 check before quick verification.
3. From `generator\`, run `tests\node-runner.js --suite=perf-tooling,smoke,help`
   with `--results=..\docs\difficulty-v3\evidence\MS18d\phase-d\results\focused-docs.json`.
   It may use the own-fast shard's conservative current bound. This is diagnostic
   evidence, not a replacement for any final shard.
4. Run the pre-check with a fresh `ci-before` keep directory and save the exact
   current manifest/selectors and projection bases in `plan.json`.
5. Run each Generator shard **separately**, with its own locked invocation,
   `--results` file and process-wall transcript. Read the suite lists directly
   from `.github\scripts\generator-quick.json`, not an invented regrouping.
6. Run the Player's complete default quick set in its own locked invocation.

| Generator shard ID | Expected tests | Current projection seconds |
|---|---:|---:|
| core-shared | 2418 | 170 |
| steps | 59 | 70 |
| replay | 159 | 70 |
| mega | 108 | 50 |
| own-fast | 1767 | 330 |
| digger-target | 75 | 30 |
| pipeline | 151 | 80 |
| player | 70 | 90 |
| **Generator total** | **4807** | Sum is not one command's admission |
| **Player app, whole quick** | **2981** | **180** |

From `generator\`, each command is:
`tests\node-runner.js --suite=<that shard's exact joined suite list> --results=..\docs\difficulty-v3\evidence\MS18d\phase-d\quick\generator-<id>.json`.
From `player\`, use:
`tests\node-runner.js --results=..\docs\difficulty-v3\evidence\MS18d\phase-d\quick\player-quick.json`.
These are child arguments **after `tee-c.js` and the new transcript** in
`Invoke-Dv3Node -NodeArgs`; never pass them directly or launch unlocked Node.

Use normal local settings (currently default harness factor 2), no raised factor,
no `SG_DEEP`, no `--all`, `--manual`, `--bail`, new skip, threshold change or
changed test selection. Record Node/machine/environment and actual settings.
A whole Generator run is not admitted from its historical >540 s total.
Any revised selection/bound needed beyond the existing shards is a QUESTION.

Reconcile **per app** by `(suite, ordinal)`, not test name alone or a sum of counts:
each selected test exactly once, correct source hash, complete result, no failures,
registration errors, stale inputs or unexplained skips. Shared suites run in both
apps and are not deduplicated across them. Exclude focused/superseded results from
the final coverage set while preserving their files.

### CI timing metadata and final ordering

Apply check-list §2's existing rule to each successful complete shard's
**tee final `seconds`** m (largest on the relevant final source/settings):

```text
newProjection = max(oldProjection, 10 * ceil(1.5 * m / 10))
```

No decreases, fastest-repeat selection or new timing campaign. Before first runs,
the latest accepted comparable measurements may be a labelled provisional basis.
Keep tee time, helper time, runner-body time, lock wait and gaps separate;
neither the helper's `seconds` nor runner-body time substitutes for m.
Each projection remains <=450; Generator groups satisfy
`180 + 3 * sum(projections) <= 1800`; both actual Player jobs are **900 s**,
so `180 + 3 * playerProjection <= 900`. The tool's generic 1800 s Player check
does not override that workflow limit.

Finalize permitted metadata **after** measurements but **before** a fresh final
CI check using `ci-final`. If a ceiling cannot be met, report the numbers for an
orchestrator-assigned action; do not clamp, regroup, raise limits or move tests.
`.github\scripts\generator-quick.json` is outside current app fingerprints:
metadata-only changes need the final CI check and fingerprint confirmation, not
another valid quick run. A later fingerprinted design/guide/code change requires
replacement evidence for the affected app(s).

Run the final file-only GG check and identity confirmation on the final living
files. Fill the performance report/evidence afterward without changing the
fingerprinted guides/design. A local coverage/budget check is **not remote CI**;
matching-head PR/workflow verification remains MS18e/orchestrator work.

## 6. Step 11 — mandatory full item register

For every row retain origin/source/population, measured numbers or labelled unknown,
limit/outcome, immutable evidence reference, current disposition and next owner.
Do not equate complete current GP with closure of finder-cap or historical paired
comparison questions. The following is the minimum, not permission to discard
another already-recorded relevant item:

| Item | Required Phase D disposition |
|---|---|
| S-AV01 | Closed **not offered** by final qualification: Greater-Than Normal 40/40 hits but p95 10,192.4051 >10,000 ms; unchanged 700 ms manual base, fixed diagnostic seed 4; no Normal exception or new run |
| S-OD7 / S-AV05 / S-AV06 | Killer Hard/Expert remain hidden until later calibration; preserve raw final GQ verdicts separately from owner withholding; no weight/offer change |
| S-AV27 | Final GQ execution gap closed at MS18c, not by GP; retain unchanged scheduler/serial second-round and mixed-concurrency caveats |
| IR17 | Classic9 Nightmare remains offered; historical GD 430.5 s is not a current reusable bound; GD/final deep admission belongs to MS18e, not this dispatch |
| MS18c-GQ-ENGINE-COST | Keep primary SA2 strict matched-pair pooled median **1.1240344349341411** over 2,122 pairs separate from SA1's **1.1284579100925456**, lower median of 51 filtered cell medians; retain exact filters in the main MS18d leaf and the 331.6 vs118 s replay observation; not GP ratios or causal proof |
| MS18d-GP-BOUND-sohei-hell2 | Planning obstruction closed by R24's six chunks; current cell now completely measured but **misses** 30,000 ms; preserve the 485.597 s monolithic mean alert, never reinterpret it as permission for that monolith |
| MS18d-GP-BOUND-REMAINDER | Other sixteen planning obstructions closed by the frozen plan; all original chunks now complete; cold starts/protocol differences remain disclosed, not universal monolithic bounds |
| MS18d-C0-G1-G5 | Integration/execution completed through reviewed epochs; audit actual ownership, cleanup, gaps, byte bindings and the two tooling incidents; preserve failed development/hold evidence |
| MS18d-C0b-R24 | Complete 114-ledger/3,950-request merge, exact statistics/exit contracts, actual historical HEADs and R6 attribution; no 117-ledger claim |
| MS18d-C1-F1-F6 | Reviewed readiness/attempt/stop/journal controls used; retain host binding and actual exclusions, original cap two and only the three named owner exceptions; no retroactive or standing permission |
| MS18d-C2-TRANSPORT-WATCH / MS18d-C2-RELEASE-HISTORY | Preserve both tooling incidents and B2/B3 repairs: the **about 1,203 s** no-folder give-up (epoch-2 repair leaf, “Frozen incident and preserved state”) consumed no admission; the later acquisition hold did. L24 itself retains the misleading foreign-lock label and 4.233 s last watch. Neither is a measured GP timeout |
| MS18d-DEEP-PUBLIC-REGISTRATIONS | Closed on file evidence at `50903182` / `b3144fcf`: quick 4807 unchanged; SG_DEEP listing 4835→4828, seven removals, mega 12→9 / multigrid 16→12, 63-file audit. No live deep pass was established |
| S-AV11 | Still held: Jigsaw Expert seed1111, trace off, size-default8/no override; historical 325.313 s is whole-request time, not an identified dig stage or current <=450 bound. No profile is released by this dispatch; do not list it as a missing offered GP cell |
| S-AV31 | Preserve MS09b finder census/populations and multigrid latency; not a current GP/qualification or universal cap-coverage claim |
| S-AV33 | Preserve MS10b WXYZ sampled versus constructed populations, capped-state indices and 50,000 prefix; two sampled Samurai caps are not demonstrated lost deductions |
| S-AV34 | Preserve MS11a UR second-pass sampled/constructed/bound evidence and 50,000 limit; neither an exhaustive-coverage claim nor an unmeasured-evidence claim |
| S-AV36 | Preserve MS13a construction-only and MS13c activation/fallback census, 50,000/4,096, S-OD11 and the unadopted candidate; current GP does not establish which finder caused its cost |
| S-AV37 | Preserve MS14b layout/seeded/real-puzzle populations and 2-units/4-cells/50,000 limits; no inferred generated-layout cap census |
| S-AV38 | Preserve MS13c's different-source 50-cell partial GP and paired records as history; current 79-cell coverage is complete, not a retrofit of that history or identical-puzzle/per-technique speedup proof |
| S-AV39 | Preserve MS15a/MS15b ALS and MS16 Sue-de-Coq populations, caps/lost-finding example and unchanged limits; no new census or coverage guarantee |
| MS15b-GP-J | Historical Jigsaw Nightmare pilot/unadmitted 50-run command stays so; it is now hidden by qualification, not silently supplied with GP data from a different cell/source |
| MS15b-GP-U | Reconcile the historical 37-cell cohort (one full, one pilot-only, 35 unmeasured) with current offered/hidden cells; current full offered matrix does not rewrite the old cohort or prove paired speedups |
| MS18d-C2-EXTERNAL-CONSUMERS | Full disclosure in §3, including chunk-98 wide gate, hibernation-agent hold, waits/expiries and any missing operational metadata |
| S-OD16/17/18 and F3 dispositions | All three one-use a3 grants exercised successfully in S order; all earlier holds retained; line release never authorized an admission. No remaining a3 quota or a4 |
| Five MS18d-GP-MISS-* items | Keep every row in §3 open as a numerical performance finding; overall 74/79 passes, not all targets |
| S-AV08, if reporting standing quick cost | Carry actual final per-app/shard costs and projection revisions; no five-minute promise or further tier move |

Historical finder/cost sources are the existing `evidence\MS09b`, `MS10b`,
`MS11a`, `MS13a`, `MS13c`, `MS14b`, `MS15a`, `MS15b` and `MS16` reports/censuses
referenced in check-list §4. Read them for source-qualified details; never edit
them or acquire a new census/GP/profile to fill a historical gap.

## 7. Acceptance and handoff

- R6 is accurate in design 9.1, the new report and both guide languages; all
  targets, offers, weights, limits, budgets, test tiers and canonical fixtures unchanged.
- Final report has all 79 rows, exact aggregate/miss semantics, all cold-start
  disclosures and a complete item register with honest unresolved limitations.
- Provenance audit preserves every original record, all four declared tuples,
  V1/V2, 114 successful ledgers, nine holds, one pre-window event and final C log
  of 125 lines. No additional real merge/run folder or C-log append.
- SA1's dispatch conditions are incorporated; the committed operator archive and
  independent recompute are cited as read-only inputs, not rerun. Preserve the
  operational record's reconstructed mapping, manual-launch gaps and unknowns;
  no operational script/log is substituted for admission or measurement authority.
- Both unchanged `freeze-targets.js` calls exit 0 with the exact B1 counts,
  producer/table/hash/replay values, table/bold checks, all eleven design/en/vi
  statements and no problems. Their fixed Phase B labels are contextualized as
  Phase D re-checks; an unexpected result is a QUESTION.
- File-only GG merge verifies all 104 current-source ledgers / 520 unchanged keys;
  no fresh GG generation, GR/GH rewrite or canonical-update flag.
- Both complete quick sets are green on their actual final fingerprints, with
  per-app coverage bijections, actual exits and both pre/post identity checks.
- Final CI inventory/budget check uses the final permitted manifest metadata and
  verifies actual Player 900 s limits; no remote CI/browser pass is inferred.
- Every Node command uses the unchanged mandatory tee and lock; tee/helper/runner
  clocks and any thrown failure are recorded separately, and a failure stops.
  All commands/transcripts, settings, waits, projection updates and nonzero/partial
  outcomes are retained. Optional owned helpers are tested/formatted
  and inventoried; no new dependency, quick suite or broad tooling framework.
- Final reply lists changed files, the **five final `identities-now.cjs` values
  plus producer-sources and target-table identities** (seven values), GG result, quick
  counts/process costs/coverage, CI arithmetic, full item list and exact open work
  for MS18e. No developer commit/push or claim that MS18e is already released.

Correctness, source/evidence corruption, unauthorized identity/contract change or
unexpected canonical output is a QUESTION before corrective writes. Performance
findings alone continue with named numerical dispositions under S-OD4, never a
false green gate. S-AV11, GD/deep/manual work, browser work and the future
improve-generating feature remain outside this dispatch.
