# Sudoku Player

<a id="top"></a>

**Live apps · Ứng dụng trực tuyến:**
[Sudoku Player](https://tdat00.github.io/sudoku-player/) ([GitHub](https://github.com/tdat00/sudoku-player)) ·
[Sudoku Generator](https://tdat00.github.io/sudoku-generator/) ([GitHub](https://github.com/tdat00/sudoku-generator))

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
[Sudoku Generator](https://tdat00.github.io/sudoku-generator/) and lets you **play** it online: notes, exact undo
and redo, error checking, hints that name the logical technique they use, a timer, and progress that is saved
for you. English and Vietnamese, light / dark / high-contrast themes, keyboard and touch, no server, no
account, no build step. **Open it: [tdat00.github.io/sudoku-player](https://tdat00.github.io/sudoku-player/).**
(The Vietnamese part is [below](#tiếng-việt).)

## How to get a puzzle

1. In Sudoku Generator press **Play** (at the top right of the generator's main panel): its link opens here with
   **every puzzle of the generator's list** in the address (`#puzzle=<token>&active=<n>`: their text, compressed
   and URL-safe), which is read in your browser and then removed from the address bar. All the puzzles go into
   the list on the left, and the one that was on screen in the generator opens first.
2. Or press **Import** and paste the text of Sudoku Generator's **Export** box (one or many puzzles of any
   variant — a header line `#1,variant,level,seed`, the grid, and for Jigsaw, Killer, Greater-Than and Wordoku a
   few lines that describe the board); you can also drop a text file anywhere on the page. Every puzzle that can
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
- Imported difficulty names cover **Very easy, Easy, Medium, Hard, Very hard, Expert, Evil, Nightmare 1 and
  Nightmare 2**, in English and Vietnamese. Generator rating-v2 documents still use `sudoku-generator/v1`;
  the player preserves `difficulty.ratingVersion` without recalculating scores. Legacy documents and text
  exports still open, and changing rating metadata does not change a puzzle's saved-progress identity.
- Select by mouse, touch or keyboard (arrow keys, Home / End, Page Up / Down); type a symbol or use the
  on-screen number pad; notes (`N`); erase; undo / redo (`Ctrl+Z`, `Ctrl+Y`).
- Error checking: off, rule conflicts (repeats, cage sums, signs) or every wrong entry as you type.
- **Hints** in three steps (the technique and where to look, the cells, the move) that are always correct and
  name one of 26 techniques, with a translated name and description.
- Symbol modes: digits, letters, colours (always with a shape), shapes and the Wordoku word; a solved Wordoku
  shows its key word.
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

There is nothing to install or build. Open `index.html` in a browser (it works from `file://`), or serve the
folder with any static server, for example `python -m http.server` or `npx serve`, and open
`http://localhost:8000/`. Add `?lang=vi` for Vietnamese.

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
node tests/node-runner.js          # every suite; no packages (run on Node 24)
node tests/node-runner.js --suite=play,importer
```

`tests.html` runs the same suites in a browser (the ones that read the fixtures need `http://`). The
fixtures in `tests/fixtures/puzzles/` are real documents made by Sudoku Generator
([`docs/fixtures.md`](./docs/fixtures.md)). The browser run in headless Edge over the DevTools protocol is
recorded in [`docs/qa.md`](./docs/qa.md).

[Back to top](#top)

## Deploy on GitHub Pages

Choose **Settings → Pages → Build and deployment → Source → GitHub Actions**. The
[deployment workflow](.github/workflows/pages.yml) runs the Node 24 tests and publishes the app after every
push to `main`; you can also run it manually from the **Actions** tab. Only the app files and licence are
published, not the tests or working notes. The live app is at
**[tdat00.github.io/sudoku-player](https://tdat00.github.io/sudoku-player/)**. Sudoku Generator's “Play”
button needs that address; the page reads the generator's address from `<meta name="sg-generator-url">` in
`index.html` (default `https://tdat00.github.io/sudoku-generator/`).

[Back to top](#top)

## More

[`design.md`](./design.md) (architecture, formats, accessibility, testing, risks) ·
[`task.md`](./task.md) (the plan and its status) ·
License: MIT.

[Back to top](#top)

---

<a id="tieng-viet"></a>

# Tiếng Việt

**Trình chơi Sudoku** là một ứng dụng web tĩnh nhỏ, mở đề Sudoku do
[Trình sinh đề Sudoku](https://tdat00.github.io/sudoku-generator/) tạo ra và cho bạn **chơi** trực tuyến: ghi
chú, hoàn tác / làm lại chính xác, kiểm tra lỗi, gợi ý nêu tên kỹ thuật suy luận, đồng hồ và tiến độ được tự
động lưu. Có tiếng Anh và tiếng Việt, giao diện sáng / tối / tương phản cao, dùng được bằng bàn phím và cảm
ứng, không cần máy chủ, tài khoản hay bước biên dịch. **Mở ngay: [tdat00.github.io/sudoku-player](https://tdat00.github.io/sudoku-player/).**

## Lấy đề ở đâu

1. Trong Trình sinh đề Sudoku, bấm **Chơi** (ở góc trên bên phải khung chính của trình sinh đề): liên kết mở ra
   trang này với **mọi đề trong danh sách của trình sinh đề** nằm trong địa chỉ (`#puzzle=<mã>&active=<n>`: văn
   bản của các đề, đã nén và an toàn cho URL); mã được đọc ngay trong trình duyệt rồi xóa khỏi thanh địa chỉ.
   Tất cả các đề vào danh sách bên trái, và đề đang hiển thị ở trình sinh đề được mở trước.
2. Hoặc bấm **Nhập đề** rồi dán nội dung ô **Xuất** của Trình sinh đề Sudoku (một hay nhiều đề thuộc mọi biến
   thể — dòng tiêu đề `#1,biến thể,mức,seed`, lưới, và với Ghép hình, Sát thủ, So sánh, Wordoku có thêm vài dòng
   mô tả bàn cờ); cũng có thể thả tệp văn bản vào bất kỳ đâu trên trang. Mọi đề dựng lại được sẽ vào danh sách
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
- Nhận tên độ khó **Rất dễ, Dễ, Trung bình, Khó, Rất khó, Chuyên gia, Địa ngục, Ác mộng 1 và Ác mộng 2**
  bằng tiếng Anh và tiếng Việt. Tài liệu dùng cách chấm điểm v2 vẫn có định dạng `sudoku-generator/v1`;
  trình chơi giữ `difficulty.ratingVersion` và không tính lại điểm. Tài liệu và văn bản xuất cũ vẫn mở được;
  đổi thông tin chấm điểm không làm thay đổi định danh đề dùng để lưu tiến độ.
- Chọn ô bằng chuột, cảm ứng hay bàn phím (mũi tên, Home / End, Page Up / Down); gõ ký hiệu hoặc dùng bàn phím
  số trên màn hình; ghi chú (`N`); xóa; hoàn tác / làm lại (`Ctrl+Z`, `Ctrl+Y`).
- Kiểm tra lỗi: tắt, vi phạm luật (trùng số, tổng lồng, dấu so sánh) hoặc mọi ô sai ngay khi gõ.
- **Gợi ý** ba bước (kỹ thuật và nơi cần nhìn, các ô, nước đi), luôn đúng và nêu tên một trong 26 kỹ thuật, kèm
  tên và mô tả đã dịch.
- Kiểu ký hiệu: chữ số, chữ cái, màu (luôn kèm hình), hình và chữ của Wordoku; Wordoku giải xong sẽ hiện từ
  khóa.
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

Không cần cài đặt hay biên dịch. Mở `index.html` trong trình duyệt (chạy được từ `file://`), hoặc phục vụ thư
mục bằng bất kỳ máy chủ tĩnh nào, ví dụ `python -m http.server` hay `npx serve`, rồi mở
`http://localhost:8000/`. Thêm `?lang=vi` để dùng tiếng Việt.

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
node tests/node-runner.js          # mọi bộ kiểm thử; không cần gói nào (đã chạy trên Node 24)
node tests/node-runner.js --suite=play,importer
```

`tests.html` chạy cùng các bộ kiểm thử trong trình duyệt (những bộ đọc tệp mẫu cần `http://`). Các tệp mẫu trong
`tests/fixtures/puzzles/` là tài liệu thật do Trình sinh đề Sudoku tạo ra ([`docs/fixtures.md`](./docs/fixtures.md)).
Lần chạy trình duyệt (Edge không giao diện qua giao thức DevTools) được ghi lại trong [`docs/qa.md`](./docs/qa.md).

[Lên đầu trang](#top)

## Đưa lên GitHub Pages

Chọn **Settings → Pages → Build and deployment → Source → GitHub Actions**.
[Workflow triển khai](.github/workflows/pages.yml) chạy các kiểm thử trên Node 24 và xuất bản ứng dụng sau mỗi
lần đẩy lên `main`; bạn cũng có thể chạy thủ công từ thẻ **Actions**. Chỉ các tệp ứng dụng và giấy phép được
xuất bản, không gồm kiểm thử hay ghi chú làm việc. Ứng dụng trực tuyến tại
**[tdat00.github.io/sudoku-player](https://tdat00.github.io/sudoku-player/)**. Nút “Chơi” của Trình
sinh đề cần địa chỉ này; trang đọc địa chỉ của Trình sinh đề từ `<meta name="sg-generator-url">` trong
`index.html` (mặc định `https://tdat00.github.io/sudoku-generator/`).

[Lên đầu trang](#top)

## Xem thêm

[`design.md`](./design.md) (kiến trúc, định dạng, khả năng tiếp cận, kiểm thử, rủi ro) ·
[`task.md`](./task.md) (kế hoạch và tiến độ) ·
Giấy phép: MIT.
