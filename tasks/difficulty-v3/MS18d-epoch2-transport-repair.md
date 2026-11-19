# MS18d — Named epoch-2 transport repair and continuation

**Later halt:** B2 `b6de2c46` / H2 `bd6949ef` and declaration `42533fcc` were
reviewed and used. The subsequent real mega16-easy **a2 created its folder**
and held at acquisition on the release-history defect; its admission is now
consumed. **Do not follow the older a2 resume instruction below again.**
`MS18d-epoch3-release-history-repair.md` is the current ruling: checkpoint a2,
preserve all data, prepare the semantic reader repair and await the owner's
decision on an exceptional third admission. B2/its record remain immutable.

**Joint ruling:** SA2 concurs with SA1's independent analysis: **fix (b)** and
**identity option (i), one declared second epoch**, preserving every completed
record. This is a narrow R3 compatibility amendment, **not an owner question**:
the measured process and owner-approved request/timing/target/CPU protocol do
not change. No restart, rerun, replacement, hidden retagging or out-of-tree
override is authorized. The campaign remains paused until the resume gates below.

## Frozen incident and preserved state

- Original base **B1 = `a2e6423a52a89dd36ee646aa14706dd2369e087f`**.
  Its immutable base record remains at commit **`f7f56cbb`**.
- Epoch-1 helper manifest:
  `docs\difficulty-v3\evidence\MS18d\phase-c\helpers-c1b-sha256.txt`,
  **`5feeb42f31148b086105ac8579d7c3dbfab14193d460fa8a5a0bc05ce95def03`**,
  **52 entries**.
- **Checkpoint `4db0114e0acd325a34b29a7741ca8eb75e178813`** preserves all GP run
  outputs and the C log: **22 successful chunks, 19 complete cells, 950
  recorded requests**, plus `mega16-easy.i0.n50.a1` and its no-folder a2
  pre-window hold. Its changes are ordinary R3 output/pack paths.
- The first 22 manifest chunks end at **`mega16-veryEasy.i0.n50`**.
  **92 chunks / 3,000 requests remain unexecuted**, starting with
  **`mega16-easy.i0.n50` attempt 2**.
- That chunk's a1 is an artifact-free unstarted `control-hold`, exit 64,
  `eligibleReAsk=true`, released **18:47:51.850 +07:00**. EventLog/svchost PID
  3640 at **0.924 CPU-s/s** was a real additional-consumer hold, not an exemption.
- The 18:49 a2 invocation ended after about 1,203 s in **`pre-window-hold`**.
  No a2 folder, admission or payload exists. Its last 4.233-second watch and
  misleading foreign-lock wording remain historical bytes, not rewritten.
  This wait is **not GP generation time**.

SA2 verified the code/evidence file-only. `run-locked-c.ps1:701-723` reruns full
`Test-LineChecksC` plus `Get-HeadIdC` after each 15.3 s watch, then rejects the
watch when those checks exceed **600 ms**. Repeating a new full watch cannot
fix a check that always takes longer; the whole-log/Git cost grows.
The existing merger **does reject mixed identities**:
`merge-gp.js:108,229`, `merge-core.js:277,311-324,479-485`; the expected identity
contains both helper SHA and base. Its R3 ancestry/path checks are at 445-469.
Admission's unchanged `source-binding.js` also rejects helper changes since
the supplied base. None of those checks may simply be disabled.

## Developer assignment — fix (b), not a looser freshness threshold

Keep the **15.3 s** lock-free window, **<=1,000 ms** observation cadence and
acquisition freshness, **600 ms** cheap-post-watch budget, 450/540, F1-F6 and
the single **1,200 s** watch/recheck deadline unchanged.
Reject (a)'s proposed 1.5 s blind interval: a slow Git call can itself exceed
the required cadence. Raising `WatchFreshMs`, truncating the C log, ignoring
F4/F2 or forcing admission would not repair the defect.

Inside `run-locked-c.ps1`, for each bounded cycle:

1. Perform full F4/F2, host, stale-lock and HEAD checks **before** the watch.
   Capture a cheap state fingerprint: HEAD; C-log existence/byte length/
   `LastWriteTimeUtc`; the sorted folder names under this cell's GP directory;
   and whether the requested slot folder exists. Bind the token to the state
   actually checked: compare before/after the full checks and repeat/refuse
   on change, rather than snapshotting an unseen new stop after an old check.
   Existing immutable run contents and committed-journal rules remain binding.
2. Obtain the quiet watch within the **same deadline**. Recompute release
   constraints from the validated history; never reset the deadline per cycle.
3. After a successful watch, do **only the cheap invariance check**
   (`git rev-parse`, FileInfo/listing), not another full log/journal parse.
   If it matches and watch age is **<=600 ms**, proceed through the existing
   final slot/absence checks and create the folder last. The controller's
   independent <=1,000 ms acquisition gate remains unchanged.
