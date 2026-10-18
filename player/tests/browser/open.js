'use strict';
// Browser run: every way of importing a puzzle (the generator's export text by paste, drop and file input,
// several puzzles at once, tokens and links, text lines, hashchange) and the error paths.
// Usage: node tests/browser/open.js [-v]
const fs = require('fs');
const path = require('path');
const { launch, newPage, serve, sleep, ROOT } = require('./lib.js');

const base = 'http://127.0.0.1:8768/index.html';
const dir = path.join(ROOT, 'tests/fixtures/puzzles');
const NAMES = fs.readdirSync(dir).map(function (n) { return n.replace('.json', ''); });
const checks = [];
function check(name, ok, detail) {
  checks.push({ name, ok });
  if (!ok || process.argv.includes('-v')) console.log((ok ? 'ok   ' : 'FAIL ') + name + (detail !== undefined ? '  ' + detail : ''));
}

async function fresh(page) {
  await page.goto('about:blank', 50);
  await page.goto(base, 700);
  await page.eval('localStorage.clear()');
  await page.goto('about:blank', 50);
  await page.goto(base, 900);
}

const variantOf = function (page) { return page.eval('SG.app.getPuzzle() && SG.app.getPuzzle().variantId'); };

(async function () {
  const server = await serve(8768);
  const browser = await launch({ port: 9337, name: 'q5' });
  try {
    const page = await newPage(browser);
    await fresh(page);

    // ---- a bare token and a full player link (the "Play online" hand-off) for every fixture
    for (const name of NAMES) {
      const text = fs.readFileSync(path.join(dir, name + '.json'), 'utf8');
      const doc = JSON.parse(text);
      const expected = doc.variantId;
      const tok = await page.eval('SG.exchange.encode(' + text + ')');
      const inputs = [['token', tok], ['link', 'http://example.org/player/index.html#puzzle=' + tok]];
      for (const [kind, value] of inputs) {
        await page.eval('localStorage.clear()');
        await page.goto('about:blank', 50);
        await page.goto(base, 500);
        // paste event on the page (outside a text field)
        await page.eval('(function(){var dt=new DataTransfer();dt.setData("text", ' + JSON.stringify(value) +
          ');document.body.dispatchEvent(new ClipboardEvent("paste",{clipboardData:dt,bubbles:true,cancelable:true}));})()');
        try {
          await page.waitFor('SG.app.getPuzzle() !== null', 4000);
        } catch (err) { /* reported below */ }
        check('paste ' + kind + ' ' + name, (await variantOf(page)) === expected, await variantOf(page));
      }
    }
    console.log('openings done:', checks.filter(function (c) { return c.ok; }).length + '/' + checks.length);

    // ---- the text of the generator's Export box: paste, drop, file input, several puzzles at once
    const exportsDir = path.join(ROOT, 'tests/fixtures/exports');
    const mixed = fs.readFileSync(path.join(exportsDir, 'classic-mixed.en.txt'), 'utf8');
    const listed = function () { return page.eval('document.querySelectorAll("#recent-root .history-item").length'); };
    const gotoFresh = async function () {
      await page.eval('localStorage.clear()');
      await page.goto('about:blank', 50);
      await page.goto(base, 500);
    };
    await gotoFresh();
    await page.eval('(function(){var dt=new DataTransfer();dt.setData("text", ' + JSON.stringify(mixed) +
      ');document.body.dispatchEvent(new ClipboardEvent("paste",{clipboardData:dt,bubbles:true,cancelable:true}));})()');
    try { await page.waitFor('SG.app.getPuzzle() !== null', 5000); } catch (err) { /* below */ }
    await sleep(300);
    check('paste of 4 exported puzzles: the first is on the board', (await variantOf(page)) === 'classic9');
    check('and all 4 are in the left list', (await listed()) === 4, String(await listed()));
    check('a toast says how many were imported', await page.eval('!!document.querySelector(".toast--success")'));
    check('the heading shows the level and the seed of the exported header', /Easy.*Seed: 3/.test(await page.eval('document.getElementById("board-heading").textContent')));
    await page.shot('import-batch');
    await page.click('#recent-root .history-item:nth-child(3) .history-item__open');
    await sleep(600);
    check('another puzzle of the batch opens from the list', (await variantOf(page)) === 'classic6');

    await gotoFresh();
    await page.eval(`(function(){
      var dt = new DataTransfer();
      dt.items.add(new File([${JSON.stringify(mixed)}], "puzzles.txt", {type: "text/plain"}));
      ["dragenter", "dragover", "drop"].forEach(function (type) {
        document.dispatchEvent(new DragEvent(type, {dataTransfer: dt, bubbles: true, cancelable: true}));
      });
    })()`);
    try { await page.waitFor('SG.app.getPuzzle() !== null', 5000); } catch (err) { /* below */ }
    await sleep(300);
    check('drop of an exported text file imports all its puzzles', (await variantOf(page)) === 'classic9' && (await listed()) === 4);
    check('drop overlay hidden again', await page.eval('document.getElementById("drop-overlay").hidden'));

    await gotoFresh();
    await page.click('#btn-welcome-open');
    await page.waitFor('!!document.getElementById("open-text")', 2000);
    check('the Import dialog has no file chooser', await page.eval('!document.getElementById("open-file") && !document.getElementById("open-choose")'));
    await page.eval('(function(){var t=document.getElementById("open-text");t.value=' + JSON.stringify(fs.readFileSync(path.join(exportsDir, 'classic-mixed.vi.txt'), 'utf8')) + ';})()');
    await page.click('#open-submit');
    try { await page.waitFor('SG.app.getPuzzle() !== null', 5000); } catch (err) { /* below */ }
    await sleep(300);
    check('the Vietnamese export typed in the box imports too', (await variantOf(page)) === 'classic9' && (await listed()) === 4);
    check('Import dialog closed after the import', await page.eval('!document.querySelector("dialog.modal[open]")'));

    // Every variant of the generator, as its Export box writes it (one set of four puzzles each).
    const sets = [['structured', 'jigsaw9'], ['derived', 'diagonalX'], ['multigrid', 'samurai']];
    for (const [setName, firstVariant] of sets) {
      for (const code of ['en', 'vi']) {
        const setText = fs.readFileSync(path.join(exportsDir, setName + '.' + code + '.txt'), 'utf8');
        await gotoFresh();
        await page.eval('void SG.app.open(' + JSON.stringify(setText) + ', {source: "paste"})');
        try { await page.waitFor('SG.app.getPuzzle() !== null', 15000); } catch (err) { /* below */ }
        await sleep(500);
        check('export "' + setName + '" (' + code + '): 4 puzzles listed, the first one on the board',
          (await variantOf(page)) === firstVariant && (await listed()) === 4, String(await variantOf(page)) + ' ' + (await listed()));
        check('export "' + setName + '" (' + code + '): nothing is reported as skipped', await page.eval('!document.querySelector("dialog.modal[open]")'));
        for (let k = 2; k <= 4; k++) {
          await page.click('#recent-root .history-item:nth-child(' + k + ') .history-item__open');
          await sleep(500);
        }
        check('export "' + setName + '" (' + code + '): the last one opens from the list and is playable', await page.eval('SG.play.getGame() !== null && SG.play.isActive()'));
      }
    }
    await gotoFresh();
    const noCages = fs.readFileSync(path.join(exportsDir, 'structured.en.txt'), 'utf8').split('\n').filter(function (l) { return l.indexOf('cages:') !== 0; }).join('\n');
    await page.eval('void SG.app.open(' + JSON.stringify(noCages) + ', {source: "paste"})');
    try { await page.waitFor('SG.app.getPuzzle() !== null', 15000); } catch (err) { /* below */ }
    await sleep(500);
    check('an export where one puzzle lacks its structure imports the other 3', (await variantOf(page)) === 'jigsaw9' && (await listed()) === 3);
    check('and lists the one that cannot be rebuilt', await page.eval('document.querySelectorAll("dialog.modal[open] .error-list li").length') === 1);
    await page.shot('import-skipped');
    await page.key('Escape');
    await sleep(200);

    // ---- text lines
    await fresh(page);
    const solved9 = '534678912672195348198342567859761423426853791713924856961537284287419635345286179';
    const line81 = solved9.split('').map(function (ch, i) { return i % 3 === 0 ? '.' : ch; }).join('');
    async function openText(value) {
      await page.eval('void SG.app.open(' + JSON.stringify(value) + ', {source: "paste"})');
      await sleep(700);
    }
    await openText(line81);
    check('81-character line opens a classic 9x9', (await variantOf(page)) === 'classic9');
    // ---- Share: the link of the puzzle on the board, like the generator's Play link
    check('Share sits before Import in the main panel', await page.eval('(function(){var a=document.querySelector(".main-actions").children;return a[0].id==="btn-share"&&a[1].id==="btn-open";})()'));
    const shareId = await page.eval('SG.app.getPuzzle().id');
    await page.click('#btn-share');
    await page.waitFor('!!document.getElementById("share-link") && document.getElementById("share-link").value !== ""', 4000);
    const shareUrl = await page.eval('document.getElementById("share-link").value');
    check('the Share dialog shows a player link with the puzzle in the fragment', /^https:\/\/tdat00\.github\.io\/sudoku-player\/#puzzle=[jz]\.[A-Za-z0-9_-]+$/.test(shareUrl), shareUrl.slice(0, 80));
    check('and a Copy button', await page.eval('!document.getElementById("share-copy").disabled'));
    await page.shot('share-dialog');
    await page.key('Escape');
    await sleep(200);
    await page.eval('localStorage.clear()');
    await page.goto('about:blank', 50);
    await page.goto(base, 600);
    await page.eval('void SG.app.open(' + JSON.stringify(shareUrl.replace('https://tdat00.github.io/sudoku-player/', '')) + ', {source: "link"})');
    try { await page.waitFor('SG.app.getPuzzle() !== null', 4000); } catch (err) { /* below */ }
    check('the shared link opens the same puzzle in a fresh player', (await page.eval('SG.app.getPuzzle() && SG.app.getPuzzle().id')) === shareId);
    await openText(line81);
    check('the Options frame is in the side panel, and the This puzzle card is gone', await page.eval('!!document.querySelector("#options-root .play__options input[name=play-check]") && !document.getElementById("info-root")'));
    await openText('1.3.5.' + '.5.1.3' + '2.4.6.' + '.6.2.4' + '3.5.1.' + '.1.3.5');
    check('36-character line opens a 6x6 board (or reports several solutions)', (await variantOf(page)) === 'classic6' || (await page.eval('!!document.querySelector("dialog.modal[open], .toast")')));
    await openText('1.34' + '34.2' + '2.43' + '43.1');
    check('16-character line opens a 4x4 board', (await variantOf(page)) === 'classic4');
    const before = await page.eval('SG.app.getPuzzle().id');
    await openText('11' + '.'.repeat(79));
    check('an impossible line is refused and the board is unchanged', (await page.eval('SG.app.getPuzzle().id')) === before && await page.eval('!!document.querySelector("dialog.modal[open]")'));
    await page.shot('open-error-dialog');
    await page.click('dialog.modal[open] .btn--secondary');
    await sleep(200);
    await openText('hello world');
    check('garbage is refused with a message', await page.eval('document.querySelector("dialog.modal[open] .error-list li").textContent.length > 10'));
    await page.key('Escape');
    await sleep(200);
    await openText('{"format":"sudoku-generator/v1","variantId":"classic9"}');
    check('JSON text is not an import any more', await page.eval('!!document.querySelector("dialog.modal[open]")'));
    await page.key('Escape');
    await sleep(200);
    check('focus returned after the dialog', await page.eval('document.activeElement && document.activeElement !== document.body'));

    // an empty line puzzle with several solutions: opens with a warning
    await openText('.'.repeat(81));
    check('an empty 9x9 line (many solutions) still opens, with a warning', (await variantOf(page)) === 'classic9' && await page.eval('!!document.querySelector(".toast--warning")'));

    // ---- hashchange while the page is open
    const killerText = fs.readFileSync(path.join(dir, 'killer.json'), 'utf8');
    const ktok = await page.eval('SG.exchange.encode(' + killerText + ')');
    await page.eval('location.hash = "#puzzle=' + ktok + '"');
    await sleep(900);
    check('hashchange opens the puzzle and removes the fragment', (await variantOf(page)) === 'killer' && await page.eval('location.hash === ""'));

    // ---- Open dialog: pasted text box, Ctrl+Enter and the button
    await page.click('#btn-open');
    await page.waitFor('!!document.getElementById("open-text")', 2000);
    check('the Import dialog focuses its text box', await page.eval('document.activeElement && document.activeElement.id === "open-text"'));
    check('"Sudoku Generator" in the Import dialog links to the generator (new tab), in the lead and in the hint', await page.eval('(function(){var l=Array.from(document.querySelectorAll("dialog.modal[open] a.generator-link"));return l.length===2&&l.every(function(a){return a.getAttribute("href")==="https://tdat00.github.io/sudoku-generator/"&&a.target==="_blank"&&/noopener/.test(a.rel)&&a.textContent==="Sudoku Generator";})&&/exported from Sudoku Generator\\.$/.test(document.querySelector("dialog.modal[open] .modal__lead").textContent);})()'));
    await page.eval('SG.app.getStore().set({lang:"vi"},{source:"test"})');
    check('and the link follows the language', await page.eval('(function(){var l=Array.from(document.querySelectorAll("dialog.modal[open] a.generator-link"));return l.length===2&&l.every(function(a){return a.textContent==="Trình sinh đề Sudoku"&&a.getAttribute("href")==="https://tdat00.github.io/sudoku-generator/";});})()'));
    await page.eval('SG.app.getStore().set({lang:"en"},{source:"test"})');
    await page.eval('document.getElementById("open-text").focus()');
    await page.eval('(function(){var t=document.getElementById("open-text");t.value=' + JSON.stringify(line81) + ';})()');
    await page.key('Enter', { ctrl: true });
    await sleep(900);
    check('Ctrl+Enter in the box opens the puzzle', (await variantOf(page)) === 'classic9' && await page.eval('!document.querySelector("dialog.modal[open]")'));
    await page.click('#btn-open');
    await page.waitFor('!!document.getElementById("open-text")', 2000);
    await page.eval('document.getElementById("open-text").value = "nonsense"');
    await page.click('#open-submit');
    await sleep(400);
    check('an error shows inside the dialog and it stays open', await page.eval('!document.getElementById("open-errors").hidden && !!document.querySelector("dialog.modal[open]")'));
    await page.shot('open-dialog-error');
    await page.key('Escape');

    console.log('console errors:', JSON.stringify(page.errors));
    check('no console errors', page.errors.length === 0);
    page.close();
  } finally {
    await browser.close();
    server.close();
  }
  const failed = checks.filter(function (c) { return !c.ok; });
  console.log('\n' + (checks.length - failed.length) + '/' + checks.length + ' checks passed');
  if (failed.length > 0) process.exitCode = 1;
})().catch(function (err) { console.error('FAILED', err); process.exit(1); });
