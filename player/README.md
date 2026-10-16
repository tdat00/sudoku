# Sudoku Player

[English](#english) · [Tiếng Việt](#tiếng-việt)

## English

**Sudoku Player** is a small static web app that opens a Sudoku puzzle made by
[Sudoku Generator](https://tdat00.github.io/sudoku-generator/) and lets you **play** it online: notes, exact undo
and redo, error checking, hints that name the logical technique they use, a timer, and progress that is saved
for you. English and Vietnamese, light / dark / high-contrast themes, keyboard and touch, no server, no
account, no build step.

### How to get a puzzle

1. In Sudoku Generator make a puzzle and press **Play online**: its link opens here with the puzzle in the
   address (`#puzzle=<token>`), which is read in your browser and then removed from the address bar.
2. Or press **Open puzzle** and choose a puzzle file (`.json`), drop a file anywhere on the page, or paste:
   the text of a puzzle file, a “Play online” link, a bare puzzle code, or one line of 81 (9×9), 36 (6×6) or
   16 (4×4) characters where `.`, `0`, `-` and `_` mean an empty cell.
3. Or pick one of the **recent puzzles**; a reload brings back the puzzle you were playing.

### Features

- **All 15 variants** are playable: Classic 4×4, 6×6 and 9×9, Mega 12×12, Monster 16×16, Diagonal (X), Hyper
  (Windoku), Jigsaw, Killer, Greater-Than, Samurai, Sohei, Butterfly, Flower and Wordoku. The puzzle document
  carries the rebuilt model, so the player has no variant or generation code at all.
- Select by mouse, touch or keyboard (arrow keys, Home / End, Page Up / Down); type a symbol or use the
  on-screen number pad; notes (`N`); erase; undo / redo (`Ctrl+Z`, `Ctrl+Y`).
- Error checking: off, rule conflicts (repeats, cage sums, signs) or every wrong entry as you type.
- **Hints** in three steps (the technique and where to look, the cells, the move) that are always correct and
  name one of 26 techniques, with a translated name and description.
- Symbol modes: digits, letters, colours (always with a shape), shapes and the Wordoku word; a solved Wordoku
  shows its key word.
- A timer that pauses when you leave the tab, completion detection, reveal-a-cell and reveal-the-solution.
- **Saved progress** per puzzle (the last 20 puzzles) and the last 10 opened puzzles; opening the same puzzle
  again offers *Continue* or *Start over*.
- A puzzle card (variant, difficulty asked for and reached, score, clues, seed, date, progress).
- Settings (language, theme, text size, reduced motion, colour symbol, check mode, notes behaviour,
  coordinates), a Help dialog (how to play, the rules of the 15 variants, the technique ladder, keyboard
  shortcuts, privacy) and a skippable first-visit tour.
- Accessible: skip link, an ARIA grid with spoken cell labels, live announcements, focus kept in dialogs,
  contrast checked from the design tokens, forced-colours and reduced-motion support.

### Run it

There is nothing to install or build. Open `index.html` in a browser (it works from `file://`), or serve the
folder with any static server, for example `python -m http.server` or `npx serve`, and open
`http://localhost:8000/`. Add `?lang=vi` for Vietnamese.

The puzzle link looks like `…/index.html#puzzle=<token>`. The token is the puzzle document, compressed and
URL-safe; the fragment never leaves the browser. A text file or a pasted line works without any token.

### Privacy

Everything runs in your browser; nothing is uploaded, there are no accounts, trackers or cookies. Only these
items are kept in the local storage of the browser (Help → About lists them and can delete them):

| Key | What |
|-----|------|
| `sg.player.prefs.v1` | language, theme, text size and the other settings |
| `sg.player.progress.v1` | your progress on the last 20 puzzles |
| `sg.player.puzzles.v1` | the last 10 puzzles you opened |
| `sg.player.last.v1` | the puzzle that was on the board |
| `sg.player.tour.v1` | whether the quick tour was shown |

If the browser blocks storage, the player says so and keeps your game in memory until you close the tab.

### Tests

```
node tests/node-runner.js          # every suite; no packages (run on Node 24)
node tests/node-runner.js --suite=play,importer
```

`tests.html` runs the same suites in a browser (the ones that read the fixtures need `http://`). The
fixtures in `tests/fixtures/puzzles/` are real documents made by Sudoku Generator
([`docs/fixtures.md`](./docs/fixtures.md)). The browser run in headless Edge over the DevTools protocol is
recorded in [`docs/qa.md`](./docs/qa.md).

### Deploy on GitHub Pages

Choose **Settings → Pages → Build and deployment → Source → GitHub Actions**. The
[deployment workflow](.github/workflows/pages.yml) runs the Node 24 tests and publishes the app after every
push to `main`; you can also run it manually from the **Actions** tab. Only the app files and licence are
published, not the tests or working notes. The live app is at
**[tdat00.github.io/sudoku-player](https://tdat00.github.io/sudoku-player/)**. Sudoku Generator's “Play online”
button needs that address; the page reads the generator's address from `<meta name="sg-generator-url">` in
`index.html` (default `https://tdat00.github.io/sudoku-generator/`).

### More

[`design.md`](./design.md) (architecture, formats, accessibility, testing, risks) ·
[`task.md`](./task.md) (the plan and its status) ·
License: MIT.

## Tiếng Việt

**Trình chơi Sudoku** là một ứng dụng web tĩnh nhỏ, mở đề Sudoku do
[Trình sinh đề Sudoku](https://tdat00.github.io/sudoku-generator/) tạo ra và cho bạn **chơi** trực tuyến: ghi
chú, hoàn tác / làm lại chính xác, kiểm tra lỗi, gợi ý nêu tên kỹ thuật suy luận, đồng hồ và tiến độ được tự
động lưu. Có tiếng Anh và tiếng Việt, giao diện sáng / tối / tương phản cao, dùng được bằng bàn phím và cảm
ứng, không cần máy chủ, tài khoản hay bước biên dịch.

### Lấy đề ở đâu

1. Trong Trình sinh đề Sudoku, tạo một đề rồi bấm **Chơi trực tuyến**: liên kết mở ra trang này với đề nằm
   trong địa chỉ (`#puzzle=<mã>`); mã được đọc ngay trong trình duyệt rồi xóa khỏi thanh địa chỉ.
2. Hoặc bấm **Mở đề** rồi chọn tệp đề (`.json`), thả tệp vào bất kỳ đâu trên trang, hoặc dán: nội dung tệp đề,
   liên kết “Chơi trực tuyến”, mã đề trần, hay một dòng 81 (9×9), 36 (6×6) hoặc 16 (4×4) ký tự, trong đó `.`,
   `0`, `-`, `_` là ô trống.
3. Hoặc chọn một **đề gần đây**; tải lại trang sẽ đưa đề đang chơi trở lại.

### Tính năng

- Chơi được **cả 15 biến thể**: Cổ điển 4×4, 6×6 và 9×9, Khổng lồ 12×12, Quái vật 16×16, Đường chéo (X),
  Siêu vùng (Windoku), Ghép hình, Sát thủ, So sánh, Samurai, Sohei, Cánh bướm, Bông hoa và Chữ (Wordoku). Tài
  liệu đề mang sẵn mô hình đã dựng, nên trình chơi không có mã biến thể hay mã tạo đề nào.
- Chọn ô bằng chuột, cảm ứng hay bàn phím (mũi tên, Home / End, Page Up / Down); gõ ký hiệu hoặc dùng bàn phím
  số trên màn hình; ghi chú (`N`); xóa; hoàn tác / làm lại (`Ctrl+Z`, `Ctrl+Y`).
- Kiểm tra lỗi: tắt, vi phạm luật (trùng số, tổng lồng, dấu so sánh) hoặc mọi ô sai ngay khi gõ.
- **Gợi ý** ba bước (kỹ thuật và nơi cần nhìn, các ô, nước đi), luôn đúng và nêu tên một trong 26 kỹ thuật, kèm
  tên và mô tả đã dịch.
- Kiểu ký hiệu: chữ số, chữ cái, màu (luôn kèm hình), hình và chữ của Wordoku; Wordoku giải xong sẽ hiện từ
  khóa.
- Đồng hồ tạm dừng khi bạn rời tab, nhận biết hoàn thành, hiện một ô và hiện đáp án.
- **Tiến độ được lưu** cho từng đề (20 đề gần nhất) và 10 đề đã mở gần nhất; mở lại đúng đề đó sẽ hỏi *Tiếp
  tục* hay *Chơi lại từ đầu*.
- Thẻ thông tin đề (biến thể, độ khó yêu cầu và đạt được, điểm, số cho sẵn, seed, ngày tạo, tiến độ).
- Cài đặt (ngôn ngữ, giao diện, cỡ chữ, giảm chuyển động, ký hiệu trên màu, cách kiểm tra lỗi, ghi chú, tọa
  độ), hộp Trợ giúp (cách chơi, luật của 15 biến thể, các kỹ thuật, phím tắt, quyền riêng tư) và buổi giới
  thiệu nhanh có thể bỏ qua.
- Dễ tiếp cận: liên kết bỏ qua, lưới ARIA với nhãn ô đọc được, thông báo trực tiếp, tiêu điểm được giữ trong
  hộp thoại, độ tương phản được kiểm tra từ các token thiết kế, hỗ trợ chế độ màu bắt buộc và giảm chuyển động.

### Chạy trang

Không cần cài đặt hay biên dịch. Mở `index.html` trong trình duyệt (chạy được từ `file://`), hoặc phục vụ thư
mục bằng bất kỳ máy chủ tĩnh nào, ví dụ `python -m http.server` hay `npx serve`, rồi mở
`http://localhost:8000/`. Thêm `?lang=vi` để dùng tiếng Việt.

Liên kết đề có dạng `…/index.html#puzzle=<mã>`. Mã là tài liệu đề đã nén và an toàn cho URL; phần sau dấu `#`
không bao giờ rời khỏi trình duyệt. Tệp văn bản hay dòng ký tự đã dán thì không cần mã.

### Quyền riêng tư

Mọi thứ chạy trong trình duyệt của bạn; không có gì được tải lên, không có tài khoản, trình theo dõi hay
cookie. Chỉ những mục sau được giữ trong bộ nhớ cục bộ của trình duyệt (Trợ giúp → Giới thiệu liệt kê và cho
phép xóa chúng):

| Khóa | Nội dung |
|------|----------|
| `sg.player.prefs.v1` | ngôn ngữ, giao diện, cỡ chữ và các cài đặt khác |
| `sg.player.progress.v1` | tiến độ của 20 đề gần nhất |
| `sg.player.puzzles.v1` | 10 đề bạn đã mở gần nhất |
| `sg.player.last.v1` | đề đang trên bàn cờ |
| `sg.player.tour.v1` | đã hiện buổi giới thiệu nhanh hay chưa |

Nếu trình duyệt chặn lưu trữ, trình chơi sẽ báo và giữ ván chơi trong bộ nhớ cho đến khi bạn đóng tab.

### Kiểm thử

```
node tests/node-runner.js          # mọi bộ kiểm thử; không cần gói nào (đã chạy trên Node 24)
node tests/node-runner.js --suite=play,importer
```

`tests.html` chạy cùng các bộ kiểm thử trong trình duyệt (những bộ đọc tệp mẫu cần `http://`). Các tệp mẫu trong
`tests/fixtures/puzzles/` là tài liệu thật do Trình sinh đề Sudoku tạo ra ([`docs/fixtures.md`](./docs/fixtures.md)).
Lần chạy trình duyệt (Edge không giao diện qua giao thức DevTools) được ghi lại trong [`docs/qa.md`](./docs/qa.md).

### Đưa lên GitHub Pages

Chọn **Settings → Pages → Build and deployment → Source → GitHub Actions**.
[Workflow triển khai](.github/workflows/pages.yml) chạy các kiểm thử trên Node 24 và xuất bản ứng dụng sau mỗi
lần đẩy lên `main`; bạn cũng có thể chạy thủ công từ thẻ **Actions**. Chỉ các tệp ứng dụng và giấy phép được
xuất bản, không gồm kiểm thử hay ghi chú làm việc. Ứng dụng trực tuyến tại
**[tdat00.github.io/sudoku-player](https://tdat00.github.io/sudoku-player/)**. Nút “Chơi trực tuyến” của Trình
sinh đề cần địa chỉ này; trang đọc địa chỉ của Trình sinh đề từ `<meta name="sg-generator-url">` trong
`index.html` (mặc định `https://tdat00.github.io/sudoku-generator/`).

### Xem thêm

[`design.md`](./design.md) (kiến trúc, định dạng, khả năng tiếp cận, kiểm thử, rủi ro) ·
[`task.md`](./task.md) (kế hoạch và tiến độ) ·
Giấy phép: MIT.
