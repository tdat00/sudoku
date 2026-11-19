# MS18d — C1 readiness, hold rulings and host rebinding

Supporting specification of `MS18d-phase-c-admission.md` and the R24 leaf.
**C0/C0b baseline: `56b97b2671a55c3cafefdbb999ad12c277fc0770`.**
SA1 **ACCEPT WITH CONDITIONS F1-F6; C1 released now**, relayed 2026-11-19.
This assigns the conditions and selected A readiness together. It does **not**
release C2 or approve a real GP call before the integrated review/freeze.

The accepted baseline helper manifest is
`evidence\MS18d\phase-c\helpers-c-sha256.txt`, raw SHA-256
**`c07f308b1f273cf108ba07d703ae9565667996b88dedfad465d2e44319456e10`**
(45 entries). It is **not the future final C1 helper identity**.
The existing plan is
**`docs\difficulty-v3\evidence\MS18d\phase-c\gp-chunk-manifest.json`**:
114 chunks, 229 declared run slots (two per chunk plus final merge), canonical
hash **`b92e09bb8c299b8b8ff1330d7ef3845ebcca18dddf71135005e765081cb4618f`**.
Preserve its numerical plan and the prior freeze/history; do not retag C0/C0b.

## F1 — pre-flight and watch before creating a run folder

Create a real run folder **last**, only after all pre-flight predicates and the
quiet lock watch pass, and F2/F4 permit the call. Before creating it, refuse:

- any set `NODE_OPTIONS`, or a real use of **`-ExecOverride`**;
- missing/mismatched **HelperManifest SHA**, missing/unverified required files,
  or a `Required` list that omits the exact repository-relative plan path above;
- undeclared B, non-descendant HEAD or a disallowed R3 committed-path change;
- an untracked `phase-c\lock-log.jsonl` at HEAD; commit its empty starting file
  before B, never manufacture it on the first real call;
- a **stale shared lock immediately**, not after a 1200 s watch. Do not delete
  it: report it for the orchestrator's ownership/liveness-verified cleanup;
- missing real-readiness configuration/integration under F6.

Recheck changing pre-flight/attempt/ruling facts after a wait before allocating
the folder; an earlier observation is not permission after intervening changes.

The watch remains bounded and observes the 15.3 s quiet window. On give-up,
create **no run directory**; append a **`pre-window-hold`** record to the C log.
It counts as **zero admissions**, not `.a1`, not a payload and not an eligible
CPU re-ask. Preserve its reason/time and return to the orchestrator; do not
silently cycle watches or create/delete a folder to change accounting.

## F2 / F5 — attempt eligibility and genuine unstarted holds

Check attempts **before folder creation**:

- **Attempt 1 refuses if any run folder of that chunk already exists**, even
  an empty/partial folder. A new filename or HEAD cannot evade that check.
- **Attempt 2 requires the chunk's declared `.a1`** to be an unstarted
  control-hold, with **no payload artifacts**, and either:
  - `eligibleReAsk=true` with **>=60 s since its verified release**, or
  - a valid committed F3 ruling for that held run.
- Still at most **two admissions / one payload per chunk**. No `.a3`,
  completed/started-chunk retry, replacement or quota reset.

A `payloadStarted:false` flag is insufficient if files show otherwise.
GP tee/command PID records, payload-start/exit records, a payload transcript or
stdout/stderr, a ledger/partial ledger or contradictory evidence make the run
started/uncertain, not an unstarted hold. Controller/readiness metadata alone
is not a GP payload; distinguish its PID roles from tee/command roles.

**F5 merger rules:** accept a hold only when it is a proved unstarted
control-hold with no payload artifacts, or the narrow **bare
`foreign-lock-watch` `wrapper.json`** case. That compatibility case does not
authorize new watch-failure folders under F1 or arbitrary incomplete folders.
Reject **every real run whose request contains `command.exec`**, even if it
names the usual Node executable. Preserve real exits/records; do not repair an
invalid run by deleting artifacts or changing its provenance.

## F3 — committed hold rulings, not developer discretion

The pack creates the **zero-byte, tracked** file
**`tasks\difficulty-v3\MS18d-gp-rulings.jsonl`**. Empty means **no rulings**.
One complete JSON object per appended line, with the exact fields:

```text
{chunkId, heldRunId, allowAttempt: 2, ref, at}
```

