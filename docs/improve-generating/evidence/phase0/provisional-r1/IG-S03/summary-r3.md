# IG-S03 task summary (provisional-r1): scoped solver prototype and virtual-check parity

**PROVISIONAL (pre-freeze). Not an offer, qualification or gate result; nothing here enables a cell, selects an allowance or changes a default.**

Revision `summary-r3`: supersedes the earlier revisions of this summary (summary.json/md and, from r3, summary-r2.json/md), kept unchanged as history. Reporting changes:

- verdict wording: "no material net gain observed on this cohort" replaces the earlier wording and its unexplained 5 % rule; what the verdict does and does not say is stated explicitly
- early-exact list: only requests with firstExactOrdinal = 1 (the earlier list also held first exacts at attempts 4 and 6)
- B02 counts the 24 request identities apart from the 19 audit jobs (the earlier text said 43)
- SM4 scope statement added; the multi-check disclosure is kept

Evidence status: **provisional (pre-freeze)**. Formal gate: **not-evaluable-pre-freeze**. PARTIAL S3: negative scans of naked/hidden singles and the six subset finders only (pointing, box/line, fish, wings, chains, cages and inequalities stay native). It does not supply the report's 1.3-1.65x and does not refute full S3 (see "What the verdict means").

Baselines: IG-S02 summary-r2 (Killer audit overlay); generation baselines of harness dd759a22 reused with the author's approval, nothing rerun (`docs/improve-generating/evidence/phase0/provisional-r1/IG-S02/summary-r2.json`, sha256 `fbbb8298da2ef695bf692c3368ba0bdd6ea3e092081a5a17e0a115b7d80973f2`).

## Coverage

| planned keys | completed | censored | errors | validation unknown |
|---|---|---|---|---|
| 43 | 43 | 0 | 0 | 0 |

| shard | status | attempts | unstarted |
|---|---|---|---|
| audit-1 | recorded | a2 | 0 |
| audit-2 | recorded | a1 | 0 |
| sc-c9 | recorded | a1 | 0 |
| sc-gt | recorded | a1 | 0 |
| sc-killer | recorded | a1 | 0 |
| sc-m12 | recorded | a1 | 0 |
| sc-sam | recorded | a1 | 0 |
| sc-m16 | recorded | a1 | 0 |
| ser-small | recorded | a1 | 0 |
| ser-m12-sam | recorded | a1 | 0 |
| ser-m16 | recorded | a1 | 0 |

## Speed-ups per cell, three separate quantities (ready-wall factor: upper median, min-max, n; n = 3 tails are descriptive)

| cell | report S3 | serial S3 (native-w1 / scoped-native-w1, n=1) | incremental S3 over the pool (attempts-w4 / scoped-attempts-w4) | report S5a x S3 | combined (native-w1 / scoped-attempts-w4) |
|---|---|---|---|---|---|
| mega16 | 1.3-1.65 | 1.03 (1.03-1.03, n=1) | 1.01 (1.00-1.02, n=3) | 2.21-2.97 | 1.97 (1.66-1.98, n=3) |
| mega12 | 1.3-1.65 | 1.01 (1.01-1.01, n=1) | 1.02 (0.97-1.04, n=3) | 3.64-4.95 | 3.34 (2.95-3.49, n=3) |
| samurai | 1.3-1.65 | 1.01 (1.01-1.01, n=1) | 1.02 (0.98-1.02, n=3) | 2.21-2.97 | 1.83 (1.67-1.86, n=3) |
| classic9 | 1.3-1.65 | 0.97 (0.97-0.97, n=1) | 0.91 (0.91-0.99, n=3) | 3.64-4.95 | 2.92 (0.83-3.20, n=3) |
| killer | 1.3-1.65 | 0.94 (0.94-0.94, n=1) | 0.98 (0.94-0.98, n=3) | 3.64-4.95 | 2.50 (2.02-2.50, n=3) |
| greaterThan | 1.3-1.65 | 1.01 (1.01-1.01, n=1) | 0.93 (0.89-0.93, n=3) | 3.64-4.95 | 2.45 (0.83-2.72, n=3) |

