# MS18d — Conditional Phase C plans and tooling-only release

Supporting specification of `MS18d-performance-and-final-hashes.md`, not another task.
Prepared against **`50903182aa9f99cf26f0ecf995a75215dc4f7f3f`**, with record-only
acceptance closure **`b3144fcf`**, 2026-11-19.

## Release boundary

**C0 is released now: Q1-independent G1-G5 transport, source binding and result
classification, in versioned Phase-C copies, with stand-in tests and SA1 review.**
The orchestrator owns commits and dispatch. Phase B received **SA1 ACCEPT WITH
CONDITIONS**; its three record-only additions/refreeze are committed at
**`b3144fcf`**, not implementation rework. Do not edit or overwrite the frozen
Phase-A/B helpers, records or accepted GG ledgers.

**C1 is NOT released until S-OD15 selects A or B:** only then build the selected
readiness launcher/CPU-policy variant and admission integration. Test it with
stand-ins and obtain review before a timed cell. C0 must not implement/run a live
CPU screen, choose the environment, launch GP, run a profile or conduct a pilot.
No live readiness/no-op campaign is authorized while the owner answer is pending.

**C2 (timing) additionally requires** accepted C0/C1 tooling, orchestrator review
of the particular row's empirical planning basis below, clean frozen inputs and
a declared window with fresh successful admission. An owner answer alone does
not make the current tee/wrapper sufficient or admit all 79 cells.

The only owner-choice switch is the **S-OD15 JSON line in check-list section 4**.
All references to the answer in this plan and the parent leaf resolve to that
line; dated Phase-A/B descriptions remain history. Before the first timed
payload, the orchestrator replaces that one line with A or B, the verbatim
answer and its owner/time/channel reference. Missing/invalid/PENDING means STOP.
An answer with different conditions requires a reviewed amendment, not a guessed
mapping to A/B. After timing starts the selected policy is frozen for the matrix;
editing the selector cannot reset attempts, authorize retries or mix policies.

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
This fingerprints frozen observations, not the GG request-manifest recipe.
There are **21 offered GP keys** with 20 existing GG records each; the other
GG combinations remain fixed diagnostics but supply no public GP row here.
No new GG run, target recalibration or publication change is assigned.

## Per-cell planning basis — identical reservations under A and B

The Phase-A **mean alerts are not admission bounds**. The following is an
explicit **empirical reservation proposal for orchestrator review**, not a
mathematical upper bound or an automatic promotion of the 78 mean-unflagged cells.
All rows remain unadmitted until the release conditions and live checks hold.

For each offered key, retain all 40 GQ times and, where available, all 20 accepted
GG `ms` values. Let `m` be the larger **observed** per-request maximum of those
two sets (GQ alone where GG is absent). Use the same rule for every row:

```
work reservation = ceil(50 * m / 1000) seconds
P = 45 seconds readiness + 15 seconds startup/identity/output allowance
    + work reservation
```

The variance allowance relative to the GQ mean alert is
`50 * (m - GQmean) / 1000`, plus upward rounding: plan all 50 requests at the
largest retained observation, rather than at their average. The 60-second
non-payload allowance is reserved, not a measured cost; it cannot be spent on
extra generations. No multiplier is fitted to make a slow row fit.

**Limitations retained for review:** GQ is trace off/jobs 4/other seeds/120000 ms
guard; GG is serial but trace off/other seeds and includes hash-record work;
GP is trace summary/jobs 1/new seeds/no caller guard. The two observed cohorts
are not pooled as a GP sample, normalized for CPU, or claimed to bound every
future seed or trace overhead. The reservation's source-transfer assumption
must be accepted explicitly; if review finds it unsupported for a row, keep that
row unadmitted. Neither the 540-second backstop nor an owner environment choice
supplies the missing planning evidence. No pilot or alternative multiplier follows.

**C** in both policy columns means **conditional candidate** (`P <= 450`) on the
original environment, not admitted. **H** means **hold/unmeasured** (`P > 450`).
Sohei Hell 2 is additionally held by its independent **485.597059875 s mean
alert** and cannot be admitted under either answer. There are **62 C / 17 H**;
these sets are unrelated to the 62 retained / 17 recalibrated target counts.
Changing machine/Node under B invalidates the transferred timing basis: every
row then needs a new reviewed compatible basis, not an assumed speedup.

