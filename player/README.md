# Sudoku Player

<a id="top"></a>

**Live apps · Ứng dụng trực tuyến:**
[Sudoku Player](https://tdat00.github.io/sudoku/player/) ·
[Sudoku Generator](https://tdat00.github.io/sudoku/generator/) ·
[GitHub](https://github.com/tdat00/sudoku) — the player is in `player/`, the generator in `generator/`, what they share in `core/`
(see [the overview](../README.md))

- [Table of Contents](#english)
  - [How to get a puzzle](#how-to-get-a-puzzle)
  - [Features](#features)
  - [Run it](#run-it)
  - [Privacy](#privacy)
  - [Tests](#tests)
  - [Deploy on GitHub Pages](#deploy-on-github-pages)
  - [More](#more)
- [Mục lục](#tiếng-việt)
  - [Lấy đề ở đâu](#lấy-đề-ở-đâu)
  - [Tính năng](#tính-năng)
  - [Chạy trang](#chạy-trang)
  - [Quyền riêng tư](#quyền-riêng-tư)
  - [Kiểm thử](#kiểm-thử)
  - [Đưa lên GitHub Pages](#đưa-lên-github-pages)
  - [Xem thêm](#xem-thêm)

---

<a id="english"></a>

# English

**Sudoku Player** is a small static web app that opens a Sudoku puzzle made by
[Sudoku Generator](https://tdat00.github.io/sudoku/generator/) and lets you **play** it online: notes, exact undo
and redo, error checking, hints that name the logical technique they use, a timer, and progress that is saved
for you. English and Vietnamese, light / dark / high-contrast themes, keyboard and touch, no server, no
account, no build step. **Open it: [tdat00.github.io/sudoku/player](https://tdat00.github.io/sudoku/player/).**
(The Vietnamese part is [below](#tiếng-việt).)

## How to get a puzzle

1. In Sudoku Generator press **Play** (at the top right of the generator's main panel): its link opens here with
   **every puzzle of the generator's list** in the address (`#puzzle=<token>&active=<n>`: their text, compressed
   and URL-safe), which is read in your browser and then removed from the address bar. All the puzzles go into
   the list on the left, and the one that was on screen in the generator opens first.
2. Or press **Import** and paste the text of Sudoku Generator's **Export** box (one or many puzzles, up to 200
   in one text, of any variant — a header line `#1,variant,level,seed`, the grid, and for Jigsaw, Killer, Greater-Than and Wordoku a
   few lines that describe the board); you can also drop a text file (up to 8 MB) anywhere on the page. Every puzzle that can
   be rebuilt goes into the list on the left and the first one opens; one that cannot (for example a text from an
   older generator without those lines) is listed as skipped. A link (`…#puzzle=<token>`) or one line of 81
   (9×9), 36 (6×6) or 16 (4×4) characters where `.`, `0`, `-` and `_` mean an empty cell also work. The
   **Share** button (before Import) gives the link of the puzzle on the board.
3. Or pick one of the **imported puzzles** on the left (a faded icon marks a solved one and one in progress; the
   list keeps its order while you play); a reload brings back the puzzle you were playing.

[Back to top](#top)

## Features

- **All 15 variants** are playable: Classic 4×4, 6×6 and 9×9, Mega 12×12, Monster 16×16, Diagonal (X), Hyper
  (Windoku), Jigsaw, Killer, Greater-Than, Samurai, Sohei, Butterfly, Flower and Wordoku. The puzzle document
  carries the rebuilt model, so the player has no variant or generation code at all.
- Imported difficulty names cover **Very easy, Easy, Normal, Hard, Expert, Master, Nightmare, Hell 1 and
  Hell 2**, in English and Vietnamese. Generator rating-v2 documents still use `sudoku-generator/v1`;
  the player preserves `difficulty.ratingVersion` without recalculating scores. Older documents and text
  exports still open, but the previous ids (`medium`, `veryHard`, `evil`, `nightmare1`, `nightmare2`) are not
  translated: such a puzzle opens with an unknown difficulty (no level in its title). Changing rating metadata
  does not change a puzzle's saved-progress identity.
- Select by mouse, touch or keyboard (arrow keys, Home / End, Page Up / Down); type a symbol or use the
  on-screen number pad; notes (`N`); erase; undo / redo (`Ctrl+Z`, `Ctrl+Y`).
- Error checking: off, rule conflicts (repeats, cage sums, signs) or every wrong entry as you type.
- **Hints** in three steps (the technique and where to look, the cells, the move) that are always correct and
  name one of 26 techniques, with a translated name and description.
- Symbol modes: digits, letters, colours (always with a shape), shapes and the Wordoku word; a solved Wordoku
  shows its key word and, when the built-in word book knows the word, its meaning.
- A timer that pauses when you leave the tab, completion detection and reveal-a-cell.
- **Saved progress** per puzzle (the last 100 puzzles) and the last 100 imported puzzles; opening the same puzzle
  again offers *Continue* or *Start over*.
- A summary above the puzzle (variant, level, seed and the description of the variant), and a status box with
  **Play / Pause / Resume** and **Reset** (it appears only while the game is paused or solved), the time and the filled cells,
  separate for every puzzle: leaving a running game pauses it.
- An **Options** frame (closed at first) with the symbols, the check mode and the notes behaviour. The play frame
  (tools and pad) expands to show the actions on the puzzle (fill in all notes, reveal a cell, which asks for a
  second press), hidden at first, right under the pad. Clicking a cell also pops up the
  keys next to it; on a small screen the tools and the pad are fixed to the bottom and the buttons are icons.
- Settings (language, theme, text size, reduced motion, colour symbol, check mode, notes behaviour,
  coordinates), and a **guide** (`help.html`, opened by the Help button in a new tab): the basics of playing, how
  the hints work, the techniques that solve harder puzzles with a real example for each of the 26, and the
  keyboard shortcuts.
- Accessible: skip link, an ARIA grid with spoken cell labels, live announcements, focus kept in dialogs,
  contrast checked from the design tokens, forced-colours and reduced-motion support.

[Back to top](#top)

## Run it

There is nothing to install or build. Open `player/index.html` in a browser (it works from `file://`), or serve the
repository (its root, not `player/`: the page loads the code it shares with the generator from `../core`) with any
static server, for example `python -m http.server` or `npx serve`, and open `http://localhost:8000/player/`. Add `?lang=vi` for Vietnamese (the guide too: `help.html?lang=vi`; `help.html#tech-xWing`
opens one technique).

The puzzle link looks like `…/index.html#puzzle=<token>` (with `&active=<n>` for a list of puzzles). The token is
compressed and URL-safe: the text of the puzzles of the generator's Play button (`t.…`), or the document of one
puzzle (`z.…`); the fragment never leaves the browser. A text file or a pasted line works without any token.

[Back to top](#top)

## Privacy

Everything runs in your browser; nothing is uploaded, there are no accounts, trackers or cookies. Only these
items are kept in the local storage of the browser (the Remove all button of the list of puzzles deletes the
puzzles and the progress):

| Key | What |
|-----|------|
| `sg.player.prefs.v1` | language, theme, text size and the other settings |
| `sg.player.progress.v1` | your progress on the last 100 puzzles |
| `sg.player.puzzles.v1` | the last 100 puzzles you imported |
| `sg.player.last.v1` | the puzzle that was on the board |

If the browser blocks storage, the player says so and keeps your game in memory until you close the tab.

[Back to top](#top)

## Tests

```
node tests/node-runner.js          # every suite (29, about 15 seconds); no packages (run on Node 24)
node tests/node-runner.js --suite=play,importer
```

These Node tests are quick and are the default set: developers and coding agents run `node tests/node-runner.js`
(or a few suites with `--suite=`) while developing, and the deployment workflow runs all of them. They are the 13
suites of `tests/suites/` and the 16 of `../core/tests/suites/` that the generator runs too (the engine, the technique
ladder, the exchange format, the board view). `tests.html` runs the same suites in a browser (the ones that read the
fixtures need `http://`). The fixtures in `tests/fixtures/puzzles/` are real documents made by Sudoku Generator
([fixtures](../docs/puzzle-exchange/fixtures.md)).

The slow checks are the **browser scripts** in `tests/browser/` (`node tests/browser/run-all.js`: headless Edge
over the DevTools protocol, several minutes). They are **manual**, not part of the workflow, and are run only
when a change touches the UI; the run is recorded in [browser run](../docs/qa/browser-run.md).

[Back to top](#top)

## Deploy on GitHub Pages

Choose **Settings → Pages → Build and deployment → Source → GitHub Actions**. The
[deployment workflow](../.github/workflows/pages.yml) of the repository runs the Node 24 tests of both apps (`node tests/node-runner.js`,
not the browser scripts) and publishes the player, the generator and the code they share after every
push to `main`; you can also run it manually from the **Actions** tab. Only the app files and licence are
published, not the tests or working notes. The live app is at
**[tdat00.github.io/sudoku/player](https://tdat00.github.io/sudoku/player/)**. Sudoku Generator's “Play”
button opens the player next to it (`../player/index.html`); the page finds the generator the same way, from
`<meta name="sg-generator-url">` in `index.html` (`../generator/index.html`, a path relative to the page: a page, not
a folder, because a folder shows a file listing when the pages are opened from a disk).

[Back to top](#top)

## More

[`design.md`](./design.md) (architecture, formats, accessibility, testing, risks) ·
[`task.md`](./task.md) (the plan and its status) ·
[the overview of the repository](../README.md) and [the documents](../docs/README.md) ·
License: MIT ([LICENSE](../LICENSE)).

[Back to top](#top)

---

<a id="tieng-viet"></a>

# Tiếng Việt

**Trình chơi Sudoku** là một ứng dụng web tĩnh nhỏ, mở đề Sudoku do
[Trình sinh đề Sudoku](https://tdat00.github.io/sudoku/generator/) tạo ra và cho bạn **chơi** trực tuyến: ghi
chú, hoàn tác / làm lại chính xác, kiểm tra lỗi, gợi ý nêu tên kỹ thuật suy luận, đồng hồ và tiến độ được tự
động lưu. Có tiếng Anh và tiếng Việt, giao diện sáng / tối / tương phản cao, dùng được bằng bàn phím và cảm
ứng, không cần máy chủ, tài khoản hay bước biên dịch. **Mở ngay: [tdat00.github.io/sudoku/player](https://tdat00.github.io/sudoku/player/).**

## Lấy đề ở đâu

1. Trong Trình sinh đề Sudoku, bấm **Chơi** (ở góc trên bên phải khung chính của trình sinh đề): liên kết mở ra
   trang này với **mọi đề trong danh sách của trình sinh đề** nằm trong địa chỉ (`#puzzle=<mã>&active=<n>`: văn
   bản của các đề, đã nén và an toàn cho URL); mã được đọc ngay trong trình duyệt rồi xóa khỏi thanh địa chỉ.
   Tất cả các đề vào danh sách bên trái, và đề đang hiển thị ở trình sinh đề được mở trước.
2. Hoặc bấm **Nhập đề** rồi dán nội dung ô **Xuất** của Trình sinh đề Sudoku (một hay nhiều đề, tối đa 200 đề trong một
   văn bản, thuộc mọi biến thể — dòng tiêu đề `#1,biến thể,mức,seed`, lưới, và với Ghép hình, Sát thủ, So sánh, Wordoku có thêm vài dòng
   mô tả bàn cờ); cũng có thể thả tệp văn bản (tối đa 8 MB) vào bất kỳ đâu trên trang. Mọi đề dựng lại được sẽ vào danh sách
   bên trái và đề đầu tiên được mở; đề không dựng lại được (ví dụ văn bản từ trình sinh đề cũ thiếu các dòng
   đó) được liệt kê là bị bỏ qua. Liên kết (`…#puzzle=<mã>`) hay một dòng 81 (9×9), 36 (6×6) hoặc 16 (4×4) ký
   tự, trong đó `.`, `0`, `-`, `_` là ô trống, cũng dùng được. Nút **Chia sẻ** (trước nút Nhập đề) cho liên kết
   của đề đang trên bàn cờ.
3. Hoặc chọn một **đề đã nhập** ở bên trái (một biểu tượng mờ đánh dấu đề đã giải và đề đang chơi dở; danh sách
   giữ nguyên thứ tự khi bạn chơi); tải lại trang sẽ đưa đề đang chơi trở lại.

[Lên đầu trang](#top)

## Tính năng

- Chơi được **cả 15 biến thể**: Cổ điển 4×4, 6×6 và 9×9, Khổng lồ 12×12, Quái vật 16×16, Đường chéo (X),
  Siêu vùng (Windoku), Ghép hình, Sát thủ, So sánh, Samurai, Sohei, Cánh bướm, Bông hoa và Chữ (Wordoku). Tài
  liệu đề mang sẵn mô hình đã dựng, nên trình chơi không có mã biến thể hay mã tạo đề nào.
- Nhận tên độ khó **Rất dễ, Dễ, Trung bình, Khó, Chuyên gia, Bậc thầy, Ác mộng, Địa ngục 1 và Địa ngục 2**
  bằng tiếng Anh và tiếng Việt. Tài liệu dùng cách chấm điểm v2 vẫn có định dạng `sudoku-generator/v1`;
  trình chơi giữ `difficulty.ratingVersion` và không tính lại điểm. Tài liệu và văn bản xuất cũ vẫn mở được,
  nhưng các mã cũ (`medium`, `veryHard`, `evil`, `nightmare1`, `nightmare2`) không được dịch sang mã mới: đề đó
  mở với độ khó không xác định (tiêu đề không có mức). Đổi thông tin chấm điểm không làm thay đổi định danh đề
  dùng để lưu tiến độ.
- Chọn ô bằng chuột, cảm ứng hay bàn phím (mũi tên, Home / End, Page Up / Down); gõ ký hiệu hoặc dùng bàn phím
  số trên màn hình; ghi chú (`N`); xóa; hoàn tác / làm lại (`Ctrl+Z`, `Ctrl+Y`).
- Kiểm tra lỗi: tắt, vi phạm luật (trùng số, tổng lồng, dấu so sánh) hoặc mọi ô sai ngay khi gõ.
- **Gợi ý** ba bước (kỹ thuật và nơi cần nhìn, các ô, nước đi), luôn đúng và nêu tên một trong 26 kỹ thuật, kèm
  tên và mô tả đã dịch.
- Kiểu ký hiệu: chữ số, chữ cái, màu (luôn kèm hình), hình và chữ của Wordoku; Wordoku giải xong sẽ hiện từ
  khóa và, nếu sách từ có sẵn trong trình chơi biết từ đó, cả nghĩa của từ.
- Đồng hồ tạm dừng khi bạn rời tab, nhận biết hoàn thành và hiện một ô.
- **Tiến độ được lưu** cho từng đề (100 đề gần nhất) và 100 đề đã nhập gần nhất; mở lại đúng đề đó sẽ hỏi *Tiếp
  tục* hay *Chơi lại từ đầu*.
- Phần tóm tắt phía trên bàn cờ (biến thể, mức độ, seed và mô tả của biến thể), cùng khung trạng thái có
  **Chơi / Tạm dừng / Tiếp tục** và **Đặt lại** (chỉ hiện khi đang tạm dừng hoặc đã giải xong), thời gian và số ô đã điền,
  riêng cho từng đề: rời khỏi một ván đang chạy sẽ tự tạm dừng nó.
- Khung **Tùy chọn** (mặc định thu gọn) với ký hiệu, cách kiểm tra lỗi và cách ghi chú. Khung chơi (công cụ và
  bàn phím số) có thể mở rộng để hiện các thao tác với đề (điền tất cả ghi chú, hiện một ô và phải nhấn hai lần),
  mặc định ẩn, nằm ngay dưới bàn phím số. Bấm vào một ô còn hiện bàn phím nhỏ ngay cạnh nó; trên
  màn hình nhỏ, bộ công cụ và bàn phím số được ghim ở đáy màn hình và các nút chỉ còn biểu tượng.
- Cài đặt (ngôn ngữ, giao diện, cỡ chữ, giảm chuyển động, ký hiệu trên màu, cách kiểm tra lỗi, ghi chú, tọa
  độ), và **trang hướng dẫn** (`help.html`, nút Trợ giúp mở ở tab mới): những điều cơ bản, cách hoạt động của
  gợi ý, các kỹ thuật giải đề khó kèm một ví dụ thật cho từng kỹ thuật trong 26 kỹ thuật, và các phím tắt.
- Dễ tiếp cận: liên kết bỏ qua, lưới ARIA với nhãn ô đọc được, thông báo trực tiếp, tiêu điểm được giữ trong
  hộp thoại, độ tương phản được kiểm tra từ các token thiết kế, hỗ trợ chế độ màu bắt buộc và giảm chuyển động.

[Lên đầu trang](#top)

## Chạy trang

Không cần cài đặt hay biên dịch. Mở `player/index.html` trong trình duyệt (chạy được từ `file://`), hoặc phục vụ
kho mã (thư mục gốc, không phải `player/`: trang nạp phần mã dùng chung với trình sinh đề từ `../core`) bằng bất kỳ máy
chủ tĩnh nào, ví dụ `python -m http.server` hay `npx serve`, rồi mở `http://localhost:8000/player/`. Thêm `?lang=vi` để dùng tiếng Việt (trang hướng dẫn cũng vậy:
`help.html?lang=vi`; `help.html#tech-xWing` mở thẳng một kỹ thuật).

Liên kết đề có dạng `…/index.html#puzzle=<mã>` (kèm `&active=<n>` cho một danh sách đề). Mã đã nén và an toàn cho
URL: văn bản các đề của nút Chơi ở trình sinh đề (`t.…`), hoặc tài liệu của một đề (`z.…`); phần sau dấu `#`
không bao giờ rời khỏi trình duyệt. Tệp văn bản hay dòng ký tự đã dán thì không cần mã.

[Lên đầu trang](#top)

## Quyền riêng tư

Mọi thứ chạy trong trình duyệt của bạn; không có gì được tải lên, không có tài khoản, trình theo dõi hay
cookie. Chỉ những mục sau được giữ trong bộ nhớ cục bộ của trình duyệt (nút Xóa hết của danh sách đề xóa các đề
và tiến độ):

| Khóa | Nội dung |
|------|----------|
| `sg.player.prefs.v1` | ngôn ngữ, giao diện, cỡ chữ và các cài đặt khác |
| `sg.player.progress.v1` | tiến độ của 100 đề gần nhất |
| `sg.player.puzzles.v1` | 100 đề bạn đã nhập gần nhất |
| `sg.player.last.v1` | đề đang trên bàn cờ |

Nếu trình duyệt chặn lưu trữ, trình chơi sẽ báo và giữ ván chơi trong bộ nhớ cho đến khi bạn đóng tab.

[Lên đầu trang](#top)

## Kiểm thử

```
node tests/node-runner.js          # mọi bộ kiểm thử (29 bộ, khoảng 15 giây); không cần gói nào (đã chạy trên Node 24)
node tests/node-runner.js --suite=play,importer
```

Các kiểm thử Node này chạy nhanh và là bộ mặc định: lập trình viên và các tác tử lập trình chạy
`node tests/node-runner.js` (hoặc vài bộ với `--suite=`) trong lúc phát triển, còn workflow triển khai chạy tất cả. Đó là 13
bộ ở `tests/suites/` và 16 bộ ở `../core/tests/suites/` mà trình sinh đề cũng chạy (bộ máy giải, bậc thang kỹ thuật, định
dạng trao đổi, hiển thị bảng). `tests.html` chạy cùng các bộ kiểm thử trong trình duyệt (những bộ đọc tệp mẫu cần
`http://`). Các tệp mẫu trong `tests/fixtures/puzzles/` là tài liệu thật do Trình sinh đề Sudoku tạo ra
([tệp mẫu](../docs/puzzle-exchange/fixtures.md)).

Phần chạy chậm là các **script trình duyệt** trong `tests/browser/` (`node tests/browser/run-all.js`: Edge không giao
diện qua giao thức DevTools, vài phút). Chúng chạy **thủ công**, không nằm trong workflow, và chỉ cần chạy khi thay
đổi đụng tới giao diện; lần chạy được ghi lại trong [lần chạy trình duyệt](../docs/qa/browser-run.md).

[Lên đầu trang](#top)

## Đưa lên GitHub Pages

Chọn **Settings → Pages → Build and deployment → Source → GitHub Actions**.
[Workflow triển khai](../.github/workflows/pages.yml) của kho mã chạy các kiểm thử Node 24 của cả hai ứng dụng (`node tests/node-runner.js`,
không gồm các script trình duyệt) và xuất bản trình chơi, trình sinh đề và phần mã dùng chung sau mỗi
lần đẩy lên `main`; bạn cũng có thể chạy thủ công từ thẻ **Actions**. Chỉ các tệp ứng dụng và giấy phép được
xuất bản, không gồm kiểm thử hay ghi chú làm việc. Ứng dụng trực tuyến tại
**[tdat00.github.io/sudoku/player](https://tdat00.github.io/sudoku/player/)**. Nút “Chơi” của Trình
sinh đề mở trình chơi nằm cạnh nó (`../player/index.html`); trang tìm trình sinh đề theo cách tương tự, từ
`<meta name="sg-generator-url">` trong `index.html` (`../generator/index.html`, đường dẫn tương đối so với trang: chỉ
đích danh trang, không chỉ thư mục, vì khi mở từ ổ đĩa một thư mục sẽ hiện danh sách tệp).

[Lên đầu trang](#top)

## Xem thêm

[`design.md`](./design.md) (kiến trúc, định dạng, khả năng tiếp cận, kiểm thử, rủi ro) ·
[`task.md`](./task.md) (kế hoạch và tiến độ) ·
[tổng quan kho mã](../README.md) và [các tài liệu](../docs/README.md) ·
Giấy phép: MIT ([LICENSE](../LICENSE)).
