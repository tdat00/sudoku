# MS18b evidence: the final R5 cap and R9 chain-window rechecks (30 logical cells / 360 outcomes)

Developer: Dev-Sonnet (claude-sonnet-5.5). Started **2026-11-18T19:20:23 +07:00** (real `Get-Date`). Sections are appended in
the order they were written; every phase plan is written, and read back, **before** the first command of that phase.

## 0. State at the start (written 19:28)

- Repository `Q:\git\sudoku`, branch `rating-v3`, HEAD **`393775a1`** (pack-only commit on the accepted base `484b8a52`,
  MS18a); the accepted implementation base is **`57c1b10`** (MS17b), so the runtime, tools, tests and guides are those of
  `57c1b10`. `git status --short` was empty at 19:27. Node v26.13.0, Windows x64.
- Read completely before this plan: `AGENTS.md` (the repository has no AGENTS.md under `generator/` or `player/`), the MS18b
  brief (393 lines), `tasks/difficulty-v3/check-list.md` (sections 7 "Final-gate quiet-machine precondition", the shared lock
  protocol with IR07/IR12 and `Invoke-Dv3Node`, S-OD4, the S-AV register), `docs/difficulty-v3/after-2026-11-18.md`,
  `evidence/MS18a/evidence.md` (all of it), the MS18a helpers (`admission.cjs`, `attempts.cjs`, `drive.cjs`,
  `run-entry.ps1`, `run-locked.ps1`, `launch.cjs`, `make-plan.cjs`, `identity-check.cjs`, `support-check.cjs`,
  `check-format.cjs`, `test-attempts.cjs`, `test-admission.cjs`, the transcript selection of `report.cjs`), `shallow-cap-2026-11-13.md`,
  `chain-window-2026-11-15.md`, `limits-v3.md`, R5/R9 of `report-detailed.md`, the R5 selector of MS05r4 and `soak.js`
  (options, `metaOf`) and `difficulty-diagnostics.js` (`summaryOf`, `mergeShards`).
- No `QUESTION:` was open at the start.
- **Shared slot (explicit grant).** The orchestrator's dispatch message of 19:20 explicitly grants the current shared-machine slot
  for MS18b timed measurements under the **MS18b-host-active** contract, and says that nothing else in the session runs timed or
  locked work while I hold it. Confirmed host instance (the only one): `copilot`, **PID 1968**, parent **18780**,
  `C:\Users\ledat\AppData\Local\Microsoft\WinGet\Links\copilot.exe`, creation time **`2026-11-13T19:26:33.6916441+07:00`**.
  PID 17588 (started 2026-11-16 13:21:18) is idle and has no exemption. Pentomino is stopped by the owner.
  **Read-only verification at 19:27 (nothing written, nothing generated):** `Get-Process -Id 1968` gives start time
  `2026-11-13T19:26:33.6916441+07:00` and the path above (its image name is `copilot.exe.old-25148-1794809773310`, as MS18a
  recorded: the executable on disk was replaced after the session started); CIM `Win32_Process` gives name `copilot.exe`,
  parent **18780** (itself `copilot.exe`, created `2026-11-13T19:26:33.6552040`), the same path and creation date
  `...33.6916440` (WMI keeps microseconds). The four `copilot.exe` processes are 18780 and 1968 (this session) and 26488 and
  17588 (the other host). `dv3-timing.lock` and `dv3-sudoku.lock` were both absent at 19:27. This equals the identity MS18a
  confirmed; there is no other PID and no changed creation time.
- No file of `tasks/`, no Git state, no production, fixture, guide or measurement-tool file is changed by this task. Owned
  files: this folder, `generator/tests/artifacts/difficulty-v3/MS18b/`, and the documentation updates of the brief's "Files
  to create/modify" (appended final-recheck sections of `shallow-cap-2026-11-13.md` and `chain-window-2026-11-15.md`, the
  evidence links and dispositions of `limits-v3.md` and `notes.md`, none an input of a fingerprint).
- **Tool note (not a deviation).** The `create` tool of this environment writes CRLF, which the repository's working tree
  requires (`git ls-files --eol` shows `i/lf w/crlf` for the MS18a files), so every helper and record is written with `create`
  or `edit`; no file content is written from PowerShell and no byte copy is made (MS18a used `Copy-Item` copies of its own
  superseded helpers; this task has none, because it adapts the MS18a helpers into new files of its own folder and does not
  edit the accepted ones).

## 1. Bounded plan P0: offline preparation (written 19:29, before the first P0 command; no puzzle is generated)

**Why unlocked.** Every P0 command reads files or loads the sources and generates nothing (the classes IR07 allows without the
lock: registration-only and file-only commands, each measured under 10 s on this machine before it is relied on; expected at
most **5 s** each). Any command that generates a puzzle, or whose cost is unknown, runs from its first execution through the
lock helper. The first P0 command that exceeds 10 s is stopped, recorded and reported, and never retried unlocked.

**The task-owned helpers (all in `generator/tests/artifacts/difficulty-v3/MS18b/`; they never write outside this task's
folders and change no production, tool, fixture or pack file).** MS18a's accepted files are not edited and its legacy
first-hold-stopping `run-gs.ps1` is not used as the sequencer.

