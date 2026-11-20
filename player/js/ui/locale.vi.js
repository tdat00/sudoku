/**
 * Vietnamese language pack: the shared strings of the player. Modules that own their strings add them through
 * `SG.localeFragments` instead (see js/ui/i18n.js). Keep the key set identical to locale.en.js. Placeholders
 * are `{name}` (for a technique, the `i18nArgs` of its findings); plural forms use `_one` / `_other`.
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};
  SG.locales = SG.locales || {};
  const pack = SG.locales.vi = SG.locales.vi || {};

  function add(section) {
    Object.keys(section).forEach(function (key) { pack[key] = section[key]; });
  }

  add({
    'app.title': 'Trình chơi Sudoku',
    'common.apply': 'Áp dụng',
    'common.auto': 'Tự động',
    'common.back': 'Quay lại',
    'common.cancel': 'Hủy',
    'common.close': 'Đóng',
    'common.copied': 'Đã sao chép',
    'common.copy': 'Sao chép',
    'common.default': 'Mặc định',
    'common.delete': 'Xóa',
    'common.download': 'Tải xuống',
    'common.error': 'Lỗi',
    'common.less': 'Thu gọn',
    'common.loading': 'Đang tải…',
    'common.more': 'Xem thêm',
    'common.next': 'Tiếp theo',
    'common.no': 'Không',
    'common.none': 'Không có',
    'common.off': 'Tắt',
    'common.ok': 'OK',
    'common.on': 'Bật',
    'common.previous': 'Trước đó',
    'common.random': 'Ngẫu nhiên',
    'common.reset': 'Đặt lại',
    'common.retry': 'Thử lại',
    'common.save': 'Lưu',
    'common.unknown': 'Không rõ',
    'common.warning': 'Cảnh báo',
    'common.yes': 'Có',
    'unit.cell_one': '{count} ô',
    'unit.cell_other': '{count} ô',
    'unit.clue_one': '{count} số cho sẵn',
    'unit.clue_other': '{count} số cho sẵn',
    'duration.h': '{h} giờ',
    'duration.hMin': '{h} giờ {min} phút',
    'duration.min': '{min} phút',
    'duration.minSec': '{min} phút {sec} giây',
    'duration.ms': '{value} ms',
    'duration.s': '{value} giây'
  });

  add({
    'variant.classic4': 'Sudoku Cổ điển 4×4',
    'variant.classic4.desc': 'Lưới 4×4 nhỏ gọn với các khối 2×2. Mỗi hàng, mỗi cột và mỗi khối chứa các ' +
      'chữ số từ 1 đến 4, mỗi số đúng một lần. Rất hợp cho người mới và trẻ em.',
    'variant.classic6': 'Sudoku Cổ điển 6×6',
    'variant.classic6.desc': 'Lưới 6×6 với các khối 2 hàng × 3 cột. Mỗi hàng, mỗi cột và mỗi khối chứa ' +
      'các chữ số từ 1 đến 6, mỗi số đúng một lần.',
    'variant.classic9': 'Sudoku Cổ điển 9×9',
    'variant.classic9.desc': 'Lưới 9×9 tiêu chuẩn với các khối 3×3. Mỗi hàng, mỗi cột và mỗi khối chứa ' +
      'các chữ số từ 1 đến 9, mỗi số đúng một lần.',
    'variant.diagonalX.desc': 'Luật cổ điển 9×9, đồng thời hai đường chéo chính cũng phải chứa đủ các chữ ' +
      'số từ 1 đến 9, mỗi số một lần.',
    'variant.hyper.desc': 'Luật cổ điển 9×9, đồng thời bốn vùng 3×3 được tô màu cũng phải chứa đủ các chữ ' +
      'số từ 1 đến 9, mỗi số một lần.',
    'variant.jigsaw9.desc': 'Giống Sudoku cổ điển, nhưng chín vùng là những hình ghép có dạng bất kỳ thay ' +
      'vì các khối 3×3.',
    'variant.killer.desc': 'Các lồng nét đứt ghi tổng cần đạt: các chữ số trong một lồng cộng lại bằng ' +
      'tổng đó và không lặp nhau. Hầu như không có chữ số cho sẵn.',
    'variant.greaterThan.desc': 'Các dấu so sánh giữa hai ô kề nhau cho biết ô nào lớn hơn. Kết hợp chúng ' +
      'với các luật thông thường để giải.',
    'variant.wordoku.desc': 'Sudoku 9×9 chơi bằng chín chữ cái thay cho chữ số. Khi giải xong, một từ ' +
      'khóa chín chữ cái sẽ hiện ra.',
    'difficulty.veryEasy': 'Rất dễ',
    'difficulty.veryEasy.desc': 'Nhiều số cho sẵn. Chỉ cần các nước đi đơn giản: ô một ứng viên và số đơn ' +
      'ẩn (Naked / Hidden Single).',
    'difficulty.easy': 'Dễ',
    'difficulty.easy.desc': 'Ít số cho sẵn hơn một chút. Thêm kỹ thuật ứng viên bị khóa: cặp chỉ hướng ' +
      '(Pointing) và loại trừ khối–hàng/cột.',
    'difficulty.normal': 'Trung bình',
    'difficulty.normal.desc': 'Thường dùng các cặp và bộ ba ứng viên (tập con trần và ẩn).',
    'difficulty.hard': 'Khó',
    'difficulty.hard.desc': 'Thường dùng bộ bốn ứng viên, các mẫu “cá” (X-Wing, Swordfish) và tô màu đơn giản.',
    'difficulty.expert': 'Chuyên gia',
    'difficulty.expert.desc': 'Thường dùng một kỹ thuật cánh (XY-Wing, XYZ-Wing), Jellyfish hoặc nhiều mẫu “cá”.',
    'difficulty.master': 'Bậc thầy',
    'difficulty.master.desc': 'Thường dùng nhiều kỹ thuật cánh, W-Wing hoặc Unique Rectangle, đôi khi một chuỗi ' +
      'suy luận ngắn.',
    'difficulty.nightmare': 'Ác mộng',
    'difficulty.nightmare.desc': 'Thường dùng chuỗi suy luận và thử–sai (Nishio), với rất ít số cho sẵn.',
    'difficulty.hell1': 'Địa ngục 1',
    'difficulty.hell1.desc': 'Thường dùng nhiều chuỗi suy luận và bước thử–sai.',
    'difficulty.hell2': 'Địa ngục 2',
    'difficulty.hell2.desc': 'Khoảng điểm cao nhất; thường cần nhiều suy luận nâng cao.',
    'variant.mega12': 'Sudoku Khổng lồ 12×12',
    'variant.mega12.desc': 'Lưới 12×12 với các khối 3 hàng × 4 cột. Mỗi hàng, mỗi cột và mỗi khối chứa đủ ' +
      '12 ký hiệu, mỗi ký hiệu đúng một lần.',
    'variant.mega16': 'Sudoku Quái vật 16×16',
    'variant.mega16.desc': 'Lưới 16×16 với các khối 4×4. Mỗi hàng, mỗi cột và mỗi khối chứa đủ 16 ký ' +
      'hiệu, mỗi ký hiệu đúng một lần.',
    'variant.diagonalX': 'Sudoku Đường chéo (X)',
    'variant.hyper': 'Sudoku Siêu vùng',
    'variant.jigsaw9': 'Sudoku Ghép hình',
    'variant.killer': 'Sudoku Sát thủ',
    'variant.greaterThan': 'Sudoku So sánh',
    'variant.samurai': 'Sudoku Samurai',
    'variant.samurai.desc': 'Năm lưới 9×9 chồng lên nhau: lưới giữa dùng chung một khối 3×3 với mỗi lưới ở ' +
      'góc (369 ô).',
    'variant.sohei': 'Sudoku Sohei',
    'variant.sohei.desc': 'Bốn lưới 9×9 xếp thành vòng: mỗi lưới dùng chung một khối 3×3 với hai lưới kề ' +
      'bên (288 ô).',
    'variant.butterfly': 'Sudoku Cánh bướm',
    'variant.butterfly.desc': 'Bốn lưới 9×9 lệch nhau một khối, chồng lên vùng trung tâm 6×6 (144 ô).',
    'variant.flower': 'Sudoku Bông hoa',
    'variant.flower.desc': 'Năm lưới 9×9: bốn cánh hoa quanh một lưới trung tâm, chồng lên nhau rất dày ' +
      '(189 ô).',
    'variant.wordoku': 'Sudoku Chữ'
  });

  // Board vocabulary

  add({
    'unitKind.box': 'khối',
    'unitKind.cage': 'lồng',
    'unitKind.col': 'cột',
    'unitKind.diag': 'đường chéo',
    'unitKind.region': 'vùng',
    'unitKind.row': 'hàng',
    'unitKind.window': 'vùng siêu',
    'symbolMode.digits': 'Chữ số',
    'symbolMode.letters': 'Chữ cái',
    'symbolMode.colors': 'Màu sắc',
    'symbolMode.shapes': 'Hình dạng',
    'symbolMode.word': 'Chữ của từ khóa'
  });

  // Techniques: names, descriptions and the sentence of one step

  add({
    'techniqueGroup.basic': 'Số đơn',
    'techniqueGroup.locked': 'Ứng viên bị khóa',
    'techniqueGroup.subset': 'Cặp, bộ ba và bộ bốn',
    'techniqueGroup.fish': 'Cá và tô màu',
    'techniqueGroup.wing': 'Cánh (Wing)',
    'techniqueGroup.chain': 'Chuỗi và thử–sai',
    'techniqueGroup.cage': 'Luật lồng',
    'techniqueGroup.ineq': 'Luật so sánh',
    'technique.nakedSingle': 'Ô một ứng viên (Naked Single)',
    'technique.nakedSingle.desc': 'Một ô chỉ còn đúng một ứng viên thì ô đó phải mang chữ số ấy.',
    'technique.hiddenSingleBox': 'Số đơn ẩn trong khối (Hidden Single)',
    'technique.hiddenSingleBox.desc': 'Nếu một chữ số chỉ có thể nằm ở một ô trong khối (hoặc vùng, đường ' +
      'chéo, vùng siêu), thì nó thuộc về ô đó.',
    'technique.hiddenSingleLine': 'Số đơn ẩn trong hàng/cột (Hidden Single)',
    'technique.hiddenSingleLine.desc': 'Nếu một chữ số chỉ có thể nằm ở một ô trong hàng hoặc cột, thì nó ' +
      'thuộc về ô đó.',
    'technique.pointing': 'Cặp/bộ ba chỉ hướng (Pointing)',
    'technique.pointing.desc': 'Khi một chữ số trong khối chỉ có thể nằm trên một hàng hoặc một cột, ta ' +
      'loại chữ số đó khỏi phần còn lại của hàng hoặc cột ấy.',
    'technique.boxLine': 'Loại trừ khối–hàng/cột (Box/Line)',
    'technique.boxLine.desc': 'Khi một chữ số trong hàng hoặc cột chỉ có thể nằm trong một khối, ta loại ' +
      'chữ số đó khỏi phần còn lại của khối ấy.',
    'technique.nakedPair': 'Cặp trần (Naked Pair)',
    'technique.nakedPair.desc': 'Hai ô trong cùng một nhóm chỉ còn chung đúng hai ứng viên thì phải chứa ' +
      'hai chữ số đó, nên ta loại chúng khỏi các ô còn lại của nhóm.',
    'technique.hiddenPair': 'Cặp ẩn (Hidden Pair)',
    'technique.hiddenPair.desc': 'Hai chữ số chỉ có thể nằm trong cùng hai ô của một nhóm thì phải lấp ' +
      'đầy hai ô đó, nên ta loại mọi ứng viên khác khỏi hai ô này.',
    'technique.nakedTriple': 'Bộ ba trần (Naked Triple)',
    'technique.nakedTriple.desc': 'Ba ô trong cùng một nhóm mà ứng viên chỉ gồm cùng ba chữ số thì phải ' +
      'chứa ba chữ số đó, nên ta loại chúng khỏi các ô còn lại của nhóm.',
    'technique.lawOfLeftovers': 'Luật phần dư (Law of Leftovers)',
    'technique.lawOfLeftovers.desc': 'Trong Jigsaw, một hoặc hai hàng (hoặc cột) trọn vẹn không có ô chung ' +
      'chứa mỗi chữ số một lần trên mỗi hàng, và số vùng trọn vẹn không có ô chung bằng đúng số đó cũng vậy. ' +
      'Bỏ đi những ô mà các hàng và các vùng dùng chung: các ô còn lại của các hàng và các ô còn lại của ' +
      'các vùng (từ một đến bốn ô mỗi phía) phải chứa cùng các chữ số, tính cả chữ số lặp và chữ số đã ' +
      'điền. Ứng viên nào không thuộc một cách điền nào làm hai phía giống nhau thì bị loại.',
    'technique.hiddenTriple': 'Bộ ba ẩn (Hidden Triple)',
    'technique.hiddenTriple.desc': 'Ba chữ số chỉ có thể nằm trong cùng ba ô của một nhóm thì phải lấp ' +
      'đầy ba ô đó, nên ta loại mọi ứng viên khác khỏi các ô này.',
    'technique.nakedQuad': 'Bộ bốn trần (Naked Quad)',
    'technique.nakedQuad.desc': 'Bốn ô trong cùng một nhóm mà ứng viên chỉ gồm cùng bốn chữ số thì phải ' +
      'chứa bốn chữ số đó, nên ta loại chúng khỏi các ô còn lại của nhóm.',
    'technique.hiddenQuad': 'Bộ bốn ẩn (Hidden Quad)',
    'technique.hiddenQuad.desc': 'Bốn chữ số chỉ có thể nằm trong cùng bốn ô của một nhóm thì phải lấp ' +
      'đầy bốn ô đó, nên ta loại mọi ứng viên khác khỏi các ô này.',
    'technique.xWing': 'X-Wing (cánh X)',
    'technique.xWing.desc': 'Khi một chữ số chỉ có hai ô khả dĩ trên mỗi hàng trong hai hàng, và các ô đó ' +
      'nằm trong cùng hai cột, ta loại chữ số đó khỏi phần còn lại của hai cột ấy (tương tự khi đổi vai ' +
      'trò hàng và cột).',
    'technique.skyscraper': 'Skyscraper (nhà chọc trời)',
    'technique.skyscraper.desc': 'Hai hàng (hoặc hai cột) mà trong mỗi hàng một chữ số chỉ có hai ô khả dĩ, ' +
      'và một ô của mỗi hàng nằm trong cùng một cột (hoặc hàng). Hai ô đó nhìn thấy nhau nên không thể ' +
      'cùng chứa chữ số này: ít nhất một trong hai ô còn lại chứa nó, và chữ số bị loại khỏi mọi ô nhìn ' +
      'thấy cả hai ô ấy.',
    'technique.twoStringKite': 'Two-String Kite (diều hai dây)',
    'technique.twoStringKite.desc': 'Một hàng và một cột mà trong mỗi đường một chữ số chỉ có hai ô khả dĩ, ' +
      'và một ô của hàng cùng một ô của cột nằm trong cùng một khối (hoặc vùng). Hai ô đó nhìn thấy nhau ' +
      'nên không thể cùng chứa chữ số này: ít nhất một trong hai ô còn lại chứa nó, và chữ số bị loại khỏi ' +
      'mọi ô nhìn thấy cả hai ô ấy.',
    'technique.simpleColouring': 'Tô màu đơn giản (Simple Colouring)',
    'technique.simpleColouring.desc': 'Các ô nối nhau bằng quan hệ “hoặc ô này hoặc ô kia” cho một chữ số ' +
      'được tô bằng hai màu. Chỉ một màu là đúng, từ đó lộ ra những ô không thể chứa chữ số đó.',
    'technique.emptyRectangle': 'Empty Rectangle (hình chữ nhật rỗng)',
    'technique.emptyRectangle.desc': 'Trong một khối (hoặc vùng) một chữ số chỉ có thể nằm trong một hàng và ' +
      'một cột của khối, thành hai phần không có ô chung. Một cặp ô ngoài khối là hai ô duy nhất có thể chứa ' +
      'chữ số trong cùng một nhóm sẽ quyết định: nếu đầu nhìn thấy mọi chữ số của một phần chứa nó thì phần ' +
      'đó mất chữ số và phần còn lại chứa nó; nếu không thì đầu kia chứa nó. Dù thế nào, chữ số bị loại khỏi ' +
      'mọi ô nhìn thấy cả phần còn lại lẫn đầu kia.',
    'technique.finnedXWing': 'Finned X-Wing (cánh X có vây)',
    'technique.finnedXWing.desc': 'Một X-Wing mà các đường gốc có thêm những ô chứa chữ số, gọi là vây, nằm ' +
      'cùng trong một khối hoặc vùng và ngoài hai đường phủ. Nếu không vây nào chứa chữ số thì các đường gốc ' +
      'lấp đầy hai đường phủ như X-Wing; nếu một vây chứa nó thì chữ số bị loại khỏi mọi ô nhìn thấy vây đó. ' +
      'Dù thế nào, chữ số cũng bị loại khỏi mọi ô của đường phủ, nằm ngoài các đường gốc, nhìn thấy tất cả ' +
      'các vây. Đường gốc chỉ có một ô trên các đường phủ (sashimi) hoạt động y như vậy. Tương tự khi đổi vai ' +
      'trò hàng và cột.',
    'technique.swordfish': 'Swordfish (cá kiếm)',
    'technique.swordfish.desc': 'Phiên bản ba đường của X-Wing: chữ số chỉ nằm trong cùng ba cột ở ba ' +
      'hàng thì bị loại khỏi phần còn lại của ba cột đó.',
    'technique.finnedSwordfish': 'Finned Swordfish (cá kiếm có vây)',
    'technique.finnedSwordfish.desc': 'Một Swordfish mà các đường gốc có thêm những ô chứa chữ số, gọi là vây, ' +
      'nằm cùng trong một khối hoặc vùng và ngoài ba đường phủ. Nếu không vây nào chứa chữ số thì các đường ' +
      'gốc lấp đầy ba đường phủ như Swordfish; nếu một vây chứa nó thì chữ số bị loại khỏi mọi ô nhìn thấy ' +
      'vây đó. Dù thế nào, chữ số cũng bị loại khỏi mọi ô của đường phủ, nằm ngoài các đường gốc, nhìn thấy ' +
      'tất cả các vây. Một đường gốc có thể có ít hơn ba ô trên các đường phủ, miễn là có ít nhất một ô. ' +
      'Tương tự khi đổi vai trò hàng và cột.',
    'technique.remotePairs': 'Remote Pairs (cặp từ xa)',
    'technique.remotePairs.desc': 'Một chuỗi các ô cùng chỉ có hai ứng viên giống nhau, mỗi ô nhìn thấy ô kế ' +
      'tiếp. Hai ô liền nhau trong chuỗi nhận hai chữ số khác nhau, nên hai chữ số xen kẽ dọc theo chuỗi. ' +
      'Khi chuỗi có số liên kết lẻ, từ ba trở lên, hai đầu chuỗi chứa hai chữ số khác nhau, tức là cùng dùng ' +
      'hết cả hai chữ số, nên cả hai chữ số bị loại khỏi mọi ô khác nhìn thấy cả hai đầu.',
    'technique.xyWing': 'XY-Wing',
    'technique.xyWing.desc': 'Ô trục có hai ứng viên nhìn thấy hai ô càng, mỗi ô càng chung một ứng viên ' +
      'với ô trục. Dù ô trục nhận giá trị nào thì một ô càng cũng chứa chữ số chung, nên chữ số đó bị ' +
      'loại khỏi mọi ô nhìn thấy cả hai ô càng.',
    'technique.xyzWing': 'XYZ-Wing',
    'technique.xyzWing.desc': 'Giống XY-Wing nhưng ô trục có ba ứng viên: chữ số chung bị loại khỏi mọi ô ' +
      'nhìn thấy ô trục và cả hai ô càng.',
    'technique.wxyzWing': 'WXYZ-Wing',
    'technique.wxyzWing.desc': 'Bốn ô chỉ chứa bốn chữ số giữa chúng. Ba chữ số bị hạn chế: các ô chứa một ' +
      'trong số đó đều nhìn thấy nhau, nên chữ số ấy chỉ đặt được vào một trong bốn ô. Chữ số thứ tư là chữ ' +
      'số duy nhất mà hai ô chứa nhưng không nhìn thấy nhau. Ba chữ số hạn chế chỉ điền được tối đa ba trong ' +
      'bốn ô, nên chữ số thứ tư phải nằm trong một ô chứa nó, và bị loại khỏi mọi ô khác nhìn thấy tất cả ' +
      'các ô chứa nó.',
    'technique.jellyfish': 'Jellyfish (sứa)',
    'technique.jellyfish.desc': 'Phiên bản bốn đường của X-Wing: chữ số chỉ nằm trong cùng bốn cột ở bốn ' +
      'hàng thì bị loại khỏi phần còn lại của bốn cột đó.',
    'technique.wWing': 'W-Wing',
    'technique.wWing.desc': 'Hai ô có cùng hai ứng viên, nối với nhau bằng một liên kết mạnh trên một chữ ' +
      'số: chữ số còn lại bị loại khỏi mọi ô nhìn thấy cả hai ô.',
    'technique.uniqueRectangle': 'Hình chữ nhật duy nhất (Unique Rectangle)',
    'technique.uniqueRectangle.desc': 'Một đề chỉ có đúng một lời giải, nên bốn ô trong hai hàng, hai cột ' +
      'và hai khối không thể chỉ còn cùng hai ứng viên. Điều này buộc phải loại thêm một ứng viên.',
    'technique.bugPlusOne': 'BUG+1 (ô thừa một ứng viên)',
    'technique.bugPlusOne.desc': 'Mọi ô trống đều có hai ứng viên, trừ một ô có ba ứng viên, và mỗi chữ số ' +
      'còn phải điền trong một hàng, một cột, một khối hay bất kỳ vùng nào khác đều có đúng hai ô để điền, ' +
      'khi bỏ ứng viên thừa của ô có ba ứng viên. Một vị trí như vậy không có lời giải hoặc có ít nhất hai ' +
      'lời giải. Đề có đúng một lời giải, nên ô có ba ứng viên phải là chữ số thừa đó.',
    'technique.xyChain': 'Chuỗi XY (XY-Chain)',
    'technique.xyChain.desc': 'Chuỗi các ô mà mỗi ô chỉ còn đúng hai ứng viên. Hai ô liền nhau trong chuỗi ' +
      'nhìn thấy nhau và có chung một chữ số, nên nếu một đầu chuỗi không phải chữ số đó thì đầu kia phải ' +
      'là chữ số đó. Ít nhất một đầu chuỗi chứa chữ số này, và ô nhìn thấy cả hai đầu không thể chứa nó.',
    'technique.forcingChain': 'Chuỗi suy luận (Forcing Chain)',
    'technique.forcingChain.desc': 'Chuỗi các suy luận kiểu “nếu thế này thì thế kia”, chứng minh một ứng ' +
      'viên là sai (hoặc một chữ số là đúng). Nếu một bước chứng minh biểu diễn một nhóm, bước đó liệt kê ' +
      'các ô còn có thể chứa cùng một chữ số tại giao của một khối (hoặc vùng) với một hàng hoặc cột. Nhóm ' +
      'đúng khi có ít nhất một ô của nhóm chứa chữ số đó, viết (R1C1=5 \u2228 R1C2=5), và sai khi không ô ' +
      'nào của nhóm chứa nó, viết (R1C1\u22605 \u2227 R1C2\u22605); nhóm đúng không cho biết ô nào chứa ' +
      'chữ số. Ứng viên bị loại theo quy tắc hai đầu phải xung đột với từng ứng viên được biểu diễn ở mỗi ' +
      'đầu. Chuỗi chỉ được tìm đến một độ dài giới hạn, nên gợi ý không cam kết tìm ra mọi chuỗi.',
    'technique.alsXz': 'ALS-XZ (tập gần khóa)',
    'technique.alsXz.desc': 'Tập gần khóa là một số ô của cùng một vùng mà tổng số chữ số ứng viên của ' +
      'chúng nhiều hơn số ô đúng một, nên chúng chứa đủ các chữ số đó trừ một chữ số. Lấy hai tập như vậy ' +
      'không có ô chung và một chữ số X mà cả hai tập đều có thể chứa, sao cho mọi ô chứa X của tập này ' +
      'đều nhìn thấy mọi ô chứa X của tập kia. Hai tập không thể cùng chứa X, nên một trong hai tập thiếu ' +
      'X và chứa đủ mọi chữ số còn lại. Chữ số Z mà cả hai tập đều có thể chứa vì thế nằm trong một trong ' +
      'hai tập, và ô nhìn thấy mọi ô chứa Z của cả hai tập không thể chứa Z.',
    'technique.sueDeCoq': 'Sue de Coq (giao của hàng/cột và khối)',
    'technique.sueDeCoq.desc': 'Sue de Coq dùng ở chỗ một hàng hoặc cột cắt một khối hoặc vùng, trên hai ' +
      'hoặc ba ô còn trống của chỗ giao. Các ô đó cùng có thể chứa một số chữ số. Lấy một tập gần khóa ' +
      'nằm trong hàng hoặc cột ngoài khối và một tập gần khóa nằm trong khối ngoài hàng hoặc cột, hai tập ' +
      'không có chữ số chung và đều nằm trong các chữ số của chỗ giao, sao cho số chữ số của chỗ giao ' +
      'đúng bằng tổng số ô của chỗ giao và của hai tập. Khi đó chỗ giao chứa chữ số mà mỗi tập còn thiếu ' +
      'và mọi chữ số không thuộc tập nào. Vì vậy mọi chữ số của tập thứ nhất được dùng trong hàng hoặc ' +
      'cột, mọi chữ số của tập thứ hai được dùng trong khối, và mọi chữ số còn lại nằm ở chỗ giao, tức ' +
      'là nằm trong cả hai. Nhờ đó loại được các chữ số của tập thứ nhất khỏi phần còn lại của hàng hoặc ' +
      'cột, các chữ số của tập thứ hai khỏi phần còn lại của khối, và chữ số còn lại khỏi phần còn lại ' +
      'của cả hai.',
    'technique.forcingChainLong': 'Chuỗi suy luận dài (Long Forcing Chain)',
    'technique.forcingChainLong.desc': 'Cùng loại chuỗi với Chuỗi suy luận nhưng quá dài so với nó: chuỗi ' +
      'ngắn nhất dùng được có nhiều liên kết hơn mức Chuỗi suy luận thường cho phép (tối đa 12 liên kết). ' +
      'Nếu một bước chứng minh biểu diễn một nhóm, ý nghĩa đúng và sai của nhóm giống như trong Chuỗi suy ' +
      'luận. Ứng viên bị loại theo quy tắc hai đầu phải xung đột với từng ứng viên được biểu diễn ở mỗi ' +
      'đầu. Gợi ý không cam kết tìm ra mọi chuỗi.',
    'technique.nishio': 'Nishio (thử–sai)',
    'technique.nishio.desc': 'Thử–sai có giới hạn: giả sử một ứng viên là đúng; nếu các suy luận đơn giản ' +
      'sau đó dẫn đến mâu thuẫn thì ứng viên ấy là sai.',
    'technique.nishioDeep': 'Nishio sâu (thử–sai trong thử–sai)',
    'technique.nishioDeep.desc': 'Thử–sai hai tầng: giả sử một ứng viên là đúng; nếu các suy luận đơn giản, ' +
      'cùng với thêm một phép thử–sai nữa bên trong giả thiết đó, dẫn đến mâu thuẫn thì ứng viên ấy là ' +
      'sai. Chỉ dùng khi một phép thử đơn không đủ.',
    'technique.cageCombo.desc': 'Các chữ số trong một lồng đều khác nhau và cộng lại bằng tổng của lồng, ' +
      'nên thường chỉ còn vài tổ hợp khả dĩ.',
    'technique.ruleOf45.desc': 'Mỗi hàng, cột và khối có tổng bằng 45, nhiều nhóm cùng loại gộp lại thì ' +
      'mỗi nhóm 45. Các lồng nằm trọn trong một nhóm cho biết tổng của những ô còn lại; các lồng nhô ' +
      'ra khỏi nhóm cho biết tổng của những ô ngay bên ngoài.',
    'technique.cageSplit.desc': 'Một lồng nhô ra khỏi hàng, cột hoặc khối thì tách thành phần bên trong ' +
      'và phần bên ngoài, mỗi phần có tổng riêng.',
    'technique.nakedSingle.step': 'Ô {cell} chỉ còn đúng một ứng viên là {digit}, nên ô này là {digit}.',
    'technique.hiddenSingleBox.step': 'Trong {unitKind} {unit}, chữ số {digit} chỉ còn một ô để đặt: ' +
      '{cell}. Vậy {cell} là {digit}.',
    'technique.hiddenSingleLine.step': 'Trong {unitKind} {unit}, chữ số {digit} chỉ còn một ô để đặt: ' +
      '{cell}. Vậy {cell} là {digit}.',
    'technique.pointing.step': 'Trong {box}, chữ số {digit} chỉ có thể nằm ở {count} ô, và các ô này đều ' +
      'thuộc {line}. Vì vậy {digit} của {box} phải nằm trên {line}, và được loại khỏi các ô còn lại của ' +
      '{line}.',
    'technique.boxLine.step': 'Trên {line}, chữ số {digit} chỉ có thể nằm ở {count} ô, và các ô này đều ' +
      'thuộc {box}. Vì vậy {digit} của {line} phải nằm trong {box}, và được loại khỏi các ô còn lại của ' +
      '{box}.',
    'technique.nakedPair.step': 'Trong {unitKind} {unit}, hai ô {cells} chỉ có thể chứa các chữ số ' +
      '{digits}. Các chữ số này thuộc về hai ô đó, nên được loại khỏi các ô còn lại của {unit}.',
    'technique.nakedTriple.step': 'Trong {unitKind} {unit}, ba ô {cells} chỉ có thể chứa các chữ số ' +
      '{digits}. Các chữ số này thuộc về ba ô đó, nên được loại khỏi các ô còn lại của {unit}.',
    'technique.lawOfLeftovers.step': 'Luật phần dư: các hàng/cột {lines} và các vùng {regions} đều trọn vẹn ' +
      'và trong mỗi nhóm không có hai đơn vị nào chung ô, nên mỗi nhóm chứa mỗi chữ số đúng bằng số đơn vị ' +
      'của nhóm. Bỏ đi những ô mà các hàng/cột và các vùng dùng chung. Các ô còn lại, {cells}, chia thành ' +
      'hai phía, một phía từ các hàng/cột và một phía từ các vùng, và hai phía phải chứa cùng các chữ số, ' +
      'tính cả chữ số lặp. Ở ô nào mà mọi cách điền hai phía giống nhau đều không đặt một trong các chữ số ' +
      '{digits} vào đó, chữ số ấy bị loại khỏi ô.',
    'technique.nakedQuad.step': 'Trong {unitKind} {unit}, bốn ô {cells} chỉ có thể chứa các chữ số ' +
      '{digits}. Các chữ số này thuộc về bốn ô đó, nên được loại khỏi các ô còn lại của {unit}.',
    'technique.hiddenPair.step': 'Trong {unitKind} {unit}, các chữ số {digits} chỉ có thể nằm ở hai ô ' +
      '{cells}. Hai ô này phải chứa đúng các chữ số đó, nên mọi ứng viên khác bị loại khỏi chúng.',
    'technique.hiddenTriple.step': 'Trong {unitKind} {unit}, các chữ số {digits} chỉ có thể nằm ở ba ô ' +
      '{cells}. Ba ô này phải chứa đúng các chữ số đó, nên mọi ứng viên khác bị loại khỏi chúng.',
    'technique.hiddenQuad.step': 'Trong {unitKind} {unit}, các chữ số {digits} chỉ có thể nằm ở bốn ô ' +
      '{cells}. Bốn ô này phải chứa đúng các chữ số đó, nên mọi ứng viên khác bị loại khỏi chúng.',
    'technique.xWing.step': 'X-Wing cho {digit}: trong {baseUnits}, chữ số {digit} chỉ có thể nằm ở ' +
      '{coverUnits}. Hai chữ số {digit} của các đường gốc lấp đầy cả hai đường phủ, nên {digit} bị loại ' +
      'khỏi mọi ô còn lại của {coverUnits}.',
    'technique.skyscraper.step': 'Skyscraper cho {digit}: trong {lines}, chữ số {digit} mỗi đường chỉ có thể ' +
      'nằm ở hai ô, và một ô của mỗi đường nằm chung trên một đường khác, nên hai ô đó không thể cùng là ' +
      '{digit}. Ít nhất một trong hai ô còn lại, {ends}, là {digit}, nên {digit} bị loại khỏi mọi ô khác ' +
      'nhìn thấy cả hai ô đó.',
    'technique.twoStringKite.step': 'Two-String Kite cho {digit}: trong {lines}, chữ số {digit} mỗi đường chỉ có ' +
      'thể nằm ở hai ô, và các ô {bridge} (cầu nối) nằm trong cùng một khối (hoặc vùng), nên chúng không thể ' +
      'cùng là {digit}. Ít nhất một trong hai ô còn lại, {ends}, là {digit}, nên {digit} bị loại khỏi mọi ô ' +
      'khác nhìn thấy cả hai ô đó.',
    'technique.emptyRectangle.step': 'Empty Rectangle cho {digit}: trong {box}, chữ số {digit} chỉ có thể nằm ở ' +
      'các ô của {lines}, thành hai phần không có ô chung. {ends} là hai ô duy nhất có thể chứa {digit} trong ' +
      'cùng một nhóm, nên một trong hai ô đó là {digit}. Nếu đầu nhìn thấy mọi {digit} của một phần là ' +
      '{digit}, phần đó mất {digit} và phần còn lại chứa {digit}; nếu không thì đầu kia là {digit}. Dù thế ' +
      'nào, {digit} bị loại khỏi mọi ô khác nhìn thấy cả phần còn lại lẫn đầu kia.',
    'technique.finnedXWing.step': 'Finned X-Wing cho {digit}: trong {bases}, chữ số {digit} chỉ có thể nằm ở ' +
      '{covers}, trừ các ô vây {fins} cùng nằm trong một khối hoặc vùng. Nếu không ô vây nào là {digit} thì ' +
      'hai chữ số {digit} của các đường gốc lấp đầy cả hai đường phủ; nếu một ô vây là {digit} thì nó loại ' +
      '{digit} khỏi mọi ô nhìn thấy nó. Dù thế nào, {digit} cũng bị loại khỏi mọi ô của {covers} nằm ngoài ' +
      'các đường gốc {bases} và nhìn thấy tất cả các ô vây.',
    'technique.swordfish.step': 'Swordfish cho {digit}: trong {baseUnits}, chữ số {digit} chỉ có thể nằm ' +
      'ở {coverUnits}. Ba chữ số {digit} của các đường gốc lấp đầy cả ba đường phủ, nên {digit} bị loại ' +
      'khỏi mọi ô còn lại của {coverUnits}.',
    'technique.finnedSwordfish.step': 'Finned Swordfish cho {digit}: trong {bases}, chữ số {digit} chỉ có thể ' +
      'nằm ở {covers}, trừ các ô vây {fins} cùng nằm trong một khối hoặc vùng. Nếu không ô vây nào là ' +
      '{digit} thì ba chữ số {digit} của các đường gốc lấp đầy cả ba đường phủ; nếu một ô vây là {digit} ' +
      'thì nó loại {digit} khỏi mọi ô nhìn thấy nó. Dù thế nào, {digit} cũng bị loại khỏi mọi ô của ' +
      '{covers} nằm ngoài các đường gốc {bases} và nhìn thấy tất cả các ô vây.',
    'technique.jellyfish.step': 'Jellyfish cho {digit}: trong {baseUnits}, chữ số {digit} chỉ có thể nằm ' +
      'ở {coverUnits}. Bốn chữ số {digit} của các đường gốc lấp đầy cả bốn đường phủ, nên {digit} bị loại ' +
      'khỏi mọi ô còn lại của {coverUnits}.',
    'technique.simpleColouring.step': 'Tô màu đơn giản cho {digit}: các ô nối nhau bằng quan hệ “hoặc ô ' +
      'này hoặc ô kia” được tô hai màu. Màu 1: {colour1}. Màu 2: {colour2}. Chỉ một màu chứa chữ số này, ' +
      'từ đó loại {digit} khỏi những ô không thể là nó.',
    'technique.simpleColouring.step.wrap': 'Tô màu đơn giản cho {digit} (xung đột màu): màu 1 là ' +
      '{colour1}, màu 2 là {colour2}. Hai ô cùng màu {falseColour} nhìn thấy nhau ({witness}), nên màu đó ' +
      'không thể là màu đúng. {digit} bị loại khỏi mọi ô màu {falseColour}.',
    'technique.simpleColouring.step.trap': 'Tô màu đơn giản cho {digit} (bẫy màu): màu 1 là {colour1}, ' +
      'màu 2 là {colour2}. Một trong hai màu chứa chữ số này, mà một ô ngoài chuỗi lại nhìn thấy cả hai ' +
      'màu, nên ô đó không thể là {digit}. {digit} bị loại khỏi những ô như vậy.',
    'technique.remotePairs.step': 'Remote Pairs {digits}: một chuỗi {length} liên kết nối {ends}, và mọi ô trong ' +
      'chuỗi chỉ chứa {digits}. Hai ô liền nhau trong chuỗi nhận hai chữ số khác nhau nên các chữ số xen kẽ ' +
      'dọc theo chuỗi; vì số liên kết là số lẻ, hai đầu nhận hai chữ số khác nhau, tức là cùng dùng hết cả hai ' +
      'chữ số {digits}. Cả hai chữ số bị loại khỏi mọi ô khác nhìn thấy cả hai đầu ({ends}).',
    'technique.xyWing.step': 'XY-Wing: ô trục {pivot} chứa {digitX} hoặc {digitY}; ô càng {pincer1} chứa ' +
      '{digitX} hoặc {digit}; ô càng {pincer2} chứa {digitY} hoặc {digit}. Dù ô trục nhận chữ số nào thì ' +
      'một trong hai ô càng cũng phải là {digit}, nên {digit} bị loại khỏi mọi ô nhìn thấy cả hai ô càng.',
    'technique.xyzWing.step': 'XYZ-Wing: ô trục {pivot} chứa {digitX}, {digitY} hoặc {digit}; ô càng ' +
      '{pincer1} chứa {digitX} hoặc {digit}; ô càng {pincer2} chứa {digitY} hoặc {digit}. Một trong ba ô ' +
      'này phải là {digit}, nên {digit} bị loại khỏi mọi ô nhìn thấy cả ba ô.',
    'technique.wxyzWing.step': 'WXYZ-Wing trên {digits}: các ô {cells} không chứa chữ số nào khác. Mọi chữ ' +
      'số ngoài {digit} chỉ xuất hiện trong các ô nhìn thấy nhau, nên chỉ đặt được vào nhiều nhất một trong ' +
      'bốn ô. Ba chữ số điền được tối đa ba ô, nên một trong các ô chứa {digit} phải là {digit}. {digit} bị ' +
      'loại khỏi mọi ô khác nhìn thấy tất cả các ô của mẫu hình chứa {digit}.',
    'technique.wWing.step': 'W-Wing: {cell1} và {cell2} đều chỉ chứa {digitX} hoặc {digit} và không nhìn ' +
      'thấy nhau. Một liên kết mạnh trên {digitX} trong {unit} ({link1} và {link2}) nối hai ô này, nên ' +
      'một trong hai ô phải là {digit}. {digit} bị loại khỏi mọi ô nhìn thấy cả hai.',
    'technique.uniqueRectangle.type1.step': 'Hình chữ nhật duy nhất: ba góc chỉ chứa {digitX} và {digitY}. ' +
      'Nếu {cell} cũng chỉ chứa hai chữ số đó thì đề sẽ có hai lời giải. Vậy {digitX} và {digitY} bị loại ' +
      'khỏi {cell}.',
    'technique.uniqueRectangle.type2.step': 'Hình chữ nhật duy nhất: hai góc chỉ chứa {digitX} và ' +
      '{digitY}; hai góc còn lại, {roof1} và {roof2}, còn chứa thêm {digit}. Để tránh hai lời giải, một ' +
      'trong hai ô đó phải là {digit}, nên {digit} bị loại khỏi mọi ô nhìn thấy cả hai.',
    'technique.uniqueRectangle.type3.step': 'Hình chữ nhật duy nhất: hai góc không phải {roof1} và {roof2} ' +
      'chỉ chứa {digits}. Để tránh hai lời giải, {roof1} hoặc {roof2} phải chứa một chữ số không thuộc ' +
      '{digits}, và mọi chữ số như vậy đều là một trong {partDigits}. Trong {unit}, ô đó cùng các ô {cells}, vốn ' +
      'chỉ chứa các chữ số của {partDigits}, có số ô bằng số chữ số của {partDigits}, nên chúng dùng hết các ' +
      'chữ số đó. Loại {partDigits} khỏi các ô của {unit}, trừ cả {roof1}, {roof2} và các ô {cells}.',
    'technique.uniqueRectangle.type4.step': 'Hình chữ nhật duy nhất: hai góc không phải {roof1} và {roof2} ' +
      'chỉ chứa {digits}. Trong {unit}, {roof1} và {roof2} là hai ô duy nhất còn có thể là chữ số của ' +
      '{digits} khác {digit}, nên một trong hai ô đó là chữ số ấy. Ô còn lại cũng không thể là {digit}, vì ' +
      'khi đó cả bốn góc chỉ chứa {digits} và đề sẽ có hai lời giải. Vậy {digit} bị loại khỏi cả {roof1} và ' +
      '{roof2}.',
    'technique.uniqueRectangle.hidden.step': 'Hình chữ nhật duy nhất, dạng ẩn: các góc {cells} đều chứa {digits}, ' +
      'và ít nhất một góc trong số đó chỉ chứa {digits}. Trong hàng và trong cột của góc đối diện với góc ấy, ' +
      '{digit} chỉ có hai vị trí: chính góc đối diện và một trong hai góc còn lại. Nếu góc đối diện là chữ số của ' +
      '{digits} khác {digit}, cả hai góc còn lại đều phải là {digit}, và góc chỉ chứa {digits} cũng phải là chữ số ' +
      'kia. ' +
      'Khi đó bốn góc chứa {digits} theo hai cách hoán đổi được cho nhau và đề sẽ có hai lời giải. Vậy chữ số của ' +
      '{digits} khác {digit} bị loại khỏi góc đối diện.',
    'technique.bugPlusOne.step': 'BUG+1: mọi ô trống đều có hai ứng viên, trừ {label} có ba ứng viên. Nếu ' +
      'bỏ {digit} khỏi {label}, mọi chữ số còn phải điền trong một hàng, một cột, một khối hay bất kỳ vùng ' +
      'nào khác đều có đúng hai ô để điền. Một vị trí như vậy không có lời giải hoặc có ít nhất hai lời ' +
      'giải. Đề chỉ có một lời giải, nên {label} là {digit}.',
    'technique.xyChain.step': 'Chuỗi XY của chữ số {digit}, dài {length} liên kết: {chains}. Mọi ô trong ' +
      'chuỗi chỉ có đúng hai ứng viên, và mỗi liên kết nối hai ô nhìn thấy nhau qua cùng một chữ số. Nếu ' +
      'đầu chuỗi đầu tiên không phải {digit} thì các liên kết buộc đầu cuối là {digit}, nên ít nhất một đầu ' +
      'chuỗi là {digit}. Ứng viên {digit} nhìn thấy cả hai đầu bị loại.',
    'technique.forcingChain.step.endpoints': 'Chuỗi suy luận dài {length} liên kết: {chains}. Nếu đầu thứ ' +
      'nhất sai thì đầu cuối đúng, nên ít nhất một đầu là đúng. Các ứng viên xung đột với từng ứng viên ' +
      'được biểu diễn ở mỗi đầu đều bị loại.',
    'technique.forcingChain.step.contradiction': 'Chuỗi suy luận dài {length} liên kết: {chains}. Nếu ứng ' +
      'viên đầu tiên đúng thì một mệnh đề về ứng viên hoặc nhóm sẽ vừa đúng vừa sai, điều không thể xảy ra. ' +
      'Vậy ứng viên đầu tiên sai và bị loại.',
    'technique.forcingChain.step.forced': 'Chuỗi suy luận dài {length} liên kết: {chains}. Nếu ứng viên ' +
      'đầu tiên sai thì một mệnh đề về ứng viên hoặc nhóm sẽ vừa đúng vừa sai, điều không thể xảy ra. Vậy ' +
      'ứng viên đầu tiên đúng và được điền vào.',
    'technique.alsXz.step': 'ALS-XZ với chữ số {digitX} và {digitY}: các ô {cells} tạo thành hai tập gần ' +
      'khóa không có ô chung, và cả hai tập đều có thể chứa {digitX} và {digitY}. Mọi ô chứa {digitX} của ' +
      'tập này đều nhìn thấy mọi ô chứa {digitX} của tập kia, nên nhiều nhất một tập chứa {digitX}. Tập ' +
      'còn lại khi đó chứa đủ mọi chữ số khác của nó, nên một trong hai tập chứa {digitY}. Ứng viên ' +
      '{digitY} nhìn thấy mọi ô chứa {digitY} của cả hai tập bị loại.',
    'technique.sueDeCoq.step': 'Sue de Coq tại chỗ {line} giao {box}: các ô đánh dấu ở đó chỉ có thể chứa ' +
      'các chữ số {digits} và {partDigits}. Cùng với các ô đánh dấu của {line} nằm ngoài {box}, chỉ có thể ' +
      'chứa {digits}, và các ô đánh dấu của {box} nằm ngoài {line}, chỉ có thể chứa {partDigits}, số ô ' +
      'đúng bằng số chữ số. Vì vậy mỗi chữ số trong {digits} được dùng ở các ô đánh dấu của {line}, và ' +
      'mỗi chữ số trong {partDigits} được dùng ở các ô đánh dấu của {box}. Các chữ số {digits} bị loại ' +
      'khỏi các ô còn lại của {line}, và {partDigits} bị loại khỏi các ô còn lại của {box}.',
    'technique.sueDeCoq.step.extra': 'Sue de Coq tại chỗ {line} giao {box}: các ô đánh dấu ở đó chỉ có thể ' +
      'chứa các chữ số {digits}, {partDigits} và {forced}. Cùng với các ô đánh dấu của {line} nằm ngoài ' +
      '{box}, chỉ có thể chứa {digits}, và các ô đánh dấu của {box} nằm ngoài {line}, chỉ có thể chứa ' +
      '{partDigits}, số ô đúng bằng số chữ số. Vì vậy mỗi chữ số trong {digits} được dùng ở các ô đánh dấu ' +
      'của {line}, mỗi chữ số trong {partDigits} được dùng ở các ô đánh dấu của {box}, và chữ số {forced} ' +
      'được dùng ở chỗ giao, tức là nằm trong cả hai. Các chữ số {digits} bị loại khỏi các ô còn lại của ' +
      '{line}, {partDigits} bị loại khỏi các ô còn lại của {box}, và {forced} bị loại khỏi các ô còn lại ' +
      'của cả hai.',
    'technique.nishio.step': 'Thử–sai (độ sâu {depth}): nếu {label} là {digit} thì các suy luận đơn giản ' +
      'sẽ dẫn đến mâu thuẫn. Vậy {digit} bị loại khỏi {label}.',
    'technique.forcingChainLong.step.endpoints': 'Chuỗi suy luận dài hơn thường, {length} liên kết: ' +
      '{chains}. Nếu đầu thứ nhất sai thì đầu cuối đúng, nên ít nhất một đầu là đúng. Các ứng viên xung ' +
      'đột với từng ứng viên được biểu diễn ở mỗi đầu đều bị loại.',
    'technique.forcingChainLong.step.contradiction': 'Chuỗi suy luận dài hơn thường, {length} liên kết: ' +
      '{chains}. Nếu ứng viên đầu tiên đúng thì một mệnh đề về ứng viên hoặc nhóm sẽ vừa đúng vừa sai, ' +
      'điều không thể xảy ra. Vậy ứng viên đầu tiên sai và bị loại.',
    'technique.forcingChainLong.step.forced': 'Chuỗi suy luận dài hơn thường, {length} liên kết: {chains}. ' +
      'Nếu ứng viên đầu tiên sai thì một mệnh đề về ứng viên hoặc nhóm sẽ vừa đúng vừa sai, điều không ' +
      'thể xảy ra. Vậy ứng viên đầu tiên đúng và được điền vào.',
    'technique.nishioDeep.step': 'Thử–sai sâu (độ sâu {depth}): nếu {label} là {digit} thì các suy luận ' +
      'đơn giản, cùng một phép thử thứ hai bên trong giả thiết đó, sẽ dẫn đến mâu thuẫn. Vậy {digit} bị ' +
      'loại khỏi {label}.',
    'technique.cageCombo': 'Tổ hợp tổng lồng',
    'technique.cageCombo.step': 'Lồng có tổng {sum} gồm {size} ô ({cells}) chỉ có thể viết bằng các chữ số ' +
      '{digits}. Mọi ứng viên khác trong lồng đều không thể xảy ra. Chữ số mà mọi tổ hợp đều cần ' +
      '({forced}) phải nằm đâu đó trong lồng: nếu chỉ còn một ô có thể chứa nó thì điền vào ô đó, nếu ' +
      'không thì nó bị loại khỏi các ô còn lại của hàng, cột hoặc khối chứa toàn bộ vị trí khả dĩ của nó.',
    'technique.cageCombo.step.noForced': 'Lồng có tổng {sum} gồm {size} ô ({cells}) chỉ có thể viết bằng ' +
      'các chữ số {digits}. Mọi ứng viên khác trong lồng đều không thể xảy ra.',
    'technique.ruleOf45': 'Quy tắc 45',
    'technique.ruleOf45.step': 'Quy tắc 45 trên {units}: mỗi nhóm chứa đủ các chữ số từ 1 đến 9 (tổng 45), ' +
      'nên sau khi trừ các lồng nằm trọn bên trong, các ô {cells} phải có tổng bằng {sum}. Những ứng viên ' +
      'không thể đạt được tổng đó bị loại.',
    'technique.ruleOf45.step.outie': 'Quy tắc 45 trên {units}: mỗi nhóm chứa đủ các chữ số từ 1 đến 9 ' +
      '(tổng 45), nên các lồng nằm trong hoặc nhô ra khỏi chúng phủ các nhóm cộng thêm một số ô bên ngoài. ' +
      'Các ô {cells} đó phải có tổng bằng {sum}. Những ứng viên không thể đạt được tổng đó bị loại.',
    'technique.ruleOf45.place': 'Quy tắc 45 trên {units}: sau khi trừ các lồng nằm trọn bên trong, ô còn ' +
      'lại {cell} phải bù đúng phần còn thiếu là {sum}, nên ô này là {digit}.',
    'technique.ruleOf45.place.outie': 'Quy tắc 45 trên {units}: các lồng nằm trong hoặc nhô ra khỏi chúng ' +
      'phủ các nhóm cộng thêm một số ô bên ngoài. Ô còn lại {cell} trong số đó phải bù đúng phần còn ' +
      'thiếu là {sum}, nên ô này là {digit}.',
    'technique.cageSplit': 'Tách lồng',
    'technique.cageSplit.step': 'Lồng có tổng {sum} nhô ra khỏi {units} nên tách được làm hai phần: các ô ' +
      '{part} (bên trong) có tổng {partSum} và chỉ dùng được các chữ số {partDigits}; các ô {rest} (bên ' +
      'ngoài) có tổng {restSum} và chỉ dùng được các chữ số {restDigits}. Hai phần thuộc cùng một lồng ' +
      'nên không có chữ số chung. Các ứng viên khác bị loại.'
  });

  // Errors (the code of a GenerationError is the key after `error.`)

  add({
    'error.unknown': 'Đã xảy ra lỗi ({code}).',
    'error.unexpected': 'Đã xảy ra lỗi không mong đợi: {message}',
    'error.budget.exceeded': 'Thao tác mất nhiều thời gian hơn mức cho phép nên đã bị dừng.',
    'error.budget.cancelled': 'Thao tác đã bị hủy.',
    'error.constraints.invalidExtension': 'Một phần mở rộng ràng buộc không hợp lệ (id: {id}).',
    'error.constraints.duplicateExtension': 'Phần mở rộng ràng buộc “{id}” bị đăng ký hai lần.',
    'error.dfs.invalidGivens': 'Các chữ số cho sẵn không phù hợp với bàn cờ này.',
    'error.dfs.invalidLimit': 'Giới hạn số lời giải “{limit}” không hợp lệ.',
    'error.model.invalidSpec': 'Định nghĩa của bàn cờ không hợp lệ.',
    'error.solver.invalidFinding': 'Kỹ thuật {technique} trả về một suy luận không hợp lệ.',
    'error.solver.invalidOption': 'Tùy chọn “{option}” của bộ giải logic không hợp lệ.',
    'error.solver.unknownTechnique': 'Không có kỹ thuật giải “{id}”.',
    'error.solver.invalidGivens': 'Các chữ số cho sẵn không hợp lệ đối với bộ giải logic.',
    'error.solver.emptyFinding': 'Kỹ thuật {technique} trả về một suy luận không thay đổi gì.',
    'error.solver.stateMutated': 'Kỹ thuật {technique} đã sửa trạng thái bàn cờ, điều mà nó không được ' +
      'phép làm.',
    'error.solver.noEffect': 'Kỹ thuật {technique} trả về một suy luận không có tác dụng.',
    'error.technique.invalidDef': 'Định nghĩa của kỹ thuật “{id}” không hợp lệ.',
    'error.technique.duplicate': 'Kỹ thuật “{id}” bị đăng ký hai lần.',
    'error.technique.unknown': 'Không có kỹ thuật “{id}”.',
    'error.exchange.invalidToken': 'Liên kết hoặc mã này không phải một đề hợp lệ. Có thể nó bị cắt dở: ' +
      'hãy sao chép lại đầy đủ.',
    'error.exchange.tooLarge': 'Đề này quá lớn để mở.',
    'error.exchange.unsupportedEncoding': 'Trình duyệt này không giải nén được mã đề. Hãy dùng trình ' +
      'duyệt mới hơn hoặc mở tệp đề.',
    'error.exchange.invalidJson': 'Mã đề không chứa một đề đọc được.',
    'error.exchange.invalidUrl': 'Đây không phải địa chỉ dùng được cho liên kết đề.'
  });
})(typeof self !== 'undefined' ? self : globalThis);
