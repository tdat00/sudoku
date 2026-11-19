# MS18d — Conditional Phase C plans and tooling-only release

Supporting specification of `MS18d-performance-and-final-hashes.md`, not another task.
Prepared against **`50903182aa9f99cf26f0ecf995a75215dc4f7f3f`**, with record-only
acceptance closure **`b3144fcf`**, 2026-11-19.

## Release boundary

**Current campaign halt:** B1 `a2e6423a`, checkpoint `4db0114e`, 22 successful
chunks plus mega16-easy a1 and a zero-admission a2 pre-window hold.
Follow **[MS18d-epoch2-transport-repair.md](MS18d-epoch2-transport-repair.md)**:
SA2 concurs with SA1 on fix (b) and a single declared second transport epoch.
Only the scoped repair/tests are released; no next payload until one reviewed
B2 fix/freeze, its base-2 record and live journal validation. The 22 records
remain immutable and never re-requested. The named R3 exception permits exactly
two helper/base pairs; all other content identities and the ordinary checks
within each epoch remain unchanged. B2 resets no admission or payload count.

**Current state:** C0/C0b is committed at **`56b97b26`**, SA1 **ACCEPT WITH
CONDITIONS F1-F6; C1 released now**. Implement those conditions and selected A
readiness under **[MS18d-c1-readiness-and-rulings.md](MS18d-c1-readiness-and-rulings.md)**.
That leaf defines the committed hold-ruling/host-binding journals and B-freeze
checklist. C2 remains held for final integrated C0/C0b/C1 review and freeze.
The release history below remains context, not permission to run the pre-C1
controller with `readiness:null`.

**C0 is released now: Q1-independent G1-G5 transport, source binding and result
classification, in versioned Phase-C copies, with stand-in tests and SA1 review.**
SA1 accepts C0 with the additive **C0-1..C0-6** conditions below and accepts the
C1 specification. **C0b is also released now**, Q1-independent raw-time recorder,
frozen request-chunk manifest and check-only merger, as specified in
[MS18d-r24-request-ledger.md](MS18d-r24-request-ledger.md).
SA2 accepts O1: `ad7d30e3`'s blanket single-command prohibition was too broad
under owner-accepted R24/FS23. The new route supersedes only that restriction;
it changes no target, request count, per-command ceiling or readiness policy.
SA1 now concurs with `e4cd92d6` subject to **R1-R6** in that supporting spec;
those conditions supersede the earlier identical-HEAD/folder/counter wording.
The orchestrator owns commits and dispatch. Phase B received **SA1 ACCEPT WITH
CONDITIONS**; its three record-only additions/refreeze are committed at
**`b3144fcf`**, not implementation rework. Do not edit or overwrite the frozen
Phase-A/B helpers, records or accepted GG ledgers.

**S-OD15 now records A**, owner `amicably8850`, **2026-11-19T07:13:33.350Z**.
The owner-answer gate for C1 is resolved: build the selected host-active
readiness/admission implementation after the existing C0 review/dependency
gates, then test/freeze/review it before timing. The answer does not convert C0
or C0b's fake/file-only release into a GP/profile/pilot release. No standalone
live readiness/no-op campaign is assigned.

**C2 (timing) additionally requires** accepted C0/C0b/C1 tooling, orchestrator review
of the particular row's empirical planning basis below, clean frozen inputs and
a declared window with fresh successful admission. An owner answer alone does
not make the current tee/wrapper sufficient or admit all 79 cells.

The only owner-choice switch is the **S-OD15 JSON line in check-list section 4**.
All references to the answer in this plan and the parent leaf resolve to that
line; dated Phase-A/B descriptions remain history. Before the first timed
payload, the orchestrator replaces that one line with A or B, the verbatim
answer and its owner/time/channel reference. This has now been done for A.
`r24Notice` now records the delivered S1 **status update**: message
**1572878023034675262**, channel **1571779348573323334**, at **about 14:37 +07:00**.
It is not another owner permission. Record this receipt before the future
campaign base B is frozen, as R3 requires. A missing/invalid/PENDING owner choice
would still block C1/live work; the current choice is A.
An answer with different conditions requires a reviewed amendment, not a guessed
mapping to A/B. After timing starts the selected policy is frozen for the matrix;
editing the selector cannot reset attempts, authorize retries or mix policies.

### S-OD15 extra clause — resource/scheduling ruling, concurred with by SA1

The owner said **"Máy tính hiện 100% allocate cho task này, hãy sử dụng 100%
resource."** Read this with the explicit **choice A**: dedicate the machine and
schedule this task efficiently **within the selected measurement contract**.
It is not a numeric deadline waiver, a strict-quiet certificate or authority to
create background load to fill unused cores. No further owner question is needed
for this conservative mapping; changing a numeric/protocol rule would need a
separate explicit decision, not an inferred interpretation of "100%".

- **(a) Unchanged:** projected **450 s**, hard **540 s**, both mutexes and foreign/
  stale-slot handling, the bounded foreign-slot wait, **>=15 s** gaps and the
  15.3 s observed pre-window. Do not delete/ignore a foreign lock or kill another
  process because the machine was declared allocated. Fresh facts still govern.
- **(b) Outside timed GP:** genuinely independent, timing-free, read-only work
  may overlap. Keep one source writer in this repository and all shared-lock
  obligations. No blanket parallel permission for the named stages: lock/
  deadline/orphan stand-ins need controlled isolation; formatting precedes the
  affected freeze/final tests; **Phase D quick sets remain serial** because they
  contain generation/time assertions and supply measured cost evidence.
  An isolated pure-check bundle may use supported parallel execution only
  within a reviewed bounded invocation/lock and disjoint outputs. Do not bypass
  locks or add a new scheduler merely to fill cores; otherwise keep it serial.
