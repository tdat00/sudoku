# MS18d — Epoch 4 (B4) parameterized specification: owner-approved a3 exceptions

Orchestrator record, written 2026-11-20T05:11:39+07:00, of SA2's text-only parameterized B4 specification and SA1's
concurrence. The specification follows; it is a draft only, and no admission is authorized
until the owner decisions and SA1's concurrence are recorded.

## Baseline (checkpoint `e76eb34a`)

- 111 distinct successful chunks, 3,800 requests.
- 9 control-holds and 1 pre-window-hold, all retained.
- 121 C-log lines; the entire prefix is preserved.
- Three incomplete cells, each with two spent admissions and zero payloads:
  `mega16-easy.i0.n50` (Q2/S-OD16), `hyper-hard.i0.n50` (Q3/S-OD17) and
  `butterfly-master.i0.n50` (Q4/S-OD18).
- `all-79/final.m1` is unused.

## Subset S

S is all and only the candidates explicitly granted A, in the order Q2, Q3, Q4; m = |S|. Missing
or ambiguous answers are unresolved, not B. Neither S-OD15's A policy, F3 rulings nor
`eligibleReAsk` grants an exception.

- **m=0:** no B4, V2 or declaration. The final check-only merge runs under B3 and reports
  incomplete 76/79.
- **m=1-3:** SA2/SA1 finalize the exact subset, then the developer is dispatched.

## V2 manifest

V1 (`gp-chunk-manifest.json`) is preserved byte for byte. Only
`gp-chunk-manifest-a3-v2.json` is created, and its entire permitted delta is:
1. schema `ms18d-gp-chunk-manifest-v2`;
2. `parent{file,rawSha256,manifestSha256}` binding V1;
3. `admissionExceptions` containing exactly S, in order, each entry
   `{id:"MS18d-Q<n>-A", ownerDecision:{id,choice:"A",messageId,at,ref}, chunkId,
   runId:"<chunk>.a3", attempt:3, priorRunIds:[a1,a2], maxAdmissions:3, maxPayloads:1}`,
   where each owner reference is the committed decision record;
4. all 229 original slots kept in order, with m a3 slots appended;
5. only `counts.runSlots` changed, to 229+m;
6. the canonical and raw hashes recomputed.

`slotPolicy.chunkAttempts` stays 2. Everything else is unchanged: 79 cells, 114 chunks, 3,950
requests, targets, projections, seeds, protocol and gate. Each candidate's chunk entry is copied
exactly. No extra merge slot and no a4 slot exist.

## Admission accounting

- The default cap stays two admissions and one payload per chunk.
- Each a3 needs its own two consistent, proven-unstarted holds with matching C-log records.
- Refused: earlier payload evidence, uncertain starts, missing or contradictory history, an
  existing a3 folder, borrowing from another chunk, and any a3 for a completed chunk.
- F1 pre-window holds remain zero admissions.
- An a3 hold or failure is terminal for that chunk: no a4, even when eligible. It stops F4 until
  its own line-only disposition.
- F3 keeps `allowAttempt:2` and never 3. The exceptional authority is the owner decision plus
  the frozen V2/B4 binding.

## Identity

There are exactly four tuples: B1/H1/V1, B2/H2/V1, B3/H3/V1 and B4/H4/V2. `judgeRun` and
`frozenRecorderArgs` use each record's historical plan path, raw hash and canonical hash. All
retained ledgers, all 9 holds, the checkpoint GP evidence, the C-log prefix, the base records,
the proofs and the journal prefixes are preserved.

## Implementation boundary (`phase-c/`)

- Helpers: `plan-data.js`, `attempts.js`, `payload-gp.js`, `run-locked-c.ps1`,
  `merge-core.js`, `merge-gp.js`.
- Tests: `test-plan.js`, `test-units.js`, `test-recorder-merge.js`,
  `test-run-locked-c.ps1`.
- Added: `test-epoch4-proof.js` and the V2 data file.

H3->H4 uses an exact-path allowlist with no wildcards. `plan-data.js` stays pure; the proof
tool and the merger verify the exact V1->V2 delta and S. No expensive post-watch work is added.

## Verification

Required tests:
- all 8 subsets, where the empty subset produces no B4 or V2;
- missing, ambiguous, mismatched or wrong-question authority is refused;
- exactly the approved slots exist;
- each a3 needs its own holds;
- a4 and cross-chunk borrowing are refused;
- an eligible a3 hold stops F4;
- historical V1 tuples stay valid;
- a self-consistent but unauthorized V2 is rejected;
- holds never become successes;
- each complete a3 counts exactly 50 requests once.

Real evidence is checked through the file-only proof route. `final.m1` is never used for
debugging.

## Freeze, declaration and execution

1. Commit B4: the implementation, V2, H4 and tooling evidence.
2. Commit the immutable `tasks/difficulty-v3/MS18d-gp-campaign-base-4.jsonl` and its proof. The
   record binds B3/H3, the B1 root, the full checkpoint hash, B4/H4, both plans, all three owner
   decisions, S, retained evidence, journals, reviews, transcripts, the ordered run list and the
   cutover.
3. Validate, then run the a3s serially in S order under the unchanged wide gate (`55c4e867`).
   There are no new exemptions; readiness remains authoritative.

## Final merge

One merge in `final.m1`, after every a3 in S is settled. It gives 76+k complete cells and
3,800+50k requests; only k=3 restores 79/79. The requirement of at least 72 cells meeting strict
`p95 < target` still applies. B never reduces the denominator or waives completeness.

## SA1 concurrence (CONCUR, text-only, ~05:05 +07:00), with conditions

1. Before the developer starts, commit S-OD16/17/18 with the message id, time and verbatim text,
   each explicitly tied to its question ("Q2=A"). A bare "A" or "đồng ý" stays unresolved. Each
   V2 `ownerDecision.ref` cites that commit.
2. Build one B4 only once S is final; never freeze on a partial S.
3. SA1 reviews at the freeze: the H4 diff, an exact V1->V2 proof for S, and a dry `--check`
   of the base-4 record. Before each a3 launch, under the lock and read-only:
   `--history --attempt=3 --expect=allow` under B4, plus the F4/F2, history and status checks.
4. Run the a3s in order, each hold or failure getting its own line-only disposition, and use
   `final.m1` once. Beforehand, the file-only proof route must show exactly 76+k complete cells
   and all 9 holds still counted as holds.

Once all answers are recorded and S is final, the developer may start immediately; the
S-specific part is mechanical and is checked at the freeze.