`chunkId`/`heldRunId` identify the actual frozen chunk and held run.
`allowAttempt` is the integer **2**, never another value.
`ref` points to a durable decision record containing the **SA2 ruling, explicit
SA1 concurrence and the exact held-run evidence**. `at` is the actual
decision/record timestamp with timezone, after the referenced hold, not a
fabricated or prospective permission. A stable pack-section/evidence reference
avoids needing the append commit's own hash inside itself.

**Authority:** **SA2 rules; SA1 concurs; the orchestrator alone appends and
commits.** The developer, wrapper and readiness tooling neither approve nor
append these lines. Read only the committed journal at the admitted HEAD;
uncommitted, malformed, contradictory or stale rulings are not authority.
Verify append-only history from the recorded baseline/previous committed
version. No edits/removals/compaction of earlier lines.

A line is honoured **only after a verified unstarted hold**, never after a
payload started, and never beyond the existing two admissions. It does not
create a slot, change the frozen plan, bypass F1/F2/F6 or reset counts.
Rulings are narrow operational authorizations, not a new GP recovery policy.
Keep this journal out of fixed helper-content hashes: its parser and the
permitted journal path are frozen; each run records the committed journal
version/entry it actually used.

## F4 — stop the recording line

After **any real outcome other than success or that chunk's own eligible
re-ask**, refuse **all further real calls** until a committed ruling covers the
held run. Do not move to another chunk, profile, wrapper or directory to avoid
the stop. Apply the stop check before creating another folder.
Derive the stop from the retained real-run history/log and committed rulings,
not a mutable reset switch. Stand-in history is never real-campaign permission.

All predicates are conjunctive: clearing a stop is not permission to violate
F2 or manufacture an admission. A no-folder pre-window hold remains zero
admissions; a ruling cannot turn it into a fictitious `.a1`. At two admissions
there is no further slot. Unexpected/unrepresentable state stays stopped for
joint disposition, not a permissive default.

**F3 cannot clear a started-payload failure.** Preserve that failure and stop
for an explicit further disposition; no `allowAttempt:2` line may relabel it as
unstarted or authorize its retry. File-only/fake diagnosis and pack rulings
may proceed under their ordinary controls once G5 proves no payload survives;
they are not real recording calls or a backdoor into the stopped campaign.

## F6 / C1 — complete A readiness is mandatory

Until C1 is integrated, **`Invoke-RecorderLocked` refuses every non-stand-in
call**. Independently, the controller holds a real request with no configured
readiness implementation. The merger rejects a real ledger without a complete,
source-bound **A readiness record**; acquisition/binding alone is not admission.
Readiness must be part of the immutable admission record or a separately
persisted record whose digest is bound by the transport/ledger references.

Selected policy remains **`MS18d-GP-host-active`**, not a new exception:

1. Capture bounded per-process snapshots **before and after** the screen;
   each query is **<=15 s**. Use **PID plus creation time** for process identity.
2. The aggregate screen is **five in-process one-second intervals from
   `os.cpus()`** (six cumulative samples). **No subprocess inside that window.**
   Retain logical-CPU count, actual timestamps/intervals, raw busy-core values,
   mean/max and counter validity. No `os.loadavg`, subtraction or normalization.
3. Keep raw **`ready` = mean <=0.5 / max <=1.0 busy logical cores** separate
   from policy **`admitted`**. A can admit with `ready=false`, but never with
   invalid required facts, unresolved locks/host identity or another consumer.
4. An additional consumer is a process at **>=0.5 CPU-s per elapsed second**
   over the recorded snapshot window. Exclude **only the currently approved
   host instance itself**, idle, and **this run's identified wrapper,
   controller and readiness PIDs/instances**. No host descendants, other
   agents, all-ancestor/all-task trees or OS-service exemptions.
5. Unknown data or timeout is a **non-eligible hold**, not zero CPU or a
   consumer-only re-ask. Readiness is **<=45 s** overall.
6. More than **60 s from call to actual payload spawn is a hold**.
   `call` is the recorded request/`requestedAt` after the pre-window, before
   the shared-helper invocation; retain the earlier watch separately.
   Never restart this clock for child startup, a query, a wait or rebinding.
   Recheck locks immediately before spawn and start no late payload.

The merger verifies those complete saved facts/times, raw-ready versus admitted
semantics, approved host reference, actual single exemption set and the no-payload
hold distinctions; it does not merely check that `readiness` is non-null.
Do not retrofit C1 facts into earlier C0/C0b stand-ins or relabel them real.

