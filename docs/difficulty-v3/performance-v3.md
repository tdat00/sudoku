# Rating v3 final GP performance report (MS18d)

Final performance record of the 79 offered cells of the rating v3 table of
[generator/design.md](../../generator/design.md) section 9.1. It is the report named by R6 of
`tasks/difficulty-v3/MS18d-r24-request-ledger.md`: the numbers below come from the task-owned **R24
recorder invoking the unchanged `SG.fixtures.perfTools.measure`** and from one check-only raw-ledger merge,
**not** from the rounded stdout of `tests/perf.js`. Everything here is a **Node measurement on a shared,
CLI-host-active machine**; it is no Chrome/reference-machine measurement and no CI/browser result.

Evidence folder: `docs/difficulty-v3/evidence/MS18d/` (`gp/`, `phase-c/`, `phase-d/`). The Phase D evidence
(`phase-d/`) holds the machine-checked inventories cited below; `phase-d/operator/` and `phase-d/sa1-recompute/`
are read-only orchestrator/SA1 inputs and are cited, never re-run.

## 1. Result

| Quantity | Value |
|---|---|
| Cells measured / offered | **79 / 79**, each complete with its 50 original indices and seeds (`7000 + 101 i`) |
| Requests | **3,950** (79 x 50) |
| Cells meeting strict `p95 < target` | **74** (required: **72**) |
| Gate | complete **and** meeting; `complete=true`, `meets=true`, no problem |
| Misses | **5**: mega12 `expert`, sohei `hell2`, butterfly `hell2`, wordoku `expert`, wordoku `nightmare` |
| Cells | 62 one-chunk cells and 17 cells with 52 chunks (114 chunk payloads in all) |
| Extra cold process starts | **35** relative to one process per cell |
| Consumed raw ledgers | **114** = 22 (B1) + 0 (B2) + 89 (B3) + 3 (B4); not 117 |
| Control-holds, pre-window event | **9** unstarted control-holds, **1** zero-admission pre-window event |
| C log | **125** lines: 114 successful recorder runs, 9 control-holds, 1 pre-window event, 1 final merge |

The aggregate passed; **individual misses remain numerical performance findings** (S-OD4) for MS18e or future
explicitly authorized work. No target, offer, budget, seed, warmup or generator setting was changed after a miss, and
no run was repeated to improve a figure. The merge is `docs/difficulty-v3/evidence/MS18d/gp/all-79/final.m1/` (report
SHA-256 `0d2c8baf1ef8131081935747484923dd8593f78f606dd202a0303d7ec324e349`, committed in `732d1b66`); SA1's independent
raw-ledger recomputation (`phase-d/sa1-recompute/recompute.json`, SHA-256
`1779f78ba4451e3906492df53cee88bfff0cc35e30e3d8764f835542ec663409`) matched all 79 cells, all 114 consumed ledgers, the
totals and the holds with zero problems.

## 2. Method

- **Recorder.** `phase-c/record-gp.js` loads the same engine files as `tests/perf.js`, binds the captured executed
  contents (R5: `captured-exec-v1`, empty `execArgv` and `NODE_OPTIONS`) and makes ONE call
  `SG.fixtures.perfTools.measure(variant, level, n, { seedBase: 7000 + 101 * i0 })` per chunk. A chunk ledger holds the
  raw time of every request. A cell of one chunk is its 50 requests; the 17 planned multi-chunk cells (the monolithic
  command was above the 450 s admission) are split into contiguous original-index chunks, k = 2 to 10.
- **Statistics.** `merge-gp.js` (check-only) merges the ledgers: sorted raw indexes **[24] / [47] / [49]** are p50, p95
  and max; the verdict is the **strict** `p95 < target`, on the unrounded doubles. The tables show four decimals only
  for reading. No average of chunk percentiles, no rounded CLI figure and no scheduler count is used. SA1's recomputation
  reproduced every cell without `merge-core.js`/`merge-gp.js`.
- **Settings.** Node v26.13.0; AMD EPYC 7763 64-Core Processor, **16 logical processors**, 64 GB, win32 10.0.26300;
  serial jobs 1; trace `summary`; warmup 0; seeds `7000 + i*101`; no time factor. Policy **S-OD15 A, "MS18d-GP-host-active"**
  (owner `amicably8850`, 2026-11-19T07:13:33.35Z, Discord message `1572872444602228798`): the Copilot CLI host
  (PID 1968, binding `host-b1`) is the one approved active consumer; an additional consumer that gains at least 0.5 CPU-s
  per elapsed second holds the run unstarted. A shared slot, the lock watch (15.3 s window) and A readiness applied to
  every payload. Raw readiness `ready` is kept apart
  from the policy `admitted`: 110 of the 114 consumed admissions had `ready=false` and `admitted=true` under the host-active
  policy, 4 had `ready=true` (`phase-d/provenance-audit.json`, `readyRawVersusAdmitted`).
- **Not.** Not strict-quiet-machine timing, not Chrome on the i5 reference machine, not a CI measurement, and no
  numerical equivalence to a monolithic fresh-process-per-cell benchmark (the 35 extra starts are disclosed in section 6).

## 3. Source, epoch and owner provenance

| Identity | Value |
|---|---|
| Publication / GP producer sources | `75b0955e3e356bd1` |
| Qualification (GQ) measured source, kept separate | `0ca29eaeebc295b6`; the GQ evidence is not retagged |
| Hash family identity (E, after the 17 target changes) | `344afdeca4e2afe58ec552ddf4390608f6aee2febe9eb9c958b0c03b7bb8c1f1` (was `1032ab2f510fe2b9ed1bac744f534d5cfee7e039f456fc56d3e19682d53158a0`) |
| Replay identity (unchanged) | `1cf64919a9004259a203e65bc7e537b15b981f4ed52610f4cd62d28cf6950fcc` |
| Target table | 135 positions, 79 active / 56 absent, SHA-256 `3d0bffdb19cc8d0e4c2495163858bfcbf3fd6e3d8567f4718dc722a23746963a` |

