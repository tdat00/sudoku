# Hướng dẫn cho lập trình viên Sudoku

<a id="top"></a>

[English](DEVELOPERGUIDE.md) · **Tiếng Việt** · [Hướng dẫn sử dụng](USERGUIDE.vn.md) · [README](README.md)

**Ứng dụng trực tuyến:**
[Sudoku Generator](https://tdat00.github.io/sudoku/generator/) ·
[Sudoku Player](https://tdat00.github.io/sudoku/player/) ·
[GitHub](https://github.com/tdat00/sudoku)

Hai ứng dụng được xây dựng, chạy, kiểm thử và xuất bản như thế nào, và cách thay đổi chúng. Chúng làm gì và cách
dùng nằm trong [hướng dẫn sử dụng](USERGUIDE.vn.md).

- [Tổng quan](#tổng-quan)
  - [Cấu trúc](#cấu-trúc)
  - [Chạy trên máy của bạn](#chạy-trên-máy-của-bạn)
  - [Kiểm thử](#kiểm-thử)
  - [Xuất bản](#xuất-bản)
  - [Tài liệu](#tài-liệu)
  - [Cách đóng góp](#cách-đóng-góp)
- [Sudoku Generator](#sudoku-generator)
  - [Chạy trình sinh đề trên máy](#chạy-trình-sinh-đề-trên-máy)
  - [Cách hoạt động](#cách-hoạt-động)
  - [Định dạng trao đổi](#định-dạng-trao-đổi)
  - [Thêm một biến thể](#thêm-một-biến-thể)
  - [Thêm một kỹ thuật](#thêm-một-kỹ-thuật)
  - [Chạy kiểm thử](#chạy-kiểm-thử)
  - [Quy ước](#quy-ước)
  - [Hạn chế kỹ thuật đã biết](#hạn-chế-kỹ-thuật-đã-biết)
  - [Giấy phép và ghi công](#giấy-phép-và-ghi-công)
- [Sudoku Player](#sudoku-player)
  - [Cách trình chơi đọc một đề](#cách-trình-chơi-đọc-một-đề)
  - [Chạy trình chơi trên máy](#chạy-trình-chơi-trên-máy)
  - [Kiểm thử trình chơi](#kiểm-thử-trình-chơi)
  - [Đưa lên GitHub Pages](#đưa-lên-github-pages)
  - [Xem thêm về trình chơi](#xem-thêm-về-trình-chơi)

---

# Tổng quan

## Cấu trúc

```
core/        phần mã cả hai ứng dụng cùng nạp: bộ máy giải, bàn cờ SVG, định dạng trao đổi, css nền, sách từ,
             cùng các kiểm thử của chúng
generator/   Sudoku Generator
player/      Sudoku Player
docs/        tài liệu của cả hai ứng dụng, theo tính năng
.github/     workflow kiểm thử và xuất bản trang
AGENTS.md    hướng dẫn cho các tác tử AI
```

Mỗi ứng dụng giữ trang riêng, `design.md`, `task.md`, `js/`, `css/` và `tests/` của mình. Phần dùng chung nằm
ở `core/` và chỉ có một bản; hai ứng dụng nạp nó bằng đường dẫn tương đối (`../core/…`), và nút **Chơi** của trình sinh
đề cũng như liên kết sang trình sinh đề của trình chơi đều là đường dẫn tương đối (`../player/index.html`,
`../generator/index.html`). Chi tiết: [docs/architecture.md](docs/architecture.md).

[Lên đầu trang](#top)

## Chạy trên máy của bạn

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
trình chơi (`player/tests/browser/`) chạy chậm; chúng được chạy có chủ đích, không chạy mặc định. Xem phần kiểm thử của [trình sinh đề](#chạy-kiểm-thử) và
[trình chơi](#kiểm-thử-trình-chơi), cùng [AGENTS.md](AGENTS.md) để biết các tác tử AI được chạy gì.

[Lên đầu trang](#top)

## Xuất bản

`.github/workflows/pages.yml` chạy các kiểm thử và xuất bản một trang web trên GitHub Pages sau mỗi lần đẩy lên `main`
(**Settings → Pages → Build and deployment → Source → GitHub Actions**):

| Địa chỉ | Nội dung |
|---|---|
| [tdat00.github.io/sudoku/](https://tdat00.github.io/sudoku/) | chuyển thẳng tới trình sinh đề (`generator/`) |
| [tdat00.github.io/sudoku/generator/](https://tdat00.github.io/sudoku/generator/) | Sudoku Generator |
| [tdat00.github.io/sudoku/player/](https://tdat00.github.io/sudoku/player/) | Sudoku Player |
| `…/sudoku/core/` | phần mã dùng chung mà cả hai ứng dụng nạp (không gồm kiểm thử) |

[Lên đầu trang](#top)

## Tài liệu

[docs/README.md](docs/README.md) lập mục lục theo tính năng: [kiến trúc](docs/architecture.md), các báo cáo về
[chấm điểm độ khó](docs/difficulty-rating/report-brief.md), các tệp mẫu của [trao đổi đề](docs/puzzle-exchange/fixtures.md) và
[hồ sơ kiểm định](docs/qa/browser-run.md). Thiết kế và kế hoạch của từng ứng dụng nằm cạnh mã nguồn của nó:
`generator/design.md`, `generator/task.md`, `player/design.md`, `player/task.md`. Ở thư mục gốc, hướng dẫn sử dụng
([tiếng Anh](USERGUIDE.md), [tiếng Việt](USERGUIDE.vn.md)) dành cho người dùng ứng dụng, còn hướng dẫn cho lập trình
viên này ([tiếng Anh](DEVELOPERGUIDE.md), [tiếng Việt](DEVELOPERGUIDE.vn.md)) dành cho người làm việc trên mã nguồn.

[Lên đầu trang](#top)

## Cách đóng góp

1. Đọc [AGENTS.md](AGENTS.md): mã đặt ở đâu, các quy ước (đầy đủ ở mục [Quy ước](#quy-ước) và trong
   `generator/design.md` §12.2) và nên chạy những kiểm thử nào.
2. Chạy các bộ kiểm thử nhanh của ứng dụng bạn đã sửa (`node tests/node-runner.js` trong `generator/` hoặc
   `player/`, xem [Kiểm thử](#kiểm-thử)); thay đổi trong `core/` thì chạy ở cả hai.
3. Khi hành vi, một đường dẫn, một lệnh hay một con số thay đổi, hãy cập nhật ngay trong cùng thay đổi đó hướng
   dẫn sử dụng ([USERGUIDE.md](USERGUIDE.md), [USERGUIDE.vn.md](USERGUIDE.vn.md)) và hướng dẫn cho lập trình viên
   này ([DEVELOPERGUIDE.md](DEVELOPERGUIDE.md), [DEVELOPERGUIDE.vn.md](DEVELOPERGUIDE.vn.md)), cả hai ngôn ngữ của
   mỗi hướng dẫn, cùng `design.md` của ứng dụng. Các suite `help.test.js` của hai ứng dụng đối chiếu các hướng dẫn
   với mã nguồn.
4. Mỗi commit là một thay đổi có ý nghĩa (không phải mỗi tệp một commit), và không bao giờ commit thông tin bí mật.

[Lên đầu trang](#top)

---

# Sudoku Generator

Sudoku Generator là một ứng dụng web tĩnh viết bằng HTML, CSS và JavaScript thuần: không framework, không bước biên
dịch, không máy chủ, không thư viện ngoài. Ứng dụng làm gì và cách dùng nằm trong
[hướng dẫn sử dụng](USERGUIDE.vn.md#sudoku-generator); phần này nói về mã nguồn của nó.

> Đường dẫn trong phần này tính từ thư mục `generator/`, và các lệnh của nó chạy từ thư mục đó.

## Chạy trình sinh đề trên máy

**Cách nhanh nhất** — mở `generator/index.html` bằng trình duyệt (bấm đúp, hoặc kéo thả vào cửa sổ). Cách này chạy được
từ `file://`, nhưng trình duyệt không cho dùng Web Worker ở đó nên trình sinh đề chạy trên luồng chính theo từng lát
nhỏ: trang vẫn phản hồi giữa các lát nhưng với bàn cờ lớn có thể khựng một
lúc (có những đoạn việc không chia nhỏ được, lâu nhất vài trăm mili giây), nút **Hủy** có tác dụng ở lát kế
tiếp, và việc tạo sẵn đề kế tiếp ở nền bị tắt.

**Khuyến nghị** — phục vụ kho mã bằng một máy chủ tĩnh bất kỳ (thư mục gốc, không phải `generator/`: trang nạp phần
mã dùng chung với trình chơi từ `../core`). Khi đó trình sinh đề chạy trong Web Worker, trang luôn mượt, nút **Hủy** có tác dụng ngay và đề kế tiếp được âm thầm tạo sẵn trong lúc
bạn xem đề này:

```bash
cd sudoku                       # thư mục gốc của kho mã
python -m http.server 8000      # rồi mở http://localhost:8000/generator/
# hoặc:  npx serve .
```

**GitHub Pages** — các ứng dụng chỉ dùng đường dẫn tương đối nên chạy được ở mọi đường dẫn con mà không cần cấu
hình. Chọn *Settings → Pages → Build and deployment → Source → GitHub Actions*.
[Workflow triển khai](.github/workflows/pages.yml) của kho mã chạy các kiểm thử trên Node 24 và xuất bản trình
sinh đề, trình chơi và phần mã dùng chung sau mỗi lần đẩy lên `main`; bạn cũng có thể chạy thủ công từ thẻ
**Actions**. Chỉ các tệp ứng dụng và giấy phép được xuất bản, không gồm kiểm thử hay ghi chú làm việc. Ứng dụng
trực tuyến tại **[tdat00.github.io/sudoku/generator](https://tdat00.github.io/sudoku/generator/)**.

## Cách hoạt động

### Các tầng

Sơ đồ các tầng ở [bản tiếng Anh](DEVELOPERGUIDE.md#layers). Tóm tắt: **giao diện** (`js/ui/` và `../core/js/ui/`) → **điều phối**
(`js/worker/`: Web Worker hoặc phương án dự phòng trên luồng chính) → **sinh đề** (`js/engine/`: pipeline, full-grid,
digger, difficulty, events) → **bộ giải** (`../core/js/engine/`: `dfs-solver`, `logical-solver`, `techniques` và các
`tech-*.js`, dùng chung với trình chơi) → **mô hình** (`model`, `constraints`, `bits`, `classic-model` ở `../core`;
`rng` và 15 biến thể trong `js/variants/`). Tầng dưới không bao giờ biết tầng trên. Các bộ máy (`../core/js/engine/`,
`js/engine/`) và `js/variants/` không chạm vào DOM, nhờ đó toàn bộ bộ máy chạy được trong Node để kiểm thử.
`../core` là phần mã dùng chung với trình chơi (xem [tổng quan](#tổng-quan)); nó không biết gì về trình sinh đề.

**Một mô hình cho mọi biến thể.** Một đề là một tập ô, một danh sách *nhóm* (các ô phải chứa giá trị khác
nhau: hàng, cột, khối, vùng ghép hình, đường chéo, vùng siêu, lồng) và các phần bổ sung tùy chọn (tổng của lồng, dấu
so sánh). Samurai và các biến thể cùng loại chỉ là một mô hình lớn hơn mà các lưới dùng chung chỉ số ô. Vì vậy
một bộ giải và một bộ máy sinh đề phục vụ cả 15 biến thể, và trong các bộ máy không có chỗ nào viết
`if (variant === …)`: mọi khác biệt đi qua bộ đăng ký (`SG.variants`).

### Pipeline sinh đề và luồng sự kiện

`SG.pipeline.run(config, emit, budget)` chạy đồng bộ và luôn đi qua bảy bước:
`configure → buildModel → fullGrid → extraStructure → dig → rate → tune`. Nó trả về một `PuzzleResult`
(`model, givens, solution, rating, seed, config, timings, attempts, warnings, digLog`) và báo mọi việc qua
`emit` dưới dạng `GenerationEvent`: `{ type, stepId, phase, t, seq, i18nKey?, i18nArgs?, patch?, metrics? }`.
Một `patch` là *phần thay đổi* của tối đa tám ô, không bao giờ là ảnh chụp cả bàn cờ. `SG.events.VOCABULARY` là
hợp đồng cho mọi khóa sự kiện.

Ba bước `dig`, `rate` và `tune` lặp lại theo từng *lần đào thử* (dig sample): khi đề vừa đào chưa đúng mức yêu
cầu (`tune.miss`), lần đào kế tiếp được thực hiện trên cùng lưới (tối đa 12 lần mỗi lưới); khi không lần nào
đạt, một bước tìm kiếm cục bộ bắt đầu từ đề gần mức nhất (thêm, bỏ hoặc đổi chỗ các nhóm số cho sẵn đối xứng),
và chỉ khi đó `retry.difficulty` mới bắt đầu một lưới mới (tối đa `attempts` lần, mặc định 8). Các mức cao nhất
(ác mộng và địa ngục) còn đào nhanh những đề đề xuất chỉ dựa trên tính duy nhất, rồi trả lại số cho sẵn khi đề
đề xuất còn quá khó. Mỗi lưới có giới hạn công việc cố định (số lần chấm điểm đầy đủ và số bước đề xuất, được
đếm chứ không đo giờ), nên một seed cho cùng một đề trên mọi máy. Nếu dùng hết mọi lần thử, đề gần nhất được trả
về kèm thông báo thay vì báo lỗi (chỉ đề có lời giải logic trọn vẹn mới được trả về). `SG.pipeline.runSteps` là
cùng thuật toán đó dưới dạng generator, nhường quyền ở những ranh giới tự nhiên (là cái worker và chế độ luồng
chính chạy), còn `SG.pipeline.toWire` / `fromWire` chuyển kết quả qua `postMessage`. Độ khó của một đề là
`SG.difficulty.rate(...)`, tính từ trọng số kỹ thuật `SG.difficulty.WEIGHTS`; hãy dùng `rating.score`, không
dùng điểm thô của bộ giải.

Giao diện không bao giờ làm thuật toán chậm đi để tạo hoạt ảnh, và phần phát lại cũng không đọc các sự kiện.
Song song với các sự kiện, bộ đào ghi một **nhật ký đào** (dig log) gọn nhẹ cho lần đào thử đã trở thành đề
(`result.digLog`: các mục `pass`, `accept`, `reject`, `keep` và `restart`, cộng thêm `signs`, `clear`,
`reveal` và kết quả thử từng dấu ở biến thể So sánh; phần đầu của `js/engine/digger.js` mô tả chúng). Nhật ký
này như nhau bất kể mức ghi trace, luồng chạy hay kích thước bàn cờ, và được `toWire` / `fromWire` mang theo.
Tạo xong, bàn cờ hiện ngay đề hoàn chỉnh; không có gì tự chạy. `SG.player.buildSteps(result)` (hàm thuần) biến
nhật ký thành các bước phát lại, mỗi bước là một thay đổi hiện trên bàn cờ: lời giải đầy đủ; các lồng (Sát thủ)
hoặc các dấu (So sánh); từng đợt xóa ô ngẫu nhiên, mỗi bước thử khoảng một phần chín số ô của bàn cờ, ô bị xóa
được đóng khung, ô phải trả lại được đóng khung nét đứt màu đỏ; các vòng đào có định hướng, mỗi vòng chọn cách
xóa làm đề khó nhất; ở biến thể So sánh còn có các đợt bỏ dấu và các số cho sẵn được hiện thêm khi đề khó quá
mức; cuối cùng là đề hoàn chỉnh. Phần việc kỹ thuật (cấu hình, mô hình bàn cờ, chấm điểm, hiệu chỉnh, các lần
đào trượt mức) không được hiện. Ví dụ, một đề Sudoku Cổ điển 9×9 mức *dễ* với seed 3 phát lại trong 9 bước: lời giải
đầy đủ, năm đợt xóa ngẫu nhiên (9, 10, 10, 10 rồi 4 ô), hai vòng đào có định hướng (mỗi vòng xóa 2 ô) và đề
hoàn chỉnh với 34 số cho sẵn. `SG.player.create()` là bộ phát lại điều khiển bằng tay (về đầu, lùi, tiến, đến cuối, nhảy đến một
vị trí; vị trí 0 là lưới trống), `SG.stepView.create()` là phần mô tả bước đang xem (kèm chú giải các khung trên
bàn cờ và bảng điểm của các kỹ thuật mà đề cần ở bước đó). Lời giải thích của
bảy bước nằm trong hộp thoại Trợ giúp (thẻ "Cách hoạt động"): mỗi bước một mục thu gọn / mở rộng được, với
làm gì / vì sao / làm thế nào và mã giả, `SG.explainCard.create(el, { compact: true })`; mục của bước phát lại
đang xem được đánh dấu, mở sẵn, kèm dòng đang chạy và bộ đếm của giai đoạn đào (`SG.app.getExplainContext()`).
Biểu tượng **Giải thích** của phần mô tả bước mở Trợ giúp ở thẻ đó.
Các lớp phủ (lồng, dấu, vùng siêu) được vẽ từ mô hình của kết quả, không từ nhật ký. Mọi lựa chọn ngẫu nhiên
dùng các luồng được tách ra từ một bộ sinh số có seed (`SG.rng`), vì thế seed tạo lại được đề.

### Worker và phương án dự phòng

`SG.workerClient.generate(config, onEvent)` trả về một promise của `PuzzleResult`; `.cancel()` dừng một lần
chạy, `.mode` cho biết `'worker'` hay `'main'`, `.ready()` xong khi đã biết chế độ, và `SG.workerClient.create()`
tạo một client độc lập (có `dispose()`) cho bộ nhớ đệm. Qua `http(s)`, client khởi động
`js/worker/gen.worker.js`, nạp phần lõi, các biến thể và danh sách từ bằng `importScripts` rồi chạy
`SG.pipeline.runSteps` theo từng lát khoảng 12 ms, nên thông điệp `cancel` được đọc giữa các lát: promise bị từ
chối ngay, việc đang làm dừng ở ranh giới kế tiếp, và worker nào không phản hồi trong 150 ms thì bị tắt (và được
tạo lại khi cần). Ở nơi Worker không khởi động được (`file://`, chính sách hạn chế) client chuyển sang chạy trên luồng chính,
chạy cùng các lát đó ở đó. Với cùng một seed, đề ở hai chế độ là như nhau.

### Bộ nhớ đệm và tạo sẵn đề

`SG.cache` (`js/ui/cache.js`) lưu mọi đề đã tạo vào `localStorage` (`sg.cache.v1`, 20 đề, đề lâu chưa dùng nhất
bị bỏ trước, có kiểm tra phiên bản lược đồ), nên cùng cấu hình và cùng seed được trả về ngay lập tức. Nó chỉ lưu
đề, không bao giờ lưu trace hay nhật ký đào: đề lấy từ bộ nhớ đệm hiện ra ngay (phần phát lại tạm thời chưa
dùng được, kèm dòng ghi chú "đang chuẩn bị phần phát lại") và được **tạo lại từ seed ở nền**; nhật ký đào của
lần tạo lại đó mang phần phát lại đến cho đề (`SG.app.attachTrace(trace, digLog)`), mở ra ở đề hoàn chỉnh — đề
tạo lại phải trùng với đề đã lưu, nếu không mục đó bị bỏ. Khi trang đã rảnh một giây, bộ nhớ đệm còn tạo sẵn
một hai đề với cùng tùy chọn trong một worker, để nút "Tạo đề" (khi ô seed trống) và "Tạo ngẫu nhiên" đưa ra
ngay. Nó không bao giờ chạy khi đang có một lần tạo, tạm dừng khi tab bị ẩn, bỏ qua các cấu hình chậm, và
không tồn tại ở chế độ luồng chính. Một công tắc trong Cài đặt tắt việc tạo sẵn (lựa chọn này không được nhớ).

Rating v2 đã đổi cách tính điểm và cách tạo đề: bộ nhớ đệm bỏ các đề do phiên bản cũ lưu, một lần; điểm đã lưu
trong lịch sử không được tính lại; và tài liệu xuất ra vẫn giữ định dạng `sudoku-generator/v1`, có thêm
`difficulty.ratingVersion: 2`.

### Lịch sử các đề

`SG.history` (`js/ui/history.js`) thêm mọi đề trang tạo ra vào một danh sách lưu trong `localStorage`
(`sg.history.v1`, mới nhất ở trên, tối đa 100 mục; không có storage thì danh sách chỉ nằm trong bộ nhớ). Mỗi mục
nhỏ gọn: biến thể, mức đã chọn và mức đạt được, seed, số ô cho sẵn, điểm và cấu hình để dựng lại đề
(`SG.history.entryOf(result)`; khóa của mục, `SG.history.keyOf`, được suy ra từ các trường đó khi đọc danh
sách chứ không được lưu); đề nhập vào không được liệt kê vì không có seed nào dựng lại được. Danh sách là
panel bên trái của trang (`#history-root`; nằm dưới phần kết quả trên màn hình hẹp). Đề được tạo lại sẽ lên đầu
danh sách; bấm một mục sẽ ghi cấu hình của nó vào biểu mẫu rồi tạo đề (cùng seed cho cùng đề trong cùng một
phiên bản trình sinh đề, và bộ nhớ đệm trả về ngay nếu còn) mà không đổi vị trí của mục; một mục có từ trước rating
v2 có thể tạo lại thành một đề khác, và mức cùng điểm đã lưu của nó không được tính lại. Mỗi mục có thể xóa, và
nút **Xóa hết** làm trống danh sách.

### Thanh địa chỉ và cài đặt

`SG.store` (`js/ui/store.js`) chuyển trạng thái của trang thành các tham số của địa chỉ và ngược lại
(`SG.store.parseUrl`, và `SG.store.toUrlParams`, hàm chỉ ghi những giá trị khác mặc định), đồng thời giữ các tùy
chọn cá nhân (`sg.prefs.v1`) và các tùy chọn gần nhất (`sg.lastConfig.v1`) trong `localStorage`, mọi lần truy cập
đều được bảo vệ (chỉ dùng bộ nhớ khi lưu trữ bị chặn). Trang không có nút chia sẻ liên kết; `SG.store.shareUrl`
dựng một liên kết ghi thêm `v d sym mode`. Danh sách tham số nằm trong hướng dẫn sử dụng
([Tham số URL](USERGUIDE.vn.md#tham-số-url)); các định dạng nằm ở [design.md](generator/design.md) §14.2 và §14.3.

### Quốc tế hóa

`SG.i18n.t(key, args)` dịch các `{placeholder}`; các thuộc tính `data-i18n` và `data-i18n-attr` dịch phần HTML.
Hai gói ngôn ngữ gốc là tệp script thuần (`js/ui/locale.en.js`, `locale.vi.js`), không bao giờ là JSON tải về,
nên `file://` vẫn chạy. Mỗi module khác — kể cả `js/ui/locale.shell.js`, chuỗi chữ của khung trang tĩnh — giữ
chuỗi riêng của mình trong một **mảnh** (fragment) được đẩy vào cuối tệp, và `SG.i18n` gộp chúng vào các gói
(khóa nào gói gốc đã có thì gói gốc thắng, và xung đột được báo lại; ví dụ ở [bản tiếng Anh](DEVELOPERGUIDE.md#internationalisation)).

Quy tắc, do `tests/suites/i18n.test.js` kiểm tra: hai ngôn ngữ có cùng tập khóa, không giá trị nào rỗng, các
`{placeholder}` khớp nhau, khóa không trùng, và tiếng Việt phải là tiếng Việt thật (thuật ngữ đã quen như
*X-Wing*, *Swordfish*, *seed* thì giữ nguyên). Không bao giờ ghép một câu từ nhiều khóa vì trật tự từ mỗi ngôn
ngữ khác nhau.

### Một không gian tên, không module, một thứ tự script

Mỗi tệp là một IIFE gắn vào một biến toàn cục duy nhất, `SG`; trong `js/` không có `import`, `export` hay
`require`, nên cùng một tệp chạy được như `<script>` thường, trong Worker qua `importScripts` và trong Node
qua `vm.runInThisContext` (mẫu mã ở [bản tiếng Anh](DEVELOPERGUIDE.md#one-namespace-no-modules-one-script-order)).

Vì không có import nên **thứ tự nạp chính là đồ thị phụ thuộc**. `SOURCE_FILES` trong `tests/node-runner.js`
là nguồn sự thật duy nhất; cùng thứ tự đó được lặp lại trong `index.html` (các thẻ `<script>`), trong mảng
`SOURCE_FILES` của `tests.html` và — chỉ cho phần lõi, các biến thể và danh sách từ, không bao giờ cho giao
diện — trong `js/worker/gen.worker.js`. `tests/suites/ui-contract.test.js` báo lỗi khi chúng lệch nhau.
**Thêm một tệp JavaScript nghĩa là thêm nó vào cả bốn nơi.** Các tệp chưa tồn tại bị bộ chạy và `tests.html`
bỏ qua. Các tệp của `core` được liệt kê bằng đường dẫn từ thư mục này (`../core/js/engine/model.js`); tệp thêm vào
`core` mà trình chơi cũng cần thì phải thêm vào các danh sách của trình chơi nữa.

### Các module giao diện

`js/ui/app.js` sở hữu trang và cung cấp `SG.app`: `getStore()`, `getBoard()`, `getPlayer()`, `getStepView()`,
`getResult()` (kết quả gần nhất `{ result, trace }`), `generate()`, `regenerate()`, `cancel()`, `showResult()`
(hiện một đề không do trang này tạo), `toast()`, `announce()`, `openModal()`, `setClient()` và
`attachTrace()` (bộ nhớ đệm dùng hai hàm này), cùng một kênh sự kiện `on()` / `emit()` với các sự kiện
`generate:start`, `generate:progress`, `generate:end`, `generate:error`, `generate:cancel`, `result`, `trace`
(`{ result, trace }`, khi `attachTrace()` vừa mang phần phát lại đến cho một đề lấy từ bộ nhớ đệm), `position`
(`{ position, length, step, direction }` sau mỗi lần di chuyển trong phần phát lại; `step` là một bước của
`SG.player.buildSteps`, bằng null ở vị trí 0), `locale`, `theme`, `settings` và `action`. Phần đầu của
`app.js` là hợp đồng đầy đủ.

**Thêm một module giao diện mà không sửa `app.js`.** Cuối quá trình khởi động, `app.js` gọi `init(SG.app)` — hàm
này phải idempotent — trên từng module tùy chọn dưới đây nếu nó tồn tại, theo đúng thứ tự này, mỗi lần gọi trong
một `try/catch` riêng:

| Module | Làm gì |
|--------|--------|
| `SG.exportUi` | Hộp thoại In đề (in / PDF các đề chọn từ danh sách đã lưu, 1, 2 hoặc 4 đề mỗi trang, có thể kèm lời giải ở các trang riêng), nút **Xuất văn bản** (`action { id: 'exportCode' }`: các đề đã chọn dưới dạng văn bản dễ đọc, `buildExportText(items)`) và nút **Chơi** (`action { id: 'play' }`: mở các đề trong Trình chơi Sudoku, xem [Định dạng trao đổi](#định-dạng-trao-đổi)) |
| `SG.a11y` | Bàn cờ dưới dạng lưới ARIA với điều hướng bằng bàn phím, thông báo trực tiếp (khi bắt đầu tạo đề, khi đổi ngôn ngữ), hộp thoại Cài đặt |
| `SG.theme` | Giao diện sáng, tối, tương phản cao (và "tự động"), gợi ý cho các trạng thái trống / bận / lỗi |
| `SG.help` | Hộp thoại Trợ giúp (luật, bậc thang kỹ thuật, phím tắt) |
| `SG.cache` | Bộ nhớ đệm và việc tạo sẵn đề mô tả ở trên; nó thay client sinh đề bằng một lớp bọc |
| `SG.history` | Danh sách các đề đã tạo (`localStorage`, khóa `sg.history.v1`, mới nhất ở trên, tối đa 100) hiện ở panel bên trái; bấm một mục sẽ ghi cấu hình của nó vào biểu mẫu và tạo lại đề |

Module như vậy lắng nghe bằng `SG.app.on('action', …)` (các nút In đề và Chơi ở khung chính, Cài đặt và Trợ
giúp ở đầu trang phát `action { id: 'export' | 'exportCode' | 'play' | 'settings' | 'help' }`), vẽ hộp thoại bằng
`SG.app.openModal()` và đọc đề bằng `SG.app.getResult()`; tên không có
trong danh sách cần thêm một mục vào danh sách `OPTIONAL_MODULES` của `app.js`. Mọi tệp giao diện phải **nạp được
trong Node không cần DOM** (mã ở mức trên cùng chỉ định nghĩa hàm và đẩy các mảnh ngôn ngữ; DOM chỉ được chạm trong
các hàm gọi lúc chạy), và giữ phần logic trong các hàm thuần, kiểm thử được, nằm cạnh mã DOM. `core/js/ui/exchange.js`
(`SG.exchange`) không thuộc nhóm này: đó là phần phụ trợ không DOM mà `exportUi` dùng và trình chơi cũng nạp.

### Cây thư mục

Xem [cây thư mục ở bản tiếng Anh](DEVELOPERGUIDE.md#directory-tree): `generator/` gồm `index.html`, `tests.html`, `css/`, `js/engine/`
(bộ máy sinh đề, không DOM), `js/variants/`, `js/worker/`, `js/ui/`, `assets/wordlists/` và `tests/` (`tests/suites/`: bộ kiểm
thử nhanh, chạy mặc định cùng `../core/tests/suites`; `tests/manual/`: 8 suite nặng); phần dùng chung với trình chơi nằm
ở `core/` (bộ máy giải, `exchange`, `wordbook`, `symbols`, `board-view`, css nền và từ điển), tài liệu ở `docs/`.

## Định dạng trao đổi

Nút **Chơi** làm gì với người dùng được mô tả ở
[Chơi trong Trình chơi Sudoku](USERGUIDE.vn.md#chơi-trong-trình-chơi-sudoku). Trong mã, nó mở
`../player/index.html#puzzle=<token>&active=<n>` (trình chơi, nằm cạnh trình sinh đề trên cùng một trang web) trong
thẻ mới (`window.open(url, '_blank', 'noopener')`). Địa chỉ của trình chơi lấy từ
`<meta name="sg-player-url" content="../player/index.html">` trong `index.html`, một đường dẫn tương đối so với
trang của trình sinh đề: nó chỉ đích danh trang, không chỉ thư mục, vì khi mở từ ổ đĩa một thư mục sẽ hiện danh sách
tệp. Hãy đổi nó nếu bạn có bản trình chơi ở nơi khác.

Định dạng trao đổi là mối liên kết duy nhất giữa hai ứng dụng, do `core/js/ui/exchange.js` (`SG.exchange`, một
tệp duy nhất mà cả hai cùng nạp, kèm bộ kiểm thử `core/tests/suites/exchange.test.js`) cài đặt:

- Một **gói đề** (nút Chơi) là văn bản của `SG.exportUi.buildExportText`: mỗi đề gồm một dòng tiêu đề
  `#<số>,<biến thể>,<mức độ>,<seed>`, lưới và, với Ghép hình, Sát thủ, So sánh và Sudoku Chữ, vài dòng cấu trúc.
  Trình chơi dựng lại bàn cờ từ đó, đúng như khi bạn dán văn bản vào hộp Nhập của nó.
- **Mã văn bản** của nó là `t.` + base64url(deflate-raw(văn bản UTF-8)) — hoặc `s.` + base64url(văn bản) khi
  không nén được hoặc nén không có lợi. `SG.exchange.encodeText(text)` và `SG.exchange.decodeText(token)` là hàm
  bất đồng bộ; `SG.exchange.playerUrl(base, token, { active })` dựng liên kết (`&active=<n>`, đếm từ 1) và
  `SG.exchange.activeFromHash(hash)` đọc lại số đó.
- **Tài liệu** của một đề (trình chơi vẫn hiểu, và là thứ nút Chia sẻ của nó ghi ra) là JSON của đề theo
  [design.md](generator/design.md) §14.1 (`format: 'sudoku-generator/v1'`), do `SG.exportUi.toJson` ghi ra, cộng thêm một
  khối bổ sung **`model`**: đặc tả mô hình dạng dữ liệu thuần
  (`variantId`, `digits`, `units`, `unitMeta`, `cages`, `inequalities`, `layout`, `symbols`, `fixedCells`) mà
  `SG.model.create(spec)` nhận được. Nhờ nó, trình chơi dựng lại bàn cờ **mà không cần mã của biến thể nào**. Mã của
  nó là `z.` + base64url(deflate-raw(JSON)) — hoặc `j.` + base64url(JSON); `SG.exchange.encode(doc)` và
  `SG.exchange.decode(token)` là hàm bất đồng bộ.
- `SG.exchange.playerUrl(base, token)` từ chối địa chỉ gốc không phải `http(s)` hay đường dẫn
  tương đối. Lỗi mang các mã `exchange.invalidToken`, `exchange.tooLarge`, `exchange.unsupportedEncoding`,
  `exchange.invalidJson` và `exchange.invalidUrl`, đã dịch ở cả hai ngôn ngữ (`error.exchange.*`).
- Trong mã: `SG.exportUi.buildPlayBundle(results, { active })` là liên kết của nhiều đề
  (`{ url, token, base, count, active, length, long }`), `SG.exportUi.toJson(result)` là tài liệu và
  `SG.exportUi.buildPlayLink(result)` là liên kết của một đề, `SG.exportUi.openPlayLink(url)` mở nó. Chi tiết:
  [design.md](generator/design.md) §10.9 và §13.15.

## Thêm một biến thể

Một biến thể là **dữ liệu cộng với một hàm `build`** tự đăng ký; không tệp nào khác cần biết đến nó. Quy tắc
nằm ở [design.md](generator/design.md) §5.3. Ví dụ đầy đủ, chạy được ở [bản tiếng Anh](DEVELOPERGUIDE.md#adding-a-variant) là *Sudoku Nhóm
rời* (Disjoint Groups): luật cổ điển cộng thêm chín nhóm, mỗi nhóm gồm các ô ở cùng vị trí trong khối của
chúng. Không cần thêm mã giải nào, vì một nhóm chỉ là thêm một unit.

1. **Viết `js/variants/disjoint.js`** theo mẫu ở bản tiếng Anh: hàm `build()` dựng `SG.model.create({ … })`
   từ các `units`, rồi gọi `SG.variants.register({ id, i18nKey, group, digits, difficultySupport,
   defaultSymbolMode, symbolModes, options, build })`. Bộ đăng ký (`js/variants/registry.js`) kiểm tra định
   nghĩa nên lỗi gõ sai hiện ra ngay khi tải tệp. `difficultySupport` là các mức biến thể cung cấp, một tập con
   của `veryEasy … hell2` (được phép có khoảng trống): đúng các mức qua được bước kiểm định ở mục 5. Các
   trường tùy chọn: `clueFloor` / `clueFloorScale` (số gợi
   ý tối thiểu riêng cho từng mức, thay cho số của classic9 co giãn theo `cellCount / 81`), `postGenerate` (tạo
   cấu trúc từ lời giải đã xong; mô hình là bất biến nên nó trả về một mô hình mới), `digStrategy` (đăng ký bằng
   `SG.digger.registerStrategy` rồi gọi tên ở đây), `fastSeed`, `restartThreshold`.
2. **Nạp tệp — thêm đường dẫn vào cả bốn danh sách script**, ở đâu đó sau `js/variants/registry.js`:
   `index.html` (thẻ `<script>`), `tests.html` (`SOURCE_FILES`), `tests/node-runner.js` (`SOURCE_FILES`) và
   `js/worker/gen.worker.js` (`SCRIPTS`, đường dẫn tính từ `js/worker/`). `ui-contract.test.js` kiểm tra bốn nơi
   khớp nhau.
3. **Các bài kiểm tra có sẵn.** `tests/manual/variants.test.js` (suite nặng: `node tests/node-runner.js
   --suite=variants`) duyệt `SG.variants.list()`, nên biến thể mới
   được kiểm tra mà không phải sửa bài nào: CV0 định nghĩa, CV1 mọi mô hình qua `SG.model.validate`, CV2 lưới
   đầy đủ, CV3 một đề ở mọi mức đã khai báo (các mức khác bị từ chối), CV4 các bất biến I1–I7 của
   [design.md](generator/design.md) §15.3 (I6 dùng ngưỡng gợi ý riêng của biến thể), CV5 cùng seed cho cùng đề, CV6 không lần
   tạo nào bị treo, CV7 tên, nhãn tùy chọn và tên mức có trong cả hai
   ngôn ngữ. Bộ nhanh cũng đếm các biến thể: hãy thêm mã vào `EXPECTED_IDS` trong
   `tests/suites/smoke.test.js`, suite này sẽ tạo một đề của biến thể mới ở mức dễ nhất. Chỉ viết thêm một suite
   riêng (`tests/suites/disjoint.test.js`, hoặc `tests/manual/disjoint.test.js` nếu nó nặng, và thêm tên của nó vào
   `SUITE_FILES`, hoặc `MANUAL_SUITE_FILES` cho suite nặng, trong `tests.html`; `tests/suites/ui-contract.test.js`
   bắt buộc điều này) cho logic riêng của bạn.
4. **Thêm mục trợ giúp.** Phần Trợ giúp trong ứng dụng phải giải thích mọi biến thể. Trong `js/ui/help.js`,
   thêm mã vào `VARIANT_HELP` (`{ figure: 'board' }` tự vẽ bàn cờ trống) và thêm ba đoạn chữ
   `help.variant.disjoint9.rules`, `.special` và `.figure` vào mảnh ngôn ngữ ở cuối tệp, bằng cả hai ngôn ngữ.
   `tests/suites/help.test.js` báo lỗi cho đến khi bạn làm xong, và cũng báo lỗi nếu hướng dẫn sử dụng không liệt
   kê mã mới: hãy thêm một dòng vào bảng biến thể của [USERGUIDE.md](USERGUIDE.md#generator-features) và
   [USERGUIDE.vn.md](USERGUIDE.vn.md#tính-năng-của-trình-sinh-đề).
5. **Kiểm định các mức.** `node tests/qualify.js --variant=disjoint9` tạo 40 đề cho mỗi mức với các seed cố
   định và chỉ cung cấp một mức khi ít nhất 36 đề đạt đúng mức đó trong ngân sách thời gian (đạt 30–35: thêm 60
   seed, cần ít nhất 90 trên 100); hãy chép các mức nó in ra vào `difficultySupport` và bảng của nó vào
   [docs/difficulty-rating/qualification.md](docs/difficulty-rating/qualification.md). Sau đó `node tests/soak.js --variant=disjoint9` cho
   biết tần suất đạt từng mức yêu cầu, các vi phạm bất biến và thời gian mỗi đề. Mức nào không đạt có thể được
   giúp bằng `clueFloorScale`; nếu không thì nó bị ẩn. Suite thủ công `difficulty` (`node tests/node-runner.js
   --suite=difficulty`) kiểm tra danh sách trong định nghĩa và trong tệp đó khớp nhau.

## Thêm một kỹ thuật

Một kỹ thuật giải là một hàm tìm *một phép suy luận* trong các ứng viên hiện tại. Nó nằm trong một tệp
`tech-*.js` riêng và tự đăng ký, nên bộ giải và bộ đào không bao giờ phải đổi. Hợp đồng đầy đủ nằm ở phần đầu
của `../core/js/engine/techniques.js`; ví dụ hoàn chỉnh *Full House* (một nhóm chỉ còn một ô trống) nằm ở
[bản tiếng Anh](DEVELOPERGUIDE.md#adding-a-technique).

1. **Quy tắc của `find`**: chỉ đọc `state`, không bao giờ ghi vào (bộ giải tự áp dụng kết quả, nhờ đó điểm số
   luôn trung thực); trả về `null` khi không áp dụng được, nếu không thì trả về đúng một phép suy luận thật sự
   làm đổi trạng thái; không dùng ngẫu nhiên; làm việc với mọi hình dạng nhóm qua `model.units` (không giả định
   hàng và khối); gọi `ctx.check()` trong các vòng lặp dài.
2. **Nạp tệp** bằng cách thêm nó cạnh các tệp `tech-*.js` khác trong bốn danh sách script ở
   [Cách hoạt động](#cách-hoạt-động) — và trong các danh sách script của trình chơi (`index.html`, `help.html`,
   `tests.html`, `tests/node-runner.js`), vì kỹ thuật nằm trong bộ máy dùng chung (`core/js/engine/`) và gợi ý
   của trình chơi cũng dùng nó.
3. **Chuỗi chữ**: `technique.<id>` (tên), `technique.<id>.desc` và `technique.<id>.step` bằng cả hai ngôn ngữ;
   `tests/suites/i18n.test.js` kiểm tra mọi kỹ thuật và mọi câu giải thích từng bước đều có đủ. Bậc thang kỹ
   thuật trong hộp thoại Trợ giúp tự liệt kê kỹ thuật mới.
4. **Trọng số và mức**: thêm trọng số của kỹ thuật vào `WEIGHTS` trong `js/engine/difficulty.js`
   (`SG.difficulty.WEIGHTS`; khi chấm điểm gặp một kỹ thuật không có trọng số thì báo lỗi
   `difficulty.unknownTechnique` — trọng số không bao giờ được đoán từ `baseCost`). Điểm của một đề là
   `round(80·E/(E+40) + P + 0.25·P·log₂(1 + W/P))`, với `E` là số ô trống, `P` là trọng số lớn nhất được dùng và
   `W` là tổng trọng số × số lần dùng; chỉ trọng số quyết định kỹ thuật được phép từ mức nào: oracle của một mức
   cho phép mọi kỹ thuật có 1.25 × trọng số nhỏ hơn cận trên khoảng điểm của mức đó, nên trọng số 400 cho kỹ
   thuật có từ mức *khó* (500 nhỏ hơn cận trên 700 của mức khó, nhưng không nhỏ hơn 400 của mức trung bình).
   `group` chỉ là tên họ kỹ thuật (`cage` và `ineq` thuộc về Sát thủ và So sánh). Sau đó chạy lại bước kiểm
   định `node tests/qualify.js` và kiểm tra tỷ lệ đạt mức bằng `node tests/soak.js --quick`.
5. **Kiểm thử**: thêm một mục cho kỹ thuật vào `../core/tests/fixtures/techniques.js` (hai thế cờ mà nó tìm ra
   một phép suy luận, một thế cờ mà nó không tìm ra gì; `../core/tests/suites/techniques.test.js` báo lỗi cho
   đến khi có đủ) và thêm các mẫu đúng, mẫu sai vào `../core/tests/suites/tech-<nhóm>.test.js` tương ứng (công
   cụ trong `../core/tests/fixtures/techniques-helper.js`). Phép kiểm tra tính chắc chắn — một kỹ thuật không bao
   giờ được loại một giá trị thuộc về lời giải thật — không cần bạn viết gì: `techniques.test.js` tự chạy nó cho
   mọi kỹ thuật đã đăng ký.

## Chạy kiểm thử

Mọi thứ chạy trong Node 18+ mà không cần cài đặt gì (không dùng gói npm nào):

```bash
node tests/node-runner.js                          # bộ nhanh (42 suite, khoảng 2.550 bài), khoảng một phút
node tests/node-runner.js --manual                 # chỉ các suite nặng ở tests/manual (8 suite, khoảng tám phút)
node tests/node-runner.js --all                    # nhanh + thủ công (50 suite, khoảng 3.570 bài), khoảng chín phút
node tests/node-runner.js --suite=killer,variants  # chỉ các suite này, nhanh hay thủ công (tên tệp bỏ .test.js)
node tests/node-runner.js --filter=xWing --verbose # chỉ các bài có tên chứa đoạn chữ này
node tests/node-runner.js --bail                   # dừng ở lỗi đầu tiên
```

**Hai nhóm suite, để việc phát triển luôn nhanh.** **Bộ nhanh** là thứ chạy mặc định: 42 suite, khoảng 2.550 bài,
khoảng một phút — 26 suite ở `tests/suites/` và 16 suite ở `../core/tests/suites/` mà trình chơi cũng chạy (bộ máy giải,
bậc thang kỹ thuật, định dạng trao đổi, hiển thị bàn cờ, bản thân harness). Trong đó có `smoke.test.js`: tạo một đề cho mỗi biến thể, kiểm tra
tính duy nhất, mức độ, tính tất định và một mẫu các mã băm hồi quy. `tests/manual/` chứa 8 suite **nặng** —
`variants`, `killer`, `greater-than`, `perf`, `difficulty`, `extra-regions`, `wordoku` và `jigsaw`, tổng cộng khoảng
tám phút — không thuộc lần chạy mặc định: chạy bằng `--manual` (chỉ các suite này) hoặc `--all` (nhanh và thủ công,
khoảng chín phút), hay theo tên bằng `--suite=killer` (dùng được cho mọi suite). Khi đang phát triển, hãy chạy bộ
nhanh, và chạy theo tên một suite nặng khi bạn đụng đến vùng của nó; chạy `--all` trước khi phát hành và mỗi khi
đụng đến việc sinh đề, tính điểm hay một biến thể. Workflow CI chạy `node tests/node-runner.js --all` trước mỗi
lần triển khai.

Bộ chạy nạp `SOURCE_FILES` bằng `vm.runInThisContext`, tự tìm `../core/tests/fixtures/*.js`, `tests/fixtures/*.js`,
`../core/tests/suites/*.test.js` và `tests/suites/*.test.js` (cùng `tests/manual/*.test.js` khi có `--manual` hoặc
`--all`), và thoát với mã khác 0 khi có lỗi. Các suite dùng chung dựng bàn cờ của mọi biến thể qua `SG.testkit`
(`../core/tests/fixtures/testkit.js`); `tests/fixtures/testkit-provider.js` bảo nó lấy các bàn cờ từ bộ đăng ký biến thể. Các suite bao phủ bộ máy, mọi biến thể, các kỹ thuật
giải, pipeline cùng các sự kiện của nó, worker và client của nó, và phần logic thuần của mọi module giao diện
(chạy không cần DOM). `tests/suites/help.test.js` còn đối chiếu các hướng dẫn với mã nguồn: bảng biến thể và tham
số URL của hướng dẫn sử dụng; tên các script, lệnh và cờ, các tên `SG.…` và hai ví dụ chạy được của bản tiếng Anh
của hướng dẫn này; và liên kết của cả bốn hướng dẫn. Ở đầu nhánh hiện tại của kho
mã này, bộ chạy đếm khoảng 3.570 bài trong 50 suite (khoảng 2.550 bài trong 42 suite nhanh), tất cả đều xanh; số liệu của dự án gộp ở lần rà soát cuối (trước
khi tách) nằm trong [docs/qa/final-review-v1.md](docs/qa/final-review-v1.md).

Các suite so thời gian tạo đề của mọi biến thể với ngân sách ở [design.md](generator/design.md) §9.1 kèm một hệ số dung
sai, để một máy đang bận hoặc chậm hơn không làm chúng thất bại: gấp đôi ngân sách theo mặc định, gấp ba khi có
biến môi trường `CI` (như trên GitHub Actions), hoặc theo hệ số trong `SG_TIME_FACTOR` (`SG_TIME_FACTOR=1` kiểm
đúng ngân sách). Bản thân các ngân sách do `node tests/qualify.js` bảo đảm trên máy tham chiếu và do
`node tests/perf.js` đo.

- **Trong trình duyệt:** mở `tests.html` (chạy được từ `file://`). Trang nạp các suite nhanh; `?all=1` nạp thêm
  các suite thủ công, `?manual=1` chỉ chạy các suite thủ công và `?suite=<tên>` dùng được cho cả hai. Các tham số
  truy vấn khác: `filter`, `bail=1` và `autorun=0`, ví dụ `?suite=killer&filter=text&bail=1&autorun=0`.
- **Soak và hiệu chỉnh** — tạo hàng trăm đề trên các biến thể và mức, kiểm tra các bất biến I1–I7 và in ma trận
  so sánh mức yêu cầu với mức đạt được, thời gian mỗi đề so với ngân sách và biểu đồ điểm:
  `node tests/soak.js --quick` (khoảng 700 đề), `node tests/soak.js --full` (mức chạy cuối cùng để kiểm định:
  25 đề cho mỗi tổ hợp được cung cấp và 100 đề cho mỗi mức của classic9, khoảng 3.550 đề),
  `node tests/soak.js --variant=jigsaw9 --count=180`, `node tests/soak.js --level=hard` (`--help` liệt kê phần
  còn lại); `--weights` và `--bands` thử trọng số kỹ thuật hoặc khoảng điểm khác mà không phải sửa mã.
- **Kiểm định các mức** — `node tests/qualify.js` chạy quy trình quyết định mỗi biến thể có những mức nào (40
  seed cố định cho mỗi biến thể và mức qua pipeline thật, thêm 60 seed cho mức ở ranh giới, ngân sách thời gian
  cho phân vị 95) rồi in bảng và danh sách mức; `--variant`, `--level`, `--jobs`, `--json` và `--markdown` thu
  hẹp phạm vi hoặc lưu kết quả; `--probe=N` xem nhanh (N seed mỗi mức, không kết luận). Lần chạy gần nhất nằm trong [docs/difficulty-rating/qualification.md](docs/difficulty-rating/qualification.md).
- **Hiệu năng** so với ngân sách ở [design.md](generator/design.md) §9.1: `node tests/perf.js --quick`,
  `node tests/perf.js --variant=classic9 --runs=20`. *Mã băm hồi quy* trong `tests/fixtures/regression.js` bảo
  đảm một lần tối ưu không làm đổi đề (suite nhanh `smoke` kiểm tra một mẫu của chúng, suite thủ công `perf` kiểm
  tra tất cả): `--check-hashes` so sánh, còn `--update-hashes` ghi mã băm mới sau một thay
  đổi chủ ý làm đổi đề (hiệu chỉnh, quy tắc đào mới). `--alloc` dò các vòng lặp nóng xem có cấp phát bộ nhớ
  không.
- **Các lần chạy thống kê sâu** trong các suite mega, multigrid và variants mặc định tắt; bật bằng biến môi
  trường `SG_DEEP=1` (`SG_DEEP=1 node tests/node-runner.js --suite=mega,multigrid,variants`; trong PowerShell dùng
  `$env:SG_DEEP = 1`).
- **Báo cáo kiểm định cuối cùng:** [docs/qa/final-review-v1.md](docs/qa/final-review-v1.md).

## Quy ước

Danh sách đầy đủ ở [design.md](generator/design.md) §12.2:

- Một IIFE cho mỗi tệp, gắn vào không gian tên `SG`; `'use strict'`; không `import`, `export` hay `require`
  trong `js/`.
- ES2020 không module, thụt lề 2 dấu cách, nháy đơn, dấu chấm phẩy, dòng tối đa 110 ký tự, chú thích bằng tiếng
  Anh và chỉ ở chỗ khó hiểu: phần logic không hiển nhiên và hợp đồng của một module (phần đầu tệp), không viết
  khối JSDoc cho mọi hàm.
- `camelCase` cho biến và hàm, `PascalCase` cho kiểu, `UPPER_SNAKE` cho hằng, `kebab-case.js` cho tên tệp.
- Các bộ máy (`../core/js/engine/`, `js/engine/`) và `js/variants/` không bao giờ chạm vào DOM; DOM, `window` và `localStorage` chỉ dùng trong
  `js/ui/`, `../core/js/ui/` và `js/worker/worker-client.js`. Có bài kiểm tra cho điều này.
- Mọi chuỗi hiển thị đều qua `SG.i18n.t()` và có cả tiếng Anh lẫn tiếng Việt; `<html lang>` theo ngôn ngữ.
- Không có màu viết thẳng ngoài `../core/css/tokens.css` và `../core/css/tokens-board.css`; mọi nơi khác dùng token
  `var(--sg-…)`. Có bài kiểm tra cho điều này.
- Lỗi của phần lõi là `SG.errors.GenerationError` với một `code` có bản dịch.
- Hàm nào có thể chạy quá 50 ms đều nhận `budget` và gọi `budget.check()`.
- Không thêm tệp mới mà quên bốn danh sách script; không nới lỏng bài kiểm tra để vượt qua bản dựng.

## Hạn chế kỹ thuật đã biết

Các hạn chế mà người dùng nhận thấy được liệt kê trong hướng dẫn sử dụng
([Hạn chế đã biết](USERGUIDE.vn.md#hạn-chế-đã-biết)); đây là chi tiết kỹ thuật đằng sau một số hạn chế đó.

- **Chế độ `file://`** kém mượt hơn: trình sinh đề chạy trên luồng chính theo từng lát khoảng 12 ms, nên trang vẫn
  phản hồi và nút **Hủy** có tác dụng ở lát kế tiếp, nhưng có những đoạn việc không chia nhỏ được — ở Sát thủ một
  lát tìm kiếm mất 70–86 ms, một lần đào dấu ở So sánh 50–70 ms, bố cục lồng của một đề Sát thủ khó đến khoảng
  300 ms — và trang có thể khựng chừng đó thời gian. Việc tạo sẵn đề ở nền cũng bị tắt. Hãy phục vụ kho mã bằng
  máy chủ để có Web Worker.
- **Trọng số độ khó là giá trị ước lượng kỹ thuật**, chưa phải số đo trên người giải: trọng số của 26 kỹ thuật
  và chín khoảng điểm được chọn từ các phép đo trên đề do máy tạo
  ([docs/difficulty-rating/report-detailed.md](docs/difficulty-rating/report-detailed.md)); trọng số Sát thủ của `ruleOf45` và
  `cageSplit` là những ứng viên đầu tiên cần hiệu chỉnh với người chơi thật.
- **Thời gian tạo đề**: các thời gian trong hướng dẫn sử dụng được đo trong Node (`node tests/qualify.js`);
  `node tests/perf.js` đo mọi tổ hợp so với ngân sách ở [design.md](generator/design.md) §9.1 trên máy của bạn.
- **Nút Chơi** cần trình chơi nằm ở địa chỉ của thẻ meta `sg-player-url` (mặc định `../player/index.html`, nên
  hãy phục vụ hoặc xuất bản cả kho mã).

## Giấy phép và ghi công

Phát hành theo [giấy phép MIT](LICENSE) © 2026 Dat Le. Các thuật toán theo tài liệu phổ biến về sinh và giải
Sudoku; các quyết định thiết kế được ghi trong [design.md](generator/design.md). Dự án anh em dùng để chơi các đề này là
[Trình chơi Sudoku](#sudoku-player); phần mã hai ứng dụng dùng chung nằm ở `core/`.

[Lên đầu trang](#top)

---

# Sudoku Player

Trình chơi Sudoku là một ứng dụng web tĩnh nhỏ (không máy chủ, không tài khoản, không bước biên dịch) mở đề do
Trình sinh đề Sudoku tạo ra và cho bạn chơi. Ứng dụng làm gì và cách dùng nằm trong
[hướng dẫn sử dụng](USERGUIDE.vn.md#sudoku-player); phần này nói về mã nguồn của nó.

> Đường dẫn trong phần này tính từ thư mục `player/`, và các lệnh của nó chạy từ thư mục đó.

## Cách trình chơi đọc một đề

- Tài liệu đề mang sẵn mô hình đã dựng, nên trình chơi không có mã biến thể hay mã tạo đề nào (xem
  [Định dạng trao đổi](#định-dạng-trao-đổi)).
- Tài liệu dùng cách chấm điểm v2 vẫn có định dạng `sudoku-generator/v1`; trình chơi giữ
  `difficulty.ratingVersion` và không tính lại điểm. Tài liệu và văn bản cũ vẫn mở được, nhưng các mã mức cũ không
  được ánh xạ sang mã mới. Đổi thông tin chấm điểm không làm thay đổi định danh đề dùng để lưu tiến độ.
- Mã (token) của một liên kết đề đã nén và an toàn cho URL: văn bản các đề của nút Chơi ở trình sinh đề (`t.…`),
  hoặc tài liệu của một đề (`z.…`).

[Lên đầu trang](#top)

## Chạy trình chơi trên máy

Không cần cài đặt hay biên dịch. Mở `player/index.html` trong trình duyệt (chạy được từ `file://`), hoặc phục vụ
kho mã (thư mục gốc, không phải `player/`: trang nạp phần mã dùng chung với trình sinh đề từ `../core`) bằng bất kỳ máy
chủ tĩnh nào, ví dụ `python -m http.server` hay `npx serve`, rồi mở `http://localhost:8000/player/`.

[Lên đầu trang](#top)

## Kiểm thử trình chơi

```
node tests/node-runner.js          # mọi bộ kiểm thử (29 bộ, khoảng 15 giây); không cần gói nào (đã chạy trên Node 24)
node tests/node-runner.js --suite=play,importer
```

Các kiểm thử Node này chạy nhanh và là bộ mặc định: lập trình viên và các tác tử lập trình chạy
`node tests/node-runner.js` (hoặc vài bộ với `--suite=`) trong lúc phát triển, còn workflow triển khai chạy tất cả. Đó là 13
bộ ở `tests/suites/` và 16 bộ ở `../core/tests/suites/` mà trình sinh đề cũng chạy (bộ máy giải, bậc thang kỹ thuật, định
dạng trao đổi, hiển thị bàn cờ). `tests.html` chạy cùng các bộ kiểm thử trong trình duyệt (những bộ đọc tệp mẫu cần
`http://`). Các tệp mẫu trong `tests/fixtures/puzzles/` là tài liệu thật do Trình sinh đề Sudoku tạo ra
([tệp mẫu](docs/puzzle-exchange/fixtures.md)).

Phần chạy chậm là các **script trình duyệt** trong `tests/browser/` (`node tests/browser/run-all.js`: Edge không giao
diện qua giao thức DevTools, vài phút). Chúng chạy **thủ công**, không nằm trong workflow, và chỉ cần chạy khi thay
đổi đụng tới giao diện; lần chạy được ghi lại trong [lần chạy trình duyệt](docs/qa/browser-run.md).

[Lên đầu trang](#top)

## Đưa lên GitHub Pages

Chọn **Settings → Pages → Build and deployment → Source → GitHub Actions**.
[Workflow triển khai](.github/workflows/pages.yml) của kho mã chạy các kiểm thử Node 24 của cả hai ứng dụng (`node tests/node-runner.js`,
không gồm các script trình duyệt) và xuất bản trình chơi, trình sinh đề và phần mã dùng chung sau mỗi
lần đẩy lên `main`; bạn cũng có thể chạy thủ công từ thẻ **Actions**. Chỉ các tệp ứng dụng và giấy phép được
xuất bản, không gồm kiểm thử hay ghi chú làm việc. Ứng dụng trực tuyến tại
**[tdat00.github.io/sudoku/player](https://tdat00.github.io/sudoku/player/)**. Nút “Chơi” của Trình
sinh đề mở trình chơi nằm cạnh nó (`../player/index.html`); trang tìm trình sinh đề theo cách tương tự, từ
`<meta name="sg-generator-url">` trong `index.html` (`../generator/index.html`, đường dẫn tương đối so với trang: chỉ
đích danh trang, không chỉ thư mục, vì khi mở từ ổ đĩa một thư mục sẽ hiện danh sách tệp).

[Lên đầu trang](#top)

## Xem thêm về trình chơi

[`design.md`](player/design.md) (kiến trúc, định dạng, khả năng tiếp cận, kiểm thử, rủi ro) ·
[`task.md`](player/task.md) (kế hoạch và tiến độ) ·
[tổng quan kho mã](#tổng-quan) và [các tài liệu](docs/README.md) ·
Giấy phép: MIT ([LICENSE](LICENSE)).

[Lên đầu trang](#top)
