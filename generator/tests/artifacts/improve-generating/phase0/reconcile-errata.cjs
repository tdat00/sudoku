'use strict';

/*
 * IG-S10 r3 (pack-author rulings after the audit): the errata table and the staleness facts. The errata name the passages of the
 * joint report (`report.md`), the plan (`plan.md`), the clarifications and the r1 / r2 reports of this task that a ruling
 * corrects; none of those documents is edited. Line numbers are LOCATED in the files at build time (a pattern that no longer
 * matches yields no line and fails a test), never typed by hand.
 */
const fs = require('fs');
const path = require('path');

const DOCS = Object.freeze({
  'report.md (joint report)': ['docs', 'improve-generating', 'report.md'],
  'plan.md (joint plan)': ['docs', 'improve-generating', 'plan.md'],
  'clarifications.md': ['docs', 'improve-generating', 'clarifications.md'],
  'IG-S10 report.md (r1)': ['docs', 'improve-generating', 'evidence', 'phase0', 'provisional-r1', 'report.md'],
  'IG-S10 report-r2.md': ['docs', 'improve-generating', 'evidence', 'phase0', 'provisional-r1', 'report-r2.md']
});

const JR = 'report.md (joint report)';
const JP = 'plan.md (joint plan)';
const CL = 'clarifications.md';
const R1 = 'IG-S10 report.md (r1)';
const R2 = 'IG-S10 report-r2.md';

