/**
 * Strings of the static page frame (index.html): header, landmarks, control-panel actions, the replay
 * player shell, the steps panel and the live regions. Pure data - the file never touches the DOM.
 *
 * Keys are prefixed `shell.` (page frame) or `player.` (the replay buttons, shared with js/ui/player.js).
 * `app.title` is owned by the base locale packs and only used from the HTML.
 */
(function (root) {
  'use strict';

  const SG = (root.SG = root.SG || {});

  const LOCALE_FRAGMENT = {
    en: {
      'shell.skip': 'Skip to main content',

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

      'shell.drawer.toggle': 'Options',
      'shell.drawer.title': 'Show or hide the options panel',

      'shell.controls.heading': 'Puzzle options',
      'shell.actions.label': 'Actions',
      'shell.btn.generate': 'Generate',
      'shell.btn.generate.title': 'Generate a new puzzle with the chosen options',
      'shell.btn.regenerate': 'Generate random',
      'shell.btn.regenerate.title': 'Generate another puzzle with the current options and a new random seed',
      'shell.btn.cancel': 'Cancel',
      'shell.btn.cancel.title': 'Stop the running generation',
      'shell.mainActions.label': 'Puzzle actions',
      'shell.btn.playOnline': 'Play',
      'shell.btn.playOnline.title': 'Open your puzzles in sudoku-player to solve them (this one first)',
      'shell.btn.export': 'Print',
      'shell.btn.export.title': 'Print the puzzle or save it as a PDF',
      'shell.btn.exportCode': 'Export',
      'shell.btn.exportCode.title': 'Export the puzzles you choose as readable text',

      'shell.board.heading': 'Puzzle board',
      'shell.board.title': 'Sudoku board',
      'shell.board.desc': 'The generated puzzle appears here.',

      'shell.player.heading': 'Replay',
      'player.label': 'Replay controls',
      'player.first': 'Go to the start (the empty grid)',
      'player.prev': 'Previous step',
      'player.next': 'Next step',
      'player.last': 'Go to the finished puzzle',
      'player.scrubber': 'Replay step',


      'shell.steps.heading': 'Step description',
      'shell.tabs.label': 'Summary and generation steps',
      'shell.tab.result': 'Summary',
      'shell.tab.steps': 'Generation Steps',
      'shell.btn.explain': 'Explain',
      'shell.btn.explain.title': 'Open the Help to read how the current step works',

      'shell.result.label': 'Result',
      'shell.footer.copyright': '\u00a9 2026 Dat Le. Released under the MIT licence.',
      'shell.footer.repo': 'Source code on GitHub',
      'shell.footer.repo.title': 'Open the repository of sudoku-generator on GitHub (new tab)',
      'shell.toast.label': 'Notifications'
    },
    vi: {
      'shell.skip': 'Bỏ qua, đến nội dung chính',

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
      'shell.help.title': 'Mở phần trợ giúp',

      'shell.drawer.toggle': 'Tùy chọn',
      'shell.drawer.title': 'Hiện hoặc ẩn bảng tùy chọn',

      'shell.controls.heading': 'Tùy chọn đề bài',
      'shell.actions.label': 'Thao tác',
      'shell.btn.generate': 'Tạo đề',
      'shell.btn.generate.title': 'Tạo đề Sudoku mới theo các tùy chọn đã chọn',
      'shell.btn.regenerate': 'Tạo ngẫu nhiên',
      'shell.btn.regenerate.title': 'Tạo thêm một đề khác với các tùy chọn hiện tại và một seed ' +
        'ngẫu nhiên mới',
      'shell.btn.cancel': 'Hủy',
      'shell.btn.cancel.title': 'Dừng quá trình tạo đề đang chạy',
      'shell.mainActions.label': 'Thao tác với đề',
      'shell.btn.playOnline': 'Chơi',
      'shell.btn.playOnline.title': 'Mở các đề của bạn trong sudoku-player để giải (đề này đứng đầu)',
      'shell.btn.export': 'In đề',
      'shell.btn.export.title': 'In đề hoặc lưu thành PDF',
      'shell.btn.exportCode': 'Xuất văn bản',
      'shell.btn.exportCode.title': 'Xuất các đề bạn chọn dưới dạng văn bản đọc được',

      'shell.board.heading': 'Bảng đề bài',
      'shell.board.title': 'Bảng Sudoku',
      'shell.board.desc': 'Đề bài vừa tạo sẽ hiển thị ở đây.',

      'shell.player.heading': 'Phát lại',
      'player.label': 'Điều khiển phát lại',
      'player.first': 'Về lúc bắt đầu (lưới trống)',
      'player.prev': 'Bước trước',
      'player.next': 'Bước tiếp theo',
      'player.last': 'Đến đề hoàn chỉnh',
      'player.scrubber': 'Bước phát lại',


      'shell.steps.heading': 'Mô tả bước',
      'shell.tabs.label': 'Tóm tắt và các bước tạo đề',
      'shell.tab.result': 'Tóm tắt',
      'shell.tab.steps': 'Các bước tạo đề',
      'shell.btn.explain': 'Giải thích',
      'shell.btn.explain.title': 'Mở phần Trợ giúp để đọc cách bước hiện tại hoạt động',

      'shell.result.label': 'Kết quả',
      'shell.footer.copyright': '\u00a9 2026 Dat Le. Phát hành theo giấy phép MIT.',
      'shell.footer.repo': 'Mã nguồn trên GitHub',
      'shell.footer.repo.title': 'Mở kho mã sudoku-generator trên GitHub (tab mới)',
      'shell.toast.label': 'Thông báo'
    }
  };

  SG.localeFragments = SG.localeFragments || [];
  SG.localeFragments.push(LOCALE_FRAGMENT);
})(typeof self !== 'undefined' ? self : globalThis);
