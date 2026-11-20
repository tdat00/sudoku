# MS18d — Conditional Q2/Q3 grants: named a3 slots in separate B4

**Conditional developer specification, SA2 ruling incorporating SA1's
22:20 +07:00 pre-review conditions and the later hyper-hard ruling,
2026-11-19. No owner grant is inferred and no a3 is authorized by this file.**
Read `MS18d-hyper-hard-holds-and-scheduling.md` and the epoch-3 repair leaf.
B3 is deployed with V1/cap 2; 39 chunks succeeded and 73 remain. The two
candidate exceptions are separate **Q2 / S-OD16 (mega16-easy)** and
**Q3 / S-OD17 (hyper-hard)**. Do not amend B3 or add exception code there.
This supersedes the earlier, **unimplemented/unfrozen** Q2-only V2 proposal.

## Release and execution order

1. Resolve and record **both** owner answers with their exact question/message
   references and timestamps. An A grants only its named chunk; B, no answer
   or ambiguity grants none. Q2 permission never implies Q3 permission.
   F3 `allowAttempt:2` is not owner authority. Do not freeze a partial grant
   set while another answer is pending and plan to add an undeclared slot later.
2. Finish/dispose the **remaining 73 original chunks** under B3 in their frozen relative order,
   retaining every outcome and any required later F4 dispositions.
   These are two declared unstarted deferrals, not outcome-based reordering
   or permission to replace a slow/failed request.
3. **Only after those remaining 73 chunks are disposed and their immutable outputs/
   C log are checkpointed**, implement/test/review the exception under the
   lock and freeze a new **B4/H4** descendant. **No B4 implementation, test
   or freeze starts during those chunks, including between their calls.**
   B4 edits would dirty the B3 tree and fail its pre-folder status check;
   developer work must not overlap timing. No B3 amendment, old-folder
   rewrite or retagging.
4. Commit a separate **`tasks\difficulty-v3\MS18d-gp-campaign-base-4.jsonl`**
   declaration and transition proof, validate committed journals/identities,
   then run **only the approved a3 slots**, in original matrix order:
   mega16-easy first if approved, hyper-hard next if approved. Each has its
   own lock acquisition, fresh scheduling gate and authoritative admission.
5. After their actual outcomes and any required F4 line releases, run the single
   final check-only `all-79/final.m1` slot under B4. Keep that slot uncreated
   until both owner questions are resolved and every approved exception is disposed.

If **both resolved answers are B**, do none of this implementation: finish the
remaining original chunks and final check-only merge under B3, reporting the
missing cells. With exactly one A, B4 contains only that slot and the other
cell remains incomplete. Neither 77 nor 78 complete cells is a full GP verdict.

## Exact slot and unchanged work

The only candidate additional directories are:

```text
docs\difficulty-v3\evidence\MS18d\gp\mega16-easy\mega16-easy.i0.n50.a3
docs\difficulty-v3\evidence\MS18d\gp\hyper-hard\hyper-hard.i0.n50.a3
```

Create only directories for explicit grants. Each slot is `role:"chunk"`,
its own cell/chunk/run ID from the table below, and `attempt:3`; use the
existing manifest's repository-relative slash convention for `dir`.
There is **no `.a4`**, no extra merge slot and no alternative spelling.

| Question / decision | Cell / chunk ID | Target ms | Projection s |
|---|---|---|---|
| Q2 / S-OD16 | `mega16/easy` / `mega16-easy.i0.n50` | 4000 | 64 |
| Q3 / S-OD17 | `hyper/hard` / `hyper-hard.i0.n50` | 500 | 67 |

Copy each original chunk entry exactly: `i0:0`, `n:50`, `seedBase:7000`,
the original seed list and every other field. Each a3 is that chunk's first
possible actual payload, not another sample set.
Keep all 79 cells / 114 chunks / 3,950 requests / 35 extra cold starts,
summary trace, warmup 0, jobs 1, selected A policy, source/environment/target
identities and 450/540-second limits unchanged.

## Version the manifest; do not edit V1

Preserve `docs\difficulty-v3\evidence\MS18d\phase-c\gp-chunk-manifest.json`
byte-for-byte:

