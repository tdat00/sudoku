# Recovery profile of the requiredness-active candidate (MS05r1)

This is step evidence of the S-OD2 recovery, not an acceptance and not a performance gate. It profiles the
preserved, uncommitted MS05b1 tree (requiredness active in the digger and the keeper, on top of `f788e02`) with
three fixed requests, one attempt each, to answer one question: **where does the time go, in the ordinary dig
samples or in the local continuation that a shallow-search allowance (R5) can limit?** No production file, cap,
budget, fixture, seed or assertion was changed to take it. The command, its record and its tests are described in
[generator/design.md](../../generator/design.md) 15.4; the evidence (the three records, the source identity, the
commands, the incidents) is in [evidence/MS05r1/](evidence/MS05r1/evidence.md).

## The three profiles

One process, one request, `maxAttempts: 1` (read back from the normalised configuration), trace as the request
has it, the shared timing lock held, one command at a time, Windows x64, AMD EPYC 7763 (16 logical CPUs), Node
v26.13.0. All three records have outcome `ok`, `complete: true`, no instrumentation problem, and the same source
hash `70036faf...` and tool hash `eb2194c9...`. Times are seconds of the pipeline run (`generationMs`) split by
the stage arguments; the share is of the observed stage time (the rest, the configure and buildModel steps and the
pipeline's own glue, is 5 to 10 ms).

| Request | Generation | Ordinary samples (12) | Local continuation | Other | Full ratings: ordinary / local | Work of the attempt | Ended by |
|---|---:|---:|---:|---:|---:|---|---|
| G13: `samurai` Nightmare, seed 42 (the golden request through `SG.store.toConfig`) | 24.362 s | 10.244 s (42.1 %) | 14.104 s (57.9 %) | 0.008 s | 19 / 1,005 | 1,024 ratings, 7,532 proposals | the 1,024-rating cap |
| `mega12` Nightmare, seed 3, trace off | 6.974 s | 4.221 s (60.6 %) | 2.744 s (39.4 %) | 0.004 s | 20 / 615 | 635 ratings, 32,768 proposals | the 32,768-proposal cap |
| `mega16` Nightmare, seed 3, trace off | 79.675 s | 54.937 s (69.0 %) | 24.718 s (31.0 %) | 0.011 s | 39 / 985 | 1,024 ratings, 3,108 proposals | the 1,024-rating cap |

In all three the attempt ends without an exact puzzle: the returned puzzle is the closest one, in the Nightmare
band with `forcingChain` as its hardest technique, rated again independently with the same score, unique,
`required: false` (warnings `difficulty.approximate` and `difficulty.shallow`), so none of the three is a
one-attempt hit. A one-attempt miss and a shallow fallback are expected here and are retained as they are.

### What is inside the two parts

| Request | Score-targeted samples (even: 2, 4, ... 12) | Proposal samples (odd: 1, 3, ... 11) | Local continuation, per full rating | Local continuation, per proposal |
|---|---|---|---|---|
| G13 | 8.733 s dig, 1.456 s each, 85.3 % of the ordinary time; 1 rating each, 9.4 ms in the rate stage | 1.453 s, 0.242 s each, 13 ratings | 14.0 ms | 1.87 ms |
| mega12 | 3.888 s dig, 0.648 s each, 92.1 %; 1 rating each, 9.6 ms | 0.275 s, 0.046 s each, 14 ratings | 4.5 ms | 0.08 ms |
| mega16 | 51.248 s dig, 8.541 s each, 93.3 %; 1 rating each, 20.8 ms | 3.564 s, 0.594 s each, 33 ratings | 25.1 ms | 7.95 ms |

The "per full rating" and "per proposal" columns divide the whole local continuation (ratings, uniqueness counts,
memo visits) by one count; they are an upper bound of the cost of one rating, not a measurement of it. The even
and odd split follows the digger's schedule of the top tiers (odd samples are the fast proposal dig, even samples
the score-targeted dig); each sample is a `dig`, a `rate` and a `tune` stage in the record.

## What an R5 allowance can and cannot reduce (evidence, not a decision)

The allowance of R5 limits the full ratings of the local continuation that follow its first shallow candidate. It
is not a cap on the earlier layout, dig or sample work and not a cap on the number of attempts. Read against the
three records:

- **It can act on the local continuation, and that part is large where the cap was reached.** The continuation is
  57.9 % of the G13 attempt (14.1 of 24.4 s, 1,005 of its 1,024 ratings) and 31.0 % of the `mega16` attempt
  (24.7 of 79.7 s, 985 ratings); both were ended by the existing 1,024-rating cap, so an allowance below that
  number can only shorten them. In `mega12` the continuation is 39.4 % (2.7 of 7.0 s) but was ended by the
  proposal cap after 615 ratings: a ratings allowance above 615 would have changed nothing there, and a lower one
  would have stopped it earlier.
- **It cannot act on the ordinary samples, which are the other 42.1 %, 60.6 % and 69.0 % of one attempt.** They
  run before the continuation starts and take 10.2 s (G13), 4.2 s (`mega12`) and 54.9 s (`mega16`) in this
  attempt, 85 to 93 % of it in the six score-targeted samples, each of which rates once. No ratings allowance
  touches that time.
- **Irreducible sample cost, `mega16`.** Even a continuation that cost nothing would leave 54.9 s for attempt 1,
  91.6 % of the 60 s guard of the mega quick tests, and the attempt does not end exact, so a second attempt has
  to run. If a later attempt cost like the first (not measured here: the other attempts use other grids), the
  ordinary samples alone would be about 110 s for two attempts. The 60 s guard cannot be met by limiting the
  local continuation alone for this request; `mega12` (4.2 s of ordinary samples per attempt, 34 s for eight
  such attempts) is the opposite case.
- **G13, same arithmetic.** With the continuation at zero, eight attempts that each cost the 10.2 s of this one
  would be about 82 s, under the 120 s of the recorder and above 60 s (the other seven attempts are not
  measured; the interim eight-attempt run was 219.7 s, 27.5 s per attempt on average against 24.4 s here).
- **Not known from these records:** how many of the continuation's ratings happen before its first shallow
  candidate (the allowance starts counting there; the collector of MS05r3 records `firstShallowAt`), the
  per-attempt cost of attempts 2 to 8, and the effect of an allowance on exactness. None of the three requests
  selects anything: the choice among 64, 128, 256 and none is for the later diagnostics and the selector.

## What this evidence does not do

It profiles one attempt of one seed per request on one machine, so the costs of other seeds and later attempts
are open; it does not check the 120,000 ms recorder, the 60,000 ms mega guard or the 6 s and 20 s design
assertions, and it does not choose an allowance, a default or a cap. The observation is transparent (the same
puzzle, rating, exactness, dig log, random streams and counters as an unobserved run, tested on a small control);
the observed stage times differ from the pipeline's own stage timings by at most 0.2 ms per step, which is the
cost of the observer.

## Reproduce

From `generator/`, one command at a time through the shared timing lock (each is 7 to 83 s):

```text
node tests/difficulty-recovery.js --mode=profile --case=G13 --json=<file.json>
node tests/difficulty-recovery.js --mode=profile --case=mega12-nightmare --json=<file.json>
node tests/difficulty-recovery.js --mode=profile --case=mega16-nightmare --json=<file.json>
```
