# MS05a — Exactness transport and prepared shallow messages

| Header | Value |
|---|---|
| Depends on | MS04 accepted |
| Size / active time | Medium; 40-55 minutes plus GR |
| Owner / milestone | Generator pipeline/UI; M5a consumers ready |
| Authority | R4; SA1-Q-S3, SA2-Q-S06 |
| Status | Not started |

## Goal & business context

An exactness flag must survive the worker boundary and reach the result view. Prepare that path and
the shallow vocabulary before MS05b changes generation acceptance; do not activate requiredness here.

## Scope

In: internal result/wire boolean, result-view consumer, event schema, translated shallow messages.
Out: new keeper/search behavior, emitting shallow from production, cap selection, rating version.

## Repository rules

Read AGENTS/checklist; no Git writes, pack/log edits or unowned gates. CRLF, classic scripts, EN+VI.
Only current worker results are authoritative; no imported summary becomes a canonical proof.

## Inputs & context

R4, verbatim:

> Preserve `difficulty.approximate` for every non-exact returned fallback. Add `difficulty.shallow`
> only for a complete in-band result proved shallow, not for unverified/unrated results.
> Add `tune.shallow`; retain `tune.hit` for exact and `tune.miss` for other misses.

Prepare, without yet emitting the new production event:

```text
PuzzleResult.exact:boolean
Wire.exact:boolean                    // WIRE_VERSION remains 1
fromWire: exact = wire.exact === true // absent/false never reconstructed from matching level names
tune.hit / tune.miss / tune.shallow:
  required:true|false|null, target:finite number|null (optional)
```

Copy the current `puzzle.exact` into `pipeline.run`'s result and through toWire/fromWire. The producer
still uses its old meaning until MS05b. New event args supplement, not replace, existing lists.
Shallow args: requested/achieved/score/scoreMin/scoreMax/sample/maxSamples/required/target.
Hit retains hardestTechnique. Do not derive requiredness in the UI.

Warning text: `The puzzle is in the requested score band but does not need a {level} technique`.
Add `difficulty.shallow` to `WARNING_KINDS` with kind `approximate`; localize the requested level
before passing `{level}` to the translator. Prepare `tune.shallow` text explaining need, not
"wanted Hard, got Hard". Both Generator locale files get matching placeholders.

### Anchors at `2c665bb`

| File:line / quote | Change |
|---|---|
| `generator/js/engine/pipeline.js:234-254`, `const result = {` | Include current exact flag |
| `generator/js/engine/pipeline.js:291-333`, `function toWire` | Both directions |
| `generator/js/ui/result-view.js:165`, `exact: requested === achieved` | Consume strict result flag |
| `generator/js/engine/events.js:850-853` | tune vocabulary |
| `generator/js/ui/result-view.js:53-66` | warningModels localization |

## Files to create/modify

- `generator/js/engine/pipeline.js`, `events.js`; `generator/js/ui/result-view.js`, `app.js`
  only for warning classification/Retry; `locale.en.js`, `locale.vi.js`.
- Related `pipeline`, `events`, `result-view`, `i18n`, `steps`, `help` quick suites.
- E's affected GR fixtures; no puzzle hashes unless a genuine unexpected generation change is found.
- `generator/design.md` 7.2/10.5/13.9; both developer guides. User-facing shallow descriptions remain
  labelled prepared until MS05b emits them.

## Implementation steps

1. Add strict wire/result transport and stop the result view's level-name inference.
2. Prepare event args and both locale packs; preserve all old required schema fields.
3. Update affected synthetic result builders to state explicit exactness; do not make undefined true.
4. Check mock same-band/false, true, missing, and raw worker round trips. Prepare warning Retry behavior.
5. Refresh explained wire/analysis data, document the internal contract, leave acceptance unchanged.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS05a-B01 | A same-level fallback is not displayed as exact merely because names match |
| MS05a-B02 | Both languages can explain shallow results when activation arrives |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS05a-T01 | True/false/absent wire flags, result view and final-event flags agree |
| MS05a-T02 | Required true/false/null and target finite/null pass strict event schema tests |
| MS05a-T03 | Localized `{level}`, approximate warning kind and Retry are covered |
| MS05a-T04 | No production shallow emission or acceptance/rating change; quick sets pass |

## Test plan

Generator: `node tests\node-runner.js --suite=pipeline,events,result-view,i18n,steps,help`.
Both app quick sets afterwards. Include `result-view.test.js:66` and pipeline final-event expectations
at `:309,1144`; retain old imports and stub-version meanings.

GR, Generator, complete E wire/analysis route using MS05a:

```powershell
node tests\replay-fixtures.js --ids=G09 --record=..\docs\difficulty-v3\evidence\MS05a\wire\G09.json
node tests\replay-goldens.js --ids=G01 --record=..\docs\difficulty-v3\evidence\MS05a\analysis\G01.json
```

Repeat E's full manifests, merge/write/check. Jobs=1, no --jobs flag; 1-120 seconds per request,
5-35 minutes total estimate. **Announce to the orchestrator before starting (pentomino runs in
parallel on the same machine).** Ten-minute ceiling; no GQ/GD/full performance gate.

## Definition of done & handoff

MS05b receives working transport and untranslated-placeholder-free messages; production still has
the prior acceptance predicate. Report exact changed contracts, B/T evidence and refresh diffs.

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
