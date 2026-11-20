# MS05r5p — Legacy-8 migration fix round (binding CV6-04 addendum)

| Header | Value |
|---|---|
| Kind | Same-task MS05r5p fix round, not a new task or acceptance boundary |
| Authority | Fable's 2026-11-14 CV6-04 answer, option (b), in `docs/difficulty-v3/clarifications-resolved.md` |
| Prerequisite / order | MS05r5p step evidence complete; wait for the current serial repository dispatch to finish; complete before MS05r6b |
| Acceptance | Extend MS05r5p-T04/T06 step evidence; no separate commit |
| Review | Existing remaining-MS05 analyst review rule |

## Binding ruling and scope

An unmarked legacy `maxAttempts: 8` is read as default on **every board**. This corrects (c2)'s
wording, not its policy. It supersedes the original MS05r5p larger-board-only migration and its
small-board explicit-8 expectation. Addendum A1 (clearing the control) and RS01 (recorded recipes)
remain unchanged.

Only the old `sg.lastConfig.v1` record read through `storedAttempts` is migrated. The boolean-marker
branch, other valid stored numbers, deliberate control entries, URL attempts, direct engine arguments
and recorded history/cache/export recipes retain their existing behavior. Keep the 1-20 control range.
No engine source, size policy, allowance, budget, R5, storage key/version or recipe format change.

Schedule before MS05r6a freezes E where possible, and always before MS05r6b. Do not edit runtime
sources while MS05b3 or another dispatch is running. The orchestrator owns the serial slot, backups,
logs and eventual combined commit. No staging, commits, stash/reset, branch/ref/backup writes, pack
edits or edits to the completed Execution log by the developer.

## Files owned in this round

- `generator/js/ui/store.js`: the one condition and two comments below.
- `generator/tests/suites/store.test.js`: the migration expectation and focused cases below.
- `generator/design.md` section 14.3 and `DEVELOPERGUIDE.md` / `DEVELOPERGUIDE.vn.md`: migration facts.
- User guides only where migration is already described. Both currently do:
  `USERGUIDE.md:229-230` and `USERGUIDE.vn.md:228`, so update both in this round.
- `docs/difficulty-v3/evidence/MS05r5p/evidence.md`: current migration description, closure of
  "Decisions to confirm", item 1, and this fix-round handoff. New results/transcripts go under
  `docs/difficulty-v3/evidence/MS05r5p/legacy-8-fix/`.

No other runtime module, test suite, deep tool/fixture, `SOURCE_FILES` list, generated fixture,
workflow, old raw record or earlier measurement is owned. Use existing tooling/dependencies.
CRLF, UTF-8 without BOM, final newline and no trailing whitespace.

## Approved items 1-5, with Fable's additions

1. Change only the migration condition in `storedAttempts` (`store.js:508`) to:

   ```js
   else if (number === LEGACY_MAX_ATTEMPTS) explicit = false;
   ```

   Remove `&& defaultAttempts(id) !== LEGACY_MAX_ATTEMPTS`; keep the preceding boolean-marker
   branch, numeric validation and effective-number/fallback calculation unchanged. Do not change
   normal store updates, `normalize`, `toConfig`, `nextAttempts` or recipe replay.

   **Fable's addition:** rewrite the `storedAttempts` doc comment (`store.js:497-502`) and the
   legacy-default comment at `store.js:39-40` in the same edit. Say that unmarked legacy 8 means
   default on every board, other valid numbers stay chosen, and the next save writes the intent
   marker. Do not describe a smaller-board exception or imply that loading increments a counter.
2. Update the existing classic9 migration assertion (`store.test.js:1092-1095`) to
   `['classic9', 8, false]`. Add a focused legacy classic9 case that switches to mega12 (4),
   mega16 (2), and back to classic9 (8), all in default mode.

   **Fable's addition:** add a case for legacy `maxAttempts: 8` with a missing or unknown `variantId`
   (a small parameterized case may cover both). It must load in default mode using the default of
   the variant the store actually falls back to; do not introduce another variant-to-attempt map.
3. Persist/reload the migrated state both while the small-board number is still 8 and after a
   large-board switch; the saved false marker must preserve default intent on the next switch.

   **Fable's addition:** load the same unmarked legacy record twice with **no save in between**.
   Both loads must produce the same default-mode state; the saved legacy record remains unmarked
   until an ordinary save. "Once" is the marker at that save, not a counter or a one-load effect.
