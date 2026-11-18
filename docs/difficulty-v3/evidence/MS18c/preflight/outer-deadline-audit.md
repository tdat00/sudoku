# MS18c Stage 1 - outer-deadline, supervision and manifest audit

FILE-ONLY audit by the Stage 1 developer (started 2026-11-18 23:05:07 +07:00; dispatch base `3d166c79`, HEAD observed
`42e0d239`, see `input-audit.md` section 5 item 2 for the brief bytes relied on). Nothing here approves a ceiling or
releases anything; Stage 2 (SA1 + SA2) approves P, A, T and O per cell, and the orchestrator releases Stage 3.
Seconds throughout unless a unit is written.

## 1. Structural envelopes of the 135 rows (conditional planning bounds, not forecasts)

Method `MS18c-GQ-structural-v1`: H=60, D=10, V=10, epsilon=1; G=120+D+V+epsilon=141; F=b+V+epsilon; P=H+6G+65F;
A=R30(P); T=R30(1.25 A); O=T+2700 (two 20-minute acquisition waits + 300 s). Derived by exact integer arithmetic and
equal to the brief's literal table on all three classes.

| Class b | Cells | F | P | A | T | O | Cells x P | Cells x A | Cells x T | Cells x O |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2 s | 18 | 13 | 1751 | 1770 | 2220 | 4920 | 31,518 | 31,860 | 39,960 | 88,560 |
| 10 s | 63 | 21 | 2271 | 2280 | 2850 | 5550 | 143,073 | 143,640 | 179,550 | 349,650 |
| 30 s | 54 | 41 | 3571 | 3600 | 4500 | 7200 | 192,834 | 194,400 | 243,000 | 388,800 |
| **Total** | **135** | | | | | | **367,425** (102.1 h) | **369,900** (102.8 h) | **462,510** (128.5 h) | **827,010** (229.7 h) |

No row takes the outer caps (A<=9600, T<=12000); the largest single envelope is the 30 s class (A 3600 s = 60 min,
T 4500 s = 75 min, O 7200 s = 2 h). These sums assume every cell consumes its whole envelope, which the agreed
rule explicitly does not claim; they bound the matrix from above, they do not forecast it, and they omit every
wait, gap and admission re-ask (section 6). The historical "1-12 h" planning figure is not a bound: the structural
payload ceiling alone, summed, is about 128.5 h.

Counting bounds re-derived and exercised on fake durations (`test-rules.cjs`; seconds):

| b | first-round stop 3G+7.75F | k=0 round 2: 6G+64F | k=1 (worst): 6G+64.75F | P-H = 6G+65F |
|---:|---:|---:|---:|---:|
| 2 | 523.75 | 1678 | 1687.75 | 1691 |
| 10 | 585.75 | 2190 | 2205.75 | 2211 |
| 30 | 740.75 | 3470 | 3500.75 | 3511 |

For k=1..5 the brief's formula (6.75-0.75k)G+(64+0.75k)F is reproduced and never exceeds the k=1 value (G>=F). The
brief's "k=0: 6G+64F" also reproduces (no slow outcome in the first forty means every outcome is at most F, so some
worker runs at most nine of the first 39 and round 1 ends within 10F). An adversarial simulation (slow outcomes of
130 s at the front, back and spread of the first round, 0-5 of them, 6-k in round 2; first-round stop with nine slow)
stays within S <= 6*(120+D)+65*b and within 3*130+7.75*b. No inconsistency found in the structural rule.

## 2. Deadline chain of the inherited MS18b route (what exists today, with source lines)

