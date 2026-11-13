# MS05r6b — Full quick/GD and the sole combined recovery acceptance

| Header | Value |
|---|---|
| Depends on | MS05r6a step evidence complete; same preserved uncommitted candidate and all prior recovery handoffs |
| Size / active time | Evidence/audit dispatch; approximately 1.5-2.5 hours hands-on |
| Machine time | Approximately 25-60 minutes; actual shard projections control, <=540 s/invocation |
| Acceptance | **Sole combined recovery acceptance**, then one orchestrator commit |
| Authority | S-OD2, FS28/FS29/FS30; original r6 phases C/D and all absorbed b1/b2/c/d duties |
| Status | Not started |

## Goal & business context

Prove every final quick assertion and retained manual obligation, audit the complete recovery
and report its real continuing validation cost. Completed E is not acceptance by itself.
Neither longer total quick time nor bounded sharding is a new permission to relax an individual
request, assertion, runtime guard or completeness requirement.

## Scope

In: final quick inventories/results, complete classic9 GD, b3 I5/CV3/refusal reconciliation,
standing-cost documentation/acknowledgement package and the combined audit.
Out: production/default/recorder changes, assertion/pin repairs, changed requests/populations,
guards/factors, G13 persistence, qualification/offers, or a developer commit.
r6a is the named pin owner; r3 retains schema/no-allowance-premise fixes.

## Repository rules

Read AGENTS/checklist first, including the scope for correcting AGENTS below. No staging,
commits, ref/backup actions, resets, pack/log edits or discarding work. Preserve previous
artifacts; use `evidence/MS05r6b/`. Announce each measured shard and obtain the shared slot.
All possibly >10-second work uses `Invoke-Dv3Node`, jobs 1/no `--jobs`, one invocation at a
time, <=540 s. Project compound groups <=450 s; never treat an unknown bound as zero.
Commands run from Generator unless a Player block says otherwise. Establish the app directory
and helper in each PowerShell invocation; shell state does not persist between tool calls.

This is the reviewed multi-hour evidence-operation estimate, not a 45-60-minute coding task.
There is no intermediate acceptance or commit between r6a and r6b.

## Inputs & context

Require r6a's current-source compatibility, complete checked 520-key/four-wire/fourteen-analysis
E and resolved-pin manifest; r4's exact selection and original-limit guards; r1/r2/r3/r5 step
evidence; b3's full early manual manifest and `deferred-cv3.json` (empty if none).
The selected default is unchanged and active without an override.

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

### B — Every quick assertion on the final source

Re-list both default quick sets after b3, r6a's pins and A's instruction changes. Reconcile
r5's draft, including every new case. Use the actual suite/full-name membership, not guessed
counts or previously passing selectors.

```powershell
Invoke-Dv3Node -Task MS05r6b -NodeArgs @('tests\node-runner.js','--list-tests=..\docs\difficulty-v3\evidence\MS05r6b\quick\generator-inventory.json')
# Run only if its current projection is <=450 s; otherwise use the checked smaller shards.
Invoke-Dv3Node -Task MS05r6b -NodeArgs @('tests\node-runner.js','--suite=pipeline','--verbose','--results=..\docs\difficulty-v3\evidence\MS05r6b\quick\generator-pipeline.json')
```

From Player, under the helper defined/dot-sourced in that shell invocation:

```powershell
Set-Location Q:\git\sudoku\player
Invoke-Dv3Node -Task MS05r6b -NodeArgs @('tests\node-runner.js','--list-tests=..\docs\difficulty-v3\evidence\MS05r6b\quick\player-inventory.json')
# Whole Player is allowed only with its current <=450 s projection.
Invoke-Dv3Node -Task MS05r6b -NodeArgs @('tests\node-runner.js','--verbose','--results=..\docs\difficulty-v3\evidence\MS05r6b\quick\player-all.json')
```

Run all remaining generator/player manifest shards with `--suite` plus the preflighted
describe/full-name selector and a fresh `--results` path. Prioritize original G13 consumers
and the heavy groups; keep their original 120000 ms guards. Keep mega's original callbacks,
60000 ms guards and design assertions/factor. No budget or fallback exemption.

