'use strict';
// MS13b scratch: the locale delta of the task, checked against the amended brief (SA2's ruling 2, 2386638). It dumps every text of
// both language packs of both apps for the tree and for the base commit (dump-locales.js in child processes, the base read from
// git into memory), and
//   - requires that EXACTLY these entries differ: for each app and each language, the two IDs' `.desc` and their
//     `.step.endpoints`, `.step.contradiction` and `.step.forced` (2 x 4 x 2 languages x 2 apps = 32 entries) and nothing else,
//   - requires that each new step text is the old prefix through `{chains}. ` (so `{length}` and `{chains}` stay) followed by the
//     body that the brief prescribes (literal copies of the brief's two tables below), and that each new description keeps the old
//     description as its beginning and adds the brief's clauses,
//   - writes the exact old/new texts as a markdown table.
//   node generator/tests/artifacts/difficulty-v3/MS13b/locale-delta.cjs <out.md> [commit]
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const out = process.argv[2];
const commit = process.argv[3] || '7932132';
const script = path.join(__dirname, 'dump-locales.js');

const BODY = {
  en: {
    endpoints: 'If the first end is false, the last end is true, so at least one end is true. Candidates that conflict ' +
      'with every candidate represented by each end are removed.',
    contradiction: 'If the first candidate were true, a statement about a candidate or group would be both true and ' +
      'false, which is impossible. So the first candidate is false and is removed.',
    forced: 'If the first candidate were false, a statement about a candidate or group would be both true and false, ' +
      'which is impossible. So the first candidate is true and is placed.'
  },
  vi: {
    endpoints: 'Nếu đầu thứ nhất sai thì đầu cuối đúng, nên ít nhất một đầu là đúng. Các ứng viên xung đột với từng ứng ' +
      'viên được biểu diễn ở mỗi đầu đều bị loại.',
    contradiction: 'Nếu ứng viên đầu tiên đúng thì một mệnh đề về ứng viên hoặc nhóm sẽ vừa đúng vừa sai, điều không thể ' +
      'xảy ra. Vậy ứng viên đầu tiên sai và bị loại.',
    forced: 'Nếu ứng viên đầu tiên sai thì một mệnh đề về ứng viên hoặc nhóm sẽ vừa đúng vừa sai, điều không thể xảy ra. ' +
      'Vậy ứng viên đầu tiên đúng và được điền vào.'
  }
};
const CLAUSES = {
  en: {
    shortGroup: 'If a proof step represents a group, it lists the cells that can still hold one digit where a box (or ' +
      'region) meets a row or column.',
    longGroup: 'If a proof step represents a group, its truth and falsehood have the same meaning as in a Forcing Chain.',
    endpoint: 'Any candidate removed by the endpoint rule must conflict with every candidate represented by each end.',
    trueExample: '(R1C1=5 \u2228 R1C2=5)', falseExample: '(R1C1\u22605 \u2227 R1C2\u22605)'
  },
  vi: {
    shortGroup: 'Nếu một bước chứng minh biểu diễn một nhóm, bước đó liệt kê các ô còn có thể chứa cùng một chữ số tại ' +
      'giao của một khối (hoặc vùng) với một hàng hoặc cột.',
    longGroup: 'Nếu một bước chứng minh biểu diễn một nhóm, ý nghĩa đúng và sai của nhóm giống như trong Chuỗi suy luận.',
    endpoint: 'Ứng viên bị loại theo quy tắc hai đầu phải xung đột với từng ứng viên được biểu diễn ở mỗi đầu.',
    trueExample: '(R1C1=5 \u2228 R1C2=5)', falseExample: '(R1C1\u22605 \u2227 R1C2\u22605)'
  }
};
const IDS = ['forcingChain', 'forcingChainLong'];
const SUBTYPES = ['endpoints', 'contradiction', 'forced'];
const ALLOWED = [];
IDS.forEach((id) => {
  ALLOWED.push('technique.' + id + '.desc');
  SUBTYPES.forEach((s) => ALLOWED.push('technique.' + id + '.step.' + s));
});