Verdicts within the implemented (partial) scope:

| cell | serial S3 | incremental S3 | combined |
|---|---|---|---|
| mega16 | below the planning range (median 1.03 < 1.30): no material net gain observed on this cohort | below the planning range (median 1.01 < 1.30): no material net gain observed on this cohort | below the planning range (median 1.97 < 2.21): no material net gain observed on this cohort |
| mega12 | below the planning range (median 1.01 < 1.30): no material net gain observed on this cohort | below the planning range (median 1.02 < 1.30): no material net gain observed on this cohort | below the planning range (median 3.34 < 3.64): no material net gain observed on this cohort |
| samurai | below the planning range (median 1.01 < 1.30): no material net gain observed on this cohort | below the planning range (median 1.02 < 1.30): no material net gain observed on this cohort | below the planning range (median 1.83 < 2.21): no material net gain observed on this cohort |
| classic9 | no material net gain observed on this cohort: slower than the baseline in every observed pair (max 0.97) | no material net gain observed on this cohort: slower than the baseline in every observed pair (max 0.99) | below the planning range (median 2.92 < 3.64): no material net gain observed on this cohort |
| killer | no material net gain observed on this cohort: slower than the baseline in every observed pair (max 0.94) | no material net gain observed on this cohort: slower than the baseline in every observed pair (max 0.98) | below the planning range (median 2.50 < 3.64): no material net gain observed on this cohort |
| greaterThan | below the planning range (median 1.01 < 1.30): no material net gain observed on this cohort | no material net gain observed on this cohort: slower than the baseline in every observed pair (max 0.93) | below the planning range (median 2.45 < 3.64): no material net gain observed on this cohort |

### What the verdict means

- This PARTIAL S3 (naked/hidden singles and the six subset finders only) does NOT supply the report's 1.3-1.65x on solve work: no material net gain observed on this cohort.
- It does NOT refute full S3: the other 17 techniques (the locked, fish, wing, chain, cage and inequality families: pointing, box/line, fish, wings, chains, cages and inequalities) stay native full scans, and neither their cost nor the cache-overhead attribution (the per-solve state, the invalidation, the skipped-scope loops against the native scans they replace) was measured here.
- SM1 (IG-S07) is still needed to locate where the solver time of a Nightmare request goes and therefore what any S3 could save.

Cold-wall factors and CPU ratios (scoped / baseline; above 1 = more CPU):

| cell | serial cold | serial CPU | incremental cold | incremental CPU | combined cold | combined CPU |
|---|---|---|---|---|---|---|
| mega16 | 1.03 (1.03-1.03, n=1) | 0.98 (0.98-0.98, n=1) | 1.01 (1.00-1.02, n=3) | 0.99 (0.98-1.02, n=3) | 1.96 (1.66-1.98, n=3) | 0.99 (0.96-1.00, n=3) |
| mega12 | 1.01 (1.01-1.01, n=1) | 1.01 (1.01-1.01, n=1) | 1.02 (0.97-1.04, n=3) | 0.99 (0.97-1.01, n=3) | 3.29 (2.91-3.45, n=3) | 1.10 (1.08-1.14, n=3) |
| samurai | 1.01 (1.01-1.01, n=1) | 1.00 (1.00-1.00, n=1) | 1.02 (0.98-1.02, n=3) | 1.01 (0.98-1.03, n=3) | 1.82 (1.66-1.85, n=3) | 1.03 (1.03-1.05, n=3) |
| classic9 | 0.97 (0.97-0.97, n=1) | 1.09 (1.09-1.09, n=1) | 0.92 (0.91-0.99, n=3) | 1.10 (1.01-1.13, n=3) | 2.76 (0.81-3.05, n=3) | 1.64 (1.41-4.84, n=3) |
| killer | 0.94 (0.94-0.94, n=1) | 1.08 (1.08-1.08, n=1) | 0.98 (0.94-0.98, n=3) | 1.06 (1.04-1.10, n=3) | 2.47 (2.01-2.47, n=3) | 1.25 (1.17-1.29, n=3) |
| greaterThan | 1.01 (1.01-1.01, n=1) | 1 (1-1, n=1) | 0.93 (0.89-0.93, n=3) | 1.10 (1.08-1.13, n=3) | 2.40 (0.81-2.69, n=3) | 1.73 (1.39-4.48, n=3) |

