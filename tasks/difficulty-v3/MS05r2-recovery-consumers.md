# MS05r2 — Correct measurement and manual consumers on the active tree

| Header | Value |
|---|---|
| Depends on | MS05r1 step evidence complete, reviewed; same uncommitted MS05b1 tree |
| Size / active time | Medium; 35-50 minutes |
| Machine time | Approximately 1-5 minutes of focused/synthetic checks |
| Acceptance | Step evidence complete only; no branch acceptance or commit |
| Authority | S-OD2; absorbed MS05b2; R2-R5/R23, FS04/FS06 |
| Status | Not started |

## Goal & business context

R5 must count required exactness on both routes. The current soak pipeline branch still infers
exactness from the level name, affecting Killer and Jigsaw (three of the six selection cells).
Finish the consumer/manual duties without changing generation again.

## Scope

In: strict soak/qualifier predicates, diagnostic prefix rejection, seven manual contract sites,
focused tests/docs. Out: generator/solver policy, allowance selection, corpus refactor, qualification
or fixture refresh. Absorbs the full technical scope of MS05b2; that file is no longer a dispatch.

## Repository rules

AGENTS/checklist; no Git, private-ref, pack or Execution-log edits. Classic fixtures, built-in
Node tools, CRLF/no BOM/final newline. No full quick requirement at this intermediate step:
known G13/pin/budget failures are checked by r4 and MS05r6a/r6b, not excused as passed here.
All possibly >10-second work uses the shared lock/540-second helper; jobs 1/no `--jobs`.

## Inputs & context

Current canonical result contract:

```text
exact = complete canonical rating in requested band AND requiredOf(...).required === true
quality = 0 exact; 0.5 in-band shallow; old off-band distance; Infinity unrated
```

Absent exact is false. Soak uses `p.exact === true` on the direct route and `r.exact === true`
on the pipeline route. Do not derive it again from achieved/requested names.

Qualifier: retain independent solution/givens consistency, uniqueness, complete-rating,
achieved-level and approximate-warning guards; add `result.exact === true`. A pure Node helper
beside the existing exported helpers makes the final predicate testable:

```js
function hitOf(out, requested) {
  return out.valid === true && out.solved === true && out.approximate === false &&
    out.exact === true && out.achieved === requested;
}
```

Set `out.exact = result.exact === true`; call this only after the existing independent checks.
Do not change qualification scheduling/seeds/budgets or run real qualification.

### Ordered-prefix validation before generation

After all `--weights`/`--bands` overrides, for every registered variant and every `D.LEVELS`
entry (plus the no-model case), use the actual registry order:

```js
const ladder = SG.techniques.list().filter(function (tech) {
  return Object.prototype.hasOwnProperty.call(D.WEIGHTS, tech.id) &&
    (variantId === null || SG.techniques.appliesTo(tech, variantId));
}).map(function (tech) { return tech.id; });
const floor = D.floorTechniques(level, model);
const allowed = floor.concat(D.tierTechniques(level, model));
// Ordered equality: ladder.slice(0, floor.length) equals floor;
//                   ladder.slice(0, allowed.length) equals allowed.
```

Use `{variantId:id}` descriptors, not generated large boards. A pure checker in the existing
`tests/fixtures/difficulty-diagnostics.js` returns null or
`{variantId,level,kind:'floor'|'allowed',expected,actual}`. Load it even without `--json`.
An invalid prefix prints both lists and exits 2 **before any generation/RNG request**, including
with `--no-gate`. Do not sort the ladder by weight or fall back to another floor solve.
Real invalid vector: `--weights={"nishio":1}` as one argv item; distinguish rejection from bad JSON.

### Manual contract sites

I5 is exact => solved, requested band and requiredness on the actual model. Preserve independent
uniqueness checks, score-band tests, all sample counts, thresholds and budgets. Update only the
coupled shallow/approximate warning assumptions; a shallow result has both warnings.

| Site at `f788e02` / quote | Duty |
|---|---|
| `generator/tests/soak.js:267-283`, `function generateOne`, notably `:281` | Authoritative exact on both routes |
| `:104-105`, `opts.weights`, `opts.bands`; `:188`, `Object.assign(D.WEIGHTS, opts.weights)` | Validate after overrides |
| `generator/tests/qualify.js:170`, `out.hit =` | Preserve all guards plus exact |
| `generator/tests/manual/difficulty.test.js`, hit counter / I5 / `digLevel makes one attempt` | New exactness meaning, no threshold change |
| `killer.test.js:1069`, `variants.test.js:202,260` | `p.result.exact` for wrapped results |
| `jigsaw.test.js:843`, `greater-than.test.js:1008,1108`, `extra-regions.test.js:530,550`, `wordoku.test.js:771` | Pipeline `p.exact`; warnings consistent |

Find the quoted functions/test names if line numbers moved. MS05b3 later changes only corpus/
registration structure after the selected default, preserving these assertions.

## Files to create/modify (exclusive ownership)

- `generator/tests/soak.js`, `qualify.js`, diagnostic helper/suite and necessary fixture list.
- The seven named manual files, at contract sites only; no cache/registration refactor here.
- `generator/design.md` 15.3/15.4, both developer guides and v3 notes.
- `docs/difficulty-v3/evidence/MS05r2/`; no application, locale or generated fixture change.

## Implementation steps

