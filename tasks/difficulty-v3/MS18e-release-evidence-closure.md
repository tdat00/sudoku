# MS18e — Final correctness and release evidence closure

| Header | Value |
|---|---|
| Depends on | MS18d accepted at 1faa96c5 / c978a2ee; staged admission and owner/remote gates in MS18e-dispatch-and-release-gates.md |
| Size / active time | File-only preflight first; live duration comes from the approved current-source manifest, not an inherited estimate |
| Owner / milestone | Release evidence and owner of the v3 PR's CI; M18 complete |
| Authority / review | R20-R24, S-OD3/S-OD4/S-OD7/S-OD8; owner-requested SA1 dispatch review; orchestrator implementation acceptance |
| Status | SA1 review conditions incorporated: E0/E1 need no owner decision; two named test guards assigned; E2 per-command bounds and eight-job final PR-CI gate remain |

**Current concrete dispatch:** **`MS18e-dispatch-and-release-gates.md`**.
It gives exact write paths, inventories/reuse rules, per-command admission,
known documentation/CI corrections, final verification and the developer /
orchestrator / owner boundary. It controls stale examples below. All Node work,
including metadata and syntax checks, uses the unchanged shared helper and tee;
no unlocked `node -e` or historical “under a second, no lock” exception applies.
SA1 concurs upon the B1/B2/M1–M4 and concrete variants-proof conditions in that
leaf, without another dispatch-review round. The recorded early-CI owner choice
permits only an owner push and orchestrator draft PR; it is not final CI evidence.

## Goal & business context

Close the feature only when the final source, correctness, availability and cost evidence agree.
This task does not deploy, push, commit or edit the orchestrator's task logs.

## Scope and repository rules

In: final GD/quick/deep and the four named MS07f manual checks, complete item/evidence audit, final-tree workflow/PR-CI ownership,
living documentation/release record, the two explicitly assigned per-call diagnostic guards, and tightly coupled CI manifest/group corrections.
Out: application/tuning/fixture repairs, other suite/assertion edits, blanket all/manual/browser runs, historical report or pack edits.
AGENTS/checklist; CRLF, both guide languages; no Git writes.

## Inputs & context

**Current GP input:** final merge `732d1b66` reports 79/79 complete, 3,950
requests, 74/79 strict target successes (72 required), five numerical misses
and zero problems. B4 `6e60b06c` / record `553ef964` exercised exactly the three
owner-approved a3s in S order; all succeeded. The accepted raw-ledger population
is **114 total =111 prior +3 a3**, never 117. Retain all nine earlier control-holds,
the pre-window event and the 125-line C log; no admission was refunded.

Phase D is **accepted**, implementation `1faa96c55afa6a4f0aa57e6b457fba86593cb3ce`
and acceptance `c978a2ee1a274cbdc2b8bae83e6caac90e226c1c`.
Its R6 documents, two target/source re-checks, GG520, quick4807/2981 and local
CI check passed; the 30-item register and handoff are immutable inputs.
No matching-head remote pass, final GD/deep or S-AV11 profile follows from that
acceptance. Preserve its unlocked syntax-check and corrected-helper/format
disclosures; do not retrofit their history or edit the frozen artifacts.
Audit separate **Q2/S-OD16, Q3/S-OD17, Q4/S-OD18**, all three F3 disposition
objects/lines, and the B1/H1/V1 through B4/H4/V2 chain. Only the explicit owner
decisions authorized the three third admissions; neither F3 nor a global cap
change did. Their successful payloads remain first executions, not replacements.

Carry **MS18d-C2-EXTERNAL-CONSUMERS**: actual CPU/lineage evidence, the
automatic-re-ask scheduling disclosure, conservative gate start/checkpoint,
wait/expiry counts and wall cost. Distinguish that scheduling from the
unchanged A-readiness and raw GP times; later clean windows are not
strict-quiet-machine measurements or replacements for earlier data.
Audit all exact epoch/base/helper/plan tuples and original source/seed/target
identities through the required single final all-79 check-only merge.

Final invariants: rating/cache 3, history/wire 1, 40 IDs/34 unscoped, two uniqueness IDs, fixed weights/
bands, selected cap/C and frozen pattern limits. Exact means canonical solved/in-band/required;
legacy history/imports remain honest. Complete final 135-cell qualification and >=90% performance
matrix use the accepted source/configuration. Fixed 520 hashes remain present.
The attempt policy is 8/4/2 by size, not a global eight; complete GR now has five G09-G13 wires
and fourteen analyses. Every final offer meets (c1); bounded fallbacks are misses. S-OD7
additionally withholds Killer Hard/Expert until later calibration without altering their raw
qualification verdicts or the complete 135-cell population.