## Per request (seconds; ready wall / CPU)

| request | native-w1 | attempts-w4 | scoped-native-w1 | scoped-attempts-w4 | serial x | incremental x | combined x | exact (native / pool / scoped pool) |
|---|---|---|---|---|---|---|---|---|
| mega16:nightmare:1 | 116.04 / 116.19 | 69.96 / 115.22 | n/a | 69.92 / 114.45 | n/a | 1.00 | 1.66 | no / no / no |
| mega16:nightmare:2 | 102.69 / 103.03 | 52.41 / 101.31 | n/a | 51.79 / 102.97 | n/a | 1.01 | 1.98 | no / no / no |
| mega16:nightmare:3 | 107.53 / 107.55 | 55.89 / 105.75 | 104.49 / 105.14 | 54.66 / 103.59 | 1.03 | 1.02 | 1.97 | no / no / no |
| mega12:nightmare:1 | 23.35 / 23.83 | 7.69 / 26.70 | n/a | 7.92 / 27.05 | n/a | 0.97 | 2.95 | no / no / no |
| mega12:nightmare:2 | 22.71 / 23.30 | 7.06 / 26.31 | n/a | 6.80 / 25.63 | n/a | 1.04 | 3.34 | no / no / no |
| mega12:nightmare:3 | 23.50 / 23.92 | 6.86 / 26.10 | 23.33 / 24.11 | 6.72 / 25.86 | 1.01 | 1.02 | 3.49 | no / no / no |
| samurai:nightmare:1 | 26.53 / 27.14 | 14.83 / 28.23 | n/a | 14.53 / 28.39 | n/a | 1.02 | 1.83 | no / no / no |
| samurai:nightmare:2 | 24.93 / 25.56 | 13.64 / 26.84 | n/a | 13.40 / 26.38 | n/a | 1.02 | 1.86 | no / no / no |
| samurai:nightmare:42 | 21.70 / 22.39 | 12.79 / 22.53 | 21.40 / 22.33 | 13.02 / 23.13 | 1.01 | 0.98 | 1.67 | no / no / no |
| classic9:nightmare:1 | 4.98 / 5.64 | 1.55 / 8.19 | n/a | 1.71 / 9.23 | n/a | 0.91 | 2.92 | no / no / no |
| classic9:nightmare:2 | 0.65 / 1.05 | 0.72 / 4.59 | n/a | 0.79 / 5.06 | n/a | 0.91 | 0.83 | yes / yes / yes |
| classic9:nightmare:3 | 5.64 / 6.09 | 1.74 / 8.53 | 5.82 / 6.63 | 1.76 / 8.58 | 0.97 | 0.99 | 3.20 | no / no / no |
| killer:nightmare:1 | 18 / 19.30 | 7.06 / 23.45 | n/a | 7.21 / 24.80 | n/a | 0.98 | 2.50 | no / no / no |
| killer:nightmare:2 | 30.44 / 31.45 | 14.73 / 35.30 | n/a | 15.10 / 36.73 | n/a | 0.98 | 2.02 | no / no / no |
| killer:nightmare:3 | 21.11 / 22.16 | 7.97 / 25.23 | 22.40 / 23.92 | 8.46 / 27.77 | 0.94 | 0.94 | 2.50 | no / no / no |
| greaterThan:nightmare:1 | 0.93 / 1.53 | 1.04 / 6.33 | n/a | 1.12 / 6.86 | n/a | 0.93 | 0.83 | yes / yes / yes |
| greaterThan:nightmare:2 | 19.32 / 25.59 | 6.31 / 31.38 | n/a | 7.12 / 35.61 | n/a | 0.89 | 2.72 | yes / yes / yes |
| greaterThan:nightmare:3 | 11.57 / 15.50 | 4.41 / 24.45 | 11.45 / 15.50 | 4.72 / 26.78 | 1.01 | 0.93 | 2.45 | yes / yes / yes |