- **(c) During a timed chunk:** no second GP chunk, tests, quick sets, format,
  freeze/hash, merge, profiling, source analysis, prefetch or other agent workload.
  Only intrinsic runtime/OS activity and required lightweight transport,
  deadline/exit/cleanup supervision remain; C0-5 still forbids periodic work
  inside the transport. With Q1 answered, **the orchestrator** pauses/stops its
  now-unneeded poller before timing rather than leaving optional HTTP/status work.
- **(d) Unchanged A re-ask:** additional-consumer threshold **>=0.5 CPU-s/s**,
  verified unstarted consumer-only hold, one fresh-slot re-ask **>=60 s** after
  release, maximum two admissions and one payload. The unit is **each frozen
  chunk**, by the separately accepted R24 plan, not by the resource clause.
  No service/host-tree exemption, counter reset, payload retry or recovery grant.

## Frozen planning inputs

These are existing measurements and declarations, not new GP observations.
The GG/target inputs below are unaffected by Phase B's record-only handoff update.
The current record-only refreeze is **`outputs-b2-sha256.txt`**; retain the older
manifest as history, not a claim that the subsequently appended handoff/log bytes
still match its older hashes. Verify the current freeze before C0 acceptance.

| Input | Binding |
|---|---|
| Official GQ `evidence\MS18c\merge\qualification-v3.json`, raw SHA-256 | `b8e546fc0ba5bd1f79f408984bf3bf8f82559305ea6bd63cbe6dc53beff0df04` |
| Phase-A `evidence\MS18d\gp-preflight.json`, raw SHA-256 | `74ffd94da77055ede5ccaa967cf727ae80a4682647c8b472586993fc8ab869fc` |
| Phase-B `targets-frozen-final.json`, raw SHA-256 | `9ec4ac6e576c81c0ea174d5465c99f480c26c4035771760f9009a6370a9de44f` |
| Its canonical 135-position table SHA-256 | `3d0bffdb19cc8d0e4c2495163858bfcbf3fd6e3d8567f4718dc722a23746963a` |
| 104 accepted GG ledgers in `evidence\MS18d\hashes`, set digest below | `acd1134248c8ed1652fa0abae391fcd2a940892402878d5426f1c391027657bb` |
| Current E hash source identity | `344afdeca4e2afe58ec552ddf4390608f6aee2febe9eb9c958b0c03b7bb8c1f1` |
| Current E replay source identity | `1cf64919a9004259a203e65bc7e537b15b981f4ed52610f4cd62d28cf6950fcc` |
| Producer / measured GQ sources | `75b0955e3e356bd1` / `0ca29eaeebc295b6`; retain the accepted support-only publication proof |
| Original environment | Node **v26.13.0**, AMD EPYC 7763, **16 logical processors**, **64 GB**, win32 **10.0.26300**, same machine as Phase B |

GG set digest: sort the 104 repository-relative paths with `/` separators;
SHA-256 the UTF-8 concatenation of `path + NUL + raw-file-SHA256 + LF`.
Every embedded raw-file SHA-256 and the final displayed digest use **lowercase
hex**, exactly; uppercase changes this text recipe and is not the bound set.
This fingerprints frozen observations, not the GG request-manifest recipe.
There are **21 offered GP keys** with 20 existing GG records each; the other
GG combinations remain fixed diagnostics but supply no public GP row here.
No new GG run, target recalibration or publication change is assigned.

## Per-cell planning basis — common max rule, applied per frozen chunk

The Phase-A **mean alerts are not admission bounds**. The following is an
explicit **empirical reservation proposal for orchestrator review**, not a
mathematical upper bound or an automatic promotion of the 78 mean-unflagged cells.
All rows remain unadmitted until the release conditions and live checks hold.

For each offered key, retain all 40 GQ times and, where available, all 20 accepted
GG `ms` values. Let `m` be the larger **observed** per-request maximum of those
two sets (GQ alone where GG is absent). Preserve the single-process reference
P50, but use the same reservation rule for each **assigned n-request chunk**:

```
P50 = 60 + ceil(50 * m / 1000)                 // reference, not a split-cell command
capacity = floor(390000 / m)
k = ceil(50 / capacity)
Pchunk(n) = 45 seconds readiness + 15 seconds startup/identity/output allowance
            + ceil(n * m / 1000)
```

The variance allowance relative to the GQ mean alert is
`50 * (m - GQmean) / 1000`, plus upward rounding: reserve all 50 requests at the
largest retained observation, rather than at their average. The 60-second
non-payload allowance is reserved **per chunk**, not a measured cost; it cannot be spent on
extra generations. No multiplier is fitted to make a slow row fit.

**Limitations retained for review:** GQ is trace off/jobs 4/other seeds/120000 ms
guard; GG is serial but trace off/other seeds and includes hash-record work;
GP is trace summary/jobs 1/new seeds/no caller guard. The two observed cohorts
are not pooled as a GP sample, normalized for CPU, or claimed to bound every
future seed or trace overhead. The reservation's source-transfer assumption
must be accepted explicitly; if review finds it unsupported for a row, keep that
row unadmitted. Neither the 540-second backstop nor an owner environment choice
supplies the missing planning evidence. No pilot or alternative multiplier follows.

