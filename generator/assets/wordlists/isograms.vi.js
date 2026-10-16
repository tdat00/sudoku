/**
 * Vietnamese key words for Wordoku (design.md section 8.5).
 *
 * Nine-letter isograms hardly exist in Vietnamese once the diacritics are counted, so every entry here is a
 * compound word or proper noun written WITHOUT diacritics and without spaces ("Bạch Dương" -> BACHDUONG,
 * "đ" -> D). Each one still has to be exactly 9 distinct letters A-Z; the comment shows the real spelling.
 * tests/suites/wordoku.test.js fails the build on an entry that is not.
 *
 * Valid entries are rare, so this list is allowed to be short or even empty: js/variants/wordoku.js falls
 * back to the English list (with a notice) when it holds fewer than `SG.wordoku.MIN_WORDS` entries.
 *
 * Plain data on `SG.wordlists.vi`, read lazily by js/variants/wordoku.js, so this file may load before or
 * after the variant.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};
  SG.wordlists = SG.wordlists || {};

  SG.wordlists.vi = Object.freeze([
    'BACHDUONG', // Bạch Dương (Aries)
    'BACHTUYEN', // name-style compound from design.md section 8.5
    'BAITULONG', // Bái Tử Long (bay in Quảng Ninh)
    'BUOMTRANG', // bướm trắng
    'CHATLUONG', // chất lượng
    'CHIEURONG', // chiều rộng
    'CHIEUSANG', // chiếu sáng
    'CHUNGLOAI', // chủng loại
    'CHUOTLANG', // chuột lang
    'CHUYENDOI', // chuyển đổi
    'CHUYENGIA', // chuyên gia
    'CHUYENTAM', // chuyên tâm
    'CHUYENTRO', // chuyện trò
    'DIAPHUONG', // địa phương
    'DIENTUHOC', // điện từ học
    'DIEUKHOAN', // điều khoản
    'DUONGLICH', // dương lịch
    'DUYETBINH', // duyệt binh
    'GIAODUYEN', // giao duyên
    'GIAOTUYEN', // giao tuyến
    'GIATRUYEN', // gia truyền
    'HOANGKIEM', // name-style compound from design.md section 8.5
    'KHUYENBAO', // khuyên bảo
    'KHUYENCAO', // khuyến cáo
    'KHUYENMAI', // khuyến mãi
    'KIEMCHUNG', // kiểm chứng
    'KINHDOTAY', // kinh độ Tây
    'LAPTRUONG', // lập trường
    'LOIKHUYEN', // lời khuyên
    'NGAYTRUOC', // ngày trước
    'NGHIEMTUC', // nghiêm túc
    'NGOITHUBA', // ngôi thứ ba
    'NGUYETLAO', // Nguyệt Lão
    'NHUOCDIEM', // nhược điểm
    'PHANQUYET', // phán quyết
    'PHUONGTAY', // phương Tây
    'QUYETDINH', // quyết định
    'QUYETNGHI', // quyết nghị
    'THAIDUONG', // thái dương
    'THAMQUYEN', // thẩm quyền
    'THAMVIENG', // thăm viếng
    'THANGMUOI', // tháng mười
    'THIENLYMA', // thiên lý mã
    'THONGDIEP', // thông điệp
    'THUOCVIEN', // thuốc viên
    'THUONGLAI', // thương lái
    'THUONGMAI', // thương mại
    'TIEMCHUNG', // tiêm chủng
    'TILEBANDO', // tỉ lệ bản đồ
    'TRAINGUOC', // trái ngược
    'TRANGBECH', // trắng bệch
    'TRANGDIEM', // trang điểm
    'TRANGPHUC', // trang phục
    'TRAUKHONG', // trầu không
    'TRIEUCONG', // triều cống
    'TRONGDIEM', // trọng điểm
    'TRONGSACH', // trong sạch
    'TRUNGBACH', // name-style compound from design.md section 8.5
    'TRUNGDIEM', // trung điểm
    'TRUYENCAM', // truyền cảm
    'TRUYENDAI', // truyện dài
    'TUONGKHAC', // tương khắc
    'XEDAPNUOC', // xe đạp nước
    'XEMTHUONG', // xem thường
    'XOAYCHIEU'  // xoay chiều
  ]);
})(typeof self !== 'undefined' ? self : globalThis);
