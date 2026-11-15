# MS07e plan: the first complete qualification checkpoint

Written before the first heavy command, 2026-11-15 (+07:00). Developer: claude-sonnet-5.5. Task file
`tasks/difficulty-v3/MS07e-first-qualification.md`; every rule below is the task's, the checklist's (sections 2, 6, 7, 8) or
the orchestrator's brief. Nothing here is a new rule: where a number is chosen (margins), it says so.

## 1. Source, defaults, machine

| Item | Value |
|---|---|
| Branch, HEAD | `rating-v3`, `8b70875` ("difficulty-v3 MS07d"); tracked tree clean; the only untracked path is this folder, so every shard will say `engine.dirty: true`, informational (MS07d: provenance, never compared) |
| Engine sources (`engine.sources` of a shard) | `029720df77c6c12a` (45 files, the qualifier's own hash); the 63-source hash of the recorder tools: `09f91d6db3fa3373307fed4bf175e9d48ce6cf0c0b98eccec1386dda7cb35ed9` |
| Qualifier tool (`qualifierHash`) | `c0ef0d25f28518692bdccbde547814daf74f5834d35f9e117108d6321876fd77` (`tests/qualify.js` + `tests/fixtures/qualification-records.js`) |
| Attempt policy | `SG.digger.defaultMaxAttempts`: 8 up to 81 cells, 4 up to 144, 2 above; no request names `maxAttempts`; policy files `digger.js c9e58c58…`, `pipeline.js b1a849d8…`, `registry.js 967402f0…` |
| Rating, cutoff | `RATING_VERSION` 2 (development), short-chain cutoff C = 4 (MS07c), nothing overridden |
| Machine | AMD EPYC 7763 (16 logical processors), 64 GiB, Windows 10.0.26300 x64, Node v26.13.0, test time factor 2 |
| Protocol | seed base 20260601, seed of request k = FNV-1a("variant/level/k"); 40 requests, 30 to 35 hits expand to 100; offered at >= 36 of 40 or >= 90 of 100 and p95 within the budget 2 / 10 / 30 s (<= 36 / <= 81 / larger cells); guard 120000 ms; early stop on the 11th miss or the 6th slow request; `--jobs=4` explicitly; **no** `--probe`, `--no-early-stop`, `--update-hashes`, diagnostic override or explicit `maxAttempts`; no source, tool, fixture, suite, CI or live-table edit |

Frozen while collecting: the 63 sources the recorder tools hash (the qualifier hashes 45 of them), `qualify.js`, `qualification-records.js`
and the policy files. A shard run on any other
identity is refused by the merger, so nothing under `generator/js`, `core/js` or `generator/tests` is touched until the last shard is done
(the closing quick sets run after it and write only under this folder).

## 2. The matrix (checklist Q)

15 variants x 9 levels = 135 cells, one invocation per cell, jobs 4:
`classic4 classic6 classic9 mega12 mega16 diagonalX hyper jigsaw9 killer greaterThan samurai sohei butterfly flower wordoku` x
`veryEasy easy normal hard expert master nightmare hell1 hell2`. Cells (built model): classic4 16, classic6 36, classic9, diagonalX,
hyper, jigsaw9, killer, greaterThan and wordoku 81, mega12 and butterfly 144, flower 189, sohei 288, mega16 256, samurai 369. The
current offered lists (live table, rating v2: classic4 veryEasy; classic6 veryEasy, hard; classic9 and wordoku veryEasy to hell1; the
others all nine) restrict nothing: hidden and unoffered cells are measured too, and no offer is changed here.

## 3. Order, lock, record

1. GD pilot (classic9, 8 same-seed requests per level), then the Nightmare batch and the Hell 1 batch (retained early), then every
   other offered level and every non-batch group of the `difficulty` suite once, the confusion matrix if its measured projection fits,
   and one existing selector for the Greater-Than Nightmare CV6 margin (SA1 IR66's handoff: "MS07e's GD is its first measurement").
2. GG: 104 shards of five hash keys (26 combinations x 4), check only, then the complete merge check against the current expectations.
3. GQ projection pilots, then the 135 cells one by one, cheapest projection first; unlaunchable cells are named, never retried silently.
4. Merge, checkpoint files, item reconciliation, then both quick sets and the CI check on the final tree.

Every command that may take about 10 s runs through `Invoke-Dv3Node` (`invoke-dv3node.ps1`, byte for byte MS07d's copy of the
checklist helper): one command per lock acquisition, at most 540 s, a 15 s gap after each. `scripts/driver.ps1` runs a plan file
one item at a time, appends `progress-log.txt` (CRLF: command, start, end, exit, node seconds, total seconds, lock wait, outcome,
outputs) and `run-log.jsonl`, skips (and records as UNEXECUTED with its reason) every item whose projection exceeds 450 s, never retries
a command, moves the partial files of a failed or stopped attempt to a `*-failed` folder (never into the merge folder), stops on a
failure other than the 540 s ceiling (a worker/IPC loss, an unexpected exit) and, on "no timing slot" after 20 minutes, writes the wait
into the log and waits on. Lock wait is derived as total seconds minus the node seconds the helper prints. Registration-only commands
(`--list-tests`, `--help`, `--merge` of an incomplete folder) and file-reading scripts generate nothing and run without the lock (IR07).

**Announcement:** this run is non-interactive and has no channel to the orchestrator; as in MS07b and MS07c the lock file is the slot,
and the start and end times, the waits and the folder are in this reply. Pentomino's MP12b2 runs in parallel and uses
`$env:TEMP\dv3-timing.lock`; the helper waits for it. Low-priority improve-generating harnesses yield to this lock.

## 4. Projection rules

### 4.1 GQ cell (S-AV27, SA2's rule after MS07d)

A cell is one invocation: the first 40 requests run on four workers, a cell with 30 to 35 hits then runs 60 more requests on the one
worker left (S-AV27). So, for a cell that may expand:

`P = startup + f x m x (10 + 60)` seconds, with 10 = 40 requests / 4 workers (no early stop assumed), 60 = the serial second round,
`m` = the planning mean request time (guard-capped at 120 s), `startup` = 8 s (four workers load 63 sources; to be replaced by the
first measured cells), `f` = the conservative variance margin: **3.0** on a stale number (MS05b3's per-request times, rating-v2 p95, MS07b
and MS07c's records), **1.5** on a current-source pilot of the cell's own first requests (and then `m` is the larger of the pilot mean
and half the stale mean, so a lucky pilot of a heavy-tailed cell cannot lower the number below half the old one).

Launch only at `P <= 450 s`; the 540 s ceiling is unchanged; jobs 4 is configured and the one-worker second round is documented in every
cell that expands. A cell above 450 s is **not launched**: it is a named unexecuted item under S-AV27 with its numbers, and the
checkpoint is then not complete. No truncation, no other jobs, no `--probe`.

**Expansion excluded (`e = 0`, the 60 serial requests drop out).** Only when expansion cannot happen: a structural reason (classic4
above veryEasy reaches nothing but singles: 0 of 14 in every cell at v2, and the level is vacuous above the tier), or the pooled
exact-hit evidence of the same cell has an exact one-sided 95 % (Clopper-Pearson) upper bound on the hit rate **below 0.55** with at
least 4 requests. Reason: at a true rate of 0.55 or less the chance of 30 to 35 hits of 40 is below 1 %. The pooled evidence is the
cell's pilot requests (current source) plus the earlier same-cell records named in `projections/gq-projections.md` (R5, MS05b3's I5/CV3
counts, MS05r5m/MS07b deep records, and the rating-v2 table's hits of n requests, an older source whose hit is never stricter than a
v3 exact hit, so an upper-bound proxy), each labelled by source. An excluded cell that nevertheless expands is stopped at 540 s and is an
incomplete item (a recorded risk), never a truncated record.

**Pilot (projection only).** For a cell whose stale `P` exceeds 150 s (so a 3x error still fits 450), for every Hell 1 cell (non-vacuous
since MS07b: classic9 went from 1.38 s to 5.57 s per request), and for every cell without an MS05b3 number, the first 1 to 3 requests of
the cell itself (its own seeds, the qualifier's request code, serial, one process, `scripts/pilot.cjs`) are timed under the lock before
the cell: 3 requests up to 3 s per request, 2 up to 29 s, 1 above (a cell above 29 s cannot fit 450 s even with `e = 0`). A pilot is a
measurement for the launch decision, not a qualification and not a shard; its requests are kept in `pilot/` with their hit flags.
Cells at or below 150 s are launched without a pilot. A pilot that is not reached leaves its cells unlaunched.

### 4.2 GD

`generator/tests/manual/difficulty.test.js` is unchanged by this task. Batches: 100 requests per level, 20 for Hell 1; seeds
7000 + i; `SG.digger.generate(model9, level, rng, {})`. Projection of a batch = `10 s + 2 x pilot mean x requests` (r6b's formula: a
conservative 2x margin on the mean of the 8 same-seed pilot requests, plus 10 s for the I1 to I7 checks and the start-up), measured
with MS05r6b's unchanged `gd-pilot.cjs` on this source before anything is launched. A group whose projection exceeds 450 s is not
launched (named item, no count cut, no ceiling change). Non-batch groups use MS05r6b's actual seconds, doubled, +10 s (older source,
labelled). Every selected command is preceded by a registration-only listing whose selected total must equal the expected count; the
union is the 154 tests of the suite once (64 level tests + 1 confusion matrix + 89 in 14 groups).

**Hell 1, before the pilot.** MS07c repeated the pilot at C = 4: 2 requests, 5,559.6 and 5,571.3 ms (mean 5,565.4 ms; at C = 6 MS07b
5,142.5 ms); projected unchanged batch 20 x 5.565 = **111.3 s** (102.8 s before), an estimate and not current gate evidence. With the
margin: 10 + 2 x 111.3 = **233 s**, below 450 s: it is launched alone after Nightmare. SA1 expects it to fail its >= 90 % exact
assertion (S-AV25); every per-puzzle assertion is expected to pass.

**IR17, classic9 Nightmare (recovery source `00647f9`: 430.5 s, 96 % of 450 s and 80 % of 540 s).** 449 s is not reused and nothing
is cut. Current evidence: C = 4 is in force, and MS07c's classic9 Nightmare window cell (12 requests, soak seed base, C = 4) took 2.1 s
of generation in total (mean about 0.18 s, p95 512 ms), against 4.1 to 4.5 s per request at the recovery source. Preliminary bound
before the pilot: even five times that mean (0.9 s) gives 100 x 0.9 = 90 s, with the 2x margin and 10 s: about **190 s**, 35 % of the 540 s ceiling. The formal figure is the same-seed pilot's (`gd/pilot.json`, 8 requests of seeds 7000 to 7007,
this source), quoted in section 6 before the command is launched; a batch above 450 s would be recorded as unexecuted cost, not cut.

### 4.3 GG

The 520 keys = 26 combinations x 20 seeds, in four shards of five seeds (indexes 0, 5, 10, 15) per combination, each its own locked
command, the same commands as MS07c's `plan-hashes.json` with this folder's `hashes/` as output. Projection per shard = 2 x the node
seconds of the same shard at MS07c (same 63 sources; MS07d changed no engine file) + 5 s; the slowest was 27.8 s (Killer hard).
Total measured at MS07c: 314.6 s over 104 shards. Check only: `--hash-merge=<hashes> --check-hashes`, never `--update-hashes`.

### 4.4 Closing quick sets

Both complete quick sets on the final tree, one CI group per locked command (`generator-quick.js run <group>`: shared-small,
own-suites, pipeline, replay-player, then the Player's `node tests\node-runner.js`), results in `quick/`, then the registration-only CI
check. MS07d's measurements (same sources and tests): 70.3, 168.0, 309.5 and 134.8 s (679.4 s), Player 33.4 s; the longest group
projects 310 s x 1.25 = 390 s < 450 s.

## 5. Items carried and how they are measured here

S-AV01 to S-AV27 (S-AV16/S-AV17 withdrawn) are reconciled in the final reply and in the checkpoint note with this checkpoint's own
numbers; historical numbers stay labelled by their source. S-AV08 gets the new quick measurement and the proposal; S-AV25 and S-AV26
get the GD Hell 1 batch; S-AV07 gets the classic9 Nightmare batch and GQ cell; the Killer Hard and Expert cells are reported
individually; large-board Nightmare/Hell 1 cells are reported under (c1) with measured projections or their GQ results. New items are
numbered from S-AV28.

## 6. Measurements and projections taken during the run

The tables below are appended before the command they project, never after it.

### 6.1 GD pilot (measured 2026-11-15 10:47 to 10:48, locked, 52.6 s, exit 0, no lock wait; `gd/pilot.json`, `logs/gd-pilot.txt`)

MS05r6b's unchanged `gd-pilot.cjs`, 8 same-seed requests per level (seeds 7000 to 7007, the exact call of `batch(level)`), this source
(`09f91d6d…`, HEAD `8b70875`, C = 4). Projection of a batch = 10 s + 2 x mean x requests.

| Level | Requests | Mean ms | Max ms | Exact in the pilot | Projected batch s | Basis |
|---|---:|---:|---:|---:|---:|---|
| nightmare | 100 | 111.3 | 238.2 | 8 of 8 | **33** | 10 + 2 x 0.1113 x 100 = 32.3, rounded up; **IR17:** 33 s, 7 % of the 450 s budget and 6 % of the 540 s ceiling, the margin being 2x the same-seed mean plus 10 s of checks and start-up; the recovery source's 430.5 s is history |
| hell1 | 20 | 5,932.7 | 6,568.0 | 0 of 8 | **248** | 10 + 2 x 5.9327 x 20 = 247.3: below 450 s, launched alone; MS07c's pilot estimate was 111.3 s (the GD seeds average 5.93 s per request, 6.6 % above MS07c's 5.565 s); no early exit |
| veryEasy | 100 | 2.6 | 10.6 | 8 of 8 | 11 | same formula |
| easy | 100 | 183.9 | 1,090.2 | 7 of 8 | 47 | same formula |
| normal | 100 | 197.0 | 659.2 | 7 of 8 | 50 | same formula |
| hard | 100 | 20.3 | 51.0 | 8 of 8 | 15 | same formula |
| expert | 100 | 16.2 | 36.6 | 8 of 8 | 14 | same formula |
| master | 100 | 43.8 | 81.3 | 8 of 8 | 19 | same formula |

The 14 non-batch groups are projected from MS05r6b's actual seconds (older source) doubled plus 10 s: 11 to 21 s each, Guarantees 115 s
(52.2 s there), all far below 450 s. `plans/plan-gd.json` holds the 22 items in launch order: Nightmare, Hell 1, the six other levels,
the 14 groups. Every item is preceded by its registration-only selected-total check.

### 6.2 Method change at 11:03: IR12 compounds instead of one command per lock

The first driver ran one item per lock acquisition. Its first two items waited 15 s and 0 s; item 8 (`gd-levels`, 0.9 s) waited **290 s**
behind a pentomino command, and item 9 had waited 4 minutes more when it was stopped (waiting, holding no lock; it had started nothing).
Pentomino's commands last up to about 590 s and it takes the slot again 15 s after each, so one lock acquisition per item would cost
a pentomino command per item: with about 270 items that is days. The checklist's IR12 (SA1, 2026-11-14) is the existing rule for this:
**one locked `Invoke-Dv3Node` invocation runs several independent items serially**, each with its own finite projection, the admission
rule `elapsed + max(item projection, generic floor) <= 450 s` (floor = max(60 s, twice the slowest child so far), never replacing an
item's projection), its own results and transcript, a stop at the first unexpected exit, no retry, and the 540 s ceiling over the
whole. `scripts/compound.cjs` is that compound; `scripts/driver.ps1` starts one compound per lock acquisition and leaves 15 s after it.
Everything else in this plan stands: one heavy command at a time, per-item projections before launch, nothing above 450 s launched,
timeouts recorded as incomplete items. This departs from the brief's "one command per lock" wording on the strength of IR12; the
reply states it and the lock waits it measured.

### 6.3 Pilot findings and rule refinements (all made before any GQ cell started)

**The pilots (24 files in `pilot/`, 14 first pilots and 10 extensions, 2026-11-15 11:29 to 12:21, all exit 0).** The first 1 to 4
requests of 55 cells, on this source, in the qualifier's own request code. No request returned an invalid or non-unique puzzle (the
pilot exits 3 on one; none did). The rule of section 4.1 was applied to them with three refinements, each made on evidence of the
first pilots and recorded here before the GQ plan was built:

1. **The floor "half the stale mean" now applies only to a heavy-tailed old sample** (at least 8 MS05b3 requests, the slowest at least
   10 times the median: jigsaw9 expert, with its 325 s request). Reason: mega12 Nightmare ran 2 of 2 exact in 105 and 448 ms against
   MS05b3's 23.1 s per request (0 of 3 exact), so the unrefined rule would have projected 1,226 s for a cell that needs about 40 s. The old
   number describes a source that no longer exists (the chain split, C = 4); where the old sample has no heavy tail the pilot mean stands,
   with the margin 1.5.
2. **Expansion is excluded only if, besides the pooled earlier evidence, the pilot of this source does not show a high rate** (hits not
   above half the pilot requests), and the rating-v2 hits are a separate proxy, not pooled: a 40 of 40 at v2 says nothing against a low
   rate now, and pooling it would have diluted the zero-hit evidence of Killer Hard (0 of 20 and 0 of 12 at the earlier sources).
3. **Pilot extensions** (`plans/plan-ext.json`, 10 commands, 294 s in one compound): (a) a cell with no hit anywhere in its pooled
   evidence and fewer than 4 pooled requests gets requests up to 4 (the one-sided 95 % upper bound of 0 of 4 is 0.53, below 0.55): the
   Hell 1 cells of diagonalX, hyper, jigsaw9, killer, samurai, sohei, flower and wordoku, and (b) a cell just above 450 s on one or two
   requests (up to 700 s) gets requests up to 4: mega16 Nightmare, killer Nightmare, greaterThan Nightmare, samurai Hell 2. The extension
   requests are the cell's own indexes after the first pilot's, so no request is measured twice.

The generic floor of the compound admission is a constant 60 s from `plan-rest-c4` on; compounds 1 to 3 used MS05r6a's
`max(60 s, twice the slowest child so far)`. Every item has its own projection, which the floor never replaces.

**Result of the projection (`projections/gq-projections.md`, `.json`; `plans/plan-gq.json`).** 129 cells are launched, 6 are not:

| Cell | Pilot (this source) | m used | P (s) | Why not launched |
|---|---|---:|---:|---|
| mega12/hell1 | 1 request, 36.5 s, 0 exact | 36.5 | 556 | one first round alone is 10 x 36.5 x 1.5 = 548 s |
| mega16/nightmare | 4 requests, 4 exact, 4.8 to 26.5 s | 11.8 | 1,246 | expansion not excluded (4 of 4 exact: 36 of 40 is plausible), 70 x 11.8 x 1.5 |
| mega16/hell1 | 1 request, the 120 s guard exceeded (`budget.exceeded`), 0 exact | 120 | 1,808 | the guard alone is 1,200 s for the first round |
| greaterThan/expert | 2 requests, 1 exact, 3 to 15 s | 8.7 | 919 | expansion not excluded, 70 x 8.7 x 1.5 |
| greaterThan/hell1 | 3 requests, 37.6 to 40.1 s, 0 exact | 37.6 | 3,957 | 3 requests only (a fourth costs 38 s and the first round is 564 s anyway) |
| butterfly/hell1 | 3 requests, 38.3 to 39.5 s, 0 exact | 38.3 | 4,032 | the first round alone is 575 s |

Each of the six is a named unexecuted item under S-AV27 / the cost rule, with its pilot numbers, not a hidden verdict. The cheapest
launched cells run first; the sum of the launched projections is 11,645 s (about 26 compounds of at most 450 s); the measured seconds will
be far below it (the projections carry the margins 1.5 and 3).

Two extra existing selectors, not part of the checklist's GD manifest, are in the same plan: Greater-Than Nightmare CV6 (run before the
pause, passed in 24.1 s) and Normal CV6 (first item of `plan-gq.json`, projected 120 s), the numbers MS07c's handoff and S-AV01 ask
for on this source.