**MS18d Phase-C handoff contract:** audit the single S-OD15 owner record in
check-list section 4 and both `MS18d-phase-c-admission.md` /
`MS18d-r24-request-ledger.md`, not an inherited GQ grant. **A is recorded**;
the "100% resource" clause is scheduling-only under the reviewed interpretation.
**Named epoch-2 history:** also audit `MS18d-epoch2-transport-repair.md`,
the immutable `4db0114e` checkpoint and the separate base-2 declaration.
That transition accepted exactly the reviewed B1/H1 and B2/H2 pairs, selecting
each record's own identity/base checker, with every other measurement identity
unchanged. The helper diff is limited to the wrapper, two check-only merger
files and named tests/stand-ins; no recorder/readiness/engine/plan change.
Preserve the 22 epoch-1 ledgers and all attempt history; no retagging,
replacement or hidden new campaign. Also audit B3's declared history repair
and B4's exact approved plan/attempt extension and proofs. Report
provenance/counts per epoch: B1 22, B2 zero, B3 89, B4 three successful ledgers.
G1-G5/C0-1..C0-6 transport (C0), raw recorder/merger (C0b) and selected
readiness implementation (C1) need review before timed release (C2).
Keep exact source/tool/target/Node/
machine/policy bindings, acquisition evidence, all real exits and the no-orphan
proof. A complete MISS is not a crash, but an exit-1 code alone proves neither.
R24 resolves the prior 17 monolithic holds: **all 79 cells have plans, 114
commands / 3,950 indices**, 62 one-chunk cells and 17 cells with 52 chunks.
The bound items close as planning obstructions, not GP passes. S-AV11 remains held.
Require each immutable raw ledger/exit-0 receipt and unchanged source/seed/target/
plan/executed-content/Node/machine/policy identities and empty R5 flags.
Helper/base/plan equality is per one of the four declared tuples; no cross-pair mixing.
Preserve actual HEADs: each must be campaign B or an allowed descendant under
R3's exact campaign-output/pack path rule, not necessarily the same HEAD.
Reject gaps, duplicates, partial/failed chunks and changed ranges. Only the complete check-only merge of raw
times establishes p50/p95/max **sorted[24]/[47]/[49]**, strict p95<target and
**79 complete cells / >=72 successes**, never merged chunk percentiles.
Audit **35 extra cold starts**, per-cell k-1 and tie-inclusive upper-tail flags;
retain all samples and real MISS verdicts. A finished queue or recorder exit 0
is not a GP pass. S1 is an informational status update, not another owner gate.
Its delivery (message **1572878023034675262**, about **14:37 +07:00**) is recorded
before B. R4 counts come from immutable run folders and the append-only C log.
Audit R1's complete result line and **0 pass / 1 complete numerical failure /
2 incomplete-invalid / 3 caught exception** distinction, with zero stderr for
accepted pass/MISS outcomes. Merge outputs must use exact R2 manifest folders.
Only the final all-79 merge is required; optional cell merges are not missing
coverage. Progress reports/checkpoints were between chunks, poller paused for
payloads. Phase D's design 9.1 status and final performance report must attribute
the numbers to the task-owned R24 recorder calling `perfTools.measure`, not
`perf.js` output; preserve valid recorded campaign provenance after later docs edits.
**C1/F1-F6 audit:** require the integrated seven-suite rerun/new helper freeze
and combined SA1 review, the tracked initial empty C log, and the committed
operational ruling/host-binding histories. Pre-window give-ups have no folder
and consume zero admissions; true unstarted holds have no payload artifacts.
Reject real `command.exec`, missing/incomplete A readiness or a fake zero-count
reset. Host display-name changes are not identity changes; real replacements
need SA2's ruling, SA1's concurrence and an orchestrator commit before use.
Validate the binding approved for each admission, not only the latest host.
Neither F3 nor rebinding can authorize a started-payload retry or a third
admission. **P1** permits a jointly approved F3 line naming the started failure
to lift F4 **only for other chunks/final merge**. Keep the failed chunk's raw
history and missing coverage; the final merge may report incomplete, not
silently replace the chunk. Unresolved F4 stops still cannot be bypassed.
Audit B's one-time pack-path record and each actual descendant HEAD; the record
is provenance, not a tool input or a replacement for `-CampaignBase <B>`.
No agent Node command, including the Discord poller, overlaps a timed payload.
Never fill a missing result from GQ/GG, a subset percentage or an old profile,
or release incomplete GP as though R24 had passed without an owner decision.