**C** in both policy columns means **one-chunk conditional candidate**:
`[i0=0,n=50,P=P50]`. **R** means **conditional R24 multi-chunk route**, using
the exact frozen ranges/P values in `MS18d-r24-request-ledger.md`, never the
over-limit P50 as a command. There are **62 C / 17 R**, unrelated to the 62
retained / 17 recalibrated target counts. All 79 now have numerical command
plans; none is automatically admitted. Sohei Hell 2's **485.597059875 s mean
alert** still forbids its monolithic command, but its six assigned chunks are
conditional under either policy, not permanently held by that old screen.
Changing machine/Node under B invalidates the transferred timing basis: every
row then needs a new reviewed compatible basis, not an assumed speedup.

GQ mean-alert values below are displayed to three decimals; calculations use
the original unrounded fields. `--` means no matching GG observation, not zero.
Targets are exact frozen milliseconds. P50 includes one reserved prefix and is
reference-only for R rows; their actual chunk prefixes are counted separately.

| Cell | Target ms | GQ mean alert s | GQ max ms | GG max ms | P50 s | A | B |
|---|---:|---:|---:|---:|---:|:---:|:---:|
| classic4/veryEasy | 31 | 0.098 | 12.9531 | 8 | 61 | C | C |
| classic6/veryEasy | 39 | 0.132 | 13.8671 | 11 | 61 | C | C |
| classic6/hard | 350 | 5.266 | 399.0431 | 387 | 80 | C | C |
| classic9/veryEasy | 60 | 0.209 | 19.8093 | 14 | 61 | C | C |
| classic9/easy | 2342 | 17.724 | 1318.719 | 1406 | 131 | C | C |
| classic9/normal | 2627 | 19.918 | 952.5775 | 1112 | 116 | C | C |
| classic9/hard | 400 | 3.319 | 493.1213 | 129 | 85 | C | C |
| classic9/expert | 1323 | 5.729 | 544.8815 | 610 | 91 | C | C |
| classic9/master | 900 | 7.475 | 468.8741 | 410 | 84 | C | C |
| classic9/nightmare | 8377 | 54.445 | 3228.1024 | 1702 | 222 | C | C |
| mega12/veryEasy | 400 | 0.416 | 26.8378 | -- | 62 | C | C |
| mega12/easy | 1000 | 0.896 | 53.8743 | -- | 63 | C | C |
| mega12/normal | 1000 | 1.553 | 127.5042 | 50 | 67 | C | C |
| mega12/hard | 3000 | 4.501 | 372.2446 | -- | 79 | C | C |
| mega12/expert | 3000 | 31.250 | 7953.7019 | -- | 458 | R | R |
| mega12/master | 3000 | 14.491 | 1112.9419 | -- | 116 | C | C |
| mega12/nightmare | 18842 | 140.373 | 8736.1104 | -- | 497 | R | R |
| mega12/hell2 | 16000 | 238.706 | 11526.3005 | -- | 637 | R | R |
| mega16/veryEasy | 1500 | 0.754 | 39.7954 | -- | 62 | C | C |
| mega16/easy | 4000 | 1.225 | 61.4999 | 58 | 64 | C | C |
| mega16/normal | 4000 | 2.162 | 134.6989 | -- | 67 | C | C |
| mega16/hard | 10000 | 26.487 | 2023.2603 | -- | 162 | C | C |
| mega16/master | 10000 | 106.184 | 6384.3164 | -- | 380 | C | C |
| mega16/hell2 | 30000 | 205.970 | 43048.0792 | -- | 2213 | R | R |
| diagonalX/veryEasy | 80 | 0.216 | 19.6909 | -- | 61 | C | C |
| diagonalX/normal | 200 | 2.402 | 399.7115 | -- | 80 | C | C |
| diagonalX/hard | 500 | 1.385 | 98.2527 | -- | 65 | C | C |
| diagonalX/master | 1200 | 10.044 | 914.6799 | -- | 106 | C | C |
| diagonalX/nightmare | 10000 | 103.978 | 7414.5825 | 5015 | 431 | C | C |
| diagonalX/hell2 | 3000 | 55.047 | 3373.9294 | -- | 229 | C | C |
| hyper/veryEasy | 80 | 0.224 | 19.3498 | -- | 61 | C | C |
| hyper/normal | 1573 | 10.088 | 805.5777 | -- | 101 | C | C |
| hyper/hard | 500 | 1.734 | 138.827 | 79 | 67 | C | C |
| hyper/master | 1200 | 12.184 | 1545.0021 | -- | 138 | C | C |
| hyper/nightmare | 10000 | 134.566 | 11272.8636 | -- | 624 | R | R |
| hyper/hell2 | 5000 | 97.246 | 6729.419 | -- | 397 | C | C |
| jigsaw9/veryEasy | 150 | 1.088 | 74.0841 | -- | 64 | C | C |
| jigsaw9/easy | 1905 | 9.656 | 768.6908 | -- | 99 | C | C |
| jigsaw9/normal | 350 | 4.050 | 413.6342 | 143 | 81 | C | C |
| jigsaw9/hard | 900 | 4.009 | 160.6444 | -- | 69 | C | C |
| jigsaw9/master | 2000 | 34.966 | 2719.933 | 3389 | 230 | C | C |
| jigsaw9/hell2 | 10000 | 164.326 | 9904.8754 | -- | 556 | R | R |
| killer/veryEasy | 300 | 0.272 | 25.5256 | -- | 62 | C | C |
| killer/easy | 700 | 0.932 | 64.8644 | 54 | 64 | C | C |
| killer/normal | 5425 | 28.289 | 2252.0779 | -- | 173 | C | C |
| greaterThan/veryEasy | 300 | 1.414 | 55.2629 | -- | 63 | C | C |
| greaterThan/easy | 700 | 2.421 | 112.6005 | -- | 66 | C | C |
| greaterThan/hard | 6000 | 36.336 | 3213.7686 | 5018 | 311 | C | C |
| greaterThan/master | 10000 | 98.254 | 7828.2704 | -- | 452 | R | R |
| greaterThan/hell2 | 10000 | 224.925 | 19426.627 | -- | 1032 | R | R |
| samurai/veryEasy | 3000 | 1.040 | 49.7793 | -- | 63 | C | C |
| samurai/normal | 8000 | 18.594 | 2718.3111 | -- | 196 | C | C |
| samurai/hard | 20000 | 12.984 | 1142.9887 | -- | 118 | C | C |
| samurai/expert | 20000 | 54.211 | 9047.9127 | -- | 513 | R | R |
| samurai/master | 20000 | 205.781 | 66790.9568 | -- | 3400 | R | R |
| sohei/veryEasy | 3000 | 0.796 | 44.398 | 29 | 63 | C | C |
| sohei/normal | 8000 | 36.548 | 9022.8878 | -- | 512 | R | R |
| sohei/hard | 20000 | 10.482 | 606.0797 | -- | 91 | C | C |
| sohei/expert | 20000 | 54.645 | 13851.4877 | -- | 753 | R | R |
| sohei/master | 20000 | 79.219 | 8092.3715 | -- | 465 | R | R |
| sohei/hell2 | 30000 | 485.597 | 41652.8343 | -- | 2143 | R | R |
| butterfly/veryEasy | 1000 | 0.502 | 34.3091 | -- | 62 | C | C |
| butterfly/normal | 3000 | 9.771 | 1486.743 | 1842 | 153 | C | C |
| butterfly/hard | 8000 | 4.909 | 309.2124 | -- | 76 | C | C |
| butterfly/expert | 8000 | 64.425 | 4966.2758 | -- | 309 | C | C |
| butterfly/master | 8000 | 16.104 | 948.0175 | -- | 108 | C | C |
| butterfly/nightmare | 30000 | 303.422 | 21241.2245 | -- | 1123 | R | R |
| butterfly/hell2 | 15000 | 224.982 | 14259.1274 | -- | 773 | R | R |
| flower/veryEasy | 3000 | 0.587 | 35.3335 | -- | 62 | C | C |
| flower/normal | 8000 | 13.654 | 2033.104 | 1447 | 162 | C | C |
| flower/hard | 20000 | 13.948 | 3523.2231 | -- | 237 | C | C |
| flower/master | 20000 | 26.534 | 2364.3572 | -- | 179 | C | C |
| flower/hell2 | 20000 | 164.927 | 13936.7153 | -- | 757 | R | R |
| wordoku/veryEasy | 100 | 0.272 | 21.3596 | -- | 62 | C | C |
| wordoku/easy | 2921 | 17.286 | 1338.2495 | -- | 127 | C | C |
| wordoku/hard | 600 | 3.909 | 710.1285 | -- | 96 | C | C |
| wordoku/expert | 600 | 6.993 | 599.3611 | -- | 90 | C | C |
| wordoku/master | 1500 | 7.927 | 437.3951 | -- | 82 | C | C |
| wordoku/nightmare | 1500 | 34.579 | 4217.0411 | -- | 271 | C | C |