const ERRATA = Object.freeze([
  { id: 'E1', ruling: 1, subject: 'Samurai baseline and the other CV3 anchors',
    problem: '26.74 s is the CV3 maximum of two requests (MS05b3), not a median; it stood in a "median / p95" column and was compared with a measured median',
    correction: 'compare descriptively with the new maximum 26.53 s (-0.8 %); the new median 24.93 s is shown separately; sohei 27.49, flower 23.07 and ' +
      'butterfly 32.82 are CV3 maxima of two requests too and are labelled so (anchors and proxies); the mega12 / mega16 anchors are deep medians (n = 7), ' +
      'classic9 the R5 median (n = 12), Killer and Greater-Than I5 per-request medians',
    targets: [
      [JR, [/\*\*CV3\*\* = MS05b3 CV3, the larger of two requests/, /^\| samurai Nightmare \(2\) \| 26\.7 \|/,
        /^\| samurai Nightmare \(2\) \| 26\.74 \(CV3\)/, /^\| sohei Nightmare \(2\) \| 27\.49 \(CV3\)/, /^\| flower Nightmare \(2\) \| 23\.07 \(CV3\)/,
        /^\| butterfly Nightmare \(4\) \| 32\.82 \(CV3\)/]],
      [R1, [/Today 26\.74 \/ n\/a s/, /measured median 24\.93 s against 26\.74 s/]],
      [R2, [/Today 26\.74 \/ n\/a s/, /measured median 24\.93 s against 26\.74 s/]]] },
  { id: 'E2', ruling: 2, subject: 'The native sample mix',
    problem: 'the equal-weight mix was labelled "NOT the native request mix (unknown here)"',
    correction: 'equal weighting matches the observed ordinary/proposal counts of the four SM1 requests (48/48, 12/12, 24/24, 12/12; IG-S07/summary-r2.md lines ' +
      '78-88); it remains a sample-cost comparator, not whole-request throughput, and early stopping can change the realised mix',
    targets: [[R1, [/NOT the native request mix/]], [R2, [/NOT the native request mix/]]] },
  { id: 'E3', ruling: 3, subject: 'S1 per-sample cost against yield',
    problem: 'the planning expectation was a near-constant per-sample cost (time per sample divided by about 1 / 1.2 / 1.5-2 / 3)',
    correction: 'not observed for this prototype and cohort: F1 sample CPU over the equal-weight native mix is about 0.38 / 0.28 / 0.12 / 0.23 (classic9 / ' +
      'mega12 / mega16 / samurai); the cheap work is attributed to unsuccessful, empty-frontier and above-band outcomes; cost per verified exact puzzle ' +
      'remains unestablished and yield inconclusive (0 hits in every mode)',
    targets: [
      [JR, [/S1 is a hit-rate lever on 81 to 144 cells/, /regress; on mega16 it falls to about a third/, /144, 1\.5 to 2 on the multigrids and 3 on mega16/,
        /^\| S1 frontier dig \| time per sample divided by about 1/]],
      [R2, [/^\| S1\/S2 F0\/F1\/FC\/FM\/FU\/FS \|/]]] },
  { id: 'E4', ruling: 4, subject: 'S2 isolated (F0 versus F1)',
    problem: 'S2 was priced inside the combined S1 + S2 divisor and measured only inside the combined S1/S2 row',
    correction: 'an isolated row: F1/F0 mean sample CPU is about 1.01-1.12 on the same 8 grid clusters x 2 samples per cell: no CPU saving on this ' +
      'cohort; correctness and deduction-saving evidence is kept separate; not generalised to "S2 never helps"',
    targets: [[JP, [/^\| S2 \| Re-derivation early exit of removal tests/]], [JR, [/The S1 \+ S2 divisor \(reconciled/]],
      [R2, [/^\| S1\/S2 F0\/F1\/FC\/FM\/FU\/FS \|/]]] },
  { id: 'E5', ruling: 5, subject: 'The first-phase formula and its verdict',
    problem: 'the verdict text treated S1/S2/S5b as missing components of the first phases and called S4 merely "unimplemented"',
    correction: 'the original first-phase formula is full S3 x S4 x S5a with S3 alone on the local continuation; only S5a and partial S3 were measured; S4 is ' +
      'unimplemented and under Q04 moves to phase 3 under the new generator version; S1/S2/S5b are phase-3 items, not missing components of that formula',
    targets: [[JR, [/^- \*First phases\* = plan phases 1 and 2/, /The first phases divide the sample-side solves by S3 x S4/]],
      [R1, [/first and all phases inconclusive/]], [R2, [/first and all phases inconclusive/]]] },
  { id: 'E6', ruling: 6, subject: '1,296 solves per sample and "10x fewer solves"',
    problem: 'the plan costs every sample at about 1,296 full solves for every board and projects 10x fewer solves from S1',
    correction: 'withdrawn as representative costing and speed-up premises: SM1 observed roughly 74-331 solves per ordinary sample; a lower observed count ' +
      'does not refute a mathematical upper bound, which stays only as a separately justified loose bound, never as typical work or an empirical 10x prediction',
    targets: [[JP, [/1,296 solves per sample for every board/, /A \* S \* 1,296 \* d \* sum F_i/, /10x fewer solves per sample/, /G \+ 1,296/,
      /If the three factors are 10, 2/]], [JR, [/plan's 1,296 solves/]]] },
  { id: 'E7', ruling: 7, subject: 'Two missing measurements: the SM5 width sweep and the restricted-floor probes',
    problem: 'the pack lists the SM5 sweep (1, 2, 4 workers on mega12 and classic9) and the restricted-floor probes, and neither was measured',
    correction: 'explicit UNMEASURED rows (the existing floor parity is not the probes; the width-4 pool and the effective two-worker operation on two-attempt ' +
      'boards are not the width-two comparison); added to the frozen proposal and decisions D9 / A7; no run authorised',
    targets: [[JP, [/^\| SM5 \| S5a in Node/]], [JR, [/restricted-floor probes/]], [CL, [/restricted-floor and prefix probes/, /SM1 profiles and restricted-floor probes/]]] },
  { id: 'E8', ruling: 8, subject: 'Source preparation before the frozen commands',
    problem: 'the frozen proposal ran the commands without a prerequisite and priced no adapter repair or recalibration',
    correction: 'prerequisite: a dedicated worktree at the attested frozen commit, a pinned harness installed and fingerprinted, a capability inventory; ' +
      'adapter repairs, reproof and recalibration are uncosted approval-dependent work outside every runtime projection; never a fallback to the old engine',
    targets: [[R1, [/^## 12\. The frozen rerun/]], [R2, [/^## 12\. The frozen rerun/]]] },
  { id: 'E9', ruling: 9, subject: 'Killer wording',
    problem: 'a bare "refuted" for the Killer S5a planning factor',
    correction: '"below the planning range on all three observed pairs; no general refutation" (no numerical change; the x2.55 median, the x2.07-2.65 range and ' +
      'the original IG-S02 verdict stay as historical evidence)',
    targets: [[R1, [/refuted on Killer|planning-factor estimate refuted/]], [R2, [/planning-factor estimate refuted on these 3 pairs/]]] },
  { id: 'E10', ruling: 10, subject: 'The IG-S09 Nightmare cohort',
    problem: 'the Nightmare cohort was called "censored"',
    correction: '"partial, budget-limited cohort": its recorded requests completed and eight rows were unstarted',
    targets: [[R2, [/censored cohort/]]] }
]);

function readLines(repoRoot, doc) {
  const file = path.join.apply(path, [repoRoot].concat(DOCS[doc]));
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file, 'utf8').split(/\r?\n/);
}

function rangesOf(numbers) {
  const out = [];
  numbers.forEach(function (n) {
    const last = out[out.length - 1];
    if (last && n === last[1] + 1) last[1] = n; else out.push([n, n]);
  });
  return out.map(function (r) { return r[0] === r[1] ? String(r[0]) : r[0] + '-' + r[1]; }).join(', ');
}

/** The errata with the lines of every passage located in the files as they are now (read only). */
function locateErrata(repoRoot) {
  return ERRATA.map(function (e) {
    const passages = e.targets.map(function (t) {
      const lines = readLines(repoRoot, t[0]);
      const found = [];
      if (lines) {
        lines.forEach(function (text, i) {
          if (t[1].some(function (re) { return re.test(text); })) found.push(i + 1);
        });
      }
      const first = found.length ? lines[found[0] - 1].replace(/\s+/g, ' ').trim() : null;
      return { document: t[0], lines: found, linesText: rangesOf(found), quoted: first === null ? null : (first.length > 96 ? first.slice(0, 93) + '...' : first) };
    });
    return { id: e.id, ruling: e.ruling, subject: e.subject, problem: e.problem, correction: e.correction, passages: passages,
      located: passages.every(function (p) { return p.lines.length > 0; }) };
  });
}

/** What the audit verified about the age of the measurements (given facts; this harness measures none of them). */
function staleness() {
  return {
    title: 'Staleness of the measurements',
    facts: [
      'Every measurement of IG-S01 to IG-S09 ran on the MS05e-era runtime (commit `ef8a9cc`, runtime fingerprint `36b2b832...`), the catalogue of ' +
        'rating version 2 (15 variants, 26 techniques).',
      'Rating v3 (`8b70875`) includes MS06a-d and MS07a-d: 11 runtime files changed (+808 / -208 lines), among them the windowed chain kernels with ' +
        '`SHORT_MAX` = 4, `forcingChainLong` (1400) and `nishioDeep` (2600).',
      'MS07c\'s classic9 Nightmare experiment at C = 4: 12 of 12 exact, p50 0.15 s, p95 0.51 s; G13 samurai/42 exact at attempt 1; G10 Killer/42 ' +
        'shallow to exact; Hell 1 non-vacuous.',
      'MS08 to MS16 are expected to add about 14 finders.'
    ],
    reading: 'The MS07c observations come from a different source, cohort and cap: they are not paired improvements over the measurements of this report ' +
      'and are not combined with them. Every timing here describes the MS05e-era runtime; the frozen rerun is on the attested frozen commit.',
    compatibilitySmoke: 'Compatibility smoke: see `evidence/phase0/smoke-rating-v3-8b70875/`'
  };
}

module.exports = { DOCS, ERRATA, locateErrata, staleness, rangesOf };