Prefer unchanged cache boundaries where they fit; a fresh shard may regenerate a puzzle.
Every shared core case runs in **each** app environment. No `--bail`, omitted slow test,
zero-test pass, added skip or splitting a callback's original seed loop.

Reconcile raw results against the complete inventory:

```text
key = (app,suite,ordinal), with fullName checked too
same sourceHash/Node/timeFactor and expected selection membership
every inventory key exactly once; no missing, duplicate or unexpected key
all required tests pass; no bail, incomplete process or new skip
```

Existing explicit environment skips retain their reasons, never become a way around a
failure. A retained r6a quick row must satisfy these exact final identity/key checks.
A's guide changes normally make those earlier fingerprints different: rerun those keys,
do not copy a new hash onto the old row. Early raw r4 transcripts are not final result rows.

Use an owned coverage reconciler and test it on tiny synthetic complete/gap/duplicate/
unexpected/mixed-source/bail/zero-test data, not another real quick run. Save the final
manifest, raw result paths, reconciled counts and the chosen nonoverlapping coverage set.
Any remaining quick failure blocks acceptance; the manual availability exception does not apply.

### C — Full retained manual coverage

Execute all absorbed MS05d classic9 GD using checklist section 7's unchanged per-level and
non-batch manifest, current offered levels and 100 requests per ordinary level (20 for Hell).
No `--manual`/`--all`. Preflight/reconcile registrations through r5 listing and save raw results.
Nightmare first when offered, then every other level and non-batch group exactly once:

```powershell
Set-Location Q:\git\sudoku\generator
Invoke-Dv3Node -Task MS05r6b -AllowExit1 -NodeArgs @('tests\node-runner.js','--suite=difficulty','--filter=time) > nightmare >','--verbose','--results=..\docs\difficulty-v3\evidence\MS05r6b\gd\classic9-nightmare.json')
Invoke-Dv3Node -Task MS05r6b -NodeArgs @('tests\node-runner.js','--suite=difficulty','--filter=difficulty > digger.generate: guarantees','--verbose','--results=..\docs\difficulty-v3\evidence\MS05r6b\gd\guarantees.json')
```

Those are examples, not the complete GD manifest. Project each unchanged batch before launching.
An overlong/unknown batch is an outstanding gate and owner stop, not permission to reduce
its count, split its median into averages, or silently move it to release.

Reconcile every b3 I5/CV3/refusal row and its exact outstanding list. Early manual data may be
retained only when its application, corpus/assertions, Node/factor/default/request identities
match; if later golden/pin/instruction publication changed the broad runner fingerprint,
record the explicit file-diff compatibility proof for the manual inputs, never relabel JSON.
Rerun genuinely affected cells. The final **quick** identity rule above remains stricter.

This task owns b3's outstanding CV3 list. Execute only credibly bounded original selectors,
same seeds 1..perLevel and counts, each selecting exactly one test. Still >450 s or no credible
bound means **owner stop**, not a passed deferral, added tuning criterion or new test-tooling policy.

Per-puzzle validity/uniqueness/requiredness, digLevel, cancellation, request timeouts and missing
coverage block. Only existing intermediate **aggregate hit-rate** failures, or classic9
median-time assertions coupled to the requiredness hit loss, may remain under the accepted
R4/GD exception, with counts/times and named MS18c/MS18d handoff. They stay failed assertions;
do not call all GD green. This grants no exception to quick tests or S-OD1's CV6.

### D — Measured standing cost and combined audit

Fill `evidence/MS05r6b/standing-quick-cost.json` and the data-only report from B's accepted
coverage set, separately for Generator and Player:

```text
sourceHash, node, machine, timeFactor, default, manifestPath,
suiteCount, testCounts:{total,passed,failed,skipped}, shardCount,
sumWallMs, maxShardWallMs, registrationIncluded:true,
measurement:'sum of the accepted disjoint shard executions',
excludedWork:{failedAttempts,replacedRuns,inventoryAndTooling,lockWait},
orchestratorAcknowledgement:'pending normal acceptance'
```

Sum the **actual process wall times** reported by the lock helper, including startup/
registration, not only harness test body time. Retain the runner's `wallMs` separately and
identify the small startup/measurement difference; do not silently substitute `results.ms`.
Report lock wait and development/retry work separately, not as the standing quick
cost. Do not call the sum a measured unsharded command or a <=540 s whole quick run.
Show the source-qualified prior baseline if available; the interim b1 **partial** 713.8 s
is not a completed full-quick baseline.

