/**
 * Strings of the static page frame (index.html): header, welcome screen, landmarks and live regions; keys are
 * prefixed `shell.`. `app.title` is owned by the base packs. Strings of the dynamic parts live in js/ui/app.js.
 */
(function (root) {
  'use strict';

  const SG = (root.SG = root.SG || {});

  const LOCALE_FRAGMENT = {
    en: {
      'shell.skip': 'Skip to the puzzle',

      'shell.open': 'Import',
      'shell.open.title': 'Import puzzles from a file, a link or pasted text',
      'shell.share': 'Share',
      'shell.share.title': 'Get a link that opens this puzzle in Sudoku Player',
      'shell.mainActions.label': 'Puzzle actions',

      'shell.lang.label': 'Language',
      'shell.lang.en.short': 'EN',
      'shell.lang.en.name': 'English',
      'shell.lang.vi.short': 'VI',
      'shell.lang.vi.name': 'Tiếng Việt',

      'shell.theme.label': 'Theme',
      'shell.theme.light': 'Light theme',
      'shell.theme.dark': 'Dark theme',
      'shell.theme.highContrast': 'High-contrast theme',

      'shell.settings': 'Settings',
      'shell.settings.title': 'Open settings',
      'shell.help': 'Help',
      'shell.help.title': 'Open the guide in a new tab',

      'shell.welcome.title': 'Import a Sudoku puzzle to play it',
      'shell.welcome.lead': 'This is a player for puzzles made by Sudoku Generator: all 15 variants, ' +
        'notes, hints that name the technique, and progress that is saved for you.',
      'shell.welcome.step1': 'Make a puzzle in Sudoku Generator and press “Play online”.',
      'shell.welcome.step2': 'Or import puzzles: a puzzle file, a link, the text of Sudoku Generator’s ' +
        '“Export” box (one or many puzzles), or a line of 81 digits (a classic board).',
      'shell.welcome.step3': 'Come back any time: your progress is kept on this device.',
      'shell.welcome.open': 'Import puzzles',
      'shell.welcome.generator': 'Get a puzzle from Sudoku Generator',
      'shell.welcome.privacy': 'Everything stays in your browser. Nothing is uploaded and no account is ' +
        'needed.',

      'shell.board.title': 'Sudoku board',
      'shell.board.desc': 'Import a puzzle to see the board.',
      'shell.side.heading': 'Play tools and options',
      'shell.recent.title': 'Imported puzzles',
      'shell.status.label': 'Status',

      'shell.drop.title': 'Drop the puzzle files here',
      'shell.drop.hint': 'Files made by Sudoku Generator, or text files with puzzles.',
      'shell.toast.label': 'Notifications',
      'shell.footer.copyright': '\u00a9 2026 Dat Le. Released under the MIT licence.',
      'shell.footer.repo': 'Source code on GitHub',
      'shell.footer.repo.title': 'Open the repository of sudoku-player on GitHub (new tab)'
    },
    vi: {
      'shell.skip': 'Chuyển tới bàn cờ',

      'shell.open': 'Nhập đề',
      'shell.open.title': 'Nhập đề từ tệp, liên kết hoặc đoạn văn bản đã dán',
      'shell.share': 'Chia sẻ',
      'shell.share.title': 'Lấy liên kết mở đề này trong Trình chơi Sudoku',
      'shell.mainActions.label': 'Thao tác với đề',

      'shell.lang.label': 'Ngôn ngữ',
      'shell.lang.en.short': 'EN',
      'shell.lang.en.name': 'English',
      'shell.lang.vi.short': 'VI',
      'shell.lang.vi.name': 'Tiếng Việt',

      'shell.theme.label': 'Giao diện',
      'shell.theme.light': 'Giao diện sáng',
      'shell.theme.dark': 'Giao diện tối',
      'shell.theme.highContrast': 'Giao diện tương phản cao',

      'shell.settings': 'Cài đặt',
      'shell.settings.title': 'Mở cài đặt',
      'shell.help': 'Trợ giúp',
      'shell.help.title': 'Mở hướng dẫn ở tab mới',

      'shell.welcome.title': 'Nhập một đề Sudoku để chơi',
      'shell.welcome.lead': 'Đây là trình chơi cho các đề do Trình sinh đề Sudoku tạo ra: đủ 15 biến thể, ' +
        'có ghi chú, gợi ý nêu tên kỹ thuật và tự động lưu tiến độ cho bạn.',
      'shell.welcome.step1': 'Tạo một đề trong Trình sinh đề Sudoku rồi bấm “Chơi trực tuyến”.',
      'shell.welcome.step2': 'Hoặc nhập đề: tệp đề, liên kết, văn bản trong ô “Xuất” của Trình sinh đề ' +
        'Sudoku (một hay nhiều đề), hay một dòng 81 chữ số (bàn cờ cổ điển).',
      'shell.welcome.step3': 'Bạn có thể quay lại bất cứ lúc nào: tiến độ được giữ trên thiết bị này.',
      'shell.welcome.open': 'Nhập đề',
      'shell.welcome.generator': 'Lấy đề từ Trình sinh đề Sudoku',
      'shell.welcome.privacy': 'Mọi thứ nằm trong trình duyệt của bạn. Không có gì được tải lên và không ' +
        'cần tài khoản.',

      'shell.board.title': 'Bàn cờ Sudoku',
      'shell.board.desc': 'Hãy nhập một đề để thấy bàn cờ.',
      'shell.side.heading': 'Công cụ chơi và tùy chọn',
      'shell.recent.title': 'Các đề đã nhập',
      'shell.status.label': 'Trạng thái',

      'shell.drop.title': 'Thả các tệp đề vào đây',
      'shell.drop.hint': 'Các tệp do Trình sinh đề Sudoku tạo, hoặc tệp văn bản có các đề.',
      'shell.toast.label': 'Thông báo',
      'shell.footer.copyright': '\u00a9 2026 Dat Le. Phát hành theo giấy phép MIT.',
      'shell.footer.repo': 'Mã nguồn trên GitHub',
      'shell.footer.repo.title': 'Mở kho mã sudoku-player trên GitHub (tab mới)'
    }
  };

  SG.localeFragments = SG.localeFragments || [];
  SG.localeFragments.push(LOCALE_FRAGMENT);
})(typeof self !== 'undefined' ? self : globalThis);
