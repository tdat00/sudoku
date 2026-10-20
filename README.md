# Sudoku

Two static web apps for Sudoku, and the code they share. No framework, no build step, no server.
Hai ứng dụng web tĩnh về Sudoku và phần mã dùng chung của chúng. Không framework, không bước biên dịch, không máy chủ.

| | Live · Trực tuyến | Source · Mã nguồn |
|---|---|---|
| **Sudoku Generator** — makes puzzles of 15 variants, guarantees the difficulty you ask for and shows how each puzzle is made · tạo đề 15 biến thể, đảm bảo đúng độ khó và cho xem cách đề được tạo | [tdat00.github.io/sudoku/generator](https://tdat00.github.io/sudoku/generator/) | [generator/](generator/README.md) |
| **Sudoku Player** — opens a puzzle from the generator (or pasted text) and lets you play it: notes, undo, hints that name the technique · mở đề từ trình tạo đề (hoặc văn bản dán vào) để chơi: ghi chú, hoàn tác, gợi ý nêu tên kỹ thuật | [tdat00.github.io/sudoku/player](https://tdat00.github.io/sudoku/player/) | [player/](player/README.md) |

English and Vietnamese, light / dark / high-contrast, keyboard and touch. The generator's **Play** button opens the
puzzles in the player.

## Layout · Cấu trúc

```
core/        what both apps load: the solver engine, the SVG board, the exchange format, base styles, the word book,
             and their tests · phần mã dùng chung và các kiểm thử của nó
generator/   Sudoku Generator
player/      Sudoku Player
docs/        documents by feature · tài liệu theo tính năng
.github/     the workflow that tests and publishes the site · workflow kiểm thử và xuất bản
AGENTS.md    how AI agents should work here · hướng dẫn cho tác tử AI
```

Details: [docs/architecture.md](docs/architecture.md). All the documents: [docs/](docs/README.md).

## Run it · Chạy

Open `generator/index.html` or `player/index.html` in a browser, or serve **this folder** (not `generator/` or
`player/`: the pages load `core/`) with any static server:

```bash
python -m http.server 8000      # then open http://localhost:8000/generator/ or http://localhost:8000/player/
```

Mở `generator/index.html` hoặc `player/index.html` bằng trình duyệt, hoặc phục vụ **thư mục này** (không phải
`generator/` hay `player/`: các trang nạp `core/`) bằng một máy chủ tĩnh bất kỳ.

## Test · Kiểm thử

Node 18+ (the project is tested on 24), no packages:

```bash
cd generator && node tests/node-runner.js     # quick suites of the generator + the shared ones of core/tests
cd player    && node tests/node-runner.js     # quick suites of the player + the shared ones of core/tests
```

The heavy suites of the generator (`--all`, `--manual`) and the browser scripts of the player are slow and are run on
purpose, not by default: see the READMEs and [AGENTS.md](AGENTS.md).

## Licence · Giấy phép

MIT — see [LICENSE](LICENSE) © 2026 Dat Le.