**MS18c post-GQ handoff, 2026-11-19:** the 135-record set is jointly accepted
(79 offered / 56 hidden, 4,313 outcomes, 27 retained budget timeouts, zero invalid).
Audit its measured `ed2fe50c`, dirty / sources `0ca29eaeebc295b6` identity against
the unchanged `outputs-sha256-gq.txt` inventory, receipts/journals and the official
**`evidence\MS18c\merge\qualification-v3.json`**. Preserve the orchestrator's
separate A pre-publication and B support-array/live-report commits and their
measured/publication source proof; neither intermediate commit alone accepted MS18c.
The continuation assigns the **complete bounded `variants` manual suite** and
MS05b3 population audit to MS18c. Reconcile its final-source coverage, including
the one MS07f replay test containing both fixed mega16 requests; replace only
invalidated coverage under the existing identity/compatibility rules. Remaining
GD/deep and the three MS07f `perf` ratio cases still belong here.

**MS18c step-5 population ruling:** implementation and assertion semantics are
settled there, not deferred here. Killer/Jigsaw/Greater-Than/extra-regions retain
their constant pre-B nine-level diagnostic corpora; Wordoku retains eight.
Killer must not derive diagnostic membership from its now-three-level public
support list. Aggregate/soundness/trend/witness assertions retain original
thresholds, options, seeds, ordering and derived-state RNG; hidden builds use
per-call guards restoring the exact public support array. Public per-level
CV3/I5-hit/budget registrations alone follow the published offers, with removals
and original indexes recorded in
**`evidence\MS18c\closure\population-map.json` / `.md`**.

MS18c verifies before/after registration inventories and scripted/sandbox request
plans without live generation of these five suites. **Their live execution remains
this task's bounded GD work**, not an assertion-repair assignment. Do not treat
sandbox success as real threshold coverage or silently rescale/remove a later
failing original assertion. Reconcile every public removal and retained diagnostic.
The target table has 39 hidden positions nulled, offered targets unchanged until
MS18d's rule; two declared public smoke replacements are Greater-Than Normal ->
Easy and Wordoku Normal -> Easy. Neither substitutes for fixed diagnostic Normal
requests, the three hard event ratios or GG/GR recipes.

**Retained deep budget, MS18d inventory ruling B (2026-11-19):** the documented
retained-versus-GP inventory has ten manual rows and one **SG_DEEP-only** row.
In `generator\tests\suites\mega.test.js`,
`BOARDS.mega12.budgets.nightmare` stays **3000 ms** before
`SG.test.timeLimit`, versus the new GP target **18842 ms**. The existing deep
case uses seeds **1..20** and sorted **`times[18]`** for p95; ordinary quick/CI
exclude the full-attempt Nightmare/Hell 1 cases through `QUICK_LEVELS`.
Retain this distinction in the already-planned deep audit; it is not a new
selector/population assignment or a reason to run the branch in quick/CI.
A live time-only failure is an honest **failed S-OD4 result**, with its source,
selector, factor, measurements and exit retained. Do not align the 3000 to
18842, change its title/threshold/requests/tier, skip it or claim the gate passed.
Other hit-rate/availability results keep their own status; correctness/uniqueness/
unsoundness and evidence failures still block. No separate deep compatibility
or completeness requirement is waived.

**Deep registration prerequisite, assigned to MS18d Phase B (2026-11-19):**
audit the closure of **MS18d-DEEP-PUBLIC-REGISTRATIONS** before live deep work.
SA1 identified the unfiltered mega public deep loop after MS18c acceptance;
SA2 also verified the analogous four multigrid Easy cells. MS18d owns the
branch-local published-level filters: mega removes **mega12/hell1,
mega16/nightmare, mega16/hell1** (12 -> 9 deep registrations), and multigrid
removes **samurai/easy, sohei/easy, butterfly/easy, flower/easy** (16 -> 12).
Require the seven-entry original-request/GQ removal map, unchanged ordinary
quick inventory, exact deep-list delta and bounded source-audit disposition.
This is not an application/test-repair assignment for MS18e.
**Mega12 Nightmare stays registered with the 3000 ms base contract above.**
No retained test body, threshold, seed or tier changes; fixed diagnostic corpora,
restoring guards, mega-contract and GG/GR requests remain intact. Extra findings
must have an explicit assignment before handoff, not an unsupported-level crash
left for this task to discover. Do not treat registration-only proof as a live
deep pass or silently waive missing compatibility evidence.

