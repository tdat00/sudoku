/**
 * Vietnamese language pack: the shared strings of the player. Modules that own their strings add them through
 * `SG.localeFragments` instead (see js/ui/i18n.js). Keep the key set identical to locale.en.js.
 * Placeholders are `{name}` (for a technique, the `i18nArgs` of its findings); plural forms use `_one` / `_other`.
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
    'variant.classic4': 'Sudoku cổ điển 4×4',
    'variant.classic4.desc': 'Lưới 4×4 nhỏ gọn với các khối 2×2. Mỗi hàng, mỗi cột và mỗi khối chứa các ' +
      'chữ số từ 1 đến 4, mỗi số đúng một lần. Rất hợp cho người mới và trẻ em.',
    'variant.classic6': 'Sudoku cổ điển 6×6',
    'variant.classic6.desc': 'Lưới 6×6 với các khối 2 hàng × 3 cột. Mỗi hàng, mỗi cột và mỗi khối chứa ' +
      'các chữ số từ 1 đến 6, mỗi số đúng một lần.',
    'variant.classic9': 'Sudoku cổ điển 9×9',
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
    'variant.samurai.desc': 'Năm lưới 9×9 chồng lên nhau: lưới giữa dùng chung một hộp 3×3 với mỗi lưới ở ' +
      'góc (369 ô).',
    'variant.sohei': 'Sudoku Sohei',
    'variant.sohei.desc': 'Bốn lưới 9×9 xếp thành vòng: mỗi lưới dùng chung một hộp 3×3 với hai lưới kề ' +
      'bên (288 ô).',
    'variant.butterfly': 'Sudoku Cánh bướm',
    'variant.butterfly.desc': 'Bốn lưới 9×9 lệch nhau một hộp, chồng lên vùng trung tâm 6×6 (144 ô).',
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
    'symbolMode.shapes': 'Hình khối',
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
    'technique.simpleColouring': 'Tô màu đơn giản (Simple Colouring)',
    'technique.simpleColouring.desc': 'Các ô nối nhau bằng quan hệ “hoặc ô này hoặc ô kia” cho một chữ số ' +
      'được tô bằng hai màu. Chỉ một màu là đúng, từ đó lộ ra những ô không thể chứa chữ số đó.',
    'technique.swordfish': 'Swordfish (cá kiếm)',
    'technique.swordfish.desc': 'Phiên bản ba đường của X-Wing: chữ số chỉ nằm trong cùng ba cột ở ba ' +
      'hàng thì bị loại khỏi phần còn lại của ba cột đó.',
    'technique.xyWing': 'XY-Wing',
    'technique.xyWing.desc': 'Ô trục có hai ứng viên nhìn thấy hai ô càng, mỗi ô càng chung một ứng viên ' +
      'với ô trục. Dù ô trục nhận giá trị nào thì một ô càng cũng chứa chữ số chung, nên chữ số đó bị ' +
      'loại khỏi mọi ô nhìn thấy cả hai ô càng.',
    'technique.xyzWing': 'XYZ-Wing',
    'technique.xyzWing.desc': 'Giống XY-Wing nhưng ô trục có ba ứng viên: chữ số chung bị loại khỏi mọi ô ' +
      'nhìn thấy ô trục và cả hai ô càng.',
    'technique.jellyfish': 'Jellyfish (sứa)',
    'technique.jellyfish.desc': 'Phiên bản bốn đường của X-Wing: chữ số chỉ nằm trong cùng bốn cột ở bốn ' +
      'hàng thì bị loại khỏi phần còn lại của bốn cột đó.',
    'technique.wWing': 'W-Wing',
    'technique.wWing.desc': 'Hai ô có cùng hai ứng viên, nối với nhau bằng một liên kết mạnh trên một chữ ' +
      'số: chữ số còn lại bị loại khỏi mọi ô nhìn thấy cả hai ô.',
    'technique.uniqueRectangle': 'Hình chữ nhật duy nhất (Unique Rectangle)',
    'technique.uniqueRectangle.desc': 'Một bài chỉ có đúng một lời giải, nên bốn ô trong hai hàng, hai ' +
      'cột và hai khối không thể chỉ còn cùng hai ứng viên. Điều này buộc phải loại thêm một ứng viên.',
    'technique.forcingChain': 'Chuỗi suy luận (Forcing Chain)',
    'technique.forcingChain.desc': 'Chuỗi các suy luận kiểu “nếu thế này thì thế kia”, chứng minh một ứng ' +
      'viên là sai (hoặc một chữ số là đúng).',
    'technique.nishio': 'Nishio (thử và loại)',
    'technique.nishio.desc': 'Thử và loại có giới hạn: giả sử một ứng viên là đúng; nếu các suy luận đơn ' +
      'giản sau đó dẫn đến mâu thuẫn thì ứng viên ấy là sai.',
    'technique.cageCombo.desc': 'Các chữ số trong một lồng đều khác nhau và cộng lại bằng tổng của lồng, ' +
      'nên thường chỉ còn vài tổ hợp khả dĩ.',
    'technique.ruleOf45.desc': 'Mỗi hàng, cột và khối có tổng bằng 45. Các lồng nằm trọn trong một nhóm ' +
      'cho biết tổng của những ô còn lại.',
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
    'technique.swordfish.step': 'Swordfish cho {digit}: trong {baseUnits}, chữ số {digit} chỉ có thể nằm ' +
      'ở {coverUnits}. Ba chữ số {digit} của các đường gốc lấp đầy cả ba đường phủ, nên {digit} bị loại ' +
      'khỏi mọi ô còn lại của {coverUnits}.',
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
    'technique.xyWing.step': 'XY-Wing: ô trục {pivot} chứa {digitX} hoặc {digitY}; ô càng {pincer1} chứa ' +
      '{digitX} hoặc {digit}; ô càng {pincer2} chứa {digitY} hoặc {digit}. Dù ô trục nhận chữ số nào thì ' +
      'một trong hai ô càng cũng phải là {digit}, nên {digit} bị loại khỏi mọi ô nhìn thấy cả hai ô càng.',
    'technique.xyzWing.step': 'XYZ-Wing: ô trục {pivot} chứa {digitX}, {digitY} hoặc {digit}; ô càng ' +
      '{pincer1} chứa {digitX} hoặc {digit}; ô càng {pincer2} chứa {digitY} hoặc {digit}. Một trong ba ô ' +
      'này phải là {digit}, nên {digit} bị loại khỏi mọi ô nhìn thấy cả ba ô.',
    'technique.wWing.step': 'W-Wing: {cell1} và {cell2} đều chỉ chứa {digitX} hoặc {digit} và không nhìn ' +
      'thấy nhau. Một liên kết mạnh trên {digitX} trong {unit} ({link1} và {link2}) nối hai ô này, nên ' +
      'một trong hai ô phải là {digit}. {digit} bị loại khỏi mọi ô nhìn thấy cả hai.',
    'technique.uniqueRectangle.type1.step': 'Hình chữ nhật duy nhất: ba góc chỉ chứa {digitX} và ' +
      '{digitY}. Nếu {cell} cũng chỉ chứa hai chữ số đó thì bài sẽ có hai lời giải. Vậy {digitX} và ' +
      '{digitY} bị loại khỏi {cell}.',
    'technique.uniqueRectangle.type2.step': 'Hình chữ nhật duy nhất: hai góc chỉ chứa {digitX} và ' +
      '{digitY}; hai góc còn lại, {roof1} và {roof2}, còn chứa thêm {digit}. Để tránh hai lời giải, một ' +
      'trong hai ô đó phải là {digit}, nên {digit} bị loại khỏi mọi ô nhìn thấy cả hai.',
    'technique.forcingChain.step.endpoints': 'Chuỗi suy luận dài {length} liên kết: {chains}. Nếu ứng ' +
      'viên đầu tiên sai thì ứng viên cuối đúng, nên ít nhất một đầu của chuỗi là đúng. Các ứng viên nhìn ' +
      'thấy cả hai đầu bị loại.',
    'technique.forcingChain.step.contradiction': 'Chuỗi suy luận dài {length} liên kết: {chains}. Nếu ứng ' +
      'viên đầu tiên đúng thì sẽ có một ứng viên vừa đúng vừa sai, điều không thể xảy ra. Vậy ứng viên ' +
      'đầu tiên sai và bị loại.',
    'technique.forcingChain.step.forced': 'Chuỗi suy luận dài {length} liên kết: {chains}. Nếu ứng viên ' +
      'đầu tiên sai thì sẽ có một ứng viên vừa đúng vừa sai, điều không thể xảy ra. Vậy ứng viên đầu tiên ' +
      'đúng và được điền vào.',
    'technique.nishio.step': 'Thử và loại (độ sâu {depth}): nếu {label} là {digit} thì các suy luận đơn ' +
      'giản sẽ dẫn đến mâu thuẫn. Vậy {digit} bị loại khỏi {label}.',
    'technique.cageCombo': 'Tổ hợp tổng lồng',
    'technique.cageCombo.step': 'Lồng có tổng {sum} gồm {size} ô ({cells}) chỉ có thể viết bằng các chữ ' +
      'số {digits}. Mọi ứng viên khác trong lồng đều không thể xảy ra, và chữ số bắt buộc phải có trong ' +
      'lồng ({forced}) bị loại khỏi các ô còn lại của hàng, cột hoặc vùng chứa toàn bộ vị trí khả dĩ của nó.',
    'technique.ruleOf45': 'Quy tắc 45',
    'technique.ruleOf45.step': 'Quy tắc 45 trên {units}: mỗi hàng, cột hoặc vùng chứa đủ các chữ số từ 1 ' +
      'đến 9 (tổng 45), nên sau khi trừ các lồng nằm trọn bên trong, các ô {cells} phải có tổng bằng ' +
      '{sum}. Những ứng viên không thể đạt được tổng đó bị loại.',
    'technique.ruleOf45.place': 'Quy tắc 45 trên {units}: sau khi trừ các lồng nằm trọn bên trong, ô còn ' +
      'lại {cell} phải bù đúng phần còn thiếu là {sum}, nên ô này là {digit}.',
    'technique.cageSplit': 'Tách lồng',
    'technique.cageSplit.step': 'Lồng có tổng {sum} nhô ra khỏi {units} nên tách được làm hai phần: các ô ' +
      '{part} (bên trong) có tổng {partSum} và chỉ dùng được các chữ số {partDigits}; các ô {rest} (bên ' +
      'ngoài) có tổng {restSum} và chỉ dùng được các chữ số {restDigits}. Các ứng viên khác bị loại.'
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
