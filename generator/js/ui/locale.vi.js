/**
 * Vietnamese language pack: the same keys as locale.en.js, in natural Vietnamese. Established terms (X-Wing,
 * Swordfish, Jigsaw, Killer, seed, ...) stay as they are, with a short explanation where it helps.
 * Placeholders `{name}` must match the English text of the key; plural keys (`_one` / `_other`) exist in both
 * languages (Vietnamese has no plural, so both forms read the same).
 */
(function (root) {
  'use strict';

  const SG = root.SG = root.SG || {};
  SG.locales = SG.locales || {};
  const pack = SG.locales.vi = SG.locales.vi || {};

  function add(section) {
    Object.keys(section).forEach(function (key) { pack[key] = section[key]; });
  }

  // General words, units and durations

  add({
    'app.title': 'Trình sinh đề Sudoku',

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

    'unit.attempt_one': '{count} lần thử',
    'unit.attempt_other': '{count} lần thử',
    'unit.cell_one': '{count} ô',
    'unit.cell_other': '{count} ô',
    'unit.clue_one': '{count} số cho sẵn',
    'unit.clue_other': '{count} số cho sẵn',
    'unit.step_one': '{count} bước',
    'unit.step_other': '{count} bước',

    'unitKind.box': 'khối',
    'unitKind.cage': 'lồng',
    'unitKind.col': 'cột',
    'unitKind.diag': 'đường chéo',
    'unitKind.region': 'vùng',
    'unitKind.row': 'hàng',
    'unitKind.window': 'vùng siêu',

    'duration.h': '{h} giờ',
    'duration.hMin': '{h} giờ {min} phút',
    'duration.min': '{min} phút',
    'duration.minSec': '{min} phút {sec} giây',
    'duration.ms': '{value} ms',
    'duration.s': '{value} giây'
  });

  // Variants, difficulty, symmetry, symbol sets, dig orders, technique groups, trace levels

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

    'group.classic': 'Cổ điển',
    'group.extraRegions': 'Vùng bổ sung',
    'group.inequality': 'Dấu so sánh',
    'group.killer': 'Sát thủ (Killer)',
    'group.mega': 'Lưới lớn',
    'group.multigrid': 'Nhiều lưới chồng nhau',
    'group.regions': 'Vùng không đều',
    'group.wordoku': 'Sudoku Chữ',

    'difficulty.veryEasy': 'Rất dễ',
    'difficulty.veryEasy.desc': 'Nhiều số cho sẵn. Chỉ cần các nước đi đơn giản: ô một ứng viên và số đơn ' +
      'ẩn (Naked / Hidden Single).',
    'difficulty.easy': 'Dễ',
    'difficulty.easy.desc': 'Ít số cho sẵn hơn một chút. Thêm kỹ thuật ứng viên bị khóa: cặp chỉ hướng ' +
      '(Pointing) và loại trừ khối–hàng/cột.',
    'difficulty.normal': 'Trung bình',
    'difficulty.normal.desc': 'Thường dùng các cặp và bộ ba ứng viên (tập con trần và ẩn).',
    'difficulty.hard': 'Khó',
    'difficulty.hard.desc': 'Thường dùng bộ bốn ứng viên, các mẫu “cá” (X-Wing, Swordfish) và tô màu ' +
      'đơn giản.',
    'difficulty.expert': 'Chuyên gia',
    'difficulty.expert.desc': 'Thường dùng một kỹ thuật cánh (XY-Wing, XYZ-Wing), Jellyfish hoặc nhiều ' +
      'mẫu “cá”.',
    'difficulty.master': 'Bậc thầy',
    'difficulty.master.desc': 'Thường dùng nhiều kỹ thuật cánh, W-Wing hoặc Unique Rectangle, đôi khi một ' +
      'chuỗi suy luận ngắn.',
    'difficulty.nightmare': 'Ác mộng',
    'difficulty.nightmare.desc': 'Thường dùng chuỗi suy luận và thử–sai (Nishio), với rất ít số cho sẵn.',
    'difficulty.hell1': 'Địa ngục 1',
    'difficulty.hell1.desc': 'Thường dùng nhiều chuỗi suy luận và bước thử–sai.',
    'difficulty.hell2': 'Địa ngục 2',
    'difficulty.hell2.desc': 'Khoảng điểm cao nhất; thường cần nhiều suy luận nâng cao.',

    'symmetry.none': 'Không đối xứng',
    'symmetry.rotational180': 'Xoay 180°',
    'symmetry.rotational90': 'Xoay 90°',
    'symmetry.mirrorH': 'Đối xứng trên–dưới',
    'symmetry.mirrorV': 'Đối xứng trái–phải',
    'symmetry.mirrorBoth': 'Đối xứng cả hai chiều',
    'symmetry.diagonal': 'Đường chéo chính',
    'symmetry.antiDiagonal': 'Đường chéo phụ',

    'symbolMode.digits': 'Chữ số',
    'symbolMode.letters': 'Chữ cái',
    'symbolMode.colors': 'Màu sắc',
    'symbolMode.shapes': 'Hình dạng',
    'symbolMode.word': 'Chữ của từ khóa',

    'digOrder.random': 'Ngẫu nhiên',
    'digOrder.rowByRow': 'Lần lượt từng hàng',
    'digOrder.snake': 'Ngoằn ngoèo (zig-zag)',
    'digOrder.spiral': 'Xoắn ốc',
    'digOrder.jumpOne': 'Cách một ô',

    'techniqueGroup.basic': 'Số đơn',
    'techniqueGroup.locked': 'Ứng viên bị khóa',
    'techniqueGroup.subset': 'Cặp, bộ ba và bộ bốn',
    'techniqueGroup.fish': 'Cá và tô màu',
    'techniqueGroup.wing': 'Cánh (Wing)',
    'techniqueGroup.chain': 'Chuỗi và thử–sai',
    'techniqueGroup.cage': 'Luật lồng',
    'techniqueGroup.ineq': 'Luật so sánh',

    'traceLevel.off': 'Tắt (chỉ kết quả)',
    'traceLevel.summary': 'Tóm tắt',
    'traceLevel.full': 'Chi tiết đầy đủ'
  });

  // The seven steps and their explanation cards (SG.explain.keys())

  add({
    'step.configure.name': 'Chuẩn bị cấu hình',
    'step.buildModel.name': 'Dựng mô hình lưới',
    'step.fullGrid.name': 'Tạo một lời giải đầy đủ',
    'step.extraStructure.name': 'Dựng cấu trúc phụ',
    'step.dig.name': 'Đào lỗ và kiểm tra từng lỗ',
    'step.rate.name': 'Chấm độ khó',
    'step.tune.name': 'Hiệu chỉnh và hoàn tất',

    'explain.configure.what': 'Kiểm tra các thiết lập bạn chọn, điền giá trị mặc định và cố định seed.',
    'explain.configure.why': 'Cùng một seed với cùng các thiết lập luôn cho đúng cùng một đề, nên mọi đề ' +
      'đều có thể chia sẻ và dựng lại.',
    'explain.configure.how': 'Các tùy chọn được chuẩn hóa; biến thể, mức độ, kiểu đối xứng và thứ tự đào ' +
      'được kiểm tra; nếu bạn không nhập seed thì một seed ngẫu nhiên sẽ được chọn.',
    'explain.configure.live': 'Đang chuẩn bị cấu hình…',
    'explain.configure.code.normalize': 'config ← normalize(options)',
    'explain.configure.code.validate': 'kiểm tra biến thể, mức độ, kiểu đối xứng và thứ tự đào',
    'explain.configure.code.seed': 'seed ← config.seed, hoặc một seed ngẫu nhiên nếu chưa có',

    'explain.buildModel.what': 'Tạo bàn cờ trống: các ô, các hàng, cột, vùng và những ô nhìn thấy nhau.',
    'explain.buildModel.why': 'Luật của mỗi biến thể chỉ là các nhóm ô mà mọi giá trị phải khác nhau. Khi ' +
      'bàn cờ được mô tả bằng dữ liệu, một bộ giải duy nhất dùng được cho mọi biến thể.',
    'explain.buildModel.how': 'Biến thể dựng các ô và bố cục (Ghép hình trước tiên tạo các vùng, bàn cờ ' +
      'nhiều lưới thì đặt từng lưới con). Sau đó liệt kê các nhóm (hàng, cột, vùng) và các ô cùng nhóm với ' +
      'mỗi ô, rồi co giãn số cho sẵn tối thiểu của mức độ theo kích thước bàn cờ.',
    'explain.buildModel.live': 'Lưới có {cells} ô và {units} nhóm',
    'explain.buildModel.code.build': 'model ← variant.build(options, rng)',
    'explain.buildModel.code.units': 'units ← các hàng + cột + vùng của mọi lưới',
    'explain.buildModel.code.peers': 'peers[c] ← các ô chung nhóm với ô c',
    'explain.buildModel.code.spec': 'spec ← difficultySpec(level), co giãn theo số ô',

    'explain.fullGrid.what': 'Điền kín cả bàn cờ bằng một lời giải hợp lệ.',
    'explain.fullGrid.why': 'Mọi đề Sudoku hay đều bắt đầu từ một lời giải hoàn chỉnh — nhờ vậy ta luôn ' +
      'biết chắc đáp án tồn tại.',
    'explain.fullGrid.how': 'Thuật toán quay lui (backtracking) điền số theo thứ tự ngẫu nhiên, luôn chọn ' +
      'ô có ít ứng viên nhất. Sau mỗi lần đặt số, hệ quả được lan truyền; khi có ô hết ứng viên thì lùi ' +
      'lại một nước và thử chữ số khác. Gặp quá nhiều ngõ cụt thì bắt đầu lại với thứ tự ngẫu nhiên mới.',
    'explain.fullGrid.live': 'Đã điền {placed} ô · {backtracks} lần quay lui · {restarts} lần làm lại',
    'explain.fullGrid.code.fixed': 'state ← các ô cố định của biến thể, rồi propagate()',
    'explain.fullGrid.code.seed': 'điền sẵn state bằng variant.fastSeed(state) nếu biến thể có hàm này',
    'explain.fullGrid.code.pick': 'cell ← ô trống có ít ứng viên nhất',
    'explain.fullGrid.code.loop': 'với mỗi value trong shuffle(candidates(cell)):',
    'explain.fullGrid.code.place': 'đặt value vào cell rồi propagate()',
    'explain.fullGrid.code.descend': 'nếu không còn ô nào hết ứng viên: tiếp tục với ô kế tiếp',
    'explain.fullGrid.code.backtrack': 'nếu không: hoàn tác nước đi và thử value kế tiếp',
    'explain.fullGrid.code.restart': 'đoán sai quá nhiều: làm lại từ đầu với dãy số ngẫu nhiên mới',

    'explain.extraStructure.what': 'Dựng phần mà biến thể cần thêm trên lưới đầy đủ: lồng, dấu so sánh ' +
      'hoặc từ khóa.',
    'explain.extraStructure.why': 'Lồng của Sudoku Sát thủ, dấu của Sudoku So sánh và từ khóa của Sudoku ' +
      'Chữ đều suy ra từ lời giải, nên luôn khớp với nó. Biến thể cổ điển không cần gì ở bước này.',
    'explain.extraStructure.how': 'Biến thể đọc lời giải rồi dựng cấu trúc (Sát thủ: các lồng và tổng; So ' +
      'sánh: các dấu so sánh; Sudoku Chữ: từ khóa). Nếu không có gì để dựng thì bước này được bỏ qua.',
    'explain.extraStructure.live': 'Đang dựng cấu trúc phụ…',
    'explain.extraStructure.code.hook': 'nếu biến thể có hàm postGenerate:',
    'explain.extraStructure.code.build': 'dựng cấu trúc phụ (lồng, dấu, từ khóa) từ lời giải',
    'explain.extraStructure.code.none': 'nếu không thì không cần làm gì',

    'explain.dig.what': 'Lần lượt bỏ bớt các số khỏi lưới đầy đủ, mỗi lần một nhóm ô.',
    'explain.dig.why': 'Mỗi ô bị bỏ đi làm đề khó hơn, nhưng đề phải giữ đúng một lời giải và vẫn giải ' +
      'được bằng các kỹ thuật cho phép ở mức đó.',
    'explain.dig.how': 'Các ô được bỏ theo từng nhóm đối xứng. Sau mỗi lần bỏ, bộ giải logic kiểm tra đề ' +
      'còn giải được bằng các kỹ thuật cho phép hay không (điều này cũng chứng minh lời giải là duy nhất); ' +
      'nếu không thì nhóm ô đó được trả lại. Một lượt thứ hai, có định hướng, giữ lại những lần bỏ làm đề ' +
      'khó nhất. Cuối cùng là kiểm tra lần nữa rằng chỉ còn đúng một lời giải.',
    'explain.dig.live': 'Đã thử {attempts} · chấp nhận {accepted} · từ chối {rejected} · còn {clues} ' +
      'số cho sẵn',
    'explain.dig.code.order': 'order ← shuffle(các nhóm ô đối xứng)',
    'explain.dig.code.loop': 'với mỗi group trong order:',
    'explain.dig.code.filter': 'bỏ qua group nếu số cho sẵn, một hàng, một cột hoặc một vùng sẽ quá ít',
    'explain.dig.code.try': 'bỏ group khỏi đề',
    'explain.dig.code.check': 'nếu đề vẫn giải được bằng các kỹ thuật cho phép:',
    'explain.dig.code.accept': 'giữ group ở trạng thái đã bỏ',
    'explain.dig.code.reject': 'nếu không thì trả group về chỗ cũ',
    'explain.dig.code.deeper': 'rồi đào sâu hơn: giữ lần bỏ làm đề khó nhất',
    'explain.dig.code.verify': 'xác minh rằng chỉ còn đúng một lời giải',

    'explain.rate.what': 'Đo xem đề khó đến đâu.',
    'explain.rate.why': 'Độ khó được đo bằng những gì một người cần để giải đề, chứ không đoán theo số ' +
      'cho sẵn. Nhờ vậy ta đảm bảo được đúng mức độ bạn yêu cầu.',
    'explain.rate.how': 'Bộ giải logic giải đề từng bước bằng các kỹ thuật của con người, thử theo một ' +
      'thứ tự ưu tiên kỹ thuật cố định, và đếm mỗi kỹ thuật được dùng bao nhiêu lần. Điểm gồm điểm của ' +
      'kỹ thuật khó nhất, cộng một phần tăng theo logarit của toàn bộ khối lượng, cộng tối đa 80 cho các ' +
      'ô trống; điểm quyết định mức độ.',
    'explain.rate.live': '{clues} số cho sẵn · điểm {score}',
    'explain.rate.code.solve': 'report ← giải đề bằng logic, với mọi kỹ thuật',
    'explain.rate.code.count': 'đếm số lần cần dùng mỗi kỹ thuật',
    'explain.rate.code.score': 'score ← kỹ thuật khó nhất + log của tổng khối lượng + ô trống',
    'explain.rate.code.classify': 'level ← dải độ khó chứa score',

    'explain.tune.what': 'So kết quả với mức độ bạn yêu cầu, rồi hoàn tất.',
    'explain.tune.why': 'Việc đào là ngẫu nhiên nên đề đầu tiên có thể hơi dễ hoặc hơi khó. Kiểm tra rồi ' +
      'thử lại là cách đảm bảo đúng mức độ.',
    'explain.tune.how': 'Nếu đúng mức độ thì nhận đề. Nếu không, thử đào lại trên cùng lưới hoặc tạo một ' +
      'lưới mới. Khi hết lượt thử, dùng đề gần nhất và đánh dấu là gần đúng. Cuối cùng kết quả được đóng ' +
      'gói cùng số liệu thống kê.',
    'explain.tune.live': '{clues} số cho sẵn · điểm {score}',
    'explain.tune.code.compare': 'nếu mức độ của đề đúng bằng mức độ yêu cầu:',
    'explain.tune.code.accept': 'nhận đề',
    'explain.tune.code.retry': 'nếu không thì đào đề khác, hoặc tạo lưới mới',
    'explain.tune.code.best': 'khi hết lượt thử, dùng đề gần nhất',
    'explain.tune.code.package': 'đóng gói kết quả'
  });

  // Techniques (cageCombo, ruleOf45, cageSplit, ineqChain, minMaxForcing are named in tech-ineq.js and
  // killer.js)

  add({
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
    'technique.hiddenPair.desc': 'Hai chữ số chỉ có thể nằm trong cùng hai ô của một nhóm thì phải lấp đầy ' +
      'hai ô đó, nên ta loại mọi ứng viên khác khỏi hai ô này.',
    'technique.nakedTriple': 'Bộ ba trần (Naked Triple)',
    'technique.nakedTriple.desc': 'Ba ô trong cùng một nhóm mà ứng viên chỉ gồm cùng ba chữ số thì phải ' +
      'chứa ba chữ số đó, nên ta loại chúng khỏi các ô còn lại của nhóm.',
    'technique.hiddenTriple': 'Bộ ba ẩn (Hidden Triple)',
    'technique.hiddenTriple.desc': 'Ba chữ số chỉ có thể nằm trong cùng ba ô của một nhóm thì phải lấp đầy ' +
      'ba ô đó, nên ta loại mọi ứng viên khác khỏi các ô này.',
    'technique.nakedQuad': 'Bộ bốn trần (Naked Quad)',
    'technique.nakedQuad.desc': 'Bốn ô trong cùng một nhóm mà ứng viên chỉ gồm cùng bốn chữ số thì phải ' +
      'chứa bốn chữ số đó, nên ta loại chúng khỏi các ô còn lại của nhóm.',
    'technique.hiddenQuad': 'Bộ bốn ẩn (Hidden Quad)',
    'technique.hiddenQuad.desc': 'Bốn chữ số chỉ có thể nằm trong cùng bốn ô của một nhóm thì phải lấp đầy ' +
      'bốn ô đó, nên ta loại mọi ứng viên khác khỏi các ô này.',
    'technique.xWing': 'X-Wing (cánh X)',
    'technique.xWing.desc': 'Khi một chữ số chỉ có hai ô khả dĩ trên mỗi hàng trong hai hàng, và các ô đó ' +
      'nằm trong cùng hai cột, ta loại chữ số đó khỏi phần còn lại của hai cột ấy (tương tự khi đổi vai ' +
      'trò hàng và cột).',
    'technique.simpleColouring': 'Tô màu đơn giản (Simple Colouring)',
    'technique.simpleColouring.desc': 'Các ô nối nhau bằng quan hệ “hoặc ô này hoặc ô kia” cho một chữ số ' +
      'được tô bằng hai màu. Chỉ một màu là đúng, từ đó lộ ra những ô không thể chứa chữ số đó.',
    'technique.swordfish': 'Swordfish (cá kiếm)',
    'technique.swordfish.desc': 'Phiên bản ba đường của X-Wing: chữ số chỉ nằm trong cùng ba cột ở ba hàng ' +
      'thì bị loại khỏi phần còn lại của ba cột đó.',
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
    'technique.uniqueRectangle.desc': 'Một đề chỉ có đúng một lời giải, nên bốn ô trong hai hàng, hai cột ' +
      'và hai khối không thể chỉ còn cùng hai ứng viên. Điều này buộc phải loại thêm một ứng viên.',
    'technique.forcingChain': 'Chuỗi suy luận (Forcing Chain)',
    'technique.forcingChain.desc': 'Chuỗi các suy luận kiểu “nếu thế này thì thế kia”, chứng minh một ứng ' +
      'viên là sai (hoặc một chữ số là đúng).',
    'technique.nishio': 'Nishio (thử–sai)',
    'technique.nishio.desc': 'Thử–sai có giới hạn: giả sử một ứng viên là đúng; nếu các suy luận đơn giản ' +
      'sau đó dẫn đến mâu thuẫn thì ứng viên ấy là sai.',
    'technique.cageCombo.desc': 'Các chữ số trong một lồng đều khác nhau và cộng lại bằng tổng của lồng, ' +
      'nên thường chỉ còn vài tổ hợp khả dĩ.',
    'technique.ruleOf45.desc': 'Mỗi hàng, cột và khối có tổng bằng 45, nhiều nhóm cùng loại gộp lại thì ' +
      'mỗi nhóm 45. Các lồng nằm trọn trong một nhóm cho biết tổng của những ô còn lại; các lồng nhô ' +
      'ra khỏi nhóm cho biết tổng của những ô ngay bên ngoài.',
    'technique.cageSplit.desc': 'Một lồng nhô ra khỏi hàng, cột hoặc khối thì tách thành phần bên trong và ' +
      'phần bên ngoài, mỗi phần có tổng riêng.'
  });

  // Solving-step texts, one per `i18nKey` of a technique finding (same placeholders as English)

  add({
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
    'technique.swordfish.step': 'Swordfish cho {digit}: trong {baseUnits}, chữ số {digit} chỉ có thể nằm ở ' +
      '{coverUnits}. Ba chữ số {digit} của các đường gốc lấp đầy cả ba đường phủ, nên {digit} bị loại ' +
      'khỏi mọi ô còn lại của {coverUnits}.',
    'technique.jellyfish.step': 'Jellyfish cho {digit}: trong {baseUnits}, chữ số {digit} chỉ có thể nằm ở ' +
      '{coverUnits}. Bốn chữ số {digit} của các đường gốc lấp đầy cả bốn đường phủ, nên {digit} bị loại ' +
      'khỏi mọi ô còn lại của {coverUnits}.',
    'technique.simpleColouring.step': 'Tô màu đơn giản cho {digit}: các ô nối nhau bằng quan hệ “hoặc ô ' +
      'này hoặc ô kia” được tô hai màu. Màu 1: {colour1}. Màu 2: {colour2}. Chỉ một màu chứa chữ số này, ' +
      'từ đó loại {digit} khỏi những ô không thể là nó.',
    'technique.simpleColouring.step.wrap': 'Tô màu đơn giản cho {digit} (xung đột màu): màu 1 là ' +
      '{colour1}, màu 2 là {colour2}. Hai ô cùng màu {falseColour} nhìn thấy nhau ({witness}), nên màu ' +
      'đó không thể là màu đúng. {digit} bị loại khỏi mọi ô màu {falseColour}.',
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
      'thấy nhau. Một liên kết mạnh trên {digitX} trong {unit} ({link1} và {link2}) nối hai ô này, nên một ' +
      'trong hai ô phải là {digit}. {digit} bị loại khỏi mọi ô nhìn thấy cả hai.',
    'technique.uniqueRectangle.type1.step': 'Hình chữ nhật duy nhất: ba góc chỉ chứa {digitX} và {digitY}. ' +
      'Nếu {cell} cũng chỉ chứa hai chữ số đó thì đề sẽ có hai lời giải. Vậy {digitX} và {digitY} bị ' +
      'loại khỏi {cell}.',
    'technique.uniqueRectangle.type2.step': 'Hình chữ nhật duy nhất: hai góc chỉ chứa {digitX} và ' +
      '{digitY}; hai góc còn lại, {roof1} và {roof2}, còn chứa thêm {digit}. Để tránh hai lời giải, một ' +
      'trong hai ô đó phải là {digit}, nên {digit} bị loại khỏi mọi ô nhìn thấy cả hai.',
    'technique.forcingChain.step.endpoints': 'Chuỗi suy luận dài {length} liên kết: {chains}. Nếu ứng viên ' +
      'đầu tiên sai thì ứng viên cuối đúng, nên ít nhất một đầu của chuỗi là đúng. Các ứng viên nhìn thấy ' +
      'cả hai đầu bị loại.',
    'technique.forcingChain.step.contradiction': 'Chuỗi suy luận dài {length} liên kết: {chains}. Nếu ứng ' +
      'viên đầu tiên đúng thì sẽ có một ứng viên vừa đúng vừa sai, điều không thể xảy ra. Vậy ứng viên đầu ' +
      'tiên sai và bị loại.',
    'technique.forcingChain.step.forced': 'Chuỗi suy luận dài {length} liên kết: {chains}. Nếu ứng viên ' +
      'đầu tiên sai thì sẽ có một ứng viên vừa đúng vừa sai, điều không thể xảy ra. Vậy ứng viên đầu ' +
      'tiên đúng và được điền vào.',
    'technique.nishio.step': 'Thử–sai (độ sâu {depth}): nếu {label} là {digit} thì các suy luận đơn giản ' +
      'sẽ dẫn đến mâu thuẫn. Vậy {digit} bị loại khỏi {label}.'
  });

  // Event log lines

  add({
    'configure.start': 'Đang đọc các thiết lập.',
    'configure.config': 'Thiết lập — biến thể: {variantId} · mức độ: {difficulty} · seed: {seed} · đối ' +
      'xứng: {symmetry} · ký hiệu: {symbolMode} · thứ tự đào: {digOrder} · tối đa {maxAttempts} lần thử.',
    'configure.end': 'Các thiết lập đã sẵn sàng.',

    'buildModel.start': 'Đang dựng bàn cờ: {variantId}.',
    'buildModel.model': 'Đã dựng xong bàn cờ: {cellCount} ô, {digits} ký hiệu, {units} nhóm (hàng, cột, ' +
      'vùng).',
    'buildModel.spec': 'Mức độ mục tiêu: {level} — điểm từ {scoreMin} đến {scoreMax}, ít nhất {minClues} ' +
      'số cho sẵn.',
    'buildModel.traceDowngraded': 'Bàn cờ có {cellCount} ô, quá nhiều để phát lại đầy đủ: mức chi tiết ' +
      'được giảm từ “{requested}” xuống “{applied}”.',
    'buildModel.end': 'Bàn cờ đã sẵn sàng.',

    'fullGrid.start': 'Lần thử {attempt}/{maxAttempts}: điền kín cả lưới.',
    'fullGrid.clear_one': 'Đã xóa trắng bàn cờ ({count} ô).',
    'fullGrid.clear_other': 'Đã xóa trắng bàn cờ ({count} ô).',
    'fullGrid.fixed_one': 'Biến thể cố định sẵn {count} ô.',
    'fullGrid.fixed_other': 'Biến thể cố định sẵn {count} ô.',
    'fullGrid.seed_one': 'Khởi động nhanh: điền sẵn {count} ô.',
    'fullGrid.seed_other': 'Khởi động nhanh: điền sẵn {count} ô.',
    'fullGrid.place': 'Thử đặt {value} vào {cell} (độ sâu đoán {depth}).',
    'fullGrid.conflict': '{value} ở {cell} dẫn đến ngõ cụt.',
    'fullGrid.backtrack': 'Ngõ cụt: lấy {value} khỏi {cell} và thử chữ số kế tiếp.',
    'fullGrid.restart_one': 'Quá nhiều ngõ cụt ({backtracks}/{limit}): làm lại lần {restart}, xóa {count} ô.',
    'fullGrid.restart_other': 'Quá nhiều ngõ cụt ({backtracks}/{limit}): làm lại lần {restart}, xóa ' +
      '{count} ô.',
    'fullGrid.end': 'Lưới đầy đủ đã hoàn tất.',

    'extraStructure.start': 'Đang dựng cấu trúc phụ: {variantId}.',
    'extraStructure.none': '{variantId} không có cấu trúc phụ cần dựng.',
    'extraStructure.built': 'Đã dựng xong cấu trúc phụ của {variantId}.',
    'extraStructure.end': 'Bước dựng cấu trúc phụ đã xong.',

    'dig.start': 'Bắt đầu đào lỗ — đối xứng: {symmetry} · thứ tự đào: {order} · giữ ít nhất {minClues} số ' +
      'cho sẵn.',
    'dig.restore_one': 'Hiện lại lưới đầy đủ ({count} ô).',
    'dig.restore_other': 'Hiện lại lưới đầy đủ ({count} ô).',
    'dig.pass.start': 'Bắt đầu lượt đào {pass}: trên lưới có {clues} số cho sẵn.',
    'dig.skip': 'Bỏ qua {cells}: {reason}.',
    'dig.try': 'Thử bỏ {cells}.',
    'dig.accept': 'Đã bỏ {cells}: đề vẫn giải được bằng các kỹ thuật cho phép.',
    'dig.reject': 'Trả {cells} về chỗ cũ: {reason}.',
    'dig.keep': 'Giữ lần bỏ {cells} vì làm đề khó nhất (điểm {score}).',
    'dig.pass.end': 'Kết thúc lượt đào {pass}: còn {clues} số cho sẵn.',
    'dig.verify': 'Đang kiểm tra đề có đúng một lời giải.',
    'dig.verify.yes': 'Đã kiểm tra: đề có đúng một lời giải.',
    'dig.verify.no': 'Đã kiểm tra: đề có nhiều hơn một lời giải!',
    'dig.unsound': 'Một kỹ thuật cho ra đề không có lời giải duy nhất, nên được thay bằng cách đào đơn ' +
      'giản và an toàn.',
    'dig.end': 'Đã đào xong.',
    'dig.reason.rejected': 'một ô trong đó đã bị từ chối trước đó',
    'dig.reason.minClues': 'đề sẽ xuống dưới số cho sẵn tối thiểu',
    'dig.reason.unitMinimum': 'một hàng, cột hoặc vùng sẽ còn quá ít số cho sẵn',
    'dig.reason.ambiguous': 'đề sẽ không còn đúng một lời giải',
    'dig.reason.techniques': 'các kỹ thuật cho phép không còn giải hết được đề',
    'dig.reason.tooHard': 'đề sẽ khó hơn mức độ yêu cầu',
    'digPass.random': 'ngẫu nhiên',
    'digPass.guided': 'có định hướng',
    'digPass.fallback': 'dự phòng an toàn',

    'rate.start': 'Đang chấm điểm đề bằng bộ giải logic.',
    'rate.technique_one': '{technique} ({group}) được dùng {count} lần.',
    'rate.technique_other': '{technique} ({group}) được dùng {count} lần.',
    'rate.result': 'Kết quả chấm: {level}, điểm {score}, kỹ thuật khó nhất: {hardestTechnique}.',
    'rate.end': 'Đã chấm xong.',

    'tune.start': 'Đang so đề với mức độ yêu cầu (lần thử {attempt}/{maxAttempts}).',
    'tune.hit': 'Đạt mức độ: “{achieved}” (điểm {score}, dải từ {scoreMin} đến {scoreMax}).',
    'tune.miss': 'Chưa đúng mức độ: cần “{requested}”, ra “{achieved}” (điểm {score}). Thử lại (mẫu ' +
      '{sample}/{maxSamples}).',
    'tune.best': 'Hết lượt thử. Đề gần nhất là “{achieved}” (cần “{requested}”, điểm {score}).',
    'tune.final_one': 'Đề hoàn chỉnh được hiển thị trên lưới (đổi {count} ô).',
    'tune.final_other': 'Đề hoàn chỉnh được hiển thị trên lưới (đổi {count} ô).',
    'tune.end': 'Đã hiệu chỉnh xong.',

    'retry.difficulty': 'Lần thử {attempt}/{maxAttempts} ra “{achieved}” thay vì “{requested}”.',
    'retry.difficulty.yes': 'Lần thử {attempt}/{maxAttempts} ra “{achieved}” thay vì “{requested}”. Một ' +
      'lưới mới sẽ được tạo.',
    'retry.difficulty.no': 'Lần thử {attempt}/{maxAttempts} ra “{achieved}” thay vì “{requested}”. Đã hết ' +
      'lượt thử.',
    'retry.reason.difficulty': 'độ khó chưa khớp',

    'done': 'Đã tạo xong đề.',
    'done.yes': 'Xong: đề mức “{achieved}” với {clues} số cho sẵn (seed {seed}).',
    'done.no': 'Xong: đề gần nhất là “{achieved}” (yêu cầu “{requested}”) với {clues} số cho sẵn ' +
      '(seed {seed}).',

    'trace.coalesced_one': 'Nhật ký bỏ qua {dropped} bước chi tiết ở đây.',
    'trace.coalesced_other': 'Nhật ký bỏ qua {dropped} bước chi tiết ở đây.'
  });

  // Warnings of a finished puzzle (PuzzleResult.warnings) and error messages (error.<code>)

  add({
    'difficulty.approximate': 'Trình sinh đề không đạt chính xác mức độ yêu cầu, nên đây là đề gần nhất mà ' +
      'nó tìm được.',
    'digger.unsoundTechnique': 'Một kỹ thuật giải đã cho ra đề không có lời giải duy nhất. Cách đào đơn ' +
      'giản và an toàn đã được dùng thay thế, nên độ khó có thể khác với điểm đánh giá.',
    'trace.downgraded': 'Bàn cờ quá lớn để phát lại từng bước đầy đủ, nên mức chi tiết đã được giảm xuống ' +
      'thành tóm tắt.',

    'error.unknown': 'Đã xảy ra lỗi ({code}).',
    'error.unexpected': 'Một lỗi không mong muốn đã làm trình sinh đề dừng lại: {message}',
    'error.budget.exceeded': 'Việc tạo đề mất nhiều thời gian hơn mức cho phép nên đã bị dừng. Hãy thử ' +
      'lại, đổi seed hoặc chọn mức dễ hơn.',
    'error.budget.cancelled': 'Đã hủy việc tạo đề.',
    'error.constraints.invalidExtension': 'Một phần mở rộng ràng buộc không hợp lệ (id: {id}).',
    'error.constraints.duplicateExtension': 'Phần mở rộng ràng buộc “{id}” bị đăng ký hai lần.',
    'error.dfs.invalidGivens': 'Các chữ số cho sẵn không phù hợp với bàn cờ này.',
    'error.dfs.invalidLimit': 'Giới hạn số lời giải “{limit}” không hợp lệ.',
    'error.difficulty.unknownLevel': 'Không có mức độ khó “{level}”.',
    'error.difficulty.unknownTechnique': 'Kỹ thuật giải “{technique}” chưa có điểm độ khó.',
    'error.difficulty.unsupportedLevel': '{variantId} không tạo được đề ở mức “{level}”. Hãy chọn mức khác.',
    'error.digger.invalidOption': 'Giá trị “{value}” không hợp lệ cho tùy chọn “{option}”.',
    'error.digger.noRatedPuzzle': 'Không có đề {variantId} nào được chấm điểm trọn vẹn bằng suy luận. Hãy ' +
      'thử lại với seed khác.',
    'error.digger.objectiveGuard': 'Một lần giải của bước đào có định hướng đã vượt giới hạn công việc.',
    'error.digger.uniqueGuard': 'Một lần kiểm tra lời giải duy nhất của bước tìm kiếm đã vượt giới hạn ' +
      'công việc.',
    'error.digger.invalidSolution': 'Lời giải đưa cho bộ đào không hợp lệ.',
    'error.digger.notUnique': 'Đề đã đào của {variantId} không có đúng một lời giải.',
    'error.digger.invalidStrategy': 'Chiến lược đào “{id}” không hợp lệ.',
    'error.digger.unknownStrategy': 'Không có chiến lược đào “{id}”.',
    'error.digger.invalidPostGenerate': 'Hàm dựng cấu trúc phụ của {variantId} trả về một bàn cờ không ' +
      'dùng được.',
    'error.events.invalidPatch': 'Một bản cập nhật bàn cờ trong nhật ký các bước không hợp lệ.',
    'error.events.invalidVerbosity': 'Mức chi tiết “{verbosity}” của nhật ký các bước không tồn tại.',
    'error.events.invalidSink': 'Nơi nhận nhật ký các bước không hợp lệ.',
    'error.events.invalidEvent': 'Một sự kiện trong nhật ký các bước không hợp lệ.',
    'error.events.invalidLimit': 'Giới hạn kích thước “{maxEvents}” của nhật ký các bước không hợp lệ.',
    'error.exchange.invalidToken': 'Mã của liên kết đề không hợp lệ hoặc bị cắt cụt. Hãy sao chép lại ' +
      'toàn bộ liên kết.',
    'error.exchange.tooLarge': 'Đề này quá lớn để chuyển bằng liên kết.',
    'error.exchange.unsupportedEncoding': 'Trình duyệt này không giải nén được liên kết đề. Hãy dùng một ' +
      'trình duyệt mới hơn.',
    'error.exchange.invalidJson': 'Nội dung của liên kết đề không phải là JSON hợp lệ.',
    'error.exchange.invalidUrl': 'Địa chỉ của trình chơi không hợp lệ. Cần một địa chỉ http hoặc https.',
    'error.fullGrid.invalidFixedCells': 'Các ô cố định của bàn cờ mâu thuẫn với nhau.',
    'error.fullGrid.unsatisfiable': 'Bàn cờ {variantId} không có lời giải nào.',
    'error.killer.sliceExpired': 'Việc tìm lồng đã hết khoảng thời gian được cấp.',
    'error.model.invalidSpec': 'Định nghĩa của bàn cờ không hợp lệ.',
    'error.pipeline.invalidOption': 'Tùy chọn “{option}” không hợp lệ.',
    'error.pipeline.invalidModel': 'Biến thể {variantId} đã dựng ra một bàn cờ không dùng được.',
    'error.rng.invalidSeed': 'Seed “{seed}” không hợp lệ. Hãy dùng một số nguyên.',
    'error.rng.invalidRange': 'Khoảng ngẫu nhiên “{n}” không hợp lệ.',
    'error.solver.invalidFinding': 'Kỹ thuật {technique} trả về một suy luận không hợp lệ.',
    'error.solver.invalidOption': 'Tùy chọn “{option}” của bộ giải logic không hợp lệ.',
    'error.solver.unknownTechnique': 'Không có kỹ thuật giải “{id}”.',
    'error.solver.invalidGivens': 'Các chữ số cho sẵn không hợp lệ đối với bộ giải logic.',
    'error.solver.emptyFinding': 'Kỹ thuật {technique} trả về một suy luận không thay đổi gì.',
    'error.solver.stateMutated': 'Kỹ thuật {technique} đã sửa trạng thái bàn cờ, điều mà nó không được ' +
      'phép làm.',
    'error.solver.noEffect': 'Kỹ thuật {technique} trả về một suy luận không có tác dụng.',
    'error.symmetry.unknownKind': 'Không có kiểu đối xứng “{kind}”.',
    'error.symmetry.needsSquareCanvas': 'Kiểu đối xứng “{kind}” cần bàn cờ vuông, nhưng bàn này là ' +
      '{rows}×{cols}.',
    'error.technique.invalidDef': 'Định nghĩa của kỹ thuật “{id}” không hợp lệ.',
    'error.technique.duplicate': 'Kỹ thuật “{id}” bị đăng ký hai lần.',
    'error.technique.unknown': 'Không có kỹ thuật “{id}”.',
    'error.variant.invalidDef': 'Định nghĩa của biến thể “{id}” không hợp lệ.',
    'error.variant.duplicate': 'Biến thể “{id}” bị đăng ký hai lần.',
    'error.variant.unknown': 'Không có biến thể “{id}”.'
  });

  if (SG.i18n && typeof SG.i18n.mergeFragments === 'function') SG.i18n.mergeFragments();
})(typeof self !== 'undefined' ? self : globalThis);
