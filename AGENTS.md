# Instructions for AI agents

This repository holds two static apps and the code they share (see [docs/architecture.md](docs/architecture.md)):
`generator/`, `player/` and `core/`. There is no build step and no npm package; tests run on Node (24 in CI).

## Tests: run the simple ones, and only those

- Run the **quick suites** of the app you changed, from its folder:

  ```bash
  cd generator && node tests/node-runner.js            # about one minute
  cd player    && node tests/node-runner.js            # about fifteen seconds
  ```

  Both also run the shared suites of `core/tests/suites`, so a change in `core/` is covered by running either one
  (run both when you change `core/`, since each app plugs different boards into the shared suites).
- While working on something narrow, run just the suites that cover it:
  `node tests/node-runner.js --suite=<name>[,<name>]` (the file name without `.test.js`), optionally with
  `--filter=<text>`. Prefer this to the whole quick set.
- **Do not run, and do not edit, the full or heavy tests unless you are asked to.** That means:
  - `node tests/node-runner.js --all` and `--manual` in `generator/` (the 8 suites of `generator/tests/manual/`:
    about eight minutes; CI runs `--all` before each deploy);
  - `generator/tests/soak.js`, `perf.js` and `qualify.js`, and anything that updates the regression hashes
    (`--update-hashes`, `SG_UPDATE_HASHES`) or the qualification lists;
  - the browser scripts of the player (`player/tests/browser/*`, `run-all.js`) and `tests.html`;
  - `SG_DEEP=1` runs.
- Do not weaken, skip, delete or rewrite a test to make a run pass, and do not change the heavy suites, the regression
  hashes, the fixtures (`player/tests/fixtures/puzzles`, `exports`) or the generated files (`help-examples.js`) on your
  own initiative. If a quick suite fails and you do not know why, say so instead of editing the test.
- Tests that read the documents (`help.test.js` of each app reads the guides: the user guide `USERGUIDE.md` /
  `USERGUIDE.vn.md` and the developer guide `DEVELOPERGUIDE.md` / `DEVELOPERGUIDE.vn.md`) check them against the
  code: when you change a path, a command or a number that a guide states, update that guide (both languages) in
  the same change.

## Where things go

- Code both apps use goes in `core/` and must not know about either app; code of one app stays in that app. A file added
  to `core/js/**` has to be added to the script lists of **both** apps (`index.html`, `tests.html`,
  `tests/node-runner.js`, plus `help.html` for the player and `js/worker/gen.worker.js` for the generator): the
  `ui-contract` suites fail when they drift apart.
- Files are classic scripts (an IIFE attached to the `SG` global): no `import`, `export` or `require` in `js/`.
- Links between pages are relative paths to the page (`../player/index.html`), never to a folder and never an absolute URL.
  Pages must work from `file://` and from a server started at the **repository root**.
- Documents are in `docs/` by feature; `design.md` and `task.md` of each app stay next to its source.
- `README.md` is a short, English-only overview of the repository. The apps have no README of their own; their
  documentation is four guides at the root:
  - the **user guide**, `USERGUIDE.md` (English) and `USERGUIDE.vn.md` (Vietnamese): how to use the apps, for
    players (features, URL parameters, playing, settings, privacy, limitations a user notices) — no code, tests or
    deployment;
  - the **developer guide**, `DEVELOPERGUIDE.md` (English) and `DEVELOPERGUIDE.vn.md` (Vietnamese): layout, running
    locally, how the apps work, the exchange format, adding a variant or a technique, tests, conventions,
    publishing, how to contribute.

  Keep both guides in both languages, in step with each other (same facts) and with the code: when behaviour
  changes, update the guide it belongs to (and `design.md`) in the same change.

## Conventions

2-space indent, single quotes, semicolons, lines of at most 110 characters in the engines, English comments only where
the code is hard to follow. Colours only in `core/css/tokens*.css`. Every shown string goes through `SG.i18n.t()` and
exists in English and Vietnamese. The conventions in full: `DEVELOPERGUIDE.md` ("Conventions", in the Sudoku Generator
part) and
`generator/design.md` §12.2.

Keep commits meaningful (one change each, not one per file); do not commit secrets.
