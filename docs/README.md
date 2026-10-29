# Documents

The documents of the two apps, grouped by what they are about rather than by app.

| Folder / file | About | Read it for |
|---|---|---|
| [architecture.md](architecture.md) | the repository: `core/`, `generator/`, `player/`, how they are loaded, linked, tested and published; where the old paths went | getting around the code |
| [difficulty-rating/](difficulty-rating/report-brief.md) | **difficulty rating v2** — how a puzzle is scored and a level is generated, in both apps. [Brief](difficulty-rating/report-brief.md) · [detailed report](difficulty-rating/report-detailed.md) · [levels each variant offers](difficulty-rating/qualification.md) (the list the generator's tests read) · the researchers' reports and the review, with the recorded evidence | why the levels are what they are |
| [generation-steps/](generation-steps/report-brief.md) | **the Generation Steps replay** of the generator — a score table on every step, steady scores, explained jumps. [Brief](generation-steps/report-brief.md) · [detailed report and implementation spec](generation-steps/report-detailed.md) · the researchers' reports, reviews and golden acceptance data · the implementation tasks in [`tasks/generation-steps/`](../tasks/generation-steps/check-list.md) | why the replay shows what it shows |
| [puzzle-exchange/](puzzle-exchange/fixtures.md) | the puzzle documents and text exports that carry puzzles from the generator to the player, and the fixtures that pin the format | changing the exchange format |
| [qa/](qa/browser-run.md) | what was checked and how: the [final review and soak run](qa/final-review-v1.md) of the generator's first version, and the [browser run](qa/browser-run.md) of the player and of the links between the apps | knowing what is covered |
| [screenshots/](screenshots) | the screenshots used by the README and the user guide | |

Not here, because they describe the source of one app and sit next to it:

- `generator/design.md`, `generator/task.md` — the generator's design and plan;
- `player/design.md`, `player/task.md` — the player's design and plan.

At the root of the repository: the [README](../README.md), a short overview; the user guide of both apps — what
each app is and how to use it — in [English](../USERGUIDE.md) and [Vietnamese](../USERGUIDE.vn.md); and the
developer guide — how to run, test and extend the apps, how they work, how to contribute — in
[English](../DEVELOPERGUIDE.md) and [Vietnamese](../DEVELOPERGUIDE.vn.md).

The reports in `difficulty-rating/` and `qa/final-review-v1.md` are dated records written when the apps were two
repositories: they keep their old paths, with a note and [a table of where the paths went](architecture.md#where-the-old-paths-went).