| # | Layer (file:line) | Value | At expiry / behaviour | Disposition for Stage 3 |
|---|---|---|---|---|
| 1 | Agent tool call (`powershell` tool, sync) | `initial_wait` is a response window, not a process deadline | the command keeps running | detached supervisor, poll at most 600 s |
| 2 | `drive.cjs:64-65` `spawnSync('pwsh', ..., { timeout: 1800000, maxBuffer: 1 << 28 })` | **1800 s** | `spawnSync` terminates only the direct `pwsh` child; `Invoke-Dv3Node`'s `finally` never runs, so the node launcher, `qualify.js` and the four workers keep running and `dv3-sudoku.lock` stays on disk (the handle closes, the file does not delete); the Node event loop is blocked and nothing is printed until the child ends | **must not be reused**: 1800 s is below every class's T (2220/2850/4500) and O (4920/5550/7200), and its kill path leaves orphans and a stale lock |
| 3 | `run-entry.ps1` | no timeout | refuses a payload when a ledger or this attempt's readiness record exists | replace by the supervisor's own history check |
| 4 | `run-locked.ps1:37-42` fairness gap | up to 15 s, from `.last-release` (task-local file) | sleep | keep the >=15 s rule, with a GQ-owned release record (the MS18b file only knows MS18b releases) |
| 5 | `run-locked.ps1:47-55` foreign-lock wait | **up to 1200 s** at 1 s polls, then throws; plus a fixed 15 s sleep after the observed release | throws `A foreign timing lock is still held after 20 minutes` | counts toward O's first 20-minute wait |
| 6 | `invoke-dv3node.ps1:5-9` acquisition wait | **up to 1200 s** at 5 s polls while either lock exists, then throws `No timing slot` | throws, nothing started | counts toward O's second 20-minute wait; a single wait in the new supervisor is sufficient |
| 7 | `invoke-dv3node.ps1:13-17` lock creation | `CreateNew`, `FileShare.Read`, content `PID|task|utc`; re-check of the foreign lock | race throws, nothing started | supervisor owns the mutex |
| 8 | `invoke-dv3node.ps1:24` | `WaitForExit(540000)` = **540 s** | throws `540-second limit reached`; `finally` kills a tree found by walking `Win32_Process` parent ids (an already orphaned descendant is not found) with `Stop-Process -Force`, then deletes the lock | unchanged for non-GQ work (450/540); **cannot govern a GQ cell** (540 < every T) |
| 9 | `launch.cjs:111-113,124,139` readiness | three `powershell.exe` `spawnSync` calls, each `timeout: 30000`, plus five one-second CPU intervals | a stalled call returns after 30 s; worst case about 95 s, observed 7.117-7.261 s in 44 MS18b commands | inside T/W (the T-clock includes readiness): worst case exceeds H=60, so a pathological readiness would be a W-Q breach, not a structural fact |
| 10 | `launch.cjs:310` payload | `spawn(process.execPath, payload)` piped | no deadline of its own; the launcher waits for `close` | the supervisor builds the payload itself |
| 11 | `qualify.js` | per-request 120000 ms guard (`SG.budget.create({ ms: GUARD_MS })`); **no cell-level deadline**; four `fork`ed workers; nothing published until the whole run ends | a stuck worker holds the run forever | T-watchdog and job object are the only backstop |

Arithmetic of the inherited route if both lock waits are kept: 15 + 1200 + 15 + 1200 = 2430 s (plus up to 6 s of
polling granularity) before the T-clock can start, inside O-T = 2700 s, leaving about 264 s for release settling,
launcher start, status/log writing and cleanup. O is per admission attempt (an eligible re-ask is a new attempt with
its own O), and O never permits the payload past T.

## 3. What must change in Stage 3 (from this audit)

1. No `spawnSync` matrix wrapper and no reuse of `drive.cjs`; the supervisor enforces O and T itself, independent of
   agent, shell and network liveness. If any outer wrapper is kept it must allow O (up to 7200 s) and terminate the
   whole tree, not one `pwsh`.
2. Do not route a GQ cell through `Invoke-Dv3Node` (540 s, race-prone tree kill). The shared helper stays unchanged
   for non-GQ work (450/540).
3. Replace tree-walking by a non-inheritable kill-on-close Job Object (suspended create, assign, resume), so
   orphans cannot survive; failed job setup means no payload.
4. T-clock = monotonic time from creation of the owned Node launcher after lock acquisition to exit of the owned
   tree, including readiness; O wraps acquisition waits and settling. Record acquisition, readiness, payload/T-clock,
   post-checks and overall elapsed separately.
