# MS05r6b — Full quick/GD and the sole combined recovery acceptance

| Header | Value |
|---|---|
| Depends on | MS05r6a step evidence; same preserved candidate and all r5p/r5/r5m/b3 handoffs |
| Size / active time | Evidence/audit dispatch; approximately 1.5-2.5 hours hands-on |
| Machine time | Approximately 25-60 minutes; actual shard projections control, <=540 s/invocation |
| Acceptance | **Combined recovery audit**; r6c CI closure still required before the one orchestrator commit |
| Authority / review | S-OD2-S-OD4, FS28-FS30, all absorbed b1/b2/c/d duties; analyst cross-review |
| Status | Not started |

## Goal & business context

Prove every final quick assertion and retained manual obligation, audit the complete recovery
and report its real continuing validation cost. Completed E is not acceptance by itself.
Neither longer total quick time nor bounded sharding is a new permission to relax an individual
request, assertion, runtime guard or completeness requirement.

## Scope

In: final quick inventories/results, complete classic9 GD, b3 I5/CV3/refusal reconciliation,
deep-record reconciliation, standing-cost documentation/acknowledgement package and the combined audit.
Out: production/default/recorder changes, assertion/pin repairs, changed requests/populations,
guards/factors, further saved-wire expansion, qualification/offers, or a developer commit.
r6a is the named pin owner; r3 retains schema/no-allowance-premise fixes.

## Repository rules

Read AGENTS/checklist first, including the scope for correcting AGENTS below. No staging,
commits, ref/backup actions, resets, pack/log edits or discarding work. Preserve previous
artifacts; use `evidence/MS05r6b/`. Announce each measured shard and obtain the shared slot.
All possibly >10-second work uses `Invoke-Dv3Node`, jobs 1/no `--jobs`, one invocation at a
time, <=540 s. Project compound groups <=450 s; never treat an unknown bound as zero.
Commands run from Generator unless a Player block says otherwise. Establish the app directory
and helper in each PowerShell invocation; shell state does not persist between tool calls.

**Binding IR07 lock rule:**

> Without the lock, run only commands known to be short: registration-only listings (`--list-tests`),
> `--reconcile`, parity or plan scripts that generate nothing, and commands measured under 10 s on the
> same source. A command that generates puzzles and whose projection is above 10 s, or unknown, runs
> under `Invoke-Dv3Node` from the start. A kill timer is no exemption: no unlocked trial runs.

Do not reuse the unlocked-trial path of
`generator/tests/artifacts/difficulty-v3/MS05b3/run-cells.ps1`. Choose the locked route before
launching an above-10-second or unknown generation command, not after a timed-out probe.
B's standing-cost shard executions still use the helper as shown; do not import the earlier
unlocked manual timings as slot-protected quick measurements.

**IR12 — optional compounds.** A compound is one `Invoke-Dv3Node` call holding the lock while
independent items run serially. A task-owned copy of r6a's `run-shards.cjs` may be used only after:

- Every item has its own finite same-source measurement or stated conservative projection, including startup/
  registration. Missing, unknown or non-finite projections cannot enter the compound.
- Before each child, admit it only if
  `elapsedSeconds + max(item.projectionSeconds, genericFloorSeconds) <= 450`,
  using actual elapsed compound time. The generic floor never replaces the per-item projection.
- An item projected above 450 s runs alone, subject to all existing task/request limits and the
  unchanged 540 s helper ceiling; a non-fitting item stays explicitly unstarted for another invocation.
- Items are independent and each writes its own results/ledger, transcript, duration and exit code.
- The driver stops on the first unexpected exit, retries nothing, and retains any predeclared expected
  nonzero outcome as a failure/item, not a pass.

Record the floor rule and each admission's elapsed/projection/floor values. In particular, do not admit
Generator's known 139.1 s `player` suite using r6a's generic 60 s floor alone. Never extend the compound
budget or relax the 15 s inter-acquisition gap; 540 s covers the entire driver/child process tree.
Keep r6a's evidence driver unchanged; any adaptation belongs in this task's own artifact directory.

This is the reviewed multi-hour evidence-operation estimate, not a 45-60-minute coding task.
There is no intermediate acceptance or commit between r6a and r6b.

## Inputs & context

Require r6a's current-source compatibility, checked 520-key/five-wire/fourteen-analysis E and pin
manifest; r4's selection and retained original-limit failures; r5p/r5/r5m and r1-r3 step evidence;
b3's manual/live-CV3 manifest under Addendum B1 and `deferred-cv3.json` (empty if none).
The deep occurrence ids are references for b3's live outcomes, not a second CV3 execution route.
Reconcile all named items.
Allowance 256 and the size-default attempts are active without an override.

