# Hướng dẫn sử dụng Sudoku

<a id="top"></a>

[English](USERGUIDE.md) · **Tiếng Việt** · [Hướng dẫn cho lập trình viên](DEVELOPERGUIDE.vn.md) · [README](README.md)

**Ứng dụng trực tuyến:**
[Sudoku Generator](https://tdat00.github.io/sudoku/generator/) ·
[Sudoku Player](https://tdat00.github.io/sudoku/player/) ·
[GitHub](https://github.com/tdat00/sudoku)

Cách dùng hai ứng dụng. Muốn chạy chúng từ bản sao của riêng bạn, hiểu mã nguồn hay đóng góp, hãy đọc
[hướng dẫn cho lập trình viên](DEVELOPERGUIDE.vn.md).

- [Tổng quan](#tổng-quan)
  - [Hai ứng dụng](#hai-ứng-dụng)
  - [Mở ứng dụng](#mở-ứng-dụng)
  - [Giấy phép](#giấy-phép)
- [Sudoku Generator](#sudoku-generator)
  - [Giới thiệu](#giới-thiệu)
  - [Tính năng của trình sinh đề](#tính-năng-của-trình-sinh-đề)
  - [Ảnh chụp màn hình](#ảnh-chụp-màn-hình)
  - [Cách chạy](#cách-chạy)
  - [Tham số URL](#tham-số-url)
  - [Chơi trong Trình chơi Sudoku](#chơi-trong-trình-chơi-sudoku)
  - [Hạn chế đã biết](#hạn-chế-đã-biết)
- [Sudoku Player](#sudoku-player)
  - [Lấy đề ở đâu](#lấy-đề-ở-đâu)
  - [Tính năng của trình chơi](#tính-năng-của-trình-chơi)
  - [Chạy trang](#chạy-trang)
  - [Quyền riêng tư](#quyền-riêng-tư)

---

# Tổng quan

## Hai ứng dụng

| Ứng dụng | Trực tuyến | Làm gì |
|---|---|---|
| **[Sudoku Generator](#sudoku-generator)** | [tdat00.github.io/sudoku/generator](https://tdat00.github.io/sudoku/generator/) | Tạo đề 15 biến thể ở chín mức độ khó, phát lại từng bước đề được tạo, in và xuất văn bản |
| **[Sudoku Player](#sudoku-player)** | [tdat00.github.io/sudoku/player](https://tdat00.github.io/sudoku/player/) | Chơi một đề: ghi chú, hoàn tác / làm lại, kiểm tra lỗi, gợi ý nêu tên kỹ thuật, đồng hồ, tiến độ được lưu |

Cả hai có tiếng Anh và tiếng Việt, giao diện sáng, tối và tương phản cao, dùng được bằng bàn phím và cảm ứng. Nút
**Chơi** của trình sinh đề mở các đề của nó trong trình chơi.

![Sudoku Cổ điển 9×9 ở giao diện sáng, đang phát lại giữa chừng](docs/screenshots/screenshot-classic9-light.png)

[Lên đầu trang](#top)

## Mở ứng dụng

Bạn chỉ cần một trình duyệt web (Chrome hoặc Edge 100+, Firefox 100+, Safari 15.4+); không cần cài đặt gì, không
cần tài khoản. Mở [Sudoku Generator](https://tdat00.github.io/sudoku/generator/) hoặc
[Sudoku Player](https://tdat00.github.io/sudoku/player/). Hai ứng dụng cũng chạy được từ một bản sao trên máy của
bạn; cách lấy và chạy bản sao nằm trong [hướng dẫn cho lập trình viên](DEVELOPERGUIDE.vn.md#chạy-trên-máy-của-bạn).

[Lên đầu trang](#top)

## Giấy phép

Phát hành theo [giấy phép MIT](LICENSE) © 2026 Dat Le.

[Lên đầu trang](#top)

---

# Sudoku Generator

Một ứng dụng web tạo đề Sudoku cho **15 biến thể**, **đảm bảo đúng độ khó bạn chọn** và **cho bạn xem từng bước
đề được tạo ra** — bằng tiếng Anh hoặc tiếng Việt. Ứng dụng chạy hoàn toàn trong trình duyệt của bạn: không tài
khoản, không máy chủ, không cần cài đặt. Muốn *giải* một đề vừa tạo, hãy dùng ứng dụng anh em
**[Trình chơi Sudoku](#sudoku-player)**: nút "Chơi" mở đề đó ở bên ấy ([chi tiết](#chơi-trong-trình-chơi-sudoku)).

## Giới thiệu

Phần lớn các trình sinh đề Sudoku chỉ đưa cho bạn một đề rồi thôi. Trình này còn là cách để *hiểu một đề Sudoku được
tạo ra như thế nào*:

1. Bạn chọn biến thể, độ khó, có thể thêm seed, rồi bấm **Tạo đề**.
2. Trình sinh đề chạy hết tốc độ và **ghi lại một nhật ký ngắn** về cách nó đào ra đề từ một lời giải đầy đủ: mọi số
   đã xóa và mọi số phải trả lại.
3. Bàn cờ hiện ngay đề hoàn chỉnh. Sau đó bạn **tự xem lại đề được tạo ra như thế nào**, bằng các nút Bước đầu
   tiên / Bước trước / Bước tiếp theo / Bước cuối cùng hoặc thanh trượt ở thẻ **Các bước tạo đề** dưới bàn cờ. Thẻ
   này trước hết chuẩn bị bảng điểm cho từng bước (ở nền, ít lâu sau khi đề hiện ra), rồi hiện một số bước được
   chọn để điểm tăng đều và không bao giờ giảm (lời giải đầy đủ, các lồng hay dấu so sánh, các lần bỏ số, đề
   hoàn chỉnh); đánh dấu **Hiện từng thay đổi** để xem mọi thay đổi đã ghi lại, kể cả những thay đổi làm điểm
   giảm. Thẻ này mô tả bước đang xem, kèm các kỹ thuật mà đề cần ở thời điểm đó và điểm của chúng; biểu
   tượng **Giải thích** mở Trợ giúp ở đúng bước đó (làm gì, vì sao, làm thế nào, và đoạn mã giả đang chạy). Thẻ
   **Tóm tắt** bên cạnh cho biết độ khó của đề hoàn chỉnh và điểm của nó được cộng lên như thế nào.
4. Mọi đề bạn tạo đều được giữ trong một danh sách ở bên trái, để mở lại, hoặc in và xuất nhiều đề cùng lúc.

Độ khó không phải là phỏng đoán. Điểm của một đề chỉ dựa vào số ô trống và các kỹ thuật giải mà người chơi cần
dùng để giải xong — kỹ thuật khó nhất được tính đủ, phần việc còn lại tính theo thang logarit — và mức của đề là
khoảng điểm chứa điểm đó ([design.md](generator/design.md) §6.6). Bộ đào chỉ bỏ một số cho sẵn khi đề vẫn giải được bằng
các kỹ thuật hợp với khoảng điểm của mức đã chọn (*oracle bị giới hạn theo kỹ thuật*, [design.md](generator/design.md)
§6.8), và chỉ trả về đề có lời giải logic trọn vẹn. Cùng seed và cùng tùy chọn luôn cho ra cùng một đề.

**Tương thích với cách tính điểm v2.** "Cùng seed cho cùng đề" chỉ đúng trong cùng một phiên bản tính điểm/trình
sinh đề. Phiên bản này đổi cách tính điểm và cách tạo đề (rating v2), nên một liên kết hay một mục lịch sử do
phiên bản cũ tạo ra có thể tạo lại thành một đề khác, và điểm đã lưu trong lịch sử không được tính lại (những gì
thay đổi trong dữ liệu đã lưu nằm trong [hướng dẫn cho lập trình viên](DEVELOPERGUIDE.vn.md#bộ-nhớ-đệm-và-tạo-sẵn-đề)).

## Tính năng của trình sinh đề

- **15 biến thể** — Sudoku Cổ điển 4×4, 6×6 và 9×9; Khổng lồ 12×12 và Quái vật 16×16; Đường chéo (X); Siêu
  vùng (Windoku); Ghép hình (Jigsaw); Sát thủ (Killer); So sánh (Greater-Than); Samurai, Sohei, Cánh bướm và
  Bông hoa (các lưới chồng nhau); Sudoku Chữ (Wordoku).
- **Chín mức độ khó** — rất dễ, dễ, trung bình, khó, chuyên gia, bậc thầy, ác mộng, địa ngục 1 và địa ngục 2 —
  tính điểm từ 21 kỹ thuật giải của con người (số đơn, ứng viên bị khóa, tập con, cá, cánh, chuỗi) cùng 3 kỹ
  thuật về lồng và 2 kỹ thuật về dấu so sánh; mỗi biến thể chỉ có các mức mà nó đạt được một cách ổn định.
- **Phát lại từng bước** quá trình tạo đề, do bạn tự điều khiển (bước đầu tiên, bước trước, bước tiếp theo,
  bước cuối cùng, hoặc thanh trượt có một vạch cho mỗi bước): một số bước được chọn để điểm tăng đều và không
  bao giờ giảm, hoặc, với **Hiện từng thay đổi**, mọi thay đổi đã ghi lại; các bảng điểm được chuẩn bị sau khi đề
  hiện ra, và phần Trợ giúp ("Cách hoạt động") giải thích bước đó kèm mã giả.
- **Điểm độ khó đọc được** — thẻ Tóm tắt liệt kê từng kỹ thuật mà đề cần cùng số lần dùng, điểm và phần điểm
  được phân bổ cho nó, rồi các ô trống, và dòng Tổng bằng đúng điểm của đề; thẻ Các bước tạo đề cho bảng tương tự
  ở các bước tạo đề đã được chấm điểm.
- **Danh sách các đề đã tạo** — mỗi đề bạn tạo được lưu trong trình duyệt (tối đa 100, mới nhất ở trên) và hiện
  ở bên trái dưới dạng "biến thể" và "mức: điểm, seed"; bấm vào một đề để mở lại (cùng seed cho cùng đề trong
  cùng một phiên bản trình sinh đề), xóa từng đề, hoặc xóa cả danh sách.
- **Giao diện song ngữ** (Anh / Việt), đổi ngay không cần tải lại trang; mọi chuỗi chữ, kể cả tên kỹ thuật giải
  và luật của từng biến thể, đều có cả hai ngôn ngữ.
- **Kết quả được đảm bảo** — đúng một lời giải (do một bộ giải riêng kiểm tra), đúng mức độ yêu cầu hoặc, khi
  không đạt được, đề gần nhất kèm thông báo rõ ràng.
- **In / PDF** — hộp thoại In đề in các đề bạn tick trong danh sách đã lưu (lúc đầu là đề đang hiển thị), 1, 2
  hoặc 4 đề mỗi trang (mặc định 4), có thể kèm lời giải ở các trang riêng; chọn "Lưu dưới
  dạng PDF" trong hộp thoại in để có tệp PDF (đồ họa vector nên nét kẻ luôn sắc).
- **Xuất văn bản** — nút **Xuất văn bản** cạnh nút **In đề** hiện các đề bạn tick trong danh sách đã tạo dưới dạng văn bản dễ đọc (`#1,Classic Sudoku 9x9,Hard,<seed>` rồi mỗi hàng lưới một dòng, `.` là ô trống), kèm nút Sao chép.
  Dán vào tệp hoặc công cụ khác.
- **Chơi trong Trình chơi Sudoku** — nút **Chơi** cạnh nút **In đề** chuyển mọi đề trong danh sách đã tạo, đề
  đang hiển thị đứng đầu, sang ứng dụng riêng
  [Trình chơi Sudoku](#sudoku-player), nơi bạn giải đề với ghi chú, hoàn tác / làm lại, kiểm
  tra, gợi ý nêu tên kỹ thuật và đồng hồ. Các đề nằm ngay trong liên kết (sau dấu `#`), đã được nén, nên không có
  gì bị tải lên; xem [Chơi trong Trình chơi Sudoku](#chơi-trong-trình-chơi-sudoku).
- **Dễ tiếp cận** — điều hướng bằng bàn phím, lưới ARIA, thông báo trực tiếp, giao diện sáng, tối và tương
  phản cao, chỉnh cỡ chữ, giảm chuyển động.
- **Trợ giúp ngay trong ứng dụng** — luật của cả 15 biến thể, bậc thang kỹ thuật và phím tắt.
- **Tĩnh và chạy ngoại tuyến** — bản thân trình sinh đề không gửi gì đi đâu cả. Các đề vừa tạo được lưu đệm trong
  trình duyệt và đề kế tiếp được âm thầm tạo sẵn ở nền, nên nút *Tạo đề* thường cho kết quả ngay.

Các biến thể (cột `id` là giá trị của tham số URL `v`):

| `id` | Biến thể | Số ký hiệu | Số ô | Các mức có |
|------|----------|-----------:|-----:|------------|
| `classic4` | Sudoku Cổ điển 4×4 | 4 | 16 | veryEasy |
| `classic6` | Sudoku Cổ điển 6×6 | 6 | 36 | veryEasy, hard |
| `classic9` | Sudoku Cổ điển 9×9 | 9 | 81 | veryEasy–hell1 |
| `mega12` | Sudoku Khổng lồ 12×12 | 12 | 144 | veryEasy–hell2 |
| `mega16` | Sudoku Quái vật 16×16 | 16 | 256 | veryEasy–hell2 |
| `diagonalX` | Sudoku Đường chéo (X) | 9 | 81 | veryEasy–hell2 |
| `hyper` | Sudoku Siêu vùng (Windoku) | 9 | 81 | veryEasy–hell2 |
| `jigsaw9` | Sudoku Ghép hình | 9 | 81 | veryEasy–hell2 |
| `killer` | Sudoku Sát thủ | 9 | 81 | veryEasy–hell2 |
| `greaterThan` | Sudoku So sánh | 9 | 81 | veryEasy–hell2 |
| `samurai` | Sudoku Samurai | 9 | 369 | veryEasy–hell2 |
| `sohei` | Sudoku Sohei | 9 | 288 | veryEasy–hell2 |
| `butterfly` | Sudoku Cánh bướm | 9 | 144 | veryEasy–hell2 |
| `flower` | Sudoku Bông hoa | 9 | 189 | veryEasy–hell2 |
| `wordoku` | Sudoku Chữ (Wordoku) | 9 | 81 | veryEasy–hell1 |

## Ảnh chụp màn hình

Phát lại quá trình tạo đề Sudoku Cổ điển 9×9 (giao diện sáng, tiếng Anh):

![Sudoku Cổ điển 9×9 ở giao diện sáng, đang phát lại giữa chừng](docs/screenshots/screenshot-classic9-light.png)

Cùng trang đó ở giao diện tối và bằng tiếng Việt:

![Sudoku Cổ điển 9×9 ở giao diện tối, giao diện tiếng Việt](docs/screenshots/screenshot-classic9-dark-vi.png)

Một đề Sát thủ (Killer) với các lồng:

![Đề Sudoku Sát thủ với các lồng nét đứt và tổng của chúng](docs/screenshots/screenshot-killer.png)

## Cách chạy

Bạn chỉ cần một trình duyệt web (Chrome hoặc Edge 100+, Firefox 100+, Safari 15.4+). Ứng dụng trực tuyến tại
**[tdat00.github.io/sudoku/generator](https://tdat00.github.io/sudoku/generator/)**. Một bản sao mở thẳng từ ổ đĩa
cũng chạy được nhưng kém mượt hơn (xem [Hạn chế đã biết](#hạn-chế-đã-biết)); cách chạy một bản sao, hay tự xuất bản
bản của bạn, nằm trong [hướng dẫn cho lập trình viên](DEVELOPERGUIDE.vn.md#chạy-trình-sinh-đề-trên-máy).

Bấm nút **Trợ giúp** để xem luật của từng biến thể, bậc thang kỹ thuật và các phím tắt.

## Tham số URL

Thanh địa chỉ luôn giữ trạng thái của trang, nên một liên kết tạo lại đúng một đề. Chỉ những giá trị khác mặc
định mới được ghi. Trang không có nút chia sẻ liên kết: hãy sao chép địa chỉ, và một liên kết có seed tạo lại đúng
đề. Mọi tham số khác đều bị bỏ qua, kể cả `trace` và `speed` của các liên kết cũ.

| Tham số | Ví dụ | Ý nghĩa |
|---------|-------|---------|
| `v` | `v=jigsaw9` | Mã biến thể (bảng ở trên). Mặc định `classic9`. |
| `d` | `d=hard` | Độ khó: `veryEasy`, `easy`, `normal`, `hard`, `expert`, `master`, `nightmare`, `hell1`, `hell2`; mức mà biến thể không có được đổi thành mức gần nhất mà nó có. Mặc định `normal`. |
| `seed` | `seed=1734567890` | Seed. Số nguyên 0–4294967295 được dùng nguyên văn; văn bản khác được băm thành một số. Không có = ngẫu nhiên. Liên kết (hay lần tải lại trang) có seed sẽ tạo ngay đề đó khi trang tải xong. |
| `sym` | `sym=mirrorH` | Kiểu đối xứng của các ô cho sẵn: `none`, `rotational180` (mặc định), `rotational90`, `mirrorH`, `mirrorV`, `mirrorBoth`, `diagonal`, `antiDiagonal`. |
| `mode` | `mode=letters` | Bộ ký hiệu: `digits`, `letters`, `colors`, `shapes`, `word` (chỉ Sudoku Chữ). Mặc định: của biến thể. |
| `order` | `order=snake` | Thứ tự thử bỏ số: `random` (mặc định), `rowByRow`, `snake`, `spiral`, `jumpOne`. |
| `attempts` | `attempts=12` | Số lưới đầy đủ được thử trước khi chấp nhận đề gần nhất, 1–20. Mặc định 8. |
| `sol` | `sol=1` | Hiện lời giải cạnh đề. |
| `o.<id>` | `o.cageSize=2` | Một tùy chọn của biến thể đang chọn, ví dụ `o.compactness=0.8` (jigsaw9), `o.futoshiki=1` (greaterThan), `o.placement=row` (wordoku). |
| `lang` | `lang=vi` | Ngôn ngữ: `en` hoặc `vi`. Mặc định: lựa chọn đã lưu, rồi ngôn ngữ của trình duyệt. |
| `auto` | `auto=1` | Tạo đề ngay khi trang tải xong (liên kết có `seed` thì tự tạo đề cả khi không có tham số này). |

`?v=classic9&d=master&seed=42&lang=vi&auto=1` luôn cho ra cùng một đề. Các thiết lập còn được lưu trong
`localStorage` của trình duyệt, không bao giờ gửi đi đâu: `sg.prefs.v1` (ngôn ngữ, giao diện, cỡ chữ, giảm chuyển
động, ký hiệu hỗ trợ người mù màu), `sg.lastConfig.v1` (các tùy chọn gần nhất), `sg.cache.v1` (tối đa 20 đề vừa
tạo, để cùng một đề mở ra ngay), `sg.history.v1` (danh sách các đề đã tạo ở bên trái, tối đa 100). Liên kết có nêu
tham số của đề thì được ưu tiên hơn các tùy chọn đã lưu. Nếu bị chặn lưu trữ, trang giữ mọi thứ trong bộ nhớ trong
suốt phiên.

## Chơi trong Trình chơi Sudoku

Trình sinh đề chỉ **tạo** đề. Việc giải đề do dự án anh em đảm nhận:
**[Trình chơi Sudoku](#sudoku-player)** (đăng tại [tdat00.github.io/sudoku/player](https://tdat00.github.io/sudoku/player/)) —
một ứng dụng riêng với lưới để bạn điền số, ghi chú ứng viên, hoàn tác / làm lại, kiểm tra lỗi, gợi ý nêu
tên kỹ thuật logic, đồng hồ, tiến độ được lưu theo từng đề, đủ 15 biến thể, tiếng Anh / Việt, giao diện và trợ
năng.

**Các đề sang đó bằng cách nào.** Bấm nút **Chơi** cạnh nút **In đề** ở khung chính. Trang lấy **mọi đề trong
danh sách đã tạo** (và đề đang hiển thị nếu nó không có trong danh sách), ghi chúng thành văn bản dễ đọc của
hộp **Xuất văn bản**, nén văn bản đó thành một mã (token) rồi mở trình chơi (nằm cạnh trình sinh đề trên cùng một
trang web) trong thẻ mới, ở địa chỉ `…/player/index.html#puzzle=<token>&active=<n>`. `active` là số thứ tự của đề
đang hiển thị: trình chơi đặt đúng đề đó lên bàn cờ và liệt kê tất cả các đề còn lại. Đề nào chưa có sẵn sẽ được
tạo lại từ seed trước (một hộp thoại nhỏ báo tiến độ và kết thúc bằng nút **Mở trình chơi**). Mã nằm ở **phần
fragment** của URL (sau dấu `#`) — trình duyệt không bao giờ gửi phần này lên máy chủ — nên không có gì bị tải lên.
Vì là văn bản đã nén, một trăm đề vẫn vừa trong liên kết dài vài chục kB; khi liên kết dài hơn khoảng 100 kB, một
thông báo cảnh báo rằng một số ứng dụng và máy chủ cắt bớt liên kết dài.

Định dạng của liên kết, và cách trỏ nút này tới một bản trình chơi khác, nằm trong
[hướng dẫn cho lập trình viên](DEVELOPERGUIDE.vn.md#định-dạng-trao-đổi).

## Hạn chế đã biết

- **Khi mở từ tệp** (`file://`), trình sinh đề kém mượt hơn: trình duyệt không cho nó làm việc ở nền tại đó, nên
  nó làm việc theo từng lát nhỏ ngay trên trang. Trang vẫn phản hồi giữa các lát nhưng với bàn cờ lớn có thể khựng
  một lúc (lâu nhất vài trăm mili giây), nút **Hủy** có tác dụng ở lát kế tiếp, và đề kế tiếp không được tạo sẵn ở
  nền. Trang trực tuyến, hay một bản sao được phục vụ bằng máy chủ web
  ([hướng dẫn cho lập trình viên](DEVELOPERGUIDE.vn.md#chạy-trình-sinh-đề-trên-máy)), không gặp vấn đề này.
  Các bảng điểm của thẻ **Các bước tạo đề** cũng được tính ngay trên trang tại đó: thẻ chờ bạn nhấn **Chuẩn bị
  bảng điểm**, và trang có thể ngừng phản hồi trong chốc lát khi nó làm việc; đề hoàn chỉnh và thẻ Tóm tắt dùng
  được trước đó.
- **Chưa chạy thử với trình đọc màn hình thật.** Thao tác bằng bàn phím, vai trò ARIA và thông báo trực tiếp đã
  được cài đặt và kiểm tra trong trình duyệt không giao diện, nhưng chưa ai nghe thử bằng trình đọc màn hình.
- **Độ khó là một ước lượng**: trọng số của các kỹ thuật và khoảng điểm của các mức được chọn từ các phép đo trên
  đề do máy tạo, chưa phải từ thử nghiệm với người giải thật ([chi tiết](DEVELOPERGUIDE.vn.md#hạn-chế-kỹ-thuật-đã-biết)).
  Tổ hợp khó đạt (đối xứng chặt kèm mức rất cao) sẽ trả về đề gần nhất kèm thông báo thay vì đúng mức.
- **Không phải mức nào cũng có ở mọi nơi**: Sudoku Cổ điển 4×4 chỉ có mức rất dễ và Cổ điển 6×6 có rất dễ và
  khó; Sudoku Cổ điển 9×9 và Sudoku Chữ dừng ở mức địa ngục 1; mọi biến thể khác có đủ chín mức. Các mức mà một biến thể cung cấp
  là những mức nó vượt qua trong bước kiểm định ([docs/difficulty-rating/qualification.md](docs/difficulty-rating/qualification.md)).
- **Các mức khó nhất chậm nhất**: các tổ hợp chậm nhất là So sánh và Sát thủ từ mức chuyên gia trở lên và các mức
  địa ngục của bàn cờ lớn, với phân vị 95 đến khoảng 9,5 giây (So sánh chuyên gia; Sát thủ chuyên gia và ác mộng
  8–9 giây; Quái vật 16×16 và Samurai địa ngục 2 khoảng 6–7 giây) và có yêu cầu đơn lẻ đến khoảng 13 giây; phần lớn
  các tổ hợp khác mất chưa tới một giây.
- **Sudoku Chữ tiếng Việt**: từ chín chữ cái khác nhau rất hiếm trong tiếng Việt nên danh sách ngắn; khi quá ngắn
  thì dùng danh sách tiếng Anh và có thông báo.
- **Cài đặt**: công tắc tắt việc tạo sẵn đề ở nền không được nhớ giữa các lần truy cập.
- **Chưa làm**: bản đồ thu nhỏ hay cuộn ngang cho Quái vật 16×16 trên điện thoại (bàn cờ được co theo chiều rộng
  màn hình), và "khởi động ấm" để đào một đề khó hơn từ một đề dễ hơn.
- **Trình duyệt**: được phát triển và kiểm tra chỉ trên Edge nền Chromium; Firefox 100+ và Safari 15.4+ là mục
  tiêu hỗ trợ nhưng chưa được thử, điện thoại thật cũng vậy.
- **Nút Chơi** cần một trình duyệt không chặn cửa sổ bật lên của trang, và trình chơi nằm cạnh trình sinh đề (như
  trên trang trực tuyến). Liên kết dài hơn khoảng 100 kB (danh sách đề rất dài) có thể bị ứng dụng chat hay máy chủ
  cắt bớt và khi đó không mở hết các đề trong trình chơi.

[Lên đầu trang](#top)

---

# Sudoku Player

**Trình chơi Sudoku** là một ứng dụng web nhỏ, mở đề Sudoku do
[Trình sinh đề Sudoku](https://tdat00.github.io/sudoku/generator/) tạo ra và cho bạn **chơi** trực tuyến: ghi
chú, hoàn tác / làm lại chính xác, kiểm tra lỗi, gợi ý nêu tên kỹ thuật suy luận, đồng hồ và tiến độ được tự
động lưu. Có tiếng Anh và tiếng Việt, giao diện sáng / tối / tương phản cao, dùng được bằng bàn phím và cảm
ứng, không cần máy chủ, tài khoản hay cài đặt. **Mở ngay: [tdat00.github.io/sudoku/player](https://tdat00.github.io/sudoku/player/).**

## Lấy đề ở đâu

1. Trong Trình sinh đề Sudoku, bấm **Chơi** (ở góc trên bên phải khung chính của trình sinh đề): liên kết mở ra
   trang này với **mọi đề trong danh sách của trình sinh đề** nằm trong địa chỉ (`#puzzle=<mã>&active=<n>`: văn
   bản của các đề, đã nén và an toàn cho URL); mã được đọc ngay trong trình duyệt rồi xóa khỏi thanh địa chỉ.
   Tất cả các đề vào danh sách bên trái, và đề đang hiển thị ở trình sinh đề được mở trước.
2. Hoặc bấm **Nhập đề** rồi dán nội dung hộp **Xuất văn bản** của Trình sinh đề Sudoku (một hay nhiều đề, tối đa 200 đề trong một
   văn bản, thuộc mọi biến thể — dòng tiêu đề `#1,biến thể,mức,seed`, lưới, và với Ghép hình, Sát thủ, So sánh, Sudoku Chữ có thêm vài dòng
   mô tả bàn cờ); cũng có thể thả tệp văn bản (tối đa 8 MB) vào bất kỳ đâu trên trang. Mọi đề dựng lại được sẽ vào danh sách
   bên trái và đề đầu tiên được mở; đề không dựng lại được (ví dụ văn bản từ trình sinh đề cũ thiếu các dòng
   đó) được liệt kê là bị bỏ qua. Liên kết (`…#puzzle=<mã>`) hay một dòng 81 (9×9), 36 (6×6) hoặc 16 (4×4) ký
   tự, trong đó `.`, `0`, `-`, `_` là ô trống, cũng dùng được. Nút **Chia sẻ** (trước nút Nhập đề) cho liên kết
   của đề đang trên bàn cờ.
3. Hoặc chọn một **đề đã nhập** ở bên trái (một biểu tượng mờ đánh dấu đề đã giải và đề đang chơi dở; danh sách
   giữ nguyên thứ tự khi bạn chơi); tải lại trang sẽ đưa đề đang chơi trở lại.

[Lên đầu trang](#top)

## Tính năng của trình chơi

- Chơi được **cả 15 biến thể**: Cổ điển 4×4, 6×6 và 9×9, Khổng lồ 12×12, Quái vật 16×16, Đường chéo (X),
  Siêu vùng (Windoku), Ghép hình, Sát thủ, So sánh, Samurai, Sohei, Cánh bướm, Bông hoa và Chữ (Wordoku).
- Nhận tên độ khó **Rất dễ, Dễ, Trung bình, Khó, Chuyên gia, Bậc thầy, Ác mộng, Địa ngục 1 và Địa ngục 2**
  bằng tiếng Anh và tiếng Việt. Đề từ các phiên bản cũ của trình sinh đề vẫn mở được, nhưng các mã mức cũ
  (`medium`, `veryHard`, `evil`, `nightmare1`, `nightmare2`) không được dịch: đề đó mở với độ khó không xác định
  (tiêu đề không có mức). Một đề vẫn giữ tiến độ đã lưu khi chỉ có điểm độ khó của nó thay đổi.
- Chọn ô bằng chuột, cảm ứng hay bàn phím (mũi tên, Home / End, Page Up / Down); gõ ký hiệu hoặc dùng bàn phím
  số trên màn hình; ghi chú (`N`); xóa; hoàn tác / làm lại (`Ctrl+Z`, `Ctrl+Y`).
- Kiểm tra lỗi: tắt, vi phạm luật (trùng số, tổng lồng, dấu so sánh) hoặc mọi ô sai ngay khi gõ.
- **Gợi ý** ba bước (kỹ thuật và nơi cần nhìn, các ô, nước đi), luôn đúng và nêu tên một trong 26 kỹ thuật, kèm
  tên và mô tả đã dịch.
- Kiểu ký hiệu: chữ số, chữ cái, màu (luôn kèm hình), hình dạng và chữ của từ khóa; đề Sudoku Chữ giải xong sẽ hiện từ
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

Không cần cài đặt gì: mở **[tdat00.github.io/sudoku/player](https://tdat00.github.io/sudoku/player/)**. Thêm
`?lang=vi` vào địa chỉ để dùng tiếng Việt (trang hướng dẫn cũng vậy: `help.html?lang=vi`; `help.html#tech-xWing`
mở thẳng một kỹ thuật).

Liên kết đề có dạng `…/index.html#puzzle=<mã>` (kèm `&active=<n>` cho một danh sách đề). Mã đã nén và an toàn cho
URL, và phần sau dấu `#` không bao giờ rời khỏi trình duyệt. Tệp văn bản hay dòng ký tự đã dán thì không cần mã.
Muốn chạy trình chơi từ một bản sao trên máy của bạn, xem
[hướng dẫn cho lập trình viên](DEVELOPERGUIDE.vn.md#chạy-trình-chơi-trên-máy).

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
