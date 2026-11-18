# MS18a — Final matched before/after record

| Header | Value |
|---|---|
| Depends on | MS17b accepted |
| Accepted implementation base | `57c1b10` (MS17b); later pack-only commits do not replace this runtime baseline |
| Size / active time | Small; 25-35 minutes plus GS |
| Owner / milestone | Evidence; M18a matched final data |
| Authority | R7/R23/R24; AC01; S-OD4/S-OD12 |
| Review | Orchestrator template/contract review; MS18b likewise; SA1 cross-review at MS18c |
| Status | MS18a-Q2 settled below; 14/32 commands complete at the ruling; bounded admission re-asks, not payload reruns |

## Goal & business context

Measure the complete v3 candidate against the actual MS02 baseline and retain the isolated target
comparison. Do not compare old score-only hits with new required exactness as if they were identical.

## Scope and repository rules

In: fixed 17-cell/204-request final soak and analysis, with task-owned read-only launch/report helpers.
Out: production/permanent measurement-tool changes, tuning, new acquisition, offers or a new evidence class.
AGENTS/checklist; no Git/pack/log writes; no simultaneous heavy run.

### Accepted baseline — 2026-11-18

MS17b is accepted at **`57c1b10`** after two SA1 rounds. Read its final evidence, especially
sections 12, 18 and 20. The accepted Generator result is **`quick-final-2/`**, not its
superseded first pair; Player retains **`quick-final/player-quick.json`**.

| App | Accepted tests / suites | Accepted quick time | Accepted fingerprint |
|---|---|---|---|
| Generator | **4,784 / 55** | **542.0 s** | `274067a0beb67a595f711be792ed2625193d2549ee8ec9a8bfc795cc8ef73b3c` |
| Player | **2,981 / 32** | **117.2 s** | `5e55cec60307ec6c0d4235d5e07b63934cabb4f1fe077da40b99277e5576d14c` |

Preserve CI projections (seconds): **core-shared 170, steps 70, replay 70, mega 50,
own-fast 330, digger-target 30, pipeline 80, Generator player shard 90, Player job 180**.
The four bounded Generator groups, suite membership, tiers, factors and workflow limits stay.
Accepted E identities:

- replay, both families: `ff55cbce4c34034d501ee495417e7c69da953143c9f74a4bae4f5b722d719421`;
- hashes: `b1c78ecbcf3a0e4bb0d6a1f661f235e5f9ce63e4b3756dc3260892ac19270a58`.

All **40** GH examples match; the registry has **34 unscoped IDs**. Rating/cache are **3**,
history/worker wire are **1**, grouped `proofVersion` is **2**. The five wires changed only
`rating.ratingVersion` 2 -> 3; fourteen analyses and 520 hashes were unchanged. This
evidence-only task does not repeat E/GH/GD/quick sets or change CI metadata merely to
reconfirm them: verify the source/fingerprints remain identical and cite the accepted records.

Read `docs/difficulty-v3/limits-v3.md`: only its **section 1 new-pattern limits** are frozen
with the version. Section 3 records C **4**, R5 **256**, attempts **8/4/2**, existing dig
bounds and the first-allowed sign pass separately. Keep every production default here.
MS18b owns the unchanged R5/C experiments; neither it nor this task silently retunes them,
and no unused introducing-task adjustment rolls forward.

### Machine availability and measurement precondition

Owner, Discord, **2026-11-18 16:42 (+07:00)**, relayed by the orchestrator at 16:44:

> Các task pentomino đã dừng hoàn toàn, hãy tùy ý sử dụng resource của máy.

Pentomino tasks have fully stopped; the machine's resources are available. **No further
owner question about pausing that session is needed.** This does not retire the shared
slot, either mutex, the 15-second gap or the process ceiling. Before each timed cell or
authorized shard, apply check-list section 7's **final-gate quiet-machine precondition**,
with **MS18a-Q1's task-only host-active disposition below**. Record the observations
alongside its transcript, not as puzzle outcomes.
MS17b's waits of 470.8, 385.6 and 550.7 s are lock waits, not generation measurements.

