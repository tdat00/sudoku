# MS05r5p — Size-dependent default attempts

| Header | Value |
|---|---|
| Depends on | Retained MS05b1/r1-r4 evidence at c9935cd; R5 default 256; S-OD3/S-OD4 |
| Size / active time | Small-Medium; 40-60 minutes plus focused checks/diagnostics |
| Machine time | Approximately 5-15 minutes; replace estimates with actuals |
| Acceptance | Step evidence complete only; r6b audit and r6c CI precede the combined commit |
| Authority / review | CV6-03 (c2), PR-S1 / S-OD4; analyst cross-review |
| Status | Not started |

## Goal & business context

Bound the default number of large-board attempts by size, not elapsed time. The allowance of 256
only bounds local continuation; it cannot remove the cost of ordinary samples. A bounded fallback
is truthful but still a qualification miss. No level is hidden before final qualification.

## Scope

In: one shared attempt-default function, pipeline/direct defaults, selected-variant store/control
behavior, once-only legacy migration, recorded-attempt replay through history/cache/export, focused
tests and current bilingual documentation.
Out: changing 256, digTries, per-attempt caps, weights, bands, offers, browser budgets or error behavior.
No new sample-level bound, best-so-far result on timeout, or G13/mega validation-tier change here.

## Repository rules

Read AGENTS/check-list. No staging, commit, stash, reset, push, branch/ref/backup action, pack or log edit.
Preserve the pause and r1-r4 artifacts. Use existing scripts/dependencies; CRLF, no BOM/trailing whitespace.
Every possibly >10-second command uses `Invoke-Dv3Node` from check-list section 7 in the same shell,
one announced shared-machine slot at a time, <=540 seconds and the 15-second gap.

## Inputs & context

The policy, once on `SG.digger`, is:

```text
defaultMaxAttempts(cellCount) = 8 when cellCount <= 81
                            = 4 when 82 <= cellCount <= 144
                            = 2 when cellCount > 144
```

Use the same exported function in the pipeline, direct digger and store. Do not copy the piecewise
rule into three modules. Default-mode boards: mega12/butterfly 4; flower/mega16/sohei/samurai 2;
all current boards of at most 81 cells remain 8. Explicit values win. Keep the advanced control's
1-20 range and existing API validation; do not introduce a new API clamp or reinterpret explicit 8.

### Code-state anchors at c9935cd

| Anchor | Consequence |
|---|---|
| `generator/js/engine/pipeline.js:26,73,360`, `DEFAULT_MAX_ATTEMPTS`, `normalizeConfig` | Two operational defaults must no longer be independent literals. Normalize with the selected board's size. If retaining the public numeric constant for compatibility, derive it as the <=81-cell reference, never use it as the universal fallback. |
| `generator/js/engine/digger.js:624,1807,1999`, `generateAttempts`, `SG.digger` | Define/export the policy once and use `model.cellCount` for direct generation. Keep `SHALLOW_SEARCH_DEFAULT` at line 653 equal to 256. |
| `generator/js/variants/registry.js`, `VariantDef`; `multigrid.js`, `definition` | Definitions currently have digits but no cellCount. Normalization/store must not build a seeded Jigsaw model merely to learn size. Add only the small size metadata/access needed: square boards use digits squared, multigrid declares its actual 144/189/288/369 cells. Validate any declared size; preserve existing test definitions and RNG/build count. |
| `generator/js/ui/store.js:35,147,193,258,339,361,618,652`, `MAX_ATTEMPTS`, `defaults`, `normalize`, `toConfig`, `applyUrlPatch`, `toUrlParams`, `set`, `load` | Default mode must survive variant changes, storage and URL priority. A generic numeric sanitization is not a migration boundary. |
| `generator/js/ui/controls.js:201-209`, `maxAttemptsField`; inline EN/VI packs | `defaultValue` and displayed/reset value must use the selected board's effective default, not the old static 8. Update both inline languages if changing the hint. |
| `generator/js/ui/history.js:77,105-117,308`; `cache.js:977-1000`; `app.js:867-874` | History restore and stale-cache rebuild pass recorded numeric attempts through `app.generate(overrides)` to `store.set(..., {source:'app'})`. Replay intent is not a new control choice. |
| `generator/js/ui/export.js:790-793`, `toConfig(Object.assign(defaults(), overridesOf(entry)))` | A recorded numeric maxAttempts wins even when the merged defaults carry a default-intent marker. |
| `generator/tests/suites/recovery-profile.test.js:221-233` | The test explicitly pins every diagnostic to 8. Replace that universal premise with 2/4/2; profile mode stays one attempt. Do not rewrite r1/r4 records. |
| `generator/tests/soak.js:388-403`; `qualify.js:143-173` | Both already omit maxAttempts. Preserve that on both soak routes and in the qualifier; state the size-default contract in both headers. |