The campaign ran in four declared epochs; every ledger was checked against its **saved HEAD and its declared tuple**
(`phase-d/provenance-audit.json`: base ancestry, binding, receipts, plan, helper manifest, identity, policy, saved A
readiness, journal versions):

| Epoch | Base | Helper manifest (entries) | Plan | Ledgers consumed | Saved HEADs |
|---|---|---|---|---:|---|
| B1 | `a2e6423a52a89dd36ee646aa14706dd2369e087f` | H1 `5feeb42f…` | V1 | 22 | `f7f56cbb…` (22) |
| B2 | `b6de2c46e73581f54e61f1ece92a360dd9879736` | H2 `bd6949ef…` (53) | V1 | 0 | none (one hold, no ledger) |
| B3 | `8e95cb14aad100a6d219af072bbdf3dc227273d1` | H3 `4a0e5881…` (55) | V1 | 89 | `bce27077…` (17), `1bf8945f…` (16), `3fa93360…` (39), `55c4e867…` (17) |
| B4 | `6e60b06c7d1af482ecafe28ce2fb35a03c2a54be` (record and proof `553ef96466bbeeb664e738dc4ddc8dce9afa5245`) | H4 `9699d3ee76b1a1848412b1a6f5bd3a25c8e8daf5576cdeaa781ea8c529323c15` (57) | V2 | 3 | `553ef964…` (3) |

V1 is `phase-c/gp-chunk-manifest.json` (raw `a8e58a729d7df496ae694693a3899236c1abf6aed65a0bfd773f0f262eba0ba5`, canonical
`b92e09bb8c299b8b8ff1330d7ef3845ebcca18dddf71135005e765081cb4618f`, 229 slots, default cap two admissions). V2 adds exactly
the three owner-approved a3 slots (232 slots, canonical `7d63342a0ffb1a3a6794959276ba4a5aa2ef116f8f6ef154b9888220f0b7dd69`,
raw `989799e62fe2b8864da2de1bedc35264fb717f84b004689f6de941e03d747125`). Checkpoints: original queue `e76eb34a` (111 chunks,
3,800 requests, 121 C-log lines), the three a3s `e1e2233f` (124 lines) and the final merge `732d1b66` (125 lines); the C
log is verified append-only across them. Campaign HEADs are the saved ones: later Phase D document edits are post-campaign
work and are not admitted as a new C2 HEAD, retagged onto an old record or tested against the frozen merger.

**Owner decisions.** S-OD15 A (the policy above). S-OD16/17/18 (Q2=A, Q3=A, Q4=A, owner reply "Q2=A, Q3=A, Q4=A", Discord
message `1573108143389675704`, 2026-11-19T22:50:08.320Z, recorded in `f2f345a1d1748e041ca296ad898adcbfa971b837`; Q4's posted
wording archived in `d0b746bb`) each granted ONE third admission to one chunk: mega16-easy, hyper-hard and butterfly-master,
in that order. Each a3 was a **first actual payload** of a chunk that had two spent, unstarted admissions, not an additional
sample set or a rerun. Three F3 line-release dispositions (journal `tasks/difficulty-v3/MS18d-gp-rulings.jsonl`, lines 1-3:
mega16-easy a2 in the base-3 record's `lineDisposition`, `MS18d-hyper-hard-line-disposition.json` and
`MS18d-butterfly-master-line-disposition.json`) released only the F4 stop line and authorized no admission.

## 4. The 79 cells

Columns: raw merger values (ms), shown to four decimals; `k` is the number of chunk payloads of the cell, **Extra starts**
`= k - 1`; **Cold flag** marks the 30 cells that the saved report flags as cold-start sensitive (section 6). The
unrounded values are in `phase-d/gp-cells.csv` (every number, the chunk count and each flagged first-request index and time);
this table is checked against that file.

