/**
 * Strings of the static page frame (index.html): header, landmarks, control-panel actions, the replay
 * player shell, the steps panel and the live regions. Pure data - the file never touches the DOM.
 *
 * Keys are prefixed `shell.` (page frame) or `player.` (replay transport and speed buttons, shared with
 * js/ui/player.js). `app.title` is owned by the base locale packs and only used from the HTML.
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
      'shell.btn.regenerate': 'Regenerate',
      'shell.btn.regenerate.title': 'Generate another puzzle with the current options',
      'shell.btn.cancel': 'Cancel',
      'shell.btn.cancel.title': 'Stop the running generation',
      'shell.btn.export': 'Export',
      'shell.btn.export.title': 'Export or share the puzzle',

      'shell.board.heading': 'Puzzle board',
      'shell.board.title': 'Sudoku board',
      'shell.board.desc': 'The generated puzzle appears here.',

      'shell.player.heading': 'Replay',
      'player.label': 'Replay controls',
      'player.first': 'Go to the first step',
      'player.prev': 'Previous step',
      'player.play': 'Play',
      'player.pause': 'Pause',
      'player.next': 'Next step',
      'player.last': 'Go to the last step',
      'player.scrubber': 'Replay position',
      'player.speed.label': 'Replay speed',
      'player.speed.instant': 'Instant',
      'player.speed.instant.title': 'Skip the animation and show the finished puzzle',
      'player.speed.fast': 'Fast',
      'player.speed.fast.title': 'Replay the steps quickly',
      'player.speed.step': 'Step',
      'player.speed.step.title': 'Pause after every step',
      'player.speed.manual': 'Manual',
      'player.speed.manual.title': 'Move forward only when you press Next step',

      'shell.status.label': 'Status:',

      'shell.steps.heading': 'Generation steps',
      'shell.steps.toggle': 'Details',
      'shell.steps.toggle.title': 'Expand or collapse the step details',
      'shell.explain.heading': 'Explanation',

      'shell.result.label': 'Result',
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
      'shell.btn.regenerate': 'Tạo lại',
      'shell.btn.regenerate.title': 'Tạo thêm một đề khác với các tùy chọn hiện tại',
      'shell.btn.cancel': 'Hủy',
      'shell.btn.cancel.title': 'Dừng quá trình tạo đề đang chạy',
      'shell.btn.export': 'Xuất đề',
      'shell.btn.export.title': 'Xuất hoặc chia sẻ đề bài',

      'shell.board.heading': 'Bảng đề bài',
      'shell.board.title': 'Bảng Sudoku',
      'shell.board.desc': 'Đề bài vừa tạo sẽ hiển thị ở đây.',

      'shell.player.heading': 'Phát lại',
      'player.label': 'Điều khiển phát lại',
      'player.first': 'Về bước đầu tiên',
      'player.prev': 'Bước trước',
      'player.play': 'Phát',
      'player.pause': 'Tạm dừng',
      'player.next': 'Bước tiếp theo',
      'player.last': 'Đến bước cuối cùng',
      'player.scrubber': 'Vị trí phát lại',
      'player.speed.label': 'Tốc độ phát lại',
      'player.speed.instant': 'Tức thì',
      'player.speed.instant.title': 'Bỏ qua hoạt ảnh và hiện ngay đề đã hoàn chỉnh',
      'player.speed.fast': 'Nhanh',
      'player.speed.fast.title': 'Phát lại nhanh các bước',
      'player.speed.step': 'Từng bước',
      'player.speed.step.title': 'Dừng lại sau mỗi bước',
      'player.speed.manual': 'Thủ công',
      'player.speed.manual.title': 'Chỉ chuyển bước khi bạn bấm Bước tiếp theo',

      'shell.status.label': 'Trạng thái:',

      'shell.steps.heading': 'Các bước tạo đề',
      'shell.steps.toggle': 'Chi tiết',
      'shell.steps.toggle.title': 'Mở rộng hoặc thu gọn chi tiết các bước',
      'shell.explain.heading': 'Giải thích',

      'shell.result.label': 'Kết quả',
      'shell.toast.label': 'Thông báo'
    }
  };

  SG.localeFragments = SG.localeFragments || [];
  SG.localeFragments.push(LOCALE_FRAGMENT);
})(typeof self !== 'undefined' ? self : globalThis);
