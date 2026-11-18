# MS17a — Preserve history and identify earlier ratings

| Header | Value |
|---|---|
| Depends on | MS16 accepted |
| Accepted implementation base | `d41a6dd` (MS16); later pack-only commits do not replace this runtime baseline |
| Size / active time | Small-Medium; 30-45 minutes plus bounded GR/quick gates |
| Owner / milestone | Generator history; M17a |
| Authority | R22; SA1-Q-S6, SA2-Q-S07; S-OD4 and S-OD12/S0 |
| Review | Orchestrator template/contract review; MS17b is the next SA1 task |
| Status | Not started; ready for serial dispatch from `d41a6dd` |

## Goal & business context

History stores recipes, not old boards. Preserve those recipes, identify what is known about
their producer, and make clear that selecting one regenerates with the current rating model.

## Scope and repository rules

In: optional per-entry ratingVersion, stored-field/read/render support, bilingual note/tests/docs.
Also in: source-aware replay evidence closure below and current quick/CI timing metadata.
Out: changing history store VERSION 1, deleting old entries, rating/cache bump (MS17b),
engine/solver changes, new techniques, limit/weight changes, offers or source acquisition.
AGENTS/checklist; no Git/pack/log edits; classic scripts, CRLF.

### Accepted baseline — 2026-11-18

MS16 is accepted at **`d41a6dd`**, after orchestrator template review, rechecks and the
evidence-only Q6 corrections. Its final records are in
`docs/difficulty-v3/evidence/MS16/evidence.md`, sections 16 and 23; the accepted complete
quick pair is **`quick-final/`**, not `quick-pass-1/`.
The serial order is **MS17a -> MS17b -> MS18a**, with no second writer.

| App | Accepted tests / suites | Accepted quick time | Accepted fingerprint |
|---|---|---|---|
| Generator | **4,755 / 55** | **549.4 s** | `c72462e8c4f7590edba12db5662128a083a6733c5fb26978d7d332292b13401e` |
| Player | **2,978 / 32** | **116.8 s** | `437d759f2c6b3ba8b359c2bd0db442f443e0153ca5847cf6d58736c4a82eb45b` |

Preserve CI projections (seconds): **core-shared 170, steps 70, replay 70, mega 50,
own-fast 320, digger-target 30, pipeline 80, Generator player shard 90, Player job 180**.
The Generator uses the four bounded manifest groups, **not one whole quick command**.
Keep existing suite/group membership, tiers, factors and workflow limits; derive the new
test totals/fingerprints after the owned changes and maintain projections under the measured rule.

The catalogue is **40 IDs / 34 unscoped**, with all-40 GH matching. Sue de Coq is active at
order **196**, weight **1300**, own work **50,000**; the shared ALS bounds remain
**4 / 4,096 / 50,000**. No unused adjustment transfers to this history task.
The rating and cache versions at this boundary are still **2**; history envelope and worker
wire remain **1**. Only MS17b activates rating/cache 3 and freezes the limits for v3.

Accepted E identities:

- replay, both families: `20d5873db4bd54a510c7c2983ed357b19fab411158c32b32be13fb28f31605da`;
- regression hashes: `8740fd9e8ed34fe1d80fada564b59b5467d75f8f61be0d2c14abae92320dfb4e`.

MS16 changed only `classic9/nightmare#377` among the 520 hash values; its five wires and
fourteen analyses stayed equal to the canonical fixtures. Use these accepted outputs,
not older pre-ALS fixtures. Which ledgers can be retained is specified below.

Carry **S-AV36-S-AV39, MS15b-Q6, MS15b-GP-J, MS15b-GP-U and MS16-Q6**, plus the other
inherited open items. In particular S-AV39 now includes MS16's **2 work caps in 488 seeded
calls, one hiding a Finding needing 101,791 units**, and **301 real calls with no cap**.
Keep those populations separate from MS15a/MS15b's measurements and the later real GH source.
The retained 50,000 is not an exhaustive-coverage claim. No new census, generation-GP,
qualification, limit decision or source hunt is assigned here.

### Process: pause, plans and formatting