### MS18a-Q1 — host-active GS, SA2 ruling, 2026-11-18

**Choose (c), narrowly for MS18a.** Do not retry until the numerical screen happens to
pass, exclude the whole Copilot process tree, or subtract CPU use to manufacture a quiet
result. The original 0.5/1.0 screen was an unvalidated operational assumption introduced
by SA2, not an R24 product budget. GS is a matched correctness/work/position comparison
whose timing differences are descriptive; this disposition does **not** make its timings
strict-quiet measurements or satisfy a later GQ/GP gate.

**Facts and limits of attribution.** Preserve `readiness/selftest.json` and
`logs/selftest.txt`: 17:35:41, five intervals, mean **1.049779** and max **1.425585**
busy cores of 16, exit **3**, payload unstarted, own lock released. The developer's
17:36:16-24 passive recheck (no saved raw record) remains a reported observation, not a
new protected measurement. The orchestrator identified **PID 1968** as this session's
Copilot host (started 2026-11-13 about 19:26), with **5.25 CPU-s in a separate 10 s
window** at 17:40-17:41; other Copilot PID **17588** was idle and no foreign job/lock
was present. The host cannot be quieted while this session operates.

Accept that known-workload inventory, **not an exact CPU attribution claim**: the
self-test's PID-1968 delta was only **0.734 CPU-s over roughly 6 s**, which does not
account for about one busy core in its five-second aggregate window. Those windows
are not synchronized, protected/system/transient work is not fully attributed, and a
different ten-second sample cannot be subtracted from them. Keep that uncertainty;
neither a host-only diagnosis nor an adjusted "quiet" result has been proved.

**Binding implementation/resumption instructions:**

1. The orchestrator's relay explicitly confirms the current shared-machine slot and
   resumption. The developer's earlier dispatch-as-slot assumption stays disclosed;
   no generation ran, and nothing is rerun merely to erase it. No further owner
   question about pausing Pentomino is needed.
2. Before editing, append/read back the Q1 plan. Preserve the original helper bytes
   and `helpers-sha256.txt` as the pre-Q1 freeze. Only task-owned launch/report helpers
   and this task's evidence/report/notes may change. The developer does not edit this
   pack, production, measurement tools, fixtures or Git state.
3. Keep the **raw five one-second CPU intervals, original thresholds and strict-screen
   verdict**, even when they fail. Record an explicit policy identifier
   **`MS18a-Q1-host-active`** and a separate **`admitted`** result/reason. Keep `ready`
   as the original strict-screen result; do not turn it true to launch or make the
   reporter pass. The launcher and reporter must use the named admission policy
   explicitly, not infer that a failed screen is acceptable from a payload exit 0.
4. Admission under this policy still requires the confirmed slot, matching own lock,
   no foreign timing lock, valid aggregate counters and usable process observations.
   Record PID 1968's name, actual full creation time and CPU observations; verify the
   same instance is the orchestrator-confirmed host. PID reuse, a missing/unverifiable
   host or missing process observations is a hold, never an assumed exception.
   The allowance concerns **that host process only**, not every `copilot` process or
   its descendant tree. No concurrent generation, tests or other heavy agent work is
   allowed merely because it shares that ancestor.
5. Keep before/after process snapshot times and available per-instance CPU deltas.
   A known foreign computational job is a hold even if caught idle. As a concrete
   screen for an additional observed consumer, **>=0.5 CPU-s per elapsed second**
   over that actual snapshot window in any other process is a hold; the identified
   launch/sampler processes are instrumentation, not a foreign job. PID 17588 has no
   exemption. Do not treat unavailable counters as zero or claim that this inventory
   explains all host CPU; retain inaccessible/transient observations as limitations.
   Recheck the foreign/own lock state immediately before the payload. Unknown or
   contradicted admission facts require a hold and report, not another guessed default.