| Cell | n | p50 ms | p95 ms | max ms | Target ms | Verdict | k | Extra starts | Cold flag |
|---|---:|---:|---:|---:|---:|---|---:|---:|---|
| classic4/veryEasy | 50 | 0.401 | 1.7474 | 8.3506 | 31 | meets | 1 | 0 | yes |
| classic6/veryEasy | 50 | 0.7756 | 1.8068 | 10.9634 | 39 | meets | 1 | 0 | yes |
| classic6/hard | 50 | 88.4403 | 273.0246 | 277.9232 | 350 | meets | 1 | 0 | — |
| classic9/veryEasy | 50 | 1.1081 | 3.3824 | 12.6711 | 60 | meets | 1 | 0 | yes |
| classic9/easy | 50 | 191.9341 | 1103.9885 | 1429.4654 | 2342 | meets | 1 | 0 | — |
| classic9/normal | 50 | 199.7595 | 798.2815 | 943.2433 | 2627 | meets | 1 | 0 | — |
| classic9/hard | 50 | 19.0966 | 59.586 | 173.1933 | 400 | meets | 1 | 0 | yes |
| classic9/expert | 50 | 59.7548 | 432.1986 | 788.4885 | 1323 | meets | 1 | 0 | — |
| classic9/master | 50 | 91.6571 | 303.4746 | 548.256 | 900 | meets | 1 | 0 | — |
| classic9/nightmare | 50 | 713.5676 | 2403.9863 | 3294.5561 | 8377 | meets | 1 | 0 | — |
| mega12/veryEasy | 50 | 2.6926 | 6.2349 | 18.5907 | 400 | meets | 1 | 0 | yes |
| mega12/easy | 50 | 7.2446 | 26.8273 | 36.3174 | 1000 | meets | 1 | 0 | yes |
| mega12/normal | 50 | 14.4519 | 55.045 | 71.4113 | 1000 | meets | 1 | 0 | — |
| mega12/hard | 50 | 56.0318 | 182.6476 | 258.8675 | 3000 | meets | 1 | 0 | — |
| mega12/expert | 50 | 229.423 | 4208.3516 | 6291.462 | 3000 | **MISS** | 2 | 1 | yes |
| mega12/master | 50 | 257.3085 | 688.1604 | 878.1258 | 3000 | meets | 1 | 0 | — |
| mega12/nightmare | 50 | 1749.6811 | 6716.296 | 7748.3151 | 18842 | meets | 2 | 1 | — |
| mega12/hell2 | 50 | 3952.1629 | 10686.0771 | 15673.6748 | 16000 | meets | 2 | 1 | — |
| mega16/veryEasy | 50 | 6.5526 | 10.449 | 27.6654 | 1500 | meets | 1 | 0 | yes |
| mega16/easy | 50 | 12.5763 | 25.355 | 39.2129 | 4000 | meets | 1 | 0 | yes |
| mega16/normal | 50 | 25.2005 | 77.4744 | 128.9455 | 4000 | meets | 1 | 0 | yes |
| mega16/hard | 50 | 312.1083 | 1299.818 | 1977.2666 | 10000 | meets | 1 | 0 | — |
| mega16/master | 50 | 1762.8776 | 7992.9187 | 12002.3336 | 10000 | meets | 1 | 0 | — |
| mega16/hell2 | 50 | 1810.7873 | 22444.1817 | 38690.8702 | 30000 | meets | 6 | 5 | yes |
| diagonalX/veryEasy | 50 | 1.2191 | 3.0987 | 12.8964 | 80 | meets | 1 | 0 | yes |
| diagonalX/normal | 50 | 8.2633 | 64.65 | 229.9642 | 200 | meets | 1 | 0 | yes |
| diagonalX/hard | 50 | 12.5386 | 23.1361 | 41.5165 | 500 | meets | 1 | 0 | yes |
| diagonalX/master | 50 | 119.5883 | 364.92 | 410.1574 | 1200 | meets | 1 | 0 | — |
| diagonalX/nightmare | 50 | 1089.6147 | 4321.8377 | 5692.8126 | 10000 | meets | 1 | 0 | — |
| diagonalX/hell2 | 50 | 263.4943 | 2953.7482 | 3153.4274 | 3000 | meets | 1 | 0 | — |
| hyper/veryEasy | 50 | 1.3557 | 3.4653 | 13.5275 | 80 | meets | 1 | 0 | yes |
| hyper/normal | 50 | 67.2063 | 368.316 | 492.3013 | 1573 | meets | 1 | 0 | — |
| hyper/hard | 50 | 15.2545 | 38.7882 | 77.6135 | 500 | meets | 1 | 0 | yes |
| hyper/master | 50 | 161.3579 | 559.9864 | 836.6379 | 1200 | meets | 1 | 0 | — |
| hyper/nightmare | 50 | 2052.1526 | 7576.9866 | 10695.432 | 10000 | meets | 2 | 1 | — |
| hyper/hell2 | 50 | 1104.1475 | 4289.4738 | 6111.0361 | 5000 | meets | 1 | 0 | — |
| jigsaw9/veryEasy | 50 | 7.1541 | 29.7697 | 75.3153 | 150 | meets | 1 | 0 | yes |
| jigsaw9/easy | 50 | 216.2977 | 942.8016 | 1461.2626 | 1905 | meets | 1 | 0 | — |
| jigsaw9/normal | 50 | 47.7495 | 150.3066 | 238.9964 | 350 | meets | 1 | 0 | — |
| jigsaw9/hard | 50 | 52.2086 | 139.299 | 188.4951 | 900 | meets | 1 | 0 | yes |
| jigsaw9/master | 50 | 365.2811 | 1586.0252 | 3455.7577 | 2000 | meets | 1 | 0 | — |
| jigsaw9/hell2 | 50 | 1783.3498 | 5425.9235 | 8163.6781 | 10000 | meets | 2 | 1 | — |
| killer/veryEasy | 50 | 1.6718 | 4.6772 | 15.8777 | 300 | meets | 1 | 0 | yes |
| killer/easy | 50 | 7.8725 | 23.1979 | 27.5491 | 700 | meets | 1 | 0 | yes |
| killer/normal | 50 | 401.7645 | 1932.927 | 2243.3709 | 5425 | meets | 1 | 0 | — |
| greaterThan/veryEasy | 50 | 16.4588 | 29.0991 | 44.7381 | 300 | meets | 1 | 0 | yes |
| greaterThan/easy | 50 | 26.8914 | 57.3624 | 59.3491 | 700 | meets | 1 | 0 | yes |
| greaterThan/hard | 50 | 206.4802 | 2894.3935 | 4308.9512 | 6000 | meets | 1 | 0 | yes |
| greaterThan/master | 50 | 1061.4382 | 7620.4962 | 15503.438 | 10000 | meets | 2 | 1 | — |
| greaterThan/hell2 | 50 | 3133.468 | 9287.4009 | 11288.6218 | 10000 | meets | 3 | 2 | — |
| samurai/veryEasy | 50 | 10.2329 | 15.1999 | 32.839 | 3000 | meets | 1 | 0 | yes |
| samurai/normal | 50 | 193.5004 | 1689.2733 | 4651.5245 | 8000 | meets | 1 | 0 | — |
| samurai/hard | 50 | 111.9168 | 497.688 | 650.6682 | 20000 | meets | 1 | 0 | — |
| samurai/expert | 50 | 490.9767 | 5349.8092 | 9674.0744 | 20000 | meets | 2 | 1 | — |
| samurai/master | 50 | 881.5951 | 7547.5086 | 16792.6476 | 20000 | meets | 10 | 9 | — |
| sohei/veryEasy | 50 | 6.6958 | 12.1285 | 28.6827 | 3000 | meets | 1 | 0 | yes |
| sohei/normal | 50 | 131.4265 | 1802.4207 | 3824.6762 | 8000 | meets | 2 | 1 | — |
| sohei/hard | 50 | 153.0287 | 650.4107 | 3812.1226 | 20000 | meets | 1 | 0 | — |
| sohei/expert | 50 | 352.7846 | 5757.5467 | 11398.118 | 20000 | meets | 2 | 1 | — |
| sohei/master | 50 | 1129.5849 | 4064.8782 | 6048.3313 | 20000 | meets | 2 | 1 | — |
| sohei/hell2 | 50 | 7508.5991 | 35522.675 | 41037.9662 | 30000 | **MISS** | 6 | 5 | yes |
| butterfly/veryEasy | 50 | 3.6591 | 6.2236 | 22.9676 | 1000 | meets | 1 | 0 | yes |
| butterfly/normal | 50 | 76.4572 | 639.5039 | 2215.3706 | 3000 | meets | 1 | 0 | — |
| butterfly/hard | 50 | 58.1429 | 174.6211 | 177.5998 | 8000 | meets | 1 | 0 | — |
| butterfly/expert | 50 | 191.9635 | 3611.174 | 5818.0161 | 8000 | meets | 1 | 0 | — |
| butterfly/master | 50 | 143.4744 | 486.2474 | 914.1934 | 8000 | meets | 1 | 0 | — |
| butterfly/nightmare | 50 | 4144.8706 | 15151.7914 | 32129.4739 | 30000 | meets | 3 | 2 | — |
| butterfly/hell2 | 50 | 2976.5185 | 15496.1127 | 18624.4845 | 15000 | **MISS** | 2 | 1 | yes |
| flower/veryEasy | 50 | 4.2585 | 9.7296 | 24.4079 | 3000 | meets | 1 | 0 | yes |
| flower/normal | 50 | 208.989 | 1715.6381 | 1950.5557 | 8000 | meets | 1 | 0 | — |
| flower/hard | 50 | 110.6412 | 393.3625 | 7528.3136 | 20000 | meets | 1 | 0 | — |
| flower/master | 50 | 438.7229 | 1392.3329 | 2651.6021 | 20000 | meets | 1 | 0 | — |
| flower/hell2 | 50 | 2772.6852 | 11468.4795 | 17223.4555 | 20000 | meets | 2 | 1 | — |
| wordoku/veryEasy | 50 | 1.6498 | 3.5666 | 13.2996 | 100 | meets | 1 | 0 | yes |
| wordoku/easy | 50 | 192.4496 | 1237.2001 | 1481.4616 | 2921 | meets | 1 | 0 | — |
| wordoku/hard | 50 | 18.1978 | 86.4537 | 235.3848 | 600 | meets | 1 | 0 | — |
| wordoku/expert | 50 | 55.5427 | 604.149 | 864.2583 | 600 | **MISS** | 1 | 0 | — |
| wordoku/master | 50 | 104.7914 | 525.4072 | 693.8551 | 1500 | meets | 1 | 0 | — |
| wordoku/nightmare | 50 | 790.9591 | 2800.4616 | 4443.8546 | 1500 | **MISS** | 1 | 0 | — |

