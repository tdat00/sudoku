# MS18c Stage 1 - input, premise and identity audit

Developer preflight, FILE-ONLY, `claude-sonnet-5.5`. Started 2026-11-18 23:05:07 (+07:00). Repository
`Q:\git\sudoku`, branch `rating-v3`. Dispatched on pack-only commit `3d166c79cb8fcb07822624415ab90bbb1605a28d`;
HEAD observed when the outputs were written: `42e0d239bc8b9b8bd66a2d868ccc8601d8b0d5e4` (pack-only commit of
23:26:47, parent `3d166c79`, records S-OD14). Companion records in this
folder: `gq-cells.json` / `gq-cells.md` (the 135 rows), `hash-audit.json` (every hashed file),
`outer-deadline-audit.md`. Nothing here approves anything: every row is `awaiting Stage 2`.

## 1. What was read and what was computed

Read: the brief, `check-list.md`, `generator/tests/qualify.js` (710 lines), `generator/tests/fixtures/
qualification-records.js` (711 lines), `generator/tests/node-runner.js` (`SOURCE_FILES`), the registry and the
digger (declarations and the default-attempts rule), the MS18b wrappers (`drive.cjs`, `run-entry.ps1`,
`run-locked.ps1`, `invoke-dv3node.ps1`, `launch.cjs`, `admission.cjs`, `attempts.cjs`) and the MS18b readiness
records. Computed by `plan-gq.cjs` (loads the engine declarations with `vm.runInThisContext` as the qualifier's
`loadSources` does, then reads only `SG.variants.list()`, `cellCountOf`, `defaultMaxAttempts`,
`SG.difficulty.LEVELS` and `RATING_VERSION`), in 1.5 s of wall time (declarations 45-49 ms). No generator, solver,
uniqueness checker, `def.build`, qualifier, worker, probe, pilot or CPU sample ran.

## 2. Premises of every row (all 135 identical) and where each comes from

| Premise | Source of truth | Verified how |
|---|---|---|
| One variant/level is the smallest supported GQ unit | `parseArgs` has `--variant`, `--level`, `--jobs`, `--json`, `--markdown`, `--no-early-stop`, `--quiet`, `--probe`, `--merge`, `--child`, no `--from`, shard, checkpoint or resume | read |
| `--jobs=4` | `PROTOCOL.jobs`; `--merge` refuses another value | planner cross-check against the records helper |
| Seed base 20260601, seed of request k = FNV-1a of `variant/level/k` | `PROTOCOL.seedBase`, `seedFor` | planner cross-check |
| 40 + 60 requests, offer at 36/40 or 90/100, guard 120000 ms | `PROTOCOL.firstSeeds/moreSeeds/offerFirst/offerTotal/guardMs` | planner cross-check (first/more seeds, guard, seed base, jobs) |
| Default early stop | `opts.earlyStop` is true unless `--no-early-stop`; the supervisor must never pass it | read |
| No `--probe`, no `maxAttempts` | the worker calls `SG.pipeline.run({ variantId, difficulty, seed, trace: 'off' }, null, budget)` with no attempts option, so the board default applies; the worker sets every level supported | read |
| Default attempts 8 / 4 / 2 by <=81 / <=144 / larger boards | `SG.digger.defaultMaxAttempts` | planner re-computed it for every real size and 10 boundary sizes (equal) |
| Board budget 2 / 10 / 30 s by <=36 / <=81 / larger boards | `budgetOf` | planner compared it with the records helper for every real size and boundary sizes (equal) |

## 3. Identities (identical on all 135 rows; recipes are in `hash-audit.json`)

