/**
 * Vietnamese key words for Wordoku (design.md section 8.5).
 *
 * Nine-letter isograms hardly exist in Vietnamese once the diacritics are counted, so every entry here is a
 * common noun or verb of at most three syllables written WITHOUT diacritics and without spaces
 * ("chuyên gia" -> CHUYENGIA, "đ" -> D). Each one still has to be exactly 9 distinct letters A-Z; the comment
 * shows the real spelling. tests/suites/wordoku.test.js fails the build on an entry that is not, or that has
 * no entry in core/assets/wordbook/words.vi.js (the spelling with diacritics and the meaning shown when the
 * puzzle is solved).
 *
 * Valid entries are rare, so this list is much shorter than the English one: js/variants/wordoku.js falls
 * back to the English list (with a notice) when it holds fewer than `SG.wordoku.MIN_WORDS` entries.
 *
 * Plain data on `SG.wordlists.vi`, read lazily by js/variants/wordoku.js, so this file may load before or
 * after the variant. Generated together with core/assets/wordbook/words.vi.js.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};
  SG.wordlists = SG.wordlists || {};

  SG.wordlists.vi = Object.freeze([
    'BACHDUONG', // bạch dương
    'BANGVIDEO', // băng video
    'BANHMIKEP', // bánh mì kẹp
    'BANHMIQUE', // bánh mì que
    'BANHSUKEM', // bánh su kem
    'BANPHIMCO', // bàn phím cơ
    'BAODIENTU', // báo điện tử
    'BATCHUYEN', // bắt chuyện
    'BATLICHSU', // bất lịch sự
    'BENHCUMGA', // bệnh cúm gà
    'BEPCAMUNG', // bếp cảm ứng
    'BIACHUYEN', // bịa chuyện
    'BUOMTRANG', // bướm trắng
    'BUOTMIENG', // buột miệng
    'CAPHEMUOI', // cà phê muối
    'CAYHOTIEU', // cây hồ tiêu
    'CAYNGHIET', // cay nghiệt
    'CHATLUONG', // chất lượng
    'CHIEMDOAT', // chiếm đoạt
    'CHIEMDONG', // chiếm đóng
    'CHIEMDUNG', // chiếm dụng
    'CHIEUBONG', // chiếu bóng
    'CHIEULONG', // chiều lòng
    'CHIEURONG', // chiều rộng
    'CHIEUSANG', // chiếu sáng
    'CHUANGOET', // chua ngoét
    'CHUNGLOAI', // chủng loại
    'CHUONGMAT', // chướng mắt
    'CHUONGTAI', // chướng tai
    'CHUOTLANG', // chuột lang
    'CHUYENDAT', // chuyển đạt
    'CHUYENDOI', // chuyển dời
    'CHUYENGIA', // chuyên gia
    'CHUYENTAI', // chuyên tải
    'CHUYENTAM', // chuyên tâm
    'CHUYENTRO', // chuyện trò
    'COSINHVAT', // cổ sinh vật
    'CUPHATDEN', // cú phạt đền
    'CUTRIDOAN', // cử tri đoàn
    'DALYHUONG', // dạ lý hương
    'DAMTRUONG', // dặm trường
    'DEMTRUONG', // đêm trường
    'DIAPHUONG', // địa phương
    'DICHTALON', // dịch tả lợn
    'DIEMCHUAN', // điểm chuẩn
    'DIEMVUONG', // diêm vương
    'DIEPTRUNG', // điệp trùng
    'DIETKHUAN', // diệt khuẩn
    'DIEUKHOAN', // điều khoản
    'DOHUYETAP', // đo huyết áp
    'DUONGCHAT', // dưỡng chất
    'DUONGLICH', // dương lịch
    'DUONGTHAI', // dưỡng thai
    'DUYETBINH', // duyệt binh
    'GACHMENSU', // gạch men sứ
    'GIAODUYEN', // giao duyên
    'GIAOQUYET', // giảo quyệt
    'GIAOTUYEN', // giao tuyến
    'GIATRUYEN', // gia truyền
    'GOICHUYEN', // gợi chuyện
    'HAMTRUONG', // hạm trưởng
    'HATDECUOI', // hạt dẻ cười
    'KHIEMCUNG', // khiêm cung
    'KHIENGVAC', // khiêng vác
    'KHOANGMUI', // khoang mũi
    'KHUATBONG', // khuất bóng
    'KHUAYDONG', // khuấy động
    'KHUCNGOAT', // khúc ngoặt
    'KHUYENBAO', // khuyên bảo
    'KHUYENCAO', // khuyến cáo
    'KHUYENMAI', // khuyến mãi
    'KHUYENTAI', // khuyên tai
    'KIEMCHUNG', // kiểm chứng
    'KYSINHVAT', // ký sinh vật
    'LAMCHUYEN', // lắm chuyện
    'LAMNGHIEP', // lâm nghiệp
    'LAMTRUONG', // lâm trường
    'LANHODIEP', // lan hồ điệp
    'LAPTRUONG', // lập trường
    'LEMUNGTHO', // lễ mừng thọ
    'LENDAYCOT', // lên dây cót
    'LICHDEBAN', // lịch để bàn
    'LOIKHUYEN', // lời khuyên
    'MIENTRACH', // miễn trách
    'MOIQUANHE', // mối quan hệ
    'NGAYTRUOC', // ngày trước
    'NGHIEMTUC', // nghiêm túc
    'NGHIEPBAO', // nghiệp báo
    'NGHIQUYET', // nghị quyết
    'NGOITHUBA', // ngôi thứ ba
    'NGULOIHAM', // ngư lôi hạm
    'NHAGIUTRE', // nhà giữ trẻ
    'NHUOCDIEM', // nhược điểm
    'PHANQUYET', // phán quyết
    'PHATCUONG', // phát cuồng
    'PHATDUONG', // phật đường
    'PHATLUONG', // phát lương
    'PHATNGUOI', // phạt nguội
    'PHIEMLUAN', // phiếm luận
    'PHOMAIQUE', // phô mai que
    'PHUCTRANG', // phục trang
    'PHUONGSAI', // phương sai
    'QUANPHIET', // quân phiệt
    'QUYETDINH', // quyết định
    'QUYETDOAN', // quyết đoán
    'QUYETNGHI', // quyết nghị
    'QUYETSACH', // quyết sách
    'RANGCHIEU', // ráng chiều
    'RONGTUECH', // rỗng tuếch
    'SATNGHIEP', // sạt nghiệp
    'SOCPHANVE', // sốc phản vệ
    'SONGTRIEU', // sóng triều
    'TACNGHIEP', // tác nghiệp
    'TAMSINHLY', // tâm sinh lý
    'TAUDEMKHI', // tàu đệm khí
    'TAYPHUONG', // tây phương
    'THAIDUONG', // thái dương
    'THAMQUYEN', // thẩm quyền
    'THAMVIENG', // thăm viếng
    'THANGDIEM', // thang điểm
    'THANGMUOI', // tháng mười
    'THAOLUYEN', // thao luyện
    'THIENLYMA', // thiên lý mã
    'THIEPMUNG', // thiệp mừng
    'THIEUVANG', // thiếu vắng
    'THONGDIEP', // thông điệp
    'THUENGOAI', // thuê ngoài
    'THUOCVIEN', // thuốc viên
    'THUONGCAM', // thương cảm
    'THUONGCAP', // thượng cấp
    'THUONGDAI', // thượng đài
    'THUONGLAI', // thương lái
    'THUONGLAM', // thưởng lãm
    'THUONGMAI', // thương mại
    'THUVIENSO', // thư viện số
    'TICHDUONG', // tịch dương
    'TIEMCHUNG', // tiêm chủng
    'TIEMPHONG', // tiêm phòng
    'TONGDAILY', // tổng đại lý
    'TRAINGUOC', // trái ngược
    'TRAMHUONG', // trầm hương
    'TRANGBECH', // trắng bệch
    'TRANGDIEM', // trang điểm
    'TRANGPHUC', // trang phục
    'TRAOPHUNG', // trào phúng
    'TRAUKHONG', // trầu không
    'TRICHDANG', // trích đăng
    'TRICHDOAN', // trích đoạn
    'TRIEUCONG', // triều cống
    'TROCHUYEN', // trò chuyện
    'TRONGCHAU', // trống chầu
    'TRONGDIEM', // trọng điểm
    'TRONGSACH', // trong sạch
    'TRUNGDIEM', // trung điểm
    'TRUNGKHOI', // trùng khơi
    'TRUNGKHOP', // trùng khớp
    'TRUNGOPLA', // trứng ốp la
    'TRUONGKIP', // trưởng kíp
    'TRUYENCAM', // truyền cảm
    'TRUYENDAI', // truyện dài
    'TRUYENDAO', // truyền đạo
    'TUDIENHOC', // từ điển học
    'TUONGKHAC', // tương khắc
    'TUYENGIAO', // tuyên giáo
    'TUYENGIAP', // tuyến giáp
    'VATLIEUNO', // vật liệu nổ
    'VAYBUTCHI', // váy bút chì
    'VIEMXOANG', // viêm xoang
    'VIENGTHAM', // viếng thăm
    'XEDAPNUOC', // xe đạp nước
    'XEMCHITAY', // xem chỉ tay
    'XEMTHUONG', // xem thường
    'XEMUITRAN', // xe mui trần
    'XOAYCHIEU', // xoay chiều
    'XUONGCHAM', // xương chẩm
    'XUONGCHAY', // xương chày
    'XUONGPHIM' // xưởng phim
  ]);
})(typeof self !== 'undefined' ? self : globalThis);
