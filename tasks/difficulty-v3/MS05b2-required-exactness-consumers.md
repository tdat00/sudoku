# MS05b2 — Consumer scope absorbed by MS05r2

| Header | Value |
|---|---|
| Depends on | No independent dispatch; MS05r2 follows MS05r1 on the preserved active tree |
| Size / active time | Absorbed; see MS05r2 |
| Owner / milestone | Generator tooling/manual contracts; M5b2 |
| Authority | R2-R5/R23; FS04/FS06/FS22; S-OD2 recovery |
| Status | Superseded as a dispatch and acceptance boundary |

## Current routing — binding S-OD2-S-OD4 amendment

[MS05r2](MS05r2-recovery-consumers.md) already delivered this scope as retained step evidence;
do not redispatch it or this archived file. MS05b3 follows r5p/r5/r5m under S-OD3/S-OD4, not
passed original mega limits. r6b reconciles its CV3 deep reuse and numerical item list; r6c
closes CI before the combined commit/MS05e. Correctness remains mandatory; time-only findings continue.

| Retained requirement | Current evidence owner |
|---|---|
| MS05b2-B01/B02, T01/T02 | MS05r2 strict producer flags, independent guards and zero-generation prefix rejection |
| MS05b2-T03 | MS05r2 seven manual sites/syntax; MS05b3 early I5/CV3 and MS05r6b classic9 GD |
| MS05b2-T04 | MS05r2 no-output-change/focused checks; MS05r6b complete final quick coverage |

The original prerequisite, full-quick commands, later-owner labels and independent-commit
wording below are **archived**, not executable instructions. The current r2/r6a/r6b files and
checklist control. Preserve the empty Execution log for the orchestrator's combined sign-off.

## Archived pre-S-OD2 specification

## Goal & business context

Make evidence count genuinely exact puzzles, not merely matching level names. Reject diagnostic
overrides that invalidate the canonical prefix proof before they generate anything. Finish the
consumer half of MS05b without changing the engine or generated output again.

## Scope

In: soak/qualifier predicates, prefix validation, directly coupled manual exactness/warning
contracts and focused quick tests/docs. Out: any generator/solver policy, cap, target, fixture
refresh, qualification run/support change, or relaxed hit/time assertion.

## Repository rules

AGENTS/checklist; no Git/pack/log edits. Classic fixtures, existing Node CommonJS tools, no packages.
CRLF/no BOM/final newline. Manual files are edited only at named contract sites and syntax-checked.
MS05b3 follows this task in the recorded order: it makes the variant corpora lazy per level,
runs bounded I5/CV3 cells and explicitly hands projected-overlong CV3 cells to MS05d after
selection. MS05d also owns the full classic9 difficulty GD. This FS25/FS26 handoff amendment
does not decide CV6-02 or change any prerequisite; that answer may revise the sequence.
MS05b3 does **not** precede or block implementing/accepting MS05b2; assigning that next task here
closes the late-discovery gap in FS22. Do not fold its cache refactor or heavy run into this task.
The one fast fake-worker qualification filter below is explicitly owned.
Use the shared lock for commands over 10 seconds.

## Inputs & context

MS05b1's authoritative result:

```text
exact = complete canonical rating in requested band AND requiredOf(...).required === true
quality = 0 exact; 0.5 in-band shallow; old off-band distance; Infinity unrated
```

The result, worker wire and view already carry `exact`; an absent field is false, never inferred
from level names. This is the named owner of MS05a's remaining `soak.js:281` and `qualify.js` handoff.

### Consumer predicates

- Soak `generateOne` pipeline branch: `exact: r.exact === true`; direct branch uses `p.exact === true`.
- Qualifier: retain independent solution/givens consistency, uniqueness, complete-rating and
  approximate-warning guards, and additionally require `result.exact === true`. A matching
  achieved level remains a consistency check, never sufficient on its own.

For focused tests factor the existing worker's final predicate into a Node-only helper:

```js
function hitOf(out, requested) {
  return out.valid === true && out.solved === true && out.approximate === false &&
    out.exact === true && out.achieved === requested;
}
```

Set `out.exact = result.exact === true` after generation; call `hitOf` after the existing independent
validity checks. Export it beside `qualify.js`'s existing CommonJS helpers; retain its main guard.
Do not turn this test seam into a new qualification protocol.

Soak/manual I5: an exact flag implies solved, requested band and requiredness on that puzzle's
model. Keep independent uniqueness checks before reference solves. Genuine score-band assertions
still compare scores; do not blanket-replace every level comparison.

### Prefix validation after overrides (FS06)

After applying `--weights`/`--bands`, before any model generation or RNG request, check every
registered variant id and every global `D.LEVELS` entry. Also retain the test's no-model case.
Use lightweight `{ variantId: id }` descriptors; no large board construction is needed.

```js
const ladder = SG.techniques.list().filter(function (tech) {
  return Object.prototype.hasOwnProperty.call(D.WEIGHTS, tech.id) &&
    (variantId === null || SG.techniques.appliesTo(tech, variantId));
}).map(function (tech) { return tech.id; });
const floor = D.floorTechniques(level, model);
const allowed = floor.concat(D.tierTechniques(level, model));
// Both equalities are ordered array equalities:
// ladder.slice(0, floor.length) === floor
// ladder.slice(0, allowed.length) === allowed
```

Expose a pure checker in the existing `tests/fixtures/difficulty-diagnostics.js` helper for its
quick suite, returning null or `{ variantId, level, kind, expected, actual }`. Load this pure helper
before the check even when `--json` is absent; the existing diagnostic-only load path is insufficient.
`kind` distinguishes floor/allowed. On failure soak prints the variant, level and both lists and exits 2 even with
`--no-gate`; it generates no request. No fallback to a separate floor solve for an invalid ladder.
Use the real weighted/applicable registry order, not an unfiltered registry or a newly weight-sorted list.