| Identity | Value | Brief baseline | Match |
|---|---|---|---|
| source, `engine.sources` (46 files, 1,146,568 bytes) | `0ca29eaeebc295b6` | `0ca29eaeebc295b6`, 46 files | yes |
| tool, `qualifierHash` | `c0ef0d25f28518692bdccbde547814daf74f5834d35f9e117108d6321876fd77` | same | yes |
| attempt policy (the qualifier's object; digest = SHA-256 of its canonical text, this task's own) | `b9a2c2e0ada24933e6b54bc5588839d84d6cbd5c4b2aab05f89090c0c0daf8c8` | none stated | not comparable |
| Node | `v26.13.0`, `C:\Program Files\nodejs\node.exe`, x64, V8 14.6.202.34-node.40 | none stated | descriptive |
| machine (qualifier `machineInfo(4)`; digest of its canonical text) | `67d100ebc61bd4ebef3f46ea13a25198e24dd1df47bd3fb7b23a10e83d1b569c` | none stated | descriptive |

Attempt-policy files: `generator/js/engine/digger.js` `c9e58c58e7e295e1aa1df273f6920a7744e3aa4702eb233b4779be72fa5ef786`,
`generator/js/engine/pipeline.js` `b1a849d845f1494742bbf3ffba3be45b494e9620d9049b3326b3c4061a61fce1`,
`generator/js/variants/registry.js` `967402f0e9e2a8e6a5b9743eae93f8304798ac9a96d24c62e6093cdf1f3f241c`
(`POLICY_FILES` was parsed from `qualify.js` itself). Tool files: `qualify.js` `d96c15bb...ca6af` (32,002 bytes),
`qualification-records.js` `278bb9b0...1b7db` (34,129 bytes). Rating version recorded by the engine: **3**.

Machine object: `AMD EPYC 7763 64-Core Processor`, 16 logical processors, 64 GB (68,665,831,424 bytes),
`win32 10.0.26300` (Windows 11 Enterprise build 26300), Node `v26.13.0`, jobs 4. AGENTS.md names Node 24 as the CI
version; this machine runs 26.13.0, which is what the qualifier will record (descriptive, not a defect).

**Line endings and identities.** `core.autocrlf=true` and `core.safecrlf=true`: the working tree holds CRLF, and
`engine.sources`, `qualifierHash` and the policy hashes are SHA-256 of those working-tree bytes (as the qualifier
computes them). They are therefore specific to this checkout's line-ending conversion; the brief's baselines were
computed on the same machine and match. By contrast `git hash-object <file>` (blob identity, the manifest check) is
LF-normalised: it equals `git rev-parse HEAD:<file>` for both qualifier files (`qualify.js`
`a0cbcbb44e224c884582a94c49bb1b9b42407441`, `qualification-records.js` `ec52ab0f8986491a8d0bac168fb9bc7bae68c498`).

## 4. The 135 rows

15 variants x 9 levels, keys in manifest order, **135 unique keys** (planner validation and an independent recount of
the written JSON). Classes by static board size (`SG.variants.cellCountOf`):

| Class b | Variants (cells; default attempts) | Cells |
|---|---|---:|
| 2 s | classic4 (16; 8), classic6 (36; 8) | **18** |
| 10 s | classic9 (81; 8), diagonalX (81; 8), hyper (81; 8), jigsaw9 (81; 8), killer (81; 8), greaterThan (81; 8), wordoku (81; 8) | **63** |
| 30 s | mega12 (144; 4), mega16 (256; 2), samurai (369; 2), sohei (288; 2), butterfly (144; 4), flower (189; 2) | **54** |