## Host identity and verified rebinding

SA1 confirmed at the `56b97b26` review that **PID 1968** still has the expected
identity. Its .NET **ProcessName** is now
`copilot.exe.old-25148-1794809773310`, due to an update/rename.
**That display-name change is not a changed host instance and is never a
binding predicate.** Do not update a name whitelist to chase renamed binaries.

The existing approved tuple is:

- PID **1968**, parent **18780**;
- exact .NET StartTime **`2026-11-13T19:26:33.6916441+07:00`**;
- independently normalized CIM CreationDate
  **`2026-11-13T12:26:33.691644Z`** (UTC microseconds, not padded .NET ticks);
- executable **`C:\Users\ledat\AppData\Local\Microsoft\WinGet\Links\copilot.exe`**.

Bind those identity facts, **not ProcessName**. Name fields may be diagnostic
only. Reconfirm live before admission; this historical tuple is not a new
liveness observation. A real restart/reused PID/different tuple **must hold**;
no tool auto-discovers, adopts or exempts a replacement host.

### Host-binding journal

The pack also creates the empty tracked operational journal
**`tasks\difficulty-v3\MS18d-gp-host-bindings.jsonl`**.
Before B, the orchestrator records the initial verified binding in it. Empty
or invalid means **no real host binding configured**, not fallback to PID 1968.
An artifact such as `phase-c\host-binding.json` may remain an immutable
fixture/bootstrap snapshot, not an automatically rewritten production binding.
It does not replace the committed journal or joint approval.
The existing tuple is already approved by this pack/SA1's review; a fresh
matching observation can support its initial entry. If it differs, use the
joint rebinding procedure below.

Each committed append-only entry has this documented shape:

```text
{bindingId, replaces, host: {pid, dotNetStartTime, cimCreationDateUtcMicroseconds,
 parentPid, executablePath}, observedAt, evidence, ref, at}
```

The first `replaces` is null; later entries name the exact prior binding ID.
IDs are unique; no forks or simultaneous exemptions. `evidence` identifies
the bounded raw observations and their digests; `ref` identifies the durable
SA2 decision plus SA1 concurrence. Times are real observed/approved times, not
guessed. Optional ProcessName observations never participate in matching.
Read only the committed journal and verify its append-only chain.

Freeze the **policy logic/thresholds, journal paths and reader code**, not a
mutable active PID in the common policy identity. Record each admission's
binding ID, exact tuple, committed journal/entry reference and digest.
Journal appends are permitted **pack-only R3 descendants**, not changes to
E, targets, chunk manifest, helper bytes, Node, machine or policy.
The merger validates the binding approved **for that admission**, not the
latest host after the campaign, so valid earlier records are not retagged or
rejected merely because a later approved host differs.

### Rebinding procedure and authority

1. **Stop scheduling real calls.** If the host changed during an admitted
   payload or session loss left its status unknown, preserve all raw evidence,
   use G5's owned-process checks and flag the affected window for joint
   disposition. Do not call it an unstarted hold, erase it or run a replacement.
2. **The orchestrator collects a bounded verification packet between payloads**:
   old binding/old-instance status, the new full tuple above, proof it is the
   actual replacement Copilot host for this task, collection times and raw
   query outputs. Each OS query remains <=15 s. No process-name-only search,
   PID-only inference, CPU subtraction or new background poller.
   Store immutable verification data under a pack-owned JSON path such as
   `tasks\difficulty-v3\MS18d-gp-host-evidence\<binding-id>.json`, referenced
   with its digest, so a campaign commit stays inside R3's allowed paths.
   Do not create a GP attempt folder merely to collect host evidence.
3. **SA2 rules and SA1 explicitly concurs** on the exact new tuple and evidence.
   Both must approve; the developer/tooling cannot self-rebind.
   A verified single-host replacement within A needs **no new owner question**.
   Expanding the exemption, unverifiable ownership or a changed measurement
   policy is outside this procedure and stays held for an explicit decision.
4. **The orchestrator appends and commits** the binding entry (and its durable
   approval reference) under the pack path before the next admission.
   Never edit an old tuple in place. The former host is not also exempt:
   if still alive, it is treated like any other additional consumer.
5. **Rebinding grants no attempt or line-release permission.** If a prior
   `.a1` host hold caused F4, it additionally needs the specific jointly
   approved F3 ruling before `.a2`; both changes may be one pack-only commit.
   With no real held call, rebinding alone does not consume/create an attempt.
   No rebinding enables a third admission or clears a started-payload failure.