4. If the fingerprint changed, go back through **full checks before another
   watch**. A new stop/used slot/invalid HEAD throws without a folder.
   If cheap work itself ages the watch, retain that reason and retry only
   inside the remaining single deadline; no timestamp refresh pretending an
   unobserved gap was watched. No late folder/payload on deadline exhaustion.
5. A give-up records **outer watch count and repeat reasons/durations**, not
   just the final short watch. Preserve `pre-window-hold`, no folder and
   zero-admission semantics. Do not falsely attribute stale checks to a
   foreign lock or edit the old incident record to fix its explanation.

Regression checks, under the lock and with no real GP:

- full checks delayed **1.5 s** still reach the stand-in call; exercise a
  larger growing synthetic C log, not just fake Git/tiny logs;
- a stop appended during the watch changes the token, is re-read and refuses
  without a folder; likewise HEAD changes, new chunk/slot folders and invalid
  fingerprint facts;
- the one deadline, give-up diagnostics, no-folder/no-admission behavior and
  unchanged 600/1,000 ms boundaries;
- **PowerShell-only, read-only real-repository timings** of full and cheap
  checks for the current a2 and next a1 path. The next a1 is currently blocked
  by F4: time/report that refusal honestly, do not release it for a probe.
  Use isolated lock fixtures for integrated watches; a test holding the real
  mutex must not wait for its own mutex to disappear.

## Exact R3 epoch exception — two declared pairs, not relaxed matching

Put the wrapper repair and **check-only merger epoch support in one B2 fix
commit**, with tests/freeze/evidence, and obtain **SA1 review before resuming**.
B2 must descend from checkpoint `4db0114e` and therefore B1.
Use a new helper manifest, e.g.
`docs\difficulty-v3\evidence\MS18d\phase-c\helpers-epoch2-sha256.txt`.
Never overwrite the epoch-1 manifest or base record.

The two helper manifests may differ only in these Phase-C files:

- **`run-locked-c.ps1`** — the pre-payload transport repair above;
- **`merge-core.js`, `merge-gp.js`** — check-only epoch selection/proof/reporting;
- named **`test-*` / `standin-*`** files needed to verify those changes.

This is the maximum development scope, not a future wildcard waiver.
The reviewed B2 record must enumerate the **exact changed file names and
before/after hashes**, including additions/removals if any in the test class.
**Every other helper-manifest entry is byte-identical**: recorder, loader/schema,
readiness/probe/core, acquisition, attempts, journal readers, source binding,
controller, tee, owned-processes, slot-watch, targets and chunk plan included.
No new production helper module outside the three named files.

The B1-to-B2 committed diff may contain only that reviewed helper set,
versioned Phase-C freeze/transcript/tooling evidence, exact campaign run-output
paths, append-only C log and `tasks/difficulty-v3/` pack files.
Preserve all checkpointed run bytes and the C-log prefix. No engine, timing
function, seed, source/target/plan identity, Node/machine, selected A policy,
budget, warmup, guard, 50-request cohort or statistics change.

**Per-record validation:**

1. Accept exactly **(B1, H1)** and **(B2, H2)** from the committed epoch
   declaration, where H1 is the full `5feeb42f...` above and H2 is the newly
   frozen manifest SHA. Reject a third identity, swapped base/SHA pair or
   inferred fallback. Never replace/strip identity fields in a ledger.
2. Select each complete ledger's expected identity and R3 head checker from
   its declared pair. Request/binding/ledger bases must agree with that pair.
   Its actual HEAD must be that base or its R3-allowed descendant.
   Run the **same full** source, raw-time, readiness, receipt, stderr,
   cleanup, range and no-replacement checks; no weaker epoch-1 path.
3. All identity fields other than this explicit **base/helper pair** remain
   equal across the matrix. Preserve epoch provenance per consumed ledger.
   Keep report exit/result-line/statistic semantics unchanged; the merge run's
   own identity is B2/H2 and is not a relabel of the input records.
4. The 22 checkpointed successes remain byte-identical and are not requested
   again. No additional H1 payload is scheduled. New recording uses H2/B2 for
   the 92 unexecuted chunks only. An epoch-1 unstarted hold may accompany an
   epoch-2 successful a2: a valid hold has no measurement identity/ledger, and
   remains subject to unchanged F5 artifact checks.
5. Preserve every admission/payload count and F3/F4 state across the cutover.
   **B2 is a transport epoch of the same campaign, not an empty new campaign.**
   Do not truncate/reinitialize the C log, journals, folders or counters.
   Use the original frozen chunk IDs/run slots; epoch selection never resets
   an attempt or grants a payload retry.

Merger tests must include the two valid pairs and cross-epoch hold/a2, wrong
pairing/third identities, changed measurement/helper bytes, illegal transition
paths, retagged/modified old ledgers and failed-payload replacement.
Validate the checkpointed 22 read-only with the new checker; missing remaining
records are incomplete, not fabricated successes. Do this in tooling/test
output, **not the single real final-merge run folder**, which must remain unused.

## Base-2 record and proof format