1. Correct both measurement routes and qualifier `hitOf`; preserve all seeds and routing.
2. Add the ordered-prefix check with zero-generation rejection tests.
3. Update the seven named manual contracts without changing their populations/thresholds.
4. Run syntax/focused checks only; hand every changed site/test name to MS05b3 and MS05r6b.
5. Document truthful semantics. Do not run full quick or renew E at this still-interim boundary.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS05r2-B01 | R5/qualification/manual consumers never count an in-band shallow result as exact |
| MS05r2-B02 | Invalid overrides cannot produce misleading certificate evidence |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS05r2-T01 | False/absent exact is a miss; qualifier still requires every independent validity guard |
| MS05r2-T02 | All variant/level prefixes checked; invalid override exits 2 before generation |
| MS05r2-T03 | Seven manual contracts retain counts/budgets/thresholds and pass syntax |
| MS05r2-T04 | Focused checks pass; no generated-output change; deferred whole-set gates clearly named |

## Test plan and commands

`hitOf`: true baseline; independently false valid/solved/exact, absent exact, true approximate
or wrong achieved level each miss. Default and valid band overrides pass prefixes; nishio
weight 1 fails with expected/actual lists and no generation callback. Restore overrides in
`finally`. Direct/pipeline fixture rows with equal level names and exact=false both miss.

From Generator:

```powershell
node --check tests\manual\difficulty.test.js
node --check tests\manual\killer.test.js
node --check tests\manual\variants.test.js
node --check tests\manual\jigsaw.test.js
node --check tests\manual\greater-than.test.js
node --check tests\manual\extra-regions.test.js
node --check tests\manual\wordoku.test.js
Invoke-Dv3Node -Task MS05r2 -NodeArgs @('tests\node-runner.js','--suite=difficulty-diagnostics,difficulty-floor,help')
Invoke-Dv3Node -Task MS05r2 -NodeArgs @('tests\node-runner.js','--suite=difficulty','--filter=qualification:')
```

Check each syntax exit. Last command is the existing fake-worker contract, not real qualification.
Estimate seconds per selector, 1-5 minutes total; every invocation <=540 s. Announce possibly
heavy work, use the same lock helper, jobs 1/no `--jobs`. No GG/GR, generated manual batch or full quick.

## Stop rules

Stop for a newly failing focused/syntax check, changed generation/RNG behavior, weakened predicate
or inability to preserve an assertion. Known unrun G13/mega/full-quick gates remain outstanding;
do not mark them green or rewrite their budgets.

## Definition of done & handoff

Return the predicate/prefix proof and seven-site inventory. The orchestrator records **step
evidence complete**, backs up the same working tree and may dispatch MS05r3. No commit.

## Execution log

| Field | Value |
|---|---|
| Status | Step evidence complete (S-OD2: no acceptance and no commit of its own; the combined acceptance and the one commit come after MS05r6b) |
| Start | 2026-11-13 10:13 (+07:00) |
| End | 2026-11-13 10:33 developer; 10:35 orchestrator review |
| Duration | 20 min developer; about 2 min review |
| Model | claude-sonnet-5.5 (developer); orchestrator review claude-opus-5.5 |
| Token usage | 122 model calls; 27,534,989 input tokens (27,199,739 cache reads); 116,833 output tokens |
| AI credits | about 473 (developer) |
| Verification | Developer: `node --check` on the seven manual files, `soak.js`, `qualify.js`, the fixture and the suite; through `Invoke-Dv3Node`: `--suite=difficulty-diagnostics,difficulty-floor,help` 131/131 (38.5 s), `--suite=difficulty --filter=qualification:` 6/6 (3.6 s); two real-CLI refusal probes exit 2 with nothing generated; three mutation checks caught and restored; engine source hash identical to MS05r1's. Orchestrator re-run under the sudoku lock: the same two selectors 131/131 (38.9 s) and 6/6 (3.4 s), `--suite=recovery-profile` 26/26 |
| Acceptance | MS05r2-B01, B02 and T01..T04 met as step evidence. A hit is the strict `exact` flag on both soak routes (`p.exact === true` direct, `r.exact === true` pipeline: the `soak.js:281` route that counted a shallow result of the requested level as a hit) and in the qualifier (`hitOf`, every independent guard kept); I5 also checks requiredness; the pure `prefixViolationOf` checks every variant and level before any model build, RNG request or generation (exit 2). The seven manual sites keep their names, counts, thresholds, seeds and budgets (syntax-checked only; first exercised by MS05b3 and MS05r6b). Evidence `docs/difficulty-v3/evidence/MS05r2/evidence.md`; notes.md MS05r2 section |
| Issues & resolutions | (1) The helper signature, left open, is `prefixViolationOf({ difficulty, techniques, variantIds })` so that a test can pass a fake registry; the `floor` kind cannot be the first violation on the real registry and is tested on a fake one; a band override alone cannot break the prefix while the weights keep registry order, so the violating vector in the test is a weight. (2) The technique-set membership checks in `killer`, `greater-than` and `extra-regions` keep `rating.level === level`: they are not hit counters. (3) The heavy `soak.js` and `qualify.js` tools were not run (step scope). (4) No lock contention, no incident |
| Handoff | MS05r3: no consumer work is left; the soak reads `p.exact` (direct) and `r.exact` (pipeline); the soak and the diagnostics helper are r3's to extend. MS05r4: the soak, the qualifier and every manual hit counter count only the required exact flag, so R5 measures the same thing. MS05b3 and MS05r6b: the seven manual sites are syntax-checked only; their names, `> `-prefixed filters and counts are unchanged |