- raw SHA-256:
  `a8e58a729d7df496ae694693a3899236c1abf6aed65a0bfd773f0f262eba0ba5`;
- canonical `manifestSha256`:
  `b92e09bb8c299b8b8ff1330d7ef3845ebcca18dddf71135005e765081cb4618f`;
- schema `ms18d-gp-chunk-manifest-v1`, 229 run slots.

Create **`docs\difficulty-v3\evidence\MS18d\phase-c\gp-chunk-manifest-a3-v2.json`**.
The earlier Q2-only filename was never created/frozen and is not an additional
allowed path. Let **m** be the number of named explicit A grants: **1 or 2**.
For m=0 there is no V2/B4.
The **entire permitted semantic delta** is:

1. Schema becomes **`ms18d-gp-chunk-manifest-v2`**.
2. Add `parent:{file,rawSha256,manifestSha256}` binding the exact V1 above.
3. Add **`admissionExceptions`**, exactly m entries in original matrix order,
   **all and only** the explicitly approved subset of the two table rows.
   Each entry has this shape, substituting only its own named decision/run IDs:

   ```text
   {
     id: "MS18d-Q2-A",
     ownerDecision: {id:"S-OD16", choice:"A", messageId, at, ref},
     chunkId: "mega16-easy.i0.n50",
     runId: "mega16-easy.i0.n50.a3",
     attempt: 3,
     priorRunIds: ["mega16-easy.i0.n50.a1", "mega16-easy.i0.n50.a2"],
     maxAdmissions: 3,
     maxPayloads: 1
   }
   ```

   `messageId`, `at` and `ref` are the actual committed owner decision, never
   placeholders, a developer flag or inferred approval. Bind the same objects
   in the base-4 record and verify equality. Each frozen grant must be traced
   to its own committed decision and jointly reviewed before deployment.
4. Preserve every old run-slot object **and its order**, appending exactly
   the m corresponding slots in the same order. Change only `counts.runSlots`
   from **229 to 229+m**: 230 for one grant, **231 for two**.
   **`slotPolicy.chunkAttempts` remains 2**; no global three-attempt policy.
5. Recompute the canonical `manifestSha256` and record the actual raw digest.

Every other field/value/array remains equal to V1, including `chunks`,
`counts` other than `runSlots`, `protocol`, `gate`, `plan`, `targets`,
`sources`, `environment`, `policy`, `loader` and `runBase`.
The original `final.m1` directory is unchanged. Freeze **both** manifest
files in H4; require the correct one in each historical/request binding.
V2's authorization metadata is not authority for any unlisted chunk or slot.

**Validator boundary:** the byte-identical recorder calls
`plan.verifyManifest(doc)`. Keep `plan-data.js` **pure, with no file I/O**.
It validates V2's own structure/canonical hash and existing internal
range/seed/count invariants: schema v2, well-formed parent fields, exactly
the named approved-subset structure (no other candidate or duplicates),
one appended slot per exception in matching order, `chunkAttempts:2`,
and 229+m slots. It does **not** read V1 to establish a
cross-file equality claim.

The **exact canonical V1->V2 delta** specified above is proven by
`test-epoch4-proof.js` and independently rechecked by the merger, which reads
both manifest files and their raw/canonical identities. H4 pins V2's exact
bytes before any admission. A self-consistent V2 with an unauthorized
baseline change must fail that proof/merge even if its own structural checks
pass; neither a declaration nor the structural validator replaces this proof.

## Accounting: one narrow exception at every boundary

Do not merely widen a CLI enum or set `MAX_ADMISSIONS=3`. Change these coupled
boundaries together, without changing any timed recorder/engine code:

| Helper | Required behavior |
|---|---|
| `plan-data.js` | Continue validating V1 unchanged. Purely validate V2's own structure/hash/invariants and its m named exceptions/slots as specified above; no V1 file read. Exact parent-to-child equality and actual owner-grant equality are the proof/merger's responsibility. Keep the normal cap 2. |
| `attempts.js` | Accept the verified manifest/exception binding explicitly. For each authorized a3 only, require that chunk's own two distinct original `.a1/.a2` folders and matching C-log records, both proved unstarted holds with no payload artifacts/uncertainty; count both as consumed. Permit its third once, with zero earlier payloads and no previous a3 folder/admission. No grant or counter may be shared across chunks; all unlisted chunks keep cap 2. The controller may exclude only its own newly allocated run folder, never an old a3 being reused. |
| `payload-gp.js` | Bind the request to V2's exact slot, chunk, helper/base and owner exception; pass that validated binding to attempt accounting. A numeric `attempt:3` alone is never permission. After excluding its current allocated slot, a3 requires exactly the two validated prior admissions, not a generic `admissions >= 1`. |
| `run-locked-c.ps1` | Mirror the same checks **before creating the folder**, and retain authoritative in-lock checks. Only the named owner-bound V2 slot may pass an expanded enum. Select the frozen V2 path/Required entry for B4. Preserve expensive pre-watch/cheap post-watch ordering; do not introduce another freshness loop defect. |
| `merge-core.js`, `merge-gp.js` | Validate per-epoch manifest/base/helper tuples, the exact version delta/approved subset, and all three admissions for each authorized chunk separately. Retain its own two holds; choose at most one complete actual payload per chunk, never a partial/started replacement. Do not compare old V1 ledgers to a fabricated V2 identity. |

F3's schema/parser remains unchanged: **`allowAttempt:2`, never 3**.
The exceptional authority comes from the actual owner grant and frozen V2/B4
bindings, not by changing either saved a2's eligibility flag.
The frozen policy still requires at least **60 s after that chunk's a2 release**;
apply the more conservative **300 s plus fresh scheduling gate** of the
hyper-hard ruling prospectively as orchestrator scheduling, as well as ordinary
fresh >=15 s quiet-slot/gap checks. All F1/F4/F5/F6, ownership, readiness,
source and cleanup predicates still apply.

Any existing a3 directory, even empty/partial, consumes that admission.
Any evidence of an earlier payload makes a3 impossible, despite the grant.
No-folder pre-window holds remain zero admissions under F1; they neither
erase old admissions nor justify a replacement directory.
After a3 holds/fails, there is **no a4**, including after an eligible CPU
hold. Any new non-success needs its own F4 disposition before the final
merge or another authorized exception; such a line may release only the line,
never another payload for the exhausted chunk.

## B4 change allowlist and identity proof