The size lookup is configuration plumbing, not a second attempt policy. Cover actual native board
sizes in existing registry/store tests, including non-square multigrids; no hard-coded variant-to-attempt map.

### Store migration and explicit intent

- Fresh/default state follows the selected variant; changing variants in default mode updates the effective
  number. A deliberate numeric setting stays explicit across variant switches and reloads.
- Only an old stored configuration without the new default/explicit-intent marker is eligible for the
  migration: stored 8 on a board over 81 cells is read once as default. Any other stored numeric value is
  kept. Persist enough migration/intent information that a subsequently saved explicit 8 is not migrated again.
- Keep storage keys and guarded/memory-only behavior. Do not migrate history recipes, exported puzzles,
  explicit pipeline/digger callers or `?attempts=8`; URL configuration still outranks stored configuration.
- Missing attempts in a URL for a larger variant use that variant's default, not classic9's inherited 8.
  URL/share round trips must preserve explicit overrides, including an override equal to a size default.
  Internal default-mode metadata must not leak into GenerateConfig or the external puzzle exchange.
- **Recorded recipes (RS01):** history restore, stale-cache rebuild and export generate with the recorded
  numeric `maxAttempts`; an older mega16 recipe with 8 still runs 8, not 2. On the same engine its recipe
  output is preserved; this is not a promise of identical puzzles across rating versions.
  For a store replay (`source: 'app'`), compare the recorded number with the **replayed variant's**
  size default. Equality preserves the existing intent: default mode stays default, and explicit mode
  stays explicit with that recorded number. Any other recorded number becomes explicit. Thus a default-mode
  classic9 restore at 8 does not force the next mega16 request back to eight attempts, while a legacy mega16
  restore at 8 shows an explicit 8. Replay never converts an explicit setting to default mode.
  `toConfig` over `defaults()` plus numeric `maxAttempts` uses that number, even with an inherited default
  marker (the export path). The store materializes the effective number before handing default-mode state
  to `toConfig`; the converter must not discard a recorded numeric override. This replay rule does not
  reinterpret a deliberate control edit (`source: 'controls'`), URL override or direct engine argument.
- Do not infer default intent forever from `value === 8` or `value === currentDefault`. That would erase
  an explicit setting. Only the source-labelled replay rule above preserves prior intent on equality.
  Choose a small internal representation and document it in the handoff.

The 120000 ms application guard remains an error, never a request to return a timed best-so-far result.
Cancellation still propagates unchanged; the seed's puzzle depends on deterministic work, not the machine.

## Files to create/modify (exclusive ownership)

- `generator/js/engine/digger.js`, `pipeline.js`; minimal size metadata/access in
  `generator/js/variants/registry.js` and `multigrid.js`.
- `generator/js/ui/store.js`, `controls.js` (including its inline EN/VI strings).
- `generator/js/ui/app.js`, `history.js`, `cache.js`, `export.js` only if a narrowly coupled change is
  necessary for the recorded-number/intent handoff above. Prefer keeping the rule in `store.js`.
  No history/cache version change, history migration, export-format change or client/budget redesign.