Also audit the recovery-profile scope repair: **G13 = Samurai/Nightmare/42**,
existing mode-specific attempts/budgets unchanged, support restored and the newly
loaded `tool-records.js` covered by the reported old/new toolHash. Retag no older
record; apply the existing identity/compatibility rules to any retained deep/profile
coverage. This ruling adds no new profile/search campaign or timing waiver.

R20, verbatim:

> Record every reclassification, the old and v3 labels/requiredness, and the causing technique in
> `docs/difficulty-v3/notes.md`, in the task that introduces the change.

Consolidate, do not invent missing earlier evidence. Verify current references, old-history
retention, shallow warning/Retry and proof coverage are all documented in both languages.
S0 baseline old 202/204 versus qualified 91/204 is not a v3 result. Include isolated target and final
matched comparisons, per-cell losses, omitted levels and all performance misses.
No new floor certificate or target leaks into the external Player exchange.
Use current identifiers/full test names, not the old c9935cd line numbers:
`hits the requested level in at least 90 %`, `I5: every puzzle has a complete proof`
and `digLevel makes one attempt` in `generator/tests/manual/difficulty.test.js`;
`SCHEMA_VERSION` in `generator/js/ui/cache.js` is now 3, while `VERSION` in
`generator/js/ui/history.js` remains 1. E0 binds the actual final sources.

## Files to create/modify

- New `docs/difficulty-v3/release-v3.md`, notes/evidence links, docs/README.md.
- Applicable living Generator/Player designs and both user/developer guides, correcting actual final facts.
  This includes both USERGUIDEs' stale “26 ... plus 3 cage and 2 inequality”
  wording, reconciled to the audited current 40-total catalogue/scopes.
- `.github/scripts/generator-suites.sh`, its r6c portable manifest/helper, both
  `.github/workflows/pull-request.yml` and `pages.yml`, only for final bounded-tier correctness.
- `generator/tests/manual/difficulty.test.js` and `generator/tests/manual/perf.test.js`:
  only the B1 per-call `withRequestedLevel(...).value` guards in the dispatch leaf,
  preserving every original request and assertion. No other edits to these files;
  the perf fix does not assign its non-ratio tests.
- Early-CI E1 additions from PR #2 (`tdat00/sudoku`), failed run **44672736283**:
  `player/tests/browser/help.js` only for the stale 26-to-40 expectations/labels;
  `.gitattributes` only for
  `generator/tests/fixtures/replay-wire.js text eol=crlf`.
  The dispatch records F1/F2 and SA1's diagnosis/repro. No recorder/checker
  normalization, replay-recorders assertion edit or fixture content/evidence rewrite.
- No application, expected fixture, historical analysis report or task-pack file. The existing
  mega deep tool is run, not redesigned to bypass a slow final cell.

## Implementation steps

Execute the concrete E0–E4 staging in the dispatch leaf: inventory and source/
compatibility/admission review first, owned document/CI corrections, then only
released live rows, final-fingerprint quick/audit, and orchestrator/owner remote
actions. The five steps below remain the obligations, not blanket live permission.

1. Reconcile all task handoffs and every inherited/new S-OD4 item against final sources/decisions.
2. Finish living guide/design/workflow/group corrections and create the release-report skeleton
   before the final quick fingerprint. Audit the workflows once on that final tree as below.
3. Run final GD, the complete bounded quick manifest and S-OD8's four named manual cases;
   collect/reconcile final deep records.
   Every correctness failure blocks; time-only outcomes retain their real status and item owners.
4. Fill the data-only release report with actual counts, settings, versions, compatibility, availability,
   costs and PR-CI status. Do not edit hashed quick inputs after verification without replacing affected checks.
5. Give the orchestrator the sign-off/remaining items and CI responsibilities; no developer commit/deploy.

### Complete item and final-tree CI audit

Inventory the stable S-AV IDs from every task, not only the most recent report. For each retain
origin, old/new numbers, source/config/request, evidence, checkpoint/final owner and disposition.
Account explicitly for CV6, Killer Hard/Expert and the answered S-OD7 decision, large-board
Nightmare/hell1, classic9 Nightmare, S-OD8/MS07f's quick-tier move/cost and every guard/projection finding.
No item vanishes because a test moved tiers or a level became hidden: link its final qualification
or cost verdict. A proposal not approved is not an implemented change. No weights changed before
an answer; no missing S3 group, new unapproved evidence class or silent performance waiver.