6. With those admission facts satisfied, the aggregate 0.5/1.0 threshold failure
   **does not block this task's payload**. All MS18a runs carry the same environment
   label: **"shared-slot, CLI-host-active; not strict-quiet-machine timing"**, even if
   an individual raw screen happens to pass. Preserve raw request/diagnostic/process
   times unchanged: no CPU subtraction, normalization or faster-repeat selection.
7. Test the task-owned admission/report logic without generation: raw-screen failure
   with the confirmed host and no other work admits under Q1; a foreign lock/consumer,
   wrong host instance or invalid required counters does not. The original strict
   verdict must remain visible in both cases. Format and freeze the changed helpers
   to a **new** hash record; preserve the first freeze and failed self-test.
8. Run **one** new locked no-generation self-test (`node --version`) to distinct
   `selftest-q1` paths under a written finite bound. Exit 0 means admission under
   Q1 and successful payload, **not** a strict-quiet pass; exit 3 remains an unstarted
   environmental hold. If it succeeds, proceed directly to the admitted GS plan
   after the ordinary gap; no further QUESTION is needed solely because raw CPU
   exceeds 0.5/1.0. No automatic three-check/60-second retry loop is authorized.
9. Recheck the existing **32-command/204-request** plan against actual revised
   launcher overhead before generation. The <=450 s admission, 540 s process-tree
   ceiling, >=15 s gaps, jobs 1, exact keys/shards and all diagnostic assertions stay.
   This ruling is not blanket approval of an otherwise unsupported projection or
   the reporter's historical **111/112** dry-run as a complete current-source pass.
   No E/GH/quick repetition follows from an artifact-only helper change.
10. Carry **MS18a-Q1-HOST** in the report/final reply: failed original screen, actual
    process evidence and attribution limits, changed helper identities, new self-test,
    admission observations and the descriptive-timing label. Route it to **MS18b
    dispatch preparation** to settle the next timed task's readiness contract and
    **MS18e audit**. This exception does **not** roll forward to MS18b/MS18c/MS18d,
    waive final timing budgets, alter offers or authorize another measurement class.

### MS18a-Q2 — bounded fresh-slot re-asks, SA2 ruling, 2026-11-18

**Choose (a), then (c) if the single re-ask also holds.** This is standing permission
for ordinary additional-CPU-consumer holds of this kind during the remaining MS18a GS
plan; it is not permission to rerun a measured payload or to change Q1's admission rule.
An OS service consumes CPU even though it is not another session's job. **No exemption
for `InventorySvc`, `svchost.exe` or other maintenance services**, no threshold change,
and no stopping, reprioritizing or disabling another process/service.

At the ruling, fourteen command ledgers are complete with PASS diagnostics, covering
**105 of 204** requests. `killer-expert-9-3` (absolute requests 9..11) has one admission
hold, exit **3**, payload unstarted and no puzzle ledger. Its 18:13:35-43 record retains
raw mean/max **1.854858/2.618434** busy cores; the blocking consumer is PID **10948**,
reported as `InventorySvc`, **3.78 CPU-s / 5.71 s = 0.66**, above Q1's **0.5**.
The host instance was verified. This is an environmental hold, not a failed puzzle.

1. **One re-ask per fixed logical plan entry; at most two admission attempts total.**
   The existing hold is attempt 1 for `killer-expert-9-3`; it may receive attempt 2.
   The same rule covers a later entry's first eligible hold without another QUESTION.
   Account from retained attempt records across driver calls/restarts; renaming an
   attempt, restarting a batch or writing a revised plan does not renew the quota.
   The fourteen completed payloads are not candidates for this rule. There are at most
   **18 additional re-asks** for the current remaining population.
2. Before a re-ask, release the lock and wait until **at least 60 s after that attempt's
   recorded release**, outside all timing locks. Time already elapsed counts. Then use
   a fresh planned/granted shared slot and the unchanged complete Q1 admission check.
   Keep the ordinary >=15 s inter-lock gap and any foreign-release settling condition.
   No repeated samples inside one held lock, automatic third attempt or retry-until-green.