- Existing `digger`, `pipeline`, `store`, `controls`, `variants-registry`, `history`, `export`, `cache`, `worker`,
  `recovery-profile` and diagnostic/qualifier fake-worker tests, only where this contract needs coverage.
  No new suite is necessary; if one is needed, own its HTML entry and r5/r6c manifest handoff.
- `generator/tests/soak.js`, `qualify.js` headers/default-contract tests; recovery driver/helper comments
  and directly coupled default expectations. No diagnostic protocol or source-hash rewriting.
- `generator/design.md` pipeline options/API and sections 6.8, 10.4 (control defaults), 14.2
  (URL defaults) and 14.3 (`sg.lastConfig.v1` intent marker/storage shape); both developer guides
  and both user guides, including advanced defaults, migration, recorded-recipe replay and fallback facts.
- `docs/difficulty-v3/notes.md`, `docs/difficulty-v3/evidence/MS05r5p/`.
- No canonical fixtures, workflows, support arrays, earlier reports or evidence changes.

## Implementation steps

1. Implement the one function and size resolution without an extra build, solve or RNG draw.
2. Wire both engine defaults; preserve explicit positive integers and existing validation.
3. Implement default/explicit store intent, once-only migration and the recorded-recipe replay rule;
   update the effective control without changing the saved recipe's attempt budget.
4. Update focused tests and all five requested living documents (design and four guides), plus headers.
5. Run focused checks, then exactly the three diagnostics below on the final source.
6. Hand r5 the actual defaults/identities and item list. Final GG/GR belongs to r6a, not this step.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS05r5p-B01 | Large boards stop after their deterministic default effort and label fallback truthfully |
| MS05r5p-B02 | Users retain explicit settings; legacy default 8 migrates once without a recurring silent override |
| MS05r5p-B03 | No offer, browser-budget, requiredness or R5-selection trade-off is invented |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS05r5p-T01 | Boundaries 81/82/144/145 produce 8/4/4/2; pipeline and direct digger agree on native board sizes |
| MS05r5p-T02 | Scripted no-hit mega16 with explicit 8 actually executes eight attempts; default executes two |
| MS05r5p-T03 | Mega12 shallow after exactly four attempts has exact=false and both approximate/shallow warnings |
| MS05r5p-T04 | Legacy stored migration, explicit settings/URL priority, controls and default switching pass; history/cache replay preserves recorded attempts and prior intent on default equality; export's numeric override wins over inherited defaults |
| MS05r5p-T05 | Both soak routes/qualifier use defaults, no extra model/RNG work, cancellation/error contracts unchanged |
| MS05r5p-T06 | Three diagnostic outcomes, current docs and inherited/new S-OD4 items are handed off; no acceptance/commit claim |

## Test plan and commands

Use the existing scripted strategy/rating seams for attempt counts, not an eight-attempt real mega16 quick
test. Keep genuine validity checks on real small controls. Pipeline/direct comparisons use the same model,
seed and normal configuration; no output equality is claimed between old eight-attempt and new defaults.
Add the requested four-attempt shallow case without weakening the producer's exactness or warning rules.
Test a storage failure as well as a successful migration/reload.

Add tagged `MS05r5p-` regressions on the actual recipe routes, using scripted clients instead of
slow large-board generation:

- In default mode restore a classic9 history entry at 8, then switch to mega16: the replay uses 8
  and the new board's effective default is 2.
- Restore and export an older mega16 history entry at 8: both generated configurations use 8;
  after restore the control shows explicit 8. The export path must cover the real defaults-plus-
  overrides merge, not only a direct pipeline call.
- Replay a value equal to the replayed variant's default while already explicit: it remains explicit
  with that number. Replay must never silently turn explicit intent into default intent.
- Exercise the stale-cache `app.generate(overrides)` path with both a size-default number and a
  non-default recorded number; verify the generated number and the subsequent variant-switch intent.
  No default/explicit marker crosses the pipeline or external exchange boundary.

From Generator, define/dot-source `Invoke-Dv3Node` in this invocation. Existing runner flags only
(r5 has not added listing/results yet); split these focused selectors further if their projection needs it:

```powershell
Invoke-Dv3Node -Task MS05r5p -NodeArgs @('tests\node-runner.js','--suite=store,controls,variants-registry,recovery-profile')
Invoke-Dv3Node -Task MS05r5p -NodeArgs @('tests\node-runner.js','--suite=pipeline','--filter=MS05r5p-')
Invoke-Dv3Node -Task MS05r5p -NodeArgs @('tests\node-runner.js','--suite=history','--filter=MS05r5p-')
Invoke-Dv3Node -Task MS05r5p -NodeArgs @('tests\node-runner.js','--suite=export','--filter=MS05r5p-')
Invoke-Dv3Node -Task MS05r5p -NodeArgs @('tests\node-runner.js','--suite=cache','--filter=MS05r5p-')
Invoke-Dv3Node -Task MS05r5p -NodeArgs @('tests\node-runner.js','--suite=difficulty-diagnostics')
Invoke-Dv3Node -Task MS05r5p -NodeArgs @('tests\node-runner.js','--suite=difficulty','--filter=qualification:')
Invoke-Dv3Node -Task MS05r5p -NodeArgs @('tests\node-runner.js','--suite=help,ui-contract')
```

For each additionally changed suite below, run its changed cases as a separate locked selection:

```powershell
Invoke-Dv3Node -Task MS05r5p -NodeArgs @('tests\node-runner.js','--suite=digger','--filter=MS05r5p-')
Invoke-Dv3Node -Task MS05r5p -NodeArgs @('tests\node-runner.js','--suite=worker','--filter=MS05r5p-')
```

Tag new/changed contract cases consistently and require nonzero selected counts for every executed
filter; do not call a zero-test selection a pass. Include existing directly coupled cases by their
actual filters, or run the whole suite where its projection is <=450 s. The history/export/cache
recipe regressions and difficulty-diagnostics checks above are required, not an unspecified
"diagnostic cases" handoff. No full quick, GG/GR/GH, soak selection or qualification run here.
Final quick belongs to r6b.

Finish with these three existing diagnostic commands, **once each**, separate locked invocations:

```powershell
Invoke-Dv3Node -Task MS05r5p -NodeArgs @('tests\difficulty-recovery.js','--mode=diagnostic','--case=G13','--shallow-cap=256','--json=..\docs\difficulty-v3\evidence\MS05r5p\G13.json')
Invoke-Dv3Node -Task MS05r5p -NodeArgs @('tests\difficulty-recovery.js','--mode=diagnostic','--case=mega12-nightmare','--shallow-cap=256','--json=..\docs\difficulty-v3\evidence\MS05r5p\mega12-nightmare.json')
Invoke-Dv3Node -Task MS05r5p -NodeArgs @('tests\difficulty-recovery.js','--mode=diagnostic','--case=mega16-nightmare','--shallow-cap=256','--json=..\docs\difficulty-v3\evidence\MS05r5p\mega16-nightmare.json')
```

G13 is still samurai Nightmare **seed 42**, not 3; both mega requests use seed 3. The existing diagnostic
CLI requires a cap argument: 256 must equal the production default, not a new experiment. It does not set
maxAttempts. Read normalized attempts 2/4/2, outcome, validation, exact/required/warnings, work, generation
and validation time; exit 0 alone is not a passing outcome. The 500 s diagnostic guard is not the app guard.

## Stop rules

Apply check-list section 2 S-OD4: stop for correctness/evidence corruption or a recorded-decision change.
Slow/default-no-hit diagnostics become named numerical availability/cost items for MS07e and MS18c/MS18d;
continue other work. Do not rerun R5 or tune 256. A changed large-board diagnostic is expected; all six
R5 selection cells have 81 cells, so their accepted selection basis is unchanged.

## Definition of done & handoff

Return APIs/size metadata/intent format, history/cache/export replay evidence, all B/T results, docs,
three outcomes and the cumulative item list.
MS05r5 follows on the same candidate; the orchestrator alone records step evidence and maintains backups.
The prior large-board times are historical, not deleted. No branch commit before r6b plus r6c.

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