Any unresolved permission/contract/evidence choice is a **`QUESTION:` before the first
dependent edit or run**, even if called an assumption, default or final-review judgment.
Return the state, evidence, options and proposed choice; wait for the orchestrator's answer
and explicit resumption. Once paused, do not continue independent edits/runs or gates.
Routine implementation inside the settled contract remains developer work.
Do not repeat MS16-Q6's after-the-fact permission ruling.

**Save and verify each bounded plan before launching its phase**, including expected
statuses, exact cases/commands, current-source projection basis and output paths.
A failed plan write/edit anchor blocks the dependent launch until repaired and verified.
Preserve failed/incomplete runs and actual times; disclosure does not turn a late plan into
a pre-run plan. Follow IR12 admission, the shared slot/locks, <=540 s process-tree ceiling
and >=15 s gaps. Unknown/possibly >10-second work starts through `Invoke-Dv3Node`.
Pentomino's completion does not remove this shared-machine protocol.

**Format-check before every replay freeze**, including the history header, inline EN/VI
strings and added test code: the 110-character code convention, CRLF/no BOM, final newline
and trailing whitespace. Generator UI comments/text are replay-identity inputs too.
Finish all included-source edits before recording; a later included byte change needs
fresh affected-family records, not retagged ledgers. Finish fingerprinted guides/counts
and tests before the final complete quick sets.

Finalize permitted `generator-quick.json` counts/timings/projections/provenance **before
the final CI check**. It is outside app fingerprints but is a separate CI input; a later
manifest edit needs another CI check. Reconcile all final results with the actual current
fingerprints and workflow budgets; do not copy the accepted baseline fingerprints as new results.

**S-OD12/S0:** no new corpus acquisition scan, cached or generated, without prior owner
permission. This is not a new-ID task and inherits **no discovery batch or source-search
allowance** from MS16. The replay manifest and the existing all-40 GH check below are
authorized verification, not discovery. An unexpected missing example is a QUESTION,
not permission to refresh it, search seeds or enlarge the task.

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

Use **`SG.difficulty.RATING_VERSION`** for the current model, not a literal 3: it is 2 on
this base, and the same history logic must work when MS17b makes it 3.
A valid marker is a numeric positive integer, without coercion/rounding of a string or
fraction. Missing/malformed optional metadata is treated as missing and omitted on
persistence; it must not discard an otherwise valid recipe or be replaced with today's version.
Keep every valid positive stored marker, including a future one.
An absent marker does not establish a numeric producer version: retain R22's generic
earlier-version wording, not a claim that the entry is provably v2 or v3.

The marker is display/provenance data, **not** part of `keyOf`/`idOf`, generation overrides,
variant options, cache identity or an external certificate. Do not re-rate old stored
scores/levels. `overridesOf` still uses the recorded requested level and dig settings.
Opening/regenerating the same recipe keeps the existing replacement/`touch:false` semantics;
only the new result's actual producer marker can replace the old one.
Preserve the MS05r5p default/explicit attempt behavior and the imported-result exclusion.

Add two localized strings for the earlier-version note and regeneration explanation. History's
EN+VI packs are registered INLINE at the end of history.js; do not duplicate them in another pack.
Selecting remains the existing recipe regeneration flow, not loading a fabricated old board.
Make the visible note and explanatory text truthful about recipes/current-model regeneration
(a compatible cache may serve the result). Correct the unqualified "same seed, same puzzle"
header/living history wording; do not promise the same or a necessarily different grid across
versions. Preserve the existing same-engine deterministic-recipe test rather than weakening it.

### Anchors verified at d41a6dd