3. This permission requires a **fresh, matching exit-3 record, `admitted:false`,
   payload unstarted, no puzzle ledger**, and verified hold reasons limited to the
   ordinary additional-consumer CPU predicate. Only that expected hold may continue
   through the new driver branch. Missing/corrupt/stale or contradictory records,
   host/identity changes, invalid required counters, unexpected exits, a purported hold
   after payload start, payload failures/timeouts or correctness failures keep their
   existing stop/QUESTION rules.
   Do not match one consumer message and ignore another non-eligible hold reason.
4. Preserve attempt 1's readiness, transcript and lock-log row unchanged. Use distinct
   attempt-2 paths, for example `killer-expert-9-3-admission2`, with an explicit mapping
   to logical entry `killer-expert-9-3` and ordinal 2. Keep the original payload, request
   span, seed, settings and canonical puzzle-ledger path; require that ledger to be
   absent before launch. The new attempt name is **not** another cell/request/shard.
5. If attempt 2 admits, run the payload once and retain its actual result. If it also
   holds on the eligible CPU condition, record **environment-held / unexecuted after
   two admission attempts**, release the slot and continue the other independent plan
   entries. **Do not return for each recurrence.** Keep a per-entry table under
   **MS18a-Q2-ADMISSION**, including both attempts, consumer numbers, statuses, paths
   and missing absolute indexes. Other failures still stop as above.
6. The batch/driver must expose an explicit incomplete/held status and list if an
   entry exhausts its quota, even if a later child exits 0. Other bounded batches may
   continue under this ruling. The final report distinguishes intended **204**, actual
   recorded outcomes and unexecuted indexes. Do not fabricate error/miss rows, zero
   timings, a complete twelve-request cell distribution or a complete-matrix pass.
   If any gap remains, MS18a-T01 is unsatisfied: report the incomplete milestone once
   at handoff for an orchestrator disposition, not automatic acceptance/next-task dispatch.
7. Append/read back the Q2 plan before changing task-owned sequencing/report helpers;
   preserve `plan-gs.json`, the Q1 admission predicate/thresholds, all earlier freezes
   and all completed/held records. Only attempt bookkeeping, narrowly classified
   continuation and honest reporting change. A structured reason/attempt field is
   allowed in owned helpers; it may not alter who is admitted.
8. Test the changed control flow **without generation**: held-then-admitted starts one
   payload, twice-held starts none and permits the next entry, an unexpected failure
   or claimed hold after payload start stops, and restart/aliasing cannot reset the
   quota or overwrite records. Format/refreeze to new paths and recheck unchanged
   payload bounds with any new overhead. Do not add live no-op checks to seek a passing
   window. No E/GH/quick run, production/measurement-tool edit or regeneration of the
   completed fourteen is needed.

After the orchestrator relays this ruling and confirms the slot, the developer may
resume the above preparation and then the one re-ask for `killer-expert-9-3`. Carry
**MS18a-Q2-ADMISSION** with Q1-HOST to MS18b readiness preparation and MS18e audit,
including resolved holds as history. This permission is MS18a-only and does not
reselect a performance budget, waive full coverage or roll forward to another task.

### Process: plans first, QUESTION before acting, no acquisition

Write and verify each phase's plan **before** its first dependent action: exact request
keys/shards, commands, source-qualified whole-command and per-item projections, expected
statuses, readiness checks and output paths. A failed plan write blocks execution until
fixed and read back. Include loading, I1-I7 checks, deferred diagnostics and launch overhead;
MS02's old timings are not current-source bounds. Re-plan before a later command if the
observations invalidate its bound. Unknown-cost generation starts locked, never as an
unlocked trial; IR12's actual-elapsed admission applies to any independent-item compound.

Any unresolved contract/permission/evidence choice requires **QUESTION before acting**,
not an implemented assumption or a decision left for review. Once raised, pause all new
edits/runs until the orchestrator explicitly answers and resumes. Preserve/finish or safely
stop an already-running owned bounded command through the normal helper. Settled time/
availability findings instead follow S-OD4's numerical-item route without a new owner stop.