6. Repeat all pre-flight/watch/binding/readiness checks in a fresh slot.
   Any changed host/binding during that admission holds again; do not reuse
   observations from the old instance or shorten the CPU screen.

## Integrated close-out and B-freeze checklist

**No C2 before a combined SA1 review of final C0 + C0b + C1**, including F1-F6,
the journal readers and rebinding path. The conditions are implementation work
inside C1, not permission to test them with a real GP chunk.

Rerun all **seven** existing suites on the final formatted helper snapshot,
plus focused C1 cases where added, through the lock:

- `test-units.js`
- `test-controller.js`
- `test-plan.js`
- `test-recorder-merge.js`
- `test-owned-processes.ps1`
- `test-run-locked-c.ps1`
- `test-slot-watch.ps1`

Add stand-ins for every F1 refusal without folder creation, watch give-up at
zero admissions, F2 precreation checks, committed/uncommitted/stale F3 rulings,
F4 blocking another chunk, strict F5 hold/artifact/command.exec rejection and
F6 missing/incomplete readiness. Cover ProcessName-only rename without a false
hold, real restart/PID reuse, approved versus unapproved rebinds, prior binding
retention, exact exclusions, query/window/call-to-spawn limits and unknown data.
Use fake process/counter facts; no real generation or readiness campaign as a test.

The orchestrator checks before assigning/freezing **B**:

1. Final combined review accepted, all seven suite results and focused C1
   checks retained with actual identities; all review conditions disposed.
   The earlier unlocked `node --version`/`node --check` remain disclosed,
   accepted deviations, **not standing permission**.
2. Code/manifest and the **new final helper SHA** are frozen, verified and
   committed. `c07f308b...` is baseline history, not the C1 SHA.
   Version new freeze outputs rather than overwrite accepted freeze records.
   `Required` includes the actual **`gp-chunk-manifest.json` path above** and
   every executable dependency, including readiness/journal readers.
3. Recorders use the exact captured/executed bytes; E **344afdec...**,
   target table **3d0bffdb...**, 114 chunks/3,950 indices, Node/machine and empty
   flags match. C1/F1-F6 do not change targets, ranges, ceilings or jobs.
4. **`docs\difficulty-v3\evidence\MS18d\phase-c\lock-log.jsonl` is tracked and
   committed empty before B.** At `56b97b26` it was absent. The orchestrator,
   not a first real invocation, creates/commits it outside this pack-only edit.
   Never truncate a nonempty real campaign log to manufacture an empty start.
5. **`MS18d-gp-rulings.jsonl` is tracked**, initially empty, with the agreed
   append authority. **The host-binding journal is tracked and has its initial
   approved, freshly verified binding committed.** Journal contents are
   operational append-only authorization, not fixed helper-content hashes;
   validate committed provenance/prefixes and record the versions actually used.
6. S-OD15 **A**, its resource interpretation and **`r24Notice` message
   1572878023034675262** are recorded before B. No further owner answer is
   substituted for tooling review or actual readiness.
7. Raw/clean-input status, exact R2 folder allowlist and R3 ancestry/path
   predicates pass; no unresolved F4 real-call stop or ambiguous prior start.
   No helper/plan/parameter stand-in override can reach a real payload.
8. Freeze B from that final committed input state and record it before the
   first real chunk, using R3's non-self-referential release record. Neither
   `56b97b26` nor this pack commit is automatically B.
9. Declare the exclusive timed window, pause the background Node Discord poller
   and other agent work, confirm no payload/orphan/foreign slot and take the
   fresh checks. Only then may the orchestrator release C2.

## Campaign-time Node rule

**From C1 onward every agent Node command goes through the shared lock**,
including `node --version`, `node --check`, format/freeze helpers and Discord
commands. During a timed chunk **no agent launches or runs another Node command
at all**; only the already authorized GP transport/recorder tree continues.
This explicitly includes **`node discord.cjs`**: the orchestrator stops that
owned background process during payloads, not merely its outgoing messages.

Discord sends/polls, progress reports, checkpoints and diagnostics occur only
**between chunks after G5 proves no payload alive**, followed by new checks
before the next chunk. The between-chunk Node controls also use the lock;
do not create undeclared campaign files or count control messages as GP attempts.
Unknown orphan status is not a between-chunk permission.