| File:line / quote | Change |
|---|---|
| `generator/js/ui/history.js:18-22`, `const VERSION = 1` | Preserve envelope; add stored field |
| `generator/js/ui/history.js:60-85`, `function entryOf` | Copy actual rating version |
| `generator/js/ui/history.js:92-103`, `storedEntry` / `validEntry` | Optional valid marker; preserve otherwise valid recipes |
| `generator/js/ui/history.js:106`, `overridesOf`; `:142`, `read` | Marker is not a generation input; envelope reader stays version 1 |
| `generator/js/ui/history.js:299`, `metaNodes`; `:306`, `open`; `:348`, `onResult` | Visible note, existing open/result behavior |
| `generator/js/ui/history.js:427-449`, `SG.localeFragments` / `history.open.title` | Inline EN/VI packs; no duplicate locale registration |
| `generator/js/engine/difficulty.js:68`, `RATING_VERSION = 2`; `generator/js/ui/cache.js:47`, `SCHEMA_VERSION = 2` | Read-only in MS17a; both bumps belong to MS17b |
| `generator/tests/suites/history.test.js:1-3`, panel not tested; `:136-137`, stored-key pin; `:240+`, MS05r5p app/store harness | Add real rendering-path coverage, extend only the intended field pin, preserve replay tests |
| `generator/design.md:2014+`, section 14.3 / `sg.history.v1` | Document optional producer marker without changing envelope/cache versions |

## Files to create/modify

- `generator/js/ui/history.js`; history/i18n/help quick suites.
- Generator design 14.3/history section; both user and developer guides (EN/VN); the
  MS17a entry in `docs/difficulty-v3/notes.md`.
- `.github/scripts/generator-quick.json`: owned counts/timing/projection metadata only.
- Owned evidence/scratch under MS17a, including fresh replay ledgers. Canonical
  `replay-wire.js`, `replay-goldens.js`, `regression.js` and `help-examples.js` stay unchanged.
  No recorder, loader, engine, cache, store or Player production edit is assigned.

## Implementation steps

1. Add optional persistence without changing stored VERSION or key/identity.
2. Render both-language note from actual/missing version; leave legacy recipe interaction intact.
3. Test old envelope retention, new round trip, current/future versions and translated placeholders.
4. Finish included-source wording/formatting and freeze; close the source-aware E/GH checks below.
5. Update current docs/counts, finish both quick sets and CI/fingerprints; no claim that version 3
   is already active until MS17b.

## Acceptance criteria — Business

| ID | Criterion |
|---|---|
| MS17a-B01 | Old history survives and is not misrepresented as stored old puzzles |
| MS17a-B02 | New entries identify their actual rating producer |

## Acceptance criteria — Technical

| ID | Criterion |
|---|---|
| MS17a-T01 | VERSION/key remain 1; missing/malformed marker does not erase recipes; valid actual producer marker persists round trip |
| MS17a-T02 | Legacy/current/future rendering and regeneration/dedup behavior are correct |
| MS17a-T03 | Both inline locale packs, guides, source-aware E/GH closure, both final quick sets and CI pass without changing canonical outputs |

## Test plan

Generator `node tests\node-runner.js --suite=history,export,i18n,help,ui-contract`, then both
complete quick sets and the final CI check (the four bounded Generator groups).
Use a saved VERSION 1 envelope with no ratingVersion, current result with actual version, known
older positive version and future positive version. Check readable recipes and no invented board.
Add missing/invalid marker cases without deleting the valid entry, and show that the producer
marker never changes recipe identity or leaks into generation overrides. Keep unsupported
envelope-version behavior, memory fallback, dedup/ordering and recorded-attempt semantics.
The legacy test specimen must actually omit the marker, not inherit it accidentally from
the newly enhanced `entryOf`.

The current history suite does **not** exercise the panel. Add focused Node/controller
coverage with local test doubles for the displayed note, EN/VI locale refresh and opening a
legacy recipe; pure marker-predicate tests alone do not prove the user sees the required text.
Use isolated SG/fragment state and restore any stubs in `finally`, as the existing private
app harness does. No browser/manual run, new dependency or broad UI refactor is assigned.

### E: Generator UI changes the replay identity, not this hash identity

**Yes: `history.js` is in the replay identity.** At this base:

- `generator/tests/node-runner.js` includes `js/ui/history.js` in `SOURCE_FILES` (line 98).
- `replay-fixtures.js::nodeEnv.identity` hashes that **entire** existing source list,
  including Generator UI, plus `RECORDER_FILES`. `replay-goldens.js` uses the same identity.
  Therefore this edit invalidates **both** old replay families even though no generated
  value is intended to change. This is the same rule used by MS13b section 5.