**S-OD12/S0** grants no standing corpus scan, seed search, discovery quota or acquisition
exception. Only the fixed GS requests and their existing diagnostic checks are assigned.
Format owned helpers before freezing their bytes: CRLF/no BOM, final newline, no trailing
whitespace and the code line convention. Production, diagnostic tool and fingerprinted
documentation bytes remain unchanged. An unexpected need to change them is a QUESTION,
not an unrecorded post-freeze fix or an excuse to reuse stale identities.

## Inputs & context

R23, verbatim:

> Shallow share is over **solved in-band** puzzles, not exact puzzles.
> Give exact and all-in-band cohorts separate counts and distributions; judge "hugs the top" on the
> exact cohort's attainable position.

Read `docs/difficulty-v3/baseline.md` and the **17 original MS02 JSON ledgers**, not an
analyst estimate or a later-source substitute. The immutable request manifest is:

| Variant | Levels | Route | Requests |
|---|---|---|---:|
| classic9 | normal, hard, expert, master, nightmare, hell1 | direct | 72 |
| killer | normal, hard, expert | pipeline | 36 |
| jigsaw9 | normal, hard, expert, nightmare | pipeline | 48 |
| greaterThan | normal, hard, expert | pipeline | 36 |
| diagonalX | nightmare | direct | 12 |

Twelve requests/cell, base **20260101**, absolute indexes **0..11** and tags
`<variant>:<level>:<index>`. Direct requests use the base RNG's tagged fork; pipeline seeds
are derived by `seedFor`, not literal seeds 1..12 or base+index. Check the stored routes,
tags and pipeline seeds against MS02. No cap/window, weights/bands or attempt overrides.
Record errors, reference failures, work/cap rates, targets/deviations and generation/diagnostic times.

The accepted MS02 baseline has old hits 202/204, reference-qualified 91/204, shallow 111/202.
Its old `generationExact` cohort is score-only; recompute the reference-qualified cohort from its
stored `qualifiedHit` rows for a fair comparison. Do not run current requiredOf on old rating counts.
Tier meanings changed: baseline Hell 1 was vacuous; identify that explicitly. Keep each version's
stored position inputs/limits, not today's weights applied retrospectively.
Retain MS06a/d's isolated target comparison so later solver/cutoff effects are not attributed to targeting.
Its records are `docs/difficulty-v3/target-scope-2026-11-14.md` and
`docs/difficulty-v3/evidence/MS06d/comparison-tables.md`, with their original ledgers.
Null adjusted reasons/unclamped values remain AC01; no global-minimum or uniformity guarantee.

The old MS02 ledger's exact cohort is **not** the qualified cohort, and its pre-recovery
metadata is not input to today's `mergeShards`. Read its stored rows without rewriting or
retagging them. Recompute the old qualified/in-band distributions separately, using the
stored positions and the documented upper-median/decile convention. Do not average shard
percentiles. Preserve missing historical counters/targets as unavailable, never zero.
MS02 independently referenced all 204 rows; the current tool derives requiredness for all
rows and independently references logical indexes **0 and 11** only. Report this distinction,
with the unchanged **120,000 ms** reference/final-path budget; do not broaden sampling.

**Timing qualification:** MS02 explicitly records concurrent Pentomino quick tests and no
new quiet-screen metadata. Its 176.2 s whole-command total remains historical, not a
quiet-machine guarantee or a v3 launch bound. Report matched timing differences descriptively
with that caveat; do not attribute every difference solely to the algorithm or call GS a GP pass.

Anchors verified at **`57c1b10`**: `generator/tests/soak.js:428` (`seedFor`), `:439`
(`generateOne`), `:490` (`checksNow`), `:537` (generation timer), `:875` (`metaOf`);
`generator/tests/fixtures/difficulty-diagnostics.js:225` (`summaryOf`) and `:619`
(`mergeShards`). Locate by symbol if lines move. Soak `sourceHash`/`toolHash` are their
own identities, not either E identity or a quick fingerprint.
Default attempts use r5p, not a literal eight; these 17 fixed boards all have 81 cells.