GQ mean-alert values below are displayed to three decimals; calculations use
the original unrounded fields. `--` means no matching GG observation, not zero.
Targets are exact frozen milliseconds. P includes the full reserved prefix.

| Cell | Target ms | GQ mean alert s | GQ max ms | GG max ms | P s | A | B |
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
| mega12/expert | 3000 | 31.250 | 7953.7019 | -- | 458 | H | H |
| mega12/master | 3000 | 14.491 | 1112.9419 | -- | 116 | C | C |
| mega12/nightmare | 18842 | 140.373 | 8736.1104 | -- | 497 | H | H |
| mega12/hell2 | 16000 | 238.706 | 11526.3005 | -- | 637 | H | H |
| mega16/veryEasy | 1500 | 0.754 | 39.7954 | -- | 62 | C | C |
| mega16/easy | 4000 | 1.225 | 61.4999 | 58 | 64 | C | C |
| mega16/normal | 4000 | 2.162 | 134.6989 | -- | 67 | C | C |
| mega16/hard | 10000 | 26.487 | 2023.2603 | -- | 162 | C | C |
| mega16/master | 10000 | 106.184 | 6384.3164 | -- | 380 | C | C |
| mega16/hell2 | 30000 | 205.970 | 43048.0792 | -- | 2213 | H | H |
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
| hyper/nightmare | 10000 | 134.566 | 11272.8636 | -- | 624 | H | H |
| hyper/hell2 | 5000 | 97.246 | 6729.419 | -- | 397 | C | C |
| jigsaw9/veryEasy | 150 | 1.088 | 74.0841 | -- | 64 | C | C |
| jigsaw9/easy | 1905 | 9.656 | 768.6908 | -- | 99 | C | C |
| jigsaw9/normal | 350 | 4.050 | 413.6342 | 143 | 81 | C | C |
| jigsaw9/hard | 900 | 4.009 | 160.6444 | -- | 69 | C | C |
| jigsaw9/master | 2000 | 34.966 | 2719.933 | 3389 | 230 | C | C |
| jigsaw9/hell2 | 10000 | 164.326 | 9904.8754 | -- | 556 | H | H |
| killer/veryEasy | 300 | 0.272 | 25.5256 | -- | 62 | C | C |
| killer/easy | 700 | 0.932 | 64.8644 | 54 | 64 | C | C |
| killer/normal | 5425 | 28.289 | 2252.0779 | -- | 173 | C | C |
| greaterThan/veryEasy | 300 | 1.414 | 55.2629 | -- | 63 | C | C |
| greaterThan/easy | 700 | 2.421 | 112.6005 | -- | 66 | C | C |
| greaterThan/hard | 6000 | 36.336 | 3213.7686 | 5018 | 311 | C | C |
| greaterThan/master | 10000 | 98.254 | 7828.2704 | -- | 452 | H | H |
| greaterThan/hell2 | 10000 | 224.925 | 19426.627 | -- | 1032 | H | H |
| samurai/veryEasy | 3000 | 1.040 | 49.7793 | -- | 63 | C | C |
| samurai/normal | 8000 | 18.594 | 2718.3111 | -- | 196 | C | C |
| samurai/hard | 20000 | 12.984 | 1142.9887 | -- | 118 | C | C |
| samurai/expert | 20000 | 54.211 | 9047.9127 | -- | 513 | H | H |
| samurai/master | 20000 | 205.781 | 66790.9568 | -- | 3400 | H | H |
| sohei/veryEasy | 3000 | 0.796 | 44.398 | 29 | 63 | C | C |
| sohei/normal | 8000 | 36.548 | 9022.8878 | -- | 512 | H | H |
| sohei/hard | 20000 | 10.482 | 606.0797 | -- | 91 | C | C |
| sohei/expert | 20000 | 54.645 | 13851.4877 | -- | 753 | H | H |
| sohei/master | 20000 | 79.219 | 8092.3715 | -- | 465 | H | H |
| sohei/hell2 | 30000 | 485.597 | 41652.8343 | -- | 2143 | H | H |
| butterfly/veryEasy | 1000 | 0.502 | 34.3091 | -- | 62 | C | C |
| butterfly/normal | 3000 | 9.771 | 1486.743 | 1842 | 153 | C | C |
| butterfly/hard | 8000 | 4.909 | 309.2124 | -- | 76 | C | C |
| butterfly/expert | 8000 | 64.425 | 4966.2758 | -- | 309 | C | C |
| butterfly/master | 8000 | 16.104 | 948.0175 | -- | 108 | C | C |
| butterfly/nightmare | 30000 | 303.422 | 21241.2245 | -- | 1123 | H | H |
| butterfly/hell2 | 15000 | 224.982 | 14259.1274 | -- | 773 | H | H |
| flower/veryEasy | 3000 | 0.587 | 35.3335 | -- | 62 | C | C |
| flower/normal | 8000 | 13.654 | 2033.104 | 1447 | 162 | C | C |
| flower/hard | 20000 | 13.948 | 3523.2231 | -- | 237 | C | C |
| flower/master | 20000 | 26.534 | 2364.3572 | -- | 179 | C | C |
| flower/hell2 | 20000 | 164.927 | 13936.7153 | -- | 757 | H | H |
| wordoku/veryEasy | 100 | 0.272 | 21.3596 | -- | 62 | C | C |
| wordoku/easy | 2921 | 17.286 | 1338.2495 | -- | 127 | C | C |
| wordoku/hard | 600 | 3.909 | 710.1285 | -- | 96 | C | C |
| wordoku/expert | 600 | 6.993 | 599.3611 | -- | 90 | C | C |
| wordoku/master | 1500 | 7.927 | 437.3951 | -- | 82 | C | C |
| wordoku/nightmare | 1500 | 34.579 | 4217.0411 | -- | 271 | C | C |