Present both app totals and shard counts as the standing validation cost to be acknowledged
**with the normal combined acceptance**. The orchestrator records the acknowledgement;
the developer does not fill the Execution log or invent owner consent. A longer total alone
is **not a new stop or performance criterion**: S-OD2 already allows complete bounded shards.
No individual guard/assertion changes. Future tasks must re-project for their changed source,
not treat this report's cost as a permanent timing promise.

Audit all b1 B/T requirements, r1-r5/b3/r6a step evidence, absorbed b2/c/d obligations and the
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
- Owned coverage/reconciliation scripts under `generator/tests/artifacts/difficulty-v3/MS05r6b/`.
- No application, test assertion, request, recorder, tuning constant or generated fixture
  edit. Any listed pin repair belongs to r6a; schema/premise fixes belong to r3.

## Implementation steps

1. Review r6a's handoff and every prerequisite; retain all earlier failed/interim evidence.
2. Complete A's instruction corrections/report skeleton before freezing quick inputs.
3. Execute/reconcile B's complete final quick coverage on that source; stop on a real failure.
4. Execute C's complete classic9 GD and reconcile all early/deferred manual coverage.
5. Complete D's measured cost report, current E checks and all B/T audit rows.
6. Submit the sole combined acceptance/standing-cost acknowledgement package to the orchestrator.
   No developer commit, no independently green r6a checkpoint.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS05r6b-B01 | The active requiredness model uses the measured common default and truthful fallbacks |
| MS05r6b-B02 | Every fixed request and correctness contract survives; the slower total quick cost is visible |
| MS05r6b-B03 | Only the complete recovery is accepted; remaining contract/coverage failures return with numbers |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS05r6b-T01 | Both final quick inventories reconcile exactly once; all required assertions pass |
| MS05r6b-T02 | Classic9 GD and all early I5/CV3/refusal coverage are complete; only the named intermediate exceptions remain |
| MS05r6b-T03 | r6a's original-limit/current E/pin evidence and every retained b1/r1-r5/b3/b2/c/d duty are audited |
| MS05r6b-T04 | Actual per-app quick time/shard counts and truthful AGENTS/guides/report are ready for acknowledgement with acceptance |
| MS05r6b-T05 | No source/guard/request/default/fixture drift, checkpoint commit or unapproved waiver |

## Test plan and gates

A-D are the complete plan. Unit-check the small reconciler only on synthetic data; the real
validation is every original final assertion and gate. Plan 1.5-2.5 hours hands-on and 25-60
machine minutes; longer replacement work is recorded separately, never squeezed by reducing
coverage. All commands <=540 s, one locked/announced invocation at a time.
No GQ, GH, GP, browser, `--all`, `--manual` or `SG_DEEP` run here.

## Stop rules

Any remaining original-limit/quick/validity failure, incomplete/still-unbounded required
coverage, incompatible evidence or unjustified pin blocks acceptance and further MS05e work.
Return the source/default, fixed request, work/cap hits/attempts, actual time/error/limit and
r4's four-setting table. Do not invent a default, persist G13, weaken mega or expand a guard.
An unexpected assertion is reported, not edited here: the orchestrator may assign a bounded
r6a pin follow-up only after classifying it under r4's preserved-contract rule. Semantic or
performance changes still need the owner's explicit disposition. Replace all affected evidence.

FS30's reported **total** quick cost alone is not a stop; do not confuse acknowledgement of
that measured workflow cost with permission to change a failed individual latency assertion.

## Definition of done, commit and handoff

Return acceptance IDs, full manifests/counts/durations, source/default identities, checked E,
resolved-pin and manual outcomes, standing costs and any allowed availability handoffs.
Only after complete review/acceptance does the orchestrator make **one meaningful commit**:
`difficulty-v3 MS05: required exactness with measured bounded recovery`.

Include retained b1, r1-r5/b3/r6a/r6b changes, evidence and docs with required trailers.
No retrospective intermediate green commits; private backups are safeguards, not acceptance.
The orchestrator records the cost acknowledgement and fills the logs. MS05e begins only after
this combined commit; MS06a still waits for MS05e's separate S-OD1 disposition.

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