**S-OD7 audit (S-AV05/S-AV06):** Killer Hard and Expert remain hidden until later calibration;
no Killer weight recalibration occurred inside v3. Preserve MS07e's 0/14 and 1/14 observations,
both cells' raw final qualification and the separate owner-directed offer restriction. The live
product table/support arrays must agree; do not reopen Q-MS07e-1 as an unanswered question
or count the two cells as omitted from qualification. Later calibration is outside this pack.

**S-OD8 audit (S-AV08):** verify MS07f's exact relocation map, preserved assertions/workloads/
requests/timeouts and source-qualified before/after costs for both apps; report actual final
quick cost as well. The three generation-cost ratios and two mega16 replay requests are outside
PR CI by explicit owner approval, not waived or replaced by G01-G14's different requests.
Classic9 Hell 1 seed 3 and the retained structural/short-cost cases stay quick. No further tier
move, threshold relaxation, new skip or five-minute guarantee follows from that approval.
Reconcile the four relocated cases through the final-source selectors below, not an old quick
pass or the warn-only status of unrelated manual performance samples.

**Q-MS07e-2 audit (S-AV27):** account for mega12/hell1, mega16/nightmare, mega16/hell1,
greaterThan/expert, greaterThan/hell1 and butterfly/hell1 individually. **The final
execution gap is closed:** all six ran in MS18c and are hidden on time.
**S-OD13 did approve** the GQ-only joint-bound route; the immutable class manifest,
structural monitor and retained execution evidence govern those completed runs,
not the earlier 450/540 GQ restriction. The serial second round is unchanged and
the old MS07e checkpoint remains incomplete on its own source. No advance
early-stop credit, new GQ run or non-GQ timing/limit waiver follows.

Audit **MS18c-GQ-ENGINE-COST** and MS18d's source-qualified disposition, including
the distinction between SA1's reported matching-outcome ratios and SA2's explicit
strict comparator. Keep the paired cohorts/keys/counts and the timing-environment
qualification; no unproved attribution or time subtraction. Carry IR17 because
classic9 Nightmare is offered: 430.5 s is old-source evidence and 449 s is not a bound.

**CV6-05 audit:** MS05e is "measured, set aside", not an accepted sign repair. Keep its saved
`docs/difficulty-v3/evidence/MS05e/candidate-pool-4.patch`, measurements and restoration/identity
proof as history; do not rebuild or run the rejected candidate for this audit. S-AV16/S-AV17
are withdrawn current-source items, not deleted observations. S-AV08's restored baseline was
648.0 s; report the actual final-source quick cost separately. Verify S-AV01's one evidenced
ending under checklist section 2 and MS18c: **not offered** (40/40 hits, p95
10,192.4051 ms > 10,000), with the ordinary hidden-cell public-manual population
treatment and fixed diagnostic Normal seed 4 preserved. No Fable trigger or
Normal base change occurred. The other recorded alternatives were a final-source
CV6 pass or an assigned Normal contract decision before MS18d timing.
For that conditional contract verify the same base in CV6 and its GP target if present, <=10,000 ms,
factor application through `SG.test.timeLimit`, and updates to the test, corresponding GP target,
`generator/design.md` section 9.1 (the `greaterThan` Normal cell) and both developer guides in the
same assigned step. Never relabel an old failed selector as a new-contract pass.

Audit `.github/scripts/generator-suites.sh`, its portable manifest and both workflows against
the **final** suite inventory. Check every newly added suite's group, disjoint current quick
membership, no manual/deep catch-all, source/result completeness, realistic per-job cost <=30
minutes, unchanged time factor and no raised timeout. Preserve the PR's smaller existing limits,
core/Player/browser jobs and Pages dependency/trigger rules. Workflow comments must point to the
actual final offline deep/GD/E/GQ/GP evidence, not claim r5m's old source validates new techniques.

Apply check-list section 2's "Maintaining CI quick projections" rule to the final measurements:
audit the recorded before/after revisions, the 1.5 process-wall margin rounded up to ten seconds,
the authority for any membership/tier change, and the unchanged factors and ceilings.
In both current workflows the Player job has **15 minutes (900 s)**. At dispatch
the helper incorrectly checks/reports its generic 30-minute manifest ceiling;
the concrete E1 assignment fixes that check and its focused selftests.
Verify `180 + 3 * player.projectionSeconds <= 900` explicitly; a helper pass against 1800 s is
insufficient. No estimate revision turns a timeout or missing remote result into a pass.
The final helper/workflow audit must account for this difference without raising the Player timeout.