Reading the table: 74 of 79 rows meet. Of the 17 targets recalibrated before the GP (section 9), 16 meet and one (sohei
`hell2`) misses; of the 62 retained targets, 58 meet and four miss. Several rows meet only narrowly in the unrounded
values (for example diagonalX `hell2` 2,953.7482 of 3,000 and mega16 `master` 7,992.9187 of 10,000); a pass is a pass of
`p95 < target` and nothing more.

## 5. The five misses

Each stays an open numerical performance finding; no target fitting, offer or pruning, budget increase, generator tuning,
new seed, warmup or rerun follows from a miss, and the table of section 9.1 is unchanged.

| Item | Cell | p95 ms (display) | Target ms | Ratio | Chunks / extra starts | Cold flag |
|---|---|---:|---:|---:|---|---|
| MS18d-GP-MISS-mega12-expert | mega12/expert | 4208.3516 | 3000 | 1.40 | 2 / 1 | yes (index 25, extra start, 6291.462 ms) |
| MS18d-GP-MISS-sohei-hell2 | sohei/hell2 | 35522.675 | 30000 | 1.18 | 6 / 5 | yes (index 42, extra start, 35522.675 ms) |
| MS18d-GP-MISS-butterfly-hell2 | butterfly/hell2 | 15496.1127 | 15000 | 1.03 | 2 / 1 | yes (index 0, 16841.0182 ms) |
| MS18d-GP-MISS-wordoku-expert | wordoku/expert | 604.149 | 600 | 1.01 | 1 / 0 | no |
| MS18d-GP-MISS-wordoku-nightmare | wordoku/nightmare | 2800.4616 | 1500 | 1.87 | 1 / 0 | no |

The misses are not attributed to an external consumer or to cold starts: no evidence supports either, and a measured result
is not discarded on that speculation. For sohei `hell2` the 485.597 s monolithic mean alert of the planning stage (item
`MS18d-GP-BOUND-sohei-hell2` of the register) stays a reason that the monolith was never admitted, not permission to run it.

## 6. Cold starts and the flagged cells