function dump(app, base) {
  const env = Object.assign({}, process.env, { MS13B_APP: app });
  delete env.MS13B_BASE;
  if (base) env.MS13B_BASE = 'git:' + commit;
  const run = spawnSync(process.execPath, [script], { env, encoding: 'utf8', maxBuffer: 1 << 28 });
  if (run.status !== 0) throw new Error(app + ' ' + (base ? 'base' : 'tree') + ': ' + run.stderr);
  return JSON.parse(run.stdout);
}

const problems = [];
const rows = [];
let changedTotal = 0;
['generator', 'player'].forEach((app) => {
  const tree = dump(app, false);
  const base = dump(app, true);
  ['en', 'vi'].forEach((code) => {
    const keys = Array.from(new Set(Object.keys(tree[code]).concat(Object.keys(base[code])))).sort();
    const changed = keys.filter((k) => tree[code][k] !== base[code][k]);
    changedTotal += changed.length;
    const expected = ALLOWED.slice().sort();
    if (JSON.stringify(changed) !== JSON.stringify(expected)) {
      problems.push(app + ' ' + code + ': the changed keys are ' + JSON.stringify(changed));
    }
    if (Object.keys(tree[code]).length !== Object.keys(base[code]).length) problems.push(app + ' ' + code + ': key count differs');
    changed.forEach((key) => {
      const oldText = base[code][key];
      const newText = tree[code][key];
      const where = app + ' ' + code + ' ' + key;
      if (/\.step\./.test(key)) {
        const cut = oldText.indexOf('{chains}. ');
        const prefix = cut === -1 ? null : oldText.slice(0, cut + '{chains}. '.length);
        const subtype = key.split('.').pop();
        if (prefix === null) problems.push(where + ': the old text has no {chains}. prefix');
        else if (newText !== prefix + BODY[code][subtype]) problems.push(where + ': not the old prefix + the brief body');
        if (prefix !== null && (prefix.indexOf('{length}') === -1)) problems.push(where + ': {length} lost');
      } else {
        const long = /Long\.desc$/.test(key);
        const c = CLAUSES[code];
        if (newText.indexOf(oldText) !== 0) problems.push(where + ': the old description is not kept at the start');
        if (newText.indexOf(long ? c.longGroup : c.shortGroup) === -1) problems.push(where + ': the group clause is missing');
        if (newText.indexOf(c.endpoint) === -1) problems.push(where + ': the endpoint clause is missing');
        if (!long && (newText.indexOf(c.trueExample) === -1 || newText.indexOf(c.falseExample) === -1)) {
          problems.push(where + ': the true/false examples are missing');
        }
        if (/[{}]/.test(newText)) problems.push(where + ': a brace in a description');
      }
      rows.push({ app, code, key, oldText, newText });
    });
  });
});
const esc = (t) => t.replace(/\|/g, '\\|');
const lines = ['# MS13b locale delta: exact old and new texts', '',
  'Base `' + commit + '`, tree = the final source; **' + changedTotal + ' entries differ** (expected 32); every other text of the two ' +
  'language packs of both apps is equal. Generated by `generator/tests/artifacts/difficulty-v3/MS13b/locale-delta.cjs`.', '',
  problems.length === 0 ? 'Check against the amended brief: **passed** (exact key set; each step text is the old prefix through ' +
    '`{chains}. ` plus the brief\'s body; each description keeps its old text and adds the brief\'s clauses).' :
    'Check against the amended brief: **FAILED**: ' + problems.join('; '), '',
  '| # | App | Lang | Key | Old | New |', '|---:|---|---|---|---|---|'];
rows.forEach((r, i) => lines.push('| ' + (i + 1) + ' | ' + r.app + ' | ' + r.code + ' | `' + r.key + '` | ' + esc(r.oldText) + ' | ' +
  esc(r.newText) + ' |'));
fs.writeFileSync(path.resolve(out), lines.join('\r\n') + '\r\n', 'utf8');
console.log(changedTotal + ' entries differ; ' + (problems.length === 0 ? 'every check passed' : problems.length + ' problem(s)'));
problems.forEach((p) => console.log('PROBLEM ' + p));
process.exit(problems.length === 0 && changedTotal === 32 ? 0 : 1);