### Inherited items — retain the populations and next owners

Carry the complete check-list item register, including the following current handoff.
GS's twelve-request cells neither replace GD's populations nor decide GQ/GP.

| Item | Evidence/status to preserve | Final owner |
|---|---|---|
| S-AV14 | MS17b Normal aggregate **83/100**, failed; its other seven batch tests passed | MS18c availability; MS18e GD/audit |
| MS17b GD Hell 1 / S-AV25 | **8 tests, 20-request batch unexecuted**; stated bound **919 s**, no current-source measurement or verdict | MS18c/d handoff; MS18e GD |
| MS17b GD confusion matrix / S-AV15 | **1 test unexecuted**, stated bound **1,544 s**, not a pass | MS18c/d handoff; MS18e GD |
| MS17b-GD21-PROCESS | Unlocked **36.5 s** diagnosis, unknown overlap/raw output not saved, locked bisect's IR12 defects and mislabelled footers; accepted disclosure, not protected timing | MS18e audit; do not reuse that driver unchanged |
| MS18a-Q1-HOST | Failed original absolute-CPU screen; named session host active; raw CPU attribution incomplete; MS18a-only admission with descriptive host-active timing | MS18b readiness preparation; MS18e audit |
| MS18a-Q2-ADMISSION | One fresh-slot re-ask per eligible held logical GS entry; two total attempts, >=60 s after release; exhausted entries remain unexecuted, not puzzle misses or complete evidence | MS18b readiness preparation; MS18e audit |
| S-AV36-S-AV39 | Construction, seeded/synthetic, repository-source and whole-generation populations remain distinct; retain MS16's S-AV39 extension and unchanged limits | MS18c availability, MS18d cost, MS18e audit |
| MS15b-GP-J / MS15b-GP-U | Of **37** cells, one full 50-run record, Jigsaw Nightmare pilot only (**680 s** 50-run projection), **35 unmeasured**; not S-AV38's 50-cell population | MS18d; MS18e audit |
| MS15b-Q6 / MS16-Q6 | Controlled placement coverage and fixed seed-377 GH lineage/pause disclosure, not availability failures or acquisition permission | MS18e audit |

Also retain the earlier S-AV01/CV6-05, Killer/S-OD7, Q-MS07e-2, target-era losses/costs
and S-AV31/S-AV33/S-AV34 records under their existing dispositions. The full inherited/new
item list belongs in the report **and final reply**; a small GS sample closes none by implication.

## Files to create/modify

- `docs/difficulty-v3/evidence/MS18a/`, new `docs/difficulty-v3/after-2026-11-18.md`
  (actual date if later), v3 notes.
- Task-owned read-only launch/aggregation helpers under
  `generator/tests/artifacts/difficulty-v3/MS18a/`; retain their source/format identity.
  No new permanent soak, qualification or performance tool; no generator warmup or probe.
- No baseline overwrite, production/measurement-source, fixture, offer or task-pack change.

## Implementation steps

1. Read the accepted records; verify source/fingerprints/defaults and all 204 baseline request
   keys. Write/read back the bounded plans and format/freeze owned helpers before measurements.
2. Obtain the slot and raw readiness observations plus explicit Q1 host-active admission
   for each timed cell/shard, then run the
   exact manifest. If a level is hidden, retain its request through diagnostic
   `--include-unsupported`, record why and keep that setting consistent across its shards.
   Do not re-offer it or silently substitute another level.
3. Use whole cells only where credibly bounded. Otherwise the existing
   `--from=k --total-count=12 --count=n` route preserves absolute indexes and reference
   endpoints. Give every shard a distinct path. Validate/merge each current cell through
   `SG.fixtures.difficultyDiagnostics.mergeShards` in an owned read-only reporter; there is
   **no soak `--merge` CLI**. Require indexes 0..11 exactly once and compatible source/tool/
   Node/settings. Do not feed old MS02 records to this current-source merger.