**No new exception files become allowed changes in B3.** B4 alone may change
these six production helpers under
`generator\tests\artifacts\difficulty-v3\MS18d\phase-c\`:

```text
plan-data.js
attempts.js
payload-gp.js
run-locked-c.ps1
merge-core.js
merge-gp.js
```

The related existing tests are `test-plan.js`, `test-units.js`,
`test-recorder-merge.js`, `test-run-locked-c.ps1`; add the narrowly scoped
`test-epoch4-proof.js` for the frozen transition/proof. Any additional
test/stand-in path must be named and jointly approved before freeze, not
silently admitted by a `test-*` wildcard.
The new V2 manifest, H4 freeze, transition data/proof/transcripts and declared
campaign outputs are the corresponding evidence additions. `tasks\difficulty-v3\`
remains the pack-only declaration/decision path, not executable override code.

**Step-4 transition rule:** `manifestTransition` currently rejects added
non-test entries and admits arbitrary `test-*`/`standin-*` names. Neither
default is correct for H3->H4. Give **step 4 an explicit exact-path policy**:
only the six named production entries and four named existing test entries
may change; only `test-epoch4-proof.js` and the one V2 manifest path may be
added. The V2 manifest is the **sole added non-helper entry**. No removal,
rename, extra test/stand-in or other data-file addition is implicit.
Do not widen earlier epoch rules. The recorded transition proof must still
enumerate the actual old/new hashes; an allowlist is not a substitute for it.

All other H3 entries remain byte-identical, particularly **`record-gp.js`,
the ledger schema, `release-history.js`, `acquisition.js`, `source-binding.js`,
readiness, journals, controller, tee, owned-processes, slot-watch**, and
engine/targets/numerical-plan inputs. If another production change is needed,
stop for a revised joint technical ruling before freeze; do not expand scope.

The exact allowed identity tuples are:

| Epoch | Base/helper | Manifest |
|---|---|---|
| 1 | B1 / H1 | original V1 |
| 2 | B2 / H2 | original V1; zero successful measurement ledgers |
| 3 | B3 / H3 | original V1 |
| 4 | B4 / H4 | owner-bound V2 |

Reject cross-pair mixing even if each individual hash appears somewhere in
the table. Validate each saved ledger/request/HEAD against its **own tuple
and R3 base**, and the final merge against B4/H4/V2. Prove both the exact
manifest delta and B3->B4 helper/path diff; do not retag an old ledger or
pretend the plan SHA never changed.

In particular, resolve the verified epoch **before** `judgeRun` compares
`request.plan.manifestSha256`/raw SHA or constructs
`frozenRecorderArgs(planRel, slot)`: epochs **1–3 use V1's original path and
hashes; epoch 4 uses V2's path and hashes**. Do not select an epoch solely
from an untrusted request's plan path or compare all requests to the final
merge's V2 `doc`. Old command arguments and ledgers remain byte-identical;
the final merge itself is bound to B4/H4/V2.

The append-only, never-edited **base-4 record** follows base-3's record/proof
pattern, adding V1/V2 parent/current identities and the exact
`admissionExceptions`/owner-decision bindings, including both resolved answers.
It must name B3/H3, B1 campaign
root, the actual post-B3 checkpoint, B4/H4, exact allowed changes, transition
proof, reviews/suites, inherited source/environment/policy, journal versions
and cutover `nextChunk` equal to the first approved exception's chunk,
`nextAttempt:3`, plus the exact ordered exception run-ID list.
Its `retainedEvidence.successes` lists **every** prior success with its real
epoch and unchanged ledger digest; list every hold/failure and preserve the
whole C-log prefix. Counts are actual checkpoint counts, not assumed 112.
B3 may not be omitted just because its measured code equals B1's.

## Verification before a3

Use the existing bounded file-only/stand-in suites under the lock, not a
trial real admission. Add focused cases that fail without the implementation:

- V1 still refuses a3. V2 structural/hash/slot errors fail the pure validator;
  missing/wrong A authority or an unauthorized cross-file parent/workload
  delta fails its binding/proof/merge checks, including a structurally valid
  altered V2 with a freshly recomputed canonical hash.
- Test step 4's exact transition policy: the six named production changes,
  four named existing tests, added proof test and added V2 path are allowed;
  other production changes, arbitrary `test-*`/`standin-*`, other data
  additions, removals/renames and changes to V1 are rejected.
- Exercise all grant combinations: only Q2 A, only Q3 A, both A, neither A.
  Each nonempty manifest includes exactly its approved subset and 230/231
  slots; no-answer/B grants none and both-B creates no V2/B4.
  Each authorized a3 requires its own two preserved holds; using another
  chunk's approval/counter/holds, an omitted approved slot, an unapproved
  slot, duplicate slot or any a4 refuses.
- Missing/contradictory prior records, any prior payload artifact, an existing
  a3 directory, duplicate success or started/partial replacement refuses.
  An eligible CPU hold on **a3 still stops F4**, including for the final
  merge until its own line-only disposition, and a4 remains refused.
- Unmodified mixed-epoch retained ledgers validate only against their exact
  tuples; tampered/cross-paired identities and any retained-hold-to-success
  reclassification fail. Test the original V1 request path/arguments/hashes
  for epochs 1–3, V2 for epoch 4, and rejection of swapped paths or hashes.
- Each successful stand-in a3 supplies its original 50 requests exactly once;
  held/failed/unapproved a3 leaves its own cell incomplete, not the other
  chunk's samples reusable. Verify the prescribed mega-before-hyper sequence
  and F4 blocking between slots. Check all-79 completeness and >=72 strict
  p95 successes separately; no default pass or missing-sample fill.
- The repaired C-history exclusion, append-only checks and slow-full-check
  freshness tests remain passing. No new status/authority check is put in
  the 600 ms post-watch window.

Re-freeze and obtain SA1 code/identity acceptance and SA2 pack concurrence;
commit B4 and its declaration/proof/owner binding; run committed live journal
and source/plan checks before one fresh admission. The recorder remains
unchanged and the terminal outcome is accepted as evidence, not rerun.