5. Keep readiness inside H or accept that a slow readiness shows as a W-Q breach for joint review. Do not let a
   readiness helper's own 30 s timeouts silently define H.
6. A GQ-owned `.last-release` record for the >=15 s gap; Pentomino's release times are not in any shared file and stay
   unknown, never invented.

## 4. Detached-supervision requirements (brief "Detached supervisor, launch and adoption")

| Requirement | Stage 1 finding |
|---|---|
| Bounded detached supervisor via the `powershell` tool, `mode=async`, `detach=true`, unique shell id, no `Start-Process` | the tool description says detaching needs approval to run outside the sandbox; the orchestrator approved the design at 22:42, but whether the capability is available is only known at launch (unresolved, section 7 item 2) |
| Non-inheritable kill-on-close Job Object; Node child created suspended, assigned, resumed; no breakaway; only the supervisor holds the job handle | .NET has no managed Job Object or suspended-start API: this needs C# P/Invoke (`CreateJobObjectW`, `SetInformationJobObject`, `CreateProcessW` with `CREATE_SUSPENDED`, `AssignProcessToJobObject`, `ResumeThread`) through `Add-Type`; PowerShell 7.6.10 Core (`C:\Program Files\PowerShell\7\pwsh.exe`) and Windows PowerShell 5.1 exist; nothing was compiled or run (item 1) |
| Stdout/stderr, events and results in project files, not a live pipe | `CreateProcess` with redirected standard handles needs inheritable file handles while the job handle stays non-inheritable (design point for the stand-in tests) |
| Atomic status file: run/cell/attempt ids, supervisor PID and creation time, job identity, manifest blob, input identities, policy/method, state, T/O start and deadlines, output paths, final status; immutable event/attempt history | rename-over on the same volume works for the qualifier's own `.partial` writes; the creation-time source and precision must be fixed (section 7 item 6) |
| Adoption of a live matching supervisor; completed record preserved; missing/corrupt status is a stop | nothing to test in Stage 1; belongs to the Stage 3 fake-clock tests |
| Only the orchestrator clears a proved-dead own-run lock | the lock file is not delete-on-close, so a killed supervisor leaves `dv3-sudoku.lock`; neither lock exists now |
| GQ window and operational whitelist | read; no payload ran; no CPU probe was taken |

## 5. Manifest and payload lock-down (brief "Approval manifest and payload lock-down")

Read-only mechanics exercised on this tree (recorded in `hash-audit.json`, `manifestCheckMechanics`):

- `HEAD:tasks/difficulty-v3/MS18c-gq-approved-ceilings.json` does **not** exist (`git rev-parse --verify --quiet`
  fails) and is not in the working tree: expected before Stage 2; the supervisor must therefore refuse today.
