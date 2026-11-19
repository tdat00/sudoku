# MS18d — R24 raw-time recorder and frozen request-chunk plan

Supporting specification of `MS18d-phase-c-admission.md`, not another task.
SA2 accepts SA1's **O1**, 2026-11-19: the blanket single-command restriction
in `ad7d30e3` was too broad. R24 already permits this route.
SA1 **CONCURS WITH CONDITIONS** on `e4cd92d6`; **R1-R6 below are binding**.
The numerical plan is unchanged.
Implementation baseline **`56b97b26`** is now **SA1 ACCEPT WITH CONDITIONS
F1-F6; C1 released**. Those conditions and host/ruling governance are in
**`MS18d-c1-readiness-and-rulings.md`** and supersede any pre-C1 path that could
admit a real request without readiness. No real recording is released yet.

## Authority and release

Owner-accepted `docs\difficulty-v3\report-detailed.md:1162-1165` states:

> Use explicit variant/level shards and bounded monitored processes. If one cell cannot complete within
> the execution ceiling, implement a complete request-ledger/resume path or report it incomplete; do not
> drop slow seeds, invent a verdict or substitute `--probe` for qualification. Preserve source/seed identity
> and timing protocol when merging shards.

The accepted FS23 response at
`docs\difficulty-v3\gpt-6-astra\7-response-to-task-pack-review.md:246` assigns
bounded measurement tooling, not unsupported seed/percentile splits.
This is that **explicitly assigned R24 route**, not a new GP ceiling,
qualification exception, target change or inheritance of S-OD13/S-OD14.