#### Recovery items that must receive a final audit disposition

Carry these named items from the combined MS05 source `00647f9` and SA1's recovery reviews.
For each record its final-source evidence, resolved/pending status and owner; an earlier local
pass or a corrected comment alone does not close a remote-CI obligation.

| Item | Required audit |
|---|---|
| R6C-I01 | SA1's API observation as of **2026-11-20**: `rulesets = []`; main protection returns **404 “Branch not protected”**. Re-read/timestamp the configuration at E4. Adding required checks, including **Plan generator tests**, is an owner choice outside MS18e; no protection edits. The task nevertheless requires all eight listed PR jobs to succeed on the matching final head. |
| R6C-I02 | Remote job durations were unknown at recovery closure. Use actual PR-run timings, including startup, for the matching source and compare them with each job's existing timeout. Local sums/projections are not measured remote durations; absent run evidence stays pending. |
| R6C-I04 | `player/design.md:437` at the recovery source says browser scripts are not in CI, although the PR workflow runs them. Recheck the final workflow and correct the living design's description; do not remove browser coverage to make the old text true. |
| IR21 | The first PR run executes **Node 24 / Linux / harness factor 3 from CI** (`SG_TIME_FACTOR` remains unset), whereas local recovery evidence used Node 26 / Windows / factor 2. Record that first platform result and any findings; an early draft-PR run is diagnostic only and local green is not that platform's pass. Classify/investigate failures without weakening assertions, raising factors or extending timeouts. Final sign-off still needs all eight matching-head task-defined jobs. |
| IR22 | `generator/design.md:2073` (the Tests row in section 18) has stale suite/test counts, and `player/design.md:437` has the R6C-I04 browser-CI claim. Derive counts and facts from the final inventory/workflows, not copied recovery counts. The Player text may share one correction/evidence link with R6C-I04, but give both IDs a disposition. |
| MS05r6a-COV01 | The reveal-fold branch retained one G11 specimen after the search of the 14 goldens, the guides' example and the player suite's 11 other fixed results found no replacement. Verify that the branch remains genuinely asserted on the final fixtures and record the coverage disposition. Do not silently drop it or close the item merely because the older test passed; any needed out-of-scope test/fixture repair goes to its assigned owner. |

Both design files above are quick-fingerprint inputs. Make any still-needed documentation
corrections during implementation step 2, **before** the final quick freeze/run; if corrected later,
replace the complete affected app's quick coverage on the new fingerprint. This is the existing
documentation/CI audit scope, not permission for new browser runs, fixture repairs or scope reductions.

The orchestrator supplies the v3 PR/check-run identity and performs any required Git/PR actions.
This task owns reading/checking the final-head results and investigating bounded CI grouping
failures, forwarding application/correctness defects to their owner. Local success is not a
remote CI pass. **All eight `pull-request.yml` jobs listed in the dispatch must
conclude success on the matching final head**, with run IDs, job IDs and attempts,
regardless of repository protection. A failed, cancelled, skipped or missing job,
including the browser job, leaves sign-off failed/pending; only an explicit
`MS18e-Q-CI-POLICY` owner decision may waive a named requirement, never make it passed.
The owner-approved early draft PR may receive an early run and later the final
post-E3 head; that early run is not final evidence. No agent push, merge, deploy,
workflow dispatch or new local browser run is authorized.

### S-OD8 — final-source checks of the relocated cases

Use MS07f's relocation map and the actual final files. Preflight with `--list-tests`: exactly
three hard-failing ratio cases in `perf`, and one replay case containing the two unchanged
mega16 requests in `variants`. MS18c's explicitly assigned complete `variants`
coverage can supply that replay case when final-source identity/compatibility is
proved; do not blindly repeat it or substitute another recipe. No warn-only
wrapper, unassigned extra sweep, stub or skipped hidden request.
MS18c owns any diagnostic-only support guard needed by the fixed replay requests; verify its
array restoration and do not weaken the public unsupported-level refusal.

The dispatch leaf lists the three exact ratio names and the mega16 replay name.
Run one admitted ratio per tee/locked command, with a new result/transcript.
The replay may be supplied by the accepted MS18c live coverage only after its
explicit compatibility proof; otherwise it needs a reviewed replacement bound.