Run reviewed C rows in this fixed matrix order, not an order chosen after
observing their GP results. H rows receive no readiness attempt or payload:
record the key/P/reason as unmeasured. The sixteen H rows other than Sohei are
the numerical subitems of **MS18d-GP-BOUND-REMAINDER**; retain the existing
**MS18d-GP-BOUND-sohei-hell2** separately. No longer ceiling, smaller cohort,
per-request guard, new evidence class or automatic owner question follows.
All 79 remain the denominator: even 62 successful measurements cannot complete
the required 79-cell / at-least-72-success gate.

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

Implement and test exactly SA1's G1-G5 gaps:

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
2. **G2, logs and paths:** read **A, B and C** release logs, plus any explicitly
   supplied coordinator release evidence. Write each real command's metadata,
   transcript and PID/result records under
   **`evidence\MS18d\gp\<variant>-<level>\<run-id>\`**. A new append-only
   `phase-c\lock-log.jsonl` may index those records. It never writes into A/B.
   Record a conservative verified release observation after helper return;
   do not label it an exact removal timestamp if the helper does not expose one.
   Carry the latest release across files/restarts; a new log is not a reset.
3. **G3, result classifier:** implement the complete-result predicate below
   with synthetic stdout/stderr/exit fixtures. An exit 1 is allowed only with
   a defined semantic meaning plus that predicate; no universal "allow exit 1".
   Preserve both the real CLI exit and wrapper/tee status.
   The Phase-B record now accounts for **eight** nonzero exits: six with an error
   field and two allowed exit-1 development failures, not six total. An error-free
   wrapper record is not proof that a helper test passed; retain that distinction.
4. **G4, source binding:** bind actual HEAD, source/tool cleanliness, the full
   E hash identity **344afdec...**, target table **3d0bffdb...**, Node and machine.
   Before timing, all executable helpers, source, targets and pack decisions
   must be committed/frozen by the orchestrator. Report raw Git status as well
   as the explicitly reviewed clean-input check. The only permitted new dirty
   paths during a campaign are its declared append-only run outputs/release
   ledger; no blanket exemption for an artifacts/evidence tree, executable
   helper, accepted record or changed tracked input. Never label global status
   clean if run-output files make it dirty. This exact allowlist/cleanliness
   definition is part of SA1's C0 review. Freeze helper hashes separately from
   E's source recipe and verify them before each admission.
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

Required stand-ins cover: busy/late acquisition and the exact 2 s / 15 s
boundaries; another job's recent release despite an old own log; A/B/C log
continuity; valid success and complete MISS; exit-1 crash, partial output,
wrong cell/target/count, missing MISS entry and contradictory summary/exit;
source/status/machine mismatch; tee-first death with a surviving child and
grandchild, normal exit and PID-reuse/unknown-liveness refusal. Check bytes
exist before completion and survive a kill. Expected fake failures are retained
and distinguished from real GP evidence.

Use isolated short-deadline stand-ins for kill tests, not a killed real shared
PowerShell wrapper. Clean up only owned test processes/files, preserve review
evidence, format/freeze the copies and obtain **SA1 review before C1/timing**.
Every Node test still uses the shared lock and normal bounds/gaps.
No permanent tool, production code, target, fixture, guide or task-pack edit
belongs to the developer. **Do not build the CPU readiness/admission launcher
in C0**; it remains C1 work after the owner chooses.

## C1 — selected readiness policy, only after S-OD15

Build the selected launcher in the same versioned Phase-C area, after C0 review
and the recorded A/B answer. Use existing bounded host/counter mechanics as
references, not an inherited GQ grant. Test the selected policy, fail-closed
unknowns, re-ask accounting and the G1-G5 integration with stand-ins, then freeze
and obtain review before an actual cell.

For either choice, source hashing/compilation precedes sampling. While the
verified lock is held, take **five one-second aggregate CPU intervals** from real
cumulative counters; record logical CPU count, raw busy-core values, mean/max,
timestamps and valid per-instance observations. No `os.loadavg`, subtraction or
normalization. A PowerShell/CIM query is bounded at **15 s**, the cumulative
readiness at **45 s**. Invalid/unavailable required facts or timeout mean an
unstarted hold, never idle. Recheck locks immediately before the payload;
anything sampled before a lock wait is stale.

- **A: `MS18d-GP-host-active`.** Keep the original raw strict `ready` verdict
  (**mean <=0.5 / max <=1.0 busy logical cores**) distinct from policy `admitted`.
  Verify the exact named host instance, own/foreign locks and per-instance CPU
  deltas over the observed snapshot window. No additional consumer may gain
  **>=0.5 CPU-s per elapsed second**. No OS-service, all-Copilot or host-tree
  exemption. Only the positively identified host, idle process and specifically
  identified owned instrumentation are excluded from that *additional-consumer*
  classification; none is subtracted from the raw aggregate screen.
- The historical host binding is PID **1968**, parent **18780**, .NET StartTime
  **`2026-11-13T19:26:33.6916441+07:00`**, CIM UTC creation
  **`2026-11-13T12:26:33.691644Z`**, executable
  **`C:\Users\ledat\AppData\Local\Microsoft\WinGet\Links\copilot.exe`**, CIM name
  **`copilot.exe`**. Reconfirm live; this file asserts no liveness. Compare the
  .NET and CIM timestamps independently, not by padding one into the other.
  A replaced/mismatching instance holds for explicit verified rebinding;
  neither the display ProcessName nor a matching filename authorizes it.
- **A re-ask:** only a verified **unstarted, additional-consumer-only** hold may
  receive one fresh-slot re-ask, **>=60 s after actual/verified release**.
  Maximum **two admission attempts** per immutable cell/protocol identity,
  at most **one payload**; preserve both attempts across crashes/restarts/log
  changes. Mixed, slot, host, counter, source, timeout and missing-evidence holds
  are not eligible. A second hold is an unexecuted gap. Pause a persistently
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

The policy applies also to S-AV11 if its separate bound is ever approved.
S-OD13 and S-OD14 grant neither GP deadline extensions nor GP recovery.

## C2 — exact execution, batching and acceptance

For each individually reviewed/admitted GP row, from `generator\`, launch one
fresh original CLI process:

```powershell
node tests\perf.js --variant=<variant> --level=<level> --runs=50 --warmup=0 --seed=7000 --gate --ascii
```

Jobs 1 is inherent; trace is summary; seeds are **7000+i*101, i=0..49**.
One contiguous `measure` call, no caller guard, warmup, sample split, preload,
priority change, target change or independent detached child. Do not require
`perf.js` as a metadata module: its `main()` runs unconditionally.

**One cell per `Invoke-Locked`/shared-lock acquisition is assigned.**
The queue may be prepared as a batch, but no multi-cell GG-style locked compound
or outer timed loop is released. Each cell has its own new CLI, new admission,
transcript and G1/G5 barriers; release before the next, enforce **>=15 s**
(wrapper wait **15.3 s**) against the latest relevant verified release.
No sleeps or resampling inside the 50-request cohort. A review rejection or H
row does not consume a payload or invite a smaller measurement.

The row's whole-command projection must be **<=450 s**; the unchanged shared
helper's **540 s** covers tee/launcher/readiness/CLI together, not a new 540 s
after sampling. Check the first row as well as later rows. If setup/readiness
exhausts its allowance or no credible remaining plan fits, do not start a late
payload. The helper's bounded slot wait is separate; tool `initial_wait` or
status reads are not extra time and must not kill the owning shell prematurely.
Never use `stop_powershell` as routine completion/timeout handling.

During the declared timed window all other agents suspend generation, tests,
hashing, formatting and analysis, including short commands. Only required minimal
supervision/status checks and the declared negligible Discord HTTP poller/report
remain. No optional CPU sampler is inserted into the measured cohort. Known
interference during it makes the raw run compromised, not CPU-adjusted.

**G3's complete-result predicate, adapted from the GG pass discipline:**

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
  missing/source-mismatched record or unexplained stderr is **STOP + QUESTION**.
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

The stock CLI does not persist raw per-request GP times/stats. Preserve that
limitation; no zeros, fabricated precision, new telemetry or live tool patch.
Final aggregate: all **79** complete, at least **72** strict unrounded successes.
Missing/held/compromised cells leave GP incomplete regardless of a subset rate.

## Wall-time booking and remaining blockers

For the **62 conditional candidates only**, once their bases are reviewed:

- GQ mean-alert sum: **956.263885125 s**, not an observed/predictive GP runtime.
- Add the full 60 s prefix allowance per cell and 61 gaps of 15.3 s:
  mean-based scheduling arithmetic **5609.563885125 s = 93.49 min**.
- Sum of row reservations **7739 s**, plus those gaps:
  **8672.3 s = 144.54 min**, about **2 h 25 min** booked if every first screen
  admits and the environment/observed-envelope assumptions hold.

Thus provision **about 1.5-2.5 hours of conditional execution time under A**;
use the **2 h 25 min reservation**, not the lower mean scenario, for scheduling.
This is a planning scenario, not a guaranteed wall-clock bound or claimed GP
measurement. Initial/foreign slot waits, C0/C1 implementation/review and report
work are separate. One eligible A hold/re-ask can add a failed admission prefix
(up to the reserved 60 s) and at least 60 s wait; foreign waits may add more.
No finite delay is promised when a shared slot or suitable window is unavailable.

**B has the same 1.5-2.5 hour conditional execution booking on the original
machine after a quiet window is actually supplied. Its wait has no ETA.**
All 140 historical strict GQ screens failed; do not advertise immediate strict
admission or a faster payload merely because B was chosen.

**There is no defensible full-Phase-C completion ETA under either answer.**
The current plans hold **17 GP cells and S-AV11**, and even the 62 candidates
require explicit empirical-basis review. Q1 changes only the environment policy.
The other blockers are: G1-G5 copies/tests/review not yet completed; C1 cannot
be built until the answer and then needs review; frozen clean source/tool
binding and the declared window; current-source bounds for held rows/profile;
and any missing/corrupt input or unverified process cleanup. Do not conceal
these by reporting a completed 79-cell GP result or invent a new slow-cell route.

Handoff to MS18e retains the selected S-OD15 answer, row-plan revision/approvals,
every completed MISS and incomplete/held row, S-AV11 disposition, all raw
admission/transcript/PID/exit records and the true aggregate status. Phase D's
complete Generator/Player quick sets still run on their final fingerprints;
this metadata/tooling work is no replacement for them.
