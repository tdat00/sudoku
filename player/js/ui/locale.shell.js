/**
 * Strings of the static page frame (index.html): header, the welcome screen, landmarks and the live
 * regions. Pure data - the file never touches the DOM.
 *
 * Keys are prefixed `shell.`. `app.title` is owned by the base locale packs and only used from the HTML.
 * The strings of the dynamic parts (open dialog, info card, recent list, ...) live in js/ui/app.js.
 */
(function (root) {
  'use strict';

  const SG = (root.SG = root.SG || {});

  const LOCALE_FRAGMENT = {
    en: {
      'shell.skip': 'Skip to the puzzle',

      'shell.open': 'Open puzzle',
      'shell.open.title': 'Open a puzzle from a file, a link or pasted text',

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
      'shell.help.title': 'Open help',

      'shell.welcome.title': 'Open a Sudoku puzzle to play it',
      'shell.welcome.lead': 'This is a player for puzzles made by Sudoku Generator: all 15 variants, ' +
        'notes, hints that name the technique, and progress that is saved for you.',
      'shell.welcome.step1': 'Make a puzzle in Sudoku Generator and press “Play online”.',
      'shell.welcome.step2': 'Or open a puzzle file, paste a link, or paste a line of 81 digits (a classic ' +
        'board).',
      'shell.welcome.step3': 'Come back any time: your progress is kept on this device.',
      'shell.welcome.open': 'Open a puzzle',
      'shell.welcome.generator': 'Get a puzzle from Sudoku Generator',
      'shell.welcome.privacy': 'Everything stays in your browser. Nothing is uploaded and no account is ' +
        'needed.',

      'shell.board.title': 'Sudoku board',
      'shell.board.desc': 'Open a puzzle to see the board.',
      'shell.side.heading': 'Puzzle information and play tools',
      'shell.info.title': 'This puzzle',
      'shell.recent.title': 'Recent puzzles',
      'shell.status.label': 'Status',

      'shell.drop.title': 'Drop the puzzle file here',
      'shell.drop.hint': 'A file made by Sudoku Generator, or a text file with a puzzle line.',
      'shell.toast.label': 'Notifications'
    },
    vi: {
      'shell.skip': 'Chuyển tới bàn cờ',

      'shell.open': 'Mở đề',
      'shell.open.title': 'Mở đề từ tệp, liên kết hoặc đoạn văn bản đã dán',

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
      'shell.help.title': 'Mở trợ giúp',

      'shell.welcome.title': 'Mở một đề Sudoku để chơi',
      'shell.welcome.lead': 'Đây là trình chơi cho các đề do Trình sinh đề Sudoku tạo ra: đủ 15 biến thể, ' +
        'có ghi chú, gợi ý nêu tên kỹ thuật và tự động lưu tiến độ cho bạn.',
      'shell.welcome.step1': 'Tạo một đề trong Trình sinh đề Sudoku rồi bấm “Chơi trực tuyến”.',
      'shell.welcome.step2': 'Hoặc mở tệp đề, dán liên kết, hay dán một dòng 81 chữ số (bàn cờ cổ điển).',
      'shell.welcome.step3': 'Bạn có thể quay lại bất cứ lúc nào: tiến độ được giữ trên thiết bị này.',
      'shell.welcome.open': 'Mở một đề',
      'shell.welcome.generator': 'Lấy đề từ Trình sinh đề Sudoku',
      'shell.welcome.privacy': 'Mọi thứ nằm trong trình duyệt của bạn. Không có gì được tải lên và không ' +
        'cần tài khoản.',

      'shell.board.title': 'Bàn cờ Sudoku',
      'shell.board.desc': 'Hãy mở một đề để thấy bàn cờ.',
      'shell.side.heading': 'Thông tin đề và công cụ chơi',
      'shell.info.title': 'Đề này',
      'shell.recent.title': 'Đề gần đây',
      'shell.status.label': 'Trạng thái',

      'shell.drop.title': 'Thả tệp đề vào đây',
      'shell.drop.hint': 'Tệp do Trình sinh đề Sudoku tạo, hoặc tệp văn bản có một dòng đề.',
      'shell.toast.label': 'Thông báo'
    }
  };

  SG.localeFragments = SG.localeFragments || [];
  SG.localeFragments.push(LOCALE_FRAGMENT);
})(typeof self !== 'undefined' ? self : globalThis);
