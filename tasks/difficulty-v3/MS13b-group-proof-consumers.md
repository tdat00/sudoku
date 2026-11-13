# MS13b — Read and display version-2 group proofs

| Header | Value |
|---|---|
| Depends on | MS13a accepted |
| Size / active time | Medium; 35-50 minutes |
| Owner / milestone | Both app proof consumers; M13b |
| Authority | R16/R10 |
| Status | Not started |

## Goal & business context

Prepare truthful group-proof formatting and digit localization while retaining every legacy
singleton example. No grouped finder is active yet.

## Scope

In: Player argument localization/highlights, both i18n chain formatters, mixed/legacy tests/docs.
Out: solver activation, new IDs, production synthetic examples or rating changes.

## Repository rules

AGENTS/checklist; no Git/pack/log writes. EN+VI descriptions, existing symbol formatters, CRLF.

## Inputs & context

R16, verbatim:

```text
i18nArgs = {
  proofVersion:2, kind, length,
  chains: [ [ {cells:[...], digit, truth:0|1}, ... ], ... ]
}
```

> Legacy singleton triples remain readable; pure singleton findings may keep their old representation.
> Format group truth as a disjunction of its member candidates; group false means every member is false,
> not a disjunction of inequalities. Label every member, preserve Wordoku/hexadecimal digit display and
> highlight all proof cells.

Support both numeric raw group nodes and Player-localized `{cells:[labels],digit:displayValue,truth}`.
True group text: `(R1C1=5 ∨ R1C2=5)`; false: `(R1C1≠5 ∧ R1C2≠5)`. Mathematical join symbols need
no language-specific "or" token. Preserve existing `⇒` path and `|` two-path separators.
Do not mutate Finding args during localization; never turn a group into one guessed cell.
The existing step keys stay; update both languages' descriptions to explain grouping/bounded coverage.

Baseline anchors:
`player/js/ui/play.js:226-245` (`function localizeArgs`);
`player/js/ui/i18n.js:240-246` and `generator/js/ui/i18n.js:252-258` (`function formatChains`).

## Files to create/modify

- `player/js/ui/play.js`; both apps' `js/ui/i18n.js`, affected locale descriptions/help.
- Player play/i18n/help and Generator i18n/format/help suites.
- Both app designs' proof/hint sections and both user/developer guides.

## Implementation steps

1. Branch on literal shape while preserving old triples.
2. Localize every group digit/cell using the board's existing symbol/label APIs.
3. Format truth/false correctly; show the complete Finding.cells union.
4. Add raw/localized/mixed/legacy/Wordoku/hex vectors and non-mutation checks.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS13b-B01 | Displayed false group means every member is false |
| MS13b-B02 | Old puzzles/examples and nonnumeric symbols remain readable |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS13b-T01 | proofVersion 2 and legacy paths format without lossy singleton conversion |
| MS13b-T02 | Wordoku/hex, every member highlight and retained input ownership pass |
| MS13b-T03 | Both locale/help sets and both quick sets pass; solver still inactive |

## Test plan

Generator `node tests\node-runner.js --suite=i18n,format,help`;
Player `node tests\node-runner.js --suite=play,i18n,help`; then both quick sets.
Test a two-path contradiction mixing singleton/group nodes, false group conjunction, true
disjunction, a hex value 1 displayed 0, Wordoku letters and another call not mutating saved args.
No heavy gate or synthetic canonical help entry.

## Definition of done & handoff

MS13c may activate only after both consumers accept the new proof. Report exact display vectors.

## Resume rules — S-OD4

Review: analyst cross-review. Stop for correctness/evidence corruption or changing a recorded
decision; performance/availability is a named numerical item for MS18c/MS18d and work continues.
Use `Invoke-Dv3Node` for all possibly >10-second payloads, <=540 s, and the current bounded quick
manifest. Any authorized new suite owns its r6c CI group/manifest entry too.
No new slow-cell evidence/tooling class. Return the inherited/new item list and legacy/group display proof.

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