### A — Correct standing instructions before freezing quick inputs (FS30)

Before the final quick inventory, update:

- `AGENTS.md`'s “about one minute” / “about fifteen seconds” quick comments: remove the stale
  promises, state full coverage through bounded shards where a whole command cannot fit,
  and point to the source/machine-labelled measurement report below. Preserve quick-only
  policy, both app environments for shared code, and all heavy-test restrictions.
- Both developer guides' quick-test paragraphs: same bounded coverage/runner commands,
  distinction between total shard time and per-command ceiling, and the same report link.
  Update relevant testing facts in the designs if those descriptions need the same correction.
- Create `docs/difficulty-v3/recovery-quick-cost.md` with an honest **pending measurement**
  status and the report schema below; no invented duration. This data-only report and its
  evidence are not quick source inputs. Its path exists before documentation link checks.

Use the **report reference**, not a guessed inline duration in AGENTS/guides. Complete the
instruction text before the frozen inventory; after the runs fill only the data-only report
and evidence. This avoids changing a hashed guide after measuring and invalidating the final
quick rows. If an actual quick input must change later, replace affected coverage under the
same strict identity rules; do not relabel old result files.

**E is different from the quick fingerprint (IR13).** Guides, `AGENTS.md` and design text are not
inputs to r6a's E hashes. A's documentation edits therefore leave the 520 hash keys, five wires and
fourteen analyses valid; D's three existing no-generation merge checks confirm that. Do not regenerate
E just because the quick fingerprint changed. An engine, UI or recorder change still requires fresh
affected E ledgers; no digest is patched to claim compatibility.

### B — Every quick assertion on the final source

Re-list both default quick sets after b3, r6a's pins, the reviewed IR11 returned-fix disposition
and A's instruction changes. If IR11 changes `player.test.js`, consume its new fingerprint and
verification before this inventory; older rows remain historical.
Reconcile r5's draft, including every new case. Use actual suite/full-name membership, not guessed
counts or previously passing selectors.

**IR13 inventory migration — additions and renames are distinct.** Use
`docs/difficulty-v3/evidence/MS05r6a/pins/replay-inventory.json`,
`pins/replay-inventory-final.json` and `pins/resolved.json` (the latter two relative to the same
MS05r6a evidence directory) to record the exact reviewed name changes in the final manifest:

- **Three genuinely new full names**, not aliases for an old test: the G13 saved-wire/pipeline-spy tests
  in Generator `steps` #0, `replay` #25 and `player` #0.
- **Seven one-to-one renames**, not seven missing tests plus seven unexpected tests: `steps` #17;
  `replay` #90, #91, #92, #143, #144 and #145. These change the jump-count or specimen/location text.
  Take the full old/new names from the two recorded inventories and the pin dispositions, not a fuzzy match.
- MS05b3's 46 `manual-corpus` additions and the legacy-8 round's six store additions still join the
  complete manifest; they are not lost while accounting for the replay names.

Those ordinals are r6a evidence anchors, not final keys. Resolve the old-to-current full-name mapping
and insertion-driven ordinal shifts first, then bind every entry to its actual final `(app,suite,ordinal)`.
Record the three additions and seven rename pairs explicitly; any other unexplained loss, duplicate
or new name remains an error. This is inventory provenance only: it does not make old result rows
with changed names, ordinals or fingerprints valid final coverage. All r6c full-name selectors must
use the final names handed off here.