4. Inspect every raw `summary.checks`, not just `complete`, merger success or exit 0.
   `--no-gate` suppresses the exit gate, not evidence of request errors, incorrect exactness,
   invariant/check failures, missing work or reference/final-path errors. Preserve actual
   FAIL/INCOMPLETE outcomes and route them under S-OD4; a captured miss is not a lost record.
5. From raw matched rows, compare integer hits and losses, shallow shares over solved-in-band
   results, both cohorts' counts/distributions, work/caps, targets/deviations and separate
   generation/diagnostic/process times. Preserve stored bounds, null reasons and the timing caveat.
6. Preserve the isolated MS06 comparison and cumulative item list. Recheck unchanged
   fingerprints/source/defaults; hand MS18b/e coverage, identities, actual timings and every gap.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS18a-B01 | Final improvements and regressions are reported honestly against matched requests |
| MS18a-B02 | Old score-only hits/vacuity are not sold as old required exactness |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS18a-T01 | All 204 outcomes/configuration/source identities and failures retained |
| MS18a-T02 | Qualified vs in-band cohorts, stored bounds, null reasons and costs correct |
| MS18a-T03 | No source/tuning change; incomplete/invariant-failed evidence is not a pass |
| MS18a-T04 | Plans precede phases; each timed cell/shard retains the raw strict-screen result, explicit Q1 admission, descriptive host-active label and actual lock/process status |

## Test plan and gate

Generator payload, **only after its whole-command bound is admitted** through the normal
helper and section 7's precondition as amended for this task by Q1; then every manifest cell:

```powershell
node tests\soak.js --variant=classic9 --level=normal --count=12 --seed=20260101 --no-gate --json=..\docs\difficulty-v3\evidence\MS18a\classic9-normal.json
```

An authorized shard replaces `--count=12` with `--count=n`, adds `--from=k --total-count=12`
and uses a distinct JSON path. These are command examples, not ready-made
projections. No separate unplanned generation pilot or speculative whole-cell run.
Jobs **1/no --jobs**, credible **<=450 s** admission for the complete invocation and
the unchanged **540-second** process-tree ceiling. Include readiness work in that bound
if it runs inside the invocation. The old 0.5-3-hour matrix allowance is planning context,
not a per-cell bound. Announce the exact plan and obtain the shared slot.
Leave >=15 s between locks. A single request without an admitted route remains a named
unexecuted item; continue safe work, not a larger guard or a new evidence/tooling class.
Evidence-only; the orchestrator verifies the unchanged accepted quick baseline without
repeating heavy gates just to duplicate valid evidence.

## Definition of done & handoff

Hand MS18b/e complete before/after tables, loss report, true cohorts, timing readiness/
comparability notes, actual timings and the full item list. State explicitly if 204-outcome
coverage or any correctness/evidence criterion remains unsatisfied; never call a partial
matrix complete. Never change the policy to make this evidence prettier.

## Resume rules — S-OD4

Review: orchestrator template/contract review, as for MS18b; SA1 cross-review resumes at MS18c.
Correctness/evidence corruption or changing a recorded decision stops;
time/availability is a named numerical MS18c/MS18d item and independent work continues.
Use `Invoke-Dv3Node` for every possibly >10-second payload, <=540 s, with existing absolute-index
shards; do not invent another slow-cell evidence/tooling class or report incomplete data as complete.
The QUESTION pause and final-gate precondition, with Q1's MS18a-only disposition and
Q2's bounded re-ask/continue rule for eligible CPU holds, still apply. Return the inherited/new
item list, including MS18a-Q1-HOST and MS18a-Q2-ADMISSION; verify the unchanged quick
baseline, with no suite/CI changes.

## Execution log

| Field | Value |
|---|---|
| Status | |
| Start | |
| End | |
| Duration | |
| Model | |
| Token usage | |
| AI credits | |
| Verification | |
| Acceptance | |
| Issues & resolutions | |
| Handoff | |