Apply the current-source <=450 s projection and 540 s command ceiling, with explicit margin;
the concrete dispatch uses one ratio per individually admitted exact selector.
MS07f's historical times are not final bounds. Retain every real failure/incomplete outcome
and its item; `-AllowExit1` does not turn it into a pass. These four selectors are specifically
authorized, not a whole `perf`/`variants` or `--manual` run. Verify the retained classic9 request
through final quick coverage, without duplicating its generation outside that set.

### Final-source deep mega evidence

Use the existing r5m tool, as extended by MS07b, for the retained Nightmare and hell1 populations:
two boards x two levels x (invariants 1/2/3/4 plus independent CV5 3/3/4) = **28 occurrences**.
One request per locked process, board-default attempts, same 500 s diagnostic ceiling, current
source/config/guard identities and original relations. Fixed hidden requests are diagnostic only;
use the established temporary support guard and restore the original array, never normalize to
another level. Retain every outcome and all per-puzzle checks, not just a hit histogram.
Run once after the final engine change; retain compatible final-source deep records if they already
exist, never stale recovery records or two aliases of one CV5 call. Reconcile without regeneration.
Read both `identity.currentMatches.sourceHash` and `.toolHash` explicitly; exit 0 alone is not a
current-identity match. Retaining deep records does not execute or satisfy a final CV3 cell.
Record >240 s/timeouts as named availability/cost outcomes; wrong puzzles/flags/warnings still block.

#### Final CV3 mega cells — live only (Addendum B1 route)

Every mega12/mega16 CV3 cell in the final offered-level manifest requires actual
live coverage, including Nightmare and hell1 when offered. Explicitly approved
compatibility may retain MS18c's actual live coverage; otherwise a replacement
runs live. No record provider, Node replay entry point or in-runner deep-record reuse.

1. Preflight each normal `--suite=variants` selector with `--list-tests`, using the quoted boundary
   filter `'--filter=> variants: <id> > CV3 <level>:'`. Require selected total 1 and the intended full name.
2. Run one locked `Invoke-Dv3Node -Task MS18e -AllowExit1` command per cell, with `--verbose` and a
   fresh `--results` file under `docs/difficulty-v3/evidence/MS18e/cv3/`. Keep the original 2 requests
   for mega16 or 3 for mega12, seeds 1..perLevel and the 240 s per-request guard.
3. Keep all per-puzzle assertions before the aggregate hit check. Record actual final hit counts,
   failures and times; B1's recovery zero-hit counts and timings are not final expectations or bounds.
   Aggregate availability/time misses remain failed named final items, not green gates; per-puzzle
   correctness/requiredness/warning failures stop.
4. Label each manifest row `generation: live`. Cite matching final deep occurrence ids only as
   cross-references; those records neither supply the CV3 puzzles nor replace its checks. Keep the
   new live generation times separate from the deep times and do not double-count either.

Apply the final-source projection/450 s launch rule below before each command. A blocked or
unexecuted live cell remains unsatisfied, not replaced with deep records. Hidden levels keep
their refusal coverage; do not enable them for CV3. Their fixed deep diagnostic obligations above remain.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS18e-B01 | Players and the owner receive truthful v3 behavior, limitations and availability |
| MS18e-B02 | No unperformed or failed gate is reported as passed |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS18e-T01 | Final GD/quick correctness, the four S-OD8 manual cases, live mega CV3 outcomes and actual performance verdicts are reconciled; no failed/incomplete gate is called green |
| MS18e-T02 | GS/GQ/GP/GG/GR/GH and 28 deep occurrences/relations have current compatible evidence or explicitly unsatisfied release status |
| MS18e-T03 | Living EN/VI docs match the final code; no application/tuning/fixture/pack edit |
| MS18e-T04 | Every S-OD4 item has an evidenced disposition or named outstanding owner, including S-OD7/S-OD8 and the six Q-MS07e-2 cells; all six S3 groups remain |
| MS18e-T05 | Final workflow/group audit plus **all eight listed `pull-request.yml` jobs concluding success on the matching post-E3 head**, with run IDs/job IDs/attempts, regardless of repository protection. Failed/cancelled/skipped/missing jobs leave failed/pending sign-off unless an explicit MS18e-Q-CI-POLICY owner waiver is recorded as such; early CI is not final evidence. No factor/timeout raise or deep CI run |

## Test plan and gates

E0 obtains the current offered-level/ordinal manifest through locked/teed
registration-only commands. No unlocked metadata call is authorized.
The current public I5 manifest has 32 selectors; Greater-Than Normal and Wordoku
Normal are hidden and the former example selectors would select nothing.
Use the dispatch leaf's exact source-qualified shapes and whole-command admission
checks, not a hard-coded first Nightmare launch or a blanket manual invocation.