**C0b is released now, Q1-independent:** build the task-owned recorder, frozen
machine-readable chunk manifest, check-only merger and payload-specific
classifiers under `generator\tests\artifacts\difficulty-v3\MS18d\phase-c\`.
Use file-only/stand-in tests; obtain SA1 review before real recording.
No real `measure`/pipeline/generation call, pilot, live CPU screen or profile is
authorized by C0b. S-OD15 now records A; C1's tooling/review dependencies remain.
The S1 message below is a status update, not another permission gate.
The serial developer may finish C0 then C0b; no parallel repository editing.

**Use the recorder for all 79 cells.** The 62 formerly C cells each have one
50-request chunk. The 17 formerly H cells have the 52 chunks below.
There is **one record type**, `ms18d-gp-request-ledger-v1`: 114 commands,
3,950 requested generations, not an additional measurement campaign.
The stock `perf.js` transcript classifier remains useful as a C0 payload type,
but no real cell in this final GP matrix uses rounded CLI summaries as evidence.

The earlier bound items are closed **as planning obstructions** by this
source-bound route. Their monolithic commands remain unadmitted; neither item
is a GP timing pass. All chunks still require frozen/reviewed tooling, the
recorded S-OD15 policy, the declared window and a fresh actual admission.
S-AV11 is a different one-request diagnostic and remains held for its missing
current-source bound; this plan does not split or admit that profile.

## Common reservation rule and frozen allocation

Keep the source inputs, lowercase-hex GG-set digest and each cell's `m`
(max of its existing GQ and, where present, GG request times) in the parent plan.
Keep the same 60 s allowance: 45 s readiness plus 15 s startup/identity/output.
For raw milliseconds `m > 0`:

```
capacity = floor(390000 / m)
k = ceil(50 / capacity)
base = floor(50 / k)
remainder = 50 % k
n[j] = base + (j < remainder ? 1 : 0), j = 0..k-1
i0[j] = sum(n[0..j-1])
P[j] = 60 + ceil(n[j] * m / 1000)
```

Reject zero/invalid capacity or invalid input rather than invent a bound.
Ranges are contiguous, balanced, larger chunks first, and cover indices 0..49.
No adaptive reallocation after a timing result. P is a reviewed empirical
reservation, not proof about unseen seeds; retain the parent's GQ/GG-to-GP
protocol/clock limitations. Do not use the reported bootstrap probabilities as
an admission guarantee or replace this common max rule with a mean estimate.
The offered GQ cells have 40 observations each, zero recorded errors and no
request reaching the 120000 ms guard; that does not bound a new uncapped seed.

**62 one-chunk cells:** exactly the parent table's C entries, now route C1:
`[i0=0, n=50, P=P50]`, sum **7739 s**, no extra process start.

**17 multi-chunk cells:** `[i0,n,P seconds]` below is the frozen plan.
Each P includes the full 60 s prefix. The capacity column is descriptive of the
common rule; it is not permission to choose different unbalanced ranges.

| Cell | Capacity | k | Frozen [i0,n,P] chunks | Sum P s |
|---|---:|---:|---|---:|
| mega12/expert | 49 | 2 | [0,25,259]; [25,25,259] | 518 |
| mega12/nightmare | 44 | 2 | [0,25,279]; [25,25,279] | 558 |
| mega12/hell2 | 33 | 2 | [0,25,349]; [25,25,349] | 698 |
| mega16/hell2 | 9 | 6 | [0,9,448]; [9,9,448]; [18,8,405]; [26,8,405]; [34,8,405]; [42,8,405] | 2516 |
| hyper/nightmare | 34 | 2 | [0,25,342]; [25,25,342] | 684 |
| jigsaw9/hell2 | 39 | 2 | [0,25,308]; [25,25,308] | 616 |
| greaterThan/master | 49 | 2 | [0,25,256]; [25,25,256] | 512 |
| greaterThan/hell2 | 20 | 3 | [0,17,391]; [17,17,391]; [34,16,371] | 1153 |
| samurai/expert | 43 | 2 | [0,25,287]; [25,25,287] | 574 |
| samurai/master | 5 | 10 | [0,5,394]; [5,5,394]; [10,5,394]; [15,5,394]; [20,5,394]; [25,5,394]; [30,5,394]; [35,5,394]; [40,5,394]; [45,5,394] | 3940 |
| sohei/normal | 43 | 2 | [0,25,286]; [25,25,286] | 572 |
| sohei/expert | 28 | 2 | [0,25,407]; [25,25,407] | 814 |
| sohei/master | 48 | 2 | [0,25,263]; [25,25,263] | 526 |
| sohei/hell2 | 9 | 6 | [0,9,435]; [9,9,435]; [18,8,394]; [26,8,394]; [34,8,394]; [42,8,394] | 2446 |
| butterfly/nightmare | 18 | 3 | [0,17,422]; [17,17,422]; [34,16,400] | 1244 |
| butterfly/hell2 | 27 | 2 | [0,25,417]; [25,25,417] | 834 |
| flower/hell2 | 27 | 2 | [0,25,409]; [25,25,409] | 818 |

SA2 independently reproduced SA1's **12 two-chunk / 2 three-chunk / 2
six-chunk / 1 ten-chunk cells**, **52 commands**, **19023 s** and maximum
chunk P **448 s**. All 79 cells have a bounded numerical plan under A and B
on the original environment; changing environment still needs compatible review.

Before any real recording, materialize/freeze the **114-entry execution
manifest** under `phase-c/`, bound to this committed plan, all 79 frozen targets,
source/environment and the final helper hashes. Each entry contains cell,
target, `i0`, `n`, derived seeds, P and immutable chunk ID; preserve parent
matrix order and then increasing `i0`. Hash the canonical JSON with the
existing `toolRecords.canonicalJson` rule and **lowercase** SHA-256 hex.
Review its exact key/range set against these tables; the developer chooses no
new k, projection, seed range, scope, epoch or retry allowance.

### R2 — exact run directories in the frozen manifest

Freeze literal repository-relative directories for every primary/eligible
re-ask slot, any optional selected-cell merge slot, and the final all-79 merge.
The recording plan still has **114 measurement commands**; merge entries are
separate roles, not extra cells, samples or chunk attempts.

- A chunk attempt or selected-cell merge uses its declared
  **`docs\difficulty-v3\evidence\MS18d\gp\<variant>-<level>\<run-id>\`**.
- The final merge uses one declared
  **`docs\difficulty-v3\evidence\MS18d\gp\all-79\<run-id>\`**.
  `all-79` is an aggregate-output scope, not an eightieth variant/level.
- C0-4 accepts only **exact directories named in that immutable manifest**,
  with files directly inside them. A matching path pattern, an offered cell,
  a directory guessed from the request or an undeclared run ID is insufficient.
  Reject duplicates, traversal and a directory assigned to the wrong role/cell.
  Predeclaring an optional slot neither runs it nor consumes a chunk attempt.

**Only the final all-79 merge is required.** Keep selected-cell merge capability
for tests/explicitly requested diagnostics, but do not schedule one per cell.
The final merge validates the raw 114 ledgers/receipts directly; selected-cell
reports are neither prerequisites nor substitutes for those inputs.
An optional merge needs a predeclared directory and its own bounded locked run;
it never runs concurrently with a GP payload. Do not expand the allowlist later
or reuse a measurement run directory to avoid declaring a merge slot.

### R3 — campaign base and permitted later commits

After final executable helpers/manifest are frozen and committed, the
orchestrator records a **campaign base commit B before the first real chunk**.
Record `r24Notice` before freezing B (the notice receipt is now in the selector).
Do not choose B while tooling changes are still pending. Avoid a self-referential
commit hash: B may be declared in a subsequent pack-only release record or a
predeclared immutable launch record, not embedded in its own hashed commit.

Every ledger retains its **actual HEAD**, which may be **B or a descendant of B**:

1. Prove ancestry, e.g. `git merge-base --is-ancestor B <recorded-HEAD>`.
2. `git diff --name-only B <recorded-HEAD>` may contain only the **exact C0-4
   campaign-output paths** (the manifest-declared run outputs and C release log)
   and **`tasks/difficulty-v3/` pack files**. No broad docs/artifacts exemption.
3. Keep every content/environment identity equal: **E hash, loaded/executed
   source manifest, target table, chunk manifest, helpers, Node, machine and
   selected policy**, plus R5's empty Node flags. A permitted path change is
   not permission to change a frozen plan or rewrite an immutable output.
   A frozen pack-plan reference resolves its recorded commit/blob, not whatever
   later text occupies that path. Do not silently rebind the manifest to a
   descendant's status/wording update; a changed execution plan still stops.

Apply the same checks to the current transport HEAD before each campaign run
and to every recorded HEAD at merge. Preserve each observed HEAD; do not retag
earlier chunks to the newest checkpoint. A pack ruling/evidence checkpoint
between chunks may advance HEAD without rejecting otherwise valid records.
Non-descendants, disallowed committed paths or content-identity drift stop.
Working-tree cleanliness still follows C0-4 exactly; uncommitted pack/helper
changes are not allowed merely because a later pack-only commit would be.

F3's committed hold-rulings journal and the C1 host-binding journal are
append-only **operational authorization data under `tasks/difficulty-v3/`**.
Their reader/policy code and paths are frozen; do not freeze their changing
contents as common helper hashes or require one active host tuple for all
chunks. Each admission binds the committed entries/version it used. Approved
single-host replacements keep A's policy/thresholds unchanged, preserve prior
references and need joint approval; they never reset counts or authorize a retry.

Checkpoint commits and reports happen **only between payloads**, after cleanup
and before the next fresh checks. Phase D's non-pack design/guide/report edits
follow the final campaign merge; they are not mid-campaign path exceptions.
Later audits check recorded campaign HEADs/identities without rewriting history.

## Recorder — exact measured workload

Implement a task-owned entry point, e.g. `record-gp.js`, not a permanent CLI
or a patch to `perf.js`/`perf-helper.js`.

1. Use the same loader recipe/order as `perf.js`: parse the existing
   `SOURCE_FILES` declaration, omit `js/ui` and `js/worker`, apply its existing-file
   selection, then load **`perf-helper.js`, `tool-records.js`, `regression.js`**.
   Execute the classic scripts through **`vm.runInThisContext`**. Validate the
   frozen recipe/files; never `require('perf.js')` or invoke its `main`.
   Bind the ordered loaded-file manifest, including `regression.js`, separately
   from E's existing source recipe; loading a file does not silently add it to E.
   The reviewed loader has **64 declared sources, 18 excluded, 46 engine
   scripts plus three fixtures = 49 loaded**.
   **R5:** read each source once into a captured buffer and hash the exact
   contents passed to the VM, not a second disk read. If UTF-8 decoding/BOM
   removal produces the executed string, hash that exact string's UTF-8 bytes
   (and retain the raw-buffer digest where different) and execute that same
   captured string. Derive E's separate LF-normalized identity from the same
   captured texts; do not mistake normalization for an executed-byte proof.
2. Verify the approved offered cell/chunk, manifest, frozen target, current
   source/tool, campaign B/actual HEAD, Node/machine/policy and real admission.
   **R5:** the transport refuses to spawn when **`NODE_OPTIONS` is set**;
   check before launching the Node transport/tee/child, never silently clear it.
   The recorder requires **`process.execArgv` empty** and verified absent
   `NODE_OPTIONS`. Record the empty array and the verified absence as an empty
   string explicitly in every ledger; all 114 records must agree.
   No inspector/preload/runtime-tuning flag is an equivalent baseline.
   Complete metadata
   loading/hashing before the measured call; no discovery, source-data analysis,
   sampling or periodic work during it. A stand-in can inject a fake measure
   only in its isolated test path; no real measure before C2 release.
3. Make **exactly one** call:

   ```javascript
   SG.fixtures.perfTools.measure(v, l, n, { seedBase: 7000 + 101 * i0 });
   ```

   This keeps trace **summary**, warmup **0**, jobs **1**, no caller budget,
   no max-attempt/variant-option override and the existing request clock.
   No loop of one-request measure calls, warmup, sleep, retry or re-seeding.
   Do not capture new pipeline outcomes/stats that `measure` does not return.
4. Validate and persist the returned raw `times` **in request order, without
   rounding**, with exactly n finite, non-negative entries and indices/seeds
   `i=i0+j`, `seed=7000+101*i`.
   Include schema/kind, chunk ID, `i0`, n, cell, frozen target, declared
   trace/warmup/jobs/budget/default policy, full E hash **344afdec...**, table
   **3d0bffdb...**, manifest/helper/executed-content hashes, actual argv,
   `process.execArgv`, `NODE_OPTIONS`, Node, machine, campaign B and actual HEAD,
   selected policy and transport/admission/run references. Actual starts and
   timestamps are observations, not guessed constants.
5. Write **one new ledger**, exclusively, never overwrite a final or partial
   path. Finish/durably close it before emitting its completion/digest marker
   and exiting **0**. A partial write is retained as incomplete. Use the
   existing project-local append/record mechanics; no temporary-directory file.
   A complete file alone is insufficient without successful transport evidence.

Use the **same schema for k=1 and k>1**. A recorder exit 0 means only that the
assigned chunk was acquired and persisted, **not** that its cell met a target.
Do not gate on a chunk percentile or return a GP MISS exit from the recorder.
A throw, nonzero exit, signal/kill, partial/missing ledger or nonzero stderr
is **STOP + QUESTION**, with all available output and start records retained.

The E source identity remains **344afdec...** because no recipe member changes;
the recorder/merger/transport have a separate frozen helper/tool identity.
Do not put the task tool into E's recipe or retag old GG/replay evidence.

## Check-only merger and typed G3 contracts

Add a read-only merger, e.g. `merge-gp.js`, with a selected-cell check and the
final **all-79** check. Only that final merge is required in the campaign.
It never generates, edits a timing ledger, fills a gap or writes a canonical
fixture/target. Retain reports in the exact manifest-declared R2 run directories;
the aggregate merge uses its declared `gp\all-79\<run-id>\`, not a guessed folder.

For each cell require:

- Every frozen planned chunk exactly once, **indices 0..49 exactly once**,
  no overlap, holes, duplicates, unknown range, extra chunk or alternative
  repartition. Each chunk must match its immutable ID/i0/n/seeds/target.
- Exactly n finite, non-negative raw times in request order; no reconstructed
  values from rounded summaries. Validate ledger completion, digest and its
  actual **exit-0 transport receipt**, zero stderr bytes, admission and G5
  cleanup proof. A killed recorder's apparently complete file is not rescued.
  Reject stand-in/test/dry-run provenance even when its schema or hashes match;
  test artifacts never become entries of the real campaign.
- **F5/F6:** a real request may not contain `command.exec`. A hold must be a
  genuine unstarted control-hold with **no payload artifacts**, or the narrow
  bare foreign-lock-watch `wrapper.json` case; a boolean is insufficient.
  Every real ledger requires a complete **admitted A readiness record**:
  five in-process intervals, before/after instance snapshots, valid approved
  host binding/exclusions, raw-ready versus admitted distinction and the
  query/readiness/call-to-spawn limits. Validate the referenced committed
  binding for that admission, not the newest host after the campaign.
- One common source/executed-content, target-table, plan/helper identity,
  campaign base **B**, Node, machine, selected policy and empty R5 flags across
  the cell **and across the final matrix**. Actual HEADs may differ only under R3.
  Permit only the planned differences in i0/n/seedBase/output path/run ID/argv.
  Raw Git-status observations may grow with allowed new outputs; require R3
  ancestry/path proofs and the clean-input predicate, not identical HEAD/status text.

Sort the **50 raw times** numerically and compute:

```
p50 = sorted[24]
p95 = sorted[47]
max = sorted[49]
mean = sum(times) / 50
meets = p95 < frozenTarget
```

No averaging/merging of chunk percentiles, medians or printed numbers; no time
factor, CPU subtraction, target adjustment or cold-sample removal.
Display rounding is optional but decisions use unrounded values.
Only the complete all-79 check can declare the aggregate gate:
**79 complete cells and >=72 successes**, not a rounded percentage.

**C0-6 remains generic:** register separate G3 payload contracts.

- **GP recorder:** `allowsMissExit=false`; only exit 0 plus the exact complete
  ledger/receipt is acquisition success. It makes no performance verdict.
- **GP check-only merge (R1):** **exit 0 = complete pass**; **exit 1 = complete
  numerical MISS/gate failure only**; **exit 2 = incomplete or invalid input**;
  **exit 3 = unexpected exception caught at the top level**. Catch synchronous
  exceptions and rejected promises across the entry point; do not let an
  uncaught Node exception masquerade as its default exit 1.
  For exit 1, payload stdout must end with one complete **machine-readable
  result line**: requested cell/all-79 scope, `complete=true`, `meets=false`,
  and the cell's raw p95/frozen target or the full matrix's success count.
  Validate scope, identity and numbers; for all-79, require 79 complete cells
  and the exact success count/72 threshold. Use the same explicit completion
  contract with `meets=true` for a passing exit 0.
  Exit 1 without that line, with contradictory data or **any stderr byte**
  is STOP, never a MISS. Preserve child/transport exits; no verdict is inferred
  from the code alone. A selected-cell pass is not the final gate.
- **Existing stock CLI/generic test types:** retain their own reviewed checks.
  A raw-ledger payload does not need the stock CLI's rounded table/header.
  A helper-test exit 1 still fails unless it is an explicitly defined stand-in,
  not merely a command run under `-Expect 0,1`.

### Continuation, attempts and failure

Each chunk has its **own** fresh process, admission, 450/540 envelope and
>=15 s gap (planned 15.3 s lock-free pre-window), plus G1-G5/C0-1..C0-6.
Under A, at most **two admissions per immutable chunk/protocol identity**,
the second only after the declared `.a1` is an artifact-free unstarted hold
and either automatic consumer-only eligibility with **>=60 s** since release
or a valid **F3 committed joint ruling**. At most **one actual payload per chunk**.
For a one-chunk cell this is the old cell-level allowance. B has no automatic
re-ask. An S-AV11 request, if ever admitted, remains one independent profile unit.

**R4 — no mutable counter file.** Derive each chunk's admission/payload counts
from its **immutable manifest-declared run folders** and the **append-only C
lock-log**, reconciled by stable attempt/chunk IDs. Deduplicate the same event
represented in both; do not double count it or count a merge run as a chunk.
Record intent/start/outcome evidence durably before further execution. Missing,
conflicting or ambiguous history holds for a ruling, never defaults to zero.
An uncertain payload start is consumed/unknown, not an eligible unstarted hold.
Do not reset counts on process restart, HEAD change or evidence checkpoint.
A derived immutable report may display counts, but cannot become resettable
operational state. The campaign B/manifest/chunk identity, not current HEAD,
anchors accounting across permitted R3 commits.
Under F1, a new watch give-up creates **no folder** and its `pre-window-hold`
log line consumes no admission. F2 checks before creation: `.a1` refuses any
existing folder of the chunk, `.a2` must meet all the conditions above.

**F3/F4:** SA2 rules, SA1 concurs, and the orchestrator alone appends/commits
`tasks\difficulty-v3\MS18d-gp-rulings.jsonl` lines of the prescribed
`{chunkId,heldRunId,allowAttempt:2,ref,at}` shape. After any non-success other
than that chunk's own eligible re-ask, stop all further real calls until a
valid ruling covers the held run. Do not bypass the stop through another chunk,
directory or profile.
**P1:** an F3 ruling may authorize that chunk's second admission only after a
valid unstarted hold. A jointly approved line naming a **started failure**
only lifts the **line stop for other chunks/final merge**; it never authorizes
attempt 2 or replacement of the failed chunk, even though the unchanged schema
still says `allowAttempt:2`. F1/F2/F6 and the two-admission/one-payload limits
remain enforced by the existing guards/merger. Keep the failed chunk incomplete.
The C1 leaf defines this governance, host rebinding and the one-line B-record.

The legal continuation is **later execution of an unstarted, preplanned chunk**.
It is not restarting `measure`, resuming the tail of an executed chunk,
rerunning a completed chunk/cell, replacing a failed result or changing k.
A missing/unstarted chunk leaves the cell incomplete until its authorized first
execution; a killed/partial/mismatched chunk stays incomplete with **no automatic
resume, retry or replacement**. Stop for a ruling before dependent continuation.
Do not reset quotas by changing a filename, worker, commit, epoch or helper.

### Cold-start disclosure

Every cell records k and **k-1 extra cold process starts** versus one 50-run
process. Total extra starts: **35**, not extra generations. No claim that this
is numerically identical to a one-process benchmark.

Flag **`cold-start sensitive`** when a chunk's first request is in the upper
three measured times. For deterministic tie handling, include **every first
request with time >= `sorted[47]`**. Report the first-request indices/times,
including whether each is index 0 or an extra start (`i0 > 0`).
This is a descriptive heuristic, not proof that cold start caused a result.
Keep all samples and the actual PASS/MISS even when flagged.

## C0b verification, no real GP

Focused stand-ins/file-only checks must cover:

- exact loader/order and **one measure call** with the correct variant, level,
  n and offset seedBase; single-read executed-byte hashing despite a changed
  backing file, empty execArgv/NODE_OPTIONS enforcement before spawn, and no
  real pipeline call, warmup, guard or attempt override;
- all 79 manifest rows/114 chunks, the three multi-chunk shapes and ten-chunk
  case, exactly 3,950 indices/seeds, every P <=450 and no first-chunk bypass;
- exclusive output, partial writes, missing completion/exit receipts, nonzero
  stderr, crash/signal/kill and no false success after a failed write;
- merge refusal for missing/duplicate/overlapping/out-of-plan ranges, wrong
  seed/target/source/plan/Node/machine/policy/flags, nonfinite/negative times and
  corrupted records; exact R1 exit/result-line/stderr contracts including a
  deliberately unexpected top-level exception yielding 3, not 1;
- exact R2 folder membership including `all-79`, rejection of matching-looking
  undeclared paths, valid R3 pack/output descendants versus disallowed paths/
  non-descendants/content drift, and preservation of each ledger's actual HEAD;
- a complete all-79 merge with no selected-cell merge reports, proving the
  optional diagnostics do not become hidden prerequisites;
- raw p50/p95 indices, strict target equality as MISS, a case where merging
  chunk p95s would be wrong, ties at the upper-tail cutoff, and **71/79 not a
  complete >=90% pass** despite rounded display;
- R4 count reconstruction across restarts/checkpoints, conflicting/missing
  evidence and no resettable counter file; lawful unstarted continuation versus
  forbidden failed/completed replacement.
- F1-F6 precreation refusals and zero-admission pre-window holds, F2 attempts,
  committed F3 rulings/global F4 stop, strict hold/artifact/command.exec checks
  and rejection of missing/incomplete readiness. Rebinding tests preserve the
  policy, old ledger references and used slots; they do not enable retries.

Freeze/review the manifest and helper identities before C2. Preserve C0 work
already done; extend the per-payload classifier rather than replace transport.
All tests use the shared lock/bounds; this fake-data release is independent of
Q1. Its recorded A answer resolves the environment choice, not C2's remaining gates.
The final integrated **C0/C0b/C1** snapshot must pass all seven suites, be
refrozen under a new helper SHA and receive the combined SA1 review before C2.

## Merge scheduling, progress and Phase D attribution

**Only the final all-79 merge is required; do not automatically merge each cell.**
Selected-cell merges remain optional, explicitly requested and predeclared,
locked file-only runs **between** payloads. Running all 79 would add roughly
`79 * (15.3 + ~1) s`, about **21 minutes**, beyond the measurement booking;
that one-second payload estimate is not a new admission bound.
The final merge alone adds one locked invocation/gap and its reviewed file-only
projection. Keep these costs separate from the 114 generation-command totals.

The orchestrator keeps its **background Discord poller paused during GP
payloads**; the simplest campaign schedule leaves it paused throughout and uses
one-shot communication at boundaries. Send progress reports/read messages and
make permitted R3 checkpoints **only between chunks with no payload alive**,
after G5 cleanup and before the next pre-window/source/readiness checks.
Do not reactivate a periodic poller that could continue into the next payload.
Reports must distinguish acquired chunks/coverage from a completed GP verdict;
optional reporting does not replace the required all-79 merge.

**R6 — Phase D documentation:** after the final campaign merge and before final
quick fingerprints, update **`generator\design.md` section 9.1's status text**
and **`docs\difficulty-v3\performance-v3.md`** to state that final v3 GP numbers
come from the **task-owned R24 recorder calling the unchanged
`SG.fixtures.perfTools.measure`**, retaining raw request ledgers and check-only
merging. They do **not** come from `perf.js`'s rounded stdout.
The stock CLI may still be described as a measurement tool; do not misattribute
this campaign's provenance. Record actual completeness, chunks/cold starts and
verdicts, not planned totals as measured facts. Update coupled final-GP wording
in both developer-guide languages if present. No target, budget or test
threshold change follows, and no such document edit is assigned during C0b.

## Booking and S1 owner information

Verified arithmetic for all 79 cells:

- **114 measurement commands** = 62 one-chunk + 52 multi-chunk; **113** gaps.
  The one required final merge is additional, not a 115th measurement.
- Mean-alert sum **3803.9658065 s**, plus 114 x 60 s and 113 x 15.3 s:
  **12372.8658065 s**, about **3 h 26 min** (not a measured GP forecast).
- Reservations **7739 + 19023 = 26762 s**, plus the gaps:
  **28490.9 s**, about **7 h 55 min**.

The first 15.3 s lock-free pre-window, tooling/review, source-freeze/report work,
CPU holds/re-asks and foreign-slot waits are additional. Inter-command
pre-windows and fairness gaps are the same wait, not charged twice.
The unmeasured extra-cold-start effect may change actual times. Under **A** book
the approximately eight-hour reservation, not the mean scenario. Under **B** the
same execution booking starts only after a credible quiet window; that wait is
unknown. S-AV11's unresolved bound is outside these GP timings.

**S1 delivered:** the orchestrator posted the following status-update text from
`e4cd92d6` (lightly formatted), Discord message **1572878023034675262**, channel
**1571779348573323334**, at **about 14:37 +07:00 on 2026-11-19**.
The receipt is now recorded in S-OD15 **before freezing campaign B**; the
reported time is approximate, not an invented seconds-level timestamp.
No additional owner acknowledgement is demanded for the already accepted R24
route. An objection/changed condition needs a revised ruling.
Do not claim that a numerical plan guarantees admission, completion or GP success.

> **Cập nhật MS18d-Q1 (thông tin, đã ghi nhận anh chọn A):** Máy được ưu tiên
> cho task này; GP vẫn đo nối tiếp jobs 1, không chạy công việc khác cùng lúc
> và không nới 450/540 s hay nghỉ >=15 s. Ngoài Sohei Hell 2,
> còn 16 ô có dự phòng >450 s nếu đo cả 50 lần trong một lệnh. Theo R24 anh đã
> duyệt, hai SA thống nhất dùng sổ ghi thời gian từng yêu cầu rồi gộp: 17 ô này
> thành 52 lệnh; 62 ô còn lại mỗi ô một lệnh, tổng 114 lệnh cho đủ 79 ô.
> Mỗi lệnh đo một đoạn seed liên tiếp, dự phòng <=450 s (lớn nhất 448 s), trần
> 540 s. Vẫn giữ đủ 50 mẫu/ô, seed 7000+i·101, trace summary, warmup 0, target,
> jobs 1 và nghỉ >=15 s. Gộp 50 thời gian thô để tính đúng p50/p95/max; không
> gộp các percentile đã làm tròn, không chạy lại hay thay thế đoạn đã chạy/lỗi.
> Mỗi đoạn có admission riêng; với A, chỉ được hỏi lại một lần sau >=60 s cho
> CPU hold chưa chạy payload, tối đa hai admission/đoạn, không phải chạy lại phép đo.
> Các đoạn dùng tiến trình mới: thêm 35 lần khởi động lạnh, sẽ ghi rõ và đánh
> dấu khi mẫu đầu đoạn nằm trong ba thời gian lớn nhất (kể cả hòa tại p95),
> không bỏ/trừ mẫu đó.
> Như vậy đã có kế hoạch cho đủ 79 ô, không phải bảo đảm đo xong hay đạt gate.
> Tính lịch khoảng 3,5 giờ, dự phòng gần 8 giờ, chưa tính làm/review công cụ,
> CPU hold/chờ slot. Chỉ công bố GP hoàn tất
> khi đủ 50 mẫu của cả 79 ô; muốn đạt gate cần ít nhất 72 ô đạt target.
