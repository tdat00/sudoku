# Sudoku

<a id="top"></a>

**Live apps · Ứng dụng trực tuyến:**
[Sudoku Generator](https://tdat00.github.io/sudoku/generator/) ·
[Sudoku Player](https://tdat00.github.io/sudoku/player/) ·
[GitHub](https://github.com/tdat00/sudoku)

- [Table of Contents](#english)
  - [What it is](#what-it-is)
  - [Layout](#layout)
  - [Run it](#run-it)
  - [Tests](#tests)
  - [Publishing](#publishing)
  - [Documents](#documents)
  - [Licence](#licence)
- [Mục lục](#tieng-viet)
  - [Giới thiệu](#giới-thiệu)
  - [Cấu trúc](#cấu-trúc)
  - [Chạy](#chạy)
  - [Kiểm thử](#kiểm-thử)
  - [Xuất bản](#xuất-bản)
  - [Tài liệu](#tài-liệu)
  - [Giấy phép](#giấy-phép)

---

Two static web apps for Sudoku, written in plain HTML, CSS and JavaScript, and the code they share. **Sudoku
Generator** makes puzzles of 15 variants, guarantees the difficulty you ask for and shows how each puzzle is made;
**Sudoku Player** opens a puzzle from the generator (or pasted text) and lets you play it. No framework, no build
step, no server, no external library. (The Vietnamese part is [below](#tieng-viet).)

Hai ứng dụng web tĩnh về Sudoku, viết bằng HTML, CSS và JavaScript thuần, cùng phần mã dùng chung của chúng.
**Sudoku Generator** (trình sinh đề) tạo đề 15 biến thể, đảm bảo đúng độ khó bạn chọn và cho xem cách từng đề được tạo
ra; **Sudoku Player** (trình chơi) mở đề từ trình sinh đề (hoặc văn bản dán vào) để bạn chơi. Không framework, không
bước biên dịch, không máy chủ, không thư viện ngoài. (Phần tiếng Việt nằm ở [phía dưới](#tieng-viet).)

---

<a id="english"></a>

# English

## What it is

| App | Live | Source | What it does |
|---|---|---|---|
| **Sudoku Generator** | [tdat00.github.io/sudoku/generator](https://tdat00.github.io/sudoku/generator/) | [generator/](generator/README.md) | Generates puzzles of 15 variants at nine difficulty levels, replays how each puzzle was made, prints and exports them |
| **Sudoku Player** | [tdat00.github.io/sudoku/player](https://tdat00.github.io/sudoku/player/) | [player/](player/README.md) | Plays a puzzle: notes, undo / redo, error checking, hints that name the technique, a timer, saved progress |

Both are in English and Vietnamese, with light, dark and high-contrast themes, keyboard and touch support. The
generator's **Play** button opens its puzzles in the player.

![Sudoku Generator: a classic 9×9 puzzle halfway through the replay of its generation](docs/screenshots/screenshot-classic9-light.png)

[Back to top](#top)

## Layout

```
core/        what both apps load: the solver engine, the SVG board, the exchange format, the base styles, the
             word book, and the tests of all of that
generator/   Sudoku Generator
player/      Sudoku Player
docs/        the documents of both apps, by feature
.github/     the workflow that tests and publishes the site
AGENTS.md    how AI agents should work here
```

Each app keeps its own page, `README.md`, `design.md`, `task.md`, `js/`, `css/` and `tests/`. What the two share lives in
`core/` and exists once; the apps load it with relative paths (`../core/…`), and the generator's **Play** button and the
player's link to the generator are relative paths too (`../player/index.html`, `../generator/index.html`). Details:
[docs/architecture.md](docs/architecture.md).

[Back to top](#top)

## Run it

You need only a web browser (Chrome or Edge 100+, Firefox 100+, Safari 15.4+).

- **The quickest way** — open `generator/index.html` or `player/index.html` in the browser. It works from `file://`
  (the generator then runs on the main thread, because browsers do not allow Web Workers there).
- **Recommended** — serve **this folder** (the root of the repository, not `generator/` or `player/`: the pages load
  `core/`) with any static server. Then the generator runs in a Web Worker:

  ```bash
  python -m http.server 8000      # then open http://localhost:8000/generator/ or http://localhost:8000/player/
  # or:  npx serve .
  ```

[Back to top](#top)

## Tests

Node 18+ (CI uses 24), no packages to install:

```bash
cd generator && node tests/node-runner.js     # the quick suites of the generator + the shared ones of core/tests
cd player    && node tests/node-runner.js     # the quick suites of the player + the shared ones of core/tests
```

The heavy suites of the generator (`--all`, `--manual`, `soak`, `perf`, `qualify`) and the browser scripts of the player
(`player/tests/browser/`) are slow; they are run on purpose, not by default. See the READMEs of the apps and
[AGENTS.md](AGENTS.md) for what AI agents may run.

[Back to top](#top)

## Publishing

`.github/workflows/pages.yml` runs the tests and publishes one site on GitHub Pages after every push to `main`
(**Settings → Pages → Build and deployment → Source → GitHub Actions**):

| Address | Content |
|---|---|
| [tdat00.github.io/sudoku/](https://tdat00.github.io/sudoku/) | redirects to the generator (`generator/`) |
| [tdat00.github.io/sudoku/generator/](https://tdat00.github.io/sudoku/generator/) | Sudoku Generator |
| [tdat00.github.io/sudoku/player/](https://tdat00.github.io/sudoku/player/) | Sudoku Player |
| `…/sudoku/core/` | the shared code both apps load (no tests) |

[Back to top](#top)

## Documents

[docs/README.md](docs/README.md) indexes them by feature: [the architecture](docs/architecture.md), the
[difficulty rating](docs/difficulty-rating/report-brief.md) reports, the [puzzle exchange](docs/puzzle-exchange/fixtures.md)
fixtures and the [QA records](docs/qa/browser-run.md). The design and the plan of each app are next to its source:
`generator/design.md`, `generator/task.md`, `player/design.md`, `player/task.md`.

[Back to top](#top)

## Licence

Released under the [MIT licence](LICENSE) © 2026 Dat Le.

[Back to top](#top)

---

<a id="tieng-viet"></a>

# Tiếng Việt

## Giới thiệu

| Ứng dụng | Trực tuyến | Mã nguồn | Làm gì |
|---|---|---|---|
| **Sudoku Generator** | [tdat00.github.io/sudoku/generator](https://tdat00.github.io/sudoku/generator/) | [generator/](generator/README.md) | Tạo đề 15 biến thể ở chín mức độ khó, phát lại từng bước đề được tạo, in và xuất văn bản |
| **Sudoku Player** | [tdat00.github.io/sudoku/player](https://tdat00.github.io/sudoku/player/) | [player/](player/README.md) | Chơi một đề: ghi chú, hoàn tác / làm lại, kiểm tra lỗi, gợi ý nêu tên kỹ thuật, đồng hồ, tiến độ được lưu |

Cả hai có tiếng Anh và tiếng Việt, giao diện sáng, tối và tương phản cao, dùng được bằng bàn phím và cảm ứng. Nút
**Chơi** của trình sinh đề mở các đề của nó trong trình chơi.

![Sudoku cổ điển 9×9 ở giao diện sáng, đang phát lại giữa chừng](docs/screenshots/screenshot-classic9-light.png)

[Lên đầu trang](#top)

## Cấu trúc

```
core/        phần mã cả hai ứng dụng cùng nạp: bộ máy giải, bảng SVG, định dạng trao đổi, css nền, sách từ,
             cùng các kiểm thử của chúng
generator/   Sudoku Generator
player/      Sudoku Player
docs/        tài liệu của cả hai ứng dụng, theo tính năng
.github/     workflow kiểm thử và xuất bản trang
AGENTS.md    hướng dẫn cho các tác tử AI
```

Mỗi ứng dụng giữ trang riêng, `README.md`, `design.md`, `task.md`, `js/`, `css/` và `tests/` của mình. Phần dùng chung nằm
ở `core/` và chỉ có một bản; hai ứng dụng nạp nó bằng đường dẫn tương đối (`../core/…`), và nút **Chơi** của trình sinh
đề cũng như liên kết sang trình sinh đề của trình chơi đều là đường dẫn tương đối (`../player/index.html`,
`../generator/index.html`). Chi tiết: [docs/architecture.md](docs/architecture.md).

[Lên đầu trang](#top)

## Chạy

Bạn chỉ cần một trình duyệt web (Chrome hoặc Edge 100+, Firefox 100+, Safari 15.4+).

- **Cách nhanh nhất** — mở `generator/index.html` hoặc `player/index.html` bằng trình duyệt. Chạy được từ `file://`
  (khi đó trình sinh đề chạy trên luồng chính, vì trình duyệt không cho dùng Web Worker ở đó).
- **Khuyến nghị** — phục vụ **thư mục này** (thư mục gốc của kho mã, không phải `generator/` hay `player/`: các trang
  nạp `core/`) bằng một máy chủ tĩnh bất kỳ. Khi đó trình sinh đề chạy trong Web Worker:

  ```bash
  python -m http.server 8000      # rồi mở http://localhost:8000/generator/ hoặc http://localhost:8000/player/
  # hoặc:  npx serve .
  ```

[Lên đầu trang](#top)

## Kiểm thử

Node 18+ (CI dùng 24), không cần cài gói nào:

```bash
cd generator && node tests/node-runner.js     # các bộ kiểm thử nhanh của trình sinh đề + các bộ dùng chung ở core/tests
cd player    && node tests/node-runner.js     # các bộ kiểm thử nhanh của trình chơi + các bộ dùng chung ở core/tests
```

Các bộ kiểm thử nặng của trình sinh đề (`--all`, `--manual`, `soak`, `perf`, `qualify`) và các script trình duyệt của
trình chơi (`player/tests/browser/`) chạy chậm; chúng được chạy có chủ đích, không chạy mặc định. Xem README của hai ứng
dụng và [AGENTS.md](AGENTS.md) để biết các tác tử AI được chạy gì.

[Lên đầu trang](#top)

## Xuất bản

`.github/workflows/pages.yml` chạy các kiểm thử và xuất bản một trang web trên GitHub Pages sau mỗi lần đẩy lên `main`
(**Settings → Pages → Build and deployment → Source → GitHub Actions**):

| Địa chỉ | Nội dung |
|---|---|
| [tdat00.github.io/sudoku/](https://tdat00.github.io/sudoku/) | chuyển thẳng tới trình tạo đề (`generator/`) |
| [tdat00.github.io/sudoku/generator/](https://tdat00.github.io/sudoku/generator/) | Sudoku Generator |
| [tdat00.github.io/sudoku/player/](https://tdat00.github.io/sudoku/player/) | Sudoku Player |
| `…/sudoku/core/` | phần mã dùng chung mà cả hai ứng dụng nạp (không gồm kiểm thử) |

[Lên đầu trang](#top)

## Tài liệu

[docs/README.md](docs/README.md) lập mục lục theo tính năng: [kiến trúc](docs/architecture.md), các báo cáo về
[chấm điểm độ khó](docs/difficulty-rating/report-brief.md), các tệp mẫu của [trao đổi đề](docs/puzzle-exchange/fixtures.md) và
[hồ sơ kiểm định](docs/qa/browser-run.md). Thiết kế và kế hoạch của từng ứng dụng nằm cạnh mã nguồn của nó:
`generator/design.md`, `generator/task.md`, `player/design.md`, `player/task.md`.

[Lên đầu trang](#top)

## Giấy phép

Phát hành theo [giấy phép MIT](LICENSE) © 2026 Dat Le.

[Lên đầu trang](#top)