A multi-chunk cell starts one Node process per chunk, so the first request of every chunk after the first is a cold start
that a single-process run would not have: **35 extra starts** (the 17 multi-chunk cells have 52 chunks; 52 - 17 = 35). No
sample is removed, shifted or re-run for it, and no equivalence to one process per cell is claimed. The saved report flags
a cell when a first request of a chunk (index 0, or the first index of an extra chunk) is in the upper tail by the
tie-inclusive rule `time >= sorted[47]`; the flag is descriptive, **not proof of causation**. **30 cells** are flagged:

| Flagged cell | First request: index @ time (kind) |
|---|---|
| classic4/veryEasy, classic6/veryEasy, classic9/veryEasy, classic9/hard | 0 @ 8.3506, 10.9634, 12.6711, 59.586 ms (first) |
| mega12/veryEasy, mega12/easy | 0 @ 18.5907, 36.3174 ms (first) |
| mega12/expert | 25 @ 6291.462 ms (extra start) |
| mega16/veryEasy, mega16/easy, mega16/normal | 0 @ 27.6654, 39.2129, 128.9455 ms (first) |
| mega16/hell2 | 9 @ 38690.8702 ms (extra start) |
| diagonalX/veryEasy, normal, hard | 0 @ 12.8964, 64.65, 41.5165 ms (first) |
| hyper/veryEasy, hyper/hard | 0 @ 13.5275, 77.6135 ms (first) |
| jigsaw9/veryEasy, jigsaw9/hard | 0 @ 45.5388, 139.299 ms (first) |
| killer/veryEasy, killer/easy | 0 @ 15.8777, 27.5491 ms (first) |
| greaterThan/veryEasy, easy, hard | 0 @ 44.7381, 57.3624, 2894.3935 ms (first) |
| samurai/veryEasy | 0 @ 32.839 ms (first) |
| sohei/veryEasy | 0 @ 28.6827 ms (first) |
| sohei/hell2 | 42 @ 35522.675 ms (extra start) |
| butterfly/veryEasy | 0 @ 22.9676 ms (first) |
| butterfly/hell2 | 0 @ 16841.0182 ms (first) |
| flower/veryEasy, wordoku/veryEasy | 0 @ 24.4079, 13.2996 ms (first) |

Index 0 of a one-chunk cell is the process's own first request (JIT and cache warm-up of a fresh Node process): for most
very easy cells it is simply the largest of the 50 times. The three flagged extra starts (mega12 `expert`, mega16 `hell2`
and sohei `hell2`) are the only flagged cases at the start of an extra chunk.

## 7. Attempts, holds and the owner exceptions

Every chunk has exactly one successful payload (114 of 114). Nine runs were **unstarted control-holds** (exit 64, no
payload, clean cleanup, no ledger); the original cap is two admissions per chunk and each hold spent one:

| C-log line | Run | Held at | Recorded reason | Time (+07:00) |
|---:|---|---|---|---|
| 23 | mega16-easy a1 | readiness | svchost 3640 (EventLog) 0.924 CPU-s/s | 2026-11-19 18:47 |
| 25 | mega16-easy a2 | acquisition | release-history-unproved (B2 reader defect, repaired in B3) | 2026-11-19 20:50 |
| 26 | mega16-normal a1 | readiness | svchost 3640 0.912 | 2026-11-19 23:00 |
| 44 | hyper-hard a1 | readiness | PowerShell 32956 0.897; svchost 3048 (Dnscache) 0.711 | 2026-11-19 23:22 |
| 45 | hyper-hard a2 | readiness | PowerShell 20636 0.875 | 2026-11-19 23:24 |
| 61 | greaterThan-easy a1 | readiness | PowerShell 13104 (parent SenseIR) 0.900 | 2026-11-20 00:41 |
| 102 | butterfly-master a1 | readiness | BackgroundDownload 34696 0.712 | 2026-11-20 03:10 |
| 103 | butterfly-master a2 | readiness | MsMpEng 5632 0.846 | 2026-11-20 03:20 |
| 115 | wordoku-veryEasy a1 | readiness | 1ESDevBoxHibernationDelayAgent 30416 0.508 (a new process) | 2026-11-20 04:30 |

Eight were consumer/readiness holds and one (L25) was the release-history acquisition hold; none is a measured GP timeout and
each stays a hold. **Line 24** is a separate event: the pre-window give-up of mega16-easy a2 under B1 (no folder, **zero
admissions**, `heldAt: "foreign-lock-watch"`, last watch **4.233 s**); the enclosing invocation lasted about 1,203 s
(`MS18d-epoch2-transport-repair.md`, "Frozen incident and preserved state"), the foreign-lock wording is misleading and it is
neither a measured timeout nor proof of a foreign lock. Three chunks had two spent holds and no payload: mega16-easy (a1, a2),
hyper-hard (a1, a2) and butterfly-master (a1, a2). The owner exceptions S-OD16, S-OD17 and S-OD18 each granted one a3, run in that
order at C-log lines 122-124 after the 17 remaining chunks: all three succeeded (tee 0.921 / 1.118 / 10.124 s), no further a3
quota remains and no a4 exists. Line release (F3) never authorized an admission.

## 8. Scheduling, consumers and clocks

