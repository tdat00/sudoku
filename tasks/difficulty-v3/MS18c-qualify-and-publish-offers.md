# MS18c — Final qualification and live offered levels

| Header | Value |
|---|---|
| Depends on | MS18b; completed Stage 1-3 GQ and joint SET ACCEPT; SA1 final AGREE on this continuation and orchestrator release |
| Accepted base | GQ measured at `ed2fe50c`, dirty, sources `0ca29eaeebc295b6`; checkpoint A `6a473f7a`, B `387a4c8d`; publication sources `75b0955e3e356bd1`; R5 256 / C4 unchanged |
| Size / active time | Medium; continuation includes bounded manual/E/quick/CI work; no whole-phase duration claim |
| Owner / milestone | Qualification/publication; M18c |
| Authority / review | R24/R21, AUTH-S1, SA1-Q-S5, S-OD4 (c1), S-OD7/S-OD8/S-OD13/S-OD14, CV6-05; joint ceiling/recovery approval and SA1 cross-review |
| Status | ACCEPTED at `e0596801cf95d79761073a344ffc2e60f7764c8f`: SA1 FINAL ACCEPT, C1 completed/verified and exact-head local closure checks passed; no remote CI claim |

## Acceptance record — 2026-11-19

The orchestrator's **2026-11-19T09:57:44.992+07:00** handoff records **SA1 FINAL
ACCEPT with condition C1**, followed by verified completion of C1 and the
matching-head local checks below. **MS18c is accepted.** Its historical plans,
questions and release stops below are now provenance, not instructions to repeat work.
The Execution log, index checkbox and orchestrated summary row remain for the
orchestrator to fill; this acceptance note does not edit them.

| Boundary | Commit / disposition |
|---|---|
| Pre-publication checkpoint A | `6a473f7a` — frozen GQ evidence, checked merge, helpers/compatibility and v2 archive |
| Publication checkpoint B | `387a4c8d` — support arrays and live report together, 79 offers |
| Accepted closure | **`e0596801cf95d79761073a344ffc2e60f7764c8f`** — 418 files (33 modified, 385 new); `.last-release` excluded and then deleted; clean tree at acceptance |
| Measured/publication source | GQ remains `ed2fe50c`, dirty, `0ca29eaeebc295b6`; publication producer remains `75b0955e3e356bd1`; no record retagging |

**C1 is complete.** `evidence\MS18c\closure\population-map.md:176` explicitly
records the extra-regions classic9 public-support control: seven offered levels
VeryEasy through Nightmare, removal of Hell 1 **seed 707 / original index 7**,
and unchanged `700 + global level index` seeds for the seven retained levels.
It is a public control, not a fixed diagnostic cohort. This is population
accounting, not a changed assertion or a new generation run. The orchestrator
verified that only C1 files changed after 09:47; no quick rerun was a condition.

