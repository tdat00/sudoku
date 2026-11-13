# MS17a — Preserve history and identify earlier ratings

| Header | Value |
|---|---|
| Depends on | MS16 accepted |
| Size / active time | Small-Medium; 30-45 minutes |
| Owner / milestone | Generator history; M17a |
| Authority | R22; SA1-Q-S6, SA2-Q-S07 |
| Status | Not started |

## Goal & business context

History stores recipes, not old boards. Preserve those recipes and tell users truthfully when
selecting one will generate under a different rating model.

## Scope and repository rules

In: optional per-entry ratingVersion, stored-field/read/render support, bilingual note/tests/docs.
Out: changing history store VERSION 1, deleting old entries, rating/cache bump (MS17b).
AGENTS/checklist; no Git/pack/log edits; classic scripts, CRLF.

## Inputs & context

R22, verbatim:

> New history entries store ratingVersion. Entries lacking it say "made by an earlier version;
> selecting it generates a new puzzle." They are not provably v2 and do not contain the old puzzle.
> Keep the history store's `VERSION=1`: `read` returns an empty list for another stored envelope version.

`entryOf(result)` copies a valid positive integer `result.rating.ratingVersion`; never stamp a
missing/old result with today's version. Add ratingVersion to STORED_FIELDS. `validEntry` keeps
accepting missing version. Keep storage key, envelope version, ID/dedup/order/limit behavior.
Current generated results carry the field; legacy recipes remain readable and removable/selectable.
Missing or smaller-than-current version gets the earlier-version note; equal does not. Never call
a future positive version "earlier". Do not claim every old entry is v2.

Add two localized strings for the earlier-version note and regeneration explanation. History's
EN+VI packs are registered INLINE at the end of history.js; do not duplicate them in another pack.
Selecting remains the existing recipe regeneration flow, not loading a fabricated old board.

### Anchors at `2c665bb`

| File:line / quote | Change |
|---|---|
| `generator/js/ui/history.js:18-22`, `const VERSION = 1` | Preserve envelope; add stored field |
| `generator/js/ui/history.js:60-85`, `function entryOf` | Copy actual rating version |
| `generator/js/ui/history.js:92-103`, `function storedEntry` | Optional legacy-compatible persistence |
| `generator/js/ui/history.js:290-320`, `history.item.meta` | Localized note |
| `generator/js/ui/history.js:430-449`, `history.open.title` | Inline EN/VI packs |

## Files to create/modify

- `generator/js/ui/history.js`; history/i18n/help quick suites.
- Generator design 14.3/history section; both user and developer guides.

## Implementation steps

1. Add optional persistence without changing stored VERSION or key/identity.
2. Render both-language note from actual/missing version; leave legacy recipe interaction intact.
3. Test old envelope retention, new round trip, current/future versions and translated placeholders.
4. Update docs; no claim that version 3 is already active until MS17b.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS17a-B01 | Old history survives and is not misrepresented as stored old puzzles |
| MS17a-B02 | New entries identify their actual rating producer |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS17a-T01 | VERSION/key remain 1, missing version accepted, field persists round trip |
| MS17a-T02 | Legacy/current/future rendering and regeneration/dedup behavior are correct |
| MS17a-T03 | Both inline locale packs, guides and both quick sets pass |

## Test plan

Generator `node tests\node-runner.js --suite=history,i18n,help`, then both quick sets.
Use a saved VERSION 1 envelope with no ratingVersion, current result with actual version, known
older positive version and future positive version. Check readable recipes and no invented board.
No heavy gate or fixture regeneration.

## Definition of done & handoff

MS17b can bump the rating/cache without losing history. Report compatibility vectors and strings.

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