- `perf.js::engineFiles` (lines 157-162) excludes paths matching **`^js/(ui|worker)/`**
  before `hashIdentity` adds `HASH_CODE_FILES`. Generator history is excluded; this is
  not a blanket exemption for every UI file in other directories. The owned history,
  tests/docs/CI-metadata changes should leave the accepted **520-key hash identity unchanged**.

The earlier "no heavy gate or fixture regeneration" sentence is superseded **only as
follows**: fresh bounded replay *records* are required; canonical fixture rewrites and
new hash generation are not. Do not change the identity filters to avoid recording.

1. Complete/format-check the history implementation, inline translations and header,
   save/verify the bounded plan, then freeze the included source and exact diff.
2. Record **all five G09-G13 wires** freshly into MS17a evidence. Merge-check the complete
   family against the unchanged canonical wires **before** the analysis phase.
3. Record **all fourteen G01-G14 analyses** freshly, and complete their merge-check.
   Both families must match the canonical outputs; retain the new current-source
   identity, original requests and G13's **120000 ms** recorder guard. No source retagging.
4. Recompute/check the hash identity and merge-check the **retained complete MS16 hash
   ledgers**, read-only. Report them as retained MS16 evidence, not 520 new MS17a generations;
   do not copy/retag them or run an unselected `--check-hashes` regeneration.
5. Run the existing **all-40 GH check only**, no discovery or write. Nothing in this task
   changes a finder, normal-hint ordering or the Player example contract.
6. Verify final identities after the gates. A later replay-included byte edit requires
   fresh affected replay families. An unexpected hash-identity change, canonical value
   difference or GH failure is a **QUESTION before any fixture/pin/source refresh**:
   this leaf authorizes no hidden engine change or publication of different outputs.

Examples of *individual shards* and complete merge-checks (not a complete execution plan):

```powershell
node tests\replay-fixtures.js --ids=G09 --record=..\docs\difficulty-v3\evidence\MS17a\wire\G09.json
node tests\replay-fixtures.js --merge=..\docs\difficulty-v3\evidence\MS17a\wire --check
node tests\replay-goldens.js --ids=G01 --record=..\docs\difficulty-v3\evidence\MS17a\analysis\G01.json
node tests\replay-goldens.js --merge=..\docs\difficulty-v3\evidence\MS17a\analysis --check
node tests\perf.js --hash-merge=..\docs\difficulty-v3\evidence\MS16\hashes --check-hashes
```

From Player:

```powershell
node tests\tools\make-technique-examples.js ..\generator --max-puzzles=64 --max-hints=400 --check
```

MS16's process measurements were **92.96 s wires, 141.4 s analyses**, with G13 32.9/39.8 s;
they are a planning basis, not guaranteed command bounds. Use current per-item projections
and IR12 admission/sharding, not a monolithic replay invocation or a timeout increase.
No new 520-key generation, GG write, GH write/acquisition, GD/manual, GQ, soak, generation-GP
or pattern-cost campaign is assigned. Keep any genuine cost finding as an inherited/new
item without pretending an incomplete gate passed.

## Definition of done & handoff

MS17b can bump the rating/cache without losing history. Report compatibility vectors and strings,
the fresh two-family replay identity, retained hash identity/check, all-40 GH, exact quick
coverage/fingerprints, CI metadata and all inherited/new items. In particular hand off
actual producer-version copying, not a prematurely installed version 3.

## Resume rules — S-OD4

Review: **orchestrator template/contract review only; MS17b is the next SA1 cross-review**.
Correctness/evidence corruption or changing a recorded decision stops;
time/availability is a named numerical MS18c/MS18d item and work continues within the bounds.
Use `Invoke-Dv3Node` for every possibly >10-second payload, <=540 s, and the current bounded quick
manifest. Own any authorized new suite's r6c CI group; no new slow-cell evidence/tooling class.
Preserve r5p's explicit/default attempt semantics in regenerated recipes. Return the inherited/new item list.

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