**Earlier partial quick-cost sample (S-AV08; locked, not this task's final total).**
At Generator fingerprint `00345dc1…`, r6a recorded these complete individual suite executions:

| Generator suite | Process seconds |
|---|---:|
| `player` (Generator replay UI, not the Player app) | 139.1 |
| `steps` | 11.5 |
| `replay` | 11.1 |
| `mega-contract` | 2.0 |
| `replay-recorders` | 8.0 |
| `perf-tooling` | 11.6 |

Source: `docs/difficulty-v3/evidence/MS05r6a/evidence.md` and the `runs.jsonl` / `shard-runs.jsonl`
in that same evidence directory.
Use them as source-qualified planning anchors, with a conservative bound for changed inputs and
IR11's later measurement if applicable. They are partial coverage of the quick set, not a measured
current complete cost or automatic final results. The longest known individual shard is `player`;
do not replace its own projection with a smaller generic compound floor.

```powershell
Invoke-Dv3Node -Task MS05r6b -NodeArgs @('tests\node-runner.js','--list-tests=..\docs\difficulty-v3\evidence\MS05r6b\quick\generator-inventory.json')
# Run only if its current projection is <=450 s; otherwise use the checked smaller shards.
Invoke-Dv3Node -Task MS05r6b -NodeArgs @('tests\node-runner.js','--suite=pipeline','--verbose','--results=..\docs\difficulty-v3\evidence\MS05r6b\quick\generator-pipeline.json')
```

From Player, under the helper defined/dot-sourced in that shell invocation:

```powershell
Set-Location ..\player
Invoke-Dv3Node -Task MS05r6b -NodeArgs @('tests\node-runner.js','--list-tests=..\docs\difficulty-v3\evidence\MS05r6b\quick\player-inventory.json')
# Whole Player is allowed only with its current <=450 s projection.
Invoke-Dv3Node -Task MS05r6b -NodeArgs @('tests\node-runner.js','--verbose','--results=..\docs\difficulty-v3\evidence\MS05r6b\quick\player-all.json')
```

Run all remaining generator/player manifest shards with `--suite` plus the preflighted
describe/full-name selector and a fresh `--results` path. Prioritize original G13 consumers
and the heavy groups. G13 quick consumers now read the verified saved wire; the recorder's
120000 ms guard stays. Mega Nightmare uses r5m's approved quick replacements and separate deep
records, not the superseded compound callbacks/6 s and 20 s assertions. No global factor change.

Prefer unchanged cache boundaries where they fit; a fresh shard may regenerate a puzzle.
Every shared core case runs in **each** app environment. No `--bail`, omitted slow test,
zero-test pass, added skip or splitting a callback's original seed loop.

Reconcile raw results against the complete inventory:

```text
key = (app,suite,ordinal), with fullName checked too
same sourceHash/Node/timeFactor and expected selection membership
every inventory key exactly once; no missing, duplicate or unexpected key
correctness assertions pass; performance findings remain failed/named, never silently passed
no bail or new skip; incomplete processes have explicit uncovered keys and S-OD4 items
```

Existing explicit environment skips retain their reasons, never become a way around a
failure. A retained r6a quick row must satisfy these exact final identity/key checks.
A's guide changes normally make those earlier fingerprints different: rerun those keys,
do not copy a new hash onto the old row. Early raw r4 transcripts are not final result rows.

Use an owned coverage reconciler and test it on tiny synthetic complete/gap/duplicate/
unexpected/mixed-source/bail/zero-test data, not another real quick run. Save the final
manifest, raw result paths, reconciled counts and the chosen nonoverlapping coverage set.
Classify every remaining failure under S-OD4. Correctness/corrupt coverage blocks; time/availability
is a named numerical item, not an owner stop. An incomplete/failed run is not a green quick pass.

**Coverage notes to carry in T03 and on to MS18e (IR13).** Read the final `pins/resolved.json` and
the IR11 search record; retain the named reductions even when the remaining tests pass:

| Pin | Coverage disposition |
|---|---|
| P03 / P09 | Multi-move jump specimens reduced from 3 to 2, G11 and G12; the changed G06 is no longer that branch. |
| P04 | View-dependent jump specimens reduced from 3 to 2; signed details changes remain explicitly asserted for G11 (-5) and G12 (-4). |
| P06 | New-hardest-at-flat/lower specimens reduced from 3 to 2, retaining G13's flat case and G11's fall. |
| P12 / IR11 | Carry the reviewed reveal-fold replacement search and its actual outcome. The current handoff found none in the 11 additional fixed player results; G11 remains one reveal specimen instead of three, with exact peak 1,967, as coverage item **MS05r6a-COV01 for MS18e**. |

The current IR11 searched scope is the 14 goldens, the guides' example and the player suite's
11 other fixed real results (`pins/explore-player-fixed.json`). P03/P04/P06/P09's suites have no
other fixed results beyond the goldens. If a later reviewed returned fix changes the P12 outcome,
use that disposition and fingerprint; never silently drop the note or create a new golden here.
Passing coverage is not a claim that the earlier specimen count was preserved.

### B1 — Reconcile deep coverage and b3's live CV3 outcomes

Account for all fourteen independent mega Nightmare occurrences and original invariant/CV5 relations.
Run the existing no-generation reconciliation against r6a's effective record directory and save a
fresh JSON outside it. Read **both** `identity.currentMatches.sourceHash === true` and
`identity.currentMatches.toolHash === true`: the field is an object and the tool's exit 0 does
not check either member. Separately inspect completeness, evidence soundness, checks and relations.

```powershell
# No generation; currently under a second, so no lock is required by check-list section 7.
# Use r6a's effective directory instead if a reviewed refresh replaced the original cohort.
node tests\mega-contract.js --reconcile=..\docs\difficulty-v3\evidence\MS05r5m\records --json=..\docs\difficulty-v3\evidence\MS05r6b\deep\reconciled.json
```

Revalidate r6a's IR04 compatibility proof against the actual final tree, not merely its task label.
Even matching hashes do not cover the shared `replay-fixtures.js` loader (`loadFixtures`, `nodeEnv`)
or `tool-records.js`'s `withRequestedLevel`; inspect those unhashed paths too. A change to their
generation/check behavior requires fresh affected evidence.
If either match is false, record old/current hashes (the tool exports `currentIdentity()`), every
changed `SOURCE_FILES` entry and any changed tool/shared-loader/helper file, with the exact diffs
against the hash-bound producer snapshot supplied by the orchestrator. A dirty record's commit or
a diff against HEAD alone cannot establish that baseline.

Retain an **exact-diff compatibility proof** only when every changed source file lies outside the
generation path: neither `SG.pipeline.normalizeConfig` nor `SG.pipeline.run` executes the changed
code or depends on its effects. Show unchanged initialization/shared state, request/default/allowance,
RNG, generation, independent validation, recording, relations and the required runtime/guard identities;
the tool/check identity must still match. This covers a proven UI/store-only change, including an
approved CV6-04 fix, not just G13-only recorder work. `store.js` belongs to `SOURCE_FILES` but the deep
requests do not call it; that can make all fourteen source matches false without changing generation.
G13 persistence itself currently changes neither mega hash. A UI path or a prior review is not the diff.

Save the raw match fields, changed-file list, proof and covered occurrence ids in
`evidence/MS05r6b/deep/compatibility.json`. A retained mismatch stays false in the tool's JSON and keeps
its original producer/hash/timing identity; do not relabel it as a current-hash pass or new measurement.
If the exact-diff exception does not apply or cannot be proved, execute **MS05r6b-MEGA-REFRESH** below.
Never patch a digest, narrow `SOURCE_FILES`, edit the tool, or waive E/final-quick identity rules.

Reconcile **b3's live CV3 outcomes**: mega16 seeds 1/2 and mega12 seeds 1/2/3, live under its binding
Addendum B1, reconciled with the deep records of the same requests. Preserve its selected-total-1
results, assertion order, per-request times and `generation: live` labels. Link the invariant
occurrence ids; do not count those citations as extra deep generations. Count the five actual live
CV3 requests separately from the fourteen deep executions, and never collapse independent CV5 repeats.
Expected aggregate misses stay failed availability assertions: S-AV03 (0 of 2), S-AV02 (0 of 3);
per-puzzle failures still block. >240 s is a named availability item for MS07e/MS18c, not a stop.
Do not infer current performance from r4's eight-attempt times. Report deep/check/relationship and
live CV3 outcomes separately from final quick counts and standing quick time.

#### MS05r6b-MEGA-REFRESH — only invalidated deep evidence

Use the existing one-request tool under the same rules as r6a A1. Before running, name this step,
the changed identities, affected occurrence ids/relations, projections and new record paths in the
compatibility manifest. One `Invoke-Dv3Node` per occurrence, unchanged requests/defaults, 500 s
diagnostic budget and 540 s process ceiling; preserve all historical records.

The strict reconciler requires one source/tool identity across all fourteen records. A changed
common generation/check identity invalidates the whole cohort unless the exact-diff exception
above applies. Record the required fresh cohort on one frozen identity; never mix old/new hashes
or use one CV5 seed-3 generation for both independent occurrences.

```powershell
Invoke-Dv3Node -Task MS05r6b -NodeArgs @('tests\mega-contract.js','--request=mega12-invariant-1','--record=..\docs\difficulty-v3\evidence\MS05r6b\mega-refresh\records\mega12-invariant-1.json')
# Repeat for each affected occurrence, one separately inspected locked command; no generation loop.
node tests\mega-contract.js --reconcile=..\docs\difficulty-v3\evidence\MS05r6b\mega-refresh\records --json=..\docs\difficulty-v3\evidence\MS05r6b\mega-refresh\reconciled.json
```

Inspect both fresh match fields and all original occurrence/check/relation outcomes, then update the
effective-evidence links. A timeout is a named unavailable outcome/unevaluated relation, never a pass.
Exit 3 means a generation/check error or unfinished checks: inspect its written record even if the
lock helper reports failure, and classify the actual error rather than accepting or rejecting by code alone.
Missing or corrupt prior records remain a correctness stop, not something regeneration conceals.
Report replacement work separately from standing quick cost; this step changes no production code.

### C — Full retained manual coverage

Execute all absorbed MS05d classic9 GD using checklist section 7's unchanged per-level and
non-batch manifest, current offered levels and 100 requests per ordinary level (20 for Hell).
No `--manual`/`--all`. Preflight/reconcile registrations through r5 listing and save raw results.
Nightmare first when offered, then every other level and non-batch group exactly once:

```powershell
Set-Location ..\generator
Invoke-Dv3Node -Task MS05r6b -AllowExit1 -NodeArgs @('tests\node-runner.js','--suite=difficulty','--filter=time) > nightmare >','--verbose','--results=..\docs\difficulty-v3\evidence\MS05r6b\gd\classic9-nightmare.json')
Invoke-Dv3Node -Task MS05r6b -NodeArgs @('tests\node-runner.js','--suite=difficulty','--filter=difficulty > digger.generate: guarantees','--verbose','--results=..\docs\difficulty-v3\evidence\MS05r6b\gd\guarantees.json')
```

Those are examples, not the complete GD manifest. Project each unchanged batch before launching.
An overlong/unknown batch is an explicit outstanding population and named cost item, not an
owner stop solely for time. Continue safe groups; do not reduce its count or merge medians.

Reconcile every b3 I5/CV3/refusal row and its exact outstanding list. Early manual data may be
retained when its executed generation path, corpus/assertions, Node/factor/default/request identities
match. A broad application/evidence fingerprint change alone does not force a rerun: use the exact-diff
compatibility proof for non-executed changes, including the approved store-only CV6-04 change and its
documentation/quick-suite edits, as well as compatible golden/pin/instruction publication.
Never relabel the old JSON. Rerun genuinely affected cells, not every cell on a byte-hash mismatch.
The final **quick** identity rule above remains stricter.

**IR08 — retain MS05b3's 186 manual results under the store-only proof.** Their original evidence
fingerprint is `c3035e80…`; the population is 53 I5, 118 CV3 level and 15 refusal rows.
The exact runtime diff is
`docs/difficulty-v3/evidence/MS05r5p/legacy-8-fix/store-diff.patch`, against
`refs/dv3-wip/MS05r5m-done-20261114-0230` (`ad77fdf`). The store in that producer snapshot is also
the one used by b3. Apply B1's exact-diff exception to **all 186 rows**, not just the mega cells:
the manual corpora construct their variant/level/seed/options requests and call `SG.pipeline.run`
directly; they neither read `sg.lastConfig.v1` nor execute the changed `storedAttempts`.
The 8/4/2 engine defaults, generation, manual assertions and refusal path are unchanged.

Record the proof, original/current fingerprints and complete changed-file list in
`evidence/MS05r6b/gd/manual-compatibility.json`, linking b3's manifest, outcomes and raw results.
Account for the accompanying `store.test.js` and design/guide text changes in that broad fingerprint:
they do not execute in these manual selections. Preserve every b3 JSON byte, recorded source hash,
time, slot label and outcome. This approved delta does **not** justify repeating 186 cells
(about 2,380 s of prior process work plus waits). Assess any additional delta separately; a change
affecting the executed generation/corpus/assertion contracts or their runtime/default/request/factor/
guard identities requires fresh affected evidence, not an extension of this store-only proof.

The current b3 outstanding list is empty; its two initially deferred cells subsequently ran.
Retain 167 passes and 19 failed availability assertions, not a fabricated all-green result.
IR07's correctness/availability evidence stands, but the proof does not make `slot: none` times
slot-protected. Keep the incident and timing labels in the handoff to MS07e and MS18c/MS18d/MS18e.

This task reconciles b3's exact outstanding list. Execute only credibly bounded original selectors,
same seeds 1..perLevel/counts, selected total 1. Mega16 Nightmare is not an inherited deferral:
B1 reconciles b3's already executed live CV3 outcomes under its binding Addendum B1.
Other >450 s/unknown projections retain explicit unexecuted populations and MS07e/MS18c item ownership.
No new tuning criterion, extra tooling task, count reduction or passed-deferral label.

Per-puzzle validity/uniqueness/requiredness, digLevel, cancellation semantics, wrong warnings and
lost/corrupt evidence block. Request timeouts and aggregate hit/time failures are named S-OD4
availability/cost outcomes; keep counts, limits and truthful failed/incomplete status. A known
unexecuted population is not missing evidence when honestly recorded, but is not passing coverage.
CV6 remains S-AV01 for MS05e, with its old target intact; its performance-only stop is superseded.

### D — Measured standing cost and combined audit

Fill `evidence/MS05r6b/standing-quick-cost.json` and the data-only report from B's accepted
coverage set, separately for Generator and Player:

```text
sourceHash, node, machine, timeFactor, default, manifestPath,
suiteCount, testCounts:{total,passed,failed,skipped}, shardCount,
sumWallMs, maxShardWallMs, registrationIncluded:true,
measurement:'sum of the accepted disjoint shard executions',
excludedWork:{supersededAttempts,replacedRuns,inventoryAndTooling,lockWait},
orchestratorAcknowledgement:'pending normal acceptance'
```

Sum the **actual process wall times** reported by the lock helper, including startup/
registration, not only harness test body time. Retain the runner's `wallMs` separately and
identify the small startup/measurement difference; do not silently substitute `results.ms`.
For B's costed compounds, keep each compound within one app and include only its disjoint quick
shards. Count the helper's compound wall time once, not once per child or again on top of child
times. Retain per-child process times for suite breakdowns, and report compound/child counts and
driver overhead separately. Only accepted final-coverage work belongs in the standing total.
If only part of a compound contributes to that coverage, do not charge its entire wall time:
itemize excluded child work and any unallocated overhead, and label an unresolved total partial.
Report lock wait and development/retry work separately, not as the standing quick
cost. Do not call the sum a measured unsharded command or a <=540 s whole quick run.
Do not import MS05b3's `lockWaitSeconds` as pure lock wait: escalated cells include their stopped
unlocked attempt and the fairness gap in that field. Keep those costs and unprotected timings separate.
Show the source-qualified prior baseline if available; the interim b1 **partial** 713.8 s
is not a completed full-quick baseline. Include any retained failing assertion's shard time,
not only successful tests. If coverage is incomplete, label the total partial/lower-bound, not
the measured cost of a complete quick set.

Present both app totals and shard counts as the standing validation cost to be acknowledged
**with the normal combined acceptance**. The orchestrator records the acknowledgement;
the developer does not fill the Execution log or invent owner consent. A longer total alone
is **not a new stop or performance criterion**: S-OD2 already allows complete bounded shards.
If Generator's complete standing quick time remains above about **five minutes**, carry S-AV08
with its per-suite/shard breakdown to **MS07e**, which proposes named generation-heavy cases for
the manual tier. Do not make those moves here or block this task for that total. The report must
give the number for Generator and Player separately.

No individual guard/assertion changes. Future tasks must re-project for their changed source,
not treat this report's cost as a permanent timing promise.

Audit all b1 B/T requirements, r1-r5 (including r5p/r5m), b3/r6a evidence, absorbed b2/c/d duties and the
final coverage. Check E still matches current hashed inputs with the no-generation merge
checks below; do not rerun complete E merely because the task ID changed.

```powershell
Invoke-Dv3Node -Task MS05r6b -NodeArgs @('tests\replay-fixtures.js','--merge=..\docs\difficulty-v3\evidence\MS05r6a\wire','--check')
Invoke-Dv3Node -Task MS05r6b -NodeArgs @('tests\replay-goldens.js','--merge=..\docs\difficulty-v3\evidence\MS05r6a\analysis','--check')
Invoke-Dv3Node -Task MS05r6b -NodeArgs @('tests\perf.js','--hash-merge=..\docs\difficulty-v3\evidence\MS05r6a\hashes','--check-hashes')
```

## Files to create/modify (exclusive ownership)

- `AGENTS.md`, both developer guides and affected design testing paragraphs: A's truthful
  quick instructions/report references, with no safety/guard/coverage relaxation.
- `docs/difficulty-v3/recovery-quick-cost.md`, evidence/MS05r6b, notes and the combined audit.
- Owned coverage/reconciliation scripts and any IR12-compliant compound-driver copy under
  `generator/tests/artifacts/difficulty-v3/MS05r6b/`; no edit to r6a's historical driver.
- No application, test assertion, request, recorder, tuning constant or generated fixture
  edit. Any listed pin repair belongs to r6a; schema/premise fixes belong to r3.

## Implementation steps

1. Review r6a's handoff, including IR11's final disposition, and every prerequisite; retain all
   earlier failed/interim evidence, coverage notes and partial timing identities.
2. Complete A's instruction corrections/report skeleton before freezing quick inputs.
3. Record B's three additions/seven renames and all other new cases, then execute/reconcile the
   complete final quick coverage; any compound follows IR12 and stops at an unexpected exit.
4. Reconcile B1's deep records and b3's live CV3 outcomes, explicitly checking currentMatches and
   the exact-diff proof or executing MS05r6b-MEGA-REFRESH when required; close C's manual/outstanding coverage.
5. Complete D's measured cost report, current E checks and all B/T audit rows.
6. Submit the combined audit/standing-cost package and item list, then hand the final manifest to r6c.
   No developer commit; the combined commit still waits for r6c's CI closure.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS05r6b-B01 | The active requiredness model uses the measured common default and truthful fallbacks |
| MS05r6b-B02 | Every fixed request and correctness contract survives; the slower total quick cost is visible |
| MS05r6b-B03 | The recovery audit is honest; correctness blocks and performance findings retain numbers/owners |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS05r6b-T01 | Both final quick inventories account for r6a's three additions and seven renames without false missing/unexpected keys; final result identities stay strict; correctness and performance verdicts are explicit |
| MS05r6b-T02 | Classic9 GD and every I5/CV3/refusal obligation have an honest outcome/item; b3's mega CV3 outcomes are live under Addendum B1, not deferred |
| MS05r6b-T03 | r6a's approved-contract/520/5/14 E/pins and every retained duty are audited; P03/P04/P06/P09/P12 and IR11's coverage disposition, including COV01 when applicable, are carried to MS18e |
| MS05r6b-T04 | Actual per-app quick time/shard counts and truthful AGENTS/guides/report are ready for acknowledgement with acceptance |
| MS05r6b-T05 | No source/guard/request/default/fixture drift, checkpoint commit or unapproved waiver |
| MS05r6b-T06 | r5m's 14 independent records/relations and b3's live CV3 outcomes reconcile; both currentMatches fields are checked, with exact-diff compatibility or named MEGA-REFRESH where needed; final quick manifest goes to r6c |

## Test plan and gates

A-D are the complete plan. Unit-check the small reconciler only on synthetic data; the real
validation is every original final assertion and gate. If using a compound driver, check its
projection/floor admission, unstarted remainder and unexpected-exit stop with scripted items,
not exploratory generation. Plan 1.5-2.5 hours hands-on and 25-60
machine minutes; longer replacement work is recorded separately, never squeezed by reducing
coverage. All possibly >10 s commands are locked/announced, <=540 s, one invocation at a time;
the explicitly identified subsecond no-generation reconciliations need no lock.
No GQ, GH, GP, browser, `--all`, `--manual` or `SG_DEEP` run here.

## Stop rules

S-OD4 controls: correctness failures, corrupt/misrepresented evidence, unjustified pins or a
proposed recorded-decision change stop for the owner. Time/availability findings are named with
source/default/request/work/time/error/limit and MS07e/MS18c/MS18d ownership; continue independent
work. Do not invent a default, expand a guard or fake a pass. G13 persistence and the mega tier
replacement are already authorized and owned elsewhere.
Unexpected assertions are not edited here; a genuine data-pin follow-up belongs to r6a after
classification. Replace affected evidence, never rewrite its hashes.
A stale deep identity follows B1's explicit proof or named refresh path; it is not accepted
because the tool exited 0, nor is authorized regeneration a new owner decision.

FS30's reported **total** quick cost alone is not a stop; do not confuse acknowledgement of
that measured workflow cost with permission to change a failed individual latency assertion.

## Definition of done, commit and handoff

Return acceptance IDs, full manifests/counts/durations, source/default identities, checked E,
deep/live-CV3/relations, raw currentMatches fields and compatibility/refresh dispositions,
pins/manual outcomes, per-app standing cost and the cumulative item list.
Include the additions/rename map and final selector names for r6c, and the named coverage notes/
IR11 disposition for MS18e. Keep r6a's partial timings distinct from this task's final measurement.
**MS05r6c follows before any commit.** After r6b review plus r6c CI closure the orchestrator makes:
`difficulty-v3 MS05: required exactness with measured bounded recovery`.

Include retained b1, r1-r5 (r5p/r5m included), b3/r6a/r6b/**r6c** changes/evidence/docs with trailers.
The commit body states: **"The earlier pause commit a7f6660 was not green and was not acceptance."**
No retrospective intermediate green commits; private backups are safeguards, not acceptance.
The orchestrator records the cost acknowledgement and fills the logs. MS05e begins only after
this combined commit; MS06a waits for MS05e's repair/result and S-OD4 item handoff, not a
performance-only owner stop.

## Execution log

| Field | Value |
|---|---|
| Status | Audit complete; ready for the combined commit together with MS05r6c (S-OD2); no commit of its own |
| Start | 2026-11-14 09:57 (+07:00) |
| End | 2026-11-14 10:53 first run (stopped on R6B-F01); 11:04-11:22 continuation on the fixed fingerprint; 11:30 orchestrator review and backup ref |
| Duration | 56 min + 18 min developer (11 locked helper commands, 1,973 s; lock waits at most 0.14 s); about 15 min review |
| Model | claude-sonnet-5.5 (developer); analysts gpt-6-astra (R6B-F01 ruling) and claude-opus-5.5 (implementation review, see the review file); orchestrator review claude-opus-5.5 |
| Token usage | 249 model calls; 97,612,327 input tokens (96,430,199 cache reads); 322,035 output tokens |
| AI credits | about 1,582 (developer) |
| Verification | Developer (`evidence/MS05r6b/`): Generator quick set in seven disjoint shards on the final fingerprint `7d3102d3…`: 3,262/3,262 (`steps` 57, `replay` 153, `pipeline` 150, `player` 69, `core-shared` 1,143, `mega` 111, `own-fast` 1,579), every key exactly once (0 missing, duplicate or unexpected); Player quick set `1d0724c3…` 1,683/1,683; E merge checks (5 wires, 14 analyses, 520 keys) pass; deep reconciliation 14/14 records, 6/6 relations, exact-diff proof (`store.js` only) against `ad77fdf`; MS05b3's 186 results and the classic9 GD results retained by test-only compatibility diffs. Orchestrator re-run under the lock: Generator `history,cache,i18n,help,ui-contract,manual-corpus,mega-contract,harness` 408/408 (20.8 s); Player complete quick set 1,683/1,683 (32.0 s) |
| Acceptance | MS05r6b-B01..B03 and T01..T06 met. Combined audit (`audit.md`): MS05b1 B01-B03 and T01-T05 met, the absorbed MS05b2, MS05c and MS05d duties met. GD (classic9 manual `difficulty`, 154 tests): 153 run, 151 pass, every per-puzzle assertion passes; two aggregate hit-rate assertions fail (Nightmare 21/100, S-AV07; Normal 86/100, new S-AV14); the confusion matrix not launched (its batches sum to about 505 s, above 450 s; new S-AV15). Standing quick cost (S-AV08, for MS07e): Generator 646.7 s (10 min 47 s; `pipeline` 286.0 s, of which three verbosity-cost benchmarks 225.3 s; `player` 139.0 s), Player 31.8 s; `docs/difficulty-v3/recovery-quick-cost.md`. `AGENTS.md` updated (the quick set is complete in disjoint shards; its cost is measured, not promised; authorized by r6b A, FS30) |
| Issues & resolutions | (1) R6B-F01 (blocking, correctness): `generator/i18n/9` failed when `history` or `cache` ran before `i18n`, because MS05r5p's private `app.js` copies shared `SG.localeFragments`; SA2 returned it to MS05r5p (check-list §2 item 5); fixed there (`history,cache,i18n` 203/203); every Generator shard rerun on the new fingerprint. (2) R6B-F02: three renames of `replay-recorders` (#1, #16, #38, from MS05r6a A0) were missing from IR13's list; migrated as renames (10 in all). (3) R6B-F03: one helper figure of the first run was derived; the final measurement has none. (4) SA1's review (`10-review-of-recovery-steps.md` §9): the audit, coverage, renames, compounds and the compatibility proofs hold; IR14/IR15 (stale durations and a false CI claim in `AGENTS.md`, the developer guides and `generator/design.md`) fixed by MS05r6c before its final quick runs; IR16: MS05d-T04 relabelled "Met except one unexecuted test (S-AV15)"; IR17: the GD Nightmare batch took 430.5 s (96 % of 450 s), so 449 s is not a bound for MS07e/MS18c; IR18: the changed fixtures are loaded but not read by the manual selectors, the conclusion stands |
| Handoff | MS05r6c: `quick-final/final-manifest.json` (3,262 Generator and 1,683 Player tests in their shards) and the deep and manual identities kept out of CI. Combined commit: ready from this audit's side once MS05r6c closes. Items: S-AV08 measured (to MS07e); S-AV07, S-AV14 failed availability assertions; S-AV15 unrun; S-AV01..S-AV06, S-AV09..S-AV13 carried; MS05r6a-COV01 for MS18e |
