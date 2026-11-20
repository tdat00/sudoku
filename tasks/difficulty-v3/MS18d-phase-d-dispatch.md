# MS18d — Phase D dispatch: final attribution, quick verification and handoff

| Field | Instruction |
|---|---|
| Scope | MS18d steps 9–11 only; complete the existing task, not another GP campaign |
| Dispatch evidence | `732d1b66b31e00f996365a796251de1a19dedd53`; final GP report/receipts are committed |
| Developer | One serial developer; no Git writes, pack edits or task-log edits |
| Review | SA1 cross-reviews this dispatch at the owner's request; orchestrator accepts the implementation |
| Release | Incorporate SA1's dispatch conditions before developer execution; the orchestrator releases the task |
| Not yet complete | Phase D documentation, both final-fingerprint quick sets, final file-only GG check and item handoff |

This leaf controls the current dispatch where the main MS18d leaf still describes
earlier holds or conditional releases. Read `AGENTS.md`, the main leaf's steps 9–11
and R6 in `MS18d-r24-request-ledger.md`. All local Node commands, including file-only
checks and registration, go through the unchanged **`Invoke-Dv3Node`** in
`generator\tests\artifacts\difficulty-v3\MS18c\invoke-dv3node.ps1`.
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
SA1 owns any requested independent raw-ledger recomputation. Attach his outcome;
do not duplicate it with another generation or real merge invocation.
The provenance audit also covers R5's captured executed contents and empty
`execArgv`/`NODE_OPTIONS`, complete saved A-readiness and the committed host/ruling
version actually used by each admission. A summary boolean alone is not that audit.

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
**`docs\difficulty-v3\evidence\MS18d\phase-d\`**, never an older phase/run:

| Path relative to that directory | Contents |
|---|---|
| `plan.json` | Exact commands, selectors, projections/bases, outputs, dependency/order and clocks |
| `provenance-audit.json` | Frozen input identities, epoch/HEAD checks, receipts, attempts/holds and declaration references |
| `gp-cells.csv` | All 79 report rows: n, p50, p95, max, target, verdict, k, extra starts and cold-start flags |
| `item-register.json` | Every mandatory item below, source/population, numbers, status, limitations and next owner |
| `external-consumers.json` | Consumer/hold and scheduling-version audit, sourced wait/expiry values and explicit unknowns |
| `identities-before.txt`, `identities-final.txt`, `identities-after-quick.txt` | Actual five-identity outputs from the existing identity tool |
| `bindings.json` | Final engine/replay/hash/target/offer checks and the three app fingerprints with their recipes |
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
Phase B's log, and Phase C's writes the frozen C log. A Phase D caller may reuse the
unchanged shared helper, slot watcher or incremental tee, but must write exclusively
to Phase D, retain partial output/real exits, enforce gaps and never swallow failure.
Never overwrite evidence; use a numbered new filename for a corrective rerun.

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

Distinguish these scheduling versions:

1. Original scheduling and the disclosed hyper-hard automatic 65 s re-ask.
2. Intune/service gate from chunk 42; 300 s cooldown followed by fresh observation.
3. SenseIR extension `2a5cb26a`, first used for chunk 58.
4. Wide stability gate **`55c4e867`, from chunk 98 and for all three a3s**,
   including SA1's CIM/identity/rate conditions in the committed gate note.

Use the actual pack notes, receipts and **orchestrator's retained operational
records** for gate waits, reset episodes and 30-minute expiries, by version.
The outer gate was read-only outside the repository: its wait/expiry totals are
**not recoverable merely by counting C-log rows or subtracting payload times**.
Obtain the operator's sourced summary; if a value was not retained, mark it
`unknown/not recorded`, not zero, and retain that limitation under this item.
Do not run a new sampling campaign to reconstruct history.
The one recorded pre-window give-up was the transport freshness defect, not
proof of an outer-gate 30-minute expiry or a foreign-lock/CPU episode.

Known operator-reported a3 gate waits are **325 / 124 / 247 s** in S order
(696 s total for those three only). Keep their provenance and precision.
Do not promote them to total campaign waits or infer zero expiries.
Keep scheduled cooldown, outer gate, lock/pre-window, controller/readiness,
recorder process, raw request times and whole campaign wall span distinct.

**Clock correction:** the reported “31/30/40 s payloads” are not the saved
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

- `generator\tests\artifacts\difficulty-v3\MS18c\identities-now.cjs` prints all
  five identities **without registering or running manual tests**. Its input
  recipes match the current runners. Capture before edits, after final docs and
  after quick/CI completion, through the shared helper, from the repository root.
- Reuse `project-gp.js`'s pure identity/declaration functions and
  `phase-b\freeze-targets.js`'s pure target/budget parsers if needed.
  Do not overwrite or mislabel the old Phase-B freeze as a newly measured result.
- `tests\perf.js --hash-merge=..\docs\difficulty-v3\evidence\MS18d\hashes --check-hashes`
  from `generator\` is the required **file-only** final GG check.
  The existing folder has **104 ledgers / 520 keys / 26 combinations**.
  Capture a new Phase D transcript; no hash recording or update flag.
- From the repository root, use
  `.github\scripts\generator-quick.js check --keep=docs\difficulty-v3\evidence\MS18d\phase-d\ci-before`
  (later `ci-final`; fresh numbered directories for any rerun). It
  retains `generator-all.json`, `player-all.json` and `shard-<id>.json` inventories
  without running tests. Invoke its Node entry point through the shared helper,
  not an unlocked shell wrapper.

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

1. Complete R6 edits and create the report/link target; capture final identities.
2. From `generator\`, run `tests\node-runner.js --suite=perf-tooling,smoke,help`
   with `--results=..\docs\difficulty-v3\evidence\MS18d\phase-d\results\focused-docs.json`.
   It may use the own-fast shard's conservative current bound. This is diagnostic
   evidence, not a replacement for any final shard.
3. Run the pre-check with a fresh `ci-before` keep directory and save the exact
   current manifest/selectors and projection bases in `plan.json`.
4. Run each Generator shard **separately**, with its own locked invocation,
   `--results` file and process-wall transcript. Read the suite lists directly
   from `.github\scripts\generator-quick.json`, not an invented regrouping.
5. Run the Player's complete default quick set in its own locked invocation.

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
All are Node arguments to `Invoke-Dv3Node`, not standalone unlocked Node calls.

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

Apply check-list §2's existing rule to each successful complete shard's actual
**process-wall** duration m (largest on the relevant final source/settings):

```text
newProjection = max(oldProjection, 10 * ceil(1.5 * m / 10))
```

No decreases, fastest-repeat selection or new timing campaign. Before first runs,
the latest accepted comparable measurements may be a labelled provisional basis.
Keep process time, runner-body time, lock wait and gaps separate.
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
| MS18d-C2-TRANSPORT-WATCH / MS18d-C2-RELEASE-HISTORY | Preserve both tooling incidents and B2/B3 repairs: the 1203 s no-folder give-up consumed no admission; the later acquisition hold did. Do not recast either as a measured GP timeout or erase its log/history |
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
- SA1's dispatch review and any requested independent post-merge check are
  referenced and their findings resolved; no claimed numerical recheck without one.
- File-only GG merge verifies all 104 current-source ledgers / 520 unchanged keys;
  no fresh GG generation, GR/GH rewrite or canonical-update flag.
- Both complete quick sets are green on their actual final fingerprints, with
  per-app coverage bijections, actual exits and both pre/post identity checks.
- Final CI inventory/budget check uses the final permitted manifest metadata and
  verifies actual Player 900 s limits; no remote CI/browser pass is inferred.
- All commands/transcripts, settings, process times, waits, projection updates and
  nonzero/partial outcomes are retained. Optional owned helpers are tested/formatted
  and inventoried; no new dependency, quick suite or broad tooling framework.
- Final reply lists changed files, all five final identities, GG result, quick
  counts/process costs/coverage, CI arithmetic, full item list and exact open work
  for MS18e. No developer commit/push or claim that MS18e is already released.

Correctness, source/evidence corruption, unauthorized identity/contract change or
unexpected canonical output is a QUESTION before corrective writes. Performance
findings alone continue with named numerical dispositions under S-OD4, never a
false green gate. S-AV11, GD/deep/manual work, browser work and the future
improve-generating feature remain outside this dispatch.