Run the reviewed chunks in this fixed matrix order, then increasing i0, not an
order chosen after GP results. **MS18d-GP-BOUND-REMAINDER** and
**MS18d-GP-BOUND-sohei-hell2** are resolved as single-command planning
obstructions by the assigned R24 route, not as measured performance passes.
There is no shorter total cohort, longer ceiling, new guard or unsupported
percentile split. All 79 still require complete 50-request evidence and at
least 72 successes for a complete passing GP gate.

## S-AV11 — same request under either selected policy, still unadmitted

The planned diagnostic is exactly **jigsaw9 / expert / seed 1111**, trace
**off**, no variant-option or max-attempt override, size-default **8 attempts**,
and **no caller budget**, as in `manual\jigsaw.test.js`'s `generatePuzzle`.
Use the existing per-call `withRequestedLevel` guard and restore the exact
support array in `finally`; Expert stays hidden. It is not a GP cell.

Capture the existing returned `PuzzleResult.timings` (all seven `SG.events.STEP_IDS`,
summed across attempts/samples), actual `work`/attempt/outcome fields where
provided, source/configuration and whole-request elapsed time. Do not invent
missing counters, call returned-sample counters whole-request totals, change
trace to summary, or use `difficulty-recovery --mode=profile`'s one-attempt recipe.
No new profiler or pipeline instrumentation is required.