| Helper | Role / what changes against MS18a |
|---|---|
| `invoke-dv3node.ps1` | the check-list `Invoke-Dv3Node`, verbatim (same text as MS18a's and MS17b's copy) |
| `admission.cjs` | pure, no I/O. The MS18a-Q1 predicate **unchanged** (strict screen mean <= 0.5 / max <= 1.0 recorded as `ready`; separate `admitted`; confirmed host; no other process at >= 0.5 CPU-s per elapsed second; locks), with the policy named **`MS18b-host-active`** (the old name `MS18a-Q1-host-active` is an unknown policy here) |
| `launch.cjs` | the MS18a wrapper, same logic: lock observation, host identity, two CIM snapshots around five one-second intervals, the strict verdict kept, the admission, the lock recheck, then the **unchanged** `node tests\soak.js ...` payload as a child with a live transcript; exit 3 on a hold |
| `run-locked.ps1` | `Invoke-Locked` with the MS18b paths (`docs\difficulty-v3\evidence\MS18b\`), the policy and label, the 15 s gap, the foreign-lock observation and settling; **new** `-Identity` field written to each `lock-log.jsonl` line |
| `attempts.cjs` | the whole admission/attempt control flow with no I/O of its own (injected store). **Experiment-aware identity:** an attempt is keyed by experiment family (`cap` or `window`), setting, variant, level, seed, absolute span (`--from`, `--count`) and logical total, with the other effective default stated; exactly one of `--shallow-cap` / `--chain-window` per payload (both or neither is an evidence defect that stops); a renamed row of the same full identity still counts; different settings or families are separate entries and never share a quota |
| `drive.cjs`, `run-entry.ps1` | the Q2 sequencer and one-attempt runner: <= 2 attempts per fixed logical entry across driver calls, the re-ask >= 60 s after the recorded release with no lock held, no payload rerun, a second eligible hold is a named gap (exit 4), anything else stops (exit 1); payload text comes from the plan entry and is cross-checked against the entry's identity before any launch |
| `make-plan.cjs` | file-only: the 30 logical cells x settings, their bounded shards and projections from MS18a's per-request records (basis stated in section 2), written to `plan-recheck.json` and `plan-recheck.txt` |
| `rules.cjs`, `report.cjs` | the two literal selection rules (pure) and the read-only reporter: validates every ledger, merges each (setting, cell) with `mergeShards`, checks rows against the manifest, builds the 24-row R5 and the 6-row C tables, the rule outcomes, the dispositions, the admission/attempt tables (Q3 selection of the transcript of the attempt that ran the payload, explicit commit list) and the decision packet |
| `identity-check.cjs`, `support-check.cjs`, `check-format.cjs` | the identity, default/offer and format checks of MS18a, adapted (paths, base commit, the nine cells) |
| `test-admission.cjs`, `test-attempts.cjs`, `test-select.cjs` | no generation, no lock, no process: the admission predicate, the whole attempt control flow with fake data (same span at different cap/window settings and families, renamed duplicates, held-then-admitted, twice-held plus a later success, payload-start and non-zero stops, invalid flag combinations) and the selection rules with fake rows (R5's upper median and the no-eligible case, zero-exact cells, errors, incomplete evidence, C's tie-to-6) |

| # | Offline command (from the repository root) | Does | Expected | Output (this folder) |
|---|---|---|---|---|
| P0-1 | `node generator\tests\artifacts\difficulty-v3\MS18b\identity-check.cjs identity-start.txt` | Git state; the two quick fingerprints, the two E identities, the soak `sourceHash`/`toolHash` as `soak.js` computes them | HEAD `393775a1`; `git diff --quiet 57c1b10 HEAD` outside `tasks/` exits 0; Generator `274067a0...`, Player `5e55cec6...`, replay `ff55cbce...`, hash `b1c78ecb...`, soak `85537bbd...` / `efff9dcd...` | `identity-start.txt` |
| P0-2 | `node generator\tests\artifacts\difficulty-v3\MS18b\support-check.cjs support-check.txt` | loads the sources like `soak.js` (no generation): rating 3, allowance **256**, C **4**, attempts of an 81-cell board **8**, the nine cells offered, `--shallow-cap`/`--chain-window` parsed by the soak | all nine cells offered (no `--include-unsupported`) | `support-check.txt` |
| P0-3 | `node generator\tests\artifacts\difficulty-v3\MS18b\make-plan.cjs` | the manifests (tags `variant:level:index`, derived pipeline seeds, routes, the 288 + 72 request keys), the per-request bounds and the shards | 30 logical cells, 360 requests; every command bound <= 450 s | `plan-recheck.json`, `plan-recheck.txt`, `manifest-keys.json` |
| P0-4 | `node ...\test-admission.cjs test-admission.txt`; `node ...\test-attempts.cjs test-attempts.txt`; `node ...\test-select.cjs test-select.txt` | the three no-generation tests | every case passes | `test-*.txt` |
| P0-5 | `node ...\check-format.cjs --freeze helpers-sha256.txt format-check.txt` | every owned helper: UTF-8 without BOM, CRLF, final newline, no trailing whitespace, lines <= 110 characters; byte SHA-256 of each (the freeze) | 0 problems | `format-check.txt`, `helpers-sha256.txt` |

**Freeze rule.** The helpers are formatted and frozen **before the first timed command**; a later byte change of any of them is
recorded with the old and new SHA-256 and the reason, a new freeze record to a new path is written (`helpers-sha256-r1.txt`, ...)
and the earlier records are never overwritten or retagged. **No extra live admission self-test** is run (the brief says none is
required): the first locked command is a real measurement command, and its readiness record is the first live observation.

## 2. P0 results and the bounded plan of the timed phases (written 19:46, before the first locked command)

**P0 as run (19:42-19:45, all unlocked, file-only, each under 2 s).** `identity-check.cjs` (1.05 s, `identity-start.txt`):
Generator quick fingerprint **`274067a0beb67a595f711be792ed2625193d2549ee8ec9a8bfc795cc8ef73b3c`**, Player
**`5e55cec60307ec6c0d4235d5e07b63934cabb4f1fe077da40b99277e5576d14c`**, replay identity **`ff55cbce...9421`**, hash identity
**`b1c78ecb...0a58`**, soak `sourceHash` (64 `SOURCE_FILES`) **`85537bbd28702233722e448d36d87f5faf445ca25668b1926e8ffb22f4b93c3a`**, soak
`toolHash` **`efff9dcd558e04dc17df7ba0a5778da35006b116d8ebca2bcda248ff3012b3c7`**: all six equal the accepted values. **Runtime check (the
brief warns that MS18a's own commit holds evidence, notes and helpers):** the first line of `identity-check.cjs`
(`git diff --quiet 57c1b10 HEAD` outside `tasks/` exits **1**) is therefore expected: `git diff --name-only 57c1b10 HEAD` has 158
files, 136 under `docs/difficulty-v3/` (MS18a evidence, `after-2026-11-18.md`, `notes.md`), 17 under `generator/tests/` (the MS18a
helpers under `generator/tests/artifacts/`) and 5 under `tasks/difficulty-v3/`; **no file outside `tasks/`, `docs/` and
`generator/tests/artifacts/` differs** (`git diff --name-only 57c1b10 HEAD -- . ':(exclude)tasks' ':(exclude)docs'
':(exclude)generator/tests/artifacts'` is empty and the matching `git diff --quiet` exits 0), so the production, soak, fixture,
tool, test and guide bytes are those of the accepted `57c1b10`, and every fingerprint above is unchanged. `support-check.cjs`
(0.18 s, `support-check.txt`): all 64 sources load; rating version **3**, shallow allowance in force **256**, short-chain cutoff **C 4**,
default attempts of an 81-cell board **8** (4 and 2 above); the nine cells (classic9 normal/master/nightmare, killer hard/expert,
jigsaw9 expert/nightmare, diagonalX nightmare) are **all offered** (no `--include-unsupported`); `soak.js` still takes `--shallow-cap` =
64/128/256/none and `--chain-window` = 4/6. `make-plan.cjs` (0.13 s; `plan-recheck.json` SHA-256
`187ef977fdab6dddf482d126c278bcbd3014f5e1dda06e827784881115ee453e`, `plan-recheck.txt`, `manifest-keys.json`): **both full manifests are
verified**: R5 = 6 cells x 4 settings x 12 = **288** request keys, R9 = 3 cells x 2 settings x 12 = **72**; all 8 distinct MS18a cells they
rest on have the tags `variant:level:index`, the routes (classic9 and diagonalX direct, killer and jigsaw9 pipeline) and every stored
pipeline seed equal to `seedFor` (FNV-1a over the tag, base 20260101) and the direct rows none; the MS18a ledgers share one source
`85537bbd2870...`, one tool `efff9dcd558e...` and Node v26.13.0, which the plan records as the expected identity of every ledger.
The three no-generation tests (`test-admission.txt` **47 of 47**, `test-attempts.txt` **64 of 64**, `test-select.txt` **53 of 53**, 0.1 to
0.25 s each) and the format check (`format-check.txt`: **25 files, 0 problems**) passed, and the helpers were **frozen at 19:44:40** in
`helpers-sha256.txt` (16 files, byte SHA-256 of each; `invoke-dv3node.ps1` `FC7298D3...951D` is byte-identical to MS18a's and MS17b's
copy; `launch.cjs`, `admission.cjs`, `run-locked.ps1` and `identity-check.cjs` differ from MS18a's only in comments, the policy name
`MS18b-host-active`, the paths and, for `run-locked.ps1`, the `-Identity` field, as shown by `git diff --no-index`).

**What the tests show (`test-attempts.txt`).** Identity is experiment-aware: a payload parses to {family, setting, variant, level,
seed, from, count, total}; both or neither of `--shallow-cap` / `--chain-window`, a setting outside its family and a repeated flag
are invalid and stop; the same span at cap 64, cap 128 and window 4 are three entries with three quotas (two holds of one leave the
others at attempt 1); a renamed entry with the same full identity, a plan with two entries of one identity, a row under another
name, a row whose own identity differs from the plan entry (setting, seed, source or default configuration) or carries none all stop
before any launch; held-then-admitted launches exactly one payload after 60 s counted from the recorded release; twice-held plus a later
success ends INCOMPLETE with exit 4 and no third attempt; a payload failure, a 540 s timeout, a claimed hold after the payload started,
a mixed or non-predicate hold reason, an unverified host, invalid counters, a dirty lock recheck and a ledger without a completed
attempt stop. `test-select.txt` shows R5's upper median (sorted index 6, not the average and not the exact-only cohort), the
no-eligible case (winner `none` only on complete evidence), the smallest-eligible rule, zero-exact cells, C's tie-to-6 (including
0/36 against 0/36), request errors kept as misses, unavailable work refused, incomplete evidence undetermined (never `none`), a
changed C winner kept visible beside an incomplete R5, mixed cutoffs and spans refused by the real `mergeShards`, and the
Vietnamese template filled only from complete validated data.

**Basis of the bounds (stated in `make-plan.cjs`; a stated conservative projection, IR12, not a measurement of the new settings).**
Per request, from MS18a's record of the **same request on this very source at the defaults 256 / C4** (generation seconds T, attempts
a, local searches that ended by the allowance s; slowest request / worst per-attempt average / seconds per full rating of each cell:
classic9 normal 1.17 / 0.147 / 0.0018, master 0.18 / 0.177 / 0.0247, nightmare 5.07 / 1.077 / 0.0071; killer hard 6.54 / 0.817 /
0.0085, expert 40.27 / 5.034 / 0.0094; jigsaw9 expert 13.63 / 1.947 / 0.0084, nightmare 18.76 / 6.324 / 0.0283; diagonalX nightmare
5.83 / 5.826 / 0.0321). **256 and C4** are the defaults of MS18a, so the same deterministic path (the requests are the same keys): bound
2 x T. **64 and 128:** the attempts are independent random streams (`digger.js` forks `grid#A`, `dig#A.T` and `search#A`) and a lower
allowance only ends a local search earlier (a prefix of the same walk), so the first a attempts cannot cost more and the request may
need the remaining 8 - a attempts, each at most the cell's worst measured per-attempt average: bound 2 x (T + (8 - a) x worst average).
**none:** the local searches that ended by the allowance (s of them: killer hard and killer expert 1 of 96 each, jigsaw9
expert 13 of 57, classic9 normal 2 of 26, classic9 nightmare 1 of 14, jigsaw9 nightmare 4 of 20) may continue to the existing rating cap
(1024 - 256 = 768 more ratings) at the cell's seconds per full rating (an
overestimate, it includes the sample work); the other attempts are the same path and the continuation can only end a request
earlier: bound 2 x (T + s x 768 x seconds per rating). **C6** changes the rating of every candidate and so the whole path, so no
per-request record applies: uniform **10 x the slowest C4 request of the cell**, where 10 is MS07c's largest fresh-request ratio
(C6 slowest / C4 slowest: 6.6x classic9, 7.2x diagonalX, 5.6x jigsaw9, an older source used as a basis only) with a margin of 1.4. Every
per-request bound is at least 1 s. **Units** = requests + one extra for each absolute index divisible by 5 (the soak's I4 check
generates it again). **Flat 30 s** per command for the readiness screen, the process start, the source load, the checks, the two sampled
references, the final-path ratings and the ledger writes: MS18a measured at most **7.20 s** of readiness and **1.11 s** of
non-generation process time over all 32 of its commands (about 10 s with the launcher, `evidence/MS18a/readiness/*.json`), so 30 s is
three times the largest measurement (not MS18a's 60 s, which it never approached). Command bound = sum of per-request bounds x units + 30 s,
**admission <= 450 s**, process ceiling **540 s**, jobs 1, no `--jobs`, one command per lock, **at least 15 s between acquisitions**. A cell is
the fewest contiguous absolute-index shards (`--from`, `--count`, `--total-count=12`) whose every bound is at most 450 s, balanced by
bound; no request is inadmissible.

**The plan: 44 commands for 30 logical cells and 360 requests** (`plan-recheck.txt` has every command, request span, units and bound;
the largest bound is 437 s, the sum of all bounds 11,341 s, a ceiling and not an expectation). Whole cells run as one command, **killer
expert** (the slowest, 243.6 s of generation at MS18a) as two shards 0-5 and 6-11 at every cap setting, and the C6 cells as shards:
classic9 nightmare 0-5 / 6-11, diagonalX nightmare 0-3 / 4-7 / 8-11, jigsaw9 nightmare one or two requests each (0, 1-2, 3-4, 5, 6-7,
8-9, 10, 11). Payload (every command, from `generator\`): `node tests\soak.js --variant=<id> --level=<level> --count=<n> [--from=<k>
--total-count=12] --seed=20260101 --no-gate --shallow-cap=<64|128|256|none> | --chain-window=<4|6> --json=..\docs\difficulty-v3\evidence\MS18b\<setting
folder>\<cell>.json` (shards in `...\<setting folder>\shards\<cell>-<k>-<n>.json`); no `--include-unsupported`, `--quick`, `--per-combo`,
`--weights`, `--bands` and never both experiment flags. Setting folders: `cap-64`, `cap-128`, `cap-256`, `cap-none`, `window-4`, `window-6`;
entry id = `<folder>-<cell>[-<k>-<n>]`, transcript `logs\<id>.txt`, readiness `readiness\<id>.json`, one `lock-log.jsonl` line per
attempt; attempt 2 of an entry is `<id>-admission2`.

| Phase (`drive.cjs --phase=`) | Commands | Bound sum | MS18a basis (same requests, default settings, with I4) | Order and reason |
|---|---:|---:|---|---|
| `R5-256` | 7 | 1,244 s | 502 s | first: the same requests and path as MS18a, so a known cost validates the plan and the helpers |
| `R9-C4` | 3 | 430 s | 167 s | second: also known cost |
| `R5-64` | 7 | 1,667 s | 502 s as the 256 path | |
| `R5-128` | 7 | 1,667 s | 502 s as the 256 path | |
| `R5-none` | 7 | 1,484 s | 502 s as the 256 path | |
| `R9-C6` | 13 | 4,849 s | none (unknown cost) | last: the only unknown-cost phase |

The driver calls are `node generator\tests\artifacts\difficulty-v3\MS18b\drive.cjs --phase=<name>` (one phase per call, attached and polled; a
shorter list of entry ids is used if a phase is split). Each attempt is one locked command through `run-entry.ps1` /
`Invoke-Locked` / `launch.cjs`: after our lock is taken, the strict screen (five one-second intervals, mean <= 0.5 / max <= 1.0, recorded
as `ready`), the confirmed-host and other-consumer snapshots and the pre-payload lock recheck decide `admitted` under
**MS18b-host-active**; only an admitted run starts the unchanged soak payload as a child. **The strict screen failing alone does not
block** (verified admission); every timing carries **"shared-slot, CLI-host-active; not strict-quiet-machine timing"** whether or not the
screen passed. **Expected statuses:** every command exit 0 (`--no-gate` silences only the soak's own hit-rate exit), every ledger
`complete: true`, `summary.checks` PASS (a captured request error is a miss inside its twelve; invariant, check, reference, path or
work failures are defects that stop); nothing is interpreted before all 360 are in. **Admission holds:** a fresh matching exit 3 with
`admitted:false`, payload unstarted, no ledger and every reason the ordinary additional-consumer predicate (>= 0.5 CPU-s per elapsed
second, a PID other than 1968) is **eligible**: the driver waits until 60 s after the recorded release (outside every lock) and makes
the **one** second attempt; a second eligible hold is an unexecuted gap, reported INCOMPLETE (exit 4) while the other entries go on. A
purported hold after the payload started, a payload failure or timeout, a mixed or unknown hold reason, a changed host identity (PID
1968 with another creation time, or any other PID) or a defective, missing or contradictory record **stops with a `QUESTION:`** and
nothing else is run. **Re-plan rule:** a command whose actual duration exceeds its stated bound without reaching the ceiling re-plans the
later commands of that cell (smaller shards, a raised and never a lowered bound) in a new section written before they run; a command
stopped at 540 s is an aborted run, kept apart, never merged. A request that cannot be admitted stays a named unexecuted index; no new
tooling, no seed search, no corpus scan, no probe. **No retry until fast, no dropped slow request, no normalization of times.**

**Plan R (analysis; file-only, unlocked, expected under 5 s; after all 44 commands).** `node
generator\tests\artifacts\difficulty-v3\MS18b\report.cjs --out-md=docs\difficulty-v3\evidence\MS18b\decision-packet.md
--out-json=...\selection.json --out-discord=...\decision-discord.txt` reads the plan, every ledger, readiness record, transcript and
the lock log, validates and merges each logical cell with `mergeShards` (there is no soak `--merge`), checks every row against the
manifest, applies the two literal rules to the raw rows (never a shard summary), and writes the packet. It exits 0 only when 360
outcomes are in and every check passes, 4 when incomplete (no winner is claimed) and 1 for a defect. The Vietnamese question
(`decision-discord.txt`) is written only for complete validated data with a changed choice.

## 3. The timed phases as run (19:46-20:49, one locked command at a time; written 20:56, after the report and the final checks)

**Slot and contract.** Every command ran under the orchestrator's explicit slot of 19:20 and the named policy **`MS18b-host-active`**; nothing else
ran timed or locked work in the session (the orchestrator's statement), no foreign `dv3-timing.lock` was ever seen at an ask (`foreignLockSeenAtAsk`
false in all 44 lines of `lock-log.jsonl`) and no lock of mine remains (checked 20:49). The host was verified in both process snapshots of every one
of the 44 readiness records as PID 1968, exact creation time `2026-11-13T19:26:33.6916441+07:00`, parent 18780, the path of the grant; the
other host (PID 17588) and every other process were held to the same 0.5 CPU-s per second limit. The strict screen (mean <= 0.5 and max <= 1.0 busy
cores of 16) **failed in 40 of the 44 commands and passed in 4** (`cap-256-classic9-normal`, `cap-128-killer-hard`,
`window-6-jigsaw9-nightmare-3-2`, `window-6-jigsaw9-nightmare-11-1`); it is recorded unchanged in `readiness\<id>.json` and decided nothing. **0
admission holds, 0 re-asks, 0 gaps, 0 payload reruns**: all 44 entries were admitted and executed at attempt 1 (`lock-log.jsonl`: 44 lines, all
`exit 0`, none an `-admission2`). The smallest gap between a release and the next request was **15.010 s** (`cap-64-killer-hard`); lock waits at
most 0.1 s; the longest command was 167.8 s (`cap-none-killer-expert-0-6`) and **no command used more than 0.478 of its stated bound**
(`cap-256-killer-expert-0-6`: 166.8 s of 349 s), so the re-plan rule was never triggered, no command neared the 540 s ceiling and no bound was raised or lowered.
Descriptive label for every timing: **"shared-slot, CLI-host-active; not strict-quiet-machine timing"**.

| Phase | Commands | Asked - finished | Node s (with readiness) | Payload s | Sum of bounds | Strict screen failed |
|---|---:|---|---:|---:|---:|---:|
| `R5-256` | 7 | 19:46:15 - 19:57:05 | 558.7 | 507.1 | 1,244 | 6 |
| `R9-C4` | 3 | 19:57:20 - 20:01:02 | 191.6 | 169.8 | 430 | 3 |
| `R5-64` | 7 | 20:01:17 - 20:11:19 | 511.2 | 459.5 | 1,667 | 7 |
| `R5-128` | 7 | 20:11:34 - 20:21:57 | 531.9 | 480.7 | 1,667 | 6 |
| `R5-none` | 7 | 20:22:12 - 20:33:14 | 571.8 | 520.7 | 1,484 | 7 |
| `R9-C6` | 13 | 20:33:32 - 20:49:06 | 753.2 | 657.9 | 4,849 | 11 |
| **All** | **44** | 19:46:15 - 20:49:06 | 3,118.4 | **2,795.7** | 11,341 | **40** |

Every command exited 0 and printed `DIAGNOSTICS: PASS (request errors 0, invariant violations 0, check errors 0, reference errors 0, final-path errors 0,
final-path mismatches 0, work unavailable 0)` (the soak's old gate line `RESULT: FAIL (below 80%: ...)` of the killer cells is informational under
`--no-gate`, as in MS18a, and not a result). **Two readiness windows are worth stating** (descriptive, not an exclusion): `window-6-jigsaw9-nightmare-6-2` (mean
2.27 / max 3.42 busy cores, the busiest other process `TiWorker.exe` at 0.348 CPU-s per second) and `window-6-jigsaw9-nightmare-8-2` (3.26 / 4.09; the host
0.942 CPU-s per second, `MsMpEng.exe` 0.470, just below the 0.5 limit). Both were admitted by the named predicate; their times are no more or less
descriptive than the others, and no CPU was subtracted. The aggregate CPU is not claimed to be explained by PID 1968 (its per-window CPU was 0.67 to 5.42
CPU-seconds); MS18a-Q1-HOST stays an attribution-incomplete item.

**Results (`decision-packet.md`, `selection.json`; computed from raw merged rows by `report.cjs`, 145 of 145 checks pass).** **360 of 360 outcomes** (R5 288, R9 72), 30
of 30 logical cells merged with `mergeShards`, no gap, duplicate or mixed setting, **no request error** in any row, one source / tool / Node in all 44
ledgers, equal to the plan and to MS18a (`85537bbd...`, `efff9dcd...`, v26.13.0).
**R5** (exact of 12, upper median of the twelve `fullRatings`; cells classic9 normal / master / nightmare, killer hard / expert, jigsaw9 expert):

| Setting | Exact | Upper medians |
|---|---|---|
| none | 11 / 12 / 12 / 0 / 0 / 11 | 66 / 4 / 49 / 581 / 2,314 / 1,215 |
| 256 | 11 / 12 / 12 / 0 / 0 / 11 | 66 / 4 / 49 / 581 / 2,314 / **1,104** |
| 128 | **10** / 12 / 12 / 0 / 0 / 11 | 66 / 4 / 49 / 570 / 2,314 / 754 |
| 64 | **10** / 12 / **11** / 0 / 0 / 11 | 66 / 4 / 49 / 503 / 2,255 / 434 |

Cap **64**: two hit losses against none (classic9 normal request 11, classic9 nightmare request 2), so not eligible; cap **128**: one hit loss (classic9 normal
request 11), not eligible; cap **256**: no hit loss, one strict reduction (jigsaw9 expert 1,215 -> 1,104): **eligible and the smallest eligible: the rule
winner is 256 = the value in force, "same"**. Killer hard and expert are **0 of 12 exact, 12 of 12 shallow, with all eight attempts used in each of the 12 requests (96 attempts) at every
setting** (S-AV05 / S-AV06 unchanged; kept in every setting, not removed, not pre-assigned); their strict median reductions (64: 581 -> 503, 2,314 -> 2,255; 128: 581 -> 570) satisfy the
work predicate there, but caps 64 and 128 stay ineligible because of the classic9 hit losses, and no hit-count loss is possible in a cell where both are 0. **C** (exact of 12: classic9 / diagonalX / jigsaw9 nightmare): C4 **12 / 12 / 12 = 36**,
C6 **2 / 12 / 6 = 20**: C4 has more exact hits, no tie, **rule winner C4 = in force, "same"**. **Disposition table: R5 in force 256, rule winner 256, same;
C in force C4, rule winner C4, same. No owner question, no Discord message; the milestone is "reconfirmed (256 / C4)" for the orchestrator's acceptance.**
Generation seconds (sums of the twelve requests of the six R5 cells; descriptive): 64 **371.4**, 128 **388.6**, 256 **410.9**, none **423.1**; R9 C4 **139.3**, C6
**526.1** (3.8 times C4; the process seconds 169.8 and 657.9). The 256 and C4 rows reproduce MS18a's puzzles exactly (**72 of 72** and **36 of 36** puzzle hashes and exact flags)
although they were fresh requests with the explicit flags (an informational disclosure of the reporter, not a check). The one-factor results prove nothing about the joint
behavior of two changed defaults; none was changed. The comparison is of twelve requests per cell and says nothing about rates.

## 4. Final checks, items, disclosures and acceptance (written 20:57)

**Final checks (20:50).** `identity-final.txt` equals `identity-start.txt` in every fingerprint line (Generator `274067a0...`, Player `5e55cec6...`, replay `ff55cbce...`, hash
`b1c78ecb...`, soak `sourceHash` `85537bbd...`, `toolHash` `efff9dcd...`); `git diff --quiet 57c1b10 HEAD` outside `tasks/`, `docs/` and `generator/tests/artifacts/` still exits 0
(HEAD `393775a1` unchanged); all 16 helpers re-hash to `helpers-sha256.txt` (0 changed at 20:50; the one later revision r1 of 20:53 is recorded in disclosure (6)); no `dv3-timing.lock` or `dv3-sudoku.lock` remains. No E, GH,
GD, quick or CI run was needed or made: only task-owned helpers (not in any fingerprint), this folder and documentation changed; production, soak, fixtures and tools are untouched.

**Inherited items (carried unchanged; this small sample closes none).** MS18a-Q1-HOST and MS18a-Q2-ADMISSION (renewed here as **MS18b-host-active**, section 3; their MS18a failures, holds and audit history
are intact, MS18e audit), S-AV14 (MS18c / MS18e), MS17b GD Hell 1 / S-AV25 and the confusion matrix / S-AV15 (8 tests / 20-request batch and 1 test unexecuted, bounds 919 / 1544 s, not current-source
measurements; MS18c/d, MS18e), MS17b-GD21-PROCESS (MS18e), S-AV36-S-AV39 (construction, seeded, repository and whole-generation populations kept distinct), MS15b-GP-J / MS15b-GP-U (one full record, 35 unmeasured;
MS18d/e), MS15b-Q6 / MS16-Q6 (MS18e), the MS18a zero-exact / loss record (Hell 1 and Killer hard / expert 0 of 12; `greaterThan:expert:0`; MS18c/d/e), and the earlier S-AV01 / CV6-05, S-AV05 / S-AV06 / S-OD7,
Q-MS07e-2, S-AV18-S-AV23, S-AV31, S-AV33, S-AV34 and the standing quick cost. **New under MS18b:** (1) **MS18b-HOST-ACTIVE (readiness executed):** 44 commands, strict screen failed in 40 and passed in 4,
0 holds, 0 re-asks, 0 gaps; attribution incomplete as in MS18a; no waiver for GQ / GP; MS18e audit. (2) **MS18b-R5-C result:** both selections reconfirmed (256, C4); nothing to hand to the owner; MS18c may be
dispatched after the orchestrator's acceptance. (3) **Killer hard / expert 0 of 12 at all four caps** (S-AV05 / S-AV06 / S-OD7; no hit-count loss in either, so they do not disqualify any cap; MS18c / MS18e).
(4) **R5 measured costs (descriptive, shared slot):** the generation of the six cells is 371.4 / 388.6 / 410.9 / 423.1 s at 64 / 128 / 256 / none (-10% / -5% / 0 / +3% against 256); jigsaw9 expert is
51.6 / 63.5 / 83.5 / 93.4 s, so the allowance matters mostly there. (5) **C6 costs 3.8 times C4's generation** on these three cells (526.1 against 139.3 s; jigsaw9 nightmare 378.8 against 103.9 s) and finishes only
20 of 36 exact; MS18d cost context, not a bound or a verdict.

**Disclosures.** (1) **Unlocked commands:** only the file-only preparation (P0: identity, support, plan, the three no-generation tests, the format check, `node --check`, git read-only queries, each under 2 s) and, after the
timed phases (or between two of them), the reporter: one dry run at 20:33 on the 324 outcomes then recorded (console only, nothing written, 0.3 s) and the final run at 20:49; **no unlocked generation, no aborted run, no
timed command of mine outside `drive.cjs`**, and no live admission self-test. (2) A first draft of `report.cjs` (never run) was deleted and rewritten, and over-long lines of the helpers were rewrapped, **before the
freeze**. (3) The `create` / `edit` tools wrote every file with CRLF; no byte copy and no PowerShell content write were made. (4) Plan text: the section times of sections 0 and 1 were first written as 19:31 / 19:33 and
corrected to the real 19:28 / 19:29 before any command. (5) `git diff --quiet 57c1b10 HEAD` outside `tasks/` exits 1 by design (MS18a's commit holds evidence, notes and helpers); the check that matters is the
narrower one of section 2. (6) **Helper revision r1 (20:53, after the timed phases and the first report; no timed command was affected).** Looking at the first packet I found two reporter faults of my
own: a trailing space at line 191 of `decision-packet.md` and an exit code of 1 instead of 4 for incomplete evidence (its completeness checks failed like correctness checks; `drive.cjs` already exited 4 for a gap). Only
`report.cjs` and `test-select.cjs` changed: the completeness checks are tagged and a new pure `exitCodeOf` gives 0 complete / 4 incomplete with nothing defective / 1 a correctness check failed or a defective record, the
trailing space is removed, and six cases were added (`test-select-r1.txt`: **59 of 59**; `test-select.txt` 53 of 53 is the earlier record, kept). Old and new SHA-256: `report.cjs`
`AAA92D9EEB74F334B06FE688B25B08308F1ED4C607EDA4F6FBFCF3FB3C1EC124` -> `4A75F18EA0B762533FC8E0FA74DE4B82AF0AC68804E5A433B43DD79B7B0D7983`; `test-select.cjs`
`6B441C046E7E7DCEA38B8C861AC9AF7E15AFD7598C368191014D6CF275B7D0FD` -> `1D43EC71E99CA35DDE25BE81D2C65A9EB5C1349F9083E793FABD0C4015BADCD3`; the other 14 helpers are byte-identical in
`helpers-sha256.txt` (the first record, kept) and `helpers-sha256-r1.txt` (new; `format-check-r1.txt`: 168 files, 0 problems). The report was **rerun on the same unchanged ledgers**: same result (360 of 360,
145 of 145, R5 256 same, C4 36 against 20 same, no Discord text). The first outputs were replaced by the rerun (their SHA-256 were `decision-packet.md`
`41B1B95B4C16CE75C4F08AF431F0C77170DF1AE051E6D37ACBCCC7D3D2318C4B` and `selection.json` `5B8AD4ECD91AAAF4F38F4E9E8524C11AEC4F2FBF59C8DFF24169F6D535C60700`; now `997B8F00...B18D` and `8CAFD2DC...E092`; the
packet code change is the one space and `selection.json` gains the `kind` of each check). The r0 transcript of the first report run is the console output above in section 3; no number of any ledger or record changed.

**Honest gaps.** Twelve requests per cell; every time is one shared-machine, host-active observation with no repeat and no strict-quiet pass (no GQ or GP conclusion, no bound); the aggregate CPU is not
attributed to PID 1968; the per-request bounds were conservative (at most 0.48 of any bound was used), which made some shards smaller than needed; no raw row was dropped, normalized or retried.

**Acceptance (for the orchestrator's review).** **MS18b-B01:** the complete catalogue does not invalidate either earlier measured choice (256 and C4 are the rule winners on 360 fresh outcomes). **MS18b-B02:** no
winner changed, so no late retune exists; the stop path is implemented and tested (`test-select.txt`, the Vietnamese template filled only from complete validated data) but not used. **MS18b-T01:** exactly 360
outcomes, the same request identities (tags and seeds equal MS18a's and the manifest), isolated overrides (exactly one experiment flag per command, checked on the plan, the lock log and the ledgers' `argv`).
**MS18b-T02:** both deterministic rules, ties, errors and work medians applied literally and tested on fake data (R5 upper median, no-eligible case, zero-exact cells, C tie-to-6). **MS18b-T03:** nothing changed, so
nothing blocks GQ; no source edit was made. **MS18b-T04:** the named host-active admission, experiment-aware persistent quotas and immutable per-attempt records (44 attempt records, 0 holds); gaps never become
winners or passes (tested). **MS18b-T05:** zero-exact cells keep their population and disposition (S-AV05 / S-AV06 / S-OD7, S-AV25), the inherited and new items are listed above, and each choice has an explicit
status (both "same").

**End.** The task ended at **2026-11-18T20:55 +07:00** (start 19:20:23; about 1 h 35 min, of which 63 minutes were the 44 locked commands). The shared slot was handed back at 20:49:07 when the last locked
command finished; no lock of mine remains and no locked command ran after it. Final records after the r1 revision: `identity-final-3.txt` (equal to the start), `format-check-final-2.txt` (172 files, 0 problems;
`format-check-final.txt` is the earlier check that found the trailing space of the first packet), `helpers-sha256-r1.txt`, `decision-packet.md`, `selection.json`. `git status --short` lists only the four
edited records (`chain-window-2026-11-15.md`, `limits-v3.md`, `notes.md`, `shallow-cap-2026-11-13.md`) and the two new folders `docs/difficulty-v3/evidence/MS18b/` and
`generator/tests/artifacts/difficulty-v3/MS18b/`. No Git write, no `tasks/` edit, no Execution-log edit.