4. Add the complementary marked-explicit classic9 8 case: switching to a large board and reloading
   must keep explicit 8. Also cover entering 8 after migration and reloading, so migration is once-only.
   Keep the existing other-number, storage-failure, explicit URL/control and recorded-recipe
   regressions; none may be weakened. The untouched replay/engine suites are not rerun in this round.
5. Align the migration comments, the living documents below and step evidence with the approved
   choice. Remove the old claim that small-board legacy 8 stays explicit, including the parenthetical
   in `design.md` section 14.3. In `evidence/MS05r5p/evidence.md`, mark "Decisions to confirm",
   item 1 **closed by CV6-04 (b), Fable, 2026-11-14**, and link the resolved answer and fix results.
   Update the current representation paragraph; preserve earlier commands, outcomes, raw records,
   diagnostic source hashes and timings as historical evidence, not rewritten measurements.

Use the existing storage fakes and actual store load/set/config path. Tag added cases with
`MS05r5p-CV6-04` so r6b can identify their new inventory membership. No large-board generation
is needed to exercise a variant switch or inspect its effective attempts.

## Document sentence (EN and Vietnamese)

Use this sentence where both developer guides and `generator/design.md` section 14.3 explain
the stored configuration; retain the surrounding explicit-value and recorded-recipe guarantees.
The present anchors are `DEVELOPERGUIDE.md:260-264`, `DEVELOPERGUIDE.vn.md:247-250` and
`generator/design.md:1871`. Apply the corresponding sentence to the user guides because they
already describe the migration, as noted above; do not add an unrelated migration section.

**English** (developer guide, design, and the existing user-guide migration paragraph):

> A last configuration saved before size-dependent defaults that holds 8 without an intent marker
> is read as the default because it cannot be distinguished from a deliberately chosen 8;
> entering 8 again makes it an explicit choice.

**Vietnamese** (developer guide and the existing user-guide migration paragraph):

> Cấu hình gần nhất được lưu trước khi có mặc định theo cỡ bàn, chứa số 8 nhưng không có dấu ghi nhận
> lựa chọn, được hiểu là dùng mặc định vì không thể phân biệt với số 8 do người dùng chủ động chọn;
> nhập lại 8 sẽ giữ số đó như một lựa chọn tường minh.

## Focused verification only

Read AGENTS/check-list; define/dot-source `Invoke-Dv3Node` in this PowerShell invocation, from
`generator`. Announce/obtain the shared-machine slot; one command at a time, <=540 s and the
15-second gap. Use fresh output names on a repeat, never overwrite earlier results.

```powershell
Invoke-Dv3Node -Task MS05r5p -NodeArgs @('tests\node-runner.js','--suite=store','--verbose','--results=..\docs\difficulty-v3\evidence\MS05r5p\legacy-8-fix\store.json')
# Only if a guide changes; the required guide corrections on the present tree meet this condition.
Invoke-Dv3Node -Task MS05r5p -NodeArgs @('tests\node-runner.js','--suite=help,ui-contract','--verbose','--results=..\docs\difficulty-v3\evidence\MS05r5p\legacy-8-fix\help-ui-contract.json')
```

These are the only suite selections for this fix round. They replace, for this round only, the
original MS05r5p full verification/closure-command list. No full quick, engine/replay suite,
diagnostic, generation, soak, qualification, timing, deep, GG/GR/GH or R5 run.

## Evidence validity and handoff

**No new measurement.** MS05r5m's fourteen deep records and MS05r5p's three closure diagnostics
stay valid: the engine and their direct generation paths are unchanged. Keep their original hashes,
records and timings, and do not rerun or relabel them.

`store.js` is in the loader's `SOURCE_FILES`, so its edit changes the broad `sourceHash` despite
not being called by `SG.pipeline.normalizeConfig` or `SG.pipeline.run`. Supply the exact store diff
and the complete changed-file list. The orchestrator supplies the hash-bound producer snapshot
identified in SA1's review (`ad77fdf`); the developer creates or changes no backup ref.

MS05r6a A item 4 and MS05r6b B1 already explicitly accept this approved store-only CV6-04 change
by exact-diff compatibility proof, with unchanged tool/check/request/default identities. Keep any
false `currentMatches.sourceHash` result honest; do not patch a digest or `SOURCE_FILES` to make it true.
Those tasks perform the identity audit; this round does not rerun the deep reconciler or measurements.

Return: condition/comment diff; all five items and three additions checked; actual focused-suite
counts/exits/results paths; changed document locations; closed evidence item 1; new test names
for r6b; the store-only compatibility handoff and inherited S-OD4 items. Final quick inventory/
coverage belongs to r6b. Existing Execution logs and the check-list summary rows remain untouched.
