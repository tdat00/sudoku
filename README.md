# Sudoku

**Live apps:**
[Sudoku Generator](https://tdat00.github.io/sudoku/generator/) ·
[Sudoku Player](https://tdat00.github.io/sudoku/player/)

**User guide:** [English](USERGUIDE.md) · [Tiếng Việt](USERGUIDE.vn.md) ·
**Developer guide:** [English](DEVELOPERGUIDE.md) · [Tiếng Việt](DEVELOPERGUIDE.vn.md)

Two static web apps for Sudoku, written in plain HTML, CSS and JavaScript, and the code they share. No framework, no
build step, no server, no external library.

![Sudoku Generator: a classic 9×9 puzzle halfway through the replay of its generation](docs/screenshots/screenshot-classic9-light.png)

## Features

- **[Sudoku Generator](generator/)**: generates puzzles of 15 variants (classic, Mega, Monster, Diagonal, Hyper,
  Jigsaw, Killer, Greater-Than, Samurai, Sohei, Butterfly, Flower, Wordoku) at nine difficulty levels, guarantees
  the level you ask for, replays step by step how each puzzle was made (with a score table on every step and the
  jumps in score explained), and prints and exports them.
- **[Sudoku Player](player/)**: plays a puzzle from the generator's **Play** button, a link or pasted text: notes,
  undo / redo, error checking, hints that name the technique, a timer and saved progress.
- **Both**: English and Vietnamese, light, dark and high-contrast themes, keyboard and touch. Nothing is uploaded:
  puzzles travel in the link and progress stays in the browser.

See the [user guide](USERGUIDE.md) for every feature and the URL parameters, and the
[developer guide](DEVELOPERGUIDE.md) for how the apps work, how to test them and how to add a variant or a technique.

## Run it

Open `generator/index.html` or `player/index.html` in a browser (it works from `file://`), or serve the root of the
repository with any static server so that the generator runs in a Web Worker:

```bash
python -m http.server 8000      # then open http://localhost:8000/generator/ or http://localhost:8000/player/
```

## Tests

Node 18+ (CI uses 24), no packages to install:

```bash
cd generator && node tests/node-runner.js     # the quick suites of the generator + the shared ones of core/tests
cd player    && node tests/node-runner.js     # the quick suites of the player + the shared ones of core/tests
```

The heavy suites and the browser scripts are run on purpose, not by default: see the
[developer guide](DEVELOPERGUIDE.md#running-the-tests) and [AGENTS.md](AGENTS.md).

## Publishing

`.github/workflows/pages.yml` runs the tests and publishes the site on GitHub Pages after every push to `main`:
[/sudoku/](https://tdat00.github.io/sudoku/) redirects to the generator, and `/generator/`, `/player/` and `/core/`
(the shared code) are published side by side.

## Documents

- [USERGUIDE.md](USERGUIDE.md) / [USERGUIDE.vn.md](USERGUIDE.vn.md): the user guide in English and Vietnamese — how to
  use the apps: features, URL parameters, playing, privacy, known limitations.
- [DEVELOPERGUIDE.md](DEVELOPERGUIDE.md) / [DEVELOPERGUIDE.vn.md](DEVELOPERGUIDE.vn.md): the developer guide in English and
  Vietnamese — how the apps work, how to run, test, extend and publish them, and how to contribute.
- [docs/README.md](docs/README.md): the documents by feature, starting with [the architecture](docs/architecture.md).
- `generator/design.md`, `generator/task.md`, `player/design.md`, `player/task.md`: the design and the plan of each
  app, next to its source.
- [AGENTS.md](AGENTS.md): how AI agents should work here.

## Licence

Released under the [MIT licence](LICENSE) © 2026 Dat Le.
