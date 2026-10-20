# Documents

The documents of the two apps, grouped by what they are about rather than by app.

| Folder / file | About | Read it for |
|---|---|---|
| [architecture.md](architecture.md) | the repository: `core/`, `generator/`, `player/`, how they are loaded, linked, tested and published; where the old paths went | getting around the code |
| [difficulty-rating/](difficulty-rating/report-brief.md) | **difficulty rating v2** — how a puzzle is scored and a level is generated, in both apps. [Brief](difficulty-rating/report-brief.md) · [detailed report](difficulty-rating/report-detailed.md) · [levels each variant offers](difficulty-rating/qualification.md) (the list the generator's tests read) · the researchers' reports and the review, with the recorded evidence | why the levels are what they are |
| [puzzle-exchange/](puzzle-exchange/fixtures.md) | the puzzle documents and text exports that carry puzzles from the generator to the player, and the fixtures that pin the format | changing the exchange format |
| [qa/](qa/browser-run.md) | what was checked and how: the [final review and soak run](qa/final-review-v1.md) of the generator's first version, and the [browser run](qa/browser-run.md) of the player and of the links between the apps | knowing what is covered |
| [screenshots/](screenshots) | the screenshots used by the READMEs | |

Not here, because they describe the source of one app and sit next to it:

- `generator/design.md`, `generator/task.md` — the generator's design and plan;
- `player/design.md`, `player/task.md` — the player's design and plan;
- `generator/README.md`, `player/README.md` — what each app is, how to run it, how it works; and the
  [README of the repository](../README.md).

The reports in `difficulty-rating/` and `qa/final-review-v1.md` are dated records written when the apps were two
repositories: they keep their old paths, with a note and [a table of where the paths went](architecture.md#where-the-old-paths-went).