After B2 is committed/reviewed, the orchestrator writes and commits **one
never-edited JSON line** at:
**`tasks\difficulty-v3\MS18d-gp-campaign-base-2.jsonl`**.
Do not create a placeholder or modify the original B1 record.
Required fields (full actual values, no abbreviated hashes):

| Field | Contract |
|---|---|
| `schema` | Versioned epoch-2 declaration, e.g. `ms18d-gp-transport-epoch-2-v1` |
| `campaignBase` | Actual 40-hex B2 |
| `previousBase` | `a2e6423a52a89dd36ee646aa14706dd2369e087f` |
| `checkpoint` | `4db0114e0acd325a34b29a7741ca8eb75e178813` |
| `reason` | Pre-window freshness starvation in the transport recheck loop; no failed measurement |
| `recordedAt`, `recordedBy` | Actual timestamp with timezone; `orchestrator` |
| `previousHelperManifest` | Original file, full H1 `5feeb42f31148b086105ac8579d7c3dbfab14193d460fa8a5a0bc05ce95def03`, 52 entries, raw-checkout-byte recipe |
| `helperManifest` | New manifest file, full H2, actual entry count and same hash recipe |
| `allowedHelperChanges` | Exact changed file list with before/after hashes and production-test classification; bounded by the list above |
| `transitionProof` | Immutable proof file/ref + SHA for B1/checkpoint/B2 ancestry, exact committed diff and byte-equality of all non-allowed helper entries |
| `retainedEvidence` | Checkpoint/inventory ref + SHA, the exact 22 successful chunk/run IDs, a1 hold and retained C-log prefix; no retagging |
| `plan`, `identities`, `environment`, `policy` | Original frozen values copied as observations; include equal raw/canonical plan hashes and unchanged measurement identity |
| `journals`, `cutover` | Actual inherited journal/log snapshots, 22 successes/950 requests, next `mega16-easy.i0.n50`, next attempt 2; no zero-count reset |
| `reviews`, `suites` | SA1/SA2 ruling/review refs, exact tested helper freeze, existing suites and targeted watch/epoch tests |

**This second record is also the narrow merger compatibility input.**
The updated `merge-gp.js` may read that fixed path **from committed HEAD**,
validate its single line/proofs and match its B2/H2 against the current merge
request/manifest. It names only the specific B1/H1 above and B2/H2; no arbitrary
epoch list or automatic adoption. The original B1 record remains immutable.
Keep the original merge command/plan arguments; no new caller override or plan
rewrite is needed. The declaration is created after B2, avoiding a self-hash
cycle. Its pack-only commit is an allowed B2 descendant.

## Resume sequence and mega16-easy

1. Freeze/review the one B2 repair commit, helper manifest and compatibility
   proofs. All repository writes and Node tests are **under the shared lock**
   while the campaign is paused; the developer commits nothing.
2. The orchestrator commits the base-2 record, verifies clean inputs and the
   immutable checkpoint, then runs the existing
   **`validate-journals --base B2 --live`** through the lock.
3. Resume **`mega16-easy.i0.n50` attempt 2 with `-CampaignBase B2`** and the
   reviewed H2 configuration. Its a1 was an eligible unstarted hold and the
   pre-window give-up consumed **zero** admissions, so a2 remains available.
   Re-read the actual state and enforce **>=60 s since a1 release**, fresh
   watch/readiness and all other gates. **No F3 ruling line is needed.**
4. Only after that succeeds may the normal frozen order advance. A new a2 hold
   or failure keeps its real status and the existing limits; this repair grants
   no third admission, service exemption or recovery.
5. Final merge runs under B2/H2 and validates both declared epochs to the
   unchanged **79 cells / 3,950 samples / >=72 successes** rule. No partial
   aggregate, percentile normalization, rerun or replacement.

No owner question is needed for this jointly reviewed compatibility repair.
Restarting the campaign would rerun completed chunks and is **not assigned**.
Any required production change outside the listed files or any change to the
measurement contract stops for a new ruling; this is not a general R3 waiver.

**Owner status update (information):**

> MS18d đang tạm dừng vì lỗi wrapper kiểm tra khóa: bước kiểm tra mất lâu hơn
> hạn độ tươi rồi lặp lại cửa sổ chờ. Giữ nguyên 22 đoạn đã ghi thành công
> (19 ô đủ mẫu, 950 yêu cầu); lần chờ bị lỗi không chạy payload và không dùng
> lượt admission thứ hai. SA1/SA2 thống nhất sửa phần transport và bộ kiểm tra
> gộp để nhận đúng hai cặp base/hash được khai báo, đóng băng và review trước
> khi dùng. Bộ sinh, recorder, readiness, seed/target và giao thức đo không đổi.
> Không đo lại, thay thế hay đổi nhãn bản ghi cũ. Sau kiểm thử/review sẽ tiếp
> tục 92 đoạn chưa chạy, bắt đầu bằng lượt 2 của mega16 Easy, với đầy đủ kiểm
> tra CPU và các giới hạn 450/540 s, nghỉ >=15 s như cũ.