Player likewise uses `Invoke-Dv3Node`; a no-options run is allowed only with a current <=450 s
projection. Otherwise use the complete disjoint manifest and result reconciliation.
These consumers were corrected in MS05b2 and first executed with MS05b3's lazy corpora;
no blanket manual suite is inferred. Rebuild the current MS05b3 manifest: **one I5 per actual
level** of Killer/Jigsaw/Greater-Than/Wordoku, one per `(diagonalX|hyper,level)` in extra-regions,
one **CV3 per (variant, supported level)** and one separate unsupported-level refusal check
per variant. Never use a whole-variant CV3 selector: it still represents many requests.
Use each I5 suite's original `countOf`/`PER_LEVEL` and indexes/seeds; CV3 keeps its own 2/3
requests per supported level, seeds 1..perLevel and the 240-second request guard.
The four Normal examples use 20; top levels may use 8 or 10, not a guessed 20.
Keep the leading `> ` boundary in every filter so Easy cannot match Very Easy.
CV3 names are `CV3 <level>:` and `CV3 unsupported:`. Each selector must select exactly one
test: check its full name and the runner summary's total **1** before recording cell evidence;
zero, multiple or skipped tests do not establish that cell's result.
Retain a literal test/variant/level/count/seed/command manifest and prove no requested assertion
is missing or duplicated; never use one `--filter=I5:` for the whole multi-level corpus.

Qualification can hide a level. Reconcile the current manual population with the published
offers before executing: an unadapted fixed manual list requesting a now-hidden level is a
test/publication compatibility blocker for an assigned MS18c follow-up, not a zero-test pass,
permission to drop its assertion silently, or permission to enable hidden production requests.
The two named B1 compatibility misses are now assigned to E1; scan all eight
manual suites and report any further unguarded hidden-level request before E2.
Record every intended population change under final qualification. Fixed GG/GR recipes use
their separate diagnostic guards and remain complete.
Complete the difficulty suite through checklist section 7's disjoint offered-level/non-batch
manifest after the first selected shard; never repeat it in a whole-suite command. Record a
qualified-hidden Nightmare as absent from the offered manifest, not as a zero-test pass.
GD jobs 1/no --jobs; prefer latest matching-source per-level measurements,
including r6b's live CV3 outcomes (Addendum B1) and current Hell 1 evidence. Label older MS05b3
measurements with their actual source/allowance; they are not proved upper bounds.
Preflight every final CV3 cell before launching. A >450-second projection or missing credible
bound stops that command and creates a named final item; no automatic new tooling task and no MS05b3 deferral as a
final pass or silently omitted. Preserve counts and record current-source actuals; each command
under 540 seconds. A selector with no tests is not a pass. Use r6b's measured per-app standing
cost and current projections, not the obsolete one-minute/fifteen-second comments.
Use the shared lock and tee for **every Node command**. **Announce to the orchestrator
before starting (pentomino runs in parallel on the same machine).** 540-second process ceiling (check-list section 7).
S-OD4 lets the task continue after a time/availability finding, not claim release gates passed.
Record unsatisfied final gates and pending PR CI explicitly. A change to a recorded gate needs
the owner or its recorded delegated decision route; correctness/evidence corruption stops immediately.
CV6-05 leaves Normal's base at 700 ms unless its specific final contract decision was recorded
through MS18c before GP; audit that actual disposition. Its performance-only stop is superseded.
No new evidence class to hide a slow cell.
No blanket live --all/--manual/browser/SG_DEEP permission is inferred. The leaf's
explicit --all --list-tests exception is registration only, never test execution.

## Definition of done & handoff

Return final B/T and gate verdicts, exact source/default/version identifiers, documents, counts,
durations, complete item audit, final-tree workflow audit, matching-head PR-CI status and usage if available.
The orchestrator owns logs/commit/release;
leave this Execution log empty.

## Resume rules — S-OD4

Review: orchestrator only. Correctness/evidence corruption or a proposed recorded-decision change
stops for the owner. Time/availability lets independent work continue but never turns an unsatisfied
release gate or pending PR check green. Use `Invoke-Dv3Node`, <=540 s, for all possibly >10-second
payloads, and keep the final bounded quick/deep manifests distinct. No new slow-cell evidence class.
The complete item audit and final-tree CI ownership above are mandatory parts of the final reply.

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