Every row: `blockers: []`, jobs 4, seed base 20260601, method `MS18c-GQ-structural-v1`, constants
`b, H=60, D=10, V=10, epsilon=1, G=141, F=b+11`, binding `awaiting Stage 2`; the table-derived P/A/T/O equal the brief's
table (derived by exact integer arithmetic, then compared with the brief's literal numbers).

## 5. Facts that are not rows' blockers but stay explicit

1. **Board size source.** Rows use the registry's static size (`cellCountOf`, documented as "known without building a
   model"). The qualifier budgets by the built model's `cellCount`; the quick test `variants-registry` MS05r5p-T01
   asserts they are equal for every registered variant (and pins 144 / 189 / 288 / 369 for butterfly / flower / sohei /
   samurai). That test was **not run** (not asked for) and `def.build` was **not called** in Stage 1. If Stage 2 wants a
   built-model proof, it needs an assignment.
2. **Commits and pack bytes relied on.** The first complete read of the brief (956 lines) was its dispatch-base
   version, blob `81aa1dee13de26fa392323a45c096a92aca8050b` at `3d166c79`; every Stage 1 rule implemented here comes
   from it. While Stage 1 ran, someone else changed three tracked pack files in the working tree (mtimes: 23:14
   `clarifications-resolved.md`, 23:19 `MS18c-...-offers.md`, 23:20 `check-list.md`; `git status` was clean at dispatch)
   and then committed them as pack-only `42e0d239` (parent `3d166c79`, `git diff --name-only 3d166c79 HEAD` lists exactly
   these three files). I read the brief's diff twice: the working-tree version (blob `f48e67a6`, never committed) and
   the committed one; the committed brief at `42e0d239` is blob `ee2ac273ca969869e733504e5b386d26ef06b5c6`
   (working-tree SHA-256 `a888c506269edde09089a3bd81e184012f9bfea2cc485c899a7d369ab6a7a5ca`, 79,077 bytes). The two
   diffs differ only in Stage 3 recovery wording (a recovery claim continues across admission 2; a launch intent
   consumes the opportunity; the qualifier outputs of an attempt go under `runs\<variant>-<level>\payload-N\admission-M\`);
   S-OD14 (Q3 answered **B**, owner 23:05:53) leaves Stage 1 untouched. `check-list.md` was read at its dispatch-base
   blob `f486ea99a6d9a414cde1b693f3bca1b8db2ca711`; at HEAD it is `81dafcc89ba41b26320af0f3036ac97522427bc1`
   (SHA-256 `a83b7305339488fa7613e4d97e9890e69d7d1435a2b596b33f6fb54a725a4c00`, 199,407 bytes). These pack files are
   hashed by no qualifier identity, so every identity here is the same at both commits (the planner ran at both:
   identical source, tool, policy, Node and machine values).
3. **Later source edits.** The rows bind the generator sources of HEAD `42e0d239` (identical to `3d166c79`: no non-pack
   file changed). The Stage 3 compatibility edits that touch `generator/js/variants/*.js` support arrays or other
   hashed engine files change `engine.sources`; edits to `qualify.js` or the records helper change `qualifierHash`; the
   brief already requires a Stage 2 compatibility/reapproval record before GQ in that case. Re-run `plan-gq.cjs` to
   re-derive the rows after any such edit (`--check` is valid only at the HEAD the rows record).
4. **`engine.dirty`.** The qualifier records `git status --porcelain` non-empty as `dirty: true`. With Stage 1's
   untracked files present the tree is dirty; a committed clean tree would record `false`. Descriptive (the merge keeps
   a tri-state); it does not enter any identity.
5. **Host instance (Q1 admission input, observed read-only at about 23:21).** PID 1968 is alive: CIM name `copilot.exe`,
   executable `C:\Users\ledat\AppData\Local\Microsoft\WinGet\Links\copilot.exe`, parent 18780, created
   `2026-11-13T19:26:33.6916440+07:00` by CIM and `...6916441` by .NET `Process.StartTime` (a 100 ns difference in the
   last digit). .NET `ProcessName` now reads `copilot.exe.old-25148-1794809773310` (the same quirk is already in the
   MS18b admission test fixture; MS18b compares CIM name and executable). A supervisor that compares "PID plus creation
   time" must name one source and precision for the creation time. Neither lock file (`dv3-timing.lock`,
   `dv3-sudoku.lock`) exists in `%TEMP%`.
6. **Descriptive context only (never an input of a row).** MS18b readiness took 7.117-7.261 s in all 44 commands
   (`readinessSeconds`). The brief's MS18a twelve-row means/maxima, MS07e's six older projections (556, 1246, 1808, 919,
   3957, 4032 s) and its 129 completed commands (1523.033 s) are older-source or different-configuration figures, not
   GQ measurements.

## 6. Unknown or unsupported identity/protocol facts

None blocks a row. The rows carry no blocker. The items in section 5 and the capability list in
`outer-deadline-audit.md` section 7 are for Stage 2's explicit disposition.