- `git diff --quiet HEAD -- <that path>` exits **0** although the file is absent: a diff-only check is not authority
  (the brief's warning is confirmed).
- `git hash-object <file>` equals `git rev-parse HEAD:<file>` for `generator/tests/qualify.js` and
  `generator/tests/fixtures/qualification-records.js` under `core.autocrlf=true` and `core.safecrlf=true`: normal Git
  line-ending handling gives the blob identity the brief asks for. Not exercised: a mixed-line-ending file under
  `safecrlf` (expected to make `hash-object` fail, which is the desired refusal) and an untracked or staged-new
  manifest (it has no `HEAD:` blob).
- Launch-time recomputation of the qualifier, engine and attempt-policy identities took about 1.5 s in this planner
  (46 files, 1.15 MB hashed, declarations loaded in under 50 ms): small, but it must happen before the admission
  sampling, not during a payload.
- Payload surface: `parseArgs` accepts `--variant=a,b`, `--level=a,b`, `--no-early-stop`, `--probe=N`, `--quiet`,
  `--merge`, `--child` and `--jobs=<digits>` (so `--jobs=04` also parses as 4); anything else throws. The supervisor must
  build the argument vector from the approved entry (one variant, one level, `--jobs=4`, the fixed paths), compare it
  exactly, refuse comma lists and every other flag, and refuse a timeout override. The current environment has no
  `NODE_OPTIONS`, `NODE_PATH` or `SG_*` variable; the supervisor still has to refuse preloads by constructing the
  launcher environment itself.

## 6. Waits and runtime expectations, reported apart from the envelopes

- Minimum spacing that is certain: >=15 s between lock acquisitions, 134 gaps after the first cell: at least 2,010 s.
- Readiness observed in MS18b: about 7.2 s per command (descriptive; inside the T-clock); 135 x 7.2 = about 970 s.
- Unknown and not summed: foreign-lock waits (up to 1200 s each), re-ask spacing (>=60 s plus a new attempt), lock
  contention, orchestration and monitoring turnaround, the Q1 holds themselves.
- Descriptive runtime context (older sources or other configurations, never inputs): MS07e's 129 completed cell commands
  summed 1523.033 s; the six cells it left unexecuted were projected at 556 (mega12/hell1), 1246 (mega16/nightmare),
  1808 (mega16/hell1), 919 (greaterThan/expert), 3957 (greaterThan/hell1) and 4032 s (butterfly/hell1). Against the
  agreed classes: greaterThan/hell1 (10 s class, A 2280, T 2850) and butterfly/hell1 (30 s class, A 3600, T 4500) have
  older projections above their A, greaterThan/hell1 above its T. Those projections' early-stop assumptions were not
  re-derived here; the structural rule bounds a cell by its slow-outcome counts, not by those projections, and the
  rule is agreed. The MS18a twelve-row means in the brief (for example Killer Expert 20.296 s mean, 40.274 s maximum)
  are generation-only scheduling warnings.

## 7. Unresolved capability and identity facts for Stage 2's explicit disposition

1. Job Object containment is not exercised anywhere in this environment (no P/Invoke compile, no stand-in test). Needed
   before GQ by the brief; not a row blocker.
2. Detach capability/approval at actual launch, and whether the agent host's process tree places commands in a job that
   would kill a "detached" supervisor when the CLI session ends: unknown until a Stage 3 stand-in test.
3. Whether the new supervisor itself may be placed in a nested job on this host (Windows 11 build 26300 supports nested
   jobs; job limit conflicts were not examined).
4. Host instance PID 1968 was alive at about 23:21 with the confirmed CIM name, executable, parent 18780 and creation
   time; .NET `ProcessName` is now `copilot.exe.old-25148-1794809773310` (quirk known from MS18b tests).
5. Node `v26.13.0` (AGENTS.md says CI uses 24) and machine `win32 10.0.26300`: any change before GQ changes the Node or
   machine identity and needs the reapproval record.
6. Process creation time has two spellings (.NET 100 ns vs CIM last digit: `...6916441` vs `...6916440` for the host); the
   supervisor's "PID plus creation time" identity must fix one source and one precision.
7. Board sizes in the rows are the registry's static sizes; the built-model equality is a quick test that was not run.
8. S-OD14 (Q3 = B, owner 23:05:53; committed in pack-only `42e0d239`, brief blob `ee2ac273`) arrived while Stage 1
   ran. Stage 3 additions it introduces are noted, not implemented. Slot 1 is primary and slot 2 the single recovery,
   granted only by a committed case-specific authorization at `tasks\difficulty-v3\MS18c-gq-recovery\<cell>.json` after
   a joint SA1/SA2 diagnosis with proof that no live or complete record exists; the stable counter key is the
   orchestrator-allocated epoch + variant/level; a launch intent is journalled before the qualifier process is created
   and consumes the slot's payload opportunity even if creation fails; admission ordinal 2 is possible only after an
   eligible unstarted CPU hold with no launch intent; the qualifier outputs of an attempt go under
   `docs\difficulty-v3\evidence\MS18c\runs\<variant>-<level>\payload-N\admission-M\` and only a checked complete record
   is copied once into the merge folder; and the brief lists focused fake-data recovery checks for Stage 3. For the
   deadline chain: O stays a per-admission-attempt envelope, S-OD14 does not raise A, T or O (a changed limit needs
   its own joint approval), and adopting a live run continues its existing deadline. They change no
   Stage 1 row: the rows carry no attempt, slot or epoch field.
