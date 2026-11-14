# IG-S02 killer re-audit (provisional-r1, audit-a1)

**PROVISIONAL (pre-freeze). Not an offer, qualification or gate result; nothing here enables a cell, selects an allowance or changes a default.**

Status **complete**. Audited 6: 6 verified, 0 failed, 0 unknown; links ok 6/6. Verifier tests passed (8/8 tampered puzzles rejected).

Rule: cages partition the 81 cells once, each non-empty, connected, distinct, with the sum of its distinct saved solution digits; the model rebuilt with SG.killer.modelFromCages from the saved cages (saved order) has the same COMPLETE wire: 27 base units, one cage unit per cage of size >= 2, none for a singleton, no extra unit, same colours and layout; nothing repaired. Solution/givens, uniqueness, canonical rating and requiredness checks unchanged.

| key | original | audit | exact claimed / verified | structure | unique | canonical | requiredness | link hash |
|---|---|---|---|---|---|---|---|---|
| IG-S02/killer/killer:nightmare:1/native-w1 | error | verified | false / false | true | true | true | true | fb57cb61b5da |
| IG-S02/killer/killer:nightmare:1/attempts-w4 | error | verified | false / false | true | true | true | true | f1250ccf64f0 |
| IG-S02/killer/killer:nightmare:2/attempts-w4 | error | verified | false / false | true | true | true | true | 3555ec29bcdc |
| IG-S02/killer/killer:nightmare:2/native-w1 | error | verified | false / false | true | true | true | true | fb056581b0e4 |
| IG-S02/killer/killer:nightmare:3/native-w1 | error | verified | false / false | true | true | true | true | 2a8d42cb4c2c |
| IG-S02/killer/killer:nightmare:3/attempts-w4 | error | verified | false / false | true | true | true | true | 8ad87991c436 |

| tampered case | rejected | structure valid | first error |
|---|---|---|---|
| remove-a-cage-unit | true | false | structure: killer: unitMeta: saved 52, rebuilt 53, first difference at 27 (missing saved e |
| extra-cage-unit | true | false | structure: killer: unitMeta: saved 54, rebuilt 53, first difference at 53 (extra saved ent |
| wrong-cage-unit-cells | true | false | structure: killer: units: saved 53, rebuilt 53, first difference at 27 |
| wrong-cage-sum | true | false | structure: killer: cage 0 has sum 23 but the solution digits give 22 |
| cage-not-distinct | true | false | structure: killer: cage 0 is not distinct |
| cell-in-two-cages | true | false | model.validate: V6: cell 3 belongs to cages 0 and 1 |
| cell-in-no-cage | true | false | structure: killer: cage 0 has sum 22 but the solution digits give 21; 1 cells are in no ca |
| swapped-cage-order | true | false | structure: killer: units: saved 53, rebuilt 53, first difference at 27 |

Harness since the evidence (dd759a22 to c4f3a6e0): changed aggregate.cjs, ig02-run.cjs, worker.cjs; added ig02-killer-audit.cjs, killer-audit-test.cjs, killer-audit.cjs. ig02-run.cjs and aggregate.cjs changed after the evidence only in reporting (pair rows, cell summary, task summary); the generation hooks (prepare, execute, augmentRecord), attempt-pool.cjs, attempt-worker.cjs, the adapter, the plan, host.cjs, loader.cjs and run.cjs are those of the evidence. worker.cjs changed only in validate() (the Killer branch of the structure check) and killer-audit.cjs is new: verification only, no generation path.