Valid CLI failure vector: `--weights={"nishio":1}` puts a late technique into a cheap allowed set.
It must fail the prefix check, not JSON parsing. Test via an argv array or quote the whole argument
as one PowerShell string. Restore mutated weights/bands in unit-test `finally` blocks.

### Anchors at `f788e02` (MS02 moved soak; unchanged sites still match `6165c42`)

| File:line / quote | Change |
|---|---|
| `generator/tests/soak.js:104-105`, `opts.weights`, `opts.bands` | Existing override parsing |
| `:188`, `Object.assign(D.WEIGHTS, opts.weights)` | Validate after all overrides, before generation |
| `:260`, `function seedFor(tag)` | Preserve seeds |
| `:267-283`, `function generateOne(combo, tag)` | Strict producer flag, notably pipeline line 281 |
| `:586`, `const ok = failed === 0` | Preserve invariant failure semantics |
| `generator/tests/qualify.js:170`, `out.hit =` | Keep all guards plus authoritative flag |
| `generator/tests/suites/difficulty-floor.test.js:152-172` | Prefix oracle copied above |

Manual sites at the baseline, found by their hit/I5 text if lines moved:
`difficulty.test.js` classic9 hit counter/I5/digLevel; `killer.test.js:1069`;
`variants.test.js:202,260`; `jigsaw.test.js:843`; `greater-than.test.js:1008,1108`;
`extra-regions.test.js:530,550`; `wordoku.test.js:771`.
Killer/variants wrappers use `p.result.exact`; pipeline results elsewhere use `p.exact`.
Update only their coupled approximate/shallow warning expectations. Keep all thresholds and CV6.

## Files to create/modify (exclusive ownership)

- `generator/tests/soak.js`, `qualify.js`; existing diagnostic helper/suite, plus its fixture test
  list only if an existing list needs the already-owned helper.
- `generator/tests/manual/difficulty.test.js`, `killer.test.js`, `variants.test.js`,
  `jigsaw.test.js`, `greater-than.test.js`, `extra-regions.test.js`, `wordoku.test.js`.
- `generator/design.md` 15.3/15.4, both developer guides for override rejection; v3 notes.
- No engine, locale or generated fixture change. MS05b1 owns the explanation and warning grammar.

## Implementation steps

1. Consume strict exact flags in soak and qualifier; test the factored hit predicate.
2. Implement the exact prefix checker and pre-generation rejection; preserve all seed/routing behavior.
3. Update named manual hit/I5/warning contracts without weakening counts, budgets or assertions.
4. Syntax-check all seven files; run focused quick/fake-worker tests and both quick sets.
5. Document which legacy exactness assumptions changed; hand off the seven-site inventory to
   MS05b3, then MS05c/d. Include the exact current I5/CV3 test names and unchanged counts/thresholds;
   syntax checks are not a claim that those generation assertions passed.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS05b2-B01 | Soak, qualification and manual hit counts cannot call an in-band shallow result exact |
| MS05b2-B02 | Invalid diagnostic overrides cannot produce misleading requiredness evidence |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS05b2-T01 | Same-band exact=false/absent misses; exact=true still needs every validity/solved/warning guard |
| MS05b2-T02 | Ordered floor and allowed-prefix checks cover every variant/global level; broken overrides exit 2 before any request |
| MS05b2-T03 | Seven manual files keep all thresholds, pass syntax, and have explicit exact=>required contracts; changed sites/test names are handed to the assigned immediate MS05b3 GD owner |
| MS05b2-T04 | Both quick sets pass; no generated puzzle, rating or fixture changes |

## Test plan

- Soak fixture: identical requested/achieved names with exact=false stays a miss; direct and pipeline agree.
- Qualifier `hitOf`: true baseline; separately false valid, false solved, true approximate, absent/false exact
  and wrong achieved level each miss. Keep fake-worker parent scheduling tests unchanged.
- Default registry passes every prefix; late `nishio` weight 1 fails with diagnostic lists. A valid band
  override preserves the ordered prefix. Assert the generation callback was never reached on rejection.
- Manual warning branches distinguish approximate-only from complete same-band shallow's two warnings.

From Generator:

```powershell
node --check tests\manual\difficulty.test.js
node --check tests\manual\killer.test.js
node --check tests\manual\variants.test.js
node --check tests\manual\jigsaw.test.js
node --check tests\manual\greater-than.test.js
node --check tests\manual\extra-regions.test.js
node --check tests\manual\wordoku.test.js
Invoke-Dv3Node -Task MS05b2 -NodeArgs @('tests\node-runner.js','--suite=difficulty-diagnostics,difficulty-floor,digger,pipeline,events,result-view,worker,cache,steps,help')
Invoke-Dv3Node -Task MS05b2 -NodeArgs @('tests\node-runner.js','--suite=difficulty','--filter=qualification:')
```

Check `$LASTEXITCODE` after each syntax command. The last selector runs only Node fake-worker
qualification tests, not the generated classic9 batches; expect seconds. Then locked quick sets
from both apps. No GG/GR/GH, GQ, performance run or full GD; output is unchanged.

## Definition of done & handoff

Report every predicate/manual site, the prefix diagnostic and zero-generation rejection proof,
test counts and no-output-change evidence. MS05b3 runs the variant contracts early using the same
seeds/counts in bounded per-level corpora; do not describe the syntax-only checks here as GD evidence.
MS05c then measures the same authoritative exact predicate on both routes. MS05d runs classic9 GD
and re-projects/closes MS05b3's explicitly deferred per-level CV3 list after selection, under the
bounded/known-shortfall protocol, not old name equality. CV6 remains open for MS05e.

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