Early-exact requests (the pool's first exact result came from attempt 1, `firstExactOrdinal = 1`, in IG-S02: the pool can finish no earlier than that attempt and the speculative starts are pure CPU; combined x below 1 is a regression against today). Requests whose first exact came later (greaterThan:2 at sample 6, greaterThan:3 at sample 4) are not early-exact and are not listed:

| cell | request | first exact | IG-S02 pool vs native x | serial x | incremental x | combined x |
|---|---|---|---|---|---|---|
| classic9 | classic9:nightmare:2 | keeper #1 | 0.91 | n/a | 0.91 | 0.83 (regression) |
| greaterThan | greaterThan:nightmare:1 | sample #1 | 0.89 | n/a | 0.93 | 0.83 (regression) |

Speculation (attempts started / consumed; baseline pool against scoped pool):

| request | baseline started | baseline consumed | scoped started | scoped consumed |
|---|---|---|---|---|
| mega16:nightmare:1 | 2 | 2 | 2 | 2 |
| mega16:nightmare:2 | 2 | 2 | 2 | 2 |
| mega16:nightmare:3 | 2 | 2 | 2 | 2 |
| mega12:nightmare:1 | 4 | 4 | 4 | 4 |
| mega12:nightmare:2 | 4 | 4 | 4 | 4 |
| mega12:nightmare:3 | 4 | 4 | 4 | 4 |
| samurai:nightmare:1 | 2 | 2 | 2 | 2 |
| samurai:nightmare:2 | 2 | 2 | 2 | 2 |
| samurai:nightmare:42 | 2 | 2 | 2 | 2 |
| classic9:nightmare:1 | 8 | 8 | 8 | 8 |
| classic9:nightmare:2 | 5 | 1 | 5 | 1 |
| classic9:nightmare:3 | 8 | 8 | 8 | 8 |
| killer:nightmare:1 | 8 | 8 | 8 | 8 |
| killer:nightmare:2 | 8 | 8 | 8 | 8 |
| killer:nightmare:3 | 8 | 8 | 8 | 8 |
| greaterThan:nightmare:1 | 5 | 1 | 5 | 1 |
| greaterThan:nightmare:2 | 8 | 6 | 8 | 6 |
| greaterThan:nightmare:3 | 8 | 4 | 8 | 4 |

## Parity

Saved puzzles audited: 18 (18 parity-ok, 0 failed). Request identity against IG-S02 (every digest section): 24 of 24 scoped requests identical, 0 failed, 0 not comparable.

| set | puzzles | unlimited runs equal | checks audited | injected failures | equal |
|---|---|---|---|---|---|
| canonical | 18 | 18 | 97457 | 191 | 191 |
| floor | 18 | 18 | 96841 | 180 | 180 |
| oracle | 18 | 18 | 108822 | 219 | 219 |
| proposal | 18 | 18 | 29412 | 180 | 180 |

Synthetic states (pass): 9 scenarios, 757 skipped scopes, 108 crossing the cadence, 0 with several checks, up to 116 distinct incoming residues in one scenario.

| deliberate mutation | detected | scenarios differing |
|---|---|---|
| stale-peers | true | 9 |
| last-count | true | 9 |
| dirty-first | true | 9 |
| bulk-check | true | 9 |

Prototype restored after the mutations: true.

### SM4 scope

SM4 is sufficient for these families on this runtime (naked and hidden singles, the six naked/hidden pair/triple/quad finders): the footprint and invalidation arguments (a scope's result and node increment depend only on its cells; a placement dirties the cell and its peers) and the scratch-use argument (no handler reads an interrupted scan; a negative is recorded only after a completed scan), together with the trace evidence (every check-site token, step and rating equal on 18 saved puzzles in four solver sets, 24 request identities) and the forced-boundary evidence (injected count failures at the first, middle, last and skipped-scope boundary checks, and boundary-injected real ceilings). This is a statement about this runtime and this population, not a certification of the frozen source: the frozen rerun repeats it on the frozen catalogue.

Disclosure kept: skipped scopes that charge two or more virtual node checks are covered only by the engine-free tests (see the limitations); the engine-level audit exercises the crossing of the cadence with different incoming residues.

## Finder families

| family | finders | checks | obligation 1 (check count depends on the footprint) | obligation 2 (no handler reads interrupted scratch) |
|---|---|---|---|---|
| singles | nakedSingle | none | no ctx.check() call at all; the result depends only on the value and candidates of the cell | not applicable: the finder makes no check, so no budget error can interrupt it |
| singles | hiddenSingleBox, hiddenSingleLine | none | no ctx.check() call at all; the result depends only on the values and candidates of the unit cells and completeUnits[u] (fixed for a solve) | not applicable: the finder makes no check, so no budget error can interrupt it |
| subset | nakedPair, hiddenPair, nakedTriple, hiddenTriple, nakedQuad, hiddenQuad | yes (replayed) | one entry check per unit plus one per CHECK_EVERY nodes of a counter that spans the units: the check count of a scope is NOT a function of its footprint alone, but its node increment is; the checks are replayed from the cached increment and the incoming residue (floor((r+inc)/CHECK_EVERY) - floor(r/CHECK_EVERY)) | nothing reads the scratch of an interrupted scan (tech-subset.js re-initialises it by every find and unit, and no handler wraps a subset finder: the only handler that swallows budget.exceeded is tech-chain.js, inside its own find); a negative is recorded only after a completed scan, never when a check threw |

| finder | status | skipped scopes (audit) | skipped scopes (timing) | virtual node checks (audit) | virtual node checks (timing) |
|---|---|---|---|---|---|
| nakedSingle | proved + exercised (skipped scopes under audit) | 1268188 | 1829497618 | 0 | 0 |
| hiddenSingleBox | proved + exercised (skipped scopes under audit) | 62625 | 72704958 | 0 | 0 |
| hiddenSingleLine | proved + exercised (skipped scopes under audit) | 62542 | 52285638 | 0 | 0 |
| nakedPair | proved + exercised (skipped scopes under audit) | 30582 | 21833513 | 63 | 52744 |
| hiddenPair | proved + exercised (skipped scopes under audit) | 24582 | 19474356 | 76 | 65336 |
| nakedTriple | proved + exercised (skipped scopes under audit) | 20222 | 18336336 | 226 | 187820 |
| hiddenTriple | proved + exercised (skipped scopes under audit) | 18833 | 17835458 | 170 | 181543 |
| nakedQuad | proved + exercised (skipped scopes under audit) | 14852 | 14233752 | 321 | 311885 |
| hiddenQuad | proved + exercised (skipped scopes under audit) | 14679 | 14193258 | 284 | 274831 |

17 other techniques of the catalogue stay native full scans (reasons in coverage.json). Scope audit violations: audit 0, timing 0.

## Machine time and priority waits

Charged 1307.2 s of the 1320 s allocation plus 90 s approved by the orchestrator over 12 commands (remaining 102.8 s); priority waits behind difficulty-v3 959.9 s, not charged. charged = occupied wrapper time + the 45 s quiet-admission grace per command; the priority wait is not charged.

| shard | attempt | status | occupied s | charged s | priority wait s |
|---|---|---|---|---|---|
| audit-1 | a1 | parity-failed | 264.09 | 309.09 | 135.49 |
| audit-1 | a2 | complete | 2.14 | 47.14 | 45.22 |
| audit-2 | a1 | complete | 4.06 | 49.06 | 45.21 |
| sc-c9 | a1 | complete | 6.50 | 51.50 | 72.19 |
| sc-gt | a1 | complete | 15.44 | 60.44 | 45.12 |
| sc-killer | a1 | complete | 33.05 | 78.05 | 45.12 |
| sc-m12 | a1 | complete | 23.67 | 68.67 | 45.13 |
| sc-sam | a1 | complete | 43.26 | 88.26 | 45.12 |
| sc-m16 | a1 | complete | 178.82 | 223.82 | 96.28 |
| ser-small | a1 | complete | 41.77 | 86.77 | 45.12 |
| ser-m12-sam | a1 | complete | 47.07 | 92.07 | 60.17 |
| ser-m16 | a1 | complete | 107.35 | 152.35 | 279.79 |

## Acceptance

| id | status | evidence |
|---|---|---|
| B01 | met | every table labels the prototype PARTIAL S3 and the planning range as the full-S3 forecast of the report; no figure is presented as the forecast |
| B02 | met | 24 request identities (every scoped timing request against IG-S02, every digest section): 24 identical, 0 failed; the audit jobs are counted apart (parity.json); unlimited parity on every audited set; injected failures equal |
| B03 | met | 18 of 18 scoped-pool requests (all six headline rows) completed with matched IG-S02 baselines; the two-attempt local work stays limited (peak active attempts in the pool records); serial rows completed: 6 of 6 (a timing-plan item, not part of this criterion) |
| T01 | met | 18 saved puzzles audited; Finding/step/rating digests and the logical check sequences equal in all four sets |
| T02 | met | count failures at the first, middle, last and skipped-scope boundary checks fail at the same ordinal, site and with the same error fields |
| T03 | met | synthetic states crossing the cadence, peer invalidation (shadow check), per-solve isolation and budget-error cleanup; the four deliberate mutations are detected and the prototype restored |
| T04 | met | uncensored scoped outputs against IG-S02's native and pooled digests (every section) |
| T05 | met | timing instances carry no audit instrumentation; skipped/real/virtual counters and CPU are in the records |

## Limitations and open points

- multi-check scopes: 0 skipped scopes of the saved puzzles and 0 of the synthetic states charged two or more virtual node checks (the units of these boards enumerate fewer than 512 nodes per scan); the crossing of the cadence with different incoming residues IS exercised at engine level, the replay of several checks in one scope only by the engine-free tests of scoped-test.cjs on the same runtime code (every ordinal of scripts with multi-check scopes is swept there)
- no solve of the audit population reached a real ceiling by itself: the longest has 28643 checks (ceilings: 100,000 objective, 30,000 Killer rating); naturally binding captured cases: 0. Every ceiling case is boundary-injected by controlled precharge
- the focused engine-free tests (per-solve isolation, budget-error cleanup, mutations on a fake of the engine pieces) ran outside the wrapper because they load no engine and time nothing; their transcript is kept beside this summary
- S3 counters of a pooled request cover the pipeline runs that finished in its workers (consumed and speculative completed attempts); an attempt terminated before its end reports none

## Sources

| item | value |
|---|---|
| runtime fingerprints | 36b2b8327f348fc6fc39471f34608c6679b9f3fc34e48178563cc4424173b50a |
| harness fingerprints | baeb9ea2c1ae6477e2b9a83efc57d73975a204b450b95f7b80e76f1706a20944, dedddaef9979cddbc692430588e0962ae9c5a8926d1e599c05b537ca4d80e58c |
| adapter ids | scoped-solver, scoped-audit, attempt-pool |
| adapter hashes | 965743b9c8e218708d81db314db78b19cdcba1563de8418aa4cba78562f8c90f, df76326083d5e98de7e55bea3d8a2c45106c8a62ae46f30481adbd25b5b20d8f, 3813bdb06e947a014f06c6601a017c52870527f0b15fcfa4a455f648acc7bf06 |
| sources stable | true |
| firewall clean | true |
| commands | audit-1:a2:complete; audit-2:a1:complete; sc-c9:a1:complete; sc-gt:a1:complete; sc-killer:a1:complete; sc-m12:a1:complete; sc-sam:a1:complete; sc-m16:a1:complete; ser-small:a1:complete; ser-m12-sam:a1:complete; ser-m16:a1:complete |