This section is a disclosure of operational context; the C log, run folders, base records and rulings are the authority
(`phase-d/external-consumers.json`, derived from them and from `phase-d/operator/operator-records.json`, labelled "operational
record, not authority"). A gate pass never guaranteed that no later consumer would appear.

- **Consumer categories observed in holds:** EventLog svchost, Dnscache svchost, Intune PowerShell/AgentExecutor, SenseIR
  PowerShell, BackgroundDownload, MsMpEng and, at wordoku-veryEasy a1, the 1ESDevBoxHibernationDelayAgent (0.508 CPU-s/s in the
  readiness window at 04:30:11; a2 succeeded). No service was disabled, no ancestry-wide CPU exemption or normalization applied.
- **Scheduling versions (reconstructed** from file creation/last-write times and shell order; only the final versions of the
  in-place-edited scripts survive): chunks 1-41 had no outer gate (`gp-next.ps1`, `gp-next2.ps1` with the automatic 65 s
  re-ask); chunks 42-57 the Intune/EventLog/Dnscache gate (`b0c0bfac`); chunks 58-97 the same plus SenseIR descendants
  (`2a5cb26a`); chunks 98-114 and the three a3s the wide stability gate (`55c4e867`). `gp-gate.ps1` was dry-tested only.
- **Unknown, not recorded:** per-chunk outer-gate waits, reset counts and samples for chunks 42-114; any 30-minute gate expiry or
  exit-6 pause; the 23:43 `gp-gate2.ps1` and the pre-03:32 `gp-next3.ps1` versions. These are not zeros and are not derived from
  `gp-results.jsonl`. The operator-reported a3 gate waits are **325 / 124 / 247 s** (696 s for those three only; the mega16 row was
  copied by hand from shell output). Three runs (L24, L25, L27) were direct manual `gp-chunk.ps1` launches absent from the runner log.
- **Clocks kept apart:** the a3 payloads' tee exit markers are 0.921 / 1.118 / 10.124 s, their controller spans 10.564 / 10.780 /
  19.811 s and the runner log's rounded enclosing clocks 31.1 / 30.4 / 39.5 s; the final merge's tee is 6.889 s and its controller span
  9.602 s. Cooldowns, gate waits, lock watches, readiness and the whole campaign wall span (2026-11-19 18:25 to 2026-11-20 07:31 +07:00)
  are never added to or subtracted from the raw request times.

## 9. The 17 target changes made before the GP

Derived from the frozen qualification before any GP sample (`docs/difficulty-v3/evidence/MS18d/gp-preflight.json`, re-checked by
`freeze-targets.js` in Phase D): `min(budget, max(target of the level before, ceil(3 q)))`; the 62 other targets are unchanged and
the 56 absent positions have no target.

| Cell | Old ms | New ms | q ms (qualification p95) | Rule |
|---|---:|---:|---:|---|
| classic4/veryEasy | 10 | 31 | 10.1122 | ceil 3q |
| classic6/veryEasy | 10 | 39 | 12.9032 | ceil 3q |
| classic9/easy | 150 | 2342 | 780.3884 | ceil 3q |
| classic9/normal | 150 | 2627 | 875.5958 | ceil 3q |
| classic9/expert | 400 | 1323 | 440.7861 | ceil 3q |
| classic9/nightmare | 2500 | 8377 | 2792.0346 | ceil 3q |
| mega12/nightmare | 3000 | 18842 | 6280.4697 | ceil 3q |
| mega16/hell2 | 10000 | 30000 | 25239.0671 | budget |
| diagonalX/nightmare | 3000 | 10000 | 5368.3201 | budget |
| hyper/normal | 200 | 1573 | 524.3035 | ceil 3q |
| hyper/nightmare | 3000 | 10000 | 8503.0273 | budget |
| jigsaw9/easy | 350 | 1905 | 634.7225 | ceil 3q |
| jigsaw9/hell2 | 5000 | 10000 | 6102.238 | budget |
| killer/normal | 700 | 5425 | 1808.2659 | ceil 3q |
| sohei/hell2 | 20000 | 30000 | 27155.5581 | budget |
| butterfly/nightmare | 8000 | 30000 | 16120.4641 | budget |
| wordoku/easy | 250 | 2921 | 973.633 | ceil 3q |

Eleven retained manual/deep budgets still differ from these targets (design section 15.1; ten manual rows and the SG_DEEP-only
mega12 Nightmare 3000 vs 18842); they were not touched.

## 10. Final identities, GG, quick sets and CI

**Identities** (`phase-d/identities-before.txt`, `identities-final.txt`, `identities-after-quick.txt`, checked in `bindings.json`).
The before capture is the dispatch baseline exactly; the final capture follows the R6 edits of the design document and the
two developer guides (the only inputs that changed), and is identical after the quick runs and the CI metadata edit.

| Identity | Before the R6 edits | Final (also after the quick runs) |
|---|---|---|
| Generator quick fingerprint | `49089814be577a8cf821c85a22c843bbd9060014555790a933abcaecd95bb1f8` | `10ed919c848f1466be70aae71e690ffd2bc1b7818ec8a3df1bba0dfd6ce9b0ec` |
| Player quick fingerprint | `aa352658286737074b8b5b9dc21b6d67fc6f082b32ce38a609e77f220b51d8c4` | `00db9a687404f50e4591a0b0f92571ebcc3fb0e69b2744fa8190f6a7c720f799` |
| Generator with the manual trees | `176f9c95f17492b5947df8ba393aff0a6956ea8a64ee6add3bac52f2407e9567` | `a818c0b9e0fdcbc8111ac75c365783859afd894c285bfbd8763cfe25d1cc6e3a` |
| Replay identity (unchanged) | `1cf64919a9004259a203e65bc7e537b15b981f4ed52610f4cd62d28cf6950fcc` | same |
| Hash identity (unchanged) | `344afdeca4e2afe58ec552ddf4390608f6aee2febe9eb9c958b0c03b7bb8c1f1` | same |
| Producer sources / target table | `75b0955e3e356bd1` / `3d0bffdb19cc8d0e4c2495163858bfcbf3fd6e3d8567f4718dc722a23746963a` | same (from both re-checks) |

The with-manual fingerprint changed with the same inputs; no manual suite was registered or run. No code, test, fixture, target
or offer input changed. The unchanged `freeze-targets.js` ran twice, before any edit and after the last R6 edit
(`targets-recheck-before.json`, `targets-recheck-final.json`, byte-identical, exit 0 both): 135 positions (79 active, 56 absent),
62 retained and 17 updated targets, the design table equal to the frozen one with 17 bold cells, the eleven retained-versus-GP
pairs stated in the design and both guides, no problem. These are **Phase D re-checks**; the tool's fixed `kind`/`note` still
reads "Phase B" and "before any GG shard".

**Final GG check, file-only** (`transcripts/gg-check-hashes.txt`, exit 0): `tests/perf.js --hash-merge=../docs/difficulty-v3/evidence/MS18d/hashes
--check-hashes` merged **104 ledgers, all 520 keys exactly once, recorded from the current sources**, and **all 520 puzzles are
unchanged**; nothing was generated and no hash was recorded or updated (26 combinations).

**Complete bounded quick sets** on the final fingerprints, each command through the shared lock and the unchanged tee, default time
factor 2, no `SG_DEEP`, `--all`, `--manual` or `--bail` (`phase-d/quick/*.json`, `transcripts/generator-<id>.txt`,
`player-quick.txt`; reconciliation by `(suite, ordinal)` in `quick-coverage.json`; clocks in `quick-cost.json`). The diagnostic
focused run of `perf-tooling,smoke,help` (105 of 105 passed, 27.796 s) is kept in `results/focused-docs.json` and is not part of the
coverage.

| Command | Tests | Passed / failed / skipped | Tee seconds (m) | Harness wall |
|---|---:|---|---:|---:|
| Generator `core-shared` (18 suites) | 2,418 | 2,418 / 0 / 0 | 106.165 | 105.858 s |
| Generator `steps` | 59 | 59 / 0 / 0 | 45.062 | 44.810 s |
| Generator `replay` | 159 | 159 / 0 / 0 | 44.642 | 44.395 s |
| Generator `mega` | 108 | 108 / 0 / 0 | 32.471 | 32.213 s |
| Generator `own-fast` (31 suites) | 1,767 | 1,767 / 0 / 0 | 232.404 | 232.011 s |
| Generator `digger-target` | 75 | 75 / 0 / 0 | 2.753 | 2.500 s |
| Generator `pipeline` | 151 | 151 / 0 / 0 | 44.272 | 44.002 s |
| Generator `player` | 70 | 70 / 0 / 0 | 59.119 | 58.846 s |
| **Generator, eight shards** | **4,807** | **4,807 / 0 / 0** | 566.888 (sum of the shard tee seconds) | |
| **Player, whole quick set** | **2,981** | **2,981 / 0 / 0** | 121.512 | 121.225 s |

Every selected test appears exactly once per app, with the right source hash, a complete result, no registration error, no stale
input and no skip. The shared suites run in both apps and are not deduplicated across them. The counts equal the existing ones
(4,807 tests in 55 suites for the Generator, 2,981 in 32 for the Player); no test, count or selection changed.

**CI timing metadata** (`.github/scripts/generator-quick.json`, counts, measured seconds, `projectionSeconds` and dated provenance only;
no id, selection, group, command, tier, `outOfCi`, factor, overhead or workflow timeout changed). The rule is
`new = max(old, 10 * ceil(1.5 * m / 10))` with m the tee final seconds of the successful complete run; raises only:

| Shard | m (s) | 1.5 m | Rule | Old | New |
|---|---:|---:|---:|---:|---:|
| core-shared | 106.165 | 159.2 | 160 | 170 | 170 |
| steps | 45.062 | 67.6 | 70 | 70 | 70 |
| replay | 44.642 | 67.0 | 70 | 70 | 70 |
| mega | 32.471 | 48.7 | 50 | 50 | 50 |
| own-fast | 232.404 | 348.6 | 350 | 330 | **350** |
| digger-target | 2.753 | 4.1 | 10 | 30 | 30 |
| pipeline | 44.272 | 66.4 | 70 | 80 | 80 |
| player (Generator shard) | 59.119 | 88.7 | 90 | 90 | 90 |
| Player job (whole quick process) | 121.512 | 182.3 | 190 | 180 | **190** |

Job arithmetic `180 + 3 x sum(projections)`: shared-small 1,260 s, own-suites **1,320 s**, pipeline 420 s and replay-player 450 s, each
of 1,800 s; the Player job **750 s of its actual 900 s limit** (the tool's generic 1,800 s check does not override the workflow
limit); every projection is at most 450 s. The final CI coverage and budget check (`transcripts/ci-final.txt`, inventories in
`ci-final/`) printed "Every quick test is in exactly one shard (4807 of 4807), no manual or unknown suite, no empty shard, every job
inside its limit: check passed", exit 0. This is a local coverage and budget check, **not remote CI**: matching-head PR and workflow
verification remains MS18e's and the orchestrator's. The manifest is outside both app fingerprints, so these metadata edits needed
the final CI check and the fingerprint confirmation, not another quick run. The Phase D commands, clocks (tee, helper, runner body,
lock wait, gaps) and every failed or superseded attempt are in `phase-d/lock-log.jsonl` and `phase-d/transcripts/`.

## 11. Item register

The complete register (origin, population, numbers or labelled unknowns, limits, evidence, disposition, next owner of each row) is
`docs/difficulty-v3/evidence/MS18d/phase-d/item-register.json`, checked against the mandatory list. Summary:

| Item | Status | Disposition now | Next owner |
|---|---|---|---|
| S-AV01 | not offered | Greater-Than Normal: 40/40 hits but GQ p95 10,192.4051 > 10,000 ms; closed not offered; 700 ms manual base and diagnostic seed 4 unchanged | MS18e audit |
| S-OD7 / S-AV05 / S-AV06 | hidden | Killer Hard (0/14) and Expert (2/12) hidden until a later calibration; raw verdicts kept apart from the owner withholding | later calibration; MS18e |
| S-AV27 | closed | final GQ execution gap closed at MS18c, not by GP; scheduler and mixed-concurrency caveats kept | MS18e audit |
| IR17 | open | Classic9 Nightmare offered (GP p95 2,403.9863 < 8,377 ms); the 430.5 s GD batch is no reusable bound; GD and deep admission are MS18e's | MS18e |
| MS18c-GQ-ENGINE-COST | open | SA2 pooled median 1.1240344349341411 (2,122 pairs) kept apart from SA1's 1.1284579100925456 (51 cell medians); mega16-replay 331.6 s vs 118 s; no GP ratio | MS18e audit |
| MS18d-GP-BOUND-sohei-hell2 | closed | planning obstruction closed by the six R24 chunks; the 485.597 s mean alert stays; the measured cell misses (below) | MS18e |
| MS18d-GP-BOUND-REMAINDER | closed | the other sixteen cells: 52 chunks for the 17 cells, all complete, 35 extra cold starts disclosed | MS18e audit |
| MS18d-C0-G1-G5 | closed | integration and execution through four reviewed epochs; ownership, cleanup, receipts and the two tooling incidents audited | MS18e audit |
| MS18d-C0b-R24 | closed | 114 ledgers, 3,950 requests, exact statistics and exit contracts; no 117-ledger claim | MS18e audit |
| MS18d-C1-F1-F6 | closed | readiness, attempt, stop and journal controls used; cap two and only the three named exceptions | MS18e audit |
| MS18d-C2-TRANSPORT-WATCH / MS18d-C2-RELEASE-HISTORY | history | about 1,203 s no-folder give-up (zero admissions) and the acquisition hold repaired in B2 and B3; neither a measured timeout | MS18e audit |
| MS18d-DEEP-PUBLIC-REGISTRATIONS | closed | closed on file evidence at 50903182 / b3144fcf (4,807 unchanged; deep listing 4,835 to 4,828; seven removals); no live deep pass | MS18e audit |
| S-AV11 | held | Jigsaw Expert seed 1111 profile still held; 325.313 s is whole-request time, not a bound; no profile released | orchestrator release |
| S-AV31 | history | MS09b finder census (3,508 sampled calls, none capped) and multigrid latency preserved | MS18e audit |
| S-AV33 | history | MS10b WXYZ sampled (7,168 calls, two Samurai capped) versus constructed floods (15 of 17 capped) preserved | MS18e audit |
| S-AV34 | history | MS11a UR second pass (7,168 sampled, 6,842 entered pass 2, none capped); not an exhaustive-coverage claim | MS18e audit |
| S-AV36 | history | MS13a/MS13c grouped-graph census, S-OD11, 50,000 / 4,096 limits; the current GP does not identify a finder | MS18e audit |
| S-AV37 | history | MS14b leftover kernel (2 of 5 blank layouts cap; 60 seeded and 38 real calls, none capped) | MS18e audit |
| S-AV38 | history | MS13c different-source 50-cell partial GP and paired p95s kept as history; the 79-cell coverage is not a retrofit | MS18e audit |
| S-AV39 | history | MS15a/MS15b/MS16 ALS and Sue de Coq populations and caps, limits unchanged | MS18e audit |
| MS15b-GP-J | history | jigsaw9/nightmare pilot and the unlaunched 50-run command; now hidden, not supplied with other data | MS18e audit |
| MS15b-GP-U | history | historical 37-cell cohort; 15 of the 37 are offered and measured now (12 meet, 3 miss), 22 are hidden | MS18e audit |
| MS18d-C2-EXTERNAL-CONSUMERS | disclosed | nine holds, seven consumer categories, four scheduling versions, a3 gate waits 325 / 124 / 247 s, explicit unknowns | MS18e audit |
| S-OD16/17/18 and F3 dispositions | closed | three one-use a3 grants exercised successfully in S order; earlier holds retained; no a4 | MS18e audit |
| MS18d-GP-MISS-mega12-expert | finding | p95 4,208.3516 against 3,000 ms; retained | MS18e / S-OD4 work |
| MS18d-GP-MISS-sohei-hell2 | finding | p95 35,522.675 against 30,000 ms; retained | MS18e / S-OD4 work |
| MS18d-GP-MISS-butterfly-hell2 | finding | p95 15,496.1127 against 15,000 ms; retained | MS18e / S-OD4 work |
| MS18d-GP-MISS-wordoku-expert | finding | p95 604.149 against 600 ms; retained | MS18e / S-OD4 work |
| MS18d-GP-MISS-wordoku-nightmare | finding | p95 2,800.4616 against 1,500 ms; retained | MS18e / S-OD4 work |
| S-AV08 | open | Generator 4,807 tests in eight shards, 566.888 s of shard tee seconds; Player 2,981 in 121.512 s; two projections raised | MS18e cost and tier audit |

## 12. What is local and what remains

Local (this task): the 79-cell GP, the provenance audit, the file-only GG check, both complete bounded quick sets on their
final fingerprints and the coverage/budget check of the CI manifest; none of it is remote CI, a browser result or a Chrome
reference measurement. Open for MS18e and the orchestrator: matching-head PR/workflow verification, the dispositions of the five
numerical misses (S-OD4, with explicit authorization for any generator or target work), GD/final deep admission (IR17), the
held S-AV11 profile, the finder-cap audits (S-AV31 to S-AV39) and the final audit; none of them is closed by this report.