Final evidence is `evidence\MS18c\closure\item-register.md`, the population map,
`closure\final\`, `closure\ci\` and the **`-b`** manifests (not the superseded `-a`
versions). All **591** entries are verified and tracked: 47 helpers + 544 outputs.
SA2 independently rechecked the hashes and tracked membership when recording this acceptance.

| Final inventory | SHA-256 |
|---|---|
| `helpers-sha256-b.txt` | `dbe22dcd94ae64281240d5a98782094890b6831efdb93afbf2addffb53930d13` |
| `outputs-sha256-b.txt` | `6624eaff0df4b64d1af1f0fcda4681bc48126d11b69099ea45fea7b491646687` |
| `format-check-b.txt` | `620d54f482ee47d50dfeeec8b0b71732f37bc01f9ab33ac738e9622077e23386` |

### Accepted gates and identities

| Gate | Accepted result |
|---|---|
| GQ / frozen inventory | 135/135 cells; 79 offered, 56 hidden; 27 retained request timeouts, zero invalid/gaps/recoveries; **2,201/2,201** frozen files re-verified |
| Complete manual `variants` | **285/285**, 18 disjoint whole-test shards |
| E | **5 wires / 14 analyses / 520 hashes unchanged**, complete check-only merges |
| GH | **40/40**, check-only |
| Generator quick | **4,807/4,807**, 55 suites, **547.6 s** across four group commands |
| Player quick | **2,981/2,981**, 32 suites, **118.7 s** |

| Accepted identity | Value |
|---|---|
| Generator quick | `fc31c9db8a2cea17e480f5130d531042a4c073bc4dd0d2c97296afc6a6079ac2` |
| Player quick | `4c21573fbc00ca82a4e6d0a15bf6e8201be84940d00f87840a49e2046bd3d25a` |
| Generator with manual trees | `13cd63bfb0f5af687bc8e841d522cc7f216aa116125394b33fbc32a53ab1ef3f` |
| E replay | `1cf64919a9004259a203e65bc7e537b15b981f4ed52610f4cd62d28cf6950fcc` |
| E hash | `1032ab2f510fe2b9ed1bac744f534d5cfee7e039f456fc56d3e19682d53158a0` |

**Matching-head means the local MS18c closure check here, not remote PR CI.**
The orchestrator ran the following under `Invoke-Dv3Node` on exact HEAD
**`e0596801`**, with the tree clean; all exited **0**:

1. `identities-now.cjs`: all five values equal the accepted evidence above.
2. `.github\scripts\generator-quick.selftest.js`: **50 checks, zero failures**.
3. `.github\scripts\generator-quick.js check`: Generator **4,807/4,807** in exactly
   one shard each; Player **2,981**. Group budgets are **1260 / 1260 / 420 / 450 s**
   of 1800; Player **720 s** within its actual **900 s** workflow limit.

Quick sets were **not rerun** after C1/commit, as SA1 explicitly clarified they
were not an acceptance condition. Their matching final identities and the local
exact-commit checks above are the accepted proof. No push or remote workflow run
is claimed; MS18e retains its matching final-head remote CI/audit obligations.

### Accepted disclosures and downstream ownership

SA1 accepted the recorded deviations: about **20 unlocked sub-second file-only
Node calls**, one `Set-Content` scratch file, one `.Replace` rewrite, the
**294 `.log` files force-added at A**, the moved stray `-` TSV, and leaving
`recovery-quick-cost.md` as its dated historical record. Keep the original
disclosures/evidence; this grants no standing exception to later invocation/edit rules.

Final items: **S-AV01 not offered; S-AV05/06 under S-OD7; S-AV27 closed; IR17
carried; MS18c-GQ-ENGINE-COST open to MS18d**. The cost item additionally records
the fixed mega16 replay shard at **331.6 s**, versus **118 s at MS07f** (about
2.8x), above its **300 s projection** but inside 450 s, and **17 offered GQ cells**
above their current design 9.1 performance targets. These are source-qualified
observations, not GP results or permission to retune/relax/repeat qualification.

Live **killer, jigsaw, greater-than, extra-regions, wordoku and `perf`** validation
remains MS18e; implementations/populations are resolved, not their live outcomes.
The principal named risk is the **extra-regions cross-level hit-share assertion**,
which retains its full original diagnostic population, including hidden levels.
Keep its original threshold; do not infer a live pass from sandbox/listing checks.

MS18d may be prepared/dispatched only after this acceptance is recorded. It must
establish its own timed-work readiness: **S-OD13's host-active GQ grant is not a GP
waiver**. No further MS18c generation, gate rerun or frozen-evidence edit follows
from this acceptance record.

## Goal & business context

Let complete final evidence determine availability, with S-OD7's additional owner-directed
withholding of Killer Hard/Expert. Preserve the v2 record and keep the live table at its existing path.

## Scope

In: full 135-cell GQ-final, v2 archive, live table/support arrays, stored-request notification and
diagnostic/publication compatibility of the final offers; the complete bounded `variants` manual suite,
MS05b3 population audit and CV6-05's final S-AV01 disposition before GP.
Out: new GQ generation/repeats, solver/generator tuning, weight changes, partial table publication or dropped cells.

## Repository rules

AGENTS/checklist. **The developer makes no Git writes, pack edits or task-log edits.**
The orchestrator owns staging, implementation commits, pushes and CI actions; SA2 commits
pack-only. The mandatory pre-publication/publication split below replaces one final
implementation commit for this task, but does not transfer Git authority to the developer.
It supersedes earlier post-GQ "wait until task acceptance to commit" wording only
after the complete measured set has been accepted; the immutable measurement
manifest and the no-code-commit-during-GQ rule are not rewritten.
This is the explicit exception permitting the live `docs/difficulty-rating/qualification.md`
update and the bounded manual work below, not edits to other dated reports or frozen GQ files.

## Accepted handoff and owner actions

MS18b is accepted at **`14d8c903`**, with **360/360** outcomes in 30 comparison cells,
44 locked payload commands, all DIAGNOSTICS PASS, 145 reporter checks and no admission
holds/gaps/re-asks. R5 **256** is reconfirmed: 64 loses classic9 Normal 11 -> 10 and
Nightmare 12 -> 11, 128 loses Normal 11 -> 10; 256 loses none and reduces Jigsaw Expert's
upper median full ratings **1215 -> 1104** against none. C **4** is reconfirmed,
**36/36 versus 20/36** at C6, no tie. The orchestrator independently derived both
rules and reproduced 24 decisive rows; those rechecks do not enlarge either population.
Use `evidence/MS18b/evidence.md`, `decision-packet.md`, `selection.json` and the final
**`helpers-sha256-r1.txt`** reporter revision (including incomplete exit 4).

| Action / decision | Current disposition |
|---|---|
| MS18b R5/C keep/change or replacement implementation | **None open.** Both values reconfirmed; no retune, version change or replacement task follows. |
| S-OD7 Killer Hard/Expert | **Already decided.** Withhold until later calibration; no in-v3 weight change. Keep both in GQ and preserve raw verdicts. |
| S-OD4 (c1), large-board Nightmare/Hell availability | **Already decided.** Apply final qualification without exception; no permission to retain a failing offer is pending. |
| S-OD11/S-OD12 and earlier acquisition/limit questions | **Resolved.** Preserve their dispositions; no new scan/limit permission transfers here. |
| **MS18c-Q1: final qualification measurement environment** | **Resolved by S-OD13: A.** Declared host-active GQ; actual raw p95 and the full qualification contract remain binding. |
| **MS18c-Q2: complete qualification execution route** | **Resolved by S-OD13: B.** Both analysts approve all 135 source-bound P/A/T/O assignments in `MS18c-gq-approved-ceilings.json`; the Stage 2 record and Stage 3 release/review gates below govern execution. |
| **MS18c-Q3: one recovery payload relaunch** | **Resolved by S-OD14: B**, owner at 2026-11-18 23:05:53 (+07:00). The owner-answer precondition is satisfied; each actual recovery still needs the separate prior joint diagnosis/authorization below. |
| CV6-05 Greater-Than Normal fallback contract | **Resolved for this set: S-AV01 closes "not offered".** Normal has 40/40 hits but p95 10,192.4051 ms > 10,000 ms. The Fable trigger is not met; no Normal budget change or special CV6 exception. |
| A variant with no qualified/offered level, unexpected publication incompatibility | **Conditional blocker if observed.** No invented passing level or silent population change. Assign the compatibility decision/fix through the orchestrator. |

No R5/C or Q1/Q2 owner choice remains open. **The numerical method and all 135
source-bound assignments are jointly approved, not a developer choice.** Stage 1
has finished and stopped; its original pending rows and reports stay unchanged.
The pack-only approved manifest is separate. Q3 is answered as **S-OD14**.
The GQ execution phase has now finished and both analysts give **SET ACCEPT**.
The historical staging/supervision contract below remains the provenance of those
runs, not permission to repeat them. The **post-GQ continuation**
below is now completed and accepted as recorded at the top of this brief.
The official merge and checkpoints **A `6a473f7a` / B `387a4c8d`** are now complete;
79 offers are published, with publication sources **`75b0955e3e356bd1`**.
The closure commit is **`e0596801`**, with SA1 final acceptance/C1 and the local
matching-head checks recorded above. Do not repeat step 5, the merge, A/B or GQ.

**S-OD13 — owner, Discord author `amicably8850`, 2026-11-18 21:31:46 (+07:00):**

> Q1: A. Q2: chọn phương án B nhưng giao SA-Opus và SA-Astra chọn mức trần, không cần thông qua Fable.

The verbatim answer and prepared questions are archived in
`docs/difficulty-v3/clarifications-resolved.md`, S-OD13. **SA-Opus = SA1; SA-Astra =
SA2. No Fable approval is required for these ceilings.** CV6-05's separate conditional
Normal-budget delegation to Fable is unaffected.

### Baseline identities

| Surface | Accepted baseline |
|---|---|
| Generator quick | **4784 / 55 suites**, 542.0 s; `274067a0beb67a595f711be792ed2625193d2549ee8ec9a8bfc795cc8ef73b3c` |
| Player quick | **2981 / 32 suites**, 117.2 s; `5e55cec60307ec6c0d4235d5e07b63934cabb4f1fe077da40b99277e5576d14c` |
| Replay E | `ff55cbce4c34034d501ee495417e7c69da953143c9f74a4bae4f5b722d719421` |
| Hash E | `b1c78ecbcf3a0e4bb0d6a1f661f235e5f9ce63e4b3756dc3260892ac19270a58` |
| Qualifier engine at `14d8c903` | `engine.sources = 0ca29eaeebc295b6`, 46 loaded source files; **not** the soak, quick or E identity |
| Qualifier tool at `14d8c903` | `qualifierHash = c0ef0d25f28518692bdccbde547814daf74f5834d35f9e117108d6321876fd77` |

The qualifier identities above were computed file-only by its actual hashing recipe;
no qualification was run for pack preparation. Recompute after any authorized input
edit, including locale bytes if changed. Its source list skips Generator UI/worker
files but includes the variant definitions; its tool hash includes `qualify.js` and
`fixtures/qualification-records.js`. Do not substitute another family's hash.
Rating/cache **3**, history/worker wire **1**, grouped proof **2**, catalogue/GH **40**
(34 unscoped) remain. CI projections are **170/70/70/50/330/30/80/90**, Player job
**180**, in the established shard order. Maintain counts/projections only by the
existing quick rule after actual relevant verification; no membership/factor change.

## Post-GQ joint acceptance and continuation — 2026-11-19

This section governs the remaining work. It combines both independent full-set
reviews, relayed together by the orchestrator at **2026-11-19T06:00:51.278+07:00**:

- **MS18c-GQ-SA1-20261119:** SA1/Opus, **"SET ACCEPT"**, complete set reviewed read-only.
- **MS18c-GQ-SA2-20261119:** SA2/Astra, **"SET ACCEPT — for the GQ evidence set"**,
  complete set reviewed read-only; the canonical pure merge validator passed in
  memory, with no official merge file written.

This is GQ evidence acceptance, **not MS18c task acceptance or a release/deployment**.
The same developer **`5fe8b2d2` continues, strictly serially**, after the orchestrator
relays SA1's final AGREE on this continuation and explicitly releases it.
Do not invoke another GQ supervisor, generation/probe/pilot, `begin`/`post`/close-out
or recovery for this completed set. No source retuning or repeat to improve a time.

### Accepted set and numerical corrections

Measured identity: **`ed2fe50c3d87c79d78fb1108e6fd12aed07b7a89`, dirty**;
engine sources **`0ca29eaeebc295b6`**, qualifier
**`c0ef0d25f28518692bdccbde547814daf74f5834d35f9e117108d6321876fd77`**.
All records retain the approved attempt policy, Node **v26.13.0**, AMD EPYC 7763 /
16 logical processors / 64 GB / Windows 10.0.26300, jobs **4** and
**`MS18c-GQ-host-active`**. The manifest blob is
**`e9c3c2410fcf7aced811e11868c0f26004951b85`** and the epoch is
**`MS18c-GQ-20261118-01`**. Never retag this measured identity to a later checkpoint.

| Fact | Accepted value |
|---|---|
| Cells / attempts / journal events | **135 / 140 / 960**; 135 canonical copies and matching receipts |
| Outcomes | **4,313**: 3,783 exact hits, 503 approximate, **27 `budget.exceeded` errors**, zero invalid; all 4,286 non-error outcomes valid and solved |
| Verdicts | **79 offered / 56 hidden**; every variant retains at least one level |
| Faults / gaps / recovery | Zero supervisor/worker execution failures, T-expiries, leftovers, gaps or S-OD14 recoveries; captured request timeouts are misses, not failed cell executions |
| Second rounds | **Three**: hyper/Expert 53 requests, flower/Nightmare 50, wordoku/Normal 46 |
| Bounds | max R **7.8444534 s**; min W-Q-R **0.1795489 s**; max Q-S **1.0731562 s**; W-Q **7.3844708-8.034013 s**; every R<=45 and A/T/O/request bound passed |
| Measured W | max **368.08897 s** (samurai/Hell 1); sum **6760.276141 s** (about 1.88 h), not total acquisition/wait time |
| Admission | Five eligible primary-slot CPU holds, each followed by exactly ordinal 2; **all 140 raw strict screens failed**, with named-policy admission recorded separately |
| Timeouts by cell | mega16/Hell 1 **9**; samurai/Hell 1 **9**; sohei/Hell 1 **6**; Greater-Than/Hell 1 **2**; samurai/Nightmare **1**; max **120,051.7349 ms**, below 130,000 |

The initial prose saying "four requests" at the guard was incorrect: it is **27
outcomes across five cells**, including samurai/Nightmare. Preserve and report all
of them. Do not silently drop errors from rates or percentiles.

| Held cell | Actual lock release -> next acquisition | Actual release -> journalled admission |
|---|---:|---:|
| mega12/hell2 | 61.585 s | 63.993 s |
| killer/hell2 | 61.814 s | 64.320 s |
| butterfly/veryEasy | 61.976 s | 64.469 s |
| flower/nightmare | 86.405 s | 88.945 s |
| wordoku/hard | 77.356 s | 79.820 s |

The mega12 journal-release-to-admission interval is **64.027 s**. Its run ID was
allocated before a logged **22 s** re-ask wait; run-ID timestamps are not admission
timestamps. The minimum ordinary release-to-acquisition gap is **15.015 s**.

**Heartbeat disclosure:** in 53 short runs `status.clocks.rSeconds` is still null:
the last heartbeat preceded qualifier creation. For all 135, the journalled
`qualifier-created.rSeconds`, acceptance receipt R and final
`status.post.monitor.metrics.rSeconds` agree. `activeProcesses` and
`clocks.elapsedSeconds` are also last-heartbeat snapshots, not terminal job counts
or total O. The native window/drain result, receipt and terminal logs establish the
completed run. Document these semantics; **do not repair/overwrite old status files
or invent a missing time**. No authoritative R or monitor result is missing.

SA2's reviewed-set digest is
**`00d611b7760cdbe435cf74c76420a49aa527c90d32c4daf496fcb02b195d308a`**:
SHA-256 of UTF-8 lines
`key<TAB>canonical-JSON-sha256<TAB>receipt-sha256<TAB>journal-tip-hash<LF>`,
in approved manifest row order. This supplements, not replaces, the complete
file inventory required first below.

### Historical comparisons, decisions and item routing

The actual v2 archive is **19,785 bytes**, SHA-256
**`6d148c5e9ecf445075e26d960ec18bc181ea2c05ca039f1f98726458931162ff`**,
byte-identical to the still-unmodified live v2 table. Relative to its **118 offers**,
the final set removes **39** and adds none. Report every removal to the owner
through the orchestrator; these are accepted (c1) outcomes, not new questions.

Relative to MS07e's **129 measured cells**, twelve offered cells become hidden:
mega16/Expert; diagonalX/Expert; hyper/Expert; jigsaw9/Expert and Nightmare;
killer/Hell 2; Greater-Than/Normal and Nightmare; samurai/Nightmare and Hell 2;
sohei/Nightmare; flower/Nightmare. **Greater-Than/Master and flower/Master regain
an offer.** The six old gaps are now all measured and hidden on time. Do not
backfill or relabel the older, still-incomplete MS07e checkpoint with these new-source records.
Other hidden Easy/Normal cases were already hidden at MS07e; classic4/6 were hidden
in v2 too. Keep historical sources, machines, cohorts and their actual verdicts distinct.

| Item | Binding continuation/handoff disposition |
|---|---|
| **S-AV01 / CV6-05** | **Close "not offered".** Greater-Than Normal has 40/40 hits and p95 **10,192.4051 ms** against 10,000 (about **1.9% over**). No Fable trigger, new budget, Normal-only waiver or special hidden-cell treatment. The 700 ms CV6 base and historical failed cohorts remain; apply the same recorded public-manual population policy as for every hidden cell. |
| **S-AV05 / S-AV06 / S-OD7** | Killer Hard **0/14**, misses; Expert **2/12**, time. Preserve both raw hidden verdicts and publish **"hidden until later calibration (S-OD7)"** separately. No in-v3 recalibration; later calibration remains outside this task. |
| **S-AV27 / Q-MS07e-2** | **Close the final-qualification execution gap**: mega12/hell1, mega16/nightmare, mega16/hell1, greaterThan/expert, greaterThan/hell1 and butterfly/hell1 all ran and are hidden on time. S-OD13 supplied the approved bounded route; the serial second-round scheduler was not repaired. Preserve its mixed-concurrency caveat and the old unexecuted records. |
| **IR17** | Carry forward because classic9 Nightmare remains offered: the older GD batch cost **430.5 s**, so **449 s is not a reusable bound**. Require a current-source whole-command projection with conservative margin under unchanged 450/540 protection; MS18e owns the remaining GD audit. |
| **MS18c-GQ-ENGINE-COST** | **Open to MS18d; MS18e audits.** Preserve the source-qualified matched-outcome cost comparison below. No new GQ, algorithm tuning, target fitting, budget relaxation or attribution-based time subtraction. |
| **Close misses, plain notes** | Greater-Than Normal as above; diagonalX/Expert **37/40**, p95 **11,795.9214 ms** against 10,000. Both are hidden without an early stop. Neither is an owner/Fable question or a reason to choose a faster repeat. |

For **MS18c-GQ-ENGINE-COST**, SA1 reports a median per-request new/old time ratio
of about **1.13 overall** on matching recorded outcomes, with approximately
**6.6x mega16/Expert, 5.1x jigsaw9/Expert, 4.3x sohei/Master, 2.7x mega12/Expert and
2.1x diagonalX/Expert**. This is an engine-cost investigation signal, not a GP
measurement, identical-puzzle proof or a controlled causal attribution.

Keep the comparison definition explicit. SA2's separate stricter file-only check
(same key/index/seed and **every recorded request field except `ms`, including
score**, old time positive) has **2,122 pairs**, median ratio **1.1240**; its five
cell cohorts respectively have **29/15/5/18/8 pairs**, medians
**6.5530 / 4.7940 / 4.3160 / 2.6429 / 2.2272**. Do not silently combine these
cohort definitions or present the stricter check as reproduction of SA1's exact
filter. MS18d retains/reconciles the pair-selection rules, keys, counts and source
identities in its existing cost analysis. This does **not** hold publication or
authorize another timing campaign/tooling class; existing GP/profile bounds and
targets remain. No environment normalization of GQ follows.

### Orchestrator TSV disclosure

The orchestrator reports that a `node -` TSV script used `process.argv[1]` rather
than the supplied output argument. It wrote a **26,231-byte** file named `-` under
`evidence\MS18c\` at **05:31:53 (+07:00)**, after GQ and outside `runs\` and
`qualification\`. At about **05:52** it was moved to:

`C:\Users\ledat\.copilot\session-state\c2f29688-8568-4f25-bace-e644d381e5f9\files\ms18c-gq-cell-log.tsv`

No GQ evidence file was touched. Both reviewers had used the primary records when
that stated path was unavailable. SA2 subsequently verified the moved file:
**135 rows**, SHA-256
**`09b83de1b174ac5f9e7504bd1b03ef5bd9961d96063d156a99a20add05d98148`**;
keys, counters, verdicts, counts and paths match the receipts, and times match their
display rounding. It is a derived convenience log, not full-precision timing authority.
Copy/verify it into **`evidence\MS18c\gq-cell-log.tsv`** during closeout, outside the
frozen trees; preserve its provenance. Do not rename/move any primary run evidence.

### Combined continuation sequence — exact paths and commit ownership

**Current position:** steps 1-4 completed at A/B; retain them as provenance, not
repeat work. The developer's step-5 QUESTION is settled by the joint ruling below,
subject to SA1 final AGREE on this amendment and the orchestrator's resume.

**All top-level Node commands and all timed continuation work use
`Invoke-Dv3Node`, including file-only Node merge/validation/inventory commands.**
Use ordinary **<=450 s projected / 540 s hard** protection, the shared slot and
existing non-GQ readiness/spacing rules. No unlocked sub-ten-second Node exception
in this continuation and no use of the long GQ supervisor for manual/E/GH/quick/GP.
File-only PowerShell hashing/copying is allowed; its outputs still obey the freeze.
This is the local Windows invocation rule; CI retains its existing platform,
runners and workflow limits. The GQ environment permission is not a GP timing waiver.

1. **Freeze first, before any merge or publication edit.** Inventory **every file**
   (including hidden files, journals, receipts, held attempts, status/logs and
   `last-release.txt`) recursively under
   `docs\difficulty-v3\evidence\MS18c\runs\` and `...\qualification\`.
   Write the complete sorted repository-relative SHA-256 inventory once to
   **`docs\difficulty-v3\evidence\MS18c\outputs-sha256-gq.txt`**, outside both trees.
   Record file count/bytes and verify both file-set equality and every hash.
   If the inventory already exists, verify it, never overwrite it to conceal a drift.
   Thereafter **no file under either tree is edited, moved, added or removed**.
   Exclude them from formatters, status refreshes and helper reruns. Preserve the
   original preflight and s3b helper/evidence inventories too. New reports, TSV copy,
   merge output and closure evidence belong outside those frozen trees.
2. **Official merge, still on sources `0ca29eaeebc295b6`.** Re-verify the frozen
   inputs, then run `qualify.js --merge=<qualification folder> --jobs=4`.
   The one authoritative output pair is:
   - **`docs\difficulty-v3\evidence\MS18c\merge\qualification-v3.json`**
   - **`docs\difficulty-v3\evidence\MS18c\merge\table.md`**

   This replaces the earlier top-level `qualification-v3.json` / evidence-root
   `table.md` examples; create no competing alias. Write the command transcript,
   validation and hashes under `merge\` as separate sidecars. Require **exit 0 AND
   `totals.invalid === 0`**, all 135 keys exactly once, full per-request validation
   (no `valid:false`, non-error outcomes valid/solved, exactly the **27 documented
   `budget.exceeded` errors**) and every verdict/summary equal to its receipt.
   Inspect correctness warnings explicitly; any correctness warning or unexpected
   mismatch means **STOP**. A raw hidden verdict or those retained timeouts is not
   such a failure. Re-verify the complete GQ inventory after the merge.
3. **STOP for orchestrator checkpoint A: pre-publication commit.** The developer
   submits an explicit file list and verification; **the orchestrator stages and
   commits**, never the developer. Include the GQ evidence/inventories, MS18c helpers
   and their frozen revisions, the eight prepared compatibility edits, v2 archive/
   receipt, derived log/disclosures and checked merge record. Include any necessary
   explanatory closeout evidence, but **no support-array edit or live-table change**.
   Source bytes must still give `0ca29eaeebc295b6`; archive and raw records retain
   their original bytes/metadata. Record the measured identity as **`ed2fe50c`,
   dirty**, not as checkpoint A. The orchestrator records the actual A commit ID
   and explicitly releases publication.
4. **Publication is atomic in orchestrator checkpoint B.** The developer prepares:
   - the **15 desired `difficultySupport` lists**, exactly the accepted 79 cells in
     global level order, including S-OD7 withholding; unchanged lists need no
     artificial text edit;
   - **`docs/difficulty-rating/qualification.md`**, composed from the checked
     merged table, not a blind table-body overwrite.

   The live report states the unchanged protocol, **host-active—not strict-quiet—
   environment**, CPU/memory/OS/Node/jobs, measured and publication **source**
   identities, all outcomes/timeouts, S-OD7's separate product restriction and
   **all 39 removals**, plus the two close-miss notes. Preserve the exact
   support-array-only engine diff from A and compute the publication identity
   after those array edits. No solver/default/weight/limit/protocol change is
   part of this exception; never change old shard hashes or rerun the source-checking
   merger against newly published arrays to retag the measurement.

   **STOP for the orchestrator to inspect and commit B.** B contains **only the
   support-array diff and the live report, together**. This reconciles "publish
   offers and support arrays together" with the two-commit split: A publishes
   neither; B changes both in one commit. No unrelated closure edit enters B.
   Record its actual commit ID in subsequent handoff evidence. A/B are provenance
   checkpoints, not final task acceptance, deployment or permission to start MS18d.
5. **Compatibility and MS05b3 population closure.** Audit every level/selector
   affected by the new offers before claiming publication accepted. Map old and
   new public manual populations, fixed diagnostic populations, counts and seed
   recipes explicitly. Standard public generation uses published offers and retains
   unsupported-level refusal coverage. Fixed diagnostic requests are not pruned,
   normalized to another level, re-indexed or exposed in public menus.
   The detailed **step-5 population ruling below is binding**: fixed original
   corpora for diagnostic/cross-level assertions, published-only public
   registrations, and data-only performance-table alignment.

   In particular, Greater-Than's current nine-level assertions at
   **`generator\tests\manual\greater-than.test.js:782,805`**, registration at
   **`:950`** and lazy corpus at **`:199`** need publication compatibility.
   Locate by quoted assertion/function if lines move. Filtering supported levels
   must **not compact `100*(originalLevelIndex+1)+i` seeds**. Apply the same
   public-manual policy to Normal's CV6 as to every other hidden cell; no special
   Normal skip/waiver or 700 ms budget change. Audit other variant-specific
   hard-coded lists too; do not leave MS18e to discover unsupported-level failures.
   Preserve invariant/hit/time assertions, counts within retained populations,
   fixed synthetic/diagnostic cases and original seed derivation.

   Keep and verify all fixed diagnostic requests with restoration in `finally`:
   **mega16 Nightmare 478576959**, **mega16 Hell 1 2422420669**,
   **classic9 Hell 1 seed 3** and **Greater-Than Normal seed 4**. Preserve their
   assertions and existing tiers/timeouts. The current `variants.test.js`
   `realResult` guard is the correct kind of compatibility change; it is not
   permission to omit its now-hidden requests. Retain the quick replay, Player
   result and stored-request initial-notification checks in both languages.
6. **Run the complete manual `variants.test.js` suite, then finish final gates.**
   This continuation explicitly authorizes **all of `--suite=variants`**, not
   merely its two fixed replay requests, and is the narrow AGENTS heavy-test
   exception. It does **not** authorize `--all`, a blanket `--manual`, browser runs
   or the rest of final GD/deep. Inventory the full selection after publication and
   audit it through disjoint **whole-test** shards, every selected test accounted
   for once, each preflighted within ordinary 450/540 protection through
   `Invoke-Dv3Node`. Keep selected/result IDs, actual exits and source identities
   under **`evidence\MS18c\closure\manual-variants\`**. Do not introduce skips,
   shorten corpora, split a request/compound assertion, or use the GQ deadline.
   An inadmissible or failed shard keeps its real status and named S-OD4 disposition;
   never claim omitted coverage or a failed gate passed. An inventory or an
   unexecuted gap does not satisfy complete-suite execution; unresolved gaps are
   explicit unmet coverage in the final review, not a silent handoff/deferment.

   Complete the existing E route **5 wires -> 14 analyses -> 520 hashes**, all
   merge-checks and **all-40 GH check-only**; no expected-hash/help/fixture rewrite.
   Finish bilingual guides/designs, actual counts, population dispositions and
   fingerprinted inputs **before the final evidence that depends on them**.
   Then both complete bounded quick sets, unchanged CI group/tier/factor rules,
   measured projection updates by the existing rule, final CI metadata and matching-
   head CI. If guides/tests change after a manual/quick/E run, replace affected
   evidence or prove compatibility by the existing exact-diff rules; no retagging.
   Full remaining GD/deep and the three MS07f `perf` ratio cases remain MS18e;
   it reconciles this complete `variants` coverage and its fixed replay case by
   final-source identity instead of blindly repeating unchanged expensive work.

   Any unexpected output change means **STOP and QUESTION before any corrective
   source/test/fixture/doc/canonical write, accepting the changed output or
   continuing dependent publication**. Preserving the raw failure output/logs is
   still required; do not suppress a failure or adjust a threshold/fixture to make
   it pass. Correctness/evidence corruption or a change
   to a recorded decision retains its existing stop. Availability/cost findings
   keep named numbers and owners under S-OD4.
7. **Close items and STOP for SA1 final review.** Supply the complete item register:
   S-AV01 **not offered**; S-AV05/06 **S-OD7**; S-AV27's final-GQ gap **closed**;
   IR17 **carried**; **MS18c-GQ-ENGINE-COST open to MS18d**; all other inherited
   findings retain evidence and dispositions. Re-verify `outputs-sha256-gq.txt`
   and the v2 archive, report the actual A/B commit IDs, measured/publication/final
   identities, whole-suite coverage, E/GH/quick/CI results and disclosures.
   The owner report goes **through the orchestrator**; do not ask about ordinary
   hidden/close-miss verdicts or reopen Fable's untriggered Normal choice.

   **All implementation/closure commits remain orchestrator-owned.** Additional
   closure commit(s) may hold the coupled manual/test/docs changes and new evidence
   after B, kept separate from B's support/report-only diff; no frozen GQ file
   changes. These checkpoint commits do not check off MS18c. Final SA1 review,
   matching-head CI and orchestrator acceptance must complete before MS18d starts.
   SA2's current and later task-pack commits contain **pack files only**.

## Step 5 joint population ruling — 2026-11-19

Authority: the orchestrator's **2026-11-19T07:58:15.855+07:00** relay records SA1
and SA2 agreement on cases 1-3 and recovery-profile scope. For case 4, **SA2 adopts
SA1's data-conformance rule and the two explicit public smoke-cell substitutions**.
This supersedes SA2's earlier proposal to retain hidden targets and rewrite the
consistency assertion. There is one rule below, not an implementer choice.
SA1's final AGREE on this amendment and the orchestrator's resume still precede
implementation; the same developer **`5fe8b2d2`** continues without Git writes.

### Public registrations versus fixed diagnostic corpora

The five suites are **killer, jigsaw, greater-than, extra-regions and wordoku**.
Their corpus membership remains exactly its **pre-B** definition:

| Suite | Fixed diagnostic ladder |
|---|---|
| Killer, Jigsaw, Greater-Than, extra-regions | `veryEasy, easy, normal, hard, expert, master, nightmare, hell1, hell2` |
| Wordoku | `veryEasy, easy, normal, hard, expert, master, nightmare, hell1` — eight, not nine |

**Killer must stop taking its corpus levels from live `DEF.difficultySupport`
(currently line 23).** Replace that corpus definition with its constant pre-B
nine-level list. Do not assign those nine levels back to the product definition.
The other four fixed ladders remain unchanged. Preserve every original count,
level index, seed, variant option, trace mode, selection order and derived-state
RNG recipe; do not extend a smaller witness to a new larger population.

Build a now-hidden diagnostic level only inside a **per-call
`withRequestedLevel` restoring guard**, including any normalization before the
pipeline call. Restore the exact previous support array on success, error or
validation failure. Do not hold an entire suite's public support open or expose
diagnostic levels in menus. Keep corpora lazy; listing/registration is not a
generation campaign.

**Per-level public tests** (CV3, per-level I5 hit-rate and generation-budget checks)
register only for the published offers. Filter registrations/views, **not the
fixed diagnostic corpus**. Use original global difficulty indexes for seeds and
predicates, never the positions in the filtered offer list. Unsupported-level
refusals cover the complement of published support in the full nine-level
catalogue, including levels outside Wordoku's diagnostic ladder.
Cross-level engine/soundness/witness assertions still read their original full
diagnostic populations, not a truncated public view.

The generic **`SG.test.lazyCorpus` callback contract does not change**: its index
belongs to the supplied key array. Correct original-global-index handling in the
manual builders/adapters and their request plans, not by changing the shared
generic helper or weakening its tests.
The five suite adapters' corpus/read/all request plans therefore use their fixed
nine/eight-level diagnostic keys, while registration plans use published offers.
The generic **`variants`** adapter keeps its own public-support population; do not
globally force all six adapters onto a nine-level corpus.

### Case 1 — A: unchanged absolute-count witness populations

Retain the original Greater-Than **Normal/Hard/Master 20+10+10 = 40** requests for
`used > 30`, with the same seeds and threshold. `withSign > 50`,
`withSigns > 50`, `ineqChain > 50` and the other original technique-count checks
retain their original cohorts and thresholds even when a smaller population
might happen to satisfy them. No proportional rescaling, dropping or vacuous pass.

Preserve the soundness corpus's original **first-100/even-index selection**, its
30 dense-model cases and derived `900+i` state seeds/order. Do not filter the
public ladder first and thereby change those selections or RNG indexes.

### Case 2 — A: unchanged ladder/trend and hybrid witnesses

Greater-Than clue/sign/score trends keep the original ladder, **VeryEasy/Easy**
anchors and original three-easiest versus three-hardest groups. Do not redefine
those groups as the first/last retained offers.

Extra-regions keeps the original fixed ladder for its cited trend/extra-unit/
hybrid witness checks. `li >= 2` still means the original Normal-and-up indexes;
the hybrid remains **9*8 = 72** requests, with **(9-2)*8 = 56** Normal-and-up
requests, unchanged options/alternation, `50000+100*originalIndex+i` seeds and
**0.7** requirements. Its fixed Easy anchor does not disappear because Easy is
hidden publicly. Elsewhere, genuine per-offered-level registrations still use
the public rule above and original indexes.

### Case 3 — A: unchanged hidden-level diagnostic dependencies

Killer's nine-level corpus remains available to diagnostic consumers, including:

- the **12 Hard + 8 Master** soundness puzzles, five positions per puzzle and
  three techniques, with unchanged `MIN_FIRINGS` **100/100/30**, derived RNG and order;
- `corpusOf('master')[0]` and `corpusOf('hard')[0]`, their original seed-1 requests;
- Hard/Master layout checks (**20+8** requests and the unchanged uniqueness share);
- the original whole-corpus cage-technique use/soundness assertions and thresholds.

Wordoku's `puzzleRun().normal[2]` remains **Normal, seed 302**, with its original
placement/options, trace and assertions. No substitution with an offered level.
Preserve the other already-required fixed diagnostics: mega16 Nightmare
**478576959**, mega16 Hell 1 **2422420669**, classic9 Hell 1 **3** and
Greater-Than Normal **4**, with their original tiers/timeouts.

### Case 4 — keep the consistency assertion; align public performance data

**Keep `manual\perf.test.js`'s existing consistency test (currently lines 45-57)
unchanged**, including its coverage assertions. Do not replace it with a weaker
metadata test or delete failing assertions. The data contract is "one target per
offered cell; null means not offered":

1. In **`generator\tests\fixtures\perf-helper.js`**, change exactly the **39 newly
   hidden** cells' `PERF_TARGETS` row arguments from their old positive targets
   to **`null`**. Keep the 17 previously absent cells absent. The existing `row()`
   omits null-valued keys, so there are **79 positive active targets and 56
   not-offered positions** in the 135-cell layout. Do not retain hidden positive
   entries, set them to zero, change `cells()` to conceal them or change any
   **offered** target value.
2. Make the same 39 cells **not offered** in **`generator/design.md` section 9.1**,
   using its existing missing/null table notation and explaining that it is not
   a numerical zero. All offered numbers stay unchanged. Keep both guide
   languages consistent where they describe this table or its population.
   Preserve the old values in checkpoint B/history and in the population map.
   This is population alignment, **not target recalibration**: MS18d alone owns
   later offered-target arithmetic under its existing rule.
3. Make these **exact** substitutions in the warn-only **`PERF_CELLS`** list:

   | Removed public smoke cell | Replacement |
   |---|---|
   | `greaterThan/normal` | `greaterThan/easy` |
   | `wordoku/normal` | `wordoku/easy` |

   Both are the nearest offered levels, easier on a tie. Record both changes
   explicitly; do **not** leave them as named unresolved MS18d selections or
   silently skip them. This is a declared **public smoke selection** change, not
   normalization of a fixed diagnostic request. Keep **19 unique smoke cells**,
   `PERF_RUNS=5`, the existing `7000+i*101` seeds/trace, targets and warn-only
   behavior unchanged. Do not claim that either hidden Normal measurement now passes.

No changes to `TARGET_LEVELS`, the 520-key regression recipes/expected hashes,
the E/GH populations, the three hard event-cost ratio assertions or any fixed
diagnostic request follow. In particular, Greater-Than Normal's **CV6 base remains
700 ms**; a null public performance cell is not a new millisecond contract or a
Fable trigger. No manual suite's `BUDGET_MS` value changes: hidden public budget
registrations are explicitly removed/mapped, not given different assertions.

In addition to preserving the test, independently verify the exact active cell
set against **published registry support**, not against `cells()`/`PERF_TARGETS`
as their own oracle: all 79 offered keys exactly once with unchanged positive
targets, no hidden key, and every smoke key active. This check is metadata-only.

### Recovery-profile scope — approved narrow diagnostic-identity repair

The current edits to **`tests\fixtures\recovery-profile.js`** and
**`tests\difficulty-recovery.js`**, with their focused tests, are in scope.
Guard `caseOf`'s store normalization, `prepare`'s normalization and the execution/
validation in `profile`. **G13 stays Samurai/Nightmare/42**, never silently Master.
No case's variant, level, seed, options or existing mode-specific attempts/budgets
change (profile's explicit one attempt versus diagnostic's original size default).

Loading **and hashing `tests\fixtures\tool-records.js`** as a tooling dependency
is the honest identity change; do not add it to application/qualifier engine
lists or change a production algorithm. Record **old and new `toolHash`** by the
tool's actual recipe, with source identity and the precise code/dependency diff.
Retag no existing record or fixture. Reconcile older evidence under the existing
source/tool identity and exact-diff compatibility rules; no blanket reuse claim,
profile rerun, new corpus/search or new timing budget is authorized here.
Keep focused proof that the original request survives normalization and that the
support array is restored on success and failure. List this repair in the
population map.

### Verification and ownership — implement now, no unresolved handoff

Before E/final quick/CI closure:

1. Save **`--list-tests` before and after** for the five suites and the affected
   public performance registrations, through `Invoke-Dv3Node`, without running
   those suites. Reconcile against the **pre-B checkpoint A `6a473f7a`** population
   as well as the current pre-edit inventory: Killer already shrank at B, so a
   current-only baseline cannot hide its lost registrations. Use existing
   inventories/read-only reference sources or the sandbox; no checkout/Git write
   or old-source generation is authorized.
2. Write **`evidence\MS18c\closure\population-map.json`** and **`.md`**. For every
   removed public registration record old/new selector or stable ID, variant,
   level, original index, seed range/recipe, count, relevant options/trace and
   its GQ verdict. Classify retained fixed diagnostics separately. Include the
   two public smoke substitutions, all 39 target removals/old values, refusal
   complements and the recovery-profile/toolHash change. No unexplained inventory
   delta, silently missing case, rescaled threshold or relabelled historical pass.
3. Run **sandbox/scripted-pipeline probes**, not live generation, proving:
   - each hidden diagnostic build is inside the per-call guard and preserves its
     actual request tuple; no unsupported-level error or silent normalization;
   - exact support-array restoration after each successful/throwing call, while
     unguarded public hidden requests still refuse;
   - original-index seeds and derived selection/state ordering survive public
     filtering; fix the `manual-corpus` adapters without weakening seed mutation probes;
   - Killer exposes all **nine fixed diagnostic levels** but only its three
     published public levels; Wordoku's diagnostic ladder stays **eight**;
   - the original case-1/2/3 request plans, counts and literal assertions remain,
     including the Killer soundness/layout and Wordoku Normal witnesses;
   - the unchanged perf consistency assertion and independent active-matrix/data
     checks pass, with exactly the two declared smoke substitutions;
   - G13 remains Samurai/Nightmare/42 with the original mode-specific attempts and
     restoring guards, including error paths; the CLI hashes its newly loaded helper.
4. Record selected/result IDs, command exits, helper/source identities and the
   before/after population reconciliation. **No unresolved assertion semantics
   or known empty-corpus/unsupported-level crash may be handed to MS18e.**
   A population map is not permission to leave impossible assertions on truncated data.

Cases 1-3 are **A**, with the public-registration split; **B's rescaling/deletion
of population-dependent diagnostic assertions and C's unresolved-assertion
deferral are rejected**. The map may say
**"policy/implementation resolved; live validation pending MS18e"**, never that
the original real thresholds passed on sandbox data.

Live execution of **killer, jigsaw, greater-than, extra-regions and wordoku** remains
MS18e's existing bounded GD work. This ruling adds no live run of those five or
the `perf` timing/ratio suites to MS18c. It leaves MS18c's complete bounded
`variants` suite and final E/GH/quick/CI obligations intact. All local Node/timed
commands still use `Invoke-Dv3Node` and ordinary **450/540**, not the GQ watchdog.
Keep real later failures as failures under the existing correctness/availability
rules; no future threshold change is pre-approved.

## Historical Stage 2 binding and convergence

The Stage 1 developer finished and stopped at **`42e0d239`**. Both analysts
independently checked the 135 rows, identities and arithmetic, and reproduced the
21/21 fake-data checks and byte-identical planner output at that base. No generation
or GQ was run. The immutable inputs are:

| Preflight file | SHA-256 |
|---|---|
| `gq-cells.json` | `fc9263a21471012eb40fe48c1bc7f2d0009b1fe8d76d945e0a1e74d21546802f` |
| `gq-cells.md` | `50eaffee7f306f1d68d91ad71cf2476249bb9a2ef4cf0b813600a312214045db` |
| `hash-audit.json` | `485fcbef6e825a857decb57647cd37cad8885cf50be8b9cccdd64266a5c13e11` |
| `helpers-sha256.txt` | `317f09004205c91a11f03b25e7f86c542d890dc7f2665ba59cf6f89eb54f5168` |

All four live under `docs\difficulty-v3\evidence\MS18c\preflight\`.
All **18 / 63 / 54** assignments in the 2/10/30-second classes are approved;
P/A/T/O and the source/tool/attempt-policy/Node/machine identities are unchanged.
The 135-row authority is **`tasks\difficulty-v3\MS18c-gq-approved-ceilings.json`**,
not the Stage 1 planner output. Its full identity objects and per-file hashes bind
every row. The original Stage 1 monitor/test result is historical, not proof of
the strengthened Stage 3 monitor below.

### MS18c-S2-SA1-20261118

Source: SA1/Opus's independent Stage 2 response, relayed verbatim by the orchestrator
to SA2 at **2026-11-18T23:49:00.299+07:00**:

> APPROVE all 135 cells as bound in the preflight, with the conditions below.

Those conditions are adopted here: R's lower timing bound; the full host tuple;
bounded readiness; frozen inputs and per-cell premises; the full manifest; Job
Object/detachment stand-ins; supervisor review; one original-cell canary and its
file-only review; complete checked qualification before publication. This is the
actual conditional binding approval, not a claim that the later supervisor or
final-convergence review has already occurred.

### MS18c-S2-SA2-20261118

SA2/Astra, in response to that relay:

> APPROVE all 135 numerical/source bindings. Accept SA1's conditions (a)-(f),
> including R <= W-Q <= 60. Replace my earlier upper-bound-only W-Q ruling.

The previous algebraic upper bound was sufficient for the ceiling calculation,
but insufficient to validate timing provenance. Q is inside W and cannot consume
the pre-creation interval R. A lower-bound failure is invalid timing, not negative
physical overhead to accept or subtract. Preserve the record and stop for joint
review, including whether the request clocks were affected. Negative Q-S alone
still passes; neither residual is clamped. No P/A/T/O or p95 rule changes.

The remaining convergence dispositions are:

| Item | Accepted contract |
|---|---|
| (b) Host | Pin exact .NET StartTime and CIM UTC creation time truncated to microseconds, plus PID/parent/executable/CIM name; ignore .NET ProcessName. Own-supervisor adoption uses explicitly sourced CIM UTC microseconds. |
| (c) Readiness | Each PowerShell/CIM query <=15 s; additionally the cumulative T-start-to-qualifier-create preflight is <=45 s, leaving 15 s inside H for other overhead. A timeout is an unstarted hold, not an eligible additional-consumer re-ask by itself. H remains monitored, not a proven OS scheduling maximum. |
| (d) Canary | `classic4/veryEasy` is the first of the original 135, with the full unchanged protocol and ordinary counters/ceilings. Pause for SA1's file-only check before the remaining 134. It is not a pilot, extra sample or later repeat. |
| (e) Freeze | Freeze the 46 engine files, exact ordered `SOURCE_FILES` declaration, both qualifier files, all policy files, Node and machine. Recompute before every admission. HEAD stays at the base or pack-only descendants throughout GQ; permitted unhashed compatibility/helper edits remain uncommitted until the normal task acceptance boundary. |
| (f) Manifest | Include the epoch, every cell's premises/bounds, all constants/monitor limits/full identities/host parameters, the four preflight hashes, base `42e0d239`, S-OD13/S-OD14 and both approval references. |

The epoch named for the orchestrator's explicit assignment in the release is
**`MS18c-GQ-20261118-01`**. Merely writing that name neither starts an epoch's
payload nor grants the developer permission to allocate/reset one. The orchestrator
adopts this exact value in its release; all later limit/helper/authorization
revisions retain its counters. SA1's final confirmation and the explicit release
are still pending when this convergence is published.

**Envelope accounting correction:** sums P/A/T exclude acquisition and gap
allowances; the summed **O already includes 2700 s per initial admission**. None
is a runtime forecast or includes separately needed re-ask/recovery attempts.
Preserve the Stage 1 files rather than rewriting their historical wording.

## MS18c-Q1 — uniform GQ readiness: S-OD13 selects A

The named Copilot host **PID 1968**, created
**2026-11-13T19:26:33.6916441+07:00**, cannot be made quiescent while this orchestration
session operates. Pentomino is stopped; PID 17588 is idle, not exempt. MS18b's raw
strict screen failed in **40/44** executed commands and passed in **4/44**, despite
zero additional-consumer holds. MS18a had **24/32** executed strict failures and two
transient service holds, both resolved at attempt 2. Aggregate CPU attribution remains
incomplete; these facts do not prove that the CLI alone consumes all non-idle CPU.

It would be inaccurate to say the numerical screen can **never** pass: four did.
But the available environment is not host-quiescent, and occasional lucky windows or
retry-until-green do not establish a uniform strict-quiet 135-cell measurement regime.
S-OD13 now explicitly approves the declared condition; this is not silent inheritance
of MS18b's descriptive-only exception. Waiting asynchronously does not remove the host.

**Binding GQ policy identity: `MS18c-GQ-host-active`.** At Stage 3:

- Obtain the explicit shared slot. Verify the named host instance, own mutex and
  absence of a foreign timing lock before sampling and immediately before the payload.
  Keep the raw five one-second CPU intervals and original mean <=0.5 / max <=1.0
  strict-screen result as `ready`, separately from named-policy `admitted`.
- Keep the **>=0.5 CPU-s per elapsed second** additional-consumer hold and the
  verified per-instance process observations. No OS-service, all-`copilot` or host-tree
  exemption. Known foreign heavy work still blocks; missing required counters or
  identity is not idle. Ordinary identified launcher/sampler work is instrumentation.
- One >=60 s fresh-slot re-ask is permitted only for a verified **unstarted** eligible
  additional-consumer hold: at most two admission attempts within each expressly
  authorized payload slot, across restarts, with distinct immutable records.
  S-OD14 alone can grant the separate recovery slot below; it does not reset the
  primary slot's counters. A second eligible hold stays an unexecuted gap while other approved cells
  may continue. Unknown/mixed reasons, identity/evidence defects or a purported hold
  after payload start retain their existing stop rules.
- **Actual raw generation p95 is binding:** 2/10/30 s budgets, jobs 4, 40/100 seeds,
  the 120000 ms generation guard and hit predicates are unchanged. No CPU subtraction,
  normalization, budget relaxation, miss waiver or faster-repeat selection. Record
  the declared host-active environment on every cell. These times decide offers;
  they are not merely descriptive GS timings or strict-quiet measurements.

The same declared environment supplies the previously specified conditional CV6
readiness in this task, with its original assertion and ordinary **450/540** command
limits. The **GQ-only longer watchdog may not be used for CV6**. No GP timing or
command-limit waiver follows; MS18d retains its own contract.

**Stage 2 host binding:** require PID **1968**, exact .NET StartTime
**`2026-11-13T19:26:33.6916441+07:00`**, CIM CreationDate truncated to microseconds
and normalized to UTC **`2026-11-13T12:26:33.691644Z`**, parent **18780**,
executable **`C:\Users\ledat\AppData\Local\Microsoft\WinGet\Links\copilot.exe`**
and CIM name **`copilot.exe`**. Check both timestamp sources independently; do not
compare their seventh fractional digit or infer a new instance from .NET's renamed
`ProcessName`. Missing/mismatching required fields block admission. A new host
instance needs the orchestrator's recorded full-tuple re-confirmation, never an
automatic PID/name substitution or broad exemption.

Complete Add-Type compilation and identity recomputation **before admission
sampling**, under the applicable lock and outer deadline; no such CPU work during
another payload. Do not retain three independent 30-second readiness calls.
Every PowerShell/CIM query has **<=15 s** timeout and the supervisor also enforces
the **cumulative 45 s** T-start-to-qualifier-create preflight limit, including
sampling and startup. That reserves 15 s of H for other overhead, but the actual
**R<=W-Q<=60** check remains mandatory. A timeout produces an immutable unstarted
hold with its actual reason, releases the slot, and starts no qualifier.
It is not a verified additional-consumer hold and therefore grants no automatic
second admission or recovery. Missing-counter/identity/unknown reasons retain
their review stop. No sampling loop or timeout reset.

## MS18c-Q2 — S-OD13 selects B; ceilings require joint SA1/SA2 approval

### What the current qualifier actually does

At this base, **one variant/level is the smallest supported GQ unit**. `parseArgs`
has no `--from`, seed-count shard, checkpoint or resume flag. `--probe` is explicitly
not qualification. `--merge` combines complete cell records; splitting a cell creates
a duplicate or invalid/incomplete record, not a resumable qualification.
The CLI can select several cells, but batching does not create within-cell checkpoints
or guarantee that workers survive a late expansion. It is not a proof that a slow
cell fits. No padding/dummy requests or whole-matrix command evades the ceiling; a
different routing plan needs its complete bound and measurement semantics reviewed.

The first 40 requests use up to four workers. In a one-cell invocation, workers leave
when the queue drains; if the final first-round result triggers expansion, only that
last worker remains for the **60 serial** requests (S-AV27). `--jobs=4` does not mean
25 waves for all 100. Early stopping is valid only when the actual recorded proof
supports it, with in-flight requests drained; no advance credit from earlier 0/12
samples, predicted non-offering or a previous source's short run.

`out.ms` measures pipeline generation. The independent solution/DFS uniqueness check
runs **after** that timer, before the worker replies: it belongs to command bounds,
not the p95 data. The 120000 ms generation guard is **per request**, not per cell.
The output JSON is published only after the whole invocation completes. A process
kill/worker/IPC failure leaves no valid resumable cell; it is not a hidden verdict.

For illustration, a valid 100-request cell taking **8 s/request** can meet the 10 s
p95 budget yet require about **(40/4 + 60) x 8 = 560 s**, before setup/validation.
It can have 35 first-round hits and 55 further hits, so no early stop saves it.
This is protocol arithmetic, not a measurement: the 540 s ceiling does not bound
all valid qualification executions.

### Evidence available now, not a launch authorization

The six unexecuted MS07e projections remain **556, 1246, 1808, 919, 3957 and 4032 s**
for mega12/Hell 1, mega16/Nightmare, mega16/Hell 1, Greater-Than/Expert,
Greater-Than/Hell 1 and Butterfly/Hell 1 respectively. They are **older-source
projections**, not current-source outcomes or reusable bounds.

File-only current-production cost indicators from the twelve MS18a rows per cell
(same producer as `14d8c903`; different seeds/routes/concurrency from GQ) are:

| Cell | Mean generation s | Observed maximum s | 70 x mean s | 70 x maximum s |
|---|---:|---:|---:|---:|
| classic9 Normal | 0.262 | 1.172 | 18.3 | 82.1 |
| classic9 Nightmare | 1.233 | 5.072 | 86.3 | 355.1 |
| classic9 Hell 1 | 11.247 | 13.475 | 787.3 | 943.2 |
| Killer Hard | 5.360 | 6.538 | 375.2 | 457.7 |
| Killer Expert | 20.296 | 40.274 | 1420.7 | 2819.2 |
| Jigsaw Expert | 6.952 | 13.628 | 486.7 | 954.0 |
| Jigsaw Nightmare | 8.690 | 18.759 | 608.3 | 1313.2 |
| Greater-Than Normal | 3.201 | 7.915 | 224.1 | 554.1 |
| Greater-Than Expert | 8.317 | 16.366 | 582.2 | 1145.6 |
| diagonalX Nightmare | 1.706 | 5.826 | 119.4 | 407.8 |

These are **generation-only scheduling warnings**, not GQ projections fit for admission:
they omit worker startup, validation, variance and jobs-4 effects. Small values do
not authorize a run; large ones show why a blanket <=450 s claim is unsupported.
Do not use C6's diagnostic costs as the production C4 basis. MS07e's 129 completed
cell commands summed to **1523.033 s**, but omit six cells and predate S3; neither
that total nor its early-stopped outcomes bounds the final matrix.

### Chosen route and authority

The owner selected **B**, retaining the current whole-cell qualifier and scheduler.
**SA1/Opus and SA2/Astra jointly choose the per-cell admission and process-tree
ceilings. Fable is not an approver for this route.** Options A/C were not selected.
There is no permission to change seeds, jobs, the serial-round behavior, request
guard, p95 budgets, hit predicates or the complete 135-cell publication rule.

S-OD13 authorizes the exceptional **GQ-only** route, not a particular number.
**Joint agreement:** SA1's cross-review and SA2's corrections were accepted by SA1
as **"AGREE"**, relayed by the orchestrator on **2026-11-18 at 22:42 (+07:00)**.
SA2 finalizes that agreement here, including the agreed monitor, supervision,
operational whitelist and manifest checks. This replaces P1's empirical B4/B1 rule;
P1 remains history in commit `50a06a9c`. It does **not** substitute for Stage 2's
exact source/manifest approval. Other gates retain 450/540, including CV6, E,
GH, GD, GP and quick tests.

### Agreed structural ceiling rule — seconds, GQ only

Use the existing board budget **b = 2 / 10 / 30 s**, and these global allowances:

- **H=60 s, D=10 s, V=10 s, epsilon=1 s**.
- Planning charges **G=120+D+V+epsilon=141 s** and **F_b=b+V+epsilon=b+11 s**.
- **P_i = H + 6*G + 65*F_b**.
- **R30(x)=30*ceil(x/30)**; **A_i=R30(P_i)** and **T_i=R30(1.25*A_i)**.

| Board budget b | P | Admission A | Process-tree T | Outer O=T+2700 |
|---:|---:|---:|---:|---:|
| 2 s | 1751 s | 1770 s | 2220 s | 4920 s |
| 10 s | 2271 s | 2280 s | 2850 s | 5550 s |
| 30 s | 3571 s | 3600 s | 4500 s | 7200 s |

These are **conditional planning envelopes, not runtime forecasts**. T is the hard
elapsed-wall watchdog, never a CPU-time limit. The earlier **A<=9600 / T<=12000**
remain outer caps only: no cell is assigned those maxima or an arbitrary value
between them. Every current manifest cell maps to the table above. No cell lacks a
class solely because a current-source pilot/turnaround sample is absent.
Unknown identity/protocol/board-budget/supervision facts still prevent admission.

**Why this is not advance early-stop credit.** This is a worst-case proof covering
every path of the unchanged single-cell/default-early-stop scheduler, not a forecast
of hits, a guessed failure or permission to omit requests:

- A first-round stop/no expansion is bounded by **3G+7.75F**: at most nine slow
  outcomes including in-flight completions, with four-worker greedy dispatch.
- If round 2 runs, the first forty have **k<=5** slow outcomes. With k=0 the bound
  is **6G+64F**. For 1<=k<=5 it is
  **(6.75-0.75k)G + (64+0.75k)F**, maximized at k=1 because G>=F, hence
  **6G+64.75F**. Round up to 65F.
- Miss-based stopping can only shorten these paths. Actual early-stop proof and
  in-flight accounting remain mandatory; no unexecuted cell becomes hidden.

### Agreed runtime monitor — no per-request V claim

The allowances are checked on each completed cell. Unchanged validation code or
small old residuals do not prove a future per-request validation maximum. In
particular, noncritical validation can be hidden behind another worker's generation.
**Do not describe V as a measured/per-request cap or modify the qualifier to enforce it.**

Keep the qualifier and its raw output unchanged. Define, in seconds:

- **Q:** unrounded `finished - started` from the qualifier record, not its rounded
  `seconds` field.
- **S:** simulate index-order first-round dispatch on four workers **all ready at
  once**, using the recorded generation `ms`; add the recorded second-round
  generation times serially (the existing descending-index dispatch).
- **W:** the supervisor's monotonic T-clock, from creation of the owned Node launcher
  after lock acquisition until the owned payload tree has exited. It includes
  readiness, launch/loading and final output, but not acquisition waits or gaps.
- **R:** the same supervisor monotonic clock's elapsed interval from T-start to
  the qualifier-creation boundary, before qualifier execution. Record that boundary,
  not a delayed observer/IPC receipt. R must be finite and satisfy **0<=R<=W**;
  its provenance and clock alignment are proved with the Stage 3 stand-ins.

Before any next cell, require:

1. Every outcome's finite, non-negative **`ms <=130000`**, successful or errored,
   not only timeout outcomes. D is an overshoot allowance, not a new request guard.
2. The actual protocol/structural counts: at most **5 slow outcomes with no stop**,
   at most **9 at a first-round stop**, and at most **6 in total if round 2 ran**,
   with at most 5 in round 1 before expansion. Require the cell record's
   **cellCount, budget (milliseconds) and attempts** to equal the manifest row.
   Invoke existing canonical validation, including `qualificationRecords.checkCell`
   with manifest-derived expectations, and validate all header/round/key/seed/hit/
   summary requirements. The reference monitor's optional validation callback is
   not a substitute for this mandatory runtime validation.
3. **Q-S <= V+epsilon = 11 s**, **R <= W-Q <= H = 60 s**, and **W <= A_i**.
   Reject invalid timing/record data. Negative Q-S stays recorded and passes its
   upper-bound check; **W-Q<R, including any negative W-Q, is invalid timing**.
   Preserve both residuals without clamping, subtraction or p95 adjustment.

This Stage 2 provenance check supersedes the earlier upper-only W-Q rule.
Stage 3 must revise the reference monitor/tests before any real cell: preserve
the original Stage 1 helper bytes/logs, freeze the corrected Stage 3 revision,
test missing/nonfinite/negative R, equality and either side of R/60, and show that
negative Q-S still passes. The old 21/21 result is not claimed for these new checks.
Also test the three per-cell premise mismatches and compulsory canonical validation.

Q-S is an **aggregate net residual**, not a validation timer. It includes
post-`started` startup: the four worker forks plus `engineInfo()` Git calls/hashing,
as well as validation, IPC and the difference between actual scheduling and S's
all-ready simulation. A breach triggers joint review; it does not itself prove
that validation exceeded V. SA1's MS07e recheck found unrounded Q-S **0.47-0.78 s**
in its 129 older-source shards, with byte-identical validation code; that is context,
not the proof or a current-source measurement.

The checks are sufficient without assuming per-request V: generation-only S obeys
**S <= 6*(120+D)+65*b** by the same structural count argument. The aggregate checks
give **W <= H+S+V+epsilon**, which is tighter than the agreed P. The live T watchdog
is the backstop if a request or process does not finish and no monitor record exists.

Any allowance, structural or timing-data breach stops subsequent GQ for joint
Stage 2 review. Retain a completed record, never rerun it to improve its result.
A p95 miss within the approved execution contract is an ordinary hidden verdict;
it does not trigger a new ceiling. Nothing here changes the 120000 ms request
guard, p95 budgets or hit predicates.

### MS18c-Q3 — S-OD14 selects B: one prior-authorized recovery

The question was reported posted at about 22:38. **Owner, Discord author
`amicably8850`, 2026-11-18 23:05:53 (+07:00), verbatim:**

> Q3: chọn B

The answer and scope are archived in `clarifications-resolved.md`, **S-OD14**.
The Q3 owner-answer precondition is now satisfied. This does **not** release Stage 3
before Stage 2, authorize a recovery in advance, or expand/restart the running
file-only Stage 1 work. The analysts bind S-OD14 in the final Stage 2 manifest.

#### Eligibility and adoption come before recovery

- At most **one recovery payload opportunity per logical GQ cell**, after T-kill,
  worker/supervisor fault or session loss, **only with no complete cell record** and
  a prior joint SA1/SA2 diagnosis/authorization. Nothing retries automatically.
- First inspect the durable status and actual supervisor/job identity. If the
  matching supervisor is still running, **adopt and wait for that same run** with
  its unchanged deadline. A lost agent, missing heartbeat or unavailable shell is
  not permission to start another supervisor/payload. Prove the prior instance is
  terminated and no owned process remains before authorizing recovery; only the
  orchestrator performs verified dead-own-lock cleanup.
- A complete record includes a full required round **or a valid protocol-proved
  early stop**, even with fewer than forty outcomes. Hidden verdicts and captured
  request timeouts/errors in a complete record are not failed execution attempts.
  A completed record needing correctness, monitor or publication review is also
  **never rerun**. Recover/adopt existing evidence instead.
- Inspect all attempt outputs and partial files, not just the canonical merge path.
  Missing JSON does not prove that no measured work occurred. Corrupt/ambiguous
  evidence is a review stop, not automatic eligibility. A reconstructible complete
  record must be recovered/reviewed rather than regenerated. Correctness failures
  cannot be erased through this rule.
- Exhausted ordinary CPU admission holds, a missing approval, rejected source/
  protocol facts or a desired faster/better result are **not** recovery faults.
  Do not relabel them as a supervisor failure to obtain more admission checks.

#### Separate, durable counters — no implicit reset

The qualification epoch is allocated by the orchestrator in the Stage 2 manifest,
not by a developer/restart. The stable counter key is **epoch + variant/level**,
with the entire frozen qualification input tuple checked for consistency. Numeric
manifest revisions, helper fixes, filenames, supervisor PIDs and agent changes do
not create a new cell or replenish any counter.

| Counter | Allowed values and consumption |
|---|---|
| Payload slot | **1 = primary; 2 = the single recovery**. Slot 2 exists only after the committed case-specific joint authorization below. No slot 3. |
| Recovery authorization | At most one for that cell/epoch. Claim it durably before slot-2 admission 1; an eligible admission 2 continues **that same claim**, not a fresh authorization. Exhaustion/failure does not permit another grant under a new name. |
| Admission ordinal | **1 or 2 within a given authorized payload slot**. Ordinal 2 is allowed only after the unchanged eligible unstarted CPU hold and >=60 s after release. Count from all retained attempts across restarts. |
| Payload launch | Reserve/journal the launch slot **before creating the qualifier process**, then record actual PID/creation/start or positive no-start evidence. A launch intent consumes the opportunity even if creation fails/is uncertain; do not roll it back or reuse that slot as an unstarted CPU hold. |
| Adoption | Continues the existing run/ordinal/deadline and consumes no new admission or payload slot. |

Slot 2's authorization must **explicitly grant its separate two-admission budget**;
this is not resetting slot 1. Thus the absolute maximum is **two payload opportunities
and four admission attempts** per cell/epoch, with at most one qualifying payload
start in each slot. A CPU hold consumes an admission ordinal, not a payload start.
Two CPU holds in the primary slot do not authorize a recovery slot. A recovery whose
own two admissions are held is exhausted even though its payload never started.
Once a qualifier-launch intent exists in a slot, any unused admission ordinal in
that slot cannot be used to rerun it. An admission-2 continuation is possible only
after an eligible admission-1 CPU hold with **no** qualifier-launch intent.

All reservations, transitions, identities and outcomes are append-only/immutable
history; a restarted driver reconstructs them rather than renumbering. Do not start
a fresh primary run, change epoch or rename an attempt to escape a used slot.

#### Attempt paths and unchanged logical payload

Use distinct paths from the first primary attempt onward, outside the merge folder:

```text
docs\difficulty-v3\evidence\MS18c\runs\<variant>-<level>\payload-1\admission-1\
docs\difficulty-v3\evidence\MS18c\runs\<variant>-<level>\payload-1\admission-2\
docs\difficulty-v3\evidence\MS18c\runs\<variant>-<level>\payload-2\admission-1\
docs\difficulty-v3\evidence\MS18c\runs\<variant>-<level>\payload-2\admission-2\
```

Each used directory retains `status.json`, `events.jsonl`, `readiness.json`,
`supervisor.log`, `stdout.txt`, `stderr.txt`, and any `qualifier.json` /
`qualifier.md` / partial files. No prior attempt or immutable output is overwritten;
the prescribed atomic live-status updates are backed by append-only events.
An existing ambiguous attempt is investigated, not replaced.

For example, the first recovery admission for classic9 Hell 1 writes to
`runs\classic9-hell1\payload-2\admission-1\` and uses that directory's qualifier
output paths. **Only administrative run/attempt IDs and artifact paths differ**:
the producer/qualifier/attempt-policy source, variant/level/default options, seed
base/derivation, jobs, early-stop protocol, guard, budgets, Node and machine remain
the same. Record actual Git commits; a pack-only authorization commit does not change
the qualified source and is not a reason to retag old metadata.

After a complete record passes the required source/protocol/correctness/monitor
checks (or its retained review is explicitly resolved), **copy its raw bytes once**
to `evidence\MS18c\qualification\<variant>-<level>.json` and its Markdown counterpart.
Keep an acceptance receipt under `runs\<cell>\` identifying the original path,
payload/admission ordinal and hashes. Do not overwrite an existing complete
canonical record. Plans/status/receipts/failed attempts stay outside the merge folder.
No stitching of primary/recovery rows, averaging of their times or selection between
completed results; the actual qualifying record may correctly be **hidden**.
If more than one completed record appears, stop for evidence review; do not select one.
A resolved metadata/bound review cannot waive invalid/non-unique puzzles, unsound
classification or missing required outcomes; the existing zero-invalid publication
condition still applies.

#### Joint diagnosis and authorization required before slot 2

The developer may prepare a **proposal**, not an approval, under
`docs\difficulty-v3\evidence\MS18c\recovery\<cell>\diagnosis-r1.json` and `.md`.
Any revision has a new name. The record must include:

1. Epoch/cell and all primary admission/run/supervisor/job identities; original
   approval-manifest blob, frozen input identities, actual A/T/O and timeline.
2. The observed fault class, supporting logs/status/partial-output inventory and
   hashes, remaining uncertainty, and explicit proof of **no complete record**
   after searching/recovering available artifacts. No claim that no work occurred
   merely because no JSON was published.
3. Adoption/termination checks: the prior supervisor instance is dead, its owned
   job/processes are gone and any lock cleanup has the orchestrator's recorded proof.
   If a live or complete run is found, recovery is refused.
4. Why this is an eligible execution/supervision failure rather than a correctness
   failure, ordinary admission exhaustion, changed source or result-driven repeat.
5. The exact unchanged logical payload, all four possible attempt paths, used
   counters, requested recovery slot **2**, its explicit admission budget and the
   intended unchanged approved ceilings. Any supervisor-only repair is separately
   frozen/tested and reviewed for unchanged qualification semantics.

**Both SA1 and SA2 must diagnose and explicitly approve that exact record/hash
before relaunch.** The pack author/orchestrator then commits a case-specific
authorization at **`tasks\difficulty-v3\MS18c-gq-recovery\<cell>.json`** containing
S-OD14, the diagnosis references/hash, primary identifiers, unchanged input/payload
hashes, exact limit-manifest reference, slot/admission ceilings, and **both real
approval references**. No generic all-cell recovery approval and no developer-written
approval. The supervisor requires this file to exist in HEAD and match its committed
blob, just like the main manifest, and claims its one-use grant in the durable
journal. Admission 2 may continue the same recovery claim only while its one
payload-launch opportunity is still unused. Recheck that no earlier live/complete
result appeared before launch.

S-OD14 does **not** raise A/T/O. A changed execution limit requires a separate
joint S-OD13/Stage 2 approval before recovery and is recorded in its authorization.
A supervision-only repair may be approved with new helper hashes; no generator,
qualifier, scheduler, request-guard, hit-rule, raw-clock or machine change is allowed
as a recovery. Such a source/protocol change needs its own assigned work/requalification,
not a counter reset. All original traces and helper versions remain.

#### Second failure: permanent gap

If slot 2 fails without a complete record, or its two admission opportunities are
exhausted, mark **`permanent-gap: recovery-exhausted`** for that cell/epoch.
No third payload, extra admission, new recovery authorization or silent epoch reset.
Preserve both slots and every attempt. A complete recovery record is retained and
never rerun, including hidden/correctness/review outcomes.

Report the permanent gap and its evidence. Other approved independent cells may
continue only after the orchestrator/analysts clear any shared fault or invalidated
bound assumptions. The final matrix remains incomplete and **publication/release
is blocked** by the gap; it is not a hidden qualification verdict.

### Three-stage flow and mandatory stops

**Stage 1 — completed FILE-ONLY developer preflight; historical scope and stop.**

- Allowed in Stage 1: read the accepted records/code, compute source/tool/attempt-policy
  identities, inspect static Node/machine metadata, create a task-owned read-only
  planner and fake-data tests, and produce **exactly 135 rows** under
  `docs/difficulty-v3/evidence/MS18c/preflight/` (`gq-cells.json`, `gq-cells.md` and
  input/hash/outer-deadline audit records). Helpers belong only in this task's
  `generator/tests/artifacts/difficulty-v3/MS18c/` directory.
- **No puzzle generation, GQ/probe/pilot, live admission samples/no-op campaign,
  production/compatibility/test-suite/qualifier edit, archive/publication or long-run
  helper implementation.** Loading declarations for metadata is not permission to
  call a generator, solver or uniqueness checker. Stage 1 uses ordinary 450/540
  protection if a metadata command's cost is unknown or possibly above ten seconds.
- Each row records key/board/default attempts/budget, jobs 4, seed base 20260601,
  40+60/default-early-stop/single-cell premises, exact source/tool/attempt-policy/
  Node/machine identities, method **`MS18c-GQ-structural-v1`**, b/H/D/V/epsilon/G/F,
  and the table-derived P/A/T/O. Verify **18 / 63 / 54** cells in the 2/10/30 s
  classes, **135 unique keys total**. Mark the binding `awaiting Stage 2`, never
  `approved:true`. Unsupported/unknown identity or protocol facts remain explicit
  blockers; missing per-cell timing samples are **not** a blocker under this method.
- Existing timings are descriptive context only, with their real source/configuration/
  clock labels. Do not use C6/other-cap data as default-C4/256 measurements, invent
  validation samples or perform a pilot. The structural constants/table do not vary
  by a developer's assessment of a cell's expected hit rate or cost.
- Fake-data checks cover all three classes/rounding, 135-key completeness, invalid
  premises rejected, structural slow-count cases, signed residuals/timing failures
  and no approval emitted by the planner. They run no solver or live payload.
- Audit the complete deadline chain and the detached-supervision/manifest requirements
  below. Report sums of structural envelopes separately from runtime expectations,
  waits and unresolved capability facts. Format/hash the
  outputs and helper bytes, and **return to the orchestrator and STOP**.
  Do not continue into compatibility work, supervisor implementation or GQ because
  the class numbers are agreed. S-OD14 does not expand or restart Stage 1; the
  running file-only preparation and its actual start metadata remain untouched.

**Stage 2 — SA2 + SA1 joint decision, not a developer phase.**

- Both analysts review the exact preflight hash/source/machine/defaults and the
  binding of all 135 cells to the agreed structural rule. They explicitly approve
  **P_i, A_i, T_i and O_i per cell**, or mark a premise/capability blocker. General
  rule agreement or only one analyst's acceptance is not joint manifest approval.
- Record both approvals and rationale; the pack author/orchestrator publishes an
  immutable source-bound manifest at
  `tasks/difficulty-v3/MS18c-gq-approved-ceilings.json`, in a pack commit. It lists
  all 135 cells, binding status, exact input hashes/machine/Node/policy/method,
  constants, numeric bounds, outer budgets and **both real approval references**.
  Include **S-OD14** and the recovery counters/path/authorization contract before
  marking Stage 3 ready. The orchestrator assigns the stable qualification epoch.
  The published binding and real approval references are recorded above; its
  existence in HEAD and unchanged blob must still be checked. A path name or a
  developer-generated plan alone is not authority.
- Unresolved protocol/identity/capability facts require an explicit analyst disposition. Safe approved
  cells may be authorized while others stay unadmitted, but full publication remains
  blocked by any missing cell. No hidden verdict, extra probe or tooling/protocol
  change follows from an unadmitted row. Fable is not required for these ceilings.
- Q3's owner-answer precondition is satisfied by S-OD14; the binding review above
  is complete, subject to its stated gates. The developer may not fill in either binding approvals or
  a future case-specific recovery authorization.
- The orchestrator relays **both** binding approval and explicit
  Stage 3/slot/GQ-window release under the S-OD13/S-OD14 contract.
  The developer never writes its own approval, changes the committed limits or
  substitutes the old outer caps for a class ceiling.

**Stage 3 — implement the approved supervision/compatibility, then GQ.**

- Only after Stage 2 binding and explicit release under **S-OD13/S-OD14** may the
  original implementation steps below begin.
  Preserve the shared `Invoke-Dv3Node` for non-GQ work. A task-owned
  **GQ-specific detached supervisor** reads the committed approved cell record,
  verifies its identity and builds only that cell's unchanged `qualify.js --jobs=4` payload.
  No free-form timeout override or use for CV6/quick/E/GP.
- Before any real GQ, test approval lookup/rejection, units, deadline arithmetic,
  admission holds and owned process-tree cleanup using fake clocks/short-lived
  stand-ins, not long generation trials. Format/freeze helpers. Recheck all bound
  inputs after compatibility edits: an engine/tool/attempt-policy/default/Node/
  machine or `SOURCE_FILES` declaration change needs Stage 2 reapproval before GQ. Unrelated
  UI/test/doc edits outside those inputs do not invalidate GQ-bound approval; their
  separate E/quick identity and verification obligations still apply. Keep these
  authorized working-tree edits uncommitted through GQ: HEAD must remain the base
  or pack-only descendants, with every intervening commit checked, not just its
  net diff. Record actual HEAD/dirty metadata; never retag a result.
- Before the first real cell, run the focused `variants-registry` size-parity gate.
  SA1's MS07e built-model records and unchanged variants corroborate the rows;
  current focused verification and every completed cell's manifest-premise check
  still apply. Node is the exact approved `C:\Program Files\nodejs\node.exe`,
  v26.13.0; CI's Node 24 is not a reason to switch it.
- Include focused fake-data recovery checks: live-run adoption; complete/hidden
  record refusal; unchanged counters across restarts/aliases; missing/edited/unclaimed
  authorization refused; separate slot-2 admission budget; a late primary record
  blocking relaunch; partial files preserved; and permanent gap after recovery failure.
  These are Stage 3 checks, not a rewrite of the completed Stage 1 record.
- **STOP for SA1 supervisor review before the first real cell.** Supply the
  implemented supervisor/monitor/journal, frozen helper hashes, focused gates,
  and short-lived capability/adoption/timing stand-in evidence. A failed
  containment/detachment/identity proof blocks GQ; no uncontained fallback.
- After that acceptance and a separate orchestrator GQ-window GO, run
  **`classic4/veryEasy` only**, as the first full-protocol original cell, then
  **STOP again for SA1's file-only check** of the run directory, journal, monitor
  and acceptance receipt. Preserve its result, including a valid hidden verdict;
  never rerun it in the remaining 134. A hold/fault/unresolved review keeps this
  gate closed; use the existing admission/S-OD14 rules, not another canary.
  The orchestrator records the continuation after SA1 accepts it. Monitor or
  evidence failures still require joint review, not an SA1-only waiver.
- Run **one complete cell per supervised payload**, no compound matrix, independently
  detached workers, seed splitting or deadline reset. The supervisor owns wall-clock
  T/O deadlines, Q1 admission and the >=15 s gap. T starts at creation of the owned
  Node launcher after lock acquisition (including suspended assignment/startup) and
  covers readiness, qualifier and workers. A monitor read or agent replacement does
  not create a fresh command or reset a deadline.
- At T_i, terminate the **owned job/process tree**, retain logs/output and report a
  failed/incomplete cell, never a hidden verdict. No automatic retry or raised timeout.
  A no-record failure stops for S-OD14's joint diagnosis; only its committed one-use
  authorization permits slot 2. Any completed record or monitor breach is retained
  for joint review, not rerun. A valid p95 miss within the approved contract
  is an ordinary hidden result.
- At any unresolved gap the full publication gate remains unsatisfied. The 1-12 h
  figure is still historical planning context, not a promised total or per-command
  timeout: sum the actual approved projections plus gaps/waits and report unknowns.

### Historical Stage 3 preparation release text

This was the preparation release, not the current continuation. Its gates and
payloads are now historical; **do not relay it to restart the completed GQ set**.
The post-GQ continuation above requires its own final AGREE and orchestrator release:

> Assign epoch `MS18c-GQ-20261118-01` and release MS18c Stage 3 preparation only
> against the committed approved-ceilings manifest. Complete unhashed compatibility
> work and focused gates, supervision, S-OD14 journaling, the corrected monitor and
> stand-in proofs; freeze helpers. STOP for SA1's supervisor review. Only a separate
> orchestrator GQ-window GO releases `classic4/veryEasy`, once, under the full
> original protocol. STOP for SA1's file-only canary acceptance before the remaining
> 134. No completed-record reruns; S-OD14 governs eligible faults. Archive v2 before
> replacement. Publish only after the complete 135-cell merge has
> `totals.invalid === 0`; then E/GH, both quick sets, CI and final SA1 review.

### Outer waits and `spawnSync` audit — agreed

The accepted MS18b `drive.cjs` uses **`spawnSync(... timeout: 1800000)`** (1800 s).
It cannot be copied unchanged for a longer approved cell. The existing wrapper can
also wait up to **1200 s** for a foreign lock and then up to **1200 s** in the shared
helper for acquisition: do not budget only one wait if both are retained.

Retain the per-admission-attempt envelope **O_i = T_i + 2400 + 300 seconds**:
up to two 20-minute acquisition waits plus 300 s for release settling, ordinary/re-ask
spacing, wrapper startup, output and cleanup. With the agreed table, **O is at most
7200 s (2 h)**; T is at most **4500 s (75 min)**. A single acquisition wait in the
new supervisor is sufficient, but retain this conservative outer allowance rather
than silently dropping a possible wait path. O is not permission to run the payload
past T or to hold the timing lock throughout acquisition waits.

The supervisor enforces its own finite overall O and inner wall-clock T independently
of agent/network liveness. Prefer no redundant `spawnSync` matrix wrapper. If any
outer wrapper is retained, audit its entire deadline/cleanup path: it must allow the
approved O and must not kill only an immediate PowerShell child while leaving workers.
An inherited 1800 s timeout is not acceptable. Record acquisition, readiness,
payload/T-clock, postchecks and overall elapsed time separately.

### Detached supervisor, launch and adoption — approval recorded

The orchestrator explicitly approved a **bounded detached per-cell supervisor** in
the **2026-11-18 22:42 (+07:00)** relay:

> I approve, as orchestrator, a bounded detached per-cell supervisor for Stage 3 GQ cells.

This is operational detachment approval, separate from **S-OD14's** recovery rule
and not permission for an unbounded service. Keep the supervisor alive independently of a lost agent/shell;
detach only this bounded supervisor, never uncontained workers.

- Use a **non-inheritable kill-on-close Windows Job Object** owned by the supervisor.
  Create the Node child suspended, assign it to the job, then resume; no assignment
  race, breakaway flags, inherited job handle or job membership for the CLI host.
  Only the supervisor retains the controlling job handle; an adopting agent does
  not hold another handle open and thereby defeat kill-on-close.
  Descendant qualifier/workers stay in that job. Job containment is not a CPU-time
  limit: T is elapsed wall time. Failed job setup means no payload start, not an
  uncontained fallback. Before any GQ, prove actual nested-job compatibility with
  a short-lived Node parent that forks four Node children, like the qualifier.
  Verify all belong to the supervisor's job and all exit on normal completion,
  T expiry and supervisor loss, including Node's own nested child jobs.
- Prove actual detached stand-in survival after its launching sub-agent has
  completed, then adoption by the orchestrator/another agent using durable status.
  The orchestrator coordinates that handoff; do not infer survival from a single
  continuing shell's read. Record host-job membership/nesting and the launch
  method. Survival after the **main CLI session ends is not required** and must
  not be claimed from this narrower proof; session loss follows S-OD14.
- The supervisor itself verifies the committed contract, identities and Q1 admission,
  enforces the >=15 s gap and any eligible >=60 s re-ask spacing, owns the mutex,
  and enforces T/O. An admission hold releases the slot, writes an unstarted outcome
  and exits. A permitted re-ask is a new bounded admission attempt with a distinct
  run/status/log identity, never an internal unbounded sampling loop.
- Write stdout/stderr, events and all results to project files, not a live shell pipe.
  Atomically maintain a status file containing **run/cell/attempt IDs, supervisor PID
  and process creation time, job identity, approval-manifest blob, input identities,
  policy/method, state, T/O start/deadline information, R's creation boundary,
  output paths and final status**.
  Keep an immutable event/attempt history as well as the latest status.
  For own-supervisor PID/creation matching, name **CIM CreationDate, UTC,
  truncated to microseconds** as the source/precision and unit-test the recorded
  host values and PID-reuse rejection. Do not mix it with .NET's extra fractional digit.
  The GQ node T-clock excludes acquisition/gap time; expose that distinction.
- Before starting another supervisor for a cell, inspect prior status/records.
  A live matching supervisor is **adopted**, not relaunched. A completed record is
  preserved, including hidden/review/correctness outcomes. Missing/corrupt/ambiguous
  status is a stop, never evidence that nothing ran.
  Each supervisor is bound to the stable epoch/cell, payload slot and admission
  ordinal; slot 2 additionally verifies/claims its committed recovery authorization.

**Stage 3 tool launch only, after the script is implemented/tested and gates release:**
call the **powershell tool** with `mode="async", detach=true` and a unique shell ID,
not `Start-Process`, a detached worker loop or a shell backgrounding workaround.
Example tool arguments (not a command to run in Stage 1):

```json
{
  "command": "Set-Location Q:\\git\\sudoku\\generator; & .\\tests\\artifacts\\difficulty-v3\\MS18c\\supervise-gq.ps1 -Cell 'classic4/veryEasy'",
  "description": "Supervise the approved classic4/veryEasy GQ cell",
  "shellId": "ms18c-gq-classic4-veryEasy-p1-a1",
  "mode": "async",
  "detach": true
}
```

The supervisor derives/validates the payload slot and admission ordinal from durable
history and any one-use recovery authorization; the shell ID is not authority to
choose/reset either. Verify the detached process is running/responding through
its fresh status file and matching PID **plus creation time**, or observe its explicit
terminal outcome. Do not launch a replacement because tool output is delayed.

The orchestrator confirms the GQ window and monitoring coverage at dispatch.
Poll/read the same shell/status at intervals no longer than **600 s**; a tool response
window is not a process deadline. A new agent reads the durable status, checks the
same PID/creation/run/cell/manifest identity, adopts that supervisor and continues
waiting for its result. Do not rehash the engine or run CPU work during adoption of
an active payload; use its launch verification receipt and small status reads.
If the supervisor has finished, validate/adopt its recorded outcome, never generate
the cell again merely because the original agent disappeared.

Only the **orchestrator** may clear a verified dead **own-run** mutex: establish that
the recorded supervisor instance is dead, no owned job/process remains, and the lock
still identifies that exact run; record the proof and cleanup. Age, a stale heartbeat
or PID alone is insufficient. Never delete a foreign/live/uncertain lock or kill by
process name. Kill-on-close remains effective if the supervisor itself dies.

If detachment approval/capability is unavailable at actual launch, report it before
starting. An explicitly confirmed **attached** fallback must use the same Job Object
and deadlines; session loss then follows S-OD14 after adoption/termination checks.
Never silently fall back to uncontained or orphanable work.

### GQ window and operational whitelist

Before Stage 3 measurement the orchestrator declares: Pentomino stays stopped, no
other timing session, and no competing agent CPU work during each payload.
Developer, orchestrator, SA1 and SA2 do **not** run generation, tests, Node analysis,
hashing, formatting, report aggregation or CPU probes during a payload, even when
previously measured below ten seconds. No repository/input edit during a payload.
Checks and computations run between cells under the appropriate slot/lock.

Explicit operational exceptions:

- The approved qualifier, watchdog, admission-before-payload and minimal durable
  supervision/status bookkeeping.
- Small file/status reads and reviewers viewing or grepping **small** files.
- The existing one-HTTP-GET-per-minute Discord poller (reported **1.1 CPU-s over 5 h**)
  and the 30-minute report's lightweight HTTP send from already available status.
  These are permitted control-plane work, not permission to recompute/aggregate a
  report during the payload or run other Node commands.

The declared CLI-host baseline remains; this does not assert absolute CPU idleness.
**No optional during-payload `os.cpus()` sampler** is added. No observation causes
time subtraction, verdict adjustment or a faster repeat. Record an observed window
violation and return it for review; do not silently discard or replace results.

### Approval manifest and payload lock-down

Before payload launch, the supervisor must require
**`HEAD:tasks/difficulty-v3/MS18c-gq-approved-ceilings.json` to exist** and verify that
`git hash-object` of the working-tree manifest equals that committed blob
(`git rev-parse HEAD:<path>`). Keep `git diff --quiet HEAD -- <manifest>` as an
additional check, never the only check: it can miss an untracked file.
Use normal Git line-ending handling, without an unapproved content filter. Require
both actual analyst binding-approval references and **S-OD14's recorded recovery
policy**. A slot-2 launch also requires its exact committed case-authorization blob,
both diagnosis approvals, the unique claim for that slot, an unused payload-launch
opportunity and the correctly remaining admission ordinal.
An untracked, changed, staged-new, incomplete or self-approved manifest is not authority.

Recompute **qualifier, engine and attempt-policy identities before every admission**,
including an eligible re-ask or authorized recovery, and match the manifest's full
objects, Node executable/version, machine/defaults and single-cell protocol.
Also freeze the **exact ordered `SOURCE_FILES` declaration in `node-runner.js`**:
its raw CRLF declaration bytes from `const SOURCE_FILES = [` through `];`
(inclusive, no following newline) are **1988 bytes**,
SHA-256 **`33d0cf43adf0a99471193bf5d2024173fc4a57f87ae0a48a9730bae25efefff4`**.
Its 64 entries and the resulting 46 engine files are in the manifest.
Missing input files fail closed, even though the qualifier's legacy loader skips them.
Check ancestry from **`42e0d239bc8b9b8bd66a2d868ccc8601d8b0d5e4`** and
pack-only changes in every intervening commit. An application/helper commit or
changed frozen input before GQ completion requires re-derived rows and joint
Stage 2 reapproval; it is not excused by an unchanged net diff or a reverted edit.
Authorized unhashed UI/locale/test/helper working-tree edits are distinct from
committed ancestry and do not by themselves change the qualified source.
Do these checks before admission sampling, never during an active payload.
Preserve the frozen Stage 1 preflight; its `--check` is tied to its recorded HEAD,
not a command to rewrite it to every pack descendant.

Build the payload from the approved entry: one variant, one level, **`--jobs=4`**,
default early stop and the fixed per-slot/per-admission output-path template.
Refuse `--no-early-stop`, `--probe`,
multi-cell lists, seed/count shards, cap/window/attempt overrides, arbitrary preloads
and every timeout override. The developer supplies no A/T/O value.
Only the committed class binding and approved contract control the supervisor.

## Inputs & context

R24, verbatim:

> MS18 first copies the existing v2 live table to `docs/difficulty-v3/qualification-v2.md`, preserving
> that historical record. It then updates `docs/difficulty-rating/qualification.md` in place with
> the final v3 table and updates the variant `difficultySupport` lists together.

Use Q's 15 variants x 9 levels, jobs 4, base 20260601, 40/100 seeds, exact+valid+solved+not-approximate
hits and original p95 budgets. No diagnostic overrides or --probe. MS07d merge rejects incomplete/
mixed records. Captured request errors/timeouts remain misses; worker/IPC loss is a failed run.
Only after complete validation derive offered arrays, preserving global level order and S-OD7.
Use r5p's **board-default attempts**, never an explicit eight-attempt qualifier override.

**Timed-run readiness:** S-OD13 approves `MS18c-GQ-host-active`; Q3 is resolved by
S-OD14. Execution still requires the exact Stage 2 binding and Stage 3 release;
each recovery separately requires the committed prior joint authorization.
No new qualification sharding, scheduler
change or altered jobs/40-100 protocol is authorized. Keep observations/waits separate
from raw request times. Plans precede phases, owned helpers are formatted before
freezing, and S-OD12/S0 plus the QUESTION pause remain binding.

**S-OD4 (c1), required for every offer:** at least 36 exact hits of 40 or 90 of 100 and p95 within
2/10/30 seconds for <=36/<=81/>81 cells. A bounded fallback, shallow result or timeout is a miss;
none keeps mega Nightmare/Hell or any other cell offered. A protocol-valid hidden verdict is
an accepted product outcome. Do not ask for a waiver before applying it, even for large grids.
Any proposal to retain an unqualified cell or raise a budget would change a recorded decision.
An invalid/non-unique puzzle, unsound proof or wrong exact flag/warning is a correctness stop,
not an availability miss that can be excused by hiding its cell.

**S-OD7 — Killer Hard/Expert stay hidden until later calibration.** The owner answered
Q-MS07e-1 on 2026-11-15 at 14:42 through `ask_user` and email: no Killer weight recalibration
inside v3. MS07e observed Hard 0/14 exact (p95 6.6 s) and Expert 1/14 (p95 17.8 s).
This is the recorded disposition of S-AV05/S-AV06, not another pending calibration question.
Keep both cells in the full final 135-cell protocol. Preserve the checked raw qualifier records,
including any later passing verdict; publish both levels as **hidden until later calibration
(S-OD7)** and record that owner withholding separately from qualification. If a raw cell qualifies,
do not falsify its raw `offered` verdict to make the product decision look like a qualification
failure, or re-offer it contrary to S-OD7. The live report distinguishes qualification from actual
offers; the latter match `difficultySupport`. No other cell receives this exclusion, no
unqualified cell is offered, and no interim publication or in-v3 weight change is authorized.

**Final-soak zero-exact observations:** MS18a classic9 Hell 1 was **0/12**, all shallow,
eight attempts each. Killer Hard/Expert were **0/12 at every MS18b cap** (the same
twelve keys per setting, not 48 independent seeds). Hidden qualification is expected
on these observations, not pre-assigned. Run all three cells under the complete final
protocol once admissible; retain exact/shallow/error/time counts and any valid early-stop
proof. Classic9 Hell 1 is offered **only if** its actual final qualification passes;
there is no separate owner veto for it. Killer Hard/Expert remain withheld under S-OD7
even if their raw GQ verdict passes. Report these distinct outcomes and every removal
to the owner; zeros or hidden verdicts alone need no new tuning/retention question.
An unexecuted cell is neither 0/N nor a hidden verdict.

**PR-S2 remark — expected outcome under the existing rule, not a new decision.**
Fable's answer (`92a7693`, `docs/difficulty-v3/clarifications-resolved.md`) confirms that cells
missing the exact-hit threshold or their p95 budget are not offered: 36 of 40 exact hits, or
90 of 100 where the existing protocol extends the cell, and p95 within the applicable budget.
On the present numbers, non-offering is likely for **mega16 Nightmare** and possible for the other
large-board Nightmare cells. This is an expectation, not a verdict assigned before final measurement:
use the complete final qualification, keep the 40/100 protocol and do not prune early or grant a waiver.
A hidden cell can be the honest v3 release outcome. The separately saved
`docs/improve-generating/plan.md` is not authorized now and is not a prerequisite for publication.

**IR17 — GD timing handoff (recovery source `00647f9`).** The classic9 GD Nightmare batch took
430.5 s, about 96% of the 450 s planning budget and 80% of the 540 s ceiling. Any rerun must
state a current-source projection with an explicit conservative margin for the whole command;
**449 s is not a reusable bound**. If no credible margin fits within 450 s, treat it as a
population above 450 s and follow the existing named unexecuted-item rule, without changing
counts or guards. Carry this warning and the current projection/margin to MS18e if Nightmare
remains offered. This does not add a GD run to MS18c or replace GQ's separate 40/100 protocol.

Reconcile all inherited availability items (including S-OD7's Killer disposition and large-grid
Nightmare/hell1) with final verdicts. A hidden verdict needs no calibration to be legitimate.
Route remaining cost findings to MS18d; include the complete item list for MS18e.

**Q-MS07e-2 / S-AV27 — final gap closed; historical route retained.** All six
now have complete, accepted MS18c records and hidden-on-time verdicts. The serial
second-round behavior and the old checkpoint's incompleteness remain facts, not
repaired history. The following explains the route that was approved and executed;
it is not a request for another run. MS07e's section 4
left mega12/hell1 (556 s), mega16/nightmare (1,246 s), mega16/hell1 (1,808 s),
greaterThan/expert (919 s), greaterThan/hell1 (3,957 s) and butterfly/hell1 (4,032 s)
unexecuted; those are that source's projections, not measured qualification verdicts.
SA2 routed them here without reopening MS07e or requesting a rule amendment. Reassess
using authorized final-source evidence, including the first round at four workers, any possible
60-request **serial** second round, startup and variance margin. **S-OD13 now permits
the GQ-only joint-approved A_i/T_i route** in place of the old 450/540 limit for those
cells actually approved at Stage 2. Until that approval, no GQ launch is permitted.
Protocol-proved early stopping within a run is still valid, but no advance early-stop
credit, changed jobs, scheduler repair or new evidence class is authorized.
Keep all six cells in the required final matrix.
If a complete bounded route remains unavailable, continue safe work and report an unsatisfied
publication gate; do not infer hidden verdicts, discard cells or publish a partial matrix.
The owner's route decision is recorded; **SA1 and SA2**, not Fable or the developer,
must settle each numeric bound before launch. The complete-publication requirement
and honest-gap disposition are unchanged.

### CV6-05 — the three fixed S-AV01 endings, before MS18d timing

**Current ending:** the complete accepted final set hides Greater-Than Normal:
40/40 hits, p95 **10,192.4051 ms > 10,000 ms**. S-AV01 therefore closes **"not offered"**.
The Fable trigger is **not met**. No separate Normal CV6 run/budget change is assigned
by this continuation; its public-manual case receives the same audited population
treatment as every hidden cell. Keep Greater-Than Normal seed 4 as a fixed diagnostic.
The alternatives below remain the recorded decision framework, not open choices.

The sign pool was measured and set aside; Greater-Than uses its restored first-allowed sign
pass. S-AV01 entered final work open at 5,209 ms against 1,400 ms on CV6's seeds and 10.6 s p95
on 7000-7039. These are historical cohorts, not qualification verdicts. Normal's CV6 base
remains 700 ms and GP rules stay unchanged until the specific decision below.

- If Normal fails final qualification, hide it by (c1), close S-AV01 as **"not offered"**, and
  record its CV6 case's treatment with the same hidden-cell manual population policy as every
  other cell. No Normal-specific exception, skipped assertion or diagnostic request loss.
- If Normal qualifies, obtain its **final-source CV6 result** before the MS18d handoff: retain
  compatible existing evidence or run only the unchanged Normal CV6 selector below. If it still
  fails, return the final-source numbers through the orchestrator to the plan author under
  CV6-05, before MS18d's final timing runs. Do not select a budget in this task.
  The decided contract's form is fixed: one base value in milliseconds for `BUDGET_MS.normal`,
  the same base for a Greater-Than Normal GP target if GP has one, factor application only
  through `SG.test.timeLimit`, and no base above **10,000 ms** (Expert/qualification budget).
  The test, corresponding GP target, `generator/design.md` section 9.1 (the `greaterThan` Normal
  cell) and both developer guides change in the same assigned contract step. Until the recorded
  decision, 700 ms stands; qualification does not make CV6 pass.
- If CV6 passes on the final source, close S-AV01 with that measurement, not an inferred waiver.

This conditional single-cell check does not move full GD from MS18e. Preserve raw old-contract
failures and source identities if a contract is subsequently changed; the final audit must not
relabel them as new-contract passes. If no bounded complete final-source CV6 record can be
obtained, keep the missing evidence/item explicit and resolve the contract handoff through the
orchestrator before final GP; continue independent publication/audit work, not an unsafe command.

S-AV16 and S-AV17 remain withdrawn as current-source pool regressions, with their observations
retained as history. Any later regression has its own originating task/source and named item.

### Publication and diagnostic compatibility

**Freeze and directory discipline.** The accepted qualification inputs are now
immutable; the post-GQ inventory is the first continuation action. Record the
qualifier's measured source/tool/attempt-policy identities separately from publication
and final quick/E identities. Keep only the once-promoted cell JSON/Markdown pairs in
`evidence/MS18c/qualification/`; plans, readiness, logs and receipts stay in their
original locations. The official JSON/Markdown merge pair goes only under
**`evidence\MS18c\merge\`**. A held admission is not a cell record. Do not overwrite,
move, format or retag a failed/completed attempt to obtain a new time.

The qualifier's --markdown writes a table BODY. Render to an evidence file, then compose the live
report with protocol, machine/Node/jobs/source, complete table and removals; do not erase its
explanatory metadata by blindly replacing it with the table body.
Record measured source identity and publication identity separately. Support-array-only changes
after measurement are documented: qualification already enables every level in its workers.
Any solver/algorithm change invalidates qualification, unlike that declared publication step.

Merge/validate the complete matrix **before** changing the support arrays. The merge
checks the current `engine.sources`; support-only publication changes that hash too.
Keep the pre-publication checked merge, raw shard hashes and source manifest, with
the exact support-array-only diff and sufficient preserved inputs/diff to independently
verify that identity. Do not change old hashes or bypass the merger's source check
after publication. A real generation/default/protocol change is not this exception.

**Exit 0 alone is insufficient:** at `14d8c903`, a structurally valid merge can return
0 while printing a CORRECTNESS warning when `totals.invalid > 0`. Require an explicit
**`totals.invalid === 0`**, inspect every request's validity/error status and all other
correctness conditions before publication. An invalid/non-unique puzzle is a stop,
not an ordinary hidden verdict or an error that withholding a level can excuse.
Captured generation errors/timeouts still count as misses under the unchanged protocol.

The actual v2 live file was already archived byte-for-byte and verified, with the
receipt under `evidence\MS18c\v2-archive.md`. Preserve it and its SHA-256 above.
It is the October v2 record (different recorded CPU/Node), not MS07e's partial
checkpoint or a newly composed v2 table. Never overwrite this existing archive.

Fixed regression/replay corpora remain all original keys/recipes. MS03a/d tooling temporarily
enables hidden requested levels. Apply the same diagnostic-only guard around the quick replay
loader's toConfig/pipeline call, restoring the original array in finally. This also covers
Generator `player.realResult`, `steps.result` and the S-OD8/MS07f manual `variants` replay helper: its fixed
mega16 Nightmare seed 478576959 and Hell 1 seed 2422420669 survive unchanged even if hidden,
as does the quick classic9 Hell 1 seed 3. Do not change requests/assertions, silently normalize
them to another offered level, skip them because of their tier or advertise hidden levels again.
`steps.result` includes Greater-Than Normal seed 4; if Normal is hidden, this remains
a fixed diagnostic request, not permission to normalize it to a different level.

Anchors verified at **`14d8c903`**: `qualify.js:132` (`parseArgs`), `:175`
(`sourceFiles`), `:208` (`child`), `:223` (`out.ms`), `:237` (DFS validation),
`:251` (`hitOf`), `:260` (`sourcesHash`), `:280` (`qualifierHash`), `:294`
(`attemptPolicy`), `:334` (`parent`), `:385` (`certain`), `:399` (`afterResult`),
`:460` (`next`), `:553` (`publish`), `:624` (`mergeShards`).
`fixtures/qualification-records.js:35` holds PROTOCOL, `:316` checks a cell and `:475`
merges the full matrix. Quick loaders remain `replay.entry:22`, `steps.golden:41`,
`steps.result:17`, Generator `player.goldenResult:29` and `player.realResult:19`; the manual fixed
`variants` replay helper is at `:793`, with the two seeds at `:849`.
`store.closestSupportedLevel:186`, `normalize:209`, `load:728`, app `store.load:1193`
before `controls.mount:1233`, and the controls subscription at `:927` establish the
startup problem. Explicit pipeline refusal is `pipeline.js:67`. Locate by symbol
if an authorized earlier task changes lines; do not reuse the pause-era anchors.

At HEAD `store.load` normalizes with no adjustments and announces `adjustments:[]`; app startup
loads before constructing controls. Do not assume the existing nearest-level calculation already
shows a **stored-request** correction note. Own the focused end-to-end correction if r5p has not
supplied it: a stored hidden level becomes the nearest offered one (easier on ties), with the
existing EN/VI note visible on initial render. Preserve explicit/default attempt intent and URL
priority. Hidden explicit pipeline requests must still throw; existing Player puzzles still open.

Keep `store.load()`'s state-return contract and persistence/URL priority; transport
load-time adjustments transiently to the initial controls render rather than emitting
an event before the controls subscribe and then losing it. Do not persist a stale
notification or expose a note for ignored stored settings overridden by a valid URL.
Exercise actual app/startup/control initialization with controlled hidden offers,
both locales and the default/explicit attempt cases, not only a normalizer unit call.

### Source-aware evidence and quick closure

This task owns changed application/variant inputs, unlike MS18a/b. After final
publication/source formatting, compute actual E identities. Store/UI edits and support
arrays can change replay/hash identities even when outputs should be identical.
Use section 7's existing bounded E route: fresh **5 wires -> 14 analyses -> 520 hashes**
for changed identities, complete merge-checks, then all-40 GH check-only. These are
the original fixed diagnostic requests, with hidden-level access only inside restored
guards. No fixture/hash/help rewrite is pre-authorized; an unexpected output change
needs explanation and QUESTION before any write. Do not retain/retag an old-identity
ledger merely because an unchanged output was expected.

Finish fingerprinted guides/counts/tests before both complete bounded quick sets;
maintain CI projections by the existing rule, save final metadata before the final
CI check, and verify final fingerprints. Keep source-qualified deep/manual replay
evidence and reconcile its original requests; no blind expensive duplicate if already
compatible. MS18c now owns the complete bounded `variants` suite; remaining GD/deep
and final coverage reconciliation remain MS18e. If a necessary support/
test population compatibility step cannot be completed here, assign it explicitly
before declaring publication accepted, not as a hidden release debt.

## Inherited and new item handoff

Carry the full check-list register and MS18a/MS18b item tables, with each source and
population distinct. The final reply and MS18e handoff include:

| Item | Disposition / owner |
|---|---|
| MS18a-Q1-HOST, MS18a-Q2-ADMISSION | Original failed strict screen/attribution limits and two service holds resolved at attempt 2, no gap/rerun. S-OD13 explicitly approves final GQ use of the declared environment; retain history for MS18e. |
| **MS18b-HOST-ACTIVE** | 44 commands, strict failed 40/passed 4, zero holds/re-asks/gaps, incomplete attribution. Its original GS exception did not transfer automatically; S-OD13 now authorizes GQ, not a GP waiver. MS18e audit. |
| **MS18b-R5-C result** | 256/C4 reconfirmed on 360 outcomes, no owner action. Preserve 1215 -> 1104 witness and 36 -> 20 C comparison; no joint-default experiment or retune. |
| MS18b Killer zero-exact observations | Hard/Expert 0/12 at each of four caps, same keys not 48 independent seeds; S-AV05/06 and S-OD7 apply. This task measures both and separately withholds them. |
| MS18b measured R5/C costs | Six-cell generation 371.4/388.6/410.9/423.1 s at 64/128/256/none; C6 526.1 vs C4 139.3 s (3.8x). Descriptive GS, not GQ/GP or an admission bound; MS18d/e. |
| S-AV25 / MS18a classic9 Hell 1 | Current default 0/12 shallow, old MS02 12/12 vacuous. Expected hidden, but final raw GQ decides; no premature verdict. |
| S-AV14, S-AV15 and MS17b GD gaps | Normal 83/100 failed; Hell 1's 8 tests/20-request batch and confusion's 1 test unexecuted at stated 919/1544 s bounds. GQ does not replace GD; MS18e keeps them. |
| MS17b-GD21-PROCESS; MS15b-Q6; MS16-Q6 | Preserve unlocked diagnostic/bisect defects, controlled placement coverage and fixed seed-377 lineage/pause disclosure; MS18e audit. |
| S-AV01 / CV6-05 | **Closed "not offered"** on the accepted final set; Normal 40/40, p95 10,192.4051 ms > 10,000. No Fable trigger or budget change; keep original failures and the ordinary hidden-cell population treatment. |
| Q-MS07e-2 / S-AV27 | **Final execution gap closed:** all six ran and are hidden on time. Preserve the old unexecuted checkpoint and unchanged one-worker second round/mixed-concurrency caveat. |
| IR17 | Classic9 Nightmare stays offered. Carry the old 430.5 s GD warning; 449 s is not a bound. Current-source conservative admission still required; remaining GD belongs to MS18e. |
| **MS18c-GQ-ENGINE-COST** | Open to MS18d, MS18e audit: retain SA1's approximately 2-6.6x cell cost signals and the explicit, separate strict comparator above. Reconcile cohort definitions/source identities in existing analysis; no new GQ/GP waiver or source tuning. |
| S-AV28-S-AV30, MS18a `greaterThan:expert:0`, S-AV18-S-AV23 | Prior source/sample-specific availability/target effects; reconcile with final verdicts, retain historical losses, do not generalize a 12-request cohort. |
| S-AV36-S-AV39, S-AV31/S-AV33/S-AV34 | Construction/seeded/synthetic/repository/whole-generation populations and frozen finder limits remain separate. This task supplies availability, MS18d costs, MS18e audit. |
| MS15b-GP-J / MS15b-GP-U; S-AV38 | ALS 37-cell record: one full, one pilot-only, 35 unmeasured; distinct from grouped 50-cell incomplete GP. Final GP remains MS18d. |
| **MS18c-Q1 / MS18c-Q2 / S-OD13** | GQ complete and jointly accepted: 135/135, valid R/monitor bounds, five eligible re-asks, no gap, all raw strict screens failed under the declared host-active policy. Retain the immutable manifest, receipts/journals, source identities and both approvals for MS18e. |
| **MS18c-Q3 / S-OD14 recovery** | Owner selected B; **no recovery was used** in this complete set. Keep the approved journal/close-out rules as history; no completed record may be relaunched or its counters reset. |

Standing quick cost, earlier resolved decisions and withdrawn S-AV16/S-AV17 findings
retain their recorded dispositions. Name new actual offer losses, time misses or
unexecuted populations; a named item never substitutes for complete publication.

## Files to create/modify

- New closeout evidence under `docs\difficulty-v3\evidence\MS18c\`, including
  `outputs-sha256-gq.txt`, the derived TSV copy, `merge\qualification-v3.json` /
  `merge\table.md`, and `closure\manual-variants\`. No writes in frozen `runs\`,
  `qualification\`, original preflight or original archived helper/evidence inventories.
- **Stage 1 only:** the file-only preflight/planner/tests and its outputs at the paths
  above; no source, live runner, qualification or publication changes.
- **Stage 3 after joint binding and explicit release under S-OD13/S-OD14:** task-owned admitted-launch, validation/reporting
  and existing bounded-E helpers under `generator/tests/artifacts/difficulty-v3/MS18c/`.
  Do not copy MS18b's cap/window attempt key for GQ:
  use variant/level and the frozen qualifier/source/protocol/jobs/seed/attempt-policy
  identity, with separate attempts only before any payload start.
- Preserve the existing `docs/difficulty-v3/qualification-v2.md`; update live
  qualification.md and notes with every removed level under the A/B commit split.
- Only `difficultySupport` arrays in `generator/js/variants/*.js`.
- `generator/js/ui/store.js`, `controls.js` and app startup only as needed for the stored-request
  correction note; existing EN/VI keys or both languages if a new message is necessary. No generation policy.
- All three fixed golden quick loaders/helpers, Generator `player.realResult`, `steps.result` and the
  MS07f fixed replay helper in `generator/tests/manual/variants.test.js`, with focused restoration
  tests. Only hidden-level diagnostic compatibility; S-OD8's requests/assertions/tier stay intact.
  Enumerate directly affected quick/manual offer assertions/populations before editing; preserve original
  diagnostic requests and public refusal coverage. Existing reader path remains.
- `generator/tests/manual/greater-than.test.js` and other variant-specific manual
  files identified by the MS05b3 audit: only coupled published-support assertions,
  public-population registration and the step-5 fixed diagnostic/public split.
  This explicitly includes Killer's constant nine-level corpus and Wordoku's
  unchanged eight-level corpus. No altered
  invariant/hit/time threshold, retained-cell count, fixed diagnostic recipe or
  Normal `BUDGET_MS` change.
- `generator/tests/suites/manual-corpus.test.js` and its necessary adapter/probes:
  original-index request plans, inventory reconciliation and guard/restoration
  checks under the step-5 rule; no change to generic `SG.test.lazyCorpus` semantics.
- `generator/tests/fixtures/perf-helper.js`: **only 39 hidden target row arguments
  to null**; `generator/design.md` section 9.1 follows. `generator/tests/manual/perf.test.js`:
  **only the two declared public smoke substitutions** and any directly necessary
  explanatory wording; the existing consistency assertion and all timing/ratio/
  regression assertions remain unchanged. No offered target recalibration.
- `generator/tests/fixtures/recovery-profile.js`, `generator/tests/difficulty-recovery.js`
  and `generator/tests/suites/recovery-profile.test.js`: the approved restoring
  diagnostic guards, honest loaded-helper/toolHash identity and focused request/
  restoration coverage; no changed case, mode, budget, algorithm or old evidence.
- Generator design 5.1/9.1/15.4 and both user/developer guides in EN/VI: actual availability,
  qualifications versus S-OD7 withholding, relevant behavior and current test counts.
  Section 9.1's step-5 change removes hidden targets only; it selects no new offered budget.
- Fresh E records and check-only GH/quick/CI evidence as above; no canonical expectation
  write or permanent qualifier/scheduler/protocol edit without its explicit decision/task.
- Only if CV6-05's conditional final decision is actually needed and recorded: an orchestrator-assigned
  contract step owns Normal's `BUDGET_MS` in `generator/tests/manual/greater-than.test.js`,
  the matching Greater-Than Normal target in `generator/tests/fixtures/perf-helper.js` if present,
  `generator/design.md` section 9.1 (the `greaterThan` Normal cell) and both developer guides
  together. No value is authorized in advance; no seed/count/other-budget edit.

## Implementation steps

The **combined continuation sequence above is authoritative**; GQ is finished,
not work to repeat. Steps 1-3 below are already complete at A/B and remain for
audit; **current resume is steps 4-6 under the joint step-5 ruling**, after final
AGREE/release:

1. Freeze every existing run/qualification file before the official merge.
2. Merge to the exact `evidence\MS18c\merge\` pair and validate exit, zero invalid,
   all request outcomes and every receipt; STOP for orchestrator checkpoint A.
3. Prepare the support-array-only diff and full live report together; STOP for
   orchestrator checkpoint B, with measured/publication identities kept distinct.
4. Close the MS05b3 public/diagnostic population audit, preserving all fixed requests
   and seed indices; prepare final fingerprinted guides/counts/tests.
5. Account for the entire bounded `variants` manual suite; complete final-source
   E/GH, both complete bounded quick sets, CI metadata/projections and matching-head CI.
6. Deliver all item dispositions, A/B provenance and unchanged evidence hashes;
   STOP for SA1 final review and orchestrator acceptance. Developer Git writes remain forbidden.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS18c-B01 | Only genuinely qualified levels are offered; losses are reported to the owner |
| MS18c-B02 | V2 history/read paths and fixed evidence requests are preserved |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS18c-T01 | Complete 135-cell/jobs 4 protocol, exact source/defaults and checked merge |
| MS18c-T02 | Live product offers equal support lists and withhold Killer Hard/Expert under S-OD7; raw qualification verdicts and v2 archive unchanged; no algorithm/weight tuning |
| MS18c-T03 | Hidden-level diagnostics restore arrays, recipes unchanged, both quick sets pass |
| MS18c-T04 | (c1) covers every board/level, fallbacks miss, S-OD7 and all six Q-MS07e-2 cells are accounted for, stored hidden requests show the note, Player imports remain compatible, all items reconcile, and S-AV01's CV6-05 disposition precedes MS18d timing |
| MS18c-T05 | Stage 1 stops; exact source-bound class manifest jointly approved by SA1/SA2 and S-OD14 incorporated before Stage 3 release; structural monitor and immutable records |
| MS18c-T06 | Pre-publication checked merge has zero invalid puzzles; source/publication compatibility proved; final source-aware E/GH/quick/CI closure and SA1 review complete |
| MS18c-T07 | Bounded detached supervisor/kill-on-close containment and adoption proven; committed manifest/payload identities enforced; Q1/gaps/T/O/window whitelist honored; no implicit relaunch |
| MS18c-T08 | Recovery only by committed prior joint authorization: one slot 2, separate bounded admissions, immutable paths and complete-record/live-run refusal; failed recovery remains a permanent gap |
| MS18c-T09 | Post-GQ inventory covers every frozen run/qualification file; exact merge output pair passes all receipt/request checks; separate orchestrator A/B commits preserve measured identity and publish arrays/report atomically |
| MS18c-T10 | Complete bounded final `variants` manual-suite accounting and MS05b3 population audit; fixed diagnostic seeds/tiers/assertions preserved; authoritative heartbeat semantics, TSV disclosure and all item dispositions recorded |
| MS18c-T11 | Step-5 split implemented and sandbox/inventory verified: original nine/eight-level diagnostic corpora, published-only public registrations with original indexes, unchanged aggregate thresholds; no unresolved assertion handoff |
| MS18c-T12 | Perf consistency assertion unchanged; exactly 39 hidden targets/table cells removed with 79 offered values unchanged; two explicit Easy smoke substitutions; recovery-profile G13 identity/restoration and old/new toolHash recorded without retagging |

## Test plan and gates

**Current resume is step 5's inventory/sandbox/compatibility work**, then the
already assigned final gates. No new GQ generation/probe command is authorized.
The following official merge command is **historical: it ran before checkpoint A**.
Do not rerun it against the published source or overwrite its accepted outputs:

```powershell
Set-Location Q:\git\sudoku\generator
. .\tests\artifacts\difficulty-v3\MS18c\invoke-dv3node.ps1
Invoke-Dv3Node -Task MS18c-merge -NodeArgs @('tests\qualify.js', '--merge=..\docs\difficulty-v3\evidence\MS18c\qualification', '--jobs=4', '--json=..\docs\difficulty-v3\evidence\MS18c\merge\qualification-v3.json', '--markdown=..\docs\difficulty-v3\evidence\MS18c\merge\table.md')
```

The merge reads the frozen once-promoted cells; receipts/attempts and output are
outside its input folder. A command exit 0 does not waive the explicit checks above.
The former Normal CV6 command is **not scheduled**: the accepted Normal verdict is
hidden, so CV6-05's qualification prerequisite did not occur.

Preflight the full `variants` inventory and every disjoint shard through
`Invoke-Dv3Node`; keep outputs in `closure\manual-variants\`. Full-suite coverage
does not authorize an unbounded whole-suite invocation. No other manual suite's
full generation sweep is added here by a population-compatibility edit.

GQ jobs 4; the staged plan above governs projections, approvals and actual waits.
GQ uses **only its committed, jointly approved structural class binding**, never
the old P1 estimates, outer caps or a developer-selected fallback. Non-GQ work retains 450/540. The historical 1-12 h
allowance does not establish a full-matrix bound or extend any deadline.
Announce/read back the approved plan, obtain the slot and record the S-OD13 condition.
A slow cell without an approved bounded route is a named
availability item; continue safe cells and independent audit work, never invent a hidden verdict
or a new tooling class. **Do not publish an incomplete matrix.** The final record must say if
publication remains unready; changing the qualification/publication rule requires the owner.
Generator candidate focused selectors: `--suite=variants-registry,store,controls,smoke,replay,steps,player,help,ui-contract,qualification-records`;
all run through `Invoke-Dv3Node`, as do both complete quick sets and the complete
bounded manual `variants` coverage. Test restoration after diagnostic failure and unchanged request identity for a
temporarily hidden G04 request. Remaining final GD is MS18e; no hash rewrite just to hide a support error.
Run the stored-load notification through actual startup/control initialization, not only
`sanitizeWithNotes`. Preserve r5p's explicit 8 and default-mode migration behavior.

## Definition of done & handoff

Give MS18d/e the checked merge at `evidence\MS18c\merge\qualification-v3.json`,
the GQ inventory and A/B provenance, offered lists, v2 archive, compatibility evidence,
the Q3 answer and its actual execution disposition, and
the cumulative numerical item list, including S-AV01 **not offered**, no triggered Normal
contract update, IR17 and **MS18c-GQ-ENGINE-COST**. Include S-OD7's two withheld cells and the disposition
of each Q-MS07e-2 cell; an unexecuted cell is not a hidden verdict. Hand off the full
`variants` inventory/results, unchanged MS07f manual replay selectors and diagnostic
compatibility proof for MS18e's final checks.
A correctly hidden large-board cell is a valid result, not a blocker.
If any variant has no offered level and current UI/registry cannot represent that, report a blocker
for an assigned compatibility fix; never invent a qualified level.

## Resume rules — S-OD4

Review: SA1 cross-review. Correctness/evidence corruption or changing a recorded decision
stops; time/availability is a named numerical item, not an owner stop or offer waiver.
S-OD13 resolves Q1/Q2 policy and the analysts have agreed the structural rule.
S-OD14 resolves Q3's owner choice; the published Stage 2 binding and the orchestrator's
staged releases remain explicit gates, not performance exceptions. The stronger
R<=W-Q<=60 provenance check, supervisor review and canary pause apply.
Recovery is never automatic:
its separate prior joint authorization is mandatory. Use the approved GQ-only supervisor
for those cells; all other possibly >10-second work uses `Invoke-Dv3Node`, <=540 s.
Preserve GQ jobs 4 and the current bounded quick manifest.
Any authorized new suite owns its r6c CI group/manifest entry.
No new slow-cell evidence/tooling class is authorized by this prepared brief.
Return all item dispositions to MS18d/MS18e and never
publish an incomplete or unqualified offer as though (c1) passed.

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