**A and B both: HOLD, projection unknown.** The historical **325.313 s** was
another source; neither the different GQ seeds nor Fibonacci GG seeds measured
1111 on the current producer. There is no new current-tuple basis in Phase B.
Before this one request may launch, the orchestrator must review a defensible
current-source whole-command plan <=450 s including readiness/recording.
Absent that, report S-AV11 unmeasured; do not turn the old 325 seconds into a
bound or run a discovery pilot. Its environment follows S-OD15 if eventually
admitted, but its result/cost is never merged into GP. Keep records under
`evidence\MS18d\s-av11\<run-id>\`. No second attempt to reproduce an outlier.

## C0 — tooling-only assignment, released before Q1

Create versioned helpers only under
**`generator\tests\artifacts\difficulty-v3\MS18d\phase-c\`**. Preserve Phase B's
`tee-append.js`/`append-writer.js` semantics and its immutable originals; copy or
reference the frozen bytes explicitly. Adapt a **Phase-C copy** of
`run-locked.ps1`; never edit the shared `Invoke-Dv3Node` or accepted helpers.
Stand-in records belong under `evidence\MS18d\phase-c\tooling\`, with isolated
project-local test locks/state. Do not mix fake records into the real GP matrix.

Implement and test SA1's G1-G5 gaps with the already relayed C0-1..C0-6 additions:

1. **G1, actual acquisition:** record request time/slot state and the actual
   start timestamp **from inside the locked child**, before any payload.
   The own-log gap at request time alone is insufficient. Use **2.000 s** as
   the late-start threshold. If the slot was busy or actual start is more than
   2 s after the call, hold unless a trustworthy **latest relevant release**
   proves >=15 s before this start. An old own release cannot excuse a newly
   released foreign slot. Negative/unknown times, races and unproved release
   history hold; do not fabricate timestamps. A hold starts no GP and releases
   the slot. These are slot holds, not eligible A additional-consumer re-asks.
   Retain request/start/release provenance and the final lock recheck.
   **C0-1:** immediately before every call, observe both mutex files over a
   **15.3 s lock-free pre-window**, polling nominally every **250 ms**, with
   **no gap >1000 ms**. A seen lock or longer observation gap restarts that
   window; the whole watch is bounded at **1200 s**, then holds without a
   payload. Respect the latest A/B/C release plus 15.3 s as well. Retain the
   first/last checks, count/max gap, restarts and give-up state. This is a
   bounded lock watch, not a CPU/readiness retry loop or proof beyond the
   observations. Its final window also supplies the inter-command fairness gap;
   do not charge or perform two separate 15.3 s waits unnecessarily.
2. **G2, logs and paths:** read **A, B and C** release logs, plus any explicitly
   supplied coordinator release evidence. Write each real command's metadata,
   transcript and PID/result records under
   its **exact manifest-declared directory**. Chunk/selected-cell runs use
   **`evidence\MS18d\gp\<variant>-<level>\<run-id>\`**; R2's final aggregate merge
   uses one declared **`evidence\MS18d\gp\all-79\<run-id>\`**. These path shapes
   are not an allowlist: literal frozen membership is required. A new append-only
   `phase-c\lock-log.jsonl` may index those records. It never writes into A/B.
   Record a conservative verified release observation after helper return;
   do not label it an exact removal timestamp if the helper does not expose one.
   Carry the latest release across files/restarts; a new log is not a reset.
3. **G3, result classifier:** implement the payload-specific predicates
   with synthetic stdout/stderr/exit fixtures. An exit 1 is allowed only with
   a defined semantic meaning plus that predicate; no universal "allow exit 1".
   Preserve both the real CLI exit and wrapper/tee status.
   **C0-3:** retain stdout and stderr separately, including original byte
   counts. **Zero stderr bytes is required**: a space, newline or other byte
   is not excused by trimming/normalization or an apparently complete stdout.
   The Phase-B record now accounts for **eight** nonzero exits: six with an error
   field and two allowed exit-1 development failures, not six total. An error-free
   wrapper record is not proof that a helper test passed; retain that distinction.
   **R1's merger exits:** 0 complete pass; 1 only with the terminal complete
   machine-readable numeric MISS/gate-failure line and zero stderr; 2
   incomplete/invalid input; 3 caught unexpected top-level exception.
   An uncaught Node exception's default exit 1 must never become a GP MISS.
4. **G4/R3, source binding:** record campaign base **B** before the first real
   chunk, after final tooling/manifest freeze and the already-recorded notice.
   For the named epoch-2 repair, B is the record's declared epoch base and
   helper matching is per approved pair; only that leaf's exact cross-epoch
   helper delta is allowed. The unchanged admission checker uses current B2.
   Each actual HEAD must be B or a descendant; `git diff --name-only B <HEAD>`
   may list only the exact C0-4 campaign-output paths or `tasks/difficulty-v3/`.
   Keep all content/environment identities equal: E hash **344afdec...**,
   executed/loaded source manifest, table **3d0bffdb...**, chunk manifest,
   helpers, Node, machine and policy. R5 additionally requires empty Node flags.
   The production transport refuses `NODE_OPTIONS` before spawning its Node
   chain; the recorder records empty `process.execArgv` and `NODE_OPTIONS`.
   Do not silently clear inherited options or hash different bytes from those executed.
   Permitted committed checkpoints do not authorize a changed immutable input.
   Before timing, all executable helpers, source, targets and pack decisions
   must be committed/frozen by the orchestrator. Report raw Git status as well
   as the explicitly reviewed clean-input check. **C0-4's exact allowlist:**
   only **`??` new files directly inside exact R2 manifest-declared** recording/
   selected-cell/final-merge directories, including its one `gp/all-79/<run-id>/`,
   and **` M`** of the **already committed**
   `docs/difficulty-v3/evidence/MS18d/phase-c/lock-log.jsonl`, whose committed
   content is an exact prefix of its working content. Account only for declared
   Git checkout line-ending conversion when comparing that prefix. No staged,
   deleted, renamed, other modified, nested-directory or blanket artifact/
   evidence exemption; no changing an earlier output or accepted input.
   Keep `rawClean` and `reviewedClean` distinct, with all raw status retained.
   Freeze helper hashes separately from E's recipe before every admission.
   Do not require identical HEADs across chunks or retag earlier records:
   validate every recorded HEAD against B and the unchanged content identities.
   Uncommitted pack/helper edits remain disallowed by C0-4.
5. **G5, orphan barrier:** durably record the actual command PID, owner/parent
   provenance and spawn identity/time window, not just the tee PID. After any
   tee outcome, including its early death or exit 0, positively confirm the
   command and owned descendants are gone **before the next run**. If an owned
   child survives, stop it by verified specific PID/handle and retain the
   failure; PID reuse/unknown liveness is a hold for the orchestrator, never
   proof of exit or permission to kill an unrelated process. The shared helper
   alone cannot do this when its tee has already exited. No next payload may
   follow an unverified cleanup or stale lock.
   Keep a bounded task-owned transport controller above the tee alive through
   this barrier so that ordinary tee-first cleanup occurs while our lock is
   still held. Retain the outer wrapper's abnormal-exit verification as well;
   the unchanged 540 s applies to the whole controller tree. This controller
   performs no CPU readiness work in C0 and is not a detached/recovery service.
   **C0-2:** obtain the actual command PID from an unambiguous tee spawn
   line/record or a bounded post-tee-exit lookup. Bind a living process by
   **PID plus creation time** and ownership, never PID/name alone. Preserve
   the spawn window; a positive absent result is not an invented creation time.
   Do not add a periodic process query to obtain this identity.

**C0-5:** the tee/controller does **no periodic work during a payload**:
no timer-driven PID/CPU/file/Git polling or sampler. Stream/spawn/exit handling
is event-driven; process lookup/cleanup follows exit. The shared helper keeps
its unchanged process-tree deadline. The old external HTTP poller exception
does not permit a transport-side loop; pause optional pollers now Q1 is answered.

**C0-6:** transport stays generic. Register a separate G3 validator for each
payload type: existing stock GP CLI, generic exit-0 tooling, raw GP recorder
(strict acquisition exit 0), and check-only merge (defined complete gate
PASS/MISS exits). C0b extends this hook, not the G1/G2/G4/G5 transport.
Do not demand a stock rounded GP header from a ledger-writing recorder, or
interpret a recorder's acquisition success as performance success.

Required stand-ins cover: busy/late acquisition and the exact 2 s / 15 s
boundaries; another job's recent release despite an old own log; A/B/C log
continuity; valid success and complete MISS; exit-1 crash, partial output,
wrong cell/target/count, missing MISS entry and contradictory summary/exit;
source/status/machine mismatch; tee-first death with a surviving child and
grandchild, normal exit and PID-reuse/unknown-liveness refusal. Check bytes
exist before completion and survive a kill. Expected fake failures are retained
and distinguished from real GP evidence.
Also cover the 15.3 s pre-window/restarts/give-up, zero-byte stderr rule,
the exact status allowlist/prefix, event-driven transport and a non-CLI payload
using its own G3 contract without a transport change.
R1-R5 add the merger's exact exits/result line, manifest-only merge folders,
permitted versus forbidden B descendants, immutable-history count derivation,
single-read executed-byte hashing and rejection of Node flags/options.

Use isolated short-deadline stand-ins for kill tests, not a killed real shared
PowerShell wrapper. Clean up only owned test processes/files and preserve review
evidence. C0/C0b review at `56b97b26` now releases **C1 with F1-F6**; rerun the
seven suites/refreeze and obtain **combined SA1 review before C2**, not a
real-measurement smoke test.
Every Node test still uses the shared lock and normal bounds/gaps.
No permanent tool, production code, target, fixture, guide or task-pack edit
belongs to the developer. **CPU readiness/admission belongs to C1, not C0/C0b**.
The owner has selected A; C1 is released, with the new leaf's close-out gates.

## C1 — released selected A readiness and F1-F6 integration

Build the **selected A launcher** in the same Phase-C area, now that the
conditional C0/C0b review and answer are recorded. Use existing bounded host/counter mechanics as
references, not an inherited GQ grant. Test the selected policy, fail-closed
unknowns, re-ask accounting and the G1-G5 integration with stand-ins, then freeze
and obtain review before an actual cell.

For either choice, source hashing/compilation precedes sampling. While the
verified lock is held, take **five in-process one-second intervals from
`os.cpus()`**, with no subprocess inside that window. Take bounded per-process
snapshots before/after it; record logical CPU count, raw busy-core values,
mean/max, timestamps and per-instance observations. No `os.loadavg`, subtraction or
normalization. A PowerShell/CIM query is bounded at **15 s**, the cumulative
readiness at **45 s**. Invalid/unavailable required facts or timeout mean an
unstarted hold, never idle. Recheck locks immediately before the payload;
anything sampled before a lock wait is stale. **More than 60 s from the
post-watch recorded call/request to payload spawn is a hold**; no clock reset.
F6 makes missing configured readiness a real-run hold/refusal, and the merger
requires the complete saved A record, not a non-null placeholder.

- **A: `MS18d-GP-host-active`.** Keep the original raw strict `ready` verdict
  (**mean <=0.5 / max <=1.0 busy logical cores**) distinct from policy `admitted`.
  Verify the exact named host instance, own/foreign locks and per-instance CPU
  deltas over the observed snapshot window. No additional consumer may gain
  **>=0.5 CPU-s per elapsed second**. No OS-service, all-Copilot or host-tree
  exemption. Exclude only the approved **host itself**, idle, and **this run's
  identified wrapper/controller/readiness PIDs and instances**, not their
  ancestors/descendants or other agents, from that *additional-consumer*
  classification; none is subtracted from the raw aggregate screen.
- The historical host binding is PID **1968**, parent **18780**, .NET StartTime
  **`2026-11-13T19:26:33.6916441+07:00`**, CIM UTC creation
  **`2026-11-13T12:26:33.691644Z`**, executable
  **`C:\Users\ledat\AppData\Local\Microsoft\WinGet\Links\copilot.exe`**.
  Name fields are diagnostic only. SA1 confirmed the tuple at `56b97b26`;
  .NET ProcessName is now **`copilot.exe.old-25148-1794809773310`**.
  That rename alone is not a new instance. Reconfirm live before each admission. Compare the
  .NET and CIM timestamps independently, not by padding one into the other.
  A replaced/mismatching instance holds for explicit verified rebinding;
  neither ProcessName nor a matching filename authorizes it.
  Use the committed host-binding journal and **SA2 ruling + SA1 concurrence,
  orchestrator append/commit** procedure in the C1 leaf. No automatic rebind,
  second exemption, retry or retroactive change to earlier admissions.
- **A re-ask:** only a verified **unstarted, additional-consumer-only** hold may
  receive one fresh-slot re-ask, **>=60 s after actual/verified release**.
  Maximum **two admission attempts per immutable chunk/protocol identity**,
  at most **one payload per chunk**; preserve both attempts across crashes/restarts/log
  changes. Mixed, slot, host, counter, source, timeout and missing-evidence holds
  are not eligible for an **automatic** re-ask. F3 may permit that chunk's
  existing second slot only after a proved unstarted hold and committed joint ruling; it
  bypasses no F1/F2/F6 predicate and creates no third admission or started-payload
  retry. A second hold is an unexecuted gap. Pause a persistently
  contaminated window instead of cycling through other identities to hunt
  an idle sample. Further scheduling goes back to the orchestrator.
- **B: strict-quiet.** Require the same valid screen with **mean <=0.5 and
  max <=1.0**, valid locks/counters and no known foreign heavy work; no host
  exception. The orchestrator supplies a credibly quiet window. This plan has
  **no automatic re-ask**: a hold returns the window to the orchestrator, not
  a sleep/retry loop or a sweep of other cells looking for luck. A later
  separately scheduled window needs fresh facts and retained attempt history.
  A different machine/Node is recorded uniformly and requires re-reviewed
  timing bases before any row runs.

For a one-chunk cell this is the original cell-level accounting. The profile
remains one separate request unit if S-AV11's bound is ever approved.
S-OD13 and S-OD14 grant neither GP deadline extensions nor GP recovery.
**R4:** derive counts from immutable run folders and the append-only C lock-log,
not a mutable counter file. Cross-check/deduplicate evidence by chunk/attempt
identity anchored to B; missing/ambiguous history holds, never resets to zero.
Merge runs do not consume GP chunk attempts. HEAD checkpoints do not reset them.
**F1:** a watch give-up has no run folder and logs `pre-window-hold`, zero
admissions; do not treat that expected no-folder record as a missing admission.
**F2/F4:** check attempts and the global line-stop before folder creation.
Attempt 1 refuses any existing chunk folder; attempt 2 needs the genuine
unstarted `.a1` plus automatic eligibility/wait or a committed F3 ruling.
After a non-success other than that chunk's own eligible re-ask, block all
further real calls until valid joint disposition; do not bypass the stop with
another chunk. **P1:** a jointly approved F3 line naming a started failure may
lift F4 for **other chunks and the final check-only merge**, never for another
attempt/payload of the failed chunk. Failure/partial records and incomplete
coverage remain; `Assert-AttemptC`, `attempts.js` and the merger still reject
retry/replacement. This is a pack clarification, not a code change.

## C2 — exact execution, batching and acceptance

For each individually reviewed/admitted **frozen chunk**, from `generator\`,
launch a fresh task-owned recorder process. The proposed entry-point contract
is implemented/reviewed in C0b, not an already existing CLI permission:

```powershell
node tests\artifacts\difficulty-v3\MS18d\phase-c\record-gp.js --plan=<frozen-manifest> --chunk=<immutable-id> --out=<new-ledger>
```

Jobs 1 is inherent; trace is summary; each cell still has all seeds
**7000+i*101, i=0..49**. Make one contiguous `measure` call per chunk with the
frozen n/offset. No caller guard, warmup, split outside this R24 plan, preload,
priority change, target change or detached child. Never require `perf.js`:
its `main()` runs unconditionally. Only raw-time check-only merging is supported.

**One chunk per `Invoke-Locked`/shared-lock acquisition is assigned.**
The queue may be prepared as a batch, but no multi-cell GG-style locked compound
or outer timed loop is released. Each chunk has its own fresh process/admission,
transcript and G1/G5 barriers; release before the next, enforce **>=15 s**
(wrapper wait **15.3 s**) against the latest relevant verified release.
No sleeps or resampling inside a chunk, or choosing a smaller measurement after
results. The only continuation is an unstarted, preplanned chunk, never a
failed/completed chunk's retry or replacement.

Each chunk's whole-command projection must be **<=450 s**; the unchanged shared
helper's **540 s** covers tee/launcher/readiness/recorder together, not a new 540 s
after sampling. Check the first row as well as later rows. If setup/readiness
exhausts its allowance or no credible remaining plan fits, do not start a late
payload. The helper's bounded slot wait is separate; tool `initial_wait` or
status reads are not extra time and must not kill the owning shell prematurely.
Never use `stop_powershell` as routine completion/timeout handling.
The current pre-C1 controller's acquisition/binding-only admission is not a
real-run path: F6 requires readiness configuration and complete admitted A facts.

During the declared timed window all other agents suspend generation, tests,
hashing, formatting and analysis, including short commands. Only required minimal
transport/deadline/exit/cleanup checks remain. The orchestrator keeps the
background Discord poller paused during payloads. Progress reports, one-shot
message checks and permitted checkpoints occur **only between chunks with no
payload alive**, after G5 and before the next fresh pre-window/binding/readiness.
No optional CPU sampler is inserted into the measured cohort. Known
interference during it makes the raw run compromised, not CPU-adjusted.
**From C1 all agent Node commands are locked, including version/check and
Discord commands. During a timed chunk no agent runs Node outside the approved
GP tree at all. The orchestrator stops `node discord.cjs` and uses locked
one-shot sends/polls only between chunks after verified cleanup.**

**Actual final GP uses C0b's typed recorder/merge predicates.** A recorder needs
exit 0 plus its complete raw ledger/receipt and makes no performance verdict.
Only a complete 50-request merge computes p50/p95/max and a numerical MISS.
Require all 114 planned chunks/3,950 distinct indices for the complete all-79
gate. The following **stock-CLI G3 predicate remains for that transport payload
type and its stand-ins**, not the final matrix's record format:

- Match actual frozen argv/source/Node/machine and a valid admission record.
  Require the stock header declaring **50 runs, trace summary, seed 7000**,
  exactly one result row for the requested offered cell and frozen target,
  and the terminal **1 of 1** or **0 of 1** summary.
- `ok` + `1 of 1` + real CLI **exit 0** is a complete performance success.
  `MISS` + `0 of 1` + the matching **`Misses:` entry** + real CLI **exit 1**
  is a complete performance miss. The row's mark is authoritative: do not
  infer the decision from rounded p95, recompute a rounded percentage, or call
  MISS a tool crash. Record its failed numerical verdict and continue safe rows.
  Propagate the real GP success/MISS as **0/1** through the tee/controller;
  do not turn a completed MISS into exit 0. A validation failure stays nonzero
  and also preserves the original child exit/signal.
- Require the real completion marker, consistent tee/wrapper/CLI status,
  retained stdout/stderr and the G5 no-orphan confirmation. A stack/error,
  signal, timeout, spawn failure, incomplete or contradictory transcript,
  missing/source-mismatched record or **any stderr bytes** is **STOP + QUESTION**.
  Exit 1 alone and even an exit-0 tee are never enough.
- If an unstarted hold exits its control wrapper normally, label it a
  **control hold**, not a complete GP result. Persist intent/start/PID/end
  records; an uncertain payload start is not eligible for an unstarted re-ask.
  No recovery/replacement payload is authorized by this plan.
- Keep any completed run exceeding its planning projection with the true
  PASS/MISS and a cost item; do not rerun it. Suspend dependent automatic
  dispatch for review of affected planning assumptions. A hard-killed or
  compromised run stays incomplete, with all partial bytes, never a slow-cell
  MISS or an excuse to choose a faster repeat.

The stock CLI still does not persist raw request times; C0b closes that evidence
gap without patching it. Raw times already returned by `measure` are recorded;
per-request outcomes/stats not returned by it remain unavailable, never invented.
Final aggregate: all **79** complete, at least **72** strict unrounded successes.
Missing/held/compromised cells leave GP incomplete regardless of a subset rate.

## Wall-time booking and remaining blockers

The R24 plan covers **all 79 cells / 114 measurement commands / 113 gaps**, with **35 extra
cold process starts** disclosed, not extra generations. See its verified booking:
mean-based arithmetic **12372.8658065 s (~3 h 26 min)**; reserved
**28490.9 s (~7 h 55 min)**. Use the approximately eight-hour reservation under
**A**, not a guaranteed GP forecast. **B** has the same execution booking once
a credible quiet window is supplied; that wait is unknown.
The first pre-window, tooling/review/report work, CPU holds and foreign waits
are additional. **Only one final all-79 merge is required**, adding its locked
invocation/gap and reviewed file-only projection. Selected-cell merges are
optional/predeclared, not automatic: all 79 would add roughly 21 minutes not
included in the generation booking. The old 62-cell / 2 h 25 min booking is superseded, not a final
matrix estimate.

The structural 17-row obstruction is resolved by R24, not by larger limits or
a smaller denominator. Remaining gates are C0/C0b/C1 implementation/review,
the recorded S-OD15 A interpretation, frozen clean bindings, the declared window and actual
per-chunk admission. S-AV11 still lacks a separate current-tuple bound.
Missing/corrupt data, failed chunks or unknown process cleanup remain blockers,
not waived outcomes. No guarantee of completion follows from the numerical plan.

Handoff to MS18e retains the selected S-OD15 answer, row-plan revision/approvals,
every completed MISS and incomplete/held chunk/cell, S-AV11 disposition, all raw
request ledgers and admission/transcript/PID/exit records, cold-start disclosures
and the true aggregate status. Phase D's
complete Generator/Player quick sets still run on their final fingerprints;
this metadata/tooling work is no replacement for them.
**R6:** Phase D's design 9.1 status and final performance report attribute GP
numbers to the task-owned R24 recorder calling `perfTools.measure`, not to
`perf.js` stdout. Finish these non-pack document edits after the campaign's
final merge, before final quick fingerprints.
